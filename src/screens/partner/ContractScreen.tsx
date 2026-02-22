import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { Card } from '../../components/Card'
import { StatusBadge } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface Contract {
  id: string
  title: string
  description?: string
  fileUrl?: string
  fileName?: string
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'ACTIVE'
  signedAt?: string
  signedByName?: string
  signatureUrl?: string
  countersignedAt?: string
  countersignedByName?: string
  countersignatureUrl?: string
  createdAt: string
}

interface CommissionRates {
  firstSaleRate: number
  recurringRate: number
  commissionType: string
}

interface ContractScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
}

export function ContractScreen({ navigation }: ContractScreenProps) {
  const [contract, setContract] = useState<Contract | null>(null)
  const [rates, setRates] = useState<CommissionRates | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContract = useCallback(async () => {
    try {
      setError(null)
      const data = await api.getPartnerContract()
      if (data.contract) {
        setContract(data.contract)
        setRates(data.commissionRates || null)
      } else {
        setContract(null)
      }
    } catch (err: any) {
      console.error('Failed to fetch contract:', err)
      if (err.message?.includes('No contract found') || err.message?.includes('404')) {
        setError('no_contract')
      } else {
        setError('error')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchContract()
  }, [fetchContract])

  const onRefresh = () => {
    setRefreshing(true)
    fetchContract()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'ACTIVE':
      case 'SIGNED':
        return 'success'
      case 'SENT':
        return 'warning'
      case 'DRAFT':
        return 'info'
      default:
        return 'info'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Draft'
      case 'SENT':
        return 'Awaiting Signature'
      case 'SIGNED':
        return 'Signed'
      case 'ACTIVE':
        return 'Active'
      default:
        return status
    }
  }

  const handleViewContract = () => {
    if (contract?.fileUrl) {
      // For signed contracts, use the composed PDF endpoint
      const url = (contract.signedAt || contract.countersignedAt)
        ? 'https://admin.47industries.com/api/account/partner/contract/composed-pdf'
        : contract.fileUrl
      Linking.openURL(url)
    }
  }

  const handleSignContract = () => {
    if (contract?.fileUrl) {
      // Open web portal for contract signing since mobile signature is complex
      Alert.alert(
        'Sign Contract',
        'Contract signing requires the web portal for a secure signature experience. Would you like to open the web portal?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Web Portal',
            onPress: () => Linking.openURL('https://admin.47industries.com/account/partner/contract'),
          },
        ]
      )
    }
  }

  const accentColor = portalColors.partner

  const renderContractStatus = () => {
    if (!contract) return null

    const isAwaitingSignature = contract.status === 'SENT'
    const isSigned = contract.status === 'SIGNED'
    const isActive = contract.status === 'ACTIVE'

    return (
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[
            styles.statusIcon,
            isActive ? styles.statusIconActive :
            isSigned ? styles.statusIconSigned :
            isAwaitingSignature ? styles.statusIconPending :
            styles.statusIconDraft
          ]}>
            <Ionicons
              name={
                isActive ? 'checkmark-circle' :
                isSigned ? 'checkmark-done' :
                isAwaitingSignature ? 'create-outline' :
                'document-text-outline'
              }
              size={32}
              color={
                isActive ? colors.success :
                isSigned ? colors.success :
                isAwaitingSignature ? colors.warning :
                colors.textMuted
              }
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {isActive ? 'Contract Active' :
               isSigned ? 'Awaiting Countersignature' :
               isAwaitingSignature ? 'Signature Required' :
               'Contract Draft'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isActive ? 'Your partner agreement is fully executed and active' :
               isSigned ? 'Awaiting countersignature from 47 Industries' :
               isAwaitingSignature ? 'Please review and sign your partner agreement' :
               'Your contract is being prepared'}
            </Text>
          </View>
        </View>
      </Card>
    )
  }

  const renderContractDetails = () => {
    if (!contract) return null

    return (
      <Card style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <Text style={styles.contractTitle}>{contract.title}</Text>
          <StatusBadge
            status={getStatusColor(contract.status)}
            label={getStatusText(contract.status)}
            size="sm"
          />
        </View>

        {contract.signedAt && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detailText}>
              Signed on {formatDate(contract.signedAt)}
              {contract.signedByName && ` by ${contract.signedByName}`}
            </Text>
          </View>
        )}

        {contract.createdAt && !contract.signedAt && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detailText}>
              Created on {formatDate(contract.createdAt)}
            </Text>
          </View>
        )}

        {contract.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionLabel}>Agreement Terms</Text>
            <Text style={styles.descriptionText}>{contract.description}</Text>
          </View>
        )}
      </Card>
    )
  }

  const renderSignatureSection = () => {
    if (!contract || (contract.status !== 'SIGNED' && contract.status !== 'ACTIVE')) {
      return null
    }

    return (
      <Card style={StyleSheet.flatten([styles.signatureCard, { borderColor: `${colors.success}30` }])}>
        <View style={styles.signatureHeader}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.signatureHeaderText}>
            {contract.status === 'ACTIVE' ? 'Contract Fully Executed' : 'Contract Signed'}
          </Text>
        </View>

        {/* Partner Signature */}
        <View style={styles.signatureItem}>
          <Text style={styles.signatureLabel}>Your Signature</Text>
          <View style={styles.signatureDetails}>
            <Text style={styles.signatureName}>{contract.signedByName}</Text>
            {contract.signedAt && (
              <Text style={styles.signatureDate}>{formatDate(contract.signedAt)}</Text>
            )}
          </View>
        </View>

        {/* Countersignature - Only show when ACTIVE */}
        {contract.status === 'ACTIVE' && contract.countersignedByName && (
          <View style={styles.signatureItem}>
            <Text style={styles.signatureLabel}>47 Industries</Text>
            <View style={styles.signatureDetails}>
              <Text style={styles.signatureName}>{contract.countersignedByName}</Text>
              {contract.countersignedAt && (
                <Text style={styles.signatureDate}>{formatDate(contract.countersignedAt)}</Text>
              )}
            </View>
          </View>
        )}

        {contract.status === 'SIGNED' && (
          <Text style={styles.awaitingText}>
            Awaiting countersignature from 47 Industries. You will be notified when the contract is fully executed.
          </Text>
        )}
      </Card>
    )
  }

  const renderCommissionRates = () => {
    if (!rates) return null

    return (
      <>
        <Text style={styles.sectionTitle}>Your Commission Rates</Text>
        <Card style={styles.ratesCard}>
          <View style={styles.rateItem}>
            <View style={styles.rateInfo}>
              <Text style={styles.rateLabel}>First Sale Commission</Text>
              <Text style={styles.rateDescription}>
                Applied to the first payment from a lead you refer
              </Text>
            </View>
            <Text style={[styles.rateValue, { color: accentColor }]}>{rates.firstSaleRate}%</Text>
          </View>
          <View style={styles.rateDivider} />
          <View style={styles.rateItem}>
            <View style={styles.rateInfo}>
              <Text style={styles.rateLabel}>Recurring Commission</Text>
              <Text style={styles.rateDescription}>
                Applied to all subsequent payments from the same client
              </Text>
            </View>
            <Text style={[styles.rateValue, { color: colors.purple }]}>{rates.recurringRate}%</Text>
          </View>
        </Card>
      </>
    )
  }

  const renderActions = () => {
    if (!contract) return null

    return (
      <View style={styles.actionsContainer}>
        {contract.status === 'SENT' && contract.fileUrl && (
          <TouchableOpacity
            style={[styles.signButton, { backgroundColor: colors.warning }]}
            onPress={handleSignContract}
          >
            <Ionicons name="create-outline" size={20} color="#000" />
            <Text style={styles.signButtonText}>Review & Sign Contract</Text>
          </TouchableOpacity>
        )}

        {contract.fileUrl && (
          <View style={styles.documentActions}>
            <TouchableOpacity
              style={styles.documentButton}
              onPress={handleViewContract}
            >
              <View style={styles.documentIcon}>
                <Ionicons name="document-text" size={24} color={colors.error} />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{contract.fileName || 'Partner Agreement.pdf'}</Text>
                <Text style={styles.documentType}>PDF Document</Text>
              </View>
              <View style={styles.documentActionsRight}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleViewContract}
                >
                  <Ionicons name="eye-outline" size={18} color={accentColor} />
                  <Text style={[styles.actionButtonText, { color: accentColor }]}>View</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partner Agreement</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading contract...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error === 'no_contract') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partner Agreement</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accentColor}
            />
          }
        >
          <EmptyState
            icon="document-text-outline"
            title="No Contract on File"
            description="Contact us to set up your partner agreement."
          />
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => Linking.openURL('mailto:support@47industries.com?subject=Partner%20Contract%20Request')}
          >
            <Ionicons name="mail-outline" size={18} color={accentColor} />
            <Text style={[styles.contactButtonText, { color: accentColor }]}>Contact Support</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Agreement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        {/* Sign Contract Banner - Show when status is SENT */}
        {contract?.status === 'SENT' && contract.fileUrl && (
          <Card style={StyleSheet.flatten([styles.signBanner, { borderColor: `${colors.warning}50` }])}>
            <View style={styles.signBannerIcon}>
              <Ionicons name="create-outline" size={24} color={colors.warning} />
            </View>
            <View style={styles.signBannerContent}>
              <Text style={styles.signBannerTitle}>Your signature is required</Text>
              <Text style={styles.signBannerDesc}>
                Please review the contract and sign it electronically to activate your partner agreement.
              </Text>
            </View>
          </Card>
        )}

        {renderContractStatus()}
        {renderContractDetails()}
        {renderSignatureSection()}
        {renderActions()}
        {renderCommissionRates()}

        {/* Help Section */}
        <Card style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpDesc}>
            If you have questions about your contract or commission rates, contact our partner support team.
          </Text>
          <View style={styles.helpButtons}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => Linking.openURL('https://admin.47industries.com/account/partner/contract')}
            >
              <Ionicons name="globe-outline" size={18} color={accentColor} />
              <Text style={[styles.helpButtonText, { color: accentColor }]}>Web Portal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => Linking.openURL('mailto:partners@47industries.com')}
            >
              <Ionicons name="mail-outline" size={18} color={accentColor} />
              <Text style={[styles.helpButtonText, { color: accentColor }]}>Email Support</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  contactButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  // Sign Banner
  signBanner: {
    flexDirection: 'row',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: `${colors.warning}10`,
    borderWidth: 1,
  },
  signBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signBannerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  signBannerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  signBannerDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  // Status Card
  statusCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconActive: {
    backgroundColor: `${colors.success}20`,
  },
  statusIconSigned: {
    backgroundColor: `${colors.success}20`,
  },
  statusIconPending: {
    backgroundColor: `${colors.warning}20`,
  },
  statusIconDraft: {
    backgroundColor: colors.surfaceHover,
  },
  statusInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statusTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  // Details Card
  detailsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  contractTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  descriptionSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Signature Card
  signatureCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: `${colors.success}08`,
    borderWidth: 1,
  },
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  signatureHeaderText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  signatureItem: {
    marginBottom: spacing.md,
  },
  signatureLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  signatureDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signatureName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  signatureDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  awaitingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    lineHeight: 20,
  },
  // Actions
  actionsContainer: {
    marginBottom: spacing.lg,
  },
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  signButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#000',
  },
  documentActions: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.error}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  documentName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  documentType: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  documentActionsRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  // Commission Rates
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  ratesCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  rateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  rateLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  rateDescription: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rateValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  rateDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  // Help Card
  helpCard: {
    padding: spacing.lg,
  },
  helpTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  helpDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  helpButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
  },
  helpButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
})
