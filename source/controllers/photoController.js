import { exiftool } from "exiftool-vendored";
import photoModel from "../models/photoModel.js";
const channelId = -1003702275192 ;
import { client } from "../config/telegram.js";

export const uploadPhoto = async (req, res) => {
  try {
    const uploadPhotos = [];

    for (let photo of req.files) {
      const tags = await exiftool.read(photo.path);
      const result = await client.sendFile(channelId, {
        file: photo.path,
        fileName: photo.originalname,
        mimeType: photo.mimetype,
        forceDocument: false,
      });
      console.log("telegram upload result:", JSON.stringify(photo));
      console.log("telegram upload result:", JSON.stringify(result));
      const dateTag =
        tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate;
      let photoDate = {
        year: "",
        month: "",
        day: "",
        hour: "",
        minute: "",
        second: "",
      };

      if (dateTag) {
        const normalized =
          typeof dateTag === "string"
            ? new Date(
                String(dateTag).replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"),
              )
            : new Date(dateTag);

        if (!Number.isNaN(normalized.getTime())) {
          photoDate = {
            year: String(normalized.getFullYear()),
            month: String(normalized.getMonth() + 1),
            day: String(normalized.getDate()),
            hour: String(normalized.getHours()),
            minute: String(normalized.getMinutes()),
            second: String(normalized.getSeconds()),
          };
        }
      }

      const photoData = await photoModel.create({
        id: result.id,
        photoName: photo.originalname,
        photoDevice: tags.Make || "",
        photoModel: tags.Model || "",
        photoSoftware: tags.Software || "",
        photoExposureTime: tags.ExposureTime || "",
        photoFocal: tags.FocalLength || "",
        photoIso: tags.ISO || "",
        photoLatitude: tags.GPSLatitude || "",
        photoLongitude: tags.GPSLongitude || "",
        photoZone: tags.Zone || "",
        photoMegapixels: tags.Megapixels || "",
        photoSize: tags.FileSize || "",
        photoDate,
      });
      uploadPhotos.push(photoData);
    }
    res
      .status(200)
      .json({ message: "Photos uploaded successfully", data: uploadPhotos });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "INTERNAL SERVER ERROR WHILE UPLOADS THE PHOTOES",
      error: JSON.stringify(error),
    });
  }
};
