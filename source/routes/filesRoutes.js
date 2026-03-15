import express from 'express'

const filesRoutes = express.Router()

filesRoutes.post('/uploaded',(req,res)=>{
    const result = req.body
    console.log(result)
    res.send(result)
})

export default filesRoutes