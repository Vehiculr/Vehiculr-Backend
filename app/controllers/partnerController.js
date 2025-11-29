const Partner = require('../models/partnerModel');
const Brand = require('../models/brandModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
// const { deleteFromCloudinary, getOptimizedUrl } = require('../utils/cloudinaryConfig');
// const { uploadToCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinaryConfig');
const { uploadMultipleToS3, getSignedS3Url } = require('../utils/aws-S3-Config');
const cloudinary = require("cloudinary").v2;
const multer = require('multer');
const { carBrands, bikeBrands } = require('../valiations/brandValidation');
const { sendWhatsAppMessage } = require("../services/twilioClient"); // Import Twilio utility
const {
  generateQRData,
  generateQRImage,
  generateAndSaveQR,
  generateQRFileName,
  decodeQRData,
  generateReadableQR,
  generatePublicQR,
  generateDisplayUrl
} = require('../utils/qrGenerator');
const path = require('path');
const fs = require('fs');
const servicesMaster = require('../services/partnerMasterServices');
// const { generateQRCode } = require('../utils/qrGenerator');
// const { sendWhatsAppOTP } = require('../utils/notificationService');
// const Service = require('../models/serviceModel');
// const PremiumPlan = require('../models/premiumPlanModel');
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const S3_BUCKET = process.env.AWS_BUCKET_NAME;

exports.setUserId = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// CREATE a new partner
exports.createPartner = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    const [foundUser, foundPartner] = await Promise.all([
      User.findOne({ phone }),
      Partner.findOne({ phone })
    ]);
    if (foundPartner) {
      return res.status(400).json({
        message: "This number is already registered as a PARTNER",
        existingAccountType: "partner"
      });
    }

    // If phone already used by opposite type → BLOCK
    if (foundUser) {
      return res.status(400).json({
        message: "This number is already registered as a USER",
        existingAccountType: "user"
      });
    }
    const partnerServices = servicesMaster.map(cat => ({
      categoryName: cat.categoryName,
      subServices: cat.subServices.map(s => ({
        name: s.name,
        selected: false
      }))
    }));
    const partner = await Partner.create({
      ...req.body,
      services: partnerServices,
    });
    res.status(201).json({
      status: 'success',
      message: 'Partner created successfully',
      data: partner
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// GET all partners
exports.getAllPartners = async (req, res) => {
  try {
    const partners = await Partner.find();
    res.status(200).json({
      status: 'success',
      results: partners.length,
      data: partners
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET single partner by ID
exports.getPartnerById = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ status: 'fail', message: 'Partner not found' });
    }
    res.status(200).json({ status: 'success', data: partner });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update KYC (new endpoint)
exports.updateKYC = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { type, fullName, documentNumber, address } = req.body;


    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner Not Found",
      });
    }

    // 2️⃣ Prevent overwriting verified KYC
    if (partner.kyc && partner.kyc.verified) {
      return res.status(400).json({ status: 'fail', message: 'KYC is already verified' });
    }

    // 3️⃣ Update KYC
    partner.kyc = {
      type,
      fullName,
      documentNumber,
      address,
      verified: true
    };

    await partner.save();

    res.status(200).json({
      status: 'success',
      message: 'KYC verified successfully',
      data: partner
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getMe = () => {
  return factory.getOne(Partner);
};

// Get partner profile
exports.getPartnerProfile = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);

  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { partner }
  });
});

// Update partner profile
exports.updatePartnerProfile = catchAsync(async (req, res, next) => {
  const allowedFields = ['fullName', 'businessName', 'shopLocation', 'expertise', 'description', 'bio'];
  const filteredBody = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredBody[key] = req.body[key];
    }
  });

  const partner = await Partner.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    { new: true, runValidators: true }
  );
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { partner }
  });
});

