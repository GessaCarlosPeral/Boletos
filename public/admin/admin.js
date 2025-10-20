// ==================================================
// AUTENTICACIÓN Y SESIÓN
// ==================================================

// Verificar autenticación al cargar la página
(function verificarAutenticacion() {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');

  if (!token || !userStr) {
    // No hay sesión, redirigir al login
    window.location.href = '/login';
    return;
  }

  // Cargar info del usuario en el header
  try {
    const user = JSON.parse(userStr);
    document.getElementById('userName').textContent = user.nombre_completo || user.username;
    document.getElementById('userRole').textContent = `Rol: ${user.rol}`;
  } catch (error) {
    console.error('Error cargando datos de usuario:', error);
    window.location.href = '/login';
  }
})();

// Helper para hacer fetch autenticado
async function fetchAutenticado(url, options = {}) {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    window.location.href = '/login';
    return;
  }

  // Agregar headers de autenticación
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  // Si no es FormData, agregar Content-Type
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Si es 401, la sesión expiró
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
    window.location.href = '/login';
    return;
  }

  return response;
}

// Función para cerrar sesión
function cerrarSesion() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  window.location.href = '/login';
}

// ==================================================
// Estado global
let todosLosLotes = [];
let loteActual = null;

// Elementos del DOM
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const generarForm = document.getElementById('generarForm');
const contratistaSelect = document.getElementById('contratista');
const contratistaCustomGroup = document.getElementById('contratistaCustomGroup');
const contratistaCustomInput = document.getElementById('contratistaCustom');
const comedorSelect = document.getElementById('comedor');
const comedorCustomGroup = document.getElementById('comedorCustomGroup');
const comedorCustomInput = document.getElementById('comedorCustom');
const cantidadInput = document.getElementById('cantidad');
const montoInput = document.getElementById('monto');
const fechaVencimientoInput = document.getElementById('fechaVencimiento');
const generarBtn = document.getElementById('generarBtn');
const resultBox = document.getElementById('resultBox');
const resultInfo = document.getElementById('resultInfo');
const downloadLink = document.getElementById('downloadLink');
const quickDateBtns = document.querySelectorAll('.quick-date-btn');

// Elementos de Lotes
const filtroContratistaSelect = document.getElementById('filtroContratista');
const lotesContainer = document.getElementById('lotesContainer');
const loteModal = document.getElementById('loteModal');
const modalClose = document.querySelector('.modal-close');
const modalTitle = document.getElementById('modalTitle');
const modalLoteInfo = document.getElementById('modalLoteInfo');
const boletosTable = document.getElementById('boletosTable');
const searchBoleto = document.getElementById('searchBoleto');
const filtroEstado = document.getElementById('filtroEstado');

// Elementos de Autorización
const autorizacionSection = document.getElementById('autorizacionSection');
const autorizacionForm = document.getElementById('autorizacionForm');

// Elementos de Stats
const statsContainer = document.getElementById('statsContainer');
const filtroStatsContratista = document.getElementById('filtroStatsContratista');
const filtroStatsComedor = document.getElementById('filtroStatsComedor');

// ==================================================
// TABS
// ==================================================
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    // Actualizar tabs
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Actualizar contenido
    tabContents.forEach(tc => tc.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Cargar datos según tab
    if (tabName === 'lotes') {
      cargarContratistas();
      cargarLotes();
    } else if (tabName === 'stats') {
      cargarFiltrosEstadisticas();
      cargarEstadisticas();
      cargarGraficas();
    }
  });
});

// ==================================================
// GENERAR BOLETOS (TAB 1)
// ==================================================

// Cargar contratistas dinámicamente
async function cargarContratistasGeneracion() {
  try {
    const response = await fetch('/api/boletos/contratistas');
    const contratistas = await response.json();

    // Mantener la opción inicial y "Otro"
    contratistaSelect.innerHTML = '<option value="">Seleccione o escriba nuevo...</option>';

    // Agregar todos los contratistas de la BD
    contratistas.forEach(contratista => {
      const option = document.createElement('option');
      option.value = contratista;
      option.textContent = contratista;
      contratistaSelect.appendChild(option);
    });

    // Agregar opción "Otro" al final
    const optionOtro = document.createElement('option');
    optionOtro.value = 'otro';
    optionOtro.textContent = '➕ Otro (escribir nuevo)';
    contratistaSelect.appendChild(optionOtro);
  } catch (error) {
    console.error('Error cargando contratistas:', error);
  }
}

// Cargar contratistas al inicio
cargarContratistasGeneracion();

// Mostrar/ocultar campo personalizado contratista
contratistaSelect.addEventListener('change', async () => {
  if (contratistaSelect.value === 'otro') {
    contratistaCustomGroup.style.display = 'block';
    contratistaCustomInput.required = true;
  } else {
    contratistaCustomGroup.style.display = 'none';
    contratistaCustomInput.required = false;

    // Cargar comedores cuando se selecciona un contratista
    if (contratistaSelect.value) {
      await cargarComedores(contratistaSelect.value);
    }
  }
});

// Mostrar/ocultar campo personalizado comedor
comedorSelect.addEventListener('change', () => {
  if (comedorSelect.value === 'nuevo') {
    comedorCustomGroup.style.display = 'block';
    comedorCustomInput.required = true;
  } else {
    comedorCustomGroup.style.display = 'none';
    comedorCustomInput.required = false;
  }
});

// Cargar comedores de un contratista
async function cargarComedores(nombreContratista) {
  try {
    const response = await fetch(`/api/comedores/contratista/${encodeURIComponent(nombreContratista)}`);
    const comedores = await response.json();

    // Limpiar y agregar opciones
    comedorSelect.innerHTML = '<option value="">Sin comedor asignado</option>';

    comedores.forEach(com => {
      const option = document.createElement('option');
      option.value = com.id;
      option.textContent = com.nombre;
      comedorSelect.appendChild(option);
    });

    // Agregar opción de nuevo comedor
    const optionNuevo = document.createElement('option');
    optionNuevo.value = 'nuevo';
    optionNuevo.textContent = '➕ Nuevo comedor';
    comedorSelect.appendChild(optionNuevo);

  } catch (error) {
    console.error('Error cargando comedores:', error);
  }
}

// Botones de fecha rápida
quickDateBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const months = btn.dataset.months;
    const year = btn.dataset.year;

    if (months) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() + parseInt(months));
      fechaVencimientoInput.value = fecha.toISOString().split('T')[0];
    } else if (year) {
      fechaVencimientoInput.value = `${year}-12-31`;
    }
  });
});

// Establecer fecha mínima
const hoy = new Date().toISOString().split('T')[0];
fechaVencimientoInput.min = hoy;

// Establecer fecha predeterminada a 3 meses (90 días para evitar problemas con meses)
const fechaPredeterminada = new Date();
fechaPredeterminada.setDate(fechaPredeterminada.getDate() + 90);
fechaVencimientoInput.value = fechaPredeterminada.toISOString().split('T')[0];

// Establecer fecha máxima de pago (hoy)
const fechaPagoAuthInput = document.getElementById('fechaPagoAuth');
if (fechaPagoAuthInput) {
  fechaPagoAuthInput.max = hoy;
}

// Generar lote
generarForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  let contratista = contratistaSelect.value;
  if (contratista === 'otro') {
    contratista = contratistaCustomInput.value.trim();
  } else if (contratista === '') {
    mostrarAlerta('Por favor selecciona un contratista', 'error');
    return;
  }

  const cantidad = parseInt(cantidadInput.value);
  const fechaVencimiento = fechaVencimientoInput.value;
  const monto = montoInput.value ? parseFloat(montoInput.value) : null;
  const tipoPago = document.getElementById('tipoPago').value;
  const precioId = document.getElementById('precioSelect').value ? parseInt(document.getElementById('precioSelect').value) : null;

  // Manejar comedor
  let comedorId = null;
  let nombreComedor = null;

  if (comedorSelect.value === 'nuevo') {
    nombreComedor = comedorCustomInput.value.trim();
    if (!nombreComedor) {
      mostrarAlerta('Por favor ingresa el nombre del comedor', 'error');
      return;
    }
  } else if (comedorSelect.value) {
    comedorId = parseInt(comedorSelect.value);
  }

  if (!contratista || !cantidad || !fechaVencimiento) {
    mostrarAlerta('Por favor completa todos los campos', 'error');
    return;
  }

  const fechaVence = new Date(fechaVencimiento);
  const hoyDate = new Date();
  if (fechaVence <= hoyDate) {
    mostrarAlerta('La fecha de vencimiento debe ser futura', 'error');
    return;
  }

  generarBtn.disabled = true;
  generarBtn.textContent = '⏳ Generando...';
  resultBox.classList.remove('show');

  try {
    const response = await fetchAutenticado('/api/boletos/generar', {
      method: 'POST',
      body: JSON.stringify({ contratista, cantidad, fechaVencimiento, monto, comedorId, nombreComedor, tipoPago, precioId })
    });

    const data = await response.json();

    if (response.ok && data.exito) {
      resultInfo.innerHTML = `
        <div><strong>Contratista:</strong><span>${data.contratista}</span></div>
        ${data.comedor ? `<div><strong>Comedor:</strong><span>${data.comedor}</span></div>` : ''}
        <div><strong>Boletos generados:</strong><span>${data.cantidad}</span></div>
        <div><strong>Lote ID:</strong><span>${data.lote}</span></div>
        ${monto ? `<div><strong>Monto:</strong><span>$${monto.toFixed(2)}</span></div>` : ''}
        ${data.tipoPago ? `<div><strong>Tipo de Pago:</strong><span>${data.tipoPago === 'CONTADO' ? '💵 Contado' : '💳 Crédito'}</span></div>` : ''}
        <div><strong>Estado de Pago:</strong><span class="estado-pago-badge estado-${data.estadoPago}">${data.estadoPago}</span></div>
        <div><strong>Válido hasta:</strong><span>${new Date(fechaVencimiento).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</span></div>
      `;

      // No mostrar el link de descarga, debe autorizarse primero
      downloadLink.style.display = 'none';
      resultBox.classList.add('show');

      mostrarAlerta(`✅ Lote generado. ${data.mensaje}`, 'success');
      generarForm.reset();
      contratistaCustomGroup.style.display = 'none';
    } else {
      throw new Error(data.error || 'Error al generar boletos');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('❌ Error al generar boletos: ' + error.message, 'error');
  } finally {
    generarBtn.disabled = false;
    generarBtn.textContent = '🎫 Generar Lote de Boletos';
  }
});

// ==================================================
// LOTES (TAB 2)
// ==================================================

