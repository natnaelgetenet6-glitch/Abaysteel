// State
let products = [];
let sales = [];
let expenses = [];
let priceNotes = [];
let cart = [];
let users = [];
let currentUser = JSON.parse(localStorage.getItem('nat_current_user')) || null;
const API_URL = 'api'; // Relative path for PHP


// DOM Elements
const shopList = document.getElementById('shop-list');
const mgmtList = document.getElementById('mgmt-inventory-list');
const cartList = document.getElementById('cart-list');
const transactionsList = document.getElementById('transactions-list');
const totalSalesEl = document.getElementById('total-sales');
const totalExpensesEl = document.getElementById('total-expenses');
const grossProfitEl = document.getElementById('gross-profit');
const netProfitEl = document.getElementById('net-profit');
const cartTotalEl = document.getElementById('cart-total');

// Inputs
const shopSearch = document.getElementById('shop-search');
const shopTypeFilter = document.getElementById('shop-type-filter');
const shopSizeFilter = document.getElementById('shop-size-filter');
const mgmtSearch = document.getElementById('mgmt-search');

// Initialization
async function init() {
    if (currentUser) {
        updateNavVisibility();
        // Redirect to management if stock role, else shop
        const startView = currentUser.role === 'stock' ? 'management' : 'shop';
        switchView(startView);
        await loadData();
    } else {
        switchView('login');
    }
}

async function loadData() {
    try {
        await Promise.all([
            fetchProducts(),
            fetchStats(),
            fetchHistory(),
            fetchPriceNotes(),
            fetchUsers()
        ]);
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

// --- API Calls ---

async function fetchProducts() {
    try {
        const res = await fetch(`${API_URL}/products.php`);
        products = await res.json();
        renderShop();
        renderManagement();
        renderTypeSelector();
        renderProductDatalist();
    } catch (err) {
        console.error('Error fetching products:', err);
    }
}

function renderProductDatalist() {
    const datalist = document.getElementById('product-names-list');
    if (!datalist) return;
    datalist.innerHTML = '';
    const uniqueNames = [...new Set(products.map(p => p.name))].sort();
    uniqueNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        datalist.appendChild(opt);
    });
}

