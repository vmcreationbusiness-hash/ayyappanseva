// ═══════════════════════════════════════════════════════════
//  CLOUD DATABASE - Firebase & Storage API
// ═══════════════════════════════════════════════════════════

// 🔍 Check if Firebase is Initialized
function getDb() {
    try {
        if (firebase && firebase.apps.length > 0) {
            return firebase.firestore();
        }
    } catch (e) {
        console.warn("Firebase not detected or configured properly.");
    }
    return null;
}

function getStorage() {
    try {
        if (firebase && firebase.apps.length > 0) {
            return firebase.storage();
        }
    } catch (e) {
        console.warn("Firebase Storage not available.");
    }
    return null;
}

// ── Save Order to Firestore (Cloud) ──
async function saveOrder(orderData) {
    const db = getDb();
    if (!db) {
        console.warn('⚠️ No Firebase — Saving order to localStorage only.');
        return saveOrderLocally(orderData);
    }

    try {
        const docRef = await db.collection('orders').add({
            ...orderData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('🔥 Order saved to Firestore:', docRef.id);

        // Also save locally as a redundant backup
        saveOrderLocally(orderData);

        return docRef.id;
    } catch (error) {
        console.error('❌ Firestore Save Error:', error);
        return saveOrderLocally(orderData);
    }
}

// ── Get Orders from Firestore (Cloud) ──
async function getOrders(limitCount = 50) {
    const db = getDb();
    if (!db) {
        console.warn('⚠️ No Firebase — Loading orders from localStorage.');
        return getOrdersLocally();
    }

    try {
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(limitCount)
            .get();

        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Format timestamp if it exists
            dateRaw: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : doc.data().dateRaw
        }));

        console.log(`🔥 Fetched ${orders.length} orders from Firestore`);
        return orders;
    } catch (error) {
        console.error('❌ Firestore Fetch Error:', error);
        return getOrdersLocally();
    }
}

// ── Manage Dynamic Images (Backgrounds/Icons) ──
/**
 * Uploads an image to Firebase Storage and stores its URL in Firestore settings.
 * @param {File} file - The image file to upload
 * @param {string} type - 'background' or 'icon'
 */
async function uploadToCloud(file, type = 'background') {
    const storage = getStorage();
    const db = getDb();
    if (!storage || !db) return null;

    try {
        const fileRef = storage.ref().child(`${type}s/${file.name}`);
        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        // Save URL to settings in Firestore
        await db.collection('settings').doc(type).set({
            url: downloadURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            fileName: file.name
        });

        console.log(`🔥 ${type} image stored in Cloud:`, downloadURL);

        // Refresh styles on page
        if (type === 'background') applyCloudBackground(downloadURL);

        return downloadURL;
    } catch (error) {
        console.error(`❌ Cloud Upload error (${type}):`, error);
        return null;
    }
}

// ── Apply Background from Database ──
async function loadCloudSettings() {
    const db = getDb();
    if (!db) return;

    try {
        const doc = await db.collection('settings').doc('background').get();
        if (doc.exists) {
            const data = doc.data();
            applyCloudBackground(data.url);
        }
    } catch (error) {
        console.warn("Could not load cloud settings:", error);
    }
}

function applyCloudBackground(url) {
    if (!url) return;
    const bgContainer = document.querySelector('.bg-image');
    if (bgContainer) {
        bgContainer.style.backgroundImage = `url('${url}')`;
        bgContainer.style.opacity = "0.15"; // Slightly more visible for custom backgrounds
    }
}

// ── Delete Order ──
async function deleteOrder(orderId) {
    if (typeof orderId === 'string' && orderId.startsWith('local_')) {
        deleteOrderLocally(orderId);
        return;
    }

    const db = getDb();
    if (db) {
        try {
            await db.collection('orders').doc(orderId).delete();
            console.log('🔥 Order deleted from Firestore:', orderId);
        } catch (error) {
            console.error('❌ Firestore Delete Error:', error);
        }
    }

    deleteOrderLocally(orderId);
}

// ═══════════════════════════════════════════════════════════
//  LOCAL STORAGE FALLBACK (Keeps data in browser if offline)
// ═══════════════════════════════════════════════════════════

const LOCAL_ORDERS_KEY = 'ayyappa_orders';

function saveOrderLocally(orderData) {
    try {
        const orders = getOrdersLocally();
        // Skip if already in local storage (prevent duplicates)
        if (orders.some(o => o.invoiceNo === orderData.invoiceNo)) return;

        const localOrder = {
            ...orderData,
            id: orderData.id || 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            savedAt: new Date().toISOString()
        };
        orders.unshift(localOrder); // Add to beginning (newest first)

        if (orders.length > 500) orders.length = 500; // Limit local storage

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

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Database Connector Initialized');
    loadCloudSettings();
});
