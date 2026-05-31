const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { startServer } = require('./server.cjs');

let mainWindow = null;
let serverPort = null;

const useViteDev = () => process.env.ELECTRON_DEV === '1';

function getIconPath() {
  const base = path.join(__dirname, '..');
  return process.platform === 'win32'
    ? path.join(base, 'Hexara.ico')
    : path.join(base, 'Hexara.png');
}

function getProjectionUrl() {
  if (useViteDev()) {
    return 'http://localhost:5173/#/proyeccion';
  }
  return `file://${path.join(__dirname, '..', 'dist', 'index.html')}#/proyeccion`;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: getIconPath(),
  });

  if (useViteDev()) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createProjectionWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreenable: true,
    title: 'Proyección - Hexara Interactive Rol Map',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadURL(getProjectionUrl());
  win.on('closed', () => {});
  win.webContents.on('did-finish-load', () => {
    if (serverPort != null) {
      win.webContents.executeJavaScript(`window.__SERVER_PORT__ = ${serverPort}`);
    }
  });
  return win;
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media' || permission === 'microphone') callback(true);
    else callback(false);
  });
  const port = await startServer();
  serverPort = port;
  await createWindow();
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`window.__SERVER_PORT__ = ${port}`);
  });

  ipcMain.handle('open-projection-window', () => {
    createProjectionWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
