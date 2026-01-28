import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  readAt: string | null
  metadata: any
  createdAt: string
}

interface NotificationStats {
  total: number
  unread: number
  today: number
  thisWeek: number
}

type NotificationFilter = 'all' | 'unread'
type TypeFilter = 'ALL' | 'ORDERS' | 'INQUIRIES' | 'INVENTORY' | 'SYSTEM' | 'USERS'

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ORDERS', label: 'Orders' },
  { value: 'INQUIRIES', label: 'Inquiries' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'USERS', label: 'Users' },
]

const TYPE_COLOR_MAP: Record<string, string> = {
  ORDER_NEW: colors.success,
  ORDER_STATUS: colors.primary,
  ORDER_REFUND: colors.error,
  INVENTORY_LOW: colors.warning,
  INVENTORY_OUT: colors.error,
  CUSTOM_REQUEST: colors.purple,
  SERVICE_INQUIRY: '#06b6d4',
  REVIEW_NEW: colors.warning,
  USER_SIGNUP: colors.success,
  SYSTEM: colors.textMuted,
}

const TYPE_LABEL_MAP: Record<string, string> = {
  ORDER_NEW: 'New Order',
  ORDER_STATUS: 'Order Update',
  ORDER_REFUND: 'Refund',
  INVENTORY_LOW: 'Low Stock',
  INVENTORY_OUT: 'Out of Stock',
  CUSTOM_REQUEST: '3D Print Request',
  SERVICE_INQUIRY: 'Service Inquiry',
  REVIEW_NEW: 'New Review',
  USER_SIGNUP: 'New Customer',
  SYSTEM: 'System',
}

const TYPE_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  ORDER_NEW: 'cart-outline',
  ORDER_STATUS: 'receipt-outline',
  ORDER_REFUND: 'return-down-back-outline',
  INVENTORY_LOW: 'warning-outline',
  INVENTORY_OUT: 'alert-circle-outline',
  CUSTOM_REQUEST: 'cube-outline',
  SERVICE_INQUIRY: 'chatbubbles-outline',
  REVIEW_NEW: 'star-outline',
  USER_SIGNUP: 'person-add-outline',
  SYSTEM: 'settings-outline',
}

const TYPE_CATEGORY_MAP: Record<string, TypeFilter> = {
  ORDER_NEW: 'ORDERS',
  ORDER_STATUS: 'ORDERS',
  ORDER_REFUND: 'ORDERS',
  INVENTORY_LOW: 'INVENTORY',
  INVENTORY_OUT: 'INVENTORY',
  CUSTOM_REQUEST: 'INQUIRIES',
  SERVICE_INQUIRY: 'INQUIRIES',
  REVIEW_NEW: 'USERS',
  USER_SIGNUP: 'USERS',
  SYSTEM: 'SYSTEM',
}

