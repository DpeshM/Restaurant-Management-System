/*
  # Restaurant Management System Database Schema

  ## Overview
  Creates a complete database schema for restaurant management including tables, menu items, orders, and payments.

  ## New Tables
  
  ### 1. `restaurant_tables`
  - `id` (uuid, primary key)
  - `table_no` (text, unique) - Table number/identifier
  - `capacity` (integer) - Number of seats
  - `status` (text) - Current status: 'vacant' or 'occupied'
  - `current_order_id` (uuid, nullable) - Reference to active order
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `menu_items`
  - `id` (uuid, primary key)
  - `item_id` (text, unique) - Unique item identifier
  - `item_name` (text) - Name of the menu item
  - `category` (text) - Category (e.g., Main Course, Beverages)
  - `price` (numeric) - Item price
  - `description` (text, nullable)
  - `kitchen_station` (text) - Kitchen station for preparation
  - `prep_time` (integer) - Preparation time in minutes
  - `available` (boolean) - Whether item is available
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `orders`
  - `id` (uuid, primary key)
  - `order_id` (text, unique) - Unique order identifier
  - `table_no` (text) - Table number
  - `customer_name` (text)
  - `items` (jsonb) - Array of ordered items
  - `total_amount` (numeric) - Total order amount
  - `status` (text) - Order status: 'pending', 'ready', 'completed', 'cancelled'
  - `payment_status` (text) - Payment status: 'pending', 'paid'
  - `timestamp` (timestamptz) - Order creation time
  - `completed_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `payments`
  - `id` (uuid, primary key)
  - `payment_id` (text, unique) - Unique payment identifier
  - `order_id` (text) - Reference to order
  - `amount` (numeric) - Payment amount
  - `method` (text) - Payment method: 'cash', 'card', 'upi', 'qr'
  - `cashier` (text) - Cashier name
  - `payment_time` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for public access (for restaurant staff usage)
  
  ## Notes
  - All timestamps use timestamptz for timezone awareness
  - JSONB used for flexible item storage in orders
  - Indexes added for frequently queried fields
*/

-- Create restaurant_tables table
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_no text UNIQUE NOT NULL,
  capacity integer DEFAULT 4,
  status text DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied')),
  current_order_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text UNIQUE NOT NULL,
  item_name text NOT NULL,
  category text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  description text,
  kitchen_station text DEFAULT 'Main Kitchen',
  prep_time integer DEFAULT 15,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  table_no text NOT NULL,
  customer_name text DEFAULT 'Customer',
  items jsonb DEFAULT '[]'::jsonb,
  total_amount numeric DEFAULT 0 CHECK (total_amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'completed', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  timestamp timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text UNIQUE NOT NULL,
  order_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  method text NOT NULL CHECK (method IN ('cash', 'card', 'upi', 'qr')),
  cashier text DEFAULT 'System',
  payment_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_table_no ON restaurant_tables(table_no);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);
CREATE INDEX IF NOT EXISTS idx_orders_table_no ON orders(table_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- Enable Row Level Security
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for restaurant staff)
-- Note: In production, you should implement proper authentication

CREATE POLICY "Allow public read access to restaurant_tables"
  ON restaurant_tables FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to restaurant_tables"
  ON restaurant_tables FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to restaurant_tables"
  ON restaurant_tables FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to menu_items"
  ON menu_items FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to menu_items"
  ON menu_items FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to menu_items"
  ON menu_items FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to orders"
  ON orders FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to orders"
  ON orders FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to orders"
  ON orders FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to payments"
  ON payments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to payments"
  ON payments FOR INSERT
  TO public
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_restaurant_tables_updated_at ON restaurant_tables;
CREATE TRIGGER update_restaurant_tables_updated_at
  BEFORE UPDATE ON restaurant_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO restaurant_tables (table_no, capacity, status) VALUES
  ('T01', 4, 'vacant'),
  ('T02', 2, 'vacant'),
  ('T03', 6, 'vacant'),
  ('T04', 4, 'vacant'),
  ('T05', 2, 'vacant')
ON CONFLICT (table_no) DO NOTHING;

INSERT INTO menu_items (item_id, item_name, category, price, description, prep_time) VALUES
  ('ITEM-001', 'Burger', 'Main Course', 150, 'Classic beef burger with fries', 15),
  ('ITEM-002', 'Pizza Margherita', 'Main Course', 250, 'Traditional Italian pizza', 20),
  ('ITEM-003', 'Pasta Carbonara', 'Main Course', 200, 'Creamy pasta with bacon', 18),
  ('ITEM-004', 'Caesar Salad', 'Salads', 120, 'Fresh romaine with Caesar dressing', 10),
  ('ITEM-005', 'French Fries', 'Sides', 80, 'Crispy golden fries', 8),
  ('ITEM-006', 'Coca Cola', 'Beverages', 50, 'Chilled soft drink', 2),
  ('ITEM-007', 'Fresh Juice', 'Beverages', 80, 'Freshly squeezed orange juice', 5),
  ('ITEM-008', 'Chocolate Cake', 'Desserts', 100, 'Rich chocolate cake slice', 5)
ON CONFLICT (item_id) DO NOTHING;