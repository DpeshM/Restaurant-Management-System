# Restaurant Management System

A complete restaurant management system with real-time data sync to Google Sheets. Built with Supabase for data storage and Vite for fast development.

## Features

- **Table Management**: Track table status, capacity, and current orders
- **Menu Management**: Add and manage menu items with categories and pricing
- **Kitchen Display**: Real-time order tracking for kitchen staff
- **Payment Processing**: Multiple payment methods (Cash, Card, UPI, QR)
- **Receipt Generation**: Print receipts for completed orders
- **Daily Reports**: Generate and download daily sales reports
- **Google Sheets Sync**: Optional real-time data sync to Google Sheets

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will start and automatically open in your browser.

### 3. Configure Restaurant Settings

1. Click the **Settings** button in the top right corner
2. Enter your restaurant name
3. (Optional) Add Google Sheets webhook URL for data sync

## Database Schema

The system uses Supabase with the following tables:

### Tables
- `restaurant_tables`: Restaurant table information
- `menu_items`: Menu items with pricing and details
- `orders`: Customer orders with items and status
- `payments`: Payment records with method and amount

All tables come pre-populated with sample data for testing.

## Setting Up Google Sheets Sync (Optional)

If you want to sync your restaurant data to Google Sheets for backup or reporting:

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Restaurant Management Data"

### Step 2: Set Up Google Apps Script

1. In your Google Sheet, click **Extensions** > **Apps Script**
2. Delete any default code
3. Copy the entire contents of `GoogleAppsScript.js` file from this project
4. Paste it into the Apps Script editor
5. Click the **Save** icon (disk icon)
6. Name your project "Restaurant Sync API"

### Step 3: Deploy as Web App

1. Click **Deploy** > **New deployment**
2. Click the gear icon next to "Select type"
3. Choose **Web app**
4. Configure:
   - Description: "Restaurant Data Sync"
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**
6. Review permissions and click **Authorize access**
7. Choose your Google account
8. Click **Advanced** > **Go to Restaurant Sync API (unsafe)**
9. Click **Allow**
10. Copy the **Web app URL** (it will look like: `https://script.google.com/macros/s/...`)

### Step 4: Configure Your Restaurant App

1. In the restaurant management system, click **Settings**
2. Paste the Web app URL into "Google Sheets Webhook URL"
3. Click **Save Settings**

Your data will now automatically sync to Google Sheets every 10 seconds!

## Google Sheets Structure

The sync will create 4 sheets automatically:

1. **Tables**: All restaurant tables with status
2. **Menu**: Complete menu with items and pricing
3. **Orders**: All orders with items and amounts
4. **Payments**: Payment history with methods

## Usage Guide

### Managing Tables

1. Click the **Tables** tab
2. Click **+ Add Table** to create a new table
3. Enter table number and capacity
4. Click on a table card to:
   - Create a new order (if vacant)
   - View existing order (if occupied)

### Managing Menu

1. Click the **Menu** tab
2. Click **+ Add Item** to add a new menu item
3. Fill in:
   - Item name
   - Category (e.g., Main Course, Beverages)
   - Price
   - Description
4. Click **Add Menu Item**

### Taking Orders

1. Go to **Tables** tab
2. Click on a vacant table
3. Select menu items using the + and - buttons
4. Review selected items and total
5. Click **Send to Kitchen**

### Kitchen Operations

1. Click the **Kitchen** tab
2. View pending orders
3. Click **Mark as Ready** when food is prepared
4. Use filters to view:
   - Pending orders
   - Ready orders
   - All orders

### Processing Payments

1. Click the **Checkout** tab
2. Click **Process Payments** to see pending payments
3. Select an order to process
4. Choose payment method:
   - Cash
   - Card
   - QR Code
   - UPI
5. Receipt will automatically open for printing
6. Table status automatically updates to vacant

### Generating Reports

1. Click the **Checkout** tab
2. Click **Daily Report** button
3. Report will automatically download as a text file
4. Contains:
   - All orders for the day
   - Order status
   - Payment status
   - Total revenue

## Technical Details

### Built With

- **Frontend**: HTML, CSS, JavaScript (ES6 modules)
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **Database Client**: @supabase/supabase-js
- **Sync**: Google Apps Script (optional)

### File Structure

```
restaurant-management/
├── index.html              # Main HTML file
├── style.css               # Styles
├── main.js                 # Application logic
├── supabase.js            # Supabase client and database functions
├── GoogleAppsScript.js    # Google Sheets sync script
├── package.json           # Dependencies
└── README.md             # This file
```

### Key Features of the Codebase

- **Real-time Updates**: Data refreshes every 10 seconds
- **Modular Code**: Separate files for different concerns
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Comprehensive error handling throughout
- **Security**: Row Level Security enabled on all tables

## Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist` folder.

## Preview Production Build

```bash
npm run preview
```

## Default Sample Data

The system comes with:
- 5 sample tables (T01-T05)
- 8 sample menu items across 4 categories:
  - Main Course: Burger, Pizza, Pasta
  - Salads: Caesar Salad
  - Sides: French Fries
  - Beverages: Coca Cola, Fresh Juice
  - Desserts: Chocolate Cake

## Troubleshooting

### Google Sheets sync not working
- Ensure you copied the Web app URL correctly
- Check that the Google Apps Script is deployed as "Anyone" can access
- Verify the URL starts with `https://script.google.com/macros/s/`

### Data not loading
- Check browser console for errors
- Verify Supabase credentials in `.env` file
- Ensure internet connection is stable

### Tables not updating
- Use the Refresh button
- Auto-refresh runs every 10 seconds
- Check if you're viewing the correct tab

## Support

For issues or questions, check the browser console for error messages.

## License

This project is for restaurant management use.
