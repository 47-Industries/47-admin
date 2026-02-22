import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  DashboardScreen,
  OrdersScreen,
  ProductsScreen,
  ExpensesScreen,
  SettingsScreen,
  InquiriesScreen,
  UsersScreen,
} from '../screens'
import OrderDetailScreen from '../screens/OrderDetailScreen'
import ProductDetailScreen from '../screens/ProductDetailScreen'
import ProductCreateScreen from '../screens/ProductCreateScreen'
import CustomRequestsScreen from '../screens/CustomRequestsScreen'
import CustomRequestDetailScreen from '../screens/CustomRequestDetailScreen'
import InquiryDetailScreen from '../screens/InquiryDetailScreen'
import UserDetailScreen from '../screens/UserDetailScreen'
import CustomerDetailScreen from '../screens/CustomerDetailScreen'
import ReturnsScreen from '../screens/admin/ReturnsScreen'
import AnalyticsScreen from '../screens/AnalyticsScreen'
import ServicesScreen from '../screens/ServicesScreen'
import EmailScreen from '../screens/EmailScreen'
import ReportsScreen from '../screens/ReportsScreen'
import ServicePackageDetailScreen from '../screens/ServicePackageDetailScreen'
import { RecurringBillsScreen } from '../screens/RecurringBillsScreen'
import { AccountScreen, ProfileEditScreen, ChangePasswordScreen } from '../screens/account'
import { CategoriesScreen } from '../screens/CategoriesScreen'
import { BrandsScreen } from '../screens/BrandsScreen'
import { InvoicesScreen as AdminInvoicesScreen } from '../screens/admin/InvoicesScreen'
import { InvoiceDetailScreen } from '../screens/admin/InvoiceDetailScreen'
import { InvoiceCreateScreen } from '../screens/admin/InvoiceCreateScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import { TeamScreen } from '../screens/TeamScreen'
import { ClientsScreen as AdminClientsScreen } from '../screens/admin/ClientsScreen'
import { PartnersScreen as AdminPartnersScreen } from '../screens/admin/PartnersScreen'
import { ClientDetailScreen } from '../screens/admin/ClientDetailScreen'
import { PartnerDetailScreen } from '../screens/admin/PartnerDetailScreen'
import { TeamMemberDetailScreen } from '../screens/admin/TeamMemberDetailScreen'
import { AffiliatesScreen } from '../screens/admin/AffiliatesScreen'
import { AffiliateDetailScreen } from '../screens/admin/AffiliateDetailScreen'
import { UserAffiliatesScreen } from '../screens/admin/UserAffiliatesScreen'
import { UserAffiliateDetailScreen } from '../screens/admin/UserAffiliateDetailScreen'
import { ShippingSettingsScreen } from '../screens/admin/ShippingSettingsScreen'
import { TaxSettingsScreen } from '../screens/admin/TaxSettingsScreen'
import { SocialSettingsScreen } from '../screens/admin/SocialSettingsScreen'
import { PartnerLeadsScreen } from '../screens/admin/PartnerLeadsScreen'
import { PartnerLeadDetailScreen } from '../screens/admin/PartnerLeadDetailScreen'
import MarketingScreen from '../screens/MarketingScreen'
import PortfolioScreen from '../screens/PortfolioScreen'
import PortfolioDetailScreen from '../screens/PortfolioDetailScreen'
import BlogScreen from '../screens/BlogScreen'
import BlogPostDetailScreen from '../screens/BlogPostDetailScreen'
import { DocumentsScreen } from '../screens/DocumentsScreen'
import { ExternalOrdersScreen } from '../screens/admin/ExternalOrdersScreen'
import { ExternalOrderDetailScreen } from '../screens/admin/ExternalOrderDetailScreen'
import BusinessCardsScreen from '../screens/admin/BusinessCardsScreen'
import CardGeneratorScreen from '../screens/admin/CardGeneratorScreen'
import { CollectionsScreen } from '../screens/CollectionsScreen'
import CollectionDetailScreen from '../screens/CollectionDetailScreen'
import CustomerDesignsScreen from '../screens/CustomerDesignsScreen'
import CustomerDesignDetailScreen from '../screens/CustomerDesignDetailScreen'
import EmailSignaturesScreen from '../screens/admin/EmailSignaturesScreen'
import { PartnerApplicationsScreen } from '../screens/admin/PartnerApplicationsScreen'
import { PartnerInquiriesScreen } from '../screens/admin/PartnerInquiriesScreen'
import { MLMConfigScreen } from '../screens/admin/MLMConfigScreen'
import InventoryScreen from '../screens/InventoryScreen'
import VariantsBulkEditScreen from '../screens/VariantsBulkEditScreen'
import { PrintQueueScreen } from '../screens/admin/PrintQueueScreen'
import { PrintfulDashboardScreen } from '../screens/admin/PrintfulDashboardScreen'
import { OAuthApplicationsScreen } from '../screens/admin/OAuthApplicationsScreen'
import { colors, portalColors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

type TabName = 'Home' | 'Sales' | 'Business' | 'People' | 'Account'

interface ScreenState {
  name: string
  params?: any
}

const tabs: { name: TabName; icon: string; iconFocused: string }[] = [
  { name: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'Sales', icon: 'cart-outline', iconFocused: 'cart' },
  { name: 'Business', icon: 'briefcase-outline', iconFocused: 'briefcase' },
  { name: 'People', icon: 'people-outline', iconFocused: 'people' },
  { name: 'Account', icon: 'person-outline', iconFocused: 'person' },
]

export default function AdminNavigator() {
  const [activeTab, setActiveTab] = useState<TabName>('Home')
  const [screenStack, setScreenStack] = useState<ScreenState[]>([])

  const navigate = useCallback((screen: string, params?: any) => {
    const tab = tabs.find(t => t.name === screen)
    if (tab) {
      setActiveTab(screen as TabName)
      setScreenStack([])
    } else {
      setScreenStack(prev => [...prev, { name: screen, params }])
    }
  }, [])

  const goBack = useCallback(() => {
    setScreenStack(prev => prev.slice(0, -1))
  }, [])

  const navigation = { navigate, goBack }
  const currentScreen = screenStack[screenStack.length - 1]

  const getParentTab = (screenName: string): TabName | null => {
    // Sales: Orders, Invoices, Returns, External Orders + Products, Categories, Brands, Collections, Inventory, Customer Designs
    const salesScreens = ['OrderDetail', 'Returns', 'AdminInvoices', 'InvoiceDetail', 'InvoiceCreate', 'Products', 'ProductDetail', 'ProductCreate', 'Categories', 'Brands', 'Collections', 'CollectionDetail', 'Inventory', 'Variants', 'ExternalOrders', 'ExternalOrderDetail', 'CustomerDesigns', 'CustomerDesignDetail']
    // Business: Requests (Inquiries, 3D Prints) + Packages + Portfolio + Finance (Expenses, Reports) + Analytics + Operations (Print Queue)
    const businessScreens = ['CustomRequests', 'CustomRequestDetail', 'InquiryDetail', 'Inquiries', 'Services', 'ServicePackageDetail', 'Portfolio', 'PortfolioDetail', 'Expenses', 'Reports', 'Analytics', 'RecurringBills', 'Documents', 'PrintQueue']
    // People: Clients, Partners, Team, Affiliates, User Affiliates, Users
    const peopleScreens = ['AdminClients', 'AdminPartners', 'Team', 'Users', 'UserDetail', 'CustomerDetail', 'ClientDetail', 'PartnerDetail', 'TeamMemberDetail', 'PartnerLeads', 'PartnerLeadDetail', 'Affiliates', 'AffiliateDetail', 'UserAffiliates', 'UserAffiliateDetail', 'PartnerApplications', 'PartnerInquiries', 'MLMConfig']
    // Account: Profile, Email, Settings, Notifications, Marketing, Blog, Business Cards, Email Signatures, OAuth
    const accountScreens = ['ProfileEdit', 'ChangePassword', 'Notifications', 'Settings', 'ShippingSettings', 'TaxSettings', 'SocialSettings', 'Email', 'EmailSignatures', 'Marketing', 'Blog', 'BlogPostDetail', 'BusinessCards', 'CardGenerator', 'OAuthApplications']

    if (salesScreens.includes(screenName)) return 'Sales'
    if (businessScreens.includes(screenName)) return 'Business'
    if (peopleScreens.includes(screenName)) return 'People'
    if (accountScreens.includes(screenName)) return 'Account'
    return null
  }

  const renderScreen = () => {
    if (currentScreen) {
      const ScreenWrapper = ({ children }: { children: React.ReactNode }) => (
        <SafeAreaView style={styles.stackedScreenContainer} edges={['top']}>
          {children}
        </SafeAreaView>
      )

      switch (currentScreen.name) {
        case 'OrderDetail':
          return <ScreenWrapper><OrderDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'ProductDetail':
          return <ScreenWrapper><ProductDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'ProductCreate':
          return <ScreenWrapper><ProductCreateScreen navigation={navigation} /></ScreenWrapper>
        case 'Products':
          return <ScreenWrapper><ProductsScreen navigation={navigation} /></ScreenWrapper>
        case 'CustomRequests':
          return <ScreenWrapper><CustomRequestsScreen navigation={navigation} /></ScreenWrapper>
        case 'CustomRequestDetail':
          return <ScreenWrapper><CustomRequestDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'InquiryDetail':
          return <ScreenWrapper><InquiryDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'Inquiries':
          return <ScreenWrapper><InquiriesScreen navigation={navigation} /></ScreenWrapper>
        case 'ServicePackageDetail':
          return <ScreenWrapper><ServicePackageDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'UserDetail':
          return <ScreenWrapper><UserDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'CustomerDetail':
          return <ScreenWrapper><CustomerDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'Returns':
          return <ScreenWrapper><ReturnsScreen navigation={navigation} /></ScreenWrapper>
        case 'Users':
          return <ScreenWrapper><UsersScreen navigation={navigation} /></ScreenWrapper>
        case 'Expenses':
          return <ScreenWrapper><ExpensesScreen navigation={navigation} /></ScreenWrapper>
        case 'Settings':
          return <ScreenWrapper><SettingsScreen navigation={navigation} /></ScreenWrapper>
        case 'ShippingSettings':
          return <ScreenWrapper><ShippingSettingsScreen navigation={navigation} /></ScreenWrapper>
        case 'TaxSettings':
          return <ScreenWrapper><TaxSettingsScreen navigation={navigation} /></ScreenWrapper>
        case 'SocialSettings':
          return <ScreenWrapper><SocialSettingsScreen navigation={navigation} /></ScreenWrapper>
        case 'Services':
          return <ScreenWrapper><ServicesScreen navigation={navigation} /></ScreenWrapper>
        case 'Email':
          return <ScreenWrapper><EmailScreen navigation={navigation} /></ScreenWrapper>
        case 'Reports':
          return <ScreenWrapper><ReportsScreen navigation={navigation} /></ScreenWrapper>
        case 'RecurringBills':
          return <ScreenWrapper><RecurringBillsScreen navigation={navigation} /></ScreenWrapper>
        case 'Analytics':
          return <ScreenWrapper><AnalyticsScreen navigation={navigation} /></ScreenWrapper>
        case 'ProfileEdit':
          return <ScreenWrapper><ProfileEditScreen navigation={navigation} /></ScreenWrapper>
        case 'ChangePassword':
          return <ScreenWrapper><ChangePasswordScreen navigation={navigation} /></ScreenWrapper>
        case 'Categories':
          return <ScreenWrapper><CategoriesScreen navigation={navigation} /></ScreenWrapper>
        case 'Brands':
          return <ScreenWrapper><BrandsScreen navigation={navigation} /></ScreenWrapper>
        case 'AdminInvoices':
          return <ScreenWrapper><AdminInvoicesScreen navigation={navigation} /></ScreenWrapper>
        case 'InvoiceDetail':
          return <ScreenWrapper><InvoiceDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'InvoiceCreate':
          return <ScreenWrapper><InvoiceCreateScreen navigation={navigation} /></ScreenWrapper>
        case 'Notifications':
          return <ScreenWrapper><NotificationsScreen navigation={navigation} /></ScreenWrapper>
        case 'Team':
          return <ScreenWrapper><TeamScreen navigation={navigation} /></ScreenWrapper>
        case 'AdminClients':
          return <ScreenWrapper><AdminClientsScreen navigation={navigation} /></ScreenWrapper>
        case 'AdminPartners':
          return <ScreenWrapper><AdminPartnersScreen navigation={navigation} /></ScreenWrapper>
        case 'PartnerDetail':
          return <ScreenWrapper><PartnerDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'ClientDetail':
          return <ScreenWrapper><ClientDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'TeamMemberDetail':
          return <ScreenWrapper><TeamMemberDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'Marketing':
          return <ScreenWrapper><MarketingScreen navigation={navigation} /></ScreenWrapper>
        case 'Affiliates':
          return <ScreenWrapper><AffiliatesScreen navigation={navigation} /></ScreenWrapper>
        case 'AffiliateDetail':
          return <ScreenWrapper><AffiliateDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'UserAffiliates':
          return <ScreenWrapper><UserAffiliatesScreen navigation={navigation} /></ScreenWrapper>
        case 'UserAffiliateDetail':
          return <ScreenWrapper><UserAffiliateDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'PartnerLeads':
          return <ScreenWrapper><PartnerLeadsScreen navigation={navigation} /></ScreenWrapper>
        case 'PartnerLeadDetail':
          return <ScreenWrapper><PartnerLeadDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'Portfolio':
          return <ScreenWrapper><PortfolioScreen navigation={navigation} /></ScreenWrapper>
        case 'PortfolioDetail':
          return <ScreenWrapper><PortfolioDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'Blog':
          return <ScreenWrapper><BlogScreen navigation={navigation} /></ScreenWrapper>
        case 'BlogPostDetail':
          return <ScreenWrapper><BlogPostDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'Documents':
          return <ScreenWrapper><DocumentsScreen navigation={navigation} /></ScreenWrapper>
        case 'ExternalOrders':
          return <ScreenWrapper><ExternalOrdersScreen navigation={navigation} /></ScreenWrapper>
        case 'ExternalOrderDetail':
          return <ScreenWrapper><ExternalOrderDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'BusinessCards':
          return <ScreenWrapper><BusinessCardsScreen navigation={navigation} /></ScreenWrapper>
        case 'CardGenerator':
          return <ScreenWrapper><CardGeneratorScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'Collections':
          return <ScreenWrapper><CollectionsScreen navigation={navigation} /></ScreenWrapper>
        case 'CollectionDetail':
          return <ScreenWrapper><CollectionDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'CustomerDesigns':
          return <ScreenWrapper><CustomerDesignsScreen navigation={navigation} /></ScreenWrapper>
        case 'CustomerDesignDetail':
          return <ScreenWrapper><CustomerDesignDetailScreen navigation={navigation} route={{ params: currentScreen.params }} /></ScreenWrapper>
        case 'EmailSignatures':
          return <ScreenWrapper><EmailSignaturesScreen navigation={navigation} /></ScreenWrapper>
        case 'PrintQueue':
          return <ScreenWrapper><PrintQueueScreen navigation={navigation} /></ScreenWrapper>
        case 'PartnerApplications':
          return <ScreenWrapper><PartnerApplicationsScreen navigation={navigation} /></ScreenWrapper>
        case 'PartnerInquiries':
          return <ScreenWrapper><PartnerInquiriesScreen navigation={navigation} /></ScreenWrapper>
        case 'MLMConfig':
          return <ScreenWrapper><MLMConfigScreen navigation={navigation} /></ScreenWrapper>
        case 'OAuthApplications':
          return <ScreenWrapper><OAuthApplicationsScreen navigation={navigation} /></ScreenWrapper>
        case 'Inventory':
          return <ScreenWrapper><InventoryScreen navigation={navigation} /></ScreenWrapper>
      }
    }

    switch (activeTab) {
      case 'Home':
        return <DashboardScreen navigation={navigation} />
      case 'Sales':
        return <SalesTabScreen navigation={navigation} />
      case 'Business':
        return <BusinessTabScreen navigation={navigation} />
      case 'People':
        return <PeopleTabScreen navigation={navigation} />
      case 'Account':
        return <AccountTabScreen navigation={navigation} />
      default:
        return <DashboardScreen navigation={navigation} />
    }
  }

  const accentColor = portalColors.admin

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <SafeAreaView edges={['bottom']} style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const parentTab = currentScreen ? getParentTab(currentScreen.name) : null
            const focused = currentScreen
              ? parentTab === tab.name
              : activeTab === tab.name
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tab}
                onPress={() => {
                  if (currentScreen && parentTab === tab.name) {
                    setScreenStack([])
                  } else if (currentScreen) {
                    setScreenStack([])
                    setActiveTab(tab.name)
                  } else {
                    setActiveTab(tab.name)
                  }
                }}
              >
                <Ionicons
                  name={focused ? tab.iconFocused as any : tab.icon as any}
                  size={24}
                  color={focused ? accentColor : '#71717a'}
                />
                <Text style={[styles.tabLabel, focused && { color: accentColor }]}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </SafeAreaView>
    </View>
  )
}

