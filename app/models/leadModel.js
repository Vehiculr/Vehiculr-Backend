const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    userPhone: { type: String, required: true },
    vehicle: { type: String, required: true },
    services: {
        type: [String],   // Example: ["Oil Change", "Brake Pad Replacement"]
        required: true
    },
    location: String,
    pickupDrop: { type: Boolean, default: false },
    notes: String,
    budget: Number,
    photos: [
        {
            public_id: String,
            url: String,
            width: Number,
            height: Number,
            bytes: Number,
            created_at: String
        }
    ],
    garageId: { type: String, required: true },   // 123456 (custom garageId)
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner" },  // OPTIONAL but useful
    status: {
        type: String,
        enum: ["new", "quoted", "in_progress", "completed", "cancelled"],
        default: "new"
    },

    partnerQuote: {
        amount: Number,
        message: String,
        estimatedCompletionTime: String,
        sentAt: Date
    },
    quoteOtp: String,
    quoteOtpExpires: Date,

    whatsappLogs: {
        userMessage: String,
        partnerMessage: String,
        sentToUserAt: Date,
        sentToPartnerAt: Date,
        deliveryStatus: { type: String, default: "pending" }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Lead", leadSchema);
