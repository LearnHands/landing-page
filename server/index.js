import express from 'express';
import cors from 'cors';
import pathModule from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool, { initializeDatabase, logAudit, generateClassCode } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathModule.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS amplia para permitir conexiones desde Electron local
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Endpoint de salud (Healthcheck)
app.get('/api/health', async (req, res) => {
  try {
    // Comprobar la conexión con la base de datos
    await pool.query('SELECT 1');
    res.json({
      status: 'OK',
      message: 'Servidor y base de datos funcionando correctamente.',
      database: 'CONNECTED',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[Health] Fallo en la verificación de base de datos:', error.message);
    res.status(500).json({
      status: 'ERROR',
      message: 'El servidor está activo pero la base de datos no responde.',
      database: 'DISCONNECTED',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Endpoint para registrar/iniciar un alumno
app.post('/api/auth/register', async (req, res) => {
  const { username, role, class_code } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const usernameClean = username ? username.trim() : '';
  const classCodeClean = class_code ? class_code.trim().toUpperCase() : null;

  if (!usernameClean) {
    return res.status(422).json({ error: 'El campo username es requerido.' });
  }

  if (role === 'teacher') {
    return res.status(403).json({ error: 'Los profesores no pueden registrarse por esta ruta.' });
  }

  // Validar código de clase si se envió
  let validatedClassCode = null;
  if (classCodeClean) {
    let connection2;
    try {
      connection2 = await pool.getConnection();
      const [classResult] = await connection2.query(
        'SELECT class_code FROM learnhands_classes WHERE class_code = ?',
        [classCodeClean]
      );
      if (classResult.length === 0) {
        return res.status(404).json({ error: 'Código de clase inválido. Verifica el código con tu profesor.' });
      }
      validatedClassCode = classCodeClean;
    } catch (err) {
      console.error('[Auth Register] Error validando código de clase:', err.message);
    } finally {
      if (connection2) connection2.release();
    }
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM learnhands_users WHERE username = ?', [usernameClean]);
    
    if (rows.length > 0) {
      // Alumno existente -> actualizar última conexión
      await connection.query(
        'UPDATE learnhands_users SET last_login_at = NOW(), updated_at = NOW() WHERE username = ?',
        [usernameClean]
      );

      await connection.query(
        'INSERT INTO learnhands_audit_logs (action, details, ip_address) VALUES (?, ?, ?)',
        ['STUDENT_LOGIN', `El alumno '${usernameClean}' ha ingresado nuevamente.`, ip]
      );

      return res.json({
        success: true,
        status: 'existing',
        message: 'Bienvenido de vuelta.',
        username: usernameClean,
        role: rows[0].role,
        class_code: rows[0].class_code || null
      });
    }

    // Nuevo alumno (con o sin código de clase)
    await connection.query(
      'INSERT INTO learnhands_users (username, role, password_hash, class_code, last_login_at, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())',
      [usernameClean, 'student', null, validatedClassCode]
    );

    await connection.query(
      'INSERT INTO learnhands_audit_logs (action, details, ip_address) VALUES (?, ?, ?)',
      ['STUDENT_REGISTERED', `Nuevo alumno registrado: '${usernameClean}'${validatedClassCode ? ` (clase: ${validatedClassCode})` : ' (sin clase asignada)'}.`, ip]
    );

    return res.status(201).json({
      success: true,
      status: 'created',
      message: validatedClassCode
        ? `Alumno registrado correctamente en la clase ${validatedClassCode}.`
        : 'Alumno registrado correctamente (sin clase asignada).',
      username: usernameClean,
      role: 'student',
      class_code: validatedClassCode
    });

  } catch (error) {
    console.error('[Auth Register] Error:', error.message);
    res.status(500).json({ error: 'Error al registrar el usuario.', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Endpoint para autenticar profesora
app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const usernameClean = username ? username.trim() : '';

  if (!usernameClean || !password) {
    return res.status(422).json({ success: false, message: 'Credenciales incompletas.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM learnhands_users WHERE username = ? AND role = ?',
      [usernameClean, role || 'teacher']
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const user = rows[0];
    const isMatch = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;

    if (!isMatch) {
      await connection.query(
        'INSERT INTO learnhands_audit_logs (action, details, ip_address) VALUES (?, ?, ?)',
        ['LOGIN_FAILED', `Intento fallido de inicio de sesión para '${usernameClean}'.`, ip]
      );
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
    }

    // Éxito
    await connection.query(
      'UPDATE learnhands_users SET last_login_at = NOW(), updated_at = NOW() WHERE username = ?',
      [usernameClean]
    );

    await connection.query(
      'INSERT INTO learnhands_audit_logs (action, details, ip_address) VALUES (?, ?, ?)',
      ['TEACHER_LOGIN', `La profesora '${usernameClean}' ha iniciado sesión.`, ip]
    );

    return res.json({
      success: true,
      message: 'Autenticación exitosa.',
      username: usernameClean,
      role: user.role
    });

  } catch (error) {
    console.error('[Auth Login] Error:', error.message);
    res.status(500).json({ error: 'Error interno.', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Endpoint para guardar métricas de juego
app.post('/api/metrics', async (req, res) => {
  const metrics = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!metrics) {
    return res.status(400).json({ error: 'No se enviaron datos de métricas.' });
  }

  const metricsList = Array.isArray(metrics) ? metrics : [metrics];

  if (metricsList.length === 0) {
    return res.status(400).json({ error: 'La lista de métricas está vacía.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const query = `
      INSERT INTO learnhands_metrics (username, game_name, score, duration_seconds, played_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    for (const item of metricsList) {
      const { username, game_name, score, duration_seconds, played_at } = item;
      
      if (!username || !game_name || score === undefined || duration_seconds === undefined || !played_at) {
        throw new Error('Formato de métrica inválido. Faltan campos requeridos.');
      }

      await connection.query(query, [
        username,
        game_name,
        score,
        duration_seconds,
        new Date(played_at)
      ]);
    }

    await connection.commit();

    const auditDetails = `Sincronización recibida. Se registraron ${metricsList.length} métricas de uso para el usuario/s: ${[...new Set(metricsList.map(m => m.username))].join(', ')}`;
    await logAudit('METRICS_SYNC', auditDetails, ip);

    console.log(`[Metrics] ${metricsList.length} métricas guardadas exitosamente desde IP ${ip}`);

    res.json({
      success: true,
      message: `${metricsList.length} métricas guardadas correctamente.`,
      count: metricsList.length
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[Metrics] Error al registrar métricas:', error.message);
    
    await logAudit('METRICS_SYNC_ERROR', `Fallo al registrar métricas: ${error.message}`, ip);

    res.status(500).json({
      error: 'Error interno del servidor al guardar las métricas.',
      details: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Endpoint para guardar métricas UX
app.post('/api/ux-metrics', async (req, res) => {
  const metrics = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!metrics) {
    return res.status(400).json({ error: 'No se enviaron datos de métricas UX.' });
  }

  const metricsList = Array.isArray(metrics) ? metrics : [metrics];

  if (metricsList.length === 0) {
    return res.status(400).json({ error: 'La lista de métricas UX está vacía.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const query = `
      INSERT INTO learnhands_ux_metrics (username, metric_type, game_name, metric_value, details, played_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (const item of metricsList) {
      const { username, metric_type, game_name, metric_value, details, played_at } = item;
      
      if (!username || !metric_type || !game_name || metric_value === undefined || !played_at) {
        throw new Error('Formato de métrica UX inválido. Faltan campos requeridos.');
      }

      await connection.query(query, [
        username,
        metric_type,
        game_name,
        metric_value,
        details ? (typeof details === 'object' ? JSON.stringify(details) : details) : null,
        new Date(played_at)
      ]);
    }

    await connection.commit();

    res.json({
      success: true,
      message: `${metricsList.length} métricas UX guardadas correctamente.`,
      count: metricsList.length
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[UX Metrics] Error al guardar métricas UX:', error.message);
    
    await logAudit('UX_METRICS_SYNC_ERROR', `Fallo al registrar métricas UX: ${error.message}`, ip);

    res.status(500).json({
      error: 'Error interno del servidor al guardar las métricas UX.',
      details: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Endpoint para ranking de alumnos
app.get('/api/teacher/students', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const [rows] = await pool.query(`
      SELECT learnhands_users.username, 
             COALESCE(SUM(learnhands_metrics.score), 0) as total_score, 
             MAX(learnhands_metrics.played_at) as last_played_at,
             learnhands_users.last_login_at,
             learnhands_users.created_at as registered_at,
             learnhands_users.class_code
      FROM learnhands_users
      LEFT JOIN learnhands_metrics ON learnhands_users.username = learnhands_metrics.username
      WHERE learnhands_users.role = 'student'
      GROUP BY learnhands_users.username, learnhands_users.last_login_at, learnhands_users.created_at, learnhands_users.class_code
      ORDER BY total_score DESC
    `);
    
    await logAudit('TEACHER_DASHBOARD_VIEW', 'La profesora consultó el listado y puntajes de alumnos.', ip);
    
    res.json(rows);
  } catch (error) {
    console.error('[Teacher API] Error al obtener ranking:', error.message);
    await logAudit('TEACHER_API_ERROR', `Fallo al consultar alumnos: ${error.message}`, ip);
    res.status(500).json({ 
      error: 'Error interno al consultar la lista de estudiantes.',
      details: error.message
    });
  }
});

// Endpoint para listar TODAS las clases de un profesor
app.get('/api/teacher/classes', async (req, res) => {
  const { teacher } = req.query;
  const teacherName = teacher || 'KathePastaz';
  try {
    const [rows] = await pool.query(
      'SELECT id, class_code, class_name, created_at FROM learnhands_classes WHERE teacher_username = ? ORDER BY created_at DESC',
      [teacherName]
    );

    // Para cada clase, contar sus alumnos
    const classesWithCounts = await Promise.all(rows.map(async (cls) => {
      const [countRows] = await pool.query(
        "SELECT COUNT(*) as count FROM learnhands_users WHERE class_code = ? AND role = 'student'",
        [cls.class_code]
      );
      return { ...cls, student_count: countRows[0].count };
    }));

    res.json(classesWithCounts);
  } catch (error) {
    console.error('[Teacher API] Error al listar clases:', error.message);
    res.status(500).json({ error: 'Error interno.', details: error.message });
  }
});

// Endpoint para crear una nueva clase
app.post('/api/teacher/classes', async (req, res) => {
  const { teacher, class_name } = req.body;
  const teacherName = teacher || 'KathePastaz';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!class_name || !class_name.trim()) {
    return res.status(422).json({ error: 'El nombre de la clase es requerido.' });
  }

  try {
    // Generar un código único
    let newCode, attempts = 0;
    do {
      newCode = generateClassCode();
      const [existing] = await pool.query('SELECT id FROM learnhands_classes WHERE class_code = ?', [newCode]);
      if (existing.length === 0) break;
      attempts++;
    } while (attempts < 10);

    await pool.query(
      'INSERT INTO learnhands_classes (teacher_username, class_code, class_name) VALUES (?, ?, ?)',
      [teacherName, newCode, class_name.trim()]
    );
    await logAudit('CLASS_CREATED', `Nueva clase creada: "${class_name.trim()}" (${newCode}) por ${teacherName}`, ip);
    res.status(201).json({ success: true, class_code: newCode, class_name: class_name.trim() });
  } catch (error) {
    console.error('[Teacher API] Error al crear clase:', error.message);
    res.status(500).json({ error: 'Error al crear la clase.', details: error.message });
  }
});

// Endpoint para eliminar una clase
app.delete('/api/teacher/classes/:code', async (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const { teacher } = req.query;
  const teacherName = teacher || 'KathePastaz';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // Verificar que la clase pertenece a este profesor
    const [cls] = await pool.query(
      'SELECT id, class_name FROM learnhands_classes WHERE class_code = ? AND teacher_username = ?',
      [code, teacherName]
    );
    if (cls.length === 0) {
      return res.status(404).json({ error: 'Clase no encontrada o no pertenece a este profesor.' });
    }
    // Desasignar alumnos de esa clase (quedan sin clase)
    await pool.query("UPDATE learnhands_users SET class_code = NULL WHERE class_code = ?", [code]);
    // Eliminar la clase
    await pool.query('DELETE FROM learnhands_classes WHERE class_code = ?', [code]);
    await logAudit('CLASS_DELETED', `Clase eliminada: "${cls[0].class_name}" (${code}) por ${teacherName}`, ip);
    res.json({ success: true, message: `Clase ${code} eliminada. Los alumnos quedaron sin clase asignada.` });
  } catch (error) {
    console.error('[Teacher API] Error al eliminar clase:', error.message);
    res.status(500).json({ error: 'Error al eliminar la clase.', details: error.message });
  }
});

// Endpoint retrocompat: GET info de una clase específica (por código o primera del profesor)
app.get('/api/teacher/class-info', async (req, res) => {
  const { teacher, code } = req.query;
  const teacherName = teacher || 'KathePastaz';
  try {
    const query = code
      ? 'SELECT class_code, class_name, created_at FROM learnhands_classes WHERE class_code = ? AND teacher_username = ?'
      : 'SELECT class_code, class_name, created_at FROM learnhands_classes WHERE teacher_username = ? ORDER BY created_at ASC LIMIT 1';
    const params = code ? [code.toUpperCase(), teacherName] : [teacherName];
    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró una clase para este profesor.' });
    }
    const [studentCount] = await pool.query(
      "SELECT COUNT(*) as count FROM learnhands_users WHERE class_code = ? AND role = 'student'",
      [rows[0].class_code]
    );
    res.json({
      class_code: rows[0].class_code,
      class_name: rows[0].class_name,
      teacher_username: teacherName,
      student_count: studentCount[0].count,
      created_at: rows[0].created_at
    });
  } catch (error) {
    console.error('[Teacher API] Error al obtener clase:', error.message);
    res.status(500).json({ error: 'Error interno.', details: error.message });
  }
});

// Endpoint para regenerar el código de una clase específica
app.post('/api/teacher/regenerate-class-code', async (req, res) => {
  const { teacher, class_code } = req.body;
  const teacherName = teacher || 'KathePastaz';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    if (!class_code) return res.status(422).json({ error: 'class_code requerido.' });
    const newCode = generateClassCode();
    // Desasignar alumnos del código viejo
    await pool.query("UPDATE learnhands_users SET class_code = NULL WHERE class_code = ?", [class_code.toUpperCase()]);
    await pool.query(
      'UPDATE learnhands_classes SET class_code = ?, updated_at = NOW() WHERE class_code = ? AND teacher_username = ?',
      [newCode, class_code.toUpperCase(), teacherName]
    );
    await logAudit('CLASS_CODE_REGENERATED', `Código regenerado: ${class_code} -> ${newCode} para ${teacherName}`, ip);
    res.json({ success: true, class_code: newCode });
  } catch (error) {
    console.error('[Teacher API] Error al regenerar código:', error.message);
    res.status(500).json({ error: 'Error al regenerar código de clase.', details: error.message });
  }
});

// Endpoint para validar un código de clase (uso público)
app.get('/api/classes/validate/:code', async (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  try {
    const [rows] = await pool.query(
      'SELECT class_code, class_name, teacher_username FROM learnhands_classes WHERE class_code = ?',
      [code]
    );
    if (rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Código de clase no encontrado.' });
    }
    res.json({ valid: true, class_code: rows[0].class_code, class_name: rows[0].class_name, teacher: rows[0].teacher_username });
  } catch (error) {
    res.status(500).json({ valid: false, message: 'Error al validar el código.' });
  }
});

// Endpoint para todas las métricas
app.get('/api/teacher/metrics', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const [rows] = await pool.query('SELECT * FROM learnhands_metrics ORDER BY played_at DESC');
    await logAudit('TEACHER_METRICS_VIEW', 'La profesora consultó todas las métricas.', ip);
    res.json(rows);
  } catch (error) {
    console.error('[Teacher API] Error al obtener métricas:', error.message);
    res.status(500).json({ 
      error: 'Error interno al consultar las métricas.', 
      details: error.message 
    });
  }
});

// Endpoint para sembrar datos semilla
app.post('/api/teacher/seed', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const [countRows] = await pool.query('SELECT COUNT(*) as cnt FROM learnhands_metrics');
    const count = countRows[0].cnt;
    
    if (count > 5 && !req.body.force) {
      return res.json({ success: false, message: 'La base de datos ya contiene registros suficientes.', count });
    }

    const students = ['Carlos', 'Maria', 'Juan', 'Luis', 'Sofia'];
    const games = ['PIZARRA', 'PIANO', 'PUZZLE', 'SOLAR', 'BRICKS', 'SILABAS', 'ECO_GUARDIAN', 'IRREGULAR_VERBS'];
    
    // Crear alumnos en la tabla de usuarios para que aparezcan en el ranking
    for (const student of students) {
      const [existing] = await pool.query('SELECT * FROM learnhands_users WHERE username = ?', [student]);
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO learnhands_users (username, role, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          [student, 'student']
        );
      }
    }

    const insertQuery = `
      INSERT INTO learnhands_metrics (username, game_name, score, duration_seconds, played_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    let seededCount = 0;
    for (let i = 0; i < 35; i++) {
      const username = students[Math.floor(Math.random() * students.length)];
      const game_name = games[Math.floor(Math.random() * games.length)];
      const score = Math.floor(Math.random() * 200) + 50;
      const duration_seconds = Math.floor(Math.random() * 120) + 30;
      
      const daysAgo = Math.floor(Math.random() * 7);
      const played_at = new Date();
      played_at.setDate(played_at.getDate() - daysAgo);
      played_at.setHours(Math.floor(Math.random() * 8) + 8, Math.floor(Math.random() * 60), 0, 0);

      await pool.query(insertQuery, [username, game_name, score, duration_seconds, played_at]);
      seededCount++;
    }

    await logAudit('METRICS_SEED', `Se sembraron ${seededCount} registros de métricas de prueba.`, ip);
    res.json({ success: true, message: `Se generaron ${seededCount} registros de prueba con éxito.`, count: seededCount });
  } catch (error) {
    console.error('[Teacher API] Error al sembrar métricas:', error.message);
    res.status(500).json({ error: 'Error al generar los datos semilla.', details: error.message });
  }
});

// Servir archivos estáticos del frontend de Vite en producción
const distPath = pathModule.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(pathModule.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Not Found (Desarrollo o Compilación Faltante)');
    }
  });
});

// Inicializar base de datos y arrancar el servidor
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 [Server] Servidor Express corriendo en el puerto ${PORT}`);
      console.log(`👉 API Healthcheck disponible en http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ [Server] No se pudo iniciar el servidor por fallos en la base de datos:', err.message);
    process.exit(1);
  }
}

startServer();
