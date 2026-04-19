const APPS = {
  notepad:    { name:'Notepad',       icon:'file-text',      w:720,  h:520, pinned:false },
  explorer:   { name:'File Explorer', icon:'folder-open',    w:920,  h:600, pinned:true },
  settings:   { name:'Settings',      icon:'settings',       w:820,  h:600, pinned:true },
  terminal:   { name:'Terminal',      icon:'terminal',       w:740,  h:500, pinned:false },
  calculator: { name:'Calculator',    icon:'calculator',     w:320,  h:510, pinned:false },
  browser:    { name:'Edge',          icon:'globe',          w:1000, h:680, pinned:false },
  paint:      { name:'Paint',         icon:'palette',        w:860,  h:600, pinned:false },
  music:      { name:'Music',         icon:'music',          w:480,  h:560, pinned:true },
  recycle:    { name:'Recycle Bin',   icon:'trash-2',        w:440,  h:460, pinned:false },
  developer:  { name:'Developer',     icon:'user-round-cog', w:1000,  h:570, pinned:false},
  taskmgr:    { name:'Task Manager',  icon:'activity',       w:520,  h:480, pinned:false },
  calendar:   { name:'Calendar',      icon:'calendar-days',  w:420,  h:580, pinned:false },
  weather:    { name:'Weather',       icon:'cloud-sun',      w:380,  h:500, pinned:false },
  clock:      { name:'Clock',         icon:'clock',          w:500,  h:500, pinned:false },
  gallery:    { name:'Gallery',       icon:'images',         w:720,  h:520, pinned:false },
  'gallery-viewer': { name:'Image Viewer', icon:'image',      w:900,  h:700, pinned:false },
  'video-player': { name:'Video Player', icon:'play-circle',   w:1000, h:700, pinned:false },
  video:      { name:'Videos',        icon:'video',          w:800,  h:560, pinned:false },
  mail:       { name:'Mail',          icon:'mail',           w:820,  h:580, pinned:false },
  chat:       { name:'Chat',          icon:'message-circle', w:680,  h:560, pinned:false },
};

function lucideIconHtml(name, size = 18) {
  const s = typeof size === 'number' ? size + 'px' : size;
  return `<i data-lucide="${name}" class="lucide-inline" style="width:${s};height:${s}"></i>`;
}
function refreshLucideIcons(root) {
  if (typeof lucide === 'undefined' || !lucide.createIcons) return;
  const opts = { attrs: { 'stroke-width': 1.75 } };
  if (root && root.nodeType === 1) opts.root = root;
  try {
    lucide.createIcons(opts);
  } catch (e) {
    try { lucide.createIcons(); } catch (e2) {}
  }
}

const WALLPAPERS = [
  { name:'Horizon',     bg:'linear-gradient(125deg,#0c1929 0%,#1a3a52 38%,#0d2137 100%)' },
  { name:'Aurora',      bg:'linear-gradient(135deg,#0a1628 0%,#1e3a5f 45%,#0f2840 100%)' },
  { name:'Nebula',      bg:'radial-gradient(ellipse 100% 80% at 20% 20%,#4c1d95 0%,transparent 50%),radial-gradient(ellipse 80% 60% at 80% 70%,#0e7490 0%,transparent 45%),linear-gradient(160deg,#0f172a 0%,#1e1b4b 100%)' },
  { name:'Sunset',      bg:'linear-gradient(160deg,#ff6b6b 0%,#ff8e53 40%,#ffd93d 100%)' },
  { name:'Forest',      bg:'linear-gradient(135deg,#134e5e 0%,#71b280 100%)' },
  { name:'Purple',      bg:'linear-gradient(135deg,#2d1b69 0%,#8b2fc9 100%)' },
  { name:'Ocean',       bg:'linear-gradient(135deg,#005c97 0%,#363795 100%)' },
  { name:'Rose',        bg:'linear-gradient(135deg,#f953c6 0%,#b91d73 100%)' },
  { name:'Carbon',      bg:'linear-gradient(180deg,#18181b 0%,#0a0a0b 100%)' },
];

const ACCENT_COLORS = ['#0078d4','#8764b8','#567c34','#ca5010','#008b8b','#c43e1c','#69797e','#038387'];

/*                                                                
   VIRTUAL FILE SYSTEM
                                                                */
let FS = JSON.parse(localStorage.getItem('wos_fs') || 'null') || {
  '/': { type:'dir' },
  '/Desktop':  { type:'dir' },
  '/Documents':{ type:'dir' },
  '/Pictures': { type:'dir' },
  '/Downloads':{ type:'dir' },
  '/Music':    { type:'dir' },
  '/Documents/Welcome.txt': {
    type:'file', ext:'txt',
    content:'Welcome to WebOS 12!\n\nThis is your virtual file system.\nYou can create, edit, and delete files.\n\nEnjoy the experience!',
    modified: Date.now()
  },
  '/Documents/Notes.txt': {
    type:'file', ext:'txt',
    content:'My Notes\n========\n\n- Learn WebOS\n- Try all the apps\n- Customize the wallpaper',
    modified: Date.now()
  },
  '/Desktop/Readme.txt': {
    type:'file', ext:'txt',
    content: 'Welcome to WebOS 12\n\nSYSTEM CONTROLS:\n- Double-click desktop icons to launch applications.\n- Use the Taskbar at the bottom to switch between open windows.\n- Click the Clock area to view the Notification Center.\n\nDEVELOPER TOOLS:\n- Open the "Developer" app to view system architecture and kernel stats.\n- Use the Terminal for low-level system commands.\n\nPRO TIPS:\n- You can install this OS as a PWA via your browser address bar.\n- Right-click (or long-press) may reveal additional context menus.\n\nEnjoy your refined web experience!',
    modified: Date.now()
  },
};

function saveFS() {
  try { localStorage.setItem('wos_fs', JSON.stringify(FS)); } catch(e){}
  
  // Sync to server
  try {
    const localStorageData = {};
    localStorageData['wos_fs'] = FS;
    fetch('/api/localstorage/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localStorageData)
    }).catch(() => {});
  } catch(e) {}
  
  queueMicrotask(() => notifyFsChanged());
}

const explorerRefreshers = {};
function notifyFsChanged() {
  try {
    buildDesktopIcons();
    Object.keys(explorerRefreshers).forEach(id => {
      const fn = explorerRefreshers[id];
      if (typeof fn === 'function') { try { fn(); } catch (e) {} }
    });
  } catch (e) {}
}

function fsMovePath(srcPath, destDirPath) {
  srcPath = normPath(srcPath);
  destDirPath = normPath(destDirPath);
  const name = srcPath.split('/').filter(Boolean).pop();
  if (!name || !FS[srcPath]) return false;
  const newPath = destDirPath === '/' ? '/' + name : destDirPath + '/' + name;
  if (FS[newPath]) {
    showNotification('File Explorer', 'A file or folder with that name already exists here.', 'folder');
    return false;
  }
  const normSrc = normPath(srcPath);
  if (newPath === normSrc) return true;
  if (normSrc !== '/' && (newPath === normSrc || newPath.startsWith(normSrc + '/'))) {
    showNotification('File Explorer', 'Cannot move a folder into itself.', 'alert-triangle');
    return false;
  }
  FS[newPath] = FS[srcPath];
  delete FS[srcPath];
  const pn = normSrc + '/';
  for (const [k, v] of Object.entries(FS)) {
    if (k.startsWith(pn)) {
      const np = normPath(newPath) + '/' + k.slice(pn.length);
      FS[np] = v;
      delete FS[k];
    }
  }
  
  // Sync move to server
  try {
    fetch('/api/file/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ srcPath, destPath: newPath })
    }).catch(() => {});
  } catch(e) {}
  
  saveFS();
  return true;
}

function fsListDir(path) {
  path = normPath(path);
  const prefix = path === '/' ? '/' : path + '/';
  const items = [];
  for (const [k, v] of Object.entries(FS)) {
    if (k === path) continue;
    if (!k.startsWith(prefix)) continue;
    const rest = k.slice(prefix.length);
    if (!rest.includes('/')) items.push({ path:k, name:rest, ...v });
  }
  return items;
}

function normPath(p) {
  if (!p || p === '/') return '/';
  return p.replace(/\/+$/, '');
}

function fsParent(p) {
  p = normPath(p);
  if (p === '/') return '/';
  const parts = p.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

function fsCreate(dirPath, name, type, content='') {
  const p = normPath(dirPath) + '/' + name;
  if (FS[p]) return false;
  FS[p] = type === 'dir'
    ? { type:'dir' }
    : { type:'file', ext: name.split('.').pop() || 'txt', content, modified: Date.now() };
  saveFS();
  return p;
}

function fsDelete(p) {
  const pn = normPath(p) + '/';
  for (const k of Object.keys(FS)) {
    if (k === p || k.startsWith(pn)) delete FS[k];
  }
  saveFS();
}

let RECYCLE_BIN = JSON.parse(localStorage.getItem('wos_recycle') || '[]');
function saveRecycleBin() {
  try { localStorage.setItem('wos_recycle', JSON.stringify(RECYCLE_BIN)); } catch (e) {}
}

function recyclePath(path) {
  const norm = normPath(path);
  if (!FS[norm]) return false;
  const keys = [norm];
  const pn = norm + '/';
  for (const k of Object.keys(FS)) {
    if (k.startsWith(pn)) keys.push(k);
  }
  const snapshot = {};
  keys.forEach(k => { snapshot[k] = JSON.parse(JSON.stringify(FS[k])); });
  const id = 'rb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  RECYCLE_BIN.push({
    id,
    root: norm,
    name: norm.split('/').filter(Boolean).pop() || norm,
    deleted: Date.now(),
    snapshot
  });
  fsDelete(norm);
  saveRecycleBin();
  return true;
}

function restoreRecycleEntry(entry) {
  const paths = Object.keys(entry.snapshot).sort((a, b) => a.split('/').length - b.split('/').length);
  for (const p of paths) {
    if (FS[p]) {
      showNotification('Recycle Bin', 'Cannot restore: ' + p.split('/').pop() + ' already exists.', 'alert-circle');
      return false;
    }
  }
  paths.forEach(p => { FS[p] = JSON.parse(JSON.stringify(entry.snapshot[p])); });
  RECYCLE_BIN = RECYCLE_BIN.filter(x => x.id !== entry.id);
  saveRecycleBin();
  saveFS();
  return true;
}

function purgeRecycleEntry(id) {
  RECYCLE_BIN = RECYCLE_BIN.filter(x => x.id !== id);
  saveRecycleBin();
}

function emptyRecycleBinPermanently() {
  RECYCLE_BIN = [];
  saveRecycleBin();
}

function fsRename(p, newName) {
  const parent = fsParent(p);
  const newPath = normPath(parent) + '/' + newName;
  const old = FS[p];
  if (!old) return;
  FS[newPath] = old;
  delete FS[p];
  // rename children
  const pn = normPath(p) + '/';
  for (const [k, v] of Object.entries(FS)) {
    if (k.startsWith(pn)) {
      const np = normPath(newPath) + '/' + k.slice(pn.length);
      FS[np] = v;
      delete FS[k];
    }
  }
  saveFS();
}

function fsWrite(p, content) {
  if (FS[p]) { FS[p].content = content; FS[p].modified = Date.now(); saveFS(); }
}

function fileTypeLucide(name, type) {
  if (type === 'dir') return 'folder';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map = {
    txt: 'file-text', md: 'file-text', js: 'file-code', html: 'file-code', css: 'palette',
    json: 'braces', png: 'image', jpg: 'image', gif: 'image', mp3: 'music', mp4: 'video',
    zip: 'archive', pdf: 'file-text', exe: 'cpu'
  };
  return map[ext] || 'file';
}

/*                                                                
   SETTINGS STATE                                                                
                                                                      */
let state = JSON.parse(localStorage.getItem('wos_state') || '{}');
const isNewInstall = !state.installed;
if (isNewInstall) {
  state = {
    sessionId: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    installed: false,
    theme: 'dark',
    wallpaper: 0,
    accent: '#0078d4',
    iconLayout: {},
    brightness: 100,
    notificationsEnabled: true,
    transparencyEnabled: true,
    username: '',
    pinnedApps: [],
    password: ''
  };
}
if (!state.sessionId) { state.sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); saveState(); }
state.theme = state.theme || 'dark';
state.wallpaper = state.wallpaper ?? 0;
state.accent = state.accent || '#0078d4';
if (!state.iconLayout || typeof state.iconLayout !== 'object') state.iconLayout = {};
state.brightness = Math.round(Math.max(10, Math.min(100, Number(state.brightness) || 100)));
state.notificationsEnabled = state.notificationsEnabled !== false;
state.transparencyEnabled = state.transparencyEnabled !== false;

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   FIREBASE CONFIG                                                  
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
const firebaseConfig = {
  apiKey: "AIzaSyBfOtVWIMaZjyKGT3BTtljiADXEkrPE2qA",
  authDomain: "webos-a4010.firebaseapp.com",
  projectId: "webos-a4010",
  storageBucket: "webos-a4010.firebasestorage.app",
  messagingSenderId: "338821714456",
  appId: "1:338821714456:web:e6bf9edcd6a901b875e96d"
};

let db = null;
let currentUserEmail = null;
let currentUserId = null;

function initFirebase() {
  console.log('Firebase loaded:', typeof firebase !== 'undefined');
  if (typeof firebase === 'undefined') return;
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('Firestore initialized:', !!db);
  } catch (e) {
    console.log('Firebase init error:', e);
  }
  
  let storedId = localStorage.getItem('wos_user_id');
  if (!storedId || !/^\d{3}$/.test(storedId)) {
    storedId = String(Math.floor(Math.random() * 900) + 100);
    localStorage.setItem('wos_user_id', storedId);
  }
  currentUserId = storedId;
  console.log('User ID:', currentUserId);
  
  window.addEventListener('beforeunload', () => {
    if (db && currentUserId) {
      firebase.firestore().collection('chat_users').doc(currentUserId).delete();
    }
  });
  
  setupBackgroundListeners();
}

let bgListenersReady = false;

function setupBackgroundListeners() {
  if (!db || !currentUserId || bgListenersReady) return;
  bgListenersReady = true;
  
  const bgUsername = (state && state.username) ? state.username.toLowerCase().replace(/\s/g, '') : 'user';
  const bgEmail = bgUsername + '.' + currentUserId + '@webos';
  
  const lastNotifiedMailId = localStorage.getItem('last_notified_mail') || '';
  const lastNotifiedChatId = localStorage.getItem('last_notified_chat') || '';
  let initialMailLoaded = false;
  let initialChatLoaded = false;
  
  const q = firebase.firestore().collection('mail').where('to', '==', bgEmail).where('unread', '==', true);
  q.onSnapshot((snapshot) => {
    if (!initialMailLoaded) {
      initialMailLoaded = true;
      return;
    }
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const email = change.doc.data();
        if (email.id !== lastNotifiedMailId) {
          showNotification('Mail', `${email.from}: ${email.subject}`, 'mail');
          localStorage.setItem('last_notified_mail', email.id);
        }
      }
    });
  });
  
  firebase.firestore().collection('chat_messages').orderBy('timestamp', 'desc').limit(1).onSnapshot((snapshot) => {
    if (!initialChatLoaded) {
      initialChatLoaded = true;
      return;
    }
    if (!snapshot.empty) {
      const lastMsg = snapshot.docs[0].data();
      if (lastMsg.userId !== currentUserId && lastMsg.id !== lastNotifiedChatId) {
        showNotification('Chat', `${lastMsg.user}: ${lastMsg.text}`, 'message-circle');
        localStorage.setItem('last_notified_chat', lastMsg.id);
      }
    }
  });
}

if (!isNewInstall) {
  state.username = (state.username && String(state.username).trim()) || 'User';
}
state.timezone = state.timezone || 'Africa/Nairobi';
state.region = state.region || 'east-africa';
if (!Array.isArray(state.pinnedApps)) {
  state.pinnedApps = Object.keys(APPS).filter(id => APPS[id].pinned);
}
state.password = state.password || '';
state.locked = state.locked === true;
state.profilePicture = state.profilePicture || 'default';

const TIMEZONE_DATA = {
  'Africa/Nairobi': { offset: 3, name: 'EAT' },
  'Africa/Lagos': { offset: 1, name: 'WAT' },
  'Africa/Johannesburg': { offset: 2, name: 'SAST' },
  'Africa/Cairo': { offset: 2, name: 'EET' },
  'Europe/London': { offset: 0, name: 'GMT' },
  'Europe/Paris': { offset: 1, name: 'CET' },
  'Europe/Moscow': { offset: 3, name: 'MSK' },
  'Europe/Berlin': { offset: 1, name: 'CET' },
  'Europe/Madrid': { offset: 1, name: 'CET' },
  'Asia/Riyadh': { offset: 3, name: 'AST' },
  'Asia/Kolkata': { offset: 5.5, name: 'IST' },
  'Asia/Bangkok': { offset: 7, name: 'ICT' },
  'Asia/Tokyo': { offset: 9, name: 'JST' },
  'Asia/Shanghai': { offset: 8, name: 'CST' },
  'Asia/Dubai': { offset: 4, name: 'GST' },
  'America/New_York': { offset: -5, name: 'EST' },
  'America/Los_Angeles': { offset: -8, name: 'PST' },
  'America/Sao_Paulo': { offset: -3, name: 'BRT' },
  'America/Mexico_City': { offset: -6, name: 'CST' },
  'America/Toronto': { offset: -5, name: 'EST' },
  'America/Jamaica': { offset: -5, name: 'EST' },
  'Australia/Sydney': { offset: 10, name: 'AEST' },
  'Pacific/Auckland': { offset: 12, name: 'NZST' }
};

function saveState() { localStorage.setItem('wos_state', JSON.stringify(state)); }

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function applyBrightness(pct) {
  const v = Math.round(Math.max(10, Math.min(100, Number(pct) || 100)));
  state.brightness = v;
  document.body.style.filter = `brightness(${v}%)`;
  saveState();
  document.querySelectorAll('input[data-brightness-slider]').forEach(el => { el.value = String(v); });
}

function applyTransparency() {
  document.documentElement.classList.toggle('reduce-transparency', state.transparencyEnabled === false);
}

function updateUsernameUI() {
  const el = document.getElementById('start-username');
  if (el) el.textContent = state.username;
}

function launchOrFocusApp(appId) {
  const wins = [...windowsMap.entries()].filter(([, w]) => w.appId === appId);
  const openNorm = wins.find(([, w]) => w.state !== 'minimized');
  if (openNorm) { focusWin(openNorm[0]); return; }
  const min = wins.find(([, w]) => w.state === 'minimized');
  if (min) { restoreWin(min[0]); return; }
  launchApp(appId);
}

function togglePinToTaskbar(appId) {
  const p = [...(state.pinnedApps || [])];
  const i = p.indexOf(appId);
  if (i >= 0) p.splice(i, 1);
  else if (p.length < 16) p.push(appId);
  state.pinnedApps = p;
  saveState();
  updateTaskbar();
}

function youtubeIdFromUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const url = new URL(u);
    const h = url.hostname.replace(/^www\./, '');
    if (h === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      return id && id.length >= 6 ? id : null;
    }
    if (h === 'youtube.com' || h === 'm.youtube.com' || h === 'www.youtube.com' || h.endsWith('.youtube.com')) {
      if (url.pathname.startsWith('/watch')) return url.searchParams.get('v');
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2];
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2];
      if (url.pathname.startsWith('/live/')) return url.pathname.split('/')[2];
    }
  } catch (e) {}
  return null;
}

function applyTheme(t) {
  state.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  saveState();
}

function applyWallpaper(idx) {
  const i = Math.max(0, Math.min(Number(idx) || 0, WALLPAPERS.length - 1));
  state.wallpaper = i;
  document.getElementById('desktop').style.backgroundImage = '';
  document.getElementById('desktop').style.background = WALLPAPERS[i].bg;
  saveState();
}

function applyAccent(color) {
  state.accent = color;
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-hover', color);
  saveState();
}

/*                                                                
   WINDOW MANAGER
                                                                */
const winsLayer = document.getElementById('windows-layer');
let windowsMap  = new Map();  // id ’ { el, appId, state:'normal'|'minimized'|'maximized', prevBounds }
let focusedWin  = null;
let zTop        = 100;
let winCount    = 0;

function createWindow(appId, extra = {}) {
  const app = APPS[appId];
  if (!app) return;

  const id  = `win_${++winCount}`;
  const vw  = winsLayer.offsetWidth  || window.innerWidth;
  const vh  = winsLayer.offsetHeight || (window.innerHeight - 48);
  const w   = Math.min(app.w, vw - 40);
  const h   = Math.min(app.h, vh - 40);
  const x   = Math.round((vw - w) / 2) + (winCount % 5) * 24;
  const y   = Math.round((vh - h) / 2) + (winCount % 5) * 20;

  const el = document.createElement('div');
  el.className = 'window';
  el.id = id;
  el.style.cssText = `width:${w}px;height:${h}px;left:${x}px;top:${y}px;z-index:${++zTop}`;
  
  // Motion One animation for opening
  if (typeof motion !== 'undefined') {
    if (launchOrigin) {
      const originX = launchOrigin.x - x;
      const originY = launchOrigin.y - y;
      motion(el, {
        from: { transform: `translate(${originX}px, ${originY}px) scale(0.1)`, opacity: 0 },
        to: { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        duration: 400,
        easing: 'ease-out',
      });
      launchOrigin = null;
    } else {
      motion(el, {
        from: { transform: 'scale(0.9)', opacity: 0 },
        to: { transform: 'scale(1)', opacity: 1 },
        duration: 250,
        easing: 'ease-out',
      });
    }
  }

  // Build title bar
  el.innerHTML = `
    <div class="win-titlebar" id="${id}_tb">
      <span class="win-icon">${lucideIconHtml(app.icon, 15)}</span>
      <span class="win-title">${extra.title || app.name}</span>
      <div class="win-ctrls">
        <div class="wc-btn wc-min"  title="Minimize" data-id="${id}">
          <svg viewBox="0 0 10 1"><rect width="10" height="1"/></svg>
        </div>
        <div class="wc-btn wc-max"  title="Maximize" data-id="${id}">
          <svg viewBox="0 0 10 10"><rect width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
        </div>
        <div class="wc-btn wc-close" title="Close" data-id="${id}">
          <svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.4"/>
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.4"/></svg>
        </div>
      </div>
    </div>
    <div class="win-content" id="${id}_content"></div>
    <!-- Resize handles -->
    <div class="rh rh-n"  data-id="${id}" data-dir="n"></div>
    <div class="rh rh-s"  data-id="${id}" data-dir="s"></div>
    <div class="rh rh-e"  data-id="${id}" data-dir="e"></div>
    <div class="rh rh-w"  data-id="${id}" data-dir="w"></div>
    <div class="rh rh-ne" data-id="${id}" data-dir="ne"></div>
    <div class="rh rh-nw" data-id="${id}" data-dir="nw"></div>
    <div class="rh rh-se" data-id="${id}" data-dir="se"></div>
    <div class="rh rh-sw" data-id="${id}" data-dir="sw"></div>
  `;

  winsLayer.appendChild(el);
  refreshLucideIcons(el);

  const winData = { el, appId, title: extra.title || app.name, state:'normal', prevBounds:null };
  windowsMap.set(id, winData);

  // Render app content
  const content = document.getElementById(`${id}_content`);
  renderApp(appId, content, id, extra);

  // Wire controls
  el.querySelector('.wc-min').addEventListener('click',  () => minimizeWin(id));
  el.querySelector('.wc-max').addEventListener('click',  () => toggleMaximize(id));
  el.querySelector('.wc-close').addEventListener('click',() => closeWin(id));

  // Focus on click
  el.addEventListener('mousedown', () => focusWin(id), true);

  // Drag
  initDrag(el.querySelector('.win-titlebar'), el, id);
  

  // Resize
  el.querySelectorAll('.rh').forEach(h => initResize(h, el, id));

  focusWin(id);
  updateTaskbar();
  return id;
}

function focusWin(id) {
  if (focusedWin === id) return;
  if (focusedWin) {
    const prev = windowsMap.get(focusedWin);
    if (prev) prev.el.classList.remove('focused');
  }
  focusedWin = id;
  const win = windowsMap.get(id);
  if (!win) return;
  win.el.classList.add('focused');
  win.el.style.zIndex = ++zTop;
  updateTaskbar();
}

function minimizeWin(id) {
  const win = windowsMap.get(id);
  if (!win) return;
  
  // Find target position (taskbar button)
  const app = APPS[win.appId];
  let targetX, targetY;
  const taskbarBtns = document.querySelectorAll('#taskbar-windows .tb-btn');
  for (let btn of taskbarBtns) {
    if (btn.title === (win.title || app.name)) {
      const rect = btn.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top;
      break;
    }
  }
  if (!targetX) {
    targetX = window.innerWidth / 2;
    targetY = window.innerHeight - 60;
  }
  
  const winRect = win.el.getBoundingClientRect();
  const startX = winRect.left + winRect.width / 2;
  const startY = winRect.top + winRect.height / 2;
  const translateX = targetX - startX;
  const translateY = targetY - startY;
  
  if (typeof motion !== 'undefined') {
    motion(win.el, {
      from: { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      to: { transform: `translate(${translateX}px, ${translateY}px) scale(0.2)`, opacity: 0 },
      duration: 300,
      easing: 'ease-in',
    }).finished.then(() => {
      win.state = 'minimized';
      win.el.classList.add('minimized');
      win.el.style.transform = '';
      if (focusedWin === id) { focusedWin = null; }
      updateTaskbar();
    });
  } else {
    win.el.classList.add('minimizing');
    setTimeout(() => {
      win.state = 'minimized';
      win.el.classList.remove('minimizing');
      win.el.classList.add('minimized');
      if (focusedWin === id) { focusedWin = null; }
      updateTaskbar();
    }, 300);
  }
}

function restoreWin(id) {
  const win = windowsMap.get(id);
  if (!win) return;
  win.state = 'normal';
  win.el.classList.remove('minimized','maximized','snapped-left','snapped-right');
  
  // Calculate target position for restore animation
  let targetX, targetY;
  if (win.prevBounds) {
    targetX = win.prevBounds.x + win.prevBounds.w / 2;
    targetY = win.prevBounds.y + win.prevBounds.h / 2;
  } else {
    const vw = winsLayer.offsetWidth || window.innerWidth;
    const vh = winsLayer.offsetHeight || (window.innerHeight - 48);
    targetX = vw / 2;
    targetY = vh / 2;
  }
  
  // Find taskbar button as origin
  const app = APPS[win.appId];
  let startX = window.innerWidth / 2, startY = window.innerHeight - 60;
  const taskbarBtns = document.querySelectorAll('#taskbar-windows .tb-btn');
  for (let btn of taskbarBtns) {
    if (btn.title === (win.title || app.name)) {
      const rect = btn.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top;
      break;
    }
  }
  
  const translateX = targetX - startX;
  const translateY = targetY - startY;
  
  if (win.prevBounds) {
    const b = win.prevBounds;
    win.el.style.cssText = `width:${b.w}px;height:${b.h}px;left:${b.x}px;top:${b.y}px;z-index:${win.el.style.zIndex}`;
    win.prevBounds = null;
  }
  
  if (typeof motion !== 'undefined') {
    motion(win.el, {
      from: { transform: `translate(${translateX}px, ${translateY}px) scale(0.2)`, opacity: 0 },
      to: { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      duration: 400,
      easing: 'ease-out',
    });
  }
  
  focusWin(id);
  updateTaskbar();
}

function toggleMaximize(id) {
  const win = windowsMap.get(id);
  if (!win) return;
  if (win.state === 'maximized') {
    restoreWin(id);
  } else {
    const el = win.el;
    win.prevBounds = { x:el.offsetLeft, y:el.offsetTop, w:el.offsetWidth, h:el.offsetHeight };
    win.state = 'maximized';
    el.classList.remove('minimized','snapped-left','snapped-right');
    
    if (typeof motion !== 'undefined') {
      motion(el, {
        from: { transform: 'scale(1)' },
        to: { transform: 'scale(1.08)' },
        duration: 150,
        easing: 'ease-out',
      }).finished.then(() => {
        el.classList.add('maximized');
        motion(el, {
          from: { transform: 'scale(1.08)' },
          to: { transform: 'scale(1)' },
          duration: 150,
          easing: 'ease-in',
        });
        focusWin(id);
        updateTaskbar();
      });
    } else {
      el.classList.add('maximizing');
      setTimeout(() => {
        el.classList.add('maximized');
        el.classList.remove('maximizing');
        focusWin(id);
        updateTaskbar();
      }, 120);
    }
  }
}

function closeWin(id) {
  const win = windowsMap.get(id);
  if (!win) return;
  delete explorerRefreshers[id];
   
  // Call cleanup if app has one
  if (win.container && win.container._taskmgrCleanup) {
    win.container._taskmgrCleanup();
  }
  
  // Cleanup chat user when closing chat window
  if (win.app === 'chat' && db && currentUserId) {
    firebase.firestore().collection('chat_users').doc(currentUserId).delete().catch(() => {});
  }
  
  if (typeof motion !== 'undefined') {
    motion(win.el, {
      from: { transform: 'scale(1)', opacity: 1 },
      to: { transform: 'scale(0.9)', opacity: 0 },
      duration: 150,
      easing: 'ease-in',
    }).finished.then(() => {
      win.el.remove();
      windowsMap.delete(id);
      if (focusedWin === id) focusedWin = null;
      updateTaskbar();
    });
  } else {
    win.el.style.animation = 'fadeOut .12s ease forwards';
    setTimeout(() => {
      win.el.remove();
      windowsMap.delete(id);
      if (focusedWin === id) focusedWin = null;
      updateTaskbar();
    }, 120);
  }
}

function taskbarClickWin(id) {
  const win = windowsMap.get(id);
  if (!win) return;
  if (win.state === 'minimized') {
    restoreWin(id);
  } else if (focusedWin === id) {
    minimizeWin(id);
  } else {
    focusWin(id);
  }
}

/* €€ Drag €€ */
function initDrag(handle, winEl, id) {
  let startX, startY, startL, startT, dragging = false;
  const snap = document.getElementById('snap-overlay');

  handle.addEventListener('mousedown', e => {
    if (e.target.closest('.wc-btn')) return;
    const win = windowsMap.get(id);
    if (!win || win.state === 'maximized') {
      // Un-maximize on drag from max
      if (win && win.state === 'maximized') {
        const rect = winEl.getBoundingClientRect();
        const newW = win.prevBounds?.w || winEl.offsetWidth;
        const newH = win.prevBounds?.h || winEl.offsetHeight;
        win.state = 'normal';
        winEl.classList.remove('maximized');
        winEl.style.width  = newW + 'px';
        winEl.style.height = newH + 'px';
        winEl.style.left   = (e.clientX - newW/2) + 'px';
        winEl.style.top    = '0px';
        win.prevBounds = null;
      } else return;
    }
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startL = winEl.offsetLeft; startT = winEl.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const win = windowsMap.get(id);
    if (!win) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    let nx = startL + dx, ny = startT + dy;

    // Constrain to viewport
    const vw = winsLayer.offsetWidth;
    const vh = winsLayer.offsetHeight;
    nx = Math.max(-winEl.offsetWidth + 40, Math.min(vw - 40, nx));
    ny = Math.max(0, Math.min(vh - 36, ny));

    winEl.style.left = nx + 'px';
    winEl.style.top  = ny + 'px';

    // Snap zones
    if (e.clientX < 4) {
      snap.style.cssText = 'display:block;left:0;top:0;width:50%;height:100%;';
    } else if (e.clientX > window.innerWidth - 4) {
      snap.style.cssText = 'display:block;left:50%;top:0;width:50%;height:100%;';
    } else if (e.clientY < 4) {
      snap.style.cssText = 'display:block;left:0;top:0;width:100%;height:100%;';
    } else {
      snap.style.display = 'none';
    }
  });

  document.addEventListener('mouseup', e => {
    if (!dragging) return;
    dragging = false;
    snap.style.display = 'none';

    const win = windowsMap.get(id);
    if (!win) return;

    // Apply snap
    const vw = winsLayer.offsetWidth;
    const vh = winsLayer.offsetHeight;
    if (e.clientX < 4) {
      win.prevBounds = { x:winEl.offsetLeft, y:winEl.offsetTop, w:winEl.offsetWidth, h:winEl.offsetHeight };
      winEl.classList.add('snapped-left');
      win.state = 'snapped';
    } else if (e.clientX > window.innerWidth - 4) {
      win.prevBounds = { x:winEl.offsetLeft, y:winEl.offsetTop, w:winEl.offsetWidth, h:winEl.offsetHeight };
      winEl.classList.add('snapped-right');
      win.state = 'snapped';
    } else if (e.clientY < 4) {
      win.prevBounds = { x:winEl.offsetLeft, y:winEl.offsetTop, w:winEl.offsetWidth, h:winEl.offsetHeight };
      toggleMaximize(id);
    }
  });

  // Double-click title bar ’ toggle maximize
  handle.addEventListener('dblclick', e => {
    if (e.target.closest('.wc-btn')) return;
    toggleMaximize(id);
  });
}

/* €€ Resize €€ */
function initResize(handle, winEl, id) {
  let startX, startY, startL, startT, startW, startH, dir;

  handle.addEventListener('mousedown', e => {
    const win = windowsMap.get(id);
    if (!win || win.state !== 'normal') return;
    dir = handle.dataset.dir;
    startX = e.clientX; startY = e.clientY;
    startL = winEl.offsetLeft; startT = winEl.offsetTop;
    startW = winEl.offsetWidth; startH = winEl.offsetHeight;
    e.preventDefault(); e.stopPropagation();
    document.body.style.cursor = handle.style.cursor;
  });

  document.addEventListener('mousemove', e => {
    if (!dir || !startX) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    const min = 280, minH = 180;
    let nl = startL, nt = startT, nw = startW, nh = startH;

    if (dir.includes('e')) nw = Math.max(min, startW + dx);
    if (dir.includes('s')) nh = Math.max(minH, startH + dy);
    if (dir.includes('w')) { nw = Math.max(min, startW - dx); nl = startL + (startW - nw); }
    if (dir.includes('n')) { nh = Math.max(minH, startH - dy); nt = startT + (startH - nh); }

    winEl.style.left = nl + 'px'; winEl.style.top = nt + 'px';
    winEl.style.width = nw + 'px'; winEl.style.height = nh + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (dir) { dir = null; startX = null; document.body.style.cursor = ''; }
  });
}

/*                                                                
   TASKBAR
                                                                */
function updateTaskbar() {
  const pinnedEl = document.getElementById('taskbar-pinned');
  const winsEl = document.getElementById('taskbar-windows');
  const sep = document.getElementById('taskbar-pin-sep');
  if (!pinnedEl || !winsEl) return;
  pinnedEl.innerHTML = '';
  winsEl.innerHTML = '';

  const pins = state.pinnedApps || [];
  pins.forEach(appId => {
    const app = APPS[appId];
    if (!app) return;
    const btn = document.createElement('div');
    const hasOpen = [...windowsMap.values()].some(w => w.appId === appId && w.state !== 'minimized');
    const hasMin = [...windowsMap.values()].some(w => w.appId === appId && w.state === 'minimized');
    const focusThis = [...windowsMap.entries()].some(([wid, w]) => w.appId === appId && focusedWin === wid && w.state !== 'minimized');
    btn.className = 'tb-btn tb-pinned' + (hasOpen || hasMin ? ' app-open' : '') + (focusThis ? ' app-focused' : '');
    btn.innerHTML = lucideIconHtml(app.icon, 20);
    btn.title = app.name;
    btn.dataset.tooltip = app.name;
    btn.onclick = () => launchOrFocusApp(appId);
    btn.addEventListener('contextmenu', e => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { lucide: 'pin', label: 'Unpin from taskbar', action: () => togglePinToTaskbar(appId) },
        { sep: true },
        { lucide: 'app-window', label: 'Open new window', action: () => launchApp(appId) },
      ]);
    });
    pinnedEl.appendChild(btn);
  });

  for (const [id, win] of windowsMap) {
    const app = APPS[win.appId];
    const btn = document.createElement('div');
    btn.className = 'tb-btn' +
      (win.state !== 'minimized' ? ' app-open' : ' app-open') +
      (focusedWin === id && win.state !== 'minimized' ? ' app-focused' : '');
    btn.innerHTML = lucideIconHtml(app.icon, 20);
    btn.title = win.title || app.name;
    btn.dataset.tooltip = win.title || app.name;
    btn.onclick = () => taskbarClickWin(id);

    btn.addEventListener('contextmenu', e => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { lucide:'panel-top', label:'Restore',  action: () => restoreWin(id) },
        { lucide:'minus', label:'Minimize', action: () => minimizeWin(id) },
        { lucide:'maximize-2', label:'Maximize', action: () => toggleMaximize(id) },
        { sep: true },
        { lucide:'x',  label:'Close window', action: () => closeWin(id), cls:'danger' },
      ]);
    });
    winsEl.appendChild(btn);
  }

  if (sep) sep.style.display = pins.length && windowsMap.size ? 'block' : 'none';
  refreshLucideIcons(pinnedEl);
  refreshLucideIcons(winsEl);
}

