import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import { User } from '../types'

type UserType = 'customers' | 'admins'

export function UsersScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [userType, setUserType] = useState<UserType>('customers')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [counts, setCounts] = useState({ customers: 0, admins: 0 })

  const fetchUsers = async (pageNum = 1, refresh = false, type = userType) => {
    try {
      const role = type === 'admins' ? 'ADMIN' : 'USER'
      const data = await api.getUsers({ page: pageNum, limit: 20, role })
      const newUsers = data.users || []

      if (refresh || pageNum === 1) {
        setUsers(newUsers)
      } else {
        setUsers((prev) => [...prev, ...newUsers])
      }

      setHasMore(newUsers.length === 20)
      setPage(pageNum)

      // Update counts if available
      if (data.counts) {
        setCounts(data.counts)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch counts on mount
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [customersData, adminsData] = await Promise.all([
          api.getUsers({ page: 1, limit: 1, role: 'USER' }),
          api.getUsers({ page: 1, limit: 1, role: 'ADMIN' }),
        ])
        setCounts({
          customers: customersData.total || 0,
          admins: adminsData.total || 0,
        })
      } catch (e) {
        // Silent fail
      }
    }
    fetchCounts()
  }, [])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchUsers(1, true, userType)
  }, [userType])

  const onRefresh = () => {
    setRefreshing(true)
    fetchUsers(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchUsers(page + 1)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      const parts = name.split(' ').filter(n => n.length > 0)
      if (parts.length > 0) {
        return parts
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      }
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const renderUser = ({ item }: { item: User }) => {
    if (!item) return null
    return (
    <TouchableOpacity onPress={() => navigation.navigate('UserDetail', { id: item.id })} activeOpacity={0.7}>
      <Card style={styles.userCard}>
        <View style={styles.userContent}>
          <View style={[styles.avatar, (item.role === 'ADMIN' || item.role === 'SUPER_ADMIN') && styles.adminAvatar]}>
            <Text style={styles.avatarText}>{getInitials(item.name, item.email)}</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName} numberOfLines={1}>{item.name || 'No Name'}</Text>
              <View style={styles.badges}>
                {item.isFounder && <Badge text="Founder" variant="primary" />}
                {item.role === 'ADMIN' && <Badge text="Admin" variant="warning" />}
                {item.role === 'SUPER_ADMIN' && <Badge text="Super" variant="error" />}
              </View>
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            <View style={styles.userMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
              </View>
              {item._count?.orders !== undefined && item._count.orders > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="receipt-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{item._count.orders} orders</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>
    </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, userType === 'customers' && styles.tabActive]}
          onPress={() => setUserType('customers')}
        >
          <Ionicons
            name="people"
            size={18}
            color={userType === 'customers' ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, userType === 'customers' && styles.tabTextActive]}>
            Customers
          </Text>
          {counts.customers > 0 && (
            <View style={[styles.countBadge, userType === 'customers' && styles.countBadgeActive]}>
              <Text style={[styles.countText, userType === 'customers' && styles.countTextActive]}>
                {counts.customers}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, userType === 'admins' && styles.tabActive]}
          onPress={() => setUserType('admins')}
        >
          <Ionicons
            name="shield"
            size={18}
            color={userType === 'admins' ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, userType === 'admins' && styles.tabTextActive]}>
            Admins
          </Text>
          {counts.admins > 0 && (
            <View style={[styles.countBadge, userType === 'admins' && styles.countBadgeActive]}>
              <Text style={[styles.countText, userType === 'admins' && styles.countTextActive]}>
                {counts.admins}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons
                name={userType === 'admins' ? 'shield-outline' : 'people-outline'}
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>
                No {userType === 'admins' ? 'admins' : 'customers'} found
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceHover,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  countText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  countTextActive: {
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  userCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatar: {
    backgroundColor: '#f59e0b',
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
})
