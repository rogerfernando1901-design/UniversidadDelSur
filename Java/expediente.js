document.addEventListener('DOMContentLoaded', async () => {
    let session;
    let currentExpediente;
    const form = document.getElementById('expediente-form');
    const errorAlert = document.getElementById('general-error');

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
            if (formData.get(key)) {
                dataToSave.datos[key] = formData.get(key);
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
