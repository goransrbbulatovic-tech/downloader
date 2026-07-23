'use strict';

const {
  app, BrowserWindow, ipcMain, dialog, shell, Notification
} = require('electron');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');
const https    = require('https');
const http     = require('http');
const { spawn, execSync } = require('child_process');
const crypto   = require('crypto');
const schedule = require('node-schedule');

// ─── Paths ────────────────────────────────────────────────────────────────────
const IS_DEV   = !app.isPackaged;
const USERDATA = app.getPath('userData');
const BIN_DIR  = path.join(USERDATA, 'bin');
const DATA_DIR = path.join(USERDATA, 'data');
[BIN_DIR, DATA_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const FILES = {
  settings:  path.join(DATA_DIR, 'settings.json'),
  downloads: path.join(DATA_DIR, 'downloads.json'),
  reminders: path.join(DATA_DIR, 'reminders.json'),
  stats:     path.join(DATA_DIR, 'stats.json'),
};

const DEFAULT_SETTINGS = {
  downloadPath: app.getPath('downloads'),
  maxConcurrent: 3,
  preferredFormat: 'mp4',
  preferredQuality: '1080',
  notifications: true,
  saveHistory: true,
  subtitles: false,
  embedThumbnail: false,
};

const DEFAULT_STATS = {
  totalDownloads: 0,
  totalSize: 0,
  byFormat: {},
  bySource: {},
  byDay: {},
};

function readJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return def; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ─── URL cleaner ─────────────────────────────────────────────────────────────
// Strip playlist params from YouTube URLs when playlist mode is OFF
// This prevents yt-dlp from downloading entire playlists unintentionally
function cleanUrl(url, playlistMode) {
  if (playlistMode) return url;
  try {
    const u = new URL(url);
    // Remove YouTube playlist/index params
    ['list', 'index', 'start_radio', 'ab_channel'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
}

// ─── yt-dlp ──────────────────────────────────────────────────────────────────
function ytdlpBin() {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const local = path.join(BIN_DIR, name);
  if (fs.existsSync(local)) return local;
  try {
    const cmd = process.platform === 'win32' ? 'where yt-dlp' : 'which yt-dlp';
    const p = execSync(cmd, { stdio: ['pipe','pipe','pipe'] }).toString().trim().split('\n')[0];
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return null;
}

function ffmpegBin() {
  // 1. Bundled @ffmpeg-installer — works in dev and packaged app
  try {
    let p = require('@ffmpeg-installer/ffmpeg').path;
    if (p) {
      // Fix path for packaged Electron (files extracted from asar)
      p = p
        .replace(/app\.asar([/\\])node_modules/, 'app.asar.unpacked$1node_modules')
        .replace(/app\.asar([/\\])node_modules/, 'app.asar.unpacked$1node_modules');
      if (fs.existsSync(p)) {
        return p;
      }
    }
  } catch (_) {}

  // 2. System ffmpeg fallback
  try {
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
    const p = execSync(cmd, { stdio: ['pipe','pipe','pipe'] })
      .toString().trim().split(/\r?\n/)[0].trim();
    if (p && fs.existsSync(p)) return p;
  } catch {}

  return null;
}

function ytdlpDownloadUrl() {
  const plat = process.platform;
  if (plat === 'win32')  return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  if (plat === 'darwin') return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get  = url.startsWith('https') ? https : http;
    function doGet(u) {
      get.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return doGet(res.headers.location);
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        res.on('data', chunk => {
          received += chunk.length;
          file.write(chunk);
          if (total > 0 && onProgress) onProgress(Math.round((received / total) * 100));
        });
        res.on('end', () => { file.end(); resolve(dest); });
        res.on('error', reject);
      }).on('error', reject);
    }
    doGet(url);
  });
}

// ─── Active processes only — NO queue in main process ────────────────────────
// Queue lives entirely in React. Main process only starts/stops individual downloads.
const activeProcesses = new Map();

function broadcastDownloadEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('download:event', payload);
  if (miniWindow  && !miniWindow.isDestroyed())  miniWindow.webContents.send('download:event', payload);
}


// ─── Parse yt-dlp output ──────────────────────────────────────────────────────
function parseLine(line) {
  const dlMatch = line.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+([\d.]+\s*\S+)\s+at\s+([\d.]+\s*\S+\/s)\s+ETA\s+(\S+)/);
  if (dlMatch) return { type:'progress', percent:parseFloat(dlMatch[1]), totalSize:dlMatch[2].trim(), speed:dlMatch[3].trim(), eta:dlMatch[4].trim() };

  const destMatch = line.match(/\[download\] Destination: (.+)/);
  if (destMatch) return { type:'destination', filePath:destMatch[1].trim() };

  const mergerMatch = line.match(/\[Merger\] Merging formats into "(.+)"/);
  if (mergerMatch) return { type:'finalpath', filePath:mergerMatch[1].trim() };

  const audioMatch = line.match(/\[ExtractAudio\] Destination: (.+)/);
  if (audioMatch) return { type:'finalpath', filePath:audioMatch[1].trim() };

  const moveMatch = line.match(/\[MoveFiles\] Moving file from ".+" to "(.+)"/);
  if (moveMatch) return { type:'finalpath', filePath:moveMatch[1].trim() };

  if (/\[Merger\]|\[ffmpeg\]|\[ExtractAudio\]/.test(line)) return { type:'converting' };

  if (line.includes('[download] 100%')) return { type:'progress', percent:100 };

  if (/error/i.test(line) && !line.includes('[download]')) return { type:'error', message:line };

  return null;
}

