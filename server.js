const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MongoDB Connection ──
// Replace the connection string below with your MongoDB Atlas URI or local MongoDB URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ayyappanAdmin:AyyappaSeva2026!@smartdine.knw2tcw.mongodb.net/ayyappanTemple?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB successfully!'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

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
}, {
  timestamps: true  // Adds createdAt & updatedAt automatically
});

const Order = mongoose.model('Order', orderSchema);

// ── Settings Schema (for background images, etc.) ──
const settingSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  url:       { type: String },
  fileName:  { type: String }
}, {
  timestamps: true
});

const Setting = mongoose.model('Setting', settingSchema);

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ═══════════════════════════════════════════════════════════
//  API ROUTES — ORDERS
// ═══════════════════════════════════════════════════════════

// Create Order
app.post('/api/orders', async (req, res) => {
  try {
    const order = new Order(req.body);
    const saved = await order.save();
    console.log('📋 Order saved:', saved.invoiceNo);
    res.status(201).json({ id: saved._id, message: 'Order saved successfully' });
  } catch (error) {
    // Handle duplicate invoiceNo
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Order with this invoice number already exists' });
    }
    console.error('❌ Save error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get All Orders (sorted by newest first)
app.get('/api/orders', async (req, res) => {
  try {
    const limitCount = parseInt(req.query.limit) || 50;
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limitCount)
      .lean();

    // Map _id to id for client compatibility
    const mapped = orders.map(o => ({
      ...o,
      id: o._id.toString()
    }));

    res.json(mapped);
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ ...order, id: order._id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Order (e.g., mark as paid)
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, lean: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ ...updated, id: updated._id.toString(), message: 'Order updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  API ROUTES — SETTINGS
// ═══════════════════════════════════════════════════════════

// Save/Update a setting
app.put('/api/settings/:key', async (req, res) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { ...req.body, key: req.params.key },
      { upsert: true, new: true, lean: true }
    );
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a setting
app.get('/api/settings/:key', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key }).lean();
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    database: states[dbState] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Database: MongoDB (${MONGO_URI})`);
});
