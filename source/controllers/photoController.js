import { exiftool } from "exiftool-vendored";
import photoModel from "../models/photoModel.js";
import { client, ensureTelegramConnected } from "../config/telegram.js";
import fs from "fs/promises";
import os from "os";
import { nanoid } from "nanoid";
import { normalizeMediaForBrowser } from "../utils/mediaConverter.js";

const channelId = -1003702275192;

function getPositiveIntEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const DEFAULT_UPLOAD_CONCURRENCY = Math.max(
  2,
  Math.min(
    6,
    Math.ceil((os.availableParallelism?.() || os.cpus().length || 2) / 2),
  ),
);

const UPLOAD_CONCURRENCY = getPositiveIntEnv(
  "UPLOAD_CONCURRENCY",
  DEFAULT_UPLOAD_CONCURRENCY,
);

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readMetadataSafely(photo, mediaType) {
  // EXIF for videos/audios can be slow and is not required to complete upload.
  if (mediaType !== "image") {
    return {};
  }

  try {
    return await withTimeout(
      exiftool.read(photo.path),
      8000,
      "metadata read timeout",
    );
  } catch (error) {
    console.log("Metadata read skipped:", error?.message || error);
    return {};
  }
}

async function sendFileWithRetry(payload, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await ensureTelegramConnected();
      return await client.sendFile(channelId, payload);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxAttempts;
      console.log(
        `Telegram upload attempt ${attempt}/${maxAttempts} failed:`,
        error?.message || error,
      );

      if (!isLastAttempt) {
        await wait(1000 * attempt);
      }
    }
  }

  throw lastError;
}

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
  const mediaType = photo.mimetype?.split("/")?.[0] || "";

  try {
    const [tags, normalized] = await Promise.all([
      readMetadataSafely(photo, mediaType),
      normalizeMediaForBrowser(photo),
    ]);
    cleanupPaths = normalized.cleanupPaths;

    const result = await sendFileWithRetry({
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

  void (async () => {
    try {
      const uploadPhotos = await mapLimit(
        files,
        UPLOAD_CONCURRENCY,
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


