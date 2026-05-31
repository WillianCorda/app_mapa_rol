const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getServerPort: () => process.env.ELECTRON_SERVER_PORT || ipcRenderer.sendSync('get-server-port'),
  openProjectionWindow: () => ipcRenderer.invoke('open-projection-window'),
});