// Get domains catalog
exports.getDomains = catchAsync(async (req, res, next) => {
  const domains = [
    { id: 'car_repair', name: 'Car Repair' },
    { id: 'bike_repair', name: 'Bike Repair' },
    { id: 'car_bike_sales', name: 'Car & Bike Sales' },
    { id: 'modification', name: 'Modification' },
    { id: 'other', name: 'Other' }
  ];

  res.status(200).json({
    success: true,
    data: { domains }
  });
});

// Update partner domains
exports.updateDomains = catchAsync(async (req, res, next) => {
  const partner = await Partner.findByIdAndUpdate(
    req.user.id,
    { businessDomain: req.body.domainId },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Domain updated successfully',
    data: { partner }
  });
});

exports.getServicesCatalog = catchAsync(async (req, res, next) => {
  const services = await Service.find({ active: true });

  res.status(200).json({
    success: true,
    data: { services }
  });
});

// exports.updatePartnerServices = catchAsync(async (req, res, next) => {
//   const partner = await Partner.findByIdAndUpdate(
//     req.user.id,
//     { services: req.body.serviceIds },
//     { new: true, runValidators: true }
//   );

//   res.status(200).json({
//     success: true,
//     message: 'Services updated successfully',
//     data: { partner }
//   });
// });

exports.getBrandsCatalog = catchAsync(async (req, res, next) => {
  const brands = await Brand.find({ active: true });

  res.status(200).json({
    success: true,
    data: { brands }
  });
});

exports.updatePartnerBrands = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);

  // Check if partner is premium or within free tier limits
  if (!partner.isPremium && req.body.brandIds.length > 50) {
    return next(new AppError('Free accounts can only select up to 50 brands. Upgrade to premium for more.', 400));
  }

  partner.brands = req.body.brandIds;
  await partner.save();

  res.status(200).json({
    success: true,
    message: 'Brands updated successfully',
    data: { partner }
  });
});

exports.submitKYC = catchAsync(async (req, res, next) => {
  const { fullName, documentType, documentNumber, address } = req.body;

  if (!req.files || !req.files.documentFront || !req.files.documentBack) {
    return next(new AppError('Both document front and back images are required', 400));
  }

  const partner = await Partner.findByIdAndUpdate(
    req.user.id,
    {
      kyc: {
        fullName,
        documentType,
        documentNumber,
        address,
        documentFront: req.files.documentFront[0].path,
        documentBack: req.files.documentBack[0].path,
        status: 'pending'
      },
      onboardingStatus: 'kyc_submitted'
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'KYC submitted successfully and under review',
    data: { partner }
  });
});

// Get available brands
exports.getAvailableBrands = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {
      carBrands,
      bikeBrands
    }
  });
});

// Update partner brands
exports.updatePartnerBrands = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);
  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  const { carBrands: newCarBrands, bikeBrands: newBikeBrands } = req.body;


  // Initialize brands object if it doesn't exist
  if (!partner.brands) {
    partner.brands = {
      carBrands: [],
      bikeBrands: []
    };
  }

  // Calculate total selected brands
  const currentCarBrands = newCarBrands !== undefined ? newCarBrands : (partner.brands.carBrands || []);
  const currentBikeBrands = newBikeBrands !== undefined ? newBikeBrands : (partner.brands.bikeBrands || []);

  const totalSelectedBrands = currentCarBrands.length + currentBikeBrands.length;

  // Check if partner exceeds free tier limit
  if (!partner.isPremium && totalSelectedBrands > partner.maxFreeBrands) {
    return next(new AppError(
      `Free accounts can only select up to ${partner.maxFreeBrands} brands total. Upgrade to premium for unlimited brands.`,
      400
    ));
  }

  // Update brands (only the fields that were provided)
  if (newCarBrands !== undefined) {
    partner.brands.carBrands = newCarBrands;
  }

  if (newBikeBrands !== undefined) {
    partner.brands.bikeBrands = newBikeBrands;
  }

  await partner.save();

  res.status(200).json({
    success: true,
    message: 'Brands updated successfully',
    data: {
      brands: partner.brands,
      isPremium: partner.isPremium,
      maxFreeBrands: partner.maxFreeBrands,
      totalSelected: totalSelectedBrands,
      canSelectMore: partner.isPremium || totalSelectedBrands <= partner.maxFreeBrands
    }
  });
});

