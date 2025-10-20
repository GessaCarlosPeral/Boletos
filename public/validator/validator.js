// Estado de la aplicación
let scanning = false;
let stream = null;
const statsValidados = { count: 0 };
const statsRechazados = { count: 0 };

// Variables del DOM (se inicializan cuando el DOM esté listo)
let video, canvas, ctx, startScanBtn, manualCodeInput, validateManualBtn, resultDiv, offlineIndicator, cameraInstructions;

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM cargado');
  inicializarApp();
});

function inicializarApp() {
  // Obtener elementos del DOM
  video = document.getElementById('video');
  canvas = document.getElementById('canvas');
  ctx = canvas ? canvas.getContext('2d') : null;
  startScanBtn = document.getElementById('startScan');
  manualCodeInput = document.getElementById('manualCode');
  validateManualBtn = document.getElementById('validateManual');
  resultDiv = document.getElementById('result');
  offlineIndicator = document.getElementById('offlineIndicator');
  cameraInstructions = document.getElementById('cameraInstructions');

  console.log('✅ Elementos inicializados:', {
    video: !!video,
    canvas: !!canvas,
    startScanBtn: !!startScanBtn
  });

  // Event Listeners
  if (startScanBtn) {
    startScanBtn.addEventListener('click', async () => {
      console.log('🔘 Botón clickeado');
      if (!scanning) {
        await startScanning();
      } else {
        stopScanning();
      }
    });
  }

  if (validateManualBtn) {
    validateManualBtn.addEventListener('click', async () => {
      const code = manualCodeInput.value.trim();
      if (code) {
        await validarBoleto(code);
        manualCodeInput.value = '';
      }
    });
  }

  if (manualCodeInput) {
    manualCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        validateManualBtn.click();
      }
    });
  }

  // Detección de conexión
  window.addEventListener('online', () => {
    if (offlineIndicator) offlineIndicator.classList.remove('show');
    console.log('Conexión restaurada');
  });

  window.addEventListener('offline', () => {
    if (offlineIndicator) offlineIndicator.classList.add('show');
    console.log('Sin conexión - Modo offline');
  });

  // Cargar estadísticas
  cargarStats();

  console.log('✅ App inicializada completamente');
}

// Iniciar escaneo
async function startScanning() {
  console.log('📹 Iniciando escaneo...');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Tu navegador no soporta acceso a la cámara');
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    console.log('✅ Stream obtenido');
    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    await video.play();

    scanning = true;
    video.style.display = 'block';
    video.classList.add('active');
    if (cameraInstructions) cameraInstructions.classList.add('show');
    startScanBtn.textContent = '❌ Cancelar Escaneo';
    startScanBtn.classList.remove('btn-primary');
    startScanBtn.classList.add('btn-secondary');

    console.log('✅ Video iniciado, comenzando scan loop');
    requestAnimationFrame(tick);

  } catch (error) {
    console.error('❌ Error:', error);
    let mensaje = 'No se pudo acceder a la cámara.\n\n';

    if (error.name === 'NotAllowedError') {
      mensaje += 'Permisos denegados. Permite el acceso a la cámara.';
    } else if (error.name === 'NotFoundError') {
      mensaje += 'No se encontró cámara en tu dispositivo.';
    } else {
      mensaje += 'Error: ' + error.message;
    }

    alert(mensaje + '\n\nUsa el código manual como alternativa.');
  }
}

// Detener escaneo
function stopScanning() {
  console.log('🛑 Deteniendo escaneo');
  scanning = false;

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  video.style.display = 'none';
  video.classList.remove('active');
  if (cameraInstructions) cameraInstructions.classList.remove('show');
  startScanBtn.textContent = '🎫 Escanear y Consumir Boleto';
  startScanBtn.classList.remove('btn-secondary');
  startScanBtn.classList.add('btn-primary');
}

// Loop de escaneo
function tick() {
  if (!scanning) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Verificar si jsQR está disponible
    if (typeof jsQR !== 'undefined') {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code) {
        console.log('✅ QR detectado:', code.data);
        vibrate();
        beep();
        validarBoleto(code.data);
        stopScanning();
        return;
      }
    } else {
      console.warn('⚠️ jsQR no está cargado');
    }
  }

  requestAnimationFrame(tick);
}

