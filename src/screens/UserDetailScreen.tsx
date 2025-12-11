import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

export default function UserDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [id])

  const fetchUser = async () => {
    try {
      const data = await api.getUser(id)
      setUser(data.user)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      Alert.alert('Error', 'Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>User not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.name, user.email)}</Text>
          </View>
          <Text style={styles.userName}>{user.name || 'No Name'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.badges}>
            {user.isFounder && <Badge text="Founder" variant="primary" />}
            {user.role === 'ADMIN' && <Badge text="Admin" variant="warning" />}
            {user.role === 'SUPER_ADMIN' && <Badge text="Super Admin" variant="error" />}
            {user.role === 'CUSTOMER' && <Badge text="Customer" variant="default" />}
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(`mailto:${user.email}`)}
          >
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Email</Text>
          </TouchableOpacity>
          {user.phone && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Linking.openURL(`tel:${user.phone}`)}
            >
              <Ionicons name="call-outline" size={20} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Call</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        {user.role === 'CUSTOMER' && (
          <>
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{user._count?.orders || 0}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCurrency(user.totalSpent || 0)}
                </Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </Card>
            </View>
          </>
        )}

        {/* Account Info */}
        <Text style={styles.sectionTitle}>Account Information</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          {user.username && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>@{user.username}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{user.role}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Joined</Text>
            <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
          </View>
          {user.emailVerified && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Verified</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Recent Orders */}
        {user.orders?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {user.orders.slice(0, 5).map((order: any) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
              >
                <Card style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <Badge
                      text={order.status}
                      variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'primary'}
                    />
                  </View>
                  <View style={styles.orderDetails}>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    <Text style={styles.orderTotal}>{formatCurrency(Number(order.total))}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Permissions (for admins) */}
        {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && user.permissions?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Permissions</Text>
            <Card style={styles.permissionsCard}>
              <View style={styles.permissionsList}>
                {user.permissions.map((permission: string, index: number) => (
                  <View key={index} style={styles.permissionBadge}>
                    <Ionicons name="checkmark" size={14} color={colors.success} />
                    <Text style={styles.permissionText}>{permission}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  actionText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  infoCard: {
    padding: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginLeft: spacing.xs,
  },
  orderCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  orderTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  permissionsCard: {
    padding: spacing.lg,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  permissionText: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginLeft: spacing.xs,
    textTransform: 'lowercase',
  },
})