// Get partner's current brand selection
exports.getPartnerBrands = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id).select('brands isPremium maxFreeBrands');

  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  const totalSelected = partner.brands.carBrands.length + partner.brands.bikeBrands.length;

  res.status(200).json({
    success: true,
    data: {
      brands: partner.brands,
      isPremium: partner.isPremium,
      maxFreeBrands: partner.maxFreeBrands,
      totalSelected: totalSelected,
      canSelectMore: partner.isPremium || totalSelected < partner.maxFreeBrands,
      availableSlots: partner.isPremium ? 'Unlimited' : partner.maxFreeBrands - totalSelected
    }
  });
});

// Check if partner can select more brands
exports.checkBrandLimit = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id).select('brands isPremium maxFreeBrands');

  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  const totalSelected = partner.brands.carBrands.length + partner.brands.bikeBrands.length;
  const availableSlots = partner.isPremium ? 'unlimited' : partner.maxFreeBrands - totalSelected;

  res.status(200).json({
    success: true,
    data: {
      canSelectMore: partner.isPremium || totalSelected < partner.maxFreeBrands,
      availableSlots: availableSlots,
      isPremium: partner.isPremium,
      totalSelected: totalSelected,
      maxFreeBrands: partner.maxFreeBrands
    }
  });
});

exports.uploadShopPhotos = catchAsync(async (req, res, next) => {
  let uploadedToS3 = [];

  try {
    const partnerId = req.user.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Please select at least one image to upload" });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });

    const currentPhotoCount = partner.shopPhotos?.length || 0;
    const newPhotoCount = req.files.length;

    if (currentPhotoCount + newPhotoCount > 4) {
      return res.status(400).json({
        success: false,
        message: `Maximum 4 photos allowed. You already have ${currentPhotoCount} photos`,
      });
    }

    // Upload to S3
    uploadedToS3 = await uploadMultipleToS3(req.files, folder = "partner-shop-photos" );

    const s3Photos = uploadedToS3.map((p) => ({
      key: p.key,
      url: p.url,
      bucket: p.bucket,
      format: p.format,
      bytes: p.bytes,
      width: p.width,
      height: p.height,
      created_at: p.created_at,
    }));

    partner.shopPhotos = partner.shopPhotos || [];
    partner.shopPhotos.push(...s3Photos);

    // Keep max 4
    if (partner.shopPhotos.length > 4) {
      const excess = partner.shopPhotos.slice(4);

      for (const photo of excess) {
        try {
          await s3
            .deleteObject({
              Bucket: S3_BUCKET,
              Key: photo.key,
            })
            .promise();
        } catch (err) {
          console.error("Error deleting excess photos:", err);
        }
      }

      partner.shopPhotos = partner.shopPhotos.slice(0, 4);
    }

    await partner.save();

    res.status(200).json({
      success: true,
      message: "Shop photos uploaded successfully",
      data: partner.shopPhotos,
    });
  } catch (error) {
    console.error("Error uploading:", error);

    // 🟢 CLEANUP ONLY FILES THAT WERE UPLOADED TO S3
    if (uploadedToS3.length > 0) {
      for (const file of uploadedToS3) {
        try {
          await s3
            .deleteObject({
              Bucket: process.env.S3_BUCKET,
              Key: file.key,
            })
            .promise();
        } catch (cleanupError) {
          console.error("Error cleaning S3:", cleanupError);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: "Server error while uploading shop photos",
    });
  }
});



// Send WhatsApp OTP
exports.sendWhatsAppOTP = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);

  if (!partner.phoneNumber) {
    return next(new AppError('Phone number not found', 400));
  }

  // Implement your OTP sending logic here
  const otp = await sendWhatsAppOTP(partner.phoneNumber);

  // Store OTP in database (hashed)
  partner.whatsappOTP = otp;
  partner.whatsappOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await partner.save();

  res.status(200).json({
    success: true,
    message: 'WhatsApp OTP sent successfully'
  });
});


