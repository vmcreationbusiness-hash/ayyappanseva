// ═══════════════════════════════════════════════════════════
//  SWAMI AYYAPPA TEMPLE - OFFERING APP
//  Main Application Logic
// ═══════════════════════════════════════════════════════════

// ── State ──
const state = {
  language: 'en',
  service: null,
  cart: [],
  invoiceNo: null,
  nextId: 1,
  config: {
    upiId: "temple@upi",
    merchantName: "Swami Ayyappa Temple",
    services: [], // Default empty, populated from Mongo
    voiceEngine: 'web',
    sarvamKey: '',
    googleKey: '',
    openaiKey: '',
    reverieKey: '',
    reverieAppId: ''
  },
  recentOrders: []
};

const SARVAM_LANG_CODES = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'gu': 'gu-IN',
  'mr': 'mr-IN',
  'pa': 'pa-IN',
  'bn': 'bn-IN',
  'or': 'or-IN'
};

// ── Constants ──
const PRICE_PER_ITEM = 10;
const UPI_ID = "temple@upi"; // Replace with actual UPI ID
const MERCHANT_NAME = "Swami Ayyappa Temple";

// ── API Configuration ──
const ORDERS_API_URL = '/api/orders';
const SETTINGS_API_URL = '/api/settings/dashboard';

// ── DOM Ready ──
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Load saved language or default to English
  const savedLang = localStorage.getItem('ayyappa_lang');
  state.language = savedLang && TRANSLATIONS[savedLang] ? savedLang : 'en';

  loadConfigAndServices().then(() => {
    // Set default service: Archana
    const archana = state.config.services.find(s => s.id === 'archana') || 
                    { id: 'archana', name: t('archana'), price: 10, icon: '🪷' };
    state.service = archana;
    renderNavbar();
    renderDashboard();
  });
  loadSettings();
  setupVoiceOverlay();
}

function renderNavbar() {
  const langContainer = document.getElementById('top-lang-selector');
  const actionContainer = document.getElementById('menu-actions');
  const titleEl = document.getElementById('menu-title');
  if(!langContainer || !actionContainer) return;

  // 1. Render Language Selector
  const langs = [
    { code: 'en', name: 'English' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'മലയാളം' }
  ];
  langContainer.innerHTML = langs.map(l => `
    <div class="lang-badge ${state.language === l.code ? 'active' : ''}" 
         onclick="setLanguage('${l.code}')">
      ${l.name}
    </div>
  `).join('');

  // 2. Render Contextual Actions
  const activeScreen = document.querySelector('.screen.active');
  const screenId = activeScreen ? activeScreen.id : 'screen-dashboard';
  
  let actionsHtml = '';
  
  if (screenId === 'screen-dashboard') {
    actionsHtml = `
      <button class="btn-menu" onclick="renderOrdersScreen()">
        📋 <span>${t('orderHistory')}</span>
      </button>
    `;
  } else if (screenId === 'screen-orders') {
    actionsHtml = `
      <button class="btn-menu" onclick="renderDashboard()">
        🏠 <span>${t('backToHome')}</span>
      </button>
    `;
  }

  // Always add Voice and Settings buttons
  actionsHtml += `
    <button class="btn-menu settings-btn" onclick="toggleSettings()" title="Settings">
      ⚙️
    </button>
  `;
  
  actionContainer.innerHTML = actionsHtml;
  
  // 3. Update Title if needed
  if (titleEl) {
     if (screenId === 'screen-orders') titleEl.textContent = t('orderHistory');
     else {
        const isDefault = !state.config.merchantName || state.config.merchantName === "Swami Ayyappa Temple";
        titleEl.textContent = isDefault ? t('welcome') : state.config.merchantName;
     }
  }
}

function setLanguage(lang) {
  state.language = lang;
  renderNavbar();
  
  // Re-render current screen
  const activeScreen = document.querySelector('.screen.active');
  if (activeScreen) {
  // Re-render UI
  const activeScreen = document.querySelector('.screen.active');
  if (activeScreen) {
    if (activeScreen.id === 'screen-dashboard') renderDashboard();
    else if (activeScreen.id === 'screen-orders') renderOrdersScreen();
  }
  }
  
  renderSettingsOfferings();
  showToast(TRANSLATIONS[lang].langName + ' settings applied');
  
  // Save preference
  localStorage.setItem('ayyappa_lang', lang);
  
  // Voice confirmation
  const msg = t('langChanged');
  speak(msg);
}

// ── Utility Functions ──
// Translate with current state language
function t(key) {
  const lang = state.language || 'en';
  if (!TRANSLATIONS[lang]) return key;
  return TRANSLATIONS[lang][key] || key;
}

// Translate specifically to English (used for Invoice & Cart Display as requested)
function enT(key) {
  if (!TRANSLATIONS['en']) return key;
  return TRANSLATIONS['en'][key] || key;
}

/**
 * Returns the English name for a star, regardless of input language.
 */
function getEnglishStarName(starName) {
  if (!starName) return "";
  // Search through all languages
  for (const lang in NAKSHATRAS) {
    const list = NAKSHATRAS[lang];
    const idx = list.indexOf(starName);
    if (idx >= 0) return NAKSHATRAS.en[idx];
  }
  return starName;
}

function getNakshatras() {
  return NAKSHATRAS[state.language] || NAKSHATRAS.en;
}

/**
 * Searches for a star name across ALL languages defined in NAKSHATRAS.
 * Returns the index (0-26) if found, else -1.
 */
