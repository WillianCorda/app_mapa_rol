# Comandos para ejecutar la app de escritorio

Para que veas **todos los cambios** (botón Editar, scrollbar nueva, etc.) tienes que **volver a construir** la app y luego abrirla.

## Pasos (en la carpeta `nueva-app`)

### 1. Abrir la carpeta
```bash
cd nueva-app
```

### 2. Instalar dependencias (solo la primera vez o si cambiaste package.json)
```bash
npm install
```

### 3. Construir el frontend
```bash
npm run build
```
Este paso genera la carpeta `dist/` con el código actual. **Si no lo haces, sigues viendo la versión anterior.**

### 4. Abrir la app
```bash
npm run electron
```

---

## Resumen rápido (después de cada cambio en el código)

```bash
cd nueva-app
npm run build
npm run electron
```

Cierra la ventana de Electron antes de volver a ejecutar `npm run electron`.

---

## Modo desarrollo (opcional)

Si quieres que al guardar archivos se actualice solo:

```bash
cd nueva-app
npm run electron:dev
```

Se abren Vite y Electron; los cambios en el código se recargan en la ventana. Si algo no se actualiza, para el proceso (Ctrl+C) y vuelve a ejecutar `npm run electron:dev`.

---

## Crear instalador / ZIP para otra PC

Para generar el instalador y un ZIP que puedas copiar a otra PC:

```bash
cd nueva-app
npm run build
npm run dist:win
```

Se crean dos archivos en la carpeta **`dist-electron`**:

1. **Instalador (.exe)**  
   - Nombre tipo: `Hexara Interactive Rol Map 1.0.0.exe`  
   - En la otra PC: copia este archivo, ejecútalo y sigue los pasos para instalar (acceso directo en escritorio y menú inicio).

2. **ZIP**  
   - Nombre tipo: `Hexara Interactive Rol Map 1.0.0-win.zip`  
   - En la otra PC: copia el .zip, descomprímelo en una carpeta y ejecuta el `.exe` que está dentro (no hace falta instalar; es la app “portable”).

Puedes llevar solo el .exe instalador o solo el .zip a la otra PC; no hace falta llevar toda la carpeta del proyecto.

**Sobre el icono del .exe:** Con la configuración actual (`signAndEditExecutable: false`) la build termina sin errores, pero el ejecutable muestra el icono por defecto de Electron en lugar del de Hexara. Es un efecto secundario de evitar el error de enlaces simbólicos en Windows. Si quieres el icono de Hexara en el .exe: activa **Modo desarrollador** en Windows (Configuración → Privacidad y seguridad → Para desarrolladores), quita `"signAndEditExecutable": false` del `build.win` en `package.json` y vuelve a ejecutar `npm run dist:win`.

**Si sale el error “Cannot create symbolic link” o “no dispone de un privilegio requerido”:** Abre PowerShell **como Administrador** (clic derecho → Ejecutar como administrador) y ejecuta `npm run dist:win`, o activa **Modo desarrollador** en Windows para permitir enlaces simbólicos sin ser admin.