// Capturar foto del video stream
async function capturarFotoEscaneo() {
  console.log('🎥 Intentando capturar foto...');
  console.log('  - Stream existe:', !!stream);
  console.log('  - Video readyState:', video.readyState, '(esperado: 4 = HAVE_ENOUGH_DATA)');
  console.log('  - Video dimensions:', video.videoWidth, 'x', video.videoHeight);

  if (!stream) {
    console.warn('⚠️ No hay stream de video disponible');
    return null;
  }

  if (video.readyState !== video.HAVE_ENOUGH_DATA) {
    console.warn('⚠️ Video no está listo. ReadyState:', video.readyState);
    return null;
  }

  try {
    // Crear canvas temporal para capturar el frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;

    if (tempCanvas.width === 0 || tempCanvas.height === 0) {
      console.warn('⚠️ Dimensiones de video inválidas:', tempCanvas.width, 'x', tempCanvas.height);
      return null;
    }

    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    // Convertir a blob
    const fotoBlob = await new Promise(resolve => {
      tempCanvas.toBlob(resolve, 'image/jpeg', 0.8);
    });

    if (fotoBlob) {
      console.log('✅ Foto capturada exitosamente. Tamaño:', Math.round(fotoBlob.size / 1024), 'KB');
    } else {
      console.warn('⚠️ No se pudo convertir canvas a blob');
    }

    return fotoBlob;
  } catch (err) {
    console.error('❌ Error al capturar foto del escaneo:', err);
    return null;
  }
}

// Validar boleto
async function validarBoleto(uuid) {
  mostrarLoading();

  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      mostrarResultado('error', 'Código Inválido', 'El código escaneado no es válido');
      statsRechazados.count++;
      actualizarStats();
      return;
    }

    // SIEMPRE capturar foto PRIMERO para TODOS los escaneos (exitosos y rechazos)
    const fotoBlob = await capturarFotoEscaneo();

    // Preparar FormData con foto (se usa tanto para éxito como rechazo)
    const formData = new FormData();
    formData.append('uuid', uuid);
    formData.append('ubicacion', 'Comedor principal');

    if (fotoBlob) {
      formData.append('foto', fotoBlob, `escaneo-${uuid}.jpg`);
      console.log('📤 Enviando al endpoint CON foto');
    } else {
      console.log('📤 Enviando al endpoint SIN foto');
    }

    // Enviar al endpoint (el backend valida, decide si es éxito o rechazo y SIEMPRE guarda la foto)
    const usarResponse = await fetch('/api/boletos/usar-con-foto', {
      method: 'POST',
      body: formData
    });

    const resultado = await usarResponse.json();

    if (resultado.exito) {
      // BOLETO VÁLIDO
      mostrarResultado(
        'success',
        '✅ BOLETO VÁLIDO',
        `Acceso autorizado al comedor${resultado.fotoCapturada ? ' 📸' : ''}`,
        {
          'Contratista': resultado.boleto?.contratista || 'N/A',
          'Fecha de uso': new Date(resultado.fechaUso).toLocaleString('es-MX'),
          'Ubicación': resultado.ubicacion
        }
      );
      statsValidados.count++;
      vibrateSuccess();
      playSuccessSound();
    } else {
      // BOLETO RECHAZADO (con foto guardada para detectar fraude)
      console.log('✅ Foto de rechazo guardada:', resultado.fotoCapturada ? 'SÍ' : 'NO');
      mostrarResultado(
        'error',
        '❌ BOLETO RECHAZADO',
        resultado.mensaje,
        resultado.fechaUso ? {
          'Usado el': new Date(resultado.fechaUso).toLocaleString('es-MX')
        } : null
      );
      statsRechazados.count++;
      vibrateError();
      playErrorSound();
    }

    actualizarStats();

  } catch (error) {
    console.error('Error validando boleto:', error);
    mostrarResultado(
      'error',
      'Error de Conexión',
      'No se pudo validar el boleto. Verifica tu conexión.'
    );
    statsRechazados.count++;
    actualizarStats();
  }
}

