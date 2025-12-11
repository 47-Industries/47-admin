// User & Auth Types
export interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'
  permissions: string[]
  isFounder: boolean
  createdAt: string
  _count?: {
    orders?: number
  }
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Product Types
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  comparePrice: number | null
  images: string[]
  categoryId: string
  category?: Category
  stock: number
  sku: string | null
  featured: boolean
  active: boolean
  productType: 'PHYSICAL' | 'DIGITAL'
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  productType: 'PHYSICAL' | 'DIGITAL'
  active: boolean
}

// Order Types
export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  items: OrderItem[]
  createdAt: string
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  total: number
  image: string | null
}

// Service Inquiry Types
export interface ServiceInquiry {
  id: string
  inquiryNumber: string
  name: string
  email: string
  phone: string | null
  company: string | null
  serviceType: ServiceType
  description: string
  message?: string
  budget?: string | number
  status: InquiryStatus
  createdAt: string
}

export type ServiceType = 'WEB_DEVELOPMENT' | 'APP_DEVELOPMENT' | 'AI_SOLUTIONS' | 'CONSULTATION' | 'OTHER' | 'CUSTOM_PC' | 'REPAIR'
export type InquiryStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NEW' | 'CONTACTED' | 'QUOTED' | 'PROPOSAL_SENT' | 'NEGOTIATING' | 'ACCEPTED' | 'DECLINED'

// Expense/Bill Types
export interface Bill {
  id: string
  vendor: string
  vendorType: string
  amount: number
  dueDate: string | null
  status: 'PENDING' | 'PAID' | 'OVERDUE'
  emailSubject: string | null
  createdAt: string
  payments: BillPayment[]
  founderCount: number
  perPersonAmount: number
}

export interface BillPayment {
  id: string
  amount: number
  status: 'PENDING' | 'PAID'
  paidDate: string | null
  user: {
    id: string
    name: string | null
    email: string | null
  }
}

export interface Founder {
  id: string
  name: string | null
  email: string | null
  image: string | null
  pendingAmount: number
  pendingCount: number
  paidAmount: number
  paidCount: number
}

export interface ExpensesSummary {
  founder: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  pending: { count: number; amount: number }
  paid: { count: number; amount: number }
  totalOwed: number
  totalPaid: number
}

export interface GlobalTotals {
  totalPending: number
  totalPaid: number
  upcomingBillsCount: number
  overdueBillsCount: number
  founderCount: number
}

// Stats Types
export interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  totalProducts: number
  totalCustomers: number
  pendingOrders: number
  lowStockProducts: number
  newInquiries: number
  recentOrders: Order[]
}