// ─── Auto-update yt-dlp ──────────────────────────────────────────────────────
async function autoUpdateYtdlp() {
  try {
    const bin = ytdlpBin();
    if (!bin) return;
    const { execFile } = require('child_process');
    execFile(bin, ['-U'], { windowsHide: true }, (err, stdout) => {
      if (!err) console.log('[yt-dlp auto-update]', stdout?.trim()?.split('\n')[0]);
    });
  } catch(e) { console.log('[yt-dlp auto-update error]', e.message); }
}

// ─── Local HTTP server for browser extension + QR ────────────────────────────
let httpServer = null;
function startHttpServer() {
  try {
    const http = require('http');
    httpServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

      if (req.method === 'POST' && req.url === '/download') {
        let body = '';
        req.on('data', d => body += d);
        req.on('end', () => {
          try {
            const { url, title } = JSON.parse(body);
            if (url && mainWindow) {
              mainWindow.webContents.send('ext:download', { url, title: title || url });
              mainWindow.show(); mainWindow.focus();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            }
          } catch(e) { res.writeHead(400); res.end('Bad request'); }
        });
        return;
      }

      if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ app: 'ACMigo', version: '1.0' }));
        return;
      }
      res.writeHead(404); res.end('Not found');
    });
    httpServer.listen(57432, '127.0.0.1', () => {
      console.log('[ACMigo] HTTP server on port 57432');
    });
  } catch(e) { console.log('[HTTP server error]', e.message); }
}

// ─── Search ───────────────────────────────────────────────────────────────────
ipcMain.handle('search:query', async (_, query, source) => {
  const bin = ytdlpBin();
  if (!bin) return { success: false, error: 'yt-dlp nije instaliran' };

  const prefix = { youtube:'ytsearch15:', soundcloud:'scsearch15:', vimeo:'vmsearch15:' }[source] || 'ytsearch15:';

  return new Promise(resolve => {
    const proc = spawn(bin, [
      '--dump-json', '--flat-playlist', '--no-warnings', '--', prefix + query
    ], { stdio:['ignore','pipe','pipe'], windowsHide:true });

    let out = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.on('close', () => {
      try {
        const results = out.trim().split('\n')
          .filter(Boolean)
          .map(line => { try { return JSON.parse(line); } catch { return null; } })
          .filter(Boolean)
          .map(v => ({
            id:        v.id,
            url:       v.url || v.webpage_url || ('https://www.youtube.com/watch?v=' + v.id),
            title:     v.title || 'Bez naslova',
            thumbnail: v.thumbnail || (v.thumbnails?.[0]?.url) || null,
            duration:  v.duration || 0,
            uploader:  v.uploader || v.channel || '',
            viewCount: v.view_count || 0,
          }));
        resolve({ success: true, results });
      } catch(e) { resolve({ success: false, error: e.message }); }
    });
    proc.on('error', e => resolve({ success: false, error: e.message }));
  });
});

// ─── Playlist expand — returns entries to React (React owns the queue) ────────
ipcMain.handle('playlist:expand', async (_, url) => {
  const bin = ytdlpBin();
  if (!bin) return { success:false, error:'yt-dlp nije instaliran' };
  return new Promise(resolve => {
    const proc = spawn(bin, [
      '--flat-playlist', '--print', '%(url)s\t%(title)s',
      '--no-warnings', '--', url
    ], { stdio:['ignore','pipe','pipe'], windowsHide:true });
    let out = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.on('close', code => {
      if (code !== 0 || !out.trim()) return resolve({ success:false, error:'Playlist prazna' });
      const entries = out.trim().split('\n').filter(Boolean).map(line => {
        const t = line.indexOf('\t');
        const url   = t >= 0 ? line.slice(0, t).trim() : line.trim();
        const title = t >= 0 ? line.slice(t+1).trim() : url;
        return { url: cleanUrl(url, false), title };
      }).filter(e => e.url.startsWith('http'));
      resolve({ success:true, entries });
    });
    proc.on('error', e => resolve({ success:false, error:e.message }));
  });
});

