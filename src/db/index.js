import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB=async()=>{
    try {
        const conn=await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`\nMongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Failed: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;