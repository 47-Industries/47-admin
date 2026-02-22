import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { StatusBadge, getStatusType } from '../../components/StatusBadge'
import { EmptyState } from '../../components/EmptyState'
import { SectionHeader } from '../../components/SectionHeader'
import { colors, portalColors, spacing, borderRadius, fontSize, fontWeight } from '../../theme'

interface BillingScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

interface BillingHistory {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  paidAt: string | null
  receiptUrl: string | null
  createdAt: string
}

interface BillingData {
  paymentMethods: PaymentMethod[]
  autopayEnabled: boolean
  defaultMethodId: string | null
  outstandingBalance: number
  billingHistory: BillingHistory[]
  nextPaymentDate: string | null
  nextPaymentAmount: number | null
}

const CARD_BRAND_ICONS: Record<string, string> = {
  visa: 'card',
  mastercard: 'card',
  amex: 'card',
  discover: 'card',
  default: 'card-outline',
}

export function BillingScreen({ navigation, hideHeader }: BillingScreenProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [togglingAutopay, setTogglingAutopay] = useState(false)
  const [removingPaymentMethod, setRemovingPaymentMethod] = useState<string | null>(null)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)

  const fetchBillingData = useCallback(async () => {
    try {
      const [paymentMethodsRes, billingHistoryRes, billingRes] = await Promise.all([
        api.getClientPaymentMethods(),
        api.getClientBillingHistory(),
        api.getClientBilling(),
      ])

      setBillingData({
        paymentMethods: paymentMethodsRes.paymentMethods || [],
        autopayEnabled: billingRes.autopayEnabled,
        defaultMethodId: billingRes.defaultMethod,
        outstandingBalance: paymentMethodsRes.outstandingBalance || 0,
        billingHistory: billingHistoryRes.payments || [],
        nextPaymentDate: paymentMethodsRes.nextPaymentDate || null,
        nextPaymentAmount: paymentMethodsRes.nextPaymentAmount || null,
      })
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchBillingData()
  }, [fetchBillingData])

  const onRefresh = () => {
    setRefreshing(true)
    fetchBillingData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleAddPaymentMethod = async () => {
    try {
      const { setupUrl } = await api.getClientPaymentSetupUrl()
      if (setupUrl) {
        await Linking.openURL(setupUrl)
      }
    } catch (error) {
      console.error('Failed to get payment setup URL:', error)
      Alert.alert('Error', 'Failed to open payment setup. Please try again.')
    }
  }

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    setSettingDefault(methodId)
    try {
      await api.setDefaultPaymentMethod(methodId)
      setBillingData((prev) =>
        prev
          ? {
              ...prev,
              defaultMethodId: methodId,
              paymentMethods: prev.paymentMethods.map((pm) => ({
                ...pm,
                isDefault: pm.id === methodId,
              })),
            }
          : null
      )
    } catch (error) {
      console.error('Failed to set default payment method:', error)
      Alert.alert('Error', 'Failed to set default payment method. Please try again.')
    } finally {
      setSettingDefault(null)
    }
  }

  const handleRemovePaymentMethod = async (methodId: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingPaymentMethod(methodId)
            try {
              await api.removePaymentMethod(methodId)
              setBillingData((prev) =>
                prev
                  ? {
                      ...prev,
                      paymentMethods: prev.paymentMethods.filter((pm) => pm.id !== methodId),
                      defaultMethodId:
                        prev.defaultMethodId === methodId ? null : prev.defaultMethodId,
                    }
                  : null
              )
            } catch (error) {
              console.error('Failed to remove payment method:', error)
              Alert.alert('Error', 'Failed to remove payment method. Please try again.')
            } finally {
              setRemovingPaymentMethod(null)
            }
          },
        },
      ]
    )
  }

  const handleToggleAutopay = async (enabled: boolean) => {
    if (!billingData?.paymentMethods.length && enabled) {
      Alert.alert(
        'No Payment Method',
        'Please add a payment method before enabling autopay.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Payment Method', onPress: handleAddPaymentMethod },
        ]
      )
      return
    }

    setTogglingAutopay(true)
    try {
      await api.toggleAutopay(enabled)
      setBillingData((prev) => (prev ? { ...prev, autopayEnabled: enabled } : null))
    } catch (error) {
      console.error('Failed to toggle autopay:', error)
      Alert.alert('Error', 'Failed to update autopay setting. Please try again.')
    } finally {
      setTogglingAutopay(false)
    }
  }

  const handleDownloadReceipt = async (receiptUrl: string | null) => {
    if (!receiptUrl) {
      Alert.alert('No Receipt', 'Receipt is not available for this payment.')
      return
    }
    try {
      await Linking.openURL(receiptUrl)
    } catch (error) {
      console.error('Failed to open receipt:', error)
      Alert.alert('Error', 'Failed to open receipt. Please try again.')
    }
  }

  const getDefaultPaymentMethod = () => {
    return billingData?.paymentMethods.find((pm) => pm.isDefault || pm.id === billingData.defaultMethodId)
  }

  const accentColor = portalColors.client

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
          <Text style={styles.headerTitle}>Billing</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >
        {/* Outstanding Balance */}
        {billingData && billingData.outstandingBalance > 0 && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Outstanding Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(billingData.outstandingBalance)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.payNowButton}
              onPress={() => navigation.navigate('Invoices')}
            >
              <Ionicons name="card-outline" size={18} color={colors.text} />
              <Text style={styles.payNowText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Payment Methods"
            actionLabel="Add"
            onAction={handleAddPaymentMethod}
          />

          {billingData?.paymentMethods.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="card-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Payment Methods</Text>
              <Text style={styles.emptyDescription}>
                Add a payment method to enable autopay and faster checkout
              </Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddPaymentMethod}>
                <Ionicons name="add" size={18} color={colors.text} />
                <Text style={styles.addButtonText}>Add Payment Method</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {billingData?.paymentMethods.map((method) => (
                <View key={method.id} style={styles.paymentMethodCard}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      name={CARD_BRAND_ICONS[method.brand.toLowerCase()] || CARD_BRAND_ICONS.default as any}
                      size={24}
                      color={colors.textMuted}
                    />
                  </View>
                  <View style={styles.cardDetails}>
                    <Text style={styles.cardBrand}>
                      {method.brand.toUpperCase()} **** {method.last4}
                    </Text>
                    <Text style={styles.cardExpiry}>
                      Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    {method.isDefault || method.id === billingData?.defaultMethodId ? (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.setDefaultButton}
                        onPress={() => handleSetDefaultPaymentMethod(method.id)}
                        disabled={settingDefault === method.id}
                      >
                        {settingDefault === method.id ? (
                          <ActivityIndicator size="small" color={accentColor} />
                        ) : (
                          <Text style={[styles.setDefaultText, { color: accentColor }]}>
                            Set Default
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemovePaymentMethod(method.id)}
                      disabled={removingPaymentMethod === method.id}
                    >
                      {removingPaymentMethod === method.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Autopay Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Autopay</Text>
          </View>

          <View style={styles.autopayCard}>
            <View style={styles.autopayInfo}>
              <Text style={styles.autopayTitle}>Automatic Payments</Text>
              <Text style={styles.autopayDescription}>
                Automatically pay invoices when they are due
              </Text>
            </View>
            <Switch
              value={billingData?.autopayEnabled || false}
              onValueChange={handleToggleAutopay}
              disabled={togglingAutopay}
              trackColor={{ false: colors.border, true: `${accentColor}80` }}
              thumbColor={billingData?.autopayEnabled ? accentColor : colors.textMuted}
            />
          </View>

          {billingData?.autopayEnabled && (
            <View style={styles.autopayActiveCard}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <View style={styles.autopayActiveInfo}>
                <Text style={styles.autopayActiveTitle}>Autopay is active</Text>
                {getDefaultPaymentMethod() && (
                  <Text style={styles.autopayActiveDescription}>
                    Using {getDefaultPaymentMethod()?.brand.toUpperCase()} ****{' '}
                    {getDefaultPaymentMethod()?.last4}
                  </Text>
                )}
              </View>
            </View>
          )}

          {billingData?.nextPaymentDate && billingData?.autopayEnabled && (
            <View style={styles.upcomingPaymentCard}>
              <Ionicons name="calendar-outline" size={20} color={colors.warning} />
              <View style={styles.upcomingPaymentInfo}>
                <Text style={styles.upcomingPaymentTitle}>Upcoming Charge</Text>
                <Text style={styles.upcomingPaymentDescription}>
                  {formatCurrency(billingData.nextPaymentAmount || 0)} on{' '}
                  {formatDate(billingData.nextPaymentDate)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Billing History Section */}
        <View style={styles.section}>
          <SectionHeader title="Billing History" />

          {billingData?.billingHistory.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No billing history"
              description="Your payment history will appear here"
            />
          ) : (
            <View style={styles.historyList}>
              {billingData?.billingHistory.map((payment) => (
                <View key={payment.id} style={styles.historyCard}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyInvoice}>#{payment.invoiceNumber}</Text>
                    <Text style={styles.historyDate}>
                      {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>{formatCurrency(payment.amount)}</Text>
                    <View style={styles.historyActions}>
                      <StatusBadge
                        status={getStatusType(payment.status)}
                        label={payment.status}
                        size="sm"
                      />
                      {payment.receiptUrl && (
                        <TouchableOpacity
                          style={styles.receiptButton}
                          onPress={() => handleDownloadReceipt(payment.receiptUrl)}
                        >
                          <Ionicons name="download-outline" size={16} color={accentColor} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
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
  placeholder: {
    width: 40,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningBg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  payNowText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: portalColors.client,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  cardsList: {
    marginHorizontal: spacing.lg,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  cardIconContainer: {
    width: 48,
    height: 32,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardDetails: {
    flex: 1,
  },
  cardBrand: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardExpiry: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  defaultBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  setDefaultButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  setDefaultText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  removeButton: {
    padding: spacing.xs,
  },
  autopayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  autopayInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  autopayTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  autopayDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  autopayActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
  },
  autopayActiveInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  autopayActiveTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  autopayActiveDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  upcomingPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  upcomingPaymentInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  upcomingPaymentTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  upcomingPaymentDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  historyList: {
    marginHorizontal: spacing.lg,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  historyInfo: {
    flex: 1,
  },
  historyInvoice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  historyDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  receiptButton: {
    padding: spacing.xs,
  },
})
