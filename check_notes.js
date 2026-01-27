import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkPriceNotes() {
    const connectionConfig = {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    };

    try {
        const connection = await mysql.createConnection(connectionConfig);
        console.log('✅ Connected successfully!');

        const [rows] = await connection.execute('SELECT * FROM price_notes');
        console.log('Price Notes in database:');
        console.table(rows);

        await connection.end();
    } catch (error) {
        console.error('❌ Database error:', error);
    }
}

checkPriceNotes();
