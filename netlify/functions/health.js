const mongoose = require('mongoose');

exports.handler = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ayyappanAdmin:AyyappaSeva2026!@smartdine.knw2tcw.mongodb.net/ayyappanTemple?retryWrites=true&w=majority';
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI);
    }
    const dbState = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'ok',
        database: states[dbState] || 'unknown',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
