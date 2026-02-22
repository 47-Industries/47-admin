import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { SkeletonCard, SkeletonList } from '../components/Skeleton'
import { useAuthStore } from '../store/auth'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface Stats {
  totalOrders: number
  totalRevenue: number
  customRequestsCount: number
  serviceInquiriesCount: number
  pendingOrders: number
  recentActivity: ActivityItem[]
}

interface ActivityItem {
  type: 'order' | 'request' | 'inquiry' | 'lead' | 'email'
  id: string
  number: string
  name: string
  detail: string
  status: string
  createdAt: string
}

interface LiveStats {
  activeUsers: number
  pageViews: number
}

const statusColors: Record<string, { bg: string; text: string }> = {
  // Orders
  PENDING: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' },
  CONFIRMED: { bg: 'rgba(59, 130, 246, 0.15)', text: colors.primary },
  PROCESSING: { bg: 'rgba(59, 130, 246, 0.15)', text: colors.primary },
  SHIPPED: { bg: 'rgba(59, 130, 246, 0.15)', text: colors.primary },
  DELIVERED: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.error },
  // 3D Print
  NEW: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' },
  QUOTED: { bg: 'rgba(59, 130, 246, 0.15)', text: colors.primary },
  APPROVED: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  IN_PROGRESS: { bg: 'rgba(168, 85, 247, 0.15)', text: colors.purpleAlt },
  COMPLETED: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.error },
  // Leads
  CONTACTED: { bg: 'rgba(59, 130, 246, 0.15)', text: colors.primary },
  QUALIFIED: { bg: 'rgba(168, 85, 247, 0.15)', text: colors.purpleAlt },
  CONVERTED: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  LOST: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.error },
  // Email
  SENT: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  FAILED: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.error },
  // Default
  default: { bg: 'rgba(113, 113, 122, 0.15)', text: '#71717a' },
}

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  order: { icon: 'receipt', color: colors.primary, label: 'Order' },
  request: { icon: 'print', color: colors.purpleAlt, label: '3D Print' },
  inquiry: { icon: 'chatbubbles', color: colors.warning, label: 'Inquiry' },
  lead: { icon: 'people', color: colors.success, label: 'Lead' },
  email: { icon: 'mail', color: colors.pink, label: 'Email' },
}