/*                                                                
   START MENU
                                                                */
let startOpen = false;

function resetStartMenuAllAppsView() {
  const vd = document.getElementById('start-view-default');
  const va = document.getElementById('start-view-all');
  const link = document.getElementById('start-more-link');
  if (vd && va && link) {
    va.classList.add('hidden');
    vd.style.display = '';
    link.textContent = 'All apps';
  }
}

function toggleStart() {
  startOpen = !startOpen;
  const startMenu = document.getElementById('start-menu');
  const startBtn = document.getElementById('start-btn');
  
  if (startOpen) {
    startMenu.classList.add('open');
    startBtn.classList.add('active');
    if (typeof motion !== 'undefined') {
      motion(startMenu, {
        from: { opacity: 0, transform: 'translateY(10px) scale(0.98)' },
        to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        duration: 200,
        easing: 'ease-out',
      });
    }
    document.getElementById('start-search-input').focus();
  } else {
    if (typeof motion !== 'undefined') {
      motion(startMenu, {
        from: { opacity: 1, transform: 'translateY(0) scale(1)' },
        to: { opacity: 0, transform: 'translateY(10px) scale(0.98)' },
        duration: 150,
        easing: 'ease-in',
      }).finished.then(() => {
        startMenu.classList.remove('open');
        startBtn.classList.remove('active');
      });
    } else {
      startMenu.classList.remove('open');
      startBtn.classList.remove('active');
    }
    resetStartMenuAllAppsView();
  }
}

function buildStartGrid() {
  const grid = document.getElementById('start-apps-grid');
  grid.innerHTML = '';
  
  const installedApps = JSON.parse(localStorage.getItem('wos_installed_apps') || 'null') || {};
  
  for (const [id, app] of Object.entries(APPS)) {
    // Show app if it's pinned (default) OR explicitly installed
    const isInstalled = app.pinned === true || installedApps[id] === true;
    if (!isInstalled) continue;
    
    const btn = document.createElement('div');
    btn.className = 's-app-btn';
    btn.innerHTML = `<div class="si">${lucideIconHtml(app.icon, 28)}</div><div class="sn">${app.name}</div>`;
    btn.onclick = (e) => { 
      const rect = e.target.closest('.s-app-btn').getBoundingClientRect();
      setLaunchOrigin(rect.left + rect.width / 2, rect.top + rect.height / 2);
      launchApp(id); 
      toggleStart(); 
    };
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      showStartAppMenu(e.clientX, e.clientY, id, app.name);
    };
    grid.appendChild(btn);
  }
  refreshLucideIcons(grid);
}

function showStartAppMenu(x, y, appId, appName) {
  const existing = document.getElementById('start-app-menu');
  if (existing) existing.remove();
  
  const menu = document.createElement('div');
  menu.id = 'start-app-menu';
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:4px;min-width:160px;z-index:99999;box-shadow:var(--shadow-lg);`;
  
  const isPinned = (state.pinnedApps || []).includes(appId);
  const hasDesktopIcon = state.iconLayout && state.iconLayout['app:' + appId];
  
  const items = [
    { label: 'Open', action: () => { launchApp(appId); toggleStart(); } },
    { label: isPinned ? 'Unpin from taskbar' : 'Pin to taskbar', action: () => togglePinnedApp(appId) },
    { label: hasDesktopIcon ? 'Remove from Desktop' : 'Add to Desktop', action: () => toggleDesktopIcon(appId, appName) },
    { type: 'sep' },
    { label: 'App info', action: () => { showNotification(appName, `ID: ${appId}`); } }
  ];
  
  items.forEach(item => {
    if (item.type === 'sep') {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:var(--border);margin:4px 8px;';
      menu.appendChild(sep);
    } else {
      const btn = document.createElement('div');
      btn.style.cssText = 'padding:8px 12px;font-size:13px;cursor:pointer;border-radius:4px;';
      btn.textContent = item.label;
      btn.onmouseover = () => btn.style.background = 'var(--surface-hover)';
      btn.onmouseout = () => btn.style.background = 'transparent';
      btn.onclick = () => { item.action(); menu.remove(); };
      menu.appendChild(btn);
    }
  });
  
  document.body.appendChild(menu);
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }, { once: true });
  }, 10);
}

function togglePinnedApp(appId) {
  const pinned = state.pinnedApps || [];
  const idx = pinned.indexOf(appId);
  if (idx >= 0) pinned.splice(idx, 1);
  else pinned.push(appId);
  state.pinnedApps = pinned;
  saveState();
  updateTaskbar();
  showNotification('Taskbar', idx >= 0 ? 'App unpinned' : 'App pinned');
}

function toggleDesktopIcon(appId, appName) {
  if (!state.iconLayout) state.iconLayout = {};
  const key = 'app:' + appId;
  if (state.iconLayout[key]) {
    delete state.iconLayout[key];
    showNotification('Desktop', 'Icon removed');
  } else {
    const col = findFreeDesktopCellForApp();
    state.iconLayout[key] = { c: col, r: 0 };
    showNotification('Desktop', 'Icon added');
  }
  saveState();
  buildDesktopIcons();
}

function findFreeDesktopCellForApp() {
  const layout = state.iconLayout || {};
  const cols = getDesktopGridCols();
  for (let c = 0; c < cols; c++) {
    let occupied = false;
    for (const k in layout) {
      if (layout[k] && layout[k].c === c && layout[k].r === 0) {
        occupied = true;
        break;
      }
    }
    if (!occupied) return c;
  }
  return 0;
}

function buildStartRec() {
  const list = document.getElementById('start-rec-list');
  const recSection = document.getElementById('start-rec-section');
  const moreLink = document.getElementById('start-more-link');
  list.innerHTML = '';
  const files = fsListDir('/Documents').slice(0, 6);
  if (!files.length) {
    recSection.style.display = 'none';
  } else {
    recSection.style.display = 'block';
    files.forEach(f => {
    const item = document.createElement('div');
    item.className = 'sr-item';
    item.innerHTML = `<div class="sri">${lucideIconHtml(fileTypeLucide(f.name, f.type), 26)}</div><div class="srn">${f.name}</div>`;
    item.onclick = () => {
      toggleStart();
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) launchApp('music');
      else openFileInNotepad(f.path);
    };
    list.appendChild(item);
  });
  refreshLucideIcons(list);
}
}

function buildStartAllApps() {
  const grid = document.getElementById('start-all-apps-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const entries = Object.entries(APPS).sort((a, b) => a[1].name.localeCompare(b[1].name));
  entries.forEach(([id, app]) => {
    const btn = document.createElement('div');
    btn.className = 's-app-btn';
    btn.innerHTML = `<div class="si">${lucideIconHtml(app.icon, 28)}</div><div class="sn">${app.name}</div>`;
    btn.onclick = (e) => { 
      const rect = e.target.closest('.s-app-btn').getBoundingClientRect();
      setLaunchOrigin(rect.left + rect.width / 2, rect.top + rect.height / 2);
      launchApp(id); 
      toggleStart(); 
    };
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      showStartAppMenu(e.clientX, e.clientY, id, app.name);
    };
    grid.appendChild(btn);
  });
  refreshLucideIcons(grid);
}

/* Start menu search */
const SEARCH_SETTINGS_HINTS = [
  { keys: ['wallpaper', 'background', 'personal', 'accent', 'theme', 'dark', 'light', 'color'], label: 'Settings ” Personalization', lucide: 'palette', action: () => { launchApp('settings'); toggleStart(); } },
  { keys: ['system', 'about', 'info', 'display'], label: 'Settings', lucide: 'settings', action: () => { launchApp('settings'); toggleStart(); } },
  { keys: ['wifi', 'network', 'volume', 'brightness', 'quick'], label: 'Quick Settings', lucide: 'sliders-horizontal', action: () => { toggleStart(); toggleQuickSettings(); } },
];

function collectMatchingFiles(q) {
  const ql = q.toLowerCase();
  const out = [];
  for (const [path, meta] of Object.entries(FS)) {
    if (meta.type !== 'file') continue;
    const name = path.split('/').pop();
    if (name.toLowerCase().includes(ql) || path.toLowerCase().includes(ql)) out.push({ path, name });
  }
  return out.slice(0, 24);
}

function performStartSearch() {
  const input = document.getElementById('start-search-input');
  const q = input.value.trim().toLowerCase();
  const body = document.getElementById('start-body');
  const results = document.getElementById('start-search-results');
  if (!q) {
    body.style.display = 'block';
    results.style.display = 'none';
    resetStartMenuAllAppsView();
    syncRadioPillChrome();
    return;
  }
  body.style.display = 'none';
  results.style.display = 'block';
  const pillWrapSearch = document.getElementById('start-radio-pill-wrap');
  if (pillWrapSearch) pillWrapSearch.hidden = true;
  results.innerHTML = '';

  for (const [id, app] of Object.entries(APPS)) {
    if (app.name.toLowerCase().includes(q)) {
      const item = document.createElement('div');
      item.className = 'sr-item';
      item.innerHTML = `<div class="sri">${lucideIconHtml(app.icon, 26)}</div><div class="sr-meta"><div class="srn">${app.name}</div><div class="sr-sub">Application</div></div>`;
      item.onclick = () => { launchApp(id); toggleStart(); };
      results.appendChild(item);
    }
  }

  for (const hint of SEARCH_SETTINGS_HINTS) {
    if (hint.keys.some(k => k.includes(q) || q.includes(k))) {
      const item = document.createElement('div');
      item.className = 'sr-item';
      item.innerHTML = `<div class="sri">${lucideIconHtml(hint.lucide, 26)}</div><div class="sr-meta"><div class="srn">${hint.label}</div><div class="sr-sub">Suggested</div></div>`;
      item.onclick = () => hint.action();
      results.appendChild(item);
    }
  }

  collectMatchingFiles(q).forEach(f => {
    const item = document.createElement('div');
    item.className = 'sr-item';
    item.innerHTML = `<div class="sri">${lucideIconHtml(fileTypeLucide(f.name, 'file'), 26)}</div><div class="sr-meta"><div class="srn">${f.name}</div><div class="sr-sub">${f.path}</div></div>`;
    item.onclick = () => {
      toggleStart();
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) launchApp('music');
      else openFileInNotepad(f.path);
    };
    results.appendChild(item);
  });

  if (!results.children.length) {
    results.innerHTML = '<div style="padding:20px 24px;color:var(--text-sec);font-size:13px;">No results. Try an app name, a file name, or words like œwallpaper or œtheme.</div>';
  }
  refreshLucideIcons(results);
}

document.getElementById('start-search-input').addEventListener('input', performStartSearch);
document.getElementById('start-search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const first = document.querySelector('#start-search-results .sr-item');
    if (first) { e.preventDefault(); first.click(); }
  }
});

/* Power buttons */
document.getElementById('pow-shutdown').addEventListener('click', () => {
  toggleStart();
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;animation:fadeOut 0s;';
  el.innerHTML = '<div style="color:#fff;font-size:18px;font-family:var(--font),Segoe UI,sans-serif">Shutting down</div>';
  document.body.appendChild(el);
  setTimeout(() => location.reload(), 4000);
});

document.getElementById('pow-restart').addEventListener('click', () => {
  toggleStart();
  showNotification('WebOS 12', 'Restarting...', 'rotate-cw');
  setTimeout(() => location.reload(), 3000);
});

document.getElementById('pow-sleep').addEventListener('click', () => {
  toggleStart();
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;cursor:pointer;';
  el.onclick = () => el.remove();
  document.body.appendChild(el);
  showNotification('Sleep', 'Click the screen to wake up', 'moon');
});

/*
    APP LAUNCHER
                                                                */
function launchApp(appId, extra = {}) {
  const id = createWindow(appId, extra);
  return id;
}

let launchOrigin = null;
function setLaunchOrigin(x, y) {
  launchOrigin = { x, y };
}

function openFileInNotepad(filePath) {
  const f = FS[filePath];
  if (!f || f.type !== 'file') return;
  const id = launchApp('notepad', { title: filePath.split('/').pop(), filePath });
  return id;
}

/* APP RENDERERS /*/
function renderApp(appId, container, winId, extra) {
  switch(appId) {
    case 'notepad':    renderNotepad(container, winId, extra); break;
    case 'explorer':   renderExplorer(container, winId, extra); break;
    case 'settings':   renderSettings(container, winId, extra); break;
    case 'terminal':   renderTerminal(container, winId, extra); break;
    case 'calculator': renderCalculator(container, winId); break;
    case 'browser':    renderBrowser(container, winId, extra); break;
    case 'paint':      renderPaint(container, winId); break;
    case 'music':      renderMusic(container, winId, extra); break;
    case 'recycle':    renderRecycle(container, winId); break;
    case 'developer':  container.innerHTML = renderDevApp(); break;
    case 'taskmgr':    renderTaskMgr(container, winId); break;
    case 'calendar':   renderCalendar(container, winId); break;
    case 'weather':    renderWeather(container, winId); break;
    case 'clock':      renderClock(container, winId); break;
    case 'gallery':    renderGallery(container, winId); break;
    case 'gallery-viewer': renderGalleryViewer(container, winId, extra); break;
    case 'video-player': renderVideoPlayer(container, winId, extra); break;
    case 'video':      renderVideo(container, winId); break;
    case 'mail':       renderMail(container, winId); break;
    case 'chat':       renderChat(container, winId); break;
  }
}


function renderDevApp() {
  return `
    <div class="dev-app" style="display:flex;height:100%;background:linear-gradient(135deg,#0a0a0f 0%,#12121a 50%,#0a0a0f 100%);color:var(--text);font-family:var(--font);overflow:hidden">
      <style>
        .dev-sidebar { width:220px;background:rgba(0,0,0,0.3);border-right:1px solid rgba(0,120,212,0.15);padding:20px;display:flex;flex-direction:column;gap:6px }
        .dev-nav-item { padding:12px 16px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text-sec);transition:all 0.2s }
        .dev-nav-item:hover { background:rgba(0,120,212,0.1);color:var(--text) }
        .dev-nav-item.active { background:linear-gradient(90deg,rgba(0,120,212,0.2),rgba(0,120,212,0.05));color:var(--accent-light);border-left:2px solid var(--accent) }
        .dev-header { padding:30px;background:linear-gradient(180deg,rgba(0,120,212,0.15),transparent);border-bottom:1px solid rgba(0,120,212,0.1) }
        .dev-avatar { width:70px;height:70px;border-radius:20px;background:linear-gradient(135deg,#0078d4,#60cdff);display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(0,120,212,0.4);animation:pulse 2s infinite }
        @keyframes pulse { 0%,100%{box-shadow:0 0 30px rgba(0,120,212,0.3)} 50%{box-shadow:0 0 50px rgba(0,120,212,0.6)} }
        .dev-stat-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px }
        .dev-stat-bar { height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;margin-top:8px }
        .dev-stat-fill { height:100%;border-radius:2px;transition:width 0.5s }
        .dev-terminal { background:#0a0a0a;border-radius:10px;padding:16px;font-family:'Courier New',monospace;font-size:12px;line-height:1.6;color:#22c55e }
        .dev-badge { background:linear-gradient(135deg,#0078d4,#0099ff);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600 }
        .dev-tag { background:rgba(0,120,212,0.15);padding:4px 10px;border-radius:6px;font-size:11px;color:var(--accent-light);border:1px solid rgba(0,120,212,0.2) }
      </style>
      
      <div class="dev-sidebar">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--text-ter);margin-bottom:16px;padding:0 8px">Navigation</div>
        <div class="dev-nav-item active"><span style="opacity:0.7">†</span> Dashboard</div>
        <div class="dev-nav-item"><span style="opacity:0.7">‡</span> System</div>
        <div class="dev-nav-item"><span style="opacity:0.7">‡</span> Terminal</div>
        <div class="dev-nav-item"><span style="opacity:0.7">‡</span> Network</div>
        <div class="dev-nav-item"><span style="opacity:0.7">‡</span> About</div>
        
        <div style="margin-top:auto">
          <div class="dev-stat-card" style="background:linear-gradient(135deg,rgba(0,120,212,0.15),rgba(0,120,212,0.05));border-color:rgba(0,120,212,0.2)">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:11px;color:var(--text-sec)">System Status</span>
              <span style="font-size:10px;color:#22c55e"> Online</span>
            </div>
            <div style="margin-top:8px;font-size:20px;font-weight:700">WebOS 12</div>
          </div>
        </div>
      </div>

      <div style="flex:1;overflow-y:auto">
        <div class="dev-header">
          <div style="display:flex;align-items:center;gap:20px">
            <div class="dev-avatar"><i data-lucide="code-2" style="width:32px;height:32px;color:white"></i></div>
            <div>
              <div style="font-size:24px;font-weight:700;letter-spacing:-0.5px">Samwel Wayne</div>
              <div style="color:var(--text-sec);font-size:13px">Full Stack Developer & OS Designer</div>
            </div>
            <div class="dev-badge" style="margin-left:auto">Core Team</div>
          </div>
        </div>

        <div style="padding:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
          <div class="dev-stat-card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <i data-lucide="cpu" style="width:16px;color:var(--accent)"></i>
              <span style="font-size:12px;color:var(--text-sec)">CPU Usage</span>
            </div>
            <div style="font-size:28px;font-weight:700" id="dev-cpu">12%</div>
            <div class="dev-stat-bar"><div class="dev-stat-fill" style="width:12%;background:linear-gradient(90deg,#22c55e,#4ade80)" id="dev-cpu-bar"></div></div>
          </div>
          <div class="dev-stat-card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <i data-lucide="memory-stick" style="width:16px;color:#f59e0b"></i>
              <span style="font-size:12px;color:var(--text-sec)">Memory</span>
            </div>
            <div style="font-size:28px;font-weight:700" id="dev-mem">48%</div>
            <div class="dev-stat-bar"><div class="dev-stat-fill" style="width:48%;background:linear-gradient(90deg,#f59e0b,#fbbf24)"></div></div>
          </div>
          <div class="dev-stat-card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <i data-lucide="hard-drive" style="width:16px;color:#8b5cf6"></i>
              <span style="font-size:12px;color:var(--text-sec)">Storage</span>
            </div>
            <div style="font-size:28px;font-weight:700">23%</div>
            <div class="dev-stat-bar"><div class="dev-stat-fill" style="width:23%;background:linear-gradient(90deg,#8b5cf6,#a78bfa)"></div></div>
          </div>
        </div>

        <div style="padding:0 24px 24px;display:grid;grid-template-columns:2fr 1fr;gap:16px">
          <div class="dev-stat-card">
            <div style="font-size:12px;color:var(--accent-light);margin-bottom:16px;text-transform:uppercase;letter-spacing:1px">Terminal Output</div>
            <div class="dev-terminal">
              <div style="color:var(--text)">root@webos:~$ <span style="color:#22c55e">systemctl status</span></div>
              <div style="color:var(--text-sec);margin-top:4px"> webos-kernel    active (running)</div>
              <div style="color:var(--text-sec)"> window-manager  active (running)</div>
              <div style="color:var(--text-sec)"> file-system     active (running)</div>
              <div style="color:var(--text-sec)"> network-stack   active (running)</div>
              <div style="color:var(--text);margin-top:8px">root@webos:~$ <span style="color:#60cdff">neofetch</span></div>
              <div style="color:var(--text-sec);margin-top:4px">OS: WebOS 12.0 (x86_64)</div>
              <div style="color:var(--text-sec)">Kernel: JavaScript/Node.js</div>
              <div style="color:var(--text-sec)">Shell: webos-sh 1.0</div>
              <div style="color:var(--text);margin-top:4px">root@webos:~$ <span style="animation:blink 1s infinite">_</span></div>
              <style>@keyframes blink { 0%,50%{opacity:1} 51%,100%{opacity:0} }</style>
            </div>
          </div>

          <div class="dev-stat-card">
            <div style="font-size:12px;color:var(--accent-light);margin-bottom:16px;text-transform:uppercase;letter-spacing:1px">Tech Stack</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              <span class="dev-tag">JavaScript</span>
              <span class="dev-tag">Node.js</span>
              <span class="dev-tag">Express</span>
              <span class="dev-tag">Socket.io</span>
              <span class="dev-tag">CSS3</span>
              <span class="dev-tag">PWA</span>
              <span class="dev-tag">Lucide</span>
            </div>
            <div style="margin-top:20px;font-size:12px;color:var(--accent-light);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">Current Project</div>
            <div style="font-size:13px;font-weight:600">WebOS 12</div>
            <div style="margin-top:8px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px">
              <div style="width:78%;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-light));border-radius:2px"></div>
            </div>
            <div style="font-size:10px;color:var(--text-ter);margin-top:6px">98% Complete</div>
          </div>
        </div>

        <div style="padding:0 24px 24px">
          <div class="dev-stat-card">
            <div style="font-size:12px;color:var(--accent-light);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">About WebOS</div>
            <p style="font-size:13px;line-height:1.7;color:var(--text-sec)">
              WebOS 12 is a browser-based desktop environment that bridges the gap between native desktop experiences and web flexibility. Built with performance, aesthetics, and accessibility in mind.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   TASK MANAGER
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderTaskMgr(container, winId) {
  function getOpenWindows() {
    const wins = [];
    for (const [id, win] of windowsMap) {
      const app = APPS[win.appId];
      if (app) {
        wins.push({
          id: id,
          name: win.title || app.name,
          appId: win.appId,
          state: win.state,
          cpu: Math.floor(Math.random() * 5) + 1 + '%'
        });
      }
    }
    return wins;
  }

  function updateProcessList() {
    const wins = getOpenWindows();
    if (wins.length === 0) {
      return `<div style="padding:12px;color:var(--text-sec);font-size:12px;text-align:center">No running applications</div>`;
    }
    return wins.map(w => `
      <div class="tm-proc-item" data-win-id="${w.id}" style="cursor:pointer">
        <span class="tm-proc-name">${escapeHtml(w.name)}</span>
        <span class="tm-proc-cpu">${w.cpu}</span>
      </div>
    `).join('');
  }

  container.innerHTML = `
    <div class="app-taskmgr">
      <div class="tm-tabs">
        <div class="tm-tab active" data-tab="processes">Apps</div>
        <div class="tm-tab" data-tab="performance">Performance</div>
      </div>
      <div class="tm-content">
        <div class="tm-section">
          <h3>System Resources</h3>
          <div class="tm-stat-row">
            <span class="tm-stat-label">CPU Usage</span>
            <span class="tm-stat-val" id="tm_cpu_${winId}">12%</span>
          </div>
          <div class="tm-bar"><div class="tm-bar-fill" id="tm_cpu_bar_${winId}" style="width:12%"></div></div>
          <div class="tm-stat-row" style="margin-top:12px">
            <span class="tm-stat-label">Memory</span>
            <span class="tm-stat-val" id="tm_mem_${winId}">2.1 GB / 8 GB</span>
          </div>
          <div class="tm-bar"><div class="tm-bar-fill" id="tm_mem_bar_${winId}" style="width:26%"></div></div>
        </div>
        <div class="tm-section">
          <h3>Running Apps (${windowsMap.size})</h3>
          <div class="tm-proc-list" id="tm_proc_${winId}">${updateProcessList()}</div>
        </div>
      </div>
    </div>`;

  const procList = document.getElementById(`tm_proc_${winId}`);
  const cpuEl = document.getElementById(`tm_cpu_${winId}`);
  const cpuBarEl = document.getElementById(`tm_cpu_bar_${winId}`);

  let cpuUsage = 12;
  let cpuInterval = setInterval(() => {
    if (cpuEl && cpuBarEl) {
      cpuUsage = Math.floor(Math.random() * 20) + 8;
      cpuEl.textContent = cpuUsage + '%';
      cpuBarEl.style.width = cpuUsage + '%';
    }
  }, 2000);

  let updateInterval = setInterval(() => {
    if (procList) {
      const newList = updateProcessList();
      const currentList = procList.innerHTML;
      if (newList !== currentList) {
        procList.innerHTML = newList;
        attachProcHandlers();
      }
    }
  }, 1000);

  function attachProcHandlers() {
    if (!procList) return;
    procList.querySelectorAll('.tm-proc-item').forEach(item => {
      item.addEventListener('dblclick', () => {
        const winId = item.dataset.winId;
        if (winId && windowsMap.get(winId)) {
          restoreWin(winId);
          bringToFront(winId);
        }
      });
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const wId = item.dataset.winId;
        if (wId) {
          showContextMenu(e.clientX, e.clientY, [
            { lucide: 'maximize-2', label: 'Bring to Front', action: () => { restoreWin(wId); bringToFront(wId); } },
            { lucide: 'minimize', label: 'Minimize', action: () => minimizeWin(wId) },
            { sep: true },
            { lucide: 'x', label: 'Close', action: () => closeWin(wId) }
          ]);
        }
      });
    });
  }

  attachProcHandlers();

  container.querySelectorAll('.tm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  container._taskmgrCleanup = () => {
    clearInterval(updateInterval);
    clearInterval(cpuInterval);
  };
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   CALENDAR
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderCalendar(container, winId) {
  const today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();
  let selectedDate = null;

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function renderMonth() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();
    
    let daysHTML = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('');
    
    for (let i = firstDay - 1; i >= 0; i--) {
      daysHTML += `<div class="cal-day other-month">${daysInPrev - i}</div>`;
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
      const isSelected = selectedDate && selectedDate.day === d && selectedDate.month === currentMonth && selectedDate.year === currentYear;
      daysHTML += `<div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-day="${d}">${d}</div>`;
    }
    
    const remaining = 42 - (firstDay + daysInMonth);
    for (let i = 1; i <= remaining; i++) {
      daysHTML += `<div class="cal-day other-month">${i}</div>`;
    }
    
    document.getElementById(`cal_days_${winId}`).innerHTML = daysHTML;
    document.getElementById(`cal_title_${winId}`).textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    container.querySelectorAll('.cal-day[data-day]').forEach(day => {
      day.addEventListener('click', () => {
        selectedDate = { day: parseInt(day.dataset.day), month: currentMonth, year: currentYear };
        renderMonth();
      });
    });
  }

  container.innerHTML = `
    <div class="app-calendar">
      <div class="cal-header">
        <h2 id="cal_title_${winId}">${monthNames[currentMonth]} ${currentYear}</h2>
        <div class="cal-nav">
          <button id="cal_prev_${winId}">${lucideIconHtml('chevron-left', 16)}</button>
          <button id="cal_next_${winId}">${lucideIconHtml('chevron-right', 16)}</button>
        </div>
      </div>
      <div class="cal-grid" id="cal_days_${winId}"></div>
      <div class="cal-events">
        <div style="font-size:11px;text-transform:uppercase;color:var(--text-ter);margin-bottom:8px;">Events</div>
        <div class="cal-event">
          <div class="cal-event-dot"></div>
          <div class="cal-event-text">No events scheduled</div>
        </div>
      </div>
    </div>`;

  renderMonth();
  refreshLucideIcons(container);

  document.getElementById(`cal_prev_${winId}`).addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderMonth();
  });
  
  document.getElementById(`cal_next_${winId}`).addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderMonth();
  });
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   WEATHER
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function getWeatherIcon(code) {
  if (code === 0) return 'sun';
  if (code >= 1 && code <= 3) return 'cloud-sun';
  if (code >= 45 && code <= 48) return 'cloud-fog';
  if (code >= 51 && code <= 67) return 'cloud-rain';
  if (code >= 71 && code <= 77) return 'snowflake';
  if (code >= 80 && code <= 82) return 'cloud-rain';
  if (code >= 85 && code <= 86) return 'snowflake';
  if (code >= 95) return 'cloud-lightning';
  return 'cloud';
}

