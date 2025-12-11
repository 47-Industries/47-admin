import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE_URL = 'https://admin.47industries.com/api'
const TOKEN_KEY = 'auth_token'

class ApiService {
  private token: string | null = null

  async setToken(token: string | null) {
    this.token = token
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token)
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY)
    }
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token
    this.token = await AsyncStorage.getItem(TOKEN_KEY)
    return this.token
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/mobile-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me')
  }

  // Dashboard
  async getStats() {
    const data = await this.request<any>('/admin/stats')
    // Map the response to expected format
    return {
      totalOrders: data.stats?.ordersCount || 0,
      totalRevenue: data.stats?.revenue || 0,
      totalProducts: data.stats?.productsCount || 0,
      totalCustomers: data.stats?.customersCount || 0,
      pendingOrders: data.stats?.pendingOrdersCount || 0,
      customRequestsCount: data.stats?.customRequestsCount || 0,
      serviceInquiriesCount: data.stats?.serviceInquiriesCount || 0,
      recentActivity: data.recentActivity || [],
    }
  }

  // Products
  async getProducts(params?: { page?: number; limit?: number; search?: string; type?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.type) searchParams.set('type', params.type)
    return this.request<{ products: any[]; total: number }>(`/admin/products?${searchParams}`)
  }

  async getProduct(id: string) {
    return this.request<{ product: any }>(`/admin/products/${id}`)
  }

  async updateProduct(id: string, data: any) {
    return this.request<{ product: any }>(`/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async createProduct(data: any) {
    return this.request<{ product: any }>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteProduct(id: string) {
    return this.request<{ success: boolean }>(`/admin/products/${id}`, {
      method: 'DELETE',
    })
  }

  // Orders
  async getOrders(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return this.request<{ orders: any[]; total: number }>(`/admin/orders?${searchParams}`)
  }

  async getOrder(id: string) {
    return this.request<{ order: any }>(`/admin/orders/${id}`)
  }

  async updateOrder(id: string, data: any) {
    return this.request<{ order: any }>(`/admin/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async updateOrderStatus(id: string, status: string) {
    return this.updateOrder(id, { status })
  }

  async refundOrder(id: string, data: { amount: number; reason?: string }) {
    return this.request<{ order: any }>(`/admin/orders/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Returns
  async getReturns(params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ returns: any[]; stats: any }>(`/admin/returns?${searchParams}`)
  }

  async getReturn(id: string) {
    return this.request<{ return: any }>(`/admin/returns/${id}`)
  }

  async updateReturn(id: string, data: any) {
    return this.request<{ return: any }>(`/admin/returns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Users
  async getUsers(params?: { page?: number; limit?: number; role?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.role) searchParams.set('role', params.role)
    if (params?.search) searchParams.set('search', params.search)
    return this.request<{ users: any[]; total: number }>(`/admin/users?${searchParams}`)
  }

  async getUser(id: string) {
    return this.request<{ user: any }>(`/admin/users/${id}`)
  }

  async updateUser(id: string, data: any) {
    return this.request<{ user: any }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Custom 3D Print Requests
  async getCustomRequests(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return this.request<{ requests: any[]; total: number }>(`/admin/custom-requests?${searchParams}`)
  }

  async getCustomRequest(id: string) {
    return this.request<{ request: any }>(`/admin/custom-requests/${id}`)
  }

  async updateCustomRequest(id: string, data: any) {
    return this.request<{ request: any }>(`/admin/custom-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async sendQuote(id: string, data: { estimatedPrice: number; estimatedDays?: number; quoteNotes?: string }) {
    return this.request<{ request: any }>(`/admin/custom-requests/${id}/quote`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Service Inquiries
  async getInquiries(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return this.request<{ inquiries: any[]; total: number }>(`/admin/inquiries?${searchParams}`)
  }

  async getInquiry(id: string) {
    return this.request<{ inquiry: any }>(`/admin/inquiries/${id}`)
  }

  async updateInquiryStatus(id: string, status: string) {
    return this.request<{ inquiry: any }>(`/admin/inquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  async updateInquiry(id: string, data: any) {
    return this.request<{ inquiry: any }>(`/admin/inquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Expenses/Bills
  async getExpensesSummary() {
    return this.request<{
      summary: any[]
      upcomingBills: any[]
      overdueBills: any[]
      globalTotals: any
    }>('/admin/expenses-summary')
  }

  async getBills(params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ bills: any[]; total: number; founders: any[] }>(`/admin/bills?${searchParams}`)
  }

  async getBill(id: string) {
    return this.request<{ bill: any }>(`/admin/bills/${id}`)
  }

  async createBill(data: { vendor: string; vendorType: string; amount: number; dueDate?: string }) {
    return this.request<{ bill: any }>('/admin/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async markPaymentPaid(billId: string, userId: string) {
    return this.request<{ payment: any }>(`/admin/bills/${billId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ userId, status: 'PAID' }),
    })
  }

  async syncBills() {
    return this.request<{ success: boolean; created: number }>('/admin/bills/sync', {
      method: 'POST',
    })
  }

  async getSyncStatus() {
    return this.request<{
      configured: boolean
      accountEmail: string | null
      lastSync: string | null
      authUrl: string | null
    }>('/admin/bills/sync')
  }

  async deleteBill(id: string) {
    return this.request<{ success: boolean }>(`/admin/bills/${id}`, {
      method: 'DELETE',
    })
  }

  async getFounders() {
    return this.request<{ founders: any[] }>('/admin/founders')
  }

  // Analytics
  async getAnalytics(timeRange: string = '7d') {
    return this.request<any>(`/admin/analytics?range=${timeRange}`)
  }

  async getLiveAnalytics() {
    return this.request<any>('/admin/analytics/live')
  }

  // Settings
  async getSettings() {
    return this.request<{ settings: any }>('/admin/settings')
  }

  async updateSettings(data: any) {
    return this.request<{ settings: any }>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Categories
  async getCategories(params?: { type?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.set('type', params.type)
    return this.request<{ categories: any[] }>(`/admin/categories?${searchParams}`)
  }

  async createCategory(data: any) {
    return this.request<{ category: any }>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCategory(id: string, data: any) {
    return this.request<{ category: any }>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteCategory(id: string) {
    return this.request<{ success: boolean }>(`/admin/categories/${id}`, {
      method: 'DELETE',
    })
  }

  // Inventory
  async getInventory(params?: { search?: string; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ products: any[]; stats: any }>(`/admin/inventory?${searchParams}`)
  }

  async adjustStock(productId: string, data: { quantity: number; type: 'add' | 'subtract' | 'set'; reason?: string }) {
    return this.request<{ product: any }>(`/admin/inventory/${productId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Notifications
  async getNotifications() {
    return this.request<{ notifications: any[]; unreadCount: number }>('/admin/notifications')
  }

  async markNotificationRead(id: string) {
    return this.request<{ notification: any }>(`/admin/notifications/${id}/read`, {
      method: 'POST',
    })
  }

  async markAllNotificationsRead() {
    return this.request<{ success: boolean }>('/admin/notifications/read-all', {
      method: 'POST',
    })
  }

  // Services
  async getServicePackages() {
    return this.request<{ packages: any[] }>('/admin/services/packages')
  }

  async getServicePackage(id: string) {
    return this.request<{ package: any }>(`/admin/services/packages/${id}`)
  }

  async updateServicePackage(id: string, data: any) {
    return this.request<{ package: any }>(`/admin/services/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async createServicePackage(data: any) {
    return this.request<{ package: any }>('/admin/services/packages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteServicePackage(id: string) {
    return this.request<{ success: boolean }>(`/admin/services/packages/${id}`, {
      method: 'DELETE',
    })
  }

  async getServiceProjects() {
    return this.request<{ projects: any[] }>('/admin/services/projects')
  }

  async getServiceProject(id: string) {
    return this.request<{ project: any }>(`/admin/services/projects/${id}`)
  }

  async updateServiceProject(id: string, data: any) {
    return this.request<{ project: any }>(`/admin/services/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteServiceProject(id: string) {
    return this.request<{ success: boolean }>(`/admin/services/projects/${id}`, {
      method: 'DELETE',
    })
  }

  // Blog
  async getBlogPosts(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ posts: any[]; total: number }>(`/admin/blog/posts?${searchParams}`)
  }

  async getBlogPost(id: string) {
    return this.request<{ post: any }>(`/admin/blog/posts/${id}`)
  }

  async updateBlogPost(id: string, data: any) {
    return this.request<{ post: any }>(`/admin/blog/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async getBlogCategories() {
    return this.request<{ categories: any[] }>('/admin/blog/categories')
  }

  async getEmailCampaigns() {
    return this.request<{ campaigns: any[] }>('/admin/blog/campaigns')
  }

  // Reports
  async getSalesReport(params?: { range?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.range) searchParams.set('range', params.range)
    return this.request<any>(`/admin/reports/sales?${searchParams}`)
  }

  async getCustomerReport(params?: { range?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.range) searchParams.set('range', params.range)
    return this.request<any>(`/admin/reports/customers?${searchParams}`)
  }

  async getInventoryReport() {
    return this.request<any>('/admin/reports/inventory')
  }

  // Email (Zoho integration)
  async getEmailFolders() {
    return this.request<{ folders: any[]; mailboxes: any[] }>('/admin/email/folders')
  }

  async getEmails(params: { folderId: string; accountId?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams()
    searchParams.set('folder', params.folderId)
    if (params.accountId) searchParams.set('mailbox', params.accountId)
    if (params.page) searchParams.set('start', ((params.page - 1) * (params.limit || 50)).toString())
    if (params.limit) searchParams.set('limit', params.limit.toString())
    return this.request<{ emails: any[]; pagination: { hasMore: boolean } }>(`/admin/email/inbox?${searchParams}`)
  }

  async getEmail(messageId: string, accountId?: string) {
    const searchParams = new URLSearchParams()
    if (accountId) searchParams.set('accountId', accountId)
    return this.request<{ content: any }>(`/admin/email/${messageId}?${searchParams}`)
  }

  async sendEmail(data: { to: string; subject: string; body: string; accountId?: string }) {
    return this.request<{ success: boolean }>('/admin/email/send', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

export const api = new ApiService()