async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats.php`);
        const stats = await res.json();
        totalSalesEl.textContent = `Birr ${(stats.todaySales || 0).toFixed(2)}`;
        totalExpensesEl.textContent = `Birr ${(stats.monthExpenses || 0).toFixed(2)}`;

        const grossProfit = (stats.totalSales || 0) - (stats.totalCOGS || 0);
        grossProfitEl.textContent = `Birr ${grossProfit.toFixed(2)}`;

        netProfitEl.textContent = `Birr ${(stats.netProfit || 0).toFixed(2)}`;
        netProfitEl.style.color = (stats.netProfit || 0) >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

        // Diagnostic Check
        if (stats.diagnostics && stats.diagnostics.missingBuyPriceCount > 0) {
            console.warn(`Profit Warning: ${stats.diagnostics.missingBuyPriceCount} products have 0 Buy Price.`);
            // Only alert if we haven't warned this session
            if (!sessionStorage.getItem('profit_warning_shown')) {
                // Short timeout to allow UI to render first
                setTimeout(() => {
                    alert(`Attention: Profit calculation may be incomplete.\n\nFound ${stats.diagnostics.missingBuyPriceCount} products with Buy Price = 0.\n\nPlease go to Management and set the 'Buy Price' for your items to see accurate Gross Profit.`);
                }, 500);
                sessionStorage.setItem('profit_warning_shown', 'true');
            }
            grossProfitEl.style.color = 'var(--warning-color, #f59e0b)';
        } else {
            grossProfitEl.style.color = 'var(--text-accent)';
        }
    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

async function fetchHistory() {
    try {
        const res = await fetch(`${API_URL}/history.php`);
        const history = await res.json();
        sales = history.filter(h => h.type === 'sale').map(h => ({
            id: h.id,
            date: h.date,
            total: h.amount, // API uses 'amount' alias for total_amount in union
            sellType: h.sell_type,
            user: h.user,
            buyer: {
                name: h.buyer_name,
                phone: h.buyer_phone,
                address: h.buyer_address
            },
            items: h.items || [] // Now an array of objects
        }));
        expenses = history.filter(h => h.type === 'expense').map(h => ({
            id: h.id,
            date: h.date,
            amount: h.amount,
            desc: h.description
        }));
        renderTransactions();
        renderHistory();
    } catch (err) {
        console.error('Error fetching history:', err);
    }
}

async function fetchPriceNotes() {
    try {
        const res = await fetch(`${API_URL}/price_notes.php`);
        if (!res.ok) {
            console.error('Fetch failed:', res.status);
            priceNotes = [];
            renderPriceNotes();
            return;
        }

        const data = await res.json();

        if (Array.isArray(data)) {
            priceNotes = data;
        } else {
            console.error('Expected array from price_notes.php, got:', data);
            priceNotes = [];
        }
        renderPriceNotes();
    } catch (err) {
        console.error('Error fetching price notes:', err);
    }
}

async function fetchUsers() {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
        const res = await fetch(`${API_URL}/users.php`);
        users = await res.json();
        renderUsers();
    } catch (err) {
        console.error('Error fetching users:', err);
    }
}

// View Switching
function switchView(viewName) {
    if (currentUser && currentUser.role === 'shop' && (viewName === 'management' || viewName === 'history' || viewName === 'notes' || viewName === 'users')) {
        alert('Access Denied: Admin privileges required.');
        return;
    }

    if (currentUser && currentUser.role === 'stock' && (viewName === 'shop' || viewName === 'history' || viewName === 'notes' || viewName === 'users')) {
        alert('Access Denied: Admin or Shop privileges required for this view.');
        return;
    }

    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const nav = document.getElementById('main-nav');
    if (viewName === 'login') {
        nav.style.display = 'none';
    } else {
        nav.style.display = 'flex';
    }

    const view = document.getElementById(`view-${viewName}`);
    if (view) {
        view.classList.remove('hidden');
    }

    updateNavVisibility();

    // More robust button finding
    const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => {
        const text = b.textContent.toLowerCase();
        const id = b.id.toLowerCase();
        return text.includes(viewName) || id.includes(viewName);
    });
    if (btn) btn.classList.add('active');

    // UI Adjustments for role-based views
    const mgmtContainer = document.querySelector('.management-container');
    const mgmtRight = document.querySelector('.management-right');
    if (mgmtContainer && mgmtRight) {
        if (currentUser && currentUser.role === 'stock') {
            mgmtRight.style.display = 'none';
            mgmtContainer.style.gridTemplateColumns = '1fr';
        } else {
            mgmtRight.style.display = 'flex';
            mgmtContainer.style.gridTemplateColumns = '3fr 2fr';
        }
    }

    // Refresh data on view switch if needed
    if (viewName === 'shop' || viewName === 'management') fetchProducts();
    if (viewName === 'history') fetchHistory();
    if (viewName === 'overview') fetchOverviewData();
    if (viewName === 'notes') fetchPriceNotes();
    if (viewName === 'users') fetchUsers();

    // Close mobile navigation after selecting a view
    const mobileNav = document.getElementById('main-nav');
    const overlay = document.getElementById('mobile-nav-overlay');
    const hamburger = document.getElementById('hamburger-btn');
    if (mobileNav && overlay && hamburger) {
        mobileNav.classList.remove('mobile-active');
        overlay.classList.remove('active');
        hamburger.classList.remove('active');
    }
}

function updateNavVisibility() {
    if (!currentUser) return;
    const mgmtBtn = document.getElementById('nav-mgmt');
    const historyBtn = document.getElementById('nav-history');
    const notesBtn = document.getElementById('nav-notes');
    const usersBtn = document.getElementById('nav-users');
    if (currentUser.role === 'shop') {
        if (mgmtBtn) mgmtBtn.style.display = 'none';
        if (historyBtn) historyBtn.style.display = 'none';
        if (notesBtn) notesBtn.style.display = 'none';
        if (usersBtn) usersBtn.style.display = 'none';
    } else if (currentUser.role === 'stock') {
        if (mgmtBtn) mgmtBtn.style.display = 'block';
        if (historyBtn) historyBtn.style.display = 'none';
        if (notesBtn) notesBtn.style.display = 'none';
        if (usersBtn) usersBtn.style.display = 'none';
        if (document.getElementById('nav-shop')) document.getElementById('nav-shop').style.display = 'none';
    } else {
        if (mgmtBtn) mgmtBtn.style.display = 'block';
        if (historyBtn) historyBtn.style.display = 'block';
        if (notesBtn) notesBtn.style.display = 'block';
        if (usersBtn) usersBtn.style.display = 'block';
        if (document.getElementById('nav-overview')) document.getElementById('nav-overview').style.display = 'block';
        if (mgmtBtn) mgmtBtn.style.display = 'block';
        if (historyBtn) historyBtn.style.display = 'block';
        if (notesBtn) notesBtn.style.display = 'block';
        if (usersBtn) usersBtn.style.display = 'block';
        if (document.getElementById('nav-shop')) document.getElementById('nav-shop').style.display = 'block';
    }
}

// --- OVERVIEW LOGIC ---
let trendChart = null;
let topItemsChart = null;

async function fetchOverviewData() {
    const startEl = document.getElementById('overview-start');
    const endEl = document.getElementById('overview-end');

    // Set defaults if empty
    if (!startEl.value) {
        const d = new Date();
        d.setDate(1); // 1st of current month
        startEl.valueAsDate = d;
    }
    if (!endEl.value) {
        endEl.valueAsDate = new Date();
    }

    const start = startEl.value;
    const end = endEl.value;

    try {
        const res = await fetch(`${API_URL}/overview.php?startDate=${start}&endDate=${end}`);
        const data = await res.json();

        renderOverviewStats(data.stats);
        renderOverviewCharts(data);
    } catch (err) {
        console.error('Error fetching overview:', err);
    }
}

function renderOverviewStats(stats) {
    document.getElementById('ov-revenue').textContent = `Birr ${(stats.totalSales || 0).toFixed(2)}`;
    document.getElementById('ov-expenses').textContent = `Birr ${(stats.totalExpenses || 0).toFixed(2)}`;
    document.getElementById('ov-gross').textContent = `Birr ${(stats.grossProfit || 0).toFixed(2)}`;

    const netEl = document.getElementById('ov-net');
    netEl.textContent = `Birr ${(stats.netProfit || 0).toFixed(2)}`;
    netEl.style.color = (stats.netProfit || 0) >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
}

function renderOverviewCharts(data) {
    // 1. Trend Chart (Line/Bar)
    const ctxTrend = document.getElementById('trendChart').getContext('2d');

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: data.trend.labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: data.trend.revenue,
                    borderColor: '#60a5fa', // blue-400
                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                    yAxisID: 'y',
                    fill: true
                },
                {
                    label: 'Gross Profit',
                    data: data.trend.profit,
                    borderColor: '#34d399', // emerald-400
                    yAxisID: 'y',
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { labels: { color: '#94a3b8' } } // text-secondary
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });

    // 2. Top Items Chart (Bar)
    const ctxTop = document.getElementById('topItemsChart').getContext('2d');

    if (topItemsChart) topItemsChart.destroy();

    topItemsChart = new Chart(ctxTop, {
        type: 'bar',
        data: {
            labels: data.topSells.map(i => i.name),
            datasets: [{
                label: 'Qty Sold',
                data: data.topSells.map(i => i.total_qty),
                backgroundColor: ['#f472b6', '#a78bfa', '#34d399', '#facc15', '#60a5fa'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Horizontal bar
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
        }
    });
}

// Data Handling Helpers
function getFilteredProducts(searchText, typeFilter, sizeFilter) {
    const filterText = searchText ? searchText.toLowerCase() : '';
    return products.filter(p => {
        const matchesText = p.name.toLowerCase().includes(filterText) || p.type.toLowerCase().includes(filterText);
        const matchesType = typeFilter ? p.type === typeFilter : true;
        const matchesSize = sizeFilter ? p.dimensions === sizeFilter : true;
        return matchesText && matchesType && matchesSize;
    });
}

// --- SHOP LOGIC ---
let selectedProductType = null; // Track selected product type

function renderShop() {
    shopList.innerHTML = '';
    const filtered = getFilteredProducts(shopSearch.value, shopTypeFilter.value, shopSizeFilter.value);

    if (filtered.length === 0) {
        shopList.innerHTML = '<p style="color:var(--text-secondary); text-align:center; grid-column: 1/-1;">No items found</p>';
        return;
    }

    // Group products by type
    const groupedByType = {};
    filtered.forEach(product => {
        const key = product.type;
        if (!groupedByType[key]) {
            groupedByType[key] = [];
        }
        groupedByType[key].push(product);
    });

    const visibleTypes = Object.keys(groupedByType).sort();

    // Auto-select if only one type is visible or if typed in filter
    if (visibleTypes.length === 1) {
        selectedProductType = visibleTypes[0];
    }
    // If selected type is no longer visible, deselect
    else if (selectedProductType && !groupedByType[selectedProductType]) {
        selectedProductType = null;
    }

    // Create two-panel layout
    const leftPanel = document.createElement('div');
    leftPanel.className = 'items-panel';
    leftPanel.innerHTML = '<h4 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">SELECT ITEM</h4>';

    const rightPanel = document.createElement('div');
    rightPanel.className = 'sizes-panel';
    rightPanel.innerHTML = '<h4 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">AVAILABLE SIZES</h4>';
    rightPanel.id = 'sizes-panel-content';

    // Render items in left panel
    visibleTypes.forEach(type => {
        const itemCard = document.createElement('div');
        itemCard.className = `item-selector-card ${selectedProductType === type ? 'selected' : ''}`;

        // Pass event explicitly
        itemCard.onclick = (e) => selectProductType(type, groupedByType[type], e);

        const products = groupedByType[type];
        const totalShopStock = products.reduce((sum, p) => sum + (p.shop_quantity || 0), 0);
        const sizeCount = products.length;

        itemCard.innerHTML = `
            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem;">${type}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${sizeCount} size${sizeCount > 1 ? 's' : ''} • Shop Stock: ${totalShopStock}
            </div>
        `;
        leftPanel.appendChild(itemCard);
    });

    // Add panels to shop list
    shopList.appendChild(leftPanel);
    shopList.appendChild(rightPanel);

    // Initial render of right panel if selection exists
    if (selectedProductType && groupedByType[selectedProductType]) {
        renderSizesPanel(groupedByType[selectedProductType]);
    } else {
        document.getElementById('sizes-panel-content').innerHTML = `
            <h4 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">AVAILABLE SIZES</h4>
            <div style="flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; color:var(--text-secondary); opacity:0.7;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:1rem;">
                    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/>
                    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>
                    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h2v-4h-2z"/>
                </svg>
                <p>Select an item to view sizes</p>
            </div>
        `;
    }
}

function selectProductType(type, products, event) {
    selectedProductType = type;

    // Update visual selection
    const allCards = document.querySelectorAll('.item-selector-card');
    allCards.forEach(card => card.classList.remove('selected'));

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }

    // Render sizes in right panel
    renderSizesPanel(products);
}

function renderSizesPanel(products) {
    const sizesPanel = document.getElementById('sizes-panel-content');
    sizesPanel.innerHTML = '<h4 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">AVAILABLE SIZES</h4>';

    // Group by size
    const groupedBySize = {};
    products.forEach(product => {
        const size = product.dimensions;
        if (!groupedBySize[size]) {
            groupedBySize[size] = [];
        }
        groupedBySize[size].push(product);
    });

    // Render each size
    Object.keys(groupedBySize).sort().forEach(size => {
        const sizeProducts = groupedBySize[size];

        sizeProducts.forEach(product => {
            const el = document.createElement('div');
            el.className = `product-card ${(product.shop_quantity || 0) < 5 ? 'low-stock' : ''}`;
            el.onclick = () => addToCart(product.id);
            el.innerHTML = `
                <div class="product-header">
                    <span class="product-name">${product.name}</span>
                    <span class="product-price">Birr ${Number(product.sell_price).toFixed(2)}</span>
                </div>
                <div class="product-details">
                    <span style="font-weight: 600; color: var(--text-accent);">Size: ${product.dimensions}</span>
                    <span style="font-weight: 600; color: ${(product.shop_quantity || 0) < 5 ? 'var(--danger-color)' : 'var(--success-color)'}">
                        Shop Stock: ${product.shop_quantity || 0} ${product.unit || 'pcs'}
                    </span>
                </div>
            `;
            sizesPanel.appendChild(el);
        });
    });
}

function renderTypeSelector() {
    const types = [...new Set(products.map(p => p.type))].sort();
    const current = shopTypeFilter.value;
    shopTypeFilter.innerHTML = '<option value="">All Types</option>';
    types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        shopTypeFilter.appendChild(opt);
    });
    shopTypeFilter.value = current;
}

function renderSizeSelector() {
    const typeFilter = shopTypeFilter.value;
    shopSizeFilter.innerHTML = '<option value="">All Sizes</option>';
    if (!typeFilter) {
        shopSizeFilter.disabled = true;
        return;
    }
    shopSizeFilter.disabled = false;
    const sizes = [...new Set(products
        .filter(p => p.type === typeFilter)
        .map(p => p.dimensions)
    )].sort();
    sizes.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        shopSizeFilter.appendChild(opt);
    });
}

// --- MANAGEMENT LOGIC ---
function renderManagement() {
    mgmtList.innerHTML = '';
    const searchText = mgmtSearch.value.toLowerCase();

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchText) ||
        p.type.toLowerCase().includes(searchText) ||
        (p.dimensions && p.dimensions.toLowerCase().includes(searchText))
    );

    if (filtered.length === 0) {
        mgmtList.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">No items found</td></tr>';
        return;
    }

    filtered.forEach(p => {
        const isLowStock = p.stock_quantity <= (p.min_stock_level || 5);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding-left: 1rem; font-weight: 600;">${p.name}</td>
            <td>${p.type}</td>
            <td style="color: var(--text-accent); font-weight: 600;">${p.dimensions || '-'}</td>
            <td style="opacity: 0.8;">Birr ${Number(p.buy_price).toFixed(2)}</td>
            <td style="font-weight: 700; color: var(--text-accent);">Birr ${Number(p.sell_price).toFixed(2)}</td>
            <td style="font-weight: 700; color: ${isLowStock ? 'var(--danger-color)' : 'var(--success-color)'}">${p.stock_quantity} ${p.unit || 'pcs'}</td>
            <td style="font-weight: 700; color: var(--text-accent);">${p.shop_quantity || 0}</td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-icon" onclick="openTransferModal(${p.id})" title="Move to Shop">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 11l5-5 5 5M7 13l5 5 5-5"/></svg>
                    </button>
                    <button class="btn-icon" onclick="editProduct(${p.id})" title="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <button class="btn-icon" onclick="deleteProduct(${p.id})" style="color: var(--danger-color)" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </td>
        `;
        mgmtList.appendChild(tr);
    });
}

