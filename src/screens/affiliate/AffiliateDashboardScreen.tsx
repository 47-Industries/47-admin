import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Share, Clipboard, Image, TextInput, ActivityIndicator } from 'react-native'
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
  const user = useAuthStore((state) => state.user)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [showCustomCode, setShowCustomCode] = useState(false)
  const [customCode, setCustomCode] = useState('')
  const [customCodeError, setCustomCodeError] = useState<string | null>(null)
  const [customCodeAvailable, setCustomCodeAvailable] = useState<boolean | null>(null)
  const [checkingCode, setCheckingCode] = useState(false)
  const [settingCode, setSettingCode] = useState(false)

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
    const shareLink = affiliate?.shareLink || dashboardData?.stats?.shareLink
    if (!shareLink) return

    try {
      await Share.share({
        message: `Join MotoRev with my referral link and we both earn rewards! ${shareLink}`,
        url: shareLink,
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const copyShareLink = async () => {
    const shareLink = affiliate?.shareLink || dashboardData?.stats?.shareLink
    if (!shareLink) return

    try {
      await Clipboard.setString(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying:', error)
    }
  }

  const handleCustomCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    let formatted = cleaned
    if (!cleaned.startsWith('MR-')) {
      formatted = 'MR-' + cleaned.replace(/^MR-?/i, '')
    }
    if (formatted.length > 9) {
      formatted = formatted.slice(0, 9)
    }
    setCustomCode(formatted)
    setCustomCodeError(null)
    setCustomCodeAvailable(null)
  }

  const checkCodeAvailability = async () => {
    if (customCode.length !== 9) {
      setCustomCodeError('Code must be MR- followed by 6 characters')
      return
    }
    setCheckingCode(true)
    setCustomCodeError(null)
    setCustomCodeAvailable(null)
    try {
      const res = await api.checkAffiliateCode(customCode)
      if (res.available) {
        setCustomCodeAvailable(true)
      } else {
        setCustomCodeAvailable(false)
        setCustomCodeError(res.error || 'This code is already taken')
      }
    } catch (err) {
      setCustomCodeError('Failed to check code availability')
    } finally {
      setCheckingCode(false)
    }
  }

  const setCustomReferralCode = async () => {
    if (!customCodeAvailable || customCode.length !== 9) return
    setSettingCode(true)
    setCustomCodeError(null)
    try {
      const res = await api.setAffiliateCode(customCode)
      if (res.success) {
        setShowCustomCode(false)
        setCustomCode('')
        setCustomCodeAvailable(null)
        fetchDashboard()
      } else {
        setCustomCodeError(res.error || 'Failed to set custom code')
      }
    } catch (err) {
      setCustomCodeError('Failed to set custom code')
    } finally {
      setSettingCode(false)
    }
  }

  const accentColor = '#0066FF' // MotoRev blue
  const affiliateData = dashboardData?.stats
  const points = affiliateData?.points || { total: 0, available: 0, redeemed: 0, toNextReward: 10, progressPercent: 0 }
  const stats = affiliateData?.stats || { totalReferrals: 0, proConversions: 0, proDaysEarned: 0, totalTransactions: 0, totalRedemptions: 0 }
  const progressPercent = points.progressPercent || 0
  const motorev = affiliateData?.motorev
  const shareLink = affiliateData?.shareLink || ''
  const affiliateCode = affiliateData?.affiliateCode || '---'
  const partnerEligible = affiliateData?.partnerEligible || false
  const isPartner = affiliateData?.isPartner || false

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >
        {/* Header with MotoRev Profile */}
        <View style={styles.header}>
          {motorev?.profilePicture ? (
            <Image
              source={{ uri: motorev.profilePicture }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profilePlaceholder, { backgroundColor: accentColor }]}>
              <Text style={styles.profileInitial}>
                {motorev?.username?.[0]?.toUpperCase() || 'M'}
              </Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.name}>
              {motorev?.username ? `@${motorev.username}` : 'Your Affiliate Dashboard'}
            </Text>
            <Text style={styles.greeting}>MotoRev Affiliate Program</Text>
          </View>
        </View>

        {/* Points Progress Card */}
        <View style={[styles.pointsCard, { borderColor: accentColor }]}>
          <View style={styles.pointsHeader}>
            <Text style={styles.pointsLabel}>Your Points</Text>
            <Text style={[styles.pointsValue, { color: accentColor }]}>{points.available}</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
          </View>

          <View style={styles.progressFooter}>
            <Text style={styles.progressLabel}>
              {points.toNextReward === 0 ? 'Ready to redeem!' : `${points.toNextReward} points to next reward`}
            </Text>
            <Text style={styles.progressLabel}>10 points = 7 days Pro</Text>
          </View>

          {/* Quick Stats in Points Card */}
          <View style={styles.pointsStats}>
            <View style={styles.pointsStat}>
              <Text style={styles.pointsStatValue}>{points.total}</Text>
              <Text style={styles.pointsStatLabel}>Total Earned</Text>
            </View>
            <View style={styles.pointsStat}>
              <Text style={[styles.pointsStatValue, { color: colors.success }]}>{stats.proDaysEarned}d</Text>
              <Text style={styles.pointsStatLabel}>Pro Time Earned</Text>
            </View>
            <View style={styles.pointsStat}>
              <Text style={styles.pointsStatValue}>{points.redeemed || 0}</Text>
              <Text style={styles.pointsStatLabel}>Points Redeemed</Text>
            </View>
          </View>
        </View>

        {/* Share Link Section */}
        <View style={styles.shareLinkCard}>
          <Text style={styles.shareLinkTitle}>Share Your Link</Text>
          <Text style={styles.shareLinkDesc}>
            Share this link with friends. Earn 1 point per signup, 10 points when they upgrade to Pro.
          </Text>
          <View style={styles.shareLinkContainer}>
            <View style={styles.shareLinkBox}>
              <Text style={styles.shareLinkText} numberOfLines={1}>{shareLink}</Text>
            </View>
            <TouchableOpacity
              style={[styles.copyLinkButton, { backgroundColor: accentColor }]}
              onPress={copyShareLink}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.text} />
              <Text style={styles.copyLinkButtonText}>{copied ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>
              Referral Code: <Text style={styles.codeValue}>{affiliateCode}</Text>
            </Text>
            <TouchableOpacity onPress={() => setShowCustomCode(!showCustomCode)}>
              <Text style={[styles.customizeLink, { color: accentColor }]}>Customize Code</Text>
            </TouchableOpacity>
          </View>

          {/* Custom Code Form */}
          {showCustomCode && (
            <View style={styles.customCodeSection}>
              <Text style={styles.customCodeTitle}>Set Custom Referral Code</Text>
              <Text style={styles.customCodeDesc}>
                Choose a memorable code for your referral link. Format: MR-XXXXXX (6 alphanumeric characters)
              </Text>
              <View style={styles.customCodeRow}>
                <TextInput
                  style={styles.customCodeInput}
                  value={customCode}
                  onChangeText={handleCustomCodeChange}
                  placeholder="MR-XXXXXX"
                  placeholderTextColor={colors.textMuted}
                  maxLength={9}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.checkButton}
                  onPress={checkCodeAvailability}
                  disabled={customCode.length !== 9 || checkingCode}
                >
                  {checkingCode ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text style={styles.checkButtonText}>Check</Text>
                  )}
                </TouchableOpacity>
              </View>
              {customCodeError && (
                <Text style={styles.customCodeError}>{customCodeError}</Text>
              )}
              {customCodeAvailable && (
                <View style={styles.codeAvailableSection}>
                  <Text style={styles.codeAvailableText}>Code is available!</Text>
                  <TouchableOpacity
                    style={[styles.useCodeButton, { backgroundColor: accentColor }]}
                    onPress={setCustomReferralCode}
                    disabled={settingCode}
                  >
                    {settingCode ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color={colors.text} />
                        <Text style={styles.useCodeButtonText}>Use This Code</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StatCard
                title="Total Signups"
                value={stats.totalReferrals}
                icon="people-outline"
                iconColor={accentColor}
                compact
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Pro Conversions"
                value={stats.proConversions}
                icon="star-outline"
                iconColor={accentColor}
                compact
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StatCard
                title="Transactions"
                value={stats.totalTransactions}
                icon="swap-horizontal-outline"
                iconColor={colors.textSecondary}
                compact
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Redemptions"
                value={stats.totalRedemptions}
                icon="gift-outline"
                iconColor={colors.textSecondary}
                compact
              />
            </View>
          </View>
        </View>

        {/* Partner CTA */}
        {partnerEligible && !isPartner && (
          <View style={styles.partnerBanner}>
            <View style={styles.partnerIcon}>
              <Ionicons name="trophy" size={24} color="#F59E0B" />
            </View>
            <View style={styles.partnerBannerText}>
              <Text style={styles.partnerBannerTitle}>Become a Partner</Text>
              <Text style={styles.partnerBannerDesc}>
                Congratulations! With {stats.totalReferrals} referrals, you qualify for our Partner Program.
                Partners get higher commission rates and exclusive benefits.
              </Text>
              <TouchableOpacity style={styles.partnerApplyButton}>
                <Text style={styles.partnerApplyText}>Apply for Partner Program</Text>
                <Ionicons name="arrow-forward" size={16} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Already a Partner */}
        {isPartner && (
          <View style={styles.partnerBanner}>
            <View style={styles.partnerIcon}>
              <Ionicons name="trophy" size={24} color="#F59E0B" />
            </View>
            <View style={styles.partnerBannerText}>
              <Text style={styles.partnerBannerTitle}>Partner Status Active</Text>
              <Text style={styles.partnerBannerDesc}>
                You are an official 47 Industries Partner with enhanced benefits.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewPartnerButton}
              onPress={() => navigation.navigate('PartnerDashboard')}
            >
              <Text style={styles.viewPartnerText}>View Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Activity */}
        {dashboardData?.recentActivity?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Recent Activity" />
            {dashboardData.recentActivity.slice(0, 5).map((tx: any, index: number) => (
              <View key={tx.id || index} style={styles.activityCard}>
                <View style={[
                  styles.activityIcon,
                  { backgroundColor: tx.type === 'PRO_CONVERSION' ? `${accentColor}20` : `${colors.success}20` }
                ]}>
                  <Ionicons
                    name={tx.type === 'PRO_CONVERSION' ? 'star' : tx.type === 'VERIFIED_SIGNUP' ? 'checkmark-circle' : 'gift'}
                    size={18}
                    color={tx.type === 'PRO_CONVERSION' ? accentColor : tx.type === 'VERIFIED_SIGNUP' ? colors.success : colors.textSecondary}
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    {tx.type === 'PRO_CONVERSION' ? 'Pro Conversion' : tx.type === 'VERIFIED_SIGNUP' ? 'Signup' : tx.type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.activityDate}>
                    {tx.motorevEmail || tx.description || new Date(tx.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.activityPoints, { color: tx.points > 0 ? colors.success : colors.error }]}>
                  {tx.points > 0 ? '+' : ''}{tx.points} pts
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* How It Works */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>How Points Work</Text>
          <View style={styles.howItWorksSteps}>
            <View style={styles.howItWorksStep}>
              <View style={[styles.stepNumber, { backgroundColor: `${accentColor}20` }]}>
                <Text style={[styles.stepNumberText, { color: accentColor }]}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Share Your Link</Text>
              <Text style={styles.stepDesc}>Friends sign up using your referral link</Text>
            </View>
            <View style={styles.howItWorksStep}>
              <View style={[styles.stepNumber, { backgroundColor: `${accentColor}20` }]}>
                <Text style={[styles.stepNumberText, { color: accentColor }]}>2</Text>
              </View>
              <Text style={styles.stepTitle}>Earn Points</Text>
              <Text style={styles.stepDesc}>1 point per signup, 10 points for Pro upgrades</Text>
            </View>
            <View style={styles.howItWorksStep}>
              <View style={[styles.stepNumber, { backgroundColor: `${accentColor}20` }]}>
                <Text style={[styles.stepNumberText, { color: accentColor }]}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Get Pro Time</Text>
              <Text style={styles.stepDesc}>10 points = 7 days Pro (auto-redeemed)</Text>
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
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#0066FF50',
  },
  profilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  pointsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pointsLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  pointsValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.surfaceHover,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  pointsStats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pointsStat: {
    flex: 1,
    alignItems: 'center',
  },
  pointsStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  pointsStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  shareLinkCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareLinkTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  shareLinkDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  shareLinkContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shareLinkBox: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  shareLinkText: {
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    color: colors.text,
  },
  copyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  copyLinkButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  codeLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  codeValue: {
    fontFamily: 'monospace',
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  customizeLink: {
    fontSize: fontSize.xs,
  },
  customCodeSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customCodeTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  customCodeDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  customCodeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customCodeInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    color: colors.text,
  },
  checkButton: {
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  checkButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  customCodeError: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.sm,
  },
  codeAvailableSection: {
    marginTop: spacing.sm,
  },
  codeAvailableText: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  useCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  useCodeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  activityDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  activityPoints: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F59E0B15',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#F59E0B50',
  },
  partnerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerBannerText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  partnerBannerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#F59E0B',
    marginBottom: spacing.xs,
  },
  partnerBannerDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  partnerApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  partnerApplyText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: '#000',
  },
  viewPartnerButton: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  viewPartnerText: {
    fontSize: fontSize.sm,
    color: '#F59E0B',
  },
  howItWorksCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  howItWorksTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  howItWorksSteps: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  howItWorksStep: {
    flex: 1,
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stepNumberText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  stepTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
})
