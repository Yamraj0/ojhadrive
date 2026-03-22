import app from './source/app.js'
import { configDotenv } from 'dotenv'
import connectDB from './source/config/mongodb.js'
import { connectTelegram } from './source/config/telegram.js'


configDotenv()

// Boot sequence: ensure Telegram + DB are ready before accepting requests.
;(async () => {
    await connectTelegram().catch((err) => {
        console.error("Telegram connection failed:", err)
    })
    await connectDB()

    app.listen(process.env.PORT,() => {
        console.log(`Server is running at port: ${process.env.PORT}`)
    })
})()