// Sales Tab - Products-focused: Products, Categories, Brands, Inventory, Variants + Orders, Invoices, Returns, External Orders
type SalesCategory = 'catalog' | 'sales'
type CatalogSection = 'products' | 'categories' | 'brands' | 'collections' | 'inventory' | 'variants'
type SalesSection = 'orders' | 'designs' | 'invoices' | 'returns' | 'external'

function SalesTabScreen({ navigation }: { navigation: any }) {
  const [category, setCategory] = useState<SalesCategory>('sales')
  const [catalogSection, setCatalogSection] = useState<CatalogSection>('products')
  const [salesSection, setSalesSection] = useState<SalesSection>('orders')

  const categoryConfig: Record<SalesCategory, { icon: string; label: string }> = {
    sales: { icon: 'receipt-outline', label: 'Sales' },
    catalog: { icon: 'cube-outline', label: 'Catalog' },
  }

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      {/* Category Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={styles.categoryRowContent}>
        {(Object.keys(categoryConfig) as SalesCategory[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
            onPress={() => setCategory(cat)}
          >
            <Ionicons
              name={categoryConfig[cat].icon as any}
              size={16}
              color={category === cat ? '#fff' : colors.textMuted}
            />
            <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
              {categoryConfig[cat].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sub-section segments */}
      {category === 'sales' && (
        <View style={styles.segmentWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedControlWide}>
            <TouchableOpacity
              style={[styles.segmentPill, salesSection === 'orders' && styles.segmentPillActive]}
              onPress={() => setSalesSection('orders')}
            >
              <Text style={[styles.segmentText, salesSection === 'orders' && styles.segmentTextActive]}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentPill, salesSection === 'designs' && styles.segmentPillActive]}
              onPress={() => setSalesSection('designs')}
            >
              <Text style={[styles.segmentText, salesSection === 'designs' && styles.segmentTextActive]}>Designs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentPill, salesSection === 'invoices' && styles.segmentPillActive]}
              onPress={() => setSalesSection('invoices')}
            >
              <Text style={[styles.segmentText, salesSection === 'invoices' && styles.segmentTextActive]}>Invoices</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentPill, salesSection === 'returns' && styles.segmentPillActive]}
              onPress={() => setSalesSection('returns')}
            >
              <Text style={[styles.segmentText, salesSection === 'returns' && styles.segmentTextActive]}>Returns</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentPill, salesSection === 'external' && styles.segmentPillActive]}
              onPress={() => setSalesSection('external')}
            >
              <Text style={[styles.segmentText, salesSection === 'external' && styles.segmentTextActive]}>BookFade</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {category === 'catalog' && (
        <View style={styles.segmentWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedControlWide}>
            <TouchableOpacity
              style={[styles.segmentPill, catalogSection === 'products' && styles.segmentPillActive]}
              onPress={() => setCatalogSection('products')}
            >
              <Text style={[styles.segmentText, catalogSection === 'products' && styles.segmentTextActive]}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentPill, catalogSection === 'categories' && styles.segmentPillActive]}
              onPress={() => setCatalogSection('categories')}
            >
              <Text style={[styles.segmentText, catalogSection === 'categories' && styles.segmentTextActive]}>Categories</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentPill, catalogSection === 'brands' && styles.segmentPillActive]}
              onPress={() => setCatalogSection('brands')}
            >
              <Text style={[styles.segmentText, catalogSection === 'brands' && styles.segmentTextActive]}>Brands</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentPill, catalogSection === 'collections' && styles.segmentPillActive]}
              onPress={() => setCatalogSection('collections')}
            >
              <Text style={[styles.segmentText, catalogSection === 'collections' && styles.segmentTextActive]}>Collections</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentPill, catalogSection === 'inventory' && styles.segmentPillActive]}
              onPress={() => setCatalogSection('inventory')}
            >
              <Text style={[styles.segmentText, catalogSection === 'inventory' && styles.segmentTextActive]}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentPill, catalogSection === 'variants' && styles.segmentPillActive]}
              onPress={() => setCatalogSection('variants')}
            >
              <Text style={[styles.segmentText, catalogSection === 'variants' && styles.segmentTextActive]}>Variants</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <View style={styles.tabContent}>
        {category === 'sales' && salesSection === 'orders' && <OrdersScreen navigation={navigation} hideHeader />}
        {category === 'sales' && salesSection === 'designs' && <CustomerDesignsScreen navigation={navigation} hideHeader />}
        {category === 'sales' && salesSection === 'invoices' && <AdminInvoicesScreen navigation={navigation} hideHeader />}
        {category === 'sales' && salesSection === 'returns' && <ReturnsScreen navigation={navigation} hideHeader />}
        {category === 'sales' && salesSection === 'external' && <ExternalOrdersScreen navigation={navigation} hideHeader />}

        {category === 'catalog' && catalogSection === 'products' && <ProductsScreen navigation={navigation} hideHeader />}
        {category === 'catalog' && catalogSection === 'categories' && <CategoriesScreen navigation={navigation} hideHeader />}
        {category === 'catalog' && catalogSection === 'brands' && <BrandsScreen navigation={navigation} hideHeader />}
        {category === 'catalog' && catalogSection === 'collections' && <CollectionsScreen navigation={navigation} hideHeader />}
        {category === 'catalog' && catalogSection === 'inventory' && <InventoryScreen navigation={navigation} hideHeader />}
        {category === 'catalog' && catalogSection === 'variants' && <VariantsBulkEditScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// Business Tab - Services, Finance, Operations, Analytics, and Documents as top-level categories
type BusinessCategory = 'services' | 'finance' | 'operations' | 'analytics' | 'documents'
type ServiceSection = 'inquiries' | 'packages' | 'portfolio'
type FinanceSection = 'expenses' | 'reports'
type OperationsSection = 'print-queue' | 'printful'

function BusinessTabScreen({ navigation }: { navigation: any }) {
  const [category, setCategory] = useState<BusinessCategory>('services')
  const [serviceSection, setServiceSection] = useState<ServiceSection>('inquiries')
  const [financeSection, setFinanceSection] = useState<FinanceSection>('expenses')
  const [operationsSection, setOperationsSection] = useState<OperationsSection>('print-queue')

  const categoryConfig: Record<BusinessCategory, { icon: string; label: string }> = {
    services: { icon: 'construct-outline', label: 'Services' },
    finance: { icon: 'wallet-outline', label: 'Finance' },
    operations: { icon: 'print-outline', label: 'Operations' },
    analytics: { icon: 'analytics-outline', label: 'Analytics' },
    documents: { icon: 'document-text-outline', label: 'Documents' },
  }

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      {/* Category Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={styles.categoryRowContent}>
        {(Object.keys(categoryConfig) as BusinessCategory[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
            onPress={() => setCategory(cat)}
          >
            <Ionicons
              name={categoryConfig[cat].icon as any}
              size={16}
              color={category === cat ? '#fff' : colors.textMuted}
            />
            <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
              {categoryConfig[cat].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sub-section segments based on category */}
      {category === 'services' && (
        <View style={styles.segmentWrapper}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, serviceSection === 'inquiries' && styles.segmentActive]}
              onPress={() => setServiceSection('inquiries')}
            >
              <Text style={[styles.segmentText, serviceSection === 'inquiries' && styles.segmentTextActive]}>Inquiries</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, serviceSection === 'packages' && styles.segmentActive]}
              onPress={() => setServiceSection('packages')}
            >
              <Text style={[styles.segmentText, serviceSection === 'packages' && styles.segmentTextActive]}>Packages</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, serviceSection === 'portfolio' && styles.segmentActive]}
              onPress={() => setServiceSection('portfolio')}
            >
              <Text style={[styles.segmentText, serviceSection === 'portfolio' && styles.segmentTextActive]}>Portfolio</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {category === 'finance' && (
        <View style={styles.segmentWrapper}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, financeSection === 'expenses' && styles.segmentActive]}
              onPress={() => setFinanceSection('expenses')}
            >
              <Text style={[styles.segmentText, financeSection === 'expenses' && styles.segmentTextActive]}>Expenses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, financeSection === 'reports' && styles.segmentActive]}
              onPress={() => setFinanceSection('reports')}
            >
              <Text style={[styles.segmentText, financeSection === 'reports' && styles.segmentTextActive]}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {category === 'operations' && (
        <View style={styles.segmentWrapper}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, operationsSection === 'print-queue' && styles.segmentActive]}
              onPress={() => setOperationsSection('print-queue')}
            >
              <Text style={[styles.segmentText, operationsSection === 'print-queue' && styles.segmentTextActive]}>Print Queue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, operationsSection === 'printful' && styles.segmentActive]}
              onPress={() => setOperationsSection('printful')}
            >
              <Text style={[styles.segmentText, operationsSection === 'printful' && styles.segmentTextActive]}>Printful</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.tabContent}>
        {category === 'services' && serviceSection === 'inquiries' && <InquiriesScreen navigation={navigation} hideHeader />}
        {category === 'services' && serviceSection === 'packages' && <ServicesScreen navigation={navigation} hideHeader />}
        {category === 'services' && serviceSection === 'portfolio' && <PortfolioScreen navigation={navigation} hideHeader />}

        {category === 'finance' && financeSection === 'expenses' && <ExpensesScreen navigation={navigation} hideHeader />}
        {category === 'finance' && financeSection === 'reports' && <ReportsScreen navigation={navigation} hideHeader />}

        {category === 'operations' && operationsSection === 'print-queue' && <PrintQueueScreen navigation={navigation} hideHeader />}
        {category === 'operations' && operationsSection === 'printful' && <PrintfulDashboardScreen navigation={navigation} hideHeader />}

        {category === 'analytics' && <AnalyticsScreen navigation={navigation} hideHeader />}

        {category === 'documents' && <DocumentsScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// People Tab - Clients, Partners, Team, Users, Affiliates
function PeopleTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'users' | 'clients' | 'partners' | 'applications' | 'inquiries' | 'leads' | 'team' | 'affiliates' | 'userAffiliates'>('users')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <View style={styles.segmentWrapper}>
        {['partners', 'applications', 'inquiries', 'leads'].includes(activeSection) && (
          <View style={styles.peopleTabActions}>
            <Text style={styles.peopleTabActionsLabel}>Partner Tools</Text>
            <TouchableOpacity
              style={styles.mlmConfigButton}
              onPress={() => navigation.navigate('MLMConfig')}
            >
              <Ionicons name="git-network-outline" size={14} color=colors.purple />
              <Text style={styles.mlmConfigButtonText}>MLM Config</Text>
            </TouchableOpacity>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedControlWide}>
          <TouchableOpacity
            style={[styles.segmentPill, activeSection === 'users' && styles.segmentPillActive]}
            onPress={() => setActiveSection('users')}
          >
            <Text style={[styles.segmentText, activeSection === 'users' && styles.segmentTextActive]}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentPill, activeSection === 'clients' && styles.segmentPillActive]}
            onPress={() => setActiveSection('clients')}
          >
            <Text style={[styles.segmentText, activeSection === 'clients' && styles.segmentTextActive]}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentPill, activeSection === 'partners' && styles.segmentPillActive]}
            onPress={() => setActiveSection('partners')}
          >
            <Text style={[styles.segmentText, activeSection === 'partners' && styles.segmentTextActive]}>Partners</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentPill, activeSection === 'applications' && styles.segmentPillActive]}
            onPress={() => setActiveSection('applications')}
          >
            <Text style={[styles.segmentText, activeSection === 'applications' && styles.segmentTextActive]}>Applications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentPill, activeSection === 'inquiries' && styles.segmentPillActive]}
            onPress={() => setActiveSection('inquiries')}
          >
            <Text style={[styles.segmentText, activeSection === 'inquiries' && styles.segmentTextActive]}>Inquiries</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentPill, activeSection === 'leads' && styles.segmentPillActive]}
            onPress={() => setActiveSection('leads')}
          >
            <Text style={[styles.segmentText, activeSection === 'leads' && styles.segmentTextActive]}>Leads</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentPill, activeSection === 'team' && styles.segmentPillActive]}
            onPress={() => setActiveSection('team')}
          >
            <Text style={[styles.segmentText, activeSection === 'team' && styles.segmentTextActive]}>Team</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentPill, activeSection === 'affiliates' && styles.segmentPillActive]}
            onPress={() => setActiveSection('affiliates')}
          >
            <Text style={[styles.segmentText, activeSection === 'affiliates' && styles.segmentTextActive]}>Affiliates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentPill, activeSection === 'userAffiliates' && styles.segmentPillActive]}
            onPress={() => setActiveSection('userAffiliates')}
          >
            <Text style={[styles.segmentText, activeSection === 'userAffiliates' && styles.segmentTextActive]}>User Affiliates</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'users' && <UsersScreen navigation={navigation} hideHeader />}
        {activeSection === 'clients' && <AdminClientsScreen navigation={navigation} hideHeader />}
        {activeSection === 'partners' && <AdminPartnersScreen navigation={navigation} hideHeader />}
        {activeSection === 'applications' && <PartnerApplicationsScreen navigation={navigation} hideHeader />}
        {activeSection === 'inquiries' && <PartnerInquiriesScreen navigation={navigation} hideHeader />}
        {activeSection === 'leads' && <PartnerLeadsScreen navigation={navigation} hideHeader />}
        {activeSection === 'team' && <TeamScreen navigation={navigation} hideHeader />}
        {activeSection === 'affiliates' && <AffiliatesScreen navigation={navigation} hideHeader />}
        {activeSection === 'userAffiliates' && <UserAffiliatesScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// Account Tab - Profile, Email, Settings (simplified)
function AccountTabScreen({ navigation }: { navigation: any }) {
  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <AccountScreen navigation={navigation} hideHeader />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  stackedScreenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBarContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#71717a',
  },
  tabContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  categoryRow: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryRowContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: portalColors.admin,
    borderColor: portalColors.admin,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500' as any,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  segmentWrapper: {
    flexDirection: 'column',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  peopleTabActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  peopleTabActionsLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  mlmConfigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.purpleBg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  mlmConfigButtonText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.purple,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentedControlWide: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: portalColors.admin,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '500' as any,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '600' as any,
  },
  // Pill styles for People tab
  segmentPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentPillActive: {
    backgroundColor: portalColors.admin,
    borderColor: portalColors.admin,
  },
  tabContent: {
    flex: 1,
  },
})
