const router = require('express').Router();
const { getGuest, submitRsvp, updateRsvp } = require('../controllers/guests.controller');

router.get('/:code',       getGuest);
router.post('/:code/rsvp', submitRsvp);
router.put('/:code/rsvp',  updateRsvp);

module.exports = router;
