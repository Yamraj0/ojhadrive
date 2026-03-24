import express from 'express'
import uploadMulter from '../config/multer.js'
import { uploadPhoto,getAllPhotos,getPhotoById  } from '../controllers/photoController.js'

const photoRoutes = express.Router()
const uploadMany = uploadMulter.array('photo',100)

// for getting all photos
photoRoutes.get('/',getAllPhotos)

// for getting single photos
photoRoutes.get('/:id',getPhotoById)


// for uploads photos / single photos
photoRoutes.post('/upload',(req,res,next) => {
	uploadMany(req,res,(error) => {
		if (error) {
			return res.status(400).json({
				message: error.message || 'Upload validation failed',
			})
		}
		next()
	})
},uploadPhoto)

// for getting single photos
// photoRoutes.get('/:id')




export default photoRoutes