function findNakshatraIndexUniversal(transcript) {
  if (!transcript) return -1;
  
  // Try matching against each language's nakshatra list
  for (const lang in NAKSHATRAS) {
    const list = NAKSHATRAS[lang];
    const matchIdx = findBestMatch(transcript, list);
    if (matchIdx >= 0) {
      console.log(`🎯 Universal Match: "${transcript}" -> ${list[matchIdx]} (${lang}) at index ${matchIdx}`);
      return matchIdx;
    }
  }
  return -1;
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
  const day = now.getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const timeStr = hours.toString().padStart(2, '0') + ':' + minutes + ' ' + ampm;
  
  return `${day} ${month} ${year} at ${timeStr}`;
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
  renderNavbar();
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
//  SCREEN 1: SERVICE SELECTION (LANDING PAGE)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  SINGLE PAGE UNIFIED DASHBOARD
// ═══════════════════════════════════════════════════════════

function renderDashboard() {
  const container = document.getElementById('screen-dashboard');
  if (!container) return;

  const services = state.config.services.length > 0 ? state.config.services : [
    { id: 'archana', name: t('archana'), price: 10, icon: '🪷', details: t('archanaDesc') },
    { id: 'gheeVizhaku', name: t('gheeVizhaku'), price: 50, icon: '🪔', details: t('gheeVizhakuDesc') },
    { id: 'coconutVizhaku', name: t('coconutVizhaku'), price: 30, icon: '🥥', details: t('coconutVizhakuDesc') }
  ];

  const nakshatras = getNakshatras();
  const nakshatraOptions = nakshatras.map(n => `<option value="${n}">${n}</option>`).join('');
  const total = state.cart.reduce((sum, item) => sum + item.price, 0);

  container.innerHTML = `
    <div class="dashboard-wrapper">
      <div class="dashboard-container">
      
      <!-- Col 1: Services -->
      <div class="dash-col services-sidebar" style="flex: 0 0 240px;">
        <div class="cart-sidebar-title">🕉️ ${t('selectService')}</div>
        <div class="cart-items-scroll" style="padding:0;">
          ${services.map(s => `
            <div class="dash-service-item ${state.service && state.service.id === s.id ? 'active' : ''}" 
                 onclick="selectServiceById('${s.id}')">
              <div class="icon">${s.icon}</div>
              <div class="info">
                <div class="name">${t(s.id) || s.name}</div>
                <div class="price">₹${s.price}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Col 2: Form Area -->
      <div class="dash-col entry-area">
        <div style="max-width:600px; margin:0 auto;">
          <div class="temple-header" style="margin-bottom:20px;">
            <div class="temple-icon" style="font-size:42px; margin-bottom:8px;">🕉️</div>
            <h1 style="color:var(--primary-dark);">${t('welcome')}</h1>
            <p style="opacity:0.8;">${t('subtitle')}</p>
          </div>

          <button class="voice-order-btn" style="width:100%; margin-bottom:15px; margin-top:0;" onclick="startVoiceOrderFlow()">
            🎤 ${t('voiceOrder')} (Quick Add)
          </button>

          <div class="form-card">
            <div style="text-align:center; margin-bottom:15px;">
              <div class="current-service-badge" style="font-size:1.1rem; padding:10px 24px;">
                ${state.service ? state.service.icon + ' ' + (t(state.service.id) || state.service.name) : 'Select Service'} — ₹${state.service ? state.service.price : '0'}
              </div>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
              <label style="display:block; margin-bottom:5px; font-weight:600;">${t('devoteeName')}</label>
              <div class="input-wrapper">
                <input type="text" id="devotee-name" placeholder="${t('enterName')}" autocomplete="off" style="width:100%; padding:12px;">
                <button class="btn-voice" onclick="startVoiceInput('name')">🎤</button>
              </div>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
              <label style="display:block; margin-bottom:5px; font-weight:600;">${t('selectStar')}</label>
              <div class="input-wrapper">
                <select id="devotee-star" style="width:100%; padding:12px;">
                  <option value="">${t('chooseStar')}</option>
                  ${nakshatraOptions}
                </select>
                <button class="btn-voice" onclick="startVoiceInput('star')">🎤</button>
              </div>
            </div>

            <button class="btn btn-primary btn-full" style="padding:15px; font-size:1.1rem; margin-top:10px; width:100%;" onclick="addDevoteeToCart()">
              ➕ ${t('addToCart')}
            </button>
          </div>
        </div>
      </div>

      <!-- Col 3: Sidebar Checkout -->
      <div class="dash-col checkout-sidebar" style="flex: 0 0 340px;">
        <div class="cart-sidebar-title">🛒 ${t('cart')}</div>
        <div class="cart-items-scroll">
          ${state.cart.length === 0 ? `
            <div style="text-align:center; padding:40px 0; color:var(--text-muted); opacity:0.5;">
              <div style="font-size:40px;">🛍️</div>
              <p>Empty</p>
            </div>
          ` : state.cart.map(item => `
            <div class="cart-item" style="padding:10px; margin-bottom:8px;">
              <div class="cart-item-info">
                <div class="cart-item-name" style="font-weight:700; font-size:0.9rem;">${item.name}</div>
                <div class="cart-item-detail" style="font-size:0.75rem;">${item.serviceIcon} ${t(item.service) || item.serviceName} • ${item.star}</div>
              </div>
              <div style="text-align:right; display:flex; flex-direction:column; gap:4px;">
                <div class="cart-item-price" style="font-weight:800; font-size:0.85rem;">₹${item.price}</div>
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                   <button onclick="editDevotee(${item.id})" style="color:var(--primary); font-size:0.7rem; background:none; border:none; cursor:pointer; font-weight:700;">Edit</button>
                   <button onclick="removeDevotee(${item.id})" style="color:red; font-size:0.7rem; background:none; border:none; cursor:pointer; font-weight:700;">Clear</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="payment-wrapper" style="padding:10px; border-top:1px solid var(--border); background:white;">
          ${state.cart.length > 0 ? `
            <div class="cart-sidebar-total" style="display:flex; justify-content:space-between; margin-bottom:5px; padding:8px 12px; background:var(--bg-secondary); border-radius:10px;">
              <span style="font-weight:700; font-size:0.8rem;">Subtotal</span>
              <span style="font-weight:800; color:var(--secondary); font-size:1.1rem;">₹${total}</span>
            </div>
            ${renderPaymentSection(total)}
          ` : `
            <div style="height:200px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); border:2px dashed #eee; border-radius:12px;">
              <p>Add services to proceed</p>
            </div>
          `}
        </div>
      </div>
      </div>
    </div>
  `;
  showScreen('screen-dashboard');
}

function selectServiceById(id) {
  const services = state.config.services.length > 0 ? state.config.services : [
    { id: 'archana', name: t('archana'), price: 10, icon: '🪷', details: t('archanaDesc') },
    { id: 'gheeVizhaku', name: t('gheeVizhaku'), price: 50, icon: '🪔', details: t('gheeVizhakuDesc') },
    { id: 'coconutVizhaku', name: t('coconutVizhaku'), price: 30, icon: '🥥', details: t('coconutVizhakuDesc') }
  ];
  const service = services.find(s => s.id === id);
  if (service) selectService(service);
}

function selectService(serviceObj) {
  state.service = serviceObj;
  renderDashboard();
  
  // Mobile UX: Scroll to form when service selected
  if (window.innerWidth <= 950) {
    const container = document.querySelector('.dashboard-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ═══════════════════════════════════════════════════════════
//  SCREEN 2: DEVOTEE DETAILS & PAYMENT (SINGLE PAGE)
// ═══════════════════════════════════════════════════════════
function renderDashboardScreenFallback() {
  // This replaces renderEntryScreen
}

function renderPaymentSection(total) {
  const upiId = state.config.upiId || 'temple@upi';
  const merch = state.config.merchantName || 'Swami Ayyappa Temple';
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merch)}&am=${total}&cu=INR&tn=${encodeURIComponent('Offering')}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${encodeURIComponent(upiLink)}`;

  return `
    <div class="form-card" style="text-align:center; height:auto; display:flex; flex-direction:column; justify-content:center; padding:4px; margin-top:2px; max-width:260px; margin-left:auto; margin-right:auto; box-shadow:none; border:none;">
       <div>
         <h4 style="margin-bottom:3px; color:var(--primary-dark); font-size:0.65rem; opacity:0.8;">Secure UPI Payment</h4>
         <div class="upi-qr" style="max-width:50px; margin:0 auto; border:1px solid var(--border-light); padding:2px; background:white; border-radius:4px;">
            <img src="${qrUrl}" alt="QR" style="width:100%; height:100%; display:block;">
         </div>
         <div style="margin-top:2px; font-size:0.6rem; font-weight:600; color:var(--text-muted); opacity:0.6;">${upiId}</div>
       </div>
       <button class="btn btn-success btn-full" onclick="generateInvoiceAndPrint()" style="margin-top:5px; padding:8px; font-size:0.85rem; border-radius:10px;">
         💳 Pay & Print Invoice
       </button>
    </div>
  `;
}

function addDevoteeToCart() {
  const nameEl = document.getElementById('devotee-name');
  const starEl = document.getElementById('devotee-star');
  if (!nameEl || !starEl) return;

  const name = nameEl.value.trim();
  const star = starEl.value;
  const starIdx = starEl.selectedIndex;
  const starEn = (starIdx > 0) ? NAKSHATRAS.en[starIdx - 1] : star;

  if (!state.service) {
    showToast('Select a service first', 'error');
    return;
  }
  if(!name || !star) {
    showToast('Name and Star required', 'error');
    return;
  }
  state.cart.push({
    id: state.nextId++,
    service: state.service.id,
    serviceName: state.service.name,
    serviceEn: enT(state.service.id) || state.service.name,
    serviceIcon: state.service.icon,
    name: name,
    star: star,
    starEn: starEn,
    price: state.service.price
  });

  // Reset fields
  nameEl.value = '';
  starEl.value = '';
  
  renderDashboard();
  showToast(t('confirmAdd'));
}

function removeDevotee(id) {
  state.cart = state.cart.filter(c => c.id !== id);
  renderDashboard();
}

function editDevotee(id) {
  const item = state.cart.find(c => c.id === id);
  if (!item) return;

  // 1. Set current service to this item's service
  const serviceObj = state.config.services.find(s => s.id === item.service) || 
                    { id: item.service, name: item.serviceName, price: item.price, icon: item.serviceIcon };
  state.service = serviceObj;

  // 2. Remove from cart (user will "re-add" it after editing)
  state.cart = state.cart.filter(c => c.id !== id);

  // 3. Render and Populate Form
  renderDashboard();
  
  const nameEl = document.getElementById('devotee-name');
  const starEl = document.getElementById('devotee-star');

  if (nameEl) nameEl.value = item.name;
  
  // Multilingual safe restore for star:
  if (starEl) {
    const nakshatras = getNakshatras();
    const idx = NAKSHATRAS.en.indexOf(item.starEn);
    if (idx !== -1) {
       starEl.value = nakshatras[idx];
    } else {
       starEl.value = item.star;
    }
  }
  
  showToast('Devotee details loaded for editing', 'success');
}

async function generateInvoiceAndPrint() {
  if (state.cart.length === 0) {
    showToast('Add items to the cart first', 'error');
    return;
  }
  
  showToast('Processing Payment...', 'success');
  
  let orderData = null;
  try {
    state.invoiceNo = generateInvoiceNo();
    const date = formatDate();
    orderData = {
      invoiceNo: state.invoiceNo,
      date: date,
      items: [...state.cart], // ensure a fresh copy
      totalAmount: state.cart.reduce((s,i)=>s+i.price,0),
      paymentStatus: 'paid'
    };
    
    await saveOrder(orderData);
    showInvoiceModal(orderData);
    state.cart = []; // Clear only after modal is primed
    renderCartScreen();
    showToast('Payment Successful! Receipt Generated ✅');
  } catch (e) {
    console.error('Invoice Error:', e);
    showToast(`Cloud Sync Error: ${e.message || 'Database connection problem'}. Printing receipt locally...`, 'error');
    if (orderData) {
       showInvoiceModal(orderData);
    } else {
       showToast('Could not generate receipt: No data', 'error');
    }
  }
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
//  SCREEN 3: INVOICE & PRINT
// ═══════════════════════════════════════════════════════════
function showInvoiceModal(historicalOrder = null) {
  const items = historicalOrder ? historicalOrder.items : state.cart;
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const date = historicalOrder ? historicalOrder.date : formatDate();
  const invoiceNo = historicalOrder ? historicalOrder.invoiceNo : state.invoiceNo;

  const rows = items.map((item, idx) => `
    <tr>
      <td style="padding:6px;">${idx + 1}</td>
      <td style="padding:6px;">${item.serviceIcon} ${item.serviceEn || item.serviceName}</td>
      <td style="padding:6px;">${item.name}</td>
      <td style="padding:6px;">${item.starEn || getEnglishStarName(item.star)}</td>
      <td style="padding:6px; text-align:right">₹${item.price}</td>
    </tr>
  `).join('');

  const modalOverlay = document.getElementById('invoice-modal-overlay');
  const modalContent = document.getElementById('invoice-modal-content');

  if (!modalOverlay || !modalContent) return;

  modalContent.innerHTML = `
    <div class="invoice-container" style="max-width:100%; padding:0; font-size: 12px;">
      <div class="invoice-card" id="invoice-content" style="box-shadow:none; border:none; padding:10px; line-height: 1.4;">
        <div class="invoice-header" style="text-align:center; border-bottom:1px solid var(--primary); padding-bottom:8px; margin-bottom:12px;">
          <div class="temple-icon" style="font-size:24px; margin-bottom:4px;">🙏</div>
          <h2 class="invoice-title" style="margin:0; font-family:'Cinzel', serif; color:var(--primary); font-size:1rem; font-weight:700;">Swami Ayyappa Temple - Offering Invoice</h2>
          <div class="temple-sub" style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">Sabarimala Sannidhanam Online</div>
        </div>

        <div class="invoice-meta" style="margin-bottom:12px; border-top:1px solid var(--border); border-bottom:1px solid var(--border); padding:4px 0;">
          <div style="padding:4px 0; border-bottom:1px dashed var(--border); text-align:left;">
            <div style="font-size:0.65rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Invoice No</div>
            <div style="font-size:0.95rem; font-weight:800; color:var(--primary);">${invoiceNo}</div>
          </div>
          <div style="padding:4px 0; text-align:left;">
            <div style="font-size:0.65rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Date</div>
            <div style="font-size:0.85rem; font-weight:600;">${date}</div>
          </div>
        </div>

        <table class="invoice-table" style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:11px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border); background:var(--bg-secondary);">
              <th style="padding:4px; text-align:left; font-weight:800;">SL.NO</th>
              <th style="padding:4px; text-align:left; font-weight:800;">SERVICE</th>
              <th style="padding:4px; text-align:left; font-weight:800;">NAME</th>
              <th style="padding:4px; text-align:left; font-weight:800;">STAR</th>
              <th style="padding:4px; text-align:right; font-weight:800;">PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center; padding:8px;">No records found</td></tr>'}
          </tbody>
        </table>

        <div class="invoice-total" style="padding:8px 0; border-top:1px solid var(--primary); text-align:right;">
          <div class="total-text" style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Grand Total (Paid)</div>
          <div class="total-amount" style="font-size:1.4rem; font-weight:900; color:var(--secondary); margin-top:2px;">₹${total}</div>
        </div>
      </div>

      <div class="btn-group no-print" style="margin-top:12px; display:flex; gap:10px; width:100%;">
        <button class="btn btn-primary" onclick="window.print()" style="flex:1; padding:10px; font-size:0.85rem; justify-content:center;">
          🖨️ Print Receipt
        </button>
        <button class="btn btn-secondary" onclick="closeInvoiceModal()" style="flex:1; padding:10px; font-size:0.85rem; justify-content:center;">
          🏠 Back to Home
        </button>
      </div>
    </div>
  `;
  modalOverlay.classList.add('active');
  if (!historicalOrder) {
    showToast('Order Processed Successfully ✅');
  }
}

function closeInvoiceModal() {
  const modalOverlay = document.getElementById('invoice-modal-overlay');
  if (modalOverlay) modalOverlay.classList.remove('active');
  
  // If we were in the middle of a checkout (cart not empty), clear and reset
  if (state.cart.length > 0) {
    state.cart = [];
    state.invoiceNo = null;
    renderDashboard();
  }
}

function resetFlow() {
  state.cart = [];
  state.invoiceNo = null;
  renderDashboard();
}

function printInvoice() {
  window.print();
}

function startNewOrder() {
  state.cart = [];
  state.invoiceNo = null;
  state.nextId = 1;
  renderDashboard();
}

// ═══════════════════════════════════════════════════════════
//  SCREEN 6: ORDERS HISTORY
// ═══════════════════════════════════════════════════════════
async function renderOrdersScreen() {
  const screen = document.getElementById('screen-orders');

  // Show loading state
  screen.innerHTML = `
    <div class="screen-main">
      <div style="flex:1; display:flex; align-items:center; justify-content:center;">
        <div style="text-align:center; color:var(--text-muted);">
          <div style="font-size:40px; margin-bottom:12px;">⏳</div>
          <p>${enT('loading')}...</p>
        </div>
      </div>
    </div>
  `;
  showScreen('screen-orders');

  // Fetch orders
  const orders = await getOrders(100);
  state.recentOrders = orders; // Cache for re-printing

  // Calculate summary
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalItems = orders.reduce((sum, o) => sum + (o.itemCount || 0), 0);

  let ordersContent = '';
  if (orders.length === 0) {
    ordersContent = `
      <div class="cart-empty">
        <div class="empty-icon">📋</div>
        <p>${enT('noOrders')}</p>
      </div>
    `;
  } else {
    const orderRows = orders.map((order, idx) => {
      const itemsList = (order.items || []).map(item =>
        `<div style="font-size:0.85rem; color:var(--text-light); padding:2px 0;">
          ${item.serviceIcon || '🕉️'} ${item.name} — ${item.starEn || getEnglishStarName(item.star)} (${item.serviceEn || item.serviceName})
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
          <td>
            <button class="btn btn-primary" style="padding:6px 12px; font-size:0.75rem;" onclick="showInvoiceModal(state.recentOrders[${idx}])">
              🖨️ Re-print
            </button>
          </td>
        </tr>
      `;
    }).join('');

    ordersContent = `
      <div class="orders-summary">
        <div class="summary-card">
          <div class="summary-icon">📋</div>
          <div class="summary-value">${totalOrders}</div>
          <div class="summary-label">${enT('totalOrders')}</div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">🙏</div>
          <div class="summary-value">${totalItems}</div>
          <div class="summary-label">${enT('totalOfferings')}</div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">💰</div>
          <div class="summary-value">₹${totalRevenue}</div>
          <div class="summary-label">${enT('totalRevenue')}</div>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="cart-table orders-table">
          <thead>
            <tr>
              <th>${enT('srNo')}</th>
              <th>${enT('invoiceNo')}</th>
              <th>${enT('offerings')}</th>
              <th>${enT('items')}</th>
              <th style="text-align:right;">${enT('amount')}</th>
              <th>${enT('status')}</th>
              <th>${enT('actions')}</th>
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
    <div class="screen-main">
      <div style="text-align:center; padding: 15px 0 10px 0;">
        <h1 style="color:var(--primary-dark); font-size:1.3rem; margin:0; letter-spacing:0.5px;">${t('orderHistory')}</h1>
      </div>
      <div class="cart-container" style="max-width:1000px;">
        <div class="cart-card">
          ${ordersContent}
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
//  VOICE RECOGNITION & SYNTHESIS (Sarvam.ai Powered)
// ═══════════════════════════════════════════════════════════

// Check support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

// ── Voice Engine API Keys ──
let SARVAM_API_KEY = '';
let GOOGLE_API_KEY = '';
let OPENAI_API_KEY = '';
let REVERIE_API_KEY = '';
let REVERIE_APP_ID = '';
let mediaRecorder = null;

// Sarvam.ai language codes and voices are now defined at top of file.
const SARVAM_VOICES = {
  en: 'arya',
  ta: 'arya',
  te: 'arya',
  ml: 'arya',
  kn: 'arya'
};


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
  'kn': ['Google ಕನ್ನಡ', 'Google Kannada', 'Microsoft Sapna', 'Sapna', 'Kannada', 'ಕನ್ನಡ'],
  'en': ['Google US English', 'Google UK English Female', 'Google India English', 'Microsoft Ravi', 'Microsoft Heera', 'Ravi', 'Heera', 'English India']
};

// Speech rate per language for natural pronunciation
const SPEECH_RATE = {
  'en': 0.95,
  'ta': 0.85,
  'te': 0.85,
  'ml': 0.82,
  'kn': 0.85
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

// ── Sarvam TTS Audio Player ──
let _sarvamAudioPlayer = null;

async function speak(text) {
  // Clear any existing browser speech to avoid overlap
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  
  const engine = state.config.voiceEngine || 'web';
  
  try {
    if (engine === 'openai' && OPENAI_API_KEY) {
      const audio = await speakWithOpenAI(text);
      if (audio) {
        return new Promise((resolve) => {
            audio.onended = () => resolve(audio);
            // Safety timeout
            setTimeout(() => resolve(audio), 8000);
        });
      }
    } else if (engine === 'google' && GOOGLE_API_KEY) {
      const audio = await speakWithGoogle(text);
      if (audio) {
        return new Promise((resolve) => {
            audio.onended = () => resolve(audio);
            setTimeout(() => resolve(audio), 8000);
        });
      }
    } else if (engine === 'sarvam' && SARVAM_API_KEY) {
      const audio = await speakWithSarvam(text);
      if (audio) {
        return new Promise((resolve) => {
            audio.onended = () => resolve(audio);
            setTimeout(() => resolve(audio), 8000);
        });
      }
    }
  } catch (e) {
    console.warn(`TTS engine ${engine} failed, falling back to browser:`, e.message);
  }

  // Fallback to browser speechSynthesis
  const utterance = speakWithBrowser(text);
  if (utterance) {
      return new Promise((resolve) => {
          utterance.onend = () => resolve(null);
          utterance.onerror = () => resolve(null);
          setTimeout(resolve, 8000);
      });
  }
  return null;
}

async function speakWithSarvam(text) {
  try {
    const langCode = SARVAM_LANG_CODES[state.language] || 'en-IN';
    const speaker = state.config.sarvamVoice || SARVAM_VOICES[state.language] || 'arya';

    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_API_KEY
      },
      body: JSON.stringify({
        text: text,
        target_language_code: langCode,
        speaker: speaker,
        model: 'bulbul:v3',
        pace: 1.0
      })
    });

    if (!res.ok) {
      console.warn('Sarvam TTS API call failed');
      return null; // Let the caller handle fallback
    }

    const data = await res.json();
    const audioData = (data.audios && data.audios[0]) || data.audio_content;
    
    if (audioData) {
      if (_sarvamAudioPlayer) {
        _sarvamAudioPlayer.pause();
        _sarvamAudioPlayer = null;
      }
      _sarvamAudioPlayer = new Audio('data:audio/wav;base64,' + audioData);
      
      // Integrate bot-speaking visual state
      _sarvamAudioPlayer.addEventListener('play', () => document.body.classList.add('bot-speaking'));
      _sarvamAudioPlayer.addEventListener('ended', () => document.body.classList.remove('bot-speaking'));
      _sarvamAudioPlayer.addEventListener('pause', () => document.body.classList.remove('bot-speaking'));
      
      _sarvamAudioPlayer.play();
      return _sarvamAudioPlayer;
    }
    return null;
  } catch (e) {
    console.warn('Sarvam TTS error:', e.message);
    return null;
  }
}

async function speakWithOpenAI(text) {
  try {
    const voice = state.config.openaiVoice || 'alloy';
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice
      })
    });
    if (!res.ok) throw new Error('OpenAI TTS failed: ' + res.status);
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); document.body.classList.remove('bot-speaking'); };
    audio.onerror = () => { URL.revokeObjectURL(url); document.body.classList.remove('bot-speaking'); };
    _sarvamAudioPlayer = audio; 
    
    _sarvamAudioPlayer.addEventListener('play', () => document.body.classList.add('bot-speaking'));
    await audio.play();
    return audio;
  } catch(e) { console.warn('OpenAI TTS error:', e.message); return null; }
}

