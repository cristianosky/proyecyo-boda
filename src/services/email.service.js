const { getTransporter } = require('../config/email');

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

const ADMIN_URL = 'https://boda-jeifry.duckdns.org/admin.html';

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

function buildPeopleRows(people) {
  if (!people || !people.length) return '';
  return people.map(p => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:14px;color:#3A3028;">
        ${p.person_name}
        ${p.is_companion ? '<span style="font-size:11px;color:#7A6E63;margin-left:6px">(acompañante)</span>' : ''}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:14px;color:#3A3028;">
        ${p.dish ? `${DISH_EMOJI[p.dish] || ''} ${DISH_LABELS[p.dish] || p.dish}` : '—'}
      </td>
    </tr>
  `).join('');
}

function buildHtml({ guestName, attending, people, isUpdate, submittedAt }) {
  const isConfirmed = attending === true;
  const isDeclined  = attending === false;

  const badgeColor = isConfirmed ? '#d4edda' : '#f8d7da';
  const badgeText  = isConfirmed ? '#1a5e35' : '#6e1a1a';
  const badgeLabel = isConfirmed ? '✓ Confirmado' : '✗ No asiste';

  const headingAction = isUpdate
    ? isConfirmed
      ? `<em>${guestName}</em> actualizó su respuesta — <strong>asistirá</strong>`
      : `<em>${guestName}</em> actualizó su respuesta — <strong>no asistirá</strong>`
    : isConfirmed
      ? `<em>${guestName}</em> confirmó su asistencia`
      : `<em>${guestName}</em> indicó que no podrá asistir`;

  const dishSection = isConfirmed && people && people.length ? `
    <div style="padding:0 32px 24px;">
      <p style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#7A6E63;text-transform:uppercase;margin:0 0 10px;">
        Selección de platos
      </p>
      <table style="width:100%;border-collapse:collapse;background:#F8F5EE;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:#EDE8DD;">
            <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#7A6E63;font-weight:400;text-transform:uppercase;">Persona</th>
            <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#7A6E63;font-weight:400;text-transform:uppercase;">Plato</th>
          </tr>
        </thead>
        <tbody>
          ${buildPeopleRows(people)}
        </tbody>
      </table>
    </div>
  ` : isDeclined ? `
    <div style="padding:0 32px 24px;text-align:center;">
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#7A6E63;line-height:1.7;">
        Lamentablemente no podrá acompañarnos el 19 de junio.
      </p>
    </div>
  ` : '';

  const updateBanner = isUpdate ? `
    <div style="margin:0 32px 20px;padding:10px 16px;background:#FFF8E6;border:1px solid #F0D78A;border-radius:8px;font-family:Arial,sans-serif;font-size:12px;color:#8A6A00;">
      🔄 Esta es una respuesta <strong>actualizada</strong> — el invitado cambió su confirmación anterior.
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:32px 16px;background:#EDE8DD;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.10);">

    <!-- Header -->
    <div style="background:#2C4160;padding:28px 32px;text-align:center;">
      <p style="font-family:Georgia,serif;font-style:italic;font-size:26px;color:white;margin:0;font-weight:400;letter-spacing:.5px;">Jeifry &amp; Karen</p>
      <p style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.55);letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">19 · 06 · 2026 &nbsp;·&nbsp; Barranquilla</p>
    </div>

    <!-- Status + name -->
    <div style="padding:28px 32px 20px;text-align:center;">
      <span style="display:inline-block;padding:5px 18px;border-radius:20px;background:${badgeColor};color:${badgeText};font-size:12px;font-weight:700;letter-spacing:.5px;">${badgeLabel}</span>
      <h2 style="font-family:Georgia,serif;font-style:italic;font-size:24px;color:#2C4160;margin:16px 0 6px;font-weight:400;line-height:1.3;">${headingAction}</h2>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#7A6E63;margin:0;">${formatDate(submittedAt || new Date())}</p>
    </div>

    <!-- Update banner if applicable -->
    ${updateBanner}

    <!-- Dish section -->
    ${dishSection}

    <!-- CTA -->
    <div style="padding:8px 32px 28px;text-align:center;">
      <a href="${ADMIN_URL}" style="display:inline-block;padding:12px 28px;background:#2C4160;color:white;text-decoration:none;border-radius:10px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;">
        Ver panel de administración
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #EDE8DD;padding:16px 32px;text-align:center;">
      <p style="font-family:Arial,sans-serif;font-size:11px;color:#B0A898;margin:0;letter-spacing:.5px;">
        Notificación automática · Invitaciones digitales Jeifry &amp; Karen 2026
      </p>
    </div>

  </div>
</body>
</html>`;
}

async function sendRsvpNotification({ guestName, attending, people, isUpdate, submittedAt }) {
  const transporter = getTransporter();
  if (!transporter) return; // email not configured, skip silently

  const to = process.env.EMAIL_TO;
  if (!to) return;

  const actionLabel = isUpdate
    ? (attending ? 'actualizó — asistirá' : 'actualizó — no asistirá')
    : (attending ? 'confirmó asistencia' : 'no podrá asistir');

  const subject = `${attending ? '✅' : '❌'}${isUpdate ? ' 🔄' : ''} ${guestName} ${actionLabel} · Boda Jeifry & Karen`;

  const html = buildHtml({ guestName, attending, people, isUpdate, submittedAt });

  try {
    await transporter.sendMail({
      from: `"Boda Jeifry & Karen 💍" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] Notificación enviada → ${to} (${guestName})`);
  } catch (err) {
    console.error('[email] Error al enviar notificación:', err.message);
  }
}

module.exports = { sendRsvpNotification };
