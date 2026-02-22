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

interface PartnerInquiriesScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

interface PartnerInquiry {
  id: string
  inquiryNumber: string
  name: string
  email: string
  phone?: string
  company?: string
  website?: string
  socialMedia?: string
  audience: string
  reason: string
  status: string
  leadchopperId?: string
  leadchopperOrgId?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  partnerId?: string
  convertedAt?: string
  createdAt: string
  updatedAt: string
}

interface Stats {
  total: number
  new: number
  contacted: number
  approved: number
  rejected: number
}

const STATUS_FILTERS: { value: string | null; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: null, label: 'All' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

const statusBadgeVariants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  NEW: 'primary',
  CONTACTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
}

export function PartnerInquiriesScreen({ navigation, hideHeader }: PartnerInquiriesScreenProps) {
  const [inquiries, setInquiries] = useState<PartnerInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>('NEW')
  const [selectedInquiry, setSelectedInquiry] = useState<PartnerInquiry | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const [stats, setStats] = useState<Stats>({
    total: 0,
    new: 0,
    contacted: 0,
    approved: 0,
    rejected: 0,
  })

  const fetchInquiries = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const params: { page?: number; status?: string; search?: string } = { page: pageNum }
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search

      const data = await api.getPartnerInquiries(params)
      const newInquiries = data.inquiries || []

      if (refresh || pageNum === 1) {
        setInquiries(newInquiries)
      } else {
        setInquiries((prev) => [...prev, ...newInquiries])
      }

      if (data.stats) {
        setStats({
          total: data.stats.total || 0,
          new: data.stats.new || 0,
          contacted: data.stats.contacted || 0,
          approved: data.stats.approved || 0,
          rejected: data.stats.rejected || 0,
        })
      }

      setHasMore(newInquiries.length === 50)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch partner inquiries:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    setLoading(true)
    fetchInquiries(1, true)
  }, [statusFilter])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setLoading(true)
      fetchInquiries(1, true)
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [search])

  const onRefresh = () => {
    setRefreshing(true)
    fetchInquiries(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchInquiries(page + 1)
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

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleStatusUpdate = async (inquiryId: string, newStatus: string, notes?: string) => {
    setProcessing(true)
    try {
      await api.updatePartnerInquiry(inquiryId, {
        status: newStatus,
        reviewNotes: notes,
      })

      Alert.alert(
        'Success',
        `Inquiry marked as ${newStatus.toLowerCase()}`,
        [{ text: 'OK' }]
      )
      setSelectedInquiry(null)
      setReviewNotes('')
      fetchInquiries(1, true)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update inquiry')
    } finally {
      setProcessing(false)
    }
  }

  const handleApprove = (inquiryId: string) => {
    Alert.alert(
      'Approve Inquiry',
      'Approve this partner inquiry? This will create a new Partner account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => handleStatusUpdate(inquiryId, 'APPROVED', reviewNotes),
        },
      ]
    )
  }

  const handleReject = (inquiryId: string) => {
    Alert.alert(
      'Reject Inquiry',
      'Are you sure you want to reject this partner inquiry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => handleStatusUpdate(inquiryId, 'REJECTED', reviewNotes),
        },
      ]
    )
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

  const openEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Error', 'Could not open email app')
    })
  }

  const openPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Could not open phone app')
    })
  }

  const getConversionRate = () => {
    if (stats.total === 0) return '0%'
    const rate = (stats.approved / stats.total) * 100
    return `${rate.toFixed(1)}%`
  }

  const renderInquiry = ({ item }: { item: PartnerInquiry }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedInquiry(item)
        setReviewNotes(item.reviewNotes || '')
      }}
      activeOpacity={0.7}
    >
      <Card style={styles.inquiryCard}>
        <View style={styles.inquiryHeader}>
          <View style={styles.inquiryLeft}>
            <View style={styles.inquiryInfo}>
              <View style={styles.badgeRow}>
                <Badge text={item.status} variant={statusBadgeVariants[item.status] || 'default'} />
                {item.leadchopperId && (
                  <Badge text="LeadChopper" variant="primary" />
                )}
              </View>
              <Text style={styles.inquiryName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.inquiryEmail} numberOfLines={1}>{item.email}</Text>
              {item.company && (
                <Text style={styles.companyName} numberOfLines={1}>{item.company}</Text>
              )}
              <Text style={styles.inquiryNumber}>{item.inquiryNumber}</Text>
            </View>
          </View>
          <View style={styles.inquiryRight}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Partner Inquiries</Text>
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
          <Text style={styles.statCardLabel}>New</Text>
          <Text style={[styles.statCardValue, { color: colors.primary }]}>{stats.new}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Contacted</Text>
          <Text style={[styles.statCardValue, { color: colors.warning }]}>{stats.contacted}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Conversion</Text>
          <Text style={[styles.statCardValue, { color: colors.success }]}>{getConversionRate()}</Text>
        </View>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or company..."
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
        </ScrollView>
      </View>

      {/* Inquiry List */}
      <FlatList
        data={inquiries}
        renderItem={renderInquiry}
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
              icon="mail-outline"
              title="No inquiries found"
              description={statusFilter === 'NEW'
                ? "All caught up! No new partner inquiries."
                : "Try adjusting your filters"}
            />
          ) : null
        }
      />

      {/* Inquiry Detail Modal */}
      <Modal visible={!!selectedInquiry} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inquiry Details</Text>
              <TouchableOpacity onPress={() => setSelectedInquiry(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.detailScrollView}>
              {selectedInquiry && (
                <View style={styles.detailContent}>
                  {/* Status Badge */}
                  <View style={styles.detailBadgeRow}>
                    <Badge text={selectedInquiry.status} variant={statusBadgeVariants[selectedInquiry.status] || 'default'} />
                    {selectedInquiry.leadchopperId && (
                      <Badge text="LeadChopper" variant="primary" />
                    )}
                  </View>

                  {/* Contact Information */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Contact Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedInquiry.name}</Text>
                    </View>
                    <TouchableOpacity style={styles.detailRow} onPress={() => openEmail(selectedInquiry.email)}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={[styles.detailValue, { color: colors.primary }]}>{selectedInquiry.email}</Text>
                    </TouchableOpacity>
                    {selectedInquiry.phone && (
                      <TouchableOpacity style={styles.detailRow} onPress={() => openPhone(selectedInquiry.phone!)}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={[styles.detailValue, { color: colors.primary }]}>{selectedInquiry.phone}</Text>
                      </TouchableOpacity>
                    )}
                    {selectedInquiry.company && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Company</Text>
                        <Text style={styles.detailValue}>{selectedInquiry.company}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Inquiry #</Text>
                      <Text style={[styles.detailValue, { fontFamily: 'monospace' }]}>{selectedInquiry.inquiryNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Submitted</Text>
                      <Text style={styles.detailValue}>{formatDateTime(selectedInquiry.createdAt)}</Text>
                    </View>
                  </View>

                  {/* Links */}
                  {(selectedInquiry.website || selectedInquiry.socialMedia) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Links</Text>
                      {selectedInquiry.website && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={() => openWebsite(selectedInquiry.website!)}
                        >
                          <Ionicons name="globe-outline" size={16} color={colors.primary} />
                          <Text style={styles.linkText}>Visit Website</Text>
                        </TouchableOpacity>
                      )}
                      {selectedInquiry.socialMedia && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Social</Text>
                          <Text style={styles.detailValue}>{selectedInquiry.socialMedia}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* How they will promote */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Audience / How They Will Promote</Text>
                    <View style={styles.textBlock}>
                      <Text style={styles.textBlockContent}>{selectedInquiry.audience}</Text>
                    </View>
                  </View>

                  {/* Why they want to join */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Reason for Partnership</Text>
                    <View style={styles.textBlock}>
                      <Text style={styles.textBlockContent}>{selectedInquiry.reason}</Text>
                    </View>
                  </View>

                  {/* LeadChopper Tracking */}
                  {selectedInquiry.leadchopperId && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>LeadChopper Tracking</Text>
                      <View style={styles.leadchopperInfo}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Lead ID</Text>
                          <Text style={[styles.detailValue, { fontFamily: 'monospace' }]}>{selectedInquiry.leadchopperId}</Text>
                        </View>
                        {selectedInquiry.leadchopperOrgId && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Org ID</Text>
                            <Text style={[styles.detailValue, { fontFamily: 'monospace' }]}>{selectedInquiry.leadchopperOrgId}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Review Notes (if already reviewed) */}
                  {selectedInquiry.reviewNotes && (selectedInquiry.status === 'APPROVED' || selectedInquiry.status === 'REJECTED') && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Review Notes</Text>
                      <View style={styles.textBlock}>
                        <Text style={styles.textBlockContent}>{selectedInquiry.reviewNotes}</Text>
                      </View>
                      {selectedInquiry.reviewedAt && (
                        <Text style={styles.reviewedAt}>
                          Reviewed on {formatDateTime(selectedInquiry.reviewedAt)}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Conversion Info */}
                  {selectedInquiry.status === 'APPROVED' && selectedInquiry.convertedAt && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Conversion</Text>
                      <View style={styles.conversionInfo}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <Text style={styles.conversionText}>
                          Converted to partner on {formatDateTime(selectedInquiry.convertedAt)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Actions (only for non-final statuses) */}
                  {selectedInquiry.status !== 'APPROVED' && selectedInquiry.status !== 'REJECTED' && (
                    <View style={styles.actionSection}>
                      <Text style={styles.detailSectionTitle}>Review</Text>
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Add notes about this inquiry (optional)..."
                        placeholderTextColor={colors.textMuted}
                        value={reviewNotes}
                        onChangeText={setReviewNotes}
                        multiline
                        numberOfLines={3}
                      />
                      <View style={styles.actionButtons}>
                        {selectedInquiry.status === 'NEW' && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.contactedButton]}
                            onPress={() => handleStatusUpdate(selectedInquiry.id, 'CONTACTED', reviewNotes)}
                            disabled={processing}
                          >
                            <Ionicons name="chatbubble-outline" size={18} color={colors.warning} />
                            <Text style={[styles.actionButtonText, { color: colors.warning }]}>
                              {processing ? 'Processing...' : 'Mark Contacted'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => handleApprove(selectedInquiry.id)}
                          disabled={processing}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>
                            {processing ? 'Processing...' : 'Approve'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectButton]}
                          onPress={() => handleReject(selectedInquiry.id)}
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

                  {/* Quick Actions */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => openEmail(selectedInquiry.email)}
                      >
                        <Ionicons name="mail-outline" size={20} color={colors.primary} />
                        <Text style={styles.quickActionText}>Send Email</Text>
                      </TouchableOpacity>
                      {selectedInquiry.phone && (
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => openPhone(selectedInquiry.phone!)}
                        >
                          <Ionicons name="call-outline" size={20} color={colors.primary} />
                          <Text style={styles.quickActionText}>Call</Text>
                        </TouchableOpacity>
                      )}
                    </View>
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
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  inquiryCard: {
    marginBottom: spacing.md,
  },
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inquiryLeft: {
    flex: 1,
  },
  inquiryInfo: {
    flex: 1,
  },
  inquiryName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  inquiryEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  companyName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  inquiryNumber: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
  },
  inquiryRight: {
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
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
    flex: 1,
    textAlign: 'right',
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
  leadchopperInfo: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  reviewedAt: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  conversionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  conversionText: {
    fontSize: fontSize.sm,
    color: colors.success,
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
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  contactedButton: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning,
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
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
})
