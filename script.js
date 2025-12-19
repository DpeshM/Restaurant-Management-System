// Configuration
let config = {
    apiUrl: localStorage.getItem('restaurant_api_url') || '',
    restaurantName: localStorage.getItem('restaurant_name') || 'Restaurant Pro',
    tables: [],
    menu: [],
    orders: [],
    currentTab: 'tables',
    kitchenFilter: 'pending'
};

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    setInterval(updateTime, 1000);
    
    loadConfig();
    loadAllData();
    
    // Auto-refresh every 10 seconds
    setInterval(loadAllData, 10000);
});

function updateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString();
    const date = now.toLocaleDateString();
    document.getElementById('current-time').textContent = `${date} ${time}`;
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = '';
    notification.classList.add(type);
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Load configuration
function loadConfig() {
    const savedUrl = localStorage.getItem('restaurant_api_url');
    const savedName = localStorage.getItem('restaurant_name');
    
    if (savedUrl) {
        config.apiUrl = savedUrl;
    }
    if (savedName) {
        config.restaurantName = savedName;
        document.getElementById('restaurant-name').textContent = savedName;
    }
    
    // If no API URL, show settings
    if (!config.apiUrl) {
        setTimeout(openSettings, 1000);
    }
}

function openSettings() {
    document.getElementById('api-url').value = config.apiUrl;
    document.getElementById('restaurant-name-input').value = config.restaurantName;
    openModal('settings-modal');
}

function saveSettings() {
    const apiUrl = document.getElementById('api-url').value.trim();
    const restaurantName = document.getElementById('restaurant-name-input').value.trim();
    
    if (!apiUrl) {
        showNotification('Please enter API URL', 'error');
        return;
    }
    
    if (!restaurantName) {
        showNotification('Please enter restaurant name', 'error');
        return;
    }
    
    config.apiUrl = apiUrl;
    config.restaurantName = restaurantName;
    
    localStorage.setItem('restaurant_api_url', apiUrl);
    localStorage.setItem('restaurant_name', restaurantName);
    
    document.getElementById('restaurant-name').textContent = restaurantName;
    
    closeModal('settings-modal');
    showNotification('Settings saved successfully');
    
    // Load data with new settings
    loadAllData();
}

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tabBtn => {
        tabBtn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
    
    config.currentTab = tabName;
    
    // Load data for tab
    switch(tabName) {
        case 'tables':
            loadTables();
            break;
        case 'menu':
            loadMenu();
            break;
        case 'kitchen':
            loadKitchen();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'checkout':
            loadCheckout();
            break;
    }
}

// API Functions
async function callAPI(action, params = {}) {
    if (!config.apiUrl) {
        showNotification('Please configure API URL in settings', 'error');
        openSettings();
        return null;
    }
    
    const url = config.apiUrl;
    const formData = new FormData();
    formData.append('action', action);
    
    // Add all parameters
    for (const key in params) {
        if (params[key] !== undefined && params[key] !== null) {
            formData.append(key, params[key]);
        }
    }
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const text = await response.text();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse JSON:', text);
            return { success: false, message: 'Server error' };
        }
    } catch (error) {
        console.error('API Error:', error);
        showNotification('Network error. Check API URL.', 'error');
        return { success: false, message: error.message };
    }
}

