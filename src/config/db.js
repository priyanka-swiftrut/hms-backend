import mongoose from "mongoose";
import { exit } from "process"; 

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    exit(1);
  }
};

export default connectDB;
