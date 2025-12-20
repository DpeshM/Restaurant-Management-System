import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const restaurantDB = {
  async getTables() {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('table_no', { ascending: true })

    if (error) throw error
    return data
  },

  async addTable(tableData) {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert([tableData])
      .select()

    if (error) throw error
    return data[0]
  },

  async updateTableStatus(tableNo, status, orderId = null) {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({
        status,
        current_order_id: orderId,
        updated_at: new Date().toISOString()
      })
      .eq('table_no', tableNo)
      .select()

    if (error) throw error
    return data[0]
  },

  async getMenu() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })

    if (error) throw error
    return data
  },

  async addMenuItem(itemData) {
    const itemId = 'ITEM-' + Date.now()
    const { data, error } = await supabase
      .from('menu_items')
      .insert([{ ...itemData, item_id: itemId }])
      .select()

    if (error) throw error
    return data[0]
  },

  async updateMenuItem(itemId, updates) {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('item_id', itemId)
      .select()

    if (error) throw error
    return data[0]
  },

  async getOrders(status = 'all') {
    let query = supabase
      .from('orders')
      .select('*')
      .order('timestamp', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  async createOrder(orderData) {
    const orderId = 'ORD-' + Date.now()
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        ...orderData,
        order_id: orderId,
        timestamp: new Date().toISOString()
      }])
      .select()

    if (error) throw error

    await this.updateTableStatus(orderData.table_no, 'occupied', orderId)

    return data[0]
  },

  async updateOrderStatus(orderId, status) {
    const updates = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('order_id', orderId)
      .select()

    if (error) throw error
    return data[0]
  },

  async processPayment(paymentData) {
    const paymentId = 'PAY-' + Date.now()

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        ...paymentData,
        payment_id: paymentId,
        payment_time: new Date().toISOString()
      }])
      .select()

    if (paymentError) throw paymentError

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', paymentData.order_id)
      .select()

    if (orderError) throw orderError

    await this.updateTableStatus(order[0].table_no, 'vacant', null)

    return payment[0]
  },

  async syncToGoogleSheets(webhookUrl) {
    try {
      const [tables, menu, orders, payments] = await Promise.all([
        this.getTables(),
        this.getMenu(),
        this.getOrders(),
        supabase.from('payments').select('*')
      ])

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync',
          tables: tables,
          menu: menu || [],
          orders: orders || [],
          payments: payments.data || []
        })
      })

      return await response.json()
    } catch (error) {
      console.error('Sync error:', error)
      throw error
    }
  }
}
