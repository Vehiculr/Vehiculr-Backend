const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    userPhone: { type: String, required: true },
    vehicle: String,
    services: [String],
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
    garageId: { type: String, required: true },
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

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Lead", leadSchema);
