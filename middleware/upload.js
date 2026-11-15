import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { HttpError } from "../utils/errors.js";

const uploadDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));

mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({
  dest: uploadDirectory,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new HttpError(400, "Only JPEG, PNG, WEBP or GIF images are allowed")
      );
    }

    callback(null, true);
  },
});

export default upload;