// Cargar contratistas para filtro
async function cargarContratistas() {
  try {
    const response = await fetch('/api/boletos/contratistas');
    const contratistas = await response.json();

    filtroContratistaSelect.innerHTML = '<option value="">Todos los contratistas</option>';
    contratistas.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      filtroContratistaSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando contratistas:', error);
  }
}

// Filtro de contratista
filtroContratistaSelect.addEventListener('change', () => {
  cargarLotes(filtroContratistaSelect.value);
});

// Event listener para ordenación de lotes
const ordenarLotesSelect = document.getElementById('ordenarLotes');
ordenarLotesSelect.addEventListener('change', renderizarLotesOrdenados);

// Event listener para búsqueda por lote
const buscarLoteInput = document.getElementById('buscarLote');
buscarLoteInput.addEventListener('input', renderizarLotesOrdenados);

// Cargar preferencia guardada de ordenación
const ordenPreferido = localStorage.getItem('ordenLotesPreferencia');
if (ordenPreferido) {
  ordenarLotesSelect.value = ordenPreferido;
}

// Cargar lotes
async function cargarLotes(contratista = null) {
  lotesContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando lotes...</p></div>';

  try {
    const url = contratista
      ? `/api/boletos/lotes?contratista=${encodeURIComponent(contratista)}`
      : '/api/boletos/lotes';

    const response = await fetch(url);
    const lotes = await response.json();

    if (lotes.length === 0) {
      lotesContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No hay lotes disponibles</p>';
      return;
    }

    // Obtener último movimiento para cada lote
    const lotesConMovimiento = await Promise.all(lotes.map(async (lote) => {
      try {
        const movResponse = await fetch(`/api/boletos/ultimo-movimiento/${lote.lote}`);
        const movData = await movResponse.json();
        return { ...lote, ultimo_movimiento: movData.ultimo_movimiento };
      } catch (error) {
        console.error('Error obteniendo último movimiento:', error);
        return { ...lote, ultimo_movimiento: null };
      }
    }));

    // Guardar todos los lotes y renderizar con ordenación
    todosLosLotes = lotesConMovimiento;
    renderizarLotesOrdenados();
  } catch (error) {
    console.error('Error cargando lotes:', error);
    lotesContainer.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 2rem;">Error al cargar lotes</p>';
  }
}

// Función de ordenación de lotes
function ordenarLotes(lotes, criterio) {
  const lotesOrdenados = [...lotes];

  switch (criterio) {
    case 'recientes':
      // Más recientes primero (fecha de creación descendente)
      lotesOrdenados.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
      break;

    case 'antiguos':
      // Más antiguos primero (fecha de creación ascendente)
      lotesOrdenados.sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));
      break;

    case 'actividad':
      // Por última actividad (último movimiento descendente)
      lotesOrdenados.sort((a, b) => {
        const fechaA = a.ultimo_movimiento ? new Date(a.ultimo_movimiento) : new Date(0);
        const fechaB = b.ultimo_movimiento ? new Date(b.ultimo_movimiento) : new Date(0);
        return fechaB - fechaA;
      });
      break;

    case 'rechazos':
      // Más rechazos primero
      lotesOrdenados.sort((a, b) => (b.total_rechazos || 0) - (a.total_rechazos || 0));
      break;

    case 'pendientes':
      // Estado: PENDIENTE primero, luego AUTORIZADO
      lotesOrdenados.sort((a, b) => {
        if (a.estado_pago === 'PENDIENTE' && b.estado_pago !== 'PENDIENTE') return -1;
        if (a.estado_pago !== 'PENDIENTE' && b.estado_pago === 'PENDIENTE') return 1;
        return 0;
      });
      break;

    case 'cantidad':
      // Mayor cantidad de boletos primero
      lotesOrdenados.sort((a, b) => (b.total_boletos || 0) - (a.total_boletos || 0));
      break;

    default:
      // Por defecto: más recientes primero
      lotesOrdenados.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
  }

  return lotesOrdenados;
}

// Renderizar lotes ordenados
function renderizarLotesOrdenados() {
  const criterio = document.getElementById('ordenarLotes').value;
  const buscarTermino = document.getElementById('buscarLote').value.trim().toLowerCase();

  // Filtrar por búsqueda si hay término
  let lotesFiltrados = todosLosLotes;
  if (buscarTermino) {
    lotesFiltrados = todosLosLotes.filter(lote =>
      lote.lote.toLowerCase().includes(buscarTermino)
    );
  }

  const lotesOrdenados = ordenarLotes(lotesFiltrados, criterio);

  // Guardar preferencia en localStorage
  localStorage.setItem('ordenLotesPreferencia', criterio);

  // Renderizar
  const lotesContainer = document.getElementById('lotesContainer');

  // Verificar si hay resultados
  if (lotesOrdenados.length === 0) {
    const mensaje = buscarTermino
      ? `No se encontraron lotes que coincidan con "${buscarTermino}"`
      : 'No hay lotes disponibles';
    lotesContainer.innerHTML = `<p style="text-align: center; color: #64748b; padding: 2rem;">${mensaje}</p>`;
    return;
  }

  lotesContainer.innerHTML = lotesOrdenados.map(lote => `
    <div class="lote-item" onclick="verDetalleLote('${lote.lote}')">
      <div class="lote-header">
        <div>
          <div class="lote-title">${lote.contratista}</div>
          <div class="lote-date">Creado: ${new Date(lote.fecha_creacion).toLocaleString('es-MX')}</div>
          <div class="lote-date">Vence: ${new Date(lote.fecha_vencimiento).toLocaleDateString('es-MX')}</div>
          ${lote.precio_nombre ? `<div class="lote-date">🍽️ ${lote.precio_nombre}</div>` : ''}
          ${lote.monto ? `<div class="lote-date">Monto: $${parseFloat(lote.monto).toFixed(2)}</div>` : ''}
          ${lote.tipo_pago ? `<div class="lote-date">${lote.tipo_pago === 'CONTADO' ? '💵' : '💳'} ${lote.tipo_pago === 'CONTADO' ? 'Contado' : 'Crédito'}</div>` : ''}
          ${lote.ultimo_movimiento ? `<div class="lote-date" style="color: #10b981;">📊 Último escaneo: ${new Date(lote.ultimo_movimiento).toLocaleString('es-MX')}</div>` : '<div class="lote-date" style="color: #94a3b8;">📊 Sin escaneos aún</div>'}
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; color: #64748b;">Lote</div>
          <div style="font-size: 0.875rem; font-family: monospace; color: #475569;">${lote.lote}</div>
          <div style="margin-top: 0.5rem;">
            <span class="estado-pago-badge estado-${lote.estado_pago || 'PENDIENTE'}">${lote.estado_pago || 'PENDIENTE'}</span>
          </div>
        </div>
      </div>
      <div class="lote-stats">
        <div class="lote-stat">
          <div class="lote-stat-value">${lote.total_boletos}</div>
          <div class="lote-stat-label">Total</div>
        </div>
        <div class="lote-stat">
          <div class="lote-stat-value" style="color: #10b981;">${lote.boletos_usados || 0}</div>
          <div class="lote-stat-label">Usados</div>
        </div>
        <div class="lote-stat">
          <div class="lote-stat-value" style="color: #f59e0b;">${lote.boletos_disponibles}</div>
          <div class="lote-stat-label">Disponibles</div>
        </div>
        <div class="lote-stat">
          <div class="lote-stat-value" style="color: #ef4444;">${lote.total_rechazos || 0}</div>
          <div class="lote-stat-label">Rechazados</div>
        </div>
      </div>
    </div>
  `).join('');
}

