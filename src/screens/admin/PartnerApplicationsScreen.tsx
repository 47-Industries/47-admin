import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface PartnerApplicationsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

interface Application {
  id: string
  type: string
  name: string
  email: string
  company: string | null
  website: string | null
  socialMedia: string | null
  audience: string
  reason: string
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
    userAffiliate?: {
      affiliateCode: string
      totalReferrals: number
      totalPoints: number
    } | null
  }
}

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
}

const STATUS_FILTERS: { value: string | null; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: null, label: 'All' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

const TYPE_FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: 'All Types' },
  { value: 'partner', label: 'Partner' },
  { value: 'store-affiliate', label: 'Store Affiliate' },
]

const statusBadgeVariants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
}

const typeBadgeVariants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  partner: 'warning',
  'store-affiliate': 'primary',
}

export function PartnerApplicationsScreen({ navigation, hideHeader }: PartnerApplicationsScreenProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>('PENDING')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  const fetchApplications = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const params: { page?: number; status?: string; type?: string; search?: string } = { page: pageNum }
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      if (search) params.search = search

      const data = await api.getPartnerApplications(params)
      const newApplications = data.applications || []

      if (refresh || pageNum === 1) {
        setApplications(newApplications)
      } else {
        setApplications((prev) => [...prev, ...newApplications])
      }

      if (data.stats) {
        setStats({
          total: data.stats.total || 0,
          pending: data.stats.pending || 0,
          approved: data.stats.approved || 0,
          rejected: data.stats.rejected || 0,
        })
      }

      setHasMore(newApplications.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, typeFilter, search])

  useEffect(() => {
    setLoading(true)
    fetchApplications(1, true)
  }, [statusFilter, typeFilter])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setLoading(true)
      fetchApplications(1, true)
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [search])

  const onRefresh = () => {
    setRefreshing(true)
    fetchApplications(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchApplications(page + 1)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleReview = async (applicationId: string, action: 'approve' | 'reject') => {
    setProcessing(true)
    try {
      await api.updatePartnerApplication(applicationId, {
        action,
        reviewNotes,
      })

      Alert.alert(
        'Success',
        `Application ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        [{ text: 'OK' }]
      )
      setSelectedApp(null)
      setReviewNotes('')
      fetchApplications(1, true)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process application')
    } finally {
      setProcessing(false)
    }
  }

  const openWebsite = (url: string) => {
    let fullUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`
    }
    Linking.openURL(fullUrl).catch(() => {
      Alert.alert('Error', 'Could not open website')
    })
  }

  const getTypeLabel = (type: string) => {
    return type === 'partner' ? 'Partner' : 'Store Affiliate'
  }

  const renderApplication = ({ item }: { item: Application }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedApp(item)
        setReviewNotes('')
      }}
      activeOpacity={0.7}
    >
      <Card style={styles.applicationCard}>
        <View style={styles.applicationHeader}>
          <View style={styles.applicationLeft}>
            <View style={styles.applicationInfo}>
              <View style={styles.badgeRow}>
                <Badge text={getTypeLabel(item.type)} variant={typeBadgeVariants[item.type] || 'default'} />
                <Badge text={item.status} variant={statusBadgeVariants[item.status] || 'default'} />
              </View>
              <Text style={styles.applicationName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.applicationEmail} numberOfLines={1}>{item.email}</Text>
              {item.company && (
                <Text style={styles.companyName} numberOfLines={1}>{item.company}</Text>
              )}
            </View>
          </View>
          <View style={styles.applicationRight}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </View>

        {item.user?.userAffiliate && (
          <View style={styles.affiliateInfo}>
            <Text style={styles.affiliateLabel}>
              Code: <Text style={styles.affiliateValue}>{item.user.userAffiliate.affiliateCode}</Text>
            </Text>
            <Text style={styles.affiliateLabel}>
              Referrals: <Text style={styles.affiliateValue}>{item.user.userAffiliate.totalReferrals}</Text>
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Applications</Text>
        </View>
      )}

      {/* Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContainer}
      >
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Total</Text>
          <Text style={styles.statCardValue}>{stats.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Pending</Text>
          <Text style={[styles.statCardValue, { color: colors.warning }]}>{stats.pending}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Approved</Text>
          <Text style={[styles.statCardValue, { color: colors.success }]}>{stats.approved}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Rejected</Text>
          <Text style={[styles.statCardValue, { color: colors.error }]}>{stats.rejected}</Text>
        </View>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.value && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          <TouchableOpacity
            style={[styles.filterChip, typeFilter && styles.filterChipActive]}
            onPress={() => setShowTypeFilter(true)}
          >
            <Ionicons
              name="briefcase-outline"
              size={14}
              color={typeFilter ? colors.text : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                typeFilter && styles.filterChipTextActive,
              ]}
            >
              {typeFilter ? TYPE_FILTERS.find(t => t.value === typeFilter)?.label : 'Type'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={typeFilter ? colors.text : colors.textMuted}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Application List */}
      <FlatList
        data={applications}
        renderItem={renderApplication}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="document-text-outline"
              title="No applications found"
              description={statusFilter === 'PENDING'
                ? "All caught up! No pending applications."
                : "Try adjusting your filters"}
            />
          ) : null
        }
      />

      {/* Type Filter Modal */}
      <Modal visible={showTypeFilter} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Type</Text>
              <TouchableOpacity onPress={() => setShowTypeFilter(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.typeList}>
              {TYPE_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.label}
                  style={styles.typeItem}
                  onPress={() => {
                    setTypeFilter(filter.value)
                    setShowTypeFilter(false)
                  }}
                >
                  <Text style={styles.typeItemText}>{filter.label}</Text>
                  {typeFilter === filter.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Application Detail Modal */}
      <Modal visible={!!selectedApp} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Application Details</Text>
              <TouchableOpacity onPress={() => setSelectedApp(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.detailScrollView}>
              {selectedApp && (
                <View style={styles.detailContent}>
                  {/* Badges */}
                  <View style={styles.detailBadgeRow}>
                    <Badge text={getTypeLabel(selectedApp.type)} variant={typeBadgeVariants[selectedApp.type] || 'default'} />
                    <Badge text={selectedApp.status} variant={statusBadgeVariants[selectedApp.status] || 'default'} />
                  </View>

                  {/* Applicant Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Applicant Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedApp.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{selectedApp.email}</Text>
                    </View>
                    {selectedApp.company && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Company</Text>
                        <Text style={styles.detailValue}>{selectedApp.company}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Applied</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedApp.createdAt)}</Text>
                    </View>
                  </View>

                  {/* Links */}
                  {(selectedApp.website || selectedApp.socialMedia) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Links</Text>
                      {selectedApp.website && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={() => openWebsite(selectedApp.website!)}
                        >
                          <Ionicons name="globe-outline" size={16} color={colors.primary} />
                          <Text style={styles.linkText}>Visit Website</Text>
                        </TouchableOpacity>
                      )}
                      {selectedApp.socialMedia && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Social</Text>
                          <Text style={styles.detailValue}>{selectedApp.socialMedia}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* How they'll promote */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>How they will promote</Text>
                    <View style={styles.textBlock}>
                      <Text style={styles.textBlockContent}>{selectedApp.audience}</Text>
                    </View>
                  </View>

                  {/* Why they want to join */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Why they want to join</Text>
                    <View style={styles.textBlock}>
                      <Text style={styles.textBlockContent}>{selectedApp.reason}</Text>
                    </View>
                  </View>

                  {/* Affiliate Stats */}
                  {selectedApp.user?.userAffiliate && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Affiliate Stats</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Code</Text>
                        <Text style={[styles.detailValue, { fontFamily: 'monospace' }]}>
                          {selectedApp.user.userAffiliate.affiliateCode}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Referrals</Text>
                        <Text style={styles.detailValue}>{selectedApp.user.userAffiliate.totalReferrals}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Points</Text>
                        <Text style={styles.detailValue}>{selectedApp.user.userAffiliate.totalPoints}</Text>
                      </View>
                    </View>
                  )}

                  {/* Review Notes (if already reviewed) */}
                  {selectedApp.reviewNotes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Review Notes</Text>
                      <View style={styles.textBlock}>
                        <Text style={styles.textBlockContent}>{selectedApp.reviewNotes}</Text>
                      </View>
                      {selectedApp.reviewedAt && (
                        <Text style={styles.reviewedAt}>
                          Reviewed on {formatDate(selectedApp.reviewedAt)}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Actions (only for pending) */}
                  {selectedApp.status === 'PENDING' && (
                    <View style={styles.actionSection}>
                      <Text style={styles.detailSectionTitle}>Review</Text>
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Add notes about this application (optional)..."
                        placeholderTextColor={colors.textMuted}
                        value={reviewNotes}
                        onChangeText={setReviewNotes}
                        multiline
                        numberOfLines={3}
                      />
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => handleReview(selectedApp.id, 'approve')}
                          disabled={processing}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>
                            {processing ? 'Processing...' : 'Approve'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectButton]}
                          onPress={() => handleReview(selectedApp.id, 'reject')}
                          disabled={processing}
                        >
                          <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                          <Text style={[styles.actionButtonText, { color: colors.error }]}>
                            {processing ? 'Processing...' : 'Reject'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Application Link */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Application Link</Text>
                    <TouchableOpacity
                      style={styles.linkCopyButton}
                      onPress={() => {
                        Linking.openURL('https://47industries.com/partners/apply')
                      }}
                    >
                      <Text style={styles.linkCopyText}>47industries.com/partners/apply</Text>
                      <Ionicons name="open-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statsScroll: {
    flexGrow: 0,
    marginBottom: spacing.lg,
  },
  statsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
  },
  statCardLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statCardValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
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
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
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
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
    alignSelf: 'center',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  applicationCard: {
    marginBottom: spacing.md,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  applicationLeft: {
    flex: 1,
  },
  applicationInfo: {
    flex: 1,
  },
  applicationName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  applicationEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  companyName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  applicationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  affiliateInfo: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  affiliateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  affiliateValue: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '50%',
  },
  detailModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  typeList: {
    padding: spacing.xl,
  },
  typeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  detailScrollView: {
    flex: 1,
  },
  detailContent: {
    padding: spacing.xl,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  detailSection: {
    marginBottom: spacing.xl,
  },
  detailSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  linkText: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  textBlock: {
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  textBlockContent: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  reviewedAt: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  actionSection: {
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesInput: {
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  linkCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkCopyText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
})
