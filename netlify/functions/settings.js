const mongoose = require('mongoose');

let cachedDb = null;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ayyappanAdmin:AyyappaSeva2026!@smartdine.knw2tcw.mongodb.net/ayyappanTemple?retryWrites=true&w=majority';

// ── Full Settings Schema — stores all app configuration ──
const settingSchema = new mongoose.Schema({
  key:            { type: String, required: true, unique: true },
  // Theme & Colors
  theme:          { type: String, default: 'divine-gold' },
  colorBg:        { type: String },
  colorPrimary:   { type: String },
  colorText:      { type: String },
  overlayColor:   { type: String },
  overlayOpacity: { type: Number, default: 0 },
  // Background Image
  bgUrl:          { type: String },   // cloud/data URL for background image
  fileName:       { type: String },   // original filename
  bgOpacity:      { type: Number, default: 8 },
  bgSize:         { type: Number, default: 500 },
  // Card
  cardOpacity:    { type: Number, default: 88 },
  // Payment Config
  upiId:          { type: String },
  merchantName:   { type: String },
  // Dynamic Services List
  services: [{
    id:           { type: String },
    name:         { type: String },
    price:        { type: Number },
    icon:         { type: String },   // Emoji or base64 logo
    details:      { type: String }
  }]
}, { timestamps: true });

async function connectToDb() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  await mongoose.connect(MONGO_URI);
  cachedDb = mongoose.connection;
  return cachedDb;
}

function getSettingModel() {
  return mongoose.models.Setting || mongoose.model('Setting', settingSchema);
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const pathParts = event.path.split('/');
  const key = pathParts[pathParts.length - 1];

  if (!key || key === 'settings') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Setting key required' }) };
  }

  try {
    await connectToDb();
    const Setting = getSettingModel();

    // ── GET: Load settings from MongoDB ──
    if (event.httpMethod === 'GET') {
      const setting = await Setting.findOne({ key }).lean();
      if (!setting) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Setting not found' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify(setting) };
    }

    // ── PUT: Save/Update settings in MongoDB ──
    if (event.httpMethod === 'PUT') {
      const data = JSON.parse(event.body);
      const setting = await Setting.findOneAndUpdate(
        { key },
        { $set: { ...data, key } },
        { upsert: true, new: true, lean: true }
      );
      return { statusCode: 200, headers, body: JSON.stringify(setting) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('Settings error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
