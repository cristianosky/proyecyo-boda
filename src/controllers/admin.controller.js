const pool   = require('../config/database');
const crypto = require('crypto');
const { sendWhatsAppNotification, sendCustomWhatsApp } = require('../services/whatsapp.service');
const { getQR, isReady } = require('../config/whatsapp');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) code += chars[bytes[i] % chars.length];
  return code;
}

async function getAllRsvps(req, res) {
  const token = req.query.token;
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         g.id, g.name, g.invite_code, g.max_companions, g.phone, g.notified_at,
         r.attending, r.submitted_at,
         COALESCE(
           json_agg(
             json_build_object(
               'person_name',     rp.person_name,
               'is_companion',    rp.is_companion,
               'companion_index', rp.companion_index,
               'dish',            rp.dish
             ) ORDER BY rp.companion_index
           ) FILTER (WHERE rp.id IS NOT NULL),
           '[]'
         ) AS people
       FROM guests g
       LEFT JOIN rsvps r        ON r.guest_id = g.id
       LEFT JOIN rsvp_people rp ON rp.rsvp_id = r.id
       GROUP BY g.id, r.id
       ORDER BY
         CASE WHEN r.attending IS NULL  THEN 1
              WHEN r.attending = TRUE   THEN 0
              ELSE 2 END,
         g.name`
    );

    const confirmed = rows.filter(r => r.attending === true);
    const declined  = rows.filter(r => r.attending === false);
    const pending   = rows.filter(r => r.attending === null);
    const notified  = rows.filter(r => r.notified_at !== null);
    const allPeople = rows.flatMap(r => r.people || []);
    const dishes    = { pollo_tallarines: 0, pollo_champi: 0, pescado_teriyaki: 0 };
    allPeople.forEach(p => { if (p.dish && dishes[p.dish] !== undefined) dishes[p.dish]++; });

    res.json({
      summary: {
        total: rows.length,
        confirmed: confirmed.length,
        declined: declined.length,
        pending: pending.length,
        notified: notified.length,
        total_attendees: allPeople.length,
        dishes,
      },
      guests: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function addGuest(req, res) {
  const token = req.query.token;
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { name, max_companions, phone } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nombre requerido' });
  }
  const companions = parseInt(max_companions, 10);
  if (![0, 1, 2].includes(companions)) {
    return res.status(400).json({ error: 'Cupo inválido' });
  }

  let code;
  for (let tries = 0; tries < 10; tries++) {
    const candidate = generateCode();
    const { rows } = await pool.query('SELECT id FROM guests WHERE invite_code = $1', [candidate]);
    if (!rows.length) { code = candidate; break; }
  }
  if (!code) return res.status(500).json({ error: 'No se pudo generar código único' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO guests (name, invite_code, max_companions, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), code, companions, phone ? phone.trim() : null]
    );
    res.json({ ok: true, guest: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear invitado' });
  }
}

async function deleteGuest(req, res) {
  const token = req.query.token;
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM guests WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Invitado no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar invitado' });
  }
}

async function resendInvitation(req, res) {
  const token = req.query.token;
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { id } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  try {
    const { rows } = await pool.query('SELECT name, phone FROM guests WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Invitado no encontrado' });

    const { name, phone } = rows[0];
    if (!phone) return res.status(400).json({ error: `${name} no tiene WhatsApp registrado` });

    await sendCustomWhatsApp(phone, message.trim());

    // Marca la fecha del último envío
    await pool.query('UPDATE guests SET notified_at = NOW() WHERE id = $1', [id]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
}

async function testWhatsApp(req, res) {
  const token = req.query.token;
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const to = (req.query.to || '').replace(/\D/g, '');
  if (!to) return res.status(400).json({ error: 'Parámetro "to" requerido (ej: 573001234567)' });

  const { getClient } = require('../config/whatsapp');
  const client = getClient();
  if (!client) {
    return res.status(503).json({ error: 'WhatsApp no está listo todavía. Escanea el QR primero.' });
  }

  const payload = {
    guestName:   'José Matías (prueba)',
    attending:   true,
    isUpdate:    false,
    submittedAt: new Date(),
    people: [
      { person_name: 'José Matías', is_companion: false, companion_index: 0, dish: 'pollo_tallarines' },
      { person_name: 'Ana García',  is_companion: true,  companion_index: 1, dish: 'pescado_teriyaki' },
    ],
  };

  try {
    const original = process.env.WHATSAPP_TO;
    process.env.WHATSAPP_TO = to;
    await sendWhatsAppNotification(payload);
    process.env.WHATSAPP_TO = original;
    res.json({ ok: true, enviado_a: to, mensaje: 'Notificación de prueba enviada ✓' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getWhatsappStatus(req, res) {
  const token = req.query.token;
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  res.json({ ready: isReady(), qr: getQR() });
}

module.exports = { getAllRsvps, addGuest, deleteGuest, resendInvitation, testWhatsApp, getWhatsappStatus };
