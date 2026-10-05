document.addEventListener('DOMContentLoaded', async () => {
    let session;
    try {
        const res = await fetch('/api/sesion');
        if (!res.ok) throw new Error('No autorizado');
        session = await res.json();
        if (!session.autenticado) {
            window.location.href = '/Paginas/acceso.html';
            return;
        }
        if (session.role !== 'aspirante') {
            const panels = {
                admin: '/Paginas/admin_panel.html',
                control_escolar: '/Paginas/control.html'
            };
            window.location.replace(panels[session.role] || '/Paginas/panel.html');
            return;
        }
    } catch (e) {
        window.location.href = '/Paginas/acceso.html';
        return;
    }

    document.getElementById('nav-user-name').textContent = session.nombre;
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/Paginas/acceso.html';
    });

    try {
        const res = await fetch('/api/expediente');
        const expediente = await res.json();
        
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('panel-content').style.display = 'block';

        // Render header
        document.getElementById('welcome-message').textContent = `Hola, ${expediente.datos.nombre || session.nombre}`;
        const badge = document.getElementById('status-badge');
        badge.textContent = formatEstado(expediente.estado);
        badge.className = `status-badge ${expediente.estado}`;

        if (expediente.folio) {
            const folioEl = document.getElementById('folio-display');
            folioEl.textContent = `Folio: ${expediente.folio}`;
            folioEl.style.display = 'inline-block';
        }

        if (expediente.estado === 'con_observaciones') {
            document.getElementById('observations-alert').style.display = 'block';
        } else if (expediente.estado === 'confirmada') {
            document.getElementById('success-alert').style.display = 'block';
        }

        // Calculate progress
        let filledFields = 0;
        const requiredFields = ['nombre','apellidoPaterno','apellidoMaterno','fechaNacimiento','telefono','bachillerato','curp','carrera'];
        requiredFields.forEach(f => {
            if (expediente.datos[f]) filledFields++;
        });
        
        let docsCount = 0;
        if (expediente.documentos) {
            docsCount = expediente.documentos.length;
        }
        
        const totalItems = requiredFields.length + 4; // 4 docs required (incluyendo comprobante de domicilio)
        const totalCompleted = filledFields + docsCount;
        const progress = Math.round((totalCompleted / totalItems) * 100);
        
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = `${progress}% completado`;

        document.getElementById('expediente-summary').innerHTML = `
            <strong>${filledFields} de ${requiredFields.length}</strong> datos personales completos.<br>
            <strong>${docsCount} de 4</strong> documentos subidos.
        `;

        // Docs summary
        const docsSummary = document.getElementById('docs-summary');
        docsSummary.innerHTML = '';
        if (expediente.documentos && expediente.documentos.length > 0) {
            expediente.documentos.forEach(d => {
                const row = document.createElement('div');
                row.style.cssText = 'margin-bottom:12px; padding: 12px; border: 1px solid var(--line); border-radius: 6px; display:flex; justify-content:space-between; align-items: center;';
                
                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'font-size: 14px; font-weight: 500;';
                nameSpan.textContent = formatDocType(d.tipo);
                
                const statusColors = getDocStatusColor(d.estado);
                const statusSpan = document.createElement('span');
                statusSpan.className = 'doc-status';
                statusSpan.style.cssText = `background: ${statusColors.bg}; color: ${statusColors.color}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase;`;
                statusSpan.textContent = formatDocStatus(d.estado);
                
                row.appendChild(nameSpan);
                row.appendChild(statusSpan);
                docsSummary.appendChild(row);
            });
        } else {
            const p = document.createElement('p');
            p.style.cssText = 'color:var(--muted); font-size: 14px;';
            p.textContent = 'Aún no has subido documentos.';
            docsSummary.appendChild(p);
        }

        // Status description
        const descMap = {
            'borrador': 'Tu solicitud está en borrador. Puedes editarla libremente y guardar los cambios hasta que estés listo para enviarla.',
            'enviada': 'Solicitud enviada exitosamente. Se encuentra en la cola de revisión por parte de la administración escolar.',
            'en_revision': 'Tu solicitud está siendo revisada minuciosamente en este momento por un agente.',
            'con_observaciones': 'Hemos encontrado detalles que requieren tu atención. Por favor, revisa y corrige las observaciones indicadas para poder continuar con el trámite.',
            'aprobada': '¡Felicidades! Tu solicitud ha sido aprobada. Por favor, espera la confirmación final y las instrucciones de inscripción.',
            'confirmada': 'Proceso completado con éxito. Eres oficialmente alumno de la universidad. ¡Bienvenido!'
        };
        document.getElementById('status-description').textContent = descMap[expediente.estado] || 'Estado desconocido.';

        // History timeline
        const timeline = document.getElementById('history-timeline');
        if (expediente.historial && expediente.historial.length > 0) {
            // Reverse history to show newest first
            const sortedHistory = [...expediente.historial].reverse();
            timeline.innerHTML = '';
            sortedHistory.forEach(h => {
                const li = document.createElement('li');
                
                const strong = document.createElement('strong');
                strong.style.color = 'var(--navy)';
                strong.textContent = formatEstado(h.estado);
                li.appendChild(strong);
                
                const dateSpan = document.createElement('span');
                dateSpan.style.cssText = 'color:var(--muted);font-size:12px; margin-left: 8px;';
                dateSpan.textContent = new Date(h.fecha).toLocaleDateString();
                li.appendChild(dateSpan);
                
                if (h.nota) {
                    const p = document.createElement('p');
                    p.style.cssText = 'font-size:13px;margin-top:4px;color:var(--muted); line-height: 1.4;';
                    p.textContent = h.nota;
                    li.appendChild(p);
                }
                
                timeline.appendChild(li);
            });
        } else {
            timeline.innerHTML = '<li style="color:var(--muted);">Sin historial de cambios</li>';
        }

    } catch (e) {
        console.error('Error fetching expediente', e);
        document.getElementById('loading-indicator').innerHTML = '<span style="color: var(--error);">Error al cargar los datos del panel. Por favor, intenta más tarde.</span>';
    }

    function formatEstado(est) {
        return est.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    function formatDocType(tipo) {
        return tipo.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    function formatDocStatus(est) {
        return est.charAt(0).toUpperCase() + est.slice(1);
    }
    function getDocStatusColor(est) {
        switch(est) {
            case 'aprobado': return {bg: '#DCFCE7', color: '#166534'};
            case 'rechazado': return {bg: '#FEE2E2', color: '#991B1B'};
            case 'en_revision': return {bg: '#FEF3C7', color: '#92400E'};
            default: return {bg: '#F1F5F9', color: '#475569'};
        }
    }
});
