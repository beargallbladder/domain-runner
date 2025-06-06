import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Running database migrations...');
        
        // Read and execute the migration SQL
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'init.sql'),
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