import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigrations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture_test',
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
        } : false
    });

    try {
        console.log('Running database migrations...');
        
        // Ensure migrations directory exists in dist
        const migrationsDir = path.join(__dirname);
        if (!fs.existsSync(migrationsDir)) {
            fs.mkdirSync(migrationsDir, { recursive: true });
        }
        
        // Read and execute the migration SQL
        const migrationSQL = fs.readFileSync(
            path.join(migrationsDir, 'init.sql'),
            'utf8'
        );
        
        await pool.query(migrationSQL);
        
        console.log('Migrations completed successfully');
    } catch (error) {
        console.error('Error running migrations:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migrations
runMigrations().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
}); 