// Load all data
async function loadAllData() {
    if (!config.apiUrl) return;
    
    try {
        await Promise.all([
            loadTables(),
            loadMenu(),
            loadOrders()
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Tables Functions
async function loadTables() {
    const container = document.getElementById('tables-list');
    if (!container) return;
    
    container.innerHTML = '<p>Loading tables...</p>';
    
    const result = await callAPI('getTables');
    
    if (result && result.success) {
        config.tables = result.tables || [];
        displayTables();
    } else {
        container.innerHTML = '<p class="error">Failed to load tables</p>';
    }
}

function displayTables() {
    const container = document.getElementById('tables-list');
    if (!container) return;
    
    if (config.tables.length === 0) {
        container.innerHTML = '<p>No tables found. Add your first table!</p>';
        return;
    }
    
    let html = '';
    
    config.tables.forEach(table => {
        const isOccupied = table.status === 'occupied';
        const orderId = table.current_order_id || '';
        
        html += `
            <div class="card table-card ${table.status}">
                <h3>Table ${table.table_no}</h3>
                <p>Capacity: ${table.capacity || 4} seats</p>
                <p>Status: <span class="status status-${table.status}">${table.status}</span></p>
                
                ${isOccupied && orderId ? `
                    <p>Order: #${orderId.substring(0, 8)}</p>
                ` : ''}
                
                <div class="btn-group">
                    ${!isOccupied ? `
                        <button class="btn btn-small btn-add" onclick="createOrder('${table.table_no}')">
                            <i class="fas fa-plus"></i> Order
                        </button>
                    ` : `
                        <button class="btn btn-small" onclick="viewOrderDetails('${orderId}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-small" onclick="markOrderReady('${orderId}')">
                            <i class="fas fa-check"></i> Ready
                        </button>
                        <button class="btn btn-small" onclick="processPayment('${orderId}')">
                            <i class="fas fa-credit-card"></i> Pay
                        </button>
                    `}
                    
                    <button class="btn btn-small" onclick="transferTable('${table.table_no}')">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function openAddTable() {
    document.getElementById('table-number').value = '';
    document.getElementById('table-capacity').value = '4';
    openModal('add-table-modal');
}

async function addTable() {
    const tableNo = document.getElementById('table-number').value.trim();
    const capacity = document.getElementById('table-capacity').value;
    
    if (!tableNo) {
        showNotification('Please enter table number', 'error');
        return;
    }
    
    const result = await callAPI('addTable', {
        tableNo: tableNo,
        capacity: capacity,
        status: 'vacant'
    });
    
    if (result && result.success) {
        showNotification('Table added successfully');
        closeModal('add-table-modal');
        loadTables();
    } else {
        showNotification(result?.message || 'Failed to add table', 'error');
    }
}

// Menu Functions
async function loadMenu() {
    const container = document.getElementById('menu-list');
    if (!container) return;
    
    container.innerHTML = '<p>Loading menu...</p>';
    
    const result = await callAPI('getMenu');
    
    if (result && result.success) {
        config.menu = result.menu || [];
        displayMenu();
    } else {
        container.innerHTML = '<p class="error">Failed to load menu</p>';
    }
}

function displayMenu() {
    const container = document.getElementById('menu-list');
    if (!container) return;
    
    if (config.menu.length === 0) {
        container.innerHTML = '<p>No menu items found. Add your first item!</p>';
        return;
    }
    
    // Group by category
    const categories = {};
    config.menu.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });
    
    let html = '';
    
    for (const [category, items] of Object.entries(categories)) {
        html += `
            <div class="card" style="margin-bottom: 20px;">
                <h3 style="border-bottom: 2px solid #ff9700; padding-bottom: 8px; margin-bottom: 10px;">
                    ${category}
                </h3>
        `;
        
        items.forEach(item => {
            html += `
                <div class="menu-item">
                    <div>
                        <strong>${item.item_name}</strong>
                        <p style="color: #666; font-size: 12px; margin-top: 3px;">${item.description || ''}</p>
                        <span style="color: #ff9700; font-weight: bold;">₹${item.price}</span>
                    </div>
                    <div>
                        <button class="btn btn-small" onclick="editMenuItem('${item.item_id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    container.innerHTML = html;
}

function openAddMenu() {
    document.getElementById('menu-name').value = '';
    document.getElementById('menu-category').value = '';
    document.getElementById('menu-price').value = '';
    openModal('add-menu-modal');
}

async function addMenuItem() {
    const name = document.getElementById('menu-name').value.trim();
    const category = document.getElementById('menu-category').value.trim();
    const price = document.getElementById('menu-price').value;
    
    if (!name || !category || !price) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    const result = await callAPI('addMenuItem', {
        name: name,
        category: category,
        price: price,
        description: '',
        kitchenStation: 'Main Kitchen',
        prepTime: 15
    });
    
    if (result && result.success) {
        showNotification('Menu item added successfully');
        closeModal('add-menu-modal');
        loadMenu();
    } else {
        showNotification(result?.message || 'Failed to add item', 'error');
    }
}

function editMenuItem(itemId) {
    const item = config.menu.find(m => m.item_id === itemId);
    if (!item) return;
    
    alert(`Edit ${item.item_name} - Feature in development`);
}

// Orders Functions
async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    container.innerHTML = '<p>Loading orders...</p>';
    
    const result = await callAPI('getOrders', { status: 'all' });
    
    if (result && result.success) {
        config.orders = result.orders || [];
        displayOrders();
        // Update kitchen display too
        if (config.currentTab === 'kitchen') {
            displayKitchenOrders();
        }
    } else {
        container.innerHTML = '<p class="error">Failed to load orders</p>';
    }
}

function displayOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    const activeOrders = config.orders.filter(order => 
        ['pending', 'ready', 'served'].includes(order.status)
    );
    
    if (activeOrders.length === 0) {
        container.innerHTML = '<p>No active orders</p>';
        return;
    }
    
    let html = '';
    
    activeOrders.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        const itemCount = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
        
        html += `
            <div class="card order-card ${order.status}">
                <h3>Order #${order.order_id?.substring(0, 8) || 'N/A'}</h3>
                <p>Table: ${order.table_no}</p>
                <p>Items: ${itemCount}</p>
                <p>Status: <span class="status status-${order.status}">${order.status}</span></p>
                <p>Total: ₹${parseFloat(order.total_amount || 0).toFixed(2)}</p>
                
                <div class="btn-group">
                    <button class="btn btn-small" onclick="viewOrderDetails('${order.order_id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    
                    ${order.status === 'pending' ? `
                        <button class="btn btn-small" onclick="markOrderReady('${order.order_id}')">
                            <i class="fas fa-check"></i> Ready
                        </button>
                    ` : order.status === 'ready' ? `
                        <button class="btn btn-small" onclick="markOrderServed('${order.order_id}')">
                            <i class="fas fa-check-double"></i> Served
                        </button>
                    ` : ''}
                    
                    ${order.payment_status !== 'paid' ? `
                        <button class="btn btn-small" onclick="processPayment('${order.order_id}')">
                            <i class="fas fa-credit-card"></i> Pay
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function createOrder(tableNo) {
    // Load menu first
    if (config.menu.length === 0) {
        await loadMenu();
    }
    
    if (config.menu.length === 0) {
        showNotification('Please add menu items first', 'error');
        return;
    }
    
    // Simple order creation - for demo, create with one sample item
    const sampleItem = config.menu[0];
    
    const items = [{
        id: sampleItem.item_id,
        name: sampleItem.item_name,
        price: sampleItem.price,
        quantity: 1
    }];
    
    const result = await callAPI('createOrder', {
        tableNo: tableNo,
        items: JSON.stringify(items),
        customerName: 'Walk-in Customer'
    });
    
    if (result && result.success) {
        showNotification('Order created successfully');
        loadTables();
        loadOrders();
    } else {
        showNotification('Failed to create order', 'error');
    }
}

async function viewOrderDetails(orderId) {
    const order = config.orders.find(o => o.order_id === orderId);
    if (!order) {
        showNotification('Order not found', 'error');
        return;
    }
    
    const items = Array.isArray(order.items) ? order.items : [];
    
    let itemsHtml = '';
    let total = 0;
    
    items.forEach(item => {
        const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
        total += itemTotal;
        
        itemsHtml += `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                <span>${item.quantity}x ${item.name}</span>
                <span>₹${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });
    
    document.getElementById('order-title').textContent = `Order #${orderId.substring(0, 8)}`;
    document.getElementById('order-details').innerHTML = `
        <p><strong>Table:</strong> ${order.table_no}</p>
        <p><strong>Status:</strong> <span class="status status-${order.status}">${order.status}</span></p>
        <p><strong>Time:</strong> ${new Date(order.timestamp).toLocaleTimeString()}</p>
        
        <h4 style="margin-top: 15px; margin-bottom: 10px;">Items:</h4>
        ${itemsHtml || '<p>No items</p>'}
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #ff9700;">
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span>Total:</span>
                <span>₹${total.toFixed(2)}</span>
            </div>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px;">
            ${order.status === 'pending' ? `
                <button class="btn" onclick="markOrderReady('${orderId}'); closeModal('order-modal')">
                    Mark Ready
                </button>
            ` : order.status === 'ready' ? `
                <button class="btn" onclick="markOrderServed('${orderId}'); closeModal('order-modal')">
                    Mark Served
                </button>
            ` : ''}
            
            <button class="btn btn-add" onclick="processPayment('${orderId}')">
                Process Payment
            </button>
        </div>
    `;
    
    openModal('order-modal');
}

async function markOrderReady(orderId) {
    const result = await callAPI('updateOrderStatus', {
        orderId: orderId,
        status: 'ready'
    });
    
    if (result && result.success) {
        showNotification('Order marked as ready');
        loadTables();
        loadOrders();
    } else {
        showNotification('Failed to update order', 'error');
    }
}

async function markOrderServed(orderId) {
    const result = await callAPI('updateOrderStatus', {
        orderId: orderId,
        status: 'served'
    });
    
    if (result && result.success) {
        showNotification('Order marked as served');
        loadTables();
        loadOrders();
    } else {
        showNotification('Failed to update order', 'error');
    }
}

// Kitchen Functions
async function loadKitchen() {
    const container = document.getElementById('kitchen-orders');
    if (!container) return;
    
    container.innerHTML = '<p>Loading kitchen orders...</p>';
    
    const result = await callAPI('getOrders', { 
        status: config.kitchenFilter === 'all' ? 'all' : config.kitchenFilter 
    });
    
    if (result && result.success) {
        displayKitchenOrders(result.orders || []);
    } else {
        container.innerHTML = '<p class="error">Failed to load kitchen orders</p>';
    }
}

function displayKitchenOrders(orders = config.orders) {
    const container = document.getElementById('kitchen-orders');
    if (!container) return;
    
    const kitchenOrders = orders.filter(order => 
        ['pending', 'ready'].includes(order.status)
    );
    
    if (kitchenOrders.length === 0) {
        container.innerHTML = '<p>No orders in kitchen</p>';
        return;
    }
    
    let html = '';
    
    kitchenOrders.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        
        html += `
            <div class="card order-card ${order.status}">
                <h3>Table ${order.table_no}</h3>
                <p>Order #${order.order_id?.substring(0, 8) || 'N/A'}</p>
                <p>Status: <span class="status status-${order.status}">${order.status}</span></p>
                
                <div style="margin: 10px 0; max-height: 150px; overflow-y: auto;">
                    ${items.map(item => `
                        <div style="padding: 5px 0; border-bottom: 1px solid #eee;">
                            ${item.quantity}x ${item.name}
                        </div>
                    `).join('')}
                </div>
                
                ${order.status === 'pending' ? `
                    <button class="btn btn-add" onclick="markOrderReady('${order.order_id}')" style="width: 100%;">
                        Mark as Ready
                    </button>
                ` : `
                    <button class="btn" disabled style="width: 100%; background: #4caf50; color: white;">
                        Ready for Service
                    </button>
                `}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function filterKitchen(filter) {
    config.kitchenFilter = filter;
    loadKitchen();
}

// Payment Functions
async function processPayment(orderId) {
    const order = config.orders.find(o => o.order_id === orderId);
    if (!order) {
        showNotification('Order not found', 'error');
        return;
    }
    
    document.getElementById('payment-details').innerHTML = `
        <p><strong>Order:</strong> #${orderId.substring(0, 8)}</p>
        <p><strong>Table:</strong> ${order.table_no}</p>
        <p><strong>Total Amount:</strong> ₹${parseFloat(order.total_amount || 0).toFixed(2)}</p>
        
        <h4 style="margin: 15px 0 10px 0;">Select Payment Method:</h4>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0;">
            <button class="btn" onclick="completePayment('${orderId}', 'cash')" style="padding: 15px;">
                <i class="fas fa-money-bill-wave"></i><br>Cash
            </button>
            <button class="btn" onclick="completePayment('${orderId}', 'card')" style="padding: 15px;">
                <i class="fas fa-credit-card"></i><br>Card
            </button>
            <button class="btn" onclick="completePayment('${orderId}', 'qr')" style="padding: 15px;">
                <i class="fas fa-qrcode"></i><br>QR Code
            </button>
            <button class="btn" onclick="completePayment('${orderId}', 'upi')" style="padding: 15px;">
                <i class="fas fa-mobile-alt"></i><br>UPI
            </button>
        </div>
    `;
    
    closeModal('order-modal');
    openModal('payment-modal');
}

async function completePayment(orderId, method) {
    const order = config.orders.find(o => o.order_id === orderId);
    if (!order) return;
    
    const result = await callAPI('processPayment', {
        orderId: orderId,
        amount: order.total_amount,
        method: method,
        cashier: 'Staff'
    });
    
    if (result && result.success) {
        showNotification(`Payment processed via ${method}`);
        closeModal('payment-modal');
        loadTables();
        loadOrders();
        
        // Print receipt
        printReceipt(orderId, result.transactionId);
    } else {
        showNotification('Payment failed', 'error');
    }
}

function printReceipt(orderId, transactionId) {
    const order = config.orders.find(o => o.order_id === orderId);
    if (!order) return;
    
    const items = Array.isArray(order.items) ? order.items : [];
    
    let receipt = `
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; }
                .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                .item { display: flex; justify-content: space-between; margin: 5px 0; }
                .total { border-top: 2px solid #000; padding-top: 10px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>${config.restaurantName}</h2>
                <p>${new Date().toLocaleString()}</p>
                <p>Order: ${orderId.substring(0, 8)}</p>
                <p>Table: ${order.table_no}</p>
            </div>
            <div style="margin: 20px 0;">
    `;
    
    items.forEach(item => {
        receipt += `
            <div class="item">
                <span>${item.quantity}x ${item.name}</span>
                <span>₹${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</span>
            </div>
        `;
    });
    
    receipt += `
            </div>
            <div class="total">
                <div class="item">
                    <span>Total</span>
                    <span>₹${parseFloat(order.total_amount || 0).toFixed(2)}</span>
                </div>
                <div class="item">
                    <span>Payment</span>
                    <span>${order.payment_method}</span>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <p>Thank you!</p>
                <p>Transaction: ${transactionId}</p>
            </div>
        </body>
        </html>
    `;
    
    const win = window.open('', '_blank');
    win.document.write(receipt);
    win.document.close();
    win.print();
}

// Transfer table
async function transferTable(tableNo) {
    const newTable = prompt(`Transfer table ${tableNo} to:`);
    if (!newTable) return;
    
    const table = config.tables.find(t => t.table_no === tableNo);
    if (!table || !table.current_order_id) {
        showNotification('No active order on this table', 'error');
        return;
    }
    
    const result = await callAPI('transferTable', {
        orderId: table.current_order_id,
        fromTable: tableNo,
        toTable: newTable
    });
    
    if (result && result.success) {
        showNotification(`Table transferred to ${newTable}`);
        loadTables();
    } else {
        showNotification('Transfer failed', 'error');
    }
}

// Checkout Functions
async function loadCheckout() {
    const container = document.getElementById('checkout-content');
    if (!container) return;
    
    container.innerHTML = '<p>Loading checkout data...</p>';
    
    const result = await callAPI('getOrders', { status: 'all' });
    
    if (result && result.success) {
        const orders = result.orders || [];
        displayCheckout(orders);
    } else {
        container.innerHTML = '<p class="error">Failed to load checkout data</p>';
    }
}

function displayCheckout(orders) {
    const container = document.getElementById('checkout-content');
    if (!container) return;
    
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => 
        new Date(order.timestamp).toDateString() === today
    );
    
    const totalRevenue = todayOrders.reduce((sum, order) => 
        sum + parseFloat(order.total_amount || 0), 0
    );
    
    const paidOrders = todayOrders.filter(order => order.payment_status === 'paid').length;
    
    container.innerHTML = `
        <div class="grid">
            <div class="card">
                <h3>Today's Summary</h3>
                <p>Total Orders: ${todayOrders.length}</p>
                <p>Paid Orders: ${paidOrders}</p>
                <p>Pending Orders: ${todayOrders.length - paidOrders}</p>
                <p style="font-weight: bold; color: #ff9700; margin-top: 10px;">
                    Today's Revenue: ₹${totalRevenue.toFixed(2)}
                </p>
            </div>
            
            <div class="card">
                <h3>Quick Actions</h3>
                <div style="margin-top: 15px;">
                    <button class="btn" onclick="generateReport()" style="width: 100%; margin-bottom: 10px;">
                        <i class="fas fa-file"></i> Generate Report
                    </button>
                    <button class="btn" onclick="viewAllOrders()" style="width: 100%; margin-bottom: 10px;">
                        <i class="fas fa-list"></i> View All Orders
                    </button>
                </div>
            </div>
        </div>
    `;
}

function generateReport() {
    const today = new Date().toDateString();
    const todayOrders = config.orders.filter(order => 
        new Date(order.timestamp).toDateString() === today
    );
    
    let report = `Daily Report - ${today}\n`;
    report += '='.repeat(30) + '\n\n';
    
    todayOrders.forEach((order, index) => {
        report += `${index + 1}. Order ${order.order_id?.substring(0, 8)} - Table ${order.table_no}\n`;
        report += `   Status: ${order.status} | Payment: ${order.payment_status}\n`;
        report += `   Amount: ₹${parseFloat(order.total_amount || 0).toFixed(2)}\n\n`;
    });
    
    const total = todayOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
    report += `\nTotal Orders: ${todayOrders.length}\n`;
    report += `Total Revenue: ₹${total.toFixed(2)}\n`;
    
    // Download as text file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showNotification('Report generated');
}

function viewAllOrders() {
    switchTab('orders');
}
