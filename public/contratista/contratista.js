// ==================================================
// AUTENTICACIÓN Y SESIÓN
// ==================================================

// Verificar autenticación INMEDIATAMENTE - antes de cargar cualquier cosa
const token = localStorage.getItem('auth_token');
const userStr = localStorage.getItem('auth_user');

if (!token || !userStr) {
  // No hay sesión, redirigir al login INMEDIATAMENTE
  console.log('Sin autenticación, redirigiendo a login...');
  window.location.replace('/login-contratista.html');
  throw new Error('No autenticado'); // Detener ejecución del script
}

// Verificar autenticación al cargar la página
(function verificarAutenticacion() {

  // Verificar que el usuario tenga rol de contratista
  try {
    const user = JSON.parse(userStr);
    console.log('📋 Datos del usuario cargados:', user);

    // Si no es contratista, redirigir según su rol
    if (user.rol !== 'contratista') {
      console.log('⚠️ Usuario no es contratista, redirigiendo...');
      if (user.rol === 'administrador' || user.rol === 'finanzas' || user.rol === 'gerente_comedor') {
        window.location.href = '/admin';
      } else if (user.rol === 'validador') {
        window.location.href = '/validador';
      } else {
        window.location.href = '/login-contratista.html';
      }
      return;
    }

    console.log('✅ Usuario es contratista, cargando datos...');
    console.log('👤 Nombre completo:', user.nombre_completo);
    console.log('🏢 Empresa/Contratista:', user.contratista);
    console.log('📛 Rol:', user.rol);

    // Función para cargar datos del usuario en el DOM
    function cargarDatosUsuario() {
      // Cargar info del usuario en el header
      const userNameEl = document.getElementById('userName');
      const userRoleEl = document.getElementById('userRole');
      const userContratistaSpan = document.querySelector('#userContratista span');

      if (userNameEl) {
        userNameEl.textContent = user.nombre_completo || user.username;
        console.log('✅ Nombre de usuario cargado en DOM');
      } else {
        console.error('❌ No se encontró elemento #userName');
      }

      if (userRoleEl) {
        userRoleEl.textContent = `Rol: ${user.rol}`;
        console.log('✅ Rol cargado en DOM');
      } else {
        console.error('❌ No se encontró elemento #userRole');
      }

      // Mostrar empresa/contratista si existe
      if (user.contratista) {
        if (userContratistaSpan) {
          userContratistaSpan.textContent = user.contratista;
          console.log('✅ Contratista cargado en DOM:', user.contratista);
        } else {
          console.error('❌ No se encontró elemento #userContratista span');
        }
        // Guardar nombre del contratista para usarlo en el formulario
        window.contratistaActual = user.contratista;
      } else {
        console.log('⚠️ Usuario no tiene contratista asociado');
        // Si no tiene contratista asociado, usar su nombre completo
        window.contratistaActual = user.nombre_completo || user.username;
      }

      console.log('💾 contratistaActual guardado:', window.contratistaActual);
    }

    // Ejecutar carga de datos cuando el DOM esté listo
    if (document.readyState === 'loading') {
      console.log('⏳ DOM aún cargando, esperando DOMContentLoaded...');
      document.addEventListener('DOMContentLoaded', cargarDatosUsuario);
    } else {
      console.log('✅ DOM ya listo, cargando datos inmediatamente');
      cargarDatosUsuario();
    }

    // Cargar datos iniciales DESPUÉS de definir contratistaActual
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        cargarPrecios();
        cargarComedores();
        const contratistaInput = document.getElementById('contratista');
        if (contratistaInput) {
          contratistaInput.value = window.contratistaActual || '';
        }
        // Calcular y mostrar fecha de vencimiento (3 meses)
        calcularFechaVencimiento();
      });
    } else {
      cargarPrecios();
      cargarComedores();
      const contratistaInput = document.getElementById('contratista');
      if (contratistaInput) {
        contratistaInput.value = window.contratistaActual || '';
      }
      // Calcular y mostrar fecha de vencimiento (3 meses)
      calcularFechaVencimiento();
    }
  } catch (error) {
    console.error('Error cargando datos de usuario:', error);
    window.location.href = '/login-contratista.html';
  }
})();

