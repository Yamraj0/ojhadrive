import mongoose from "mongoose";

const connectDB =  async () => {
    try {
        const response = await mongoose.connect(process.env.MONGODB_URI)
        console.log('Database is connected sucessfully')
    } catch (error) {
        res.status(500).json({
            message: "INTERNAL SERVER ERROR WHILE CONNECTING TO THE DATABASE",
            error : JSON.stringify(error)
        })
    }
}

export default connectDB