// ─── Trim / Cut ──────────────────────────────────────────────────────────────
ipcMain.handle('trim:file', async (_, { srcPath, outPath, startTime, endTime, format }) => {
  const ff = ffmpegBin();
  if (!ff) return { success:false, error:'ffmpeg nije dostupan' };

  const ext    = format || path.extname(srcPath).slice(1) || 'mp4';
  const base   = path.basename(srcPath, path.extname(srcPath));
  const outDir  = path.dirname(srcPath);
  const output = outPath || path.join(outDir, base + '_clip_' + startTime.replace(/:/g,'-') + '.' + ext);

  const args = ['-y', '-hide_banner', '-loglevel', 'warning'];

  // Seek before input for accuracy
  if (startTime) args.push('-ss', startTime);
  args.push('-i', srcPath);
  if (endTime)   args.push('-to', endTime);

  // Format-specific codec args
  if (ext === 'mp3') {
    args.push('-vn', '-acodec', 'libmp3lame', '-q:a', '2');
  } else if (ext === 'm4a') {
    args.push('-vn', '-acodec', 'aac', '-b:a', '192k');
  } else if (ext === 'wav') {
    args.push('-vn', '-acodec', 'pcm_s16le');
  } else {
    // Video — copy streams (fast, no quality loss)
    args.push('-vcodec', 'copy', '-acodec', 'copy');
  }

  args.push('-progress', 'pipe:2', output);

  return new Promise(resolve => {
    const proc = spawn(ff, args, { stdio:['ignore','pipe','pipe'], windowsHide:true });
    let stderr = '', dur = 0;

    proc.stderr.on('data', d => {
      const txt = d.toString();
      stderr += txt;
      const dm = txt.match(/Duration: (\d+):(\d+):(\d+\.?\d*)/);
      if (dm) dur = parseInt(dm[1])*3600 + parseInt(dm[2])*60 + parseFloat(dm[3]);
      const tm = txt.match(/out_time=(\d+):(\d+):(\d+\.?\d*)/);
      if (tm && dur > 0) {
        const cur = parseInt(tm[1])*3600 + parseInt(tm[2])*60 + parseFloat(tm[3]);
        mainWindow?.webContents.send('trim:progress', { pct: Math.min(99, Math.round(cur/dur*100)) });
      }
    });

    proc.on('close', code => {
      mainWindow?.webContents.send('trim:progress', { pct:100 });
      resolve(code === 0
        ? { success:true, outPath:output }
        : { success:false, error: stderr.split('\n').filter(l=>/error|Error/i.test(l)).pop() || 'Greška' });
    });
    proc.on('error', e => resolve({ success:false, error:e.message }));
  });
});

// ─── USB / Drive listing & burning ───────────────────────────────────────────
// ─── CD/DVD Drive listing ────────────────────────────────────────────────────
ipcMain.handle('disc:listDrives', async () => {
  const { exec } = require('child_process');
  return new Promise(resolve => {
    if (process.platform === 'win32') {
      exec('wmic cdrom get Drive,Caption,MediaType,Status /format:csv',
        { windowsHide:true }, (err, stdout) => {
        if (err) { resolve([]); return; }
        const lines = stdout.trim().split('\n')
          .filter(l => l.trim() && !l.startsWith('Node') && !l.startsWith(','));
        const drives = lines.map(l => {
          const p = l.split(',');
          return {
            id:      p[1]?.trim() || '',
            letter:  p[1]?.trim() || '',
            name:    p[2]?.trim() || 'CD/DVD Drive',
            media:   p[3]?.trim() || '',
            status:  p[4]?.trim() || '',
          };
        }).filter(d => d.letter);
        resolve(drives);
      });
    } else if (process.platform === 'darwin') {
      exec('drutil status', (err, stdout) => {
        if (err) { resolve([{id:'disc0',letter:'/dev/disk2',name:'CD/DVD Drive',media:'',status:''}]); return; }
        resolve([{id:'disc0',letter:'/dev/disk2',name:'CD/DVD Drive',media:stdout.includes('DVD')?'DVD':'CD',status:'Ready'}]);
      });
    } else {
      exec('ls /dev/sr* /dev/cdrom 2>/dev/null', (err, stdout) => {
        const devs = (stdout||'').trim().split('\n').filter(Boolean);
        resolve(devs.map((d,i) => ({ id:d, letter:d, name:'CD/DVD Drive '+(i+1), media:'', status:'' })));
      });
    }
  });
});

