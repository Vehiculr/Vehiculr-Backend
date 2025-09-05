const Partner = require('../models/partnerModel');
const Brand = require('../models/brandModel');
// const Service = require('../models/serviceModel');
// const PremiumPlan = require('../models/premiumPlanModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
// const { generateQRCode } = require('../utils/qrGenerator');
// const { sendWhatsAppOTP } = require('../utils/notificationService');


// CREATE a new partner
exports.createPartner = async (req, res) => {
  try {
    const partner = await Partner.create(req.body);
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
  const allowedFields = ['businessName', 'shopLocation', 'businessDomain', 'description'];
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

exports.updatePartnerServices = catchAsync(async (req, res, next) => {
  const partner = await Partner.findByIdAndUpdate(
    req.user.id,
    { services: req.body.serviceIds },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Services updated successfully',
    data: { partner }
  });
});

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
  if (!partner.isPremium && req.body.brandIds.length > 3) {
    return next(new AppError('Free accounts can only select up to 3 brands. Upgrade to premium for more.', 400));
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

exports.uploadShopPhotos = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one photo', 400));
  }

  const photoPaths = req.files.map(file => file.path);
  const partner = await Partner.findByIdAndUpdate(
    req.user.id,
    {
      $push: { shopPhotos: { $each: photoPaths } },
      onboardingStatus: 'photos_uploaded'
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Shop photos uploaded successfully',
    data: { photos: photoPaths }
  });
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
  const qrCodeData = await generateQRCode(partner._id);

  res.status(200).json({
    success: true,
    data: {
      qrCodeImageUrl: qrCodeData.imageUrl,
      profileDeepLink: qrCodeData.deepLink
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
