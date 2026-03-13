const { connectToDb, getOrderModel } = require('./db-connect');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await connectToDb();
    const Order = getOrderModel();

    // POST — Create Order
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const order = new Order(data);
      const saved = await order.save();
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ id: saved._id, message: 'Order saved successfully' })
      };
    }

    // GET — Fetch Orders
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const limitCount = parseInt(params.limit) || 50;
      const orders = await Order.find().sort({ createdAt: -1 }).limit(limitCount).lean();
      const mapped = orders.map(o => ({ ...o, id: o._id.toString() }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mapped)
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    // Handle duplicate invoiceNo
    if (error.code === 11000) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Order with this invoice number already exists' })
      };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
