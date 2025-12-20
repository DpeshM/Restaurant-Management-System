import './style.css'
import { restaurantDB } from './supabase.js'

const config = {
  restaurantName: localStorage.getItem('restaurant_name') || 'Restaurant Pro',
  googleSheetsWebhook: localStorage.getItem('google_sheets_webhook') || '',
  tables: [],
  menu: [],
  orders: [],
  selectedTable: null,
  selectedItems: {},
  currentKitchenFilter: 'pending'
}

function updateTime() {
  const now = new Date()
  const time = now.toLocaleTimeString()
  const date = now.toLocaleDateString()
  document.getElementById('currentTime').textContent = `${date} ${time}`
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification')
  notification.textContent = message
  notification.style.background = type === 'error' ? '#f44336' : '#4CAF50'
  notification.style.display = 'block'

  setTimeout(() => {
    notification.style.display = 'none'
  }, 3000)
}

function openModal(modalId) {
  document.getElementById(modalId).style.display = 'flex'
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none'
}

window.switchTab = function(tabName) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active')
  })

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active')
  })

  event.target.classList.add('active')
  document.getElementById(tabName).classList.add('active')

  switch (tabName) {
    case 'tables':
      loadTables()
      break
    case 'menu':
      loadMenu()
      break
    case 'kitchen':
      loadKitchenOrders()
      break
    case 'checkout':
      loadCheckout()
      break
  }
}

async function loadAllData() {
  try {
    const [tables, menu, orders] = await Promise.all([
      restaurantDB.getTables(),
      restaurantDB.getMenu(),
      restaurantDB.getOrders()
    ])

    config.tables = tables
    config.menu = menu
    config.orders = orders

    displayTables()

    if (document.getElementById('menu').classList.contains('active')) {
      displayMenu()
    }
    if (document.getElementById('kitchen').classList.contains('active')) {
      displayKitchenOrders()
    }
    if (document.getElementById('checkout').classList.contains('active')) {
      displayCheckout()
    }

    if (config.googleSheetsWebhook) {
      await syncToGoogleSheets()
    }
  } catch (error) {
    console.error('Error loading data:', error)
    showNotification('Error loading data', 'error')
  }
}

async function syncToGoogleSheets() {
  try {
    if (!config.googleSheetsWebhook) return

    await restaurantDB.syncToGoogleSheets(config.googleSheetsWebhook)
  } catch (error) {
    console.error('Sync error:', error)
  }
}

async function loadTables() {
  try {
    const tables = await restaurantDB.getTables()
    config.tables = tables
    displayTables()
  } catch (error) {
    showNotification('Error loading tables', 'error')
  }
}

