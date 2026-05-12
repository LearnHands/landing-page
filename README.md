# EduMotion 🖐️✨ (Versión Web Hub)

**EduMotion** es una plataforma educativa interactiva diseñada para la inclusión digital en entornos escolares (Fe y Alegría Ecuador). Esta versión web evoluciona el proyecto original de escritorio hacia una aplicación accesible desde cualquier navegador moderno, eliminando la necesidad de instalaciones complejas.

Utiliza **Inteligencia Artificial y Visión por Computadora** para permitir que los estudiantes interactúen con actividades lúdicas utilizando únicamente los gestos de sus manos frente a la cámara web.

## 🚀 Misión del Proyecto
Facilitar el aprendizaje interactivo para niños con retos motrices o en etapas iniciales de desarrollo, eliminando las barreras físicas de entrada y convirtiendo el movimiento natural del cuerpo en una herramienta de aprendizaje.

## 🛠️ Tecnologías Utilizadas (Web Stack)
- **Core:** [React 19](https://react.dev/) (Migrado desde Vue.js)
- **Motor de IA:** [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) (Google) ejecutado en el cliente.
- **Estilos:** [TailwindCSS v4](https://tailwindcss.com/)
- **Animaciones:** [Framer Motion](https://www.framer.com/motion/)
- **Audio:** Web Audio API para el sintetizador gestual.

## 🎮 Módulos Educativos
1.  **Pizarra de Dibujo:** Creatividad libre guiada por el dedo índice (Gesto ☝️).
2.  **Piano Mágico:** Iniciación musical y relación causa-efecto mediante gestos. Teclado superior para interacción aérea.
3.  **Rompecabezas (Puzzle):** Lógica espacial utilizando el gesto de "pinza" (Gesto 🤏) para mover objetos.

## 🔐 Acceso Docente (Login)
La aplicación cuenta con una pantalla de acceso protegida para que los profesores gestionen la sesión.

**Credenciales Predeterminadas:**
- **Usuario Administrador:** `admin` | **Contraseña:** `123`
- **Usuario Profesor:** `profesor` | **Contraseña:** `123`

## ⚙️ Desarrollo Local

### Requisitos
- Node.js (v18 o superior)
- Webcam funcional

### Ejecución
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

---
Desarrollado con ❤️ por el **Grupo Uno Emprendimiento** para Fe y Alegría Ecuador.
Repo Oficial: https://github.com/GrupoUnoEmprendimiento/EduMotion