async function speakWithGoogle(text) {
  try {
    const voice = state.config.googleVoice || 'en-IN-Wavenet-A';
    const langCode = voice.substring(0, 5) || 'en-IN';
    
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text },
        voice: { languageCode: langCode, name: voice },
        audioConfig: { audioEncoding: 'MP3' }
      })
    });
    
    if (!res.ok) throw new Error('Google TTS failed: ' + res.status);
    const data = await res.json();
    if (!data.audioContent) throw new Error('No audio content');
    
    const binaryString = atob(data.audioContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); document.body.classList.remove('bot-speaking'); };
    audio.onerror = () => { URL.revokeObjectURL(url); document.body.classList.remove('bot-speaking'); };
    _sarvamAudioPlayer = audio;
    
    _sarvamAudioPlayer.addEventListener('play', () => document.body.classList.add('bot-speaking'));
    await audio.play();
    return audio;
  } catch(e) { console.warn('Google TTS error:', e.message); return null; }
}

async function startVoiceOrderFlow() {
  if (!SpeechRecognition && !SARVAM_API_KEY) {
    showToast('Voice Recognition requires a Sarvam API Key. Please update Settings.', 'error');
    toggleSettings(); // Open settings for them
    return;
  }

  // Ensure we are on offering screen
  const dashboard = document.getElementById('screen-dashboard');
  if (!dashboard || !dashboard.classList.contains('active')) {
    if (typeof showScreen === 'function') showScreen('screen-dashboard');
  }

  // Pre-request microphone immediately on user interaction to avoid browser block
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      stream.getTracks().forEach(t => t.stop());
    }
  } catch (err) {
    showToast('Microphone permission required', 'error');
    return;
  }

  const overlay = document.getElementById('voice-overlay');
  const statusEl = document.getElementById('voice-status');
  const promptEl = document.getElementById('voice-prompt');
  const resultEl = document.getElementById('voice-result');

  overlay.classList.add('active');
  resultEl.textContent = '';
  
  try {
    // 1. Ask for Name
    statusEl.textContent = t('voiceSpeaking');
    promptEl.textContent = t('voicePromptName');
    await speakAndWait(t('voicePromptName'));
    
    statusEl.textContent = t('voiceListening');
    const name = await listenForSpeech();
    
    if (!name) {
      statusEl.textContent = '❌ No name detected';
      setTimeout(() => closeVoiceOverlay(), 1200);
      return;
    }
    
    document.getElementById('devotee-name').value = name;
    statusEl.textContent = `${t('voiceConfirmName')}: ${name}`;
    await speakAndWait(`${t('voiceConfirmName')} ${name}`);

    // 2. Ask for Star - with retry loop
    let starRecognized = false;
    let attempts = 0;
    while (!starRecognized && attempts < 3) {
      statusEl.textContent = t('voiceSpeaking');
      resultEl.textContent = ''; // Clear previous transcript
      promptEl.textContent = attempts === 0 ? t('voicePromptStar') : t('voiceRetryStar');
      await speakAndWait(promptEl.textContent);
      
      statusEl.textContent = t('voiceListening');
      const starInput = await listenForSpeech();
      
      if (starInput) {
        const matchedIndex = findNakshatraIndexUniversal(starInput);
        if (matchedIndex >= 0) {
          const nakshatrasInCurrentLang = getNakshatras();
          const starName = nakshatrasInCurrentLang[matchedIndex];
          document.getElementById('devotee-star').value = starName;
          statusEl.textContent = `${t('voiceConfirmStar')}: ${starName}`;
          await speakAndWait(`${t('voiceConfirmStar')} ${starName}`);
          
          starRecognized = true;
          // 3. Auto Add to Cart
          addDevoteeToCart();
          statusEl.textContent = '✅ Added to Cart';
          await speakAndWait(t('confirmAdd'));
          closeVoiceOverlay(); // Close immediately on success
          return;
        } else {
          statusEl.textContent = t('voiceStarNotRecognized');
          await speakAndWait(t('voiceStarNotRecognized'));
          attempts++;
        }
      } else {
        attempts++;
      }
    }

    if (!starRecognized) {
      statusEl.textContent = '❌ Could not recognize star';
      setTimeout(() => closeVoiceOverlay(), 1500);
    }
  } catch (e) {
    console.error('Voice Order Flow Error:', e);
    statusEl.textContent = '❌ Error occurred';
    closeVoiceOverlay();
  }
}