function displayTables() {
  const container = document.getElementById('tablesList')

  if (config.tables.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No tables found. Add your first table!</p>'
    return
  }

  let html = ''

  config.tables.forEach(table => {
    const isOccupied = table.status === 'occupied'
    const orderId = table.current_order_id || ''

    html += `
      <div class="card table-card ${isOccupied ? 'occupied' : ''}" onclick="handleTableClick('${table.table_no}', ${isOccupied}, '${orderId}')">
        <h3 style="margin-bottom: 10px;">Table ${table.table_no}</h3>
        <p style="color: #666; margin-bottom: 5px;">Capacity: ${table.capacity || 4} seats</p>
        <p style="margin-bottom: 10px;">
          <span style="background: ${isOccupied ? '#f44336' : '#4CAF50'}; color: white; padding: 3px 8px; border-radius: 10px; font-size: 12px;">
            ${isOccupied ? 'Occupied' : 'Vacant'}
          </span>
        </p>
        ${isOccupied ? `<p style="font-size: 12px; color: #666;">Order: #${orderId.substring(0, 8)}</p>` : ''}
      </div>
    `
  })

  container.innerHTML = html
}

window.handleTableClick = function(tableNo, isOccupied, orderId) {
  config.selectedTable = tableNo

  if (isOccupied) {
    const order = config.orders.find(o => o.order_id === orderId)
    if (order) {
      showOrderDetails(order)
    }
  } else {
    openCreateOrderModal(tableNo)
  }
}

function openCreateOrderModal(tableNo) {
  document.getElementById('orderTableTitle').textContent = `Table ${tableNo} - Add Items`
  config.selectedTable = tableNo
  config.selectedItems = {}

  let menuHtml = '<h4>Select Menu Items:</h4>'

  const categories = {}
  config.menu.forEach(item => {
    if (item.available !== false) {
      if (!categories[item.category]) {
        categories[item.category] = []
      }
      categories[item.category].push(item)
    }
  })

  for (const [category, items] of Object.entries(categories)) {
    menuHtml += `<h5 style="margin-top: 15px; color: #ff9700;">${category}</h5>`

    items.forEach(item => {
      menuHtml += `
        <div class="menu-item-select">
          <div>
            <strong>${item.item_name}</strong>
            <p style="color: #666; font-size: 14px; margin-top: 3px;">${item.description || ''}</p>
            <span style="color: #ff9700; font-weight: bold;">₹${item.price}</span>
          </div>
          <div class="counter">
            <button onclick="updateItemQuantity('${item.item_id}', -1)">-</button>
            <input type="text" id="qty-${item.item_id}" value="0" readonly>
            <button onclick="updateItemQuantity('${item.item_id}', 1)">+</button>
          </div>
        </div>
      `
    })
  }

  document.getElementById('menuItemsSelection').innerHTML = menuHtml
  document.getElementById('selectedItemsList').innerHTML = 'No items selected'
  document.getElementById('orderTotal').textContent = 'Total: ₹0'

  openModal('createOrderModal')
}

window.updateItemQuantity = function(itemId, change) {
  const input = document.getElementById(`qty-${itemId}`)
  let current = parseInt(input.value) || 0
  current = Math.max(0, current + change)
  input.value = current

  const item = config.menu.find(m => m.item_id === itemId)
  if (!item) return

  if (current > 0) {
    config.selectedItems[itemId] = {
      id: itemId,
      name: item.item_name,
      price: parseFloat(item.price),
      quantity: current
    }
  } else {
    delete config.selectedItems[itemId]
  }

  updateOrderSummary()
}

function updateOrderSummary() {
  const items = Object.values(config.selectedItems)
  let total = 0
  let itemsHtml = ''

  items.forEach(item => {
    const itemTotal = item.price * item.quantity
    total += itemTotal

    itemsHtml += `
      <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
        <span>${item.quantity}x ${item.name}</span>
        <span>₹${itemTotal}</span>
      </div>
    `
  })

  const selectedItemsDiv = document.getElementById('selectedItemsList')
  const totalDiv = document.getElementById('orderTotal')

  if (items.length > 0) {
    selectedItemsDiv.innerHTML = itemsHtml
    totalDiv.textContent = `Total: ₹${total}`
  } else {
    selectedItemsDiv.innerHTML = 'No items selected'
    totalDiv.textContent = 'Total: ₹0'
  }
}

window.sendOrderToKitchen = async function() {
  const items = Object.values(config.selectedItems)

  if (items.length === 0) {
    showNotification('Please select at least one item', 'error')
    return
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  try {
    await restaurantDB.createOrder({
      table_no: config.selectedTable,
      customer_name: 'Customer',
      items: items,
      total_amount: total,
      status: 'pending',
      payment_status: 'pending'
    })

    showNotification('Order sent to kitchen!')
    closeModal('createOrderModal')
    await loadAllData()
  } catch (error) {
    showNotification('Failed to create order', 'error')
  }
}

window.openAddTableModal = function() {
  document.getElementById('tableNumber').value = ''
  document.getElementById('tableCapacity').value = '4'
  openModal('addTableModal')
}

window.addTable = async function() {
  const tableNo = document.getElementById('tableNumber').value.trim()
  const capacity = parseInt(document.getElementById('tableCapacity').value)

  if (!tableNo) {
    showNotification('Please enter table number', 'error')
    return
  }

  try {
    await restaurantDB.addTable({
      table_no: tableNo,
      capacity: capacity,
      status: 'vacant'
    })

    showNotification('Table added successfully')
    closeModal('addTableModal')
    await loadTables()
  } catch (error) {
    showNotification('Failed to add table', 'error')
  }
}

window.refreshTables = function() {
  loadTables()
  showNotification('Tables refreshed')
}

async function loadMenu() {
  try {
    const menu = await restaurantDB.getMenu()
    config.menu = menu
    displayMenu()
  } catch (error) {
    showNotification('Error loading menu', 'error')
  }
}

function displayMenu() {
  const container = document.getElementById('menuList')

  if (config.menu.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No menu items found. Add your first item!</p>'
    return
  }

  const categories = {}
  config.menu.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = []
    }
    categories[item.category].push(item)
  })

  let html = ''

  for (const [category, items] of Object.entries(categories)) {
    html += `
      <div class="card" style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #ff9700; padding-bottom: 10px; margin-bottom: 15px;">${category}</h3>
    `

    items.forEach(item => {
      html += `
        <div class="menu-item-select">
          <div style="flex: 1;">
            <strong>${item.item_name}</strong>
            <p style="color: #666; font-size: 14px; margin-top: 3px;">${item.description || ''}</p>
            <span style="color: #ff9700; font-weight: bold;">₹${item.price}</span>
          </div>
        </div>
      `
    })

    html += '</div>'
  }

  container.innerHTML = html
}

window.openAddMenuItemModal = function() {
  document.getElementById('itemName').value = ''
  document.getElementById('itemCategory').value = ''
  document.getElementById('itemPrice').value = ''
  document.getElementById('itemDescription').value = ''
  openModal('addMenuItemModal')
}

window.addMenuItem = async function() {
  const name = document.getElementById('itemName').value.trim()
  const category = document.getElementById('itemCategory').value.trim()
  const price = parseFloat(document.getElementById('itemPrice').value)
  const description = document.getElementById('itemDescription').value.trim()

  if (!name || !category || !price) {
    showNotification('Please fill all required fields', 'error')
    return
  }

  try {
    await restaurantDB.addMenuItem({
      item_name: name,
      category: category,
      price: price,
      description: description,
      kitchen_station: 'Main Kitchen',
      prep_time: 15,
      available: true
    })

    showNotification('Menu item added successfully')
    closeModal('addMenuItemModal')
    await loadMenu()
  } catch (error) {
    showNotification('Failed to add menu item', 'error')
  }
}

window.refreshMenu = function() {
  loadMenu()
  showNotification('Menu refreshed')
}

async function loadKitchenOrders() {
  try {
    const orders = await restaurantDB.getOrders(
      config.currentKitchenFilter === 'all' ? 'all' : config.currentKitchenFilter
    )
    displayKitchenOrders(orders)
  } catch (error) {
    showNotification('Error loading kitchen orders', 'error')
  }
}

function displayKitchenOrders(orders = []) {
  const container = document.getElementById('kitchenOrders')

  const kitchenOrders = orders.filter(order =>
    ['pending', 'ready'].includes(order.status)
  )

  if (kitchenOrders.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No orders in kitchen</p>'
    return
  }

  let html = ''

  kitchenOrders.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : []
    const timeAgo = getTimeAgo(order.timestamp)

    html += `
      <div class="card" style="border-left: 5px solid ${order.status === 'ready' ? '#4CAF50' : '#ff9800'};">
        <h3 style="margin-bottom: 10px;">Table ${order.table_no}</h3>
        <p style="color: #666; font-size: 14px; margin-bottom: 5px;">Order #${order.order_id?.substring(0, 8) || 'N/A'}</p>
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">${timeAgo}</p>

        <div style="margin: 10px 0; max-height: 150px; overflow-y: auto;">
          ${items.map(item => `
            <div style="padding: 5px 0; border-bottom: 1px solid #eee;">
              <strong>${item.quantity}x ${item.name}</strong>
            </div>
          `).join('')}
        </div>

        ${order.status === 'pending' ? `
          <button class="btn btn-success" onclick="markOrderReady('${order.order_id}')" style="width: 100%;">✅ Mark as Ready</button>
        ` : `
          <button class="btn" disabled style="width: 100%; background: #4CAF50; color: white;">✅ Ready</button>
        `}
      </div>
    `
  })

  container.innerHTML = html
}

window.markOrderReady = async function(orderId) {
  try {
    await restaurantDB.updateOrderStatus(orderId, 'ready')
    showNotification('Order marked as ready')
    await loadKitchenOrders()
    await loadCheckout()
  } catch (error) {
    showNotification('Failed to update order', 'error')
  }
}

window.filterOrders = function(filter) {
  config.currentKitchenFilter = filter
  loadKitchenOrders()
}

async function loadCheckout() {
  try {
    const orders = await restaurantDB.getOrders()
    displayCheckout(orders)
  } catch (error) {
    showNotification('Error loading checkout', 'error')
  }
}

function displayCheckout(orders = []) {
  const container = document.getElementById('checkoutContent')

  const today = new Date().toDateString()
  const todayOrders = orders.filter(order =>
    new Date(order.timestamp).toDateString() === today
  )

  const totalRevenue = todayOrders.reduce((sum, order) =>
    sum + parseFloat(order.total_amount || 0), 0
  )

  const paidOrders = todayOrders.filter(order => order.payment_status === 'paid').length

  container.innerHTML = `
    <div class="cards-grid">
      <div class="card">
        <h3>📊 Today's Summary</h3>
        <p>Total Orders: ${todayOrders.length}</p>
        <p>Paid Orders: ${paidOrders}</p>
        <p>Pending Orders: ${todayOrders.length - paidOrders}</p>
        <p style="font-weight: bold; color: #ff9700; margin-top: 10px; font-size: 18px;">
          Total Revenue: ₹${totalRevenue.toFixed(2)}
        </p>
      </div>

      <div class="card">
        <h3>⚡ Quick Actions</h3>
        <div style="margin-top: 15px;">
          <button class="btn" onclick="viewAllOrders()" style="width: 100%; margin-bottom: 10px;">📋 View All Orders</button>
          <button class="btn btn-primary" onclick="processPendingPayments()" style="width: 100%;">💳 Process Payments</button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 20px;">
      <h3>📋 Recent Orders</h3>
      <div id="recentOrdersList" style="margin-top: 15px;">
        ${displayRecentOrders(todayOrders.slice(0, 5))}
      </div>
    </div>
  `
}

function displayRecentOrders(orders) {
  if (orders.length === 0) {
    return '<p style="color: #666; text-align: center; padding: 20px;">No recent orders</p>'
  }

  let html = ''

  orders.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : []
    const itemCount = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)

    html += `
      <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>Table ${order.table_no}</strong>
          <p style="color: #666; font-size: 14px;">${itemCount} items • ₹${parseFloat(order.total_amount || 0).toFixed(2)}</p>
        </div>
        <div>
          <span style="background: ${order.payment_status === 'paid' ? '#4CAF50' : '#ff9800'}; color: white; padding: 3px 8px; border-radius: 10px; font-size: 12px;">
            ${order.payment_status === 'paid' ? 'Paid' : 'Pending'}
          </span>
        </div>
      </div>
    `
  })

  return html
}

window.processPendingPayments = function() {
  const pendingOrders = config.orders.filter(order =>
    order.payment_status !== 'paid'
  )

  if (pendingOrders.length === 0) {
    showNotification('No pending payments', 'error')
    return
  }

  let html = '<h4>Pending Payments:</h4>'

  pendingOrders.forEach(order => {
    html += `
      <div style="padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0;">
        <p><strong>Table ${order.table_no}</strong></p>
        <p>Order #${order.order_id?.substring(0, 8)}</p>
        <p>Amount: ₹${parseFloat(order.total_amount || 0).toFixed(2)}</p>
        <button class="btn btn-primary" onclick="processPayment('${order.order_id}')" style="width: 100%; margin-top: 10px;">
          Process Payment
        </button>
      </div>
    `
  })

  document.getElementById('paymentContent').innerHTML = html
  openModal('paymentModal')
}

window.processPayment = function(orderId) {
  const order = config.orders.find(o => o.order_id === orderId)
  if (!order) return

  document.getElementById('paymentContent').innerHTML = `
    <h4>Process Payment</h4>
    <p>Order: #${orderId.substring(0, 8)}</p>
    <p>Table: ${order.table_no}</p>
    <p>Amount: ₹${parseFloat(order.total_amount || 0).toFixed(2)}</p>

    <h5 style="margin-top: 15px;">Select Payment Method:</h5>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0;">
      <button class="btn" onclick="completePayment('${orderId}', 'cash')" style="padding: 15px;">
        💵 Cash
      </button>
      <button class="btn" onclick="completePayment('${orderId}', 'card')" style="padding: 15px;">
        💳 Card
      </button>
      <button class="btn" onclick="completePayment('${orderId}', 'qr')" style="padding: 15px;">
        📱 QR
      </button>
      <button class="btn" onclick="completePayment('${orderId}', 'upi')" style="padding: 15px;">
        📲 UPI
      </button>
    </div>
  `

  openModal('paymentModal')
}

window.completePayment = async function(orderId, method) {
  const order = config.orders.find(o => o.order_id === orderId)
  if (!order) return

  try {
    await restaurantDB.processPayment({
      order_id: orderId,
      amount: order.total_amount,
      method: method,
      cashier: 'System'
    })

    showNotification(`Payment processed via ${method}`)
    closeModal('paymentModal')
    await loadAllData()

    generateReceipt(orderId, method)
  } catch (error) {
    showNotification('Payment failed', 'error')
  }
}

function generateReceipt(orderId, paymentMethod) {
  const order = config.orders.find(o => o.order_id === orderId)
  if (!order) return

  const items = Array.isArray(order.items) ? order.items : []

  let receipt = `
    <html>
    <head>
      <title>Receipt</title>
      <style>
        body { font-family: Arial; padding: 20px; max-width: 300px; }
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
  `

  items.forEach(item => {
    const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)
    receipt += `
      <div class="item">
        <span>${item.quantity}x ${item.name}</span>
        <span>₹${itemTotal.toFixed(2)}</span>
      </div>
    `
  })

  receipt += `
      </div>
      <div class="total">
        <div class="item">
          <span>Total</span>
          <span>₹${parseFloat(order.total_amount || 0).toFixed(2)}</span>
        </div>
        <div class="item">
          <span>Payment</span>
          <span>${paymentMethod.toUpperCase()}</span>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <p>Thank you for visiting!</p>
      </div>
    </body>
    </html>
  `

  const win = window.open('', '_blank')
  win.document.write(receipt)
  win.document.close()
  win.print()
}

window.viewAllOrders = function() {
  let html = '<h4>All Orders Today:</h4>'

  const today = new Date().toDateString()
  const todayOrders = config.orders.filter(order =>
    new Date(order.timestamp).toDateString() === today
  )

  if (todayOrders.length === 0) {
    html += '<p>No orders today</p>'
  } else {
    todayOrders.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : []
      const itemCount = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)

      html += `
        <div style="padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0;">
          <p><strong>Table ${order.table_no}</strong> - ${order.status}</p>
          <p>Items: ${itemCount} | Total: ₹${parseFloat(order.total_amount || 0).toFixed(2)}</p>
          <p>Payment: ${order.payment_status === 'paid' ? 'Paid' : 'Pending'}</p>
        </div>
      `
    })
  }

  document.getElementById('paymentContent').innerHTML = html
  openModal('paymentModal')
}

window.generateDailyReport = function() {
  const today = new Date().toDateString()
  const todayOrders = config.orders.filter(order =>
    new Date(order.timestamp).toDateString() === today
  )

  let report = `Daily Report - ${today}\n`
  report += '='.repeat(40) + '\n\n'

  todayOrders.forEach((order, index) => {
    report += `${index + 1}. Order ${order.order_id?.substring(0, 8)} - Table ${order.table_no}\n`
    report += `   Status: ${order.status} | Payment: ${order.payment_status}\n`
    report += `   Amount: ₹${parseFloat(order.total_amount || 0).toFixed(2)}\n\n`
  })

  const total = todayOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0)
  report += `\nTotal Orders: ${todayOrders.length}\n`
  report += `Total Revenue: ₹${total.toFixed(2)}\n`

  const blob = new Blob([report], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `report-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  showNotification('Daily report generated')
}

window.refreshCheckout = function() {
  loadCheckout()
  showNotification('Checkout refreshed')
}

function showOrderDetails(order) {
  const items = Array.isArray(order.items) ? order.items : []

  let html = `
    <h4>Order Details</h4>
    <p><strong>Table:</strong> ${order.table_no}</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <p><strong>Time:</strong> ${new Date(order.timestamp).toLocaleTimeString()}</p>

    <h5 style="margin-top: 15px;">Items:</h5>
    <div style="max-height: 200px; overflow-y: auto; margin: 10px 0;">
  `

  items.forEach(item => {
    const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)
    html += `
      <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
        <div style="display: flex; justify-content: space-between;">
          <span>${item.quantity}x ${item.name}</span>
          <span>₹${itemTotal.toFixed(2)}</span>
        </div>
      </div>
    `
  })

  html += `
    </div>
    <div style="border-top: 2px solid #ff9700; padding-top: 10px; margin-top: 15px;">
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px;">
        <span>Total:</span>
        <span>₹${parseFloat(order.total_amount || 0).toFixed(2)}</span>
      </div>
    </div>

    <div style="margin-top: 20px;">
      ${order.payment_status !== 'paid' ? `
        <button class="btn btn-primary" onclick="processPayment('${order.order_id}')" style="width: 100%;">
          Process Payment
        </button>
      ` : `
        <button class="btn" disabled style="width: 100%; background: #4CAF50; color: white;">
          Already Paid
        </button>
      `}
    </div>
  `

  document.getElementById('paymentContent').innerHTML = html
  openModal('paymentModal')
}

window.openSettingsModal = function() {
  document.getElementById('googleSheetsWebhook').value = config.googleSheetsWebhook
  document.getElementById('restaurantName').value = config.restaurantName
  openModal('settingsModal')
}

window.saveSettings = function() {
  const webhook = document.getElementById('googleSheetsWebhook').value.trim()
  const name = document.getElementById('restaurantName').value.trim()

  config.googleSheetsWebhook = webhook
  config.restaurantName = name || 'Restaurant Pro'

  localStorage.setItem('google_sheets_webhook', webhook)
  localStorage.setItem('restaurant_name', config.restaurantName)

  document.querySelector('.logo').textContent = config.restaurantName

  closeModal('settingsModal')
  showNotification('Settings saved successfully!')
}

window.closeModal = closeModal

function getTimeAgo(timestamp) {
  if (!timestamp) return 'just now'

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

document.addEventListener('DOMContentLoaded', function () {
  updateTime()
  setInterval(updateTime, 1000)

  loadAllData()
  setInterval(loadAllData, 10000)
})
