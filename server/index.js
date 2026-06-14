import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { initializeDatabase, logAudit } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Endpoint para guardar métricas
app.post('/api/metrics', async (req, res) => {
  const metrics = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!metrics) {
    return res.status(400).json({ error: 'No se enviaron datos de métricas.' });
  }

  // Convertimos a array si es un único objeto
  const metricsList = Array.isArray(metrics) ? metrics : [metrics];

  if (metricsList.length === 0) {
    return res.status(400).json({ error: 'La lista de métricas está vacía.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    // Iniciamos una transacción para consistencia
    await connection.beginTransaction();

    const query = `
      INSERT INTO metrics (username, game_name, score, duration_seconds, played_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    for (const item of metricsList) {
      const { username, game_name, score, duration_seconds, played_at } = item;
      
      // Validación básica
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

    // Registrar log de auditoría remota
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
    
    // Registrar el error en la auditoría si es posible
    await logAudit('METRICS_SYNC_ERROR', `Fallo al registrar métricas: ${error.message}`, ip);

    res.status(500).json({
      error: 'Error interno del servidor al guardar las métricas.',
      details: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Endpoint para que la profesora consulte la lista de estudiantes y sus puntajes
app.get('/api/teacher/students', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const [rows] = await pool.query(`
      SELECT username, 
             SUM(score) as total_score, 
             MAX(played_at) as last_played_at
      FROM metrics
      GROUP BY username
      ORDER BY total_score DESC
    `);
    
    // Registrar auditoría remota
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

// Servir archivos estáticos del frontend de Vite en producción
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Cualquier otra ruta sirve el index.html de la SPA (React Router support)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // Si el archivo no existe (modo desarrollo), respondemos 404 para URLs no API
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
