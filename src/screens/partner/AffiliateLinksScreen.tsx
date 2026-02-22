import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { api } from '../../services/api'
import { EmptyState } from '../../components/EmptyState'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface AffiliateLink {
  id: string
  code: string
  name: string | null
  platform: string
  targetType: string
  targetId: string | null
  url: string
  isActive: boolean
  totalClicks: number
  totalReferrals: number
  totalRevenue: number
  createdAt: string
}

interface AffiliateStats {
  summary: {
    totalClicks: number
    totalReferrals: number
    totalCommissions: number
    pendingCommissions: number
    approvedCommissions: number
    paidCommissions: number
  }
  byPlatform: {
    SHOP: {
      referrals: number
      revenue: number
      commissionRate: number | null
    }
    MOTOREV: {
      signups: number
      proConversions: number
      proBonus: number | null
      windowDays: number | null
    }
  }
  recentReferrals: Array<{
    id: string
    platform: string
    eventType: string
    customerEmail: string | null
    orderTotal: number | null
    commission: { amount: number; status: string } | null
    linkName: string | null
    createdAt: string
  }>
  topLinks: AffiliateLink[]
  affiliateCode: string | null
  settings: {
    shopCommissionRate: number | null
    motorevProBonus: number | null
    motorevProWindowDays: number | null
  }
}

interface AffiliateLinksScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

