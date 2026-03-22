import express from "express";
import photoModel from "../models/photoModel.js";
import { imageMimeTypes,videoMimeTypes,fileMimeTypes,audioMimeTypes } from "../data/mimeTypes.js";

const filesRoutes = express.Router();

filesRoutes.post("/uploaded", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {
    const mime = data.mime_type;


    if (mime == "image/jpeg") {
      const fileId = JSON.stringify(data.file_name).match(/\d+/)[0];
      console.log(fileId);

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
    } else{
      const fileName = data.file_name;
      console.log(fileName);

      if (!fileName) {
        console.log("File Id is Not found");
      }

      const isPhoto = await photoModel.findOne({ photoName: fileName });
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
    } 

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
