// State
let products = [];
let sales = [];
let expenses = [];
let priceNotes = [];
let cart = [];
let currentUser = JSON.parse(localStorage.getItem('nat_current_user')) || null;
const API_URL = 'api'; // Relative path for PHP


// DOM Elements
const shopList = document.getElementById('shop-list');
const mgmtList = document.getElementById('mgmt-inventory-list');
const cartList = document.getElementById('cart-list');
const transactionsList = document.getElementById('transactions-list');
const totalSalesEl = document.getElementById('total-sales');
const totalExpensesEl = document.getElementById('total-expenses');
const netIncomeEl = document.getElementById('net-income');
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
        switchView('shop');
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
            fetchPriceNotes()
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
        totalSalesEl.textContent = `$${(stats.todaySales || 0).toFixed(2)}`;
        totalExpensesEl.textContent = `$${(stats.monthExpenses || 0).toFixed(2)}`;
        netIncomeEl.textContent = `$${(stats.netIncome || 0).toFixed(2)}`;
        netIncomeEl.style.color = (stats.netIncome || 0) >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
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
            buyer: { name: h.buyer_name }
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

// View Switching
function switchView(viewName) {
    if (currentUser && currentUser.role === 'shop' && (viewName === 'management' || viewName === 'history' || viewName === 'notes')) {
        alert('Access Denied: Admin privileges required.');
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

    // Refresh data on view switch if needed
    if (viewName === 'shop' || viewName === 'management') fetchProducts();
    if (viewName === 'history') fetchHistory();
    if (viewName === 'notes') fetchPriceNotes();
}

function updateNavVisibility() {
    if (!currentUser) return;
    const mgmtBtn = document.getElementById('nav-mgmt');
    const historyBtn = document.getElementById('nav-history');
    const notesBtn = document.getElementById('nav-notes');
    if (currentUser.role === 'shop') {
        if (mgmtBtn) mgmtBtn.style.display = 'none';
        if (historyBtn) historyBtn.style.display = 'none';
        if (notesBtn) notesBtn.style.display = 'none';
    } else {
        if (mgmtBtn) mgmtBtn.style.display = 'block';
        if (historyBtn) historyBtn.style.display = 'block';
        if (notesBtn) notesBtn.style.display = 'block';
    }
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
        const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
        const sizeCount = products.length;

        itemCard.innerHTML = `
            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem;">${type}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${sizeCount} size${sizeCount > 1 ? 's' : ''} • Stock: ${totalStock}
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
            el.className = `product-card ${product.stock_quantity < 10 ? 'low-stock' : ''}`;
            el.onclick = () => addToCart(product.id);
            el.innerHTML = `
                <div class="product-header">
                    <span class="product-name">${product.name}</span>
                    <span class="product-price">$${Number(product.sell_price).toFixed(2)}</span>
                </div>
                <div class="product-details">
                    <span style="font-weight: 600; color: var(--text-accent);">Size: ${product.dimensions}</span>
                    <span style="font-weight: 600; color: ${product.stock_quantity < 10 ? 'var(--danger-color)' : 'var(--success-color)'}">
                        Stock: ${product.stock_quantity} ${product.unit || 'pcs'}
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
    const filtered = getFilteredProducts(mgmtSearch.value, null, null);

    if (filtered.length === 0) {
        mgmtList.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">No items found</td></tr>';
        return;
    }

    filtered.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${product.name}</td>
            <td>${product.type}</td>
            <td>${product.dimensions}</td>
            <td>$${Number(product.buy_price).toFixed(2)}</td>
            <td>$${Number(product.sell_price).toFixed(2)}</td>
            <td style="color: ${product.stock_quantity < 10 ? 'var(--danger-color)' : 'inherit'}">${product.stock_quantity}</td>
            <td>
                <button onclick="deleteProduct(${product.id})" 
                    style="background:none; border:none; color:var(--danger-color); cursor:pointer;">
                    Delete
                </button>
            </td>
        `;
        mgmtList.appendChild(tr);
    });
}

async function deleteProduct(id) {
    if (confirm('Delete this product?')) {
        try {
            await fetch(`${API_URL}/products.php?id=${id}`, { method: 'DELETE' });
            await fetchProducts();
        } catch (err) {
            alert('Failed to delete product');
            console.error(err);
        }
    }
}

// Cart Logic
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (product.stock_quantity <= 0) {
        alert('Out of Stock!');
        return;
    }

    const cartItem = cart.find(c => c.product.id === productId);
    if (cartItem) {
        if (cartItem.qty < product.stock_quantity) {
            cartItem.qty++;
        } else {
            alert('Not enough stock!');
        }
    } else {
        cart.push({ product: product, qty: 1 });
    }
    renderCart();
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
        // Warning: using product.sell_price from API logic
        const price = Number(item.product.sell_price);
        const itemTotal = price * item.qty;
        total += itemTotal;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div>
                <div style="font-weight:600;">${item.product.name}</div>
                <div style="font-size:0.85rem; color:var(--text-secondary);">$${price.toFixed(2)} x ${item.qty}</div>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-weight:700;">$${itemTotal.toFixed(2)}</span>
                <button onclick="removeFromCart(${index})" class="btn-icon" style="color:var(--danger-color);">&times;</button>
            </div>
        `;
        cartList.appendChild(el);
    });

    cartTotalEl.value = total.toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

