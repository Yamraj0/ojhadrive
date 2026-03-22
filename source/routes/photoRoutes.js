import express from 'express'
import uploadMulter from '../config/multer.js'
import { uploadPhoto,getAllPhotos,getPhotoById  } from '../controllers/photoController.js'

const photoRoutes = express.Router()

// for getting all photos
photoRoutes.get('/',getAllPhotos)

// for getting single photos
photoRoutes.get('/:id',getPhotoById)


// for uploads photos / single photos
photoRoutes.post('/upload',uploadMulter.array('photo',100),uploadPhoto)

// for getting single photos
// photoRoutes.get('/:id')




export default photoRoutes