// Verify WhatsApp
exports.verifyWhatsApp = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const partner = await Partner.findById(req.user.id);

  if (partner.whatsappOTP !== otp || partner.whatsappOTPExpires < Date.now()) {
    return next(new AppError('Invalid or expired OTP', 400));
  }

  partner.isWhatsappVerified = true;
  partner.whatsappOTP = undefined;
  partner.whatsappOTPExpires = undefined;
  partner.onboardingStatus = 'whatsapp_verified';
  await partner.save();

  res.status(200).json({
    success: true,
    message: 'WhatsApp number verified successfully'
  });
});

// Get premium plans
exports.getPremiumPlans = catchAsync(async (req, res, next) => {
  const plans = await PremiumPlan.find({ active: true });

  res.status(200).json({
    success: true,
    data: { plans }
  });
});

// Subscribe to premium
exports.subscribeToPremium = catchAsync(async (req, res, next) => {
  const { planId } = req.body;

  // Implement your payment processing logic here
  // This is a simplified version

  const partner = await Partner.findByIdAndUpdate(
    req.user.id,
    {
      isPremium: true,
      premiumPlan: planId,
      premiumSince: new Date()
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Premium subscription activated successfully',
    data: { partner }
  });
});

// Get QR code
exports.getQRCode = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);
  // const qrCodeData = await generateQRCode(partner._id);

  res.status(200).json({
    success: true,
    data: {
      qrCodeImageUrl: partner.qrCode.qrImageData,
      profileDeepLink: partner.qrCode.publicUrl
    }
  });
});

// Create post
exports.createPost = catchAsync(async (req, res, next) => {
  const { content, tags } = req.body;
  const image = req.file ? req.file.path : null;

  const partner = await Partner.findById(req.user.id);

  const post = {
    content,
    tags: tags || [],
    image,
    createdAt: new Date()
  };

  partner.posts.push(post);
  await partner.save();

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: { post }
  });
});

// Get posts
exports.getPosts = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: { posts: partner.posts }
  });
});

// Get partner feed
exports.getPartnerFeed = catchAsync(async (req, res, next) => {
  // Implement logic to get relevant posts from other partners
  // This is a simplified version
  const feedPosts = await Partner.aggregate([
    { $match: { _id: { $ne: req.user.id } } },
    { $unwind: '$posts' },
    { $sort: { 'posts.createdAt': -1 } },
    { $limit: 20 },
    {
      $project: {
        'businessName': 1,
        'posts.content': 1,
        'posts.image': 1,
        'posts.createdAt': 1
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: { feed: feedPosts }
  });
});


// Generate QR code for partner
exports.generateQRCode = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);

  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  // Ensure garageId exists
  if (!partner.garageId) {
    partner.garageId = `GAR${partner._id.toString().slice(-5).toUpperCase()}`;
    await partner.save();
  }

  // Generate PUBLIC QR code (scannable by any device)
  const { publicUrl, qrImageDataUrl } = await generatePublicQR(partner, {
    width: 300,
    margin: 2
  });

  const displayUrl = generateDisplayUrl(partner);

  // Store QR data in partner document
  partner.qrCode = {
    publicUrl: publicUrl,
    displayUrl: displayUrl,
    qrImageData: qrImageDataUrl,
    generatedAt: new Date(),
    lastUpdated: new Date()
  };

  await partner.save();

  res.status(200).json({
    success: true,
    message: 'QR code generated successfully',
    data: {
      // QR code image (base64)
      qrImageDataUrl: qrImageDataUrl,

      // Public URL that anyone can scan
      publicUrl: publicUrl,

      // Nice display URL to show users
      displayUrl: displayUrl,

      // Partner information
      partner: {
        garageId: partner.garageId,
        businessName: partner.businessName,
        phoneNumber: partner.phoneNumber
      },

      // Instructions for use
      scanInstructions: {
        message: "This QR code can be scanned by ANY QR scanner app",
        example: `Scanning will open: ${displayUrl}`
      }
    }
  });
});