// Ver detalle de lote
async function verDetalleLote(loteId) {
  try {
    const [detalleResponse, pagoResponse] = await Promise.all([
      fetch(`/api/boletos/lotes/${loteId}`),
      fetch(`/api/boletos/pago/${loteId}`)
    ]);

    const detalle = await detalleResponse.json();
    const infoPago = await pagoResponse.json();

    loteActual = { ...detalle, infoPago };

    modalTitle.textContent = `Lote: ${loteId}`;

    let infoHtml = `
      <div class="lote-info-grid">
        <div class="lote-info-item">
          <div class="lote-info-label">Contratista</div>
          <div class="lote-info-value">${detalle.contratista}</div>
        </div>
        <div class="lote-info-item">
          <div class="lote-info-label">Total Boletos</div>
          <div class="lote-info-value">${detalle.total}</div>
        </div>
        <div class="lote-info-item">
          <div class="lote-info-label">Usados</div>
          <div class="lote-info-value" style="color: #10b981;">${detalle.usados}</div>
        </div>
        <div class="lote-info-item">
          <div class="lote-info-label">Disponibles</div>
          <div class="lote-info-value" style="color: #f59e0b;">${detalle.disponibles}</div>
        </div>
        <div class="lote-info-item">
          <div class="lote-info-label">Rechazados</div>
          <div class="lote-info-value" style="color: #ef4444;">${detalle.rechazados || 0}</div>
        </div>
        <div class="lote-info-item">
          <div class="lote-info-label">Creado</div>
          <div class="lote-info-value">${new Date(detalle.fecha_creacion).toLocaleDateString('es-MX')}</div>
        </div>
        <div class="lote-info-item">
          <div class="lote-info-label">Vence</div>
          <div class="lote-info-value">${new Date(detalle.fecha_vencimiento).toLocaleDateString('es-MX')}</div>
        </div>
        ${detalle.precio_nombre ? `
        <div class="lote-info-item">
          <div class="lote-info-label">Tipo de Platillo</div>
          <div class="lote-info-value">🍽️ ${detalle.precio_nombre}</div>
        </div>` : ''}
        ${infoPago.monto ? `
        <div class="lote-info-item">
          <div class="lote-info-label">Monto</div>
          <div class="lote-info-value">$${parseFloat(infoPago.monto).toFixed(2)}</div>
        </div>` : ''}
        ${infoPago.tipo_pago ? `
        <div class="lote-info-item">
          <div class="lote-info-label">Tipo de Pago</div>
          <div class="lote-info-value">${infoPago.tipo_pago === 'CONTADO' ? '💵 Contado' : '💳 Crédito'}</div>
        </div>` : ''}
        <div class="lote-info-item">
          <div class="lote-info-label">Estado de Pago</div>
          <div class="lote-info-value">
            <span class="estado-pago-badge estado-${infoPago.estado_pago}">${infoPago.estado_pago}</span>
          </div>
        </div>
      </div>
    `;

    // Si está autorizado, mostrar info de autorización y sistema de descarga controlada
    if (infoPago.estado_pago === 'AUTORIZADO') {
      // Obtener info de descargas
      const verificacion = await fetch(`/api/boletos/verificar-descarga/${loteId}`);
      const infoDescarga = await verificacion.json();

      infoHtml += `
        <div style="margin-top: 1.5rem; padding: 1rem; background: #d1fae5; border-radius: 0.5rem; border-left: 4px solid #10b981;">
          <h4 style="color: #065f46; margin-bottom: 1rem;">✓ Autorización de Descarga</h4>
          <div class="lote-info-grid">
            <div class="lote-info-item">
              <div class="lote-info-label">Código de Autorización</div>
              <div class="lote-info-value">${infoPago.codigo_autorizacion}</div>
            </div>
            <div class="lote-info-item">
              <div class="lote-info-label">Autorizado Por</div>
              <div class="lote-info-value">${infoPago.autorizado_por}</div>
            </div>
            <div class="lote-info-item">
              <div class="lote-info-label">Fecha de Pago</div>
              <div class="lote-info-value">${new Date(infoPago.fecha_pago).toLocaleDateString('es-MX')}</div>
            </div>
            ${infoPago.comprobante_pago ? `
            <div class="lote-info-item">
              <div class="lote-info-label">Comprobante</div>
              <div class="lote-info-value">
                <a href="${infoPago.comprobante_pago}" target="_blank" style="color: #2563eb; text-decoration: underline;">Ver comprobante</a>
              </div>
            </div>` : ''}
            <div class="lote-info-item">
              <div class="lote-info-label">Descargas Restantes</div>
              <div class="lote-info-value" style="color: ${infoDescarga.puede ? '#10b981' : '#ef4444'};">
                ${infoDescarga.puede ? infoDescarga.intentosRestantes + '/3' : 'Agotadas'}
              </div>
            </div>
          </div>
          ${infoPago.notas ? `<p style="margin-top: 0.5rem; color: #065f46;"><strong>Notas:</strong> ${infoPago.notas}</p>` : ''}

          ${infoDescarga.puede ? `
            <button onclick="mostrarModalDescarga('${loteId}')" class="download-link" style="margin-top: 1rem; display: inline-block; border: none; cursor: pointer;">
              📥 Descargar PDF (${infoDescarga.intentosRestantes} intentos restantes)
            </button>
          ` : `
            <div style="margin-top: 1rem; padding: 1rem; background: #fee2e2; border-radius: 0.5rem; color: #991b1b;">
              ⚠️ ${infoDescarga.razon}
            </div>
          `}
        </div>
      `;

      // Cargar historial de descargas
      const historialResponse = await fetch(`/api/boletos/historial-descargas/${loteId}`);
      const historial = await historialResponse.json();

      if (historial.length > 0) {
        infoHtml += `
          <div style="margin-top: 1rem;">
            <h4 style="color: #1e293b; margin-bottom: 0.5rem;">📋 Historial de Descargas</h4>
            <div style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem;">
              ${historial.map(h => `
                <div style="padding: 0.5rem; background: white; margin-bottom: 0.5rem; border-radius: 0.25rem; font-size: 0.875rem;">
                  <div><strong>Usuario:</strong> ${h.usuario}</div>
                  <div><strong>Razón:</strong> ${h.razon}</div>
                  <div><strong>Fecha:</strong> ${new Date(h.fecha).toLocaleString('es-MX')}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      autorizacionSection.style.display = 'none';
    } else {
      // Obtener usuario actual
      const userStr = localStorage.getItem('auth_user');
      const user = userStr ? JSON.parse(userStr) : null;

      // Verificar permisos - solo admin y rol con acceso a finanzas pueden autorizar
      const puedeAutorizar = user && (user.rol === 'Administrador' || user.nivelAcceso >= 3);

      if (!puedeAutorizar) {
        autorizacionSection.style.display = 'block';
        autorizacionSection.innerHTML = `
          <div style="padding: 1.5rem; background: #fee2e2; border-radius: 0.5rem; border-left: 4px solid #ef4444;">
            <p style="color: #991b1b; margin: 0;">
              ⚠️ No tienes permisos para autorizar pagos. Solo los administradores y personal de finanzas pueden realizar esta acción.
            </p>
          </div>
        `;
        return;
      }

      // Mostrar formulario de autorización
      autorizacionSection.style.display = 'block';
      autorizacionForm.dataset.loteId = loteId;
      autorizacionForm.dataset.tipoPago = infoPago.tipo_pago; // Guardar tipo de pago

      // Autocompletar campo "Autorizado Por" con el usuario actual
      document.getElementById('autorizadoPor').value = user.nombre_completo || user.username;

      // Generar código de autorización automático
      const fecha = new Date();
      const codigoAuto = `AUTH-${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
      document.getElementById('codigoAuth').value = codigoAuto;

      // Ajustar validación del comprobante según tipo de pago
      const comprobante = document.getElementById('comprobantePago');
      const labelComprobante = document.getElementById('labelComprobante');

      if (infoPago.tipo_pago === 'CREDITO') {
        comprobante.removeAttribute('required');
        labelComprobante.textContent = 'Comprobante de Pago (imagen)';
      } else {
        comprobante.setAttribute('required', 'required');
        labelComprobante.textContent = 'Comprobante de Pago (imagen) *';
      }
    }

    // Agregar botones de acciones
    infoHtml += `
      <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid #e2e8f0;">
        <button onclick="mostrarFotosEscaneos('${loteId}', '${detalle.contratista}')" class="download-link" style="width: 100%; padding: 1rem; background: #8b5cf6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">
          📸 Ver Fotos de Escaneos
        </button>
        <button onclick="descargarReporteEstado('${loteId}')" class="download-link" style="width: 100%; padding: 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; font-weight: 600;">
          📊 Descargar Reporte de Estado del Lote (CSV)
        </button>
        <p style="margin-top: 0.5rem; text-align: center; color: #64748b; font-size: 0.875rem;">
          Incluye estado detallado de cada boleto y rechazos
        </p>
      </div>
    `;

    modalLoteInfo.innerHTML = infoHtml;

    renderizarBoletos(detalle.boletos);
    loteModal.classList.add('show');
  } catch (error) {
    console.error('Error cargando detalle:', error);
    alert('Error al cargar detalle del lote');
  }
}

// Renderizar tabla de boletos
async function renderizarBoletos(boletos) {
  const filtroTexto = searchBoleto.value.toLowerCase();
  const filtroEstadoVal = filtroEstado.value;

  const boletosFiltrados = boletos.filter(b => {
    const matchTexto = b.uuid.toLowerCase().includes(filtroTexto);
    const matchEstado = !filtroEstadoVal || b.estado === filtroEstadoVal;
    return matchTexto && matchEstado;
  });

  if (boletosFiltrados.length === 0) {
    boletosTable.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No se encontraron boletos</p>';
    return;
  }

  // Mostrar loading mientras se cargan los rechazos
  boletosTable.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">Cargando datos de rechazos...</p>';

  // Obtener rechazos para todos los boletos
  const boletosConRechazos = await Promise.all(boletosFiltrados.map(async (b) => {
    try {
      const response = await fetch(`/api/boletos/rechazos/${b.uuid}`);
      const data = await response.json();
      return { ...b, rechazos: data };
    } catch (error) {
      console.error('Error obteniendo rechazos:', error);
      return { ...b, rechazos: { total_rechazos: 0, rechazos: [] } };
    }
  }));

  boletosTable.innerHTML = boletosConRechazos.map(b => {
    const ultimoRechazo = b.rechazos.rechazos.length > 0 ? b.rechazos.rechazos[0] : null;
    const rechazoInfo = ultimoRechazo
      ? `<div style="font-size: 0.75rem; color: #64748b;">${new Date(ultimoRechazo.fecha).toLocaleString('es-MX')}</div>`
      : '<div style="font-size: 0.75rem; color: #94a3b8;">Sin rechazos</div>';

    return `
      <div class="boleto-row" style="cursor: pointer;">
        <div class="boleto-uuid" onclick="mostrarHistorialRechazos('${b.uuid}')">${b.uuid}</div>
        <div onclick="mostrarHistorialRechazos('${b.uuid}')"><span class="boleto-estado estado-${b.estado}">${b.estado}</span></div>
        <div class="boleto-fecha" onclick="mostrarHistorialRechazos('${b.uuid}')">${b.fecha_uso ? new Date(b.fecha_uso).toLocaleString('es-MX') : '-'}</div>
        <div class="boleto-ubicacion" onclick="mostrarHistorialRechazos('${b.uuid}')">${b.ubicacion || '-'}</div>
        <div style="text-align: center;" onclick="mostrarHistorialRechazos('${b.uuid}')">
          <div style="font-weight: 600; color: ${b.rechazos.total_rechazos > 0 ? '#ef4444' : '#10b981'}; font-size: 1.25rem;">
            ${b.rechazos.total_rechazos}
          </div>
          ${rechazoInfo}
        </div>
        <div style="text-align: center;">
          <button onclick="verFotoBoleto('${b.uuid}', event)" style="background: none; border: none; cursor: pointer; font-size: 1.5rem; padding: 0.25rem; transition: opacity 0.2s;" title="Ver foto de escaneo">
            📸
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Mostrar historial de rechazos de un boleto
async function mostrarHistorialRechazos(uuid) {
  try {
    const response = await fetch(`/api/boletos/rechazos/${uuid}`);
    const data = await response.json();

    let mensaje = `📊 Historial de Boleto\n\nUUID: ${uuid}\n\n`;

    if (data.total_rechazos === 0) {
      mensaje += '✅ Este boleto no tiene rechazos registrados.';
    } else {
      mensaje += `❌ Total de rechazos: ${data.total_rechazos}\n\n`;
      mensaje += 'Detalles de los rechazos:\n\n';
      data.rechazos.forEach((rechazo, index) => {
        mensaje += `${index + 1}. ${new Date(rechazo.fecha).toLocaleString('es-MX')}\n`;
        mensaje += `   Motivo: ${rechazo.motivo_rechazo}\n`;
        if (rechazo.ubicacion) {
          mensaje += `   Ubicación: ${rechazo.ubicacion}\n`;
        }
        mensaje += '\n';
      });
    }

    alert(mensaje);
  } catch (error) {
    console.error('Error obteniendo historial de rechazos:', error);
    alert('Error al obtener el historial de rechazos');
  }
}

// Descargar reporte de estado del lote
async function descargarReporteEstado(loteId) {
  try {
    // Obtener detalle del lote con todos los boletos
    const detalleResponse = await fetch(`/api/boletos/lotes/${loteId}`);
    const detalle = await detalleResponse.json();

    // Obtener rechazos de cada boleto
    const boletosConRechazos = await Promise.all(detalle.boletos.map(async (boleto) => {
      try {
        const rechazoResponse = await fetch(`/api/boletos/rechazos/${boleto.uuid}`);
        const rechazoData = await rechazoResponse.json();
        return {
          ...boleto,
          total_rechazos: rechazoData.total_rechazos || 0,
          ultimo_rechazo: rechazoData.rechazos && rechazoData.rechazos.length > 0
            ? new Date(rechazoData.rechazos[0].fecha).toLocaleString('es-MX')
            : 'N/A'
        };
      } catch (error) {
        return { ...boleto, total_rechazos: 0, ultimo_rechazo: 'N/A' };
      }
    }));

    // Crear CSV
    let csv = '\uFEFF'; // BOM para UTF-8
    csv += 'REPORTE DE ESTADO DEL LOTE\n';
    csv += `Lote: ${loteId}\n`;
    csv += `Contratista: ${detalle.contratista}\n`;
    csv += `Fecha de creación: ${new Date(detalle.fecha_creacion).toLocaleString('es-MX')}\n`;
    csv += `Fecha de vencimiento: ${new Date(detalle.fecha_vencimiento).toLocaleString('es-MX')}\n`;
    csv += `Total boletos: ${detalle.total}\n`;
    csv += `Boletos usados: ${detalle.usados}\n`;
    csv += `Boletos disponibles: ${detalle.disponibles}\n`;
    csv += `Total rechazos: ${detalle.rechazados}\n\n`;

    // Encabezados
    csv += 'UUID,Estado,Fecha de Uso,Ubicación,Total Rechazos,Último Rechazo\n';

    // Datos de cada boleto
    boletosConRechazos.forEach(boleto => {
      csv += `"${boleto.uuid}",`;
      csv += `"${boleto.estado}",`;
      csv += `"${boleto.fecha_uso ? new Date(boleto.fecha_uso).toLocaleString('es-MX') : 'N/A'}",`;
      csv += `"${boleto.ubicacion || 'N/A'}",`;
      csv += `"${boleto.total_rechazos}",`;
      csv += `"${boleto.ultimo_rechazo}"\n`;
    });

    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Lote_${loteId}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    alert('✅ Reporte descargado exitosamente');
  } catch (error) {
    console.error('Error descargando reporte:', error);
    alert('❌ Error al generar el reporte');
  }
}

// Filtros de búsqueda
searchBoleto.addEventListener('input', () => {
  if (loteActual) {
    renderizarBoletos(loteActual.boletos);
  }
});

filtroEstado.addEventListener('change', () => {
  if (loteActual) {
    renderizarBoletos(loteActual.boletos);
  }
});

// Cerrar modal
modalClose.addEventListener('click', () => {
  loteModal.classList.remove('show');
});

window.addEventListener('click', (e) => {
  if (e.target === loteModal) {
    loteModal.classList.remove('show');
  }
});

// ==================================================
// AUTORIZACIÓN DE LOTES
// ==================================================

autorizacionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const loteId = autorizacionForm.dataset.loteId;
  const codigoAuth = document.getElementById('codigoAuth').value;
  const autorizadoPor = document.getElementById('autorizadoPor').value;
  const fechaPagoAuth = document.getElementById('fechaPagoAuth').value;
  const comprobantePago = document.getElementById('comprobantePago').files[0];
  const notasAuth = document.getElementById('notasAuth').value;

  // Obtener el tipo de pago desde el atributo data del formulario
  const tipoPago = autorizacionForm.dataset.tipoPago;

  // Validar campos requeridos según el tipo de pago
  if (!codigoAuth || !autorizadoPor || !fechaPagoAuth) {
    alert('Por favor completa todos los campos requeridos');
    return;
  }

  // Si es CONTADO, el comprobante es obligatorio
  if (tipoPago === 'CONTADO' && !comprobantePago) {
    alert('El comprobante de pago es obligatorio para pagos de CONTADO');
    return;
  }

  const formData = new FormData();
  formData.append('codigoAutorizacion', codigoAuth);
  formData.append('autorizadoPor', autorizadoPor);
  formData.append('fechaPago', fechaPagoAuth);
  formData.append('comprobante', comprobantePago);
  formData.append('notas', notasAuth);

  const submitBtn = autorizacionForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Autorizando...';

  try {
    const response = await fetch(`/api/boletos/autorizar/${loteId}`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok && data.exito) {
      alert('✅ Lote autorizado exitosamente. Ya se puede descargar el PDF.');
      loteModal.classList.remove('show');
      cargarLotes(filtroContratistaSelect.value); // Recargar lista
      autorizacionForm.reset();
    } else {
      throw new Error(data.error || 'Error al autorizar lote');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al autorizar lote: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✓ Autorizar Descarga';
  }
});

// ==================================================
// ESTADÍSTICAS (TAB 3)
// ==================================================

// Cargar filtros de estadísticas
async function cargarFiltrosEstadisticas() {
  try {
    // Cargar contratistas
    const contratistaResponse = await fetch('/api/boletos/contratistas');
    const contratistas = await contratistaResponse.json();

    filtroStatsContratista.innerHTML = '<option value="">Todos los contratistas</option>';
    contratistas.forEach(contratista => {
      const option = document.createElement('option');
      option.value = contratista;
      option.textContent = contratista;
      filtroStatsContratista.appendChild(option);
    });

    // Cargar todos los comedores
    const comedoresResponse = await fetch('/api/comedores');
    const comedores = await comedoresResponse.json();

    filtroStatsComedor.innerHTML = '<option value="">Todos los comedores</option>';
    comedores.forEach(comedor => {
      const option = document.createElement('option');
      option.value = comedor.id;
      option.textContent = `${comedor.nombre} (${comedor.contratista_nombre})`;
      filtroStatsComedor.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando filtros:', error);
  }
}

// Event listeners para filtros
filtroStatsContratista.addEventListener('change', () => {
  cargarEstadisticas();
  cargarGraficas();
});

filtroStatsComedor.addEventListener('change', () => {
  cargarEstadisticas();
  cargarGraficas();
});

async function cargarEstadisticas() {
  statsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando estadísticas...</p></div>';

  try {
    // Construir URL con parámetros de filtro
    const params = new URLSearchParams();
    if (filtroStatsContratista.value) {
      params.append('contratista', filtroStatsContratista.value);
    }
    if (filtroStatsComedor.value) {
      params.append('comedorId', filtroStatsComedor.value);
    }

    const url = `/api/boletos/estadisticas${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const stats = await response.json();

    if (stats.length === 0) {
      statsContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No hay estadísticas disponibles</p>';
      return;
    }

    const totales = stats.reduce((acc, stat) => {
      acc.total += stat.total;
      acc.usados += stat.usados;
      acc.disponibles += stat.disponibles;
      return acc;
    }, { total: 0, usados: 0, disponibles: 0 });

    const porcentajeUso = totales.total > 0 ? Math.round((totales.usados / totales.total) * 100) : 0;

    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${totales.total}</div>
          <div class="stat-label">Total Generados</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totales.usados}</div>
          <div class="stat-label">Usados</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totales.disponibles}</div>
          <div class="stat-label">Disponibles</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${porcentajeUso}%</div>
          <div class="stat-label">Uso</div>
        </div>
      </div>

      <h3 style="margin: 2rem 0 1rem; color: #1e293b;">Por Contratista</h3>
      <div style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem;">
        ${stats.map(stat => {
          const porcentaje = Math.round((stat.usados / stat.total) * 100);
          return `
            <div style="padding: 1rem; background: white; margin-bottom: 0.5rem; border-radius: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="color: #1e293b;">${stat.contratista}</strong>
                <span style="color: #64748b; font-size: 0.875rem;">${porcentaje}% usado</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.875rem; color: #64748b;">
                <div>Total: <strong>${stat.total}</strong></div>
                <div>Usados: <strong style="color: #10b981;">${stat.usados}</strong></div>
                <div>Disponibles: <strong style="color: #2563eb;">${stat.disponibles}</strong></div>
              </div>
              <div style="margin-top: 0.5rem; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                <div style="width: ${porcentaje}%; height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%);"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    statsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 2rem;">Error al cargar estadísticas</p>';
  }
}

// ==================================================
// UTILIDADES
// ==================================================

function mostrarAlerta(mensaje, tipo) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${tipo}`;
  alert.textContent = mensaje;

  generarForm.insertBefore(alert, generarForm.firstChild);

  setTimeout(() => alert.remove(), 5000);
}

// ========================================
// Funcionalidad de descarga con razón
// ========================================

let loteIdParaDescargar = null;

function mostrarModalDescarga(loteId) {
  loteIdParaDescargar = loteId;
  const modal = document.getElementById('descargaModal');
  modal.style.display = 'flex';

  // Limpiar formulario
  document.getElementById('descargaForm').reset();
  document.getElementById('razonOtraGroup').style.display = 'none';
}

function cerrarModalDescarga() {
  const modal = document.getElementById('descargaModal');
  modal.style.display = 'none';
  loteIdParaDescargar = null;
}

// Mostrar campo "Otro" cuando se selecciona esa opción
document.addEventListener('DOMContentLoaded', () => {
  const razonSelect = document.getElementById('razonDescarga');
  if (razonSelect) {
    razonSelect.addEventListener('change', (e) => {
      const razonOtraGroup = document.getElementById('razonOtraGroup');
      const razonOtraTextarea = document.getElementById('razonOtra');

      if (e.target.value === 'Otro') {
        razonOtraGroup.style.display = 'block';
        razonOtraTextarea.required = true;
      } else {
        razonOtraGroup.style.display = 'none';
        razonOtraTextarea.required = false;
        razonOtraTextarea.value = '';
      }
    });
  }

  // Cerrar modal al hacer clic fuera de él
  const descargaModal = document.getElementById('descargaModal');
  if (descargaModal) {
    descargaModal.addEventListener('click', (e) => {
      if (e.target === descargaModal) {
        cerrarModalDescarga();
      }
    });
  }
});

// Manejar envío del formulario de descarga
document.addEventListener('DOMContentLoaded', () => {
  const descargaForm = document.getElementById('descargaForm');
  if (descargaForm) {
    descargaForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!loteIdParaDescargar) {
        alert('Error: No se ha seleccionado un lote');
        return;
      }

      const usuario = document.getElementById('usuarioDescarga').value.trim();
      const razonSelect = document.getElementById('razonDescarga').value;
      const razonOtra = document.getElementById('razonOtra').value.trim();

      // Determinar la razón final
      const razon = razonSelect === 'Otro' ? razonOtra : razonSelect;

      if (!usuario || !razon) {
        alert('Por favor complete todos los campos requeridos');
        return;
      }

      // Deshabilitar botón de envío
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registrando...';

      try {
        // Primero registrar la descarga
        const response = await fetch(`/api/boletos/descargar/${loteIdParaDescargar}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ usuario, razon })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al registrar descarga');
        }

        // Si el registro fue exitoso, obtener el PDF URL y descargarlo
        const infoResponse = await fetch(`/api/boletos/pago/${loteIdParaDescargar}`);
        const infoData = await infoResponse.json();

        if (infoData.pdf_url) {
          // Descargar el archivo
          const link = document.createElement('a');
          link.href = infoData.pdf_url;
          link.download = infoData.pdf_url.split('/').pop();
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          alert(`✅ Descarga registrada exitosamente.\nIntentos restantes: ${data.intentosRestantes}`);

          // Cerrar modal y actualizar vista
          cerrarModalDescarga();

          // Si estamos viendo el detalle del lote, actualizar
          if (document.getElementById('loteModal').style.display === 'flex') {
            verDetalleLote(loteIdParaDescargar);
          }
        } else {
          throw new Error('No se encontró el PDF para descargar');
        }

      } catch (error) {
        console.error('Error en descarga:', error);
        alert('❌ ' + error.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '📥 Descargar';
      }
    });
  }
});

