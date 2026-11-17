// Exposes the few desktop-only calls the mod's settings screen needs (`window.tgmodDesktop`).
const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('tgmodDesktop', {
  getUnblockStatus: () => ipcRenderer.invoke('tgmod:getUnblockStatus'),
  setUnblockEnabled: (enabled) => ipcRenderer.invoke('tgmod:setUnblockEnabled', !!enabled),
  rescanUnblock: () => ipcRenderer.invoke('tgmod:rescanUnblock'),
  restart: () => ipcRenderer.send('tgmod:restart')
});
