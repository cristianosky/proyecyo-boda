const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode         = require('qrcode');

let client    = null;
let ready     = false;
let currentQR = null;

function getClient() { return ready ? client : null; }
function getQR()     { return currentQR; }
function isReady()   { return ready; }

function initWhatsApp() {
  if (!process.env.WHATSAPP_TO) return;

  const puppeteerConfig = process.platform === 'linux'
    ? {
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
        ],
      }
    : {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: puppeteerConfig,
  });

  client.on('qr', qr => {
    qrcodeTerminal.generate(qr, { small: true });
    console.log('\n[WhatsApp] QR disponible — escanéalo desde el panel admin\n');
    QRCode.toDataURL(qr, { scale: 8, margin: 2 })
      .then(dataUrl => { currentQR = dataUrl; })
      .catch(err  => console.error('[WhatsApp] Error generando imagen QR:', err.message));
  });

  client.on('authenticated', () => {
    currentQR = null;
    console.log('[WhatsApp] Sesión autenticada ✓');
  });

  client.on('ready', () => {
    ready     = true;
    currentQR = null;
    console.log('[WhatsApp] Cliente listo — las notificaciones están activas ✓');
  });

  client.on('auth_failure', msg => {
    console.error('[WhatsApp] Fallo de autenticación:', msg);
  });

  client.on('disconnected', reason => {
    ready = false;
    console.warn('[WhatsApp] Desconectado:', reason);
    setTimeout(() => {
      console.log('[WhatsApp] Reintentando conexión…');
      client.initialize().catch(err => console.error('[WhatsApp] Error al reiniciar:', err.message));
    }, 10_000);
  });

  client.initialize().catch(err => {
    console.error('[WhatsApp] No se pudo inicializar:', err.message);
  });
}

module.exports = { initWhatsApp, getClient, getQR, isReady };
