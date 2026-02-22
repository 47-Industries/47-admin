import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'
import { EmptyState } from '../../components/EmptyState'

interface ExternalOrder {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  source: string
  sourceOrderId?: string
  sourceData?: {
    shippingAddress?: {
      fullName?: string
      address1?: string
      city?: string
      state?: string
      zipCode?: string
    }
    barberId?: string
    barberName?: string
    customization?: any
  }
  items: Array<{
    id: string
    name: string
    quantity: number
    price: number
    total: number
    customization?: any
  }>
  total: number
  status: string
  paymentStatus: string
  createdAt: string
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  PROCESSING: 'primary',
  PAID: 'success',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error',
  REFUNDED: 'error',
}

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PAID', label: 'Paid' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
]

export function ExternalOrdersScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [orders, setOrders] = useState<ExternalOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const fetchOrders = async (pageNum = 1, refresh = false) => {
    try {
      const data = await api.getExternalOrders({
        page: pageNum,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        source: 'bookfade', // Filter by BookFade source
      })
      const newOrders = data.orders || []

      if (refresh || pageNum === 1) {
        setOrders(newOrders)
      } else {
        setOrders((prev) => [...prev, ...newOrders])
      }

      setHasMore(newOrders.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch external orders:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchOrders(1, true)
  }, [search, statusFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchOrders(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchOrders(page + 1)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getSourceLabel = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'bookfade':
        return 'BookFade'
      default:
        return source || 'Unknown'
    }
  }

  const renderOrder = ({ item }: { item: ExternalOrder }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ExternalOrderDetail', { id: item.id })} activeOpacity={0.7}>
      <Card style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <View style={styles.orderNumberRow}>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceText}>{getSourceLabel(item.source)}</Text>
              </View>
            </View>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <Badge text={item.status} variant={statusColors[item.status] || 'default'} />
        </View>
        <View style={styles.orderDetails}>
          <View style={styles.orderCustomer}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} />
            <Text style={styles.customerName}>{item.customerName}</Text>
          </View>
          <Text style={styles.orderTotal}>{formatCurrency(Number(item.total))}</Text>
        </View>
        {item.sourceData?.barberName && (
          <View style={styles.barberInfo}>
            <Ionicons name="cut-outline" size={14} color={colors.textMuted} />
            <Text style={styles.barberText}>Barber: {item.sourceData.barberName}</Text>
          </View>
        )}
        <View style={styles.orderItems}>
          <Text style={styles.itemsCount}>{item.items?.length || 0} items</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>BookFade Orders</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filtersContainer}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.value)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter.value && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="storefront-outline" title="No external orders found" />
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
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
  filtersScroll: {
    maxHeight: 48,
    marginBottom: spacing.md,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  orderCard: {
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sourceBadge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sourceText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  orderTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  barberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  barberText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  orderItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemsCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
})
