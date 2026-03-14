// ═══════════════════════════════════════════════════════════
//  SWAMI AYYAPPA TEMPLE - OFFERING APP
//  Main Application Logic
// ═══════════════════════════════════════════════════════════

// ── State ──
const state = {
  language: null,
  service: null,
  cart: [],
  invoiceNo: null,
  nextId: 1,
  isBotActive: false,
  botStage: 'idle'
};

// ── Constants ──
const PRICE_PER_ITEM = 10;
const UPI_ID = "temple@upi"; // Replace with actual UPI ID
const MERCHANT_NAME = "Swami Ayyappa Temple";

// ── DOM Ready ──
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  renderLanguageScreen();
  setupVoiceOverlay();
}

// ── Utility Functions ──
function t(key) {
  if (!state.language) return key;
  return TRANSLATIONS[state.language][key] || key;
}

function getNakshatras() {
  return NAKSHATRAS[state.language] || NAKSHATRAS.en;
}

function getServiceIcon(service) {
  const icons = {
    archana: '🪷',
    gheeVizhaku: '🪔',
    coconutVizhaku: '🥥'
  };
  return icons[service] || '🕉️';
}

function getServiceName(service) {
  return t(service);
}

function generateInvoiceNo() {
  const now = new Date();
  const dateStr = now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `AYP-${dateStr}-${random}`;
}

function formatDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return now.toLocaleDateString('en-IN', options);
}

// ── Screen Navigation ──
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.add('active');
    screen.scrollTop = 0;
    window.scrollTo(0, 0);
  }
}

// ── Toast Notifications ──
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ═══════════════════════════════════════════════════════════
//  SCREEN 1: LANGUAGE SELECTION
// ═══════════════════════════════════════════════════════════
function renderLanguageScreen() {
  const screen = document.getElementById('screen-language');
  screen.innerHTML = `
    <div class="temple-header">
      <div class="temple-icon">🙏</div>
      <h1>Swami Ayyappa Temple</h1>
      <p>Online Offering Services</p>
    </div>
    <div class="section-title">Select Your Language</div>
    <div class="language-grid">
      <div class="lang-card" onclick="selectLanguage('en')">
        <div class="lang-flag">🇬🇧</div>
        <div class="lang-name">English</div>
        <div class="lang-native">English</div>
      </div>
      <div class="lang-card" onclick="selectLanguage('ta')">
        <div class="lang-flag">🇮🇳</div>
        <div class="lang-name">Tamil</div>
        <div class="lang-native">தமிழ்</div>
      </div>
      <div class="lang-card" onclick="selectLanguage('te')">
        <div class="lang-flag">🇮🇳</div>
        <div class="lang-name">Telugu</div>
        <div class="lang-native">తెలుగు</div>
      </div>
      <div class="lang-card" onclick="selectLanguage('ml')">
        <div class="lang-flag">🇮🇳</div>
        <div class="lang-name">Malayalam</div>
        <div class="lang-native">മലയാളം</div>
      </div>
    </div>
  `;
  showScreen('screen-language');
}

function selectLanguage(lang) {
  state.language = lang;
  const msg = t('welcome');
  speak(msg);
  renderServiceScreen();

  // If user started via bot, continue bot flow
  if (state.isBotActive) {
    setTimeout(() => {
      startBotServiceGuidance();
    }, 2000);
  }
}

// ═══════════════════════════════════════════════════════════
//  SCREEN 2: SERVICE SELECTION
// ═══════════════════════════════════════════════════════════
function renderServiceScreen() {
  const screen = document.getElementById('screen-service');
  screen.innerHTML = `
    <div class="nav-bar">
      <div class="nav-left">
        <span style="font-size:24px">🙏</span>
        <span class="nav-title">${t('welcome')}</span>
      </div>
      <div class="nav-right">
        <button class="btn-nav" onclick="renderOrdersScreen()">
          📋 ${t('orderHistory')}
        </button>
        <button class="btn-nav" onclick="renderLanguageScreen()">
          🌐 ${t('changeLanguage')}
        </button>
        ${state.cart.length > 0 ? `
        <button class="btn-nav" onclick="renderCartScreen()">
          🛒 <span class="cart-count">${state.cart.length}</span>
        </button>` : ''}
      </div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 40px 20px;">
      <div class="temple-header">
        <div class="temple-icon">🕉️</div>
        <h1>${t('welcome')}</h1>
        <p>${t('subtitle')}</p>
      </div>
      <div class="section-title">${t('selectService')}</div>
      <div class="service-grid">
        <div class="service-card" onclick="selectService('archana')">
          <div class="service-icon">🪷</div>
          <div class="service-name">${t('archana')}</div>
          <div class="service-desc">${t('archanaDesc')}</div>
          <div class="service-price">${t('pricePerItem')}</div>
        </div>
        <div class="service-card" onclick="selectService('gheeVizhaku')">
          <div class="service-icon">🪔</div>
          <div class="service-name">${t('gheeVizhaku')}</div>
          <div class="service-desc">${t('gheeVizhakuDesc')}</div>
          <div class="service-price">${t('pricePerItem')}</div>
        </div>
        <div class="service-card" onclick="selectService('coconutVizhaku')">
          <div class="service-icon">🥥</div>
          <div class="service-name">${t('coconutVizhaku')}</div>
          <div class="service-desc">${t('coconutVizhakuDesc')}</div>
          <div class="service-price">${t('pricePerItem')}</div>
        </div>
      </div>
    </div>
  `;
  showScreen('screen-service');
}

function selectService(service) {
  state.service = service;
  speak(getServiceName(service));
  renderEntryScreen();
}

// ═══════════════════════════════════════════════════════════
//  SCREEN 3: NAME & STAR ENTRY
// ═══════════════════════════════════════════════════════════
function renderEntryScreen() {
  const nakshatras = getNakshatras();
  const nakshatraOptions = nakshatras.map((n, i) =>
    `<option value="${i}">${n}</option>`
  ).join('');

  const screen = document.getElementById('screen-entry');
  screen.innerHTML = `
    <div class="nav-bar">
      <div class="nav-left">
        <span style="font-size:24px">🙏</span>
        <span class="nav-title">${t('welcome')}</span>
      </div>
      <div class="nav-right">
        <button class="btn-nav" onclick="renderServiceScreen()">
          ◀ ${t('changeService')}
        </button>
        ${state.cart.length > 0 ? `
        <button class="btn-nav" onclick="renderCartScreen()">
          🛒 <span class="cart-count">${state.cart.length}</span>
        </button>` : ''}
      </div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; padding: 40px 20px;">
      <div class="section-title">${t('enterDetails')}</div>
      <div class="split-layout">
        <div class="split-left">
          <div class="entry-container" style="max-width:100%;padding:0;">
            <div class="form-card">
              <div style="text-align:center; margin-bottom: 24px;">
                <div class="current-service-badge">
                  ${getServiceIcon(state.service)} ${getServiceName(state.service)} — ${t('pricePerItem')}
                </div>
              </div>
              <div class="form-group">
                <label for="devotee-name">${t('devoteeName')}</label>
                <div class="input-wrapper">
                  <input type="text" id="devotee-name" placeholder="${t('enterName')}" autocomplete="off">
                  <button class="btn-voice" id="btn-voice-name" onclick="startVoiceInput('name')" title="${t('voiceInput')}">
                    🎤
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label for="devotee-star">${t('selectStar')}</label>
                <div class="input-wrapper">
                  <select id="devotee-star">
                    <option value="">${t('chooseStar')}</option>
                    ${nakshatraOptions}
                  </select>
                  <button class="btn-voice" id="btn-voice-star" onclick="startVoiceInput('star')" title="${t('voiceInput')}">
                    🎤
                  </button>
                </div>
              </div>
              <div class="btn-group" style="margin-top: 32px;">
                <button class="btn btn-primary btn-lg btn-full" onclick="addToCart()">
                  🛒 ${t('addToCart')}
                </button>
              </div>
              <div class="btn-group" style="margin-top: 8px;">
                <button class="btn btn-secondary" onclick="startFullVoiceFlow()" style="flex:1;">
                  🎙️ ${t('voiceInput')} — ChatGPT Style
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="split-right">
          <div class="cart-sidebar" id="cart-sidebar">
            ${renderCartSidebarContent()}
          </div>
        </div>
      </div>
    </div>
  `;
  showScreen('screen-entry');
}

