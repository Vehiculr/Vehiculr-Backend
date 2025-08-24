const cloudinary = require("../utils/cloudinaryConfig");
// const Post = require("../models/");

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, { folder: "mern_uploads" });

    const newPost = new Post({
      description: req.body.description || "",
      image: { public_id: result.public_id, url: result.secure_url },
    });

    await newPost.save();

    res.status(201).json({ success: true, data: newPost });
  } catch (err) {
    next(err);
  }
};
