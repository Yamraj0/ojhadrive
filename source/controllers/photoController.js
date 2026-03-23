import { exiftool } from "exiftool-vendored";
import photoModel from "../models/photoModel.js";
import { client } from "../config/telegram.js";
import fs from "fs/promises";

const channelId = -1003702275192;

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(0).map(
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex++;
        results[currentIndex] = await worker(items[currentIndex]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function processSinglePhoto(photo) {
  const tags = await exiftool.read(photo.path);
  const uniqueid = "yamraj"

  await exiftool.write(photo.path, {
    "XMP:UniqueId": uniqueid,
  });
  const result = await client.sendFile(channelId, {
    file: photo.path,
    fileName: photo.originalname,
    mimeType: photo.mimetype,
    forceDocument: false,
  });

  // Prefer document id when available; fallback to photo id.
  let id = "";
  if (result?.media?.document?.id) {
    id = result.media.document.id.value.toString();
  } else if (result?.media?.photo?.id) {
    id = result.media.photo.id.value.toString();
  }

  const dateTag = tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate;
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
            String(dateTag).replace(
              /^(\d{4}):(\d{2}):(\d{2})/,
              "$1-$2-$3",
            ),
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
    photoUniqueID: uniqueid,
    photoId: id,
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

  // Free disk space: multer saved to disk; once processed, delete it.
  await fs.unlink(photo.path).catch(() => {});
  return photoData;
}

export const uploadPhoto = async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];

  if (!files.length) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  // Important: respond fast. EXIF + Telegram + Mongo runs in background.
  res.status(202).json({
    message: "Upload received. Processing started in background.",
    count: files.length,
  });

  const CONCURRENCY = 2; // keep low to reduce CPU/network spikes + Telegram rate limiting

  void (async () => {
    try {
      const uploadPhotos = await mapLimit(
        files,
        CONCURRENCY,
        processSinglePhoto,
      );
      console.log(`Processed ${uploadPhotos.length} photos`);
    } catch (error) {
      console.log("Photo processing failed:", error);
    }
  })();
};


export const getAllPhotos = async (req, res) => {
  try {
    const photos = await photoModel.find();
    res.status(200).json(photos);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve photos" });
  }
};

export const getPhotoById = async (req, res) => {
  const { id } = req.params;
  try {
    const photo = await photoModel.findOne({ id: id });
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }
    res.status(200).json(photo);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve photo" });
  }
};


