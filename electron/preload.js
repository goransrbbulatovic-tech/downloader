'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('acmigo', {
  // Window controls
  minimize: ()        => ipcRenderer.send('win:minimize'),
  maximize: ()        => ipcRenderer.send('win:maximize'),
  close:    ()        => ipcRenderer.send('win:close'),

  // Settings
  getSettings:  ()    => ipcRenderer.invoke('settings:get'),
  setSettings:  data  => ipcRenderer.invoke('settings:set', data),
  selectDir:    ()    => ipcRenderer.invoke('dialog:selectDir'),

  // Downloads — React owns queue, main just runs one item at a time
  startOne:       item  => ipcRenderer.invoke('download:start', item),
  cancelDownload: id    => ipcRenderer.invoke('download:cancel', id),
  cancelAll:      ()    => ipcRenderer.invoke('download:cancelAll'),
  clearAll:       ()    => ipcRenderer.invoke('download:clearAll'),
  expandPlaylist: url    => ipcRenderer.invoke('playlist:expand', url),
  searchVideos:  (q, src) => ipcRenderer.invoke('search:query', q, src),
  importUrlList:  ()       => ipcRenderer.invoke('import:urllist'),
  clipboardRead:  ()       => ipcRenderer.invoke('clipboard:read'),
  exportCookies:  ()       => ipcRenderer.invoke('cookies:export'),
  trimFile:       (data)   => ipcRenderer.invoke('trim:file', data),
  listDiscDrives: ()       => ipcRenderer.invoke('disc:listDrives'),
  burnDisc:       (data)   => ipcRenderer.invoke('disc:burn', data),
  clipboardWrite: (text)   => ipcRenderer.invoke('clipboard:write', text),
  generateQR:    (text)   => ipcRenderer.invoke('qr:generate', text),
  scheduleAdd:   (data)   => ipcRenderer.invoke('schedule:add', data),
  scheduleRemove:(id)     => ipcRenderer.invoke('schedule:remove', id),
  getHistory:  ()       => ipcRenderer.invoke('download:history'),
  clearHistory: ()      => ipcRenderer.invoke('download:clearHistory'),

  // Video info
  getVideoInfo: url   => ipcRenderer.invoke('video:info', url),

  // yt-dlp management
  ytdlpStatus:  ()    => ipcRenderer.invoke('ytdlp:status'),
  ytdlpInstall: ()    => ipcRenderer.invoke('ytdlp:install'),
  ytdlpUpdate:  ()    => ipcRenderer.invoke('ytdlp:update'),

  // Stats
  getStats: ()        => ipcRenderer.invoke('stats:get'),

  // Reminders
  listReminders:  ()  => ipcRenderer.invoke('reminders:list'),
  addReminder: r      => ipcRenderer.invoke('reminders:add', r),
  deleteReminder: id  => ipcRenderer.invoke('reminders:delete', id),

  // Shell
  openPath:       p   => ipcRenderer.invoke('shell:openPath', p),
  showInFolder:   p   => ipcRenderer.invoke('shell:showItemInFolder', p),
  openExternal:   url => ipcRenderer.invoke('shell:openExternal', url),

  // Mini player
  openMini:  ()       => ipcRenderer.send('mini:open'),
  closeMini: ()       => ipcRenderer.send('mini:close'),

  // Batch convert
  selectFilesForConvert: () => ipcRenderer.invoke('convert:selectFiles'),
  convertFile: (src, ext, outDir) => ipcRenderer.invoke('convert:file', src, ext, outDir),

  // Event listeners
  on: (channel, fn) => {
    const allowed = ['download:event', 'ytdlp:install-progress', 'reminder:fired', 'download:slot-free', 'convert:progress', 'ext:download', 'schedule:fire', 'trim:progress', 'disc:progress'];
    if (allowed.includes(channel)) {
      const handler = (_, ...args) => fn(...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
  },
});
