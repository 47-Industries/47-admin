import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { AffiliateDashboardScreen, ReferralsScreen } from '../screens/affiliate'
import { AccountScreen, ProfileEditScreen, ChangePasswordScreen } from '../screens/account'
import { colors, portalColors, spacing, fontSize } from '../theme'

type TabName = 'Dashboard' | 'Referrals' | 'Account'

interface ScreenState {
  name: string
  params?: any
}

const tabs: { name: TabName; icon: string; iconFocused: string }[] = [
  { name: 'Dashboard', icon: 'home-outline', iconFocused: 'home' },
  { name: 'Referrals', icon: 'people-outline', iconFocused: 'people' },
  { name: 'Account', icon: 'person-outline', iconFocused: 'person' },
]

export default function AffiliateNavigator() {
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
    const referralScreens = ['Referrals', 'Share']
    const accountScreens = ['ProfileEdit', 'ChangePassword', 'Notifications']

    if (referralScreens.includes(screenName)) return 'Referrals'
    if (accountScreens.includes(screenName)) return 'Account'
    return null
  }

  const renderScreen = () => {
    if (currentScreen) {
      switch (currentScreen.name) {
        case 'Referrals':
          return <ReferralsScreen navigation={navigation} />
        case 'ProfileEdit':
          return <ProfileEditScreen navigation={navigation} />
        case 'ChangePassword':
          return <ChangePasswordScreen navigation={navigation} />
      }
    }

    switch (activeTab) {
      case 'Dashboard':
        return <AffiliateDashboardScreen navigation={navigation} hideHeader />
      case 'Referrals':
        return <ReferralsScreen navigation={navigation} hideHeader />
      case 'Account':
        return <AccountScreen navigation={navigation} hideHeader />
      default:
        return <AffiliateDashboardScreen navigation={navigation} hideHeader />
    }
  }

  const accentColor = portalColors.affiliate

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
})
