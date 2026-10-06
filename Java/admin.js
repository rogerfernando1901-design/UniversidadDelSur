document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;

  try {
    const res = await fetch('/api/sesion');
    const data = await res.json();
    if (!data.autenticado) {
      window.location.href = '/Paginas/acceso.html';
      return;
    }
    if (data.role !== 'admin') {
      const panels = {
        control_escolar: '/Paginas/control.html',
        aspirante: '/Paginas/panel.html'
      };
      window.location.replace(panels[data.role] || '/Paginas/admin_panel.html');
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

      if (data.carrerasResumen) {
        data.carrerasResumen.forEach(c => {
          const card = document.createElement('div');
          card.className = 'stat-card';
          
          const numDiv = document.createElement('div');
          numDiv.className = 'number';
          numDiv.textContent = `${c.disponible}/${c.cupo}`;
          
          const nameDiv = document.createElement('div');
          nameDiv.textContent = `${c.nombre} (disponibles)`;
          
          card.appendChild(numDiv);
          card.appendChild(nameDiv);
          container.appendChild(card);
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
      
      const today = new Date();
      // Ajuste local para obtener el string YYYY-MM-DD correcto de "hoy"
      const offset = today.getTimezoneOffset() * 60000;
      const todayStr = (new Date(today - offset)).toISOString().split('T')[0];
      
      const setDateAndMin = (id, val) => {
        const el = document.getElementById(id);
        el.value = formatDateForInput(val);
        el.min = todayStr; // Bloquea en el calendario visual la selección de fechas pasadas
      };

      document.getElementById('conv-activa').checked = data.activa;
      setDateAndMin('conv-apertura', data.fechaApertura);
      setDateAndMin('conv-cierre-rec', data.fechaCierreRecepcion);
      setDateAndMin('conv-cierre-cor', data.fechaCierreCorrecciones);
      
      const costoInput = document.getElementById('conv-costo');
      if (costoInput) costoInput.value = data.costo || 'Gratuito';
    } catch (err) {
      console.error(err);
    }
  };

  document.getElementById('form-convocatoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    const costoInput = document.getElementById('conv-costo');
    const body = {
      activa: document.getElementById('conv-activa').checked,
      fechaApertura: document.getElementById('conv-apertura').value,
      fechaCierreRecepcion: document.getElementById('conv-cierre-rec').value,
      fechaCierreCorrecciones: document.getElementById('conv-cierre-cor').value,
      costo: costoInput ? costoInput.value.trim() : 'Gratuito'
    };
    try {
      const res = await fetch('/api/admin/convocatoria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast('Convocatoria actualizada');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Error al actualizar', 'error');
      }
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
        tdNombre.textContent = c.nombre + (c.activa === false ? ' (No disponible)' : '');
        if (c.activa === false) tdNombre.style.color = 'var(--error)';
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
        
        const tdPlan = document.createElement('td');
        if (c.planEstudios) {
          const a = document.createElement('a');
          a.href = c.planEstudios;
          a.target = '_blank';
          a.textContent = 'Ver Plan';
          tdPlan.appendChild(a);
        } else {
          tdPlan.textContent = '-';
        }
        tr.appendChild(tdPlan);
        
        const tdInscritos = document.createElement('td');
        tdInscritos.textContent = c.inscritos || 0;
        tr.appendChild(tdInscritos);
        
        const tdDisponible = document.createElement('td');
        tdDisponible.textContent = disponible;
        tr.appendChild(tdDisponible);
        
        const tdAction = document.createElement('td');
        tdAction.style.display = 'flex';
        tdAction.style.gap = '8px';
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-secondary btn-edit-car';
        btnEdit.dataset.id = c.id;
        btnEdit.textContent = 'Editar';
        
        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-secondary btn-del-car';
        btnDel.dataset.id = c.id;
        btnDel.textContent = 'Eliminar';
        btnDel.style.background = '#FEF2F2';
        btnDel.style.color = '#991B1B';
        btnDel.style.borderColor = '#FECACA';
        
        tdAction.appendChild(btnEdit);
        tdAction.appendChild(btnDel);
        tr.appendChild(tdAction);
        
        tbody.appendChild(tr);
      });
      document.querySelectorAll('.btn-edit-car').forEach(btn => {
        btn.addEventListener('click', (e) => editCarrera(e.target.dataset.id));
      });
      document.querySelectorAll('.btn-del-car').forEach(btn => {
        btn.addEventListener('click', (e) => deleteCarrera(e.target.dataset.id));
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
    document.getElementById('car-plan').value = c.planEstudios || '';
    document.getElementById('car-config').value = c.configuracionesAvanzadas || '';
    document.getElementById('form-carrera-title').textContent = 'Editar Carrera';
    containerCarrera.style.display = 'block';
  };

  const deleteCarrera = (id) => {
    const c = carrerasData.find(x => x.id === id || x.id == id);
    if (!c) return;
    showModal('Eliminar Carrera', `¿Estás seguro de eliminar la carrera ${c.nombre}?`, async () => {
      try {
        const res = await fetch(`/api/admin/carreras/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          showToast(data.mensaje || 'Acción completada');
          loadCarreras();
        } else {
          showToast(data.error || 'Error al eliminar', 'error');
        }
      } catch (err) {
        showToast('Error de red', 'error');
      }
    });
  };

  formCarrera.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('car-id').value;
    const body = {
      nombre: document.getElementById('car-nombre').value,
      campus: document.getElementById('car-campus').value,
      modalidad: document.getElementById('car-modalidad').value,
      cupo: parseInt(document.getElementById('car-cupo').value, 10),
      planEstudios: document.getElementById('car-plan').value.trim(),
      configuracionesAvanzadas: document.getElementById('car-config').value.trim()
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
    const pwd = document.getElementById('usr-pass').value;
    if (pwd.length < 8 || pwd.length > 128) {
      showToast('La contraseña debe tener entre 8 y 128 caracteres.', 'error');
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      showToast('La contraseña debe incluir al menos una letra mayúscula.', 'error');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~^`]/.test(pwd)) {
      showToast('La contraseña debe incluir al menos un carácter especial.', 'error');
      return;
    }

    const emailVal = document.getElementById('usr-email').value.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailVal || !emailRegex.test(emailVal) || emailVal.length > 254) {
      showToast('Escribe un correo electrónico válido (ejemplo: usuario@dominio.com).', 'error');
      return;
    }

    const body = {
      nombre: document.getElementById('usr-nombre').value,
      email: emailVal,
      password: pwd,
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