function renderCartSidebarContent() {
  if (state.cart.length === 0) {
    return `
      <div class="cart-sidebar-title">🛒 ${t('cart')} <span style="font-size:0.8rem;font-weight:400;color:var(--text-muted)">(0)</span></div>
      <div class="cart-sidebar-empty">
        <div class="empty-icon">🛒</div>
        <p>${t('cartEmpty')}</p>
      </div>
    `;
  }
  const total = state.cart.reduce((sum, item) => sum + item.price, 0);
  const items = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-detail">${item.serviceIcon} ${item.serviceName} • ${item.star}</div>
      </div>
      <span class="cart-item-price">₹${item.price}</span>
      <button class="cart-item-remove" onclick="removeFromCartAndRefresh(${item.id})" title="${t('removeItem')}">✕</button>
    </div>
  `).join('');
  return `
    <div class="cart-sidebar-title">🛒 ${t('cart')} <span style="font-size:0.8rem;font-weight:400;color:var(--text-muted)">(${state.cart.length})</span></div>
    ${items}
    <div class="cart-sidebar-total">
      <span class="total-label">${t('grandTotal')}</span>
      <span class="total-amount">₹${total}</span>
    </div>
    <div class="btn-group" style="margin-top:16px;">
      <button class="btn btn-success btn-full" onclick="renderCartScreen()">
        📄 ${t('proceedToPay')}
      </button>
    </div>
  `;
}

function refreshCartSidebar() {
  const sidebar = document.getElementById('cart-sidebar');
  if (sidebar) sidebar.innerHTML = renderCartSidebarContent();
}

function removeFromCartAndRefresh(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  refreshCartSidebar();
}


function addToCart() {
  const nameInput = document.getElementById('devotee-name');
  const starSelect = document.getElementById('devotee-star');

  const name = nameInput.value.trim();
  const starIndex = starSelect.value;

  if (!name) {
    showToast(t('speakName'), 'error');
    nameInput.focus();
    return;
  }
  if (starIndex === '') {
    showToast(t('speakStar'), 'error');
    starSelect.focus();
    return;
  }

  const nakshatras = getNakshatras();
  const star = nakshatras[parseInt(starIndex)];

  state.cart.push({
    id: state.nextId++,
    service: state.service,
    serviceName: getServiceName(state.service),
    serviceIcon: getServiceIcon(state.service),
    name: name,
    star: star,
    price: PRICE_PER_ITEM
  });

  const msg = `${name} - ${star} ${t('confirmAdd')}`;
  showToast(msg);
  speak(msg);

  // Reset form
  nameInput.value = '';
  starSelect.value = '';
  nameInput.focus();

  // Update cart sidebar without re-rendering entire screen
  refreshCartSidebar();
}

// ═══════════════════════════════════════════════════════════
//  SCREEN 4: CART
// ═══════════════════════════════════════════════════════════
function renderCartScreen() {
  const screen = document.getElementById('screen-cart');
  const total = state.cart.reduce((sum, item) => sum + item.price, 0);

  let cartContent = '';
  if (state.cart.length === 0) {
    cartContent = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <p>${t('cartEmpty')}</p>
      </div>
    `;
  } else {
    const rows = state.cart.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${item.serviceIcon} ${item.serviceName}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.star}</td>
        <td>₹${item.price}</td>
        <td>
          <button class="btn btn-danger" onclick="removeFromCart(${item.id})">
            ${t('removeItem')} ✕
          </button>
        </td>
      </tr>
    `).join('');

    cartContent = `
      <div class="cart-badge">🛒 ${state.cart.length} ${t('itemsInCart')}</div>
      <div style="overflow-x: auto;">
        <table class="cart-table">
          <thead>
            <tr>
              <th>${t('srNo')}</th>
              <th>${t('service')}</th>
              <th>${t('name')}</th>
              <th>${t('star')}</th>
              <th>${t('price')}</th>
              <th>${t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      <div class="cart-total-row">
        <span class="cart-total-label">${t('grandTotal')}</span>
        <span class="cart-total-amount">₹${total}</span>
      </div>
    `;
  }

  screen.innerHTML = `
    <div class="nav-bar">
      <div class="nav-left">
        <span style="font-size:24px">🛒</span>
        <span class="nav-title">${t('cart')}</span>
      </div>
      <div class="nav-right">
        <button class="btn-nav" onclick="renderServiceScreen()">
          ◀ ${t('changeService')}
        </button>
      </div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; padding: 40px 20px;">
      <div class="section-title">${t('cart')}</div>
      <div class="cart-container">
        <div class="cart-card">
          ${cartContent}
          <div class="btn-group" style="margin-top: 24px;">
            <button class="btn btn-secondary" onclick="renderServiceScreen()">
              ➕ ${t('addMore')}
            </button>
            ${state.cart.length > 0 ? `
            <button class="btn btn-danger" onclick="clearCart()">
              🗑️ ${t('clearCart')}
            </button>
            <button class="btn btn-success btn-lg" onclick="generateInvoice()">
              📄 ${t('proceedToPay')}
            </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  showScreen('screen-cart');
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  renderCartScreen();
}

function clearCart() {
  state.cart = [];
  renderCartScreen();
}

// ═══════════════════════════════════════════════════════════
//  SCREEN 5: INVOICE & PAYMENT
// ═══════════════════════════════════════════════════════════
function generateInvoice() {
  state.invoiceNo = generateInvoiceNo();
  const total = state.cart.reduce((sum, item) => sum + item.price, 0);
  const date = formatDate();
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=${encodeURIComponent('Temple Offering - ' + state.invoiceNo)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  // ── Save order to database ──
  const orderData = {
    invoiceNo: state.invoiceNo,
    date: date,
    dateRaw: new Date().toISOString(),
    language: state.language,
    items: state.cart.map(item => ({
      service: item.service,
      serviceName: item.serviceName,
      serviceIcon: item.serviceIcon,
      name: item.name,
      star: item.star,
      price: item.price
    })),
    totalAmount: total,
    itemCount: state.cart.length,
    paymentStatus: 'pending'
  };

  saveOrder(orderData).then(docId => {
    if (docId) {
      console.log('📋 Order saved with ID:', docId);
    }
  }).catch(err => {
    console.error('Order save error:', err);
  });

  const rows = state.cart.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${item.serviceIcon} ${item.serviceName}</td>
      <td>${item.name}</td>
      <td>${item.star}</td>
      <td style="text-align:right">₹${item.price}</td>
    </tr>
  `).join('');

  const screen = document.getElementById('screen-invoice');
  screen.innerHTML = `
    <div class="nav-bar no-print">
      <div class="nav-left">
        <span style="font-size:24px">📄</span>
        <span class="nav-title">${t('invoice')}</span>
      </div>
      <div class="nav-right">
        <button class="btn-nav" onclick="renderCartScreen()">
          ◀ ${t('cart')}
        </button>
      </div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; padding: 40px 20px;">
      <div class="invoice-container">
        <div class="invoice-card" id="invoice-content">
          <div class="invoice-header">
            <div style="font-size: 40px; margin-bottom: 8px;">🙏</div>
            <h2>${t('invoiceTitle')}</h2>
            <div class="invoice-subtitle">Sabarimala Sannidhanam</div>
          </div>

          <div class="invoice-meta">
            <div>
              <div class="meta-label">${t('invoiceNo')}</div>
              <div class="meta-value">${state.invoiceNo}</div>
            </div>
            <div>
              <div class="meta-label">${t('date')}</div>
              <div class="meta-value">${date}</div>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>${t('slNo')}</th>
                <th>${t('service')}</th>
                <th>${t('name')}</th>
                <th>${t('star')}</th>
                <th style="text-align:right">${t('price')}</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="invoice-total">
            <div class="total-text">${t('grandTotal')}</div>
            <div class="total-amount">₹${total}</div>
          </div>
        </div>

        <div class="upi-section no-print">
          <h3>💳 ${t('payViaUPI')}</h3>
          <p style="color: var(--text-light); margin-bottom: 16px;">${t('scanToPay')}</p>
          <div class="upi-qr">
            <img src="${qrUrl}" alt="UPI QR Code" id="upi-qr-img">
          </div>
          <div class="upi-details">
            <div>${t('upiId')}</div>
            <div class="upi-id-display">${UPI_ID}</div>
            <div style="margin-top: 8px;">${t('amount')}: <strong>₹${total}</strong></div>
          </div>
          <div class="btn-group" style="margin-top: 20px;">
            <a href="${upiLink}" class="btn btn-success btn-lg" style="text-decoration:none;">
              📱 ${t('payViaUPI')}
            </a>
          </div>
        </div>

        <div class="thank-you no-print">
          <p>🙏 ${t('thankYou')}</p>
        </div>

        <div class="btn-group no-print" style="margin-top: 24px;">
          <button class="btn btn-primary btn-lg" onclick="printInvoice()">
            🖨️ ${t('printInvoice')}
          </button>
          <button class="btn btn-secondary btn-lg" onclick="startNewOrder()">
            🏠 ${t('backToHome')}
          </button>
        </div>
      </div>
    </div>
  `;
  showScreen('screen-invoice');
  showToast('✅ ' + t('orderSaved'));
}

