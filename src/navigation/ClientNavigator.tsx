import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { ClientDashboardScreen, InvoicesScreen, ProjectsScreen } from '../screens/client'
import { AccountScreen, ProfileEditScreen, ChangePasswordScreen } from '../screens/account'
import { colors, portalColors, spacing, fontSize } from '../theme'

type TabName = 'Dashboard' | 'Projects' | 'Billing' | 'Account'

interface ScreenState {
  name: string
  params?: any
}

const tabs: { name: TabName; icon: string; iconFocused: string }[] = [
  { name: 'Dashboard', icon: 'home-outline', iconFocused: 'home' },
  { name: 'Projects', icon: 'folder-outline', iconFocused: 'folder' },
  { name: 'Billing', icon: 'card-outline', iconFocused: 'card' },
  { name: 'Account', icon: 'person-outline', iconFocused: 'person' },
]

export default function ClientNavigator() {
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard')
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
    const projectScreens = ['Projects', 'ProjectDetail']
    const billingScreens = ['Invoices', 'InvoiceDetail', 'Contracts', 'ContractDetail', 'PaymentMethods']
    const accountScreens = ['ProfileEdit', 'ChangePassword', 'Notifications']

    if (projectScreens.includes(screenName)) return 'Projects'
    if (billingScreens.includes(screenName)) return 'Billing'
    if (accountScreens.includes(screenName)) return 'Account'
    return null
  }

  const renderScreen = () => {
    // Wrapper for stacked screens to handle iOS notch
    const ScreenWrapper = ({ children }: { children: React.ReactNode }) => (
      <SafeAreaView style={styles.stackedScreenContainer} edges={['top']}>
        {children}
      </SafeAreaView>
    )

    if (currentScreen) {
      switch (currentScreen.name) {
        case 'Projects':
          return <ScreenWrapper><ProjectsScreen navigation={navigation} /></ScreenWrapper>
        case 'Invoices':
          return <ScreenWrapper><InvoicesScreen navigation={navigation} /></ScreenWrapper>
        case 'ProfileEdit':
          return <ScreenWrapper><ProfileEditScreen navigation={navigation} /></ScreenWrapper>
        case 'ChangePassword':
          return <ScreenWrapper><ChangePasswordScreen navigation={navigation} /></ScreenWrapper>
      }
    }

    switch (activeTab) {
      case 'Dashboard':
        return <SafeAreaView style={styles.stackedScreenContainer} edges={['top']}><ClientDashboardScreen navigation={navigation} hideHeader /></SafeAreaView>
      case 'Projects':
        return <SafeAreaView style={styles.stackedScreenContainer} edges={['top']}><ProjectsScreen navigation={navigation} hideHeader /></SafeAreaView>
      case 'Billing':
        return <BillingTabScreen navigation={navigation} />
      case 'Account':
        return <SafeAreaView style={styles.stackedScreenContainer} edges={['top']}><AccountScreen navigation={navigation} hideHeader /></SafeAreaView>
      default:
        return <SafeAreaView style={styles.stackedScreenContainer} edges={['top']}><ClientDashboardScreen navigation={navigation} hideHeader /></SafeAreaView>
    }
  }

  const accentColor = portalColors.client

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
                  color={focused ? accentColor : colors.textMuted}
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

function BillingTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'invoices' | 'contracts'>('invoices')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'invoices' && styles.segmentActive]}
          onPress={() => setActiveSection('invoices')}
        >
          <Ionicons name="receipt-outline" size={18} color={activeSection === 'invoices' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, activeSection === 'invoices' && styles.segmentTextActive]}>Invoices</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'contracts' && styles.segmentActive]}
          onPress={() => setActiveSection('contracts')}
        >
          <Ionicons name="document-text-outline" size={18} color={activeSection === 'contracts' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, activeSection === 'contracts' && styles.segmentTextActive]}>Contracts</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'invoices' && <InvoicesScreen navigation={navigation} hideHeader />}
        {activeSection === 'contracts' && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Contracts Coming Soon</Text>
          </View>
        )}
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
    color: colors.textMuted,
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
    backgroundColor: portalColors.client,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  tabContent: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
})
