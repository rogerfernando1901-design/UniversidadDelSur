document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;

  try {
    const res = await fetch('/api/sesion');
    const data = await res.json();
    if (!data.autenticado || data.role !== 'admin') {
      window.location.href = '/Paginas/acceso.html';
      return;
    }
    currentUser = data;
    document.getElementById('user-name').textContent = data.nombre;
  } catch (err) {
    window.location.href = '/Paginas/acceso.html';
    return;
  }

  // Toast & Modal
  const toast = document.getElementById('toast');
  const showToast = (msg, type = 'success') => {
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.className = 'toast', 3000);
  };

  const showModal = (title, msg, onConfirm) => {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-msg').textContent = msg;
    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');
    const close = () => modal.classList.remove('active');
    cancelBtn.onclick = close;
    confirmBtn.onclick = () => { onConfirm(); close(); };
    modal.classList.add('active');
  };

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/Paginas/acceso.html';
  });

  // Tabs logic
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
      
      // Load data based on tab
      if (tab.dataset.target === 'tab-resumen') loadStats();
      if (tab.dataset.target === 'tab-convocatoria') loadConvocatoria();
      if (tab.dataset.target === 'tab-carreras') loadCarreras();
      if (tab.dataset.target === 'tab-usuarios') loadUsuarios();
    });
  });

  // Format date for inputs
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  // --- TAB: Resumen ---
  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/estadisticas');
      const data = await res.json();
      
      const container = document.getElementById('stats-container');
      container.innerHTML = '';
      const totalCard = document.createElement('div');
      totalCard.className = 'stat-card';
      totalCard.innerHTML = `<div class="number">${data.totalAspirantes || 0}</div><div>Total Aspirantes</div>`;
      container.appendChild(totalCard);

      if (data.carrerasResumen) {
        Object.entries(data.carrerasResumen).forEach(([carrera, cantidad]) => {
          const card = document.createElement('div');
          card.className = 'stat-card';
          
          const numDiv = document.createElement('div');
          numDiv.className = 'number';
          numDiv.textContent = cantidad;
          
          const nameDiv = document.createElement('div');
          nameDiv.textContent = carrera;
          
          card.appendChild(numDiv);
          card.appendChild(nameDiv);
          container.appendChild(card);
        });
      }
      
      const ul = document.getElementById('stats-estados');
      ul.innerHTML = '';
      if (data.expedientesPorEstado) {
        Object.entries(data.expedientesPorEstado).forEach(([k, v]) => {
          ul.innerHTML += `<li><strong>${k.replace('_', ' ').toUpperCase()}:</strong> ${v}</li>`;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- TAB: Convocatoria ---
  const loadConvocatoria = async () => {
    try {
      const res = await fetch('/api/admin/convocatoria');
      const data = await res.json();
      document.getElementById('conv-activa').checked = data.activa;
      document.getElementById('conv-apertura').value = formatDateForInput(data.fechaApertura);
      document.getElementById('conv-cierre-rec').value = formatDateForInput(data.fechaCierreRecepcion);
      document.getElementById('conv-cierre-cor').value = formatDateForInput(data.fechaCierreCorrecciones);
    } catch (err) {
      console.error(err);
    }
  };

  document.getElementById('form-convocatoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      activa: document.getElementById('conv-activa').checked,
      fechaApertura: document.getElementById('conv-apertura').value,
      fechaCierreRecepcion: document.getElementById('conv-cierre-rec').value,
      fechaCierreCorrecciones: document.getElementById('conv-cierre-cor').value
    };
    try {
      const res = await fetch('/api/admin/convocatoria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) showToast('Convocatoria actualizada');
      else showToast('Error al actualizar', 'error');
    } catch (err) {
      showToast('Error de red', 'error');
    }
  });

  // --- TAB: Carreras ---
  let carrerasData = [];
  const loadCarreras = async () => {
    try {
      const res = await fetch('/api/admin/carreras');
      carrerasData = await res.json();
      const tbody = document.querySelector('#table-carreras tbody');
      tbody.innerHTML = '';
      carrerasData.forEach(c => {
        const disponible = c.cupo - (c.inscritos || 0);
        const tr = document.createElement('tr');
        
        const tdNombre = document.createElement('td');
        tdNombre.textContent = c.nombre;
        tr.appendChild(tdNombre);
        
        const tdCampus = document.createElement('td');
        tdCampus.textContent = c.campus;
        tr.appendChild(tdCampus);
        
        const tdModalidad = document.createElement('td');
        tdModalidad.textContent = c.modalidad;
        tr.appendChild(tdModalidad);
        
        const tdCupo = document.createElement('td');
        tdCupo.textContent = c.cupo;
        tr.appendChild(tdCupo);
        
        const tdInscritos = document.createElement('td');
        tdInscritos.textContent = c.inscritos || 0;
        tr.appendChild(tdInscritos);
        
        const tdDisponible = document.createElement('td');
        tdDisponible.textContent = disponible;
        tr.appendChild(tdDisponible);
        
        const tdAction = document.createElement('td');
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-secondary btn-edit-car';
        btnEdit.dataset.id = c.id;
        btnEdit.textContent = 'Editar';
        tdAction.appendChild(btnEdit);
        tr.appendChild(tdAction);
        
        tbody.appendChild(tr);
      });
      document.querySelectorAll('.btn-edit-car').forEach(btn => {
        btn.addEventListener('click', (e) => editCarrera(e.target.dataset.id));
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formCarrera = document.getElementById('form-carrera');
  const containerCarrera = document.getElementById('form-carrera-container');

  document.getElementById('btn-add-carrera').addEventListener('click', () => {
    formCarrera.reset();
    document.getElementById('car-id').value = '';
    document.getElementById('form-carrera-title').textContent = 'Nueva Carrera';
    containerCarrera.style.display = 'block';
  });
  document.getElementById('btn-cancel-carrera').addEventListener('click', () => {
    containerCarrera.style.display = 'none';
  });

  const editCarrera = (id) => {
    const c = carrerasData.find(x => x.id === id || x.id == id);
    if (!c) return;
    document.getElementById('car-id').value = c.id;
    document.getElementById('car-nombre').value = c.nombre;
    document.getElementById('car-campus').value = c.campus;
    document.getElementById('car-modalidad').value = c.modalidad;
    document.getElementById('car-cupo').value = c.cupo;
    document.getElementById('form-carrera-title').textContent = 'Editar Carrera';
    containerCarrera.style.display = 'block';
  };

  formCarrera.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('car-id').value;
    const body = {
      nombre: document.getElementById('car-nombre').value,
      campus: document.getElementById('car-campus').value,
      modalidad: document.getElementById('car-modalidad').value,
      cupo: parseInt(document.getElementById('car-cupo').value, 10)
    };
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/carreras/${id}` : '/api/admin/carreras';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast('Carrera guardada');
        containerCarrera.style.display = 'none';
        loadCarreras();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Error al guardar', 'error');
      }
    } catch (err) {
      showToast('Error de red', 'error');
    }
  });

  // --- TAB: Usuarios ---
  const loadUsuarios = async () => {
    try {
      const res = await fetch('/api/admin/usuarios');
      const users = await res.json();
      const tbody = document.querySelector('#table-usuarios tbody');
      tbody.innerHTML = '';
      users.forEach(u => {
        const tr = document.createElement('tr');
        
        const tdNombre = document.createElement('td');
        tdNombre.textContent = u.nombre;
        tr.appendChild(tdNombre);
        
        const tdEmail = document.createElement('td');
        tdEmail.textContent = u.email;
        tr.appendChild(tdEmail);
        
        const tdRole = document.createElement('td');
        tdRole.textContent = u.role;
        tr.appendChild(tdRole);
        
        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(u.createdAt).toLocaleDateString();
        tr.appendChild(tdDate);
        
        const tdAction = document.createElement('td');
        if (u.id !== currentUser.userId) {
          const btnDel = document.createElement('button');
          btnDel.className = 'btn btn-danger btn-del-usr';
          btnDel.dataset.id = u.id;
          btnDel.textContent = 'Eliminar';
          tdAction.appendChild(btnDel);
        }
        tr.appendChild(tdAction);
        
        tbody.appendChild(tr);
      });
      document.querySelectorAll('.btn-del-usr').forEach(btn => {
        btn.addEventListener('click', (e) => {
          showModal('Eliminar usuario', '¿Seguro que deseas eliminar a este usuario?', () => deleteUser(e.target.dataset.id));
        });
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (id) => {
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Usuario eliminado');
        loadUsuarios();
      } else showToast('Error al eliminar', 'error');
    } catch (err) {
      showToast('Error de red', 'error');
    }
  };

  const formUser = document.getElementById('form-user');
  const containerUser = document.getElementById('form-user-container');

  document.getElementById('btn-add-user').addEventListener('click', () => {
    formUser.reset();
    containerUser.style.display = 'block';
  });
  document.getElementById('btn-cancel-user').addEventListener('click', () => {
    containerUser.style.display = 'none';
  });

  formUser.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      nombre: document.getElementById('usr-nombre').value,
      email: document.getElementById('usr-email').value,
      password: document.getElementById('usr-pass').value,
      role: document.getElementById('usr-rol').value
    };
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast('Usuario creado');
        containerUser.style.display = 'none';
        loadUsuarios();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Error al crear', 'error');
      }
    } catch (err) {
      showToast('Error de red', 'error');
    }
  });

  // Initial load
  loadStats();
});
