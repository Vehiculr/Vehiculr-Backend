const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const filterObj = require('../utils/filterObject');

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {

    let query = await Model.findOne({ _id: req.params.id, ...req.docFilter });
  if (!query) return res.status(404).send('User not found');
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;
    if (!doc) {
      return next(new AppError(`No ${Model} found with that ID`, 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
  
  exports.getAll = (Model) =>
    catchAsync(async (req, res, next) => {
      // Merge query parameters and any document filter
      const queryObj = { ...req.query, ...req.docFilter };
      // If there's a 'search' query parameter, use it to filter documents by name
      let query;
      if (queryObj.search) {
        query = Model.find({
          name: { $regex: queryObj.search, $options: 'i' },
        });
        // Remove 'search' from the query object so that it doesn't interfere with other filtering
        delete queryObj.search;
      } else {
        query = Model.find();
        
      }
      
      // Apply any additional features (filtering, sorting, etc.) using the APIFeatures utility
      const features = new APIFeatures(query, queryObj);
      const doc = await features.query;
      
      res.status(200).json({
        status: 'success',
        results: doc.length,
        data: {
          data: doc,
        },
      });
    });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // const filteredDoc = filterObj(req.body, Object.keys(req.docFilter)[0]);
    const doc = await Model.create({ ...req.body, ...req.docFilter });
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // const doc = await Model.findOneAndUpdate({ _id: req.params.id, ...req.docFilter }, req.body);
    
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,   //doc.save()
    });

    if (!doc) {
      console.log(doc);
      return next(new AppError(`No ${Model} found with that ID`, 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findOneAndDelete({ _id: req.params.id, ...req.docFilter });
    // const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError(`No ${Model} found with that ID`, 404));
    }
    res.status(204).json({
      status: 'success',
      Message: null,
    });
  });

  // Get popular cities
  exports.popularCity = (Model) =>
    catchAsync(async (req, res, next) => {
  try {
    const cities = await Model.find({ isPopular: true });
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Search cities
exports.searchCity = (Model) =>
  catchAsync(async (req, res, next) => {
  try {
    const query = new RegExp(req.query.q, 'i');
    const cities = await Model.find({ name: query });
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Geocoding endpoint
exports.geocodeCity = (Model) =>
  catchAsync(async (req, res, next) => {
  const { lat, lng } = req.query;
  // Use your preferred geocoding service (e.g., OpenCage)
  const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${process.env.OPENCAGE_API_KEY}`);
  const data = await response.json();
  const city = data.results[0].components.city;
  res.json({ name: city });
});


  exports.addReview = (Model) =>
    catchAsync(async (req, res, next) => {
      const { garageId } = req.params;
      console.log('=====>>', ga)
    const { comment, rating } = req.body;
    const userId = req.user._id;
  
    console.log('=====>>',garageId, comment, rating )
    const garage = await Model.findById(garageId);
    if (!garage) return res.status(404).send('Garage not found');
  
    garage.reviews.push({ user: userId, comment, rating });
    await garage.save();
    res.send(garage);
  });

   //Update a review:
  exports.updateReview = (Model) =>
    catchAsync(async (req, res, next) => {
    const { garageId, reviewId } = req.params;
    const { comment, rating } = req.body;
  
    const garage = await Model.findById(garageId);
    const review = garage.reviews.id(reviewId);
    if (!review) return res.status(404).send('Review not found');
  
    review.comment = comment;
    review.rating = rating;
    await garage.save();
    res.send(garage);
  });


  //Delete a review:
  exports.deleteReview = (Model) =>
    catchAsync(async (req, res, next) => {
    const { garageId, reviewId } = req.params;
  
    const garage = await Model.findById(garageId);
    garage.reviews.id(reviewId).remove();
    await garage.save();
    res.send(garage);
  });
  