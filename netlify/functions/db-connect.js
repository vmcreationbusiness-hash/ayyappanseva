const mongoose = require('mongoose');

// ── Cached Connection ──
let cachedDb = null;

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ayyappanAdmin:AyyappaSeva2026!@smartdine.knw2tcw.mongodb.net/ayyappanTemple?retryWrites=true&w=majority';

// ── Order Schema ──
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

async function connectToDb() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  await mongoose.connect(MONGO_URI);
  cachedDb = mongoose.connection;
  return cachedDb;
}

function getOrderModel() {
  return mongoose.models.Order || mongoose.model('Order', orderSchema);
}

module.exports = { connectToDb, getOrderModel };
