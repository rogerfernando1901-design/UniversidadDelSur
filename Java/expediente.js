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
        ['nombre','apellidoPaterno','apellidoMaterno','fechaNacimiento','telefono','domicilio','bachillerato','curp','carrera'].forEach(id => {
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
        
        // Basic validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Check required documents (need 3)
        const uploadedDocs = document.querySelectorAll('.doc-card.uploaded, .doc-card.aprobado, .doc-card.en_revision');
        if (uploadedDocs.length < 3 && currentExpediente.estado !== 'con_observaciones') {
            showError('Debes subir los 3 documentos requeridos antes de enviar la solicitud.');
            return;
        }

        // Validar CURP si fue ingresada
        const curpVal = (document.getElementById('curp')?.value || '').trim();
        if (curpVal.length > 0 && curpVal.length < 18) {
            showError('La CURP debe tener 18 caracteres oficiales o dejarse vacía.');
            document.getElementById('curp')?.focus();
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
                    showError(sendData.error || 'Error al enviar la solicitud. Faltan datos.');
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
        
        ['nombre','apellidoPaterno','apellidoMaterno','fechaNacimiento','telefono','domicilio','bachillerato','curp','carrera'].forEach(key => {
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
            { tipo: 'identificacion', label: 'Identificación Oficial (INE/Pasaporte)' }
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
                obsHtml = `<div style="margin-top:12px; font-size:12px; color:var(--error); background:#FEF2F2; padding:8px; border-radius:4px; border-left:3px solid var(--error);"><strong>Observación:</strong> ${docInfo.observacion}</div>`;
            }

            // In con_observaciones, only allow upload if this specific doc is rejected or missing
            if (currentExpediente.estado === 'con_observaciones') {
                canUpload = !docInfo || docInfo.estado === 'rechazado';
            }

            let uploadHtml = '';
            if (canUpload) {
                uploadHtml = `
                    <div class="doc-actions">
                        <label class="secondary" style="cursor:pointer; display:inline-block; font-size: 13px; padding: 6px 12px;">
                            ${docInfo ? 'Reemplazar Archivo' : 'Subir Archivo'}
                            <input type="file" style="display:none;" accept=".pdf,.jpg,.jpeg,.png" data-tipo="${req.tipo}">
                        </label>
                    </div>
                `;
            }

            card.innerHTML = `
                <h3>${req.label}</h3>
                ${statusHtml}
                ${docInfo ? `<p style="font-size:12px; margin-top:8px; color:var(--muted); word-break: break-all;">${docInfo.archivo}</p>` : ''}
                ${obsHtml}
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

        if (['enviada', 'en_revision', 'aprobada', 'confirmada'].includes(estado)) {
            // Lock all
            inputs.forEach(i => i.disabled = true);
            actionsContainer.style.display = 'none';
            readonlyMessage.style.display = 'block';
        } else if (estado === 'con_observaciones') {
            // Lock all EXCEPT those with pending observations
            const camposConObservacion = observaciones.filter(o => !o.resuelto).map(o => o.campo);
            
            inputs.forEach(i => {
                // If it's a file input, we handled it in renderDocuments
                if (i.type === 'file') return;
                
                if (!camposConObservacion.includes(i.name)) {
                    i.disabled = true;
                    // Add a visual cue
                    i.style.backgroundColor = '#F8FAFC';
                } else {
                    // Highlight the field that needs correction
                    i.style.borderColor = 'var(--error)';
                    i.style.backgroundColor = '#FEF2F2';
                    
                    // Add error message next to field
                    const obsInfo = observaciones.find(o => o.campo === i.name && !o.resuelto);
                    if (obsInfo) {
                        const err = document.createElement('div');
                        err.style.color = 'var(--error)';
                        err.style.fontSize = '12px';
                        err.style.marginTop = '4px';
                        err.textContent = obsInfo.mensaje;
                        i.parentNode.appendChild(err);
                    }
                }
            });
        }
        // If borrador, everything remains editable (default)
    }

    function showError(msg) {
        errorAlert.textContent = msg;
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
