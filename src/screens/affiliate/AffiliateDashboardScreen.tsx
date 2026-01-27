import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/auth'
import { api } from '../../services/api'
import { StatCard } from '../../components/StatCard'
import { SectionHeader } from '../../components/SectionHeader'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface AffiliateDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function AffiliateDashboardScreen({ navigation, hideHeader }: AffiliateDashboardScreenProps) {
  const affiliate = useAuthStore((state) => state.affiliate)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)

  const fetchDashboard = async () => {
    try {
      const data = await api.getAffiliateStats()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to fetch affiliate dashboard:', error)
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

  const handleShare = async () => {
    const shareLink = affiliate?.shareLink || dashboardData?.affiliate?.shareLink
    if (!shareLink) return

    try {
      await Share.share({
        message: `Join 47 Industries with my referral link and we both earn rewards! ${shareLink}`,
        url: shareLink,
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const accentColor = portalColors.affiliate
  const points = affiliate?.points || dashboardData?.affiliate?.points || { total: 0, available: 0, toNextReward: 100, nextRewardAmount: 0 }
  const stats = affiliate?.stats || dashboardData?.stats || { totalReferrals: 0, successfulReferrals: 0, proConversions: 0, proDaysEarned: 0 }
  const progressPercent = points.toNextReward > 0 ? ((points.total % 100) / points.toNextReward) * 100 : 0

  const tierColors: Record<string, string> = {
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#E5E4E2',
  }

  const tier = affiliate?.tier || dashboardData?.affiliate?.tier || 'BRONZE'

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
            <Text style={styles.greeting}>Affiliate Program</Text>
            <Text style={styles.name}>Earn Rewards</Text>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: `${tierColors[tier]}30`, borderColor: tierColors[tier] }]}>
            <Ionicons name="star" size={14} color={tierColors[tier]} />
            <Text style={[styles.tierText, { color: tierColors[tier] }]}>{tier}</Text>
          </View>
        </View>

        {/* Points Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <View>
              <Text style={styles.pointsLabel}>Available Points</Text>
              <Text style={styles.pointsValue}>{points.available.toLocaleString()}</Text>
            </View>
            <View style={styles.pointsTotal}>
              <Text style={styles.totalLabel}>Total Earned</Text>
              <Text style={styles.totalValue}>{points.total.toLocaleString()}</Text>
            </View>
          </View>

          {/* Progress to next reward */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress to Next Reward</Text>
              <Text style={styles.progressPoints}>{points.toNextReward} pts to go</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        </View>

        {/* Share Card */}
        <View style={styles.shareCard}>
          <View style={styles.shareInfo}>
            <Ionicons name="share-social-outline" size={24} color={accentColor} />
            <View style={styles.shareText}>
              <Text style={styles.shareTitle}>Share & Earn</Text>
              <Text style={styles.shareDesc}>Get 10 points for each referral</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Link</Text>
          </TouchableOpacity>
        </View>

        {/* Referral Code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeValue}>
              {affiliate?.affiliateCode || dashboardData?.affiliate?.affiliateCode || '---'}
            </Text>
            <TouchableOpacity style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color={accentColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StatCard
                title="Total Referrals"
                value={stats.totalReferrals}
                icon="people-outline"
                iconColor={accentColor}
                compact
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Successful"
                value={stats.successfulReferrals}
                icon="checkmark-circle-outline"
                iconColor={colors.success}
                compact
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StatCard
                title="Pro Conversions"
                value={stats.proConversions}
                icon="star-outline"
                iconColor={colors.warning}
                compact
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Pro Days Earned"
                value={stats.proDaysEarned}
                icon="calendar-outline"
                iconColor={colors.purple}
                compact
              />
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        {dashboardData?.recentReferrals?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recent Activity"
              actionLabel="View All"
              onAction={() => navigation.navigate('Referrals')}
            />
            {dashboardData.recentReferrals.slice(0, 3).map((referral: any, index: number) => (
              <View key={referral.id || index} style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={referral.status === 'CONVERTED' ? 'checkmark-circle' : 'person-add'}
                    size={20}
                    color={referral.status === 'CONVERTED' ? colors.success : accentColor}
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    {referral.status === 'CONVERTED' ? 'Referral Converted' : 'New Signup'}
                  </Text>
                  <Text style={styles.activityDate}>
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.activityPoints, { color: colors.success }]}>
                  +{referral.pointsEarned || 10} pts
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Partner Eligible Banner */}
        {(affiliate?.partnerEligible || dashboardData?.affiliate?.partnerEligible) && (
          <View style={styles.partnerBanner}>
            <Ionicons name="trophy-outline" size={24} color={portalColors.partner} />
            <View style={styles.partnerBannerText}>
              <Text style={styles.partnerBannerTitle}>Eligible for Partner Program</Text>
              <Text style={styles.partnerBannerDesc}>
                You qualify for our partner program with higher rewards
              </Text>
            </View>
            <TouchableOpacity style={styles.partnerButton}>
              <Text style={styles.partnerButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}

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
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  tierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  pointsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: portalColors.affiliate,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  pointsLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  pointsValue: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    color: portalColors.affiliate,
  },
  pointsTotal: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  progressSection: {},
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressPoints: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: portalColors.affiliate,
    borderRadius: 4,
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  shareInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shareText: {},
  shareTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  shareDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  shareButton: {
    backgroundColor: portalColors.affiliate,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  shareButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  codeCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  codeLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: 2,
  },
  copyButton: {
    padding: spacing.sm,
  },
  statsGrid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  activityDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  activityPoints: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${portalColors.partner}15`,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: portalColors.partner,
  },
  partnerBannerText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  partnerBannerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  partnerBannerDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  partnerButton: {
    backgroundColor: portalColors.partner,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  partnerButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
})