// ==================================================
// GRÁFICAS
// ==================================================

// Variables globales para almacenar instancias de gráficas
let chartInstances = {};

// Destruir gráfica si existe
function destruirGrafica(chartId) {
  if (chartInstances[chartId]) {
    chartInstances[chartId].destroy();
    delete chartInstances[chartId];
  }
}

// Cargar y renderizar gráficas
async function cargarGraficas() {
  try {
    // Construir URL con parámetros de filtro
    const params = new URLSearchParams();
    if (filtroStatsContratista.value) {
      params.append('contratista', filtroStatsContratista.value);
    }
    if (filtroStatsComedor.value) {
      params.append('comedorId', filtroStatsComedor.value);
    }

    const url = `/api/boletos/graficas${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const datos = await response.json();

    // Renderizar cada gráfica
    renderizarGraficaBoletosTime(datos.boletosTime);
    renderizarGraficaIngresosTime(datos.ingresosTime);
    renderizarGraficaUsoTime(datos.usoTime, datos.rechazosTime);
    renderizarGraficaTopContratistas(datos.topContratistas);
    renderizarGraficaComedores(datos.comedores);
    renderizarGraficaEstadoPagos(datos.estadoPagos);
    renderizarGraficaPlatillos(datos.platillos);

  } catch (error) {
    console.error('Error cargando gráficas:', error);
  }
}

// 1. Gráfica de Boletos Generados en el Tiempo
function renderizarGraficaBoletosTime(datos) {
  destruirGrafica('chartBoletosTime');

  const ctx = document.getElementById('chartBoletosTime').getContext('2d');
  chartInstances['chartBoletosTime'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: datos.map(d => new Date(d.fecha).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Boletos Generados',
        data: datos.map(d => d.cantidad),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// 2. Gráfica de Ingresos en el Tiempo
function renderizarGraficaIngresosTime(datos) {
  destruirGrafica('chartIngresosTime');

  const ctx = document.getElementById('chartIngresosTime').getContext('2d');
  chartInstances['chartIngresosTime'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: datos.map(d => new Date(d.fecha).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Ingresos ($)',
        data: datos.map(d => d.ingresos || 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-MX');
            }
          }
        }
      }
    }
  });
}

// 3. Gráfica de Tasa de Uso
function renderizarGraficaUsoTime(datos, rechazosData = []) {
  destruirGrafica('chartUsoTime');

  // Combinar fechas de ambos datasets
  const todasFechas = new Set([
    ...datos.map(d => d.fecha),
    ...rechazosData.map(d => d.fecha)
  ]);
  const fechasOrdenadas = Array.from(todasFechas).sort();

  // Crear mapas para búsqueda rápida
  const datosMap = {};
  datos.forEach(d => { datosMap[d.fecha] = d; });
  const rechazosMap = {};
  rechazosData.forEach(d => { rechazosMap[d.fecha] = d; });

  const ctx = document.getElementById('chartUsoTime').getContext('2d');
  chartInstances['chartUsoTime'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: fechasOrdenadas.map(f => new Date(f).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Generados',
          data: fechasOrdenadas.map(f => datosMap[f] ? datosMap[f].generados : 0),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.4
        },
        {
          label: 'Usados',
          data: fechasOrdenadas.map(f => datosMap[f] ? datosMap[f].usados : 0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        },
        {
          label: 'Rechazados',
          data: fechasOrdenadas.map(f => rechazosMap[f] ? rechazosMap[f].rechazados : 0),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true, position: 'top' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// 4. Gráfica Top Contratistas
function renderizarGraficaTopContratistas(datos) {
  destruirGrafica('chartTopContratistas');

  const ctx = document.getElementById('chartTopContratistas').getContext('2d');
  chartInstances['chartTopContratistas'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datos.map(d => d.contratista),
      datasets: [{
        label: 'Total de Boletos',
        data: datos.map(d => d.total_boletos),
        backgroundColor: [
          '#2563eb',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

// 5. Gráfica Distribución por Comedor
function renderizarGraficaComedores(datos) {
  destruirGrafica('chartComedores');

  if (datos.length === 0) {
    const ctx = document.getElementById('chartComedores').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('No hay datos de comedores', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  const ctx = document.getElementById('chartComedores').getContext('2d');
  chartInstances['chartComedores'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: datos.map(d => `${d.comedor} (${d.contratista})`),
      datasets: [{
        data: datos.map(d => d.total_boletos),
        backgroundColor: [
          '#2563eb',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#ec4899',
          '#06b6d4',
          '#84cc16'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

// 6. Gráfica Estado de Pagos
function renderizarGraficaEstadoPagos(datos) {
  destruirGrafica('chartEstadoPagos');

  const ctx = document.getElementById('chartEstadoPagos').getContext('2d');
  chartInstances['chartEstadoPagos'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: datos.map(d => d.estado_pago),
      datasets: [{
        data: datos.map(d => d.cantidad),
        backgroundColor: [
          '#10b981', // AUTORIZADO - verde
          '#f59e0b', // PENDIENTE - amarillo
          '#ef4444'  // RECHAZADO - rojo
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

// 7. Gráfica de Distribución por Tipo de Platillo
function renderizarGraficaPlatillos(datos) {
  destruirGrafica('chartPlatillos');

  if (!datos || datos.length === 0) {
    return;
  }

  const ctx = document.getElementById('chartPlatillos').getContext('2d');
  chartInstances['chartPlatillos'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datos.map(d => d.precio_nombre || 'Sin clasificar'),
      datasets: [{
        label: 'Boletos',
        data: datos.map(d => d.cantidad),
        backgroundColor: '#8b5cf6'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// Cargar estadísticas al iniciar
cargarEstadisticas();

// ==================================================
// TAB PRECIOS - GESTIÓN DE PRECIOS
// ==================================================

let precioActivo = null;

// Elementos de precios
const precioForm = document.getElementById('precioForm');
const precioIdInput = document.getElementById('precioId');
const precioNombreInput = document.getElementById('precioNombre');
const precioUnitarioInput = document.getElementById('precioUnitario');
const precioDescripcionInput = document.getElementById('precioDescripcion');
const cancelarPrecioBtn = document.getElementById('cancelarPrecioBtn');
const preciosContainer = document.getElementById('preciosContainer');
const precioActivoValor = document.getElementById('precioActivoValor');
const precioActivoNombre = document.getElementById('precioActivoNombre');

// Cargar precio activo
async function cargarPrecioActivo() {
  try {
    const response = await fetch('/api/precios/activo');
    const precio = await response.json();

    precioActivo = precio;

    if (precio && precio.precio_unitario) {
      precioActivoValor.textContent = `$${parseFloat(precio.precio_unitario).toFixed(2)}`;
      precioActivoNombre.textContent = precio.nombre || '-';
    } else {
      precioActivoValor.textContent = '$0.00';
      precioActivoNombre.textContent = 'No hay precio configurado';
    }
  } catch (error) {
    console.error('Error cargando precio activo:', error);
  }
}

// Cargar lista de precios
async function cargarPrecios() {
  try {
    const response = await fetch('/api/precios');
    const precios = await response.json();

    if (precios.length === 0) {
      preciosContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #64748b;">
          No hay precios configurados
        </div>
      `;
      return;
    }

    preciosContainer.innerHTML = precios.map(precio => `
      <div class="precio-item ${precio.activo ? 'activo' : ''}">
        <div class="precio-info">
          <div class="precio-nombre">
            ${precio.nombre}
            ${precio.activo ? '<span class="precio-badge-activo">ACTIVO</span>' : ''}
          </div>
          <div class="precio-valor">$${parseFloat(precio.precio_unitario).toFixed(2)}</div>
          ${precio.descripcion ? `<div class="precio-descripcion">${precio.descripcion}</div>` : ''}
          <div class="precio-meta">
            <span>Creado: ${new Date(precio.fecha_creacion).toLocaleDateString('es-MX')}</span>
            <span>Actualizado: ${new Date(precio.fecha_actualizacion).toLocaleDateString('es-MX')}</span>
          </div>
        </div>
        <div class="precio-acciones">
          <button class="precio-btn precio-btn-editar" onclick="editarPrecio(${precio.id})">
            ✏️ Editar
          </button>
          ${precio.activo ? `
            <button class="precio-btn precio-btn-desactivar" onclick="desactivarPrecio(${precio.id})">
              ❌ Desactivar
            </button>
          ` : `
            <button class="precio-btn precio-btn-activar" onclick="activarPrecio(${precio.id})">
              ✓ Activar
            </button>
          `}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error cargando precios:', error);
    preciosContainer.innerHTML = `
      <div class="alert alert-error">
        Error al cargar los precios: ${error.message}
      </div>
    `;
  }
}

// Guardar precio (crear o actualizar)
precioForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const precioId = precioIdInput.value;
  const nombre = precioNombreInput.value;
  const precioUnitario = parseFloat(precioUnitarioInput.value);
  const descripcion = precioDescripcionInput.value;

  try {
    let response;
    if (precioId) {
      // Actualizar
      response = await fetch(`/api/precios/${precioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, precioUnitario, descripcion })
      });
    } else {
      // Crear
      response = await fetch('/api/precios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, precioUnitario, descripcion })
      });
    }

    const resultado = await response.json();

    if (response.ok) {
      mostrarAlerta(resultado.mensaje || 'Precio guardado exitosamente', 'success');
      precioForm.reset();
      precioIdInput.value = '';
      cancelarPrecioBtn.style.display = 'none';
      await cargarPrecios();
      await cargarPrecioActivo();
    } else {
      mostrarAlerta(resultado.error || 'Error al guardar el precio', 'error');
    }
  } catch (error) {
    console.error('Error guardando precio:', error);
    mostrarAlerta('Error al guardar el precio', 'error');
  }
});

