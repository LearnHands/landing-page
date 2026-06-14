import { Client } from 'ssh2';
import net from 'net';
import dotenv from 'dotenv';

dotenv.config();

const sshConfig = {
  host: '46.202.177.158',
  port: 22,
  username: 'estudiante_g01',
  password: 'PuceProyecto2021!'
};

const LOCAL_TUNNEL_PORT = 33306;
const REMOTE_DB_PORT = 3306;

const sshConn = new Client();

function createTunnel(localPort, remotePort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      sshConn.forwardOut('127.0.0.1', localPort, '127.0.0.1', remotePort, (err, stream) => {
        if (err) {
          console.error(`[Tunnel] forwardOut falló para el puerto ${remotePort}:`, err.message);
          socket.end();
          return;
        }
        socket.pipe(stream).pipe(socket);
        socket.on('error', () => {});
        stream.on('error', () => {});
      });
    });

    server.listen(localPort, '127.0.0.1', () => {
      console.log(`📡 [Tunnel] Escuchando localmente en 127.0.0.1:${localPort} → reenviando a puerto remoto ${remotePort} por SSH.`);
      resolve(server);
    });

    server.on('error', (err) => {
      console.error('[Tunnel] Error en el servidor de túnel local:', err.message);
      reject(err);
    });
  });
}

sshConn.on('ready', async () => {
  console.log('🔒 [SSH] Conexión SSH establecida con éxito.');
  try {
    // Crear el túnel en el puerto 33306
    await createTunnel(LOCAL_TUNNEL_PORT, REMOTE_DB_PORT);
    
    // Inyectar variables de entorno para que Express se conecte a través del túnel local
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_PORT = LOCAL_TUNNEL_PORT.toString();
    process.env.DB_USER = 'g01';
    process.env.DB_PASSWORD = 'PuceProyecto2021!';
    process.env.DB_NAME = 'db_grupo01';
    
    console.log('⚡ [Env] Variables de base de datos inyectadas. Arrancando servidor Express...');
    
    // Importar dinámicamente el index.js del servidor Express
    await import('./index.js');
    
  } catch (err) {
    console.error('❌ [SyncDev] Error al configurar el entorno de desarrollo:', err.message);
    sshConn.end();
  }
}).on('error', (err) => {
  console.error('❌ [SSH] Falló la conexión SSH:', err.message);
}).connect(sshConfig);