// Helper para hacer fetch autenticado
async function fetchAutenticado(url, options = {}) {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    window.location.href = '/login-contratista.html';
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
    window.location.href = '/login-contratista.html';
    return;
  }

  return response;
}

// Función para cerrar sesión
function cerrarSesion() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  window.location.href = '/';
}

// ==================================================
// Estado global
let todosLosLotes = [];
let loteActual = null;

// Elementos del DOM
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const generarForm = document.getElementById('generarForm');
const contratistaInput = document.getElementById('contratista');
const comedorSelect = document.getElementById('comedor');
const comedorCustomGroup = document.getElementById('comedorCustomGroup');
const comedorCustomInput = document.getElementById('comedorCustom');
const cantidadInput = document.getElementById('cantidad');
const montoInput = document.getElementById('monto');
const fechaVencimientoInput = document.getElementById('fechaVencimiento');
const generarBtn = document.getElementById('generarBtn');
const resultBox = document.getElementById('resultBox');
const resultInfo = document.getElementById('resultInfo');
const precioSelect = document.getElementById('precioSelect');
const tipoPagoSelect = document.getElementById('tipoPago');

// Elementos de Lotes
const lotesContainer = document.getElementById('lotesContainer');
const loteModal = document.getElementById('loteModal');
const modalClose = document.querySelector('.modal-close');
const modalTitle = document.getElementById('modalTitle');
const modalLoteInfo = document.getElementById('modalLoteInfo');

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
      cargarLotes();
    }
  });
});

// ==================================================
// GENERAR BOLETOS (TAB 1)
// ==================================================

// Calcular y mostrar fecha de vencimiento automática (3 meses)
function calcularFechaVencimiento() {
  const fechaVencimientoInput = document.getElementById('fechaVencimiento');
  if (fechaVencimientoInput) {
    const fechaVencimiento = new Date();
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 3);
    const fechaFormateada = fechaVencimiento.toISOString().split('T')[0];
    fechaVencimientoInput.value = fechaFormateada;
    console.log('📅 Fecha de vencimiento calculada:', fechaFormateada);
  }
}

// Cargar precios disponibles
async function cargarPrecios() {
  try {
    console.log('Cargando precios...');
    const response = await fetchAutenticado('/api/precios');

    if (!response) {
      console.error('No se recibió respuesta del servidor');
      return;
    }

    const data = await response.json();
    console.log('Datos recibidos de precios:', data);

    const precios = data.precios || [];
    console.log('Precios a cargar:', precios);

    precioSelect.innerHTML = '<option value="">Seleccione un platillo</option>';
    precios.forEach(precio => {
      const option = document.createElement('option');
      option.value = precio.id;
      option.textContent = `${precio.nombre} - $${precio.precio_unitario.toFixed(2)}`;
      option.dataset.precio = precio.precio_unitario;
      precioSelect.appendChild(option);
    });
    console.log('Precios cargados exitosamente');
  } catch (error) {
    console.error('Error cargando precios:', error);
  }
}

// Cargar comedores
async function cargarComedores() {
  try {
    const response = await fetchAutenticado(`/api/comedores/contratista/${encodeURIComponent(window.contratistaActual)}`);
    const data = await response.json();
    const comedores = data || [];

    comedorSelect.innerHTML = '<option value="">Sin comedor asignado</option>';
    comedores.forEach(comedor => {
      const option = document.createElement('option');
      option.value = comedor.id;
      option.textContent = comedor.nombre;
      comedorSelect.appendChild(option);
    });

    const optionNuevo = document.createElement('option');
    optionNuevo.value = 'nuevo';
    optionNuevo.textContent = '➕ Nuevo comedor';
    comedorSelect.appendChild(optionNuevo);
  } catch (error) {
    console.error('Error cargando comedores:', error);
  }
}

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

