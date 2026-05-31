const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { app } = require('electron');

const DATA_DIR = app ? path.join(app.getPath('userData'), 'hexara-data') : path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');
const TTS_CONFIG_FILE = path.join(DATA_DIR, 'tts-config.json');

function getCampaignDir(campaignId) {
  return path.join(DATA_DIR, 'campaigns', campaignId);
}
function getCampaignMapsFile(campaignId) {
  return path.join(getCampaignDir(campaignId), 'maps.json');
}
function getCampaignSoundsFile(campaignId) {
  return path.join(getCampaignDir(campaignId), 'sounds.json');
}
function getCampaignNotesFile(campaignId) {
  return path.join(getCampaignDir(campaignId), 'notes.json');
}
function getCampaignBestiaryFile(campaignId) {
  return path.join(getCampaignDir(campaignId), 'bestiary.json');
}
function getCampaignTrapTemplatesFile(campaignId) {
  return path.join(getCampaignDir(campaignId), 'trap-templates.json');
}
function getCampaignUploadsDir(campaignId) {
  return path.join(getCampaignDir(campaignId), 'uploads');
}
function getCampaignSoundsUploadsDir(campaignId) {
  return path.join(getCampaignUploadsDir(campaignId), 'sounds');
}

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function ensureCampaignDirs(campaignId) {
  const dir = getCampaignDir(campaignId);
  const uploads = getCampaignUploadsDir(campaignId);
  const sounds = getCampaignSoundsUploadsDir(campaignId);
  [dir, uploads, sounds].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function readJson(file, defaultVal = []) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch {
    return defaultVal;
  }
}

function writeJson(file, data) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}
function verifyPassword(password, salt, hash) {
  return hashPassword(password, salt) === hash;
}

const viewStore = { lastViewByMapId: {} };
let lastGameClock = { visible: false, hours: 12, minutes: 0, position: { x: 0.5, y: 0.08 } };

// Session en memoria (solo durante esta ejecución; no se restaura al reiniciar la app)
let session = { userId: null, campaignId: null };
function saveSession() {
  try {
    writeJson(SESSION_FILE, session);
  } catch (_) {}
}

function getUsers() {
  ensureDirs();
  return readJson(USERS_FILE, []);
}
function getCampaigns() {
  ensureDirs();
  return readJson(CAMPAIGNS_FILE, []);
}
function getMaps(campaignId) {
  if (!campaignId) return [];
  ensureCampaignDirs(campaignId);
  return readJson(getCampaignMapsFile(campaignId), []);
}
function getSounds(campaignId) {
  if (!campaignId) return [];
  ensureCampaignDirs(campaignId);
  return readJson(getCampaignSoundsFile(campaignId), []);
}
function saveMaps(campaignId, maps) {
  if (!campaignId) return;
  ensureCampaignDirs(campaignId);
  writeJson(getCampaignMapsFile(campaignId), maps);
}
function saveSounds(campaignId, sounds) {
  if (!campaignId) return;
  ensureCampaignDirs(campaignId);
  writeJson(getCampaignSoundsFile(campaignId), sounds);
}
function getNotes(campaignId) {
  if (!campaignId) return { notes: [] };
  ensureCampaignDirs(campaignId);
  const raw = readJson(getCampaignNotesFile(campaignId), { notes: [] });
  if (Array.isArray(raw.notes) && raw.notes.length >= 0) {
    const notes = raw.notes.filter((n) => n && (n.id || n._id) && typeof (n.title ?? n.content) === 'string').map((n) => ({
      id: n.id || n._id,
      title: String(n.title ?? 'Sin título').slice(0, 200),
      content: String(n.content ?? ''),
      createdAt: n.createdAt || new Date().toISOString(),
    }));
    return { notes };
  }
  if (typeof raw === 'object' && raw !== null && 'content' in raw) {
    const content = String(raw.content || '');
    return { notes: [{ id: require('uuid').v4(), title: 'Notas', content, createdAt: new Date().toISOString() }] };
  }
  return { notes: [] };
}
function saveNotes(campaignId, data) {
  if (!campaignId) return;
  ensureCampaignDirs(campaignId);
  const notes = Array.isArray(data && data.notes) ? data.notes : [];
  const normalized = notes.map((n) => ({
    id: n.id || n._id || require('uuid').v4(),
    title: String(n.title ?? 'Sin título').slice(0, 200),
    content: String(n.content ?? ''),
    createdAt: n.createdAt || new Date().toISOString(),
  }));
  writeJson(getCampaignNotesFile(campaignId), { notes: normalized });
}
function getBestiary(campaignId) {
  if (!campaignId) return { bestiary: [] };
  ensureCampaignDirs(campaignId);
  const raw = readJson(getCampaignBestiaryFile(campaignId), { bestiary: [] });
  const list = Array.isArray(raw.bestiary) ? raw.bestiary : [];
  const bestiary = list.filter((b) => b && (b.id || b._id)).map((b) => ({
    id: b.id || b._id,
    name: String(b.name ?? 'Sin nombre').slice(0, 200),
    type: String(b.type ?? '').slice(0, 100),
    description: String(b.description ?? ''),
    stats: String(b.stats ?? ''),
    imageUrl: b.imageUrl && typeof b.imageUrl === 'string' ? b.imageUrl : undefined,
    createdAt: b.createdAt || new Date().toISOString(),
  }));
  return { bestiary };
}
function saveBestiary(campaignId, data) {
  if (!campaignId) return;
  ensureCampaignDirs(campaignId);
  const uploadsDir = getCampaignUploadsDir(campaignId);
  const raw = readJson(getCampaignBestiaryFile(campaignId), { bestiary: [] });
  const oldList = Array.isArray(raw.bestiary) ? raw.bestiary : [];
  const oldIds = new Set((data && data.bestiary && Array.isArray(data.bestiary)) ? data.bestiary.map((b) => b.id || b._id) : []);
  oldList.forEach((b) => {
    const id = b.id || b._id;
    if (id && b.imageUrl && typeof b.imageUrl === 'string' && !oldIds.has(id)) {
      const name = path.basename(b.imageUrl);
      if (name.startsWith('beast-')) {
        const p = path.join(uploadsDir, name);
        if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (_) {}
      }
    }
  });
  const list = Array.isArray(data && data.bestiary) ? data.bestiary : [];
  const bestiary = list.map((b) => ({
    id: b.id || b._id || require('uuid').v4(),
    name: String(b.name ?? 'Sin nombre').slice(0, 200),
    type: String(b.type ?? '').slice(0, 100),
    description: String(b.description ?? ''),
    stats: String(b.stats ?? ''),
    imageUrl: b.imageUrl && typeof b.imageUrl === 'string' ? b.imageUrl : undefined,
    createdAt: b.createdAt || new Date().toISOString(),
  }));
  writeJson(getCampaignBestiaryFile(campaignId), { bestiary });
}

