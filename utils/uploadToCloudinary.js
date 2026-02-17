import cloudinary from "../config/cloudinary.js";

// Upload image buffer to Cloudinary
//export const uploadToCloudinary = async (
//  fileBuffer,
//  folder = "company-logos"
//) => {
//  try {
//    return new Promise((resolve, reject) => {
//      cloudinary.uploader
//        .upload_stream(
//          {
//            folder: folder,
//            resource_type: "auto",
//            transformation: [
//              { width: 500, height: 500, crop: "limit" }, // Resize to max 500x500
//              { quality: "auto" }, // Auto optimize quality
//            ],
//          },
//          (error, result) => {
//            if (error) {
//              reject(error);
//            } else {
//              resolve(result.secure_url);
//            }
//          }
//        )
//        .end(fileBuffer);
//    });
//  } catch (error) {
//    throw new Error("Failed to upload image to Cloudinary");
//  }
//};

export const uploadToCloudinary = (file, folder = "company-logos") => {
  if (!file?.buffer) {
    throw new Error("File buffer missing");
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "auto",
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result.secure_url);
        }
      )
      .end(file.buffer);
  });
};


// Delete image from Cloudinary
export const deleteFromCloudinary = async (imageUrl) => {
  try {
    // Extract public_id from the URL
    const urlParts = imageUrl.split("/");
    const publicIdWithExtension = urlParts.slice(-2).join("/");
    const publicId = publicIdWithExtension.split(".")[0];

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error("Failed to delete image from Cloudinary");
  }
};
