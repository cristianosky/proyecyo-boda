const router = require('express').Router();
const { getAllRsvps, addGuest, deleteGuest, resendInvitation, testWhatsApp, getWhatsappStatus } = require('../controllers/admin.controller');

router.get('/rsvps',                  getAllRsvps);
router.get('/whatsapp-status',        getWhatsappStatus);
router.post('/guests',                addGuest);
router.delete('/guests/:id',          deleteGuest);
router.post('/guests/:id/resend',     resendInvitation);
router.get('/test-whatsapp',          testWhatsApp);

module.exports = router;
