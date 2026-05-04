const router = require('express').Router();
const { getAllRsvps, addGuest, deleteGuest, resendInvitation, testWhatsApp } = require('../controllers/admin.controller');

router.get('/rsvps',                  getAllRsvps);
router.post('/guests',                addGuest);
router.delete('/guests/:id',          deleteGuest);
router.post('/guests/:id/resend',     resendInvitation);
router.get('/test-whatsapp',          testWhatsApp);

module.exports = router;
