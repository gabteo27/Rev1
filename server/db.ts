import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
  max_lifetime: 60 * 30,
  onnotice: () => {}, // Suppress notices
  debug: false,
  connection: {
    application_name: 'digital-signage-app',
  },
  transform: {
    undefined: null,
  },
});

export const db = drizzle(client, { schema });

// Test connection on startup
client`SELECT 1`.then(() => {
  console.log('✅ Database connected successfully');
}).catch((error) => {
  console.error('❌ Database connection failed:', error);
});