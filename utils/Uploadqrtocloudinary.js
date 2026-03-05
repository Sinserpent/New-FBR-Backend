import QRCode from "qrcode";
import cloudinary from "../config/cloudinary.js"; // your existing cloudinary instance

/**
 * Generates a QR code PNG buffer for the given FBR invoice number,
 * then streams it directly to Cloudinary — no temp files, no disk I/O.
 *
 * @param {string} fbrInvoiceNo  — e.g. "3840157889016DIADFBKE992504"
 * @returns {{ fbrQrUrl: string, fbrQrCdnUrl: string }}
 *   fbrQrUrl    → the FBR verification page URL encoded in the QR
 *   fbrQrCdnUrl → the Cloudinary CDN URL of the uploaded QR image
 */
export const uploadQRToCloudinary = async (fbrInvoiceNo) => {
  // This is what gets encoded inside the QR code
  const fbrQrUrl = `https://invoice.fbr.gov.pk/${fbrInvoiceNo}`;

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
            fbrQrUrl,                          // encoded URL (FBR verification page)
            fbrQrCdnUrl: result.secure_url,    // Cloudinary CDN URL of the QR image
          });
        }
      )
      .end(qrBuffer);
  });
};