function getWeatherDesc(code) {
  const descs = {
    0: 'Clear Sky',
    1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing Rime Fog',
    51: 'Light Drizzle', 53: 'Drizzle', 55: 'Dense Drizzle',
    61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
    71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
    80: 'Rain Showers', 81: 'Rain Showers', 82: 'Heavy Showers',
    95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
  };
  return descs[code] || 'Unknown';
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather API error');
  return res.json();
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'WebOS12' } });
  if (!res.ok) throw new Error('Geocode error');
  const data = await res.json();
  return data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Unknown';
}

async function renderWeather(container, winId) {
  container.innerHTML = `
    <div class="app-weather">
      <div class="weather-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:12px;">
        <div class="weather-icon">${lucideIconHtml('loader-2', 48)}</div>
        <div style="color:var(--text-sec);font-size:14px;">Loading weather...</div>
      </div>
    </div>`;
  refreshLucideIcons(container);

  try {
    let lat, lon;
    
    try {
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: false });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        console.log('Got location:', lat, lon);
      } else {
        lat = 40.7128; lon = -74.0060;
      }
    } catch (geoErr) {
      console.log('Geolocation failed, using default:', geoErr.message);
      lat = 40.7128; lon = -74.0060;
    }

    const weather = await fetchWeather(lat, lon);
    console.log('Weather data:', weather);

    let locName = 'New York';
    try {
      locName = await reverseGeocode(lat, lon);
    } catch (e) {
      console.log('Reverse geocode failed, using default');
    }

    const current = weather.current;
    const daily = weather.daily;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const forecast = daily.time.slice(0, 5).map((t, i) => ({
      day: days[new Date(t).getDay()],
      icon: getWeatherIcon(daily.weather_code[i]),
      high: Math.round(daily.temperature_2m_max[i]),
      low: Math.round(daily.temperature_2m_min[i])
    }));

    const weatherData = {
      temp: Math.round(current.temperature_2m),
      desc: getWeatherDesc(current.weather_code),
      icon: getWeatherIcon(current.weather_code),
      humidity: current.relative_humidity_2m,
      wind: Math.round(current.wind_speed_10m),
      feels: Math.round(current.apparent_temperature),
      location: locName,
      forecast
    };

    container.innerHTML = `
      <div class="app-weather">
        <div class="weather-main">
          <div class="weather-icon">${lucideIconHtml(weatherData.icon, 72)}</div>
          <div class="weather-temp">${weatherData.temp}°C</div>
          <div class="weather-desc">${weatherData.desc}</div>
          <div class="weather-loc">${lucideIconHtml('map-pin', 14)} ${weatherData.location}</div>
        </div>
        <div class="weather-details">
          <div class="weather-detail">
            <div class="weather-detail-label">Humidity</div>
            <div class="weather-detail-val">${weatherData.humidity}%</div>
          </div>
          <div class="weather-detail">
            <div class="weather-detail-label">Wind</div>
            <div class="weather-detail-val">${weatherData.wind} km/h</div>
          </div>
          <div class="weather-detail">
            <div class="weather-detail-label">Feels Like</div>
            <div class="weather-detail-val">${weatherData.feels}°C</div>
          </div>
        </div>
        <div class="weather-forecast">
          <h4>5-Day Forecast</h4>
          <div class="weather-fc-row">
            ${weatherData.forecast.map(f => `
              <div class="weather-fc-day">
                <div class="weather-fc-day-name">${f.day}</div>
                <div class="weather-fc-day-icon">${lucideIconHtml(f.icon, 20)}</div>
                <div class="weather-fc-day-temp">${f.high}°</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>`;
    refreshLucideIcons(container);
  } catch (err) {
    console.error('Weather error:', err);
    container.innerHTML = `
      <div class="app-weather">
        <div class="weather-main" style="justify-content:center;">
          <div class="weather-icon">${lucideIconHtml('alert-triangle', 48)}</div>
          <div class="weather-desc">Unable to load weather</div>
          <div class="weather-loc" style="margin-top:8px;color:var(--text-ter);">${err.message || 'Check your connection'}</div>
        </div>
      </div>`;
    refreshLucideIcons(container);
  }
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   CLOCK
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderClock(container, winId) {
  let activeTab = 'clock';
  let stopwatchTime = 0;
  let stopwatchRunning = false;
  let stopwatchInterval = null;

  function updateClockDisplay() {
    const timeEl = document.getElementById(`clock_time_${winId}`);
    const dateEl = document.getElementById(`clock_date_${winId}`);
    if (!timeEl || !dateEl) return;
    const tz = state.timezone || 'Africa/Nairobi';
    const tzTime = getTimeInTimezone(tz);
    
    const h = tzTime.getUTCHours().toString().padStart(2, '0');
    const m = tzTime.getUTCMinutes().toString().padStart(2, '0');
    const s = tzTime.getUTCSeconds().toString().padStart(2, '0');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = days[tzTime.getUTCDay()];
    const monthName = months[tzTime.getUTCMonth()];
    
    timeEl.textContent = `${h}:${m}:${s}`;
    dateEl.textContent = `${dayName}, ${monthName} ${tzTime.getUTCDate()}`;
  }

  const WORLD_CLOCKS_KEY = 'wos_world_clocks';
  const defaultWorldClocks = [
    { city: 'New York', zone: 'EST', offset: -5 },
    { city: 'London', zone: 'GMT', offset: 0 },
    { city: 'Tokyo', zone: 'JST', offset: 9 },
    { city: 'Sydney', zone: 'AEST', offset: 10 },
  ];
  const availableCities = [
    { city: 'Kiritimati', zone: 'LINT', offset: 14 },
    { city: 'Auckland', zone: 'NZST', offset: 12 },
    { city: 'Wellington', zone: 'NZST', offset: 12 },
    { city: 'Fiji', zone: 'FJT', offset: 12 },
    { city: 'Chatham Islands', zone: 'CHAST', offset: 12.75 },
    { city: 'Anchorage', zone: 'AKST', offset: -9 },
    { city: 'Adak', zone: 'HST', offset: -10 },
    { city: 'Honolulu', zone: 'HST', offset: -10 },
    { city: 'Pago Pago', zone: 'SST', offset: -11 },
    { city: 'Baker Island', zone: 'AoE', offset: -12 },
    { city: 'Sydney', zone: 'AEST', offset: 10 },
    { city: 'Brisbane', zone: 'AEST', offset: 10 },
    { city: 'Melbourne', zone: 'AEST', offset: 10 },
    { city: 'Canberra', zone: 'AEST', offset: 10 },
    { city: 'Lord Howe Island', zone: 'LHST', offset: 10.5 },
    { city: 'Norfolk Island', zone: 'NFT', offset: 11 },
    { city: 'Honiara', zone: 'SBT', offset: 11 },
    { city: 'Noumea', zone: 'NCT', offset: 11 },
    { city: 'Adelaide', zone: 'ACST', offset: 9.5 },
    { city: 'Darwin', zone: 'ACST', offset: 9.5 },
    { city: 'Seoul', zone: 'KST', offset: 9 },
    { city: 'Tokyo', zone: 'JST', offset: 9 },
    { city: 'Osaka', zone: 'JST', offset: 9 },
    { city: 'Pyongyang', zone: 'KST', offset: 9 },
    { city: 'Perth', zone: 'AWST', offset: 8 },
    { city: 'Eucla', zone: 'CWST', offset: 8.75 },
    { city: 'Kuala Lumpur', zone: 'MYT', offset: 8 },
    { city: 'Singapore', zone: 'SGT', offset: 8 },
    { city: 'Hong Kong', zone: 'HKT', offset: 8 },
    { city: 'Manila', zone: 'PHT', offset: 8 },
    { city: 'Beijing', zone: 'CST', offset: 8 },
    { city: 'Shanghai', zone: 'CST', offset: 8 },
    { city: 'Taipei', zone: 'CST', offset: 8 },
    { city: 'Ulaanbaatar', zone: 'ULAT', offset: 8 },
    { city: 'Yangon', zone: 'MMT', offset: 6.5 },
    { city: 'Dhaka', zone: 'BST', offset: 6 },
    { city: 'Thimphu', zone: 'BTT', offset: 6 },
    { city: 'Jakarta', zone: 'WIB', offset: 7 },
    { city: 'Bangkok', zone: 'ICT', offset: 7 },
    { city: 'Hanoi', zone: 'ICT', offset: 7 },
    { city: 'Phnom Penh', zone: 'ICT', offset: 7 },
    { city: 'Vientiane', zone: 'ICT', offset: 7 },
    { city: 'Kathmandu', zone: 'NPT', offset: 5.75 },
    { city: 'Delhi', zone: 'IST', offset: 5.5 },
    { city: 'Mumbai', zone: 'IST', offset: 5.5 },
    { city: 'Bangalore', zone: 'IST', offset: 5.5 },
    { city: 'Colombo', zone: 'IST', offset: 5.5 },
    { city: 'Kolkata', zone: 'IST', offset: 5.5 },
    { city: 'Karachi', zone: 'PKT', offset: 5 },
    { city: 'Islamabad', zone: 'PKT', offset: 5 },
    { city: 'Lahore', zone: 'PKT', offset: 5 },
    { city: 'Tashkent', zone: 'UZT', offset: 5 },
    { city: 'Kabul', zone: 'AFT', offset: 4.5 },
    { city: 'Dubai', zone: 'GST', offset: 4 },
    { city: 'Abu Dhabi', zone: 'GST', offset: 4 },
    { city: 'Muscat', zone: 'GST', offset: 4 },
    { city: 'Baku', zone: 'AZT', offset: 4 },
    { city: 'Tehran', zone: 'IRST', offset: 3.5 },
    { city: 'Baghdad', zone: 'AST', offset: 3 },
    { city: 'Riyadh', zone: 'AST', offset: 3 },
    { city: 'Kuwait City', zone: 'AST', offset: 3 },
    { city: 'Moscow', zone: 'MSK', offset: 3 },
    { city: 'Nairobi', zone: 'EAT', offset: 3 },
    { city: 'Istanbul', zone: 'TRT', offset: 3 },
    { city: 'Jerusalem', zone: 'IST', offset: 2 },
    { city: 'Beirut', zone: 'EET', offset: 2 },
    { city: 'Cairo', zone: 'EET', offset: 2 },
    { city: 'Johannesburg', zone: 'SAST', offset: 2 },
    { city: 'Athens', zone: 'EET', offset: 2 },
    { city: 'Helsinki', zone: 'EET', offset: 2 },
    { city: 'Bucharest', zone: 'EET', offset: 2 },
    { city: 'Vienna', zone: 'CET', offset: 1 },
    { city: 'Stockholm', zone: 'CET', offset: 1 },
    { city: 'Warsaw', zone: 'CET', offset: 1 },
    { city: 'Prague', zone: 'CET', offset: 1 },
    { city: 'Paris', zone: 'CET', offset: 1 },
    { city: 'Berlin', zone: 'CET', offset: 1 },
    { city: 'Rome', zone: 'CET', offset: 1 },
    { city: 'Madrid', zone: 'CET', offset: 1 },
    { city: 'Amsterdam', zone: 'CET', offset: 1 },
    { city: 'Brussels', zone: 'CET', offset: 1 },
    { city: 'Zurich', zone: 'CET', offset: 1 },
    { city: 'Geneva', zone: 'CET', offset: 1 },
    { city: 'Casablanca', zone: 'WET', offset: 0 },
    { city: 'Lisbon', zone: 'WET', offset: 0 },
    { city: 'London', zone: 'GMT', offset: 0 },
    { city: 'Dublin', zone: 'GMT', offset: 0 },
    { city: 'Reykjavik', zone: 'GMT', offset: 0 },
    { city: 'Accra', zone: 'GMT', offset: 0 },
    { city: 'Dakar', zone: 'GMT', offset: 0 },
    { city: 'Azores', zone: 'AZOT', offset: -1 },
    { city: 'Praia', zone: 'CVT', offset: -1 },
    { city: 'Buenos Aires', zone: 'ART', offset: -3 },
    { city: 'Sao Paulo', zone: 'BRT', offset: -3 },
    { city: 'Santiago', zone: 'CLT', offset: -3 },
    { city: 'Montevideo', zone: 'UYT', offset: -3 },
    { city: 'St. Johns', zone: 'NST', offset: -3.5 },
    { city: 'Halifax', zone: 'AST', offset: -4 },
    { city: 'Port of Spain', zone: 'AST', offset: -4 },
    { city: 'San Juan', zone: 'AST', offset: -4 },
    { city: 'Miami', zone: 'EST', offset: -5 },
    { city: 'New York', zone: 'EST', offset: -5 },
    { city: 'Toronto', zone: 'EST', offset: -5 },
    { city: 'Panama City', zone: 'EST', offset: -5 },
    { city: 'Bogota', zone: 'COT', offset: -5 },
    { city: 'Lima', zone: 'PET', offset: -5 },
    { city: 'Quito', zone: 'ECT', offset: -5 },
    { city: 'Chicago', zone: 'CST', offset: -6 },
    { city: 'Mexico City', zone: 'CST', offset: -6 },
    { city: 'Guatemala City', zone: 'CST', offset: -6 },
    { city: 'Denver', zone: 'MST', offset: -7 },
    { city: 'Phoenix', zone: 'MST', offset: -7 },
    { city: 'Calgary', zone: 'MST', offset: -7 },
    { city: 'Los Angeles', zone: 'PST', offset: -8 },
    { city: 'San Francisco', zone: 'PST', offset: -8 },
    { city: 'Seattle', zone: 'PST', offset: -8 },
    { city: 'Vancouver', zone: 'PST', offset: -8 },
    { city: 'Las Vegas', zone: 'PST', offset: -8 },
    { city: 'Tijuana', zone: 'PST', offset: -8 },
  ];
  
  function formatOffset(offset) {
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const hours = Math.floor(abs);
    const mins = Math.round((abs - hours) * 60);
    return sign + hours.toString().padStart(2, '0') + mins.toString().padStart(2, '0');
  }
  
  function getWorldClocks() {
    try {
      const stored = JSON.parse(localStorage.getItem(WORLD_CLOCKS_KEY));
      return stored && stored.length > 0 ? stored : defaultWorldClocks;
    } catch { return defaultWorldClocks; }
  }
  
  function saveWorldClocks(clocks) {
    localStorage.setItem(WORLD_CLOCKS_KEY, JSON.stringify(clocks));
  }
  
  let worldClocks = getWorldClocks();

  function updateWorldClocks() {
    const citiesEl = document.getElementById(`clock_cities_${winId}`);
    if (!citiesEl) return;
    const items = worldClocks.map((w, i) => `
      <div class="clock-world-item-wrap">
        <div class="clock-world-item">
          <span class="clock-world-city">${w.city} <span class="clock-world-tz">${formatOffset(w.offset)}</span></span>
          <span class="clock-world-time">${getCityTime(w)}<span class="clock-world-zone">${w.zone}</span></span>
        </div>
        <button class="clock-remove-city" onclick="removeWorldClock(${i})">×</button>
      </div>
    `).join('');
    citiesEl.innerHTML = items;
  }
  
  function getCityTime(w) {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cityTime = new Date(utc + (w.offset * 3600000));
    return cityTime.getUTCHours().toString().padStart(2, '0') + ':' + cityTime.getUTCMinutes().toString().padStart(2, '0');
  }
  
  window.removeWorldClock = function(index) {
    worldClocks.splice(index, 1);
    saveWorldClocks(worldClocks);
    updateWorldClocks();
  };
  
  window.showAddCityModal = function() {
    const modal = document.getElementById(`clock_city_modal_${winId}`);
    const list = document.getElementById(`clock_city_list_${winId}`);
    const searchInput = document.getElementById(`clock_city_search_${winId}`);
    modal.classList.add('open');
    searchInput.value = '';
    
    function renderCities(filter = '') {
      const addedCities = worldClocks.map(w => w.city);
      const filtered = availableCities.filter(c => 
        !addedCities.includes(c.city) && 
        (c.city.toLowerCase().includes(filter.toLowerCase()) || 
         c.zone.toLowerCase().includes(filter.toLowerCase()) ||
         formatOffset(c.offset).includes(filter))
      );
      
      if (filtered.length === 0) {
        list.innerHTML = '<div style="color:var(--text-sec);text-align:center;padding:30px 20px;font-size:13px">No cities found</div>';
        return;
      }
      
      list.innerHTML = filtered.map(c => `
        <div class="city-option" onclick="addWorldCity('${c.city}', '${c.zone}', ${c.offset})">
          <div class="city-option-info">
            <span class="city-option-name">${c.city}</span>
            <span class="city-option-zone-name">${c.zone}</span>
          </div>
          <span class="city-option-tz">${formatOffset(c.offset)}</span>
        </div>
      `).join('');
    }
    
    renderCities();
    searchInput.addEventListener('input', () => renderCities(searchInput.value));
    refreshLucideIcons(modal);
  };
  
  window.closeCityModal = function() {
    document.getElementById(`clock_city_modal_${winId}`).classList.remove('open');
  };
  
  window.addWorldCity = function(city, zone, offset) {
    worldClocks.push({ city, zone, offset });
    saveWorldClocks(worldClocks);
    updateWorldClocks();
    closeCityModal();
  };

  function formatStopwatch(ms) {
    const h = Math.floor(ms / 3600000).toString().padStart(2, '0');
    const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    const ms2 = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${h}:${m}:${s}.${ms2}`;
  }

  container.innerHTML = `
    <div class="app-clock">
      <div class="clock-tabs">
        <div class="clock-tab active" data-tab="clock">Clock</div>
        <div class="clock-tab" data-tab="world">World</div>
        <div class="clock-tab" data-tab="stopwatch">Stopwatch</div>
        <div class="clock-tab" data-tab="timer">Timer</div>
      </div>
      <div class="clock-content" id="clock_content_${winId}">
        <div class="clock-face">
          <div class="clock-time-display" id="clock_time_${winId}">00:00:00</div>
          <div class="clock-date-display" id="clock_date_${winId}">Monday, January 1</div>
        </div>
      </div>
      <div class="clock-world" id="clock_world_${winId}" style="display:none">
        <div class="clock-world-header">
          <div class="clock-world-title">World Clock</div>
          <button class="clock-add-city" onclick="showAddCityModal()">+ Add City</button>
        </div>
        <div id="clock_cities_${winId}"></div>
      </div>
      <div class="city-select-modal" id="clock_city_modal_${winId}">
        <div class="city-select-box">
          <div class="city-modal-header">
            <h3>Add City</h3>
            <button class="city-modal-close" onclick="closeCityModal()"><i data-lucide="x"></i></button>
          </div>
          <div class="city-search-wrap">
            <i data-lucide="search" style="width:16px;height:16px;color:var(--text-sec)"></i>
            <input type="text" class="city-search-input" id="clock_city_search_${winId}" placeholder="Search city or timezone..." />
          </div>
          <div class="city-list-container">
            <div id="clock_city_list_${winId}"></div>
          </div>
        </div>
      </div>
      <div class="clock-stopwatch" id="clock_stopwatch_${winId}" style="display:none">
        <div class="clock-big-time" id="sw_display_${winId}">00:00:00.00</div>
        <div class="clock-st-controls">
          <button class="clock-st-btn primary" id="sw_start_${winId}">Start</button>
          <button class="clock-st-btn secondary" id="sw_reset_${winId}">Reset</button>
        </div>
      </div>
      <div class="clock-timer" id="clock_timer_${winId}" style="display:none">
        <div class="clock-big-time" id="timer_display_${winId}" contenteditable="true" spellcheck="false">00:05:00</div>
        <div class="clock-st-controls">
          <button class="clock-st-btn primary" id="timer_start_${winId}">Start</button>
          <button class="clock-st-btn secondary" id="timer_reset_${winId}">Reset</button>
        </div>
        <div class="timer-alarm" id="timer_alarm_${winId}">
          <div class="timer-alarm-bell">ðŸ””</div>
          <div class="timer-alarm-text">Time's up!</div>
          <button class="clock-st-btn primary" id="timer_dismiss_${winId}">Dismiss</button>
        </div>
      </div>
    </div>`;

  updateClockDisplay();
  setInterval(updateClockDisplay, 1000);
  updateWorldClocks();
  setInterval(updateWorldClocks, 60000);

  container.querySelectorAll('.clock-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.clock-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const t = tab.dataset.tab;
      document.getElementById(`clock_content_${winId}`).style.display = t === 'clock' ? 'flex' : 'none';
      document.getElementById(`clock_world_${winId}`).style.display = t === 'world' ? 'block' : 'none';
      document.getElementById(`clock_stopwatch_${winId}`).style.display = t === 'stopwatch' ? 'block' : 'none';
      document.getElementById(`clock_timer_${winId}`).style.display = t === 'timer' ? 'block' : 'none';
      if (t === 'world') updateWorldClocks();
    });
  });

  const swStartBtn = document.getElementById(`sw_start_${winId}`);
  const swResetBtn = document.getElementById(`sw_reset_${winId}`);
  
  swStartBtn.addEventListener('click', () => {
    if (stopwatchRunning) {
      clearInterval(stopwatchInterval);
      stopwatchRunning = false;
      swStartBtn.textContent = 'Resume';
    } else {
      stopwatchRunning = true;
      swStartBtn.textContent = 'Pause';
      stopwatchInterval = setInterval(() => {
        stopwatchTime += 10;
        document.getElementById(`sw_display_${winId}`).textContent = formatStopwatch(stopwatchTime);
      }, 10);
    }
  });
  
  swResetBtn.addEventListener('click', () => {
    clearInterval(stopwatchInterval);
    stopwatchRunning = false;
    stopwatchTime = 0;
    swStartBtn.textContent = 'Start';
    document.getElementById(`sw_display_${winId}`).textContent = '00:00:00.00';
  });

  let timerInterval = null;
  let timerRemaining = 0;
  let timerRunning = false;

  function formatTimerDisplay(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  const timerStartBtn = document.getElementById(`timer_start_${winId}`);
  const timerResetBtn = document.getElementById(`timer_reset_${winId}`);
  const timerDisplay = document.getElementById(`timer_display_${winId}`);
  const timerAlarm = document.getElementById(`timer_alarm_${winId}`);
  const timerDismissBtn = document.getElementById(`timer_dismiss_${winId}`);

  function parseTimerInput() {
    const text = timerDisplay.textContent.trim();
    const parts = text.split(':');
    let h = 0, m = 0, s = 0;
    if (parts.length === 3) {
      h = parseInt(parts[0]) || 0;
      m = parseInt(parts[1]) || 0;
      s = parseInt(parts[2]) || 0;
    } else if (parts.length === 2) {
      m = parseInt(parts[0]) || 0;
      s = parseInt(parts[1]) || 0;
    }
    return h * 3600 + m * 60 + s;
  }

  function formatTimerDisplay(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  timerDisplay.addEventListener('blur', () => {
    if (!timerRunning) {
      timerRemaining = parseTimerInput();
      timerDisplay.textContent = formatTimerDisplay(timerRemaining);
    }
  });

  timerStartBtn.addEventListener('click', () => {
    if (timerRunning) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerStartBtn.textContent = 'Resume';
      timerDisplay.contentEditable = 'true';
    } else {
      if (timerRemaining <= 0) {
        timerRemaining = parseTimerInput();
        if (timerRemaining <= 0) return;
      }
      timerRunning = true;
      timerStartBtn.textContent = 'Pause';
      timerDisplay.contentEditable = 'false';
      timerInterval = setInterval(() => {
        timerRemaining--;
        timerDisplay.textContent = formatTimerDisplay(timerRemaining);
        if (timerRemaining <= 0) {
          clearInterval(timerInterval);
          timerRunning = false;
          timerStartBtn.textContent = 'Start';
          timerAlarm.classList.add('active');
          timerDisplay.contentEditable = 'true';
          showNotification('Timer', 'Timer completed!');
          SoundService.play('alert');
        }
      }, 1000);
    }
  });

  timerResetBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerRunning = false;
    timerStartBtn.textContent = 'Start';
    timerAlarm.classList.remove('active');
    timerDisplay.contentEditable = 'true';
    timerDisplay.textContent = '00:05:00';
    timerRemaining = 300;
  });

  timerDismissBtn.addEventListener('click', () => {
    timerAlarm.classList.remove('active');
  });
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   GALLERY
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderGallery(container, winId) {
  const placeholderImg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect fill="%23333" width="120" height="120"/%3E%3Ctext x="60" y="65" text-anchor="middle" fill="%23666" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';

  async function loadImages() {
    try {
      const res = await fetch('/api/media?type=images');
      const data = await res.json();
      return data.images || [];
    } catch (e) {
      return [];
    }
  }

  function renderImageGrid(images) {
    const grid = document.getElementById(`gal_grid_${winId}`);
    if (images.length === 0) {
      grid.innerHTML = `
        <div class="gallery-empty">
          ${lucideIconHtml('images', 48)}
          <div>No images found in Pictures folder</div>
          <div style="font-size:12px;color:var(--text-ter)">Add images to files/Pictures to see them here</div>
        </div>`;
      refreshLucideIcons(grid);
      return;
    }
    grid.innerHTML = images.map(img => `
      <div class="gallery-item" data-path="${img.path}">
        <img src="${placeholderImg}" data-src="/api/file/read/json?path=${encodeURIComponent(img.path)}" alt="${img.name}" />
        <div class="gallery-item-overlay">
          <span class="gallery-item-name">${img.name}</span>
        </div>
      </div>
    `).join('');
    
    // Load actual images
    grid.querySelectorAll('.gallery-item img').forEach(img => {
      const src = img.dataset.src;
      fetch(src).then(r => r.json()).then(data => {
        if (data.success && data.content) {
          // Check if it's an image file by extension
          const path = img.closest('.gallery-item').dataset.path;
          const ext = path.split('.').pop().toLowerCase();
          if (['png','jpg','jpeg','gif','webp','svg','bmp'].includes(ext)) {
            img.src = data.content; // Base64 or data URL
          }
        }
      }).catch(() => {});
    });
    
  grid.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const path = item.dataset.path;
      const img = item.querySelector('img');
      openImageInWindow(path, img.dataset.src);
    });
  });
}

