"use strict";

(() => {
  const cupo = document.querySelector('[data-cupo-carrera]');
  if (!cupo) return;

  async function actualizarCupo() {
    try {
      const respuesta = await fetch('/api/carreras', { cache: 'no-store' });
      if (!respuesta.ok) throw new Error('No se pudo consultar el cupo');
      const carreras = await respuesta.json();
      const carrera = carreras.find(c => c.id === cupo.dataset.cupoCarrera);
      if (!carrera || !Number.isFinite(carrera.disponible)) {
        throw new Error('Cupo no disponible');
      }
      const lugares = Math.max(0, carrera.disponible);
      cupo.textContent = `${lugares} ${lugares === 1 ? 'lugar disponible' : 'lugares disponibles'}`;
    } catch (_) {
      cupo.textContent = 'Cupo no disponible';
    }
  }

  actualizarCupo();
  window.addEventListener('pageshow', actualizarCupo);
  window.addEventListener('focus', actualizarCupo);
  setInterval(() => {
    if (!document.hidden) actualizarCupo();
  }, 15000);
})();
