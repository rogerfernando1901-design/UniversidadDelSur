document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;
  let solicitudes = [];
  let currentExpediente = null;
  let revisiones = [];
  let observacionesDatos = [];

  // Check auth
  try {
    const res = await fetch('/api/sesion');
    const data = await res.json();
    if (!data.autenticado || (data.role !== 'control_escolar' && data.role !== 'admin')) {
      window.location.href = '/Paginas/acceso.html';
      return;
    }
    currentUser = data;
    document.getElementById('user-name').textContent = data.nombre;
  } catch (err) {
    console.error('Error de sesión:', err);
    window.location.href = '/Paginas/acceso.html';
    return;
  }

  // DOM Elements
  const logoutBtn = document.getElementById('logout-btn');
  const viewList = document.getElementById('view-list');
  const viewDetail = document.getElementById('view-detail');
  const tableBody = document.querySelector('#solicitudes-table tbody');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const emptyState = document.getElementById('empty-state');
  const backBtn = document.getElementById('back-btn');
  
  // Detail elements
  const detailName = document.getElementById('detail-name');
  const detailFolio = document.getElementById('detail-folio');
  const detailEmail = document.getElementById('detail-email');
  const detailStatus = document.getElementById('detail-status');
  const datosContainer = document.getElementById('datos-container');
  const docsContainer = document.getElementById('docs-container');
  const historialContainer = document.getElementById('historial-container');
  const actionBar = document.getElementById('action-bar');
  
  // Toast
  const toast = document.getElementById('toast');

  const formatFecha = (str) => new Date(str).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatEstado = (estado) => estado.replace('_', ' ').toUpperCase();

  const showToast = (msg, type = 'success') => {
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  };

  const showModal = (title, msg, onConfirm) => {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-msg').textContent = msg;
    
    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');
    
    const close = () => {
      modal.classList.remove('active');
    };
    
    cancelBtn.onclick = close;
    confirmBtn.onclick = () => {
      onConfirm();
      close();
    };
    
    modal.classList.add('active');
  };

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/Paginas/acceso.html';
  });

  const loadSolicitudes = async () => {
    try {
      tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
      const res = await fetch('/api/control/solicitudes');
      solicitudes = await res.json();
      renderTable();
    } catch (err) {
      console.error(err);
      showToast('Error al cargar solicitudes', 'error');
    }
  };

  const renderTable = () => {
    const term = searchInput.value.toLowerCase();
    const status = statusFilter.value;

    const filtered = solicitudes.filter(s => {
      const matchSearch = s.nombre.toLowerCase().includes(term) || (s.folio && s.folio.toLowerCase().includes(term));
      const matchStatus = status === 'todas' || s.estado === status;
      return matchSearch && matchStatus;
    });

    tableBody.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      filtered.forEach(s => {
        const tr = document.createElement('tr');
        
        const tdFolio = document.createElement('td');
        tdFolio.textContent = s.folio || '-';
        tr.appendChild(tdFolio);
        
        const tdNombre = document.createElement('td');
        tdNombre.textContent = s.nombre;
        tr.appendChild(tdNombre);
        
        const tdCarrera = document.createElement('td');
        tdCarrera.textContent = s.carrera || '-';
        tr.appendChild(tdCarrera);
        
        const tdEstado = document.createElement('td');
        const spanEstado = document.createElement('span');
        spanEstado.className = `badge ${s.estado}`;
        spanEstado.textContent = formatEstado(s.estado);
        tdEstado.appendChild(spanEstado);
        tr.appendChild(tdEstado);
        
        const tdUpdated = document.createElement('td');
        tdUpdated.textContent = s.updatedAt ? formatFecha(s.updatedAt) : '';
        tr.appendChild(tdUpdated);
        
        const tdAccion = document.createElement('td');
        const btnVer = document.createElement('button');
        btnVer.className = 'btn btn-secondary btn-ver';
        btnVer.dataset.id = s.id;
        btnVer.textContent = 'Ver';
        tdAccion.appendChild(btnVer);
        tr.appendChild(tdAccion);
        
        tableBody.appendChild(tr);
      });

      document.querySelectorAll('.btn-ver').forEach(btn => {
        btn.addEventListener('click', (e) => {
          openDetail(e.target.dataset.id);
        });
      });
    }
  };

  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);

  const openDetail = async (id) => {
    try {
      const res = await fetch(`/api/control/solicitudes/${id}`);
      currentExpediente = await res.json();
      
      revisiones = [];
      observacionesDatos = [];

      detailName.textContent = currentExpediente.datos?.nombre || currentExpediente.nombre || 'Sin nombre';
      detailFolio.textContent = currentExpediente.folio || '-';
      detailEmail.textContent = currentExpediente.email || '-';
      detailStatus.textContent = formatEstado(currentExpediente.estado);
      detailStatus.className = `badge ${currentExpediente.estado}`;

      renderDatos();
      renderDocs();
      renderHistorial();
      renderActions();

      viewList.style.display = 'none';
      viewDetail.style.display = 'block';
    } catch (err) {
      console.error(err);
      showToast('Error al cargar expediente', 'error');
    }
  };

  backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    viewDetail.style.display = 'none';
    viewList.style.display = 'block';
    loadSolicitudes();
  });

  const renderDatos = () => {
    datosContainer.innerHTML = '';
    if (!currentExpediente.datos) {
      datosContainer.innerHTML = '<p>No hay datos capturados.</p>';
      return;
    }

    const fields = Object.entries(currentExpediente.datos);
    fields.forEach(([key, val]) => {
      const div = document.createElement('div');
      div.className = 'review-field';
      
      const label = document.createElement('strong');
      label.textContent = key + ':';
      
      const value = document.createElement('span');
      value.textContent = val;
      
      const content = document.createElement('div');
      content.appendChild(label);
      content.appendChild(document.createTextNode(' '));
      content.appendChild(value);
      
      const actionDiv = document.createElement('div');
      if (currentExpediente.estado === 'enviada' || currentExpediente.estado === 'en_revision') {
        const btnObs = document.createElement('button');
        btnObs.className = 'btn btn-secondary';
        btnObs.textContent = 'Observación';
        btnObs.style.padding = '2px 6px';
        btnObs.style.fontSize = '0.8rem';
        
        btnObs.onclick = () => {
          const obs = prompt(`Observación para ${key}:`);
          if (obs !== null) {
            observacionesDatos.push({ campo: key, mensaje: obs });
            showToast(`Observación agregada a ${key}`);
            btnObs.textContent = 'Observación (' + obs + ')';
            btnObs.style.background = 'var(--warning)';
            btnObs.style.color = 'white';
          }
        };
        actionDiv.appendChild(btnObs);
      }

      div.appendChild(content);
      div.appendChild(actionDiv);
      datosContainer.appendChild(div);
    });
  };

  const renderDocs = () => {
    docsContainer.innerHTML = '';
    if (!currentExpediente.documentos || (Array.isArray(currentExpediente.documentos) ? currentExpediente.documentos.length === 0 : Object.keys(currentExpediente.documentos).length === 0)) {
      docsContainer.innerHTML = '<p>No hay documentos subidos.</p>';
      return;
    }

    const docTipos = ['acta_nacimiento', 'certificado_bachillerato', 'identificacion'];
    docTipos.forEach(tipo => {
      const doc = Array.isArray(currentExpediente.documentos) 
        ? currentExpediente.documentos.find(d => d.tipo === tipo) 
        : currentExpediente.documentos[tipo];
      if (!doc) return;

      const card = document.createElement('div');
      card.className = 'review-doc';
      
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.marginBottom = '1rem';
      
      const title = document.createElement('strong');
      title.textContent = tipo.replace('_', ' ').toUpperCase();
      
      const btnVer = document.createElement('a');
      btnVer.className = 'btn btn-primary';
      btnVer.textContent = 'Ver documento';
      btnVer.href = `/api/control/solicitudes/${currentExpediente.id}/documentos/${tipo}/archivo`;
      btnVer.target = '_blank';
      
      header.appendChild(title);
      header.appendChild(btnVer);
      card.appendChild(header);
      
      if (currentExpediente.estado === 'enviada' || currentExpediente.estado === 'en_revision') {
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '1rem';
        actions.style.alignItems = 'center';
        
        const lblAprobar = document.createElement('label');
        lblAprobar.innerHTML = `<input type="radio" name="doc_${tipo}" value="aprobar"> Aprobar`;
        
        const lblRechazar = document.createElement('label');
        lblRechazar.innerHTML = `<input type="radio" name="doc_${tipo}" value="rechazar"> Rechazar`;
        
        const obsInput = document.createElement('input');
        obsInput.type = 'text';
        obsInput.placeholder = 'Motivo de rechazo...';
        obsInput.style.display = 'none';
        obsInput.className = 'search-input';
        
        lblRechazar.querySelector('input').addEventListener('change', (e) => {
          obsInput.style.display = e.target.checked ? 'block' : 'none';
        });
        lblAprobar.querySelector('input').addEventListener('change', (e) => {
          obsInput.style.display = e.target.checked ? 'none' : 'block';
        });

        // Store references for the submit action
        card.dataset.tipo = tipo;
        card.getReviewData = () => {
          const isAprobado = lblAprobar.querySelector('input').checked;
          const isRechazado = lblRechazar.querySelector('input').checked;
          if (!isAprobado && !isRechazado) return null;
          
          return {
            campo: tipo,
            aprobado: isAprobado,
            observacion: isRechazado ? obsInput.value : ''
          };
        };

        actions.appendChild(lblAprobar);
        actions.appendChild(lblRechazar);
        card.appendChild(actions);
        card.appendChild(obsInput);
      }
      
      docsContainer.appendChild(card);
    });
  };

  const renderHistorial = () => {
    historialContainer.innerHTML = '';
    if (!currentExpediente.historial) return;
    currentExpediente.historial.forEach(h => {
      const li = document.createElement('li');
      li.textContent = `[${formatFecha(h.fecha)}] ${h.nota || h.estado || ''}`;
      historialContainer.appendChild(li);
    });
  };

  const renderActions = () => {
    actionBar.innerHTML = '';
    
    if (currentExpediente.estado === 'enviada' || currentExpediente.estado === 'en_revision') {
      const btnReview = document.createElement('button');
      btnReview.className = 'btn btn-primary';
      btnReview.textContent = 'Enviar Revisión';
      btnReview.onclick = submitReview;
      actionBar.appendChild(btnReview);
    }
    
    if (currentExpediente.estado === 'aprobada') {
      const btnConfirm = document.createElement('button');
      btnConfirm.className = 'btn btn-primary';
      btnConfirm.style.background = 'var(--success)';
      btnConfirm.textContent = 'Confirmar Inscripción';
      btnConfirm.onclick = () => {
        showModal('Confirmar Inscripción', `¿Confirmar inscripción para folio ${currentExpediente.folio}?`, submitConfirm);
      };
      actionBar.appendChild(btnConfirm);
    }
  };

  const submitReview = async () => {
    const docsCards = docsContainer.querySelectorAll('.review-doc');
    let hasError = false;
    
    revisiones = [];
    docsCards.forEach(card => {
      if (card.getReviewData) {
        const data = card.getReviewData();
        if (data) {
          if (!data.aprobado && !data.observacion.trim()) {
            showToast(`Falta observación para documento rechazado: ${data.campo}`, 'error');
            hasError = true;
          }
          revisiones.push(data);
        }
      }
    });

    if (hasError) return;

    if (revisiones.length === 0 && observacionesDatos.length === 0) {
      showToast('Debes revisar al menos un documento o agregar una observación.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/control/solicitudes/${currentExpediente.id}/revisar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisiones, observacionesDatos })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Revisión enviada');
        openDetail(currentExpediente.id); // Reload
      } else {
        showToast('Error al enviar', 'error');
      }
    } catch (err) {
      showToast('Error de red', 'error');
    }
  };

  const submitConfirm = async () => {
    try {
      const res = await fetch(`/api/control/solicitudes/${currentExpediente.id}/confirmar`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Inscripción confirmada');
        openDetail(currentExpediente.id); // Reload
      } else {
        showToast('Error al confirmar', 'error');
      }
    } catch (err) {
      showToast('Error de red', 'error');
    }
  };

  loadSolicitudes();
});