function openImageInWindow(path, srcUrl) {
  // The srcUrl is the API endpoint, we need to get the base64 from it
  fetch(srcUrl).then(r => r.json()).then(data => {
    if (data.success) {
      const winId = launchApp('gallery-viewer', { path, src: data.content });
    } else {
      showNotification('Gallery', 'Could not load image', 'alert-circle');
    }
  });
}

  container.innerHTML = `
    <div class="app-gallery">
      <div class="gallery-toolbar">
        <input type="text" id="gal_search_${winId}" placeholder="Search images..." />
        <button id="gal_refresh_${winId}" style="padding:8px 14px;border-radius:8px;background:var(--surface-hover);color:var(--text);border:1px solid var(--border);cursor:pointer;font-size:12px">${lucideIconHtml('refreshCw', 14)} Refresh</button>
      </div>
      <div class="gallery-grid" id="gal_grid_${winId}">
        <div style="padding:40px;text-align:center;color:var(--text-sec)">Loading images...</div>
      </div>
    </div>`;
  refreshLucideIcons(container);

  loadImages().then(renderImageGrid);

  document.getElementById(`gal_search_${winId}`).addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    container.querySelectorAll('.gallery-item').forEach(item => {
      const name = item.querySelector('.gallery-item-name').textContent.toLowerCase();
      item.style.display = name.includes(q) ? '' : 'none';
    });
  });

  document.getElementById(`gal_refresh_${winId}`).addEventListener('click', () => {
    loadImages().then(renderImageGrid);
  });
}

function openImageViewer(path, imgEl) {
  const modal = document.createElement('div');
  modal.className = 'gallery-viewer-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
  modal.innerHTML = `
    <div style="max-width:90%;max-height:90%;position:relative">
      <img src="${imgEl.dataset.src}" style="max-width:100%;max-height:80vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.5)" />
      <div style="text-align:center;margin-top:16px;color:#fff;font-size:14px">${path.split('/').pop()}</div>
      <button style="position:absolute;top:-40px;right:0;background:none;border:none;color:#fff;cursor:pointer;font-size:24px">-</button>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('button').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function renderGalleryViewer(container, winId, extra) {
  const { path, src } = extra;
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:var(--surface);">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
        ${lucideIconHtml('image', 20)}
        <span style="font-weight:600;flex:1">${path ? path.split('/').pop() : 'Image Viewer'}</span>
        <button onclick="closeWin('${winId}')" style="background:none;border:none;cursor:pointer;padding:4px">${lucideIconHtml('x', 18)}</button>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;background:#0a0a0a;overflow:auto">
        <img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5)" />
      </div>
    </div>`;
  refreshLucideIcons(container);
}

function renderVideoPlayer(container, winId, extra) {
  const { path, src } = extra;
  
  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sc = Math.floor(s % 60);
    return `${m}:${sc.toString().padStart(2, '0')}`;
  }
  
  container.innerHTML = `
    <div class="app-video-player">
      <div class="vp-header">
        ${lucideIconHtml('play-circle', 20)}
        <span class="vp-header-title">${path ? path.split('/').pop() : 'Video Player'}</span>
        <button onclick="closeWin('${winId}')" style="background:none;border:none;cursor:pointer;color:#fff;opacity:0.7">${lucideIconHtml('x', 18)}</button>
      </div>
      <div class="vp-player" id="vp_player_${winId}">
        <video id="vp_video_${winId}" controls style="max-width:100%;max-height:100%">
          <source src="${src}">
          Your browser does not support video playback.
        </video>
      </div>
      <div class="vp-controls" id="vp_controls_${winId}">
        <button class="vp-btn" id="vp_play_${winId}">${lucideIconHtml('play', 20)}</button>
        <div class="vp-progress" style="flex:1" id="vp_progress_${winId}">
          <div class="vp-progress-fill" id="vp_progress_fill_${winId}" style="width:0%"></div>
        </div>
        <span class="vp-time" id="vp_time_${winId}">0:00 / 0:00</span>
        <button class="vp-btn" id="vp_full_${winId}" style="width:36px;height:36px">${lucideIconHtml('maximize', 18)}</button>
      </div>
    </div>`;
  
  refreshLucideIcons(container);
  
  const vidEl = document.getElementById(`vp_video_${winId}`);
  const progressFill = document.getElementById(`vp_progress_fill_${winId}`);
  const timeEl = document.getElementById(`vp_time_${winId}`);
  const playBtn = document.getElementById(`vp_play_${winId}`);
  
  vidEl.addEventListener('loadedmetadata', () => {
    if (vidEl.videoWidth && vidEl.videoHeight) {
      const aspectRatio = vidEl.videoWidth / vidEl.videoHeight;
      const winData = windowsMap.get(winId);
      if (winData) {
        const headerH = 60, controlsH = 80;
        let newW = Math.min(1200, Math.max(640, Math.round((winData.h - headerH - controlsH) * aspectRatio + headerH + controlsH)));
        let newH = winData.h;
        if (newW / newH > aspectRatio) { newW = Math.round(newH * aspectRatio); }
        else { newH = Math.round(newW / aspectRatio + 60 + 80); }
        winData.w = newW;
        winData.h = newH;
        const winEl = document.getElementById(winId);
        if (winEl) { winEl.style.width = newW + 'px'; winEl.style.height = newH + 'px'; }
      }
    }
  });
  
  vidEl.addEventListener('timeupdate', () => {
    if (vidEl.duration) {
      const pct = (vidEl.currentTime / vidEl.duration) * 100;
      progressFill.style.width = pct + '%';
      timeEl.textContent = `${formatTime(vidEl.currentTime)} / ${formatTime(vidEl.duration)}`;
    }
  });
  
  playBtn.addEventListener('click', () => {
    if (vidEl.paused) { vidEl.play(); playBtn.innerHTML = lucideIconHtml('pause', 20); }
    else { vidEl.pause(); playBtn.innerHTML = lucideIconHtml('play', 20); }
  });
  
  document.getElementById(`vp_progress_${winId}`).addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    vidEl.currentTime = pct * vidEl.duration;
  });
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   VIDEO PLAYER
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderVideo(container, winId) {
  async function loadVideos() {
    try {
      const res = await fetch('/api/media?type=videos');
      const data = await res.json();
      return data.videos || [];
    } catch (e) {
      return [];
    }
  }

  function renderVideoList(videos) {
    const list = document.getElementById(`vid_list_${winId}`);
    if (videos.length === 0) {
      list.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--text-sec)">
          <div>No videos found in Videos folder</div>
          <div style="font-size:11px;color:var(--text-ter);margin-top:4px">Add videos to files/Videos to see them here</div>
        </div>`;
      return;
    }
    list.innerHTML = videos.map((v, i) => `
      <div class="video-list-item" data-path="${v.path}">
        ${lucideIconHtml('film', 18)}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.name}</div>
          <div style="font-size:11px;color:var(--text-sec)">${(v.size / 1024 / 1024).toFixed(1)} MB</div>
        </div>
      </div>
    `).join('');
    
    list.querySelectorAll('.video-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        playVideo(path, item);
      });
    });
    refreshLucideIcons(list);
  }

  function playVideo(path, item) {
    // Fetch video as base64 and open in new window
    fetch(`/api/file/read/json?path=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          launchApp('video-player', { path, src: data.content });
        } else {
          showNotification('Videos', 'Could not load video', 'alert-circle');
        }
      })
      .catch(err => {
        showNotification('Videos', 'Error loading video', 'alert-circle');
      });
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sc = Math.floor(s % 60);
    return `${m}:${sc.toString().padStart(2, '0')}`;
  }

  container.innerHTML = `
    <div class="app-video">
      <div class="video-title-bar">
        <span class="video-title">Videos</span>
        <button id="vid_full_${winId}" style="background:none;border:none;cursor:pointer;color:var(--text)">${lucideIconHtml('maximize-2', 16)}</button>
      </div>
      <div class="video-player" id="vid_player_${winId}">
        <div class="video-placeholder">
          ${lucideIconHtml('video', 64)}
          <div style="font-size:14px">Select a video to play</div>
        </div>
      </div>
      <div class="video-controls" id="vid_controls_${winId}" style="display:none">
        <button class="video-btn" id="vid_play_${winId}">${lucideIconHtml('play', 18)}</button>
        <div class="video-progress" style="flex:1;cursor:pointer"><div class="video-progress-fill" style="width:0%"></div></div>
        <span class="video-time">0:00 / 0:00</span>
        <button class="video-btn">${lucideIconHtml('volume-2', 18)}</button>
      </div>
      <div class="video-list" id="vid_list_${winId}">
        <div style="padding:20px;text-align:center;color:var(--text-sec)">Loading videos...</div>
      </div>
    </div>`;
  refreshLucideIcons(container);

  loadVideos().then(renderVideoList);
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   MAIL
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
let mailMessages = [];
let userEmail = '';
let mailUnsubscribe = null;

async function initMail() {
  let username = 'User';
  if (state && state.username) {
    username = state.username;
  } else if (typeof state === 'undefined') {
    username = 'user';
  }
  username = username.toLowerCase().replace(/\s/g, '');
  const uniqueNum = currentUserId || '001';
  userEmail = username + '.' + uniqueNum + '@webos';
  console.log('initMail - email:', userEmail);
  return { email: userEmail };
}

async function loadMail(folder = 'inbox') {
  if (!db) {
    try {
      const endpoint = folder === 'sent' ? '/api/mail/sent' : '/api/mail/inbox';
      const res = await fetch(endpoint, {
        headers: { 'X-User-Email': userEmail }
      });
      mailMessages = await res.json();
      return mailMessages;
    } catch (e) {
      return [];
    }
  }
  
  if (mailUnsubscribe) {
    mailUnsubscribe();
    mailUnsubscribe = null;
  }
  
  mailMessages = [];
  const userId = userEmail;
  
  try {
    const q = firebase.firestore().collection('mail')
      .where(folder === 'sent' ? 'from' : 'to', '==', userId)
      .orderBy('timestamp', 'desc');
    
    let lastMailCount = 0;
    mailUnsubscribe = q.onSnapshot((snapshot) => {
      const currentCount = snapshot.size;
      if (currentCount > lastMailCount && lastMailCount > 0) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const email = change.doc.data();
            if (email.to === userEmail && email.unread) {
              showNotification('Mail', `${email.from}: ${email.subject}`, 'mail');
            }
          }
        });
      }
      lastMailCount = currentCount;
      mailMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (currentMailWinId && document.getElementById(`mail_list_${currentMailWinId}`)) {
        renderMailList(folder);
        updateMailCount();
      }
    });
    
    return mailMessages;
  } catch (e) {
    console.log('Firestore mail query error:', e);
    return [];
  }
}

let currentMailWinId = null;
let currentMailContainer = null;

function updateMailCount() {
  if (!currentMailWinId) return;
  const countEl = document.getElementById(`mail_count_${currentMailWinId}`);
  if (countEl && mailMessages) {
    const unreadCount = mailMessages.filter(m => m.unread && m.to === userEmail).length;
    countEl.textContent = unreadCount;
  }
}

function renderMailList(folder = 'inbox') {
  if (!currentMailWinId) return;
  const list = document.getElementById(`mail_list_${currentMailWinId}`);
  if (mailMessages.length === 0) {
    list.innerHTML = `
      <div style="padding:40px;text-align:center;color:var(--text-sec)">
        ${lucideIconHtml('mail', 32)}
        <div style="margin-top:12px">${folder === 'sent' ? 'No sent messages' : 'No messages'}</div>
        <div style="font-size:11px;color:var(--text-ter);margin-top:8px">Your email: <span style="color:var(--accent-light)">${userEmail || 'Loading...'}</span></div>
      </div>`;
    return;
  }
  
  list.innerHTML = mailMessages.map((e) => `
    <div class="mail-item ${e.unread ? 'unread' : ''}" data-id="${e.id}">
      <div class="mail-avatar">${(folder === 'sent' ? (e.to || 'U') : (e.from || 'U')).charAt(0).toUpperCase()}</div>
      <div class="mail-content">
        <div class="mail-subject">${escapeHtml(e.subject || 'No Subject')}</div>
        <div class="mail-preview">${escapeHtml(e.body || '').substring(0, 50)}</div>
      </div>
      <div class="mail-date">${e.time}</div>
    </div>
  `).join('');
  
  list.querySelectorAll('.mail-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      const email = mailMessages.find(m => m.id === id);
      if (email && currentMailContainer) {
        currentMailContainer.querySelectorAll('.mail-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const view = document.getElementById(`mail_view_${currentMailWinId}`);
        view.classList.add('active');
        view.querySelector('.mail-view-subject').textContent = email.subject || 'No Subject';
        const metaText = folder === 'sent' ? `To: ${email.to}` : `From: ${email.from}`;
        view.querySelector('.mail-view-meta').textContent = `${metaText} · ${email.time} · ${email.date}`;
        view.querySelector('.mail-view-body').textContent = email.body || '';
        email.unread = false;
        item.classList.remove('unread');
        updateMailCount();
      }
    });
  });
}

function renderMail(container, winId) {
  currentMailWinId = winId;
  currentMailContainer = container;
  let currentFolder = 'inbox';
  
  async function setup() {
    await initMail();
    await loadMail(currentFolder);
    renderMailList(currentFolder);
    updateMailCount();
    document.getElementById(`mail_email_${winId}`).textContent = userEmail || 'Not available';
  }
  
  container.innerHTML = `
    <div class="app-mail">
      <div class="mail-sidebar">
        <div style="padding:12px;border-bottom:1px solid var(--border);margin-bottom:8px">
          <div style="font-size:10px;color:var(--text-ter);text-transform:uppercase;margin-bottom:4px">Your Email</div>
          <div style="font-size:12px;color:var(--accent-light);word-break:break-all" id="mail_email_${winId}">Loading...</div>
        </div>
        <div class="mail-folder active" data-folder="inbox">${lucideIconHtml('inbox', 16)} Inbox <span class="mail-folder-count" id="mail_count_${winId}">0</span></div>
        <div class="mail-folder" data-folder="sent">${lucideIconHtml('send', 16)} Sent</div>
        <div class="mail-folder" data-folder="compose">${lucideIconHtml('edit-3', 16)} Compose</div>
      </div>
      <div class="mail-main">
        <div class="mail-toolbar">
          <button id="mail_compose_${winId}">${lucideIconHtml('pen-square', 14)} Compose</button>
          <button id="mail_refresh_${winId}">${lucideIconHtml('refreshCw', 14)}</button>
          <button>${lucideIconHtml('trash-2', 14)}</button>
        </div>
        <div class="mail-list" id="mail_list_${winId}">
          <div style="padding:20px;text-align:center;color:var(--text-sec)">Loading...</div>
        </div>
        <div class="mail-view" id="mail_view_${winId}">
          <div class="mail-view-header">
            <div class="mail-view-subject">Select an email to read</div>
            <div class="mail-view-meta"></div>
          </div>
          <div class="mail-view-body"></div>
        </div>
      </div>
    </div>
    <div class="mail-compose-overlay" id="mail_compose_overlay_${winId}" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center">
      <div class="mail-compose-box" style="background:var(--surface);border-radius:var(--radius-lg);width:90%;max-width:500px;border:1px solid var(--border);box-shadow:var(--shadow-lg)">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">New Message</span>
          <button id="mail_compose_close_${winId}" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--text-sec)">-</button>
        </div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
          <input type="text" id="mail_to_${winId}" placeholder="To" style="padding:10px 12px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px" />
          <input type="text" id="mail_subj_${winId}" placeholder="Subject" style="padding:10px 12px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px" />
          <textarea id="mail_body_${winId}" placeholder="Write your message..." style="padding:10px 12px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;min-height:150px;resize:none"></textarea>
          <button id="mail_send_${winId}" style="padding:10px 20px;border-radius:6px;background:var(--accent);color:#fff;border:none;font-weight:600;cursor:pointer">Send</button>
        </div>
      </div>
    </div>`;
  refreshLucideIcons(container);
  
  setup();
  
  document.getElementById(`mail_compose_${winId}`).addEventListener('click', () => {
    document.getElementById(`mail_compose_overlay_${winId}`).style.display = 'flex';
  });
  
  document.getElementById(`mail_compose_close_${winId}`).addEventListener('click', () => {
    document.getElementById(`mail_compose_overlay_${winId}`).style.display = 'none';
  });
  
  document.getElementById(`mail_refresh_${winId}`).addEventListener('click', async () => {
    await loadMail(currentFolder);
    renderMailList(currentFolder);
  });
  
  document.getElementById(`mail_send_${winId}`).addEventListener('click', async () => {
    const to = document.getElementById(`mail_to_${winId}`).value;
    const subject = document.getElementById(`mail_subj_${winId}`).value;
    const body = document.getElementById(`mail_body_${winId}`).value;
    
    if (!to || !subject) {
      showNotification('Mail', 'Please fill in recipient and subject', 'alert-circle');
      return;
    }
    
    const from = userEmail;
    const timestamp = firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : Date.now();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString();
    
    if (db) {
      try {
        await firebase.firestore().collection('mail').add({
          from: from,
          to: to,
          subject: subject,
          body: body,
          timestamp: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
          time: timeStr,
          date: dateStr,
          unread: true
        });
        showNotification('Mail', 'Message sent!', 'check-circle');
        document.getElementById(`mail_compose_overlay_${winId}`).style.display = 'none';
        document.getElementById(`mail_to_${winId}`).value = '';
        document.getElementById(`mail_subj_${winId}`).value = '';
        document.getElementById(`mail_body_${winId}`).value = '';
        currentFolder = 'sent';
        container.querySelectorAll('.mail-folder').forEach(f => f.classList.remove('active'));
        await loadMail('sent');
        renderMailList('sent');
        return;
      } catch (e) {
        console.log('Firebase mail error, falling back to API');
      }
    }
    
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Email': userEmail
        },
        body: JSON.stringify({ to, subject, body })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Mail', 'Message sent!', 'check-circle');
        document.getElementById(`mail_compose_overlay_${winId}`).style.display = 'none';
        document.getElementById(`mail_to_${winId}`).value = '';
        document.getElementById(`mail_subj_${winId}`).value = '';
        document.getElementById(`mail_body_${winId}`).value = '';
        currentFolder = 'sent';
        container.querySelectorAll('.mail-folder').forEach(f => f.classList.remove('active'));
        container.querySelector('[data-folder="sent"]').classList.add('active');
        await loadMail('sent');
        renderMailList('sent');
      }
    } catch (e) {
      showNotification('Mail', 'Failed to send message', 'alert-circle');
    }
  });
  
  container.querySelectorAll('.mail-folder').forEach(folder => {
    folder.addEventListener('click', async () => {
      container.querySelectorAll('.mail-folder').forEach(f => f.classList.remove('active'));
      folder.classList.add('active');
      currentFolder = folder.dataset.folder;
      
      if (currentFolder === 'compose') {
        document.getElementById(`mail_compose_overlay_${winId}`).style.display = 'flex';
      } else {
        await loadMail(currentFolder);
        renderMailList(currentFolder);
      }
    });
  });
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   STORE
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
let storeApps = { available: [], installed: [] };
const installedAppsSet = new Set();
let currentStoreWinId = null;
let currentStoreContainer = null;

async function loadStoreApps() {
  try {
    const res = await fetch('/api/store/apps');
    storeApps = await res.json();
    
    // Load installed apps from localStorage (uninstalled apps)
    const uninstalledApps = JSON.parse(localStorage.getItem('wos_uninstalled_apps') || '[]');
    const uninstalledSet = new Set(uninstalledApps);
    
    // Mark pinned apps as installed, filter out uninstalled ones
    storeApps.available.forEach(app => {
      const appDef = APPS[app.id];
      if (appDef && appDef.pinned === true) {
        installedAppsSet.add(app.id);
      }
      if (uninstalledSet.has(app.id)) {
        installedAppsSet.delete(app.id);
      }
    });
    
    return storeApps;
  } catch (e) {
    return { available: [], installed: [] };
  }
}

function renderStoreAppList() {
  if (!currentStoreWinId) return;
  const grid = document.getElementById(`store_grid_${currentStoreWinId}`);
  
  // Show apps that are NOT installed
  const available = storeApps.available.filter(app => !installedAppsSet.has(app.id));
  
  if (available.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-sec)">
        ${lucideIconHtml('check-circle', 32)}
        <div style="margin-top:12px">All apps installed!</div>
      </div>`;
    refreshLucideIcons(grid);
    return;
  }
  
  grid.innerHTML = available.map(a => `
    <div class="store-app" data-app-id="${a.id}">
      <div class="store-app-icon">${lucideIconHtml(a.icon, 28)}</div>
      <div class="store-app-name">${a.name}</div>
      <div class="store-app-dev">${a.size}</div>
      <div class="store-app-rating">${lucideIconHtml('download', 12)} Available</div>
      <button class="store-get-btn" data-app-id="${a.id}">Get</button>
    </div>
  `).join('');
  
  grid.querySelectorAll('.store-get-btn').forEach(btn => {
    btn.addEventListener('click', () => downloadApp(btn.dataset.appId));
  });
  refreshLucideIcons(grid);
}

async function downloadApp(appId) {
  const container = currentStoreContainer;
  if (!container) return;
  const btn = container.querySelector(`.store-get-btn[data-app-id="${appId}"]`);
  const app = storeApps.available.find(a => a.id === appId);
  if (!app) return;
  
  btn.disabled = true;
  btn.textContent = 'Downloading...';
  
  // Simulate download progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 100) progress = 100;
    btn.textContent = `Downloading ${Math.floor(progress)}%`;
    
    if (progress >= 100) {
      clearInterval(progressInterval);
      installApp(appId, app);
    }
  }, 200);
}

async function installApp(appId, app) {
  try {
    const res = await fetch('/api/store/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId })
    });
    const data = await res.json();
    
    if (data.success) {
      installedAppsSet.add(appId);
      showNotification('Store', `${app.name} installed successfully!`, 'check-circle');
      renderStoreAppList();
      buildStartGrid();
    }
  } catch (e) {
    installedAppsSet.add(appId);
    showNotification('Store', `${app.name} installed!`, 'check-circle');
    renderStoreAppList();
    buildStartGrid();
  }
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   CHAT
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderChat(container, winId) {
  let currentUser = state.username || 'User';
  let chatSocket = null;
  let chatUsers = [];
  let chatUnsubscribe = null;
  let usersUnsubscribe = null;
  let chatUserUnsub = null;
  let chatUserDocId = null;
  let lastLoadedMessages = [];
   
  async function connectToChat() {
    chatUserDocId = currentUserId || 'user_' + Date.now();
    currentUser = state.username || 'User';
    
    if (!db) {
      if (typeof io === 'undefined') {
        console.log('Socket.io not loaded, using local chat');
        return;
      }
      chatSocket = io();
      chatSocket.on('connect', () => {
        chatSocket.emit('chat-join', { name: currentUser });
      });
      chatSocket.on('chat-users', (users) => {
        const seen = new Set();
        chatUsers = users.filter(u => {
          if (seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });
        renderChatUsers();
      });
      chatSocket.on('chat-message', (msg) => {
        addMessageToChat(msg, true);
      });
      chatSocket.on('chat-user-left', (data) => {
        showNotification('Chat', `${data.name} left the chat`, 'user-minus');
      });
      return;
    }
    
    try {
      const messagesQuery = firebase.firestore().collection('chat_messages').orderBy('timestamp', 'desc');
      
      let lastChatCount = 0;
      chatUnsubscribe = messagesQuery.onSnapshot((snapshot) => {
        const currentCount = snapshot.size;
        if (currentCount > lastChatCount && lastChatCount > 0) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const msg = { id: change.doc.id, ...change.doc.data() };
              if (msg.userId !== chatUserDocId) {
                addMessageToChat(msg, true);
              }
            }
          });
        } else {
          snapshot.docs.forEach(d => {
            const msg = { id: d.id, ...d.data() };
            if (msg.userId !== chatUserDocId) {
              addMessageToChat(msg, true);
            }
          });
        }
        lastChatCount = currentCount;
      });
      
      chatUsers = [];
      usersUnsubscribe = firebase.firestore().collection('chat_users').onSnapshot((snapshot) => {
        chatUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderChatUsers();
      });
      
      await firebase.firestore().collection('chat_users').doc(chatUserDocId).set({
        name: currentUser,
        userId: chatUserDocId,
        online: true,
        lastSeen: Date.now()
      });
      
    } catch (e) {
      console.log('Firebase chat error:', e);
    }
  }
  
  function renderChatUsers() {
    const contactsEl = container.querySelector('.chat-contacts');
    const uniqueUsers = [];
    const seenIds = new Set();
    chatUsers.forEach(u => {
      if (!seenIds.has(u.id)) {
        seenIds.add(u.id);
        uniqueUsers.push(u);
      }
    });
    
    if (uniqueUsers.length === 0) {
      contactsEl.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--text-sec);font-size:12px">
          No other users online<br/>
          <span style="color:var(--text-ter)">Users Online.</span>
        </div>`;
      return;
    }
    
    contactsEl.innerHTML = uniqueUsers.map((u, i) => `
      <div class="chat-contact ${i === 0 ? 'active' : ''}" data-id="${u.id}">
        <div class="chat-contact-avatar">${u.name.charAt(0).toUpperCase()}</div>
        <div class="chat-contact-info">
          <div class="chat-contact-name">${escapeHtml(u.name)}</div>
          <div class="chat-contact-msg">Online</div>
        </div>
        <div class="chat-contact-time">Now</div>
      </div>
    `).join('');
  }
  
  function addMessageToChat(msg) {
    const messagesEl = container.querySelector('.chat-messages');
    const isSent = msg.user === currentUser || msg.user === 'You';
    const el = document.createElement('div');
    el.className = `chat-msg ${isSent ? 'sent' : 'received'}`;
    el.textContent = msg.text;
    el.innerHTML = `<div style="font-size:10px;opacity:0.6;margin-bottom:2px">${escapeHtml(msg.user)}</div>` + el.innerHTML;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  container.innerHTML = `
    <div class="app-chat">
      <div class="chat-sidebar">
        <div class="chat-search">
          <input type="text" id="chat_name_${winId}" placeholder="Your name" value="${escapeHtml(currentUser)}" />
        </div>
        <div class="chat-contacts" id="chat_contacts_${winId}">
          <div style="padding:20px;text-align:center;color:var(--text-sec)">Connecting...</div>
        </div>
      </div>
      <div class="chat-main">
        <div class="chat-header">
          <div class="chat-contact-avatar">${currentUser.charAt(0).toUpperCase()}</div>
          <div class="chat-header-info">
            <div class="chat-header-name">Local Network Chat</div>
            <div class="chat-header-status" id="chat_status_${winId}">Connecting...</div>
          </div>
          <button style="background:none;border:none;cursor:pointer;color:var(--text-sec)">${lucideIconHtml('more-vertical', 18)}</button>
        </div>
        <div class="chat-messages" id="chat_messages_${winId}">
          <div style="padding:20px;text-align:center;color:var(--text-sec);font-size:12px">
            Welcome to WebOS Chat!<br/>
            Messages are shared with all users.<br/>
            <span style="color:var(--text-ter)">Realtime Chat.</span>
          </div>
        </div>
        <div class="chat-input">
          <input type="text" id="chat_input_${winId}" placeholder="Type a message..." />
          <button id="chat_send_${winId}">${lucideIconHtml('send', 18)}</button>
        </div>
      </div>
    </div>`;
  refreshLucideIcons(container);
  
  connectToChat();
  
  const input = document.getElementById(`chat_input_${winId}`);
  const sendBtn = document.getElementById(`chat_send_${winId}`);
  const messagesEl = document.getElementById(`chat_messages_${winId}`);
  const nameInput = document.getElementById(`chat_name_${winId}`);
const statusEl = document.getElementById(`chat_status_${winId}`);
   
  if (statusEl) {
    if (db) {
      statusEl.textContent = 'Firebase Connected';
      statusEl.style.color = '#4ade80';
    } else {
      statusEl.textContent = 'Local only (Firebase not connected)';
      statusEl.style.color = '#f87171';
    }
  }
   
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    
    const msg = { user: currentUser, text, time: new Date().toLocaleTimeString(), id: Date.now(), userId: chatUserDocId };
    
    addMessageToChat(msg, false);
    
    if (db) {
      console.log('Saving to Firestore:', { user: currentUser, text, userId: chatUserDocId });
      try {
        const chatMsgRef = await db.collection('chat_messages').add({
          id: 'msg_' + Date.now(),
          user: currentUser,
          text: text,
          time: new Date().toLocaleTimeString(),
          timestamp: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
          userId: chatUserDocId
        });
        console.log('Message saved to Firestore!');
      } catch (e) {
        console.log('Firebase chat send error:', e);
      }
    } else if (chatSocket && chatSocket.connected) {
      chatSocket.emit('chat-message', { text, localId: msg.id });
    }
    
    input.value = '';
  }

  function addMessageToChat(msg, isFromSocket = true) {
    // Check for duplicate using localId or exact match
    const existing = messagesEl.querySelector(`.chat-msg[data-id="${msg.id}"]`);
    if (existing) return;
    
    const isSent = msg.user === currentUser || msg.user === 'You' || (isFromSocket && msg.user === currentUser);
    const el = document.createElement('div');
    el.className = `chat-msg ${isSent ? 'sent' : 'received'}`;
    el.dataset.id = msg.id;
    el.innerHTML = `<div style="font-size:10px;opacity:0.6;margin-bottom:2px">${isSent ? 'You' : escapeHtml(msg.user)}</div>${escapeHtml(msg.text)}`;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  function clearMessagesDisplay() {
    messagesEl.innerHTML = '';
  }
  
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
  
  nameInput.addEventListener('change', () => {
    currentUser = nameInput.value || 'User';
    if (chatSocket && chatSocket.connected) {
      chatSocket.emit('chat-join', { name: currentUser });
    }
  });
  
  if (typeof io !== 'undefined') {
    const checkConn = setInterval(() => {
      if (chatSocket && chatSocket.connected) {
        statusEl.textContent = `${chatUsers.length} online`;
        clearInterval(checkConn);
      } else {
        statusEl.textContent = 'Offline (run server)';
      }
    }, 1000);
  } else {
    statusEl.textContent = 'Socket.io not loaded';
  }
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   NOTEPAD
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderNotepad(container, winId, extra = {}) {
  container.innerHTML = `
    <div class="app-notepad">
      <div class="app-menubar">
        <div class="menu-item" id="np_file_${winId}">File
          <div class="dropdown-menu" id="np_filemenu_${winId}">
            <div class="dd-item" data-action="new">New <span class="dd-kbd">Ctrl+N</span></div>
            <div class="dd-item" data-action="open">Open</div>
            <div class="dd-sep"></div>
            <div class="dd-item" data-action="save">Save <span class="dd-kbd">Ctrl+S</span></div>
            <div class="dd-item" data-action="saveas">Save As</div>
            <div class="dd-sep"></div>
            <div class="dd-item" data-action="close">Close</div>
          </div>
        </div>
        <div class="menu-item">Edit</div>
        <div class="menu-item">View</div>
        <div class="menu-item">Help</div>
      </div>
      <textarea class="notepad-area" id="np_ta_${winId}" placeholder="Start typing" spellcheck="false"></textarea>
      <div class="notepad-status">
        <span id="np_ln_${winId}">Ln 1, Col 1</span>
        <span id="np_wc_${winId}">0 words</span>
        <span>${extra.filePath ? extra.filePath : 'Untitled'}</span>
      </div>
    </div>`;

  const ta   = document.getElementById(`np_ta_${winId}`);
  const lnEl = document.getElementById(`np_ln_${winId}`);
  const wcEl = document.getElementById(`np_wc_${winId}`);
  let currentFile = extra.filePath || null;

  if (currentFile && FS[currentFile]) ta.value = FS[currentFile].content || '';

  ta.addEventListener('input', () => {
    const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
    wcEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  });
  ta.addEventListener('keyup', () => {
    const lines = ta.value.substr(0, ta.selectionStart).split('\n');
    lnEl.textContent = `Ln ${lines.length}, Col ${lines[lines.length-1].length + 1}`;
  });

  // File menu toggle
  const fileBtn = document.getElementById(`np_file_${winId}`);
  const fileMenu = document.getElementById(`np_filemenu_${winId}`);
  fileBtn.addEventListener('click', e => { e.stopPropagation(); fileMenu.classList.toggle('open'); fileBtn.classList.toggle('open'); });
  document.addEventListener('click', () => { fileMenu.classList.remove('open'); fileBtn.classList.remove('open'); });

  fileMenu.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    fileMenu.classList.remove('open');
    fileBtn.classList.remove('open');

    if (action === 'new') {
      ta.value = ''; currentFile = null;
      document.querySelector(`#${winId} .win-title`).textContent = 'Untitled ” Notepad';
    }
    if (action === 'save') {
      if (currentFile) { fsWrite(currentFile, ta.value); showNotification('Notepad','File saved','save'); }
      else saveAsDialog(winId, ta);
    }
    if (action === 'saveas') saveAsDialog(winId, ta, f => { currentFile = f; });
    if (action === 'open') openFileDialog(winId, f => {
      currentFile = f.path;
      ta.value = f.content || '';
      document.querySelector(`#${winId} .win-title`).textContent = f.name + ' ” Notepad';
    });
    if (action === 'close') closeWin(winId);
  });

  // Keyboard shortcuts
  ta.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); fileMenu.querySelector('[data-action="save"]').click(); }
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); fileMenu.querySelector('[data-action="new"]').click(); }
  });
}

