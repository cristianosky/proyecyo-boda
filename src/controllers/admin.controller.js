const pool = require('../config/database');

async function getAllRsvps(req, res) {
  const token = req.query.token;
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

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
    const allPeople = rows.flatMap(r => r.people || []);
    const dishes    = { pollo_tallarines: 0, pollo_champi: 0, pescado_teriyaki: 0 };
    allPeople.forEach(p => { if (p.dish && dishes[p.dish] !== undefined) dishes[p.dish]++; });

    res.json({
      summary: {
        total: rows.length,
        confirmed: confirmed.length,
        declined: declined.length,
        pending: pending.length,
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

module.exports = { getAllRsvps };