function speakWithBrowser(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = 1.0; // MAX Volume for crowded places
  const langCode = LANG_CODES[state.language] || 'en-IN';
  utterance.lang = langCode;
  
  // Make voice "Bot Type"
  utterance.rate = 1.0;
  utterance.pitch = 0.5; // Lower, flatter pitch for machine/bot voice
  
  // Integrate bot-speaking visual state
  utterance.addEventListener('start', () => document.body.classList.add('bot-speaking'));
  utterance.addEventListener('end', () => document.body.classList.remove('bot-speaking'));
  utterance.addEventListener('error', () => document.body.classList.remove('bot-speaking'));

  const bestVoice = getBestVoice(langCode);
  if (bestVoice) utterance.voice = bestVoice;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

async function startVoiceInput(field) {
  // Global UX Fix: Always ensure we are on the dashboard before starting voice
  const activeScreen = document.querySelector('.screen.active');
  if (!activeScreen || activeScreen.id !== 'screen-dashboard') {
    if (typeof renderDashboard === 'function') renderDashboard();
  }

  if (!SpeechRecognition && !SARVAM_API_KEY) {
    showToast('Voice Recognition requires a Sarvam API Key. Please update Settings.', 'error');
    toggleSettings();
    return;
  }

  const overlay = document.getElementById('voice-overlay');
  const statusEl = document.getElementById('voice-status');
  const promptEl = document.getElementById('voice-prompt');
  const resultEl = document.getElementById('voice-result');

  // Pre-request microphone permission
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      s.getTracks().forEach(t => t.stop());
    }
  } catch(e) {
    showToast('Microphone permission required', 'error');
    return;
  }

  statusEl.textContent = t('voiceListening');
  promptEl.textContent = field === 'name' ? t('voicePromptName') : t('voicePromptStar');
  resultEl.textContent = '';

  overlay.classList.add('active');

  // Speak the prompt first, then start listening
  const prompt = field === 'name' ? t('voicePromptName') : t('voicePromptStar');

  try {
    statusEl.textContent = t('voiceSpeaking') || 'Speaking...';
    const utterance = await speak(prompt);

    // If browser TTS returned an utterance, wait for it to finish
    if (utterance && utterance instanceof SpeechSynthesisUtterance) {
      await new Promise(resolve => {
        utterance.onend = resolve;
        utterance.onerror = resolve;
        setTimeout(resolve, 5000); // Safety timeout
      });
    }
    // If Sarvam returned an Audio element, wait for it to finish
    else if (utterance && utterance instanceof Audio) {
      await new Promise(resolve => {
        utterance.onended = resolve;
        utterance.onerror = resolve;
        setTimeout(resolve, 8000); // Safety timeout
      });
    }
    // Small pause before listening
    await new Promise(r => setTimeout(r, 300));
  } catch(e) {
    console.warn('TTS prompt failed:', e);
  }

  // Now start listening
  statusEl.textContent = t('voiceListening');
  beginRecognition(field);
}

