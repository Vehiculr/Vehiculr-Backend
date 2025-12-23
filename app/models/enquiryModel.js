const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    messageToPartner: {
      type: String,
      required: true,
    },
    messageToUser: {
      type: String,
      required: true,
    }
  },
  { timestamps: true } 
);
module.exports = mongoose.model("Enquiry", enquirySchema);