async function deleteProduct(id) {
    if (confirm('Delete this product?')) {
        try {
            // Using POST with action=delete as a more robust fallback for all servers
            const res = await fetch(`${API_URL}/products.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: id })
            });

            if (res.ok) {
                await fetchProducts();
            } else {
                const data = await res.json();
                alert('Failed to delete product: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Failed to delete product: Network Error');
            console.error(err);
        }
    }
}

function openTransferModal(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('transfer-product-id').value = id;
    document.getElementById('transfer-item-name').textContent = `${product.name} (${product.dimensions})`;
    document.getElementById('transfer-qty').value = '';
    document.getElementById('transfer-max-hint').textContent = `Max available in store: ${product.stock_quantity}`;
    document.getElementById('transfer-qty').max = product.stock_quantity;

    openModal('transfer-modal');
}

// Cart Logic
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || (product.shop_quantity || 0) <= 0) {
        alert('Out of Stock in Shop!');
        return;
    }

    const cartItem = cart.find(c => c.product.id === productId);
    if (cartItem) {
        if (cartItem.qty < (product.shop_quantity || 0)) {
            cartItem.qty++;
            // If item exists, we need to re-render to show updated qty, 
            // but we don't have focus issues here since it's a button click outside the input.
            renderCart();
        } else {
            alert('Not enough shop stock!');
        }
    } else {
        // Initialize with default sell price
        cart.push({
            product: product,
            qty: 1,
            customPrice: Number(product.sell_price)
        });
        renderCart();
    }
}

function renderCart() {
    cartList.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 5rem;">Cart is empty</p>';
        cartTotalEl.value = '0.00';
        return;
    }

    cart.forEach((item, index) => {
        const price = item.customPrice; // Use the custom editable price
        const itemTotal = price * item.qty;
        total += itemTotal;

        const el = document.createElement('div');
        el.className = 'cart-item';
        // Added inputs for Price and Quantity using oninput to allow real-time typing without focus loss (since we won't re-render list)
        el.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight:600; margin-bottom: 0.25rem;">${item.product.name}</div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span style="font-size:0.85rem; color:var(--text-secondary);">Price</span>
                    <input type="number" step="0.01" value="${price}" 
                           id="cart-price-${index}"
                           oninput="updateCartItem(${index})"
                           class="input-field" style="width: 80px; padding: 0.2rem; height: auto;">
                    
                    <span style="font-size:0.85rem; color:var(--text-secondary);">Qty</span>
                    <input type="number" min="1" max="${item.product.shop_quantity}" value="${item.qty}" 
                           id="cart-qty-${index}"
                           oninput="updateCartItem(${index})" 
                           class="input-field" style="width: 60px; padding: 0.2rem; height: auto;">
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-direction: column; align-items: flex-end;">
                <span id="cart-subtotal-${index}" style="font-weight:700;">Birr ${itemTotal.toFixed(2)}</span>
                <button onclick="removeFromCart(${index})" class="btn-icon" style="color:var(--danger-color); padding: 0;">Remove</button>
            </div>
        `;
        cartList.appendChild(el);
    });

    cartTotalEl.value = total.toFixed(2);
}

function updateCartItem(index) {
    const qtyInput = document.getElementById(`cart-qty-${index}`);
    const priceInput = document.getElementById(`cart-price-${index}`);
    const subtotalEl = document.getElementById(`cart-subtotal-${index}`);

    let newQty = parseInt(qtyInput.value);
    let newPrice = parseFloat(priceInput.value);

    // Basic Validation
    if (isNaN(newQty) || newQty < 1) newQty = 0; // Don't block user typing empty string, handle gracefully
    if (isNaN(newPrice)) newPrice = 0;

    // Check Stock
    const item = cart[index];
    const maxStock = item.product.shop_quantity || 0;

    // Warn but allow correction (or clamp)
    // Here we hard clamp if it exceeds stock to prevent invalid state
    if (newQty > maxStock) {
        // Only clamp if not 0 (typing in progress)
        // Actually, for better UX, let them type but show error? 
        // Simpler for now: just clamp
        // newQty = maxStock;
        // qtyInput.value = maxStock;
        // Or better: valid state update
    }

    // Update Model
    item.qty = newQty;
    item.customPrice = newPrice;

    // View Update (Subtotal)
    const itemTotal = newQty * newPrice;
    subtotalEl.textContent = `Birr ${itemTotal.toFixed(2)}`;

    // Recalculate Grand Total
    const grandTotal = cart.reduce((acc, c) => acc + (c.qty * c.customPrice), 0);
    cartTotalEl.value = grandTotal.toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

async function completeSale() {
    if (cart.length === 0) return;

    // Validate Stocks before submitting
    for (const item of cart) {
        if (item.qty > (item.product.shop_quantity || 0)) {
            alert(`Quantity for ${item.product.name} exceeds shop stock (${item.product.shop_quantity})`);
            return;
        }
        if (item.qty <= 0) {
            alert(`Invalid quantity for ${item.product.name}`);
            return;
        }
    }

    const manualTotal = parseFloat(document.getElementById('cart-total').value);
    const calculatedTotal = cart.reduce((acc, item) => acc + (item.customPrice * item.qty), 0);
    // Allow manual total override if it's different (e.g. slight rounding adjustment by user)
    // But strictly speaking, if we allow unit price edits, the calculated total IS the source of truth.
    // However, if user edits total directly, we should probably respect it.
    const total = !isNaN(manualTotal) ? manualTotal : calculatedTotal;

    const sellType = document.getElementById('sell-type').value;
    const buyerName = document.getElementById('buyer-name').value;
    const buyerPhone = document.getElementById('buyer-phone').value;
    const buyerAddress = document.getElementById('buyer-address').value;

    const saleData = {
        items: cart.map(c => ({
            product: {
                id: c.product.id,
                // We send the CUSTOM price as the selling price
                sellPrice: c.customPrice
            },
            qty: c.qty
        })),
        total,
        sellType,
        buyer: { name: buyerName, phone: buyerPhone, address: buyerAddress },
        user: currentUser ? currentUser.username : 'Unknown'
    };

    try {
        const res = await fetch(`${API_URL}/sales.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });

        if (res.ok) {
            cart = [];
            document.getElementById('buyer-name').value = '';
            document.getElementById('buyer-phone').value = '';
            document.getElementById('buyer-address').value = '';
            renderCart();
            alert('Sale Completed!');
            await loadData(); // Reload all data
        } else {
            const err = await res.json();
            alert('Sale Failed: ' + err.error);
        }
    } catch (err) {
        console.error('Error completing sale:', err);
        alert('Sale Failed: Network Error');
    }
}

// Stats & Transactions
function renderStats() {
    // Stats are now fetched in fetchStats() and updated directly.
    // This function is kept if needed for simple re-renders, or can be removed if strictly API driven.
}

function renderTransactions() {
    transactionsList.innerHTML = '';
    const all = [...sales, ...expenses];
    all.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (all.length === 0) {
        transactionsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; margin-top: 1rem;">No transactions yet.</p>';
        return;
    }

    all.slice(0, 10).forEach(t => {
        const isSale = t.hasOwnProperty('sellType'); // naive check
        const el = document.createElement('div');
        el.style.padding = '0.75rem';
        el.style.borderBottom = '1px solid var(--border-color)';
        el.style.display = 'flex';
        el.style.justifyContent = 'space-between';

        if (isSale) {
            const buyerInfo = t.buyer && t.buyer.name ? `<div style="color:var(--text-secondary); font-size:0.75rem;">Buyer: ${t.buyer.name}</div>` : '';
            el.innerHTML = `
                <div>
                    <span style="color:var(--success-color); font-weight:600;">SALE (${t.sellType || 'Cash'})</span>
                    <span style="color:var(--text-secondary); font-size:0.85rem; margin-left:0.5rem;">${new Date(t.date).toLocaleTimeString()}</span>
                    ${buyerInfo}
                </div>
                <div style="font-weight:600;">+Birr ${Number(t.total).toFixed(2)}</div>
            `;
        } else {
            el.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color:var(--danger-color); font-weight:600;">EXPENSE</span>
                        <div style="font-weight:600; color:var(--text-secondary);">Birr ${Number(t.amount).toFixed(2)}</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem;">
                        <span style="color:var(--text-secondary); font-size:0.85rem;">${t.desc}</span>
                        <button onclick="deleteExpense(${t.id})" class="btn-icon" style="color:var(--danger-color); padding: 0;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }
        transactionsList.appendChild(el);
    });
}

function renderHistory() {
    const historyTableBody = document.getElementById('history-table-body');
    const searchVal = document.getElementById('history-search').value.toLowerCase();

    const all = [...sales, ...expenses];
    all.sort((a, b) => new Date(b.date) - new Date(a.date));

    historyTableBody.innerHTML = '';

    const filtered = all.filter(t => {
        const isSale = t.hasOwnProperty('sellType');
        const typeStr = (isSale ? 'SALE' : 'EXPENSE').toLowerCase();
        const dateStr = new Date(t.date).toLocaleDateString().toLowerCase();
        const buyerStr = (t.buyer && t.buyer.name ? t.buyer.name : '').toLowerCase();
        const sellTypeStr = (t.sellType || '').toLowerCase();
        const descStr = (t.desc || '').toLowerCase();
        const amountStr = (t.total || t.amount || 0).toString();

        // Search in items strings
        let itemMatch = false;
        if (isSale && t.items && Array.isArray(t.items)) {
            itemMatch = t.items.some(i =>
                (i.product_name || '').toLowerCase().includes(searchVal) ||
                (i.dimensions || '').toLowerCase().includes(searchVal)
            );
        }

        return typeStr.includes(searchVal) ||
            dateStr.includes(searchVal) ||
            buyerStr.includes(searchVal) ||
            sellTypeStr.includes(searchVal) ||
            descStr.includes(searchVal) ||
            amountStr.includes(searchVal) ||
            itemMatch;
    });

    if (filtered.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 2rem; color:var(--text-secondary);">No transactions found</td></tr>';
        return;
    }

    filtered.forEach(t => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        const isSale = t.hasOwnProperty('sellType');

        if (isSale) {
            // Helper to stack items vertically
            const renderItemsCol = (fn) => {
                if (!t.items || t.items.length === 0) return '---';
                return t.items.map(item => `
                    <div style="padding: 2px 0; height: 1.5rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                        ${fn(item)}
                    </div>
                `).join('');
            };

            tr.innerHTML = `
                <td style="padding: 1rem; vertical-align: top;">${new Date(t.date).toLocaleString()}</td>
                <td style="padding: 1rem; vertical-align: top;">
                    <span style="color:var(--success-color); font-weight:600;">SALE</span>
                </td>
                
                <td style="padding: 1rem; vertical-align: top;">
                    ${renderItemsCol(i => i.product_name + (i.quantity > 1 ? ` <span style="color:var(--text-secondary)">(x${i.quantity})</span>` : ''))}
                </td>
                <td style="padding: 1rem; vertical-align: top;">
                    ${renderItemsCol(i => i.dimensions || '-')}
                </td>
                <td style="padding: 1rem; vertical-align: top;">
                    ${renderItemsCol(i => 'Birr ' + Number(i.buy_price || 0).toFixed(2))}
                </td>
                <td style="padding: 1rem; vertical-align: top;">
                    ${renderItemsCol(i => 'Birr ' + Number(i.sell_price || 0).toFixed(2))}
                </td>

                <td style="padding: 1rem; vertical-align: top;">${t.user || '---'}</td>
                <td style="padding: 1rem; vertical-align: top;">
                    <div style="font-weight:600;">${t.buyer?.name || '---'}</div>
                    ${t.buyer?.phone ? `<div style="font-size:0.75rem; color:var(--text-secondary);">${t.buyer.phone}</div>` : ''}
                    ${t.buyer?.address ? `<div style="font-size:0.75rem; color:var(--text-secondary);">${t.buyer.address}</div>` : ''}
                </td>
                <td style="padding: 1rem; vertical-align: top;">${t.sellType || 'Cash'}</td>
                <td style="padding: 1rem; vertical-align: top; font-weight:700;">Birr ${Number(t.total).toFixed(2)}</td>
                <td style="padding: 1rem; vertical-align: top;">
                     <button onclick="deleteHistoryItem(${t.id}, 'sale')" style="background:none; border:none; color:var(--danger-color); cursor:pointer;">
                        Delete
                     </button>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td style="padding: 1rem; vertical-align: top;">${new Date(t.date).toLocaleString()}</td>
                <td style="padding: 1rem; vertical-align: top;"><span style="color:var(--danger-color); font-weight:600;">EXPENSE</span></td>
                
                <td style="padding: 1rem; vertical-align: top;">---</td>
                <td style="padding: 1rem; vertical-align: top;">---</td>
                <td style="padding: 1rem; vertical-align: top;">---</td>
                <td style="padding: 1rem; vertical-align: top;">---</td>

                <td style="padding: 1rem; vertical-align: top;">---</td>
                <td style="padding: 1rem; vertical-align: top; color:var(--text-secondary);">${t.desc}</td>
                <td style="padding: 1rem; vertical-align: top;">---</td>
                <td style="padding: 1rem; vertical-align: top; font-weight:700; color:var(--text-secondary);">-Birr ${Number(t.amount).toFixed(2)}</td>
                <td style="padding: 1rem; vertical-align: top;">
                     <button onclick="deleteHistoryItem(${t.id}, 'expense')" style="background:none; border:none; color:var(--danger-color); cursor:pointer;">
                        Delete
                     </button>
                </td>
            `;
        }
        historyTableBody.appendChild(tr);
    });
}

async function deleteExpense(id) {
    // Legacy function, redirect to generic if used elsewhere or keep for sidebar
    deleteHistoryItem(id, 'expense');
}

async function deleteHistoryItem(id, type) {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
        const res = await fetch(`${API_URL}/history.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: id, type: type })
        });

        if (res.ok) {
            await Promise.all([fetchStats(), fetchHistory()]);
        } else {
            const data = await res.json();
            alert('Failed to delete item: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete item: Network Error');
    }
}

