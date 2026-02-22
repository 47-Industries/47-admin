import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Clipboard,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

const PURPLE = colors.purple

interface RecruitScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function RecruitScreen({ navigation, hideHeader }: RecruitScreenProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const fetchData = async () => {
    try {
      const result = await api.getPartnerRecruitData()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch recruit data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const copyCode = async () => {
    if (!data?.sponsorCode) return
    try {
      await Clipboard.setString(data.sponsorCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      Alert.alert('Error', 'Failed to copy to clipboard')
    }
  }

  const copyLink = async () => {
    if (!data?.recruitLink) return
    try {
      await Clipboard.setString(data.recruitLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      Alert.alert('Error', 'Failed to copy to clipboard')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const accentColor = portalColors.partner

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recruit Partners</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >
        {/* How it works */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Earn Override Commissions</Text>
          <Text style={styles.infoDesc}>
            Recruit partners and earn a percentage of their commissions automatically.
          </Text>
          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeLabel}>Level 1</Text>
              <Text style={styles.levelBadgeRate}>10%</Text>
              <Text style={styles.levelBadgeDesc}>Direct recruits</Text>
            </View>
            <View style={styles.levelArrow}>
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            </View>
            <View style={[styles.levelBadge, { borderColor: `${PURPLE}50` }]}>
              <Text style={[styles.levelBadgeLabel, { color: PURPLE }]}>Level 2</Text>
              <Text style={[styles.levelBadgeRate, { color: PURPLE }]}>3%</Text>
              <Text style={styles.levelBadgeDesc}>Their recruits</Text>
            </View>
          </View>
        </View>

        {/* Sponsor — who recruited you */}
        {data?.sponsor && (
          <View style={styles.sponsorCard}>
            <Ionicons name="person-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.sponsorText}>
              Recruited by <Text style={styles.sponsorName}>{data.sponsor.name}</Text>
              {' '}({data.sponsor.partnerNumber})
            </Text>
          </View>
        )}

        {/* Override earnings summary */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Overrides</Text>
            <Text style={[styles.summaryValue, { color: PURPLE }]}>
              {formatCurrency(data?.overrideSummary?.total || 0)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {formatCurrency(data?.overrideSummary?.pending || 0)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Recruits</Text>
            <Text style={[styles.summaryValue, { color: accentColor }]}>
              {data?.overrideSummary?.recruitsCount || 0}
            </Text>
          </View>
        </View>

        {/* Sponsor code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Sponsor Code</Text>
          <View style={styles.codeCard}>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{data?.sponsorCode || '--------'}</Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={copyCode}>
              <Ionicons
                name={codeCopied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={colors.text}
              />
              <Text style={styles.copyButtonText}>{codeCopied ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recruit link */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recruitment Link</Text>
          <Text style={styles.sectionDesc}>
            Share this link — the application will auto-populate with your code.
          </Text>
          <View style={styles.linkCard}>
            <Text style={styles.linkText} numberOfLines={1}>
              {data?.recruitLink || '...'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.fullButton, { backgroundColor: PURPLE }]} onPress={copyLink}>
            <Ionicons
              name={linkCopied ? 'checkmark' : 'link-outline'}
              size={16}
              color={colors.text}
            />
            <Text style={styles.fullButtonText}>{linkCopied ? 'Link Copied!' : 'Copy Recruit Link'}</Text>
          </TouchableOpacity>
        </View>

        {/* Downline */}
        {(data?.downline?.length || 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Recruits ({data.downline.length})</Text>
            {data.downline.map((recruit: any) => (
              <View key={recruit.id} style={styles.recruitCard}>
                <View style={styles.recruitInfo}>
                  <Text style={styles.recruitName}>{recruit.name}</Text>
                  <Text style={styles.recruitNumber}>{recruit.partnerNumber}</Text>
                  <Text style={styles.recruitJoined}>
                    Joined {formatDate(recruit.createdAt)}
                  </Text>
                </View>
                <View style={styles.recruitRight}>
                  <Text style={[styles.recruitOverride, { color: PURPLE }]}>
                    {formatCurrency(recruit.overrideEarned || 0)}
                  </Text>
                  <Text style={styles.recruitOverrideLabel}>your override</Text>
                  {(recruit.subRecruitCount || 0) > 0 && (
                    <Text style={styles.recruitSubs}>
                      +{recruit.subRecruitCount} L2
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent override commissions */}
        {(data?.recentOverrides?.length || 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Overrides</Text>
            {data.recentOverrides.map((override: any) => (
              <View key={override.id} style={styles.overrideCard}>
                <View style={[
                  styles.overrideLevelBadge,
                  { backgroundColor: override.level === 1 ? `${accentColor}20` : `${PURPLE}20` },
                ]}>
                  <Text style={[
                    styles.overrideLevelText,
                    { color: override.level === 1 ? accentColor : PURPLE },
                  ]}>
                    L{override.level}
                  </Text>
                </View>
                <View style={styles.overrideInfo}>
                  <Text style={styles.overridePartner}>
                    {override.downlinePartner?.name || 'Partner'}
                  </Text>
                  <Text style={styles.overrideDetail}>
                    {Number(override.rate)}% of {formatCurrency(Number(override.baseAmount))}
                  </Text>
                  <Text style={styles.overrideDate}>{formatDate(override.createdAt)}</Text>
                </View>
                <View style={styles.overrideRight}>
                  <Text style={[styles.overrideAmount, { color: PURPLE }]}>
                    {formatCurrency(Number(override.amount))}
                  </Text>
                  <View style={[
                    styles.overrideStatusBadge,
                    { backgroundColor: override.status === 'PAID' ? `${colors.success}20` : `${colors.warning}20` },
                  ]}>
                    <Text style={[
                      styles.overrideStatusText,
                      { color: override.status === 'PAID' ? colors.success : colors.warning },
                    ]}>
                      {override.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {!loading && (data?.downline?.length || 0) === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No recruits yet</Text>
            <Text style={styles.emptyDesc}>
              Share your recruitment link to start building your team and earning override commissions.
            </Text>
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
  infoCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${PURPLE}30`,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  levelBadge: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${portalColors.partner}50`,
    backgroundColor: `${portalColors.partner}10`,
  },
  levelBadgeLabel: {
    fontSize: fontSize.xs,
    color: portalColors.partner,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  levelBadgeRate: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: portalColors.partner,
  },
  levelBadgeDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  levelArrow: {
    padding: spacing.xs,
  },
  sponsorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sponsorText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  sponsorName: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  summaryGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  codeCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  codeBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${PURPLE}40`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  codeText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: PURPLE,
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: PURPLE,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  copyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  linkCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  linkText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  fullButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  recruitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  recruitInfo: {
    flex: 1,
  },
  recruitName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  recruitNumber: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  recruitJoined: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  recruitRight: {
    alignItems: 'flex-end',
  },
  recruitOverride: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  recruitOverrideLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  recruitSubs: {
    fontSize: fontSize.xs,
    color: PURPLE,
    marginTop: spacing.xs,
  },
  overrideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  overrideLevelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overrideLevelText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  overrideInfo: {
    flex: 1,
  },
  overridePartner: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  overrideDetail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  overrideDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  overrideRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  overrideAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  overrideStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  overrideStatusText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
})
