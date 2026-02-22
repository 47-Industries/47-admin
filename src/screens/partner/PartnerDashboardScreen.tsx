import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Clipboard } from 'react-native'
import { CachedImage } from '../../components/CachedImage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/auth'
import { api } from '../../services/api'
import { StatCard } from '../../components/StatCard'
import { SectionHeader } from '../../components/SectionHeader'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

const MOTOREV_BLUE = '#0066FF'

interface PartnerDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function PartnerDashboardScreen({ navigation, hideHeader }: PartnerDashboardScreenProps) {
  const partner = useAuthStore((state) => state.partner)
  const user = useAuthStore((state) => state.user)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [motorevAffiliate, setMotorevAffiliate] = useState<any>(null)
  const [motorevActivity, setMotorevActivity] = useState<any[]>([])
  const [motorevCopied, setMotorevCopied] = useState(false)

  const fetchDashboard = async () => {
    try {
      const data = await api.getPartnerDashboard()
      setDashboardData(data)
      setMotorevAffiliate(data.motorevAffiliate || null)
      setMotorevActivity(data.motorevRecentActivity || [])
    } catch (error) {
      console.error('Failed to fetch partner dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const copyMotorevLink = async () => {
    if (!motorevAffiliate?.shareLink) return
    try {
      await Clipboard.setString(motorevAffiliate.shareLink)
      setMotorevCopied(true)
      setTimeout(() => setMotorevCopied(false), 2000)
    } catch (error) {
      console.error('Error copying:', error)
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
            <Text style={styles.name}>{user?.name || partner?.name || 'Partner'}</Text>
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
                {formatCurrency(
                  (dashboardData?.partner?.totalEarned || partner?.totalEarned || 0) +
                  (dashboardData?.partner?.overrideTotalEarned || 0)
                )}
              </Text>
              <Text style={styles.earningsSubtext}>
                {dashboardData?.partner?.overrideTotalEarned > 0
                  ? `incl. ${formatCurrency(dashboardData.partner.overrideTotalEarned)} overrides`
                  : 'All-time earnings'}
              </Text>
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

          <TouchableOpacity
            style={styles.quickLinkItem}
            onPress={() => navigation.navigate('Recruit')}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="git-network-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.quickLinkTitle}>Recruit</Text>
            <Text style={styles.quickLinkSubtext}>
              {dashboardData?.partner?.recruitedPartnersCount > 0
                ? `${dashboardData.partner.recruitedPartnersCount} recruits`
                : 'Earn overrides'}
            </Text>
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

        {/* MotoRev Affiliate Section */}
        {motorevAffiliate && (
          <View style={styles.motorevSection}>
            <View style={styles.motorevHeader}>
              {motorevAffiliate.motorev?.profilePicture ? (
                <CachedImage
                  source={{ uri: motorevAffiliate.motorev.profilePicture }}
                  style={styles.motorevProfileImage}
                />
              ) : (
                <View style={styles.motorevProfilePlaceholder}>
                  <Text style={styles.motorevProfileInitial}>
                    {motorevAffiliate.motorev?.username?.[0]?.toUpperCase() || 'M'}
                  </Text>
                </View>
              )}
              <View style={styles.motorevHeaderText}>
                <Text style={styles.motorevTitle}>MotoRev Affiliate</Text>
                <Text style={styles.motorevSubtitle}>
                  {motorevAffiliate.motorev?.username ? `@${motorevAffiliate.motorev.username}` : 'Points-based referrals'}
                </Text>
              </View>
              <View style={styles.motorevPointsBadge}>
                <Text style={styles.motorevPointsValue}>{motorevAffiliate.points?.available || 0}</Text>
                <Text style={styles.motorevPointsLabel}>pts</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.motorevProgress}>
              <View style={styles.motorevProgressBar}>
                <View
                  style={[
                    styles.motorevProgressFill,
                    { width: `${motorevAffiliate.points?.progressPercent || 0}%` }
                  ]}
                />
              </View>
              <View style={styles.motorevProgressLabels}>
                <Text style={styles.motorevProgressText}>
                  {motorevAffiliate.points?.toNextReward === 0
                    ? 'Ready to redeem!'
                    : `${motorevAffiliate.points?.toNextReward || 0} to next reward`}
                </Text>
                <Text style={styles.motorevProgressText}>10 pts = 7 days Pro</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.motorevStatsGrid}>
              <View style={styles.motorevStatItem}>
                <Text style={styles.motorevStatValue}>{motorevAffiliate.stats?.totalReferrals || 0}</Text>
                <Text style={styles.motorevStatLabel}>Signups</Text>
              </View>
              <View style={styles.motorevStatItem}>
                <Text style={[styles.motorevStatValue, { color: MOTOREV_BLUE }]}>
                  {motorevAffiliate.stats?.proConversions || 0}
                </Text>
                <Text style={styles.motorevStatLabel}>Pro Conv.</Text>
              </View>
              <View style={styles.motorevStatItem}>
                <Text style={[styles.motorevStatValue, { color: colors.success }]}>
                  {motorevAffiliate.stats?.proDaysEarned || 0}d
                </Text>
                <Text style={styles.motorevStatLabel}>Pro Earned</Text>
              </View>
              <View style={styles.motorevStatItem}>
                <Text style={styles.motorevStatValue}>{motorevAffiliate.points?.total || 0}</Text>
                <Text style={styles.motorevStatLabel}>Total Pts</Text>
              </View>
            </View>

            {/* Share Link */}
            <View style={styles.motorevShareSection}>
              <Text style={styles.motorevShareLabel}>Share your MotoRev referral link:</Text>
              <View style={styles.motorevShareRow}>
                <View style={styles.motorevShareBox}>
                  <Text style={styles.motorevShareText} numberOfLines={1}>
                    {motorevAffiliate.shareLink || ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.motorevCopyButton}
                  onPress={copyMotorevLink}
                >
                  <Ionicons
                    name={motorevCopied ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color={colors.text}
                  />
                  <Text style={styles.motorevCopyText}>{motorevCopied ? 'Copied' : 'Copy'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.motorevCodeText}>
                Code: <Text style={styles.motorevCodeValue}>{motorevAffiliate.affiliateCode || '---'}</Text>
              </Text>
            </View>

            {/* Recent Activity */}
            {motorevActivity.length > 0 && (
              <View style={styles.motorevActivitySection}>
                <Text style={styles.motorevActivityTitle}>Recent Activity</Text>
                {motorevActivity.slice(0, 3).map((tx: any) => (
                  <View key={tx.id} style={styles.motorevActivityItem}>
                    <View style={[
                      styles.motorevActivityIcon,
                      { backgroundColor: tx.type === 'PRO_CONVERSION' ? `${MOTOREV_BLUE}20` : `${colors.success}20` }
                    ]}>
                      <Ionicons
                        name={tx.type === 'PRO_CONVERSION' ? 'star' : 'checkmark-circle'}
                        size={12}
                        color={tx.type === 'PRO_CONVERSION' ? MOTOREV_BLUE : colors.success}
                      />
                    </View>
                    <Text style={styles.motorevActivityText}>
                      {tx.type === 'PRO_CONVERSION' ? 'Pro Conversion' : 'Signup'}
                    </Text>
                    <Text style={[styles.motorevActivityPoints, { color: colors.success }]}>
                      +{tx.points} pts
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

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
    marginBottom: spacing.xs,
  },
  earningsValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  earningsSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
    marginBottom: spacing.xs,
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
    marginTop: spacing.xs,
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
    marginTop: spacing.xs,
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
    marginTop: spacing.xs,
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
  // MotoRev Affiliate Styles
  motorevSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${MOTOREV_BLUE}50`,
    overflow: 'hidden',
  },
  motorevHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${MOTOREV_BLUE}30`,
    backgroundColor: `${MOTOREV_BLUE}10`,
  },
  motorevProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: `${MOTOREV_BLUE}50`,
  },
  motorevProfilePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MOTOREV_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motorevProfileInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  motorevHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  motorevTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  motorevSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  motorevPointsBadge: {
    alignItems: 'center',
  },
  motorevPointsValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: MOTOREV_BLUE,
  },
  motorevPointsLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  motorevProgress: {
    padding: spacing.md,
  },
  motorevProgressBar: {
    height: 10,
    backgroundColor: colors.surfaceHover,
    borderRadius: 5,
    overflow: 'hidden',
  },
  motorevProgressFill: {
    height: '100%',
    backgroundColor: MOTOREV_BLUE,
    borderRadius: 5,
  },
  motorevProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  motorevProgressText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  motorevStatsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  motorevStatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  motorevStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  motorevStatLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  motorevShareSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
  },
  motorevShareLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  motorevShareRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  motorevShareBox: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  motorevShareText: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
    color: colors.text,
  },
  motorevCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: MOTOREV_BLUE,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  motorevCopyText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  motorevCodeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  motorevCodeValue: {
    fontFamily: 'monospace',
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  motorevActivitySection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  motorevActivityTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  motorevActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  motorevActivityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  motorevActivityText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  motorevActivityPoints: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
})
