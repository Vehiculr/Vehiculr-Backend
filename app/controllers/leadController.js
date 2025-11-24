const Lead = require("../models/leadModel");
const axios = require("axios");
const User = require('../models/userModel');
const Partner = require('../models/partnerModel');
const sendEmail = require('../utils/email');
const { sendOTP } = require('../services/twilioClient');
const { generateOTP } = require('../utils/generateOTP');
const { uploadToCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinaryConfig');
const { uploadMultipleToS3 } = require('../utils/aws-S3-Config');
const cloudinary = require("cloudinary").v2;
const { sendWhatsAppMessage } = require("../services/twilioClient"); // Import Twilio utility


exports.requestQuoteOTP = async (req, res) => {
  try {
    const { userPhone } = req.body;
    if (!userPhone) return res.status(400).json({ message: "userPhone number is required" });

    // Check existing accounts only
    const [foundUser, foundPartner] = await Promise.all([
      Lead.findOne({ userPhone })
    ]);
    const account = foundUser || foundPartner;
    if (!account) {
      return res.status(404).json({
        message: "userPhone number is not registered with any user or partner"
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60000); // 5 min

    account.quoteOtp = otp;
    account.quoteOtpExpires = otpExpires;
    await account.save();

    await sendOTP(userPhone, otp);

    res.status(200).json({
      message: "OTP sent successfully for quote verification",
      ...(process.env.NODE_ENV !== 'production' && {
        otp,
        expiresIn: "5 minutes"
      })
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.verifyQuoteOTP = async (req, res) => {
  try {
    const { userPhone, otp } = req.body;
    if (!userPhone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    const [foundUser, foundPartner] = await Promise.all([
      Lead.findOne({ userPhone })
    ]);

    const account = foundUser || foundPartner;
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    const isValid =
      account.quoteOtp === otp && account.quoteOtpExpires > Date.now();

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP
    account.quoteOtp = undefined;
    account.quoteOtpExpires = undefined;
    await account.save();

    // No token, no new user creation
    res.status(200).json({
      message: "OTP verified successfully",
      accountId: account._id,
      accountType: foundUser ? "user" : "partner"
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ 1. Create new lead
exports.createLead = async (req, res) => {
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
          message: "Maximum 4 photos allowed."
        });
      }

      const uploadResults = await uploadMultipleToS3(
        req.files,
         folder = "lead-photos" 
      );
      leadPhotos = uploadResults.map((p) => ({
        url: p.url,
        key: p.key,
        bucket: p.bucket
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
      photos: leadPhotos, // ✅ Saved aws Photos
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
async function sendWhatsAppMessage2(phone, message) {
  try {
    // Use your WhatsApp API provider here (Green API, Twilio, Meta Cloud API, etc.)
    console.log(`Sending WhatsApp message to ${phone}: ${message}`);
    // Example with Meta Cloud API:
    // await axios.post("https://graph.facebook.com/v17.0/<phone_number_id>/messages", { ... })
  } catch (err) {
    console.error("WhatsApp message failed:", err.message);
  }
}

// controllers/leadController.js
exports.createLeadAndNotify = async (req, res) => {
  try {
    const garageId = req.params.garageId;

    const {
      userName,
      userPhone,
      vehicle,
      services,
      location,
      pickupDrop,
      notes,
      budget
    } = req.body;

    // ------------------------------
    // 1) Upload Photos to AWS S3
    // ------------------------------
    let leadPhotos = [];

    if (req.files && req.files.length > 0) {
      if (req.files.length > 4) {
        return res.status(400).json({
          success: false,
          message: "Maximum 4 photos allowed."
        });
      }

      const uploadResults = await uploadMultipleToS3(
        req.files,
         folder = "lead-photos" 
      );
      leadPhotos = uploadResults.map((p) => ({
        url: p.url,
        key: p.key,
        bucket: p.bucket
      }));
    }

    // ------------------------------
    // 2) SAVE LEAD IN DB
    // ------------------------------
    const lead = await Lead.create({
      userName,
      userPhone,
      vehicle,
      services: JSON.parse(services),
      location,
      pickupDrop,
      notes,
      budget,
      photos: leadPhotos,
      garageId,
      status: "new"
    });

    // ------------------------------
    // 3) SEND WHATSAPP TO GARAGE OWNER
    // ------------------------------
    const partner = await Partner.findOne({ garageId });

    if (!partner)
      return res.status(404).json({ success: false, message: "Garage not found" });

    const ownerPhone = partner.phone;

    const enquiryMessage = `
🚗 *New Quotation Request on Garages of India!*

Hey *${partner.businessName}* 👋,

A customer has requested a quote.

📌 *Name:* ${userName}
📞 *Phone:* ${userPhone}
🚘 *Vehicle:* ${vehicle}
🛠 *Services:* ${JSON.parse(services).join(", ")}
💰 *Budget:* ₹${budget}
📍 *Location:* ${location}

Please respond with a quotation ASAP.
– *Garages of India Team*
`;

    const userMessage = `
Hey *${userName}* 👋,

Your quote request has been sent to *${partner.businessName}*.

They will contact you shortly on *${userPhone}*.

Thanks for using *Garages of India* 🚗✨
`;

    await sendWhatsAppMessage(ownerPhone, enquiryMessage);
    await sendWhatsAppMessage(userPhone, userMessage);

    lead.whatsappLogs = {
      partnerMessage: enquiryMessage,
      userMessage: userMessage,
      sentToPartnerAt: new Date(),
      sentToUserAt: new Date(),
      deliveryStatus: "sent"
    };

    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead created & WhatsApp notifications sent!",
      data: lead
    });

  } catch (error) {
    console.error("Lead creation failed:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};

exports.partnerSendQuote = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { amount, message, estimatedCompletionTime } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // ------------------------------------------------
    // 1) Generate OTP
    // ------------------------------------------------
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    lead.partnerQuote = {
      amount,
      message,
      estimatedCompletionTime,
      sentAt: new Date()
    };

    lead.quoteOtp = otp;
    lead.quoteOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await lead.save();

    // ------------------------------------------------
    // 2) Send WhatsApp OTP to User
    // ------------------------------------------------
    const otpMsg = `
🔐 *Verify Garage Quote*

Hey *${lead.userName}*,  
The garage has shared a quote for your request.

💰 *Amount:* ₹${amount}  
📝 *Message:* ${message}  
⏱ *Est. Time:* ${estimatedCompletionTime}

Please enter this OTP to verify and confirm the quote:

👉 *${otp}*

*Valid for 10 minutes.*
    `;

    await sendWhatsAppMessage(lead.userPhone, otpMsg);

    res.status(200).json({
      success: true,
      message: "Quote sent & OTP delivered to user",
      data: {
        leadId: lead._id,
        amount,
        message,
        estimatedCompletionTime
      }
    });

  } catch (error) {
    console.error("Send Quote Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send quote",
      error: error.message
    });
  }
};

exports.verifyQuoteOtp = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { otp } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // -----------------------------------------
    // 1) Validate OTP
    // -----------------------------------------
    if (!lead.quoteOtp || !lead.quoteOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "No OTP found for this lead"
      });
    }

    if (Date.now() > lead.quoteOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "OTP expired"
      });
    }

    if (lead.quoteOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Incorrect OTP"
      });
    }

    // -----------------------------------------
    // 2) Update Lead Status → quoted
    // -----------------------------------------
    lead.status = "quoted";

    // Clear OTP for safety
    lead.quoteOtp = undefined;
    lead.quoteOtpExpires = undefined;

    await lead.save();

    // -----------------------------------------
    // 3) Notify Garage Owner (Optional)
    // -----------------------------------------
    const notifyMsg = `
💬 *Quote Verified by Customer!*

Customer *${lead.userName}* has accepted your quote.

💰 *Amount:* ₹${lead.partnerQuote?.amount}
📝 *Message:* ${lead.partnerQuote?.message}

You may now proceed with the service.
`;

    if (lead.userPhone) {
      await sendWhatsAppMessage(lead.userPhone, "Your quote has been successfully verified. ✔");
    }

    // (Optional) Send message to partner later when partner phone is available

    // -----------------------------------------
    // 4) Response
    // -----------------------------------------
    res.status(200).json({
      success: true,
      message: "OTP verified successfully. Lead status updated to 'quoted'.",
      data: lead
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error.message
    });
  }
};

exports.updateLeadStatus = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;

    // Allowed statuses
    const allowedStatuses = [
      "new",
      "quoted",
      "in_progress",
      "completed",
      "cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`
      });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Update status
    lead.status = status;
    await lead.save();

    res.status(200).json({
      success: true,
      message: `Lead status updated to '${status}' successfully`,
      data: lead
    });

  } catch (error) {
    console.error("Lead Status Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lead status",
      error: error.message
    });
  }
};