async function beginRecognition(field) {
  if (isListening) return;

  const statusEl = document.getElementById('voice-status');
  const resultEl = document.getElementById('voice-result');

  try {
    const result = await listenForSpeech();
    
    if (result && result.trim()) {
      if (resultEl) resultEl.textContent = result;
      
      if (field === 'name') {
        const nameInput = document.getElementById('devotee-name');
        if (nameInput) nameInput.value = result.trim();
        statusEl.textContent = `✅ Name: ${result.trim()}`;
      } else if (field === 'star') {
        const matchedIndex = findNakshatraIndexUniversal(result);
        if (matchedIndex >= 0) {
          const nakshatrasInCurrentLang = getNakshatras();
          const starName = nakshatrasInCurrentLang[matchedIndex];
          const starSelect = document.getElementById('devotee-star');
          if (starSelect) starSelect.value = starName;
          statusEl.textContent = `✅ Star: ${starName}`;
        } else {
          statusEl.textContent = `❌ Star not found: "${result.trim()}"`;
        }
      }
      
      setTimeout(() => closeVoiceOverlay(), 1500);
    } else {
      statusEl.textContent = '❌ No speech detected';
      setTimeout(() => closeVoiceOverlay(), 1500);
    }
  } catch(e) {
    console.error('Recognition error:', e);
    statusEl.textContent = '❌ Error occurred';
    setTimeout(() => closeVoiceOverlay(), 1500);
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

// ── Sarvam.ai Speech-to-Text (Saaras v3) ──
async function startSarvamSTT(field) {
  const statusEl = document.getElementById('voice-status');
  const resultEl = document.getElementById('voice-result');
  isListening = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const localMimeType = getSupportedMimeType();
    mediaRecorder = new MediaRecorder(stream, { mimeType: localMimeType });
    const audioChunks = [];

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      statusEl.textContent = t('processing');
      const audioBlob = new Blob(audioChunks, { type: localMimeType });
      const langCode = SARVAM_LANG_CODES[state.language] || 'en-IN';
      const extension = localMimeType.includes('mp4') ? 'mp4' : (localMimeType.includes('ogg') ? 'ogg' : 'webm');
      
      try {
        const formData = new FormData();
        formData.append('file', audioBlob, `audio.${extension}`);
        formData.append('model', 'saaras:v1');
        formData.append('language_code', langCode);
        formData.append('apiKey', SARVAM_API_KEY);

        const response = await fetch('/api/proxy/sarvam-stt', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData.error || `HTTP ${response.status}`;
          statusEl.textContent = `❌ ${msg}`;
          setTimeout(() => {
            isListening = false;
            startWebSpeechAPI(field);
          }, 2000);
          return;
        }

        const data = await response.json();
        if (data.transcript) {
          resultEl.textContent = data.transcript;
          processVoiceResult(field, data.transcript.trim());
          console.log('🎯 Sarvam STT result:', data.transcript);
        } else {
          statusEl.textContent = '❌ No speech detected';
          setTimeout(() => {
             isListening = false;
             startWebSpeechAPI(field);
          }, 1500);
        }
      } catch (err) {
        statusEl.textContent = `❌ API Error: ${err.message}`;
        setTimeout(() => {
          isListening = false;
          startWebSpeechAPI(field);
        }, 2000);
      }
    };

    mediaRecorder.start();
    statusEl.textContent = t('voiceListening');

    // Record for 5 seconds (Sarvam REST supports up to 30s)
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }
    }, 5000);

  } catch (err) {
    console.error('Mic access failed:', err);
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
    const stopBtn = document.getElementById('voice-stop-btn');
    if (stopBtn) stopBtn.style.display = 'block';

    recognition.start();
    statusEl.textContent = t('voiceListening');
  } catch (e) {
    console.error('Failed to start recognition:', e);
    isListening = false;
  }
}

function stopCurrentRecording() {
  const stopBtn = document.getElementById('voice-stop-btn');
  if (stopBtn) stopBtn.style.display = 'none';

  if (recognition) {
    try { recognition.stop(); } catch (e) { }
  }
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    try { 
      mediaRecorder.stop(); 
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      }
    } catch (e) { }
  }
  if (window._audioContext) {
    try { window._audioContext.close(); window._audioContext = null; } catch (e) { }
  }
  const volBar = document.getElementById('volume-bar');
  if (volBar) volBar.style.width = '0%';
  isListening = false;
}

function startVolumeMeter(stream) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    window._audioContext = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const volBar = document.getElementById('volume-bar');

    // Silence/Speech detection state
    let hasHeardSpeech = false;
    let silenceStart = Date.now();
    let captureStart = Date.now();
    const SILENCE_THRESHOLD = 10; // Increased to filter background hum/fan noise
    const SILENCE_WAIT_MS = 2200; // Finish quicker after pause
    const INITIAL_SILENCE_LIMIT = 4000; // Auto-stop if no speech heard at ALL for 4s

    const canvas = document.getElementById('voice-visualizer');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let waveHistory = [];
    if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        waveHistory = new Array(Math.floor(rect.width)).fill(0);
    }

    isListening = true; // Ensure early flag set for visualizer
    function update() {
      if (!isListening || !window._audioContext) return;
      
      let average = 0;
      let vol = 0;

      if (document.body.classList.contains('bot-speaking')) {
          average = (Math.sin(Date.now() / 150) + 1) * 15;
          vol = 10;
      } else {
          try {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            average = sum / bufferLength;
            vol = Math.min(100, Math.pow(average / 128, 0.5) * 100);
          } catch(e) { average = 0; vol = 0; }
      }
      
      if (volBar) volBar.style.width = vol + '%';

      if (ctx && canvas) {
          const rect = canvas.getBoundingClientRect();
          ctx.clearRect(0, 0, rect.width, rect.height);
          
          waveHistory.shift();
          waveHistory.push(average);
          
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          const grad = ctx.createLinearGradient(0, 0, rect.width, 0);
          grad.addColorStop(0, '#B8860B'); 
          grad.addColorStop(1, '#FFD700');
          ctx.strokeStyle = grad;

          const centerY = rect.height / 2;
          for (let i = 0; i < waveHistory.length; i++) {
              const x = i;
              const magnitude = (waveHistory[i] / 128) * (rect.height / 2);
              const y = centerY + (magnitude * Math.sin(i * 0.05 + Date.now()/200));
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
          }
          ctx.stroke();
      }

      // Advanced Silence Detection for REST STT engines
      if (vol > SILENCE_THRESHOLD) {
        if (!hasHeardSpeech) console.log('🎙️ Speech detected!');
        hasHeardSpeech = true;
        silenceStart = Date.now(); // reset the silence timer whenever they speak
      } else {
        const now = Date.now();
        if (hasHeardSpeech) {
          // They spoke, now they are silent - stop after pause
          if (now - silenceStart > SILENCE_WAIT_MS) {
            console.log(`🔇 Silence detected for ${SILENCE_WAIT_MS}ms, auto-stopping.`);
            stopCurrentRecording();
            return;
          }
        } else {
          // They haven't spoken yet at all
          if (now - captureStart > INITIAL_SILENCE_LIMIT) {
             console.log(`⌛ No speech detected for ${INITIAL_SILENCE_LIMIT}ms, closing automatically.`);
             stopCurrentRecording();
             return;
          }
        }
      }

      requestAnimationFrame(update);
    }
    update();
  } catch (e) { console.warn('Volume meter failed:', e); }
}

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac'
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function processVoiceResult(field, transcript) {
  if (!transcript || transcript.trim() === '') return;
  const cleanTranscript = transcript.trim();
  const statusEl = document.getElementById('voice-status');

  if (field === 'name') {
    const nameInput = document.getElementById('devotee-name');
    if (nameInput) {
      nameInput.value = cleanTranscript;
      statusEl.textContent = `✅ Name: ${cleanTranscript}`;
      speak(`${t('voiceConfirmName')} ${cleanTranscript}`);
    }
    setTimeout(() => closeVoiceOverlay(), 2000);
  } else if (field === 'star') {
    const matchedIndex = findNakshatraIndexUniversal(cleanTranscript);
    const starSelect = document.getElementById('devotee-star');

    if (matchedIndex >= 0 && starSelect) {
      const nakshatrasInCurrentLang = getNakshatras();
      const starName = nakshatrasInCurrentLang[matchedIndex];
      starSelect.value = starName; 
      statusEl.textContent = `✅ Star: ${starName}`;
      speak(`${t('voiceConfirmStar')} ${starName}`);
    } else {
      statusEl.textContent = `Heard: ${cleanTranscript}`;
    }
    setTimeout(() => closeVoiceOverlay(), 2000);
  }
}

// Common aliases for English recognition to handle STT variations
const NAKSHATRA_ALIASES = {
  "aswini": 0, "ashwin": 0, "aaswini": 0,
  "barani": 1, "bharani": 1,
  "krithika": 2, "kritika": 2, "karthika": 2,
  "rohini": 3,
  "mrigashira": 4, "mrigashirsham": 4,
  "athira": 5, "ardhra": 5, "ardra": 5,
  "punarvasu": 6,
  "poosam": 7, "pushyam": 7, "pushya": 7,
  "aayilyam": 8, "ashlesha": 8, "aslesha": 8,
  "makam": 9, "magha": 9,
  "pooram": 10, "purva phalguni": 10,
  "uthram": 11, "uttara phalguni": 11,
  "hastham": 12, "hastam": 12, "hasta": 12,
  "chithirai": 13, "chitra": 13,
  "swathi": 14, "swati": 14,
  "vishakam": 15, "vishakha": 15,
  "anusham": 16, "anuradha": 16,
  "kettai": 17, "jyeshtha": 17,
  "moolam": 18, "moola": 18,
  "pooradam": 19, "purva ashadha": 19,
  "uthiradam": 20, "uttara ashadha": 20,
  "thiruvonam": 21, "shravana": 21,
  "avittam": 22, "dhanishta": 22,
  "shathayam": 23, "shatabhisha": 23,
  "poorattathi": 24, "purva bhadrapada": 24,
  "uthrattathi": 25, "uttara bhadrapada": 25,
  "revathi": 26, "revati": 26
};

