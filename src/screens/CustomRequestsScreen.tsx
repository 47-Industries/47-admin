import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  REVIEWING: 'primary',
  QUOTED: 'primary',
  APPROVED: 'success',
  IN_PRODUCTION: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'error',
}

interface CustomRequest {
  id: string
  requestNumber: string
  name: string
  email: string
  phone?: string
  company?: string
  material: string
  finish?: string
  color?: string
  quantity: number
  status: string
  estimatedPrice?: number
  createdAt: string
  fileName?: string
  notes?: string
}

export default function CustomRequestsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [requests, setRequests] = useState<CustomRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const fetchRequests = async (pageNum = 1, refresh = false) => {
    try {
      const data = await api.getCustomRequests({ page: pageNum, limit: 20, search, status: statusFilter || undefined })
      const newRequests = data.requests || []

      if (refresh || pageNum === 1) {
        setRequests(newRequests)
      } else {
        setRequests((prev) => [...prev, ...newRequests])
      }

      setHasMore(newRequests.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch custom requests:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [search, statusFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchRequests(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchRequests(page + 1)
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

  const StatusFilterChip = ({ status, label }: { status: string | null; label: string }) => (
    <TouchableOpacity
      style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
      onPress={() => setStatusFilter(status)}
    >
      <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )

  const renderRequest = ({ item }: { item: CustomRequest }) => (
    <TouchableOpacity onPress={() => navigation.navigate('CustomRequestDetail', { id: item.id })} activeOpacity={0.7}>
      <Card style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View>
            <Text style={styles.requestNumber}>#{item.requestNumber}</Text>
            <Text style={styles.requestDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <Badge text={item.status.replace('_', ' ')} variant={statusColors[item.status] || 'default'} />
        </View>

        <View style={styles.customerInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>{item.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>{item.email}</Text>
          </View>
        </View>

        <View style={styles.specRow}>
          <View style={styles.spec}>
            <Text style={styles.specLabel}>Material</Text>
            <Text style={styles.specValue}>{item.material}</Text>
          </View>
          <View style={styles.spec}>
            <Text style={styles.specLabel}>Qty</Text>
            <Text style={styles.specValue}>{item.quantity}</Text>
          </View>
          {item.estimatedPrice && (
            <View style={styles.spec}>
              <Text style={styles.specLabel}>Quote</Text>
              <Text style={[styles.specValue, { color: colors.success }]}>{formatCurrency(item.estimatedPrice)}</Text>
            </View>
          )}
        </View>

        {item.fileName && (
          <View style={styles.fileRow}>
            <Ionicons name="document-outline" size={16} color={colors.primary} />
            <Text style={styles.fileName} numberOfLines={1}>{item.fileName}</Text>
          </View>
        )}
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
          <Text style={styles.title}>3D Print Requests</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or request #"
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
      <View style={styles.filtersScroll}>
        <StatusFilterChip status={null} label="All" />
        <StatusFilterChip status="PENDING" label="Pending" />
        <StatusFilterChip status="REVIEWING" label="Reviewing" />
        <StatusFilterChip status="QUOTED" label="Quoted" />
        <StatusFilterChip status="APPROVED" label="Approved" />
        <StatusFilterChip status="IN_PRODUCTION" label="In Production" />
        <StatusFilterChip status="COMPLETED" label="Completed" />
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="print-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No requests found</Text>
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
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
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  requestCard: {
    marginBottom: spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  requestNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  requestDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  customerInfo: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  specRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  spec: {},
  specLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  specValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fileName: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginLeft: spacing.sm,
    flex: 1,
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
