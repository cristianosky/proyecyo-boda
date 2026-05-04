const { getClient } = require('../config/whatsapp');

const DISH_LABELS = {
  pollo_tallarines: 'Pollo salteado con tallarines',
  pollo_champi:     'Pollo en salsa de champiñones',
  pescado_teriyaki: 'Milanesa de pescado en salsa teriyaki',
};

const DISH_EMOJI = {
  pollo_tallarines: '🍜',
  pollo_champi:     '🍗',
  pescado_teriyaki: '🐟',
};

function formatDate(d) {
  return new Date(d).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day:    '2-digit',
    month:  'long',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// Normaliza a formato internacional sin + (ej: 573001234567)
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length === 12) return digits;
  if (digits.startsWith('3')  && digits.length === 10) return `57${digits}`;
  if (digits.startsWith('00')) return digits.slice(2);
  return digits;
}

async function sendMessage(to, text) {
  const client = getClient();
  if (!client) return;
  const normalized = normalizePhone(to);
  if (!normalized) return;
  const chatId = `${normalized}@c.us`;
  try {
    await client.sendMessage(chatId, text);
    console.log(`[WhatsApp] → ${normalized}`);
  } catch (err) {
    console.error('[WhatsApp] Error:', err.message);
  }
}

// ── MENSAJE AL ADMIN ─────────────────────────────────────────────────────────
function buildAdminMessage({ guestName, attending, people, phone, isUpdate, submittedAt }) {
  const lines = [];

  if (isUpdate) {
    lines.push(attending
      ? `🔄 *${guestName}* actualizó — ahora *sí va* a la boda!`
      : `🔄 *${guestName}* actualizó — ya *no podrá ir* 😔`
    );
  } else {
    lines.push(attending
      ? `🎉 *${guestName}* confirmó que va a la boda!`
      : `😔 *${guestName}* dice que no podrá ir.`
    );
  }

  if (phone) {
    const normalized = normalizePhone(phone);
    lines.push(`📞 +${normalized}`);
  }

  if (attending && people && people.length > 0) {
    lines.push('');
    lines.push('Pidió:');
    for (const p of people) {
      const tag  = p.is_companion ? ' _(acomp.)_' : '';
      const dish = p.dish ? `${DISH_EMOJI[p.dish] || ''} ${DISH_LABELS[p.dish] || p.dish}` : '—';
      lines.push(`• ${p.person_name}${tag} — ${dish}`);
    }
  }

  lines.push('');
  lines.push(`_${formatDate(submittedAt || new Date())}_`);
  return lines.join('\n');
}

// ── MENSAJE AL INVITADO ───────────────────────────────────────────────────────
function buildGuestMessage({ guestName, attending, people, isUpdate }) {
  const lines = [];
  const firstName = guestName.split(' ')[0];

  if (attending) {
    lines.push(`💍 *¡Hola, ${firstName}!*`);
    lines.push('');

    if (isUpdate) {
      lines.push('Tu respuesta ha sido *actualizada* ✅');
      lines.push(`Confirmaste que *asistirás* a la boda de Jeifry & Karen.`);
    } else {
      lines.push('¡Tu asistencia ha sido confirmada! ✅');
    }

    lines.push('');
    lines.push('📅 *Viernes 19 de junio de 2026*');
    lines.push('🕖 7:00 PM');
    lines.push('📍 Barrio El Prado, Calle 76 #52-06');
    lines.push('   Barranquilla, Atlántico');

    if (people && people.length > 0) {
      lines.push('');
      lines.push('*Tu selección de platos:*');
      for (const p of people) {
        const icon = p.is_companion ? '👤' : '⭐';
        const dish = p.dish ? `${DISH_EMOJI[p.dish] || ''} ${DISH_LABELS[p.dish] || p.dish}` : '—';
        lines.push(`${icon} ${p.person_name}: ${dish}`);
      }
    }

    lines.push('');
    lines.push('_¡Te esperamos con mucha alegría! — Jeifry & Karen_ 💐');
  } else {
    lines.push(`💍 *Hola, ${firstName}*`);
    lines.push('');

    if (isUpdate) {
      lines.push('Tu respuesta ha sido *actualizada*.');
      lines.push('Lamentamos que ya no puedas acompañarnos. 😔');
    } else {
      lines.push('Hemos registrado que no podrás acompañarnos. 😔');
      lines.push('Lamentamos mucho no tenerte presente, pero te tendremos en nuestros corazones ese día tan especial.');
    }

    lines.push('');
    lines.push('_Con cariño — Jeifry & Karen_ 🕊️');
  }

  return lines.join('\n');
}

// ── INVITACIÓN INICIAL ────────────────────────────────────────────────────────
function buildInvitationMessage(guestName, inviteCode) {
  const firstName = guestName.split(' ')[0];
  const url = `https://boda-jeifry.duckdns.org/?g=${inviteCode}`;
  const lines = [
    `💍 *¡Hola, ${firstName}!*`,
    '',
    `*Jeifry y Karen* te invitan a celebrar su boda 🎊`,
    '',
    '📅 *Viernes 19 de junio de 2026*',
    '🕖 7:00 PM',
    '📍 Barrio El Prado, Calle 76 #52-06',
    '   Barranquilla, Atlántico',
    '',
    'Para ver tu invitación y confirmar asistencia entra aquí:',
    `🔗 ${url}`,
    '',
    '_¡Te esperamos con mucho amor!_ 💐',
  ];
  return lines.join('\n');
}

// ── EXPORTS ───────────────────────────────────────────────────────────────────
async function sendWhatsAppNotification(data) {
  await sendMessage(process.env.WHATSAPP_TO, buildAdminMessage(data));
}

async function sendGuestWhatsAppNotification(data) {
  if (!data.phone) return;
  await sendMessage(data.phone, buildGuestMessage(data));
}

async function sendInvitationWhatsApp(guestName, phone, inviteCode) {
  if (!phone) return;
  await sendMessage(phone, buildInvitationMessage(guestName, inviteCode));
}

async function sendCustomWhatsApp(phone, text) {
  await sendMessage(phone, text);
}

module.exports = { sendWhatsAppNotification, sendGuestWhatsAppNotification, sendInvitationWhatsApp, sendCustomWhatsApp };