function saveAsDialog(winId, ta, cb) {
  const name = prompt('Save as:', 'document.txt');
  if (!name) return;
  const p = fsCreate('/Documents', name, 'file', ta.value);
  if (!p) { fsWrite('/Documents/' + name, ta.value); }
  document.querySelector(`#${winId} .win-title`).textContent = name + ' ” Notepad';
  showNotification('Notepad', `Saved as ${name}`, 'file-text');
  if (cb) cb('/Documents/' + name);
}

function openFileDialog(winId, cb) {
  const files = [...fsListDir('/Documents'), ...fsListDir('/Desktop')].filter(f => f.type === 'file');
  const names = files.map(f => f.name).join('\n');
  const choice = prompt('Open file (type name):\n\n' + names);
  if (!choice) return;
  const f = files.find(x => x.name.toLowerCase() === choice.toLowerCase());
  if (f) cb({ path:f.path, name:f.name, content:FS[f.path]?.content || '' });
  else showNotification('Notepad', 'File not found', 'alert-triangle');
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   FILE EXPLORER
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderExplorer(container, winId, extra = {}) {
  const driveLetter = state.drive || 'C';
  let cwd = extra.startPath || '/';
  let history = [cwd];
  let hIdx = 0;
  let viewMode = 'grid'; // 'grid' | 'list'
  let selected = null;

  container.innerHTML = `
    <div class="app-explorer">
      <div class="explorer-toolbar">
        <button type="button" class="ex-nav-btn" id="ex_back_${winId}" title="Back">${lucideIconHtml('chevron-left', 18)}</button>
        <button type="button" class="ex-nav-btn" id="ex_fwd_${winId}"  title="Forward">${lucideIconHtml('chevron-right', 18)}</button>
        <button type="button" class="ex-nav-btn" id="ex_up_${winId}"   title="Up">${lucideIconHtml('chevron-up', 18)}</button>
        <input class="explorer-addr" id="ex_addr_${winId}" value="${driveLetter}:${cwd === '/' ? '\\' : ''}" />
      </div>
      <div class="explorer-body">
        <div class="explorer-sidebar" id="ex_sb_${winId}">
          <div class="sidebar-section">Quick access</div>
          <div class="sb-item active" data-path="/Desktop"><span class="sbi">${lucideIconHtml('monitor', 16)}</span> Desktop</div>
          <div class="sb-item" data-path="/Documents"><span class="sbi">${lucideIconHtml('file-text', 16)}</span> Documents</div>
          <div class="sb-item" data-path="/Downloads"><span class="sbi">${lucideIconHtml('download', 16)}</span> Downloads</div>
          <div class="sb-item" data-path="/Pictures"><span class="sbi">${lucideIconHtml('image', 16)}</span> Pictures</div>
          <div class="sb-item" data-path="/Music"><span class="sbi">${lucideIconHtml('music', 16)}</span> Music</div>
          <div class="sb-item" data-path="/Videos"><span class="sbi">${lucideIconHtml('video', 16)}</span> Videos</div>
          <div class="sidebar-section">This PC</div>
          <div class="sb-item" data-path="/"><span class="sbi">${lucideIconHtml('hard-drive', 16)}</span> Local Disk (${driveLetter}:)</div>
        </div>
        <div style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
          <div class="explorer-main" id="ex_main_${winId}">
            <div class="explorer-main-toolbar">
              <div class="ex-breadcrumb" id="ex_bc_${winId}">/</div>
              <div class="ex-view-btns">
                <input type="file" id="ex_upload_${winId}" style="display:none" multiple />
                <div class="evb" id="ex_up_${winId}_btn" title="Upload files" onclick="document.getElementById('ex_upload_${winId}').click()">${lucideIconHtml('upload', 16)}</div>
                <div class="evb active" id="ex_vg_${winId}" title="Grid view">${lucideIconHtml('layout-grid', 16)}</div>
                <div class="evb" id="ex_vl_${winId}" title="List view">${lucideIconHtml('list', 16)}</div>
              </div>
            </div>
            <div id="ex_files_${winId}"></div>
          </div>
          <div class="explorer-status" id="ex_status_${winId}">0 items</div>
        </div>
      </div>
    </div>`;

  function navigate(path) {
    cwd = normPath(path);
    if (history[hIdx] !== cwd) {
      history = history.slice(0, hIdx + 1);
      history.push(cwd);
      hIdx = history.length - 1;
    }
    const displayPath = cwd === '/' ? driveLetter + ':\\' : driveLetter + ':\\' + cwd.replace(/\//g, '\\');
    document.getElementById(`ex_addr_${winId}`).value = displayPath;
    document.getElementById(`ex_bc_${winId}`).textContent = cwd || '/';
    renderFiles();
    updateNav();
    // sidebar active
    document.querySelectorAll(`#ex_sb_${winId} .sb-item`).forEach(el => {
      el.classList.toggle('active', el.dataset.path === cwd);
    });
  }

  function updateNav() {
    document.getElementById(`ex_back_${winId}`).disabled = hIdx <= 0;
    document.getElementById(`ex_fwd_${winId}`).disabled  = hIdx >= history.length - 1;
    document.getElementById(`ex_up_${winId}`).disabled   = cwd === '/';
  }

  function handleExplorerDrop(destPath, e) {
    const src = e.dataTransfer.getData('application/x-webos-path');
    if (!src) return;
    
    // Check if it's a local FS file
    if (FS[src]) {
      if (normPath(destPath) === fsParent(src)) return;
      if (fsMovePath(src, destPath)) {
        showNotification('File Explorer', `Moved "${src.split('/').pop()}"`, 'folder-sync');
        renderFiles();
      }
      return;
    }
    
    // Handle server files (Pictures, Music, Videos folders)
    const srcFolder = '/' + src.split('/')[1];
    const srcName = src.split('/').pop();
    const destFolder = destPath === '/' ? '' : destPath.slice(1);
    
    fetch('/api/file/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        srcPath: srcFolder + '/' + srcName, 
        destPath: (destFolder ? '/' + destFolder : '') + '/' + srcName 
      })
    }).then(() => {
      loadServerFiles(true).then(() => renderFiles());
      showNotification('File Explorer', `Moved "${srcName}"`, 'folder-sync');
    }).catch(() => {
      showNotification('File Explorer', 'Failed to move file', 'alert-circle');
    });
  }
  
  async function handleExternalFiles(destPath, files) {
    if (!files || files.length === 0) return;
    
    const uploadFolder = destPath.replace(/^\//, '') || 'Desktop';
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('folder', uploadFolder);
    
    try {
      const res = await fetch(`/api/file/upload?folder=${encodeURIComponent(destPath)}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success && data.files && data.files.length > 0) {
        showNotification('File Explorer', `Uploaded ${data.files.length} file(s)`, 'upload-cloud');
        await loadServerFiles(true);
        renderFiles();
      }
    } catch (err) {
      showNotification('File Explorer', 'Upload failed', 'alert-circle');
    }
  }

  function bindFileElDnD(el, f) {
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('application/x-webos-path', f.path);
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('ex-dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('ex-dragging'));
    if (f.type === 'dir') {
      el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; el.classList.add('ex-drop-target'); });
      el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('ex-drop-target'); });
      el.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('ex-drop-target');
        handleExplorerDrop(f.path, e);
      });
    }
  }

  let serverFiles = null;
  
  function truncateName(name, maxLen = 10) {
    if (name.length <= maxLen) return name;
    return name.substring(0, maxLen) + '...';
  }

  async function loadServerFiles(forceRefresh = false) {
    if (serverFiles && !forceRefresh) return serverFiles;
    try {
      const res = await fetch('/api/files');
      serverFiles = await res.json();
      return serverFiles;
    } catch (e) { return {}; }
  }

  async function renderFiles() {
    const cnt = document.getElementById(`ex_files_${winId}`);
    const status = document.getElementById(`ex_status_${winId}`);
    const mainEl = document.getElementById(`ex_main_${winId}`);

    const mediaFolders = ['/Pictures', '/Music', '/Videos'];
    const isMediaFolder = mediaFolders.includes(cwd);
    const isRoot = cwd === '/';
    let items = [];

    if (isMediaFolder || isRoot) {
      const sf = await loadServerFiles();
      if (isRoot) {
        const serverFolderNames = Object.keys(sf).filter(f => f !== 'root');
        const localDirs = fsListDir('/').filter(f => f.type === 'dir').map(d => d.name);
        const allFolderNames = [...new Set([...localDirs, ...serverFolderNames])].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        items = allFolderNames.map(name => ({
          path: '/' + name,
          name: name,
          type: 'dir'
        }));
      } else {
        const folderName = cwd.slice(1);
        const folderFiles = sf[folderName] || [];
        items = folderFiles.map(f => ({
          path: f.path,
          name: f.name,
          type: 'file',
          isImg: f.isImg,
          isVid: f.isVid,
          isMusic: f.isMusic,
          thumb: f.thumb
        }));
      }
    } else {
      items = fsListDir(cwd);
    }

    status.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

    if (!items.length) {
      cnt.innerHTML = '<div class="ex-empty-msg" style="padding:32px;text-align:center;color:var(--text-ter);font-size:14px;">' + (isMediaFolder ? 'No files in this folder' : 'This folder is empty ” drop files here') + '</div>';
      mainEl.classList.remove('ex-drop-target');
      return;
    }

      cnt.innerHTML = '';
    if (viewMode === 'grid') {
      cnt.className = 'file-grid';
      items.forEach(f => {
        const el = document.createElement('div');
        el.className = 'file-item';
        el.tabIndex = 0;
        let iconHtml = lucideIconHtml(fileTypeLucide(f.name, f.type), 36);
        if (f.thumb) {
          iconHtml = `<img src="${f.thumb}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;" />`;
        }
        el.innerHTML = `<div class="fi">${iconHtml}</div><div class="fn">${truncateName(f.name)}</div>`;
        el.addEventListener('click', () => { selected = f.path; document.querySelectorAll(`#ex_files_${winId} .file-item`).forEach(e => e.classList.remove('selected')); el.classList.add('selected'); });
        el.addEventListener('dblclick', () => openExplorerItem(f));
        el.addEventListener('contextmenu', e => { e.preventDefault(); selected = f.path; showFileContextMenu(e.clientX, e.clientY, f, winId, renderFiles, loadServerFiles); });
        bindFileElDnD(el, f);
        cnt.appendChild(el);
      });
    } else {
      cnt.className = 'file-list-view';
      items.forEach(f => {
        const el = document.createElement('div');
        el.className = 'fl-item';
        el.tabIndex = 0;
        const date = f.modified ? new Date(f.modified).toLocaleDateString() : '';
        let iconHtml = lucideIconHtml(fileTypeLucide(f.name, f.type), 22);
        if (f.thumb) {
          iconHtml = `<img src="${f.thumb}" style="width:22px;height:22px;object-fit:cover;border-radius:2px;" />`;
        }
        el.innerHTML = `<div class="fli">${iconHtml}</div><div class="fln">${truncateName(f.name)}</div><div class="fld">${date}</div>`;
        el.addEventListener('click', () => { selected = f.path; document.querySelectorAll(`#ex_files_${winId} .fl-item`).forEach(e => e.classList.remove('selected')); el.classList.add('selected'); });
        el.addEventListener('dblclick', () => openExplorerItem(f));
        el.addEventListener('contextmenu', e => { e.preventDefault(); showFileContextMenu(e.clientX, e.clientY, f, winId, renderFiles, loadServerFiles); });
        bindFileElDnD(el, f);
        cnt.appendChild(el);
      });
    }

    mainEl.classList.remove('ex-drop-target');
    refreshLucideIcons(cnt);
  }

  function openExplorerItem(f) {
    if (f.type === 'dir') navigate(f.path);
    else if (f.isImg) {
      if (f.thumb) launchApp('gallery-viewer', { path: f.path, src: f.thumb });
      else launchApp('gallery-viewer', { path: f.path, src: `/api/file/read/json?path=${encodeURIComponent(f.path)}` });
    }
    else if (f.isVid) {
      const vidSrc = `/api/file/video?path=${encodeURIComponent(f.path)}`;
      launchApp('video-player', { path: f.path, src: vidSrc });
    }
    else if (f.isMusic) {
      const audioSrc = `/api/file/audio?path=${encodeURIComponent(f.path)}`;
      launchApp('music', { file: f.path, src: audioSrc });
    }
    else {
      const ext = (f.ext || f.name.split('.').pop() || '').toLowerCase();
      if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) launchApp('music');
      else openFileInNotepad(f.path);
    }
  }

  // Wire navigation
  document.getElementById(`ex_back_${winId}`).addEventListener('click', () => { if (hIdx > 0) { hIdx--; navigate(history[hIdx]); } });
  document.getElementById(`ex_fwd_${winId}`).addEventListener('click',  () => { if (hIdx < history.length-1) { hIdx++; navigate(history[hIdx]); } });
  document.getElementById(`ex_up_${winId}`).addEventListener('click',   () => navigate(fsParent(cwd)));

  document.getElementById(`ex_addr_${winId}`).addEventListener('keydown', e => {
    if (e.key === 'Enter') navigate(e.target.value);
  });

  document.getElementById(`ex_files_${winId}`).addEventListener('keydown', e => {
    if (e.key === 'Delete' && selected) {
      e.preventDefault();
      const serverFolders = ['/Pictures', '/Music', '/Videos'];
      const isServerFile = serverFolders.some(f => selected.startsWith(f));
      if (isServerFile) {
        fetch('/api/file/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: selected })
        }).then(() => {
          selected = null;
          loadServerFiles(true).then(() => renderFiles());
          showNotification('File Explorer', 'File deleted', 'trash-2');
        }).catch(() => showNotification('File Explorer', 'Delete failed', 'alert-circle'));
      } else {
        fsDelete(selected);
        renderFiles();
        showNotification('File Explorer', 'Item deleted', 'trash-2');
        selected = null;
      }
    }
  });

  document.getElementById(`ex_sb_${winId}`).addEventListener('click', e => {
    const item = e.target.closest('[data-path]');
    if (item) navigate(item.dataset.path);
  });

  document.getElementById(`ex_vg_${winId}`).addEventListener('click', () => {
    viewMode = 'grid';
    document.getElementById(`ex_vg_${winId}`).classList.add('active');
    document.getElementById(`ex_vl_${winId}`).classList.remove('active');
    renderFiles();
  });
  document.getElementById(`ex_vl_${winId}`).addEventListener('click', () => {
    viewMode = 'list';
    document.getElementById(`ex_vl_${winId}`).classList.add('active');
    document.getElementById(`ex_vg_${winId}`).classList.remove('active');
    renderFiles();
  });

  const mainEl = document.getElementById(`ex_main_${winId}`);
  const sbEl = document.getElementById(`ex_sb_${winId}`);

  mainEl.addEventListener('dragover', e => {
    if (e.target.closest('.file-item,.fl-item')) return;
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
    mainEl.classList.add('ex-drop-target');
  });
  mainEl.addEventListener('dragleave', e => {
    if (!mainEl.contains(e.relatedTarget)) mainEl.classList.remove('ex-drop-target');
  });
  mainEl.addEventListener('drop', async e => {
    if (e.target.closest('.file-item,.fl-item')) return;
    e.preventDefault();
    mainEl.classList.remove('ex-drop-target');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleExternalFiles(cwd, e.dataTransfer.files);
    } else {
      handleExplorerDrop(cwd, e);
    }
  });

  sbEl.querySelectorAll('.sb-item').forEach(sb => {
    sb.addEventListener('dragover', e => {
      e.preventDefault();
      if (e.dataTransfer.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'copy';
      } else {
        e.dataTransfer.dropEffect = 'move';
      }
      sb.classList.add('ex-drop-target');
    });
    sb.addEventListener('dragleave', e => {
      if (!sb.contains(e.relatedTarget)) sb.classList.remove('ex-drop-target');
    });
    sb.addEventListener('drop', async e => {
      e.preventDefault();
      sb.classList.remove('ex-drop-target');
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await handleExternalFiles(sb.dataset.path, e.dataTransfer.files);
      } else {
        handleExplorerDrop(sb.dataset.path, e);
      }
    });
  });

  explorerRefreshers[winId] = () => renderFiles();

  // Right-click on empty area
  document.getElementById(`ex_main_${winId}`).addEventListener('contextmenu', e => {
    if (e.target.closest('.file-item,.fl-item')) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { lucide: 'folder-plus', label: 'New Folder', action: () => {
        const n = prompt('Folder name:', 'New Folder');
        if (n) { fsCreate(cwd, n, 'dir'); renderFiles(); }
      }},
      { lucide: 'file-plus', label: 'New Text File', action: () => {
        const n = prompt('File name:', 'New Text.txt');
        if (n) { fsCreate(cwd, n, 'file', ''); renderFiles(); }
      }},
      { lucide: 'upload', label: 'Upload Files', action: () => {
        document.getElementById(`ex_upload_${winId}`).click();
      }},
      { sep: true },
      { lucide: 'refresh-cw', label: 'Refresh', action: renderFiles },
    ]);
  });
  
  document.getElementById(`ex_upload_${winId}`).addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleExternalFiles(cwd, files);
      e.target.value = '';
    }
  });

  navigate(cwd);
  refreshLucideIcons(container);
}

