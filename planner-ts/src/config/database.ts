import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'planner_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

export async function query<T extends Record<string, any>>(
    text: string,
    params?: any[]
): Promise<T[]> {
    const result = await pool.query<T>(text, params);
    return result.rows;
}

export default pool;