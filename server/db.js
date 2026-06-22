import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// ── Generadores y validadores ──────────────────────────────────────────────────

/** Genera un código de clase alfanumérico de 6 caracteres en mayúsculas */
function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin O,0,I,1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Limpia un texto: elimina tildes, eñes y caracteres especiales.
 * Solo deja letras a-z A-Z, números, y espacios.
 */
function sanitizeText(text) {
  return text
    .normalize('NFD')                          // separa caracteres compuestos
    .replace(/[\u0300-\u036f]/g, '')          // elimina diacríticos (tildes)
    .replace(/[^a-zA-Z0-9\s]/g, '')           // elimina todo lo que no sea alfanumérico/espacio
    .replace(/\s+/g, ' ')                     // colapsa espacios múltiples
    .trim();
}

/**
 * Valida si un string es una cédula ecuatoriana válida (10 dígitos numéricos).
 * Verifica el algoritmo del dígito verificador.
 */
function validateCedula(cedula) {
  if (!/^\d{10}$/.test(cedula)) return false;
  const digits = cedula.split('').map(Number);
  const province = digits[0] * 10 + digits[1];
  if (province < 1 || province > 24) return false;
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = digits[i] * coefficients[i];
    if (val >= 10) val -= 9;
    sum += val;
  }
  const verifier = (10 - (sum % 10)) % 10;
  return verifier === digits[9];
}

export { generateClassCode, sanitizeText, validateCedula };

// ── Configuración de conexiones ────────────────────────────────────────────────

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

// ── Inicialización de la base de datos ────────────────────────────────────────

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
    console.log(`[Database] [${activeConfigName}] Inicializando tablas...`);

    // ── 1. learnhands_users ──────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS learnhands_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(100) NULL,
        role VARCHAR(20) DEFAULT 'student',
        password_hash VARCHAR(255) NULL,
        class_code VARCHAR(10) NULL,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database] Tabla "learnhands_users" verificada/creada.');

    // Columnas opcionales para bases existentes
    const alterColumns = [
      `ALTER TABLE learnhands_users ADD COLUMN display_name VARCHAR(100) NULL AFTER username`,
      `ALTER TABLE learnhands_users ADD COLUMN class_code VARCHAR(10) NULL AFTER password_hash`,
    ];
    for (const sql of alterColumns) {
      try {
        await connection.query(sql);
      } catch (e) {
        // Ignorar "Duplicate column" — significa que ya existe
        if (!e.message.toLowerCase().includes('duplicate column') && !e.message.toLowerCase().includes('already exists')) {
          console.warn('[Database] ALTER TABLE advertencia:', e.message);
        }
      }
    }

    // ── 2. learnhands_classes ────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS learnhands_classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_username VARCHAR(100) NOT NULL,
        class_code VARCHAR(10) NOT NULL UNIQUE,
        class_name VARCHAR(150) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database] Tabla "learnhands_classes" verificada/creada.');

    // ── 3. learnhands_student_classes (relación muchos-a-muchos) ────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS learnhands_student_classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        class_code VARCHAR(10) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_student_class (username, class_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database] Tabla "learnhands_student_classes" verificada/creada.');

    // Migrar class_code existentes en learnhands_users → learnhands_student_classes
    await connection.query(`
      INSERT IGNORE INTO learnhands_student_classes (username, class_code)
      SELECT username, class_code
      FROM learnhands_users
      WHERE class_code IS NOT NULL AND role = 'student';
    `);

    // ── 4. learnhands_metrics ────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS learnhands_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        game_name VARCHAR(50) NOT NULL,
        score INT NOT NULL,
        duration_seconds INT NOT NULL,
        played_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database] Tabla "learnhands_metrics" verificada/creada.');

    // ── 5. learnhands_ux_metrics ─────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS learnhands_ux_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        metric_type VARCHAR(50) NOT NULL,
        game_name VARCHAR(50) NOT NULL,
        metric_value DOUBLE NOT NULL,
        details TEXT NULL,
        played_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database] Tabla "learnhands_ux_metrics" verificada/creada.');

    // ── 6. learnhands_audit_logs ─────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS learnhands_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        details TEXT NULL,
        ip_address VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database] Tabla "learnhands_audit_logs" verificada/creada.');

    // ── Datos iniciales ───────────────────────────────────────────────────────
    const [userRows] = await connection.query('SELECT * FROM learnhands_users WHERE username = ?', ['KathePastaz']);
    if (userRows.length === 0) {
      const passwordHash = bcrypt.hashSync('secreto123', 10);
      await connection.query(
        'INSERT INTO learnhands_users (username, display_name, role, password_hash) VALUES (?, ?, ?, ?)',
        ['KathePastaz', 'Kathy Pastaz', 'teacher', passwordHash]
      );
      console.log('[Database] Profesora default "KathePastaz" insertada.');
    }

    const [classRows] = await connection.query(
      'SELECT * FROM learnhands_classes WHERE teacher_username = ?', ['KathePastaz']
    );
    if (classRows.length === 0) {
      const generatedCode = generateClassCode();
      await connection.query(
        'INSERT INTO learnhands_classes (teacher_username, class_code, class_name) VALUES (?, ?, ?)',
        ['KathePastaz', generatedCode, 'Clase Principal']
      );
      console.log(`[Database] Código de clase generado para KathePastaz: ${generatedCode}`);
    }

    await connection.query(
      'INSERT INTO learnhands_audit_logs (action, details, ip_address) VALUES (?, ?, ?)',
      ['SYSTEM_STARTUP', 'Backend iniciado. Tablas verificadas.', '127.0.0.1']
    );

  } catch (error) {
    console.error('[Database] Error crítico al inicializar la base de datos:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function logAudit(action, details, ipAddress = '127.0.0.1') {
  try {
    const activePool = currentPool || mysql.createPool(primaryConfig);
    await activePool.query(
      'INSERT INTO learnhands_audit_logs (action, details, ip_address) VALUES (?, ?, ?)',
      [action, details, ipAddress]
    );
  } catch (err) {
    console.error('[Database] Fallo al escribir log de auditoría:', err.message);
  }
}

// Proxy dinámico para exportar el pool activo
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
