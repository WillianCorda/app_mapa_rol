# Pathfinder Tabletop App

Aplicación web para gestión de mapas y niebla de guerra en juegos de rol.

## Requisitos Previos

- Node.js instalado.
- MongoDB instalado y corriendo en `mongodb://localhost:27017` (o configurar `.env`).

## Instalación y Ejecución

La aplicación consta de dos partes: Backend (API + WebSocket) y Frontend (Next.js Client).

### 1. Iniciar Backend

El backend maneja la subida de mapas y la sincronización en tiempo real.

```bash
cd backend
npm install
npm run dev
```

El servidor correrá en `http://localhost:5000`.

### 2. Iniciar Frontend

El frontend es la interfaz de usuario para el GM y los jugadores.

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Uso

1. **Vista del Game Master (GM):**
   - Ve a `http://localhost:3000` y selecciona "Game Master".
   - Sube una imagen o video de mapa usando el panel lateral.
   - Selecciona el mapa de la lista.
   - Haz clic en el icono de "Monitor" en la lista de mapas para activarlo para los jugadores.
   - Usa las herramientas (Pincel, Borrador) para modificar la Niebla de Guerra.
     - **Pincel:** Agrega niebla (cubre el mapa).
     - **Borrador:** Quita niebla (revela el mapa).
     - **Botones de Papelera/Maximizar:** Limpian o cubren todo el mapa.

2. **Vista del Jugador:**
   - Ve a `http://localhost:3000` y selecciona "Jugador".
   - Verás el mapa activo en tiempo real.
   - La niebla será totalmente negra (no transparente).

## Tecnologías

- **Frontend:** Next.js 14, React, TailwindCSS, Shadcn UI, React Konva.
- **Backend:** Node.js, Express, Socket.io, Mongoose (MongoDB).