async function clearHistory() {
    if (!confirm('Are you sure you want to delete ALL history (Sales & Expenses)? This cannot be undone.')) return;

    const doubleCheck = prompt('Type "DELETE" to confirm clearing all history:');
    if (doubleCheck !== 'DELETE') {
        alert('Action cancelled.');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/history.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear' })
        });

        if (res.ok) {
            alert('History cleared successfully.');
            await Promise.all([fetchStats(), fetchHistory()]);
        } else {
            const data = await res.json();
            alert('Failed to clear history: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Clear history error:', err);
        alert('Failed to clear history: Network Error');
    }
}

function renderPriceNotes() {
    try {
        const notesTableBody = document.getElementById('notes-table-body');
        if (!notesTableBody) return;
        notesTableBody.innerHTML = '';

        // Diagnostic heading update
        const titleEl = document.querySelector('#view-notes h3');
        if (titleEl) {
            titleEl.textContent = `Item Rates (${priceNotes.length} items found)`;
        }

        if (!Array.isArray(priceNotes) || priceNotes.length === 0) {
            notesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color:var(--text-secondary);">No price notes found</td></tr>';
            return;
        }

        priceNotes.forEach((note, index) => {
            try {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                const minPrice = note.min_price ? Number(note.min_price).toFixed(2) : '0.00';
                const maxPrice = note.max_price ? Number(note.max_price).toFixed(2) : '0.00';
                const updatedAt = note.updated_at ? new Date(note.updated_at).toLocaleString() : '---';

                tr.innerHTML = `
                <td style="padding: 1rem;">${note.item_name || 'Unnamed Item'}</td>
                <td style="padding: 1rem;">Birr ${minPrice}</td>
                <td style="padding: 1rem;">Birr ${maxPrice}</td>
                <td style="padding: 1rem; font-size: 0.85rem; color: var(--text-secondary);">${updatedAt}</td>
                <td style="padding: 1rem; display: flex; gap: 0.5rem;">
                    <button onclick='editPriceNote(${JSON.stringify(note).replace(/'/g, "&#39;")})' 
                        style="background:none; border:none; color:var(--primary-color); cursor:pointer;">
                        Edit
                    </button>
                    <button onclick="deletePriceNote(${note.id})" 
                        style="background:none; border:none; color:var(--danger-color); cursor:pointer;">
                        Delete
                    </button>
                </td>
            `;
                notesTableBody.appendChild(tr);
            } catch (err) {
                console.error(`Error rendering note at index ${index}:`, err);
            }
        });
    } catch (err) {
        console.error('Error in renderPriceNotes:', err);
    }
}

