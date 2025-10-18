const twilio = require("twilio");
require("dotenv").config();

const isProduction = () => process.env.NODE_ENV === 'production';
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendWhatsAppMessage = async (to, message) => {
    // console.log('to, message',to, message)
  try {
    return await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${to}`,
      body: message,
    });
  } catch (error) {
    console.error("WhatsApp Message Error:", error);
    throw new Error("Failed to send WhatsApp message.");
  }
};

const sendOTP = async (phone, otp) => {
  console.log(`your otp for ${phone} , is ${otp}`)
 if (isProduction()) {
    // Use Twilio in production
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const message = await client.messages.create({
        body: `Your OTP for verification is: ${otp}. Valid for ${process.env.OTP_EXPIRY} minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('Twilio error:', error);
      return { success: false, error: error.message };
    }
  } else {
    // Development/Testing mode - just log to console
    console.log(`📱 OTP for ${phone}: ${otp}`);
    console.log(`⏰ OTP valid for: ${process.env.OTP_EXPIRY} minutes`);
    console.log('🔧 Running in development mode - OTP not sent via SMS');
    return { success: true, mode: 'development' };
  }
};

module.exports = { sendWhatsAppMessage , sendOTP };
