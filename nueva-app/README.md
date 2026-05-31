# Pathfinders Tablero - App de escritorio

Versión de escritorio del tablero interactivo Pathfinder. **No necesitas instalar nada más**: la app incluye servidor, base de datos (archivos locales) y interfaz en un solo ejecutable.

## Cómo ejecutar

### Desarrollo
```bash
cd nueva-app
npm install
npm run electron:dev
```
Esto abre Vite en modo dev y Electron; la ventana carga la UI desde `http://localhost:5173` y el servidor corre en el puerto 29542.

### Producción (ejecutable)
```bash
npm run build
npm run electron
```
O generar el instalador .exe (Windows):
```bash
npm run dist:win
```
El instalador quedará en `dist-electron/`.

## Estructura
- **electron/** – Proceso principal de Electron y servidor embebido (Express + Socket.io).
- **src/** – Frontend React (Vite): misma lógica que la app web (GM, mapas, niebla, sonidos).
- Los datos (mapas, sonidos, archivos subidos) se guardan en la carpeta de datos del usuario de Electron (no requiere MongoDB ni instalación extra).

## Requisitos
- Node.js 18+
- Solo para desarrollo: `npm install` en `nueva-app`. Para el usuario final: solo el .exe generado con `npm run dist:win`.