// Editar precio
async function editarPrecio(id) {
  try {
    const response = await fetch(`/api/precios/${id}`);
    const precio = await response.json();

    if (precio) {
      precioIdInput.value = precio.id;
      precioNombreInput.value = precio.nombre;
      precioUnitarioInput.value = precio.precio_unitario;
      precioDescripcionInput.value = precio.descripcion || '';
      cancelarPrecioBtn.style.display = 'block';

      // Scroll al formulario
      document.querySelector('.precio-form-container').scrollIntoView({ behavior: 'smooth' });
    }
  } catch (error) {
    console.error('Error cargando precio:', error);
    mostrarAlerta('Error al cargar el precio', 'error');
  }
}

// Cancelar edición
cancelarPrecioBtn.addEventListener('click', () => {
  precioForm.reset();
  precioIdInput.value = '';
  cancelarPrecioBtn.style.display = 'none';
});

// Desactivar precio
async function desactivarPrecio(id) {
  if (!confirm('¿Estás seguro de desactivar este precio?')) return;

  try {
    const response = await fetch(`/api/precios/${id}`, {
      method: 'DELETE'
    });

    const resultado = await response.json();

    if (response.ok) {
      mostrarAlerta('Precio desactivado exitosamente', 'success');
      await cargarPrecios();
      await cargarPrecioActivo();
    } else {
      mostrarAlerta(resultado.error || 'Error al desactivar el precio', 'error');
    }
  } catch (error) {
    console.error('Error desactivando precio:', error);
    mostrarAlerta('Error al desactivar el precio', 'error');
  }
}