async function completeSale() {
    if (cart.length === 0) return;

    const manualTotal = parseFloat(document.getElementById('cart-total').value);
    const calculatedTotal = cart.reduce((acc, item) => acc + (Number(item.product.sell_price) * item.qty), 0);
    const total = !isNaN(manualTotal) ? manualTotal : calculatedTotal;

    const sellType = document.getElementById('sell-type').value;
    const buyerName = document.getElementById('buyer-name').value;
    const buyerPhone = document.getElementById('buyer-phone').value;
    const buyerAddress = document.getElementById('buyer-address').value;

    const saleData = {
        items: cart.map(c => ({
            product: { id: c.product.id, sellPrice: c.product.sell_price },
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
                <div style="font-weight:600;">+$${Number(t.total).toFixed(2)}</div>
            `;
        } else {
            el.innerHTML = `
                <div>
                    <span style="color:var(--danger-color); font-weight:600;">EXPENSE</span>
                    <span style="color:var(--text-secondary); font-size:0.85rem; margin-left:0.5rem;">${t.desc}</span>
                </div>
                <div style="font-weight:600; color:var(--text-secondary);">-$${Number(t.amount).toFixed(2)}</div>
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

        return typeStr.includes(searchVal) ||
            dateStr.includes(searchVal) ||
            buyerStr.includes(searchVal) ||
            sellTypeStr.includes(searchVal) ||
            descStr.includes(searchVal) ||
            amountStr.includes(searchVal);
    });

    if (filtered.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color:var(--text-secondary);">No transactions found</td></tr>';
        return;
    }

    filtered.forEach(t => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        const isSale = t.hasOwnProperty('sellType');

        if (isSale) {
            tr.innerHTML = `
                <td style="padding: 1rem;">${new Date(t.date).toLocaleString()}</td>
                <td style="padding: 1rem;"><span style="color:var(--success-color); font-weight:600;">SALE</span></td>
                <td style="padding: 1rem;">${t.user || '---'}</td>
                <td style="padding: 1rem;">
                    <div style="font-weight:600;">${t.buyer?.name || '---'}</div>
                    <div style="font-size:0.75rem; color:var(--text-secondary);">${t.buyer?.phone || ''}</div>
                </td>
                <td style="padding: 1rem;">${t.sellType || 'Cash'}</td>
                <td style="padding: 1rem; font-weight:700;">$${Number(t.total).toFixed(2)}</td>
                <td style="padding: 1rem;">
                     <!-- Details/Delete actions not fully implemented for history in this view for simplicity -->
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td style="padding: 1rem;">${new Date(t.date).toLocaleString()}</td>
                <td style="padding: 1rem;"><span style="color:var(--danger-color); font-weight:600;">EXPENSE</span></td>
                <td style="padding: 1rem;">---</td>
                <td style="padding: 1rem; color:var(--text-secondary);">${t.desc}</td>
                <td style="padding: 1rem;">---</td>
                <td style="padding: 1rem; font-weight:700; color:var(--text-secondary);">-$${Number(t.amount).toFixed(2)}</td>
                <td style="padding: 1rem;"></td>
            `;
        }
        historyTableBody.appendChild(tr);
    });
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
                <td style="padding: 1rem;">$${minPrice}</td>
                <td style="padding: 1rem;">$${maxPrice}</td>
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
            await fetch(`${API_URL}/price_notes.php?id=${id}`, { method: 'DELETE' });
            await fetchPriceNotes();
        } catch (err) {
            alert('Failed to delete rate');
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

document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-name').value;
    const type = document.getElementById('new-type').value;
    const dimInput = document.getElementById('new-dim').value;
    const qty = parseInt(document.getElementById('new-qty').value);
    const buyPrice = parseFloat(document.getElementById('new-buy-price').value) || 0;
    const sellPrice = parseFloat(document.getElementById('new-sell-price').value);

    // Support comma-separated dimensions for bulk add
    const dimensions = dimInput.split(',').map(d => d.trim()).filter(d => d);

    try {
        // Post each dimension as a separate product
        for (const dim of dimensions) {
            await fetch(`${API_URL}/products.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, type, dimensions: dim, quantity: qty, buyPrice, sellPrice
                })
            });
        }

        closeModal('add-product-modal');
        e.target.reset();
        await fetchProducts(); // Refresh list

    } catch (err) {
        console.error('Error adding product:', err);
        alert('Error adding product');
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
            switchView('shop');
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
window.logout = logout;
window.renderHistory = renderHistory;

// Simple Modals
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Start
init();
