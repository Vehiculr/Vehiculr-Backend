const axios = require('axios');

const AUTH_KEY = process.env.MSG91_AUTH_KEY;
const SENDER_ID = process.env.MSG91_SENDER_ID;
const OTP_EXPIRY = process.env.MSG91_OTP_EXPIRY || 5;

// ✅ Send OTP via SMS
exports.sendOTPmsg91 = async (mobile, otp) => {
  try {
    const response = await axios.post(`https://control.msg91.com/api/v5/otp`, {
      mobile: mobile,
      otp: otp,
      sender: SENDER_ID,
      otp_expiry: OTP_EXPIRY,
    }, {
      headers: {
        'authkey': AUTH_KEY,
        'Content-Type': 'application/json'
      }
    });
console.log('OTP sent successfully:', response.data);
    return response.data;
  } catch (err) {
    console.error('❌ Error sending OTP:', err.response?.data || err.message);
    throw err;
  }
};

// ✅ Verify OTP
exports.verifyOTP = async (mobile, otp) => {
  try {
    const response = await axios.get(
      `https://control.msg91.com/api/v5/otp/verify?mobile=${mobile}&otp=${otp}`,
      {
        headers: { 'authkey': AUTH_KEY }
      }
    );

    return response.data;
  } catch (err) {
    console.error('❌ OTP Verification failed:', err.response?.data || err.message);
    throw err;
  }
};

// ✅ Send WhatsApp Message
exports.sendWhatsApp = async (mobile, templateId, variables = {}) => {
  try {
    const response = await axios.post(`https://api.msg91.com/api/v5/whatsapp/send`, {
      template_id: templateId,
      short_url: 1,
      recipient: mobile,
      variables
    }, {
      headers: {
        'authkey': AUTH_KEY,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (err) {
    console.error('❌ WhatsApp message failed:', err.response?.data || err.message);
    throw err;
  }
};
