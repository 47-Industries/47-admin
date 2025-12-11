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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

// 5 tabs with real content, not lists
type TabName = 'Home' | 'Orders' | 'Services' | 'Business' | 'Tools'

interface ScreenState {
  name: string
  params?: any
}

const tabs: { name: TabName; icon: string; iconFocused: string }[] = [
  { name: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'Orders', icon: 'receipt-outline', iconFocused: 'receipt' },
  { name: 'Services', icon: 'briefcase-outline', iconFocused: 'briefcase' },
  { name: 'Business', icon: 'briefcase-outline', iconFocused: 'briefcase' },
  { name: 'Tools', icon: 'build-outline', iconFocused: 'build' },
]

export default function AuthenticatedApp() {
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

  // Determine which tab a subscreen belongs to
  const getParentTab = (screenName: string): TabName | null => {
    const orderScreens = ['OrderDetail', 'Returns', 'Products', 'ProductDetail']
    const serviceScreens = ['ServicePackageDetail', 'CustomRequests', 'CustomRequestDetail', 'InquiryDetail', 'Inquiries', 'PortfolioDetail']
    const businessScreens = ['Expenses', 'Reports']
    const toolsScreens = ['Users', 'UserDetail', 'Email', 'Blog', 'Settings']

    if (orderScreens.includes(screenName)) return 'Orders'
    if (serviceScreens.includes(screenName)) return 'Services'
    if (businessScreens.includes(screenName)) return 'Business'
    if (toolsScreens.includes(screenName)) return 'Tools'
    return null
  }

  const renderScreen = () => {
    if (currentScreen) {
      switch (currentScreen.name) {
        case 'OrderDetail':
          return <OrderDetailScreen navigation={navigation} route={{ params: currentScreen.params }} />
        case 'ProductDetail':
          return <ProductDetailScreen navigation={navigation} route={{ params: currentScreen.params }} />
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
      }
    }

    switch (activeTab) {
      case 'Home':
        return <DashboardScreen navigation={navigation} />
      case 'Orders':
        return <OrdersTabScreen navigation={navigation} />
      case 'Services':
        return <ServicesTabScreen navigation={navigation} />
      case 'Business':
        return <BusinessTabScreen navigation={navigation} />
      case 'Tools':
        return <ToolsTabScreen navigation={navigation} />
      default:
        return <DashboardScreen navigation={navigation} />
    }
  }

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
                  color={focused ? '#3b82f6' : '#71717a'}
                />
                <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
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

// Orders Tab - Integrated view with Orders, Products, Returns toggle
function OrdersTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'orders' | 'products' | 'returns'>('orders')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'orders' && styles.segmentActive]}
          onPress={() => setActiveSection('orders')}
        >
          <Ionicons name="receipt-outline" size={18} color={activeSection === 'orders' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'orders' && styles.segmentTextActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'products' && styles.segmentActive]}
          onPress={() => setActiveSection('products')}
        >
          <Ionicons name="cube-outline" size={18} color={activeSection === 'products' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'products' && styles.segmentTextActive]}>Products</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'returns' && styles.segmentActive]}
          onPress={() => setActiveSection('returns')}
        >
          <Ionicons name="return-down-back-outline" size={18} color={activeSection === 'returns' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'returns' && styles.segmentTextActive]}>Returns</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'orders' && <OrdersScreen navigation={navigation} hideHeader />}
        {activeSection === 'products' && <ProductsScreen navigation={navigation} hideHeader />}
        {activeSection === 'returns' && <ReturnsScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// Services Tab - Integrated view with Services, Inquiries, 3D Prints
function ServicesTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'packages' | 'inquiries' | '3dprint'>('packages')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'packages' && styles.segmentActive]}
          onPress={() => setActiveSection('packages')}
        >
          <Ionicons name="layers-outline" size={18} color={activeSection === 'packages' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'packages' && styles.segmentTextActive]}>Packages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'inquiries' && styles.segmentActive]}
          onPress={() => setActiveSection('inquiries')}
        >
          <Ionicons name="chatbubbles-outline" size={18} color={activeSection === 'inquiries' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'inquiries' && styles.segmentTextActive]}>Inquiries</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === '3dprint' && styles.segmentActive]}
          onPress={() => setActiveSection('3dprint')}
        >
          <Ionicons name="print-outline" size={18} color={activeSection === '3dprint' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === '3dprint' && styles.segmentTextActive]}>3D Print</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'packages' && <ServicesScreen navigation={navigation} hideHeader />}
        {activeSection === 'inquiries' && <InquiriesScreen navigation={navigation} hideHeader />}
        {activeSection === '3dprint' && <CustomRequestsScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// Business Tab - Analytics, Expenses, Reports
function BusinessTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'analytics' | 'expenses' | 'reports'>('analytics')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'analytics' && styles.segmentActive]}
          onPress={() => setActiveSection('analytics')}
        >
          <Ionicons name="stats-chart-outline" size={18} color={activeSection === 'analytics' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'analytics' && styles.segmentTextActive]}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'expenses' && styles.segmentActive]}
          onPress={() => setActiveSection('expenses')}
        >
          <Ionicons name="wallet-outline" size={18} color={activeSection === 'expenses' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'expenses' && styles.segmentTextActive]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'reports' && styles.segmentActive]}
          onPress={() => setActiveSection('reports')}
        >
          <Ionicons name="bar-chart-outline" size={18} color={activeSection === 'reports' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'reports' && styles.segmentTextActive]}>Reports</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'analytics' && <AnalyticsScreen navigation={navigation} hideHeader />}
        {activeSection === 'expenses' && <ExpensesScreen navigation={navigation} hideHeader />}
        {activeSection === 'reports' && <ReportsScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

// Tools Tab - Users, Email, Blog, Settings
function ToolsTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'users' | 'email' | 'blog' | 'settings'>('users')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'users' && styles.segmentActive]}
          onPress={() => setActiveSection('users')}
        >
          <Ionicons name="people-outline" size={18} color={activeSection === 'users' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'users' && styles.segmentTextActive]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'email' && styles.segmentActive]}
          onPress={() => setActiveSection('email')}
        >
          <Ionicons name="mail-outline" size={18} color={activeSection === 'email' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'email' && styles.segmentTextActive]}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'blog' && styles.segmentActive]}
          onPress={() => setActiveSection('blog')}
        >
          <Ionicons name="document-text-outline" size={18} color={activeSection === 'blog' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'blog' && styles.segmentTextActive]}>Blog</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'settings' && styles.segmentActive]}
          onPress={() => setActiveSection('settings')}
        >
          <Ionicons name="settings-outline" size={18} color={activeSection === 'settings' ? '#fff' : '#71717a'} />
          <Text style={[styles.segmentText, activeSection === 'settings' && styles.segmentTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'users' && <UsersScreen navigation={navigation} hideHeader />}
        {activeSection === 'email' && <EmailScreen navigation={navigation} hideHeader />}
        {activeSection === 'blog' && <BlogScreen navigation={navigation} hideHeader />}
        {activeSection === 'settings' && <SettingsScreen navigation={navigation} hideHeader />}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#71717a',
  },
  tabLabelFocused: {
    color: '#3b82f6',
  },
  tabContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#18181b',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  segmentActive: {
    backgroundColor: '#3b82f6',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  tabContent: {
    flex: 1,
  },
})
