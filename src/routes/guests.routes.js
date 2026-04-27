const router = require('express').Router();
const { getGuest, submitRsvp } = require('../controllers/guests.controller');

router.get('/:code',      getGuest);
router.post('/:code/rsvp', submitRsvp);

module.exports = router;
