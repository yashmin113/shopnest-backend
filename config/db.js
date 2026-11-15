import dns from "node:dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is not configured");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 10000,
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  await connectionPromise;

  console.log("Connected to MongoDB:", mongoose.connection.name);
  return mongoose.connection;
};

export default connectDB;
