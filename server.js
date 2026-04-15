const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(cors());
app.use(express.json());

// Files directory
const filesDir = path.join(__dirname, 'files');
['Desktop', 'Documents', 'Pictures', 'Music', 'Downloads', 'Videos'].forEach(f => {
  const dir = path.join(filesDir, f);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Session
const sessionId = Date.now().toString(36);
const userEmail = `user@webos-${sessionId}.local`;
console.log(`User email: ${userEmail}`);

// File functions
function saveFileToFolder(filePath, content) {
  const fullPath = path.join(filesDir, filePath.replace(/\//g, path.sep));
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content || '');
}

function readFileAsBase64(filePath) {
  const fullPath = path.join(filesDir, filePath.replace(/\//g, path.sep));
  if (fs.existsSync(fullPath)) {
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeTypes = { 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml', 'mp4': 'video/mp4', 'webm': 'video/webm', 'avi': 'video/x-msvideo', 'mov': 'video/quicktime', 'mkv': 'video/x-matroska' };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    return `data:${mime};base64,${fs.readFileSync(fullPath).toString('base64')}`;
  }
  return null;
}

function deleteFileFromFolder(filePath) {
  const fullPath = path.join(filesDir, filePath.replace(/\//g, path.sep));
  if (fs.existsSync(fullPath)) { fs.unlinkSync(fullPath); return true; }
  return false;
}

function getAllFiles(dir = filesDir, baseDir = filesDir) {
  let results = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(item => {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (item.isDirectory()) results = results.concat(getAllFiles(fullPath, baseDir));
    else results.push({ name: item.name, path: '/' + relativePath, size: fs.statSync(fullPath).size });
  });
  return results;
}

// API
app.get('/api/session', (req, res) => {
  const username = (req.query.name || 'User').trim() || 'User';
  const uniquePart = req.query.id || sessionId.slice(-6);
  const userEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}_${uniquePart}@webos.local`;
  res.json({ sessionId, email: userEmail, name: username });
});

app.get('/api/media', (req, res) => {
  const allFiles = getAllFiles();
  const images = allFiles.filter(f => ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(f.name.split('.').pop().toLowerCase()));
  const videos = allFiles.filter(f => ['mp4','webm','avi','mov','mkv'].includes(f.name.split('.').pop().toLowerCase()));
  res.json({ images, videos, all: allFiles });
});

app.get('/api/files', (req, res) => {
  const allFiles = getAllFiles();
  const result = {};
  allFiles.forEach(f => {
    const folder = f.path.split('/')[1] || 'root';
    if (!result[folder]) result[folder] = [];
    const ext = f.name.split('.').pop().toLowerCase();
    const isImg = ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext);
    const isVid = ['mp4','webm','avi','mov','mkv'].includes(ext);
    const isMusic = ['mp3','wav','ogg','m4a','flac'].includes(ext);
    let thumb = null;
    if (isImg) thumb = readFileAsBase64(f.path);
    result[folder].push({ name: f.name, path: f.path, size: f.size, isImg, isVid, isMusic, thumb });
  });
  res.json(result);
});

app.get('/api/file/read/json', (req, res) => {
  const content = readFileAsBase64(req.query.path);
  if (content) res.json({ success: true, content });
  else res.json({ success: false, error: 'File not found' });
});

app.get('/api/file/audio', (req, res) => {
  const content = readFileAsBase64(req.query.path);
  if (content) {
    const ext = req.query.path.split('.').pop().toLowerCase();
    const mimeTypes = { 'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'm4a': 'audio/mp4', 'flac': 'audio/flac' };
    res.set('Content-Type', mimeTypes[ext] || 'audio/mpeg');
    res.send(Buffer.from(content.split(',')[1], 'base64'));
  } else {
    res.status(404).send('File not found');
  }
});

app.get('/api/file/video', (req, res) => {
  const content = readFileAsBase64(req.query.path);
  if (content) {
    const ext = req.query.path.split('.').pop().toLowerCase();
    const mimeTypes = { 'mp4': 'video/mp4', 'webm': 'video/webm', 'avi': 'video/x-msvideo', 'mov': 'video/quicktime', 'mkv': 'video/x-matroska' };
    res.set('Content-Type', mimeTypes[ext] || 'video/mp4');
    res.send(Buffer.from(content.split(',')[1], 'base64'));
  } else {
    res.status(404).send('File not found');
  }
});

app.post('/api/file/save', (req, res) => { saveFileToFolder(req.body.filePath, req.body.content); res.json({ success: true }); });

app.post('/api/file/move', (req, res) => {
  const src = path.join(filesDir, req.body.srcPath.replace(/\//g, path.sep));
  const dest = path.join(filesDir, req.body.destPath.replace(/\//g, path.sep));
  if (!fs.existsSync(src)) { res.json({ success: false }); return; }
  fs.renameSync(src, dest);
  res.json({ success: true });
});

app.delete('/api/file/delete', (req, res) => res.json({ success: deleteFileFromFolder(req.body.filePath) }));

// Mail
const mailMessages = [];
app.get('/api/mail/messages', (req, res) => res.json(mailMessages));
app.post('/api/mail/send', (req, res) => {
  mailMessages.push({ id: Date.now(), from: userEmail, ...req.body, time: new Date().toLocaleTimeString(), date: new Date().toDateString() });
  res.json({ success: true });
});

// Store
const availableApps = [
  { id: 'notepad', name: 'Notepad', icon: 'file-text', size: '2 MB' },
  { id: 'explorer', name: 'File Explorer', icon: 'folder-open', size: '3 MB' },
  { id: 'settings', name: 'Settings', icon: 'settings', size: '4 MB' },
  { id: 'terminal', name: 'Terminal', icon: 'terminal', size: '5 MB' },
  { id: 'calculator', name: 'Calculator', icon: 'calculator', size: '1 MB' },
  { id: 'browser', name: 'Edge', icon: 'globe', size: '15 MB' },
  { id: 'paint', name: 'Paint', icon: 'palette', size: '8 MB' },
  { id: 'music', name: 'Music', icon: 'music', size: '12 MB' },
  { id: 'taskmgr', name: 'Task Manager', icon: 'activity', size: '3 MB' },
  { id: 'calendar', name: 'Calendar', icon: 'calendar-days', size: '2 MB' },
  { id: 'weather', name: 'Weather', icon: 'cloud-sun', size: '4 MB' },
  { id: 'clock', name: 'Clock', icon: 'clock', size: '2 MB' },
  { id: 'gallery', name: 'Gallery', icon: 'images', size: '6 MB' },
  { id: 'video', name: 'Videos', icon: 'video', size: '10 MB' },
  { id: 'mail', name: 'Mail', icon: 'mail', size: '8 MB' },
  { id: 'store', name: 'Store', icon: 'store', size: '5 MB' },
  { id: 'chat', name: 'Chat', icon: 'message-circle', size: '6 MB' },
  { id: 'recycle', name: 'Recycle Bin', icon: 'trash-2', size: '0 MB' },
  { id: 'developer', name: 'Developer', icon: 'user-round-cog', size: '10 MB' }
];
const installedApps = [];
app.get('/api/store/apps', (req, res) => res.json({ available: availableApps, installed: installedApps }));
app.post('/api/store/install', (req, res) => {
  const app = availableApps.find(a => a.id === req.body.appId);
  if (app && !installedApps.find(i => i.id === app.id)) { installedApps.push(app); res.json({ success: true }); }
  else res.json({ success: false });
});
app.post('/api/store/uninstall', (req, res) => {
  const idx = installedApps.findIndex(a => a.id === req.body.appId);
  if (idx > -1) { installedApps.splice(idx, 1); res.json({ success: true }); }
  else res.json({ success: false });
});

// Chat
const chatUsers = new Map(), chatMessages = [];
io.on('connection', (socket) => {
  socket.on('chat-join', (data) => {
    chatUsers.set(socket.id, { id: socket.id, name: data.name || 'Anonymous' });
    io.emit('chat-users', Array.from(chatUsers.values()));
    socket.emit('chat-messages', chatMessages.slice(-100));
  });
  socket.on('chat-message', (data) => {
    const user = chatUsers.get(socket.id);
    if (user) {
      const msg = { id: Date.now(), user: user.name, text: data.text, time: new Date().toLocaleTimeString(), localId: data.localId };
      chatMessages.push(msg);
      io.emit('chat-message', msg);
    }
  });
  socket.on('disconnect', () => { chatUsers.delete(socket.id); io.emit('chat-users', Array.from(chatUsers.values())); });
});

// Save localStorage
app.post('/api/localstorage/save', (req, res) => {
  fs.writeFileSync(path.join(__dirname, 'localStorage.json'), JSON.stringify(req.body, null, 2));
  if (req.body['wos_fs']) Object.keys(req.body['wos_fs']).forEach(k => { if (req.body['wos_fs'][k].type === 'file') saveFileToFolder(k, req.body['wos_fs'][k].content || ''); });
  res.json({ success: true });
});

// Static files
app.use(express.static(__dirname));

// Init
const localStorageData = fs.existsSync(path.join(__dirname, 'localStorage.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'localStorage.json'), 'utf8')) : null;
if (localStorageData && localStorageData['wos_fs']) {
  Object.keys(localStorageData['wos_fs']).forEach(k => { if (localStorageData['wos_fs'][k].type === 'file') saveFileToFolder(k, localStorageData['wos_fs'][k].content || ''); });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`WebOS running on http://localhost:${PORT}`));