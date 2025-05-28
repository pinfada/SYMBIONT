const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { logAccess } = require('./src/core/securityMonitor');

const app = express();
const PORT = process.env.PORT || 8090;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'symbiont';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'symbiont-admin';

app.use(cors());
app.use(express.json());

let db, rituals;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcastRitualUpdate(type, ritual) {
  const msg = JSON.stringify({ type, ritual });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

// Connexion MongoDB
MongoClient.connect(MONGO_URL).then(client => {
  db = client.db(DB_NAME);
  rituals = db.collection('rituals');
  server.listen(PORT, () => console.log('Admin CRUD SYMBIONT sur le port', PORT));
});

function requireAdminKey(req, res, next) {
  const key = req.headers['x-api-key'];
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (key !== ADMIN_API_KEY) {
    logAccess(ip, req.originalUrl, 403);
    return res.status(403).json({ error: 'Clé API admin requise.' });
  }
  logAccess(ip, req.originalUrl, 200);
  next();
}

// Protéger toutes les routes admin
app.use('/api/admin/rituals', requireAdminKey);

// Lister tous les rituels
app.get('/api/admin/rituals', async (req, res) => {
  const all = await rituals.find().toArray();
  res.json(all);
});

// Ajouter un rituel
app.post('/api/admin/rituals', async (req, res) => {
  const ritual = req.body;
  if (!ritual._id || !ritual.type) return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  await rituals.insertOne(ritual);
  broadcastRitualUpdate('created', ritual);
  res.json({ ok: true });
});

// Modifier un rituel
app.put('/api/admin/rituals/:id', async (req, res) => {
  const id = req.params.id;
  const ritual = req.body;
  await rituals.updateOne({ _id: id }, { $set: ritual });
  broadcastRitualUpdate('updated', { _id: id, ...ritual });
  res.json({ ok: true });
});

// Supprimer un rituel
app.delete('/api/admin/rituals/:id', async (req, res) => {
  const id = req.params.id;
  await rituals.deleteOne({ _id: id });
  broadcastRitualUpdate('deleted', { _id: id });
  res.json({ ok: true });
});

// Suppression RGPD de tous les rituels liés à un userId
app.delete('/api/admin/rgpd/:userId', requireAdminKey, async (req, res) => {
  const userId = req.params.userId;
  const result = await rituals.deleteMany({ $or: [ { userId }, { initiatorId: userId }, { receiverId: userId }, { participants: userId } ] });
  broadcastRitualUpdate('rgpd_deleted', { userId, deleted: result.deletedCount });
  res.json({ ok: true, deleted: result.deletedCount });
}); 