// Mostrar resultado
function mostrarResultado(tipo, titulo, mensaje, detalles = null) {
  const iconos = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  let html = `
    <div class="result-icon">${iconos[tipo]}</div>
    <div class="result-title">${titulo}</div>
    <div class="result-message">${mensaje}</div>
  `;

  if (detalles) {
    html += '<div class="result-details">';
    for (const [key, value] of Object.entries(detalles)) {
      html += `<div><strong>${key}:</strong> ${value}</div>`;
    }
    html += '</div>';
  }

  resultDiv.innerHTML = html;
  resultDiv.className = `result ${tipo}`;
  resultDiv.style.display = 'block';

  setTimeout(() => {
    resultDiv.style.display = 'none';
  }, 5000);
}

// Mostrar loading
function mostrarLoading() {
  resultDiv.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Validando boleto...</p>
    </div>
  `;
  resultDiv.className = 'result';
  resultDiv.style.display = 'block';
}

// Actualizar estadísticas
function actualizarStats() {
  const statsValidadosEl = document.getElementById('statsValidados');
  const statsRechazadosEl = document.getElementById('statsRechazados');

  if (statsValidadosEl) statsValidadosEl.textContent = statsValidados.count;
  if (statsRechazadosEl) statsRechazadosEl.textContent = statsRechazados.count;

  localStorage.setItem('statsValidados', statsValidados.count);
  localStorage.setItem('statsRechazados', statsRechazados.count);
}

// Cargar estadísticas
function cargarStats() {
  const hoy = new Date().toDateString();
  const ultimaFecha = localStorage.getItem('statsDate');

  if (ultimaFecha === hoy) {
    statsValidados.count = parseInt(localStorage.getItem('statsValidados') || '0');
    statsRechazados.count = parseInt(localStorage.getItem('statsRechazados') || '0');
  } else {
    statsValidados.count = 0;
    statsRechazados.count = 0;
    localStorage.setItem('statsDate', hoy);
  }

  actualizarStats();
}

// Vibración de éxito (corta)
function vibrateSuccess() {
  if ('vibrate' in navigator) {
    navigator.vibrate(200);
  }
}

// Vibración de error (doble pulso)
function vibrateError() {
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
}

// Vibración genérica (mantener para compatibilidad)
function vibrate() {
  vibrateSuccess();
}

// Sonido de escaneo (neutral - cuando detecta QR)
function playScanSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.2;

    oscillator.start();
    setTimeout(() => oscillator.stop(), 80);
  } catch (e) {
    console.log('Audio no disponible');
  }
}

// Beep genérico (mantener para compatibilidad)
function beep() {
  playScanSound();
}

// Sonido de éxito - Melodía ascendente alegre (DO → MI → SOL)
function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Primer tono: DO (523 Hz)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 523;
    osc1.type = 'sine';
    gain1.gain.value = 0.3;
    osc1.start();
    setTimeout(() => osc1.stop(), 100);

    // Segundo tono: MI (659 Hz)
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 659;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start();
      setTimeout(() => osc2.stop(), 100);
    }, 120);

    // Tercer tono: SOL (784 Hz)
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 784;
      osc3.type = 'sine';
      gain3.gain.value = 0.3;
      osc3.start();
      setTimeout(() => osc3.stop(), 150);
    }, 240);

  } catch (e) {
    console.log('Audio no disponible');
  }
}

// Sonido de error - Buzzer descendente de alerta (400Hz → 300Hz → 200Hz)
function playErrorSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Primer tono: 400 Hz
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 400;
    osc1.type = 'square'; // Onda cuadrada para efecto más "serio"
    gain1.gain.value = 0.25;
    osc1.start();
    setTimeout(() => osc1.stop(), 150);

    // Segundo tono: 300 Hz
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 300;
      osc2.type = 'square';
      gain2.gain.value = 0.25;
      osc2.start();
      setTimeout(() => osc2.stop(), 150);
    }, 170);

    // Tercer tono: 200 Hz (más grave)
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 200;
      osc3.type = 'square';
      gain3.gain.value = 0.25;
      osc3.start();
      setTimeout(() => osc3.stop(), 180);
    }, 340);

  } catch (e) {
    console.log('Audio no disponible');
  }
}

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/validator/sw.js')
    .then(() => console.log('Service Worker registrado'))
    .catch(err => console.log('Error registrando SW:', err));
}