function findBestMatch(input, options) {
  const normalizedInput = input.toLowerCase().trim();

  // 1. Check direct aliases first (highest priority)
  if (NAKSHATRA_ALIASES[normalizedInput] !== undefined) {
    return NAKSHATRA_ALIASES[normalizedInput];
  }

  // 2. Exact match
  let idx = options.findIndex(o => o.toLowerCase().trim() === normalizedInput);
  if (idx >= 0) return idx;

  // 3. Starts with match
  idx = options.findIndex(o => o.toLowerCase().startsWith(normalizedInput) || normalizedInput.startsWith(o.toLowerCase()));
  if (idx >= 0) return idx;

  // 4. Contains match
  idx = options.findIndex(o => o.toLowerCase().includes(normalizedInput) || normalizedInput.includes(o.toLowerCase()));
  if (idx >= 0) return idx;

  // 5. Levenshtein distance-based fuzzy match
  let bestDist = Infinity;
  let bestIdx = -1;
  options.forEach((opt, i) => {
    const normOpt = opt.toLowerCase().trim();
    const dist = levenshtein(normalizedInput, normOpt);
    // Allow more flexibility (60% match instead of 50%)
    if (dist < bestDist && dist <= Math.max(normOpt.length * 0.6, 2)) {
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

// Bot flow removed as per request.
// Field-level voice input (startVoiceInput) is still maintained.

function speakAndWait(text) {
  return new Promise(async (resolve) => {
    // 1. Try Sarvam AI first if key exists
    if (SARVAM_API_KEY) {
      try {
        const audio = await speakWithSarvam(text);
        if (audio && audio instanceof Audio) {
          audio.onended = () => {
            _sarvamAudioPlayer = null;
            setTimeout(resolve, 400);
          };
          audio.onerror = () => {
            _sarvamAudioPlayer = null;
            setTimeout(resolve, 100);
          };
          // Safety timeout for network issues
          setTimeout(() => { if(_sarvamAudioPlayer === audio) resolve(); }, 12000);
          return;
        }
      } catch (e) {
        console.warn('Sarvam TTS wait failed, falling back:', e.message);
      }
    }

    // 2. Browser Fallback
    if (!('speechSynthesis' in window)) {
      setTimeout(resolve, 1000);
      return;
    }

    const utterance = speakWithBrowser(text);
    if (!utterance) {
      resolve();
      return;
    }

    utterance.onend = () => setTimeout(resolve, 400);
    utterance.onerror = () => setTimeout(resolve, 100);
    // Safety timeout
    setTimeout(resolve, 6000);
  });
}

function listenForSpeechWeb() {
  return new Promise(async (resolve) => {
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not available');
      resolve(null);
      return;
    }

    // Start a volume meter so user can see the mic is working
    let micStream = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      startVolumeMeter(micStream);
    } catch(e) {
      console.warn('Could not start volume meter:', e);
    }

    const rec = new SpeechRecognition();
    rec.lang = LANG_CODES[state.language] || 'en-IN';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.continuous = true; // Don't stop after first pause - keep listening

    const resultEl = document.getElementById('voice-result');
    let finalTranscript = '';
    let resolved = false; // Prevent double-resolve race condition
    let heardSomething = false;
    let silenceTimer = null;
    let maxTimer = null;

    function finish(result) {
      if (resolved) return;
      resolved = true;
      clearTimeout(silenceTimer);
      clearTimeout(maxTimer);
      isListening = false;
      const stopBtn = document.getElementById('voice-stop-btn');
      if (stopBtn) stopBtn.style.display = 'none';
      // Stop volume meter mic
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      try { rec.stop(); } catch(e) {}
      console.log('🎤 Web STT result:', result);
      resolve(result);
    }

    rec.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show what's being heard in real-time
      if (resultEl) resultEl.textContent = finalTranscript || interimTranscript;

      heardSomething = true;

      // Reset silence timer — after hearing speech, wait 3 seconds of silence then finish
      clearTimeout(silenceTimer);
      if (finalTranscript) {
        silenceTimer = setTimeout(() => {
          console.log('🔇 Silence detected after speech, finishing with:', finalTranscript.trim());
          finish(finalTranscript.trim());
        }, 2500); // 2.5s silence after final result = done
      }
    };

    rec.onerror = (event) => {
      console.error('🎤 Voice error:', event.error);
      if (event.error === 'no-speech') {
        // Not critical — just means silence, let maxTimer handle it
        return;
      }
      finish(finalTranscript.trim() || null);
    };

    rec.onend = () => {
      // If recognition ended naturally and we have a result, return it
      if (finalTranscript) {
        finish(finalTranscript.trim());
      } else if (!heardSomething) {
        // Silence throughout — return null
        finish(null);
      }
      // If heardSomething but no finalTranscript, the silenceTimer will handle it
    };

    const stopBtn = document.getElementById('voice-stop-btn');
    if (stopBtn) {
      stopBtn.style.display = 'block';
      stopBtn.onclick = () => {
        finish(finalTranscript.trim() || null);
      };
    }

    try {
      rec.start();
      isListening = true;
      console.log('🎤 Web Speech API listening... lang:', rec.lang);

      // Maximum listening time: 15 seconds
      maxTimer = setTimeout(() => {
        console.log('⏱ Max listening time reached');
        finish(finalTranscript.trim() || null);
      }, 15000);
    } catch (e) {
      console.error('Failed to start recognition:', e);
      finish(null);
    }
  });
}

// ── Sarvam.ai STT ──
function listenForSpeechSarvam() {
  return new Promise(async (resolve) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      isListening = true;
      startVolumeMeter(stream);
      const mimeType = getSupportedMimeType();
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      const resultEl = document.getElementById('voice-result');

      const stopBtn = document.getElementById('voice-stop-btn');
      if (stopBtn) stopBtn.style.display = 'block';

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      mediaRecorder.onstop = async () => {
        console.log('🎤 MediaRecorder stop. Chunks gathered:', chunks.length);
        if (stopBtn) stopBtn.style.display = 'none';
        
        let safeMimeType = mimeType;
        if (mimeType.includes('webm')) safeMimeType = 'audio/webm';
        else if (mimeType.includes('mp4') || mimeType.includes('m4a')) safeMimeType = 'audio/mp4';
        else if (mimeType.includes('ogg')) safeMimeType = 'audio/ogg';

        const audioBlob = new Blob(chunks, { type: safeMimeType });
        console.log('📦 Created Blob:', safeMimeType, 'Size:', audioBlob.size, 'bytes');
        
        if (audioBlob.size < 100) {
            console.warn('⚠️ Audio blob too small. Check microphone input.');
        }
        const sarvamLang = (state.language === 'en') ? 'en-IN' : 
                          (state.language === 'ta') ? 'ta-IN' : 
                          (state.language === 'te') ? 'te-IN' : 
                          (state.language === 'kn') ? 'kn-IN' : 
                          (state.language === 'ml') ? 'ml-IN' : 'en-IN';
        
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, `audio.webm`);
          formData.append('model', 'saaras:v1'); // Corrected to v1
          formData.append('language_code', sarvamLang);
          formData.append('apiKey', SARVAM_API_KEY);

          const response = await fetch('/api/proxy/sarvam-stt', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            if (data.transcript) {
              if (resultEl) resultEl.textContent = data.transcript;
              resolve(data.transcript.trim());
              return;
            }
          } else {
             const errorText = await response.text();
             console.error(`Sarvam STT Error ${response.status}:`, errorText);
             if (resultEl) resultEl.textContent = `API Error: ${response.status}`;
          }
          resolve(null);
        } catch (err) { 
           console.error('Sarvam STT Fetch Error:', err);
           if (resultEl) resultEl.textContent = 'Network Error';
           resolve(null); 
        }
      };

      mediaRecorder.start(); 
      console.log('🎤 High-fidelity capture started (15s limit)');
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          stream.getTracks().forEach(t => t.stop());
          console.log('⏱ Recording auto-cycle finished.');
        }
      }, 15000);
    } catch { resolve(null); }
  });
}