// Calcular monto automáticamente
function calcularMonto() {
  const cantidad = parseInt(cantidadInput.value) || 0;
  const precioOption = precioSelect.selectedOptions[0];
  const precioUnitario = precioOption ? parseFloat(precioOption.dataset.precio) || 0 : 0;

  const monto = cantidad * precioUnitario;
  montoInput.value = monto.toFixed(2);
}

cantidadInput.addEventListener('input', calcularMonto);
precioSelect.addEventListener('change', calcularMonto);

// Generar lote
generarForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const cantidad = parseInt(cantidadInput.value);
  const monto = parseFloat(montoInput.value);
  const tipoPago = tipoPagoSelect.value;
  const precioId = precioSelect.value;

  if (!precioId) {
    alert('Por favor seleccione un tipo de platillo');
    return;
  }

  // Determinar comedor
  let comedorId = null;
  let nombreComedor = null;
  if (comedorSelect.value === 'nuevo') {
    nombreComedor = comedorCustomInput.value.trim();
    if (!nombreComedor) {
      alert('Por favor ingrese el nombre del nuevo comedor');
      return;
    }
  } else if (comedorSelect.value) {
    comedorId = parseInt(comedorSelect.value);
  }

  // Deshabilitar botón
  generarBtn.disabled = true;
  generarBtn.textContent = '⏳ Generando...';
  resultBox.style.display = 'none';

  try {
    const response = await fetchAutenticado('/api/boletos/generar', {
      method: 'POST',
      body: JSON.stringify({
        contratista: window.contratistaActual,
        cantidad,
        // La fecha de vencimiento se calcula automáticamente en el backend (3 meses)
        monto,
        comedorId,
        nombreComedor,
        tipoPago,
        precioId
      })
    });

    const data = await response.json();

    if (data.exito) {
      resultInfo.innerHTML = `
        <p><strong>Lote ID:</strong> ${data.lote}</p>
        <p><strong>Cantidad:</strong> ${data.cantidad} boletos</p>
        <p><strong>Monto:</strong> $${monto.toFixed(2)}</p>
        <p><strong>Tipo de Pago:</strong> ${tipoPago}</p>
      `;
      resultBox.style.display = 'block';

      // Limpiar formulario
      generarForm.reset();
      contratistaInput.value = window.contratistaActual;
      comedorCustomGroup.style.display = 'none';
      montoInput.value = '';
    } else {
      alert('Error generando lote: ' + (data.error || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error generando lote. Por favor intente nuevamente.');
  } finally {
    generarBtn.disabled = false;
    generarBtn.textContent = '🎫 Generar Lote de Boletos';
  }
});

// ==================================================
// VER LOTES (TAB 2)
// ==================================================

async function cargarLotes() {
  lotesContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando lotes...</p></div>';

  try {
    const response = await fetchAutenticado('/api/boletos/lotes');
    const data = await response.json();
    todosLosLotes = data.lotes || [];

    if (todosLosLotes.length === 0) {
      lotesContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #64748b;">
          <p style="font-size: 3rem; margin-bottom: 1rem;">📦</p>
          <p style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">No hay lotes generados</p>
          <p>Genera tu primer lote desde la pestaña "Generar Boletos"</p>
        </div>
      `;
      return;
    }

    // Obtener número de descargas para cada lote
    const lotesConDescargas = await Promise.all(todosLosLotes.map(async (lote) => {
      try {
        const descargasResponse = await fetchAutenticado(`/api/boletos/lotes/${lote.lote}/descargas`);
        const descargasData = await descargasResponse.json();
        return { ...lote, total_descargas: descargasData.total_descargas || 0 };
      } catch (error) {
        console.error(`Error obteniendo descargas del lote ${lote.lote}:`, error);
        return { ...lote, total_descargas: 0 };
      }
    }));

    todosLosLotes = lotesConDescargas;
    renderizarLotes(todosLosLotes);
  } catch (error) {
    console.error('Error cargando lotes:', error);
    lotesContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #ef4444;">
        <p>❌ Error cargando lotes. Por favor recarga la página.</p>
      </div>
    `;
  }
}

function renderizarLotes(lotes) {
  if (lotes.length === 0) {
    lotesContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #64748b;">
        <p>No se encontraron lotes.</p>
      </div>
    `;
    return;
  }

  lotesContainer.innerHTML = lotes.map(lote => {
    const estadoClass = lote.estado_pago === 'AUTORIZADO' ? 'success' : 'warning';
    const estadoIcon = lote.estado_pago === 'AUTORIZADO' ? '✅' : '⏳';

    return `
      <div class="lote-card" onclick="verDetalleLote('${lote.lote}')">
        <div class="lote-header">
          <h3>${lote.lote}</h3>
          <span class="badge badge-${estadoClass}">${estadoIcon} ${lote.estado_pago}</span>
        </div>
        <div class="lote-body">
          <p><strong>Contratista:</strong> ${lote.contratista}</p>
          <p><strong>Cantidad:</strong> ${lote.total_boletos} boletos</p>
          <p><strong>Monto:</strong> $${(lote.monto || 0).toFixed(2)}</p>
          <p><strong>Tipo de Pago:</strong> ${lote.tipo_pago || 'CONTADO'}</p>
          <p><strong>Fecha:</strong> ${new Date(lote.fecha_creacion).toLocaleDateString('es-MX')}</p>
          <p style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e5e7eb;">
            <strong>📥 Descargas:</strong>
            <span style="color: #059669; font-weight: 600;">${lote.total_descargas || 0}</span>
          </p>
        </div>
      </div>
    `;
  }).join('');
}

// Registrar descarga de PDF
async function registrarDescargaPDF(loteId, pdfUrl) {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user'));
    const usuario = user.nombre_completo || user.username;

    const response = await fetchAutenticado(`/api/boletos/descargar/${loteId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario: usuario,
        razon: 'Descarga desde panel contratista'
      })
    });

    const result = await response.json();

    if (result.exito) {
      // Abrir PDF en nueva ventana
      window.open(pdfUrl, '_blank');

      // Recargar los datos del lote para actualizar el contador
      await cargarLotes();

      // Actualizar el historial mostrado
      await mostrarHistorialDescargas(loteId);

      mostrarNotificacion('PDF descargado correctamente', 'success');
    } else {
      mostrarNotificacion(result.error || 'Error al registrar descarga', 'error');
    }
  } catch (error) {
    console.error('Error registrando descarga:', error);
    mostrarNotificacion('Error al descargar PDF', 'error');
  }
}

