'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('acmigo', {
  close: () => ipcRenderer.send('mini:close'),
  on: (channel, fn) => {
    if (channel === 'download:event') {
      const handler = (_, ...args) => fn(...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
  },
});
