import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import heicConvert from "heic-convert";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

if (ffprobe?.path) {
  ffmpeg.setFfprobePath(ffprobe.path);
}

const IMAGE_OUTPUT_MIME = "image/jpeg";
const VIDEO_OUTPUT_MIME = "video/mp4";
const AUDIO_OUTPUT_MIME = "audio/mpeg";

const IMAGE_EXT = ".jpg";
const VIDEO_EXT = ".mp4";
const AUDIO_EXT = ".mp3";

const SUPPORTED_IMAGE_PASSTHROUGH = new Set([
  "image/jpeg",
  "image/jpg",
]);

const SUPPORTED_VIDEO_PASSTHROUGH = new Set([
  "video/mp4",
]);

const SUPPORTED_AUDIO_PASSTHROUGH = new Set([
  "audio/mpeg",
  "audio/mp3",
]);

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

function isHeicLike(inputPath, inputMime) {
  const ext = path.extname(inputPath || "").toLowerCase();
  return HEIC_MIME_TYPES.has(inputMime) || ext === ".heic" || ext === ".heif";
}

function compactErrorMessage(error) {
  const raw = error?.message || String(error || "unknown error");
  return raw.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 2).join(" | ");
}

function getOutputPath(inputPath, suffix, ext) {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.${suffix}${ext}`);
}

function runFfmpeg(inputPath, outputPath, configure) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath);
    configure(command);

    command
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

async function convertImage(inputPath, inputMime) {
  if (SUPPORTED_IMAGE_PASSTHROUGH.has(inputMime)) {
    return {
      outputPath: inputPath,
      outputMime: IMAGE_OUTPUT_MIME,
      converted: false,
    };
  }

  const outputPath = getOutputPath(inputPath, "browser", IMAGE_EXT);

  try {
    if (isHeicLike(inputPath, inputMime)) {
      const inputBuffer = await fs.readFile(inputPath);
      const convertedBuffer = await heicConvert({
        buffer: inputBuffer,
        format: "JPEG",
        quality: 1,
      });

      await fs.writeFile(outputPath, Buffer.from(convertedBuffer));
    } else {
      await sharp(inputPath)
        .rotate()
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 96, mozjpeg: true, progressive: true, chromaSubsampling: "4:4:4" })
        .withMetadata()
        .toFile(outputPath);
    }
  } catch (error) {
    throw new Error(`Image conversion failed (${inputMime || "unknown"}): ${compactErrorMessage(error)}`);
  }

  return {
    outputPath,
    outputMime: IMAGE_OUTPUT_MIME,
    converted: true,
  };
}

async function convertVideo(inputPath, inputMime) {
  if (SUPPORTED_VIDEO_PASSTHROUGH.has(inputMime)) {
    return {
      outputPath: inputPath,
      outputMime: VIDEO_OUTPUT_MIME,
      converted: false,
    };
  }

  const outputPath = getOutputPath(inputPath, "browser", VIDEO_EXT);

  try {
    await runFfmpeg(inputPath, outputPath, (command) => {
      command
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-crf 22",
          "-pix_fmt yuv420p",
          "-c:a aac",
          "-b:a 160k",
          "-movflags +faststart",
          "-map 0:v:0",
          "-map 0:a?",
        ])
        .format("mp4");
    });
  } catch (error) {
    throw new Error(`Video conversion failed: ${compactErrorMessage(error)}`);
  }

  return {
    outputPath,
    outputMime: VIDEO_OUTPUT_MIME,
    converted: true,
  };
}

async function convertAudio(inputPath, inputMime) {
  if (SUPPORTED_AUDIO_PASSTHROUGH.has(inputMime)) {
    return {
      outputPath: inputPath,
      outputMime: AUDIO_OUTPUT_MIME,
      converted: false,
    };
  }

  const outputPath = getOutputPath(inputPath, "browser", AUDIO_EXT);

  try {
    await runFfmpeg(inputPath, outputPath, (command) => {
      command
        .outputOptions([
          "-c:a libmp3lame",
          "-q:a 2",
          "-map 0:a:0",
        ])
        .format("mp3");
    });
  } catch (error) {
    throw new Error(`Audio conversion failed: ${compactErrorMessage(error)}`);
  }

  return {
    outputPath,
    outputMime: AUDIO_OUTPUT_MIME,
    converted: true,
  };
}

function mediaKindFromMime(mimeType) {
  if (mimeType?.startsWith("image/")) {
    return "image";
  }
  if (mimeType?.startsWith("video/")) {
    return "video";
  }
  if (mimeType?.startsWith("audio/")) {
    return "audio";
  }
  return "unknown";
}

export async function normalizeMediaForBrowser(file) {
  const originalMime = file.mimetype || "application/octet-stream";
  const mediaType = mediaKindFromMime(originalMime);

  if (mediaType === "unknown") {
    throw new Error(`Unsupported media type: ${originalMime}`);
  }

  const originalStat = await fs.stat(file.path);

  let conversion;
  if (mediaType === "image") {
    conversion = await convertImage(file.path, originalMime);
  } else if (mediaType === "video") {
    conversion = await convertVideo(file.path, originalMime);
  } else {
    conversion = await convertAudio(file.path, originalMime);
  }

  const convertedStat = await fs.stat(conversion.outputPath);

  const extensionByType = {
    image: IMAGE_EXT,
    video: VIDEO_EXT,
    audio: AUDIO_EXT,
  };

  const originalName = path.parse(file.originalname || path.basename(file.path)).name;

  return {
    mediaType,
    converted: conversion.converted,
    path: conversion.outputPath,
    mimeType: conversion.outputMime,
    fileName: conversion.converted
      ? `${originalName}${extensionByType[mediaType]}`
      : file.originalname,
    originalMime,
    convertedMime: conversion.outputMime,
    originalSize: String(originalStat.size),
    convertedSize: String(convertedStat.size),
    cleanupPaths: conversion.outputPath === file.path ? [file.path] : [file.path, conversion.outputPath],
  };
}