// Download QR code as image file
exports.downloadQRCode = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);

  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  const format = req.query.format || 'png';
  const fileName = generateQRFileName(partner._id, format);
  const filePath = path.join(__dirname, '../public/qr-codes', fileName);

  // Generate and save QR code
  const qrResult = await generateAndSaveQR(partner, filePath, {
    type: format,
    width: 400,
    margin: 3
  });

  // Set appropriate headers for download
  res.setHeader('Content-Type', `image/${format}`);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  // Stream the file to response
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  // Clean up file after sending (optional)
  fileStream.on('close', () => {
    // You might want to keep the file for caching
    // fs.unlinkSync(filePath);
  });
});

// Get QR code information (for display)
exports.getQRCodeInfo = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);

  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  // Generate garage ID if not exists
  if (!partner.garageId) {
    partner.garageId = `GAR${partner._id.toString().slice(-5).toUpperCase()}`;
    await partner.save();
  }

  const qrData = generateQRData(partner);
  const qrImageDataUrl = await generateQRImage(qrData);

  res.status(200).json({
    success: true,
    data: {
      garageId: partner.garageId,
      businessName: partner.businessName,
      phoneNumber: partner.phoneNumber,
      qrCodeImage: qrImageDataUrl,
      downloadUrl: `/api/partner/qr-code/download?format=png`,
      printUrl: `/api/partner/qr-code/download?format=svg` // SVG better for printing
    }
  });
});