// ── Google Cloud STT ──
function listenForSpeechGoogle() {
  return new Promise(async (resolve) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      isListening = true;
      startVolumeMeter(stream);
      const mimeType = getSupportedMimeType();
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      const resultEl = document.getElementById('voice-result');

      const stopBtn = document.getElementById('voice-stop-btn');
      if (stopBtn) stopBtn.style.display = 'block';

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      mediaRecorder.onstop = async () => {
        if (stopBtn) stopBtn.style.display = 'none';
        const audioBlob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];
          const langCode = LANG_CODES[state.language] || 'en-IN';

          try {
            const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`, {
              method: 'POST',
              body: JSON.stringify({
                config: {
                  encoding: mimeType.includes('mp4') || mimeType.includes('aac') ? 'MP3' : 'WEBM_OPUS',
                  sampleRateHertz: 48000,
                  languageCode: langCode,
                  enableAutomaticPunctuation: true
                },
                audio: { content: base64Audio }
              })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.results && data.results[0] && data.results[0].alternatives[0]) {
                const text = data.results[0].alternatives[0].transcript;
                if (resultEl) resultEl.textContent = text;
                resolve(text.trim());
                return;
              }
            }
            resolve(null);
          } catch { resolve(null); }
        };
      };

      mediaRecorder.start(1000);
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          if (mediaRecorder.stream) mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
      }, 10000);
    } catch { resolve(null); }
  });
}

// ── Reverie RevUp STT ──
function listenForSpeechReverie() {
  return new Promise(async (resolve) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      const chunks = [];
      const resultEl = document.getElementById('voice-result');

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        
        // Reverie File API parameters
        const lang = state.language === 'en' ? 'english' : (state.language === 'ta' ? 'tamil' : (state.language === 'te' ? 'telugu' : (state.language === 'ml' ? 'malayalam' : 'kannada')));
        
        try {
          const response = await fetch('https://revapi.reverieinc.com/apiman-gateway/ReverieLanguageTechnologies/stt/1.0', {
            method: 'POST',
            headers: {
              'REV-API-KEY': REVERIE_API_KEY,
              'REV-APP-ID': REVERIE_APP_ID,
              'cnt-type': 'audio/webm'
            },
            body: audioBlob
          });

          if (response.ok) {
            const data = await response.json();
            if (data.display_text) {
              if (resultEl) resultEl.textContent = data.display_text;
              resolve(data.display_text.trim());
              return;
            }
          }
          resolve(null);
        } catch { resolve(null); }
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          stream.getTracks().forEach(t => t.stop());
        }
      }, 5000);
    } catch { resolve(null); }
  });
}

// ── OpenAI Whisper STT ──
async function listenForSpeechOpenAI() {
  return new Promise(async (resolve) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      isListening = true;
      startVolumeMeter(stream);
      const mimeType = getSupportedMimeType();
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      const resultEl = document.getElementById('voice-result');

      const stopBtn = document.getElementById('voice-stop-btn');
      if (stopBtn) stopBtn.style.display = 'block';

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      mediaRecorder.onstop = async () => {
        if (stopBtn) stopBtn.style.display = 'none';
        const audioBlob = new Blob(chunks, { type: mimeType });
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');
        
        // Use current app language as hint
        const langCode = state.language === 'en' ? 'en' : state.language;
        formData.append('language', langCode);

        try {
          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            if (data.text) {
              if (resultEl) resultEl.textContent = data.text;
              resolve(data.text.trim());
              return;
            }
          } else {
            const err = await response.json();
            console.error('OpenAI Error:', err);
          }
          resolve(null);
        } catch (e) { console.error(e); resolve(null); }
      };

      mediaRecorder.start(1000);
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          if (mediaRecorder.stream) mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
      }, 10000);
    } catch { resolve(null); }
  });
}

function listenForSpeech() {
  let engine = state.config.voiceEngine;

  // AUTO-DETECT ENGINE: If user hasn't chosen one, but keys are present, use them!
  if (!engine || engine === 'web') {
    if (SARVAM_API_KEY) engine = 'sarvam';
    else if (OPENAI_API_KEY) engine = 'openai';
    else if (GOOGLE_API_KEY) engine = 'google';
    else if (REVERIE_API_KEY) engine = 'reverie';
    else engine = 'web';
  }
  
  console.log(`🎤 Starting STT with engine: ${engine}`);

  if (engine === 'openai' && OPENAI_API_KEY) {
    return listenForSpeechOpenAI();
  } else if (engine === 'sarvam' && SARVAM_API_KEY) {
    return listenForSpeechSarvam();
  } else if (engine === 'google' && GOOGLE_API_KEY) {
    return listenForSpeechGoogle();
  } else if (engine === 'reverie' && REVERIE_API_KEY) {
    return listenForSpeechReverie();
  } else {
    // Check if web is even supported before trying
    if (!SpeechRecognition) {
      showToast('Browser STT not supported. Please use Chrome or configure a Cloud Key.', 'warning');
      return Promise.resolve(null);
    }
    return listenForSpeechWeb();
  }
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

  showToast('⬆️ Processing image...');

  // 1. Read file as data URL
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });

  // 2. Show immediate local preview
  const preview = document.getElementById('bg-image-preview');
  if (preview) {
    preview.src = dataUrl;
    preview.classList.add('visible');
  }
  const bgImage = document.querySelector('.bg-image');
  if (bgImage) bgImage.style.backgroundImage = `url('${dataUrl}')`;

  // 3. Compress image via canvas (keep under MongoDB 16MB limit)
  const compressedUrl = await compressImage(dataUrl, 800, 0.7);

  // 4. Save to localStorage as fast fallback
  try {
    localStorage.setItem('ayyappa_bg_image', compressedUrl);
  } catch (e) {
    console.warn('Image too large for localStorage');
  }

  // 5. Save compressed base64 to MongoDB via settings API
  try {
    const res = await fetch(SETTINGS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bgUrl: compressedUrl, fileName: file.name })
    });
    if (res.ok) {
      showToast('✅ Background saved to MongoDB!');
      console.log('✅ Background image saved to MongoDB');
    } else {
      const err = await res.json().catch(() => ({}));
      showToast('⚠️ Cloud save failed: ' + (err.error || ''), 'error');
    }
  } catch (e) {
    showToast('ℹ️ Saved locally (server offline)', 'warning');
    console.warn('⚠️ Could not save bg image to cloud:', e.message);
  }

  saveSettings();
}

// ── Compress image to fit MongoDB document size limit ──
function compressImage(dataUrl, maxSize = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;

      // Scale down if larger than maxSize
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // Convert to compressed JPEG
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
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
  localStorage.removeItem('ayyappa_sarvam_api_key');

  const root = document.documentElement;
  root.removeAttribute('style');
  document.body.removeAttribute('style');

  const bgImage = document.querySelector('.bg-image');
  if (bgImage) {
    bgImage.style.backgroundImage = "url('ayyappa-bg.png')";
    bgImage.style.opacity = '0.08';
    bgImage.style.backgroundSize = '300px';
  }

  const preview = document.getElementById('bg-image-preview');
  if (preview) { preview.src = ''; preview.classList.remove('visible'); }

  SARVAM_API_KEY = '';
  applyTheme('divine-gold');
  showToast('Settings reset to default ✅');
}

// ── Save Config Actions ──
function saveUpiConfig(field, value) {
  state.config[field] = value.trim();
  saveConfigToCloud();
}

function saveVoiceKey(type, value) {
  const trimmed = value.trim();
  if (type === 'sarvam') {
    SARVAM_API_KEY = trimmed;
    state.config.sarvamKey = trimmed;
    localStorage.setItem('ayyappa_sarvam_api_key', trimmed);
  } else if (type === 'google') {
    GOOGLE_API_KEY = value.trim();
    state.config.googleKey = GOOGLE_API_KEY;
    localStorage.setItem('ayyappa_google_api_key', GOOGLE_API_KEY);
  } else if (type === 'openai') {
    OPENAI_API_KEY = value.trim();
    state.config.openaiKey = OPENAI_API_KEY;
    localStorage.setItem('ayyappa_openai_api_key', OPENAI_API_KEY);
  } else if (type === 'reverie') {
    REVERIE_API_KEY = value.trim();
    state.config.reverieKey = REVERIE_API_KEY;
    localStorage.setItem('ayyappa_reverie_api_key', REVERIE_API_KEY);
  } else if (type === 'reverieAppId') {
    REVERIE_APP_ID = value.trim();
    state.config.reverieAppId = REVERIE_APP_ID;
    localStorage.setItem('ayyappa_reverie_app_id', REVERIE_APP_ID);
  }
  saveConfigToCloud();
  showToast('API Key Saved ✅');
}

function saveVoiceSettings(type, value) {
  if (type === 'sarvamVoice') {
    state.config.sarvamVoice = value.trim();
  } else if (type === 'openaiVoice') {
    state.config.openaiVoice = value.trim();
  } else if (type === 'googleVoice') {
    state.config.googleVoice = value.trim();
  }
  saveConfigToCloud();
  showToast('Voice Settings Saved ✅');
}

function updateVoiceEngine(value) {
  state.config.voiceEngine = value;
  
  // Show/Hide config UIs
  document.querySelectorAll('.voice-engine-config').forEach(el => el.style.display = 'none');
  const target = document.getElementById(value + '-config-ui');
  if (target) target.style.display = 'block';

  saveConfigToCloud();
  showToast(`Voice Engine: ${value} ✅`);
}

// ── Service Management ──
function showAddServiceForm() {
  document.getElementById('edit-service-id').value = '';
  document.getElementById('service-name-input').value = '';
  document.getElementById('service-price-input').value = '';
  document.getElementById('service-icon-input').value = '';
  document.getElementById('service-details-input').value = '';
  document.getElementById('service-form').style.display = 'block';
}

function hideServiceForm() {
  document.getElementById('service-form').style.display = 'none';
}

function saveService() {
  const idOrNew = document.getElementById('edit-service-id').value || 'svc_' + Date.now();
  const name = document.getElementById('service-name-input').value.trim();
  const price = Number(document.getElementById('service-price-input').value);
  const icon = document.getElementById('service-icon-input').value.trim() || '🕉️';
  const details = document.getElementById('service-details-input').value.trim();

  if(!name || !price) {
    showToast('Name and Price required', 'error');
    return;
  }

  const existingIdx = state.config.services.findIndex(s => s.id === idOrNew);
  const svc = { id: idOrNew, name, price, icon, details };

  if(existingIdx >= 0) state.config.services[existingIdx] = svc;
  else state.config.services.push(svc);

  saveConfigToCloud();
  renderSettingsOfferings();
  hideServiceForm();
  renderServiceScreen();
}

function deleteService(id) {
  state.config.services = state.config.services.filter(s => s.id !== id);
  saveConfigToCloud();
  renderSettingsOfferings();
  renderServiceScreen();
}

function editService(id) {
  const svc = state.config.services.find(s => s.id === id);
  if(!svc) return;
  document.getElementById('edit-service-id').value = svc.id;
  document.getElementById('service-name-input').value = svc.name;
  document.getElementById('service-price-input').value = svc.price;
  document.getElementById('service-icon-input').value = svc.icon;
  document.getElementById('service-details-input').value = svc.details;
  document.getElementById('service-form').style.display = 'block';
}

function renderSettingsOfferings() {
  const list = document.getElementById('settings-offerings-list');
  if(!list) return;

  if (state.config.services.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No services configured.</div>';
    return;
  }

  list.innerHTML = `
    <div class="settings-table-container">
      <table class="settings-table">
        <thead>
          <tr>
            <th class="col-icon">Logo</th>
            <th class="col-name">Service Name</th>
            <th class="col-price">Price</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.config.services.map(s => `
            <tr>
              <td class="col-icon">${s.icon}</td>
              <td class="col-name">${s.name}</td>
              <td class="col-price">₹${s.price}</td>
              <td class="col-actions">
                <button class="btn-icon edit" onclick="editService('${s.id}')" title="Edit">✏️</button>
                <button class="btn-icon delete" onclick="deleteService('${s.id}')" title="Delete">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Settings API is defined at top of file.

async function loadConfigAndServices() {
  try {
     const res = await fetch(SETTINGS_API_URL, { method: 'GET' });
     if(res.ok) {
       const data = await res.json();
       state.config.upiId = data.upiId || state.config.upiId;
       state.config.merchantName = data.merchantName || state.config.merchantName;
       state.config.services = data.services || [];
       state.config.voiceEngine = data.voiceEngine || 'web';
       state.config.sarvamKey = data.sarvamKey || '';
       state.config.googleKey = data.googleKey || '';
       state.config.openaiKey = data.openaiKey || '';
       state.config.reverieKey = data.reverieKey || '';
       state.config.reverieAppId = data.reverieAppId || '';
       state.config.sarvamVoice = data.sarvamVoice || 'arya';
       state.config.openaiVoice = data.openaiVoice || 'alloy';
       state.config.googleVoice = data.googleVoice || 'en-IN-Wavenet-A';
       
       // Populate inputs in settings
       const upiIn = document.getElementById('upi-id-input');
       const merchIn = document.getElementById('merchant-name-input');
       if(upiIn) upiIn.value = state.config.upiId;
       if(merchIn) merchIn.value = state.config.merchantName;
       
       // Populate Voice settings
       const engineSel = document.getElementById('voice-engine-select');
       if (engineSel) {
         engineSel.value = state.config.voiceEngine;
         updateVoiceEngine(state.config.voiceEngine);
       }
       
       const sarvamVoiceIn = document.getElementById('sarvam-voice-select');
       const openaiVoiceIn = document.getElementById('openai-voice-select');
       const googleVoiceIn = document.getElementById('google-voice-select');
       
       if (sarvamVoiceIn) sarvamVoiceIn.value = state.config.sarvamVoice;
       if (openaiVoiceIn) openaiVoiceIn.value = state.config.openaiVoice;
       if (googleVoiceIn) googleVoiceIn.value = state.config.googleVoice;
       
       const sarvamIn = document.getElementById('sarvam-api-key-input');
       const googleIn = document.getElementById('google-api-key-input');
       const openaiIn = document.getElementById('openai-api-key-input');
       const reverieKeyIn = document.getElementById('reverie-api-key-input');
       const reverieAppIn = document.getElementById('reverie-app-id-input');

       if (sarvamIn) sarvamIn.value = state.config.sarvamKey;
       if (googleIn) googleIn.value = state.config.googleKey;
       if (openaiIn) openaiIn.value = state.config.openaiKey;
       if (reverieKeyIn) reverieKeyIn.value = state.config.reverieKey;
       if (reverieAppIn) reverieAppIn.value = state.config.reverieAppId;

       SARVAM_API_KEY = state.config.sarvamKey || localStorage.getItem('ayyappa_sarvam_api_key') || '';
       GOOGLE_API_KEY = state.config.googleKey || localStorage.getItem('ayyappa_google_api_key') || '';
       OPENAI_API_KEY = state.config.openaiKey || localStorage.getItem('ayyappa_openai_api_key') || '';
       REVERIE_API_KEY = state.config.reverieKey || localStorage.getItem('ayyappa_reverie_api_key') || '';
       REVERIE_APP_ID = state.config.reverieAppId || localStorage.getItem('ayyappa_reverie_app_id') || '';
       
       renderSettingsOfferings();
     }
  } catch(e) { console.warn('Config load failed', e); }
}

async function saveConfigToCloud() {
  try {
    const payload = { 
      upiId: state.config.upiId || '', 
      merchantName: state.config.merchantName || '',
      services: state.config.services || [],
      voiceEngine: state.config.voiceEngine || 'web',
      sarvamKey: state.config.sarvamKey || '',
      googleKey: state.config.googleKey || '',
      openaiKey: state.config.openaiKey || '',
      reverieKey: state.config.reverieKey || '',
      reverieAppId: state.config.reverieAppId || '',
      sarvamVoice: state.config.sarvamVoice || 'arya',
      openaiVoice: state.config.openaiVoice || 'alloy',
      googleVoice: state.config.googleVoice || 'en-IN-Wavenet-A'
    };
    console.log('💾 Saving config to cloud:', JSON.stringify(payload, null, 2));
    const res = await fetch(SETTINGS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const saved = await res.json();
      console.log('✅ Config saved to DB:', saved);
      showToast('Configuration Saved to Database ✅');
    } else {
      const errText = await res.text();
      console.error('❌ Config save failed:', res.status, errText);
      showToast('Failed to save config: ' + res.status, 'error');
    }
  } catch(e) {
    console.error('❌ Config save error:', e);
    showToast('Network error saving config', 'error');
  }
}

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

  // Visual Accessibility (New)
  if (settings.uiZoom != null) {
     const s = document.getElementById('ui-zoom-slider');
     if (s) s.value = settings.uiZoom;
     updateUiZoom(settings.uiZoom, true);
  }
  if (settings.fontScale != null) {
     const s = document.getElementById('font-scale-slider');
     if (s) s.value = settings.fontScale;
     updateFontScale(settings.fontScale, true);
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

  // Load Sarvam AI API Key (stays local only — never sent to server)
  const savedApiKey = localStorage.getItem('ayyappa_sarvam_api_key');
  if (savedApiKey) {
    SARVAM_API_KEY = savedApiKey;
    const keyInput = document.getElementById('sarvam-api-key-input');
    if (keyInput) keyInput.value = savedApiKey;
  }

  // ── Step 2: Fetch from MongoDB in background and sync ──
  loadSettingsFromCloud();
}

async function loadSettingsFromCloud() {
  try {
    const res = await fetch(SETTINGS_API_URL);
    if (res.ok) {
      const settings = await res.json();
      if (settings) {
        applySettingsObject(settings);
      }
    }
  } catch (e) {
    console.warn('Cloud settings fetch failed:', e);
  }
}

// ── Visual Accessibility Functions ──
function updateUiZoom(val, skipSave = false) {
  const container = document.querySelector('.dashboard-container');
  const label = document.getElementById('ui-zoom-value');
  if (label) label.textContent = `${val}%`;
  if (container) {
    container.style.zoom = val / 100;
  }
  if (!skipSave) syncSettings({ uiZoom: parseInt(val) });
}

function updateFontScale(val, skipSave = false) {
  const label = document.getElementById('font-scale-value');
  if (label) label.textContent = `${val}%`;
  document.documentElement.style.setProperty('--font-global-scale', val / 100);
  if (!skipSave) syncSettings({ fontScale: parseInt(val) });
}

function syncSettings(newValues) {
  const saved = localStorage.getItem('ayyappa_settings');
  const settings = saved ? JSON.parse(saved) : {};
  const updated = { ...settings, ...newValues };
  localStorage.setItem('ayyappa_settings', JSON.stringify(updated));
  
  // Cloud Sync (Debounced)
  clearTimeout(_settingsSaveTimer);
  _settingsSaveTimer = setTimeout(() => saveSettingsToCloud(updated), 500);
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

// ── Initial Load ──
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// ── MongoDB Order Communication ──

/**
 * Saves a new order to the database.
 */
async function saveOrder(orderData, retries = 2) {
  if (!orderData) return;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(ORDERS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`⚠️ Move MongoDB save attempt ${i+1} failed:`, error.message);
      if (i === retries) {
        console.error('❌ MongoDB saveOrder final failure:', error.message);
        throw error;
      }
      // Wait 1 second before retrying
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

/**
 * Retrieves the latest orders from the database.
 */
async function getOrders(limit = 100) {
  try {
    const response = await fetch(`${ORDERS_API_URL}?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return await response.json();
  } catch (error) {
    console.error('❌ MongoDB getOrders failed:', error.message);
    // Return empty array instead of crashing so UI stays responsive
    return [];
  }
}
