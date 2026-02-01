import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { StatCard } from '../../components/StatCard'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface UserAffiliate {
  id: string
  affiliateCode: string
  motorevUserId: string | null
  motorevEmail: string | null
  connectedAt: string | null
  shopCommissionRate: number
  motorevProBonus: number
  retentionBonus: number
  isPartner: boolean
  totalReferrals: number
  totalEarnings: number
  pendingEarnings: number
  proTimeEarnedDays: number
  rewardPreference: string
  totalPoints: number
  availablePoints: number
  pointsRedeemed: number
  tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  status?: 'ACTIVE' | 'INACTIVE'
  user: {
    id: string
    name: string | null
    email: string | null
  }
  partner: {
    id: string
    name: string
  } | null
  createdAt: string
}

interface Stats {
  totalAffiliates: number
  connectedAffiliates: number
  pendingCashTotal: number
  pendingCashCount: number
  pendingProTimeDays: number
  pendingProTimeCount: number
  totalReferrals?: number
  totalPointsAwarded?: number
  totalCommissionsPaid?: number
}

interface UserAffiliatesScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

const tierColors: Record<string, string> = {
  BRONZE: '#cd7f32',
  SILVER: '#c0c0c0',
  GOLD: '#ffd700',
  PLATINUM: '#e5e4e2',
}

type StatusFilter = 'all' | 'active' | 'inactive'
type TierFilter = 'all' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