export function AffiliateLinksScreen({ navigation, hideHeader }: AffiliateLinksScreenProps) {
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create link form state
  const [newLink, setNewLink] = useState({
    platform: 'SHOP',
    targetType: 'STORE',
    targetId: '',
    name: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, linksRes] = await Promise.all([
        api.getPartnerAffiliateStats(),
        api.getPartnerAffiliateLinks(),
      ])
      setStats(statsRes as unknown as AffiliateStats)
      setLinks(linksRes.links || [])
    } catch (error) {
      console.error('Failed to fetch affiliate data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const createLink = async () => {
    setCreateLoading(true)
    try {
      const data = await api.createPartnerAffiliateLink({
        platform: newLink.platform,
        targetType: newLink.targetType,
        targetId: newLink.targetId || undefined,
        name: newLink.name || undefined,
      })
      if (data.link) {
        setLinks(prev => [data.link, ...prev])
        setShowCreateModal(false)
        setNewLink({ platform: 'SHOP', targetType: 'STORE', targetId: '', name: '' })
        fetchData()
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create link')
    } finally {
      setCreateLoading(false)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await Clipboard.setStringAsync(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return colors.warning
      case 'APPROVED':
        return colors.primary
      case 'PAID':
        return colors.success
      default:
        return colors.textMuted
    }
  }

  const getPlatformLabel = (platform: string) => {
    return platform === 'MOTOREV' ? 'MotoRev' : 'Shop'
  }

  const getPlatformColor = (platform: string) => {
    return platform === 'MOTOREV' ? colors.purple : colors.success
  }

  const getEventLabel = (event: string) => {
    const labels: Record<string, string> = {
      ORDER: 'Order',
      SIGNUP: 'Signup',
      PRO_CONVERSION: 'Pro Conversion',
    }
    return labels[event] || event
  }

  const accentColor = portalColors.partner

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Affiliate Links</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color={accentColor} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Clicks</Text>
                <Text style={styles.statValue}>{stats.summary.totalClicks.toLocaleString()}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Referrals</Text>
                <Text style={[styles.statValue, { color: accentColor }]}>
                  {stats.summary.totalReferrals}
                </Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {formatCurrency(stats.summary.pendingCommissions)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Earned</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCurrency(stats.summary.totalCommissions)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Commission Rates */}
        {stats && (
          <View style={styles.ratesSection}>
            <Text style={styles.sectionTitle}>Commission Rates</Text>
            <View style={styles.ratesGrid}>
              {/* Shop */}
              <View style={styles.rateCard}>
                <View style={styles.rateHeader}>
                  <View style={[styles.rateIcon, { backgroundColor: colors.successBg }]}>
                    <Ionicons name="cart-outline" size={18} color=colors.success />
                  </View>
                  <View style={styles.rateInfo}>
                    <Text style={styles.rateName}>Shop Orders</Text>
                    <Text style={styles.rateSubtext}>
                      {stats.byPlatform?.SHOP?.referrals || 0} orders
                    </Text>
                  </View>
                </View>
                <View style={styles.rateValue}>
                  <Text style={[styles.ratePercent, { color: colors.success }]}>
                    {stats.settings.shopCommissionRate || 5}%
                  </Text>
                  <Text style={styles.rateLabel}>Commission</Text>
                </View>
              </View>

              {/* MotoRev */}
              <View style={styles.rateCard}>
                <View style={styles.rateHeader}>
                  <View style={[styles.rateIcon, { backgroundColor: colors.purpleBg }]}>
                    <Ionicons name="phone-portrait-outline" size={18} color=colors.purple />
                  </View>
                  <View style={styles.rateInfo}>
                    <Text style={styles.rateName}>MotoRev</Text>
                    <Text style={styles.rateSubtext}>
                      {stats.byPlatform?.MOTOREV?.proConversions || 0} Pro conversions
                    </Text>
                  </View>
                </View>
                <View style={styles.rateValue}>
                  <Text style={[styles.ratePercent, { color: colors.purple }]}>
                    {formatCurrency(stats.settings.motorevProBonus || 2.5)}
                  </Text>
                  <Text style={styles.rateLabel}>Per Pro</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Affiliate Code */}
        {stats?.affiliateCode && (
          <View style={styles.affiliateCodeSection}>
            <View style={styles.affiliateCodeContent}>
              <View>
                <Text style={styles.affiliateCodeTitle}>Your Affiliate Code</Text>
                <Text style={styles.affiliateCodeSubtext}>Share this code with customers</Text>
              </View>
              <View style={styles.affiliateCodeRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{stats.affiliateCode}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(stats.affiliateCode!, 'code')}
                >
                  <Ionicons
                    name={copiedId === 'code' ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color={colors.text}
                  />
                  <Text style={styles.copyButtonText}>
                    {copiedId === 'code' ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Create Link Button (for hideHeader mode) */}
        {hideHeader && (
          <TouchableOpacity
            style={styles.createLinkButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.text} />
            <Text style={styles.createLinkButtonText}>Create Affiliate Link</Text>
          </TouchableOpacity>
        )}

        {/* Affiliate Links List */}
        <View style={styles.linksSection}>
          <Text style={styles.sectionTitle}>My Affiliate Links</Text>
          {links.length === 0 ? (
            <EmptyState
              icon="link-outline"
              title="No affiliate links yet"
              description="Create your first affiliate link to start tracking referrals"
            />
          ) : (
            links.map((link) => (
              <View key={link.id} style={styles.linkCard}>
                <View style={styles.linkHeader}>
                  <View style={styles.linkLeft}>
                    <View
                      style={[
                        styles.platformBadge,
                        { backgroundColor: `${getPlatformColor(link.platform)}20` },
                      ]}
                    >
                      <Text
                        style={[styles.platformText, { color: getPlatformColor(link.platform) }]}
                      >
                        {getPlatformLabel(link.platform)}
                      </Text>
                    </View>
                    <Text style={styles.linkName}>{link.name || link.code}</Text>
                    {!link.isActive && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.linkMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>{link.totalClicks}</Text>
                    <Text style={styles.metricLabel}>Clicks</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>{link.totalReferrals}</Text>
                    <Text style={styles.metricLabel}>Referrals</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.success }]}>
                      {formatCurrency(Number(link.totalRevenue))}
                    </Text>
                    <Text style={styles.metricLabel}>Revenue</Text>
                  </View>
                </View>

                <View style={styles.linkUrlRow}>
                  <View style={styles.urlBox}>
                    <Text style={styles.urlText} numberOfLines={1}>
                      {link.url}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyUrlButton, copiedId === link.id && styles.copyUrlButtonActive]}
                    onPress={() => copyToClipboard(link.url, link.id)}
                  >
                    <Text style={styles.copyUrlText}>
                      {copiedId === link.id ? 'Copied!' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Referrals */}
        {stats && stats.recentReferrals && stats.recentReferrals.length > 0 && (
          <View style={styles.referralsSection}>
            <Text style={styles.sectionTitle}>Recent Referrals</Text>
            {stats.recentReferrals.map((referral) => (
              <View key={referral.id} style={styles.referralCard}>
                <View style={styles.referralLeft}>
                  <View style={styles.referralBadges}>
                    <View
                      style={[
                        styles.platformBadge,
                        { backgroundColor: `${getPlatformColor(referral.platform)}20` },
                      ]}
                    >
                      <Text
                        style={[styles.platformText, { color: getPlatformColor(referral.platform) }]}
                      >
                        {getPlatformLabel(referral.platform)}
                      </Text>
                    </View>
                    <Text style={styles.referralEvent}>{getEventLabel(referral.eventType)}</Text>
                  </View>
                  <Text style={styles.referralCustomer}>
                    {referral.customerEmail || 'Anonymous'}
                    {referral.linkName && ` via ${referral.linkName}`}
                  </Text>
                </View>
                <View style={styles.referralRight}>
                  {referral.commission ? (
                    <>
                      <Text style={[styles.referralAmount, { color: colors.success }]}>
                        {formatCurrency(referral.commission.amount)}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${getStatusColor(referral.commission.status)}20` },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: getStatusColor(referral.commission.status) }]}
                        >
                          {referral.commission.status}
                        </Text>
                      </View>
                    </>
                  ) : referral.orderTotal ? (
                    <Text style={styles.referralOrderTotal}>
                      {formatCurrency(referral.orderTotal)}
                    </Text>
                  ) : null}
                  <Text style={styles.referralDate}>{formatDate(referral.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Create Link Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Affiliate Link</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Platform Selection */}
              <Text style={styles.inputLabel}>Platform</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    newLink.platform === 'SHOP' && styles.segmentActive,
                  ]}
                  onPress={() => setNewLink({ ...newLink, platform: 'SHOP', targetType: 'STORE' })}
                >
                  <Ionicons
                    name="cart-outline"
                    size={18}
                    color={newLink.platform === 'SHOP' ? colors.text : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      newLink.platform === 'SHOP' && styles.segmentTextActive,
                    ]}
                  >
                    Shop
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    newLink.platform === 'MOTOREV' && styles.segmentActive,
                  ]}
                  onPress={() => setNewLink({ ...newLink, platform: 'MOTOREV', targetType: 'APP' })}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={18}
                    color={newLink.platform === 'MOTOREV' ? colors.text : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      newLink.platform === 'MOTOREV' && styles.segmentTextActive,
                    ]}
                  >
                    MotoRev
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Target Type (Shop only) */}
              {newLink.platform === 'SHOP' && (
                <>
                  <Text style={styles.inputLabel}>Target</Text>
                  <View style={styles.targetOptions}>
                    {[
                      { value: 'STORE', label: 'All Products' },
                      { value: 'CATEGORY', label: 'Category' },
                      { value: 'PRODUCT', label: 'Product' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.targetOption,
                          newLink.targetType === option.value && styles.targetOptionActive,
                        ]}
                        onPress={() => setNewLink({ ...newLink, targetType: option.value, targetId: '' })}
                      >
                        <Text
                          style={[
                            styles.targetOptionText,
                            newLink.targetType === option.value && styles.targetOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Target ID Input */}
                  {newLink.targetType !== 'STORE' && (
                    <>
                      <Text style={styles.inputLabel}>
                        {newLink.targetType === 'PRODUCT' ? 'Product Slug' : 'Category Slug'}
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={newLink.targetId}
                        onChangeText={(text) => setNewLink({ ...newLink, targetId: text })}
                        placeholder={
                          newLink.targetType === 'PRODUCT' ? 'e.g., cool-product' : 'e.g., 3d-prints'
                        }
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                      />
                    </>
                  )}
                </>
              )}

              {/* Link Name */}
              <Text style={styles.inputLabel}>Link Name (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={newLink.name}
                onChangeText={(text) => setNewLink({ ...newLink, name: text })}
                placeholder="e.g., TikTok Bio Link"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.inputHint}>Help you identify this link later</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, createLoading && styles.submitButtonDisabled]}
                onPress={createLink}
                disabled={createLoading}
              >
                {createLoading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={styles.submitButtonText}>Create Link</Text>
                )}
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  ratesSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  ratesGrid: {
    gap: spacing.md,
  },
  rateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rateIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateInfo: {
    gap: spacing.xs,
  },
  rateName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  rateSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rateValue: {
    alignItems: 'flex-end',
  },
  ratePercent: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  rateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  affiliateCodeSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: `${portalColors.partner}10`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${portalColors.partner}50`,
  },
  affiliateCodeContent: {
    gap: spacing.md,
  },
  affiliateCodeTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  affiliateCodeSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  affiliateCodeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeBox: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  codeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'monospace',
    color: colors.text,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: portalColors.partner,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  copyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  createLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: portalColors.partner,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  createLinkButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  linksSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  linkCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  platformBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  platformText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  linkName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: `${colors.error}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  inactiveText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  linkMetrics: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  linkUrlRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  urlBox: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
  },
  urlText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  copyUrlButton: {
    backgroundColor: `${portalColors.partner}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyUrlButtonActive: {
    backgroundColor: portalColors.partner,
  },
  copyUrlText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: portalColors.partner,
  },
  referralsSection: {
    paddingHorizontal: spacing.lg,
  },
  referralCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  referralLeft: {
    flex: 1,
  },
  referralBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  referralEvent: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  referralCustomer: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  referralRight: {
    alignItems: 'flex-end',
  },
  referralAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  referralOrderTotal: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  referralDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalBody: {
    padding: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  segmentActive: {
    backgroundColor: portalColors.partner,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  targetOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  targetOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  targetOptionActive: {
    backgroundColor: `${portalColors.partner}20`,
    borderColor: portalColors.partner,
  },
  targetOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  targetOptionTextActive: {
    color: portalColors.partner,
    fontWeight: fontWeight.medium,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: portalColors.partner,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
})
