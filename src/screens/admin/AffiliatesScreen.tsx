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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { SkeletonList } from '../../components/Skeleton'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface Affiliate {
  id: string
  affiliateCode: string
  customCode?: string
  totalPoints: number
  availablePoints: number
  redeemedPoints: number
  totalReferrals: number
  successfulReferrals: number
  proConversions: number
  totalEarnings: number
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  partnerEligible: boolean
  createdAt: string
  user: {
    id: string
    name?: string
    email: string
    image?: string
  }
}

const tierColors: Record<string, string> = {
  BRONZE: '#cd7f32',
  SILVER: '#c0c0c0',
  GOLD: '#ffd700',
  PLATINUM: '#e5e4e2',
}

export function AffiliatesScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const fetchAffiliates = useCallback(async () => {
    try {
      const data = await api.getAdminAffiliates({ search: search || undefined })
      setAffiliates(data.affiliates || [])
    } catch (error) {
      console.error('Failed to fetch affiliates:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search])

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

  const renderAffiliate = ({ item }: { item: Affiliate }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('AffiliateDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.affiliateCard}>
        <View style={styles.affiliateHeader}>
          <View style={styles.affiliateInfo}>
            <Text style={styles.affiliateName}>{item.user?.name || item.user?.email}</Text>
            <Text style={styles.affiliateCode}>
              {item.customCode || item.affiliateCode}
            </Text>
          </View>
          <View style={styles.badges}>
            <Badge
              text={item.tier}
              variant="default"
              style={{ backgroundColor: tierColors[item.tier] + '30' }}
            />
            {item.partnerEligible && (
              <Badge text="Partner Eligible" variant="success" />
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(item.totalPoints)}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.totalReferrals}</Text>
            <Text style={styles.statLabel}>Referrals</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.successfulReferrals}</Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.proConversions}</Text>
            <Text style={styles.statLabel}>Pro</Text>
          </View>
        </View>

        <View style={styles.affiliateFooter}>
          <Text style={styles.affiliateEmail}>{item.user?.email}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>
    </TouchableOpacity>
  )

  const renderHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search affiliates..."
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
  )

  if (loading && affiliates.length === 0) {
    return (
      <View style={styles.container}>
        <SkeletonList count={8} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={affiliates}
        renderItem={renderAffiliate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="gift-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No affiliates found</Text>
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
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
    marginTop: spacing.xs,
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
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  affiliateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  affiliateEmail: {
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
})