function editPriceNote(note) {
    document.getElementById('note-id').value = note.id;
    document.getElementById('note-item-name').value = note.item_name;
    document.getElementById('note-min-price').value = note.min_price;
    document.getElementById('note-max-price').value = note.max_price;

    // Update button text
    const btn = document.getElementById('add-note-btn');
    if (btn) btn.textContent = 'Update Rate';

    // Scroll to form if needed
    document.getElementById('add-note-form').scrollIntoView({ behavior: 'smooth' });
}

async function deletePriceNote(id) {
    if (confirm('Delete this price note?')) {
        try {
            const res = await fetch(`${API_URL}/price_notes.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: id })
            });

            if (res.ok) {
                await fetchPriceNotes();
            } else {
                const data = await res.json();
                alert('Failed to delete rate: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Failed to delete rate: Network Error');
            console.error(err);
        }
    }
}

function renderUsers() {
    const usersTableBody = document.getElementById('users-table-body');
    if (!usersTableBody) return;
    usersTableBody.innerHTML = '';

    if (!Array.isArray(users) || users.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color:var(--text-secondary);">No users found</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        tr.innerHTML = `
            <td style="padding: 1rem;">${user.username}</td>
            <td style="padding: 1rem;">${user.role}</td>
            <td style="padding: 1rem; font-size: 0.85rem; color: var(--text-secondary);">${new Date(user.created_at).toLocaleString()}</td>
            <td style="padding: 1rem; display: flex; gap: 0.5rem;">
                <button onclick='editUser(${JSON.stringify(user)})' 
                    style="background:none; border:none; color:var(--primary-color); cursor:pointer;">
                    Edit
                </button>
                <button onclick="deleteUser(${user.id})" 
                    style="background:none; border:none; color:var(--danger-color); cursor:pointer;">
                    Delete
                </button>
            </td>
        `;
        usersTableBody.appendChild(tr);
    });
}

function editUser(user) {
    document.getElementById('manage-user-id').value = user.id;
    document.getElementById('manage-user-username').value = user.username;
    document.getElementById('manage-user-role').value = user.role;
    document.getElementById('manage-user-password').value = '';
    document.getElementById('save-user-btn').textContent = 'Update User';
    document.getElementById('cancel-user-edit').classList.remove('hidden');
}

async function deleteUser(id) {
    if (confirm('Delete this user?')) {
        try {
            const res = await fetch(`${API_URL}/users.php?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchUsers();
            } else {
                const data = await res.json();
                alert('Failed to delete user: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Failed to delete user: Network Error');
            console.error(err);
        }
    }
}

// Event Listeners
shopSearch.addEventListener('input', () => renderShop());
shopTypeFilter.addEventListener('change', () => {
    shopSizeFilter.value = '';
    renderSizeSelector();
    renderShop();
});
shopSizeFilter.addEventListener('change', () => renderShop());
mgmtSearch.addEventListener('input', () => renderManagement());
document.getElementById('history-search').addEventListener('input', () => renderHistory());

document.getElementById('note-item-name').addEventListener('input', (e) => {
    const name = e.target.value;
    if (!Array.isArray(priceNotes)) return;
    const existing = priceNotes.find(n => n.item_name === name);
    if (existing) {
        document.getElementById('note-id').value = existing.id;
        document.getElementById('note-min-price').value = existing.min_price;
        document.getElementById('note-max-price').value = existing.max_price;
        const btn = document.getElementById('add-note-btn');
        if (btn) btn.textContent = 'Update Rate';
    } else {
        document.getElementById('note-id').value = '';
        // Don't clear min/max automatically if user is still typing, 
        // but reset button if it's definitely not a match
        const btn = document.getElementById('add-note-btn');
        if (btn) btn.textContent = 'Add Rate';
    }
});

// Use == for loose equality to handle string/number ID differences
function editProduct(id) {
    const product = products.find(p => p.id == id);
    if (!product) {
        console.error('Product not found for edit:', id);
        return;
    }

    document.getElementById('new-id').value = product.id;
    document.getElementById('new-type').value = product.type;
    document.getElementById('new-name').value = product.name;
    document.getElementById('new-dim').value = product.dimensions;
    document.getElementById('new-qty').value = product.stock_quantity;
    document.getElementById('new-buy-price').value = product.buy_price;
    document.getElementById('new-sell-price').value = product.sell_price;

    // Update Modal Title and Button
    document.querySelector('#add-product-modal h2').textContent = 'Edit Steel';
    document.querySelector('#add-product-form button[type="submit"]').textContent = 'Update Product';

    openModal('add-product-modal');
}

// Reset form when opening for "Add"
function openAddProductModal() {
    document.getElementById('add-product-form').reset();
    document.getElementById('new-id').value = '';
    document.querySelector('#add-product-modal h2').textContent = 'Add New Steel';
    document.querySelector('#add-product-form button[type="submit"]').textContent = 'Add Product';
    openModal('add-product-modal');
}


document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('new-id').value;
    const name = document.getElementById('new-name').value;
    const type = document.getElementById('new-type').value;
    const dimInput = document.getElementById('new-dim').value;
    const qty = parseInt(document.getElementById('new-qty').value);
    const buyPrice = parseFloat(document.getElementById('new-buy-price').value) || 0;
    const sellPrice = parseFloat(document.getElementById('new-sell-price').value);

    // Support comma-separated dimensions for bulk add
    let dimensions = dimInput.split(',').map(d => d.trim()).filter(d => d);
    if (dimensions.length === 0) dimensions = ['']; // Allow adding even without dimensions

    try {
        if (id) {
            // Update Mode: Single request, no splitting
            const res = await fetch(`${API_URL}/products.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id, name, type, dimensions: dimInput.trim(), quantity: qty, buyPrice, sellPrice
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert('Product updated successfully!');
            } else {
                alert('Failed to update: ' + (data.error || 'Unknown error'));
            }
        } else {
            // Add Mode: potential bulk add
            let successCount = 0;
            let lastError = null;

            // Post each dimension as a separate product
            for (const dim of dimensions) {
                const res = await fetch(`${API_URL}/products.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, type, dimensions: dim, quantity: qty, buyPrice, sellPrice
                    })
                });

                if (res.ok) {
                    successCount++;
                } else {
                    const errData = await res.json();
                    lastError = errData.error || 'Unknown error';
                }
            }

            if (successCount === dimensions.length) {
                alert('Product(s) added successfully!');
            } else if (successCount > 0) {
                alert(`Added ${successCount} items, but some failed: ${lastError}`);
            } else {
                alert(`Failed to add product: ${lastError}`);
            }
        }

        closeModal('add-product-modal');
        e.target.reset();
        await fetchProducts(); // Refresh list

    } catch (err) {
        console.error('Error saving product:', err);
        alert('Error saving product: Network Error');
    }
});

