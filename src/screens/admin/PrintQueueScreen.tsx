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
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { StatCard } from '../../components/StatCard'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

// Print Queue Job interface
interface PrintQueueJob {
  id: string
  jobNumber: string
  orderId: string | null
  orderNumber: string | null
  productName: string
  productImage: string | null
  quantity: number
  status: 'PENDING' | 'PRINTING' | 'COMPLETED' | 'FAILED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  material: string | null
  color: string | null
  finish: string | null
  fileUrl: string | null
  fileName: string | null
  printSettings: Record<string, unknown> | null
  notes: string | null
  failureReason: string | null
  customerName: string
  customerEmail: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface PrintQueueStats {
  total: number
  pending: number
  printing: number
  completedToday: number
  failed: number
}

type FilterTab = 'all' | 'pending' | 'printing' | 'completed' | 'failed'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'primary' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  PRINTING: { label: 'Printing', variant: 'primary' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'error' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: colors.textMuted },
  NORMAL: { label: 'Normal', color: colors.textSecondary },
  HIGH: { label: 'High', color: colors.warning },
  URGENT: { label: 'Urgent', color: colors.error },
}

export function PrintQueueScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [jobs, setJobs] = useState<PrintQueueJob[]>([])
  const [stats, setStats] = useState<PrintQueueStats>({
    total: 0,
    pending: 0,
    printing: 0,
    completedToday: 0,
    failed: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedJob, setSelectedJob] = useState<PrintQueueJob | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showFailModal, setShowFailModal] = useState(false)
  const [failureReason, setFailureReason] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchQueue = useCallback(async () => {
    try {
      const data = await api.getPrintQueue({
        status: filter === 'all' ? undefined : filter.toUpperCase(),
        search: search || undefined,
      })
      setJobs(data.jobs || [])
      setStats(data.stats || {
        total: 0,
        pending: 0,
        printing: 0,
        completedToday: 0,
        failed: 0,
      })
    } catch (error) {
      console.error('Error fetching print queue:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter, search])

  useEffect(() => {
    setLoading(true)
    fetchQueue()
  }, [fetchQueue])

  const onRefresh = () => {
    setRefreshing(true)
    fetchQueue()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleUpdateStatus = async (jobId: string, status: 'PENDING' | 'PRINTING' | 'COMPLETED' | 'FAILED', reason?: string) => {
    setUpdating(true)
    try {
      await api.updatePrintQueueJob(jobId, { status, failureReason: reason })
      Alert.alert('Success', `Job status updated to ${status.toLowerCase()}`)
      setShowDetailModal(false)
      setShowFailModal(false)
      setFailureReason('')
      fetchQueue()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update job status')
    } finally {
      setUpdating(false)
    }
  }

  const handleRequeue = async (jobId: string) => {
    Alert.alert(
      'Requeue Job',
      'Are you sure you want to requeue this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Requeue',
          onPress: async () => {
            setUpdating(true)
            try {
              await api.updatePrintQueueJob(jobId, { status: 'PENDING', failureReason: null })
              Alert.alert('Success', 'Job has been requeued')
              setShowDetailModal(false)
              fetchQueue()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to requeue job')
            } finally {
              setUpdating(false)
            }
          },
        },
      ]
    )
  }

  const handleSubmitToPrinter = async (jobId: string) => {
    Alert.alert(
      'Submit to Printer',
      'Submit this job to the printer service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setUpdating(true)
            try {
              await api.submitPrintJob(jobId)
              Alert.alert('Success', 'Job submitted to printer service')
              setShowDetailModal(false)
              fetchQueue()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to submit job')
            } finally {
              setUpdating(false)
            }
          },
        },
      ]
    )
  }

  const handleViewOrder = (orderId: string | null) => {
    if (orderId) {
      setShowDetailModal(false)
      navigation.navigate('OrderDetail', { id: orderId })
    }
  }

  const handleOpenFile = async (fileUrl: string | null) => {
    if (fileUrl) {
      try {
        await Linking.openURL(fileUrl)
      } catch (error) {
        Alert.alert('Error', 'Unable to open file')
      }
    }
  }

  const openJobDetail = (job: PrintQueueJob) => {
    setSelectedJob(job)
    setShowDetailModal(true)
  }

  const openFailModal = () => {
    setFailureReason('')
    setShowFailModal(true)
  }

  const submitFailure = () => {
    if (!failureReason.trim()) {
      Alert.alert('Error', 'Please provide a failure reason')
      return
    }
    if (selectedJob) {
      handleUpdateStatus(selectedJob.id, 'FAILED', failureReason)
    }
  }

  const filteredJobs = jobs

  const renderFilterTab = (tab: FilterTab, label: string, count?: number) => (
    <TouchableOpacity
      style={[styles.filterTab, filter === tab && styles.filterTabActive]}
      onPress={() => setFilter(tab)}
    >
      <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
        {label}
        {count !== undefined && count > 0 ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  )

  const renderJob = ({ item }: { item: PrintQueueJob }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING
    const priorityConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.NORMAL

    return (
      <TouchableOpacity onPress={() => openJobDetail(item)} activeOpacity={0.7}>
        <Card style={styles.jobCard}>
          <View style={styles.jobHeader}>
            <View style={styles.jobInfo}>
              <View style={styles.jobIdRow}>
                <Text style={styles.jobNumber}>#{item.jobNumber}</Text>
                {item.priority !== 'NORMAL' && (
                  <View style={[styles.priorityBadge, { backgroundColor: `${priorityConfig.color}20` }]}>
                    <Ionicons
                      name={item.priority === 'URGENT' ? 'alert-circle' : 'flag'}
                      size={12}
                      color={priorityConfig.color}
                    />
                    <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                      {priorityConfig.label}
                    </Text>
                  </View>
                )}
              </View>
              {item.orderNumber && (
                <Text style={styles.orderRef}>Order #{item.orderNumber}</Text>
              )}
            </View>
            <Badge text={statusConfig.label} variant={statusConfig.variant} />
          </View>

          <View style={styles.productRow}>
            {item.productImage ? (
              <Image source={{ uri: item.productImage }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>
              <Text style={styles.productMeta}>Qty: {item.quantity}</Text>
            </View>
          </View>

          <View style={styles.jobFooter}>
            <View style={styles.customerInfo}>
              <Ionicons name="person-outline" size={14} color={colors.textMuted} />
              <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
            </View>
            <Text style={styles.jobDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <StatCard
          title="Total Jobs"
          value={stats.total}
          icon="layers-outline"
          compact
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon="time-outline"
          iconColor={colors.warning}
          compact
        />
        <StatCard
          title="Printing"
          value={stats.printing}
          icon="print-outline"
          iconColor={colors.primary}
          compact
        />
        <StatCard
          title="Completed Today"
          value={stats.completedToday}
          icon="checkmark-circle-outline"
          iconColor={colors.success}
          compact
        />
      </ScrollView>
    </View>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Print Queue</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Header */}
      {renderStats()}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
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

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {renderFilterTab('all', 'All')}
        {renderFilterTab('pending', 'Pending', stats.pending)}
        {renderFilterTab('printing', 'Printing', stats.printing)}
        {renderFilterTab('completed', 'Completed')}
        {renderFilterTab('failed', 'Failed', stats.failed)}
      </ScrollView>

      {/* Job List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading queue...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJob}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="print-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No jobs found</Text>
            </View>
          }
        />
      )}

      {/* Job Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedJob && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Job #{selectedJob.jobNumber}</Text>
                    <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalStatusRow}>
                    <Badge
                      text={STATUS_CONFIG[selectedJob.status]?.label || selectedJob.status}
                      variant={STATUS_CONFIG[selectedJob.status]?.variant || 'default'}
                    />
                    {selectedJob.priority !== 'NORMAL' && (
                      <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_CONFIG[selectedJob.priority]?.color || colors.textMuted}20` }]}>
                        <Text style={[styles.priorityText, { color: PRIORITY_CONFIG[selectedJob.priority]?.color || colors.textMuted }]}>
                          {PRIORITY_CONFIG[selectedJob.priority]?.label || selectedJob.priority}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Order Info */}
                  {selectedJob.orderNumber && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Order Information</Text>
                      <Card style={styles.detailCard}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Order #</Text>
                          <TouchableOpacity onPress={() => handleViewOrder(selectedJob.orderId)}>
                            <Text style={[styles.detailValue, { color: colors.primary }]}>
                              {selectedJob.orderNumber}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Customer</Text>
                          <Text style={styles.detailValue}>{selectedJob.customerName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Email</Text>
                          <Text style={styles.detailValue}>{selectedJob.customerEmail}</Text>
                        </View>
                      </Card>
                    </View>
                  )}

                  {/* Product Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Product</Text>
                    <Card style={styles.detailCard}>
                      <View style={styles.productDetailRow}>
                        {selectedJob.productImage ? (
                          <Image source={{ uri: selectedJob.productImage }} style={styles.productDetailImage} />
                        ) : (
                          <View style={styles.productDetailImagePlaceholder}>
                            <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
                          </View>
                        )}
                        <View style={styles.productDetailInfo}>
                          <Text style={styles.productDetailName}>{selectedJob.productName}</Text>
                          <Text style={styles.productDetailQty}>Quantity: {selectedJob.quantity}</Text>
                        </View>
                      </View>
                    </Card>
                  </View>

                  {/* Specs */}
                  {(selectedJob.material || selectedJob.color || selectedJob.finish) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Specifications</Text>
                      <Card style={styles.detailCard}>
                        {selectedJob.material && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Material</Text>
                            <Text style={styles.detailValue}>{selectedJob.material}</Text>
                          </View>
                        )}
                        {selectedJob.color && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Color</Text>
                            <Text style={styles.detailValue}>{selectedJob.color}</Text>
                          </View>
                        )}
                        {selectedJob.finish && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Finish</Text>
                            <Text style={styles.detailValue}>{selectedJob.finish}</Text>
                          </View>
                        )}
                      </Card>
                    </View>
                  )}

                  {/* File Info */}
                  {selectedJob.fileUrl && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Print File</Text>
                      <TouchableOpacity onPress={() => handleOpenFile(selectedJob.fileUrl)}>
                        <Card style={styles.fileCard}>
                          <Ionicons name="document-outline" size={24} color={colors.primary} />
                          <Text style={styles.fileName} numberOfLines={1}>
                            {selectedJob.fileName || 'Download File'}
                          </Text>
                          <Ionicons name="download-outline" size={20} color={colors.primary} />
                        </Card>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Print Settings */}
                  {selectedJob.printSettings && Object.keys(selectedJob.printSettings).length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Print Settings</Text>
                      <Card style={styles.detailCard}>
                        {Object.entries(selectedJob.printSettings).map(([key, value]) => (
                          <View key={key} style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{key}</Text>
                            <Text style={styles.detailValue}>{String(value)}</Text>
                          </View>
                        ))}
                      </Card>
                    </View>
                  )}

                  {/* Notes */}
                  {selectedJob.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Notes</Text>
                      <Card style={styles.notesCard}>
                        <Text style={styles.notesText}>{selectedJob.notes}</Text>
                      </Card>
                    </View>
                  )}

                  {/* Failure Reason */}
                  {selectedJob.status === 'FAILED' && selectedJob.failureReason && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Failure Reason</Text>
                      <Card style={styles.failureCard}>
                        <Ionicons name="alert-circle" size={20} color={colors.error} />
                        <Text style={styles.failureText}>{selectedJob.failureReason}</Text>
                      </Card>
                    </View>
                  )}

                  {/* Timestamps */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Timeline</Text>
                    <Card style={styles.detailCard}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Created</Text>
                        <Text style={styles.detailValue}>{formatDateTime(selectedJob.createdAt)}</Text>
                      </View>
                      {selectedJob.startedAt && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Started</Text>
                          <Text style={styles.detailValue}>{formatDateTime(selectedJob.startedAt)}</Text>
                        </View>
                      )}
                      {selectedJob.completedAt && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Completed</Text>
                          <Text style={styles.detailValue}>{formatDateTime(selectedJob.completedAt)}</Text>
                        </View>
                      )}
                    </Card>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsSection}>
                    {selectedJob.status === 'PENDING' && (
                      <>
                        <Button
                          title="Start Printing"
                          onPress={() => handleUpdateStatus(selectedJob.id, 'PRINTING')}
                          loading={updating}
                          style={styles.actionButton}
                        />
                        <Button
                          title="Submit to Printer Service"
                          variant="secondary"
                          onPress={() => handleSubmitToPrinter(selectedJob.id)}
                          loading={updating}
                          style={styles.actionButton}
                        />
                      </>
                    )}
                    {selectedJob.status === 'PRINTING' && (
                      <>
                        <Button
                          title="Mark as Completed"
                          onPress={() => handleUpdateStatus(selectedJob.id, 'COMPLETED')}
                          loading={updating}
                          style={styles.actionButton}
                        />
                        <Button
                          title="Mark as Failed"
                          variant="danger"
                          onPress={openFailModal}
                          loading={updating}
                          style={styles.actionButton}
                        />
                      </>
                    )}
                    {(selectedJob.status === 'FAILED' || selectedJob.status === 'COMPLETED') && (
                      <Button
                        title="Requeue Job"
                        variant="secondary"
                        onPress={() => handleRequeue(selectedJob.id)}
                        loading={updating}
                        style={styles.actionButton}
                      />
                    )}
                    {selectedJob.orderId && (
                      <Button
                        title="View Order"
                        variant="outline"
                        onPress={() => handleViewOrder(selectedJob.orderId)}
                        style={styles.actionButton}
                      />
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Failure Reason Modal */}
      <Modal visible={showFailModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.failModalContent}>
            <Text style={styles.failModalTitle}>Mark as Failed</Text>
            <Text style={styles.failModalSubtitle}>Please provide a reason for the failure:</Text>
            <TextInput
              style={styles.failInput}
              placeholder="Enter failure reason..."
              placeholderTextColor={colors.textMuted}
              value={failureReason}
              onChangeText={setFailureReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.failModalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowFailModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Submit"
                variant="danger"
                onPress={submitFailure}
                loading={updating}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    padding: spacing.xs,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statsContainer: {
    paddingVertical: spacing.md,
  },
  statsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
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
  filterContainer: {
    maxHeight: 48,
    marginBottom: spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  filterTabTextActive: {
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  jobCard: {
    marginBottom: spacing.md,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  jobInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  jobIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  jobNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  orderRef: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
  },
  productImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  productMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  jobDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailCard: {
    padding: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  productDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productDetailImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
  },
  productDetailImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetailInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productDetailName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  productDetailQty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  fileName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  notesCard: {
    padding: spacing.lg,
    backgroundColor: colors.warningBg,
    borderColor: colors.warning,
  },
  notesText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  failureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
    gap: spacing.sm,
  },
  failureText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.error,
    lineHeight: 22,
  },
  actionsSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  // Failure Modal
  failModalContent: {
    backgroundColor: colors.surface,
    margin: spacing.xl,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  failModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  failModalSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  failInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 100,
    marginBottom: spacing.lg,
  },
  failModalButtons: {
    flexDirection: 'row',
  },
})

export default PrintQueueScreen
