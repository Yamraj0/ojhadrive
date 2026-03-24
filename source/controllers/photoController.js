import { exiftool } from "exiftool-vendored";
import photoModel from "../models/photoModel.js";
import { client } from "../config/telegram.js";
import fs from "fs/promises";
import { nanoid } from "nanoid";
import { normalizeMediaForBrowser } from "../utils/mediaConverter.js";

const channelId = -1003702275192;

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(0).map(
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex++;
        try {
          results[currentIndex] = await worker(items[currentIndex]);
        } catch (error) {
          console.log("Single media processing failed:", error?.message || error);
          results[currentIndex] = null;
        }
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function processSinglePhoto(photo) {
  const start = Date.now();
  const uniqueId = nanoid();
  let cleanupPaths = [photo.path];

  try {
    const tags = await exiftool.read(photo.path);
    const normalized = await normalizeMediaForBrowser(photo);
    cleanupPaths = normalized.cleanupPaths;

    const result = await client.sendFile(channelId, {
      file: normalized.path,
      fileName: normalized.fileName,
      mimeType: normalized.mimeType,
      forceDocument: true,
      caption: `ref=${uniqueId}`,
    });

  

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
      const normalizedDate =
        typeof dateTag === "string"
          ? new Date(
              String(dateTag).replace(
                /^(\d{4}):(\d{2}):(\d{2})/,
                "$1-$2-$3",
              ),
            )
          : new Date(dateTag);

      if (!Number.isNaN(normalizedDate.getTime())) {
        photoDate = {
          year: String(normalizedDate.getFullYear()),
          month: String(normalizedDate.getMonth() + 1),
          day: String(normalizedDate.getDate()),
          hour: String(normalizedDate.getHours()),
          minute: String(normalizedDate.getMinutes()),
          second: String(normalizedDate.getSeconds()),
        };
      }
    }

    const photoData = await photoModel.create({
      id: result.id,
      photoId: uniqueId,
      photoName: normalized.fileName,
      photoDevice: tags.Make || "",
      photoModel: tags.Model || tags.ModelName || "",
      photoSoftware: tags.Software || "",
      photoExposureTime: tags.ExposureTime || "",
      photoFocal: tags.FocalLength || "",
      photoIso: tags.ISO || "",
      photoLatitude: tags.GPSLatitude || "",
      photoLongitude: tags.GPSLongitude || "",
      photoZone: tags.Zone || "",
      photoMegapixels: tags.Megapixels || "",
      photoSize: normalized.convertedSize || tags.FileSize || "",
      originalMime: normalized.originalMime,
      convertedMime: normalized.convertedMime,
      originalSize: normalized.originalSize,
      convertedSize: normalized.convertedSize,
      conversionStatus: normalized.converted ? "converted" : "passthrough",
      conversionError: "",
      conversionTimeMs: String(Date.now() - start),
      mediaType: normalized.mediaType,
      photoDate,
    });

    return photoData;
  } catch (error) {
    await photoModel.create({
      photoId: uniqueId,
      photoName: photo.originalname,
      originalMime: photo.mimetype || "",
      convertedMime: "",
      originalSize: "",
      convertedSize: "",
      conversionStatus: "failed",
      conversionError: error?.message || "unknown conversion error",
      conversionTimeMs: String(Date.now() - start),
      mediaType: photo.mimetype?.split("/")?.[0] || "",
      photoDate: {
        year: "",
        month: "",
        day: "",
        hour: "",
        minute: "",
        second: "",
      },
    }).catch(() => {});
    throw error;
  } finally {
    await Promise.all(
      cleanupPaths.map((filePath) => fs.unlink(filePath).catch(() => {})),
    );
  }
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
      const successCount = uploadPhotos.filter(Boolean).length;
      const failedCount = uploadPhotos.length - successCount;
      console.log(`Processed media files: success=${successCount}, failed=${failedCount}`);
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


