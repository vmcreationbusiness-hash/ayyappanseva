// ═══════════════════════════════════════════════════════════
//  DATABASE CONNECTOR — MongoDB API + localStorage Fallback
//  Primary: MongoDB (via server API)
//  Fallback: localStorage (offline / when server is down)
// ═══════════════════════════════════════════════════════════

const API_BASE = window.location.origin + '/api';
let isServerOnline = true;

// ── Check Server Health on Load ──
async function checkServerHealth() {
    try {
        const res = await fetch(`${API_BASE}/health`, { 
            signal: AbortSignal.timeout(3000) 
        });
        const data = await res.json();
        isServerOnline = data.database === 'connected';
        if (isServerOnline) {
            console.log('✅ MongoDB Server: Online & Connected');
        } else {
            console.warn('⚠️ Server online but MongoDB disconnected. Using localStorage.');
        }
    } catch (e) {
        isServerOnline = false;
        console.warn('⚠️ Server unreachable. Using localStorage fallback.');
    }
    return isServerOnline;
}

// ═══════════════════════════════════════════════════════════
//  SAVE ORDER
// ═══════════════════════════════════════════════════════════
async function saveOrder(orderData) {
    // Always save locally as backup
    saveOrderLocally(orderData);

    if (!isServerOnline) {
        console.warn('⚠️ Offline — Order saved to localStorage only.');
        return orderData.invoiceNo;
    }

    try {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (res.ok) {
            const result = await res.json();
            console.log('🍃 Order saved to MongoDB:', result.id);
            return result.id;
        } else if (res.status === 409) {
            console.log('⚠️ Duplicate order — already exists in MongoDB.');
            return orderData.invoiceNo;
        } else {
            throw new Error(`Server returned ${res.status}`);
        }
    } catch (error) {
        console.error('❌ MongoDB Save Error:', error.message);
        console.log('💾 Order backed up to localStorage');
        return orderData.invoiceNo;
    }
}

// ═══════════════════════════════════════════════════════════
//  GET ORDERS
// ═══════════════════════════════════════════════════════════
async function getOrders(limitCount = 50) {
    if (!isServerOnline) {
        console.warn('⚠️ Offline — Loading orders from localStorage.');
        return getOrdersLocally();
    }

    try {
        const res = await fetch(`${API_BASE}/orders?limit=${limitCount}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const orders = await res.json();
        console.log(`🍃 Fetched ${orders.length} orders from MongoDB`);

        // Merge with any local-only orders (offline ones not yet synced)
        const localOrders = getOrdersLocally();
        const serverInvoiceNos = new Set(orders.map(o => o.invoiceNo));
        const unsyncedLocal = localOrders.filter(o => 
            o.id && o.id.startsWith('local_') && !serverInvoiceNos.has(o.invoiceNo)
        );

        if (unsyncedLocal.length > 0) {
            console.log(`📤 Found ${unsyncedLocal.length} unsynced local orders. Syncing...`);
            syncOfflineOrders(unsyncedLocal);
        }

        return [...orders, ...unsyncedLocal];
    } catch (error) {
        console.error('❌ MongoDB Fetch Error:', error.message);
        isServerOnline = false;
        return getOrdersLocally();
    }
}

// ═══════════════════════════════════════════════════════════
//  DELETE ORDER
// ═══════════════════════════════════════════════════════════
async function deleteOrder(orderId) {
    // Delete from localStorage
    deleteOrderLocally(orderId);

    // If it's a local-only order, no need to call server
    if (typeof orderId === 'string' && orderId.startsWith('local_')) {
        return;
    }

    if (!isServerOnline) return;

    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            console.log('🍃 Order deleted from MongoDB:', orderId);
        }
    } catch (error) {
        console.error('❌ MongoDB Delete Error:', error.message);
    }
}

// ═══════════════════════════════════════════════════════════
//  UPDATE ORDER (e.g., mark as paid)
// ═══════════════════════════════════════════════════════════
async function updateOrder(orderId, updates) {
    if (!isServerOnline || (typeof orderId === 'string' && orderId.startsWith('local_'))) {
        return null;
    }

    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (res.ok) {
            const result = await res.json();
            console.log('🍃 Order updated in MongoDB:', orderId);
            return result;
        }
    } catch (error) {
        console.error('❌ MongoDB Update Error:', error.message);
    }
    return null;
}

// ═══════════════════════════════════════════════════════════
//  SYNC OFFLINE ORDERS → MongoDB
// ═══════════════════════════════════════════════════════════
async function syncOfflineOrders(unsyncedOrders) {
    for (const order of unsyncedOrders) {
        try {
            const { id, savedAt, ...orderData } = order;
            const res = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            if (res.ok) {
                console.log(`✅ Synced offline order: ${order.invoiceNo}`);
                deleteOrderLocally(order.id);
            }
        } catch (error) {
            console.log(`⏳ Will retry syncing ${order.invoiceNo} later.`);
        }
    }
}

// ═══════════════════════════════════════════════════════════
//  LOCAL STORAGE FALLBACK (Keeps data when offline)
// ═══════════════════════════════════════════════════════════

const LOCAL_ORDERS_KEY = 'ayyappa_orders';

function saveOrderLocally(orderData) {
    try {
        const orders = getOrdersLocally();
        // Skip if already exists
        if (orders.some(o => o.invoiceNo === orderData.invoiceNo)) return;

        const localOrder = {
            ...orderData,
            id: orderData.id || 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            savedAt: new Date().toISOString()
        };
        orders.unshift(localOrder);

        if (orders.length > 500) orders.length = 500;

        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
        console.log('💾 Order backed up to localStorage');
        return localOrder.id;
    } catch (error) {
        console.error('❌ Local Save Error:', error);
        return null;
    }
}

function getOrdersLocally() {
    try {
        const data = localStorage.getItem(LOCAL_ORDERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        return [];
    }
}

function deleteOrderLocally(orderId) {
    try {
        let orders = getOrdersLocally();
        orders = orders.filter(o => o.id !== orderId);
        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
    } catch (error) {
        console.error('❌ Local Delete Error:', error);
    }
}

// ═══════════════════════════════════════════════════════════
//  INITIALIZE
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔌 Database Connector Initializing...');
    await checkServerHealth();
    console.log(`✅ Database Mode: ${isServerOnline ? 'MongoDB (Server)' : 'localStorage (Offline)'}`);
});
