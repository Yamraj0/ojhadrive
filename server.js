import app from './source/app.js'
import { configDotenv } from 'dotenv'
import connectDB from './source/config/mongodb.js'


configDotenv()
connectDB()

app.listen(process.env.PORT,() => {
    console.log(`Server is running at port: ${process.env.PORT}`)
})