const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ── MongoDB Connection ──
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ayyappanAdmin:AyyappaSeva2026!@smartdine.knw2tcw.mongodb.net/ayyappanTemple?retryWrites=true&w=majority';

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(MONGO_URI);
  isConnected = true;
  console.log('✅ Connected to MongoDB');
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
  services:     { type: Array, default: [] }
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

app.put('/api/settings/:key', async (req, res) => {
  try {
    await connectDB();
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

app.get('/api/settings/:key', async (req, res) => {
  try {
    await connectDB();
    const setting = await Setting.findOne({ key: req.params.key }).lean();
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
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

module.exports = app;
