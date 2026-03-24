import express from "express";
import photoModel from "../models/photoModel.js";

const filesRoutes = express.Router();

filesRoutes.post("/uploaded", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {

    const fileId = data.backend_file_id;

      if (!fileId) {
        return res.status(400).json({
          success: false,
          message: "backend_file_id is required",
        });
      }

      const isPhoto = await photoModel.findOne({ photoId: fileId });
      console.log(isPhoto);

      if (!isPhoto) {
        return res.status(404).json({
          success: false,
          message: "No media found by backend_file_id",
        });
      }

      isPhoto.photoMId = data.message_id;
      isPhoto.photoMime = isPhoto.convertedMime || data.mime_type || isPhoto.photoMime;
      isPhoto.photoHash = data.hash;
      isPhoto.photoStream = data.stream_url;
      isPhoto.photoDownload = data.download_url;

      const photo = await isPhoto.save();
      console.log(photo);
      console.log("success");
    res.status(200).json({
      message: "OK",
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "INTERNAL SERVER ERROR WHILE UPDATING THE FILES ID AND HASH",
    });
  }
});

export default filesRoutes;
