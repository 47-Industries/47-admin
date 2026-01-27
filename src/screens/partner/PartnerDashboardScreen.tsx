import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/auth'
import { api } from '../../services/api'
import { StatCard } from '../../components/StatCard'
import { SectionHeader } from '../../components/SectionHeader'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface PartnerDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function PartnerDashboardScreen({ navigation, hideHeader }: PartnerDashboardScreenProps) {
  const partner = useAuthStore((state) => state.partner)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)

  const fetchDashboard = async () => {
    try {
      const data = await api.getPartnerDashboard()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to fetch partner dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchDashboard()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const accentColor = portalColors.partner

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{partner?.name || 'Partner'}</Text>
          </View>
          <View style={[styles.partnerBadge, { backgroundColor: `${accentColor}20` }]}>
            <Text style={[styles.partnerBadgeText, { color: accentColor }]}>
              {partner?.partnerType?.replace(/_/g, ' ') || 'Partner'}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StatCard
                title="Total Earned"
                value={formatCurrency(dashboardData?.stats?.totalEarned || partner?.totalEarned || 0)}
                icon="cash-outline"
                iconColor={colors.success}
                compact
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Pending"
                value={formatCurrency(dashboardData?.stats?.pendingCommissions || partner?.pendingAmount || 0)}
                icon="time-outline"
                iconColor={colors.warning}
                compact
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StatCard
                title="Total Leads"
                value={dashboardData?.stats?.totalLeads || 0}
                icon="people-outline"
                iconColor={accentColor}
                compact
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Conversion Rate"
                value={`${dashboardData?.stats?.conversionRate || 0}%`}
                icon="trending-up-outline"
                iconColor={colors.purple}
                compact
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { borderColor: accentColor }]}
            onPress={() => navigation.navigate('NewLead')}
          >
            <Ionicons name="add-circle-outline" size={24} color={accentColor} />
            <Text style={styles.quickActionText}>Submit Lead</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AffiliateLinks')}
          >
            <Ionicons name="link-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.quickActionText}>Share Link</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Leads */}
        {dashboardData?.recentLeads?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recent Leads"
              actionLabel="View All"
              onAction={() => navigation.navigate('Leads')}
              count={dashboardData.recentLeads.length}
            />
            {dashboardData.recentLeads.slice(0, 3).map((lead: any) => (
              <TouchableOpacity
                key={lead.id}
                style={styles.leadCard}
                onPress={() => navigation.navigate('LeadDetail', { id: lead.id })}
              >
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>{lead.businessName}</Text>
                  <Text style={styles.leadContact}>{lead.contactName}</Text>
                </View>
                <StatusBadge
                  status={getStatusType(lead.status)}
                  label={lead.status.replace(/_/g, ' ')}
                  size="sm"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Commissions */}
        {dashboardData?.recentCommissions?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recent Commissions"
              actionLabel="View All"
              onAction={() => navigation.navigate('Commissions')}
            />
            {dashboardData.recentCommissions.slice(0, 3).map((commission: any) => (
              <View key={commission.id} style={styles.commissionCard}>
                <View style={styles.commissionInfo}>
                  <Text style={styles.commissionType}>
                    {commission.type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.commissionDesc}>
                    {commission.description || 'Commission earned'}
                  </Text>
                </View>
                <Text style={[styles.commissionAmount, { color: colors.success }]}>
                  +{formatCurrency(commission.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Commission Rates */}
        <View style={styles.section}>
          <SectionHeader title="Your Commission Rates" />
          <View style={styles.ratesCard}>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>First Sale</Text>
              <Text style={styles.rateValue}>{partner?.firstSaleRate || 0}%</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Recurring</Text>
              <Text style={styles.rateValue}>{partner?.recurringRate || 0}%</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Shop Sales</Text>
              <Text style={styles.rateValue}>{partner?.shopCommissionRate || 0}%</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  partnerBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  partnerBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  statsGrid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  section: {
    marginTop: spacing.lg,
  },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  leadContact: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  commissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  commissionInfo: {
    flex: 1,
  },
  commissionType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textTransform: 'capitalize',
  },
  commissionDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  commissionAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  ratesCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  rateItem: {
    flex: 1,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  rateValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: portalColors.partner,
  },
  rateDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
})
