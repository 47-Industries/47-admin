import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/auth'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'
import { ImageViewer } from '../../components/ImageViewer'

interface AccountScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function AccountScreen({ navigation, hideHeader }: AccountScreenProps) {
  const user = useAuthStore((state) => state.user)
  const portalType = useAuthStore((state) => state.portalType)
  const portalAccess = useAuthStore((state) => state.portalAccess)
  const logout = useAuthStore((state) => state.logout)
  const switchPortal = useAuthStore((state) => state.switchPortal)
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  const accentColor = portalType ? portalColors[portalType] : colors.primary

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout()
          },
        },
      ]
    )
  }

  const handleSwitchPortal = async (newPortal: 'admin' | 'partner' | 'client' | 'affiliate') => {
    if (newPortal === portalType) return
    try {
      await switchPortal(newPortal)
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const availablePortals = portalAccess
    ? Object.entries(portalAccess)
        .filter(([_, hasAccess]) => hasAccess)
        .map(([portal]) => portal as 'admin' | 'partner' | 'client' | 'affiliate')
    : []

  const portalLabels = {
    admin: 'Admin',
    partner: 'Partner',
    client: 'Client',
    affiliate: 'Affiliate',
  }

  const portalIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    admin: 'shield-checkmark',
    partner: 'people',
    client: 'briefcase',
    affiliate: 'gift',
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={[styles.avatarContainer, { borderColor: accentColor }]}
            onPress={() => user?.image && setViewingImage(user.image)}
            activeOpacity={user?.image ? 0.8 : 1}
          >
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${accentColor}20` }]}>
                <Text style={[styles.avatarText, { color: accentColor }]}>
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.portalBadge, { backgroundColor: `${accentColor}20` }]}>
            <Ionicons name={portalIcons[portalType || 'admin']} size={14} color={accentColor} />
            <Text style={[styles.portalBadgeText, { color: accentColor }]}>
              {portalLabels[portalType || 'admin']} Portal
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileEdit')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Communication & Marketing */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Communication</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Email')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Email</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Marketing')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="megaphone-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Marketing</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Tools */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Tools</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('BusinessCards')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="card-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Business Cards</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>General Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Switch Portal */}
        {availablePortals.length > 1 && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Switch Portal</Text>
            {availablePortals
              .filter((p) => p !== portalType)
              .map((portal) => (
                <TouchableOpacity
                  key={portal}
                  style={styles.menuItem}
                  onPress={() => handleSwitchPortal(portal)}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name={portalIcons[portal]} size={20} color={portalColors[portal]} />
                    <Text style={styles.menuItemText}>{portalLabels[portal]} Portal</Text>
                  </View>
                  <Ionicons name="swap-horizontal-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Support */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://47industries.com/contact')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Contact Support</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://47industries.com/legal/terms')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://47industries.com/legal/privacy')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>47 Industries v1.0.0</Text>
      </ScrollView>
      <ImageViewer
        visible={!!viewingImage}
        imageUrl={viewingImage}
        onClose={() => setViewingImage(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    padding: 3,
    marginBottom: spacing.md,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarPlaceholder: {
    flex: 1,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  portalBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  menuSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
  },
})