// ─── CD/DVD Burn using Windows IMAPI2 / PowerShell ───────────────────────────
ipcMain.handle('disc:burn', async (_, { filePaths, driveLetter, burnSpeed, discLabel }) => {
  return new Promise(resolve => {
    if (!filePaths?.length || !driveLetter) {
      return resolve({ success:false, error:'Nema fajlova ili uređaja' });
    }

    mainWindow?.webContents.send('disc:progress', { pct:5, status:'Priprema disc sesije...' });

    if (process.platform === 'win32') {
      // Use PowerShell IMAPI2 for proper CD/DVD burning
      const fileListStr = filePaths.map(f => `'${f.replace(/'/g, "''")}'`).join(',');
      const speedVal = burnSpeed || 0; // 0 = max speed

      const ps = `
      $drive = '${driveLetter.replace(":", "").replace("\\\\", "")}:'
$label = '${(discLabel||'ACMigo_Disc').replace(/'/g,"''")}'
$files = @(${fileListStr})

try {
  $MsftDiscRecorder = New-Object -ComObject IMAPI2.MsftDiscRecorder2
  $MsftDiscRecorder.InitializeDiscRecorder($drive.TrimEnd(':').ToUpper())

  $MsftDiscFormat = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
  $MsftDiscFormat.Recorder = $MsftDiscRecorder
  $MsftDiscFormat.ClientName = 'ACMigo'

  $DiscFS = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
  $DiscFS.FileSystemsToCreate = 4
  $DiscFS.VolumeName = $label

  foreach ($f in $files) {
    if (Test-Path $f) {
      $name = Split-Path $f -Leaf
      $DiscFS.Root.AddTree($f, $false)
    }
  }

  $Stream = $DiscFS.CreateResultImage().ImageStream
  $MsftDiscFormat.Write($Stream)
  Write-Output 'SUCCESS'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
`.trim();

      const psFile = path.join(app.getPath('temp'), 'acmigo_burn.ps1');
      fs.writeFileSync(psFile, ps, 'utf8');

      mainWindow?.webContents.send('disc:progress', { pct:20, status:'Narezujem na disk...' });

      const proc = spawn('powershell', [
        '-ExecutionPolicy', 'Bypass', '-NonInteractive', '-File', psFile
      ], { windowsHide:true, stdio:['ignore','pipe','pipe'] });

      let out = '', err = '';
      proc.stdout.on('data', d => {
        out += d.toString();
        mainWindow?.webContents.send('disc:progress', { pct:60, status:'Snimanje u toku...' });
      });
      proc.stderr.on('data', d => { err += d.toString(); });

      proc.on('close', code => {
        try { fs.unlinkSync(psFile); } catch {}
        mainWindow?.webContents.send('disc:progress', { pct:100, status:'Završeno!' });
        if (code === 0 && out.includes('SUCCESS')) {
          resolve({ success:true });
        } else {
          // Fallback: try Windows Explorer burn wizard
          exec('explorer.exe ' + driveLetter, { windowsHide:false });
          resolve({ success:false, error:'IMAPI2 nije dostupan. Otvoren Windows wizard za narezivanje.', fallback:true });
        }
      });
      proc.on('error', e => {
        resolve({ success:false, error:e.message });
      });

    } else if (process.platform === 'darwin') {
      // Mac: use hdiutil + drutil
      const tmpIso = path.join(app.getPath('temp'), 'acmigo_disc.iso');
      const fileArgs = filePaths.join(' ');
      exec(`hdiutil makehybrid -o "${tmpIso}" ${filePaths.map(f=>`"${f}"`).join(' ')} -joliet -iso`, (err) => {
        if (err) { resolve({ success:false, error:err.message }); return; }
        mainWindow?.webContents.send('disc:progress', { pct:50, status:'Narezujem...' });
        exec(`drutil burn "${tmpIso}"`, (err2) => {
          try { fs.unlinkSync(tmpIso); } catch {}
          if (err2) resolve({ success:false, error:err2.message });
          else resolve({ success:true });
        });
      });
    } else {
      // Linux: use wodim/cdrecord
      const cmd = `wodim -v dev=${driveLetter} speed=${burnSpeed||0} ${filePaths.map(f=>`"${f}"`).join(' ')}`;
      exec(cmd, { windowsHide:true }, (err, stdout, stderr) => {
        if (err) resolve({ success:false, error:stderr||err.message });
        else resolve({ success:true });
      });
    }
  });
});

// ─── Export YouTube cookies from webview ─────────────────────────────────────
ipcMain.handle('cookies:export', async () => {
  try {
    const sess = require('electron').session.fromPartition('persist:browser');
    const cookies = await sess.cookies.get({ domain: '.youtube.com' });
    if (!cookies.length) return { success:false, error:'Nisi ulogovan u YouTube u Browser tabu' };

    let txt = '# Netscape HTTP Cookie File\n';
    for (const c of cookies) {
      const domain = c.domain.startsWith('.') ? c.domain : '.' + c.domain;
      const flag   = 'TRUE';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const exp    = c.expirationDate ? Math.floor(c.expirationDate) : 0;
      txt += `${domain}	${flag}	${c.path}	${secure}	${exp}	${c.name}	${c.value}
`;
    }

    const cookiesPath = path.join(app.getPath('userData'), 'youtube_cookies.txt');
    fs.writeFileSync(cookiesPath, txt, 'utf8');
    return { success:true, count: cookies.length };
  } catch(e) {
    return { success:false, error: e.message };
  }
});

// ─── Native clipboard ────────────────────────────────────────────────────────
ipcMain.handle('clipboard:read', () => {
  const { clipboard } = require('electron');
  return clipboard.readText() || '';
});

ipcMain.handle('clipboard:write', (_, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(text);
  return true;
});

