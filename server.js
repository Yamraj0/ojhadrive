import app from './source/app.js'
import { configDotenv } from 'dotenv'


configDotenv()

app.listen(process.env.PORT,() => {
    console.log(`Server is running at port: ${process.env.PORT}`)
})