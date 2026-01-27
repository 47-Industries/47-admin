import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { PartnerDashboardScreen, LeadsScreen, NewLeadScreen, CommissionsScreen } from '../screens/partner'
import { AccountScreen, ProfileEditScreen, ChangePasswordScreen } from '../screens/account'
import { colors, portalColors, spacing, fontSize } from '../theme'

type TabName = 'Dashboard' | 'Referrals' | 'Earnings' | 'Account'

interface ScreenState {
  name: string
  params?: any
}

const tabs: { name: TabName; icon: string; iconFocused: string }[] = [
  { name: 'Dashboard', icon: 'home-outline', iconFocused: 'home' },
  { name: 'Referrals', icon: 'people-outline', iconFocused: 'people' },
  { name: 'Earnings', icon: 'cash-outline', iconFocused: 'cash' },
  { name: 'Account', icon: 'person-outline', iconFocused: 'person' },
]

export default function PartnerNavigator() {
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
    const referralScreens = ['Leads', 'LeadDetail', 'NewLead', 'AffiliateLinks']
    const earningsScreens = ['Commissions', 'Payouts']
    const accountScreens = ['ProfileEdit', 'ChangePassword', 'Notifications', 'Contract']

    if (referralScreens.includes(screenName)) return 'Referrals'
    if (earningsScreens.includes(screenName)) return 'Earnings'
    if (accountScreens.includes(screenName)) return 'Account'
    return null
  }

  const renderScreen = () => {
    if (currentScreen) {
      switch (currentScreen.name) {
        case 'Leads':
          return <LeadsScreen navigation={navigation} />
        case 'NewLead':
          return <NewLeadScreen navigation={navigation} />
        case 'Commissions':
          return <CommissionsScreen navigation={navigation} />
        case 'ProfileEdit':
          return <ProfileEditScreen navigation={navigation} />
        case 'ChangePassword':
          return <ChangePasswordScreen navigation={navigation} />
      }
    }

    switch (activeTab) {
      case 'Dashboard':
        return <PartnerDashboardScreen navigation={navigation} hideHeader />
      case 'Referrals':
        return <ReferralsTabScreen navigation={navigation} />
      case 'Earnings':
        return <EarningsTabScreen navigation={navigation} />
      case 'Account':
        return <AccountScreen navigation={navigation} hideHeader />
      default:
        return <PartnerDashboardScreen navigation={navigation} hideHeader />
    }
  }

  const accentColor = portalColors.partner

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

function ReferralsTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'leads' | 'links'>('leads')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'leads' && styles.segmentActive]}
          onPress={() => setActiveSection('leads')}
        >
          <Ionicons name="people-outline" size={18} color={activeSection === 'leads' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, activeSection === 'leads' && styles.segmentTextActive]}>Leads</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'links' && styles.segmentActive]}
          onPress={() => setActiveSection('links')}
        >
          <Ionicons name="link-outline" size={18} color={activeSection === 'links' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, activeSection === 'links' && styles.segmentTextActive]}>Affiliate Links</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'leads' && <LeadsScreen navigation={navigation} hideHeader />}
        {activeSection === 'links' && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Affiliate Links Coming Soon</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

function EarningsTabScreen({ navigation }: { navigation: any }) {
  const [activeSection, setActiveSection] = useState<'commissions' | 'payouts'>('commissions')

  return (
    <SafeAreaView style={styles.tabContainer} edges={['top']}>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'commissions' && styles.segmentActive]}
          onPress={() => setActiveSection('commissions')}
        >
          <Ionicons name="cash-outline" size={18} color={activeSection === 'commissions' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, activeSection === 'commissions' && styles.segmentTextActive]}>Commissions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSection === 'payouts' && styles.segmentActive]}
          onPress={() => setActiveSection('payouts')}
        >
          <Ionicons name="wallet-outline" size={18} color={activeSection === 'payouts' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, activeSection === 'payouts' && styles.segmentTextActive]}>Payouts</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeSection === 'commissions' && <CommissionsScreen navigation={navigation} hideHeader />}
        {activeSection === 'payouts' && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Payouts Coming Soon</Text>
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
    backgroundColor: portalColors.partner,
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
