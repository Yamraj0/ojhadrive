import multer from "multer";

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req,file,cb)=> cb(null, file.originalname)
})
const uploadMulter = multer({ storage})

export default uploadMulter