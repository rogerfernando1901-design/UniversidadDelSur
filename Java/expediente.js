document.addEventListener('DOMContentLoaded', async () => {
    let session;
    let currentExpediente;
    const form = document.getElementById('expediente-form');
    const errorAlert = document.getElementById('general-error');
    document.getElementById('logout-btn').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
            const res = await fetch('/api/logout', { method: 'POST' });
            if (!res.ok) throw new Error('Error al cerrar sesión');
            window.location.href = '/Paginas/acceso.html';
        } catch (e) {
            window.alert('No se pudo cerrar la sesión. Intenta de nuevo.');
            button.disabled = false;
        }
    });

    try {
        const res = await fetch('/api/sesion');
        if (!res.ok) throw new Error('No autorizado');
        session = await res.json();
        if (!session.autenticado || session.role !== 'aspirante') {
            window.location.href = '/Paginas/acceso.html';
            return;
        }
    } catch (e) {
        window.location.href = '/Paginas/acceso.html';
        return;
    }

    try {
        // Load Carreras
        const carrerasRes = await fetch('/api/carreras');
        if (carrerasRes.ok) {
            const carreras = await carrerasRes.json();
            const select = document.getElementById('carrera');
            carreras.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.nombre} (${c.modalidad}) - Cupo: ${c.cupo - c.inscritos}`;
                if (!c.disponible) opt.disabled = true;
                select.appendChild(opt);
            });
        }

        // Load Expediente
        const res = await fetch('/api/expediente');
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'No se pudo cargar el expediente.');
        }
        currentExpediente = await res.json();
        
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('expediente-content').style.display = 'block';

        // Setup Header
        const badge = document.getElementById('header-status-badge');
        badge.textContent = formatEstado(currentExpediente.estado);
        badge.className = `status-badge ${currentExpediente.estado}`;

        // Populate Form Data
        const datos = currentExpediente.datos || {};
        ['nombre','apellidoPaterno','apellidoMaterno','fechaNacimiento','telefono','bachillerato','curp','carrera'].forEach(id => {
            const el = document.getElementById(id);
            if (el && datos[id]) el.value = datos[id];
        });

        // Setup Document sections
        renderDocuments(currentExpediente.documentos || []);

        // Locking Logic
        applyLockingLogic(currentExpediente.estado, currentExpediente.observaciones || []);

    } catch (e) {
        console.error('Error', e);
        document.getElementById('loading-indicator').innerHTML = '<span style="color:var(--error);">Error al cargar expediente.</span>';
    }

    // ── Lógica y Asistente de CURP ────────────────────────────
    const curpInput = document.getElementById('curp');
    const curpHint = document.getElementById('curp-hint');
    const btnCalcularCurp = document.getElementById('btn-calcular-curp');

    const validarCurpFormato = (valor) => {
        const regex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
        return regex.test(valor);
    };

    if (curpInput) {
        curpInput.addEventListener('input', (e) => {
            const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18);
            e.target.value = raw;
            if (curpHint) {
                if (raw.length === 0) {
                    curpHint.textContent = '18 caracteres alfanuméricos oficiales (RENAPO)';
                    curpHint.style.color = 'var(--muted)';
                } else if (raw.length === 18) {
                    if (validarCurpFormato(raw)) {
                        curpHint.innerHTML = '<span style="color:#16a34a; font-weight:700;">✓ Formato de CURP válido (18 caracteres)</span>';
                    } else {
                        curpHint.innerHTML = '<span style="color:#dc2626; font-weight:600;">⚠️ Revisa la estructura (18 caracteres oficiales)</span>';
                    }
                } else {
                    curpHint.textContent = `${raw.length}/18 caracteres`;
                    curpHint.style.color = 'var(--muted)';
                }
            }
        });
    }

    if (btnCalcularCurp) {
        btnCalcularCurp.addEventListener('click', () => {
            const nombre = (document.getElementById('nombre')?.value || '').trim();
            const apPaterno = (document.getElementById('apellidoPaterno')?.value || '').trim();
            const apMaterno = (document.getElementById('apellidoMaterno')?.value || '').trim();
            const fechaNac = (document.getElementById('fechaNacimiento')?.value || '').trim();

            if (!nombre || !apPaterno || !fechaNac) {
                showError('Ingresa primero Nombre, Apellido Paterno y Fecha de Nacimiento para generar tu CURP.');
                return;
            }

            const cleanStr = (s) => s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '');

            const n = cleanStr(nombre);
            const p = cleanStr(apPaterno);
            const m = cleanStr(apMaterno) || 'X';

            // 1. Primera letra y primera vocal interna de paterno
            const c1 = p.charAt(0) || 'X';
            const vocales = p.slice(1).match(/[AEIOU]/);
            const c2 = vocales ? vocales[0] : 'X';

            // 2. Primera letra de materno
            const c3 = m.charAt(0) || 'X';

            // 3. Primera letra del nombre (ignorar José o María si hay segundo nombre)
            let primerNombre = n.split(/\s+/)[0] || 'X';
            if ((primerNombre === 'JOSE' || primerNombre === 'MARIA') && n.split(/\s+/).length > 1) {
                primerNombre = n.split(/\s+/)[1];
            }
            const c4 = primerNombre.charAt(0) || 'X';

            // 4. Fecha AAMMDD (desde YYYY-MM-DD)
            const partesFecha = fechaNac.split('-');
            let fStr = '000000';
            let anioNum = 2000;
            if (partesFecha.length === 3) {
                anioNum = parseInt(partesFecha[0], 10);
                const aa = partesFecha[0].slice(2, 4);
                const mm = partesFecha[1].padStart(2, '0');
                const dd = partesFecha[2].padStart(2, '0');
                fStr = `${aa}${mm}${dd}`;
            }

            // 5. Sexo
            const nombresFemeninos = ['MARIA', 'AURORA', 'VANESSA', 'ANA', 'CARLA', 'DANIELA', 'SOFIA', 'VALERIA', 'CAMILA', 'FERNANDA', 'PAOLA', 'ANDREA', 'ELENA', 'LAURA', 'LUCIA', 'DIANA', 'GABRIELA'];
            let sexo = 'H';
            if (nombresFemeninos.some(fem => n.includes(fem)) || n.endsWith('A')) {
                sexo = 'M';
            }

            // 6. Entidad federativa (YN por defecto para Sureste)
            const entidad = 'YN';

            // 7. Primeras consonantes internas no iniciales
            const getConsonanteInterna = (str) => {
                const match = str.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/);
                return match ? match[0] : 'X';
            };
            const cP = getConsonanteInterna(p);
            const cM = getConsonanteInterna(m);
            const cN = getConsonanteInterna(primerNombre);

            // 8. Carácter de siglo (A para nacidos a partir de 2000, 0 para siglo XX)
            const sigloChar = anioNum >= 2000 ? 'A' : '0';
            const digitoVerif = '1';

            const curpGenerada = `${c1}${c2}${c3}${c4}${fStr}${sexo}${entidad}${cP}${cM}${cN}${sigloChar}${digitoVerif}`;
            curpInput.value = curpGenerada;
            curpInput.dispatchEvent(new Event('input'));
        });
    }

    // Handlers
    document.getElementById('btn-save-draft').addEventListener('click', async () => {
        await saveExpediente(false);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombreInput = document.getElementById('nombre');
        const apPatInput = document.getElementById('apellidoPaterno');
        const apMatInput = document.getElementById('apellidoMaterno');
        const fnInput = document.getElementById('fechaNacimiento');
        const telInput = document.getElementById('telefono');
        const bachInput = document.getElementById('bachillerato');
        const carreraSelect = document.getElementById('carrera');
        const curpInput = document.getElementById('curp');

        const errors = [];
        const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,60}$/;

        // Restablecer estilos de campos
        [nombreInput, apPatInput, apMatInput, fnInput, telInput, bachInput, carreraSelect, curpInput].forEach(el => {
            if (el) el.style.borderColor = '';
        });

        // 1. Nombre(s)
        const nomVal = (nombreInput?.value || '').trim();
        if (!nomVal) {
            errors.push('Nombre(s) es obligatorio.');
            if (nombreInput) nombreInput.style.borderColor = 'var(--error)';
        } else if (!nombreRegex.test(nomVal)) {
            errors.push('Nombre(s) solo debe contener letras (entre 2 y 60 caracteres).');
            if (nombreInput) nombreInput.style.borderColor = 'var(--error)';
        }

        // 2. Apellido Paterno
        const apPatVal = (apPatInput?.value || '').trim();
        if (!apPatVal) {
            errors.push('Apellido Paterno es obligatorio.');
            if (apPatInput) apPatInput.style.borderColor = 'var(--error)';
        } else if (!nombreRegex.test(apPatVal)) {
            errors.push('Apellido Paterno solo debe contener letras (entre 2 y 60 caracteres).');
            if (apPatInput) apPatInput.style.borderColor = 'var(--error)';
        }

        // 3. Apellido Materno (Obligatorio - RF-08)
        const apMatVal = (apMatInput?.value || '').trim();
        if (!apMatVal) {
            errors.push('Apellido Materno es obligatorio.');
            if (apMatInput) apMatInput.style.borderColor = 'var(--error)';
        } else if (!nombreRegex.test(apMatVal)) {
            errors.push('Apellido Materno solo debe contener letras (entre 2 y 60 caracteres).');
            if (apMatInput) apMatInput.style.borderColor = 'var(--error)';
        }

        // 4. Fecha de Nacimiento
        const fnVal = (fnInput?.value || '').trim();
        if (!fnVal) {
            errors.push('Fecha de Nacimiento es obligatoria.');
            if (fnInput) fnInput.style.borderColor = 'var(--error)';
        } else {
            const fn = new Date(fnVal);
            const hoy = new Date();
            if (isNaN(fn.getTime())) {
                errors.push('Fecha de Nacimiento no es válida.');
                if (fnInput) fnInput.style.borderColor = 'var(--error)';
            } else {
                let edad = hoy.getFullYear() - fn.getFullYear();
                const m = hoy.getMonth() - fn.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--;
                if (fn > hoy) {
                    errors.push('La Fecha de Nacimiento no puede ser en el futuro.');
                    if (fnInput) fnInput.style.borderColor = 'var(--error)';
                } else if (edad < 14) {
                    errors.push('Debes tener al menos 14 años de edad cumplidos.');
                    if (fnInput) fnInput.style.borderColor = 'var(--error)';
                } else if (edad > 100) {
                    errors.push('La Fecha de Nacimiento ingresada no es coherente.');
                    if (fnInput) fnInput.style.borderColor = 'var(--error)';
                }
            }
        }

        // 5. Teléfono (10 dígitos)
        const telVal = (telInput?.value || '').replace(/\D/g, '');
        if (!telVal) {
            errors.push('Teléfono es obligatorio.');
            if (telInput) telInput.style.borderColor = 'var(--error)';
        } else if (telVal.length !== 10) {
            errors.push('El número de teléfono debe tener exactamente 10 dígitos.');
            if (telInput) telInput.style.borderColor = 'var(--error)';
        }

        // 6. Bachillerato
        const bachVal = (bachInput?.value || '').trim();
        if (!bachVal || bachVal.length < 3) {
            errors.push('Escuela de Bachillerato de procedencia es obligatoria (mínimo 3 caracteres).');
            if (bachInput) bachInput.style.borderColor = 'var(--error)';
        }

        // 7. Carrera
        const carVal = (carreraSelect?.value || '').trim();
        if (!carVal) {
            errors.push('Debes seleccionar una Carrera de Interés.');
            if (carreraSelect) carreraSelect.style.borderColor = 'var(--error)';
        }

        // 8. CURP (18 caracteres RENAPO)
        const curpVal = (curpInput?.value || '').trim().toUpperCase();
        const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
        if (!curpVal) {
            errors.push('La clave CURP es obligatoria.');
            if (curpInput) curpInput.style.borderColor = 'var(--error)';
        } else if (!curpRegex.test(curpVal)) {
            errors.push('La CURP debe cumplir con el formato oficial de 18 caracteres de RENAPO (ej. MACA040819MYCNRN03).');
            if (curpInput) curpInput.style.borderColor = 'var(--error)';
        }

        // 9. Documentos obligatorios (los 4: acta_nacimiento, certificado_bachillerato, identificacion, comprobante_domicilio)
        const docsSubidos = currentExpediente.documentos || [];
        const requiredDocTypes = [
            { tipo: 'acta_nacimiento', label: 'Acta de Nacimiento' },
            { tipo: 'certificado_bachillerato', label: 'Certificado de Bachillerato' },
            { tipo: 'identificacion', label: 'Identificación Oficial (INE/Pasaporte)' },
            { tipo: 'comprobante_domicilio', label: 'Comprobante de Domicilio' }
        ];

        for (const req of requiredDocTypes) {
            const found = docsSubidos.find(d => d.tipo === req.tipo);
            if (!found) {
                errors.push(`Falta subir el documento obligatorio: ${req.label}.`);
            } else if (currentExpediente.estado === 'con_observaciones' && found.estado === 'rechazado') {
                errors.push(`El documento ${req.label} fue rechazado y debes reemplazarlo antes de enviar.`);
            }
        }

        if (errors.length > 0) {
            showError(errors);
            return;
        }

        const success = await saveExpediente(true);
        if (success) {
            try {
                const sendRes = await fetch('/api/expediente/enviar', { method: 'POST' });
                const sendData = await sendRes.json();
                if (sendData.ok) {
                    window.location.href = '/Paginas/panel.html';
                } else {
                    if (sendData.detalles && Array.isArray(sendData.detalles)) {
                        showError(sendData.detalles);
                    } else {
                        showError(sendData.error || 'Error al enviar la solicitud. Faltan datos.');
                    }
                }
            } catch (err) {
                showError('Error de red al enviar la solicitud.');
            }
        }
    });

    async function saveExpediente(silent = false) {
        errorAlert.style.display = 'none';
        const formData = new FormData(form);
        const dataToSave = { datos: {} };
        
        ['nombre','apellidoPaterno','apellidoMaterno','fechaNacimiento','telefono','bachillerato','curp','carrera'].forEach(key => {
            const raw = formData.get(key);
            if (raw !== null && raw !== undefined) {
                let val = String(raw).trim();
                if (key === 'curp') val = val.toUpperCase();
                if (val !== '') {
                    dataToSave.datos[key] = val;
                }
            }
        });

        try {
            const btn = document.getElementById('btn-save-draft');
            const originalText = btn.textContent;
            btn.textContent = 'Guardando...';
            btn.disabled = true;

            const res = await fetch('/api/expediente', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });
            const result = await res.json();
            
            btn.textContent = originalText;
            btn.disabled = false;

            if (res.ok) {
                if (!silent) alert('Borrador guardado exitosamente.');
                return true;
            } else {
                showError(result.error || 'Error al guardar');
                return false;
            }
        } catch (e) {
            showError('Error de conexión al guardar.');
            return false;
        }
    }

    function renderDocuments(docs) {
        const container = document.getElementById('docs-container');
        const requiredTypes = [
            { tipo: 'acta_nacimiento', label: 'Acta de Nacimiento' },
            { tipo: 'certificado_bachillerato', label: 'Certificado de Bachillerato' },
            { tipo: 'identificacion', label: 'Identificación Oficial (INE/Pasaporte)' },
            { tipo: 'comprobante_domicilio', label: 'Comprobante de Domicilio' }
        ];

        container.innerHTML = '';
        
        const isLocked = !['borrador', 'con_observaciones'].includes(currentExpediente.estado);

        requiredTypes.forEach(req => {
            const docInfo = docs.find(d => d.tipo === req.tipo);
            const card = document.createElement('div');
            card.className = `doc-card ${docInfo ? docInfo.estado : ''} ${docInfo ? 'uploaded' : ''}`;
            
            let statusHtml = docInfo ? `<span class="doc-status">${formatDocStatus(docInfo.estado)}</span>` : '<span class="doc-status" style="background:var(--line);">Pendiente</span>';
            
            let obsHtml = '';
            let canUpload = !isLocked;
            
            if (docInfo && docInfo.observacion) {
                obsHtml = `<div class="doc-obs-box" style="margin-top:12px; font-size:12px; color:var(--error); background:#FEF2F2; padding:8px 10px; border-radius:4px; border:1px solid #FECACA; border-left:3px solid var(--error); word-break:break-word;"><strong>Observación:</strong> ${docInfo.observacion}</div>`;
            }

            // In con_observaciones, only allow upload if this specific doc is rejected or missing
            if (currentExpediente.estado === 'con_observaciones') {
                canUpload = !docInfo || docInfo.estado === 'rechazado';
            }

            let uploadHtml = '';
            if (canUpload) {
                uploadHtml = `
                    <div class="doc-actions">
                        <label class="secondary" style="cursor:pointer; display:inline-block; font-size: 13px; padding: 6px 12px; border-radius: 4px;">
                            ${docInfo ? 'Reemplazar Archivo' : 'Subir Archivo'}
                            <input type="file" style="display:none;" accept=".pdf,.jpg,.jpeg,.png" data-tipo="${req.tipo}">
                        </label>
                    </div>
                `;
            }

            card.innerHTML = `
                <div style="flex:1;">
                    <h3 style="margin-bottom:8px;">${req.label}</h3>
                    ${statusHtml}
                    ${docInfo ? `<p style="font-size:12px; margin-top:8px; color:var(--muted); word-break: break-all;">${docInfo.archivo}</p>` : ''}
                    ${obsHtml}
                </div>
                ${uploadHtml}
            `;
            container.appendChild(card);
        });

        // Attach file inputs
        container.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', async (e) => {
                if (e.target.files.length === 0) return;
                const file = e.target.files[0];
                const tipo = e.target.dataset.tipo;
                
                if (file.size > 5 * 1024 * 1024) {
                    alert('El archivo excede el límite de 5MB.');
                    return;
                }

                const fd = new FormData();
                fd.append('archivo', file);

                try {
                    // Update UI to show uploading
                    const label = e.target.closest('label');
                    const textNode = Array.from(label.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim() !== '');
                    const origText = textNode ? textNode.nodeValue : '';
                    if (textNode) textNode.nodeValue = 'Subiendo... ';
                    
                    const res = await fetch(`/api/expediente/documentos/${tipo}`, {
                        method: 'POST',
                        body: fd
                    });
                    
                    if (res.ok) {
                        // Reload data
                        const expRes = await fetch('/api/expediente');
                        currentExpediente = await expRes.json();
                        renderDocuments(currentExpediente.documentos);
                        applyLockingLogic(currentExpediente.estado, currentExpediente.observaciones || []);
                    } else {
                        const data = await res.json();
                        alert('Error al subir: ' + (data.error || 'Desconocido'));
                        if (textNode) textNode.nodeValue = origText;
                    }
                } catch (err) {
                    alert('Error de red al subir archivo.');
                    if (textNode) textNode.nodeValue = origText;
                }
            });
        });
    }

    function applyLockingLogic(estado, observaciones) {
        const inputs = form.querySelectorAll('input, select, textarea');
        const actionsContainer = document.getElementById('form-actions-container');
        const readonlyMessage = document.getElementById('readonly-message');
        const obsBanner = document.getElementById('observaciones-banner');

        // Limpiar mensajes y estilos previos para prevenir duplicaciones o desbordamientos visuales
        form.querySelectorAll('.field-obs-msg').forEach(el => el.remove());
        inputs.forEach(i => {
            i.classList.remove('needs-correction');
            i.style.borderColor = '';
            i.style.backgroundColor = '';
        });

        if (['enviada', 'en_revision', 'aprobada', 'confirmada'].includes(estado)) {
            // Lock all
            inputs.forEach(i => i.disabled = true);
            actionsContainer.style.display = 'none';
            readonlyMessage.style.display = 'block';
            if (obsBanner) obsBanner.style.display = 'none';
        } else if (estado === 'con_observaciones') {
            const pendientes = (observaciones || []).filter(o => !o.resuelto);
            const camposConObservacion = pendientes.map(o => o.campo);

            // Banner general superior de observaciones
            if (obsBanner) {
                if (pendientes.length > 0) {
                    const nombresAmigables = {
                        'nombre': 'Nombre(s)',
                        'apellidoPaterno': 'Apellido Paterno',
                        'apellidoMaterno': 'Apellido Materno',
                        'fechaNacimiento': 'Fecha de Nacimiento',
                        'telefono': 'Teléfono',
                        'curp': 'CURP',
                        'bachillerato': 'Bachillerato de Procedencia',
                        'carrera': 'Carrera de Interés',
                        'acta_nacimiento': 'Acta de Nacimiento',
                        'certificado_bachillerato': 'Certificado de Bachillerato',
                        'identificacion': 'Identificación Oficial',
                        'comprobante_domicilio': 'Comprobante de Domicilio'
                    };
                    obsBanner.innerHTML = `
                        <div style="display:flex; align-items:flex-start; gap:12px;">
                            <span style="font-size:22px; line-height:1;">⚠️</span>
                            <div style="flex:1;">
                                <strong style="font-size:15px; display:block; margin-bottom:6px; color:#991B1B;">Atención: Tu expediente tiene correcciones pendientes</strong>
                                <p style="margin:0 0 10px 0; font-size:13px; line-height:1.4;">Se han desbloqueado únicamente los campos y documentos con observaciones. Por favor realiza las correcciones solicitadas y vuelve a enviar tu solicitud:</p>
                                <ul style="margin:0; padding-left:20px; font-size:13px; line-height:1.5;">
                                    ${pendientes.map(p => `<li><strong>${nombresAmigables[p.campo] || p.campo}:</strong> ${p.mensaje}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    `;
                    obsBanner.style.display = 'block';
                } else {
                    obsBanner.style.display = 'none';
                }
            }

            inputs.forEach(i => {
                if (i.type === 'file') return;
                
                if (!camposConObservacion.includes(i.name)) {
                    i.disabled = true;
                    i.style.backgroundColor = '#F8FAFC';
                } else {
                    i.disabled = false;
                    i.classList.add('needs-correction');
                    i.style.borderColor = 'var(--error)';
                    i.style.backgroundColor = '#FEF2F2';
                    
                    const obsInfo = pendientes.find(o => o.campo === i.name);
                    if (obsInfo) {
                        const err = document.createElement('div');
                        err.className = 'field-obs-msg';
                        err.setAttribute('role', 'alert');
                        err.innerHTML = `<span style="font-size:14px; line-height:1;">⚠️</span><span><strong>Observación:</strong> ${obsInfo.mensaje}</span>`;
                        
                        const hint = i.parentNode.querySelector('small');
                        if (hint) {
                            hint.insertAdjacentElement('afterend', err);
                        } else {
                            i.insertAdjacentElement('afterend', err);
                        }
                    }

                    // Quitar alerta al escribir para una respuesta visual limpia e interactiva
                    i.addEventListener('input', () => {
                        if (i.value.trim().length > 0) {
                            i.style.backgroundColor = '#FFFFFF';
                            i.style.borderColor = 'var(--blue)';
                        }
                    });
                }
            });
        } else {
            if (obsBanner) obsBanner.style.display = 'none';
        }
        // If borrador, everything remains editable (default)
    }

    function showError(msg) {
        if (Array.isArray(msg)) {
            errorAlert.innerHTML = `
                <strong style="display:block; font-size:15px; margin-bottom:6px;">⚠️ Por favor corrige los siguientes puntos antes de enviar:</strong>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.5;">
                    ${msg.map(e => `<li>${e}</li>`).join('')}
                </ul>
            `;
        } else {
            errorAlert.innerHTML = `<strong>Error:</strong> ${msg}`;
        }
        errorAlert.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function formatEstado(est) {
        if (!est) return '';
        return est.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    function formatDocStatus(est) {
        if (!est) return '';
        return est.charAt(0).toUpperCase() + est.slice(1);
    }
});
