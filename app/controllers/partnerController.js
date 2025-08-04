const Partner = require('../models/partnerModel');

// CREATE a new partner
exports.createPartner = async (req, res) => {
  try {
    const partner = await Partner.create(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Partner created successfully',
      data: partner
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// GET all partners
exports.getAllPartners = async (req, res) => {
  try {
    const partners = await Partner.find();
    res.status(200).json({
      status: 'success',
      results: partners.length,
      data: partners
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET single partner by ID
exports.getPartnerById = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ status: 'fail', message: 'Partner not found' });
    }
    res.status(200).json({ status: 'success', data: partner });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
