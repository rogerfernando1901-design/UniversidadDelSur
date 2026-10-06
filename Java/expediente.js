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
        ['nombre','apellidoPaterno','apellidoMaterno','fechaNacimiento','telefono','bachillerato','carrera'].forEach(id => {
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


        const errors = [];
        const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,60}$/;

        [nombreInput, apPatInput, apMatInput, fnInput, telInput, bachInput, carreraSelect].forEach(el => {
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
        
        ['nombre','apellidoPaterno','apellidoMaterno','fechaNacimiento','telefono','bachillerato','carrera'].forEach(key => {
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
            { tipo: 'comprobante_domicilio', label: 'Comprobante de Domicilio' },
            { tipo: 'curp', label: 'CURP' }
        ];

        container.innerHTML = '';
        
        const isLocked = !['borrador', 'con_observaciones'].includes(currentExpediente.estado);

        let selectedFiles = {};
        let pendingDocsCount = 0;

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
                pendingDocsCount++;
                uploadHtml = `
                    <div class="doc-actions">
                        <label class="secondary btn-select-file" style="cursor:pointer; display:inline-block; font-size: 13px; padding: 6px 12px; border-radius: 4px;">
                            ${docInfo ? 'Seleccionar Reemplazo' : 'Seleccionar Archivo'}
                            <input type="file" style="display:none;" accept=".pdf,.jpg,.jpeg,.png" data-tipo="${req.tipo}">
                        </label>
                        <p class="file-name-display" style="font-size:12px; margin-top:6px; color:var(--primary); font-weight:600;"></p>
                    </div>
                `;
            }

            card.innerHTML = `
                <div style="flex:1;">
                    <h3 style="margin-bottom:8px;">${req.label}</h3>
                    ${statusHtml}
                    ${docInfo ? `<p style="font-size:12px; margin-top:8px; color:var(--muted); word-break: break-all;">Subido: ${docInfo.archivo}</p>` : ''}
                    ${obsHtml}
                </div>
                ${uploadHtml}
            `;
            container.appendChild(card);
        });

        // Attach file inputs
        container.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', (e) => {
                if (e.target.files.length === 0) return;
                const file = e.target.files[0];
                const tipo = e.target.dataset.tipo;
                
                if (file.size > 5 * 1024 * 1024) {
                    alert('El archivo excede el límite de 5MB.');
                    e.target.value = '';
                    return;
                }

                // RF-17: Guardar en memoria y actualizar UI, sin subir aún
                selectedFiles[tipo] = file;
                const containerDiv = e.target.closest('.doc-actions');
                const nameDisplay = containerDiv.querySelector('.file-name-display');
                nameDisplay.textContent = file.name;
                
                const label = containerDiv.querySelector('.btn-select-file');
                label.style.background = '#F0FDF4';
                label.style.border = '1px solid #4ADE80';
                label.style.color = '#166534';
                
                const textNode = Array.from(label.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim() !== '');
                if (textNode) textNode.nodeValue = 'Cambiar Selección ';
            });
        });

        if (pendingDocsCount > 0) {
            const btnContainer = document.createElement('div');
            btnContainer.style.marginTop = '20px';
            btnContainer.style.textAlign = 'right';
            btnContainer.style.width = '100%';

            const btnUploadAll = document.createElement('button');
            btnUploadAll.className = 'btn btn-primary';
            btnUploadAll.textContent = 'Subir Todos los Documentos Seleccionados';
            btnUploadAll.onclick = async () => {
                if (Object.keys(selectedFiles).length < pendingDocsCount) {
                    alert('Debes seleccionar un archivo para TODOS los documentos pendientes antes de poder subirlos. (RF-17)');
                    return;
                }
                
                btnUploadAll.textContent = 'Subiendo...';
                btnUploadAll.disabled = true;

                try {
                    for (const [tipo, file] of Object.entries(selectedFiles)) {
                        const fd = new FormData();
                        fd.append('archivo', file);
                        const res = await fetch(`/api/expediente/documentos/${tipo}`, {
                            method: 'POST',
                            body: fd
                        });
                        if (!res.ok) {
                            const data = await res.json();
                            alert(`Error al subir ${tipo}: ` + (data.error || 'Desconocido'));
                        }
                    }
                    
                    alert('Todos los documentos fueron subidos exitosamente.');
                    // Reload data
                    const expRes = await fetch('/api/expediente');
                    currentExpediente = await expRes.json();
                    renderDocuments(currentExpediente.documentos);
                    applyLockingLogic(currentExpediente.estado, currentExpediente.observaciones || []);
                } catch (err) {
                    alert('Error de red al subir archivos.');
                    btnUploadAll.textContent = 'Subir Todos los Documentos Seleccionados';
                    btnUploadAll.disabled = false;
                }
            };
            btnContainer.appendChild(btnUploadAll);
            container.appendChild(btnContainer);
        }
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