// ─── Import URL list from .txt file ──────────────────────────────────────────
ipcMain.handle('import:urllist', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Uvezi listu linkova',
    filters: [{ name: 'Text files', extensions: ['txt','csv'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return { urls: [] };
  try {
    const text = fs.readFileSync(filePaths[0], 'utf-8');
    const urls = text.split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.startsWith('http'));
    return { urls };
  } catch(e) { return { urls: [], error: e.message }; }
});

// ─── QR code generation ───────────────────────────────────────────────────────
ipcMain.handle('qr:generate', async (_, text) => {
  try {
    const QRCode = require('qrcode');
    const dataUrl = await QRCode.toDataURL(text, { width: 256, margin: 2,
      color: { dark:'#c4b5fd', light:'#07071a' } });
    return { success: true, dataUrl };
  } catch(e) { return { success: false, error: e.message }; }
});

// ─── Scheduled downloads ──────────────────────────────────────────────────────
ipcMain.handle('schedule:remove', (_, id) => {
  if (scheduledJobs.has(id)) { scheduledJobs.get(id).cancel(); scheduledJobs.delete(id); }
  return { success: true };
});

// ─── Start download ───────────────────────────────────────────────────────────
function startDownload(win, item) {
  const settings = readJSON(FILES.settings, DEFAULT_SETTINGS);
  const bin = ytdlpBin();
  if (!bin) {
    broadcastDownloadEvent({ id:item.id, type:'error', message:'yt-dlp nije instaliran. Idi u Postavke → Instaliraj automatski.' });
    return;
  }

  // Clean URL — strip playlist params unless playlist mode is on
  const cleanedUrl = cleanUrl(item.url, !!item.playlist);

  const outDir  = item.outDir || settings.downloadPath || app.getPath('downloads');
  const outTmpl = path.join(outDir, '%(title)s.%(ext)s');
  const isAudio = item.format === 'mp3' || item.audioOnly;
  const ff      = ffmpegBin();
  const hasFf   = !!ff;
  const h       = parseInt(item.quality || 'best');

  // Detect platform for format strategy
  const isTikTok    = /tiktok\.com/.test(item.url);
  const isInstagram = /instagram\.com/.test(item.url);
  const isTwitter   = /twitter\.com|x\.com/.test(item.url);
  const isFacebook  = /facebook\.com|fb\.watch/.test(item.url);
  const isReddit    = /reddit\.com/.test(item.url);
  const isDailymotion = /dailymotion\.com/.test(item.url);
  const isTwitch    = /twitch\.tv/.test(item.url);
  const isNonYT     = isTikTok || isInstagram || isTwitter || isFacebook || isReddit || isDailymotion || isTwitch;

  let fmt;
  if (isAudio) {
    fmt = 'bestaudio[ext=m4a]/bestaudio/best';
  } else if (isNonYT) {
    // These platforms serve pre-merged single-stream formats
    // Do NOT use height filter — not all support it
    fmt = 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio/best';
  } else if (hasFf) {
    // YouTube, Vimeo etc. WITH ffmpeg — merge separate streams
    if (isNaN(h)) {
      fmt = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
    } else {
      fmt = 'bestvideo[height<=' + h + '][ext=mp4]+bestaudio[ext=m4a]' +
            '/bestvideo[height<=' + h + ']+bestaudio' +
            '/best[height<=' + h + ']';
    }
  } else {
    // YouTube WITHOUT ffmpeg — use pre-merged formats
    fmt = '22/18/best[ext=mp4]/best';
  }

  const args = ['--newline', '--progress', '--no-warnings', '-o', outTmpl, '-f', fmt];

  if (item.playlist) args.push('--yes-playlist');
  else args.push('--no-playlist');

  if (item.clipFrom && item.clipTo) {
    args.push('--download-sections', '*' + item.clipFrom + '-' + item.clipTo, '--force-keyframes-at-cuts');
  }
  if (item.subtitles) args.push('--write-auto-sub', '--write-sub', '--sub-lang', 'en,bs,sr,hr', '--convert-subs', 'srt');
  if (item.thumbOnly) args.push('--write-thumbnail', '--skip-download', '--convert-thumbnails', 'jpg');

  if (isAudio && hasFf) {
    // Has ffmpeg: convert to mp3
    args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
    args.push('--ffmpeg-location', path.dirname(ff));
  }
  // isAudio without ffmpeg: no extra args — yt-dlp saves m4a directly, exits cleanly
  if (!isAudio && hasFf) {
    args.push('--merge-output-format', 'mp4', '--ffmpeg-location', path.dirname(ff));
  }

  // Platform-specific fixes
  if (isTikTok) {
    // TikTok requires these specific args to work
    args.push('--extractor-args', 'tiktok:api_hostname=api22-normal-c-useast2a.tiktokv.com');
    args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    args.push('--add-header', 'Referer:https://www.tiktok.com/');
    args.push('--add-header', 'Accept-Language:en-US,en;q=0.9');
    args.push('--no-check-certificates');
  }
  if (isInstagram) {
    args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    args.push('--add-header', 'Referer:https://www.instagram.com/');
    args.push('--no-check-certificates');
  }
  if (isFacebook) {
    args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    args.push('--add-header', 'Referer:https://www.facebook.com/');
  }
  if (isTwitter) {
    args.push('--no-check-certificates');
  }

  args.push('--', cleanedUrl);

  broadcastDownloadEvent({ id:item.id, type:'started' });

  const proc = spawn(bin, args, { stdio:['ignore','pipe','pipe'], detached:false, windowsHide:true });
  if (!proc || !proc.pid) {
    broadcastDownloadEvent({ id:item.id, type:'error', message:'Ne mogu pokrenuti yt-dlp' });
    return;
  }
  activeProcesses.set(item.id, proc);

  let filePath   = '';
  let stderrBuf  = '';

  proc.stdout.on('data', data => {
    data.toString().split('\n').forEach(line => {
      if (!line.trim()) return;
      const parsed = parseLine(line);
      if (!parsed) return;
      if (parsed.type === 'destination') filePath = parsed.filePath;
      if (parsed.type === 'finalpath')   filePath = parsed.filePath;
      broadcastDownloadEvent({ id:item.id, ...parsed, filePath });
    });
  });

  proc.stderr.on('data', d => { stderrBuf += d.toString(); });

  proc.on('close', code => {
    activeProcesses.delete(item.id);
    const ok = code === 0;

    if (!ok) {
      const errMsg = stderrBuf.trim().split('\n').filter(l => l.trim()).pop() || ('Exit code ' + code);
      broadcastDownloadEvent({ id:item.id, type:'error', message:errMsg });
    }

    // Resolve final file path
    let finalPath = filePath;
    if (ok && finalPath && !fs.existsSync(finalPath)) {
      const dir  = path.dirname(finalPath);
      const base = path.basename(finalPath, path.extname(finalPath));
      const exts = isAudio ? ['.mp3','.m4a','.ogg','.opus'] : ['.mp4','.mkv','.webm','.avi'];
      for (const ext of exts) {
        const c = path.join(dir, base + ext);
        if (fs.existsSync(c)) { finalPath = c; break; }
      }
      if (!fs.existsSync(finalPath) && fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir)
            .filter(f => exts.some(e => f.endsWith(e)))
            .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
            .sort((a, b) => b.t - a.t);
          if (files.length) finalPath = path.join(dir, files[0].f);
        } catch {}
      }
    }
    if (!finalPath) finalPath = outDir;

    if (ok) {
      // Update stats
      const stats = readJSON(FILES.stats, DEFAULT_STATS);
      stats.totalDownloads = (stats.totalDownloads || 0) + 1;
      const fmt2 = isAudio ? 'mp3' : (item.format || 'mp4');
      stats.byFormat[fmt2] = (stats.byFormat[fmt2] || 0) + 1;
      try {
        const host = new URL(item.url).hostname.replace('www.', '');
        stats.bySource[host] = (stats.bySource[host] || 0) + 1;
      } catch {}
      const day = new Date().toISOString().slice(0, 10);
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
      writeJSON(FILES.stats, stats);

      if (settings.saveHistory) {
        const history = readJSON(FILES.downloads, []);
        const idx = history.findIndex(h2 => h2.id === item.id);
        const rec = { id:item.id, url:item.url, title:item.title||item.url,
          format:isAudio?'mp3':(item.format||'mp4'), quality:item.quality,
          filePath:finalPath, completedAt:new Date().toISOString() };
        if (idx >= 0) history[idx] = rec; else history.unshift(rec);
        if (history.length > 500) history.splice(500);
        writeJSON(FILES.downloads, history);
      }

      if (settings.notifications && Notification.isSupported()) {
        new Notification({ title:'ACMigo – Download završen', body:item.title||'Gotovo!' }).show();
      }
    }

    broadcastDownloadEvent({
      id:item.id,
      type: ok ? 'completed' : 'failed',
      filePath: finalPath,
      message: ok ? 'Download završen' : ('Exit code ' + code),
    });

  });

  proc.on('error', err => {
    activeProcesses.delete(item.id);
    broadcastDownloadEvent({ id:item.id, type:'error', message:err.message });
  });
}

