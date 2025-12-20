function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'sync') {
      syncAllData(data);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Data synced successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAllData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  syncTables(ss, data.tables || []);
  syncMenu(ss, data.menu || []);
  syncOrders(ss, data.orders || []);
  syncPayments(ss, data.payments || []);
}

function syncTables(ss, tables) {
  let sheet = ss.getSheetByName('Tables');

  if (!sheet) {
    sheet = ss.insertSheet('Tables');
    sheet.appendRow(['Table No', 'Capacity', 'Status', 'Current Order ID', 'Created At', 'Updated At']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#ff9700');
  }

  sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();

  if (tables.length > 0) {
    const rows = tables.map(table => [
      table.table_no,
      table.capacity,
      table.status,
      table.current_order_id || '',
      table.created_at,
      table.updated_at
    ]);

    sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }
}

function syncMenu(ss, menu) {
  let sheet = ss.getSheetByName('Menu');

  if (!sheet) {
    sheet = ss.insertSheet('Menu');
    sheet.appendRow(['Item ID', 'Item Name', 'Category', 'Price', 'Description', 'Kitchen Station', 'Prep Time', 'Available', 'Created At', 'Updated At']);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#ff9700');
  }

  sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).clearContent();

  if (menu.length > 0) {
    const rows = menu.map(item => [
      item.item_id,
      item.item_name,
      item.category,
      item.price,
      item.description || '',
      item.kitchen_station,
      item.prep_time,
      item.available,
      item.created_at,
      item.updated_at
    ]);

    sheet.getRange(2, 1, rows.length, 10).setValues(rows);
  }
}

function syncOrders(ss, orders) {
  let sheet = ss.getSheetByName('Orders');

  if (!sheet) {
    sheet = ss.insertSheet('Orders');
    sheet.appendRow(['Order ID', 'Table No', 'Customer Name', 'Items', 'Total Amount', 'Status', 'Payment Status', 'Timestamp', 'Completed At', 'Created At', 'Updated At']);
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#ff9700');
  }

  sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).clearContent();

  if (orders.length > 0) {
    const rows = orders.map(order => [
      order.order_id,
      order.table_no,
      order.customer_name,
      JSON.stringify(order.items),
      order.total_amount,
      order.status,
      order.payment_status,
      order.timestamp,
      order.completed_at || '',
      order.created_at,
      order.updated_at
    ]);

    sheet.getRange(2, 1, rows.length, 11).setValues(rows);
  }
}

function syncPayments(ss, payments) {
  let sheet = ss.getSheetByName('Payments');

  if (!sheet) {
    sheet = ss.insertSheet('Payments');
    sheet.appendRow(['Payment ID', 'Order ID', 'Amount', 'Method', 'Cashier', 'Payment Time', 'Created At']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#ff9700');
  }

  sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).clearContent();

  if (payments.length > 0) {
    const rows = payments.map(payment => [
      payment.payment_id,
      payment.order_id,
      payment.amount,
      payment.method,
      payment.cashier,
      payment.payment_time,
      payment.created_at
    ]);

    sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Restaurant Management System Google Sheets Sync API is active',
    version: '1.0.0'
  })).setMimeType(ContentService.MimeType.JSON);
}
