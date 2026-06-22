import express from 'express';
import cors from 'cors';
import pathModule from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool, { initializeDatabase, logAudit, generateClassCode, sanitizeText, validateCedula } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathModule.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ── Helpers internos ─────────────────────────────────────────────────────────

/** Agrega un alumno a una clase en la tabla many-to-many */
async function addStudentToClass(username, classCode) {
  try {
    await pool.query(
      'INSERT IGNORE INTO learnhands_student_classes (username, class_code) VALUES (?, ?)',
      [username, classCode]
    );
    // Actualizar clase activa en learnhands_users
    await pool.query(
      'UPDATE learnhands_users SET class_code = ?, updated_at = NOW() WHERE username = ?',
      [classCode, username]
    );
    return true;
  } catch (err) {
    console.error('[Helper] Error al unir alumno a clase:', err.message);
    return false;
  }
}

// ── Healthcheck ───────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', message: 'Servidor y base de datos funcionando correctamente.', database: 'CONNECTED', timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: 'El servidor está activo pero la base de datos no responde.', database: 'DISCONNECTED', error: error.message, timestamp: new Date() });
  }
});

// ── Registro / Login de Alumnos ───────────────────────────────────────────────

/**
 * Verifica si una cédula ya existe (antes de mostrar el form completo).
 * Responde: { exists, display_name?, classes? }
 */
app.get('/api/auth/check-cedula/:cedula', async (req, res) => {
  const cedula = (req.params.cedula || '').trim();

  if (!validateCedula(cedula)) {
    return res.status(422).json({ valid: false, error: 'Cédula inválida. Debe tener 10 dígitos.' });
  }

  try {
    const [rows] = await pool.query('SELECT username, display_name, class_code FROM learnhands_users WHERE username = ?', [cedula]);
    if (rows.length === 0) {
      return res.json({ exists: false, valid: true });
    }

    // Obtener todas las clases del alumno
    const [classRows] = await pool.query(
      `SELECT sc.class_code, c.class_name
       FROM learnhands_student_classes sc
       LEFT JOIN learnhands_classes c ON sc.class_code = c.class_code
       WHERE sc.username = ?`,
      [cedula]
    );

    return res.json({
      exists: true,
      valid: true,
      display_name: rows[0].display_name,
      active_class: rows[0].class_code,
      classes: classRows
    });
  } catch (error) {
    console.error('[Auth Check] Error:', error.message);
    res.status(500).json({ valid: false, error: 'Error al verificar la cédula.' });
  }
});

/**
 * Registrar nuevo alumno con cédula.
 * También sirve como "login" si la cédula ya existe — devuelve datos actualizados.
 */