// ─── Windows ──────────────────────────────────────────────────────────────────
let mainWindow = null;
let miniWindow = null;

function createWindow() {
  // Clean slate every time
  activeProcesses.clear();

  mainWindow = new BrowserWindow({
    width:1280, height:800, minWidth:900, minHeight:600,
    frame:false, transparent:false, titleBarStyle:'hidden',
    backgroundColor:'#07071a',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: { preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false, webviewTag:true, webSecurity:false },
  });

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode:'detach' });
  } else {
    // Permissive CSP for YouTube webview
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    delete headers['content-security-policy'];
    delete headers['Content-Security-Policy'];
    callback({ responseHeaders: headers });
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }


}

function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) { miniWindow.show(); miniWindow.focus(); return; }
  miniWindow = new BrowserWindow({
    width:280, height:260, minWidth:240, minHeight:160,
    frame:false, transparent:true, alwaysOnTop:true,
    resizable:true, skipTaskbar:true,
    webPreferences: { preload:path.join(__dirname,'preload-mini.js'), contextIsolation:true },
  });
  miniWindow.loadFile(path.join(__dirname, 'mini.html'));
  miniWindow.on('closed', () => { miniWindow = null; });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  activeProcesses.clear();

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

  const reminders = readJSON(FILES.reminders, []);
  reminders.forEach(r => scheduleReminder(r));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  for (const [, proc] of activeProcesses.entries()) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { stdio:'ignore' });
      } else {
        proc.kill('SIGKILL');
      }
    } catch {}
  }
  activeProcesses.clear();
});

// ─── Reminders ────────────────────────────────────────────────────────────────
const scheduledJobs = new Map();
function scheduleReminder(r) {
  if (scheduledJobs.has(r.id)) scheduledJobs.get(r.id).cancel();
  const date = new Date(r.datetime);
  if (date <= new Date()) return;
  const job = schedule.scheduleJob(date, () => {
    if (Notification.isSupported()) new Notification({ title:'🔔 ACMigo Podsjetnik', body:r.message }).show();
    if (mainWindow) { mainWindow.webContents.send('reminder:fired', r); mainWindow.show(); mainWindow.focus(); }
  });
  scheduledJobs.set(r.id, job);
}

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('win:close',    () => mainWindow?.close());
ipcMain.on('mini:open',    () => createMiniWindow());
ipcMain.on('mini:close',   () => miniWindow && !miniWindow.isDestroyed() && miniWindow.hide());

ipcMain.handle('settings:get', () => readJSON(FILES.settings, DEFAULT_SETTINGS));
ipcMain.handle('settings:set', (_, data) => {
  const merged = { ...readJSON(FILES.settings, DEFAULT_SETTINGS), ...data };
  writeJSON(FILES.settings, merged);
  return merged;
});