export function DashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const user = useAuthStore((state) => state.user)

  const fetchData = async () => {
    try {
      const [statsData, liveData] = await Promise.all([
        api.getStats(),
        api.getLiveAnalytics().catch((error) => {
          console.error('Failed to fetch live analytics:', error)
          return null
        }),
      ])
      setStats(statsData)
      setLiveStats(liveData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Refresh live stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const liveData = await api.getLiveAnalytics()
        setLiveStats(liveData)
      } catch (error) {
        console.error('Failed to refresh live analytics:', error)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(1) + 'K'
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0)
  }

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusStyle = (status: string) => {
    return statusColors[status] || statusColors.default
  }

  const handleActivityPress = (item: ActivityItem) => {
    if (item.type === 'order') {
      navigation.navigate('OrderDetail', { id: item.id })
    } else if (item.type === 'request') {
      navigation.navigate('CustomRequestDetail', { id: item.id })
    } else if (item.type === 'inquiry') {
      navigation.navigate('InquiryDetail', { id: item.id })
    } else if (item.type === 'lead') {
      navigation.navigate('LeadDetail', { id: item.id })
    } else if (item.type === 'email') {
      navigation.navigate('Email')
    }
  }

  // Count items needing attention
  const needsAttention = stats?.recentActivity?.filter(
    a => ['PENDING', 'NEW'].includes(a.status)
  ).length || 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>
              {(() => {
                const gender = user?.teamMember?.gender
                const name = user?.teamMember?.name || user?.name
                if (gender && name) {
                  const lastName = name.split(' ').slice(-1)[0]
                  const honorific = gender === 'MALE' ? 'Mr.' : gender === 'FEMALE' ? 'Ms.' : ''
                  return honorific ? `${honorific} ${lastName}` : name.split(' ')[0]
                }
                return name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
              })()}
            </Text>
          </View>
          {needsAttention > 0 && (
            <TouchableOpacity
              style={styles.attentionBadge}
              onPress={() => {
                // Navigate to first pending item
                const pendingItem = stats?.recentActivity?.find(a => ['PENDING', 'NEW'].includes(a.status))
                if (pendingItem) {
                  handleActivityPress(pendingItem)
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={14} color="#000" style={{ marginRight: 2 }} />
              <Text style={styles.attentionText}>{needsAttention}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Live Stats Bar */}
        {liveStats && (
          <TouchableOpacity
            style={styles.liveBar}
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.7}
          >
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
            <View style={styles.liveStats}>
              <View style={styles.liveStat}>
                <Text style={styles.liveValue}>{liveStats.activeUsers || 0}</Text>
                <Text style={styles.liveLabel}>Active</Text>
              </View>
              <View style={styles.liveDivider} />
              <View style={styles.liveStat}>
                <Text style={styles.liveValue}>{liveStats.pageViews || 0}</Text>
                <Text style={styles.liveLabel}>Views/hr</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Key Metrics - Compact Grid */}
        {loading ? (
          <View style={styles.metricsGrid}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <TouchableOpacity
              style={[styles.metricCard, { borderLeftColor: colors.success }]}
              onPress={() => navigation.navigate('Analytics')}
              activeOpacity={0.7}
            >
              <Text style={styles.metricValue}>{formatCurrency(stats?.totalRevenue || 0)}</Text>
              <Text style={styles.metricLabel}>Revenue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.metricCard, { borderLeftColor: colors.primary }]}
              onPress={() => navigation.navigate('Orders')}
              activeOpacity={0.7}
            >
              <Text style={styles.metricValue}>{stats?.totalOrders || 0}</Text>
              <Text style={styles.metricLabel}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.metricCard, { borderLeftColor: '#a855f7' }]}
              onPress={() => navigation.navigate('CustomRequests')}
              activeOpacity={0.7}
            >
              <Text style={styles.metricValue}>{stats?.customRequestsCount || 0}</Text>
              <Text style={styles.metricLabel}>3D Prints</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.metricCard, { borderLeftColor: '#f59e0b' }]}
              onPress={() => navigation.navigate('Inquiries')}
              activeOpacity={0.7}
            >
              <Text style={styles.metricValue}>{stats?.serviceInquiriesCount || 0}</Text>
              <Text style={styles.metricLabel}>Inquiries</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {needsAttention > 0 && (
            <View style={styles.needsAttention}>
              <Ionicons name="alert-circle" size={14} color="#fbbf24" />
              <Text style={styles.needsAttentionText}>{needsAttention} need attention</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={[styles.activityList, { overflow: 'visible' }]}>
            <SkeletonList count={5} />
          </View>
        ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <View style={styles.activityList}>
            {stats.recentActivity.map((item, index) => {
              const config = typeConfig[item.type]
              const statusStyle = getStatusStyle(item.status)
              const isUrgent = ['PENDING', 'NEW'].includes(item.status)

              return (
                <TouchableOpacity
                  key={`${item.type}-${item.id}`}
                  style={[styles.activityItem, isUrgent && styles.activityItemUrgent]}
                  onPress={() => handleActivityPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.activityIcon, { backgroundColor: config.color + '20' }]}>
                    <Ionicons name={config.icon as any} size={18} color={config.color} />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityTop}>
                      <Text style={styles.activityNumber}>{item.number}</Text>
                      <Text style={styles.activityTime}>{formatTimeAgo(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.activityName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.activityBottom}>
                      <Text style={styles.activityDetail}>{item.detail}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                          {item.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.activityChevron} />
                </TouchableOpacity>
              )
            })}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubtext}>No recent activity</Text>
          </Card>
        )}

        {/* Quick Navigation */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Orders')} activeOpacity={0.7}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="receipt" size={20} color=colors.primary />
            </View>
            <Text style={styles.quickLabel}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Products')} activeOpacity={0.7}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="cube" size={20} color=colors.purpleAlt />
            </View>
            <Text style={styles.quickLabel}>Products</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Email')} activeOpacity={0.7}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="mail" size={20} color="#22c55e" />
            </View>
            <Text style={styles.quickLabel}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(113, 113, 122, 0.15)' }]}>
              <Ionicons name="settings" size={20} color="#71717a" />
            </View>
            <Text style={styles.quickLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  userName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  attentionBadge: {
    flexDirection: 'row',
    backgroundColor: '#fbbf24',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionText: {
    color: '#000',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  liveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  liveText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  liveStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  liveStat: {
    alignItems: 'center',
  },
  liveValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  liveLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  liveDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  needsAttention: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  needsAttentionText: {
    fontSize: fontSize.xs,
    color: '#fbbf24',
  },
  activityList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityItemUrgent: {
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  activityTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  activityName: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  activityBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  activityDetail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
  },
  activityChevron: {
    marginLeft: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
})
