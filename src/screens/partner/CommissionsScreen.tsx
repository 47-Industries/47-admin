import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'
import { Commission } from '../../types'

const PURPLE = colors.purple

type CommissionTab = 'service' | 'override'

interface CommissionsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function CommissionsScreen({ navigation, hideHeader }: CommissionsScreenProps) {
  const [tab, setTab] = useState<CommissionTab>('service')
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [overrideCommissions, setOverrideCommissions] = useState<any[]>([])
  const [totals, setTotals] = useState({ pending: 0, paid: 0, total: 0, overrideTotal: 0, overridePending: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')

  const fetchCommissions = async () => {
    try {
      const params = activeFilter === 'ALL' ? {} : { status: activeFilter }
      const data = await api.getPartnerCommissions(params)
      setCommissions(data.commissions || [])
      setOverrideCommissions((data as any).overrideCommissions || [])
      const baseTotals = data.totals || { pending: 0, paid: 0, total: 0 }
      setTotals({
        ...baseTotals,
        overrideTotal: (data as any).totals?.overrideTotal || 0,
        overridePending: (data as any).totals?.overridePending || 0,
      })
    } catch (error) {
      console.error('Failed to fetch commissions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCommissions()
  }, [activeFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCommissions()
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const grandTotal = totals.total + totals.overrideTotal
  const grandPending = totals.pending + totals.overridePending

  const renderServiceCommission = ({ item }: { item: Commission }) => (
    <View style={styles.commissionCard}>
      <View style={styles.commissionHeader}>
        <View style={styles.typeIcon}>
          <Ionicons
            name={
              item.type === 'FIRST_SALE'
                ? 'star-outline'
                : item.type === 'RECURRING'
                ? 'refresh-outline'
                : item.type === 'SHOP_PURCHASE'
                ? 'cart-outline'
                : 'gift-outline'
            }
            size={20}
            color={portalColors.partner}
          />
        </View>
        <View style={styles.commissionInfo}>
          <Text style={styles.commissionType}>{item.type.replace(/_/g, ' ')}</Text>
          <Text style={styles.commissionDate}>{formatDate(item.createdAt)}</Text>
          {item.description && (
            <Text style={styles.commissionDescription}>{item.description}</Text>
          )}
        </View>
        <View style={styles.commissionRight}>
          <Text style={[styles.commissionAmount, { color: colors.success }]}>
            {formatCurrency(Number(item.amount))}
          </Text>
          <StatusBadge status={getStatusType(item.status)} label={item.status} size="sm" />
        </View>
      </View>
    </View>
  )

  const renderOverrideCommission = ({ item }: { item: any }) => (
    <View style={styles.commissionCard}>
      <View style={styles.commissionHeader}>
        <View style={[styles.typeIcon, { backgroundColor: `${PURPLE}20` }]}>
          <Ionicons name="git-network-outline" size={20} color={PURPLE} />
        </View>
        <View style={styles.commissionInfo}>
          <View style={styles.overrideNameRow}>
            <Text style={styles.commissionType}>
              {item.downlinePartner?.name || 'Partner'}
            </Text>
            <View style={[
              styles.levelBadge,
              { backgroundColor: item.level === 1 ? `${portalColors.partner}20` : `${PURPLE}20` },
            ]}>
              <Text style={[
                styles.levelBadgeText,
                { color: item.level === 1 ? portalColors.partner : PURPLE },
              ]}>
                L{item.level}
              </Text>
            </View>
          </View>
          <Text style={styles.commissionDate}>
            {Number(item.rate)}% of {formatCurrency(Number(item.baseAmount))} commission
          </Text>
          <Text style={styles.commissionDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.commissionRight}>
          <Text style={[styles.commissionAmount, { color: PURPLE }]}>
            {formatCurrency(Number(item.amount))}
          </Text>
          <StatusBadge status={getStatusType(item.status)} label={item.status} size="sm" />
        </View>
      </View>
    </View>
  )

  const statusFilters = ['ALL', 'PENDING', 'APPROVED', 'PAID']

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commissions</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      {/* Grand summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Earned</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(grandTotal)}
          </Text>
          <Text style={styles.summarySubtext}>All sources</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {formatCurrency(grandPending)}
          </Text>
          <Text style={styles.summarySubtext}>Awaiting payout</Text>
        </View>
      </View>

      {/* Service / Override tab toggle */}
      <View style={styles.tabToggle}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'service' && styles.tabButtonActive]}
          onPress={() => setTab('service')}
        >
          <Text style={[styles.tabButtonText, tab === 'service' && styles.tabButtonTextActive]}>
            Service ({commissions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'override' && styles.tabButtonActiveOverride]}
          onPress={() => setTab('override')}
        >
          <Text style={[
            styles.tabButtonText,
            tab === 'override' && styles.tabButtonTextActiveOverride,
          ]}>
            Overrides ({overrideCommissions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={statusFilters}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === item && (tab === 'override' ? styles.filterChipActiveOverride : styles.filterChipActive),
              ]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
      </View>

      {/* Service commissions list */}
      {tab === 'service' && (
        <FlatList
          data={commissions}
          renderItem={renderServiceCommission}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={portalColors.partner} />
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="cash-outline"
                title="No service commissions yet"
                description="Commissions are created when your leads convert to clients"
              />
            ) : null
          }
        />
      )}

      {/* Override commissions list */}
      {tab === 'override' && (
        <FlatList
          data={overrideCommissions}
          renderItem={renderOverrideCommission}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="git-network-outline"
                title="No override commissions yet"
                description="Recruit partners to earn overrides on their commissions"
              />
            ) : null
          }
        />
      )}
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
  placeholder: {
    width: 40,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  summarySubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  tabToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: portalColors.partner,
  },
  tabButtonActiveOverride: {
    backgroundColor: PURPLE,
  },
  tabButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.text,
  },
  tabButtonTextActiveOverride: {
    color: colors.text,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: portalColors.partner,
  },
  filterChipActiveOverride: {
    backgroundColor: PURPLE,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.text,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  commissionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${portalColors.partner}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  commissionInfo: {
    flex: 1,
  },
  overrideNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  commissionType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textTransform: 'capitalize',
  },
  commissionDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  commissionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  commissionRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  commissionAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
})
