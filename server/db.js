import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'g01',
  password: process.env.DB_PASSWORD || 'PuceProyecto2021!',
  database: process.env.DB_NAME || 'db_grupo01',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log(`[Database] Intentando conectar a ${dbConfig.host}:${dbConfig.port} / BD: ${dbConfig.database} como usuario: ${dbConfig.user}`);

let pool;

try {
  pool = mysql.createPool(dbConfig);
} catch (error) {
  console.error('[Database] Fallo al crear el pool de conexiones:', error);
}

// Función para inicializar las tablas de base de datos si no existen
export async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('[Database] Conexión establecida con MySQL. Inicializando tablas...');

    // 1. Tabla de métricas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        game_name VARCHAR(50) NOT NULL,
        score INT NOT NULL,
        duration_seconds INT NOT NULL,
        played_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database] Tabla "metrics" verificada/creada.');

    // 2. Tabla de logs de auditoría
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database] Tabla "audit_logs" verificada/creada.');

    // Registrar log de inicio
    await connection.query(
      'INSERT INTO audit_logs (action, details, ip_address) VALUES (?, ?, ?)',
      ['SYSTEM_STARTUP', 'El sistema backend se ha iniciado y verificado las tablas de base de datos con éxito.', '127.0.0.1']
    );

  } catch (error) {
    console.error('[Database] Error crítico al inicializar la base de datos:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Helper para insertar registros de auditoría de forma rápida
export async function logAudit(action, details, ipAddress = '127.0.0.1') {
  try {
    await pool.query(
      'INSERT INTO audit_logs (action, details, ip_address) VALUES (?, ?, ?)',
      [action, details, ipAddress]
    );
  } catch (err) {
    console.error('[Database] Fallo al escribir log de auditoría:', err.message);
  }
}

export default pool;