// Mostrar historial de descargas
async function mostrarHistorialDescargas(loteId) {
  try {
    const response = await fetchAutenticado(`/api/boletos/historial-descargas/${loteId}`);
    const historial = await response.json();

    const historialSection = document.getElementById('historialDescargasSection');
    if (!historialSection) return;

    if (historial && historial.length > 0) {
      historialSection.innerHTML = `
        <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: #1e293b;">📋 Historial de Descargas</h4>
        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
          ${historial.map(descarga => {
            const fecha = new Date(descarga.fecha);
            const fechaFormato = fecha.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            const horaFormato = fecha.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return `
              <div style="padding: 0.75rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: start;">
                <div>
                  <p style="margin: 0; font-weight: 600; color: #1e293b;">👤 ${descarga.usuario}</p>
                  <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #64748b;">${descarga.razon}</p>
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 0.875rem; color: #059669; font-weight: 600;">📅 ${fechaFormato}</p>
                  <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #64748b;">🕐 ${horaFormato}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      historialSection.innerHTML = `
        <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: #1e293b;">📋 Historial de Descargas</h4>
        <p style="color: #64748b; font-style: italic;">No hay descargas registradas para este lote.</p>
      `;
    }
  } catch (error) {
    console.error('Error cargando historial:', error);
  }
}

// Ver detalle del lote
async function verDetalleLote(loteId) {
  loteActual = todosLosLotes.find(l => l.lote === loteId);

  if (!loteActual) return;

  modalTitle.textContent = `Lote: ${loteActual.lote}`;

  modalLoteInfo.innerHTML = `
    <p><strong>Contratista:</strong> ${loteActual.contratista}</p>
    <p><strong>Cantidad:</strong> ${loteActual.total_boletos} boletos</p>
    <p><strong>Monto:</strong> $${(loteActual.monto || 0).toFixed(2)}</p>
    <p><strong>Tipo de Pago:</strong> ${loteActual.tipo_pago || 'CONTADO'}</p>
    <p><strong>Estado:</strong> <span class="badge badge-${loteActual.estado_pago === 'AUTORIZADO' ? 'success' : 'warning'}">${loteActual.estado_pago}</span></p>
    <p><strong>Fecha de Creación:</strong> ${new Date(loteActual.fecha_creacion).toLocaleDateString('es-MX')}</p>
    ${loteActual.fecha_vencimiento ? `<p><strong>Fecha de Vencimiento:</strong> ${new Date(loteActual.fecha_vencimiento).toLocaleDateString('es-MX')}</p>` : ''}
  `;

  // Mostrar botón de descarga si está autorizado
  const downloadSection = document.getElementById('downloadSection');
  const pendingMessage = document.getElementById('pendingMessage');
  const downloadBtn = document.getElementById('downloadPdfBtn');

  if (loteActual.estado_pago === 'AUTORIZADO' && loteActual.pdf_url) {
    downloadSection.style.display = 'block';
    pendingMessage.style.display = 'none';
    downloadBtn.href = loteActual.pdf_url;

    // Quitar eventos previos
    const newDownloadBtn = downloadBtn.cloneNode(true);
    downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);

    // Agregar evento para registrar descarga
    newDownloadBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await registrarDescargaPDF(loteActual.lote, loteActual.pdf_url);
    });
  } else {
    downloadSection.style.display = 'none';
    pendingMessage.style.display = 'block';
  }

  // Cargar y mostrar historial de descargas
  await mostrarHistorialDescargas(loteActual.lote);

  loteModal.style.display = 'flex';
}

// Cerrar modal
modalClose.addEventListener('click', () => {
  loteModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === loteModal) {
    loteModal.style.display = 'none';
  }
});

// Búsqueda de lotes
const buscarLoteInput = document.getElementById('buscarLote');
if (buscarLoteInput) {
  buscarLoteInput.addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    const lotesFiltrados = todosLosLotes.filter(lote =>
      lote.lote.toLowerCase().includes(busqueda)
    );
    renderizarLotes(lotesFiltrados);
  });
}

// Ordenar lotes
const ordenarLotesSelect = document.getElementById('ordenarLotes');
if (ordenarLotesSelect) {
  ordenarLotesSelect.addEventListener('change', (e) => {
    const orden = e.target.value;
    let lotesOrdenados = [...todosLosLotes];

    switch (orden) {
      case 'recientes':
        lotesOrdenados.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
        break;
      case 'antiguos':
        lotesOrdenados.sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));
        break;
      case 'pendientes':
        lotesOrdenados.sort((a, b) => {
          if (a.estado_pago === 'PENDIENTE' && b.estado_pago !== 'PENDIENTE') return -1;
          if (a.estado_pago !== 'PENDIENTE' && b.estado_pago === 'PENDIENTE') return 1;
          return 0;
        });
        break;
      case 'cantidad':
        lotesOrdenados.sort((a, b) => b.total_boletos - a.total_boletos);
        break;
    }

    renderizarLotes(lotesOrdenados);
  });
}
