import { MongoClient } from "mongodb";

// Reuse client across hot-reloads in Next.js dev mode
const globalWithMongo = global as typeof global & { _mongoClient?: MongoClient };

function createClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is not set.");
  return new MongoClient(uri, {
    serverSelectionTimeoutMS: 8_000,  // fail fast if Mongo is unreachable
    connectTimeoutMS: 8_000,
    socketTimeoutMS: 15_000,
  });
}

export async function getDb() {
  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClient) {
      globalWithMongo._mongoClient = createClient();
    }
    await globalWithMongo._mongoClient.connect();
    return globalWithMongo._mongoClient.db("codeSarthi");
  }
  const client = createClient();
  await client.connect();
  return client.db("codeSarthi");
}