// Activar precio
async function activarPrecio(id) {
  if (!confirm('¿Estás seguro de activar este precio?')) return;

  try {
    const response = await fetch(`/api/precios/${id}/activar`, {
      method: 'PATCH'
    });

    const resultado = await response.json();

    if (response.ok) {
      mostrarAlerta('Precio activado exitosamente', 'success');
      await cargarPrecios();
      await cargarPrecioActivo();
    } else {
      mostrarAlerta(resultado.error || 'Error al activar el precio', 'error');
    }
  } catch (error) {
    console.error('Error activando precio:', error);
    mostrarAlerta('Error al activar el precio', 'error');
  }
}

// Función helper para mostrar alertas
function mostrarAlerta(mensaje, tipo) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${tipo}`;
  alertDiv.textContent = mensaje;

  const container = document.querySelector('#tab-precios .card');
  container.insertBefore(alertDiv, container.firstChild);

  setTimeout(() => alertDiv.remove(), 5000);
}

// ==================================================
// AUTO-CÁLCULO DE MONTO EN FORMULARIO DE GENERACIÓN
// ==================================================

// Escuchar cambios en cantidad para calcular monto automáticamente
cantidadInput.addEventListener('input', async () => {
  const cantidad = parseInt(cantidadInput.value);

  if (!cantidad || cantidad <= 0) {
    montoInput.value = '';
    return;
  }

  try {
    // Cargar precio activo si no está cargado
    if (!precioActivo || !precioActivo.precio_unitario) {
      await cargarPrecioActivo();
    }

    if (precioActivo && precioActivo.precio_unitario) {
      const total = cantidad * precioActivo.precio_unitario;
      montoInput.value = total.toFixed(2);
    }
  } catch (error) {
    console.error('Error calculando monto:', error);
  }
});

// Cargar precio activo al inicio
cargarPrecioActivo();

// Actualizar el listener de tabs para cargar precios cuando se seleccione ese tab
const originalTabListener = tabs[0].onclick;
tabs.forEach(tab => {
  const originalHandler = tab.onclick;
  tab.addEventListener('click', async () => {
    const tabName = tab.dataset.tab;
    if (tabName === 'precios') {
      await cargarPrecioActivo();
      await cargarPrecios();
    }
  });
});

// ==================================
// FUNCIONES DE GALERÍA DE FOTOS
// ==================================

// Mostrar modal de fotos de escaneos
async function mostrarFotosEscaneos(loteId, contratista) {
  const modal = document.getElementById('fotosModal');
  const title = document.getElementById('fotosModalTitle');
  const gallery = document.getElementById('fotosGallery');

  title.textContent = `Fotos de Escaneos - ${contratista}`;
  gallery.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando fotos...</p></div>';
  modal.style.display = 'block';

  try {
    const response = await fetch(`/api/boletos/historial-escaneos/${loteId}`);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log('Datos recibidos:', data);

    if (data.escaneos && data.escaneos.length > 0) {
      renderizarGaleriaFotos(data.escaneos);
    } else {
      gallery.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No hay escaneos registrados para este lote</p>';
    }
  } catch (error) {
    console.error('Error cargando fotos:', error);
    gallery.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 2rem;">Error cargando fotos: ${error.message}</p>`;
  }
}

// Agrupar escaneos por boleto
function agruparPorBoleto(escaneos) {
  const grupos = {};

  escaneos.forEach(escaneo => {
    const uuid = escaneo.boleto_uuid;
    if (!grupos[uuid]) {
      grupos[uuid] = {
        uuid,
        exitosos: [],
        rechazos: [],
        ultimaActividad: escaneo.fecha
      };
    }

    if (escaneo.tipo === 'EXITOSO') {
      grupos[uuid].exitosos.push(escaneo);
    } else {
      grupos[uuid].rechazos.push(escaneo);
    }

    // Actualizar última actividad si es más reciente
    if (new Date(escaneo.fecha) > new Date(grupos[uuid].ultimaActividad)) {
      grupos[uuid].ultimaActividad = escaneo.fecha;
    }
  });

  // Convertir a array y ordenar por actividad reciente
  return Object.values(grupos).sort((a, b) =>
    new Date(b.ultimaActividad) - new Date(a.ultimaActividad)
  );
}

