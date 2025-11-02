const isProduction = () => process.env.NODE_ENV === 'production';


const generateOTP = () => {
  // Use a fixed OTP for testing in development, random for production
  if (isProduction()) {
    return Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit random OTP
  } else {
    // Fixed OTP for testing in development
    return process.env.DEFAULT_OTP || '12345'; // Use DEFAULT_OTP from env or fallback to 12345
  }
};


module.exports = { generateOTP };