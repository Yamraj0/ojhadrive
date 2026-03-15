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
},{timestamps: true})

export default mongoose.model("Photo", photoSchema)