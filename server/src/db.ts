import mongoose, { type ClientSession } from "mongoose";

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  const isSrv = url.startsWith("mongodb+srv://");

  const options: mongoose.ConnectOptions = {};
  if (isLocal && !isSrv) {
    options.retryWrites = false;
    options.directConnection = true;
  }

  const conn = await mongoose.connect(url, options);
  isConnected = true;
  return conn;
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected && mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  isConnected = false;
}

export async function withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
  try {
    const client = mongoose.connection.getClient() as any;
    const type = client?.topology?.description?.type;
    const isReplicaOrSharded =
      type === "ReplicaSetWithPrimary" ||
      type === "ReplicaSetNoPrimary" ||
      type === "Sharded";

    if (!isReplicaOrSharded) {
      // Standalone MongoDB (e.g. localhost:27017 single instance) does not support transactions
      return await fn(undefined);
    }

    const session = await mongoose.startSession();
    try {
      let result: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result!;
    } finally {
      await session.endSession().catch(() => {});
    }
  } catch (err: any) {
    const msg =
      (err?.message || "") +
      (err?.errmsg || "") +
      (err?.errorResponse?.errmsg || "") +
      (err?.errorResponse?.message || "");

    if (
      msg.includes("replica set") ||
      msg.includes("Transaction numbers are only allowed") ||
      msg.includes("retryable writes") ||
      err?.code === 20 ||
      err?.errorResponse?.code === 20
    ) {
      return await fn(undefined);
    }
    throw err;
  }
}

export * from "./models/index.js";
export { mongoose };
