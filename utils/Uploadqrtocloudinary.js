import QRCode from "qrcode";
import cloudinary from "../config/cloudinary.js"; // your existing cloudinary instance

/**
 * Generates a QR code PNG buffer for the given FBR invoice number,
 * then streams it directly to Cloudinary — no temp files, no disk I/O.
 *
 * @param {string} fbrInvoiceNo  — e.g. "3840157889016DIADFBKE992504"
 * @returns {{ fbrQrUrl: string, fbrQrCdnUrl: string }}
 *   fbrQrUrl    → the raw FBR invoice number encoded in the QR
 *   fbrQrCdnUrl → the Cloudinary CDN URL of the uploaded QR image
 */
export const uploadQRToCloudinary = async (fbrInvoiceNo) => {
  // Encode only the FBR invoice number (no URL) for Tax Asaan / IRIS scan
  const fbrQrUrl = String(fbrInvoiceNo);

  // Generate QR as a raw PNG buffer
  const qrBuffer = await QRCode.toBuffer(fbrQrUrl, {
    type:                 "png",
    width:                300,    // px — good enough for print and screen
    margin:               2,
    errorCorrectionLevel: "M",    // medium: survives minor print smudging
    color: {
      dark:  "#000000",
      light: "#ffffff",
    },
  });

  // Stream the buffer straight to Cloudinary
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder:        "fbr-qr-codes",
          public_id:     `qr_${fbrInvoiceNo}`,  // deterministic — safe to re-run
          resource_type: "image",
          format:        "png",
          overwrite:     true,
        },
        (err, result) => {
          if (err) return reject(err);
          resolve({
            fbrQrUrl,                          // encoded payload: bare FBR invoice number
            fbrQrCdnUrl: result.secure_url,    // Cloudinary CDN URL of the QR image
          });
        }
      )
      .end(qrBuffer);
  });
};