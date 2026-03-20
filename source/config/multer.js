import multer from "multer";
import path from "path";
import crypto from "crypto";

const storage = multer.diskStorage({
    destination: path.resolve(process.cwd(), "uploads"),
    // Avoid collisions when users upload multiple files with the same name.
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || "";
        const unique = crypto.randomBytes(16).toString("hex");
        cb(null, `${Date.now()}-${unique}${ext}`);
    }
})
const uploadMulter = multer({ storage})

export default uploadMulter