// Renderizar galería de fotos agrupada por boleto
function renderizarGaleriaFotos(escaneos) {
  const gallery = document.getElementById('fotosGallery');

  // Agrupar por boleto
  const boletos = agruparPorBoleto(escaneos);

  // Calcular estadísticas
  const totalBoletos = boletos.length;
  const totalExitosos = escaneos.filter(e => e.tipo === 'EXITOSO').length;
  const totalRechazos = escaneos.filter(e => e.tipo === 'RECHAZADO').length;

  // Header con estadísticas
  let html = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; color: white;">
      <h3 style="margin: 0 0 1rem 0; font-size: 1.25rem;">📊 Estadísticas del Lote</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: bold;">${totalBoletos}</div>
          <div style="font-size: 0.875rem; opacity: 0.9;">Boletos Únicos</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: bold; color: #d1fae5;">✅ ${totalExitosos}</div>
          <div style="font-size: 0.875rem; opacity: 0.9;">Escaneos Exitosos</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: bold; color: #fee2e2;">❌ ${totalRechazos}</div>
          <div style="font-size: 0.875rem; opacity: 0.9;">Intentos Rechazados</div>
        </div>
      </div>
    </div>
  `;

  // Renderizar cada boleto
  boletos.forEach(boleto => {
    html += renderizarTarjetaBoleto(boleto);
  });

  gallery.innerHTML = html;
}

// Renderizar tarjeta de un boleto individual con su timeline
function renderizarTarjetaBoleto(boleto) {
  const totalRechazos = boleto.rechazos.length;
  const tieneAlerta = totalRechazos > 3;

  return `
    <div style="background: white; border: 2px solid ${tieneAlerta ? '#ef4444' : '#e2e8f0'}; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <!-- Header del boleto -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 2px solid #e2e8f0;">
        <div>
          <h4 style="margin: 0; font-size: 1.125rem; color: #1e293b;">
            🎫 <span style="font-family: monospace;">${boleto.uuid.substring(0, 8)}...${boleto.uuid.substring(boleto.uuid.length - 4)}</span>
          </h4>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #64748b;">
            Última actividad: ${new Date(boleto.ultimaActividad).toLocaleString('es-MX')}
          </p>
        </div>
        ${tieneAlerta ? `
          <div style="background: #fee2e2; color: #991b1b; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem;">
            ⚠️ ${totalRechazos} Intentos de Fraude
          </div>
        ` : ''}
      </div>

      <!-- Timeline del boleto -->
      <div style="margin-top: 1rem;">

        ${boleto.exitosos.length > 0 ? `
          <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; margin-bottom: 0.75rem;">
              <div style="width: 2.5rem; height: 2.5rem; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">✅</div>
              <div style="margin-left: 1rem;">
                <div style="font-weight: 600; color: #10b981;">Escaneo Exitoso</div>
                <div style="font-size: 0.875rem; color: #64748b;">${new Date(boleto.exitosos[0].fecha).toLocaleString('es-MX')}</div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-left: 3.5rem;">
              ${boleto.exitosos.map(e => `
                <img src="${e.foto_escaneo || '/placeholder.jpg'}"
                     alt="Foto escaneo"
                     onclick='abrirZoomFoto(${JSON.stringify(e)})'
                     style="width: 100px; height: 100px; object-fit: cover; border-radius: 0.5rem; cursor: pointer; border: 2px solid #10b981; transition: transform 0.2s;"
                     onmouseover="this.style.transform='scale(1.05)'"
                     onmouseout="this.style.transform='scale(1)'">
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${totalRechazos > 0 ? `
          <div>
            <div style="display: flex; align-items: center; margin-bottom: 0.75rem;">
              <div style="width: 2.5rem; height: 2.5rem; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">❌</div>
              <div style="margin-left: 1rem;">
                <div style="font-weight: 600; color: #ef4444;">Intentos de Rechazo (${totalRechazos})</div>
                <div style="font-size: 0.875rem; color: #64748b;">
                  ${boleto.rechazos[0].motivo_rechazo || 'Boleto ya fue usado'}
                </div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.5rem; margin-left: 3.5rem;">
              ${boleto.rechazos.map(e => `
                <div style="position: relative;">
                  <img src="${e.foto_escaneo || '/placeholder.jpg'}"
                       alt="Foto rechazo"
                       onclick='abrirZoomFoto(${JSON.stringify(e)})'
                       style="width: 100%; height: 100px; object-fit: cover; border-radius: 0.5rem; cursor: pointer; border: 2px solid #ef4444; transition: transform 0.2s;"
                       onmouseover="this.style.transform='scale(1.05)'"
                       onmouseout="this.style.transform='scale(1)'">
                  <div style="position: absolute; bottom: 0.25rem; right: 0.25rem; background: rgba(239, 68, 68, 0.9); color: white; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.625rem;">
                    ${new Date(e.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

// Renderizar tarjeta de foto individual
function renderizarTarjetaFoto(escaneo, tipo) {
  const fecha = new Date(escaneo.fecha).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const bgColor = tipo === 'success' ? '#d1fae5' : '#fee2e2';
  const borderColor = tipo === 'success' ? '#10b981' : '#ef4444';

  return `
    <div style="background: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 0.5rem; padding: 0.75rem; cursor: pointer;" onclick='abrirZoomFoto(${JSON.stringify(escaneo)})'>
      ${escaneo.foto_escaneo ? `
        <img src="${escaneo.foto_escaneo}" alt="Foto escaneo" style="width: 100%; height: 150px; object-fit: cover; border-radius: 0.25rem; margin-bottom: 0.5rem;">
      ` : `
        <div style="width: 100%; height: 150px; background: #e2e8f0; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem;">
          <span style="color: #94a3b8;">Sin foto</span>
        </div>
      `}
      <div style="font-size: 0.75rem; color: #1e293b;">
        <div style="margin-bottom: 0.25rem;"><strong>UUID:</strong> ${escaneo.boleto_uuid.substr(0, 8)}...</div>
        <div style="margin-bottom: 0.25rem;"><strong>Fecha:</strong> ${fecha}</div>
        ${escaneo.ubicacion ? `<div style="margin-bottom: 0.25rem;"><strong>Ubicación:</strong> ${escaneo.ubicacion}</div>` : ''}
        ${escaneo.motivo_rechazo ? `<div style="color: #dc2626;"><strong>Motivo:</strong> ${escaneo.motivo_rechazo}</div>` : ''}
      </div>
    </div>
  `;
}

// Abrir zoom de foto
function abrirZoomFoto(escaneo) {
  if (!escaneo.foto_escaneo) return;

  const modal = document.getElementById('fotoZoomModal');
  const img = document.getElementById('fotoZoomImg');
  const info = document.getElementById('fotoZoomInfo');

  img.src = escaneo.foto_escaneo;

  const fecha = new Date(escaneo.fecha).toLocaleString('es-MX');
  info.innerHTML = `
    <div><strong>UUID:</strong> ${escaneo.boleto_uuid}</div>
    <div><strong>Tipo:</strong> ${escaneo.tipo}</div>
    <div><strong>Fecha:</strong> ${fecha}</div>
    ${escaneo.ubicacion ? `<div><strong>Ubicación:</strong> ${escaneo.ubicacion}</div>` : ''}
    ${escaneo.motivo_rechazo ? `<div><strong>Motivo:</strong> ${escaneo.motivo_rechazo}</div>` : ''}
  `;

  modal.style.display = 'block';
}

// Cerrar modales
function cerrarModalFotos() {
  document.getElementById('fotosModal').style.display = 'none';
}

function cerrarModalZoom() {
  document.getElementById('fotoZoomModal').style.display = 'none';
}

// Variable global para galería de fotos de un boleto
let fotosActuales = [];
let indiceFotoActual = 0;

// Ver foto individual de un boleto (ahora con galería si hay múltiples fotos)
async function verFotoBoleto(uuid, event) {
  event.stopPropagation(); // Evitar que se active el click del row

  try {
    const response = await fetch(`/api/boletos/foto/${uuid}`);
    const fotos = await response.json();

    if (fotos && fotos.length > 0) {
      // Guardar fotos y mostrar la primera
      fotosActuales = fotos;
      indiceFotoActual = 0;

      if (fotos.length === 1) {
        // Solo una foto - mostrar directamente
        abrirZoomFoto({
          foto_escaneo: fotos[0].foto_escaneo,
          boleto_uuid: uuid,
          tipo: fotos[0].tipo,
          fecha: fotos[0].fecha,
          ubicacion: fotos[0].ubicacion,
          motivo_rechazo: fotos[0].motivo_rechazo
        }, false); // false = no mostrar navegación
      } else {
        // Múltiples fotos - mostrar galería con navegación
        mostrarFotoConNavegacion(uuid);
      }
    } else {
      alert('Este boleto no tiene foto de escaneo registrada');
    }
  } catch (error) {
    console.error('Error cargando foto:', error);
    alert('Error al cargar la foto del boleto');
  }
}

// Mostrar foto con controles de navegación
function mostrarFotoConNavegacion(uuid) {
  const modal = document.getElementById('fotoZoomModal');
  const img = document.getElementById('fotoZoomImg');
  const info = document.getElementById('fotoZoomInfo');

  const fotoActual = fotosActuales[indiceFotoActual];

  img.src = fotoActual.foto_escaneo;

  const fecha = new Date(fotoActual.fecha).toLocaleString('es-MX');

  // Contador de fotos y controles de navegación
  const navegacion = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e2e8f0;">
      <button onclick="navegarFoto(-1)" ${indiceFotoActual === 0 ? 'disabled' : ''} style="padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 1rem; ${indiceFotoActual === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
        ◀ Anterior
      </button>
      <div style="font-weight: 600; color: #1e293b;">
        Foto ${indiceFotoActual + 1} de ${fotosActuales.length}
      </div>
      <button onclick="navegarFoto(1)" ${indiceFotoActual === fotosActuales.length - 1 ? 'disabled' : ''} style="padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 1rem; ${indiceFotoActual === fotosActuales.length - 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
        Siguiente ▶
      </button>
    </div>
  `;

  info.innerHTML = `
    <div><strong>UUID:</strong> ${uuid}</div>
    <div><strong>Tipo:</strong> <span style="color: ${fotoActual.tipo === 'EXITOSO' ? '#10b981' : '#ef4444'}; font-weight: 600;">${fotoActual.tipo}</span></div>
    <div><strong>Fecha:</strong> ${fecha}</div>
    ${fotoActual.ubicacion ? `<div><strong>Ubicación:</strong> ${fotoActual.ubicacion}</div>` : ''}
    ${fotoActual.motivo_rechazo ? `<div><strong>Motivo:</strong> <span style="color: #dc2626;">${fotoActual.motivo_rechazo}</span></div>` : ''}
    ${navegacion}
  `;

  modal.style.display = 'block';
}

// Navegar entre fotos
function navegarFoto(direccion) {
  indiceFotoActual += direccion;

  // Asegurar que el índice esté dentro del rango
  if (indiceFotoActual < 0) indiceFotoActual = 0;
  if (indiceFotoActual >= fotosActuales.length) indiceFotoActual = fotosActuales.length - 1;

  // Obtener UUID del primer registro (todos tienen el mismo UUID)
  const uuid = fotosActuales[0].boleto_uuid || fotosActuales[indiceFotoActual].boleto_uuid;

  mostrarFotoConNavegacion(uuid);
}

// Cerrar modales al click fuera
window.addEventListener('click', (e) => {
  const fotosModal = document.getElementById('fotosModal');
  const zoomModal = document.getElementById('fotoZoomModal');
  const usuarioModal = document.getElementById('usuarioModal');
  const actividadModal = document.getElementById('actividadUsuarioModal');

  if (e.target === fotosModal) {
    cerrarModalFotos();
  }
  if (e.target === zoomModal) {
    cerrarModalZoom();
  }
  if (e.target === usuarioModal) {
    cerrarModalUsuario();
  }
  if (e.target === actividadModal) {
    cerrarModalActividad();
  }
});

// ==================================================
// GESTIÓN DE USUARIOS
// ==================================================

let rolesDisponibles = [];
let usuarioEditando = null;

// Cargar usuarios al abrir el tab
tabs.forEach(tab => {
  tab.addEventListener('click', async () => {
    const tabName = tab.dataset.tab;
    if (tabName === 'usuarios') {
      await cargarRoles();
      await cargarUsuarios();
    }
  });
});

// Cargar lista de roles
async function cargarRoles() {
  try {
    const response = await fetchAutenticado('/api/usuarios/roles/lista');
    const data = await response.json();

    if (data.success) {
      rolesDisponibles = data.roles;

      // Llenar select de filtro
      const filtroRol = document.getElementById('filtroUsuarioRol');
      filtroRol.innerHTML = '<option value="">Todos los roles</option>';
      data.roles.forEach(rol => {
        filtroRol.innerHTML += `<option value="${rol.id}">${rol.nombre}</option>`;
      });

      // Llenar select del modal
      const selectRol = document.getElementById('usuarioRol');
      selectRol.innerHTML = '<option value="">Seleccione un rol...</option>';
      data.roles.forEach(rol => {
        selectRol.innerHTML += `<option value="${rol.id}">${rol.nombre}</option>`;
      });
    }
  } catch (error) {
    console.error('Error cargando roles:', error);
  }
}

// Cargar lista de usuarios
async function cargarUsuarios() {
  const container = document.getElementById('usuariosContainer');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando usuarios...</p></div>';

  try {
    const filtroRol = document.getElementById('filtroUsuarioRol').value;
    const filtroEstado = document.getElementById('filtroUsuarioEstado').value;

    let url = '/api/usuarios?';
    if (filtroRol) url += `rol=${filtroRol}&`;
    if (filtroEstado) url += `estado=${filtroEstado}&`;

    const response = await fetchAutenticado(url);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error cargando usuarios');
    }

    if (data.usuarios.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No hay usuarios registrados</p>';
      return;
    }

    // Renderizar tabla de usuarios
    let html = `
      <div class="table-container">
        <table class="tabla-usuarios" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left;">
              <th style="padding: 1rem; border-bottom: 2px solid #e2e8f0;">Usuario</th>
              <th style="padding: 1rem; border-bottom: 2px solid #e2e8f0;">Nombre Completo</th>
              <th style="padding: 1rem; border-bottom: 2px solid #e2e8f0;">Email</th>
              <th style="padding: 1rem; border-bottom: 2px solid #e2e8f0;">Rol</th>
              <th style="padding: 1rem; border-bottom: 2px solid #e2e8f0;">Estado</th>
              <th style="padding: 1rem; border-bottom: 2px solid #e2e8f0;">Último Acceso</th>
              <th style="padding: 1rem; border-bottom: 2px solid #e2e8f0; text-align: center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.usuarios.forEach(usuario => {
      const estadoColor = usuario.activo ? '#10b981' : '#ef4444';
      const estadoTexto = usuario.activo ? 'Activo' : 'Inactivo';
      const estadoBadge = `<span style="background: ${estadoColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">${estadoTexto}</span>`;

      const ultimoAcceso = usuario.ultimo_acceso
        ? new Date(usuario.ultimo_acceso).toLocaleDateString('es-MX', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : 'Nunca';

      const bgColorEstado = usuario.activo ? '#ef4444' : '#10b981';
      const tituloEstado = usuario.activo ? 'Desactivar' : 'Activar';
      const textoEstado = usuario.activo ? '🚫 Desactivar' : '✅ Activar';
      const usernameEscaped = (usuario.username || '').replace(/'/g, "\\'");

      html += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 1rem; font-weight: 600;">${usuario.username}</td>
          <td style="padding: 1rem;">${usuario.nombre_completo}</td>
          <td style="padding: 1rem; color: #64748b;">${usuario.email}</td>
          <td style="padding: 1rem;">
            <span style="background: #3b82f6; color: white; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.875rem;">
              ${usuario.rol_nombre}
            </span>
          </td>
          <td style="padding: 1rem;">${estadoBadge}</td>
          <td style="padding: 1rem; color: #64748b; font-size: 0.875rem;">${ultimoAcceso}</td>
          <td style="padding: 1rem; text-align: center;">
            <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
              <button onclick="editarUsuario(${usuario.id})"
                style="background: #3b82f6; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;"
                title="Editar">
                ✏️ Editar
              </button>
              <button onclick="toggleEstadoUsuario(${usuario.id}, ${usuario.activo})"
                style="background: ${bgColorEstado}; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;"
                title="${tituloEstado}">
                ${textoEstado}
              </button>
              <button onclick="verActividadUsuario(${usuario.id}, '${usernameEscaped}')"
                style="background: #8b5cf6; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;"
                title="Ver actividad">
                📊 Actividad
              </button>
              <button onclick="resetearPassword(${usuario.id}, '${usernameEscaped}')"
                style="background: #f59e0b; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;"
                title="Restablecer contraseña">
                🔑 Reset
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error cargando usuarios:', error);
    container.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 2rem;">Error: ${error.message}</p>`;
  }
}

// Abrir modal para nuevo usuario
function abrirModalUsuario(usuarioId = null) {
  const modal = document.getElementById('usuarioModal');
  const title = document.getElementById('usuarioModalTitle');
  const form = document.getElementById('usuarioForm');
  const passwordGroup = document.getElementById('passwordGroup');
  const passwordInput = document.getElementById('usuarioPassword');

  form.reset();
  document.getElementById('usuarioId').value = '';
  usuarioEditando = null;

  if (usuarioId) {
    title.textContent = 'Editar Usuario';
    passwordGroup.style.display = 'none';
    passwordInput.required = false;
    cargarDatosUsuario(usuarioId);
  } else {
    title.textContent = 'Nuevo Usuario';
    passwordGroup.style.display = 'block';
    passwordInput.required = true;
  }

  modal.style.display = 'block';
}

// Cargar datos del usuario para edición
async function cargarDatosUsuario(usuarioId) {
  try {
    const response = await fetchAutenticado(`/api/usuarios/${usuarioId}`);
    const data = await response.json();

    if (data.success) {
      usuarioEditando = data.usuario;
      document.getElementById('usuarioId').value = data.usuario.id;
      document.getElementById('usuarioUsername').value = data.usuario.username;
      document.getElementById('usuarioNombreCompleto').value = data.usuario.nombre_completo;
      document.getElementById('usuarioEmail').value = data.usuario.email;
      document.getElementById('usuarioRol').value = data.usuario.rol_id;

      // Deshabilitar username para usuarios existentes
      document.getElementById('usuarioUsername').disabled = true;
    }
  } catch (error) {
    console.error('Error cargando usuario:', error);
    alert('Error cargando datos del usuario');
    cerrarModalUsuario();
  }
}

// Cerrar modal de usuario
function cerrarModalUsuario() {
  document.getElementById('usuarioModal').style.display = 'none';
  document.getElementById('usuarioForm').reset();
  document.getElementById('usuarioUsername').disabled = false;
  usuarioEditando = null;
}

// Guardar usuario (crear o actualizar)
async function guardarUsuario(event) {
  event.preventDefault();

  const usuarioId = document.getElementById('usuarioId').value;
  const username = document.getElementById('usuarioUsername').value.trim();
  const nombre_completo = document.getElementById('usuarioNombreCompleto').value.trim();
  const email = document.getElementById('usuarioEmail').value.trim();
  const rol_id = document.getElementById('usuarioRol').value;
  const password = document.getElementById('usuarioPassword').value;

  if (!username || !nombre_completo || !email || !rol_id) {
    alert('Por favor complete todos los campos requeridos');
    return;
  }

  if (!usuarioId && !password) {
    alert('La contraseña es requerida para nuevos usuarios');
    return;
  }

  try {
    let response;

    if (usuarioId) {
      // Actualizar usuario existente
      response = await fetchAutenticado(`/api/usuarios/${usuarioId}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre_completo, email, rol_id })
      });
    } else {
      // Crear nuevo usuario
      response = await fetchAutenticado('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify({ username, password, nombre_completo, email, rol_id })
      });
    }

    const data = await response.json();

    if (data.success) {
      alert(data.mensaje || 'Usuario guardado exitosamente');
      cerrarModalUsuario();
      await cargarUsuarios();
    } else {
      alert(data.error || 'Error guardando usuario');
    }
  } catch (error) {
    console.error('Error guardando usuario:', error);
    alert('Error guardando usuario: ' + error.message);
  }
}

// Editar usuario
async function editarUsuario(usuarioId) {
  abrirModalUsuario(usuarioId);
}

// Activar/Desactivar usuario
async function toggleEstadoUsuario(usuarioId, estadoActual) {
  const accion = estadoActual ? 'desactivar' : 'activar';

  if (!confirm(`¿Está seguro de ${accion} este usuario?`)) {
    return;
  }

  try {
    const response = await fetchAutenticado(`/api/usuarios/${usuarioId}/toggle-status`, {
      method: 'PATCH'
    });

    const data = await response.json();

    if (data.success) {
      alert(data.mensaje);
      await cargarUsuarios();
    } else {
      alert(data.error || `Error al ${accion} usuario`);
    }
  } catch (error) {
    console.error('Error cambiando estado:', error);
    alert('Error cambiando estado del usuario');
  }
}

// Restablecer contraseña
async function resetearPassword(usuarioId, username) {
  const nuevaPassword = prompt(`Ingrese la nueva contraseña para ${username}:\n\n(Mínimo 6 caracteres)`);

  if (!nuevaPassword) {
    return;
  }

  if (nuevaPassword.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres');
    return;
  }

  try {
    const response = await fetchAutenticado(`/api/usuarios/${usuarioId}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword: nuevaPassword })
    });

    const data = await response.json();

    if (data.success) {
      alert(data.mensaje);
    } else {
      alert(data.error || 'Error restableciendo contraseña');
    }
  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    alert('Error restableciendo contraseña');
  }
}

// Ver actividad del usuario
async function verActividadUsuario(usuarioId, username) {
  const modal = document.getElementById('actividadUsuarioModal');
  const title = document.getElementById('actividadModalTitle');
  const container = document.getElementById('actividadContainer');

  title.textContent = `Historial de Actividad - ${username}`;
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando actividad...</p></div>';
  modal.style.display = 'block';

  try {
    const response = await fetchAutenticado(`/api/usuarios/${usuarioId}/actividad?limite=50`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error cargando actividad');
    }

    if (data.actividad.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No hay actividad registrada</p>';
      return;
    }

    // Renderizar timeline de actividad
    let html = '<div class="timeline" style="position: relative; padding-left: 2rem;">';

    data.actividad.forEach((item, index) => {
      const fecha = new Date(item.fecha);
      const fechaStr = fecha.toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const accionColor = {
        'CREATE': '#10b981',
        'UPDATE': '#3b82f6',
        'DELETE': '#ef4444',
        'LOGIN': '#8b5cf6',
        'LOGOUT': '#64748b',
        'AUTHORIZE': '#f59e0b',
        'ACTIVATE': '#10b981',
        'DEACTIVATE': '#ef4444',
        'PASSWORD_RESET': '#f59e0b'
      };

      const color = accionColor[item.accion] || '#64748b';

      html += `
        <div style="position: relative; padding-bottom: 1.5rem; border-left: 2px solid #e2e8f0;">
          <div style="position: absolute; left: -0.5rem; top: 0.5rem; width: 0.75rem; height: 0.75rem; border-radius: 50%; background: ${color}; border: 2px solid white;"></div>
          <div style="padding-left: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
              <span style="font-weight: 600; color: ${color};">${item.accion}</span>
              <span style="font-size: 0.875rem; color: #64748b;">${fechaStr}</span>
            </div>
            <div style="color: #64748b; font-size: 0.875rem; margin-bottom: 0.25rem;">
              Tabla: ${item.tabla}
            </div>
            ${item.detalles ? `
              <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.375rem; font-size: 0.875rem; margin-top: 0.5rem;">
                <pre style="margin: 0; font-family: monospace; white-space: pre-wrap;">${JSON.stringify(item.detalles, null, 2)}</pre>
              </div>
            ` : ''}
            ${item.ip_address ? `
              <div style="color: #94a3b8; font-size: 0.75rem; margin-top: 0.5rem;">
                IP: ${item.ip_address}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

  } catch (error) {
    console.error('Error cargando actividad:', error);
    container.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 2rem;">Error: ${error.message}</p>`;
  }
}

// Cerrar modal de actividad
function cerrarModalActividad() {
  document.getElementById('actividadUsuarioModal').style.display = 'none';
}

// ==================== GESTIÓN DE PRECIOS EN FORMULARIO DE GENERACIÓN ====================

// Cargar precios activos en el SELECT
async function cargarPreciosActivos() {
  try {
    const response = await fetch('/api/precios');
    const precios = await response.json();

    const precioSelect = document.getElementById('precioSelect');
    if (!precioSelect) return;

    // Limpiar opciones actuales excepto la primera
    precioSelect.innerHTML = '<option value="">Seleccione un platillo</option>';

    // Agregar solo precios activos
    const preciosActivos = precios.filter(p => p.activo);
    preciosActivos.forEach(precio => {
      const option = document.createElement('option');
      option.value = precio.id;
      option.textContent = `${precio.nombre} - $${parseFloat(precio.precio_unitario).toFixed(2)}`;
      option.dataset.precioUnitario = precio.precio_unitario;
      precioSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando precios activos:', error);
  }
}

// Calcular monto total automáticamente
function calcularMontoTotal() {
  const precioSelect = document.getElementById('precioSelect');
  const cantidadInput = document.getElementById('cantidad');
  const montoInput = document.getElementById('monto');

  if (!precioSelect || !cantidadInput || !montoInput) return;

  const selectedOption = precioSelect.options[precioSelect.selectedIndex];
  const precioUnitario = selectedOption.dataset.precioUnitario;
  const cantidad = parseInt(cantidadInput.value) || 0;

  if (precioUnitario && cantidad > 0) {
    const montoTotal = parseFloat(precioUnitario) * cantidad;
    montoInput.value = montoTotal.toFixed(2);
  } else {
    montoInput.value = '0.00';
  }
}

// Event listeners para cálculo automático
document.addEventListener('DOMContentLoaded', () => {
  // Cargar precios al iniciar
  cargarPreciosActivos();

  // Event listeners
  const precioSelect = document.getElementById('precioSelect');
  const cantidadInput = document.getElementById('cantidad');

  if (precioSelect) {
    precioSelect.addEventListener('change', calcularMontoTotal);
  }

  if (cantidadInput) {
    cantidadInput.addEventListener('input', calcularMontoTotal);
  }
});
