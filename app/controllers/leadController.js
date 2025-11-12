const Lead = require("../models/leadModel");
const axios = require("axios"); 
const { uploadToCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinaryConfig');
const cloudinary = require("cloudinary").v2;

// ✅ 1. Create new lead
exports.createLead = async (req, res) => {
    console.log("Create Lead Request Received");
  try {
    const {
      userName,
      userPhone,
      vehicle,
      services,
      location,
      pickupDrop,
      notes,
      budget,
      garageId
    } = req.body;
    // Multer stores file info in req.files
     // ✅ Photo Upload Handling (if images exist)
    let leadPhotos = [];

    if (req.files && req.files.length > 0) {
      if (req.files.length > 4) {
        return res.status(400).json({
          success: false,
          message: "Maximum 4 images allowed for a send quates.",
        });
      }

      const uploadResults = await uploadMultipleToCloudinary(req.files, {
        folder: 'leads-photos',
        transformation: [
          { width: 1200, height: 900, crop: "limit", quality: "auto" }
        ]
      });

      leadPhotos = uploadResults.map(result => ({
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        created_at: result.created_at,
      }));
    }

    const lead = new Lead({
      userName,
      userPhone,
      vehicle,
      services: JSON.parse(services), // if sent as JSON string
      location,
      pickupDrop,
      notes,
      budget,
      garageId,
      photos: leadPhotos, // ✅ Saved Cloudinary Photos
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create lead",
      error: error.message
    });
  }
};

// ✅ 2. Get all leads for a partner
exports.getLeadsByPartner = async (req, res) => {
  try {
    const { garageId } = req.params;

    console.log("Fetching leads for garageId:", garageId);

    // ✅ Fetch leads that match garageId exactly
    const leads = await Lead.find({
      garageId: { $exists: true, $eq: garageId }
    }).sort({ createdAt: -1 });

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No leads found for garageId: ${garageId}`
      });
    }

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });

  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
      error: error.message
    });
  }
};

// ✅ 3. Get single lead detail
exports.getLeadById = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch lead", error: error.message });
  }
};

// ✅ 4. Partner sends quote reply
exports.sendQuoteReply = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { amount, message, estimatedCompletionTime } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      leadId,
      {
        partnerQuote: {
          amount,
          message,
          estimatedCompletionTime,
          sentAt: new Date()
        },
        status: "quoted"
      },
      { new: true }
    );

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    // Optional: Send WhatsApp message to user
    const textMsg = `
🔧 *Garage Quote Sent!*

Dear ${lead.userName},

Your vehicle: *${lead.vehicle}*
Services: ${lead.services.join(", ")}

💰 *Quote:* ₹${amount}
🕒 *Time:* ${estimatedCompletionTime}
📍 *Location:* ${lead.location}

${message ? "📝 " + message : ""}

Thank you for choosing *Garages of India*!
`;
    await sendWhatsAppMessage(lead.userPhone, textMsg);

    res.json({ success: true, message: "Quote sent successfully", data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send quote", error: error.message });
  }
};

// ✅ 5. Update status (e.g., completed, cancelled)
exports.updateLeadStatus = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;

    const lead = await Lead.findByIdAndUpdate(leadId, { status }, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, message: "Lead status updated", data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};

// 🟢 WhatsApp sender (dummy version)
async function sendWhatsAppMessage(phone, message) {
  try {
    // Use your WhatsApp API provider here (Green API, Twilio, Meta Cloud API, etc.)
    console.log(`Sending WhatsApp message to ${phone}: ${message}`);
    // Example with Meta Cloud API:
    // await axios.post("https://graph.facebook.com/v17.0/<phone_number_id>/messages", { ... })
  } catch (err) {
    console.error("WhatsApp message failed:", err.message);
  }
}
