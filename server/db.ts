import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

let client: postgres.Sql<{}>;
let db: ReturnType<typeof drizzle>;

const createConnection = () => {
  try {
    client = postgres(connectionString!, {
      max: 5, // Reduce max connections
      idle_timeout: 10, // Reduce idle timeout
      connect_timeout: 30,
      max_lifetime: 60 * 10, // Reduce lifetime to 10 minutes
      onnotice: () => {}, // Suppress notices
      debug: false,
      connection: {
        application_name: 'digital-signage-app',
      },
      transform: {
        undefined: null,
      },
      onclose: function(connection_id, err) {
        if (err) {
          console.log('⚠️ Database connection closed with error:', err.code, err.message);
          // Auto-reconnect after a delay if connection is lost
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect to database...');
            createConnection();
          }, 5000);
        }
      }
    });

    db = drizzle(client, { schema });

    // Test connection
    client`SELECT 1`.then(() => {
      console.log('✅ Database connected successfully');
    }).catch((error) => {
      console.error('❌ Database connection failed:', error);
      // Retry connection after delay
      setTimeout(() => {
        console.log('🔄 Retrying database connection...');
        createConnection();
      }, 5000);
    });

    return { client, db };
  } catch (error) {
    console.error('❌ Error creating database connection:', error);
    // Retry connection after delay
    setTimeout(() => {
      console.log('🔄 Retrying database connection...');
      createConnection();
    }, 5000);
    throw error;
  }
};

// Create initial connection
createConnection();

export { db, client };