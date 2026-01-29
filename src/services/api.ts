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
  async login(email: string, password: string, portalType?: string) {
    return this.request<{
      user: any
      token: string
      portalAccess: { admin: boolean; partner: boolean; client: boolean; affiliate: boolean }
      partner?: any
      client?: any
      affiliate?: any
    }>('/auth/mobile-login', {
      method: 'POST',
      body: JSON.stringify({ email, password, portalType }),
    })
  }

  async getMe() {
    return this.request<{
      user: any
      portalAccess: { admin: boolean; partner: boolean; client: boolean; affiliate: boolean }
      partner?: any
      client?: any
      affiliate?: any
    }>('/auth/me')
  }

  // Partner Portal APIs
  async getPartnerDashboard() {
    return this.request<{
      partner: any
      stats: any
      recentLeads: any[]
      recentCommissions: any[]
      pendingPayouts: any[]
      motorevAffiliate: any | null
      motorevRecentActivity: any[]
    }>('/account/partner')
  }

  async getPartnerLeads(params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ leads: any[]; total: number }>(`/account/partner/leads?${searchParams}`)
  }

  async getPartnerLead(id: string) {
    return this.request<{ lead: any }>(`/account/partner/leads/${id}`)
  }

  async createPartnerLead(data: {
    businessName: string
    contactName: string
    email: string
    phone?: string
    interests: string[]
    notes?: string
    estimatedValue?: number
  }) {
    return this.request<{ lead: any }>('/account/partner/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePartnerLeadNotes(id: string, notes: string) {
    return this.request<{ lead: any }>(`/account/partner/leads/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    })
  }

  async getPartnerCommissions(params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ commissions: any[]; total: number; totals: any }>(`/account/partner/commissions?${searchParams}`)
  }

  async getPartnerPayouts(params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ payouts: any[]; total: number }>(`/account/partner/payouts?${searchParams}`)
  }

  // Stripe Connect for partner payouts
  async createStripeConnectLink() {
    return this.request<{ success: boolean; onboardingUrl: string }>('/account/partner/stripe-connect', {
      method: 'POST',
    })
  }

  async getStripeConnectStatus() {
    return this.request<{
      connected: boolean
      status: string | null
      detailsSubmitted?: boolean
      payoutsEnabled?: boolean
    }>('/account/partner/stripe-connect')
  }

  // Zoho Email APIs (Admin only)
  async getZohoConnectUrl() {
    return this.request<{ authUrl: string }>('/admin/email/connect?source=mobile')
  }

  async getZohoStatus() {
    return this.request<{
      connected: boolean
      status: 'CONNECTED' | 'TOKEN_EXPIRED' | 'NOT_CONNECTED'
    }>('/admin/email/status')
  }

  async getPartnerAffiliateStats() {
    return this.request<{ stats: any; links: any[] }>('/account/partner/affiliate/stats')
  }

  async getPartnerAffiliateLinks() {
    return this.request<{ links: any[] }>('/account/partner/affiliate/links')
  }

  async createPartnerAffiliateLink(data: {
    platform: string
    targetType: string
    targetId?: string
    name?: string
  }) {
    return this.request<{ link: any }>('/account/partner/affiliate/links', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPartnerContract() {
    return this.request<{
      contract: {
        id: string
        title: string
        description?: string
        fileUrl?: string
        fileName?: string
        status: 'DRAFT' | 'SENT' | 'SIGNED' | 'ACTIVE'
        signedAt?: string
        signedByName?: string
        signatureUrl?: string
        countersignedAt?: string
        countersignedByName?: string
        countersignatureUrl?: string
        createdAt: string
      } | null
      commissionRates?: {
        firstSaleRate: number
        recurringRate: number
        commissionType: string
      }
    }>('/account/partner/contract')
  }

  async signPartnerContract(signatureData: string) {
    return this.request<{ contract: any }>('/account/partner/contract/sign', {
      method: 'POST',
      body: JSON.stringify({ signature: signatureData }),
    })
  }

  async setupPartnerStripeConnect() {
    return this.request<{ url: string }>('/account/partner/stripe-connect', {
      method: 'POST',
    })
  }

  // Client Portal APIs
  async getClientDashboard() {
    return this.request<{
      client: any
      stats: any
      activeProjects: any[]
      recentInvoices: any[]
      pendingContracts: any[]
    }>('/account/client')
  }

  async getClientProjects(params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ projects: any[]; total: number }>(`/account/client/projects?${searchParams}`)
  }

  async getClientProject(id: string) {
    return this.request<{ project: any }>(`/account/client/projects/${id}`)
  }

  async getClientInvoices(params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ invoices: any[]; total: number; totals: any }>(`/account/client/invoices?${searchParams}`)
  }

  async getClientInvoice(id: string) {
    return this.request<{ invoice: any }>(`/account/client/invoices/${id}`)
  }

  async payClientInvoice(id: string, paymentMethodId?: string) {
    return this.request<{ invoice: any; paymentUrl?: string }>(`/account/client/invoices/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId }),
    })
  }

  async getClientContracts(params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ contracts: any[]; total: number }>(`/account/client/contracts?${searchParams}`)
  }

  async getClientContract(id: string) {
    return this.request<{ contract: any }>(`/account/client/contracts/${id}`)
  }

  async signClientContract(id: string, signatureData: string) {
    return this.request<{ contract: any }>(`/account/client/contracts/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify({ signature: signatureData }),
    })
  }

  async getClientAmendments(params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ amendments: any[]; total?: number }>(`/account/client/amendments?${searchParams}`)
  }

  async getClientAmendment(id: string) {
    return this.request<{ amendment: any }>(`/account/client/amendments/${id}`)
  }

  async signClientAmendment(id: string, signatureData: string) {
    return this.request<{ amendment: any }>(`/account/client/amendments/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify({ signature: signatureData }),
    })
  }

  async getClientBilling() {
    return this.request<{ paymentMethods: any[]; autopayEnabled: boolean; defaultMethod: string | null }>('/account/client/billing')
  }

  async updateClientBilling(data: { autopayEnabled?: boolean; defaultMethod?: string }) {
    return this.request<{ success: boolean }>('/account/client/billing', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Client Billing - Payment Methods
  async getClientPaymentMethods() {
    return this.request<{
      paymentMethods: {
        id: string
        brand: string
        last4: string
        expMonth: number
        expYear: number
        isDefault: boolean
      }[]
      outstandingBalance: number
      nextPaymentDate: string | null
      nextPaymentAmount: number | null
    }>('/account/client/billing/payment-methods')
  }

  async setDefaultPaymentMethod(paymentMethodId: string) {
    return this.request<{ success: boolean }>('/account/client/billing/payment-methods/default', {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId }),
    })
  }

  async removePaymentMethod(paymentMethodId: string) {
    return this.request<{ success: boolean }>(`/account/client/billing/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
    })
  }

  async getClientPaymentSetupUrl() {
    return this.request<{ setupUrl: string }>('/account/client/billing/setup')
  }

  // Client Billing - History
  async getClientBillingHistory(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    return this.request<{
      payments: {
        id: string
        invoiceNumber: string
        amount: number
        status: string
        paidAt: string | null
        receiptUrl: string | null
        createdAt: string
      }[]
      total: number
    }>(`/account/client/billing/history?${searchParams}`)
  }

  // Client Billing - Autopay
  async toggleAutopay(enabled: boolean) {
    return this.request<{ success: boolean; autopayEnabled: boolean }>('/account/client/billing/autopay', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    })
  }

  // Affiliate Portal APIs
  async getAffiliateStats() {
    return this.request<{
      affiliate: any
      stats: any
      recentReferrals: any[]
      rewards: any[]
    }>('/account/affiliate')
  }

  async getAffiliateReferrals(params?: { page?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    return this.request<{ referrals: any[]; total: number }>(`/account/affiliate/referrals?${searchParams}`)
  }

  async setAffiliateCustomCode(code: string) {
    return this.request<{ affiliate: any }>('/account/affiliate/custom-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  }

  async checkAffiliateCode(code: string) {
    return this.request<{ available: boolean; error?: string }>(`/account/affiliate/custom-code?code=${encodeURIComponent(code)}`)
  }

  async setAffiliateCode(code: string) {
    return this.request<{ success: boolean; affiliateCode?: string; error?: string }>('/account/affiliate/custom-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  }

  async getAffiliateShareLink() {
    return this.request<{ shareLink: string; code: string }>('/account/affiliate/share-link')
  }

  // Account APIs (shared across portals)
  async updateProfile(data: { name?: string; email?: string; phone?: string; image?: string }) {
    return this.request<{ user: any }>('/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<{ success: boolean }>('/account/password', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getNotificationSettings() {
    return this.request<{ settings: any }>('/account/notifications/settings')
  }

  async updateNotificationSettings(settings: any) {
    return this.request<{ settings: any }>('/account/notifications/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
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
    if (params?.type) searchParams.set('productType', params.type)
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

  // Product Variants
  async getProductVariants(productId: string) {
    return this.request<{ variants: any[] }>(`/admin/products/${productId}/variants`)
  }

  async createProductVariant(productId: string, data: {
    options: Record<string, string>
    price?: number
    stock?: number
    sku?: string
    comparePrice?: number
    image?: string
  }) {
    return this.request<any>(`/admin/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProductVariant(productId: string, variantId: string, data: {
    options?: Record<string, string>
    price?: number
    stock?: number
    sku?: string
    isActive?: boolean
    comparePrice?: number
    image?: string
  }) {
    return this.request<any>(`/admin/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProductVariant(productId: string, variantId: string) {
    return this.request<{ success: boolean }>(`/admin/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
    })
  }

  // Product Option Types
  async getOptionTypes() {
    return this.request<{ optionTypes: any[] }>('/admin/products/option-types')
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

  async updateReturnStatus(id: string, status: string, data?: { refundAmount?: number; notes?: string }) {
    return this.request<{ return: any }>(`/admin/returns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...data }),
    })
  }

  async issueRefund(orderId: string, data: { amount: number; reason?: string }) {
    return this.request<{ success: boolean; refundId: string; amount: number; order: any }>(`/admin/orders/${orderId}/refund`, {
      method: 'POST',
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

  // Expenses/Bills (v2 - new model)
  async getExpensesSummary(period?: string) {
    const searchParams = new URLSearchParams()
    if (period) searchParams.set('period', period)
    return this.request<{
      period: string
      founderCount: number
      bills: {
        pending: any[]
        paid: any[]
        overdue: any[]
        all: any[]
      }
      founderBalances: any[]
      totalOutstanding: number
      totals: {
        pending: number
        paid: number
        overdue: number
        monthlyTotal: number
      }
      upcomingBills: any[]
      upcomingCount: number
    }>(`/admin/expenses-summary-v2?${searchParams}`)
  }

  async getBillInstances(params?: { page?: number; status?: string; period?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.period) searchParams.set('period', params.period)
    return this.request<{ instances: any[]; total: number }>(`/admin/bill-instances?${searchParams}`)
  }

  async getBillInstance(id: string) {
    return this.request<{ instance: any }>(`/admin/bill-instances/${id}`)
  }

  async createBillInstance(data: { vendor: string; vendorType: string; amount: number; dueDate?: string; recurringBillId?: string }) {
    return this.request<{ instance: any }>('/admin/bill-instances', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateBillInstance(id: string, data: any) {
    return this.request<{ instance: any }>(`/admin/bill-instances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteBillInstance(id: string) {
    return this.request<{ success: boolean }>(`/admin/bill-instances/${id}`, {
      method: 'DELETE',
    })
  }

  async markFounderPaymentPaid(billInstanceId: string, userId: string) {
    return this.request<{ payment: any; success: boolean }>(`/admin/bill-instances/${billInstanceId}/founder-payments`, {
      method: 'POST',
      body: JSON.stringify({ userId, status: 'PAID' }),
    })
  }

  async getFounderPayments(billInstanceId: string) {
    return this.request<{ payments: any[] }>(`/admin/bill-instances/${billInstanceId}/founder-payments`)
  }

  // Recurring bills
  async getRecurringBills() {
    return this.request<{ recurringBills: any[] }>('/admin/recurring-bills')
  }

  async getRecurringBill(id: string) {
    return this.request<{ recurringBill: any }>(`/admin/recurring-bills/${id}`)
  }

  async createRecurringBill(data: {
    name: string
    vendor: string
    amountType: 'FIXED' | 'VARIABLE'
    fixedAmount?: number
    frequency: string
    dueDay: number
    emailPatterns?: string[]
    paymentMethod?: string
    vendorType: string
  }) {
    return this.request<{ recurringBill: any }>('/admin/recurring-bills', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRecurringBill(id: string, data: any) {
    return this.request<{ recurringBill: any }>(`/admin/recurring-bills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteRecurringBill(id: string) {
    return this.request<{ success: boolean }>(`/admin/recurring-bills/${id}`, {
      method: 'DELETE',
    })
  }

  // Bill scanning (manual trigger)
  async triggerBillScan() {
    return this.request<{ success: boolean; results: any }>('/cron/scan-bills', {
      method: 'POST',
    })
  }

  async scanBillImage(base64: string) {
    return this.request<{
      vendor?: string
      amount?: number
      vendorType?: string
      dueDate?: string
    }>('/admin/bills/scan', {
      method: 'POST',
      body: JSON.stringify({ image: base64 }),
    })
  }

  async getFounders() {
    return this.request<{ founders: any[] }>('/admin/founders')
  }

  // Bill Splits (v2 - team member based)
  async getBillSplits(billInstanceId: string) {
    return this.request<{ splits: any[] }>(`/admin/bill-instances/${billInstanceId}/bill-splits`)
  }

  async updateBillSplit(billInstanceId: string, splitId: string, data: { status?: string; amount?: number }) {
    return this.request<{ split: any }>(`/admin/bill-instances/${billInstanceId}/bill-splits`, {
      method: 'PATCH',
      body: JSON.stringify({ splitId, ...data }),
    })
  }

  // Proposed Bills (Approval Queue)
  async getProposedBills(params?: { status?: string; limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    return this.request<{ proposedBills: any[]; pendingCount: number; total: number }>(`/admin/proposed-bills?${searchParams}`)
  }

  async approveProposedBill(id: string, data?: { vendor?: string; vendorType?: string; createRecurring?: boolean; autoApprove?: boolean }) {
    return this.request<{ billInstance: any; recurringBill?: any }>(`/admin/proposed-bills/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    })
  }

  async skipProposedBill(id: string, data?: { createSkipRule?: boolean; skipRuleType?: string; vendor?: string; amount?: number }) {
    return this.request<{ success: boolean; skipRule?: any }>(`/admin/proposed-bills/${id}/skip`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    })
  }

  // Bank Transactions (Financial Connections)
  async getBankTransactions(params?: { matched?: boolean; limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.matched !== undefined) searchParams.set('matched', params.matched.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    return this.request<{ transactions: any[]; unmatchedCount: number; total: number }>(`/admin/financial-connections/transactions?${searchParams}`)
  }

  async getBankAccounts() {
    return this.request<{ accounts: any[] }>('/admin/financial-connections/accounts')
  }

  async syncBankAccount(accountId: string) {
    return this.request<{ success: boolean; transactionCount: number }>(`/admin/financial-connections/${accountId}/sync`, {
      method: 'POST',
    })
  }

  async matchBankTransaction(transactionId: string, billInstanceId: string) {
    return this.request<{ success: boolean }>(`/admin/financial-connections/transactions/${transactionId}/match`, {
      method: 'POST',
      body: JSON.stringify({ billInstanceId }),
    })
  }

  // Skip Rules
  async getSkipRules() {
    return this.request<{ skipRules: any[] }>('/admin/skip-rules')
  }

  async createSkipRule(data: { ruleType: string; vendor?: string; amount?: number; amountMin?: number; amountMax?: number; pattern?: string; accountId?: string; transactionType?: string }) {
    return this.request<{ skipRule: any }>('/admin/skip-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSkipRule(id: string, data: any) {
    return this.request<{ skipRule: any }>(`/admin/skip-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteSkipRule(id: string) {
    return this.request<{ success: boolean }>(`/admin/skip-rules/${id}`, {
      method: 'DELETE',
    })
  }

  // Email Accounts (for bill scanning)
  async getEmailAccounts() {
    return this.request<{ emailAccounts: any[] }>('/admin/email-accounts')
  }

  async createEmailAccount(data: { email: string; provider: string }) {
    return this.request<{ emailAccount: any; authUrl?: string }>('/admin/email-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteEmailAccount(id: string) {
    return this.request<{ success: boolean }>(`/admin/email-accounts/${id}`, {
      method: 'DELETE',
    })
  }

  // Expense Permission Check
  async checkExpensePermission() {
    return this.request<{ canAccess: boolean; userId: string | null; teamMemberId: string | null; reason: string }>('/admin/expense-permission')
  }

  // Legacy endpoints (for compatibility during migration)
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

  async deleteBill(id: string) {
    return this.request<{ success: boolean }>(`/admin/bills/${id}`, {
      method: 'DELETE',
    })
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
  async getCategories(params?: { type?: string; includeInactive?: boolean }) {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.set('productType', params.type)
    if (params?.includeInactive) searchParams.set('includeInactive', 'true')
    return this.request<{ categories: any[] }>(`/admin/categories?${searchParams}`)
  }

  async getCategory(id: string) {
    return this.request<{ category: any }>(`/admin/categories/${id}`)
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

  async deleteNotification(id: string) {
    return this.request<{ success: boolean }>(`/admin/notifications/${id}`, {
      method: 'DELETE',
    })
  }

  async getNotificationsWithFilter(filter?: 'all' | 'unread') {
    const searchParams = new URLSearchParams()
    if (filter) searchParams.set('filter', filter)
    return this.request<{
      notifications: any[]
      stats: { total: number; unread: number; today: number; thisWeek: number }
    }>(`/admin/notifications?${searchParams}`)
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

  async deleteBlogPost(id: string) {
    return this.request<{ success: boolean }>(`/admin/blog/posts/${id}`, {
      method: 'DELETE',
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
  async getEmailAccounts() {
    return this.request<{ mailboxes: { id: string; label: string; email: string }[] }>('/admin/email/accounts')
  }

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

  async sendEmail(data: { from: string; to: string; cc?: string; subject: string; body: string }) {
    return this.request<{ success: boolean }>('/admin/email/send', {
      method: 'POST',
      body: JSON.stringify({
        from: data.from,
        to: data.to,
        cc: data.cc,
        subject: data.subject,
        content: data.body,
        isHtml: false,
      }),
    })
  }

  // Admin Invoices
  async getAdminInvoices(params?: { page?: number; status?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return this.request<{ invoices: any[]; total: number }>(`/admin/invoices?${searchParams}`)
  }

  async getAdminInvoice(id: string) {
    return this.request<{ invoice: any }>(`/admin/invoices/${id}`)
  }

  async createAdminInvoice(data: {
    clientId: string
    items: { description: string; quantity: number; unitPrice: number }[]
    notes?: string
    dueDate?: string
    taxRate?: number
  }) {
    return this.request<{ invoice: any }>('/admin/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAdminInvoice(id: string, data: { status?: string; notes?: string; dueDate?: string }) {
    return this.request<{ invoice: any }>(`/admin/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async sendAdminInvoice(id: string) {
    return this.request<{ invoice: any; success: boolean }>(`/admin/invoices/${id}/send`, {
      method: 'POST',
    })
  }

  async deleteAdminInvoice(id: string) {
    return this.request<{ success: boolean }>(`/admin/invoices/${id}`, {
      method: 'DELETE',
    })
  }

  async sendAdminInvoiceReminder(id: string) {
    return this.request<{ success: boolean }>(`/admin/invoices/${id}/reminder`, {
      method: 'POST',
    })
  }

  // Admin Clients (for invoice creation)
  async getAdminClients(params?: { page?: number; search?: string; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ clients: any[]; total: number }>(`/admin/clients?${searchParams}`)
  }

  async getAdminClient(id: string) {
    return this.request<{ client: any }>(`/admin/clients/${id}`)
  }

  async createAdminClient(data: {
    name: string
    email: string
    phone?: string
    company?: string
    type?: string
    notes?: string
  }) {
    return this.request<{ client: any }>('/admin/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAdminClient(id: string, data: {
    name?: string
    email?: string
    phone?: string
    company?: string
    type?: string
    status?: string
    notes?: string
  }) {
    return this.request<{ client: any }>(`/admin/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Admin Partners
  async getAdminPartners(params?: { page?: number; status?: string; type?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.type) searchParams.set('type', params.type)
    if (params?.search) searchParams.set('search', params.search)
    return this.request<{
      partners: any[]
      total: number
      stats: {
        total: number
        active: number
        pending: number
        totalLeads: number
        totalCommissions: number
        pendingPayouts: number
      }
    }>(`/admin/partners?${searchParams}`)
  }

  async getAdminPartner(id: string) {
    return this.request<{ partner: any }>(`/admin/partners/${id}`)
  }

  async createAdminPartner(data: {
    name: string
    email: string
    phone?: string
    company?: string
    partnerType: 'SERVICE_REFERRAL' | 'PRODUCT_AFFILIATE' | 'BOTH'
    firstSaleRate?: number
    recurringRate?: number
    userId?: string
  }) {
    return this.request<{ partner: any; inviteSent: boolean }>('/admin/partners', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAdminPartner(id: string, data: {
    name?: string
    email?: string
    phone?: string
    company?: string
    partnerType?: 'SERVICE_REFERRAL' | 'PRODUCT_AFFILIATE' | 'BOTH'
    status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
    firstSaleRate?: number
    recurringRate?: number
    shopCommissionRate?: number
  }) {
    return this.request<{ partner: any }>(`/admin/partners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAdminPartner(id: string) {
    return this.request<{ success: boolean; softDeleted?: boolean }>(`/admin/partners/${id}`, {
      method: 'DELETE',
    })
  }

  async getAdminPartnerLeads(partnerId: string, params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ leads: any[]; total: number }>(`/admin/partners/${partnerId}/leads?${searchParams}`)
  }

  async getAdminPartnerCommissions(partnerId: string, params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ commissions: any[]; total: number }>(`/admin/partners/${partnerId}/commissions?${searchParams}`)
  }

  async getAdminPartnerPayouts(partnerId: string, params?: { page?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    return this.request<{ payouts: any[]; total: number }>(`/admin/partners/${partnerId}/payouts?${searchParams}`)
  }

  async createAdminPartnerPayout(partnerId: string, data: { amount: number; method?: 'STRIPE' | 'MANUAL' | 'CHECK'; notes?: string }) {
    return this.request<{ payout: any }>(`/admin/partners/${partnerId}/payouts`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Admin Partner Leads (all leads)
  async getAdminLeads(params?: { page?: number; status?: string; partnerId?: string; search?: string; interest?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.partnerId) searchParams.set('partnerId', params.partnerId)
    if (params?.search) searchParams.set('search', params.search)
    if (params?.interest) searchParams.set('interest', params.interest)
    return this.request<{ leads: any[]; stats?: any }>(`/admin/partners/leads?${searchParams}`)
  }

  async getAdminLead(id: string) {
    return this.request<{ lead: any; relatedPortfolio: any[]; recommendedServiceType: string }>(`/admin/partners/leads/${id}`)
  }

  async updateAdminLead(id: string, data: {
    businessName?: string
    contactName?: string
    email?: string
    phone?: string | null
    website?: string | null
    description?: string | null
    interests?: string[] | null
    estimatedBudget?: string | null
    timeline?: string | null
    companySize?: string | null
    currentSolution?: string | null
    painPoints?: string | null
    status?: string
    notes?: string | null
  }) {
    return this.request<{ success: boolean; lead: any }>(`/admin/partners/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async createAdminLead(data: {
    partnerId: string
    businessName: string
    contactName: string
    email: string
    phone?: string
    website?: string
    description?: string
    interests?: string[]
    estimatedBudget?: string
    timeline?: string
    notes?: string
  }) {
    return this.request<{ success: boolean; lead: any }>('/admin/partners/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Marketing / Email Campaigns
  async getCampaigns(params?: { status?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return this.request<{ campaigns: any[] }>(`/admin/marketing/campaigns?${searchParams}`)
  }

  async getCampaign(id: string) {
    return this.request<{ campaign: any }>(`/admin/marketing/campaigns/${id}`)
  }

  async createCampaign(data: {
    name: string
    subject: string
    content: string
    recipientType: 'all' | 'customers' | 'newsletter'
    status?: 'draft' | 'scheduled' | 'sending'
    scheduledAt?: string
  }) {
    return this.request<{ campaign: any }>('/admin/marketing/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCampaign(id: string, data: {
    name?: string
    subject?: string
    content?: string
    recipientType?: 'all' | 'customers' | 'newsletter'
    status?: 'draft' | 'scheduled' | 'sending'
    scheduledAt?: string
  }) {
    return this.request<{ campaign: any }>(`/admin/marketing/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteCampaign(id: string) {
    return this.request<{ success: boolean }>(`/admin/marketing/campaigns/${id}`, {
      method: 'DELETE',
    })
  }

  async sendCampaign(id: string) {
    return this.request<{ campaign: any }>(`/admin/marketing/campaigns/${id}/send`, {
      method: 'POST',
    })
  }

  async getCustomerSegments() {
    return this.request<{ segments: any[] }>('/admin/customers/segments')
  }

  async createCustomerSegment(data: { name: string; description?: string; color?: string }) {
    return this.request<any>('/admin/customers/segments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCustomerSegment(id: string, data: { name?: string; description?: string; color?: string }) {
    return this.request<any>(`/admin/customers/segments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCustomerSegment(id: string) {
    return this.request<{ success: boolean; memberCount: number }>(`/admin/customers/segments/${id}`, {
      method: 'DELETE',
    })
  }

  // Team Members
  async getTeamMembers(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return this.request<{
      teamMembers: any[]
      stats: { total: number; active: number; totalPayments: number }
    }>(`/admin/team?${searchParams}`)
  }

  async getTeamMember(id: string) {
    return this.request<{ teamMember: any }>(`/admin/team/${id}`)
  }

  async createTeamMember(data: {
    name: string
    email: string
    phone?: string
    title: string
    department?: string
    startDate: string
    salaryType?: string
    salaryAmount?: number
    salaryFrequency?: string
  }) {
    return this.request<{ teamMember: any }>('/admin/team', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTeamMember(id: string, data: any) {
    return this.request<{ teamMember: any }>(`/admin/team/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteTeamMember(id: string) {
    return this.request<{ success: boolean }>(`/admin/team/${id}`, {
      method: 'DELETE',
    })
  }

  // Affiliates (Admin)
  async getAdminAffiliates(params?: { page?: number; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.search) searchParams.set('search', params.search)
    return this.request<{ affiliates: any[]; total: number }>(`/admin/affiliates?${searchParams}`)
  }

  async getAdminAffiliate(id: string) {
    return this.request<{ affiliate: any }>(`/admin/affiliates/${id}`)
  }

  // Shipping Zones
  async getShippingZones() {
    return this.request<any[]>('/admin/shipping/zones')
  }

  async createShippingZone(data: {
    name: string
    countries: string[]
    states?: string[]
    zipCodes?: string
    active?: boolean
    priority?: number
  }) {
    return this.request<any>('/admin/shipping/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateShippingZone(id: string, data: {
    name?: string
    countries?: string[]
    states?: string[]
    zipCodes?: string
    active?: boolean
    priority?: number
  }) {
    return this.request<any>(`/admin/shipping/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteShippingZone(id: string) {
    return this.request<{ success: boolean }>(`/admin/shipping/zones/${id}`, {
      method: 'DELETE',
    })
  }

  // Shipping Rates
  async getShippingRates(zoneId: string) {
    return this.request<any>(`/admin/shipping/zones/${zoneId}`)
  }

  async createShippingRate(zoneId: string, data: {
    name: string
    description?: string
    baseRate: number
    perItemRate?: number
    perPoundRate?: number
    freeShippingMin?: number
    minDays?: number
    maxDays?: number
    carrier?: string
    serviceCode?: string
    active?: boolean
    sortOrder?: number
  }) {
    return this.request<any>(`/admin/shipping/zones/${zoneId}/rates`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateShippingRate(zoneId: string, rateId: string, data: {
    name?: string
    description?: string
    baseRate?: number
    perItemRate?: number
    perPoundRate?: number
    freeShippingMin?: number
    minDays?: number
    maxDays?: number
    carrier?: string
    serviceCode?: string
    active?: boolean
    sortOrder?: number
  }) {
    return this.request<any>(`/admin/shipping/rates/${rateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteShippingRate(zoneId: string, rateId: string) {
    return this.request<{ success: boolean }>(`/admin/shipping/rates/${rateId}`, {
      method: 'DELETE',
    })
  }

  // Documents
  async getDocuments(params?: { folderId?: string; category?: string; year?: number; search?: string; teamMemberId?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.folderId) searchParams.set('folderId', params.folderId)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.year) searchParams.set('year', params.year.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.teamMemberId) searchParams.set('teamMemberId', params.teamMemberId)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    return this.request<{ documents: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/admin/documents?${searchParams}`)
  }

  async getDocument(id: string) {
    return this.request<any>(`/admin/documents/${id}`)
  }

  async uploadDocument(formData: FormData) {
    const token = await this.getToken()
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    // Do NOT set Content-Type - let fetch set it with boundary for multipart
    const response = await fetch(`${API_BASE_URL}/admin/documents`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(error.error || 'Upload failed')
    }
    return response.json()
  }

  async updateDocument(id: string, data: any) {
    return this.request<any>(`/admin/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteDocument(id: string) {
    return this.request<{ success: boolean }>(`/admin/documents/${id}`, {
      method: 'DELETE',
    })
  }

  // Document Folders
  async getDocumentFolders(flat?: boolean) {
    const searchParams = new URLSearchParams()
    if (flat) searchParams.set('flat', 'true')
    return this.request<{ folders: any[] }>(`/admin/documents/folders?${searchParams}`)
  }

  async getDocumentFolder(id: string) {
    return this.request<any>(`/admin/documents/folders/${id}`)
  }

  async createDocumentFolder(data: { name: string; description?: string; parentId?: string; color?: string }) {
    return this.request<any>('/admin/documents/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDocumentFolder(id: string, data: any) {
    return this.request<any>(`/admin/documents/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteDocumentFolder(id: string) {
    return this.request<{ success: boolean }>(`/admin/documents/folders/${id}`, {
      method: 'DELETE',
    })
  }

  // Reports (with export support)
  async getReport(type: 'sales' | 'inventory' | 'customers', params?: { range?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.range) searchParams.set('period', params.range)
    return this.request<any>(`/admin/reports/${type}?${searchParams}`)
  }

  getReportExportUrl(type: 'sales' | 'inventory' | 'customers', format: 'csv' | 'pdf', params?: { range?: string }): string {
    const searchParams = new URLSearchParams()
    searchParams.set('format', format)
    if (params?.range) searchParams.set('period', params.range)
    return `${API_BASE_URL}/admin/reports/${type}/export?${searchParams}`
  }

  // Tax Rates
  async getTaxRates() {
    return this.request<any[]>('/admin/tax/rates')
  }

  async createTaxRate(data: {
    name: string
    country: string
    state?: string | null
    city?: string | null
    zipCode?: string | null
    rate: number
    isCompound?: boolean
    includeShipping?: boolean
    priority?: number
    active?: boolean
  }) {
    return this.request<any>('/admin/tax/rates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTaxRate(id: string, data: {
    name: string
    country: string
    state?: string | null
    city?: string | null
    zipCode?: string | null
    rate: number
    isCompound?: boolean
    includeShipping?: boolean
    priority?: number
    active?: boolean
  }) {
    return this.request<any>(`/admin/tax/rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTaxRate(id: string) {
    return this.request<{ success: boolean }>(`/admin/tax/rates/${id}`, {
      method: 'DELETE',
    })
  }
}

export const api = new ApiService()
