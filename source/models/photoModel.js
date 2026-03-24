import mongoose from "mongoose";

const photoSchema = new mongoose.Schema({
    id: {
        type: String
    },
    photoName: {
        type: String,
        required: true
    },
    photoDevice: {
        type: String,
    },
    photoMime: String,
    photoModel: String,
    photoSoftware: String,
    photoExposureTime: String,
    photoFocal: String,
    photoIso: String,
    photoLatitude: String,
    photoLongitude: String,
    photoZone: String,
    photoMegapixels: String,
    photoSize: String,
    photoDate: {
        year : String,
        month : String,
        day : String,
        hour : String,
        minute : String,
        second : String
    },
    photoId: String,
    photoMId: String,
    photoHash: String,
    photoStream: String,
    photoDownload: String,
    originalMime: String,
    convertedMime: String,
    originalSize: String,
    convertedSize: String,
    conversionStatus: {
        type: String,
        default: "",
    },
    conversionError: {
        type: String,
        default: "",
    },
    conversionTimeMs: {
        type: String,
        default: "",
    },
    mediaType: {
        type: String,
        default: "",
    },
},{timestamps: true})

export default mongoose.model("Photo", photoSchema)