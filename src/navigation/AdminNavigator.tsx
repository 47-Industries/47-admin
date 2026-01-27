import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
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
import ReturnsScreen from '../screens/ReturnsScreen'
import AnalyticsScreen from '../screens/AnalyticsScreen'
import ServicesScreen from '../screens/ServicesScreen'
import EmailScreen from '../screens/EmailScreen'
import BlogScreen from '../screens/BlogScreen'
import ReportsScreen from '../screens/ReportsScreen'
import ServicePackageDetailScreen from '../screens/ServicePackageDetailScreen'
import { RecurringBillsScreen } from '../screens/RecurringBillsScreen'
import { AccountScreen, ProfileEditScreen, ChangePasswordScreen } from '../screens/account'
import CategoriesScreen from '../screens/CategoriesScreen'
import InventoryScreen from '../screens/InventoryScreen'
import AdminInvoicesScreen from '../screens/admin/InvoicesScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import TeamScreen from '../screens/TeamScreen'
import AdminClientsScreen from '../screens/admin/ClientsScreen'
import AdminPartnersScreen from '../screens/admin/PartnersScreen'
import MarketingScreen from '../screens/MarketingScreen'
import { colors, portalColors, spacing, fontSize } from '../theme'

type TabName = 'Home' | 'Sales' | 'Business' | 'Finance' | 'Account'

interface ScreenState {
  name: string
  params?: any
}

