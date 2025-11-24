const AWS = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuid } = require("uuid");

// AWS Configuration
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const S3_BUCKET = process.env.AWS_BUCKET_NAME;

/* ---------------- AVATAR UPLOAD (multer + s3) ---------------- */
const avatarUploader = multer({
    storage: multerS3({
        s3: s3,
        bucket: S3_BUCKET,
        acl: "public-read", // make image accessible
        key: (req, file, cb) => {
            cb(
                null,
                `app/users/${req.user.id}/avatar/avatar-${Date.now()}-${Math.round(
                    Math.random() * 1e9
                )}`
            );
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only images allowed"), false);
    },
});

/* ---------------- COVER PHOTO UPLOAD ---------------- */
const coverUploader = multer({
    storage: multerS3({
        s3: s3,
        bucket: S3_BUCKET,
        acl: "public-read",
        key: (req, file, cb) => {
            cb(
                null,
                `app/users/${req.user.id}/cover/cover-${Date.now()}-${Math.round(
                    Math.random() * 1e9
                )}`
            );
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
});

/* ---------------- SINGLE UPLOAD FUNCTION (similar to Cloudinary) ---------------- */
const uploadToS3 = async (file, folder = "user-avatars") => {
  const fileExtension = file.originalname.split(".").pop();
  const key = `${folder}/${uuid()}.${fileExtension}`;

  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const data = await s3.upload(params).promise();

  return {
    key: data.Key,
    url: data.Location,
    bucket: data.Bucket
  };
};

/* ---------------- MULTIPLE UPLOAD ---------------- */
const uploadMultipleToS3 = async (files, options = {}) => {
  if (!files || !files.length) {
    throw new Error("No files received");
  }

  const folder = options.folder || "partner-shop-photos";

  const uploadPromises = files.map((file) => {
    if (!file.buffer) throw new Error("File buffer missing — multer issue");

    const fileExtension = file.originalname.split(".").pop();
    const fileKey = `${folder}/${uuid()}.${fileExtension}`;

    const params = {
      Bucket: S3_BUCKET,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    //   ACL: "public-read",
    };

    // ✅ AWS S3 ONLY accepts ONE argument (params)
    return s3.upload(params).promise().then((data) => ({
      url: data.Location,
      key: data.Key,
      bucket: data.Bucket,
    }));
  });

  return Promise.all(uploadPromises);
};

/* ---------------- DELETE FROM S3 ---------------- */
const deleteFromS3 = async (key) => {
  if (!key) return;

  const params = {
    Bucket:S3_BUCKET,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log("Deleted old avatar from S3:", key);
  } catch (err) {
    console.error("Failed to delete old avatar:", err);
  }
};

/* ---------------- OPTIMIZED URL (S3 SIGNED URL) ---------------- */
const getOptimizedUrl = (fileKey, expiresIn = 3600) => {
    return s3.getSignedUrl("getObject", {
        Bucket: S3_BUCKET,
        Key: fileKey,
        Expires: expiresIn, // 1 hour
    });
};

const getSignedS3Url = (key, expires = 3600) => {
  return s3.getSignedUrl("getObject", {
    Bucket: S3_BUCKET,
    Key: key,
    Expires: expires,
  });
};


module.exports = {
    avatarUploader,
    coverUploader,
    uploadToS3,
    deleteFromS3,
    getOptimizedUrl,
    uploadMultipleToS3,
    getSignedS3Url
};
