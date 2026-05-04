require('dotenv').config();
const express = require('express');
const path    = require('path');
const { initWhatsApp } = require('./config/whatsapp');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/guests', require('./routes/guests.routes'));
app.use('/api/admin',  require('./routes/admin.routes'));

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`  → Invitaciones: http://localhost:${PORT}/?g=<INVITE_CODE>`);
  console.log(`  → Admin:        http://localhost:${PORT}/admin.html`);
  initWhatsApp();
});