const tabs: { name: TabName; icon: string; iconFocused: string }[] = [
  { name: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'Sales', icon: 'receipt-outline', iconFocused: 'receipt' },
  { name: 'Business', icon: 'briefcase-outline', iconFocused: 'briefcase' },
  { name: 'Finance', icon: 'wallet-outline', iconFocused: 'wallet' },
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
    const salesScreens = ['OrderDetail', 'Returns', 'Products', 'ProductDetail', 'ProductCreate', 'Categories', 'Inventory']
    const businessScreens = ['ServicePackageDetail', 'CustomRequests', 'CustomRequestDetail', 'InquiryDetail', 'Inquiries', 'Services', 'Users', 'UserDetail', 'Email', 'Blog', 'Settings', 'Team', 'AdminClients', 'AdminPartners', 'Marketing']
    const financeScreens = ['Expenses', 'Reports', 'RecurringBills', 'Analytics', 'AdminInvoices']
    const accountScreens = ['ProfileEdit', 'ChangePassword', 'Notifications']

    if (salesScreens.includes(screenName)) return 'Sales'
    if (businessScreens.includes(screenName)) return 'Business'
    if (financeScreens.includes(screenName)) return 'Finance'
    if (accountScreens.includes(screenName)) return 'Account'
    return null
  }

  const renderScreen = () => {
    if (currentScreen) {
      switch (currentScreen.name) {
        case 'OrderDetail':
          return <OrderDetailScreen navigation={navigation} route={{ params: currentScreen.params }} />
        case 'ProductDetail':
          return <ProductDetailScreen navigation={navigation} route={{ params: currentScreen.params }} />
        case 'ProductCreate':
          return <ProductCreateScreen navigation={navigation} />
        case 'Products':
          return <ProductsScreen navigation={navigation} />
        case 'CustomRequests':
          return <CustomRequestsScreen navigation={navigation} />
        case 'CustomRequestDetail':
          return <CustomRequestDetailScreen navigation={navigation} route={{ params: currentScreen.params }} />
        case 'InquiryDetail':
          return <InquiryDetailScreen navigation={navigation} route={{ params: currentScreen.params }} />
        case 'Inquiries':
          return <InquiriesScreen navigation={navigation} />
        case 'ServicePackageDetail':
          return <ServicePackageDetailScreen navigation={navigation} route={{ params: currentScreen.params }} />
        case 'UserDetail':
          return <UserDetailScreen navigation={navigation} route={{ params: currentScreen.params }} />
        case 'Returns':
          return <ReturnsScreen navigation={navigation} />
        case 'Users':
          return <UsersScreen navigation={navigation} />
        case 'Expenses':
          return <ExpensesScreen navigation={navigation} />
        case 'Settings':
          return <SettingsScreen navigation={navigation} />
        case 'Services':
          return <ServicesScreen navigation={navigation} />
        case 'Email':
          return <EmailScreen navigation={navigation} />
        case 'Blog':
          return <BlogScreen navigation={navigation} />
        case 'Reports':
          return <ReportsScreen navigation={navigation} />
        case 'RecurringBills':
          return <RecurringBillsScreen navigation={navigation} />
        case 'Analytics':
          return <AnalyticsScreen navigation={navigation} />
        case 'ProfileEdit':
          return <ProfileEditScreen navigation={navigation} />
        case 'ChangePassword':
          return <ChangePasswordScreen navigation={navigation} />
        case 'Categories':
          return <CategoriesScreen navigation={navigation} />
        case 'Inventory':
          return <InventoryScreen navigation={navigation} />
        case 'AdminInvoices':
          return <AdminInvoicesScreen navigation={navigation} />
        case 'Notifications':
          return <NotificationsScreen navigation={navigation} />
        case 'Team':
          return <TeamScreen navigation={navigation} />
        case 'AdminClients':
          return <AdminClientsScreen navigation={navigation} />
        case 'AdminPartners':
          return <AdminPartnersScreen navigation={navigation} />
        case 'Marketing':
          return <MarketingScreen navigation={navigation} />
      }
    }

    switch (activeTab) {
      case 'Home':
        return <DashboardScreen navigation={navigation} />
      case 'Sales':
        return <SalesTabScreen navigation={navigation} />
      case 'Business':
        return <BusinessTabScreen navigation={navigation} />
      case 'Finance':
        return <FinanceTabScreen navigation={navigation} />
      case 'Account':
        return <AccountScreen navigation={navigation} hideHeader />
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

// Sales Tab - Orders, Products, Categories, Inventory, Returns
function SalesTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'orders' | 'products' | 'categories' | 'inventory' | 'returns'>('orders')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'orders' && styles.segmentActive]}
          onPress={() => setActiveSection('orders')}
        >
          <Ionicons name="receipt-outline" size={16} color={activeSection === 'orders' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'orders' && styles.segmentTextActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'products' && styles.segmentActive]}
          onPress={() => setActiveSection('products')}
        >
          <Ionicons name="cube-outline" size={16} color={activeSection === 'products' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'products' && styles.segmentTextActive]}>Products</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'categories' && styles.segmentActive]}
          onPress={() => setActiveSection('categories')}
        >
          <Ionicons name="pricetags-outline" size={16} color={activeSection === 'categories' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'categories' && styles.segmentTextActive]}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'inventory' && styles.segmentActive]}
          onPress={() => setActiveSection('inventory')}
        >
          <Ionicons name="layers-outline" size={16} color={activeSection === 'inventory' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'inventory' && styles.segmentTextActive]}>Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'returns' && styles.segmentActive]}
          onPress={() => setActiveSection('returns')}
        >
          <Ionicons name="return-down-back-outline" size={16} color={activeSection === 'returns' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'returns' && styles.segmentTextActive]}>Returns</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'orders' && <OrdersScreen navigation={navigation} hideHeader />}
        {activeSection === 'products' && <ProductsScreen navigation={navigation} hideHeader />}
        {activeSection === 'categories' && <CategoriesScreen navigation={navigation} hideHeader />}
        {activeSection === 'inventory' && <InventoryScreen navigation={navigation} hideHeader />}
        {activeSection === 'returns' && <ReturnsScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// Business Tab - Services, CRM (Clients/Partners), Team, Inquiries, 3D Print, Marketing
function BusinessTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'services' | 'clients' | 'partners' | 'team' | 'inquiries' | '3dprint' | 'marketing'>('services')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <View style={styles.segmentedControlScrollable}>
        <TouchableOpacity
          style={[styles.segmentCompact, activeSection === 'services' && styles.segmentActive]}
          onPress={() => setActiveSection('services')}
        >
          <Ionicons name="briefcase-outline" size={16} color={activeSection === 'services' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'services' && styles.segmentTextActive]}>Services</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentCompact, activeSection === 'clients' && styles.segmentActive]}
          onPress={() => setActiveSection('clients')}
        >
          <Ionicons name="business-outline" size={16} color={activeSection === 'clients' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'clients' && styles.segmentTextActive]}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentCompact, activeSection === 'partners' && styles.segmentActive]}
          onPress={() => setActiveSection('partners')}
        >
          <Ionicons name="handshake-outline" size={16} color={activeSection === 'partners' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'partners' && styles.segmentTextActive]}>Partners</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentCompact, activeSection === 'team' && styles.segmentActive]}
          onPress={() => setActiveSection('team')}
        >
          <Ionicons name="people-outline" size={16} color={activeSection === 'team' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'team' && styles.segmentTextActive]}>Team</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentCompact, activeSection === 'inquiries' && styles.segmentActive]}
          onPress={() => setActiveSection('inquiries')}
        >
          <Ionicons name="chatbubbles-outline" size={16} color={activeSection === 'inquiries' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'inquiries' && styles.segmentTextActive]}>Inquiries</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentCompact, activeSection === '3dprint' && styles.segmentActive]}
          onPress={() => setActiveSection('3dprint')}
        >
          <Ionicons name="print-outline" size={16} color={activeSection === '3dprint' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === '3dprint' && styles.segmentTextActive]}>3D Print</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentCompact, activeSection === 'marketing' && styles.segmentActive]}
          onPress={() => setActiveSection('marketing')}
        >
          <Ionicons name="megaphone-outline" size={16} color={activeSection === 'marketing' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'marketing' && styles.segmentTextActive]}>Marketing</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'services' && <ServicesScreen navigation={navigation} hideHeader />}
        {activeSection === 'clients' && <AdminClientsScreen navigation={navigation} hideHeader />}
        {activeSection === 'partners' && <AdminPartnersScreen navigation={navigation} hideHeader />}
        {activeSection === 'team' && <TeamScreen navigation={navigation} hideHeader />}
        {activeSection === 'inquiries' && <InquiriesScreen navigation={navigation} hideHeader />}
        {activeSection === '3dprint' && <CustomRequestsScreen navigation={navigation} hideHeader />}
        {activeSection === 'marketing' && <MarketingScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// Finance Tab - Analytics, Invoices, Expenses, Reports
function FinanceTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'analytics' | 'invoices' | 'expenses' | 'reports'>('analytics')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'analytics' && styles.segmentActive]}
          onPress={() => setActiveSection('analytics')}
        >
          <Ionicons name="stats-chart-outline" size={16} color={activeSection === 'analytics' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'analytics' && styles.segmentTextActive]}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'invoices' && styles.segmentActive]}
          onPress={() => setActiveSection('invoices')}
        >
          <Ionicons name="document-text-outline" size={16} color={activeSection === 'invoices' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'invoices' && styles.segmentTextActive]}>Invoices</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'expenses' && styles.segmentActive]}
          onPress={() => setActiveSection('expenses')}
        >
          <Ionicons name="wallet-outline" size={16} color={activeSection === 'expenses' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'expenses' && styles.segmentTextActive]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'reports' && styles.segmentActive]}
          onPress={() => setActiveSection('reports')}
        >
          <Ionicons name="bar-chart-outline" size={16} color={activeSection === 'reports' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentTextSmall, activeSection === 'reports' && styles.segmentTextActive]}>Reports</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'analytics' && <AnalyticsScreen navigation={navigation} hideHeader />}
        {activeSection === 'invoices' && <AdminInvoicesScreen navigation={navigation} hideHeader />}
        {activeSection === 'expenses' && <ExpensesScreen navigation={navigation} hideHeader />}
        {activeSection === 'reports' && <ReportsScreen navigation={navigation} hideHeader />}
      </View>
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
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  segmentActive: {
    backgroundColor: portalColors.admin,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: '#71717a',
  },
  segmentTextSmall: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717a',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  segmentedControlScrollable: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentCompact: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    borderRadius: 8,
    gap: 2,
  },
  tabContent: {
    flex: 1,
  },
})
