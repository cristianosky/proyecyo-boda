const router = require('express').Router();
const { getAllRsvps } = require('../controllers/admin.controller');

router.get('/rsvps', getAllRsvps);

module.exports = router;
