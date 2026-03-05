// ═══════════════════════════════════════════════════════════
//  LOCAL DATABASE - API Functions
// ═══════════════════════════════════════════════════════════

const API_URL = 'http://localhost:3000/api';

// ── Save Order to Database ──
async function saveOrder(orderData) {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Order saved to Database:', data.id);

        // Also save locally as backup
        saveOrderLocally(orderData);

        return data.id;
    } catch (error) {
        console.error('❌ Failed to save order to Database:', error);
        // Fallback: save to localStorage
        return saveOrderLocally(orderData);
    }
}

// ── Get Orders from Database ──
async function getOrders(limitCount = 50) {
    try {
        const response = await fetch(`${API_URL}/orders?limit=${limitCount}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const orders = await response.json();
        console.log(`✅ Fetched ${orders.length} orders from Database`);
        return orders;
    } catch (error) {
        console.error('❌ Failed to fetch from Database:', error);
        // Fallback: get from localStorage
        return getOrdersLocally();
    }
}

// ── Get Orders by Date Range ──
async function getOrdersByDate(startDate, endDate) {
    try {
        const orders = await getOrders(1000); // Hacky way for now, fetch all then filter
        return orders.filter(order => {
            const orderDate = new Date(order.dateRaw);
            return orderDate >= startDate && orderDate <= endDate;
        });
    } catch (error) {
        console.error('❌ Failed to fetch orders by date:', error);

        // Filter locally
        const allOrders = getOrdersLocally();
        return allOrders.filter(order => {
            const orderDate = new Date(order.dateRaw);
            return orderDate >= startDate && orderDate <= endDate;
        });
    }
}

// ── Delete Order ──
async function deleteOrder(orderId) {
    if (typeof orderId === 'string' && orderId.startsWith('local_')) {
        deleteOrderLocally(orderId);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            console.log('✅ Order deleted from Database:', orderId);
        }
    } catch (error) {
        console.error('❌ Failed to delete from Database:', error);
    }

    // Also remove from localStorage if there
    deleteOrderLocally(orderId);
}

// ═══════════════════════════════════════════════════════════
//  LOCAL STORAGE FALLBACK
//  (Works if server is down — data persists in browser)
// ═══════════════════════════════════════════════════════════

const LOCAL_ORDERS_KEY = 'ayyappa_orders';

function saveOrderLocally(orderData) {
    try {
        const orders = getOrdersLocally();
        const localOrder = {
            ...orderData,
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            savedAt: new Date().toISOString()
        };
        orders.unshift(localOrder); // Add to beginning (newest first)

        // Keep only last 500 orders in localStorage
        if (orders.length > 500) orders.length = 500;

        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
        console.log('💾 Order saved to localStorage');
        return localOrder.id;
    } catch (error) {
        console.error('❌ Failed to save order locally:', error);
        return null;
    }
}

function getOrdersLocally() {
    try {
        const data = localStorage.getItem(LOCAL_ORDERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('❌ Failed to read local orders:', error);
        return [];
    }
}

function deleteOrderLocally(orderId) {
    try {
        let orders = getOrdersLocally();
        orders = orders.filter(o => o.id !== orderId);
        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
    } catch (error) {
        console.error('❌ Failed to delete local order:', error);
    }
}

// ── Initialize on load ──
document.addEventListener('DOMContentLoaded', () => {
    // API is stateless, no init required
    console.log('✅ Database connector initialized successfully!');
});