// Print QR code (higher resolution)
exports.printQRCode = catchAsync(async (req, res, next) => {
  const partner = await Partner.findById(req.user.id);

  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  const format = req.query.format || 'svg'; // SVG is better for printing
  const fileName = generateQRFileName(partner._id, format);
  const filePath = path.join(__dirname, '../public/qr-codes', fileName);

  // Generate high-resolution QR code for printing
  const qrResult = await generateAndSaveQR(partner, filePath, {
    type: format,
    width: 600, // Higher resolution for printing
    margin: 4,
    scale: 8 // Higher scale for better print quality
  });

  res.setHeader('Content-Type', format === 'svg' ? 'image/svg+xml' : `image/${format}`);
  res.setHeader('Content-Disposition', `inline; filename="print_${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// Scan QR code (decode partner information)
exports.scanQRCode = catchAsync(async (req, res, next) => {
  const { qrData } = req.body;

  if (!qrData) {
    return next(new AppError('QR code data is required', 400));
  }

  try {
    // Decode the QR data
    const decodedData = decodeQRData(qrData);

    // Get partner information
    const partner = await Partner.findById(decodedData.partnerId)
      .select('businessName phoneNumber garageId address services brands isPremium');

    if (!partner) {
      return next(new AppError('Partner not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        partner,
        scanTime: new Date(),
        qrData: decodedData
      }
    });
  } catch (error) {
    return next(new AppError('Invalid QR code', 400));
  }
});

// Verify QR code validity
exports.verifyQRCode = catchAsync(async (req, res, next) => {
  const { qrData } = req.body;

  if (!qrData) {
    return next(new AppError('QR code data is required', 400));
  }

  try {
    const decodedData = decodeQRData(qrData);

    // Check if QR code is not too old (optional)
    const qrAge = Date.now() - decodedData.timestamp;
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year

    if (qrAge > maxAge) {
      return res.status(200).json({
        success: false,
        message: 'QR code has expired'
      });
    }

    const partner = await Partner.findById(decodedData.partnerId);

    res.status(200).json({
      success: true,
      valid: !!partner,
      message: partner ? 'Valid QR code' : 'Invalid QR code',
      data: {
        partnerId: decodedData.partnerId,
        garageId: decodedData.garageId,
        timestamp: new Date(decodedData.timestamp)
      }
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      valid: false,
      message: 'Invalid QR code format'
    });
  }
});

//  api for the total number of partners in partner document
exports.getPartnerCount = async (req, res) => {
  try {
    const totalPartners = await Partner.countDocuments(); // counts all documents
    res.status(200).json({
      status: 'success',
      totalPartners,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
};
exports.findNearbyPartners = catchAsync(async (req, res, next) => {

  try {
    let { latitude, longitude, maxDistance } = req.query;

    if (!latitude || !longitude) {
      latitude = "12.9716";
      longitude = "77.5946"; // Bangalore default
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude values!",
      });
    }

    // If the user provides maxDistance, treat it as kilometers (km)
    // Convert km -> meters for MongoDB. Default = 10 km => 10000 meters
    const radiusMeters = maxDistance ? Number(maxDistance) * 1000 : 10000;

    if (isNaN(radiusMeters) || radiusMeters < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid maxDistance value!",
      });
    }

    const userLocation = {
      type: "Point",
      coordinates: [lng, lat],
    };

    const partners = await Partner.aggregate([
      {
        $geoNear: {
          near: userLocation,
          distanceField: "distance",
          spherical: true,
          maxDistance: radiusMeters, // meters
        },
      },
      {
        $addFields: {
          distanceInKm: { $round: [{ $divide: ["$distance", 1000] }, 2] },
        },
      },
      { $sort: { distance: 1 } },
      {
        $project: {
          fullName: 1,
          businessName: 1,
          phone: 1,
          expertise: 1,
          shopLocation: 1,
          distanceInKm: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (!partners.length) {
      return res.status(404).json({
        success: false,
        message: "No partners found near your location.",
      });
    }

    res.status(200).json({
      success: true,
      count: partners.length,
      partners,
    });
  } catch (error) {
    console.error("Error in findNearbyPartners:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
      error: error.message,
    });
  }
});

exports.updatePartnerServices = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { categoryName, serviceName, selected } = req.body;
    console.log("Request body:", req.body);
    if (!categoryName || !serviceName) {
      return res.status(400).json({ message: "categoryName and serviceName are required" });
    }

    const partner = await Partner.findById(partnerId);
    console.log("Partner found:", partner);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    // FIX → Case-insensitive matching
    const category = partner.services.find(
      c => c.categoryName.trim().toLowerCase() === categoryName.trim().toLowerCase()
    );

    if (!category) {
      console.log("Available categories:", partner.services.map(s => s.categoryName));
      return res.status(404).json({ message: "Category not found" });
    }

    const service = category.subServices.find(
      s => s.name.trim().toLowerCase() === serviceName.trim().toLowerCase()
    );

    if (!service) {
      console.log("Available subservices:", category.subServices.map(s => s.name));
      return res.status(404).json({ message: "Sub service not found" });
    }

    // Update service selected value
    service.selected = selected;

    await partner.save();

    res.status(200).json({
      message: "Service updated successfully",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// GET all partners
exports.getAllServices = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Master services fetched successfully",
      data: servicesMaster
    });
  } catch (error) {
    console.error("Error fetching master services:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.getSelectedServices = async (req, res) => {
  try {
    const partnerId = req.user.id;
console.log("Fetching selected services for partner ID:", partnerId);
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const selectedServices = partner.services
      .map(category => ({
        categoryName: category.categoryName,
        subServices: category.subServices.filter(s => s.selected === true)
      }))
      .filter(cat => cat.subServices.length > 0);

    return res.status(200).json({
      success: true,
      message: "Selected services fetched successfully",
      data: selectedServices
    });
  } catch (error) {
    console.error("Error fetching selected services:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


exports.getUnselectedServices = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const unselectedServices = partner.services
      .map(category => ({
        categoryName: category.categoryName,
        subServices: category.subServices.filter(s => s.selected === false)
      }))
      .filter(cat => cat.subServices.length > 0);

    return res.status(200).json({
      success: true,
      message: "Unselected services fetched successfully",
      data: unselectedServices
    });
  } catch (error) {
    console.error("Error fetching unselected services:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.getAllPartnerServices = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    return res.status(200).json({
      success: true,
      message: "All partner services fetched successfully",
      data: partner.services
    });
  } catch (error) {
    console.error("Error fetching partner services:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};
