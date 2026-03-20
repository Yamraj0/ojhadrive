import mongoose from "mongoose";

const connectDB =  async () => {
    try {
        const response = await mongoose.connect(process.env.MONGODB_URI)
        console.log('Database is connected sucessfully')
    } catch (error) {
        console.log("INTERNAL SERVER ERROR WHILE CONNECTING TO THE DATABASE");
        
    }
}

export default connectDB