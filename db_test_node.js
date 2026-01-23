import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testDB() {
    const connectionConfig = {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    };

    console.log('Attempting to connect with:', { ...connectionConfig, password: '***' });

    try {
        const connection = await mysql.createConnection(connectionConfig);
        console.log('✅ Connected successfully!');

        const [rows] = await connection.execute('SELECT id, username, password, role FROM users');
        console.log('Users in database:');
        console.table(rows);

        await connection.end();
    } catch (error) {
        console.error('❌ Database error:', error);
    }
}

testDB();
