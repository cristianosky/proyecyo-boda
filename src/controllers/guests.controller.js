const pool = require('../config/database');
const { sendRsvpNotification }                                    = require('../services/email.service');
const { sendWhatsAppNotification, sendGuestWhatsAppNotification } = require('../services/whatsapp.service');

async function getGuest(req, res) {
  const { code } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT
         g.id, g.name, g.invite_code, g.max_companions,
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
       WHERE g.invite_code = $1
       GROUP BY g.id, r.id`,
      [code.toUpperCase()]
    );

    if (!rows.length) return res.status(404).json({ error: 'Invitación no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function submitRsvp(req, res) {
  const { code } = req.params;
  const { attending, people = [] } = req.body;

  if (typeof attending !== 'boolean') {
    return res.status(400).json({ error: 'Campo "attending" requerido (boolean)' });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, name, phone, max_companions FROM guests WHERE invite_code = $1',
      [code.toUpperCase()]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invitación no encontrada' });
    const guest = rows[0];

    const existing = await client.query(
      'SELECT id FROM rsvps WHERE guest_id = $1',
      [guest.id]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Ya confirmaste tu asistencia anteriormente' });
    }

    if (attending) {
      const companions = people.filter(p => p.is_companion);
      if (companions.length > guest.max_companions) {
        return res.status(400).json({ error: 'Número de acompañantes supera el cupo asignado' });
      }
    }

    await client.query('BEGIN');

    const { rows: rsvpRows } = await client.query(
      'INSERT INTO rsvps (guest_id, attending) VALUES ($1, $2) RETURNING id',
      [guest.id, attending]
    );
    const rsvpId = rsvpRows[0].id;

    for (const p of people) {
      await client.query(
        `INSERT INTO rsvp_people (rsvp_id, person_name, is_companion, companion_index, dish)
         VALUES ($1, $2, $3, $4, $5)`,
        [rsvpId, p.person_name, !!p.is_companion, p.companion_index ?? 0, p.dish ?? null]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });

    const notifData = { guestName: guest.name, attending, people, phone: guest.phone, isUpdate: false, submittedAt: new Date() };
    sendRsvpNotification(notifData);
    sendWhatsAppNotification(notifData);
    sendGuestWhatsAppNotification(notifData);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la confirmación' });
  } finally {
    client.release();
  }
}

async function updateRsvp(req, res) {
  const { code } = req.params;
  const { attending, people = [] } = req.body;

  if (typeof attending !== 'boolean') {
    return res.status(400).json({ error: 'Campo "attending" requerido (boolean)' });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, name, phone, max_companions FROM guests WHERE invite_code = $1',
      [code.toUpperCase()]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invitación no encontrada' });
    const guest = rows[0];

    const existing = await client.query(
      'SELECT id FROM rsvps WHERE guest_id = $1',
      [guest.id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'No existe confirmación previa para actualizar' });
    }
    const rsvpId = existing.rows[0].id;

    if (attending) {
      const companions = people.filter(p => p.is_companion);
      if (companions.length > guest.max_companions) {
        return res.status(400).json({ error: 'Número de acompañantes supera el cupo asignado' });
      }
    }

    await client.query('BEGIN');
    await client.query(
      'UPDATE rsvps SET attending = $1, submitted_at = NOW() WHERE id = $2',
      [attending, rsvpId]
    );
    await client.query('DELETE FROM rsvp_people WHERE rsvp_id = $1', [rsvpId]);

    for (const p of people) {
      await client.query(
        `INSERT INTO rsvp_people (rsvp_id, person_name, is_companion, companion_index, dish)
         VALUES ($1, $2, $3, $4, $5)`,
        [rsvpId, p.person_name, !!p.is_companion, p.companion_index ?? 0, p.dish ?? null]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });

    const notifData = { guestName: guest.name, attending, people, phone: guest.phone, isUpdate: true, submittedAt: new Date() };
    sendRsvpNotification(notifData);
    sendWhatsAppNotification(notifData);
    sendGuestWhatsAppNotification(notifData);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la confirmación' });
  } finally {
    client.release();
  }
}

module.exports = { getGuest, submitRsvp, updateRsvp };
