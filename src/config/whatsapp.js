const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client = null;
let ready  = false;

function getClient() {
  return ready ? client : null;
}

function initWhatsApp() {
  if (!process.env.WHATSAPP_TO) return; // no configurado, saltar

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      executablePath: '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    },
  });

  client.on('qr', qr => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' [WhatsApp] Escanea este QR con tu teléfono');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    qrcode.generate(qr, { small: true });
    console.log('');
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Sesión autenticada ✓');
  });

  client.on('ready', () => {
    ready = true;
    console.log('[WhatsApp] Cliente listo — las notificaciones están activas ✓');
  });

  client.on('auth_failure', msg => {
    console.error('[WhatsApp] Fallo de autenticación:', msg);
  });

  client.on('disconnected', reason => {
    ready = false;
    console.warn('[WhatsApp] Desconectado:', reason);
    // Reintentar conexión después de 10 segundos
    setTimeout(() => {
      console.log('[WhatsApp] Reintentando conexión…');
      client.initialize().catch(err => console.error('[WhatsApp] Error al reiniciar:', err.message));
    }, 10_000);
  });

  client.initialize().catch(err => {
    console.error('[WhatsApp] No se pudo inicializar:', err.message);
  });
}

module.exports = { initWhatsApp, getClient };
