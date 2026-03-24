import multer from "multer";
import path from "path";
import crypto from "crypto";
import { imageMimeTypes, videoMimeTypes, audioMimeTypes } from "../data/mimeTypes.js";

const acceptedMediaMimeTypes = new Set([
    ...imageMimeTypes,
    ...videoMimeTypes,
    ...audioMimeTypes,
]);

const maxFileSizeMb = Number(process.env.MAX_UPLOAD_FILE_SIZE_MB || 500);

const storage = multer.diskStorage({
    destination: path.resolve(process.cwd(), "uploads"),
    // Avoid collisions when users upload multiple files with the same name.
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || "";
        const unique = crypto.randomBytes(16).toString("hex");
        cb(null, `${Date.now()}-${unique}${ext}`);
    }
})
const uploadMulter = multer({
    storage,
    limits: {
        fileSize: maxFileSizeMb * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (acceptedMediaMimeTypes.has(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new Error(`Unsupported media type: ${file.mimetype}`));
    },
})

export default uploadMulter