document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const desc = document.getElementById('expense-desc').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);

    try {
        await fetch(`${API_URL}/expenses.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: desc, amount })
        });
        e.target.reset();
        await Promise.all([fetchStats(), fetchHistory()]);
    } catch (err) {
        console.error('Error adding expense:', err);
    }
});

document.getElementById('transfer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = document.getElementById('transfer-product-id').value;
    const quantity = document.getElementById('transfer-qty').value;

    try {
        const res = await fetch(`${API_URL}/transfer.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity })
        });

        if (res.ok) {
            closeModal('transfer-modal');
            alert('Transfer completed successfully!');
            await fetchProducts();
        } else {
            const err = await res.json();
            alert('Transfer failed: ' + err.error);
        }
    } catch (err) {
        console.error('Error during transfer:', err);
        alert('Transfer failed: Network Error');
    }
});

document.getElementById('add-note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idInput = document.getElementById('note-id');
    const id = idInput ? idInput.value : null;
    const itemName = document.getElementById('note-item-name').value;
    const minPriceInput = document.getElementById('note-min-price').value;
    const maxPriceInput = document.getElementById('note-max-price').value;

    const minPrice = parseFloat(minPriceInput);
    const maxPrice = parseFloat(maxPriceInput);

    // Frontend Validation
    if (!itemName) {
        alert('Item Name is required');
        return;
    }
    if (isNaN(minPrice) || isNaN(maxPrice)) {
        alert('Please enter valid numbers for Min and Max Rates');
        return;
    }

    const payload = { item_name: itemName, min_price: minPrice, max_price: maxPrice };
    if (id) {
        payload.id = id;
    }

    try {
        const res = await fetch(`${API_URL}/price_notes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            alert('Rate ' + (id ? 'updated' : 'added') + ' successfully!');
            e.target.reset();
            if (idInput) idInput.value = '';

            const btn = document.getElementById('add-note-btn');
            if (btn) btn.textContent = 'Add Rate';

            await fetchPriceNotes();
        } else {
            alert('Error: ' + (data.error || 'Failed to save rate'));
        }
    } catch (err) {
        console.error('Error saving price note:', err);
        alert('Failed to connect to the server. Please try again.');
    }
});

document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('manage-user-id').value;
    const username = document.getElementById('manage-user-username').value;
    const password = document.getElementById('manage-user-password').value;
    const role = document.getElementById('manage-user-role').value;

    if (!id && !password) {
        alert('Password is required for new users');
        return;
    }

    const payload = { username, role };
    if (id) payload.id = id;
    if (password) payload.password = password;

    try {
        const res = await fetch(`${API_URL}/users.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            alert('User ' + (id ? 'updated' : 'added') + ' successfully');
            e.target.reset();
            document.getElementById('manage-user-id').value = '';
            document.getElementById('save-user-btn').textContent = 'Add User';
            document.getElementById('cancel-user-edit').classList.add('hidden');
            await fetchUsers();
        } else {
            alert('Error: ' + (data.error || 'Failed to save user'));
        }
    } catch (err) {
        console.error('Error saving user:', err);
        alert('Failed to connect to the server');
    }
});