export function NotificationsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    today: 0,
    thisWeek: 0,
  })

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotificationsWithFilter(filter)
      setNotifications(data.notifications || [])
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      // Fallback to basic endpoint if the filter endpoint doesn't work
      try {
        const fallbackData = await api.getNotifications()
        setNotifications(fallbackData.notifications || [])
        setStats({
          total: fallbackData.notifications?.length || 0,
          unread: fallbackData.unreadCount || 0,
          today: 0,
          thisWeek: 0,
        })
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        Alert.alert('Error', 'Failed to load notifications. Please try again later.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    fetchNotifications()
  }, [fetchNotifications])

  const onRefresh = () => {
    setRefreshing(true)
    fetchNotifications()
  }

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ))
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))
    } catch (error) {
      console.error('Error marking notification as read:', error)
      Alert.alert('Error', 'Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    if (stats.unread === 0) return

    try {
      await api.markAllNotificationsRead()
      setNotifications(notifications.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
      setStats(prev => ({ ...prev, unread: 0 }))
    } catch (error) {
      console.error('Error marking all as read:', error)
      Alert.alert('Error', 'Failed to mark all notifications as read')
    }
  }

  const deleteNotification = async (id: string) => {
    const notification = notifications.find(n => n.id === id)

    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteNotification(id)
              setNotifications(notifications.filter(n => n.id !== id))
              setStats(prev => ({
                ...prev,
                total: prev.total - 1,
                unread: notification && !notification.isRead ? prev.unread - 1 : prev.unread
              }))
            } catch (error) {
              console.error('Error deleting notification:', error)
              Alert.alert('Error', 'Failed to delete notification')
            }
          }
        }
      ]
    )
  }

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read when tapped
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    // Navigate based on notification type/link if available
    if (notification.link) {
      // Parse the link to determine where to navigate
      const linkParts = notification.link.split('/')
      if (linkParts.includes('orders') && linkParts.length > 2) {
        const orderId = linkParts[linkParts.length - 1]
        navigation.navigate('OrderDetail', { id: orderId })
      } else if (linkParts.includes('inquiries') && linkParts.length > 2) {
        const inquiryId = linkParts[linkParts.length - 1]
        navigation.navigate('InquiryDetail', { id: inquiryId })
      } else if (linkParts.includes('custom-requests') && linkParts.length > 2) {
        const requestId = linkParts[linkParts.length - 1]
        navigation.navigate('CustomRequestDetail', { id: requestId })
      } else if (linkParts.includes('users') && linkParts.length > 2) {
        const userId = linkParts[linkParts.length - 1]
        navigation.navigate('UserDetail', { id: userId })
      } else if (linkParts.includes('products') && linkParts.length > 2) {
        const productId = linkParts[linkParts.length - 1]
        navigation.navigate('ProductDetail', { id: productId })
      }
    }
  }

  const getTypeColor = (type: string): string => {
    return TYPE_COLOR_MAP[type] || colors.textMuted
  }

  const getTypeLabel = (type: string): string => {
    return TYPE_LABEL_MAP[type] || type.replace(/_/g, ' ')
  }

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    return TYPE_ICON_MAP[type] || 'notifications-outline'
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Filter notifications by type category
  const filteredNotifications = notifications.filter(notification => {
    if (typeFilter === 'ALL') return true
    return TYPE_CATEGORY_MAP[notification.type] === typeFilter
  })

  // Sort: unread first, then by date
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // Unread first
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1
    }
    // Then by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const renderNotification = ({ item }: { item: Notification }) => {
    const typeColor = getTypeColor(item.type)

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => deleteNotification(item.id)}
        activeOpacity={0.7}
      >
        <Card style={[styles.notificationCard, !item.isRead && styles.unreadCard]}>
          <View style={styles.notificationHeader}>
            <View style={styles.typeContainer}>
              {!item.isRead && <View style={styles.unreadDot} />}
              <View style={[styles.iconContainer, { backgroundColor: `${typeColor}20` }]}>
                <Ionicons name={getTypeIcon(item.type)} size={16} color={typeColor} />
              </View>
              <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>{getTypeLabel(item.type)}</Text>
              </View>
            </View>
            <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
          </View>

          <Text style={[styles.notificationTitle, !item.isRead && styles.unreadTitle]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>

          <View style={styles.notificationFooter}>
            {item.link && (
              <View style={styles.linkIndicator}>
                <Ionicons name="open-outline" size={12} color={colors.textMuted} />
                <Text style={styles.linkText}>Tap to view</Text>
              </View>
            )}
            <View style={styles.actionsContainer}>
              {!item.isRead && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation()
                    markAsRead(item.id)
                  }}
                >
                  <Ionicons name="checkmark-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation()
                  deleteNotification(item.id)
                }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'unread'
          ? 'You have no unread notifications'
          : 'Notifications will appear here when there are updates'}
      </Text>
    </View>
  )

  const renderHeader = () => (
    <View>
      {/* Stats Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        <View style={[styles.statCard, { borderColor: colors.primary }]}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
        </View>
        <View style={[styles.statCard, { borderColor: colors.error }]}>
          <Text style={styles.statLabel}>Unread</Text>
          <Text style={[styles.statValue, { color: colors.error }]}>{stats.unread}</Text>
        </View>
        <View style={[styles.statCard, { borderColor: colors.success }]}>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.today}</Text>
        </View>
        <View style={[styles.statCard, { borderColor: colors.purple }]}>
          <Text style={styles.statLabel}>This Week</Text>
          <Text style={[styles.statValue, { color: colors.purple }]}>{stats.thisWeek}</Text>
        </View>
      </ScrollView>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
              Unread ({stats.unread})
            </Text>
          </TouchableOpacity>
        </View>

        {stats.unread > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllButtonText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeFiltersContainer}
      >
        {TYPE_FILTERS.map((typeFilterItem) => (
          <TouchableOpacity
            key={typeFilterItem.value}
            style={[styles.typeFilterChip, typeFilter === typeFilterItem.value && styles.typeFilterChipActive]}
            onPress={() => setTypeFilter(typeFilterItem.value)}
          >
            <Text
              style={[
                styles.typeFilterChipText,
                typeFilter === typeFilterItem.value && styles.typeFilterChipTextActive,
              ]}
            >
              {typeFilterItem.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          {stats.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{stats.unread}</Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={sortedNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  unreadBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statsContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: spacing.lg,
    minWidth: 100,
    marginRight: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  filterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterTabTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  markAllButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  markAllButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  typeFiltersContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  typeFilterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  typeFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeFilterChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  typeFilterChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  notificationCard: {
    marginBottom: spacing.md,
  },
  unreadCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: colors.primary,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  typeBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  notificationTitle: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  unreadTitle: {
    fontWeight: fontWeight.semibold,
  },
  notificationMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  linkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceHover,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
})
