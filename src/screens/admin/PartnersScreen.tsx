import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { SkeletonList } from '../../components/Skeleton'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'
import { Partner, PartnerStatus, PartnerType } from '../../types'

interface PartnersScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

interface PartnerWithCounts extends Partner {
  _count?: {
    leads: number
    commissions: number
    payouts: number
  }
}

interface PartnerStats {
  total: number
  active: number
  pending: number
  totalLeads: number
  totalCommissions: number
  pendingPayouts: number
}

const STATUS_FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const TYPE_FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: 'All Types' },
  { value: 'SERVICE_REFERRAL', label: 'Service Referral' },
  { value: 'PRODUCT_AFFILIATE', label: 'Product Affiliate' },
  { value: 'BOTH', label: 'Full Partner' },
]

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'error',
  INACTIVE: 'default',
}

const typeColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  SERVICE_REFERRAL: 'primary',
  PRODUCT_AFFILIATE: 'success',
  BOTH: 'warning',
  FULL_PARTNER: 'warning',
}

const typeLabels: Record<string, string> = {
  SERVICE_REFERRAL: 'Service Referral',
  PRODUCT_AFFILIATE: 'Product Affiliate',
  BOTH: 'Full Partner',
  FULL_PARTNER: 'Full Partner',
}

export function PartnersScreen({ navigation, hideHeader }: PartnersScreenProps) {
  const [partners, setPartners] = useState<PartnerWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [showTypeFilter, setShowTypeFilter] = useState(false)

  // Stats
  const [stats, setStats] = useState<PartnerStats>({
    total: 0,
    active: 0,
    pending: 0,
    totalLeads: 0,
    totalCommissions: 0,
    pendingPayouts: 0,
  })

  const fetchPartners = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const params: { page?: number; status?: string; type?: string; search?: string } = { page: pageNum }
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      if (search) params.search = search

      const data = await api.getAdminPartners(params)
      const newPartners = data.partners || []

      if (refresh || pageNum === 1) {
        setPartners(newPartners)
      } else {
        setPartners((prev) => [...prev, ...newPartners])
      }

      // Update stats from API response
      if (data.stats) {
        setStats({
          total: data.stats.total || 0,
          active: data.stats.active || 0,
          pending: data.stats.pending || 0,
          totalLeads: data.stats.totalLeads || 0,
          totalCommissions: data.stats.totalCommissions || 0,
          pendingPayouts: data.stats.pendingPayouts || 0,
        })
      }

      setHasMore(newPartners.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch partners:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, typeFilter, search])

  useEffect(() => {
    setLoading(true)
    fetchPartners(1, true)
  }, [statusFilter, typeFilter])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setLoading(true)
      fetchPartners(1, true)
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [search])

  const onRefresh = () => {
    setRefreshing(true)
    fetchPartners(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPartners(page + 1)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??'
    const parts = name.split(' ').filter(n => n.length > 0)
    if (parts.length > 0) {
      return parts
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return '??'
  }

  const renderPartner = ({ item }: { item: PartnerWithCounts }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('PartnerDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.partnerCard}>
        <View style={styles.partnerHeader}>
          <View style={styles.partnerLeft}>
            <View style={[
              styles.avatar,
              item.status === 'SUSPENDED' && styles.avatarSuspended,
              item.status === 'PENDING' && styles.avatarPending,
            ]}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={styles.partnerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.partnerName} numberOfLines={1}>{item.name}</Text>
                {item.partnerNumber && (
                  <Text style={styles.partnerNumber}>#{item.partnerNumber}</Text>
                )}
              </View>
              {item.company && (
                <Text style={styles.companyName} numberOfLines={1}>{item.company}</Text>
              )}
              <Text style={styles.partnerEmail} numberOfLines={1}>{item.email}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        <View style={styles.badgeRow}>
          <Badge text={item.status} variant={statusColors[item.status] || 'default'} />
          <Badge
            text={typeLabels[item.partnerType] || item.partnerType}
            variant={typeColors[item.partnerType] || 'default'}
          />
        </View>

        <View style={styles.commissionRow}>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>First Sale</Text>
            <Text style={styles.rateValue}>{item.firstSaleRate}%</Text>
          </View>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Recurring</Text>
            <Text style={styles.rateValue}>{item.recurringRate}%</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Earned</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(Number(item.totalEarned))}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[
              styles.statValue,
              Number(item.pendingAmount) > 0 && { color: colors.warning }
            ]}>
              {formatCurrency(Number(item.pendingAmount))}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Leads</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {item._count?.leads || 0}
            </Text>
          </View>
        </View>

        <View style={styles.partnerFooter}>
          <Text style={styles.footerText}>Partner since {formatDate(item.createdAt)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Partners</Text>
        </View>
      )}

      {/* Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContainer}
      >
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Total</Text>
          <Text style={styles.statCardValue}>{stats.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Active</Text>
          <Text style={[styles.statCardValue, { color: colors.success }]}>{stats.active}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Pending</Text>
          <Text style={[styles.statCardValue, { color: colors.warning }]}>{stats.pending}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Commissions</Text>
          <Text style={[styles.statCardValue, { color: colors.success }]}>
            {formatCurrency(stats.totalCommissions)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Pending Payouts</Text>
          <Text style={[styles.statCardValue, { color: stats.pendingPayouts > 0 ? colors.warning : colors.text }]}>
            {formatCurrency(stats.pendingPayouts)}
          </Text>
        </View>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
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
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.value && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          <TouchableOpacity
            style={[styles.filterChip, typeFilter && styles.filterChipActive]}
            onPress={() => setShowTypeFilter(true)}
          >
            <Ionicons
              name="people-outline"
              size={14}
              color={typeFilter ? colors.text : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                typeFilter && styles.filterChipTextActive,
              ]}
            >
              {typeFilter ? TYPE_FILTERS.find(t => t.value === typeFilter)?.label : 'Type'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={typeFilter ? colors.text : colors.textMuted}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Partner List */}
      {loading && partners.length === 0 ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={partners}
          renderItem={renderPartner}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="people-outline"
                title="No partners found"
                description={search || statusFilter || typeFilter
                  ? "Try adjusting your filters"
                  : "Partners will appear here once added"}
              />
            ) : null
          }
        />
      )}

      {/* Type Filter Modal */}
      <Modal visible={showTypeFilter} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Type</Text>
              <TouchableOpacity onPress={() => setShowTypeFilter(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.typeList}>
              {TYPE_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.label}
                  style={styles.typeItem}
                  onPress={() => {
                    setTypeFilter(filter.value)
                    setShowTypeFilter(false)
                  }}
                >
                  <Text style={styles.typeItemText}>{filter.label}</Text>
                  {typeFilter === filter.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statsScroll: {
    flexGrow: 0,
    marginBottom: spacing.lg,
  },
  statsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
  },
  statCardLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statCardValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
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
  filtersContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
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
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
    alignSelf: 'center',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  partnerCard: {
    marginBottom: spacing.md,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  partnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSuspended: {
    backgroundColor: colors.error,
    opacity: 0.7,
  },
  avatarPending: {
    backgroundColor: colors.warning,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  partnerInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  partnerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  partnerNumber: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  companyName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  partnerEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commissionRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rateValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  statItem: {},
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  partnerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  typeList: {
    padding: spacing.xl,
  },
  typeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
})