function getTrapTemplates(campaignId) {
  if (!campaignId) return [];
  ensureCampaignDirs(campaignId);
  const list = readJson(getCampaignTrapTemplatesFile(campaignId), []);
  return Array.isArray(list) ? list : [];
}
function saveTrapTemplates(campaignId, templates) {
  if (!campaignId) return;
  ensureCampaignDirs(campaignId);
  writeJson(getCampaignTrapTemplatesFile(campaignId), Array.isArray(templates) ? templates : []);
}

function startServer() {
  const express = require('express');
  const http = require('http');
  const { Server } = require('socket.io');
  const multer = require('multer');
  const { v4: uuidv4 } = require('uuid');

  ensureDirs();

  const uploadMap = multer({
    storage: multer.diskStorage({
      destination: (req, _, cb) => {
        const cid = session.campaignId;
        if (!cid) return cb(new Error('No campaign'));
        ensureCampaignDirs(cid);
        cb(null, getCampaignUploadsDir(cid));
      },
      filename: (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname || '')),
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  });
  const uploadSound = multer({
    storage: multer.diskStorage({
      destination: (req, _, cb) => {
        const cid = session.campaignId;
        if (!cid) return cb(new Error('No campaign'));
        ensureCampaignDirs(cid);
        cb(null, getCampaignSoundsUploadsDir(cid));
      },
      filename: (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname || '')),
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  });
  const uploadBeastImage = multer({
    storage: multer.diskStorage({
      destination: (req, _, cb) => {
        const cid = session.campaignId;
        if (!cid) return cb(new Error('No campaign'));
        ensureCampaignDirs(cid);
        cb(null, getCampaignUploadsDir(cid));
      },
      filename: (req, file, cb) => {
        const id = (req.params && req.params.id) || 'beast';
        const ext = path.extname(file.originalname || '') || '.jpg';
        cb(null, 'beast-' + id + ext);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  });
  const uploadTrapImage = multer({
    storage: multer.diskStorage({
      destination: (req, _, cb) => {
        const cid = session.campaignId;
        if (!cid) return cb(new Error('No campaign'));
        ensureCampaignDirs(cid);
        cb(null, getCampaignUploadsDir(cid));
      },
      filename: (_, file, cb) => {
        const ext = path.extname(file.originalname || '') || '.png';
        cb(null, 'trap-' + require('uuid').v4() + ext);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  const appExpress = express();
  const server = http.createServer(appExpress);
  const io = new Server(server, { cors: { origin: '*' } });

  appExpress.use(require('cors')());
  appExpress.use(express.json({ limit: '50mb' }));
  appExpress.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- TTS (Google Cloud + ElevenLabs) ---
  function readTtsConfig() {
    let data = {};
    try {
      if (fs.existsSync(TTS_CONFIG_FILE)) data = JSON.parse(fs.readFileSync(TTS_CONFIG_FILE, 'utf8'));
    } catch (_) {}
    return data;
  }
  appExpress.get('/api/tts/config', (req, res) => {
    const data = readTtsConfig();
    const google = (data.googleApiKey || '').trim();
    const elevenlabs = (data.elevenlabsApiKey || '').trim();
    res.json({ configured: !!google || !!elevenlabs, googleConfigured: !!google, elevenlabsConfigured: !!elevenlabs });
  });

  appExpress.post('/api/tts/config', (req, res) => {
    const body = req.body || {};
    try {
      ensureDirs();
      const data = readTtsConfig();
      if (body.googleApiKey != null) data.googleApiKey = String(body.googleApiKey).trim();
      if (body.elevenlabsApiKey != null) data.elevenlabsApiKey = String(body.elevenlabsApiKey).trim();
      fs.writeFileSync(TTS_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      return res.status(500).json({ message: 'No se pudo guardar la configuración.' });
    }
    res.json({ ok: true });
  });

  appExpress.post('/api/tts/synthesize', (req, res) => {
    let apiKey = '';
    try {
      if (fs.existsSync(TTS_CONFIG_FILE)) {
        const data = JSON.parse(fs.readFileSync(TTS_CONFIG_FILE, 'utf8'));
        apiKey = (data.googleApiKey || '').trim();
      }
    } catch (_) {}
    if (!apiKey) return res.status(400).json({ message: 'Configura la API key de Google Cloud en Ajustes → Narrador.' });
    const text = (req.body && req.body.text != null) ? String(req.body.text).trim() : '';
    if (!text) return res.status(400).json({ message: 'Texto vacío.' });
    const voiceName = (req.body && req.body.voiceName) ? String(req.body.voiceName) : 'es-AR-Standard-A';
    const languageCode = (req.body && req.body.languageCode) ? String(req.body.languageCode) : (voiceName.match(/^[a-z]{2}-[A-Z]{2}/) ? voiceName.slice(0, 5) : 'es-AR');
    const body = JSON.stringify({
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    });
    const https = require('https');
    const u = new URL('https://texttospeech.googleapis.com/v1/text:synthesize');
    u.searchParams.set('key', apiKey);
    const reqTts = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') },
      },
      (resTts) => {
      let buf = '';
      resTts.setEncoding('utf8');
      resTts.on('data', (chunk) => { buf += chunk; });
      resTts.on('end', () => {
        if (resTts.statusCode !== 200) {
          try {
            const err = JSON.parse(buf);
            return res.status(resTts.statusCode).json({ message: err.error?.message || 'Error en Google TTS.' });
          } catch (_) {}
          return res.status(resTts.statusCode).json({ message: 'Error en Google TTS.' });
        }
        try {
          const data = JSON.parse(buf);
          if (!data.audioContent) return res.status(500).json({ message: 'Respuesta sin audio.' });
          res.json({ audioBase64: data.audioContent });
        } catch (_) {
          res.status(500).json({ message: 'Error al leer la respuesta.' });
        }
      });
    }
    );
    reqTts.on('error', (err) => res.status(502).json({ message: err.message || 'Error de conexión.' }));
    reqTts.write(body);
    reqTts.end();
  });

  appExpress.get('/api/tts/elevenlabs-voices', (req, res) => {
    const data = readTtsConfig();
    const apiKey = (data.elevenlabsApiKey || '').trim();
    if (!apiKey) return res.status(400).json({ message: 'Configura la API key de ElevenLabs.' });
    const https = require('https');
    const opts = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/voices',
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
    };
    const reqV = https.request(opts, (resV) => {
      let buf = '';
      resV.setEncoding('utf8');
      resV.on('data', (chunk) => { buf += chunk; });
      resV.on('end', () => {
        if (resV.statusCode !== 200) {
          try {
            const err = JSON.parse(buf);
            return res.status(resV.statusCode).json({ message: err.detail?.message || err.message || 'Error.' });
          } catch (_) {}
          return res.status(resV.statusCode).json({ message: 'Error al listar voces.' });
        }
        try {
          const data = JSON.parse(buf);
          const voices = (data.voices || []).map((v) => ({ voice_id: v.voice_id, name: v.name || v.voice_id }));
          res.json({ voices });
        } catch (_) {
          res.status(500).json({ message: 'Error al leer voces.' });
        }
      });
    });
    reqV.on('error', (err) => res.status(502).json({ message: err.message || 'Error de conexión.' }));
    reqV.end();
  });

  appExpress.post('/api/tts/synthesize-elevenlabs', (req, res) => {
    const data = readTtsConfig();
    const apiKey = (data.elevenlabsApiKey || '').trim();
    if (!apiKey) return res.status(400).json({ message: 'Configura la API key de ElevenLabs en Ajustes → Narrador.' });
    const text = (req.body && req.body.text != null) ? String(req.body.text).trim() : '';
    if (!text) return res.status(400).json({ message: 'Texto vacío.' });
    const voiceId = (req.body && req.body.voiceId) ? String(req.body.voiceId) : '21m00Tcm4TlvDq8ikWAM';
    const bodyStr = JSON.stringify({ text, model_id: 'eleven_multilingual_v2' });
    const https = require('https');
    const opts = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/text-to-speech/' + encodeURIComponent(voiceId),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        accept: 'audio/mpeg',
        'Content-Length': Buffer.byteLength(bodyStr, 'utf8'),
      },
    };
    const reqEl = https.request(opts, (resEl) => {
      const chunks = [];
      resEl.on('data', (chunk) => chunks.push(chunk));
      resEl.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (resEl.statusCode !== 200) {
          try {
            const err = JSON.parse(buf.toString('utf8'));
            return res.status(resEl.statusCode).json({ message: err.detail?.message || err.message || 'Error ElevenLabs.' });
          } catch (_) {}
          return res.status(resEl.statusCode).json({ message: 'Error ElevenLabs.' });
        }
        res.json({ audioBase64: buf.toString('base64') });
      });
    });
    reqEl.on('error', (err) => res.status(502).json({ message: err.message || 'Error de conexión.' }));
    reqEl.write(bodyStr);
    reqEl.end();
  });

  // Servir archivos de la partida actual
  appExpress.get(/^\/uploads\/(.*)$/, (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(404).end();
    const subpath = (req.params[0] || '').replace(/\.\./g, '');
    const baseDir = path.resolve(getCampaignUploadsDir(cid));
    const filePath = path.resolve(path.join(baseDir, subpath));
    if (!filePath.startsWith(baseDir)) return res.status(403).end();
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return res.status(404).end();
    res.sendFile(filePath);
  });

  // --- Auth ---
  appExpress.post('/api/auth/register', (req, res) => {
    const username = (req.body && req.body.username) ? String(req.body.username).trim() : '';
    if (!username || username.length < 2) {
      return res.status(400).json({ message: 'Usuario mínimo 2 caracteres.' });
    }
    const users = getUsers();
    const lower = username.toLowerCase();
    if (users.some((u) => (u.usernameLower || u.username?.toLowerCase()) === lower)) {
      return res.status(400).json({ message: 'Ese usuario ya existe.' });
    }
    const user = {
      id: uuidv4(),
      _id: uuidv4(),
      username,
      usernameLower: lower,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeJson(USERS_FILE, users);
    session.userId = user.id;
    session.campaignId = null;
    saveSession();
    res.status(201).json({ id: user.id, username: user.username });
  });

  appExpress.post('/api/auth/login', (req, res) => {
    const username = (req.body && req.body.username) ? String(req.body.username).trim() : '';
    if (!username) return res.status(400).json({ message: 'Usuario requerido.' });
    const users = getUsers();
    const lower = username.toLowerCase();
    const user = users.find((u) => (u.usernameLower || u.username?.toLowerCase()) === lower);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    session.userId = user.id;
    session.campaignId = null;
    saveSession();
    res.json({ id: user.id, username: user.username });
  });

  appExpress.post('/api/auth/logout', (req, res) => {
    session = { userId: null, campaignId: null };
    saveSession();
    res.json({ message: 'Sesión cerrada' });
  });

  appExpress.get('/api/auth/me', (req, res) => {
    if (!session.userId) return res.status(401).json({ message: 'No hay sesión' });
    const users = getUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user) {
      session = { userId: null, campaignId: null };
      saveSession();
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }
    res.json({ id: user.id, username: user.username });
  });

  appExpress.get('/api/users', (req, res) => {
    const users = getUsers();
    const resolveUserId = (u) => u.id || u._id;
    res.json(users.map((u) => ({ id: resolveUserId(u), username: u.username })).sort((a, b) => (a.username || '').localeCompare(b.username || '')));
  });

  function doDeleteUser(userId) {
    if (!userId || typeof userId !== 'string') return { status: 400, message: 'Id de usuario requerido' };
    userId = userId.trim();
    try {
      userId = decodeURIComponent(userId);
    } catch (_) {}
    const users = getUsers();
    const resolveUserId = (u) => u.id || u._id;
    const idx = users.findIndex((u) => resolveUserId(u) === userId);
    if (idx === -1) return { status: 404, message: 'Usuario no encontrado' };
    const deletedUser = users[idx];
    const resolvedUserId = resolveUserId(deletedUser);
    users.splice(idx, 1);
    writeJson(USERS_FILE, users);
    const campaigns = getCampaigns();
    const toDelete = campaigns.filter((c) => c.gmUserId === userId || c.gmUserId === resolvedUserId);
    toDelete.forEach((c) => {
      const cid = c.id || c._id;
      const dir = getCampaignDir(cid);
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true });
        } catch (_) {}
      }
    });
    const newCampaigns = campaigns.filter((c) => c.gmUserId !== userId && c.gmUserId !== resolvedUserId);
    writeJson(CAMPAIGNS_FILE, newCampaigns);
    if (session.userId === userId || session.userId === resolvedUserId) {
      session = { userId: null, campaignId: null };
      saveSession();
    }
    return { status: 200 };
  }

  appExpress.post('/api/users/delete', (req, res) => {
    const userId = (req.body && req.body.userId != null) ? String(req.body.userId).trim() : '';
    const result = doDeleteUser(userId);
    if (result.status !== 200) return res.status(result.status).json({ message: result.message });
    res.json({ ok: true });
  });

  appExpress.delete('/api/users/:id', (req, res) => {
    const result = doDeleteUser(req.params.id);
    if (result.status !== 200) return res.status(result.status).json({ message: result.message });
    res.json({ ok: true });
  });

  // --- Partidas (campaigns) ---
  appExpress.get('/api/campaigns', (req, res) => {
    if (!session.userId) return res.status(401).json({ message: 'Debes iniciar sesión' });
    const campaigns = getCampaigns().filter((c) => c.gmUserId === session.userId);
    res.json(campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });

  appExpress.post('/api/campaigns', (req, res) => {
    if (!session.userId) return res.status(401).json({ message: 'Debes iniciar sesión' });
    const name = (req.body && req.body.name) ? req.body.name.trim() : 'Nueva partida';
    const campaigns = getCampaigns();
    const campaign = {
      id: uuidv4(),
      _id: uuidv4(),
      name: name || 'Nueva partida',
      gmUserId: session.userId,
      createdAt: new Date().toISOString(),
    };
    campaigns.push(campaign);
    writeJson(CAMPAIGNS_FILE, campaigns);
    ensureCampaignDirs(campaign.id);
    session.campaignId = campaign.id;
    saveSession();
    res.status(201).json(campaign);
  });

  appExpress.delete('/api/campaigns/:id', (req, res) => {
    if (!session.userId) return res.status(401).json({ message: 'Debes iniciar sesión' });
    const campaignId = (req.params.id || '').trim();
    if (!campaignId) return res.status(400).json({ message: 'Id de partida requerido' });
    const campaigns = getCampaigns();
    const resolveId = (c) => c.id || c._id;
    const idx = campaigns.findIndex((c) => resolveId(c) === campaignId && c.gmUserId === session.userId);
    if (idx === -1) {
      const byId = campaigns.findIndex((c) => resolveId(c) === campaignId);
      if (byId !== -1) return res.status(403).json({ message: 'No puedes eliminar una partida de otro usuario' });
      return res.status(404).json({ message: 'Partida no encontrada' });
    }
    const deleted = campaigns[idx];
    const deletedId = resolveId(deleted);
    campaigns.splice(idx, 1);
    writeJson(CAMPAIGNS_FILE, campaigns);
    if (session.campaignId === campaignId || session.campaignId === deletedId) {
      session.campaignId = null;
      saveSession();
    }
    const dir = getCampaignDir(deletedId);
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true });
      } catch (_) {}
    }
    res.json({ ok: true });
  });

  // --- Exportar partida (archivo .hexara: POST con campaignId en body para evitar 404 por ruta) ---
  function handleExportCampaign(req, res) {
    if (!session.userId) return res.status(401).json({ message: 'Debes iniciar sesión' });
    let campaignId = (req.body && req.body.campaignId != null ? String(req.body.campaignId) : req.params.id || '').trim();
    try {
      campaignId = decodeURIComponent(campaignId);
    } catch (_) {}
    if (!campaignId) return res.status(400).json({ message: 'campaignId requerido' });
    const campaigns = getCampaigns();
    const resolveId = (c) => (c && (c.id || c._id)) || '';
    const camp = campaigns.find((c) => {
      const rid = resolveId(c);
      return rid === campaignId && c.gmUserId === session.userId;
    });
    if (!camp) {
      const byIdOnly = campaigns.find((c) => resolveId(c) === campaignId);
      if (byIdOnly) return res.status(403).json({ message: 'No puedes exportar una partida de otro usuario' });
      return res.status(404).json({ message: 'Partida no encontrada' });
    }
    const cid = resolveId(camp);
    const campaignName = camp.name || 'Partida exportada';
    const maps = getMaps(cid);
    const sounds = getSounds(cid);
    const uploadsDir = getCampaignUploadsDir(cid);
    const soundsUploadsDir = getCampaignSoundsUploadsDir(cid);
    const files = {};
    function addFile(relPath, absPath) {
      if (!fs.existsSync(absPath)) return;
      try {
        const buf = fs.readFileSync(absPath);
        files[relPath] = buf.toString('base64');
      } catch (_) {}
    }
    maps.forEach((m) => {
      if (m.url && m.url.startsWith('/uploads/')) {
        const name = path.basename(m.url);
        if (m.url.startsWith('/uploads/sounds/')) addFile('sounds/' + name, path.join(soundsUploadsDir, name));
        else addFile(name, path.join(uploadsDir, name));
      }
    });
    sounds.forEach((s) => {
      if (s.url && s.url.startsWith('/uploads/sounds/')) {
        const name = path.basename(s.url);
        addFile('sounds/' + name, path.join(soundsUploadsDir, name));
      }
    });
    const bestiaryData = getBestiary(cid);
    (bestiaryData.bestiary || []).forEach((b) => {
      if (b.imageUrl && typeof b.imageUrl === 'string' && b.imageUrl.startsWith('/uploads/')) {
        const name = path.basename(b.imageUrl);
        if (!name.startsWith('..')) addFile(name, path.join(uploadsDir, name));
      }
    });
    (maps || []).forEach((m) => {
      (m.traps || []).forEach((t) => {
        if (t.imageUrl && typeof t.imageUrl === 'string' && t.imageUrl.startsWith('/uploads/')) {
          const name = path.basename(t.imageUrl);
          if (!name.startsWith('..')) addFile(name, path.join(uploadsDir, name));
        }
      });
    });
    const trapTemplates = getTrapTemplates(cid);
    trapTemplates.forEach((t) => {
      if (t.imageUrl && typeof t.imageUrl === 'string' && t.imageUrl.startsWith('/uploads/')) {
        const name = path.basename(t.imageUrl);
        if (!name.startsWith('..')) addFile(name, path.join(uploadsDir, name));
      }
    });
    const notes = getNotes(cid);
    const bestiary = bestiaryData;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      campaignName,
      maps,
      sounds,
      notes,
      bestiary,
      trapTemplates,
      files,
    };
    const filename = `partida-${campaignName.replace(/[^a-zA-Z0-9-_]/g, '_')}.hexara`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(Buffer.from(JSON.stringify(payload), 'utf8'));
  }
  appExpress.post('/api/campaigns/export', (req, res) => {
    if (!req.is('application/json')) return res.status(400).json({ message: 'Content-Type application/json requerido' });
    handleExportCampaign(req, res);
  });
  appExpress.get('/api/campaigns/:id/export', handleExportCampaign);

  const uploadImport = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 },
  });

  appExpress.post('/api/campaigns/import', uploadImport.single('file'), (req, res) => {
    if (!session.userId) return res.status(401).json({ message: 'Debes iniciar sesión' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'Envía un archivo .hexara' });
    let data;
    try {
      data = JSON.parse(req.file.buffer.toString('utf8'));
    } catch {
      return res.status(400).json({ message: 'Archivo no válido. Debe ser un exportado de Hexara (.hexara).' });
    }
    if (!data.version || !data.campaignName || !Array.isArray(data.maps) || !Array.isArray(data.sounds) || typeof data.files !== 'object') {
      return res.status(400).json({ message: 'Formato de archivo incorrecto.' });
    }
    let notesData = { notes: [] };
    if (data.notes != null && typeof data.notes === 'object' && Array.isArray(data.notes.notes)) {
      notesData = { notes: data.notes.notes };
    } else if (data.notes != null && typeof data.notes === 'object' && 'content' in data.notes) {
      notesData = { notes: [{ id: require('uuid').v4(), title: 'Notas', content: String(data.notes.content || ''), createdAt: new Date().toISOString() }] };
    }
    const campaign = {
      id: uuidv4(),
      _id: uuidv4(),
      name: (data.campaignName || 'Partida importada').trim().slice(0, 200),
      gmUserId: session.userId,
      createdAt: new Date().toISOString(),
    };
    const campaigns = getCampaigns();
    campaigns.unshift(campaign);
    writeJson(CAMPAIGNS_FILE, campaigns);
    ensureCampaignDirs(campaign.id);
    const uploadsDir = getCampaignUploadsDir(campaign.id);
    // Restaurar todos los medios (imágenes, vídeos, sonidos, trampas, bestiario) en uploads y uploads/sounds
    if (data.files && typeof data.files === 'object') {
      Object.keys(data.files).forEach((relPath) => {
        const base64 = data.files[relPath];
        if (!base64 || typeof base64 !== 'string') return;
        const safePath = relPath.replace(/\.\./g, '');
        const targetPath = path.join(uploadsDir, safePath);
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        try {
          fs.writeFileSync(targetPath, Buffer.from(base64, 'base64'));
        } catch (_) {}
      });
    }
    saveMaps(campaign.id, data.maps || []);
    saveSounds(campaign.id, data.sounds || []);
    saveNotes(campaign.id, notesData);
    const bestiaryData = data.bestiary != null && typeof data.bestiary === 'object' && Array.isArray(data.bestiary.bestiary)
      ? { bestiary: data.bestiary.bestiary }
      : { bestiary: [] };
    saveBestiary(campaign.id, bestiaryData);
    const trapTemplatesData = Array.isArray(data.trapTemplates) ? data.trapTemplates : [];
    saveTrapTemplates(campaign.id, trapTemplatesData);
    session.campaignId = campaign.id;
    saveSession();
    res.status(201).json(campaign);
  });

  appExpress.post('/api/session', (req, res) => {
    if (!session.userId) return res.status(401).json({ message: 'Debes iniciar sesión' });
    const { campaignId } = req.body || {};
    if (!campaignId) {
      session.campaignId = null;
      saveSession();
      return res.json({ userId: session.userId, campaignId: null, campaign: null });
    }
    const campaigns = getCampaigns();
    const campaign = campaigns.find((c) => (c.id === campaignId || c._id === campaignId) && c.gmUserId === session.userId);
    if (!campaign) return res.status(404).json({ message: 'Partida no encontrada' });
    session.campaignId = campaign.id;
    saveSession();
    res.json({ userId: session.userId, campaignId: campaign.id, campaign });
  });

  appExpress.get('/api/session', (req, res) => {
    if (!session.userId) return res.json({ userId: null, campaignId: null, campaign: null });
    const users = getUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user) return res.json({ userId: null, campaignId: null, campaign: null });
    let campaign = null;
    if (session.campaignId) {
      const campaigns = getCampaigns();
      campaign = campaigns.find((c) => (c.id === session.campaignId || c._id === session.campaignId) && c.gmUserId === session.userId) || null;
    }
    res.json({ userId: session.userId, user: { id: user.id, username: user.username }, campaignId: session.campaignId, campaign });
  });

  // --- Notas de partida (solo GM, requieren partida seleccionada) ---
  appExpress.get('/api/notes', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    res.json(getNotes(cid));
  });
  appExpress.patch('/api/notes', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const notes = req.body && Array.isArray(req.body.notes) ? req.body.notes : [];
    saveNotes(cid, { notes });
    res.json(getNotes(cid));
  });

  // --- Bestiario (solo GM, requieren partida seleccionada) ---
  appExpress.get('/api/bestiary', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    res.json(getBestiary(cid));
  });
  appExpress.patch('/api/bestiary', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const bestiary = req.body && Array.isArray(req.body.bestiary) ? req.body.bestiary : [];
    saveBestiary(cid, { bestiary });
    res.json(getBestiary(cid));
  });
  appExpress.post('/api/bestiary/:id/image', uploadBeastImage.single('file'), (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const beastId = (req.params && req.params.id) || '';
    if (!beastId) return res.status(400).json({ message: 'Id de bestia requerido' });
    if (!req.file || !req.file.path) return res.status(400).json({ message: 'Envía una imagen' });
    const ext = path.extname(req.file.originalname || '') || '.jpg';
    const imageUrl = '/uploads/beast-' + beastId + ext;
    const current = getBestiary(cid);
    const bestiary = (current.bestiary || []).map((b) => (b.id === beastId || b._id === beastId) ? { ...b, imageUrl } : b);
    saveBestiary(cid, { bestiary });
    res.json(getBestiary(cid));
  });
  appExpress.post('/api/campaigns/trap-image', uploadTrapImage.single('file'), (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    if (!req.file || !req.file.path) return res.status(400).json({ message: 'Envía una imagen' });
    const url = '/uploads/' + path.basename(req.file.path);
    res.json({ url });
  });

  appExpress.get('/api/trap-templates', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    res.json(getTrapTemplates(cid));
  });
  appExpress.post('/api/trap-templates', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const name = (req.body && req.body.name != null) ? String(req.body.name).trim().slice(0, 200) : 'Trampa';
    const imageUrl = (req.body && req.body.imageUrl != null) ? String(req.body.imageUrl) : undefined;
    const templates = getTrapTemplates(cid);
    const newT = { id: uuidv4(), _id: uuidv4(), name: name || 'Trampa', imageUrl: imageUrl || undefined };
    templates.push(newT);
    saveTrapTemplates(cid, templates);
    res.status(201).json(newT);
  });
  appExpress.delete('/api/trap-templates/:id', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const id = req.params && req.params.id;
    if (!id) return res.status(400).json({ message: 'Id requerido' });
    const templates = getTrapTemplates(cid).filter((t) => (t.id || t._id) !== id);
    saveTrapTemplates(cid, templates);
    res.json({ ok: true });
  });

  appExpress.delete('/api/bestiary/:id/image', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const beastId = (req.params && req.params.id) || '';
    if (!beastId) return res.status(400).json({ message: 'Id de bestia requerido' });
    const current = getBestiary(cid);
    const beast = (current.bestiary || []).find((b) => b.id === beastId || b._id === beastId);
    if (beast && beast.imageUrl) {
      const uploadsDir = getCampaignUploadsDir(cid);
      const name = path.basename(beast.imageUrl);
      if (name.startsWith('beast-')) {
        const p = path.join(uploadsDir, name);
        if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (_) {}
      }
    }
    const bestiary = (current.bestiary || []).map((b) => (b.id === beastId || b._id === beastId) ? { ...b, imageUrl: undefined } : b);
    saveBestiary(cid, { bestiary });
    res.json(getBestiary(cid));
  });

  // --- Maps (requieren partida seleccionada) ---
  appExpress.get('/api/maps', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.json([]);
    const maps = getMaps(cid).map((m) => {
      const out = { ...m };
      const key = `${cid}-${m.id || m._id}`;
      if (viewStore.lastViewByMapId[key]) out.viewState = viewStore.lastViewByMapId[key];
      return out;
    });
    res.json(maps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });

  appExpress.get('/api/maps/active', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(404).json({ message: 'No active map' });
    const maps = getMaps(cid);
    const map = maps.find((m) => m.isActive);
    if (!map) return res.status(404).json({ message: 'No active map' });
    const out = { ...map };
    const key = `${cid}-${map.id || map._id}`;
    if (viewStore.lastViewByMapId[key]) out.viewState = viewStore.lastViewByMapId[key];
    res.json(out);
  });

  appExpress.post('/api/maps', uploadMap.single('file'), (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const maps = getMaps(cid);
    const url = req.file ? `/uploads/${path.basename(req.file.path)}` : req.body.url || '';
    const name = req.body.name || 'Map';
    const type = req.body.type || 'image';
    const newMap = {
      id: uuidv4(),
      _id: uuidv4(),
      name,
      type,
      url,
      fowInfo: [],
      traps: [],
      isActive: maps.length === 0,
      createdAt: new Date().toISOString(),
    };
    maps.unshift(newMap);
    saveMaps(cid, maps);
    res.status(201).json(newMap);
  });

  appExpress.put('/api/maps/:id/fow', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const maps = getMaps(cid);
    const idx = maps.findIndex((m) => m.id === req.params.id || m._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Map not found' });
    maps[idx].fowInfo = req.body.fowInfo || [];
    saveMaps(cid, maps);
    res.json(maps[idx]);
  });

  appExpress.put('/api/maps/:id/traps', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const maps = getMaps(cid);
    const idx = maps.findIndex((m) => m.id === req.params.id || m._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Map not found' });
    const traps = Array.isArray(req.body.traps) ? req.body.traps : [];
    maps[idx].traps = traps.map((t) => {
      const w = typeof t.width === 'number' ? Math.max(0.02, Math.min(0.5, t.width)) : 0.05;
      const h = typeof t.height === 'number' ? Math.max(0.02, Math.min(0.5, t.height)) : 0.05;
      const imageUrl = typeof t.imageUrl === 'string' && t.imageUrl.trim() ? String(t.imageUrl).trim().slice(0, 500) : undefined;
      return {
        id: t.id || require('uuid').v4(),
        x: typeof t.x === 'number' ? Math.max(0, Math.min(1, t.x)) : 0,
        y: typeof t.y === 'number' ? Math.max(0, Math.min(1, t.y)) : 0,
        width: w,
        height: h,
        name: String(t.name ?? 'Trampa').slice(0, 100),
        activated: !!t.activated,
        ...(imageUrl ? { imageUrl } : {}),
      };
    });
    saveMaps(cid, maps);
    res.json(maps[idx]);
  });

  appExpress.put('/api/maps/:id/activate', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const maps = getMaps(cid);
    maps.forEach((m) => (m.isActive = false));
    const idx = maps.findIndex((m) => m.id === req.params.id || m._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Map not found' });
    maps[idx].isActive = true;
    saveMaps(cid, maps);
    res.json(maps[idx]);
  });

  appExpress.delete('/api/maps/:id', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const maps = getMaps(cid);
    const id = req.params.id;
    const map = maps.find((m) => m.id === id || m._id === id);
    if (!map) return res.status(404).json({ message: 'Map not found' });
    const uploadsDir = getCampaignUploadsDir(cid);
    if (map.url && map.url.startsWith('/uploads/')) {
      const filePath = path.join(uploadsDir, path.basename(map.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    saveMaps(cid, maps.filter((m) => m.id !== id && m._id !== id));
    res.json({ message: 'Map deleted' });
  });

  appExpress.patch('/api/maps/:id', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const maps = getMaps(cid);
    const idx = maps.findIndex((m) => m.id === req.params.id || m._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Map not found' });
    if (req.body.name != null) maps[idx].name = String(req.body.name).trim().slice(0, 200);
    if (typeof req.body.mirrorForProjection === 'boolean') maps[idx].mirrorForProjection = req.body.mirrorForProjection;
    saveMaps(cid, maps);
    res.json(maps[idx]);
  });

  // --- Sounds ---
  appExpress.get('/api/sounds', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.json([]);
    const sounds = getSounds(cid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sounds);
  });

  appExpress.post('/api/sounds', uploadSound.single('file'), (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const sounds = getSounds(cid);
    const newSound = {
      id: uuidv4(),
      _id: uuidv4(),
      name: req.body.name || path.basename(req.file.originalname, path.extname(req.file.originalname)),
      url: `/uploads/sounds/${path.basename(req.file.path)}`,
      category: req.body.category || 'ambient',
      createdAt: new Date().toISOString(),
    };
    sounds.unshift(newSound);
    saveSounds(cid, sounds);
    res.status(201).json(newSound);
  });

  appExpress.delete('/api/sounds/:id', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const sounds = getSounds(cid);
    const s = sounds.find((x) => x.id === req.params.id || x._id === req.params.id);
    if (!s) return res.status(404).json({ message: 'Not found' });
    const filePath = path.join(getCampaignSoundsUploadsDir(cid), path.basename(s.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    saveSounds(cid, sounds.filter((x) => x.id !== req.params.id && x._id !== req.params.id));
    res.json({ message: 'Deleted' });
  });

  appExpress.patch('/api/sounds/:id', (req, res) => {
    const cid = session.campaignId;
    if (!cid) return res.status(403).json({ message: 'Selecciona una partida' });
    const sounds = getSounds(cid);
    const idx = sounds.findIndex((x) => x.id === req.params.id || x._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Not found' });
    if (req.body.name) sounds[idx].name = req.body.name;
    if (req.body.category) sounds[idx].category = req.body.category;
    saveSounds(cid, sounds);
    res.json(sounds[idx]);
  });

  io.on('connection', (socket) => {
    socket.on('join-game', (role) => {});
    socket.on('fow-update', (data) => socket.broadcast.emit('fow-update', data));
    socket.on('trap-update', (data) => socket.broadcast.emit('trap-update', data));
    socket.on('map-change', (mapId) => {
      let payload = { mapId };
      const cid = session.campaignId;
      if (cid) {
        const maps = getMaps(cid);
        const map = maps.find((m) => m.isActive);
        if (map) {
          const out = { ...map };
          const key = `${cid}-${map.id || map._id}`;
          if (viewStore.lastViewByMapId[key]) out.viewState = viewStore.lastViewByMapId[key];
          payload.activeMap = out;
        }
      }
      io.emit('map-change', payload);
    });
    socket.on('map-view-update', (data) => {
      if (data.mapId && session.campaignId) {
        const key = `${session.campaignId}-${data.mapId}`;
        viewStore.lastViewByMapId[key] = {
          scale: data.scale,
          position: data.position,
          containerWidth: data.containerWidth,
          containerHeight: data.containerHeight,
        };
      }
      socket.broadcast.emit('map-view-update', data);
    });
    socket.on('sound-play', (data) => socket.broadcast.emit('sound-play', data));
    socket.on('sound-stop', (data) => socket.broadcast.emit('sound-stop', data));
    socket.on('sound-pause', (data) => socket.broadcast.emit('sound-pause', data));
    socket.on('sound-resume', (data) => socket.broadcast.emit('sound-resume', data));
    socket.on('volume-update', (data) => socket.broadcast.emit('volume-update', data));
    socket.on('voice-start', () => socket.broadcast.emit('voice-start'));
    socket.on('voice-data', (data) => socket.broadcast.emit('voice-data', data));
    socket.on('voice-stop', () => socket.broadcast.emit('voice-stop'));
    socket.on('game-clock-update', (data) => {
      const pos = data.position && typeof data.position.x === 'number' && typeof data.position.y === 'number'
        ? { x: Math.max(0, Math.min(1, data.position.x)), y: Math.max(0, Math.min(1, data.position.y)) }
        : lastGameClock.position || { x: 0.5, y: 0.08 };
      lastGameClock = {
        visible: !!data.visible,
        hours: typeof data.hours === 'number' ? Math.max(0, Math.min(23, Math.floor(data.hours))) : 12,
        minutes: typeof data.minutes === 'number' ? Math.max(0, Math.min(59, Math.floor(data.minutes))) : 0,
        position: pos,
      };
      socket.broadcast.emit('game-clock-update', lastGameClock);
    });
    socket.on('game-clock-request', () => socket.emit('game-clock-state', lastGameClock));
  });

  const PORT = 29542;
  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log('Server running on port', PORT);
      resolve(PORT);
    });
  });
}

module.exports = { startServer };
