# LearnHands — Landing Page & Panel de Control Docente

Plataforma web educativa basada en visión artificial y tracking gestual, adaptada especialmente para los centros educativos de **Fe y Alegría Ecuador**. Este repositorio contiene la **Landing Page** promocional de la plataforma, el sistema de descargas del cliente offline y el **Panel de Control Docente** para la visualización de métricas de uso y gestión de aulas.

---

## 📂 Estructura del Proyecto

El proyecto está construido sobre el framework **Laravel (v13.x)** con una arquitectura SPA integrada mediante **Inertia.js** y **React (v19.x)** con **TypeScript**:

- **`/app`**: Contiene la lógica del Backend en PHP (Controladores de registro de estudiantes, Modelos Eloquent de métricas y aulas, Providers de configuración y Middlewares de seguridad).
- **`/bootstrap`**: Bucle de inicialización del framework y carga de rutas web.
- **`/config`**: Archivos de configuración general de la aplicación (base de datos MySQL, caché, colas, correos, etc.).
- **`/database`**: Migraciones para estructurar las tablas de la base de datos relacional y Seeders personalizados para poblar datos de prueba de estudiantes y métricas.
- **`/public`**: Punto de acceso público (`index.php`) y activos estáticos compilados en producción.
- **`/resources`**: Carpeta principal del Frontend. Contiene el código fuente en React, componentes de interfaz de usuario (Dashboard docente), hojas de estilo globales de Tailwind CSS y configuraciones de diseño.
- **`/routes`**: Rutas HTTP de la aplicación (`web.php` para controladores web e Inertia, y `console.php` para comandos de consola).
- **`/storage`**: Directorio local para logs del sistema, sesiones persistentes de archivos y cachés de carga.
- **`/tests`**: Suite de pruebas unitarias y de integración automatizadas.

---

## 🛠️ Requisitos e Instalación Local

### Requisitos Previos:
- **PHP v8.3** o superior
- **Composer** (gestor de dependencias de PHP)
- **Node.js v20.x** o superior y **npm**
- Servidor de base de datos **MySQL / MariaDB** (se recomienda usar Laragon o XAMPP en Windows)

### Pasos de Instalación:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/LearnHands/landing-page.git
   cd landing-page
   ```

2. **Instalar dependencias del Backend:**
   ```bash
   composer install
   ```

3. **Instalar dependencias del Frontend:**
   ```bash
   npm install
   ```

4. **Configurar el archivo de entorno:**
   Copia el archivo de ejemplo a tu `.env` local:
   ```bash
   cp .env.example .env
   ```

5. **Generar la clave de encriptación de la app:**
   ```bash
   php artisan key:generate
   ```

6. **Configurar y migrar la Base de Datos:**
   Asegúrate de tener creado tu esquema local en MySQL (ej. `learn_hands`) y ejecuta las migraciones junto con el seeder de prueba:
   ```bash
   php artisan migrate --seed
   ```

---

## 🔑 Variables de Entorno (`.env`)

Las siguientes variables son críticas para el funcionamiento local y deben ser configuradas en el archivo `.env`:

- `APP_NAME`: Nombre identificador de la aplicación (ej. `LearnHands`).
- `APP_ENV`: Entorno de ejecución (`local` para desarrollo, `production` para despliegue real).
- `APP_DEBUG`: Habilitador de mensajes detallados de error (`true` en desarrollo, `false` en producción).
- `APP_URL`: URL base local (ej. `http://127.0.0.1:8000`).
- `DB_CONNECTION`: Driver de base de datos (por defecto `mysql`).
- `DB_HOST`: Servidor de base de datos (ej. `127.0.0.1` en desarrollo).
- `DB_PORT`: Puerto de conexión a MySQL (ej. `3306`).
- `DB_DATABASE`: Nombre del esquema local (ej. `learn_hands`).
- `DB_USERNAME`: Usuario de la base de datos (ej. `root`).
- `DB_PASSWORD`: Contraseña del usuario de la base de datos local.

*(Nota: En producción, se deben habilitar las credenciales cifradas y accesos SSL correspondientes.)*

---

## 🚀 Ejecución del Proyecto

Para levantar los servidores locales en modo desarrollo de forma concurrente, ejecuta el comando de conveniencia:

```bash
npm run dev
```

Este comando iniciará de forma simultánea:
1. El servidor web local de PHP Artisan en `http://127.0.0.1:8000`.
2. El servidor de compilación en caliente de Vite para el frontend React.
3. El listener de colas de procesamiento de Laravel.

---

## ⚖️ Declaración de Tecnologías de Terceros y Licencias

En cumplimiento de las directrices académicas, se detallan las librerías de terceros utilizadas y sus respectivas licencias verificadas según [spdx.org](https://spdx.org):

| Nombre de la Librería / Framework | Rol en el Proyecto | Tipo de Licencia (SPDX) |
| :--- | :--- | :--- |
| **Laravel Framework (v13.x)** | Núcleo del Backend (MVC, API, ORM, migraciones) | `MIT` |
| **React (v19.x)** | Librería cliente para interfaces del Panel | `MIT` |
| **React DOM (v19.x)** | Renderizado del DOM en el navegador | `MIT` |
| **Inertia.js (React) (v3.0)** | Puente monolítico entre Laravel y React | `MIT` |
| **Vite (v8.x)** | Servidor de empaquetado y compilación frontend | `MIT` |
| **Tailwind CSS (v4.x)** | Framework de utilidades para estilos visuales | `MIT` |
| **MediaPipe Tasks-Vision (v0.10.x)** | Librería de visión artificial de Google (Hand Tracking) | `Apache-2.0` |
| **Framer Motion (v12.x)** | Control de animaciones dinámicas del frontend | `MIT` |
| **Lucide React (v0.475.x)** | Conjunto de iconos vectoriales interactivos | `ISC` |
| **Radix UI Components (v1.x)** | Primitivas de interfaz accesibles y sin estilos | `MIT` |
| **Laravel Fortify** | Sistema de autenticación seguro en backend | `MIT` |
| **PHPUnit / Mockery** | Frameworks de pruebas automatizadas unitarias | `BSD-3-Clause` |
| **Faker PHP** | Generador de datos simulados para seeders | `MIT` |

---

## 👩‍💻 Deslinde de Autoría y Transparencia en el Uso de IA

- **Código Propio:** El equipo ha desarrollado desde cero los controladores de autenticación, algoritmos de validación de cédulas, vistas del panel docente en React, Seeders de base de datos relacional y lógica de sincronización de métricas escolares.
- **Uso de Inteligencia Artificial (Honestidad Académica):** Declaramos de forma transparente que el proceso de desarrollo contó con la asistencia guiada de herramientas de IA (**Claude** y **Gemini**). Estas herramientas fueron utilizadas para el autocompletado y depuración de código en componentes React, optimización de queries SQL locales y la redacción de la estructura básica de este archivo de documentación. La autoría intelectual de las decisiones de diseño y el control final de la implementación corresponden íntegramente al equipo de desarrollo humano, quien sustentará el código base en vivo.

---

## 📄 Licencia

Este repositorio se distribuye bajo los términos de la licencia **MIT**. Consulta el archivo `LICENSE` en la raíz del proyecto para ver el texto legal completo.
