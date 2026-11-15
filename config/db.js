import dns from "node:dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("Connected to MongoDB:", mongoose.connection.name);
};

export default connectDB;
