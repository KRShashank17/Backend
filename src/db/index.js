import mongoose from "mongoose";
import { DBNAME } from "../constants.js";


const dbConnect = async ()=> {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DBNAME}`)

        console.log("MongoDB connected !!!")
        console.log(`Host : ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("\nMongoDB connection Failed", error);
        process.exit(1);
    }
}

export default dbConnect;