const Partner = require("../models/partnerModel");
const cashfree = require("../utils/cashfreeClient");
const ocrUtils = require("../utils/ocrUtils");

function maskAadhaar(num) {
  return `XXXX-XXXX-${num.slice(8)}`;
}

exports.initiateAadhaarVerification = async (req, res) => {
  console.log("Aadhaar verification initiation requested", req.body);
  try {
    const { aadhaarNumber } = req.body;
    const partnerId = req.user.id;
    console.log("Initiating Aadhaar verification for:", aadhaarNumber, "Partner ID:", partnerId);

    const provider = await cashfree.initiateOtp({ aadhaarNumber });

    if (!provider.ref_id)
      return res.status(400).json({ success: false, message: "Failed: No ref_id" });

    await Partner.findByIdAndUpdate(partnerId, {
      kyc: {
        type: "Aadhar",
        refId: provider.ref_id,
        aadhaarMasked: maskAadhaar(aadhaarNumber),
        aadhaarLast4: aadhaarNumber.slice(8),
        verified: false
      }
    });

    res.json({ success: true, refId: provider.ref_id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyAadhaarOtp = async (req, res) => {
  try {
    const { refId, otp } = req.body;
    const partnerId = req.user.id;

    const provider = await cashfree.verifyOtp({ refId, otp });

    if (provider.status !== "SUCCESS")
      return res.status(400).json({ success: false, message: "OTP Invalid" });

    const data = provider.data;

    await Partner.findByIdAndUpdate(partnerId, {
      "kyc.fullName": data.name,
      "kyc.dob": data.dob,
      "kyc.gender": data.gender,
      "kyc.fatherName": data.fatherName,
      "kyc.address": data.address,
      "kyc.photo": data.photo,
      "kyc.rawVerifyResponse": provider,
      "kyc.verified": true
    });

    res.json({ success: true, message: "Aadhaar Verified" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Optional OCR match
exports.ocrAadhaarAndMatch = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image required" });

    const partner = await Partner.findById(req.user.id);
    const ocr = await ocrUtils.extractFromImage(req.file.buffer);

    const comparison = {
      nameMatch: ocr.name === partner.kyc.fullName,
      dobMatch: ocr.dob === partner.kyc.dob,
      last4Match: ocr.last4 === partner.kyc.aadhaarLast4
    };

    res.json({ success: true, ocr, comparison });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
