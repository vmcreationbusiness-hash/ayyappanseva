const { connectToDb, getOrderModel } = require('./db-connect');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Extract ID from path: /api/orders/:id
  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'orders-by-id') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Order ID required' }) };
  }

  try {
    await connectToDb();
    const Order = getOrderModel();

    // GET — Single Order
    if (event.httpMethod === 'GET') {
      const order = await Order.findById(id).lean();
      if (!order) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Order not found' }) };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...order, id: order._id.toString() })
      };
    }

    // PATCH — Update Order
    if (event.httpMethod === 'PATCH') {
      const updates = JSON.parse(event.body);
      const updated = await Order.findByIdAndUpdate(id, { $set: updates }, { new: true, lean: true });
      if (!updated) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Order not found' }) };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...updated, id: updated._id.toString(), message: 'Order updated' })
      };
    }

    // DELETE — Delete Order
    if (event.httpMethod === 'DELETE') {
      const deleted = await Order.findByIdAndDelete(id);
      if (!deleted) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Order not found' }) };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Order deleted', id })
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
