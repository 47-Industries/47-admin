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

        {/* Total Earnings Overview - 4 cards like web */}
        <View style={styles.earningsGrid}>
          <View style={styles.earningsRow}>
            <View style={[styles.earningsCard, styles.earningsCardHighlight]}>
              <Text style={styles.earningsLabel}>Total Earned</Text>
              <Text style={[styles.earningsValue, { color: colors.success }]}>
                {formatCurrency(dashboardData?.partner?.totalEarned || partner?.totalEarned || 0)}
              </Text>
              <Text style={styles.earningsSubtext}>All-time earnings</Text>
            </View>
            <View style={styles.earningsCard}>
              <Text style={styles.earningsLabel}>Pending</Text>
              <Text style={[styles.earningsValue, { color: colors.warning }]}>
                {formatCurrency(dashboardData?.partner?.pendingAmount || partner?.pendingAmount || 0)}
              </Text>
              <Text style={styles.earningsSubtext}>Awaiting approval</Text>
            </View>
          </View>
          <View style={styles.earningsRow}>
            <View style={styles.earningsCard}>
              <Text style={styles.earningsLabel}>Paid Out</Text>
              <Text style={styles.earningsValue}>
                {formatCurrency(dashboardData?.partner?.totalPaid || partner?.totalPaid || 0)}
              </Text>
              <Text style={styles.earningsSubtext}>Received</Text>
            </View>
            <View style={styles.earningsCard}>
              <Text style={styles.earningsLabel}>Payout Status</Text>
              {dashboardData?.partner?.stripeConnectStatus === 'CONNECTED' ? (
                <View style={styles.payoutStatusRow}>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.payoutStatusText, { color: colors.success }]}>Ready</Text>
                </View>
              ) : dashboardData?.partner?.stripeConnectStatus === 'PENDING_VERIFICATION' ? (
                <View style={styles.payoutStatusRow}>
                  <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.payoutStatusText, { color: colors.warning }]}>Verifying</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => navigation.navigate('PayoutSetup')}>
                  <Text style={[styles.payoutStatusText, { color: accentColor }]}>Setup Payouts</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Payout Setup Banner - if not connected */}
        {dashboardData?.partner?.stripeConnectStatus !== 'CONNECTED' && dashboardData?.partner?.stripeConnectStatus !== 'PENDING_VERIFICATION' && (
          <View style={styles.payoutBanner}>
            <View style={styles.payoutBannerIcon}>
              <Ionicons name="warning" size={24} color={colors.warning} />
            </View>
            <View style={styles.payoutBannerContent}>
              <Text style={styles.payoutBannerTitle}>Setup Required: Connect Your Bank Account</Text>
              <Text style={styles.payoutBannerDesc}>
                Connect via Stripe to receive your commission payouts directly to your bank account.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.payoutBannerButton}
              onPress={() => navigation.navigate('PayoutSetup')}
            >
              <Text style={styles.payoutBannerButtonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Links - 5 icons like web */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickLinksContainer}
        >
          <TouchableOpacity
            style={styles.quickLinkItem}
            onPress={() => navigation.navigate('Leads')}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="clipboard-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.quickLinkTitle}>My Leads</Text>
            <Text style={styles.quickLinkSubtext}>{dashboardData?.stats?.totalLeads || 0} total</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkItem}
            onPress={() => navigation.navigate('AffiliateLinks')}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="link-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.quickLinkTitle}>Affiliate Links</Text>
            <Text style={styles.quickLinkSubtext}>{dashboardData?.partner?.affiliateLinks?.length || 0} links</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkItem}
            onPress={() => navigation.navigate('Commissions')}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: `${accentColor}20` }]}>
              <Ionicons name="cash-outline" size={20} color={accentColor} />
            </View>
            <Text style={styles.quickLinkTitle}>Commissions</Text>
            <Text style={styles.quickLinkSubtext}>View history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkItem}
            onPress={() => navigation.navigate('Payouts')}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: `${accentColor}20` }]}>
              <Ionicons name="wallet-outline" size={20} color={accentColor} />
            </View>
            <Text style={styles.quickLinkTitle}>Payouts</Text>
            <Text style={styles.quickLinkSubtext}>{formatCurrency(dashboardData?.partner?.totalPaid || 0)} paid</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkItem}
            onPress={() => navigation.navigate('Contract')}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: `${accentColor}20` }]}>
              <Ionicons name="document-text-outline" size={20} color={accentColor} />
            </View>
            <Text style={styles.quickLinkTitle}>Contract</Text>
            <Text style={styles.quickLinkSubtext}>{dashboardData?.partner?.contract?.status || 'View'}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: '#3b82f6' }]}
            onPress={() => navigation.navigate('NewLead')}
          >
            <Text style={styles.quickActionText}>Submit Lead</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: '#10b981' }]}
            onPress={() => navigation.navigate('AffiliateLinks')}
          >
            <Text style={styles.quickActionText}>Get Affiliate Links</Text>
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
  earningsGrid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  earningsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  earningsCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  earningsCardHighlight: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}10`,
  },
  earningsLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 2,
  },
  earningsValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  earningsSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  payoutStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  payoutStatusText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  payoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}15`,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.warning}50`,
  },
  payoutBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutBannerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  payoutBannerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: 2,
  },
  payoutBannerDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  payoutBannerButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  payoutBannerButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#000',
  },
  quickLinksContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  quickLinkItem: {
    width: 90,
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  quickLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickLinkTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  quickLinkSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  quickActionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
