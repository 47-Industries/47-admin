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
import { colors, portalColors, spacing, fontSize, fontWeight } from '../theme'

type TabName = 'Home' | 'Sales' | 'Work' | 'People' | 'Account'

interface ScreenState {
  name: string
  params?: any
}

const tabs: { name: TabName; icon: string; iconFocused: string }[] = [
  { name: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'Sales', icon: 'card-outline', iconFocused: 'card' },
  { name: 'Work', icon: 'clipboard-outline', iconFocused: 'clipboard' },
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
    const salesScreens = ['OrderDetail', 'Returns', 'AdminInvoices', 'Expenses', 'Reports', 'Analytics', 'RecurringBills']
    const workScreens = ['CustomRequests', 'CustomRequestDetail', 'InquiryDetail', 'Inquiries', 'Services', 'ServicePackageDetail']
    const peopleScreens = ['AdminClients', 'AdminPartners', 'Team', 'Users', 'UserDetail']
    const accountScreens = ['ProfileEdit', 'ChangePassword', 'Notifications', 'Settings', 'Marketing', 'Email', 'Blog', 'Products', 'ProductDetail', 'ProductCreate', 'Categories', 'Inventory']
    const homeScreens = ['Products', 'ProductDetail', 'ProductCreate', 'Categories', 'Inventory']

    if (salesScreens.includes(screenName)) return 'Sales'
    if (workScreens.includes(screenName)) return 'Work'
    if (peopleScreens.includes(screenName)) return 'People'
    if (accountScreens.includes(screenName)) return 'Account'
    if (homeScreens.includes(screenName)) return 'Home'
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
        case 'Returns':
          return <ScreenWrapper><ReturnsScreen navigation={navigation} /></ScreenWrapper>
        case 'Users':
          return <ScreenWrapper><UsersScreen navigation={navigation} /></ScreenWrapper>
        case 'Expenses':
          return <ScreenWrapper><ExpensesScreen navigation={navigation} /></ScreenWrapper>
        case 'Settings':
          return <ScreenWrapper><SettingsScreen navigation={navigation} /></ScreenWrapper>
        case 'Services':
          return <ScreenWrapper><ServicesScreen navigation={navigation} /></ScreenWrapper>
        case 'Email':
          return <ScreenWrapper><EmailScreen navigation={navigation} /></ScreenWrapper>
        case 'Blog':
          return <ScreenWrapper><BlogScreen navigation={navigation} /></ScreenWrapper>
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
        case 'Inventory':
          return <ScreenWrapper><InventoryScreen navigation={navigation} /></ScreenWrapper>
        case 'AdminInvoices':
          return <ScreenWrapper><AdminInvoicesScreen navigation={navigation} /></ScreenWrapper>
        case 'Notifications':
          return <ScreenWrapper><NotificationsScreen navigation={navigation} /></ScreenWrapper>
        case 'Team':
          return <ScreenWrapper><TeamScreen navigation={navigation} /></ScreenWrapper>
        case 'AdminClients':
          return <ScreenWrapper><AdminClientsScreen navigation={navigation} /></ScreenWrapper>
        case 'AdminPartners':
          return <ScreenWrapper><AdminPartnersScreen navigation={navigation} /></ScreenWrapper>
        case 'Marketing':
          return <ScreenWrapper><MarketingScreen navigation={navigation} /></ScreenWrapper>
      }
    }

    switch (activeTab) {
      case 'Home':
        return <SafeAreaView style={styles.stackedScreenContainer} edges={['top']}><DashboardScreen navigation={navigation} /></SafeAreaView>
      case 'Sales':
        return <SalesTabScreen navigation={navigation} />
      case 'Work':
        return <WorkTabScreen navigation={navigation} />
      case 'People':
        return <PeopleTabScreen navigation={navigation} />
      case 'Account':
        return <AccountTabScreen navigation={navigation} />
      default:
        return <SafeAreaView style={styles.stackedScreenContainer} edges={['top']}><DashboardScreen navigation={navigation} /></SafeAreaView>
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

// Sales Tab - Orders, Invoices, Returns (money coming in) + Expenses, Reports
function SalesTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'orders' | 'invoices' | 'returns'>('orders')
  const [showFinance, setShowFinance] = useState(false)

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      {/* Main segment: Orders / Invoices / Returns */}
      <View style={styles.segmentWrapper}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segment, activeSection === 'orders' && styles.segmentActive]}
            onPress={() => { setActiveSection('orders'); setShowFinance(false); }}
          >
            <Text style={[styles.segmentText, activeSection === 'orders' && styles.segmentTextActive]}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeSection === 'invoices' && styles.segmentActive]}
            onPress={() => { setActiveSection('invoices'); setShowFinance(false); }}
          >
            <Text style={[styles.segmentText, activeSection === 'invoices' && styles.segmentTextActive]}>Invoices</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeSection === 'returns' && styles.segmentActive]}
            onPress={() => { setActiveSection('returns'); setShowFinance(false); }}
          >
            <Text style={[styles.segmentText, activeSection === 'returns' && styles.segmentTextActive]}>Returns</Text>
          </TouchableOpacity>
        </View>
        {/* Finance quick access */}
        <TouchableOpacity
          style={styles.financeToggle}
          onPress={() => setShowFinance(!showFinance)}
        >
          <Ionicons name="wallet-outline" size={20} color={showFinance ? portalColors.admin : '#71717a'} />
        </TouchableOpacity>
      </View>

      {/* Finance submenu */}
      {showFinance && (
        <View style={styles.subMenu}>
          <TouchableOpacity style={styles.subMenuItem} onPress={() => navigation.navigate('Expenses')}>
            <Ionicons name="receipt-outline" size={18} color={colors.textMuted} />
            <Text style={styles.subMenuText}>Expenses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.subMenuItem} onPress={() => navigation.navigate('Reports')}>
            <Ionicons name="bar-chart-outline" size={18} color={colors.textMuted} />
            <Text style={styles.subMenuText}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.subMenuItem} onPress={() => navigation.navigate('Analytics')}>
            <Ionicons name="stats-chart-outline" size={18} color={colors.textMuted} />
            <Text style={styles.subMenuText}>Analytics</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabContent}>
        {activeSection === 'orders' && <OrdersScreen navigation={navigation} hideHeader />}
        {activeSection === 'invoices' && <AdminInvoicesScreen navigation={navigation} hideHeader />}
        {activeSection === 'returns' && <ReturnsScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// Work Tab - Inquiries, 3D Prints, Projects (things that need action)
function WorkTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'inquiries' | '3dprint' | 'services'>('inquiries')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <View style={styles.segmentWrapper}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segment, activeSection === 'inquiries' && styles.segmentActive]}
            onPress={() => setActiveSection('inquiries')}
          >
            <Text style={[styles.segmentText, activeSection === 'inquiries' && styles.segmentTextActive]}>Inquiries</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeSection === '3dprint' && styles.segmentActive]}
            onPress={() => setActiveSection('3dprint')}
          >
            <Text style={[styles.segmentText, activeSection === '3dprint' && styles.segmentTextActive]}>3D Prints</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeSection === 'services' && styles.segmentActive]}
            onPress={() => setActiveSection('services')}
          >
            <Text style={[styles.segmentText, activeSection === 'services' && styles.segmentTextActive]}>Services</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'inquiries' && <InquiriesScreen navigation={navigation} hideHeader />}
        {activeSection === '3dprint' && <CustomRequestsScreen navigation={navigation} hideHeader />}
        {activeSection === 'services' && <ServicesScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// People Tab - Clients, Partners, Team
function PeopleTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'clients' | 'partners' | 'team'>('clients')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <View style={styles.segmentWrapper}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segment, activeSection === 'clients' && styles.segmentActive]}
            onPress={() => setActiveSection('clients')}
          >
            <Text style={[styles.segmentText, activeSection === 'clients' && styles.segmentTextActive]}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeSection === 'partners' && styles.segmentActive]}
            onPress={() => setActiveSection('partners')}
          >
            <Text style={[styles.segmentText, activeSection === 'partners' && styles.segmentTextActive]}>Partners</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeSection === 'team' && styles.segmentActive]}
            onPress={() => setActiveSection('team')}
          >
            <Text style={[styles.segmentText, activeSection === 'team' && styles.segmentTextActive]}>Team</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'clients' && <AdminClientsScreen navigation={navigation} hideHeader />}
        {activeSection === 'partners' && <AdminPartnersScreen navigation={navigation} hideHeader />}
        {activeSection === 'team' && <TeamScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// Account Tab - Profile, Settings, Marketing, Products/Catalog management
function AccountTabScreen({ navigation }: { navigation: any }) {
  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <AccountScreen navigation={navigation} hideHeader showAdminSections />
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
  segmentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: portalColors.admin,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '600' as any,
    color: '#71717a',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  financeToggle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subMenu: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  subMenuItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subMenuText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  tabContent: {
    flex: 1,
  },
})
