import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Linking,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface Amendment {
  id: string
  amendmentNumber: string
  title: string
  description?: string
  additionalValue: number
  additionalMonthlyValue?: number
  fileUrl?: string
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'ACTIVE'
  signedAt?: string
  signedByName?: string
  countersignedAt?: string
  countersignedByName?: string
  createdAt: string
  clientContract?: {
    id: string
    title: string
    contractNumber: string
  }
}

interface Contract {
  id: string
  contractNumber: string
  title: string
  description?: string
  totalValue: number
  monthlyValue?: number
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  signedAt?: string
  signedByName?: string
  signatureUrl?: string
  countersignedAt?: string
  countersignedByName?: string
  countersignatureUrl?: string
  fileUrl?: string
  createdAt: string
  startDate?: string
  endDate?: string
}

interface ContractsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

const statusFilters = ['ALL', 'SENT', 'SIGNED', 'ACTIVE', 'COMPLETED']

export function ContractsScreen({ navigation, hideHeader }: ContractsScreenProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [amendments, setAmendments] = useState<Amendment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAmendmentsModal, setShowAmendmentsModal] = useState(false)

  const fetchContracts = async () => {
    try {
      const params = activeFilter === 'ALL' ? {} : { status: activeFilter }
      const data = await api.getClientContracts(params)
      setContracts(data.contracts)
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchAmendments = async () => {
    try {
      const data = await api.getClientAmendments()
      setAmendments(data.amendments)
    } catch (error) {
      console.error('Failed to fetch amendments:', error)
    }
  }

  useEffect(() => {
    fetchContracts()
    fetchAmendments()
  }, [activeFilter])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchContracts()
    fetchAmendments()
  }, [activeFilter])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      DRAFT: 'Draft',
      SENT: 'Awaiting Signature',
      SIGNED: 'Awaiting Countersignature',
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    }
    return texts[status] || status
  }

  const handleViewPdf = async (contract: Contract) => {
    if (!contract.fileUrl) {
      Alert.alert('No PDF Available', 'This contract does not have a PDF attached.')
      return
    }

    try {
      const supported = await Linking.canOpenURL(contract.fileUrl)
      if (supported) {
        await Linking.openURL(contract.fileUrl)
      } else {
        Alert.alert('Cannot Open PDF', 'Unable to open the contract PDF.')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the contract PDF.')
    }
  }

  const handleSignContract = async (contract: Contract) => {
    if (!contract.fileUrl) {
      Alert.alert('Cannot Sign', 'This contract does not have a document to sign.')
      return
    }

    // Open the web signing page in browser
    const signingUrl = `https://47industries.com/account/client/contracts?sign=${contract.id}`
    try {
      await Linking.openURL(signingUrl)
    } catch (error) {
      Alert.alert('Error', 'Failed to open the signing page.')
    }
  }

  const handleViewAmendments = (contract: Contract) => {
    setSelectedContract(contract)
    setShowAmendmentsModal(true)
  }

  const contractAmendments = selectedContract
    ? amendments.filter(a => a.clientContract?.id === selectedContract.id)
    : []

  const contractsNeedingSignature = contracts.filter(c => c.status === 'SENT' && c.fileUrl)
  const amendmentsNeedingSignature = amendments.filter(a => a.status === 'SENT' && a.fileUrl)

  const renderContract = ({ item }: { item: Contract }) => {
    const hasAmendments = amendments.some(a => a.clientContract?.id === item.id)
    const needsSignature = item.status === 'SENT' && item.fileUrl

    return (
      <TouchableOpacity
        style={[styles.contractCard, needsSignature && styles.contractCardNeedsSignature]}
        onPress={() => {
          setSelectedContract(item)
          setShowDetailModal(true)
        }}
      >
        <View style={styles.contractHeader}>
          <View style={styles.contractNumber}>
            <Ionicons name="document-text-outline" size={20} color={portalColors.client} />
            <Text style={styles.contractNumberText}>{item.contractNumber}</Text>
          </View>
          <StatusBadge
            status={getStatusType(item.status)}
            label={getStatusText(item.status)}
            size="sm"
          />
        </View>

        <Text style={styles.contractTitle}>{item.title}</Text>

        {item.description && (
          <Text style={styles.contractDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.contractValue}>
          <Text style={styles.valueLabel}>Contract Value</Text>
          <Text style={styles.valueAmount}>{formatCurrency(Number(item.totalValue))}</Text>
          {item.monthlyValue && Number(item.monthlyValue) > 0 && (
            <Text style={styles.monthlyValue}>+{formatCurrency(Number(item.monthlyValue))}/mo</Text>
          )}
        </View>

        <View style={styles.contractFooter}>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Effective</Text>
            <Text style={styles.dateValue}>
              {item.startDate ? formatDate(item.startDate) : formatDate(item.createdAt)}
              {item.endDate && ` - ${formatDate(item.endDate)}`}
            </Text>
          </View>
          {hasAmendments && (
            <View style={styles.amendmentBadge}>
              <Ionicons name="git-branch-outline" size={14} color={colors.textMuted} />
              <Text style={styles.amendmentBadgeText}>Has Amendments</Text>
            </View>
          )}
        </View>

        {needsSignature && (
          <TouchableOpacity
            style={styles.signButton}
            onPress={() => handleSignContract(item)}
          >
            <Ionicons name="create-outline" size={16} color="#000" />
            <Text style={styles.signButtonText}>Review & Sign</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  const renderContractDetailModal = () => {
    if (!selectedContract) return null

    const contract = selectedContract
    const relatedAmendments = amendments.filter(a => a.clientContract?.id === contract.id)

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Contract Details</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.detailSection}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailContractNumber}>{contract.contractNumber}</Text>
                <StatusBadge
                  status={getStatusType(contract.status)}
                  label={getStatusText(contract.status)}
                />
              </View>
              <Text style={styles.detailTitle}>{contract.title}</Text>
              {contract.description && (
                <Text style={styles.detailDescription}>{contract.description}</Text>
              )}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Financial Terms</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Value</Text>
                <Text style={styles.detailValueHighlight}>
                  {formatCurrency(Number(contract.totalValue))}
                </Text>
              </View>
              {contract.monthlyValue && Number(contract.monthlyValue) > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Monthly Recurring</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(Number(contract.monthlyValue))}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Dates</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{formatDate(contract.createdAt)}</Text>
              </View>
              {contract.startDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start Date</Text>
                  <Text style={styles.detailValue}>{formatDate(contract.startDate)}</Text>
                </View>
              )}
              {contract.endDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>End Date</Text>
                  <Text style={styles.detailValue}>{formatDate(contract.endDate)}</Text>
                </View>
              )}
            </View>

            {(contract.status === 'SIGNED' || contract.status === 'ACTIVE' || contract.status === 'COMPLETED') && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Signatures</Text>
                {contract.signedByName && (
                  <View style={styles.signatureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <View style={styles.signatureInfo}>
                      <Text style={styles.signatureName}>{contract.signedByName}</Text>
                      <Text style={styles.signatureDate}>
                        Signed {formatDate(contract.signedAt)}
                      </Text>
                    </View>
                  </View>
                )}
                {contract.countersignedByName && (
                  <View style={styles.signatureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <View style={styles.signatureInfo}>
                      <Text style={styles.signatureName}>{contract.countersignedByName}</Text>
                      <Text style={styles.signatureDate}>
                        Countersigned {formatDate(contract.countersignedAt)}
                      </Text>
                    </View>
                  </View>
                )}
                {contract.status === 'SIGNED' && !contract.countersignedByName && (
                  <View style={styles.pendingSignature}>
                    <Ionicons name="time-outline" size={16} color={colors.warning} />
                    <Text style={styles.pendingSignatureText}>
                      Awaiting countersignature from 47 Industries
                    </Text>
                  </View>
                )}
              </View>
            )}

            {relatedAmendments.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Amendments ({relatedAmendments.length})</Text>
                {relatedAmendments.map((amendment) => (
                  <View key={amendment.id} style={styles.amendmentItem}>
                    <View style={styles.amendmentHeader}>
                      <Text style={styles.amendmentNumber}>{amendment.amendmentNumber}</Text>
                      <StatusBadge
                        status={getStatusType(amendment.status)}
                        label={amendment.status}
                        size="sm"
                      />
                    </View>
                    <Text style={styles.amendmentTitle}>{amendment.title}</Text>
                    <Text style={styles.amendmentValue}>
                      +{formatCurrency(Number(amendment.additionalValue))}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionButtons}>
              {contract.fileUrl && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewPdf(contract)}
                >
                  <Ionicons name="document-outline" size={20} color={colors.text} />
                  <Text style={styles.actionButtonText}>View PDF</Text>
                </TouchableOpacity>
              )}
              {contract.status === 'SENT' && contract.fileUrl && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={() => {
                    setShowDetailModal(false)
                    handleSignContract(contract)
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#000" />
                  <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                    Review & Sign
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contracts</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      {/* Signature Required Banner */}
      {(contractsNeedingSignature.length > 0 || amendmentsNeedingSignature.length > 0) && (
        <View style={styles.signatureBanner}>
          <View style={styles.signatureBannerIcon}>
            <Ionicons name="create-outline" size={24} color={colors.warning} />
          </View>
          <View style={styles.signatureBannerContent}>
            <Text style={styles.signatureBannerTitle}>
              {contractsNeedingSignature.length + amendmentsNeedingSignature.length === 1
                ? 'Document requires your signature'
                : `${contractsNeedingSignature.length + amendmentsNeedingSignature.length} documents require your signature`}
            </Text>
            <Text style={styles.signatureBannerText}>
              Review and sign to proceed with your services
            </Text>
          </View>
        </View>
      )}

      {/* Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={statusFilters}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                {item === 'ALL' ? 'All' : getStatusText(item)}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
      </View>

      <FlatList
        data={contracts}
        renderItem={renderContract}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={portalColors.client} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="document-text-outline"
              title="No contracts found"
              description="Your service contracts will appear here"
            />
          ) : null
        }
      />

      {renderContractDetailModal()}
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
  signatureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
    padding: spacing.md,
    gap: spacing.md,
  },
  signatureBannerIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureBannerContent: {
    flex: 1,
  },
  signatureBannerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  signatureBannerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: portalColors.client,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.text,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  contractCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  contractCardNeedsSignature: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  contractNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contractNumberText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  contractTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  contractDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  contractValue: {
    marginBottom: spacing.md,
  },
  valueLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  valueAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  monthlyValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  contractFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {},
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dateValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  amendmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amendmentBadgeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  signButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#000',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  detailSection: {
    marginBottom: spacing.xl,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailContractNumber: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
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
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  detailValueHighlight: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: portalColors.client,
  },
  signatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  signatureInfo: {},
  signatureName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  signatureDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  pendingSignature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  pendingSignatureText: {
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  amendmentItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  amendmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  amendmentNumber: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  amendmentTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  amendmentValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  actionButton: {
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
  actionButtonPrimary: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  actionButtonTextPrimary: {
    color: '#000',
  },
})
