// Portal Types
export type PortalType = 'admin' | 'partner' | 'client' | 'affiliate'

export interface PortalAccess {
  admin: boolean
  partner: boolean
  client: boolean
  affiliate: boolean
}

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
  // Portal access fields
  partnerId?: string
  clientId?: string
  affiliateId?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  portalType: PortalType | null
  portalAccess: PortalAccess | null
  partner: Partner | null
  client: Client | null
  affiliate: AffiliateStats | null
}

// Partner Types
export type PartnerType = 'SERVICE_REFERRAL' | 'PRODUCT_AFFILIATE' | 'FULL_PARTNER'
export type PartnerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'

export interface Partner {
  id: string
  partnerNumber: string
  name: string
  email: string
  phone: string | null
  company: string | null
  partnerType: PartnerType
  status: PartnerStatus
  firstSaleRate: number
  recurringRate: number
  shopCommissionRate: number
  totalEarned: number
  pendingAmount: number
  totalPaid: number
  stripeConnectId: string | null
  stripeConnectStatus: 'NOT_CONNECTED' | 'PENDING' | 'ACTIVE' | 'RESTRICTED'
  contract: Contract | null
  contractSignedAt: string | null
  createdAt: string
}

// Client Types
export type ClientType = 'INDIVIDUAL' | 'BUSINESS' | 'ENTERPRISE'
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface Client {
  id: string
  clientNumber: string
  name: string
  email: string
  phone: string | null
  company: string | null
  type: ClientType
  status: ClientStatus
  totalRevenue: number
  totalOutstanding: number
  autopayEnabled: boolean
  defaultPaymentMethod: string | null
  notes: string | null
  createdAt: string
}

// Lead Types
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST'

export interface Lead {
  id: string
  leadNumber: string
  businessName: string
  contactName: string
  email: string
  phone: string | null
  status: LeadStatus
  interests: string[]
  notes: string | null
  estimatedValue: number | null
  partnerId: string
  createdAt: string
  convertedAt: string | null
}

// Commission Types
export type CommissionType = 'FIRST_SALE' | 'RECURRING' | 'SHOP_PURCHASE' | 'BONUS'
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'

export interface Commission {
  id: string
  commissionNumber: string
  type: CommissionType
  amount: number
  status: CommissionStatus
  description: string | null
  sourceId: string | null
  sourceType: string | null
  partnerId: string
  createdAt: string
  approvedAt: string | null
  paidAt: string | null
}

// Payout Types
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Payout {
  id: string
  payoutNumber: string
  amount: number
  status: PayoutStatus
  method: 'STRIPE' | 'MANUAL' | 'CHECK'
  stripeTransferId: string | null
  notes: string | null
  partnerId: string
  createdAt: string
  processedAt: string | null
  paidAt: string | null
}

// Invoice Types
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'

export interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  client?: Client
  subtotal: number
  tax: number
  discount: number
  total: number
  status: InvoiceStatus
  dueDate: string
  paidAt: string | null
  notes: string | null
  items: InvoiceItem[]
  createdAt: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

// Contract Types
export type ContractStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'EXPIRED' | 'CANCELLED'

export interface Contract {
  id: string
  contractNumber: string
  title: string
  description: string | null
  status: ContractStatus
  totalValue: number
  startDate: string | null
  endDate: string | null
  signedAt: string | null
  signatureUrl: string | null
  fileUrl: string | null
  clientId: string | null
  partnerId: string | null
  createdAt: string
}

// Project Types
export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

export interface Project {
  id: string
  projectNumber: string
  name: string
  description: string | null
  status: ProjectStatus
  clientId: string
  client?: Client
  startDate: string | null
  endDate: string | null
  estimatedHours: number | null
  actualHours: number | null
  budget: number | null
  progress: number
  createdAt: string
}

// Affiliate Types
export interface AffiliateStats {
  id: string
  affiliateCode: string
  customCode: string | null
  points: {
    total: number
    available: number
    redeemed: number
    toNextReward: number
    nextRewardAmount: number
  }
  stats: {
    totalReferrals: number
    successfulReferrals: number
    proConversions: number
    proDaysEarned: number
    totalEarnings: number
  }
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  partnerEligible: boolean
  shareLink: string
  createdAt: string
}

export interface AffiliateReferral {
  id: string
  referralCode: string
  status: 'PENDING' | 'SIGNED_UP' | 'CONVERTED' | 'EXPIRED'
  referredEmail: string | null
  referredName: string | null
  pointsEarned: number
  createdAt: string
  convertedAt: string | null
}

// Partner Dashboard Types
export interface PartnerDashboard {
  partner: Partner
  stats: {
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    pendingCommissions: number
    totalEarned: number
    thisMonthEarned: number
  }
  recentLeads: Lead[]
  recentCommissions: Commission[]
  pendingPayouts: Payout[]
}

// Client Dashboard Types
export interface ClientDashboard {
  client: Client
  stats: {
    activeProjects: number
    totalProjects: number
    outstandingBalance: number
    totalSpent: number
    nextPaymentDue: string | null
    nextPaymentAmount: number | null
  }
  activeProjects: Project[]
  recentInvoices: Invoice[]
  pendingContracts: Contract[]
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
  parentId: string | null
  active: boolean
  _count?: {
    products: number
  }
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