function showFileContextMenu(x, y, f, winId, refresh, loadServerFilesFn) {
  const serverFolders = ['/Pictures', '/Music', '/Videos'];
  const isServerFile = serverFolders.some(folder => f.path.startsWith(folder));
  const handleOpen = () => {
    if (f.type === 'dir') { /* navigated via dblclick */ }
    else if (f.isImg) {
      if (f.thumb) launchApp('gallery-viewer', { path: f.path, src: f.thumb });
      else launchApp('gallery-viewer', { path: f.path, src: `/api/file/read/json?path=${encodeURIComponent(f.path)}` });
    }
    else if (f.isVid) {
      const vidSrc = `/api/file/video?path=${encodeURIComponent(f.path)}`;
      launchApp('video-player', { path: f.path, src: vidSrc });
    }
    else if (f.isMusic) {
      const audioSrc = `/api/file/audio?path=${encodeURIComponent(f.path)}`;
      launchApp('music', { file: f.path, src: audioSrc });
    }
    else {
      openFileInNotepad(f.path);
    }
  };
  const items = [
    { lucide: f.type === 'dir' ? 'folder-open' : 'file-text', label: 'Open', action: handleOpen },
    { sep: true },
    { lucide: 'pencil', label: 'Rename', action: () => {
      const n = prompt('Rename to:', f.name);
      if (n && n !== f.name) { 
        if (isServerFile) {
          fetch('/api/file/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPath: f.path, newName: n })
          }).then(() => {
            loadServerFilesFn(true).then(() => refresh());
            showNotification('File Explorer', 'File renamed', 'check');
          }).catch(() => showNotification('File Explorer', 'Rename failed', 'alert-circle'));
        } else {
          fsRename(f.path, n); 
          refresh(); 
          showNotification('File Explorer', 'File renamed', 'check');
        }
      }
    }},
    { lucide: 'trash-2', label: 'Delete', cls: 'danger', action: () => {
      if (isServerFile) {
        fetch('/api/file/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: f.path })
        }).then(() => {
          loadServerFilesFn(true).then(() => refresh());
          showNotification('File Explorer', 'File deleted', 'trash-2');
        }).catch(() => showNotification('File Explorer', 'Delete failed', 'alert-circle'));
      } else {
        fsDelete(f.path); 
        refresh(); 
        showNotification('File Explorer', 'File deleted', 'trash-2');
      }
    }},
  ];
  if (f.type === 'file' && !isServerFile) {
    items.unshift({ lucide: 'clipboard', label: 'Copy content', action: () => navigator.clipboard?.writeText(FS[f.path]?.content || '').catch(() => {}) });
  }
  showContextMenu(x, y, items);
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   RECYCLE BIN
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderRecycle(container, winId) {
  function render() {
    container.innerHTML = `
      <div class="app-recycle">
        <div class="rb-toolbar">
          <button type="button" class="rb-btn danger" id="rb_empty_${winId}">Empty Recycle Bin</button>
        </div>
        <div class="rb-list" id="rb_list_${winId}"></div>
      </div>`;
    const list = document.getElementById(`rb_list_${winId}`);
    if (!RECYCLE_BIN.length) {
      list.innerHTML = '<div class="rb-empty">Recycle Bin is empty</div>';
    } else {
      RECYCLE_BIN.slice().reverse().forEach(entry => {
        const row = document.createElement('div');
        row.className = 'rb-row';
        const when = new Date(entry.deleted).toLocaleString();
        row.innerHTML = `
          ${lucideIconHtml('file-text', 20)}
          <div style="flex:1;min-width:0">
            <div class="rb-name">${entry.name}</div>
            <div class="rb-date">${when}</div>
          </div>
          <button type="button" class="rb-btn rb-restore">Restore</button>
          <button type="button" class="rb-btn danger rb-purge">Delete permanently</button>`;
        row.querySelector('.rb-restore').onclick = () => {
          if (restoreRecycleEntry(entry)) {
            showNotification('Recycle Bin', 'Restored: ' + entry.name, 'rotate-ccw');
            render();
            notifyFsChanged();
          }
        };
        row.querySelector('.rb-purge').onclick = () => {
          purgeRecycleEntry(entry.id);
          showNotification('Recycle Bin', 'Permanently deleted', 'trash-2');
          render();
        };
        list.appendChild(row);
      });
      refreshLucideIcons(list);
    }
    document.getElementById(`rb_empty_${winId}`).onclick = () => {
      if (!RECYCLE_BIN.length) return;
      emptyRecycleBinPermanently();
      showNotification('Recycle Bin', 'Recycle Bin emptied', 'trash-2');
      render();
    };
  }
  render();
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   SETTINGS
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderSettings(container, winId) {
  const navItems = [
    { id:'system',       lucide:'monitor', label:'System' },
    { id:'personalize',  lucide:'palette', label:'Personalization' },
    { id:'display',      lucide:'monitor-smartphone', label:'Display' },
    { id:'apps',         lucide:'layout-grid', label:'Apps' },
    { id:'about',        lucide:'info', label:'About' },
  ];

  container.innerHTML = `
    <div class="app-settings">
      <div class="settings-sidebar">
        <div class="settings-sidebar-header">Settings</div>
        ${navItems.map(n => `
          <div class="settings-nav ${n.id==='system'?'active':''}" data-page="${n.id}">
            <span class="sni">${lucideIconHtml(n.lucide, 17)}</span> ${n.label}
          </div>`).join('')}
      </div>
      <div class="settings-main">

        <!-- System -->
        <div class="settings-page active" id="sp_system_${winId}">
          <div class="settings-page-title">System</div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('moon', 18)}</div>
              <div class="sr-info"><div class="sr-title">Dark Mode</div><div class="sr-desc">Switch between light and dark theme</div></div>
              <div class="sr-ctrl">
                <label class="sw"><input type="checkbox" id="sw_dark_${winId}" ${state.theme==='dark'?'checked':''}><div class="sw-track"></div><div class="sw-thumb"></div></label>
              </div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('droplets', 18)}</div>
              <div class="sr-info"><div class="sr-title">Transparency Effects</div><div class="sr-desc">Frosted glass and blur effects</div></div>
              <div class="sr-ctrl">
                <label class="sw"><input type="checkbox" id="sw_transparency_${winId}" ${state.transparencyEnabled !== false ? 'checked' : ''}><div class="sw-track"></div><div class="sw-thumb"></div></label>
              </div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('bell', 18)}</div>
              <div class="sr-info"><div class="sr-title">Notifications</div><div class="sr-desc">Show app notifications</div></div>
              <div class="sr-ctrl">
                <label class="sw"><input type="checkbox" id="sw_notif_${winId}" ${state.notificationsEnabled !== false ? 'checked' : ''}><div class="sw-track"></div><div class="sw-thumb"></div></label>
              </div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('user', 18)}</div>
              <div class="sr-info"><div class="sr-title">Account name</div><div class="sr-desc">Shown in Start and Terminal</div></div>
              <div class="sr-ctrl" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
                <input type="text" id="username_in_${winId}" value="${escapeHtml(state.username)}" maxlength="32" style="padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;width:min(200px,42vw)" />
                <button type="button" id="username_save_${winId}" style="padding:6px 14px;border-radius:6px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:12px">Save</button>
              </div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('lock', 18)}</div>
              <div class="sr-info"><div class="sr-title">Password</div><div class="sr-desc">${state.password ? 'Change password' : 'Not set'}</div></div>
              <div class="sr-ctrl" style="display:flex;gap:8px;align-items:center">
                <input type="password" id="password_orig_${winId}" placeholder="${state.password ? 'Original password' : 'Set password'}" maxlength="32" style="padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;width:140px" />
              </div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('key', 18)}</div>
              <div class="sr-info"><div class="sr-title">New password</div><div class="sr-desc">Enter new password</div></div>
              <div class="sr-ctrl" style="display:flex;gap:8px;align-items:center">
                <input type="password" id="password_in_${winId}" placeholder="New password" maxlength="32" style="padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;width:140px" />
              </div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('shield', 18)}</div>
              <div class="sr-info"><div class="sr-title">Lock on startup</div><div class="sr-desc">Require password on boot</div></div>
              <div class="sr-ctrl">
                <label class="sw"><input type="checkbox" id="sw_lock_${winId}" ${state.locked ? 'checked' : ''} ${!state.password ? 'disabled' : ''} ${!state.password ? 'style="opacity:0.4"' : ''}><div class="sw-track"></div><div class="sw-thumb"></div></label>
              </div>
            </div>
            </div>
        </div>

        <!-- Personalization -->
        <div class="settings-page" id="sp_personalize_${winId}">
          <div class="settings-page-title">Personalization</div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('image', 18)}</div>
              <div class="sr-info"><div class="sr-title">Background</div><div class="sr-desc">Choose your desktop wallpaper</div></div>
            </div>
            <div class="wp-grid" id="wp_grid_${winId}"></div>
          </div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('palette', 18)}</div>
              <div class="sr-info"><div class="sr-title">Accent Color</div><div class="sr-desc">Choose your accent color</div></div>
            </div>
            <div class="accent-grid" id="ac_grid_${winId}"></div>
          </div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('globe', 18)}</div>
              <div class="sr-info"><div class="sr-title">Timezone</div><div class="sr-desc" id="tz_current_${winId}">${TIMEZONE_DATA[state.timezone]?.name || 'EAT'} - UTC${TIMEZONE_DATA[state.timezone]?.offset >= 0 ? '+' : ''}${TIMEZONE_DATA[state.timezone]?.offset || 3}</div></div>
            </div>
            <div style="padding:12px 16px;">
              <select id="tz_select_${winId}" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:14px;cursor:pointer">
                <optgroup label="Africa">
                  <option value="Africa/Nairobi" ${state.timezone === 'Africa/Nairobi' ? 'selected' : ''}>East Africa (UTC+3)</option>
                  <option value="Africa/Lagos" ${state.timezone === 'Africa/Lagos' ? 'selected' : ''}>West Africa (UTC+1)</option>
                  <option value="Africa/Johannesburg" ${state.timezone === 'Africa/Johannesburg' ? 'selected' : ''}>Southern Africa (UTC+2)</option>
                  <option value="Africa/Cairo" ${state.timezone === 'Africa/Cairo' ? 'selected' : ''}>North Africa (UTC+2)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="Europe/London" ${state.timezone === 'Europe/London' ? 'selected' : ''}>United Kingdom (UTC+0)</option>
                  <option value="Europe/Paris" ${state.timezone === 'Europe/Paris' ? 'selected' : ''}>Central Europe (UTC+1)</option>
                  <option value="Europe/Moscow" ${state.timezone === 'Europe/Moscow' ? 'selected' : ''}>Eastern Europe (UTC+3)</option>
                </optgroup>
                <optgroup label="Asia">
                  <option value="Asia/Riyadh" ${state.timezone === 'Asia/Riyadh' ? 'selected' : ''}>Middle East (UTC+3)</option>
                  <option value="Asia/Kolkata" ${state.timezone === 'Asia/Kolkata' ? 'selected' : ''}>South Asia (UTC+5:30)</option>
                  <option value="Asia/Bangkok" ${state.timezone === 'Asia/Bangkok' ? 'selected' : ''}>Southeast Asia (UTC+7)</option>
                  <option value="Asia/Tokyo" ${state.timezone === 'Asia/Tokyo' ? 'selected' : ''}>East Asia (UTC+9)</option>
                  <option value="Asia/Shanghai" ${state.timezone === 'Asia/Shanghai' ? 'selected' : ''}>China (UTC+8)</option>
                  <option value="Asia/Dubai" ${state.timezone === 'Asia/Dubai' ? 'selected' : ''}>UAE (UTC+4)</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="America/New_York" ${state.timezone === 'America/New_York' ? 'selected' : ''}>US Eastern (UTC-5)</option>
                  <option value="America/Los_Angeles" ${state.timezone === 'America/Los_Angeles' ? 'selected' : ''}>US Western (UTC-8)</option>
                  <option value="America/Sao_Paulo" ${state.timezone === 'America/Sao_Paulo' ? 'selected' : ''}>South America (UTC-3)</option>
                  <option value="America/Mexico_City" ${state.timezone === 'America/Mexico_City' ? 'selected' : ''}>Central America (UTC-6)</option>
                  <option value="America/Toronto" ${state.timezone === 'America/Toronto' ? 'selected' : ''}>Canada (UTC-5)</option>
                </optgroup>
                <optgroup label="Oceania">
                  <option value="Australia/Sydney" ${state.timezone === 'Australia/Sydney' ? 'selected' : ''}>Australia (UTC+10)</option>
                  <option value="Pacific/Auckland" ${state.timezone === 'Pacific/Auckland' ? 'selected' : ''}>New Zealand (UTC+12)</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        <!-- Display -->
        <div class="settings-page" id="sp_display_${winId}">
          <div class="settings-page-title">Display</div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('maximize', 18)}</div>
              <div class="sr-info"><div class="sr-title">Resolution</div><div class="sr-desc">${window.screen.width} × ${window.screen.height}</div></div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('sun', 18)}</div>
              <div class="sr-info"><div class="sr-title">Brightness</div><div class="sr-desc">Adjust display brightness</div></div>
              <div class="sr-ctrl"><input type="range" data-brightness-slider="1" id="brightness_range_${winId}" min="10" max="100" value="${state.brightness}" style="width:120px;accent-color:var(--accent)"></div>
            </div>
          </div>
        </div>

        <!-- Apps -->
        <div class="settings-page" id="sp_apps_${winId}">
          <div class="settings-page-title">Apps</div>
          <div class="settings-card">
            ${Object.entries(APPS).map(([id,app]) => `
              <div class="settings-row" data-app-row="${id}">
                <div class="sr-icon">${lucideIconHtml(app.icon, 18)}</div>
                <div class="sr-info"><div class="sr-title">${app.name}</div><div class="sr-desc">${(state.pinnedApps || []).includes(id) ? 'Pinned to taskbar' : 'Not pinned'}</div></div>
                <div class="sr-ctrl" style="display:flex;gap:8px;align-items:center">
                  <button type="button" class="app-pin-tb" data-app="${id}" style="padding:6px 12px;border-radius:6px;background:var(--surface-hover);color:var(--text);border:1px solid var(--border);cursor:pointer;font-size:12px">${(state.pinnedApps || []).includes(id) ? 'Unpin' : 'Pin'}</button>
                  <button type="button" style="padding:6px 14px;border-radius:6px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:12px" onclick="launchApp('${id}')">Open</button>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- About -->
        <div class="settings-page" id="sp_about_${winId}">
          <div class="settings-page-title">About</div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('monitor', 18)}</div>
              <div class="sr-info"><div class="sr-title">WebOS 12</div><div class="sr-desc">Version: 1.7.0</div></div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('globe', 18)}</div>
              <div class="sr-info"><div class="sr-title">User PC</div><div class="sr-desc">${navigator.userAgent.slice(0,60)}</div></div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('cpu', 18)}</div>
              <div class="sr-info"><div class="sr-title">Installed RAM</div><div class="sr-desc">8GB RAM</div></div>
            </div>
            <div class="settings-row">
              <div class="sr-icon">${lucideIconHtml('hard-drive', 18)}</div>
              <div class="sr-info"><div class="sr-title">Storage (${state.drive || 'C'}:)</div><div class="sr-desc">${state.storageSize || '256GB'} - ${Object.keys(FS).length} files stored</div></div>
            </div>
          </div>
          <div class="settings-card" style="margin-top:16px;border:1px solid rgba(196,43,28,0.3)">
            <div class="settings-row" style="border:none">
              <div class="sr-icon" style="color:#f47174">${lucideIconHtml('alert-triangle', 18)}</div>
              <div class="sr-info"><div class="sr-title" style="color:#f47174">Reset WebOS</div><div class="sr-desc">Delete all data and start fresh</div></div>
              <div class="sr-ctrl">
                <button type="button" id="factory_reset_${winId}" style="padding:8px 16px;border-radius:8px;background:rgba(196,43,28,0.15);color:#f47174;border:1px solid rgba(196,43,28,0.3);cursor:pointer;font-size:13px;font-weight:500">Reset</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  // Nav switching
  container.querySelectorAll('.settings-nav').forEach(nav => {
    nav.addEventListener('click', () => {
      container.querySelectorAll('.settings-nav').forEach(n => n.classList.remove('active'));
      container.querySelectorAll('.settings-page').forEach(p => p.classList.remove('active'));
      nav.classList.add('active');
      document.getElementById(`sp_${nav.dataset.page}_${winId}`)?.classList.add('active');
    });
  });

  // Dark mode toggle
  document.getElementById(`sw_dark_${winId}`).addEventListener('change', function() {
    applyTheme(this.checked ? 'dark' : 'light');
  });

  document.getElementById(`sw_transparency_${winId}`).addEventListener('change', function() {
    state.transparencyEnabled = this.checked;
    saveState();
    applyTransparency();
  });

  document.getElementById(`sw_notif_${winId}`).addEventListener('change', function() {
    state.notificationsEnabled = this.checked;
    saveState();
  });

  document.getElementById(`username_save_${winId}`).addEventListener('click', () => {
    const v = (document.getElementById(`username_in_${winId}`).value || '').trim().slice(0, 32) || 'WebOS User';
    state.username = v;
    state.installed = true;
    updateUsernameUI();
    document.querySelectorAll('.t-prompt-label').forEach(el => {
      const t = el.textContent;
      const i = t.indexOf(' C:');
      if (i >= 0) el.textContent = state.username + t.slice(i);
    });

    const pwdOrig = document.getElementById(`password_orig_${winId}`);
    const pwdIn = document.getElementById(`password_in_${winId}`);
    if (pwdOrig && pwdIn) {
      const orig = pwdOrig.value || '';
      const newPwd = pwdIn.value || '';

      // If password exists, verify original
      if (state.password && orig !== state.password) {
        showNotification('Settings', 'Incorrect original password', 'alert-circle');
        return;
      }

      // Set new password if provided
      if (newPwd) {
        state.password = newPwd;
        state.locked = true;
        saveState();
        const lockToggle = document.getElementById(`sw_lock_${winId}`);
        if (lockToggle) { lockToggle.disabled = false; lockToggle.checked = true; }
        showNotification('Settings', state.password ? 'Password changed' : 'Password set', 'lock');
      }

      pwdOrig.value = '';
      pwdIn.value = '';
    }

    saveState();
    showNotification('Settings', 'Settings saved', 'check');
    closeWin(winId);
  });

  // Lock toggle
  const lockToggle = document.getElementById(`sw_lock_${winId}`);
  if (lockToggle) {
    lockToggle.addEventListener('change', async function() {
      if (!state.password) {
        this.checked = false;
        showNotification('Settings', 'Please set a password first', 'lock');
        return;
      }

      // If turning ON, ask for password confirmation
      if (this.checked) {
        const confirmed = prompt('Enter password to enable lock on startup:');
        if (confirmed !== state.password) {
          this.checked = false;
          showNotification('Settings', 'Incorrect password', 'alert-circle');
          return;
        }
      }

      state.locked = this.checked;
      saveState();
      showNotification('Settings', state.locked ? 'Lock enabled on startup' : 'Lock disabled on startup', state.locked ? 'lock' : 'unlock');
    });
  }

  function updateLockToggle() {
    const lockToggle = document.getElementById(`sw_lock_${winId}`);
    if (lockToggle) {
      lockToggle.disabled = !state.password;
      lockToggle.checked = state.locked && state.password;
    }
  }
  updateLockToggle();

  const brEl = document.getElementById(`brightness_range_${winId}`);
  brEl.addEventListener('input', () => applyBrightness(brEl.value));

  // Timezone change
  const tzSelect = document.getElementById(`tz_select_${winId}`);
  tzSelect.addEventListener('change', function() {
    state.timezone = this.value;
    saveState();
    const tzData = TIMEZONE_DATA[this.value];
    const tzDisplay = document.getElementById(`tz_current_${winId}`);
    if (tzDisplay) tzDisplay.textContent = `${tzData.name} - UTC${tzData.offset >= 0 ? '+' : ''}${tzData.offset}`;
    updateClock();
  });

  // Factory reset
  document.getElementById(`factory_reset_${winId}`).addEventListener('click', async function() {
    if (confirm('Are you sure you want to reset WebOS?\n\nThis will delete ALL your data including:\n- Files\n- Settings\n- Installed apps\n\nThis action cannot be undone.')) {
      localStorage.clear();
      sessionStorage.clear();
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(c => caches.delete(c)));
      await fetch('/api/reset', { method: 'POST' });
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:system-ui;text-align:center;flex-direction:column;gap:20px"><h1 style="font-size:32px;font-weight:600">WebOS Reset</h1><p style="color:rgba(255,255,255,0.6)">All data has been cleared.</p><p style="color:rgba(255,255,255,0.4);font-size:14px">Close this tab or refresh to start fresh.</p></div>';
    }
  });

  container.querySelectorAll('.app-pin-tb').forEach(btn => {
    btn.addEventListener('click', () => {
      const aid = btn.dataset.app;
      togglePinToTaskbar(aid);
      const pinned = (state.pinnedApps || []).includes(aid);
      btn.textContent = pinned ? 'Unpin' : 'Pin';
      const row = container.querySelector(`[data-app-row="${aid}"] .sr-desc`);
      if (row) row.textContent = pinned ? 'Pinned to taskbar' : 'Not pinned';
    });
  });

  // Wallpaper grid
  const wpGrid = document.getElementById(`wp_grid_${winId}`);
  WALLPAPERS.forEach((wp, i) => {
    const el = document.createElement('div');
    el.className = 'wp-item' + (i === state.wallpaper ? ' active' : '');
    el.style.background = wp.bg;
    el.title = wp.name;
    el.innerHTML = `<span></span>`;
    el.addEventListener('click', () => {
      wpGrid.querySelectorAll('.wp-item').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      applyWallpaper(i);
      showNotification('Personalization', `Wallpaper set to "${wp.name}"`, 'image');
    });
    wpGrid.appendChild(el);
  });

  // Accent grid
  const acGrid = document.getElementById(`ac_grid_${winId}`);
  ACCENT_COLORS.forEach(color => {
    const el = document.createElement('div');
    el.className = 'accent-sw' + (state.accent === color ? ' active' : '');
    el.style.background = color;
    el.title = color;
    el.addEventListener('click', () => {
      acGrid.querySelectorAll('.accent-sw').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      applyAccent(color);
    });
    acGrid.appendChild(el);
  });

  refreshLucideIcons(container);
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   TERMINAL
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderTerminal(container, winId) {
  let termCwd = '/';
  let cmdHistory = [];
  let histIdx = -1;

  container.innerHTML = `
    <div class="app-terminal">
      <div class="terminal-title-bar">
      </div>
      <div class="terminal-output" id="t_out_${winId}"></div>
      <div class="terminal-input-row">
        <span class="t-prompt-label" id="t_prompt_${winId}">${escapeHtml(state.username)} C:${termCwd}></span>
        <input class="t-input" id="t_in_${winId}" autocomplete="off" autocorrect="off" spellcheck="false" />
      </div>
    </div>`;

  const out = document.getElementById(`t_out_${winId}`);
  const inp = document.getElementById(`t_in_${winId}`);
  const pmt = document.getElementById(`t_prompt_${winId}`);

  function updatePrompt() {
    pmt.textContent = `${state.username} C:${termCwd}>`;
  }

  function addLine(text, cls='out') {
    const d = document.createElement('div');
    d.className = `tl ${cls}`;
    d.textContent = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }

  function addLines(lines, cls='out') { lines.forEach(l => addLine(l, cls)); }

  // Splash
  addLine('WebOS 12 Terminal  ', 'info');
  addLine('(c) WebOS Corporation. All rights reserved.', 'info');
  addLine('');
  addLine('Type "help" for a list of commands.', 'ok');
  addLine('');

  const COMMANDS = {
    help: () => {
      addLines([
        'Available commands:',
        '  help           Show this help',
        '  ls [path]      List directory contents',
        '  cd <path>      Change directory',
        '  mkdir <name>   Create directory',
        '  touch <name>   Create empty file',
        '  cat <name>     Display file contents',
        '  write <name>   Write to file (prompts for content)',
        '  rm <name>      Delete file or folder',
        '  mv <old> <new> Rename file or folder',
        '  pwd            Print working directory',
        '  clear          Clear terminal',
        '  echo <text>    Print text',
        '  date           Show current date & time',
        '  whoami         Show current user',
        '  sysinfo        System information',
        '  open <app>     Open an app (notepad/explorer/settings/calc/browser/paint/music)',
        '  theme <dark|light>  Change theme',
      ], 'info');
    },
    clear: () => { out.innerHTML = ''; },
    pwd:  () => addLine(termCwd),
    date: () => addLine(new Date().toString()),
    whoami: () => addLine('WebOS\\User'),
    sysinfo: () => {
      addLines([
        `OS:       WebOS 12`,
        `Browser:  ${navigator.userAgent.split(' ').pop()}`,
        `Screen:   ${window.screen.width}×${window.screen.height}`,
        `Theme:    ${state.theme}`,
        `FS Files: ${Object.keys(FS).length}`,
        `Memory:   ${Math.round(performance.memory?.usedJSHeapSize/1024/1024||0)} GB`,
      ], 'info');
    },
    echo: (args) => addLine(args.join(' ')),
    ls: (args) => {
      const path = args[0] ? normPath(args[0].startsWith('/') ? args[0] : termCwd + '/' + args[0]) : termCwd;
      if (!FS[path]) { addLine(`ls: ${path}: No such directory`, 'err'); return; }
      const items = fsListDir(path);
      if (!items.length) { addLine('(empty)'); return; }
      items.forEach(f => addLine(`${f.type==='dir'?'<DIR>':'     '} ${f.name}`, f.type==='dir'?'info':'out'));
    },
    cd: (args) => {
      if (!args[0] || args[0] === '~') { termCwd = '/'; updatePrompt(); return; }
      let path = args[0].startsWith('/') ? args[0] : normPath(termCwd + '/' + args[0]);
      if (args[0] === '..') path = fsParent(termCwd);
      path = normPath(path);
      if (!FS[path]) { addLine(`cd: ${args[0]}: No such directory`, 'err'); return; }
      if (FS[path].type !== 'dir') { addLine(`cd: ${args[0]}: Not a directory`, 'err'); return; }
      termCwd = path;
      updatePrompt();
    },
    mkdir: (args) => {
      if (!args[0]) { addLine('mkdir: missing operand', 'err'); return; }
      const p = fsCreate(termCwd, args[0], 'dir');
      if (!p) { addLine(`mkdir: cannot create directory '${args[0]}': Already exists`, 'err'); return; }
      addLine(`Directory created: ${p}`, 'ok');
    },
    touch: (args) => {
      if (!args[0]) { addLine('touch: missing operand', 'err'); return; }
      const p = fsCreate(termCwd, args[0], 'file', '');
      if (!p) { fsWrite(termCwd + '/' + args[0], ''); addLine(`Updated: ${args[0]}`); return; }
      addLine(`File created: ${p}`, 'ok');
    },
    cat: (args) => {
      if (!args[0]) { addLine('cat: missing operand', 'err'); return; }
      const p = normPath(termCwd + '/' + args[0]);
      if (!FS[p]) { addLine(`cat: ${args[0]}: No such file`, 'err'); return; }
      if (FS[p].type === 'dir') { addLine(`cat: ${args[0]}: Is a directory`, 'err'); return; }
      addLine(FS[p].content || '(empty file)');
    },
    write: (args) => {
      if (!args[0]) { addLine('write: missing filename', 'err'); return; }
      const content = prompt(`Content for "${args[0]}":`);
      if (content === null) return;
      const p = normPath(termCwd + '/' + args[0]);
      if (FS[p]) fsWrite(p, content);
      else fsCreate(termCwd, args[0], 'file', content);
      addLine(`Written to: ${args[0]}`, 'ok');
    },
    rm: (args) => {
      if (!args[0]) { addLine('rm: missing operand', 'err'); return; }
      const p = normPath(termCwd + '/' + args[0]);
      if (!FS[p]) { addLine(`rm: ${args[0]}: No such file or directory`, 'err'); return; }
      if (recyclePath(p)) addLine(`Moved to Recycle Bin: ${args[0]}`, 'ok');
    },
    mv: (args) => {
      if (args.length < 2) { addLine('mv: missing operand', 'err'); return; }
      const p = normPath(termCwd + '/' + args[0]);
      if (!FS[p]) { addLine(`mv: ${args[0]}: No such file`, 'err'); return; }
      fsRename(p, args[1]);
      addLine(`Renamed: ${args[0]} ’ ${args[1]}`, 'ok');
    },
    open: (args) => {
      const appMap = { notepad:'notepad', explorer:'explorer', settings:'settings',
                       calc:'calculator', calculator:'calculator', browser:'browser', paint:'paint', terminal:'terminal', music:'music', recycle:'recycle' };
      const id = appMap[args[0]?.toLowerCase()];
      if (!id) { addLine(`open: "${args[0]}": Unknown app. Try: ${Object.keys(appMap).join(', ')}`, 'err'); return; }
      launchApp(id);
      addLine(`Opened: ${APPS[id].name}`, 'ok');
    },
    theme: (args) => {
      if (args[0] === 'dark' || args[0] === 'light') { applyTheme(args[0]); addLine(`Theme set to: ${args[0]}`, 'ok'); }
      else addLine('theme: use "dark" or "light"', 'err');
    },
  };

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const raw = inp.value.trim();
      if (!raw) return;
      cmdHistory.unshift(raw);
      histIdx = -1;
      inp.value = '';
      addLine(`${pmt.textContent} ${raw}`, 'prompt');
      const parts = raw.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      if (COMMANDS[cmd]) COMMANDS[cmd](args);
      else addLine(`'${cmd}' is not recognized as an internal command.`, 'err');
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      histIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      inp.value = cmdHistory[histIdx] || '';
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx = Math.max(histIdx - 1, -1);
      inp.value = histIdx >= 0 ? cmdHistory[histIdx] : '';
    }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); out.innerHTML = ''; }
    if (e.ctrlKey && e.key === 'c') { inp.value = ''; addLine('^C'); }
  });

  // Auto-focus terminal input when window is clicked
  container.addEventListener('click', () => inp.focus());
  setTimeout(() => inp.focus(), 100);
  refreshLucideIcons(container);
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   CALCULATOR
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderCalculator(container, winId) {
  let display = '0', expr = '', prevVal = null, op = null, shouldReset = false;

  const buttons = [
    ['%','CE','C','«'],
    ['1/x','X²','√','÷'],
    ['7','8','9','×'],
    ['4','5','6','-'],
    ['1','2','3','+'],
    ['+/-','0','.','='],
  ];

  container.innerHTML = `
    <div class="app-calc">
      <div class="calc-display">
        <div class="calc-expr"  id="ce_${winId}"></div>
        <div class="calc-result" id="cr_${winId}">0</div>
      </div>
      <div class="calc-grid" id="cg_${winId}"></div>
    </div>`;

  const dispEl = document.getElementById(`cr_${winId}`);
  const exprEl = document.getElementById(`ce_${winId}`);
  const grid   = document.getElementById(`cg_${winId}`);

  function updateDisplay() {
    dispEl.textContent = display;
    exprEl.textContent = expr;
  }

  function calc(a, o, b) {
    a = parseFloat(a); b = parseFloat(b);
    if (o === '+') return a + b;
    if (o === '-') return a - b;
    if (o === '×') return a * b;
    if (o === '÷') return b === 0 ? 'Error' : a / b;
    return b;
  }

  buttons.forEach(row => {
    row.forEach(label => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cb';
      if (label === '«') btn.innerHTML = lucideIconHtml('delete', 18);
      else btn.textContent = label;
      if (['+','-','×','÷'].includes(label)) btn.classList.add('op');
      if (label === '=') btn.classList.add('eq');
      if (['%','CE','C','«','1/x','X²','√','+/-'].includes(label)) btn.classList.add('fn');
      if (label === '0') btn.classList.add('wide');
      btn.addEventListener('click', () => handleCalc(label));
      grid.appendChild(btn);
    });
  });
  refreshLucideIcons(grid);

  // Fix last row (0 is wide, remove extra cell)
  function handleCalc(key) {
    const num = !isNaN(key) || key === '.';
    if (num) {
      if (shouldReset || display === '0') { display = key === '.' ? '0.' : key; shouldReset = false; }
      else { if (key === '.' && display.includes('.')) return; display += key; }
      updateDisplay(); return;
    }
    if (key === 'C')   { display='0'; expr=''; prevVal=null; op=null; shouldReset=false; }
    if (key === 'CE')  { display='0'; shouldReset=false; }
    if (key === '«')   { display = display.length > 1 ? display.slice(0,-1) : '0'; }
    if (key === '+/-') { display = display.startsWith('-') ? display.slice(1) : '-'+display; }
    if (key === '%')   { display = String(parseFloat(display) / 100); }
    if (key === '1/x') { display = parseFloat(display) === 0 ? 'Error' : String(1/parseFloat(display)); }
    if (key === 'X²')  { display = String(Math.pow(parseFloat(display),2)); }
    if (key === '√')   { display = parseFloat(display) < 0 ? 'Error' : String(Math.sqrt(parseFloat(display))); }
    if (['+','-','×','÷'].includes(key)) {
      if (op && !shouldReset) {
        const res = calc(prevVal, op, display);
        display = String(Math.round(res * 1e12) / 1e12);
        prevVal = display;
      } else prevVal = display;
      op = key; expr = `${prevVal} ${op}`; shouldReset = true;
    }
    if (key === '=') {
      if (!op) { expr = `${display} =`; }
      else {
        const res = calc(prevVal, op, display);
        expr = `${prevVal} ${op} ${display} =`;
        display = String(Math.round(res * 1e12) / 1e12);
        prevVal = null; op = null;
      }
      shouldReset = true;
    }
    updateDisplay();
  }

  // Keyboard support
  container.addEventListener('keydown', e => {
    const map = { '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
      '.':'.', '+':'+', '-':'-', '*':'×', '/':'÷', 'Enter':'=', 'Backspace':'«', 'Escape':'C', '%':'%' };
    if (map[e.key]) { e.preventDefault(); handleCalc(map[e.key]); }
  });
  container.setAttribute('tabindex', '-1');
}