ipcMain.handle('dialog:selectDir', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties:['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

// DOWNLOAD START — React manages queue, main just starts one item
ipcMain.handle('download:start', (_, item) => {
  if (!item || !item.url || !item.url.startsWith('http')) return { started:false };
  if (activeProcesses.has(item.id)) return { started:false };
  startDownload(mainWindow, item);
  return { started:true };
});

ipcMain.handle('download:cancel', (_, id) => {
  const proc = activeProcesses.get(id);
  if (proc) {
    try { proc.kill('SIGTERM'); } catch {}
    activeProcesses.delete(id);
    return true;
  }
  return false;
});

ipcMain.handle('download:cancelAll', () => {
  for (const [id, proc] of activeProcesses.entries()) {
    try { if (process.platform === 'win32') spawn('taskkill',['/pid',String(proc.pid),'/f','/t'],{stdio:'ignore'}); else proc.kill('SIGKILL'); } catch {}
    mainWindow?.webContents.send('download:event', { id, type:'cancelled' });
  }
  activeProcesses.clear();
  return true;
});

ipcMain.handle('download:clearAll', () => {
  for (const [, proc] of activeProcesses.entries()) {
    try { if (process.platform === 'win32') spawn('taskkill',['/pid',String(proc.pid),'/f','/t'],{stdio:'ignore'}); else proc.kill('SIGKILL'); } catch {}
  }
  activeProcesses.clear();
  return true;
});

ipcMain.handle('download:history',      () => readJSON(FILES.downloads, []));
ipcMain.handle('download:clearHistory', () => { writeJSON(FILES.downloads, []); return true; });

ipcMain.handle('video:info', async (_, url) => {
  const bin = ytdlpBin();
  if (!bin) throw new Error('yt-dlp nije instaliran');
  return new Promise((resolve, reject) => {
    let out = '';
    const proc = spawn(bin, ['--dump-json','--no-playlist','--',url], { stdio:['ignore','pipe','pipe'] });
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('Ne mogu dohvatiti info'));
      try { resolve(JSON.parse(out)); } catch(e) { reject(e); }
    });
  });
});

ipcMain.handle('ytdlp:status', async () => {
  const bin = ytdlpBin();
  const ff  = ffmpegBin();
  if (!bin) return { installed:false, ffmpeg: !!ff };
  try {
    const ver = execSync('"' + bin + '" --version', { stdio:['pipe','pipe','pipe'] }).toString().trim();
    return { installed:true, version:ver, path:bin, ffmpeg: !!ff, ffmpegPath: ff || null };
  } catch { return { installed:false, ffmpeg: !!ff }; }
});

ipcMain.handle('ytdlp:install', async () => {
  const url  = ytdlpDownloadUrl();
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const dest = path.join(BIN_DIR, name);
  try {
    await downloadFile(url, dest, pct => mainWindow?.webContents.send('ytdlp:install-progress', pct));
    if (process.platform !== 'win32') fs.chmodSync(dest, 0o755);
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
});

ipcMain.handle('ytdlp:update', async () => {
  const bin = ytdlpBin();
  if (!bin) return { success:false, error:'Nije instaliran' };
  try { execSync('"' + bin + '" -U', { stdio:['pipe','pipe','pipe'] }); return { success:true }; }
  catch(e) { return { success:false, error:e.message }; }
});

ipcMain.handle('stats:get', () => readJSON(FILES.stats, DEFAULT_STATS));

ipcMain.handle('reminders:list',   () => readJSON(FILES.reminders, []));
ipcMain.handle('reminders:add',    (_, r) => {
  const list = readJSON(FILES.reminders, []);
  const rec  = { ...r, id:crypto.randomUUID(), createdAt:new Date().toISOString() };
  list.push(rec);
  writeJSON(FILES.reminders, list);
  scheduleReminder(rec);
  return rec;
});
ipcMain.handle('reminders:delete', (_, id) => {
  let list = readJSON(FILES.reminders, []);
  list = list.filter(r => r.id !== id);
  writeJSON(FILES.reminders, list);
  if (scheduledJobs.has(id)) { scheduledJobs.get(id).cancel(); scheduledJobs.delete(id); }
  return true;
});

ipcMain.handle('shell:openPath',          (_, p)   => shell.openPath(p));
ipcMain.handle('shell:showItemInFolder',  (_, p)   => {
  if (!p) return;
  if (fs.existsSync(p)) shell.showItemInFolder(p);
  else { const dir = path.dirname(p); shell.openPath(fs.existsSync(dir) ? dir : app.getPath('downloads')); }
});
ipcMain.handle('shell:openExternal',      (_, url) => shell.openExternal(url));

ipcMain.handle('convert:selectFiles', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties:['openFile','multiSelections'],
    filters:[{ name:'Media files', extensions:['mp4','mkv','webm','avi','mov','ts','mts','m2ts','flv','wmv','3gp','mpg','mpeg','m4v','mp3','m4a','wav','ogg','flac','aac','wma'] }, { name:'All files', extensions:['*'] }],
  });
  return r.canceled ? [] : r.filePaths;
});

