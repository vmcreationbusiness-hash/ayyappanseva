const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ── MongoDB Connection ──
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ayyappanAdmin:AyyappaSeva2026!@smartdine.knw2tcw.mongodb.net/ayyappanTemple?retryWrites=true&w=majority';

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000,
      maxPoolSize: 5, // perfect for 500 tx/day free tier
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB Atlas - Free Tier Optimized');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
  }
}

// ── Mongoose Schema & Model ──
const orderSchema = new mongoose.Schema({
  invoiceNo:     { type: String, required: true, unique: true },
  date:          { type: String },
  dateRaw:       { type: String },
  language:      { type: String },
  items: [{
    service:     { type: String },
    serviceName: { type: String },
    serviceIcon: { type: String },
    name:        { type: String },
    star:        { type: String },
    price:       { type: Number }
  }],
  totalAmount:   { type: Number, default: 0 },
  itemCount:     { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'pending' }
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

const settingSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true },
  url:          { type: String },
  fileName:     { type: String },
  upiId:        { type: String },
  merchantName: { type: String },
  services:     { type: Array, default: [] },
  voiceEngine:  { type: String },
  sarvamKey:    { type: String },
  googleKey:    { type: String },
  openaiKey:    { type: String },
  reverieKey:   { type: String },
  reverieAppId: { type: String },
  sarvamVoice:  { type: String },
  openaiVoice:  { type: String },
  googleVoice:  { type: String }
}, { timestamps: true });

const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── API ROUTES — ORDERS ──

// Create Order
app.post('/api/orders', async (req, res) => {
  try {
    await connectDB();
    const order = new Order(req.body);
    const saved = await order.save();
    res.status(201).json({ id: saved._id, message: 'Order saved successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Order with this invoice number already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get All Orders
app.get('/api/orders', async (req, res) => {
  try {
    await connectDB();
    const limitCount = parseInt(req.query.limit) || 50;
    const orders = await Order.find().sort({ createdAt: -1 }).limit(limitCount).lean();
    const mapped = orders.map(o => ({ ...o, id: o._id.toString() }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Order
app.get('/api/orders/:id', async (req, res) => {
  try {
    await connectDB();
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ ...order, id: order._id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Order
app.patch('/api/orders/:id', async (req, res) => {
  try {
    await connectDB();
    const updated = await Order.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, lean: true });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json({ ...updated, id: updated._id.toString(), message: 'Order updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    await connectDB();
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── API ROUTES — SETTINGS ──

// Save/Update a setting (uses $set for proper field merging)
app.put('/api/settings/:key', async (req, res) => {
  try {
    await connectDB();
    console.log(`📝 Settings PUT for key="${req.params.key}":`, JSON.stringify(req.body, null, 2));

    const updateData = {
      key: req.params.key,
      upiId: req.body.upiId,
      merchantName: req.body.merchantName,
      services: req.body.services,
      voiceEngine: req.body.voiceEngine,
      sarvamKey: req.body.sarvamKey,
      googleKey: req.body.googleKey,
      openaiKey: req.body.openaiKey,
      reverieKey: req.body.reverieKey,
      reverieAppId: req.body.reverieAppId,
      sarvamVoice: req.body.sarvamVoice,
      openaiVoice: req.body.openaiVoice,
      googleVoice: req.body.googleVoice
    };

    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { $set: updateData },
      { upsert: true, new: true, lean: true }
    );
    console.log('✅ Settings saved to MongoDB:', setting);
    res.json(setting);
  } catch (error) {
    console.error('❌ Settings save error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get a setting (returns empty defaults on 404 instead of error)
app.get('/api/settings/:key', async (req, res) => {
  try {
    await connectDB();
    const setting = await Setting.findOne({ key: req.params.key }).lean();
    if (!setting) {
      // Return empty defaults so the frontend can still populate fields
      return res.json({
        key: req.params.key,
        upiId: '',
        merchantName: '',
        services: [],
        voiceEngine: 'web',
        sarvamKey: '',
        googleKey: '',
        openaiKey: '',
        reverieKey: '',
        reverieAppId: '',
        sarvamVoice: 'arya',
        openaiVoice: 'alloy',
        googleVoice: 'en-IN-Wavenet-A'
      });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── HEALTH CHECK ──
app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
  } catch (e) {}
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({ status: 'ok', database: states[dbState] || 'unknown', timestamp: new Date().toISOString() });
});

const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const upload = multer();

// ── Proxy for Sarvam AI (STT) ──
app.post(['/api/proxy/sarvam-stt', '/proxy/sarvam-stt', '/api/proxy/sarvam-stt-v1'], upload.single('file'), async (req, res) => {
  try {
    const { model, language_code, apiKey } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const form = new FormData();
    // Using a generic but safe wav filename as Sarvam likes wav containers best for v1
    form.append('file', req.file.buffer, {
      filename: 'speech_audio.wav',
      contentType: req.file.mimetype || 'audio/wav'
    });
    form.append('model', model || 'saaras:v1');
    form.append('language_code', language_code || 'en-IN');

    const response = await axios.post('https://api.sarvam.ai/speech-to-text', form, {
      headers: {
        ...form.getHeaders(),
        'api-subscription-key': apiKey || ''
      }
    });

    res.json(response.data);
  } catch (error) {
    const errorData = error.response?.data || {};
    const errorCode = error.response?.status || 500;
    console.error('Sarvam Error 400 Connection Rejected:', errorData);
    res.status(errorCode).json({ 
      error: errorData.error || errorData.message || error.message,
      details: errorData 
    });
  }
});

module.exports = app;