function renderBrowser(container, winId, extra = {}) {
  const defaultUrl = 'https://www.google.com/search?igu=1';
  container.innerHTML = `
    <div class="app-browser">
      <div class="browser-bar">
        <div class="br-nav" id="br_back_${winId}" title="Back">${lucideIconHtml('chevron-left', 16)}</div>
        <div class="br-nav" id="br_fwd_${winId}"  title="Forward">${lucideIconHtml('chevron-right', 16)}</div>
        <div class="br-nav" id="br_ref_${winId}"  title="Refresh">${lucideIconHtml('rotate-cw', 16)}</div>
        <div class="br-nav" id="br_home_${winId}" title="Home">${lucideIconHtml('house', 16)}</div>
        <input class="br-url" id="br_url_${winId}" value="${defaultUrl}" />
        <div class="br-nav" id="br_go_${winId}" title="Go">${lucideIconHtml('arrow-right', 16)}</div>
      </div>
      <iframe class="browser-frame" id="br_frame_${winId}" src="${defaultUrl}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" allowfullscreen="allowfullscreen"></iframe>
    </div>`;

  const frame = document.getElementById(`br_frame_${winId}`);
  const url   = document.getElementById(`br_url_${winId}`);
  const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-presentation';

  function navigate(u) {
    let s = String(u || '').trim();
    if (!s) return;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    const yid = youtubeIdFromUrl(s);
    if (yid) {
      frame.removeAttribute('sandbox');
      frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');
      frame.setAttribute('allowfullscreen', '');
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      let embed = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yid)}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
      if (window.location.protocol !== 'file:' && window.location.origin && window.location.origin !== 'null') {
        embed += '&origin=' + encodeURIComponent(window.location.origin);
      }
      frame.src = embed;
      url.value = s;
      return;
    }
    frame.setAttribute('sandbox', SANDBOX);
    frame.removeAttribute('allow');
    frame.removeAttribute('allowfullscreen');
    frame.src = s;
    url.value = s;
  }

  document.getElementById(`br_go_${winId}`).addEventListener('click', () => navigate(url.value));
  document.getElementById(`br_ref_${winId}`).addEventListener('click', () => frame.src = frame.src);
  document.getElementById(`br_back_${winId}`).addEventListener('click', () => frame.contentWindow?.history.back());
  document.getElementById(`br_fwd_${winId}`).addEventListener('click', () => frame.contentWindow?.history.forward());
  document.getElementById(`br_home_${winId}`).addEventListener('click', () => navigate(defaultUrl));
  url.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(url.value); });
  refreshLucideIcons(container);
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   PAINT
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
function renderPaint(container, winId) {
  const colors = ['#000000','#ffffff','#ff0000','#ff6600','#ffff00','#00aa00','#0000ff','#9900cc',
                  '#ff99cc','#ff9900','#00ccff','#006600','#000099','#996633','#808080','#cccccc'];
  let curColor = '#000000', curSize = 4, tool = 'pen';
  let drawing = false, lastX = 0, lastY = 0;

  container.innerHTML = `
    <div class="app-paint">
      <div class="paint-toolbar" id="pt_tb_${winId}">
        <div class="pt-btn active" data-tool="pen" title="Pen">${lucideIconHtml('pen', 16)}</div>
        <div class="pt-btn" data-tool="brush" title="Brush">${lucideIconHtml('brush', 16)}</div>
        <div class="pt-btn" data-tool="eraser" title="Eraser">${lucideIconHtml('eraser', 16)}</div>
        <div class="pt-btn" data-tool="fill" title="Fill">${lucideIconHtml('paint-bucket', 16)}</div>
        <div class="pt-btn" data-tool="line" title="Line">${lucideIconHtml('ruler', 16)}</div>
        <div class="pt-btn" data-tool="rect" title="Rectangle">${lucideIconHtml('square', 16)}</div>
        <div class="pt-btn" data-tool="circle" title="Circle">${lucideIconHtml('circle', 16)}</div>
        <div class="pt-sep"></div>
        <div style="font-size:12px;color:var(--text-sec)">Size:</div>
        <input class="pt-size" id="pt_sz_${winId}" type="number" value="4" min="1" max="80" />
        <div class="pt-sep"></div>
        ${colors.map((c,i) => `<div class="pt-sw${i===0?' active':''}" data-color="${c}" style="background:${c}" title="${c}"></div>`).join('')}
        <div class="pt-sep"></div>
        <div class="pt-btn" id="pt_clear_${winId}" title="Clear">${lucideIconHtml('trash-2', 16)}</div>
        <div class="pt-btn" id="pt_save_${winId}"  title="Save as image">${lucideIconHtml('save', 16)}</div>
      </div>
      <div class="paint-canvas-wrap">
        <canvas id="pt_cvs_${winId}" width="800" height="500"></canvas>
      </div>
    </div>`;

  const canvas = document.getElementById(`pt_cvs_${winId}`);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let snapX, snapY; // for line/rect/circle

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width),
             y: (e.clientY - rect.top)  * (canvas.height / rect.height) };
  }

  canvas.addEventListener('mousedown', e => {
    drawing = true;
    const p = getPos(e);
    lastX = p.x; lastY = p.y;
    if (tool === 'pen' || tool === 'brush' || tool === 'eraser') {
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
    if (tool === 'fill') floodFill(ctx, Math.round(p.x), Math.round(p.y), hexToRgb(curColor));
    snapX = p.x; snapY = p.y;
  });

  canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    if (tool === 'pen') {
      ctx.strokeStyle = curColor; ctx.lineWidth = curSize;
      ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    } else if (tool === 'brush') {
      ctx.strokeStyle = curColor; ctx.lineWidth = curSize * 3; ctx.globalAlpha = 0.5;
      ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.globalAlpha = 1;
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = curSize * 3;
      ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
    lastX = p.x; lastY = p.y;
  });

  canvas.addEventListener('mouseup', e => {
    if (!drawing) return;
    drawing = false;
    const p = getPos(e);
    ctx.strokeStyle = curColor; ctx.lineWidth = curSize;
    ctx.fillStyle = curColor;

    if (tool === 'line') {
      ctx.beginPath(); ctx.moveTo(snapX, snapY); ctx.lineTo(p.x, p.y); ctx.stroke();
    } else if (tool === 'rect') {
      ctx.strokeRect(snapX, snapY, p.x - snapX, p.y - snapY);
    } else if (tool === 'circle') {
      const rx = (p.x - snapX) / 2, ry = (p.y - snapY) / 2;
      ctx.beginPath();
      ctx.ellipse(snapX + rx, snapY + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Toolbar controls
  container.querySelector('#pt_tb_' + winId).addEventListener('click', e => {
    const toolBtn = e.target.closest('[data-tool]');
    const colorBtn = e.target.closest('[data-color]');
    if (toolBtn) {
      container.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
      toolBtn.classList.add('active');
      tool = toolBtn.dataset.tool;
      canvas.style.cursor = tool === 'eraser' ? 'cell' : tool === 'fill' ? 'crosshair' : 'crosshair';
    }
    if (colorBtn) {
      container.querySelectorAll('[data-color]').forEach(b => b.classList.remove('active'));
      colorBtn.classList.add('active');
      curColor = colorBtn.dataset.color;
    }
    if (e.target.closest(`#pt_clear_${winId}`)) {
      if (confirm('Clear canvas?')) { ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); }
    }
    if (e.target.closest(`#pt_save_${winId}`)) {
      const a = document.createElement('a');
      a.download = 'painting.png'; a.href = canvas.toDataURL();
      a.click();
    }
  });

  document.getElementById(`pt_sz_${winId}`).addEventListener('input', e => curSize = parseInt(e.target.value));
  refreshLucideIcons(container);
}

/* €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
   MUSIC ” Internet radio + global pill player (no seek)
€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */
const RADIO_FALLBACK = [
  { name: 'SomaFM ” Groove Salad', url: 'https://ice2.somafm.com/groovesalad-128-mp3', country: 'US' },
  { name: 'SomaFM ” Drone Zone', url: 'https://ice2.somafm.com/dronezone-128-mp3', country: 'US' },
  { name: 'SomaFM ” DEF CON Radio', url: 'https://ice2.somafm.com/defcon-128-mp3', country: 'US' },
  { name: 'SomaFM ” Secret Agent', url: 'https://ice2.somafm.com/secretagent-128-mp3', country: 'US' },
  { name: 'SomaFM ” Lush', url: 'https://ice2.somafm.com/lush-128-mp3', country: 'US' },
  { name: 'SomaFM ” Deep Space One', url: 'https://ice2.somafm.com/deepspaceone-128-mp3', country: 'US' },
];

const RadioService = {
  stations: [],
  idx: -1,
  pillMode: false,
  localMode: false,
  listeners: new Set(),
  audioEl: null,
  ensureAudio() {
    let a = document.getElementById('wos-global-radio');
    if (!a) {
      a = document.createElement('audio');
      a.id = 'wos-global-radio';
      a.crossOrigin = 'anonymous';
      a.preload = 'none';
      a.setAttribute('playsinline', '');
      document.body.appendChild(a);
    }
    if (!this.audioEl) {
      this.audioEl = a;
      ['play', 'pause'].forEach(ev => a.addEventListener(ev, () => this.emit()));
      a.addEventListener('timeupdate', () => this.emit());
      a.addEventListener('ended', () => {
        this.emit();
        if (!this.localMode && this.stations.length && this.idx >= 0) this.nextStation();
      });
    }
    return a;
  },
  setLocalMode(localFile) {
    this.localMode = true;
    this.stations = [localFile];
    this.idx = 0;
    const a = this.ensureAudio();
    a.src = localFile.url;
    a.play().catch(() => showNotification('Music', 'Tap play to start playback.', 'music'));
    this.emit();
  },
  setRadioMode() {
    this.localMode = false;
  },
  emit() {
    this.listeners.forEach(fn => { try { fn(); } catch (e) {} });
    syncRadioPillChrome();
  },
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  currentName() {
    const t = this.stations[this.idx];
    return t ? t.name : 'Radio';
  },
  isPlaying() {
    const a = this.audioEl || document.getElementById('wos-global-radio');
    return a && !a.paused;
  },
  setStations(list) {
    this.stations = list || [];
    this.emit();
  },
  setIdx(i) {
    this.idx = i;
  },
  playIdx(i) {
    const t = this.stations[i];
    if (!t || !t.url) return;
    this.idx = i;
    const a = this.ensureAudio();
    a.src = t.url;
    a.play().catch(() => showNotification('Radio', 'Tap play ” stream may need a gesture.', 'music'));
    this.emit();
  },
  togglePlay() {
    const a = this.ensureAudio();
    if (!this.stations.length) return;
    if (this.idx < 0) {
      this.playIdx(0);
      return;
    }
    if (a.paused) a.play().catch(() => {});
    else a.pause();
    this.emit();
  },
  prevStation() {
    if (!this.stations.length) return;
    this.playIdx((this.idx - 1 + this.stations.length) % this.stations.length);
  },
  nextStation() {
    if (!this.stations.length) return;
    this.playIdx((this.idx + 1) % this.stations.length);
  },
  setPillMode(v) {
    this.pillMode = !!v;
    this.emit();
  },
};

function radioPillMarkup(compact) {
  const playing = RadioService.isPlaying();
  const title = RadioService.currentName();
  const cls = compact ? 'radio-pill radio-pill--compact' : 'radio-pill';
  const playIcon = playing ? 'pause' : 'play';
  return `<div class="${cls}" role="group" aria-label="Radio">
    <button type="button" class="radio-pill-btn" data-radio-action="prev" title="Restart">${lucideIconHtml('skip-back', 18)}</button>
    <button type="button" class="radio-pill-btn primary" data-radio-action="toggle" title="${playing ? 'Pause' : 'Play'}">${lucideIconHtml(playIcon, 20)}</button>
    <button type="button" class="radio-pill-btn" data-radio-action="next" title="End">${lucideIconHtml('skip-forward', 18)}</button>
    <span class="radio-pill-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
  </div>`;
}

function syncRadioPillChrome() {
  const wrap = document.getElementById('start-radio-pill-wrap');
  if (wrap) {
    if (RadioService.stations.length) {
      wrap.hidden = false;
      wrap.innerHTML = radioPillMarkup(true);
      refreshLucideIcons(wrap);
    } else {
      wrap.hidden = true;
      wrap.innerHTML = '';
    }
  }
  document.querySelectorAll('[data-radio-pill-host]').forEach(host => {
    host.innerHTML = radioPillMarkup(host.dataset.radioCompact === '1');
    refreshLucideIcons(host);
  });
}

async function fetchRadioStations(query) {
  const q = (query || '').trim();
  const base = 'https://de1.api.radio-browser.info/json';
  try {
    let url = `${base}/stations/topvote/45`;
    if (q.length >= 2) {
      url = `${base}/stations/search?limit=45&order=votes&reverse=true&name=${encodeURIComponent(q)}`;
    }
    const r = await fetch(url, { headers: { 'User-Agent': 'WebOS12/1.0' } });
    if (!r.ok) throw new Error('bad');
    const j = await r.json();
    if (!Array.isArray(j) || !j.length) throw new Error('empty');
    return j
      .filter(s => s.url && !s.hls)
      .slice(0, 45)
      .map(s => ({
        name: (s.name || 'Station').replace(/</g, ''),
        url: s.url_resolved || s.url,
        country: s.country || '',
        tags: (s.tags || '').split(',').slice(0, 3).join(', '),
      }));
  } catch (e) {
    return RADIO_FALLBACK;
  }
}

function renderMusic(container, winId, extra = {}) {
  const filePath = extra.file;
  const audioSrc = extra.src;
  const isLocalFile = !!audioSrc;
  
  if (isLocalFile) {
    const fileName = filePath.split('/').pop();
    RadioService.setLocalMode({ name: fileName, url: audioSrc });
    container.innerHTML = `
      <div class="music-main" id="mu_main_${winId}">
        <div class="music-local-view" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px">
          <div class="album-art" style="width:180px;height:180px;border-radius:16px;background:linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);display:flex;align-items:center;justify-content:center;margin-bottom:30px;box-shadow:0 20px 60px rgba(0,120,212,0.3)">
            ${lucideIconHtml('music', 72)}
          </div>
          <div class="track-info" style="text-align:center;margin-bottom:30px">
            <div style="font-size:20px;font-weight:700;margin-bottom:8px;color:var(--text)">${escapeHtml(fileName)}</div>
            <div style="font-size:13px;color:var(--text-sec)">Local File</div>
          </div>
          <div class="seek-container" style="width:100%;max-width:350px;margin-bottom:10px">
            <div class="seek-bar" id="seek_bar_${winId}" style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;cursor:pointer;position:relative">
              <div class="seek-progress" id="seek_progress_${winId}" style="width:0%;height:100%;background:linear-gradient(90deg, var(--accent), var(--accent-light));border-radius:3px"></div>
              <div class="seek-thumb" id="seek_thumb_${winId}" style="position:absolute;left:0%;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:#fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>
            </div>
          </div>
          <div class="time-display" id="time_display_${winId}" style="font-size:12px;color:var(--text-sec);margin-bottom:20px;font-family:'Courier New',monospace">0:00 / 0:00</div>
          <div class="play-controls" style="display:flex;align-items:center;gap:20px">
            <button id="mu_prev_${winId}" style="background:none;border:none;cursor:pointer;color:var(--text-sec);padding:10px">${lucideIconHtml('skip-back', 24)}</button>
            <button id="mu_play_${winId}" style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg, var(--accent), var(--accent-light));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 25px rgba(0,120,212,0.4)">
              <span id="mu_play_icon_${winId}">${lucideIconHtml('play', 28)}</span>
            </button>
            <button id="mu_next_${winId}" style="background:none;border:none;cursor:pointer;color:var(--text-sec);padding:10px">${lucideIconHtml('skip-forward', 24)}</button>
          </div>
        </div>
      </div>`;
    
    refreshLucideIcons(container);
    
    const audioEl = RadioService.ensureAudio();
    const seekBar = document.getElementById(`seek_bar_${winId}`);
    const seekProgress = document.getElementById(`seek_progress_${winId}`);
    const seekThumb = document.getElementById(`seek_thumb_${winId}`);
    const timeDisplay = document.getElementById(`time_display_${winId}`);
    const playBtn = document.getElementById(`mu_play_${winId}`);
    const playIcon = document.getElementById(`mu_play_icon_${winId}`);
    const prevBtn = document.getElementById(`mu_prev_${winId}`);
    const nextBtn = document.getElementById(`mu_next_${winId}`);
    
    function formatTime(s) {
      if (!s || isNaN(s)) return '0:00';
      const m = Math.floor(s / 60);
      const sc = Math.floor(s % 60);
      return `${m}:${sc.toString().padStart(2,'0')}`;
    }
    
    function updateDisplay() {
      if (!audioEl) return;
      const ct = formatTime(audioEl.currentTime);
      const dt = audioEl.duration && !isNaN(audioEl.duration) ? formatTime(audioEl.duration) : '0:00';
      timeDisplay.textContent = `${ct} / ${dt}`;
      if (audioEl.duration && !isNaN(audioEl.duration)) {
        const pct = (audioEl.currentTime / audioEl.duration) * 100;
        seekProgress.style.width = pct + '%';
        seekThumb.style.left = pct + '%';
      }
      playIcon.innerHTML = lucideIconHtml(audioEl.paused ? 'play' : 'pause', 28);
      refreshLucideIcons(playBtn);
    }
    
    function seek(e) {
      if (!audioEl || !audioEl.duration || isNaN(audioEl.duration)) return;
      const rect = seekBar.getBoundingClientRect();
      const x = e.clientX;
      const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      audioEl.currentTime = pct * audioEl.duration;
    }
    
    audioEl.addEventListener('timeupdate', updateDisplay);
    audioEl.addEventListener('play', updateDisplay);
    audioEl.addEventListener('pause', updateDisplay);
    
    playBtn.onclick = function(e) {
      if (audioEl.paused) audioEl.play();
      else audioEl.pause();
    };
    prevBtn.onclick = function(e) {
      audioEl.currentTime = 0;
    };
    nextBtn.onclick = function(e) {
      audioEl.currentTime = audioEl.duration || 0;
    };
    seekBar.onclick = seek;
    
    return;
  }
  
  const root = document.createElement('div');
  root.className = 'app-music';
  RadioService.setRadioMode();
  root.innerHTML = `
    <div class="music-header">
      <span>Radio</span>
      <div class="music-header-actions">
        <button type="button" id="mu_pill_toggle_${winId}" title="Mini player (pill)">Pill</button>
      </div>
    </div>
    <div class="music-main" id="mu_main_${winId}">
      <div class="music-toolbar">
        <input type="search" id="mu_search_${winId}" placeholder="Search stations" />
        <button type="button" id="mu_refresh_${winId}">Search</button>
      </div>
      <div class="music-list" id="mu_list_${winId}">
        <div style="padding:20px;color:var(--text-sec);font-size:13px">Loading stations</div>
      </div>
      <div class="music-bottom-bar">
        <div data-radio-pill-host="1" data-radio-compact="0"></div>
      </div>
      <p class="music-hint">Stations via <a href="https://www.radio-browser.info/" target="_blank" rel="noopener" style="color:var(--accent-light)">Radio Browser</a>.</p>
    </div>
    <div class="music-pill-only" id="mu_pill_only_${winId}">
      <div data-radio-pill-host="1" data-radio-compact="0"></div>
      <button type="button" style="margin-top:8px;padding:8px 16px;border-radius:999px;border:1px solid var(--border);background:var(--surface-hover);cursor:pointer;font-size:12px;color:var(--text)" data-radio-action="expand">Show station list</button>
    </div>`;
  container.appendChild(root);

  const list = document.getElementById(`mu_list_${winId}`);
  const searchIn = document.getElementById(`mu_search_${winId}`);

  function highlightList() {
    const i = RadioService.idx;
    list.querySelectorAll('.music-track').forEach((el, j) => el.classList.toggle('active', j === i));
  }

  function loadTrack(i) {
    RadioService.playIdx(i);
    highlightList();
  }

  function renderList() {
    list.innerHTML = '';
    const stations = RadioService.stations;
    if (!stations.length) {
      list.innerHTML = '<div style="padding:20px;color:var(--text-sec)">No stations found.</div>';
      refreshLucideIcons(container);
      return;
    }
    stations.forEach((t, i) => {
      const el = document.createElement('div');
      el.className = 'music-track';
      const sub = [t.country, t.tags].filter(Boolean).join(' · ');
      el.innerHTML = `<span class="mti">${lucideIconHtml('disc-3', 22)}</span><div class="mtn"><div>${escapeHtml(t.name)}</div>${sub ? `<div class="music-meta">${escapeHtml(sub)}</div>` : ''}</div>`;
      el.addEventListener('click', () => loadTrack(i));
      list.appendChild(el);
    });
    highlightList();
    refreshLucideIcons(list);
  }

  async function loadStations() {
    list.innerHTML = '<div style="padding:20px;color:var(--text-sec)">Loading</div>';
    const stations = await fetchRadioStations(searchIn.value);
    RadioService.setStations(stations);
    renderList();
    if (stations.length) RadioService.playIdx(0);
    else RadioService.setIdx(-1);
    highlightList();
    syncRadioPillChrome();
  }

  const unreg = RadioService.on(() => {
    root.classList.toggle('pill-only', RadioService.pillMode);
    syncRadioPillChrome();
    highlightList();
  });

  document.getElementById(`mu_refresh_${winId}`).addEventListener('click', loadStations);
  searchIn.addEventListener('keydown', e => { if (e.key === 'Enter') loadStations(); });
  document.getElementById(`mu_pill_toggle_${winId}`).addEventListener('click', () => {
    RadioService.setPillMode(!RadioService.pillMode);
  });

  loadStations().finally(() => {
    syncRadioPillChrome();
  });

  root._radioCleanup = () => { unreg(); };
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return [r,g,b,255];
}

function floodFill(ctx, x, y, fillColor) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const idx = (y * w + x) * 4;
  const target = [data[idx],data[idx+1],data[idx+2],data[idx+3]];
  if (target.every((v,i) => v === fillColor[i])) return;
  const stack = [[x,y]];
  while (stack.length) {
    const [cx,cy] = stack.pop();
    const i = (cy*w+cx)*4;
    if (cx<0||cx>=w||cy<0||cy>=h) continue;
    if (!target.every((v,j) => data[i+j] === v)) continue;
    data[i]=fillColor[0]; data[i+1]=fillColor[1]; data[i+2]=fillColor[2]; data[i+3]=fillColor[3];
    stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
  }
  ctx.putImageData(img, 0, 0);
}

/*                                                                
   CONTEXT MENU
                                                                */
const ctxMenu = document.getElementById('context-menu');

function showContextMenu(x, y, items) {
  ctxMenu.innerHTML = '';
  items.forEach(item => {
    if (item.sep) { const d=document.createElement('div'); d.className='ctx-separator'; ctxMenu.appendChild(d); return; }
    const el = document.createElement('div');
    el.className = 'ctx-item' + (item.cls ? ' '+item.cls : '');
    const iconPart = item.lucide ? lucideIconHtml(item.lucide, 16) : (item.icon ? `<span class="ctx-emoji">${item.icon}</span>` : '');
    el.innerHTML = `<span class="ctx-icon">${iconPart}</span>${item.label}`;
    el.addEventListener('click', () => { hideCtxMenu(); item.action?.(); });
    ctxMenu.appendChild(el);
  });
  refreshLucideIcons(ctxMenu);

  // Position
  const vw = window.innerWidth, vh = window.innerHeight;
  ctxMenu.style.display = 'none';
  ctxMenu.classList.add('visible');
  const mw = ctxMenu.offsetWidth || 220;
  const mh = ctxMenu.offsetHeight || 200;
  ctxMenu.style.left = (x + mw > vw ? vw - mw - 4 : x) + 'px';
  ctxMenu.style.top  = (y + mh > vh ? vh - mh - 4 : y) + 'px';
  ctxMenu.style.display = '';
  
  if (typeof motion !== 'undefined') {
    motion(ctxMenu, {
      from: { opacity: 0, transform: 'scale(0.95)' },
      to: { opacity: 1, transform: 'scale(1)' },
      duration: 150,
      easing: 'ease-out',
    });
  }
}

function hideCtxMenu() { ctxMenu.classList.remove('visible'); }

/*                                                                
   DESKTOP CONTEXT MENU
                                                                */
document.getElementById('desktop').addEventListener('contextmenu', e => {
  if (e.target.closest('.desktop-icon')) return;
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, [
    { lucide: 'refresh-cw', label: 'Refresh', action: () => { buildDesktopIcons(); showNotification('Desktop', 'Desktop refreshed', 'refresh-cw'); } },
    { lucide: 'arrow-down-wide-narrow', label: 'Sort by name', action: () => showNotification('Desktop', 'Items sorted', 'check') },
    { sep: true },
    { lucide: 'file-plus', label: 'New Text File', action: () => {
      const n = prompt('File name:', 'New File.txt');
      if (n) { fsCreate('/Desktop', n, 'file', ''); showNotification('Desktop', `Created: ${n}`, 'file-text'); }
    }},
    { lucide: 'folder-plus', label: 'New Folder', action: () => {
      const n = prompt('Folder name:', 'New Folder');
      if (n) { fsCreate('/Desktop', n, 'dir'); showNotification('Desktop', `Created: ${n}`, 'folder'); }
    }},
    { sep: true },
    { lucide: 'palette', label: 'Personalize', action: () => launchApp('settings') },
  ]);
});

document.addEventListener('click', e => {
  if (!ctxMenu.contains(e.target)) hideCtxMenu();
});

/*                                                                
   DESKTOP ICONS (grid layout, drag, marquee select)
                                                                */
const desktopIconsEl = document.getElementById('desktop-icons');
const DESKTOP_CELL_W = 88;
const DESKTOP_CELL_H = 92;

function getDesktopGridCols() {
  const w = desktopIconsEl.clientWidth || 400;
  return Math.max(1, Math.floor(w / DESKTOP_CELL_W));
}

function findFreeDesktopCell(layout, cols, c0, r0, excludeKey) {
  const occ = new Set();
  Object.entries(layout).forEach(([k, v]) => {
    if (k === excludeKey || !v || typeof v.c !== 'number') return;
    occ.add(`${v.c},${v.r}`);
  });
  let c = c0, r = r0;
  for (let n = 0; n < 2500; n++) {
    const k = `${c},${r}`;
    if (!occ.has(k)) return { c, r };
    c++;
    if (c >= cols) { c = 0; r++; }
  }
  return { c: 0, r: 0 };
}

function onDesktopIconPointerDown(e, el, iconKey) {
  if (e.button !== 0) return;
  e.stopPropagation();
  const startX = e.clientX, startY = e.clientY;
  const startLeft = el.offsetLeft, startTop = el.offsetTop;
  let moved = false;
  function move(ev) {
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
    el.classList.add('di-dragging');
    el.style.left = (startLeft + dx) + 'px';
    el.style.top = (startTop + dy) + 'px';
  }
  function up() {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    el.classList.remove('di-dragging');
    if (!moved) return;
    el.dataset.dragMoved = '1';
    const cols = getDesktopGridCols();
    let c = Math.round((el.offsetLeft + 36) / DESKTOP_CELL_W);
    let r = Math.round((el.offsetTop + 36) / DESKTOP_CELL_H);
    c = Math.max(0, Math.min(cols - 1, c));
    r = Math.max(0, Math.min(50, r));
    const occ = new Set();
    desktopIconsEl.querySelectorAll('.desktop-icon').forEach(o => {
      if (o === el) return;
      const k = o.dataset.iconKey;
      const p = state.iconLayout[k];
      if (p && typeof p.c === 'number') occ.add(`${p.c},${p.r}`);
    });
    if (occ.has(`${c},${r}`)) {
      const f = findFreeDesktopCell(state.iconLayout, cols, c, r, iconKey);
      c = f.c; r = f.r;
    }
    state.iconLayout[iconKey] = { c, r };
    el.style.left = c * DESKTOP_CELL_W + 'px';
    el.style.top = r * DESKTOP_CELL_H + 'px';
    saveState();
    setTimeout(() => { delete el.dataset.dragMoved; }, 400);
  }
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

function showDesktopIconContextMenu(x, y, def) {
  const items = [{ lucide: 'arrow-right', label: 'Open', action: () => def.action() }];
  
  if (def.key && def.key.startsWith('app:')) {
    const appId = def.key.replace('app:', '');
    items.push({ lucide: 'monitor', label: 'Unpin from Desktop', action: () => {
      if (state.iconLayout && state.iconLayout[def.key]) {
        delete state.iconLayout[def.key];
        saveState();
        buildDesktopIcons();
        showNotification('Desktop', 'Icon removed');
      }
    }});
  }
  
  if (def.path && def.key.startsWith('d:') && FS[def.path]) {
    items.push({ lucide: 'trash-2', label: 'Delete', cls: 'danger', action: () => {
      fsDelete(def.path);
      buildDesktopIcons();
      showNotification('Desktop', 'Item deleted', 'trash-2');
    }});
  }
  showContextMenu(x, y, items);
}

function buildDesktopIcons() {
  desktopIconsEl.innerHTML = '';
  const rbCount = RECYCLE_BIN.length;
  const rbLabel = rbCount ? `Recycle Bin (${rbCount})` : 'Recycle Bin';
  
  const appDefs = Object.entries(APPS)
    .filter(([id, app]) => state.iconLayout && state.iconLayout['app:' + id])
    .map(([id, app]) => ({
      key: 'app:' + id,
      appId: id,
      lucide: app.icon,
      label: app.name,
      action: () => launchApp(id)
    }));
  
  const defs = [
    { key: 'sys:thispc', lucide: 'hard-drive', label: 'This PC', action: () => launchApp('explorer', { startPath: '/' }) },
    { key: 'sys:recycle', lucide: 'trash-2', label: rbLabel, action: () => launchApp('recycle') },
    { key: 'sys:documents', lucide: 'file-text', label: 'Documents', action: () => launchApp('explorer', { startPath: '/Documents' }) },
    { key: 'sys:paint', lucide: 'palette', label: 'Paint', action: () => launchApp('paint') },
    { key: 'sys:music', lucide: 'music', label: 'Music', action: () => launchApp('music') },
    ...appDefs,
    ...fsListDir('/Desktop').map(f => ({
      key: 'd:' + f.path,
      path: f.path,
      lucide: fileTypeLucide(f.name, f.type),
      label: f.name,
      action: () => {
        if (f.type === 'file') {
          const ext = (f.name.split('.').pop() || '').toLowerCase();
          if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) launchApp('music');
          else openFileInNotepad(f.path);
        } else launchApp('explorer', { startPath: f.path });
      }
    })),
  ];

  const cols = getDesktopGridCols();
  const layout = state.iconLayout;

  defs.forEach((def, i) => {
    let pos = layout[def.key];
    if (!pos || typeof pos.c !== 'number' || typeof pos.r !== 'number') {
      const c = i % cols, r = Math.floor(i / cols);
      pos = findFreeDesktopCell(layout, cols, c, r, def.key);
      layout[def.key] = pos;
    }
  });
  saveState();

  defs.forEach(def => {
    const pos = state.iconLayout[def.key];
    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.dataset.iconKey = def.key;
    el.style.left = pos.c * DESKTOP_CELL_W + 'px';
    el.style.top = pos.r * DESKTOP_CELL_H + 'px';
    el.innerHTML = `<div class="di-icon">${lucideIconHtml(def.lucide, 32)}</div><div class="di-label">${def.label}</div>`;
    el.addEventListener('dblclick', e => {
      if (el.dataset.dragMoved) { e.preventDefault(); return; }
      const rect = el.getBoundingClientRect();
      setLaunchOrigin(rect.left + rect.width / 2, rect.top + rect.height / 2);
      def.action();
    });
    el.addEventListener('mousedown', e => onDesktopIconPointerDown(e, el, def.key));
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      showDesktopIconContextMenu(e.clientX, e.clientY, def);
    });
    desktopIconsEl.appendChild(el);
  });
  refreshLucideIcons(desktopIconsEl);
}

window.addEventListener('resize', () => {
  clearTimeout(window._debDesk);
  window._debDesk = setTimeout(() => buildDesktopIcons(), 200);
});

/*                                                                
   TASKBAR ” START BUTTON & SEARCH
                                                                */
document.getElementById('start-btn').addEventListener('click', e => { e.stopPropagation(); toggleStart(); });
document.getElementById('search-btn').addEventListener('click', () => {
  if (!startOpen) toggleStart();
  setTimeout(() => document.getElementById('start-search-input').focus(), 50);
});

document.getElementById('start-more-link').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const va = document.getElementById('start-view-all');
  const vd = document.getElementById('start-view-default');
  if (!va || !vd) return;
  va.classList.remove('hidden');
  vd.style.display = 'none';
  buildStartAllApps();
});