document.getElementById('cancel-user-edit').addEventListener('click', () => {
    document.getElementById('add-user-form').reset();
    document.getElementById('manage-user-id').value = '';
    document.getElementById('save-user-btn').textContent = 'Add User';
    document.getElementById('cancel-user-edit').classList.add('hidden');
});

// Login Logic
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            const user = await res.json();
            // We still store current session in local storage for refresh persistence, 
            // but validation happened against DB.
            currentUser = user;
            localStorage.setItem('nat_current_user', JSON.stringify(currentUser));
            updateNavVisibility();
            // Redirect to management if stock role, else shop
            const startView = currentUser.role === 'stock' ? 'management' : 'shop';
            switchView(startView);
            await loadData();
        } else {
            const errorData = await res.json();
            console.error('Login failed:', errorData);
            alert('Invalid Credentials: ' + (errorData.debug || errorData.error));
        }

    } catch (err) {
        console.error('Login error:', err);
        alert('Login failed. Check connection.');
    }
});

function logout() {
    cart = [];
    currentUser = null;
    localStorage.removeItem('nat_current_user');
    switchView('login');
}

// Global Exports
window.switchView = switchView;
window.openModal = openModal;
window.closeModal = closeModal;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.completeSale = completeSale;
window.deleteProduct = deleteProduct;
window.deletePriceNote = deletePriceNote;
window.deleteUser = deleteUser;
window.editUser = editUser;
window.logout = logout;
window.deleteExpense = deleteExpense;
window.renderHistory = renderHistory;
window.openTransferModal = openTransferModal;
window.editPriceNote = editPriceNote;
window.fetchPriceNotes = fetchPriceNotes;
window.deleteHistoryItem = deleteHistoryItem;
window.editProduct = editProduct;
window.openAddProductModal = openAddProductModal;
window.clearHistory = clearHistory;
console.log('Script loaded. Window exports:', window.deleteProduct);

// Mobile Navigation Toggle
function toggleMobileNav() {
    const nav = document.getElementById('main-nav');
    const overlay = document.getElementById('mobile-nav-overlay');
    const hamburger = document.getElementById('hamburger-btn');

    if (nav && overlay && hamburger) {
        nav.classList.toggle('mobile-active');
        overlay.classList.toggle('active');
        hamburger.classList.toggle('active');
    }
}

// Export toggle function
window.toggleMobileNav = toggleMobileNav;

// Theme Toggle Function
function toggleTheme() {
    const body = document.body;
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    // Toggle light mode class
    body.classList.toggle('light-mode');

    // Update icons
    if (body.classList.contains('light-mode')) {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
        localStorage.setItem('nat_theme', 'light');
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
        localStorage.setItem('nat_theme', 'dark');
    }
}

// Load saved theme on page load
function loadTheme() {
    const savedTheme = localStorage.getItem('nat_theme');
    const body = document.body;
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        body.classList.remove('light-mode');
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }
}

// Export theme functions
window.toggleTheme = toggleTheme;
window.loadTheme = loadTheme;

// Simple Modals
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

// Start
loadTheme(); // Load theme before init
init();
