import express from "express";
import photoModel from "../models/photoModel.js";
import { imageMimeTypes,videoMimeTypes,fileMimeTypes,audioMimeTypes } from "../data/mimeTypes.js";

const filesRoutes = express.Router();

filesRoutes.post("/uploaded", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {

    const fileId = data.backend_file_id;

      if (!fileId) {
        console.log("File Id is Not found");
      }

      const isPhoto = await photoModel.findOne({ photoId: fileId });
      console.log(isPhoto);

      if (!isPhoto) {
        console.log("No photo Found by id");
      }

      isPhoto.photoMId = data.message_id;
      isPhoto.photoMime = data.mime_type;
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
