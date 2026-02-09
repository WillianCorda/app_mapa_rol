# Pathfinder Tabletop App

Aplicación web profesional para la gestión de mapas, niebla de guerra y atmósfera sonora en sesiones de juegos de rol (TTRPG).

## ✨ Características Principales

### 🗺️ Sistema de Mapas e Inmersión
- **Soporte Multiformato:** Carga imágenes (JPG, PNG), videos (MP4, WebM) y **GIFs animados** para dar vida a tus escenarios.
- **Niebla de Guerra Dinámica:** Herramientas de pincel y borrador con formas circulares o cuadradas y tamaños ajustables.
- **Sincronización Total:** Los jugadores ven en tiempo real lo que el GM revela, manteniendo la misma escala y encuadre.
- **Herramientas de GM:** Zoom, paneo y centrado rápido del mapa.

### 🔊 Atmósfera Sonora (Centro de Audio)
- **Música Ambiental:** Sistema de reproducción continua con funciones de Pausa/Reanudar y Parada total.
- **Efectos de Sonido (SFX):** Parrilla de acceso rápido para disparar efectos (explosiones, hechizos, ruidos ambientales) con un solo clic.
- **Mezcla de Audio:** Control de volumen independiente para ambiente y efectos de sonido.
- **Gestión de Biblioteca:** Sube tus propios archivos de audio, renómbralos o eliminalos directamente desde la interfaz.

## 🚀 Instalación y Ejecución

La aplicación consta de dos partes: Backend (API + WebSocket) y Frontend (Next.js Client).

### Requisitos Previos
- Node.js (v18 o superior).
- MongoDB (Local o Atlas).

### 1. Iniciar Backend
```bash
cd backend
npm install
npm run dev
```
El servidor correrá en `http://localhost:5000`. No olvides configurar tu `.env` con la `MONGODB_URI`.

### 2. Iniciar Frontend
```bash
cd frontend
npm install
npm run dev
```
La interfaz estará disponible en `http://localhost:3000`.

## 🎮 Guía de Uso

### 🧙‍♂️ Panel del Game Master (GM)
1. **Biblioteca de Mapas:** Sube tus archivos. Usa el icono de **Monitor** para activar un mapa para los jugadores.
2. **Control de Niebla:** 
   - **Revelar (Borrador):** Elimina la niebla para mostrar el mapa.
   - **Cubrir (Pincel):** Añade niebla para ocultar zonas.
   - **Acciones Rápidas:** Botones para limpiar toda la niebla o cubrir el mapa por completo.
3. **Gestión de Audio:** 
   - Cambia entre las pestañas de Mapas y Sonidos en el lateral izquierdo.
   - Usa el **Lápiz** para organizar y renombrar tus pistas con nombres épicos.

### 🛡️ Vista del Jugador
- Los jugadores solo ven el mapa que el GM ha marcado como **activo**.
- La niebla es opaca para ellos (seguridad total contra spoilers).
- El audio está optimizado para que el GM lo gestione desde su panel (evitando ecos en la misma red).

## 🛠️ Tecnologías
- **Frontend:** Next.js 14, React, TailwindCSS, Shadcn UI, React Konva (Lienzo 2D).
- **Backend:** Node.js, Express, Socket.io (Tiempo Real), Mongoose (MongoDB).
- **Audio:** HTML5 Audio API con gestión avanzada de promesas y buffers.