document.getElementById('start-back-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  resetStartMenuAllAppsView();
});

document.addEventListener('click', (e) => {
  const rbtn = e.target.closest('[data-radio-action]');
  if (rbtn) {
    const a = rbtn.dataset.radioAction;
    const audio = RadioService.audioEl;
    if (a === 'prev') {
      if (RadioService.localMode && audio) audio.currentTime = 0;
      else RadioService.prevStation();
    }
    else if (a === 'next') {
      if (RadioService.localMode && audio) audio.currentTime = audio.duration || 0;
      else RadioService.nextStation();
    }
    else if (a === 'toggle') RadioService.togglePlay();
    else if (a === 'expand') RadioService.setPillMode(false);
    e.stopPropagation();
    return;
  }
  if (startOpen && !document.getElementById('start-menu').contains(e.target) && e.target.id !== 'start-btn') {
    toggleStart();
    document.getElementById('start-search-input').value = '';
    document.getElementById('start-body').style.display = 'block';
    document.getElementById('start-search-results').style.display = 'none';
    syncRadioPillChrome();
  }
  // Close notification center when clicking outside
  const nc = document.getElementById('notification-center');
  const notifBtn = document.getElementById('notif-btn');
  if (nc.classList.contains('open') && !nc.contains(e.target) && e.target !== notifBtn && !notifBtn.contains(e.target)) {
    nc.classList.remove('open');
  }
});

/*                                                                
   SYSTEM SOUNDS                                                                */
const SoundService = {
  audioCtx: null,
  enabled: true,
  wasPlaying: false,
  
  init() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    }
    this.enabled = localStorage.getItem('wos_sound_enabled') !== 'false';
  },
  
  play(type = 'notification') {
    if (!this.enabled || !this.audioCtx) return;
    
    const ctx = this.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const sounds = {
      notification: { freq: 800, dur: 0.1, type: 'sine' },
      success: { freq: 600, dur: 0.15, type: 'sine' },
      error: { freq: 300, dur: 0.2, type: 'square' },
      click: { freq: 500, dur: 0.03, type: 'sine' },
      alert: { freq: 400, dur: 0.3, type: 'sawtooth' }
    };
    
    const s = sounds[type] || sounds.notification;
    osc.frequency.value = s.freq;
    osc.type = s.type;
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + s.dur);
  },
  
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('wos_sound_enabled', this.enabled);
    return this.enabled;
  }
};

SoundService.init();

/*                                                                
   NOTIFICATIONS                                                                 */
const notifContainer = document.getElementById('notif-container');

function showNotification(title, msg, iconName = 'bell') {
  const el = document.createElement('div');
  el.className = 'notif';
  el.innerHTML = `<div class="notif-icon">${lucideIconHtml(iconName, 22)}</div><div class="notif-body"><div class="notif-title">${title}</div><div class="notif-msg">${msg}</div></div>`;
  notifContainer.appendChild(el);
  refreshLucideIcons(el);
  el.addEventListener('click', () => el.remove());
  SoundService.play(iconName === 'alert-circle' || iconName === 'alert-triangle' ? 'error' : 'notification');
  
  if (typeof motion !== 'undefined') {
    motion(el, {
      from: { transform: 'translateX(100%)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 },
      duration: 300,
      easing: 'ease-out',
    });
  }
  
  setTimeout(() => { 
    if (typeof motion !== 'undefined') {
      motion(el, {
        from: { transform: 'translateX(0)', opacity: 1 },
        to: { transform: 'translateX(100%)', opacity: 0 },
        duration: 300,
        easing: 'ease-in',
      }).finished.then(() => el.remove());
    } else {
      el.style.animation = 'fadeOut .3s ease forwards';
      setTimeout(() => el.remove(), 300);
    }
  }, 4000);
}
/*
                                                                  
   CLOCK
                                                                   */
function getTimeInTimezone(tz) {
  const tzData = TIMEZONE_DATA[tz] || TIMEZONE_DATA['Africa/Nairobi'];
  const now = new Date();
  const utcTime = now.getTime();
  return new Date(utcTime + (tzData.offset * 3600000));
}

function updateClock() {
  const tz = state.timezone || 'Africa/Nairobi';
  const tzTime = getTimeInTimezone(tz);
  
  const h = tzTime.getUTCHours().toString().padStart(2, '0');
  const m = tzTime.getUTCMinutes().toString().padStart(2, '0');
  const day = tzTime.getUTCDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[tzTime.getUTCMonth()];
  
  document.getElementById('clock-time').textContent = `${h}:${m}`;
  document.getElementById('clock-date').textContent = `${month} ${day}`;
}

setInterval(updateClock, 1000);
updateClock();

/*                                                                
   ALT+TAB
                                                                 */
let altTabOpen = false, altTabIdx = 0;
const atOverlay = document.getElementById('alttab-overlay');
const atBox     = document.getElementById('alttab-box');

document.addEventListener('keydown', e => {
  if (e.altKey && e.key === 'Tab') {
    e.preventDefault();
    const wins = [...windowsMap.entries()].filter(([,w]) => w.state !== 'minimized');
    if (!wins.length) return;

    if (!altTabOpen) { 
      altTabOpen = true; 
      atOverlay.classList.add('visible'); 
      buildAltTab(); 
      altTabIdx = 0;
      if (typeof motion !== 'undefined') {
        motion(atOverlay, {
          from: { opacity: 0 },
          to: { opacity: 1 },
          duration: 150,
          easing: 'ease-out',
        });
        motion(atBox, {
          from: { transform: 'scale(0.9)' },
          to: { transform: 'scale(1)' },
          duration: 200,
          easing: 'ease-out',
        });
      }
    }
    else altTabIdx = (altTabIdx + 1) % wins.length;
    highlightAltTab(altTabIdx);
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'Alt' && altTabOpen) {
    const wins = [...windowsMap.entries()].filter(([,w]) => w.state !== 'minimized');
    if (wins[altTabIdx]) focusWin(wins[altTabIdx][0]);
    altTabOpen = false;
    atOverlay.classList.remove('visible');
  }
  if (e.key === 'Escape' && altTabOpen) {
    altTabOpen = false;
    atOverlay.classList.remove('visible');
  }
});

function buildAltTab() {
  atBox.innerHTML = '';
  [...windowsMap.entries()].filter(([,w]) => w.state !== 'minimized').forEach(([id,win], i) => {
    const app = APPS[win.appId];
    const el = document.createElement('div');
    el.className = 'at-item';
    el.innerHTML = `<div class="at-icon">${lucideIconHtml(app.icon, 30)}</div><div class="at-name">${win.title || app.name}</div>`;
    el.addEventListener('click', () => { focusWin(id); altTabOpen = false; atOverlay.classList.remove('visible'); });
    atBox.appendChild(el);
  });
  refreshLucideIcons(atBox);
}

function highlightAltTab(idx) {
  atBox.querySelectorAll('.at-item').forEach((el, i) => el.classList.toggle('at-sel', i === idx));
}

/*                                                                
   KEYBOARD SHORTCUTS
                                                                */
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Escape') { e.preventDefault(); toggleStart(); }
  if (e.key === 'F5') { showNotification('WebOS 12','Desktop refreshed','refresh-cw'); buildDesktopIcons(); }
});

/*                                                                
   INITIALIZE
                                                                */
function init() {
  // Apply saved settings
  applyTheme(state.theme);
  applyWallpaper(state.wallpaper);
  applyAccent(state.accent);
  applyBrightness(state.brightness);
  applyTransparency();
  updateUsernameUI();
  
  // Install wizard state
  let installStep = 1;
  let selectedLang = 'en';
  let selectedRegion = 'us';
  let selectedTimezone = 'America/New_York';
  let selectedDrive = 'C';
  const languages = [
    { code: 'en', name: 'English (US)', native: 'English (US)' },
    { code: 'en-gb', name: 'English (UK)', native: 'English (UK)' },
    { code: 'es', name: 'Español', native: 'Spanish' },
    { code: 'es-mx', name: 'Español (México)', native: 'Spanish (Mexico)' },
    { code: 'fr', name: 'Français', native: 'French' },
    { code: 'fr-ca', name: 'Français (Canada)', native: 'French (Canada)' },
    { code: 'de', name: 'Deutsch', native: 'German' },
    { code: 'it', name: 'Italiano', native: 'Italian' },
    { code: 'pt', name: 'Português (Brasil)', native: 'Portuguese (Brazil)' },
    { code: 'pt-pt', name: 'Português (Portugal)', native: 'Portuguese (Portugal)' },
    { code: 'zh-cn', name: '中文(简体)', native: 'Chinese (Simplified)' },
    { code: 'zh-tw', name: '中文(繁體)', native: 'Chinese (Traditional)' },
    { code: 'zh-hk', name: '中文(香港)', native: 'Chinese (Hong Kong)' },
    { code: 'ja', name: '日本語', native: 'Japanese' },
    { code: 'ko', name: '한국어', native: 'Korean' },
    { code: 'ru', name: 'Русский', native: 'Russian' },
    { code: 'ar', name: 'العربية', native: 'Arabic' },
    { code: 'he', name: 'עברית', native: 'Hebrew' },
    { code: 'hi', name: 'हिन्दी', native: 'Hindi' },
    { code: 'bn', name: 'বাংলা', native: 'Bengali' },
    { code: 'ta', name: 'தமிழ்', native: 'Tamil' },
    { code: 'te', name: 'తెలుగు', native: 'Telugu' },
    { code: 'th', name: 'ไทย', native: 'Thai' },
    { code: 'vi', name: 'Tiếng Việt', native: 'Vietnamese' },
    { code: 'id', name: 'Bahasa Indonesia', native: 'Indonesian' },
    { code: 'ms', name: 'Bahasa Melayu', native: 'Malay' },
    { code: 'tr', name: 'Türkçe', native: 'Turkish' },
    { code: 'pl', name: 'Polski', native: 'Polish' },
    { code: 'nl', name: 'Nederlands', native: 'Dutch' },
    { code: 'sv', name: 'Svenska', native: 'Swedish' },
    { code: 'da', name: 'Dansk', native: 'Danish' },
    { code: 'fi', name: 'Suomi', native: 'Finnish' },
    { code: 'no', name: 'Norsk', native: 'Norwegian' },
    { code: 'cs', name: 'Čeština', native: 'Czech' },
    { code: 'sk', name: 'Slovenčina', native: 'Slovak' },
    { code: 'hu', name: 'Magyar', native: 'Hungarian' },
    { code: 'ro', name: 'Română', native: 'Romanian' },
    { code: 'uk', name: 'Українська', native: 'Ukrainian' },
    { code: 'el', name: 'Ελληνικά', native: 'Greek' }
  ];

  function populateLanguages() {
    const container = document.getElementById('language-list');
    if (!container) return;
    container.innerHTML = languages.map(lang => `
      <div class="lang-option" data-lang="${lang.code}" style="padding:14px 18px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);margin-bottom:8px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:space-between">
        <span style="color:#fff;font-weight:500">${lang.name}</span>
        <span style="font-size:12px;color:rgba(255,255,255,0.4)">${lang.native}</span>
      </div>
    `).join('');
    container.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', () => {
        container.querySelectorAll('.lang-option').forEach(o => o.style.background = 'rgba(255,255,255,0.05)');
        opt.style.background = 'rgba(0,120,212,0.2)';
        selectedLang = opt.dataset.lang;
      });
    });
  }

  function showStep(step) {
    console.log('showStep called:', step);
    const stepId = typeof step === 'number' ? 'setup-step-' + step.toString().replace('.', '-') : 'setup-step-' + step;
    document.querySelectorAll('[id^="setup-step-"]').forEach(el => el.style.display = 'none');
    const stepEl = document.getElementById(stepId);
    if (stepEl) {
      stepEl.style.display = 'block';
      stepEl.style.animation = 'fadeIn 0.3s ease';
    }
    installStep = step;
    const overlay = document.getElementById('setup-overlay');
    if (overlay) refreshLucideIcons(overlay);
    console.log('Step ID:', stepId, 'Step element:', stepEl ? 'found' : 'NOT FOUND');
  }

  function startInstallation() {
    showStep(3);
    const files = [
      { name: 'kernel.sys', size: '2.4 MB' },
      { name: 'hal.dll', size: '1.8 MB' },
      { name: 'ntoskrnl.exe', size: '4.2 MB' },
      { name: 'win32k.sys', size: '3.1 MB' },
      { name: 'drivers.sys', size: '892 KB' },
      { name: 'bootmgr', size: '412 KB' },
      { name: 'system32\\ntdll.dll', size: '1.2 MB' },
      { name: 'system32\\win32k.sys', size: '2.8 MB' },
      { name: 'system32\\csrsrv.dll', size: '48 KB' },
      { name: 'system32\\basesrv.dll', size: '312 KB' },
      { name: 'system32\\smss.exe', size: '28 KB' },
      { name: 'system32\\services.exe', size: '92 KB' },
      { name: 'system32\\lsass.exe', size: '112 KB' },
      { name: 'system32\\svchost.exe', size: '96 KB' },
      { name: 'system32\\explorer.exe', size: '2.4 MB' },
      { name: 'system32\\shell32.dll', size: '8.2 MB' },
      { name: 'system32\\user32.dll', size: '1.2 MB' },
      { name: 'system32\\gdi32.dll', size: '892 KB' },
      { name: 'system32\\advapi32.dll', size: '612 KB' },
      { name: 'system32\\kernel32.dll', size: '1.1 MB' },
      { name: 'Fonts\\segoe-ui.ttf', size: '2.8 MB' },
      { name: 'Fonts\\arial.ttf', size: '1.2 MB' },
      { name: 'Resources\\icons.dll', size: '4.2 MB' },
      { name: 'Resources\\themes\\default.theme', size: '24 KB' },
      { name: 'Program Files\\Start Menu', size: '12 KB' },
      { name: 'Program Files\\Desktop', size: '8 KB' },
      { name: 'Users\\Default', size: '4 KB' },
      { name: 'Setup\\install.dat', size: '128 KB' },
      { name: 'Setup\\winsetup.dll', size: '892 KB' },
      { name: 'WebOS\\kernel', size: '156 KB' },
      { name: 'WebOS\\shell', size: '2.4 MB' }
    ];
    
    const statusEl = document.getElementById('install-status');
    const percentEl = document.getElementById('install-percent');
    const progressEl = document.getElementById('install-progress');
    const filesEl = document.getElementById('install-files');
    
    let totalFiles = files.length;
    let completed = 0;
    let lastUpdate = 0;
    
    function processFile(idx) {
      if (idx >= totalFiles) {
        setTimeout(() => {
          statusEl.textContent = 'Almost ready...';
          percentEl.textContent = '100%';
          progressEl.style.width = '100%';
          setTimeout(() => showStep(4), 800);
        }, 400);
        return;
      }
      
      const file = files[idx];
      const now = Date.now();
      
      if (now - lastUpdate > 80) {
        const percent = Math.round((idx / totalFiles) * 100);
        percentEl.textContent = percent + '%';
        progressEl.style.width = percent + '%';
        
        const statusText = idx < 5 ? 'Copying system files...' : 
                         idx < 15 ? 'Configuring system...' : 
                         idx < 25 ? 'Installing components...' : 'Finalizing...';
        statusEl.textContent = statusText;
        
        filesEl.innerHTML += `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">${file.name} <span style="color:#60cdff">OK</span></div>`;
        filesEl.scrollTop = filesEl.scrollHeight;
        lastUpdate = now;
      }
      
      completed = idx;
      setTimeout(() => processFile(idx + 1), 40 + Math.random() * 60);
    }
    
    setTimeout(() => processFile(0), 500);
  }

  // Populate language list on load
  populateLanguages();

  // Check for new install and show setup - also check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const forceSetup = urlParams.get('setup') === '1';
  console.log('isNewInstall:', isNewInstall, 'state.installed:', state.installed, 'forceSetup:', forceSetup);

  // Always show setup if ?setup=1 or fresh install
  if (forceSetup || !state.installed) {
    setTimeout(() => {
      const overlay = document.getElementById('setup-overlay');
      const body = document.body;
      
      // Force show
      overlay.style.display = 'flex';
      body.classList.add('setup-active');
      
      // Show step 1
      const step1 = document.getElementById('setup-step-1');
      if (step1) step1.style.display = 'block';
      
      console.log('Setup shown. Step 1:', step1 ? 'visible' : 'missing');
      refreshLucideIcons(overlay);
    }, 500);
  }

  // Step 1 - Language next
  document.getElementById('setup-step1-next').addEventListener('click', () => {
    showStep(1.5);
  });
  
  // Region selection
  document.querySelectorAll('.region-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.region-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedRegion = opt.dataset.region;
      selectedTimezone = opt.dataset.tz;
    });
  });
  document.querySelector('.region-option[data-region="east-africa"]').classList.add('selected');
  
  // Step 1.5 - Back
  document.getElementById('setup-step1-5-back').addEventListener('click', () => {
    showStep(1);
  });
  
  // Step 1.5 - Next (to storage)
  document.getElementById('setup-step1-5-next').addEventListener('click', () => {
    showStep(2);
  });
  
  // Drive selection
  document.querySelectorAll('.storage-drive').forEach(drive => {
    drive.addEventListener('click', () => {
      document.querySelectorAll('.storage-drive').forEach(d => d.classList.remove('selected'));
      drive.classList.add('selected');
      selectedDrive = drive.dataset.drive;
    });
  });
  document.querySelector('.storage-drive[data-drive="C"]').classList.add('selected');
  
  // Step 2 - Back
  document.getElementById('setup-step2-back').addEventListener('click', () => {
    showStep(1);
  });
  
  // Step 2 - Install
  document.getElementById('setup-step2-next').addEventListener('click', () => {
    startInstallation();
  });
  
  // Enter key support
  document.addEventListener('keypress', (e) => {
    if (installStep === 4 && e.key === 'Enter') {
      document.getElementById('setup-finish').click();
    }
  });
  
  // Finish setup
  document.getElementById('setup-finish').addEventListener('click', () => {
    const username = (document.getElementById('setup-username').value || '').trim().slice(0, 32) || 'User';
    const pcname = (document.getElementById('setup-pcname').value || 'WEBOS-PC').trim().slice(0, 15) || 'WEBOS-PC';
    state.username = username;
    state.pcname = pcname;
    state.language = selectedLang;
    state.drive = selectedDrive;
    state.storageSize = selectedDrive === 'C' ? '256GB' : '512GB';
    state.region = selectedRegion;
    state.timezone = selectedTimezone;
    state.installed = true;
    saveState();
    updateUsernameUI();
    document.body.classList.remove('setup-active');
    document.getElementById('setup-overlay').classList.remove('visible');
    setTimeout(() => {
      document.getElementById('setup-overlay').style.display = 'none';
    }, 400);
    showNotification('Welcome to WebOS 12', 'Your PC is ready, ' + username + '!', 'sparkles');
  });

  const qsB = document.getElementById('qs-brightness');
  if (qsB) qsB.addEventListener('input', () => applyBrightness(qsB.value));

  initBattery();
  updateSoundIcon();

  // Build start menu
  buildStartGrid();
  buildStartRec();

  // Build desktop icons
  buildDesktopIcons();
  updateTaskbar();

  setTimeout(() => {
    document.getElementById('boot-overlay').classList.add('boot-done');
  }, 1200);

  // Show login if locked, otherwise welcome
  setTimeout(() => {
    console.log('Checking lock - password:', state.password ? 'yes' : 'no', 'locked:', state.locked);

    // First hide boot-overlay completely
    const boot = document.getElementById('boot-overlay');
    if (boot) { boot.style.display = 'none'; boot.classList.add('boot-done'); }

    if (state.password && state.locked) {
      console.log('Showing lock screen NOW');
      showLockScreen();
    } else {
      showNotification('Welcome to WebOS 12', 'Double-click desktop icons or use the Start menu to open apps.', 'sparkles');
    }
  }, 1900);

  syncRadioPillChrome();
  refreshLucideIcons(document.body);
}

function showLockScreen() {
  const overlay = document.getElementById('lock-overlay');
  const avatar = document.getElementById('lock-avatar');
  const username = document.getElementById('lock-username');
  const input = document.getElementById('lock-password');
  const error = document.getElementById('lock-error');

  if (!overlay) { console.error('LOCK OVERLAY NOT FOUND!'); return; }
  console.log('showLockScreen - overlay found');

  avatar.textContent = (state.username || 'U').charAt(0).toUpperCase();
  username.textContent = state.username || 'User';
  input.value = '';
  error.classList.remove('visible');

  // Force display and visibility
  overlay.setAttribute('style', 'display:flex !important;visibility:visible !important;opacity:1 !important;z-index:100001;position:fixed;inset:0;background:linear-gradient(180deg,#0a0a12 0%,#141420 50%,#1a1a28 100%)');
  overlay.classList.add('locked');
  overlay.classList.add('visible');

  // Focus input after a tick
  setTimeout(() => input.focus(), 100);
}

function hideLockScreen() {
  const overlay = document.getElementById('lock-overlay');
  const bootOverlay = document.getElementById('boot-overlay');

  if (overlay) {
    overlay.style.display = 'none';
    overlay.classList.remove('visible');
    overlay.classList.remove('locked');
  }

  // Hide boot overlay
  if (bootOverlay) {
    bootOverlay.style.display = 'none';
    bootOverlay.classList.add('boot-done');
  }

  // Show desktop
  const desktop = document.getElementById('desktop');
  const taskbar = document.getElementById('taskbar');
  const startMenu = document.getElementById('start-menu');
  const windowsLayer = document.getElementById('windows-layer');

  if (desktop) desktop.style.display = '';
  if (taskbar) taskbar.style.display = '';
  if (startMenu) { startMenu.classList.remove('open'); startMenu.style.display = ''; }
  if (windowsLayer) windowsLayer.style.display = '';

  console.log('Lock hidden, desktop shown');
}

function unlockOS() {
  const input = document.getElementById('lock-password');
  const error = document.getElementById('lock-error');
  const btn = document.getElementById('lock-unlock');
  if (!input || !btn) { console.error('Lock elements not found'); return; }

  const entered = input.value;
  console.log('Trying unlock, entered:', entered, 'stored:', state.password);

  if (entered === state.password) {
    error.classList.remove('visible');
    hideLockScreen();
    showNotification('Welcome back', 'You are now signed in as ' + (state.username || 'User'), 'user');
  } else {
    error.classList.add('visible');
    input.value = '';
    input.focus();
  }
}

function lockOS() {
  if (state.password && state.locked) {
    showLockScreen();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  initFirebase();
  // Set up lock screen handlers
  const lockInput = document.getElementById('lock-password');
  const lockBtn = document.getElementById('lock-unlock');

  console.log('Lock init - input:', lockInput, 'btn:', lockBtn);

  if (lockInput) {
    lockInput.addEventListener('keypress', function(e) {
      console.log('Enter pressed');
      if (e.key === 'Enter') unlockOS();
    });
  }
  if (lockBtn) {
    lockBtn.onclick = function() {
      console.log('Button clicked');
      unlockOS();
    };
  }
});

/*                                                        
   BATTERY SYSTEM
                                                          */
async function initBattery() {
  const mockBatteryLevel = Math.floor(Math.random() * 30) + 70;
  let batteryLevel = mockBatteryLevel;
  
  const updateUI = () => {
    const batteryEl = document.getElementById('battery-level');
    if (batteryEl) batteryEl.innerText = `${batteryLevel}%`;
    
    const batteryIcon = document.querySelector('#battery-icon i');
    if (batteryIcon) {
      if (batteryLevel > 80) batteryIcon.setAttribute('data-lucide', 'battery-full');
      else if (batteryLevel > 50) batteryIcon.setAttribute('data-lucide', 'battery-medium');
      else if (batteryLevel > 20) batteryIcon.setAttribute('data-lucide', 'battery-low');
      else batteryIcon.setAttribute('data-lucide', 'battery');
      refreshLucideIcons(document.getElementById('battery-btn'));
    }
  };

  updateUI();
  
  setInterval(() => {
    batteryLevel = Math.max(5, batteryLevel - 1);
    updateUI();
  }, 60000);
}

function toggleSound() {
  const enabled = SoundService.toggle();
  const soundToggle = document.getElementById('sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  if (soundToggle) soundToggle.classList.toggle('muted', !enabled);
  if (soundIcon) soundIcon.setAttribute('data-lucide', enabled ? 'volume-2' : 'volume-x');
  refreshLucideIcons(soundToggle);
  if (!enabled) {
    SoundService.wasPlaying = false;
    const radio = document.getElementById('wos-global-radio');
    if (radio && !radio.paused) { radio.pause(); SoundService.wasPlaying = true; }
    document.querySelectorAll('audio').forEach(a => { if (!a.paused) { a.pause(); SoundService.wasPlaying = true; } });
  } else {
    if (SoundService.wasPlaying) {
      const radio = document.getElementById('wos-global-radio');
      if (radio) radio.play().catch(() => {});
      document.querySelectorAll('audio').forEach(a => a.play().catch(() => {}));
    }
  }
  if (enabled) SoundService.play('click');
}

function updateSoundIcon() {
  const soundToggle = document.getElementById('sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  if (soundToggle) soundToggle.classList.toggle('muted', !SoundService.enabled);
  if (soundIcon) soundIcon.setAttribute('data-lucide', SoundService.enabled ? 'volume-2' : 'volume-x');
  refreshLucideIcons(soundToggle);
}

function toggleQuickSettings() {
  const qs = document.getElementById('quick-settings');
  const nc = document.getElementById('notification-center');
  const opening = !qs.classList.contains('visible');
  if (opening) nc.classList.remove('open');
  qs.classList.toggle('visible', opening);
  if (opening && startOpen) toggleStart();
  
  if (typeof motion !== 'undefined') {
    motion(qs, {
      from: { opacity: opening ? 0 : 1, transform: opening ? 'translateY(10px)' : 'translateY(0)' },
      to: { opacity: 1, transform: 'translateY(0)' },
      duration: 200,
      easing: 'ease-out',
    });
  }
}

function toggleTheme() {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  state.theme = newTheme;
  saveState();
  showNotification('System', `Switched to ${newTheme} mode`, 'monitor');
}

// Close QS when clicking desktop
document.getElementById('desktop').addEventListener('click', () => {
  document.getElementById('quick-settings').classList.remove('visible');
});

let startX, startY, selectionBox;

document.getElementById('desktop').addEventListener('mousedown', e => {
  if (e.target.id !== 'desktop' && e.target.id !== 'desktop-atmosphere') return;
  desktopIconsEl.querySelectorAll('.desktop-icon.selected').forEach(el => el.classList.remove('selected'));
  startX = e.clientX; startY = e.clientY;
  selectionBox = document.createElement('div');
  selectionBox.className = 'selection-box';
  document.body.appendChild(selectionBox);
});

document.addEventListener('mousemove', e => {
  if (!selectionBox) return;
  const x = e.clientX, y = e.clientY;
  selectionBox.style.left = Math.min(x, startX) + 'px';
  selectionBox.style.top = Math.min(y, startY) + 'px';
  selectionBox.style.width = Math.abs(x - startX) + 'px';
  selectionBox.style.height = Math.abs(y - startY) + 'px';
});

document.addEventListener('mouseup', e => {
  if (!selectionBox) return;
  const x = e.clientX, y = e.clientY;
  const w = Math.abs(x - startX), h = Math.abs(y - startY);
  if (w > 4 || h > 4) {
    const l = Math.min(x, startX), t = Math.min(y, startY);
    const rect = { left: l, top: t, right: l + w, bottom: t + h };
    desktopIconsEl.querySelectorAll('.desktop-icon').forEach(el => {
      const r = el.getBoundingClientRect();
      const hit = !(r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom);
      el.classList.toggle('selected', hit);
    });
  }
  selectionBox.remove();
  selectionBox = null;
});

function toggleNotificationCenter() {
  const qs = document.getElementById('quick-settings');
  const nc = document.getElementById('notification-center');
  const opening = !nc.classList.contains('open');
  if (opening) qs.classList.remove('visible');
  nc.classList.toggle('open', opening);
  if (opening && startOpen) toggleStart();
  
  if (typeof motion !== 'undefined') {
    motion(nc, {
      from: { opacity: opening ? 0 : 1, transform: opening ? 'translateY(10px)' : 'translateY(0)' },
      to: { opacity: 1, transform: 'translateY(0)' },
      duration: 200,
      easing: 'ease-out',
    });
  }
}

function clearNotifications() {
  document.getElementById('nc-list').innerHTML = '<div class="nc-empty">No new notifications</div>';
}

// Update your existing showNotification function to also add to the center:
const originalShowNotification = showNotification;
showNotification = function(title, text, iconName) {
  if (state.notificationsEnabled === false) return;
  originalShowNotification(title, text, iconName);
  const list = document.getElementById('nc-list');
  if (list.querySelector('.nc-empty')) list.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'nc-item';
  item.innerHTML = `<div class="nc-card-title">${lucideIconHtml(iconName || 'bell', 18)}<span>${title}</span></div><div class="nc-card-body">${text}</div>`;
  list.prepend(item);
  refreshLucideIcons(item);
};

function setRandomWallpaper() {
  const randomIndex = Math.floor(Math.random() * WALLPAPERS.length);
  
  // Use your existing applyWallpaper function to keep state in sync
  applyWallpaper(randomIndex);
  
  // Visually update the settings grid if it's currently open
  const activeGrid = document.querySelector('.wp-grid'); // Based on your class
  if (activeGrid) {
    activeGrid.querySelectorAll('.wp-item').forEach((item, idx) => {
      item.classList.toggle('active', idx === randomIndex);
    });
  }

  showNotification('Personalization', `Random: ${WALLPAPERS[randomIndex].name}`, 'shuffle');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW Registered'))
      .catch(err => console.log('SW Failed', err));
  });
}

init();
