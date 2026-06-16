import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const primaryConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'g01',
  password: process.env.DB_PASSWORD || 'PuceProyecto2021!',
  database: process.env.DB_NAME || 'db_grupo01',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const fallbackConfig = {
  host: process.env.DB_FALLBACK_HOST || 'localhost',
  port: parseInt(process.env.DB_FALLBACK_PORT || '3306', 10),
  user: process.env.DB_FALLBACK_USER || 'root',
  password: process.env.DB_FALLBACK_PASSWORD || '',
  database: process.env.DB_FALLBACK_NAME || 'auto_comercio_jvc',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let currentPool = null;
let activeConfigName = 'grupo01';

// Función para inicializar las tablas de base de datos si no existen
export async function initializeDatabase() {
  if (!currentPool) {
    try {
      console.log(`[Database] Intentando conectar a la base de datos principal (${primaryConfig.database})...`);
      const testPool = mysql.createPool(primaryConfig);
      await testPool.query('SELECT 1');
      currentPool = testPool;
      activeConfigName = 'grupo01';
      console.log(`[Database] Conectado exitosamente a la base de datos principal: ${primaryConfig.database}`);
    } catch (err) {
      console.warn(`[Database] No se pudo conectar a la base de datos principal: ${err.message}. Intentando fallback...`);
      try {
        const testPool = mysql.createPool(fallbackConfig);
        await testPool.query('SELECT 1');
        currentPool = testPool;
        activeConfigName = 'autocomerciojvc';
        console.log(`[Database] Conectado exitosamente a la base de datos secundaria: ${fallbackConfig.database}`);
      } catch (fallbackErr) {
        console.error(`[Database] Error crítico: Ambas conexiones fallaron. Fallback: ${fallbackErr.message}`);
        currentPool = mysql.createPool(primaryConfig);
        activeConfigName = 'grupo01';
      }
    }
  }

  let connection;
  try {
    connection = await currentPool.getConnection();
    console.log(`[Database] [${activeConfigName}] Conexión establecida con MySQL. Inicializando tablas...`);

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
    const activePool = currentPool || mysql.createPool(primaryConfig);
    await activePool.query(
      'INSERT INTO audit_logs (action, details, ip_address) VALUES (?, ?, ?)',
      [action, details, ipAddress]
    );
  } catch (err) {
    console.error('[Database] Fallo al escribir log de auditoría:', err.message);
  }
}

// Proxy dinámico para exportar el pool
const poolProxy = new Proxy({}, {
  get(target, prop) {
    if (!currentPool) {
      currentPool = mysql.createPool(primaryConfig);
    }
    const val = currentPool[prop];
    if (typeof val === 'function') {
      return val.bind(currentPool);
    }
    return val;
  }
});

export default poolProxy;