export function UserAffiliatesScreen({ navigation, hideHeader }: UserAffiliatesScreenProps) {
  const [affiliates, setAffiliates] = useState<UserAffiliate[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')

  const fetchAffiliates = useCallback(async () => {
    try {
      const data = await api.getAdminUserAffiliates({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        tier: tierFilter !== 'all' ? tierFilter : undefined,
      })
      setAffiliates(data.affiliates || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Failed to fetch user affiliates:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, statusFilter, tierFilter])

  useEffect(() => {
    setLoading(true)
    fetchAffiliates()
  }, [fetchAffiliates])

  const onRefresh = () => {
    setRefreshing(true)
    fetchAffiliates()
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const formatCurrency = (amount: number) => {
    return '$' + amount.toFixed(2)
  }

  const formatProTime = (days: number) => {
    if (days < 30) {
      return `${days}d`
    }
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    return remainingDays > 0 ? `${months}mo ${remainingDays}d` : `${months}mo`
  }

  // Derive tier from points
  const getTier = (points: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' => {
    if (points >= 10000) return 'PLATINUM'
    if (points >= 5000) return 'GOLD'
    if (points >= 1000) return 'SILVER'
    return 'BRONZE'
  }

  // Derive status based on activity
  const getStatus = (affiliate: UserAffiliate): 'ACTIVE' | 'INACTIVE' => {
    // Consider active if connected or has recent referrals
    if (affiliate.connectedAt || affiliate.totalReferrals > 0) {
      return 'ACTIVE'
    }
    return 'INACTIVE'
  }

  // Filter affiliates
  const filteredAffiliates = affiliates.filter(affiliate => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesName = affiliate.user.name?.toLowerCase().includes(searchLower)
      const matchesEmail = affiliate.user.email?.toLowerCase().includes(searchLower)
      const matchesCode = affiliate.affiliateCode.toLowerCase().includes(searchLower)
      if (!matchesName && !matchesEmail && !matchesCode) {
        return false
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      const affiliateStatus = getStatus(affiliate)
      if (statusFilter === 'active' && affiliateStatus !== 'ACTIVE') return false
      if (statusFilter === 'inactive' && affiliateStatus !== 'INACTIVE') return false
    }

    // Tier filter
    if (tierFilter !== 'all') {
      const affiliateTier = getTier(affiliate.totalPoints || 0)
      if (affiliateTier !== tierFilter) return false
    }

    return true
  })

  const renderAffiliate = ({ item }: { item: UserAffiliate }) => {
    const tier = getTier(item.totalPoints || 0)
    const status = getStatus(item)

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('UserAffiliateDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <Card style={styles.affiliateCard}>
          <View style={styles.affiliateHeader}>
            <View style={styles.affiliateInfo}>
              <Text style={styles.affiliateName}>
                {item.user?.name || item.user?.email || 'Unknown'}
              </Text>
              <Text style={styles.affiliateCode}>{item.affiliateCode}</Text>
            </View>
            <View style={styles.badges}>
              <Badge
                text={tier}
                variant="default"
                style={{ backgroundColor: tierColors[tier] + '30' }}
              />
              {status === 'ACTIVE' && (
                <Badge text="Active" variant="success" />
              )}
              {status === 'INACTIVE' && (
                <Badge text="Inactive" variant="default" />
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(item.totalPoints || 0)}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.totalReferrals}</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {formatCurrency(item.totalEarnings || 0)}
              </Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            {item.proTimeEarnedDays > 0 && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.purple }]}>
                  {formatProTime(item.proTimeEarnedDays)}
                </Text>
                <Text style={styles.statLabel}>Pro Time</Text>
              </View>
            )}
          </View>

          <View style={styles.affiliateFooter}>
            <Text style={styles.affiliateEmail}>{item.user?.email}</Text>
            <View style={styles.footerRight}>
              {item.connectedAt && (
                <View style={styles.connectedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.connectedText}>MotoRev</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const renderHeader = () => (
    <View>
      {/* Stats Cards */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard
            title="Total Affiliates"
            value={stats.totalAffiliates.toString()}
            subtitle={`${stats.connectedAffiliates} connected`}
            icon="people-outline"
          />
          <StatCard
            title="Active Affiliates"
            value={stats.connectedAffiliates.toString()}
            icon="checkmark-circle-outline"
            color={colors.success}
          />
          <StatCard
            title="Total Referrals"
            value={formatNumber(stats.totalReferrals || affiliates.reduce((sum, a) => sum + a.totalReferrals, 0))}
            icon="share-social-outline"
            color={colors.primary}
          />
          <StatCard
            title="Pending Cash"
            value={formatCurrency(stats.pendingCashTotal)}
            subtitle={`${stats.pendingCashCount} commissions`}
            icon="cash-outline"
            color={colors.warning}
          />
          <StatCard
            title="Pending Pro Time"
            value={formatProTime(stats.pendingProTimeDays)}
            subtitle={`${stats.pendingProTimeCount} credits`}
            icon="time-outline"
            color={colors.purple}
          />
        </ScrollView>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or code..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {/* Status Filter */}
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
              All Status
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActive]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'active' && styles.filterChipTextActive]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'inactive' && styles.filterChipActive]}
            onPress={() => setStatusFilter('inactive')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'inactive' && styles.filterChipTextActive]}>
              Inactive
            </Text>
          </TouchableOpacity>

          <View style={styles.filterDivider} />

          {/* Tier Filter */}
          <TouchableOpacity
            style={[styles.filterChip, tierFilter === 'all' && styles.filterChipActive]}
            onPress={() => setTierFilter('all')}
          >
            <Text style={[styles.filterChipText, tierFilter === 'all' && styles.filterChipTextActive]}>
              All Tiers
            </Text>
          </TouchableOpacity>
          {(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as TierFilter[]).map((tier) => (
            <TouchableOpacity
              key={tier}
              style={[
                styles.filterChip,
                tierFilter === tier && styles.filterChipActive,
                tierFilter === tier && { borderColor: tierColors[tier] },
              ]}
              onPress={() => setTierFilter(tier)}
            >
              <View
                style={[styles.tierDot, { backgroundColor: tierColors[tier] }]}
              />
              <Text style={[styles.filterChipText, tierFilter === tier && styles.filterChipTextActive]}>
                {tier.charAt(0) + tier.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredAffiliates.length} affiliate{filteredAffiliates.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  )

  if (loading && affiliates.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Affiliates</Text>
          <View style={styles.headerRight} />
        </View>
      )}

      <FlatList
        data={filteredAffiliates}
        renderItem={renderAffiliate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No user affiliates found</Text>
            {(search || statusFilter !== 'all' || tierFilter !== 'all') && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearch('')
                  setStatusFilter('all')
                  setTierFilter('all')
                }}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headerRight: {
    width: 40,
  },
  statsContainer: {
    maxHeight: 120,
  },
  statsContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultsHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  resultsCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  affiliateCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  affiliateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  affiliateInfo: {
    flex: 1,
  },
  affiliateName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  affiliateCode: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  affiliateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  affiliateEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successBg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  connectedText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.medium,
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
  clearFiltersButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  clearFiltersText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
})