function printInvoice() {
  window.print();
}

function startNewOrder() {
  state.cart = [];
  state.service = null;
  state.invoiceNo = null;
  state.nextId = 1;
  renderServiceScreen();
}

// ═══════════════════════════════════════════════════════════
//  SCREEN 6: ORDERS HISTORY
// ═══════════════════════════════════════════════════════════
async function renderOrdersScreen() {
  const screen = document.getElementById('screen-orders');

  // Show loading state
  screen.innerHTML = `
    <div class="nav-bar">
      <div class="nav-left">
        <span style="font-size:24px">📋</span>
        <span class="nav-title">${t('orderHistory')}</span>
      </div>
      <div class="nav-right">
        <button class="btn-nav" onclick="renderServiceScreen()">
          ◀ ${t('backToHome')}
        </button>
      </div>
    </div>
    <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:40px 20px;">
      <div style="text-align:center; color:var(--text-muted);">
        <div style="font-size:40px; margin-bottom:12px;">⏳</div>
        <p>${t('loading')}...</p>
      </div>
    </div>
  `;
  showScreen('screen-orders');

  // Fetch orders
  const orders = await getOrders(100);

  // Calculate summary
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalItems = orders.reduce((sum, o) => sum + (o.itemCount || 0), 0);

  let ordersContent = '';
  if (orders.length === 0) {
    ordersContent = `
      <div class="cart-empty">
        <div class="empty-icon">📋</div>
        <p>${t('noOrders')}</p>
      </div>
    `;
  } else {
    const orderRows = orders.map((order, idx) => {
      const itemsList = (order.items || []).map(item =>
        `<div style="font-size:0.85rem; color:var(--text-light); padding:2px 0;">
          ${item.serviceIcon || '🕉️'} ${item.name} — ${item.star} (${item.serviceName})
        </div>`
      ).join('');

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${order.invoiceNo || 'N/A'}</strong>
            <div style="font-size:0.8rem; color:var(--text-muted);">${order.date || ''}</div>
          </td>
          <td>${itemsList}</td>
          <td>${order.itemCount || 0}</td>
          <td style="text-align:right;"><strong>₹${order.totalAmount || 0}</strong></td>
          <td>
            <span class="status-badge ${order.paymentStatus === 'paid' ? 'status-paid' : 'status-pending'}">
              ${order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    ordersContent = `
      <div class="orders-summary">
        <div class="summary-card">
          <div class="summary-icon">📋</div>
          <div class="summary-value">${totalOrders}</div>
          <div class="summary-label">${t('totalOrders')}</div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">🙏</div>
          <div class="summary-value">${totalItems}</div>
          <div class="summary-label">${t('totalOfferings')}</div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">💰</div>
          <div class="summary-value">₹${totalRevenue}</div>
          <div class="summary-label">${t('totalRevenue')}</div>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="cart-table orders-table">
          <thead>
            <tr>
              <th>${t('srNo')}</th>
              <th>${t('invoiceNo')}</th>
              <th>${t('offerings')}</th>
              <th>${t('items')}</th>
              <th style="text-align:right;">${t('amount')}</th>
              <th>${t('status')}</th>
            </tr>
          </thead>
          <tbody>
            ${orderRows}
          </tbody>
        </table>
      </div>
    `;
  }

  screen.innerHTML = `
    <div class="nav-bar">
      <div class="nav-left">
        <span style="font-size:24px">📋</span>
        <span class="nav-title">${t('orderHistory')}</span>
      </div>
      <div class="nav-right">
        <button class="btn-nav" onclick="renderServiceScreen()">
          ◀ ${t('backToHome')}
        </button>
      </div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; padding: 40px 20px;">
      <div class="section-title">${t('orderHistory')}</div>
      <div class="cart-container" style="max-width:1000px;">
        <div class="cart-card">
          ${ordersContent}
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
//  VOICE RECOGNITION & SYNTHESIS
// ═══════════════════════════════════════════════════════════

// Check support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

// ── Google Cloud STT Config ──
// If this key is provided, the app will try Cloud STT first and fallback to Web Speech API
let GOOGLE_CLOUD_API_KEY = localStorage.getItem('ayyappa_gcp_api_key') || '';
let mediaRecorder = null;


function setupVoiceOverlay() {
  // Voice overlay is already in HTML
}

// ── Voice Cache & Quality Ranking ──
let voiceCache = {};
let voicesLoaded = false;

// Known high-quality voice name patterns for Indian languages
const PREFERRED_VOICE_PATTERNS = {
  'ta': ['Google தமிழ்', 'Google Tamil', 'Microsoft Pattara', 'Pattara', 'Tamil', 'தமிழ்'],
  'te': ['Google తెలుగు', 'Google Telugu', 'Microsoft Shruti', 'Shruti', 'Telugu', 'తెలుగు'],
  'ml': ['Google മലയാളം', 'Google Malayalam', 'Microsoft Rajeev', 'Rajeev', 'Malayalam', 'മലയാളം'],
  'en': ['Google US English', 'Google UK English Female', 'Google India English', 'Microsoft Ravi', 'Microsoft Heera', 'Ravi', 'Heera', 'English India']
};

// Speech rate per language for natural pronunciation
const SPEECH_RATE = {
  'en': 0.95,
  'ta': 0.85,
  'te': 0.85,
  'ml': 0.82
};

function loadAndCacheVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;

  voicesLoaded = true;
  voiceCache = {};

  // Log all available voices for debugging
  console.log('🎤 Available voices:');
  voices.forEach(v => {
    console.log(`  [${v.lang}] ${v.name} ${v.localService ? '(local)' : '(online)'} ${v.default ? '★ default' : ''}`);
  });

  // Score and cache best voice for each language
  Object.keys(LANG_CODES).forEach(lang => {
    const langCode = LANG_CODES[lang];
    const langPrefix = langCode.split('-')[0];
    const preferred = PREFERRED_VOICE_PATTERNS[langPrefix] || [];

    // Find all matching voices for this language
    const candidates = voices.filter(v => {
      const vLang = v.lang.toLowerCase();
      const prefix = langPrefix.toLowerCase();
      return vLang === langCode.toLowerCase() ||
        vLang.startsWith(prefix + '-') ||
        vLang === prefix;
    });

    if (candidates.length === 0) {
      console.warn(`  ⚠ No voice found for ${lang} (${langCode})`);
      return;
    }

    // Score each candidate voice
    const scored = candidates.map(v => {
      let score = 0;
      const name = v.name.toLowerCase();

      // Exact lang match bonus
      if (v.lang.toLowerCase() === langCode.toLowerCase()) score += 50;

      // Preferred voice name patterns (highest quality)
      preferred.forEach((pattern, idx) => {
        if (v.name.includes(pattern) || name.includes(pattern.toLowerCase())) {
          score += 100 - idx * 5;  // Earlier in list = higher preference
        }
      });

      // Google voices are generally higher quality
      if (name.includes('google')) score += 40;

      // Microsoft voices are also good
      if (name.includes('microsoft')) score += 30;

      // Online voices (not local) tend to sound better
      if (!v.localService) score += 20;

      // Female voices often have clearer pronunciation for Indian languages
      if (name.includes('female') || name.includes('woman')) score += 5;

      return { voice: v, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    voiceCache[lang] = scored[0].voice;
    console.log(`  ✅ Best voice for ${lang}: "${scored[0].voice.name}" [${scored[0].voice.lang}] (score: ${scored[0].score})`);
  });
}

function getBestVoice(langCode) {
  const lang = state.language || 'en';

  // Return cached voice if available
  if (voiceCache[lang]) return voiceCache[lang];

  // Fallback: try loading voices again
  if (!voicesLoaded) loadAndCacheVoices();
  if (voiceCache[lang]) return voiceCache[lang];

  // Last resort: basic matching
  const voices = window.speechSynthesis.getVoices();
  const langPrefix = langCode.split('-')[0];
  return voices.find(v => v.lang.startsWith(langPrefix)) ||
    voices.find(v => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase())) ||
    null;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const langCode = LANG_CODES[state.language] || 'en-IN';
  const langPrefix = langCode.split('-')[0];
  utterance.lang = langCode;
  utterance.rate = SPEECH_RATE[langPrefix] || 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Use the best native voice
  const bestVoice = getBestVoice(langCode);
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

function startVoiceInput(field) {
  if (!SpeechRecognition && !GOOGLE_CLOUD_API_KEY) {
    showToast(t('noVoiceSupport'), 'error');
    return;
  }

  const overlay = document.getElementById('voice-overlay');
  const statusEl = document.getElementById('voice-status');
  const promptEl = document.getElementById('voice-prompt');
  const resultEl = document.getElementById('voice-result');

  statusEl.textContent = t('voiceListening');
  promptEl.textContent = field === 'name' ? t('voicePromptName') : t('voicePromptStar');
  resultEl.textContent = '';

  overlay.classList.add('active');

  // Speak the prompt first, then start listening
  const prompt = field === 'name' ? t('voicePromptName') : t('voicePromptStar');

  const utterance = speak(prompt);

  const startListeningFn = () => {
    beginRecognition(field);
  };

  if (utterance && window.speechSynthesis.speaking) {
    utterance.onend = startListeningFn;
    // Fallback timeout
    setTimeout(() => {
      if (!isListening) startListeningFn();
    }, 3000);
  } else {
    setTimeout(startListeningFn, 500);
  }
}

function beginRecognition(field) {
  if (isListening) return;

  if (GOOGLE_CLOUD_API_KEY) {
    startCloudSTT(field);
  } else {
    startWebSpeechAPI(field);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function startCloudSTT(field) {
  const statusEl = document.getElementById('voice-status');
  const resultEl = document.getElementById('voice-result');
  isListening = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      statusEl.textContent = 'Processing...';
      const audioBlob = new Blob(audioChunks);
      const base64Audio = await blobToBase64(audioBlob);

      try {
        const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS',
              languageCode: LANG_CODES[state.language] || 'en-IN',
            },
            audio: { content: base64Audio.split(',')[1] }
          })
        });

        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const transcript = data.results[0].alternatives[0].transcript;
          resultEl.textContent = transcript;
          processVoiceResult(field, transcript.trim());
        } else {
          console.warn("Cloud STT returned no results, falling back");
          isListening = false;
          startWebSpeechAPI(field);
        }
      } catch (err) {
        console.error("Cloud STT failed:", err);
        isListening = false;
        startWebSpeechAPI(field);
      }
    };

    mediaRecorder.start();
    statusEl.textContent = t('voiceListening');

    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }
    }, 4000);

  } catch (err) {
    console.error("Mic access failed:", err);
    isListening = false;
    startWebSpeechAPI(field);
  }
}

function startWebSpeechAPI(field) {
  if (isListening || !SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.lang = LANG_CODES[state.language] || 'en-IN';
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;
  recognition.continuous = false;

  const resultEl = document.getElementById('voice-result');
  const statusEl = document.getElementById('voice-status');

  isListening = true;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    resultEl.textContent = transcript;

    if (event.results[event.results.length - 1].isFinal) {
      processVoiceResult(field, transcript.trim());
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    if (event.error !== 'aborted') {
      statusEl.textContent = '❌ Error';
      setTimeout(() => closeVoiceOverlay(), 1500);
    }
  };

  recognition.onend = () => {
    isListening = false;
  };

  try {
    recognition.start();
    statusEl.textContent = t('voiceListening');
  } catch (e) {
    console.error('Failed to start recognition:', e);
    isListening = false;
  }
}

function processVoiceResult(field, transcript) {
  const overlay = document.getElementById('voice-overlay');
  const statusEl = document.getElementById('voice-status');

  if (field === 'name') {
    const nameInput = document.getElementById('devotee-name');
    if (nameInput) {
      nameInput.value = transcript;
    }
    statusEl.textContent = `${t('voiceConfirmName')}: ${transcript}`;
    speak(`${t('voiceConfirmName')} ${transcript}`);
    setTimeout(() => closeVoiceOverlay(), 2000);
  } else if (field === 'star') {
    const nakshatras = getNakshatras();
    const matchedIndex = findBestMatch(transcript, nakshatras);
    const starSelect = document.getElementById('devotee-star');

    if (matchedIndex >= 0 && starSelect) {
      starSelect.value = matchedIndex.toString();
      statusEl.textContent = `${t('voiceConfirmStar')}: ${nakshatras[matchedIndex]}`;
      speak(`${t('voiceConfirmStar')} ${nakshatras[matchedIndex]}`);
    } else {
      statusEl.textContent = transcript;
    }
    setTimeout(() => closeVoiceOverlay(), 2000);
  }
}

function findBestMatch(input, options) {
  const normalizedInput = input.toLowerCase().trim();

  // Exact match
  let idx = options.findIndex(o => o.toLowerCase() === normalizedInput);
  if (idx >= 0) return idx;

  // Starts with match
  idx = options.findIndex(o => o.toLowerCase().startsWith(normalizedInput));
  if (idx >= 0) return idx;

  // Contains match
  idx = options.findIndex(o => o.toLowerCase().includes(normalizedInput));
  if (idx >= 0) return idx;

  // Input contains option
  idx = options.findIndex(o => normalizedInput.includes(o.toLowerCase()));
  if (idx >= 0) return idx;

  // Levenshtein distance-based fuzzy match
  let bestDist = Infinity;
  let bestIdx = -1;
  options.forEach((opt, i) => {
    const dist = levenshtein(normalizedInput, opt.toLowerCase());
    if (dist < bestDist && dist <= opt.length * 0.5) {
      bestDist = dist;
      bestIdx = i;
    }
  });

  return bestIdx;
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function closeVoiceOverlay() {
  const overlay = document.getElementById('voice-overlay');
  overlay.classList.remove('active');
  if (recognition) {
    try { recognition.abort(); } catch (e) { }
  }
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    try {
      mediaRecorder.stop();
      if (mediaRecorder.stream) mediaRecorder.stream.getTracks().forEach(t => t.stop());
    } catch (e) { }
  }
  isListening = false;
}

// ── ChatGPT-Style Full Voice Flow ──
// (This is the "Voice Bot" entry point)
async function startFullVoiceFlow() {
  state.isBotActive = true;
  state.botStage = 'intro';

  if (!SpeechRecognition && !GOOGLE_CLOUD_API_KEY) {
    showToast(t('noVoiceSupport'), 'error');
    return;
  }

  const overlay = document.getElementById('voice-overlay');
  const statusEl = document.getElementById('voice-status');
  const promptEl = document.getElementById('voice-prompt');
  const resultEl = document.getElementById('voice-result');

  // Activate overlay
  overlay.classList.add('active');
  document.body.classList.add('bot-speaking');

  // Stage 1: Intro & Name
  statusEl.textContent = t('voiceSpeaking');
  promptEl.textContent = t('voicePromptName');
  resultEl.textContent = '';

  await speakAndWait(t('voicePromptName'));

  document.body.classList.remove('bot-speaking');
  statusEl.textContent = t('voiceListening');
  const name = await listenForSpeech();

  if (!name) {
    terminateBot();
    return;
  }

  resultEl.textContent = name;
  statusEl.textContent = `${t('voiceConfirmName')}: ${name}`;
  document.body.classList.add('bot-speaking');
  await speakAndWait(`${t('voiceConfirmName')} ${name}`);

  const nameInput = document.getElementById('devotee-name');
  if (nameInput) nameInput.value = name;

  // Stage 2: Star
  document.body.classList.remove('bot-speaking');
  statusEl.textContent = t('voiceSpeaking');
  promptEl.textContent = t('voicePromptStar');
  resultEl.textContent = '';

  document.body.classList.add('bot-speaking');
  await speakAndWait(t('voicePromptStar'));

  document.body.classList.remove('bot-speaking');
  statusEl.textContent = t('voiceListening');
  const starText = await listenForSpeech();

  if (!starText) {
    terminateBot();
    return;
  }

  const nakshatras = getNakshatras();
  const matchedIndex = findBestMatch(starText, nakshatras);
  const starSelect = document.getElementById('devotee-star');

  if (matchedIndex >= 0) {
    resultEl.textContent = nakshatras[matchedIndex];
    statusEl.textContent = `${t('voiceConfirmStar')}: ${nakshatras[matchedIndex]}`;
    if (starSelect) starSelect.value = matchedIndex.toString();
    document.body.classList.add('bot-speaking');
    await speakAndWait(`${t('voiceConfirmStar')} ${nakshatras[matchedIndex]}`);
  } else {
    resultEl.textContent = starText;
    document.body.classList.add('bot-speaking');
    await speakAndWait(t('speakStar')); // Prompt to try again or finish
    terminateBot();
    return;
  }

  // Stage 3: Auto add to cart & transition
  document.body.classList.remove('bot-speaking');
  closeVoiceOverlay();
  addToCart();

  // Ask if they want to proceed or add more
  setTimeout(async () => {
    overlay.classList.add('active');
    document.body.classList.add('bot-speaking');
    statusEl.textContent = t('voiceSpeaking');
    promptEl.textContent = t('proceedToPay');

    await speakAndWait(t('confirmAdd') + ". " + t('proceedToPay') + "?");

    document.body.classList.remove('bot-speaking');
    statusEl.textContent = t('voiceListening');
    const response = await listenForSpeech();

    if (response && (response.toLowerCase().includes('yes') || response.toLowerCase().includes('pay') || response.toLowerCase().includes('ha'))) {
      renderCartScreen();
      await speakAndWait(t('proceedToPay'));
    }

    terminateBot();
  }, 1500);
}

function terminateBot() {
  state.isBotActive = false;
  state.botStage = 'idle';
  closeVoiceOverlay();
  document.body.classList.remove('bot-speaking');
}

async function startBotServiceGuidance() {
  if (!state.isBotActive) return;

  const overlay = document.getElementById('voice-overlay');
  const statusEl = document.getElementById('voice-status');
  const promptEl = document.getElementById('voice-prompt');
  const resultEl = document.getElementById('voice-result');

  overlay.classList.add('active');
  document.body.classList.add('bot-speaking');

  statusEl.textContent = t('voiceSpeaking');
  promptEl.textContent = t('selectService');
  resultEl.textContent = '';

  await speakAndWait(t('selectService'));

  document.body.classList.remove('bot-speaking');
  statusEl.textContent = t('voiceListening');

  const response = await listenForSpeech();

  if (response) {
    resultEl.textContent = response;
    const services = ['archana', 'gheeVizhaku', 'coconutVizhaku'];
    const matchedService = findBestMatch(response, services.map(s => t(s)));

    if (matchedService >= 0) {
      const selected = services[matchedService];
      statusEl.textContent = `${t('confirmAdd')}: ${t(selected)}`;
      document.body.classList.add('bot-speaking');
      await speakAndWait(`${t(selected)}. ${t('enterDetails')}`);
      selectService(selected);
      return;
    }
  }

  // If no match or error, guide them back
  statusEl.textContent = 'Please tap a service Card';
  setTimeout(terminateBot, 2000);
}

function speakAndWait(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      setTimeout(resolve, 1000);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langCode = LANG_CODES[state.language] || 'en-IN';
    const langPrefix = langCode.split('-')[0];
    utterance.lang = langCode;
    utterance.rate = SPEECH_RATE[langPrefix] || 0.9;
    utterance.pitch = 1;

    const bestVoice = getBestVoice(langCode);
    if (bestVoice) utterance.voice = bestVoice;

    utterance.onend = () => setTimeout(resolve, 300);
    utterance.onerror = () => setTimeout(resolve, 300);

    window.speechSynthesis.speak(utterance);

    // Safety timeout
    setTimeout(resolve, 5000);
  });
}

function listenForSpeechWeb() {
  return new Promise((resolve) => {
    if (!SpeechRecognition) {
      resolve(null);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = LANG_CODES[state.language] || 'en-IN';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.continuous = false;

    const resultEl = document.getElementById('voice-result');
    let finalTranscript = '';
    let timeout;

    rec.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (resultEl) resultEl.textContent = transcript;

      if (event.results[event.results.length - 1].isFinal) {
        finalTranscript = transcript.trim();
        clearTimeout(timeout);
        setTimeout(() => resolve(finalTranscript), 500);
      }
    };

    rec.onerror = (event) => {
      console.error('Voice error:', event.error);
      clearTimeout(timeout);
      resolve(null);
    };

    rec.onend = () => {
      clearTimeout(timeout);
      if (finalTranscript) {
        resolve(finalTranscript);
      } else {
        resolve(null);
      }
    };

    try {
      rec.start();
      isListening = true;
      timeout = setTimeout(() => {
        try { rec.stop(); } catch (e) { }
      }, 8000);
    } catch (e) {
      resolve(null);
    }
  });
}

function listenForSpeechCloud() {
  return new Promise(async (resolve) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      const resultEl = document.getElementById('voice-result');

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks);
        const b64 = await blobToBase64(blob);
        try {
          const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: { encoding: 'WEBM_OPUS', languageCode: LANG_CODES[state.language] || 'en-IN' },
              audio: { content: b64.split(',')[1] }
            })
          });
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const transcript = data.results[0].alternatives[0].transcript;
            if (resultEl) resultEl.textContent = transcript;
            resolve(transcript.trim());
          } else {
            resolve(null); // Fallback
          }
        } catch {
          resolve(null); // Fallback
        }
      };

      mediaRecorder.start();
      isListening = true;
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          stream.getTracks().forEach(t => t.stop());
        }
      }, 5000);
    } catch {
      resolve(null);
    }
  });
}

function listenForSpeech() {
  return new Promise((resolve) => {
    if (GOOGLE_CLOUD_API_KEY) {
      listenForSpeechCloud().then(res => {
        if (res) resolve(res);
        else listenForSpeechWeb().then(resolve);
      });
    } else {
      listenForSpeechWeb().then(resolve);
    }
  });
}

// Load and cache voices with retry
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    loadAndCacheVoices();
  };
  // Initial load (voices may not be ready immediately)
  loadAndCacheVoices();
  // Retry after short delay (some browsers load voices asynchronously)
  setTimeout(loadAndCacheVoices, 500);
  setTimeout(loadAndCacheVoices, 2000);
}

// ═══════════════════════════════════════════════════════════
//  SETTINGS / CONFIGURATION PANEL
// ═══════════════════════════════════════════════════════════

const THEME_PRESETS = {
  'divine-gold': {
    primary: '#B8860B', primaryLight: '#DAA520', primaryDark: '#8B6914',
    accent: '#FFD700', secondary: '#800020',
    bg: '#FFFDF5', bgSecondary: '#FFF8F0',
    text: '#3E2723', textLight: '#5D4037', textMuted: '#8D6E63',
    border: 'rgba(184, 134, 11, 0.25)', borderLight: 'rgba(184, 134, 11, 0.12)',
    shadow: 'rgba(139, 105, 20, 0.15)', shadowHeavy: 'rgba(139, 105, 20, 0.25)',
    bgCard: 'rgba(255, 253, 245, 0.88)', primaryGlow: 'rgba(218, 165, 32, 0.3)',
    accentSoft: 'rgba(255, 215, 0, 0.15)'
  },
  'royal-maroon': {
    primary: '#800020', primaryLight: '#A0002A', primaryDark: '#5C0018',
    accent: '#C41E3A', secondary: '#B8860B',
    bg: '#FFF5F5', bgSecondary: '#FFF0F0',
    text: '#2C1320', textLight: '#4A2040', textMuted: '#8B6080',
    border: 'rgba(128, 0, 32, 0.25)', borderLight: 'rgba(128, 0, 32, 0.12)',
    shadow: 'rgba(128, 0, 32, 0.15)', shadowHeavy: 'rgba(128, 0, 32, 0.25)',
    bgCard: 'rgba(255, 245, 245, 0.88)', primaryGlow: 'rgba(196, 30, 58, 0.3)',
    accentSoft: 'rgba(196, 30, 58, 0.1)'
  },
  'sacred-blue': {
    primary: '#1565C0', primaryLight: '#42A5F5', primaryDark: '#0D47A1',
    accent: '#64B5F6', secondary: '#0D47A1',
    bg: '#F0F8FF', bgSecondary: '#E8F4FD',
    text: '#1A237E', textLight: '#283593', textMuted: '#5C6BC0',
    border: 'rgba(21, 101, 192, 0.25)', borderLight: 'rgba(21, 101, 192, 0.12)',
    shadow: 'rgba(21, 101, 192, 0.15)', shadowHeavy: 'rgba(21, 101, 192, 0.25)',
    bgCard: 'rgba(240, 248, 255, 0.88)', primaryGlow: 'rgba(66, 165, 245, 0.3)',
    accentSoft: 'rgba(100, 181, 246, 0.12)'
  },
  'temple-green': {
    primary: '#2E7D32', primaryLight: '#66BB6A', primaryDark: '#1B5E20',
    accent: '#81C784', secondary: '#1B5E20',
    bg: '#F0FFF0', bgSecondary: '#E8F5E9',
    text: '#1B3A1B', textLight: '#2E5A2E', textMuted: '#6B8E6B',
    border: 'rgba(46, 125, 50, 0.25)', borderLight: 'rgba(46, 125, 50, 0.12)',
    shadow: 'rgba(46, 125, 50, 0.15)', shadowHeavy: 'rgba(46, 125, 50, 0.25)',
    bgCard: 'rgba(240, 255, 240, 0.88)', primaryGlow: 'rgba(102, 187, 106, 0.3)',
    accentSoft: 'rgba(129, 199, 132, 0.12)'
  }
};

let currentTheme = 'divine-gold';

// ── Toggle Settings Panel ──
function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  const overlay = document.getElementById('settings-overlay');
  const toggle = document.getElementById('settings-toggle');

  panel.classList.toggle('open');
  overlay.classList.toggle('open');
  toggle.classList.toggle('active');
}

// ── Apply Theme Preset ──
function applyTheme(themeName) {
  const theme = THEME_PRESETS[themeName];
  if (!theme) return;

  currentTheme = themeName;
  const root = document.documentElement;

  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-light', theme.primaryLight);
  root.style.setProperty('--primary-dark', theme.primaryDark);
  root.style.setProperty('--primary-glow', theme.primaryGlow);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-soft', theme.accentSoft);
  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--bg-secondary', theme.bgSecondary);
  root.style.setProperty('--bg-card', theme.bgCard);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--text-light', theme.textLight);
  root.style.setProperty('--text-muted', theme.textMuted);
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--border-light', theme.borderLight);
  root.style.setProperty('--shadow', theme.shadow);
  root.style.setProperty('--shadow-heavy', theme.shadowHeavy);

  document.body.style.background = theme.bg;

  // Update color pickers
  const bgPicker = document.getElementById('color-bg');
  const primaryPicker = document.getElementById('color-primary');
  const textPicker = document.getElementById('color-text');
  if (bgPicker) bgPicker.value = theme.bg;
  if (primaryPicker) primaryPicker.value = theme.primary;
  if (textPicker) textPicker.value = theme.text;

  // Highlight active preset button
  document.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeName);
  });

  saveSettings();
}

// ── Background Image Upload ──
async function handleBgImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 1. Show immediate local preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const preview = document.getElementById('bg-image-preview');
    if (preview) {
      preview.src = dataUrl;
      preview.classList.add('visible');
    }
    // Update local bg for immediate feedback
    const bgImage = document.querySelector('.bg-image');
    if (bgImage) bgImage.style.backgroundImage = `url('${dataUrl}')`;
  };
  reader.readAsDataURL(file);

  // 2. Upload to Cloud (Firebase Storage + Firestore)
  showToast('⬆️ Uploading to cloud...');
  const cloudUrl = await uploadToCloud(file, 'background');

  if (cloudUrl) {
    showToast('✅ Background saved to cloud!');
    // No need to save to localStorage as cloud settings will load on refresh
  } else {
    // Fallback if Firebase not configured
    showToast('ℹ️ Saved locally (Cloud not configured)', 'warning');
    // Save to localStorage as fallback
    reader.onload = (e) => {
      try {
        localStorage.setItem('ayyappa_bg_image', e.target.result);
      } catch (e) {
        console.warn('Image too large for localStorage');
      }
    };
  }

  saveSettings();
}

// ── Background Opacity ──
function updateBgOpacity(value) {
  const bgImage = document.querySelector('.bg-image');
  const label = document.getElementById('bg-opacity-value');
  if (bgImage) bgImage.style.opacity = value / 100;
  if (label) label.textContent = value + '%';
  saveSettings();
}

// ── Background Size ──
function updateBgSize(value) {
  const bgImage = document.querySelector('.bg-image');
  const label = document.getElementById('bg-size-value');
  if (bgImage) {
    bgImage.style.backgroundSize = value + 'px';
  }
  if (label) label.textContent = value + 'px';
  saveSettings();
}

// ── Color Updates ──
function updateColor(type, value) {
  const root = document.documentElement;

  if (type === 'bg') {
    root.style.setProperty('--bg', value);
    document.body.style.background = value;
    // Auto-derive secondary bg
    root.style.setProperty('--bg-secondary', value);
  } else if (type === 'primary') {
    root.style.setProperty('--primary', value);
    root.style.setProperty('--primary-light', lightenColor(value, 20));
    root.style.setProperty('--primary-dark', darkenColor(value, 15));
    root.style.setProperty('--accent', lightenColor(value, 35));
  } else if (type === 'text') {
    root.style.setProperty('--text', value);
    root.style.setProperty('--text-light', lightenColor(value, 15));
    root.style.setProperty('--text-muted', lightenColor(value, 35));
  }

  // Deselect theme presets
  document.querySelectorAll('.theme-preset-btn').forEach(btn => btn.classList.remove('active'));
  saveSettings();
}

// ── Card Opacity ──
function updateCardOpacity(value) {
  const root = document.documentElement;
  const label = document.getElementById('card-opacity-value');
  const alpha = value / 100;

  // Get current bg color
  const bgColor = getComputedStyle(root).getPropertyValue('--bg').trim() || '#FFFDF5';
  const rgb = hexToRgb(bgColor);
  if (rgb) {
    root.style.setProperty('--bg-card', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
  }
  if (label) label.textContent = value + '%';
  saveSettings();
}

// ── Foreground Overlay ──
function updateOverlayColor(value) {
  const overlay = document.getElementById('foreground-overlay');
  const opacitySlider = document.getElementById('overlay-opacity-slider');
  const opacity = opacitySlider ? opacitySlider.value / 100 : 0;

  if (overlay) {
    const rgb = hexToRgb(value);
    if (rgb) {
      overlay.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }
  }
  saveSettings();
}

function updateOverlayOpacity(value) {
  const overlay = document.getElementById('foreground-overlay');
  const colorPicker = document.getElementById('color-overlay');
  const label = document.getElementById('overlay-opacity-value');
  const color = colorPicker ? colorPicker.value : '#FFFDF5';
  const opacity = value / 100;

  if (overlay) {
    const rgb = hexToRgb(color);
    if (rgb) {
      overlay.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }
  }
  if (label) label.textContent = value + '%';
  saveSettings();
}

// ── Reset Settings ──
function resetSettings() {
  localStorage.removeItem('ayyappa_settings');
  localStorage.removeItem('ayyappa_bg_image');

  // Reset all CSS variables
  const root = document.documentElement;
  root.removeAttribute('style');
  document.body.removeAttribute('style');

  // Reset background image
  const bgImage = document.querySelector('.bg-image');
  if (bgImage) {
    bgImage.style.backgroundImage = "url('ayyappa-bg.png')";
    bgImage.style.opacity = '0.08';
    bgImage.style.backgroundSize = '300px';
  }

  // Reset overlay
  const overlay = document.getElementById('foreground-overlay');
  if (overlay) overlay.style.background = 'transparent';

  // Reset preview
  const preview = document.getElementById('bg-image-preview');
  if (preview) { preview.src = ''; preview.classList.remove('visible'); }

  // Reset sliders
  const opacitySlider = document.getElementById('bg-opacity-slider');
  const sizeSlider = document.getElementById('bg-size-slider');
  const cardSlider = document.getElementById('card-opacity-slider');
  const overlaySlider = document.getElementById('overlay-opacity-slider');
  if (opacitySlider) opacitySlider.value = 8;
  if (sizeSlider) sizeSlider.value = 500;
  if (cardSlider) cardSlider.value = 88;
  if (overlaySlider) overlaySlider.value = 0;

  // Reset values
  const bgOpVal = document.getElementById('bg-opacity-value');
  const bgSzVal = document.getElementById('bg-size-value');
  const cardOpVal = document.getElementById('card-opacity-value');
  const ovOpVal = document.getElementById('overlay-opacity-value');
  if (bgOpVal) bgOpVal.textContent = '8%';
  if (bgSzVal) bgSzVal.textContent = '500px';
  if (cardOpVal) cardOpVal.textContent = '88%';
  if (ovOpVal) ovOpVal.textContent = '0%';

  // Reset color pickers
  const bgPicker = document.getElementById('color-bg');
  const primaryPicker = document.getElementById('color-primary');
  const textPicker = document.getElementById('color-text');
  const overlayPicker = document.getElementById('color-overlay');
  if (bgPicker) bgPicker.value = '#FFFDF5';
  if (primaryPicker) primaryPicker.value = '#B8860B';
  if (textPicker) textPicker.value = '#3E2723';
  if (overlayPicker) overlayPicker.value = '#FFFDF5';

  // Reset API Key
  localStorage.removeItem('ayyappa_gcp_api_key');
  GOOGLE_CLOUD_API_KEY = '';
  const gcpKeyInput = document.getElementById('gcp-api-key-input');
  if (gcpKeyInput) gcpKeyInput.value = '';

  applyTheme('divine-gold');
  showToast('Settings reset to default ✅');
}

// ── Save GCP API Key ──
function saveGcpApiKey(value) {
  GOOGLE_CLOUD_API_KEY = value.trim();
  localStorage.setItem('ayyappa_gcp_api_key', GOOGLE_CLOUD_API_KEY);
  showToast('API Key saved successfully ✅');
}

// ── Settings API URL ──
const SETTINGS_API_URL = '/api/settings/app-settings';

// ── Debounce timer for API calls (avoids spam on slider drag) ──
let _settingsSaveTimer = null;

// ── Save / Load Settings ──
function saveSettings() {
  // Build full settings object
  const settings = {
    theme:          currentTheme,
    bgOpacity:      Number(document.getElementById('bg-opacity-slider')?.value  || 8),
    bgSize:         Number(document.getElementById('bg-size-slider')?.value     || 500),
    cardOpacity:    Number(document.getElementById('card-opacity-slider')?.value|| 88),
    overlayColor:   document.getElementById('color-overlay')?.value  || '#FFFDF5',
    overlayOpacity: Number(document.getElementById('overlay-opacity-slider')?.value || 0),
    colorBg:        document.getElementById('color-bg')?.value       || '#FFFDF5',
    colorPrimary:   document.getElementById('color-primary')?.value  || '#B8860B',
    colorText:      document.getElementById('color-text')?.value     || '#3E2723'
  };

  // 1. Save instantly to localStorage (offline / fast fallback)
  try {
    localStorage.setItem('ayyappa_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }

  // 2. Debounce cloud save (300 ms) so slider drags don't spam the API
  clearTimeout(_settingsSaveTimer);
  _settingsSaveTimer = setTimeout(() => saveSettingsToCloud(settings), 300);
}

async function saveSettingsToCloud(settings) {
  try {
    const res = await fetch(SETTINGS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      console.log('✅ Settings saved to MongoDB');
    } else {
      const err = await res.json().catch(() => ({}));
      console.warn('⚠️ Settings cloud save failed:', err.error || res.status);
    }
  } catch (e) {
    // Network offline — localStorage already has the data, no action needed
    console.warn('⚠️ Settings cloud save offline:', e.message);
  }
}

// ── Apply a settings object to the UI ──
function applySettingsObject(settings) {
  if (!settings) return;

  // Theme
  if (settings.theme) applyTheme(settings.theme);

  // Background opacity
  if (settings.bgOpacity != null) {
    const s = document.getElementById('bg-opacity-slider');
    if (s) { s.value = settings.bgOpacity; updateBgOpacity(settings.bgOpacity); }
  }
  // Background size
  if (settings.bgSize != null) {
    const s = document.getElementById('bg-size-slider');
    if (s) { s.value = settings.bgSize; updateBgSize(settings.bgSize); }
  }
  // Card opacity
  if (settings.cardOpacity != null) {
    const s = document.getElementById('card-opacity-slider');
    if (s) { s.value = settings.cardOpacity; updateCardOpacity(settings.cardOpacity); }
  }
  // Overlay
  if (settings.overlayOpacity != null) {
    const s = document.getElementById('overlay-opacity-slider');
    const c = document.getElementById('color-overlay');
    if (s) s.value = settings.overlayOpacity;
    if (c && settings.overlayColor) c.value = settings.overlayColor;
    updateOverlayOpacity(settings.overlayOpacity);
  }
  // Custom colors (pickers)
  const bgPicker  = document.getElementById('color-bg');
  const priPicker = document.getElementById('color-primary');
  const txtPicker = document.getElementById('color-text');
  if (bgPicker  && settings.colorBg)      bgPicker.value  = settings.colorBg;
  if (priPicker && settings.colorPrimary) priPicker.value = settings.colorPrimary;
  if (txtPicker && settings.colorText)    txtPicker.value = settings.colorText;

  // Background image URL from cloud
  if (settings.bgUrl) {
    const bgImage = document.querySelector('.bg-image');
    if (bgImage) bgImage.style.backgroundImage = `url('${settings.bgUrl}')`;
  }
}

function loadSettings() {
  // ── Step 1: Apply localStorage immediately (instant, no flicker) ──
  try {
    const saved = localStorage.getItem('ayyappa_settings');
    if (saved) applySettingsObject(JSON.parse(saved));
  } catch (e) {
    console.warn('localStorage settings parse error:', e);
  }

  // Load bg image from localStorage
  const bgImageData = localStorage.getItem('ayyappa_bg_image');
  if (bgImageData) {
    const bgImage = document.querySelector('.bg-image');
    const preview = document.getElementById('bg-image-preview');
    if (bgImage) bgImage.style.backgroundImage = `url('${bgImageData}')`;
    if (preview) { preview.src = bgImageData; preview.classList.add('visible'); }
  }

  // Load GCP API Key (stays local only — never sent to server)
  const savedApiKey = localStorage.getItem('ayyappa_gcp_api_key');
  if (savedApiKey) {
    GOOGLE_CLOUD_API_KEY = savedApiKey;
    const keyInput = document.getElementById('gcp-api-key-input');
    if (keyInput) keyInput.value = savedApiKey;
  }

  // ── Step 2: Fetch from MongoDB in background and sync ──
  loadSettingsFromCloud();
}

async function loadSettingsFromCloud() {
  try {
    const res = await fetch(SETTINGS_API_URL, { method: 'GET' });
    if (!res.ok) {
      // 404 = no saved settings yet in DB, that's fine
      if (res.status !== 404) console.warn('⚠️ Could not load cloud settings:', res.status);
      return;
    }
    const settings = await res.json();

    // Apply cloud settings (they are the source of truth)
    applySettingsObject(settings);

    // Also sync to localStorage so next load is instant
    try {
      localStorage.setItem('ayyappa_settings', JSON.stringify({
        theme:          settings.theme,
        bgOpacity:      settings.bgOpacity,
        bgSize:         settings.bgSize,
        cardOpacity:    settings.cardOpacity,
        overlayColor:   settings.overlayColor,
        overlayOpacity: settings.overlayOpacity,
        colorBg:        settings.colorBg,
        colorPrimary:   settings.colorPrimary,
        colorText:      settings.colorText
      }));
    } catch (e) { /* ignore */ }

    console.log('✅ Settings loaded from MongoDB');
  } catch (e) {
    // Network error — already using localStorage version, no action needed
    console.warn('⚠️ Could not reach settings API (using local):', e.message);
  }
}

// ── Color Utility Functions ──
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return isNaN(r) ? null : { r, g, b };
}

function lightenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, rgb.r + Math.round((255 - rgb.r) * percent / 100));
  const g = Math.min(255, rgb.g + Math.round((255 - rgb.g) * percent / 100));
  const b = Math.min(255, rgb.b + Math.round((255 - rgb.b) * percent / 100));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, rgb.r - Math.round(rgb.r * percent / 100));
  const g = Math.max(0, rgb.g - Math.round(rgb.g * percent / 100));
  const b = Math.max(0, rgb.b - Math.round(rgb.b * percent / 100));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ── Load settings on page load ──
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadSettings, 100);
});
