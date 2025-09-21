const Partner = require('../models/partnerModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Public endpoint to get garage details by QR code
exports.getGarageByPublicId = catchAsync(async (req, res, next) => {
  const { garageId } = req.params;

  const partner = await Partner.findOne({ 
    $or: [
      { garageId: garageId },
      { _id: garageId.replace('GAR', '') } // Also check by actual ID
    ]
  }).select('businessName phoneNumber address services brands shopLocation shopPhotos isPremium garageId');

  if (!partner) {
    return next(new AppError('Garage not found', 404));
  }

  // Track the public scan (optional)
  partner.publicScans = (partner.publicScans || 0) + 1;
  partner.lastPublicScan = new Date();
  await partner.save();

  res.status(200).json({
    success: true,
    data: {
      garage: {
        id: partner.garageId,
        name: partner.businessName,
        phone: partner.phone,
        address: partner.address,
        services: partner.services,
        brands: partner.brands,
        isPremium: partner.isPremium,
        photos: partner.shopPhotos || []
      },
      scanTime: new Date().toISOString()
    }
  });
});

// Get garage public profile (HTML page for web browsers)
exports.getGaragePublicProfile = catchAsync(async (req, res, next) => {
  const { garageId } = req.params;

  console.log("Fetching public profile for garageId:", garageId);

  const partner = await Partner.findOne({ 
    $or: [
      { garageId: garageId }
    ]
  }).select('businessName phone address services brands shopLocation shopPhotos.url isPremium garageId');

  console.log("Found partner:", partner);   
  if (!partner) {
    return res.status(404).send('Garage not found');
  }

  // Serve HTML page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${partner.businessName} - Garage Profile</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .contact-info { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .services, .brands { margin: 20px 0; }
        .photo-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 20px 0; }
        .photo-gallery img { width: 100%; height: 150px; object-fit: cover; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${partner.businessName}</h1>
        <p>Garage ID: ${partner.garageId}</p>
      </div>
      
      <div class="contact-info">
        <h2>Contact Information</h2>
        <p><strong>Phone:</strong> <a href="tel:${partner.phone}">${partner.phone}</a></p>
        <p><strong>Address:</strong> ${partner.shopLocation || 'Not specified'}</p>
      </div>

      ${partner.services && partner.services.length > 0 ? `
      <div class="services">
        <h2>Services Offered</h2>
        <ul>${partner.services.map(service => `<li>${service}</li>`).join('')}</ul>
      </div>
      ` : ''}

      ${partner.brands && partner.brands.length > 0 ? `
      <div class="brands">
        <h2>Brands Serviced</h2>
        <ul>${partner.brands.map(brand => `<li>${brand}</li>`).join('')}</ul>
      </div>
      ` : ''}

      ${partner.shopPhotos && partner.shopPhotos.length > 0 ? `
      <div class="photo-gallery">
        <h2>Shop Photos</h2>
        ${partner.shopPhotos.map((photo, index) => `
          <img 
            src="${photo.url}" 
            alt="Shop Photo ${index + 1}" 
            class="shop-photo"
          />
        `).join('')}
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 30px; color: #666;">
        <p>Scanned on ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>
  `);
});