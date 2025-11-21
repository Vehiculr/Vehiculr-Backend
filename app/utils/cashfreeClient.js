const axios = require("axios");

const BASE = process.env.CASHFREE_API_BASE;
const API_KEY = process.env.CASHFREE_API_KEY;
const API_SECRET = process.env.CASHFREE_API_SECRET;

function headers() {
  return {
    "Content-Type": "application/json",
    "x-client-id": API_KEY,
    "x-client-secret": API_SECRET
  };
}

exports.initiateOtp = async ({ aadhaarNumber }) => {
  const url = `${BASE}/identity/okyc/aadhaar/otp`;
  const body = { aadhaar: aadhaarNumber };

  const { data } = await axios.post(url, body, { headers: headers() });
  console.log('======>', data);  
  return data;
};

exports.verifyOtp = async ({ refId, otp }) => {
  const url = `${BASE}/identity/okyc/aadhaar/otp/verify`;
  const body = { ref_id: refId, otp };

  const { data } = await axios.post(url, body, { headers: headers() });
  return data;
};