ipcMain.handle('convert:file', async (_, srcPath, targetExt, outDir) => {
  const ff = ffmpegBin();
  if (!ff) return { success:false, error:'ffmpeg nije pronađen. Provjeri Settings.' };

  // Check file exists
  if (!fs.existsSync(srcPath)) {
    return { success:false, error:'Fajl nije pronađen: ' + srcPath };
  }

  // Output path
  const srcExt   = path.extname(srcPath);
  const baseName = path.basename(srcPath, srcExt);
  const srcDir   = path.dirname(srcPath);
  const destDir  = outDir || srcDir;

  // Avoid overwriting source with same name+ext
  let outName = baseName + '.' + targetExt;
  if (path.join(destDir, outName) === srcPath) {
    outName = baseName + '_converted.' + targetExt;
  }
  let outPath   = path.join(destDir, outName);

  const AUDIO_EXTS = ['mp3','m4a','wav','ogg','flac','aac','opus'];
  const isTargetAudio = AUDIO_EXTS.includes(targetExt);

  // Log for debugging
  console.log('[Convert] src:', srcPath);
  console.log('[Convert] out:', outPath);
  console.log('[Convert] ff:', ff);

  const args = [
    '-hide_banner',
    '-loglevel', 'warning',  // less noise, still shows errors
    '-y',
    '-i', srcPath,
  ];

  if (targetExt === 'mp3') {
    args.push('-vn');           // remove video stream
    args.push('-acodec', 'libmp3lame');
    args.push('-q:a', '2');     // high quality VBR
  } else if (targetExt === 'wav') {
    args.push('-vn');
    args.push('-acodec', 'pcm_s16le');
  } else if (targetExt === 'm4a') {
    args.push('-vn');
    args.push('-acodec', 'aac', '-b:a', '192k');
  } else if (targetExt === 'ogg') {
    args.push('-vn');
    args.push('-acodec', 'libvorbis', '-q:a', '5');
  } else if (targetExt === 'flac') {
    args.push('-vn');
    args.push('-acodec', 'flac');
  } else if (targetExt === 'mp4') {
    args.push('-vcodec', 'libx264', '-acodec', 'aac');
    args.push('-crf', '23', '-preset', 'fast');
  } else if (targetExt === 'mkv') {
    args.push('-vcodec', 'copy', '-acodec', 'copy');
  } else if (targetExt === 'webm') {
    args.push('-vcodec', 'libvpx-vp9', '-acodec', 'libopus');
    args.push('-crf', '30', '-b:v', '0');
  } else if (targetExt === 'avi') {
    args.push('-vcodec', 'libxvid', '-acodec', 'libmp3lame');
  } else if (targetExt === 'mov') {
    args.push('-vcodec', 'copy', '-acodec', 'copy');
  } else if (targetExt === 'ts') {
    // Transport Stream — copy streams without re-encoding
    args.push('-vcodec', 'copy', '-acodec', 'copy');
  } else if (targetExt === 'flv') {
    args.push('-vcodec', 'libx264', '-acodec', 'aac', '-ar', '44100');
  } else if (targetExt === 'wmv') {
    args.push('-vcodec', 'wmv2', '-acodec', 'wmav2');
  } else if (targetExt === 'ogg') {
    args.push('-vcodec', 'libtheora', '-acodec', 'libvorbis', '-q:v', '5', '-q:a', '5');
  }
  // Default: no extra args — let ffmpeg decide best codec

  args.push('-progress', 'pipe:2', outPath);

  return new Promise(resolve => {
    const proc = spawn(ff, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stderrOut = '';
    let durationSec = 0;

    proc.stderr.on('data', d => {
      const txt = d.toString();
      stderrOut += txt;

      // Duration
      const durMatch = txt.match(/Duration: (\d+):(\d+):(\d+\.?\d*)/);
      if (durMatch) {
        durationSec = parseInt(durMatch[1])*3600 + parseInt(durMatch[2])*60 + parseFloat(durMatch[3]);
      }

      // Progress via out_time
      const outTimeMatch = txt.match(/out_time=(\d+):(\d+):(\d+\.?\d*)/);
      if (outTimeMatch && durationSec > 0) {
        const cur = parseInt(outTimeMatch[1])*3600 + parseInt(outTimeMatch[2])*60 + parseFloat(outTimeMatch[3]);
        const pct = Math.min(99, Math.round((cur / durationSec) * 100));
        mainWindow?.webContents.send('convert:progress', { path: srcPath, pct });
      }

      // Fallback: time=
      const timeMatch = txt.match(/time=(\d+):(\d+):(\d+\.?\d*)/);
      if (timeMatch && durationSec > 0 && !outTimeMatch) {
        const cur = parseInt(timeMatch[1])*3600 + parseInt(timeMatch[2])*60 + parseFloat(timeMatch[3]);
        const pct = Math.min(99, Math.round((cur / durationSec) * 100));
        mainWindow?.webContents.send('convert:progress', { path: srcPath, pct });
      }
    });

    proc.on('close', code => {
      mainWindow?.webContents.send('convert:progress', { path: srcPath, pct: 100 });
      if (code === 0) {
        resolve({ success: true, outPath });
      } else {
        // Get most relevant error line
        const errLines = stderrOut.split('\n').filter(l => l.trim() && !l.startsWith('ffmpeg version') && !l.startsWith('  '));
        const errMsg = errLines.filter(l => /error|invalid|cannot|no such|failed/i.test(l)).pop()
                    || errLines.pop()
                    || ('ffmpeg greška kod ' + code);
        resolve({ success: false, error: errMsg.trim() });
      }
    });
    proc.on('error', e => resolve({ success: false, error: 'Ne mogu pokrenuti ffmpeg: ' + e.message }));
  });
});
