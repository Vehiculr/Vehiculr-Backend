const express = require('express');
const router = express.Router({ mergeParams: true }); // ✅ define router first
const partnerController = require('../controllers/partnerController');

// Routes
router.post('/', partnerController.createPartner);
router.get('/', partnerController.getAllPartners);
router.get('/:id', partnerController.getPartnerById);

module.exports = router;
