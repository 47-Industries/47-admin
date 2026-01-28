import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { useAuthStore } from '../store/auth'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

export function SettingsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ])
  }

  const openWebAdmin = () => {
    Linking.openURL('https://admin.47industries.com')
  }

  const openWebsite = () => {
    Linking.openURL('https://47industries.com')
  }

  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    destructive = false,
  }: {
    icon: string
    title: string
    subtitle?: string
    onPress?: () => void
    showArrow?: boolean
    destructive?: boolean
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, destructive && styles.settingIconDestructive]}>
        <Ionicons name={icon as any} size={22} color={destructive ? colors.error : colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, destructive && styles.settingTitleDestructive]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && onPress && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.name, user?.email || '')}</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.profileHeader}>
                <Text style={styles.profileName}>{user?.name || 'Admin'}</Text>
                {user?.isFounder && <Badge text="Founder" variant="primary" />}
              </View>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileRole}>{user?.role || 'USER'}</Text>
            </View>
          </View>
        </Card>

        {/* Store Settings */}
        <Text style={styles.sectionTitle}>Store Settings</Text>
        <Card style={styles.settingsCard}>
          <SettingItem
            icon="airplane-outline"
            title="Shipping"
            subtitle="Zones, rates, and delivery options"
            onPress={() => navigation.navigate('ShippingSettings')}
          />
        </Card>

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <Card style={styles.settingsCard}>
          <SettingItem icon="globe-outline" title="Web Admin" subtitle="admin.47industries.com" onPress={openWebAdmin} />
          <View style={styles.divider} />
          <SettingItem icon="storefront-outline" title="47 Industries" subtitle="47industries.com" onPress={openWebsite} />
        </Card>

        {/* App Info */}
        <Text style={styles.sectionTitle}>App Info</Text>
        <Card style={styles.settingsCard}>
          <SettingItem icon="information-circle-outline" title="Version" subtitle="1.0.0" showArrow={false} />
          <View style={styles.divider} />
          <SettingItem icon="code-slash-outline" title="Build" subtitle="47-admin" showArrow={false} />
        </Card>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.settingsCard}>
          <SettingItem
            icon="log-out-outline"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            destructive
          />
        </Card>

        <Text style={styles.footer}>47 Industries Admin</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    marginBottom: spacing.xl,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  profileRole: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  settingContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  settingTitle: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  settingTitleDestructive: {
    color: colors.error,
  },
  settingSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 40 + spacing.md,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xxl,
  },
})
