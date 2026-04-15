const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"] 
  } 
});

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
  const userEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}_${uniquePart}@webos`;
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
app.get('/api/mail/messages', (req, res) => {
  const userEmailHeader = req.headers['x-user-email'] || userEmail;
  const filtered = mailMessages.filter(m => m.to === userEmailHeader || m.from === userEmailHeader);
  res.json(filtered);
});
app.post('/api/mail/send', (req, res) => {
  const userEmailHeader = req.headers['x-user-email'] || userEmail;
  mailMessages.push({ 
    id: Date.now(), 
    from: userEmailHeader, 
    ...req.body, 
    time: new Date().toLocaleTimeString(), 
    date: new Date().toDateString(),
    sentBy: userEmailHeader
  });
  res.json({ success: true });
});
app.get('/api/mail/inbox', (req, res) => {
  const userEmailHeader = req.headers['x-user-email'] || userEmail;
  const inbox = mailMessages.filter(m => m.to === userEmailHeader);
  res.json(inbox);
});
app.get('/api/mail/sent', (req, res) => {
  const userEmailHeader = req.headers['x-user-email'] || userEmail;
  const sent = mailMessages.filter(m => m.from === userEmailHeader);
  res.json(sent);
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
      const msg = { 
        id: Date.now(), 
        user: user.name, 
        text: data.text, 
        time: new Date().toLocaleTimeString(), 
        localId: data.localId 
      };
      chatMessages.push(msg);
      io.emit('chat-message', msg);
    }
  });
  socket.on('disconnect', () => { 
    chatUsers.delete(socket.id); 
    io.emit('chat-users', Array.from(chatUsers.values())); 
  });
});

// Save localStorage
app.post('/api/localstorage/save', (req, res) => {
  const storagePath = path.join(__dirname, 'localStorage.json');
  fs.writeFileSync(storagePath, JSON.stringify(req.body, null, 2));
  if (req.body['wos_fs']) {
    Object.keys(req.body['wos_fs']).forEach(k => { 
      if (req.body['wos_fs'][k].type === 'file') saveFileToFolder(k, req.body['wos_fs'][k].content || ''); 
    });
  }
  res.json({ success: true });
});

// Static files
app.use(express.static(__dirname));

// Init
const storageFile = path.join(__dirname, 'localStorage.json');
if (fs.existsSync(storageFile)) {
    try {
        const localStorageData = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
        if (localStorageData && localStorageData['wos_fs']) {
          Object.keys(localStorageData['wos_fs']).forEach(k => { 
            if (localStorageData['wos_fs'][k].type === 'file') saveFileToFolder(k, localStorageData['wos_fs'][k].content || ''); 
          });
        }
    } catch (e) { console.error("Initialization error:", e); }
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Dynamic Port Handling for Deployment
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`WebOS running on port ${PORT}`));
