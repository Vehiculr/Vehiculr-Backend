const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const jwt = require('jwt-simple');
const Partner = require('../models/partnerModel');
const QR_JWT_SECRET = process.env.QR_JWT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:9002';

// Secret key for JWT encoding

// Generate QR code data with partner information
exports.generateQRData = (partner) => {
  const payload = {
    partnerId: partner._id,
    garageId: partner.garageId || `GAR${partner._id.toString().slice(-5)}`,
    phoneNumber: partner.phoneNumber,
    businessName: partner.businessName,
    timestamp: Date.now()
  };

  // Encode data as JWT for security
  return jwt.encode(payload, QR_JWT_SECRET);
};

// Generate QR code image
exports.generateQRImage = async (qrData, options = {}) => {
  try {
    const qrOptions = {
      width: options.width || 300,
      margin: options.margin || 2,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#FFFFFF'
      },
      ...options
    };

    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(qrData, qrOptions);
    return dataUrl;
  } catch (error) {
    throw new Error(`QR generation failed: ${error.message}`);
  }
};

// Generate PUBLIC URL that anyone can access
exports.generatePublicQRUrl = (partner) => {
  const garageId = partner.garageId || `GAR${partner._id.toString().slice(-5)}`;
  return `http://localhost:3000/reviewPage/${garageId}`;
};

// Generate SHORT readable URL for QR
exports.generateShortQRUrl = (partner) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://yourapp.com';
  return `http://localhost:3000/reviewPage/${partner.garageId || `GAR${partner._id.toString().slice(-5)}`}`;
};


// Generate short display URL (for showing to users)
exports.generateDisplayUrl = (partner) => {
  const garageId = partner.garageId || `GAR${partner._id.toString().slice(-5)}`;
  return `http://localhost:3000/reviewPage/${garageId}`;
};

// Generate QR code with short URL (for normal scanners)
exports.generateReadableQR = async (partner, options = {}) => {
  const shortUrl = this.generateShortQRUrl(partner);
  const qrOptions = {
    width: options.width || 300,
    margin: options.margin || 2,
    ...options
  };

  const qrImageDataUrl = await QRCode.toDataURL(shortUrl, qrOptions);
  return { shortUrl, qrImageDataUrl };
};
// Generate QR code and save as file
exports.generateAndSaveQR = async (partner, filePath, options = {}) => {
  try {
    const qrData = this.generateQRData(partner);
    const qrOptions = {
      width: options.width || 300,
      margin: options.margin || 2,
      type: options.type || 'png',
      ...options
    };

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate and save QR code
    await QRCode.toFile(filePath, qrData, qrOptions);

    return {
      filePath,
      qrData,
      fileName: path.basename(filePath)
    };
  } catch (error) {
    throw new Error(`QR save failed: ${error.message}`);
  }
};

// Generate QR code with PUBLIC URL (scannable by any device)
exports.generatePublicQR = async (partner, options = {}) => {
  const publicUrl = this.generatePublicQRUrl(partner);
  
  const qrOptions = {
    width: options.width || 300,
    margin: options.margin || 2,
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#FFFFFF'
    },
    ...options
  };

  const qrImageDataUrl = await QRCode.toDataURL(publicUrl, qrOptions);
  return { publicUrl, qrImageDataUrl };
};

// Decode QR data (for scanning)
exports.decodeQRData = (qrData) => {
  try {
    return jwt.decode(qrData, QR_JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid QR code');
  }
};

// Generate QR code filename
exports.generateQRFileName = (partnerId, format = 'png') => {
  const timestamp = Date.now();
  return `qr_${partnerId}_${timestamp}.${format}`;
};