app.post('/api/auth/register', async (req, res) => {
  const { cedula, display_name, class_code, username } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // ── Modo legacy (nombre sin cédula) ─────────────────────────────────────
  if (!cedula && username) {
    const usernameClean = sanitizeText(username.trim());
    if (!usernameClean || usernameClean.length < 2) {
      return res.status(422).json({ error: 'Nombre inválido.' });
    }
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.query('SELECT * FROM learnhands_users WHERE username = ?', [usernameClean]);
      if (rows.length > 0) {
        await connection.query('UPDATE learnhands_users SET last_login_at = NOW(), updated_at = NOW() WHERE username = ?', [usernameClean]);
        return res.json({ success: true, status: 'existing', username: usernameClean, display_name: rows[0].display_name || usernameClean, role: rows[0].role, class_code: rows[0].class_code || null, classes: [] });
      }
      const classCodeClean = class_code ? class_code.trim().toUpperCase() : null;
      await connection.query(
        'INSERT INTO learnhands_users (username, display_name, role, class_code, last_login_at, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())',
        [usernameClean, usernameClean, 'student', classCodeClean]
      );
      if (classCodeClean) await addStudentToClass(usernameClean, classCodeClean);
      await logAudit('STUDENT_REGISTERED_LEGACY', `Alumno legacy: '${usernameClean}'`, ip);
      return res.status(201).json({ success: true, status: 'created', username: usernameClean, display_name: usernameClean, role: 'student', class_code: classCodeClean, classes: classCodeClean ? [{ class_code: classCodeClean }] : [] });
    } finally {
      if (connection) connection.release();
    }
  }

  // ── Modo nuevo: cédula ───────────────────────────────────────────────────
  if (!validateCedula((cedula || '').trim())) {
    return res.status(422).json({ error: 'Cédula inválida. Debe tener 10 dígitos numéricos válidos.' });
  }

  const cedulaClean = cedula.trim();
  const displayNameClean = display_name ? sanitizeText(display_name.trim()) : '';
  const classCodeClean = class_code ? class_code.trim().toUpperCase() : null;

  // Validar class_code si se proporcionó
  if (classCodeClean) {
    const [classCheck] = await pool.query('SELECT class_code FROM learnhands_classes WHERE class_code = ?', [classCodeClean]);
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Código de clase inválido. Verifica el código con tu profesor.' });
    }
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM learnhands_users WHERE username = ?', [cedulaClean]);

    if (rows.length > 0) {
      // ── Alumno existente → LOGIN ─────────────────────────────────────────
      await connection.query('UPDATE learnhands_users SET last_login_at = NOW(), updated_at = NOW() WHERE username = ?', [cedulaClean]);

      // Si se proporcionó un nuevo class_code, unir a esa clase
      if (classCodeClean) await addStudentToClass(cedulaClean, classCodeClean);

      const [classRows] = await connection.query(
        `SELECT sc.class_code, c.class_name FROM learnhands_student_classes sc
         LEFT JOIN learnhands_classes c ON sc.class_code = c.class_code WHERE sc.username = ?`,
        [cedulaClean]
      );

      await logAudit('STUDENT_LOGIN', `Alumno '${rows[0].display_name || cedulaClean}' (${cedulaClean}) ingresó.`, ip);

      return res.json({
        success: true,
        status: 'existing',
        username: cedulaClean,
        display_name: rows[0].display_name || cedulaClean,
        role: rows[0].role,
        class_code: rows[0].class_code || null,
        classes: classRows
      });
    }

    // ── Nuevo alumno → REGISTRO ──────────────────────────────────────────
    if (!displayNameClean || displayNameClean.length < 2) {
      return res.status(422).json({ error: 'El nombre completo es requerido para el registro.' });
    }

    // La cédula sirve también como contraseña (hasheada)
    const passwordHash = await bcrypt.hash(cedulaClean, 10);

    await connection.query(
      'INSERT INTO learnhands_users (username, display_name, role, password_hash, class_code, last_login_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
      [cedulaClean, displayNameClean, 'student', passwordHash, classCodeClean]
    );

    if (classCodeClean) await addStudentToClass(cedulaClean, classCodeClean);

    await logAudit('STUDENT_REGISTERED', `Nuevo alumno: '${displayNameClean}' (${cedulaClean})${classCodeClean ? ` clase: ${classCodeClean}` : ''}`, ip);

    return res.status(201).json({
      success: true,
      status: 'created',
      username: cedulaClean,
      display_name: displayNameClean,
      role: 'student',
      class_code: classCodeClean,
      classes: classCodeClean ? [{ class_code: classCodeClean, class_name: null }] : []
    });

  } catch (error) {
    console.error('[Auth Register] Error:', error.message);
    res.status(500).json({ error: 'Error al registrar el usuario.', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// ── Login del Profesor ────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const usernameClean = (username || '').trim();

  if (!usernameClean || !password) {
    return res.status(422).json({ success: false, message: 'Credenciales incompletas.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM learnhands_users WHERE username = ? AND role = ?', [usernameClean, role || 'teacher']);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });

    const user = rows[0];
    const isMatch = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!isMatch) {
      await logAudit('LOGIN_FAILED', `Intento fallido para '${usernameClean}'`, ip);
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
    }

    await connection.query('UPDATE learnhands_users SET last_login_at = NOW(), updated_at = NOW() WHERE username = ?', [usernameClean]);
    await logAudit('TEACHER_LOGIN', `Profesora '${usernameClean}' inició sesión.`, ip);
    return res.json({ success: true, message: 'Autenticación exitosa.', username: usernameClean, display_name: user.display_name || usernameClean, role: user.role });
  } catch (error) {
    console.error('[Auth Login] Error:', error.message);
    res.status(500).json({ error: 'Error interno.', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// ── Endpoints de Clases del Alumno ────────────────────────────────────────────

/** Obtener todas las clases de un alumno */
app.get('/api/student/classes', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(422).json({ error: 'username requerido.' });
  try {
    const [rows] = await pool.query(
      `SELECT sc.class_code, c.class_name, c.teacher_username, sc.joined_at
       FROM learnhands_student_classes sc
       LEFT JOIN learnhands_classes c ON sc.class_code = c.class_code
       WHERE sc.username = ?
       ORDER BY sc.joined_at DESC`,
      [username]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clases.', details: error.message });
  }
});

/** Unirse a una clase (o cambiar de clase activa) */
app.post('/api/student/join-class', async (req, res) => {
  const { username, class_code } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!username || !class_code) return res.status(422).json({ error: 'username y class_code son requeridos.' });

  const codeClean = class_code.trim().toUpperCase();
  try {
    const [classRows] = await pool.query('SELECT class_code, class_name, teacher_username FROM learnhands_classes WHERE class_code = ?', [codeClean]);
    if (classRows.length === 0) return res.status(404).json({ error: 'Código de clase inválido.' });

    await addStudentToClass(username, codeClean);
    await logAudit('STUDENT_JOINED_CLASS', `'${username}' se unió a la clase ${codeClean}`, ip);

    res.json({ success: true, class_code: codeClean, class_name: classRows[0].class_name, teacher: classRows[0].teacher_username });
  } catch (error) {
    res.status(500).json({ error: 'Error al unirse a la clase.', details: error.message });
  }
});

/** Cambiar la clase activa del alumno (sin unirse a una nueva) */
app.put('/api/student/active-class', async (req, res) => {
  const { username, class_code } = req.body;
  if (!username) return res.status(422).json({ error: 'username requerido.' });

  try {
    const codeClean = class_code ? class_code.trim().toUpperCase() : null;
    await pool.query('UPDATE learnhands_users SET class_code = ?, updated_at = NOW() WHERE username = ?', [codeClean, username]);
    res.json({ success: true, active_class: codeClean });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar clase activa.', details: error.message });
  }
});

// ── Métricas ──────────────────────────────────────────────────────────────────

app.post('/api/metrics', async (req, res) => {
  const metrics = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!metrics) return res.status(400).json({ error: 'No se enviaron datos de métricas.' });

  const metricsList = Array.isArray(metrics) ? metrics : [metrics];
  if (metricsList.length === 0) return res.status(400).json({ error: 'La lista de métricas está vacía.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    for (const item of metricsList) {
      const { username, game_name, score, duration_seconds, played_at } = item;
      if (!username || !game_name || score === undefined || duration_seconds === undefined || !played_at) {
        throw new Error('Formato de métrica inválido.');
      }
      await connection.query(
        'INSERT INTO learnhands_metrics (username, game_name, score, duration_seconds, played_at) VALUES (?, ?, ?, ?, ?)',
        [username, game_name, score, duration_seconds, new Date(played_at)]
      );
    }
    await connection.commit();
    await logAudit('METRICS_SYNC', `${metricsList.length} métricas sincronizadas.`, ip);
    res.json({ success: true, message: `${metricsList.length} métricas guardadas correctamente.`, count: metricsList.length });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[Metrics] Error:', error.message);
    res.status(500).json({ error: 'Error al guardar las métricas.', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/ux-metrics', async (req, res) => {
  const metrics = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const metricsList = Array.isArray(metrics) ? metrics : [metrics];
  if (!metricsList.length) return res.status(400).json({ error: 'Lista vacía.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    for (const item of metricsList) {
      const { username, metric_type, game_name, metric_value, details, played_at } = item;
      if (!username || !metric_type || !game_name || metric_value === undefined || !played_at) throw new Error('Formato UX inválido.');
      await connection.query(
        'INSERT INTO learnhands_ux_metrics (username, metric_type, game_name, metric_value, details, played_at) VALUES (?, ?, ?, ?, ?, ?)',
        [username, metric_type, game_name, metric_value, details ? (typeof details === 'object' ? JSON.stringify(details) : details) : null, new Date(played_at)]
      );
    }
    await connection.commit();
    res.json({ success: true, count: metricsList.length });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: 'Error al guardar métricas UX.', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// ── Endpoints del Profesor ────────────────────────────────────────────────────

/** Todos los estudiantes (con display_name), filtrable por clase */
app.get('/api/teacher/students', async (req, res) => {
  const { class_code } = req.query;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    let query, params;
    if (class_code) {
      query = `
        SELECT u.username, COALESCE(u.display_name, u.username) as display_name,
               COALESCE(SUM(m.score), 0) as total_score,
               MAX(m.played_at) as last_played_at,
               u.last_login_at, u.created_at as registered_at, u.class_code
        FROM learnhands_users u
        INNER JOIN learnhands_student_classes sc ON u.username = sc.username AND sc.class_code = ?
        LEFT JOIN learnhands_metrics m ON u.username = m.username
        WHERE u.role = 'student'
        GROUP BY u.username, u.display_name, u.last_login_at, u.created_at, u.class_code
        ORDER BY total_score DESC`;
      params = [class_code.toUpperCase()];
    } else {
      query = `
        SELECT u.username, COALESCE(u.display_name, u.username) as display_name,
               COALESCE(SUM(m.score), 0) as total_score,
               MAX(m.played_at) as last_played_at,
               u.last_login_at, u.created_at as registered_at, u.class_code
        FROM learnhands_users u
        LEFT JOIN learnhands_metrics m ON u.username = m.username
        WHERE u.role = 'student'
        GROUP BY u.username, u.display_name, u.last_login_at, u.created_at, u.class_code
        ORDER BY total_score DESC`;
      params = [];
    }
    const [rows] = await pool.query(query, params);
    await logAudit('TEACHER_DASHBOARD_VIEW', 'Profesora consultó alumnos.', ip);
    res.json(rows);
  } catch (error) {
    console.error('[Teacher API] Error:', error.message);
    res.status(500).json({ error: 'Error al consultar estudiantes.', details: error.message });
  }
});

/** Alumnos de una clase específica */
app.get('/api/teacher/classes/:code/students', async (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  try {
    const [rows] = await pool.query(`
      SELECT u.username, COALESCE(u.display_name, u.username) as display_name,
             COALESCE(SUM(m.score), 0) as total_score,
             MAX(m.played_at) as last_played_at,
             u.last_login_at, sc.joined_at
      FROM learnhands_student_classes sc
      INNER JOIN learnhands_users u ON sc.username = u.username
      LEFT JOIN learnhands_metrics m ON u.username = m.username
      WHERE sc.class_code = ?
      GROUP BY u.username, u.display_name, u.last_login_at, sc.joined_at
      ORDER BY total_score DESC`, [code]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener alumnos de la clase.', details: error.message });
  }
});

/** Listar todas las clases de un profesor */
app.get('/api/teacher/classes', async (req, res) => {
  const { teacher } = req.query;
  const teacherName = teacher || 'KathePastaz';
  try {
    const [rows] = await pool.query(
      'SELECT id, class_code, class_name, created_at FROM learnhands_classes WHERE teacher_username = ? ORDER BY created_at DESC',
      [teacherName]
    );
    const classesWithCounts = await Promise.all(rows.map(async (cls) => {
      const [countRows] = await pool.query("SELECT COUNT(*) as count FROM learnhands_student_classes WHERE class_code = ?", [cls.class_code]);
      return { ...cls, student_count: countRows[0].count };
    }));
    res.json(classesWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Error interno.', details: error.message });
  }
});

/** Crear nueva clase */
app.post('/api/teacher/classes', async (req, res) => {
  const { teacher, class_name } = req.body;
  const teacherName = teacher || 'KathePastaz';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!class_name || !class_name.trim()) return res.status(422).json({ error: 'El nombre de la clase es requerido.' });

  try {
    let newCode, attempts = 0;
    do {
      newCode = generateClassCode();
      const [existing] = await pool.query('SELECT id FROM learnhands_classes WHERE class_code = ?', [newCode]);
      if (existing.length === 0) break;
    } while (++attempts < 10);

    await pool.query('INSERT INTO learnhands_classes (teacher_username, class_code, class_name) VALUES (?, ?, ?)', [teacherName, newCode, class_name.trim()]);
    await logAudit('CLASS_CREATED', `Clase "${class_name.trim()}" (${newCode}) creada por ${teacherName}`, ip);
    res.status(201).json({ success: true, class_code: newCode, class_name: class_name.trim() });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la clase.', details: error.message });
  }
});

/** Eliminar una clase */
app.delete('/api/teacher/classes/:code', async (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const { teacher } = req.query;
  const teacherName = teacher || 'KathePastaz';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const [cls] = await pool.query('SELECT class_name FROM learnhands_classes WHERE class_code = ? AND teacher_username = ?', [code, teacherName]);
    if (cls.length === 0) return res.status(404).json({ error: 'Clase no encontrada.' });
    await pool.query('DELETE FROM learnhands_student_classes WHERE class_code = ?', [code]);
    await pool.query("UPDATE learnhands_users SET class_code = NULL WHERE class_code = ?", [code]);
    await pool.query('DELETE FROM learnhands_classes WHERE class_code = ?', [code]);
    await logAudit('CLASS_DELETED', `Clase "${cls[0].class_name}" (${code}) eliminada`, ip);
    res.json({ success: true, message: `Clase ${code} eliminada.` });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la clase.', details: error.message });
  }
});

/** Info de una clase (retrocompat) */
app.get('/api/teacher/class-info', async (req, res) => {
  const { teacher, code } = req.query;
  const teacherName = teacher || 'KathePastaz';
  try {
    const query = code
      ? 'SELECT class_code, class_name, created_at FROM learnhands_classes WHERE class_code = ? AND teacher_username = ?'
      : 'SELECT class_code, class_name, created_at FROM learnhands_classes WHERE teacher_username = ? ORDER BY created_at ASC LIMIT 1';
    const params = code ? [code.toUpperCase(), teacherName] : [teacherName];
    const [rows] = await pool.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'No se encontró una clase.' });
    const [studentCount] = await pool.query("SELECT COUNT(*) as count FROM learnhands_student_classes WHERE class_code = ?", [rows[0].class_code]);
    res.json({ class_code: rows[0].class_code, class_name: rows[0].class_name, teacher_username: teacherName, student_count: studentCount[0].count, created_at: rows[0].created_at });
  } catch (error) {
    res.status(500).json({ error: 'Error interno.', details: error.message });
  }
});

/** Regenerar código de una clase */
app.post('/api/teacher/regenerate-class-code', async (req, res) => {
  const { teacher, class_code } = req.body;
  const teacherName = teacher || 'KathePastaz';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!class_code) return res.status(422).json({ error: 'class_code requerido.' });
  try {
    const newCode = generateClassCode();
    await pool.query("UPDATE learnhands_student_classes SET class_code = ? WHERE class_code = ?", [newCode, class_code.toUpperCase()]);
    await pool.query("UPDATE learnhands_users SET class_code = ? WHERE class_code = ?", [newCode, class_code.toUpperCase()]);
    await pool.query('UPDATE learnhands_classes SET class_code = ?, updated_at = NOW() WHERE class_code = ? AND teacher_username = ?', [newCode, class_code.toUpperCase(), teacherName]);
    await logAudit('CLASS_CODE_REGENERATED', `${class_code} -> ${newCode}`, ip);
    res.json({ success: true, class_code: newCode });
  } catch (error) {
    res.status(500).json({ error: 'Error al regenerar código.', details: error.message });
  }
});

/** Validar código de clase (público) */
app.get('/api/classes/validate/:code', async (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  try {
    const [rows] = await pool.query('SELECT class_code, class_name, teacher_username FROM learnhands_classes WHERE class_code = ?', [code]);
    if (rows.length === 0) return res.status(404).json({ valid: false, message: 'Código de clase no encontrado.' });
    res.json({ valid: true, class_code: rows[0].class_code, class_name: rows[0].class_name, teacher: rows[0].teacher_username });
  } catch (error) {
    res.status(500).json({ valid: false, message: 'Error al validar el código.' });
  }
});

/** Todas las métricas (para dashboard) */
app.get('/api/teacher/metrics', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const [rows] = await pool.query('SELECT * FROM learnhands_metrics ORDER BY played_at DESC');
    await logAudit('TEACHER_METRICS_VIEW', 'Profesora consultó métricas.', ip);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar métricas.', details: error.message });
  }
});

// ── Frontend estático ─────────────────────────────────────────────────────────

const distPath = pathModule.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(pathModule.join(distPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Not Found');
  });
});

// ── Arranque ──────────────────────────────────────────────────────────────────

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 [Server] Puerto ${PORT}`);
      console.log(`👉 http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ [Server] Fallo al iniciar:', err.message);
    process.exit(1);
  }
}

startServer();
