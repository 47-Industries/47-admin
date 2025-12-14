import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, TextInput, ActionSheetIOS, Platform, Image, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { useAuthStore } from '../store/auth'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface Founder {
  id: string
  name: string | null
  email: string | null
  image?: string
}

interface FounderBalance {
  founder: Founder
  pendingAmount: number
  pendingCount: number
  paidAmount: number
  paidCount: number
  owesFor: string[]
}

interface FounderPayment {
  id: string
  amount: number
  status: string
  paidDate: string | null
  user: { id: string; name: string | null; email: string }
}

interface BillInstance {
  id: string
  vendor: string
  vendorType: string
  amount: number
  dueDate: string | null
  period: string | null
  status: string
  paidDate: string | null
  paidVia: string | null
  founderCount: number
  perPersonAmount: number
  recurringBill?: { name: string; paymentMethod: string | null }
  founderPayments?: FounderPayment[]
}

interface ExpensesSummary {
  period: string
  founderCount: number
  bills: {
    pending: BillInstance[]
    paid: BillInstance[]
    overdue: BillInstance[]
    all: BillInstance[]
  }
  founderBalances: FounderBalance[]
  totalOutstanding: number
  totals: {
    pending: number
    paid: number
    overdue: number
    monthlyTotal: number
  }
  upcomingBills: BillInstance[]
  upcomingCount: number
}

const VENDOR_TYPES = [
  { value: 'RENT', label: 'Rent' },
  { value: 'UTILITY', label: 'Utility' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OTHER', label: 'Other' }
]

type TabKey = 'monthly' | 'balances'

export function ExpensesScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabKey>('monthly')
  const [summary, setSummary] = useState<ExpensesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState(() => new Date().toISOString().slice(0, 7))

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBillDetailModal, setShowBillDetailModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<BillInstance | null>(null)
  const [newBill, setNewBill] = useState({ vendor: '', amount: '', vendorType: 'OTHER', dueDate: '' })
  const [submitting, setSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const user = useAuthStore((state) => state.user)
  const isFounder = user?.isFounder || false

  const fetchData = async () => {
    try {
      const data = await api.getExpensesSummary(currentPeriod)
      setSummary(data)
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [currentPeriod])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const [year, month] = currentPeriod.split('-').map(Number)
    const date = new Date(year, month - 1)
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1)
    } else {
      date.setMonth(date.getMonth() + 1)
    }
    setCurrentPeriod(date.toISOString().slice(0, 7))
  }

  const handleAddBill = async () => {
    if (!newBill.vendor || !newBill.amount) {
      Alert.alert('Error', 'Vendor and amount are required')
      return
    }

    setSubmitting(true)
    try {
      await api.createBillInstance({
        vendor: newBill.vendor,
        vendorType: newBill.vendorType,
        amount: parseFloat(newBill.amount),
        dueDate: newBill.dueDate || undefined,
      })
      setShowAddModal(false)
      setNewBill({ vendor: '', amount: '', vendorType: 'OTHER', dueDate: '' })
      setSelectedImage(null)
      fetchData()
      Alert.alert('Success', 'Bill created and split among founders')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create bill')
    } finally {
      setSubmitting(false)
    }
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos to upload bill screenshots')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    })

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri)
      scanBillFromImage(result.assets[0].base64 || '')
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take bill photos')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    })

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri)
      scanBillFromImage(result.assets[0].base64 || '')
    }
  }

  const scanBillFromImage = async (base64: string) => {
    setScanning(true)
    try {
      const result = await api.scanBillImage(base64)
      if (result.vendor || result.amount) {
        setNewBill({
          vendor: result.vendor || '',
          amount: result.amount?.toString() || '',
          vendorType: result.vendorType || 'OTHER',
          dueDate: result.dueDate || ''
        })
        Alert.alert('Bill Detected', `Found: ${result.vendor || 'Unknown'} - $${result.amount || '0'}`)
      } else {
        Alert.alert('No Bill Found', 'Could not detect bill details from the image. Please enter manually.')
      }
    } catch (error: any) {
      console.error('Scan error:', error)
      Alert.alert('Scan Failed', 'Could not analyze the image. Please enter bill details manually.')
    } finally {
      setScanning(false)
    }
  }

  const showImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhoto()
          if (buttonIndex === 2) pickImage()
        }
      )
    } else {
      Alert.alert(
        'Add Bill Screenshot',
        'How would you like to add the image?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
        ]
      )
    }
  }

  const handleMarkPaid = async (billId: string, userId: string, userName: string) => {
    Alert.alert(
      'Mark as Paid',
      `Mark ${userName}'s payment as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.markFounderPaymentPaid(billId, userId)
              fetchData()
              if (selectedBill) {
                const billData = await api.getBillInstance(billId)
                setSelectedBill({ ...billData.instance, founderCount: summary?.founderCount || 0, perPersonAmount: billData.instance.amount / (summary?.founderCount || 1) })
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update payment')
            }
          },
        },
      ]
    )
  }

  const handleDeleteBill = async (billId: string) => {
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteBillInstance(billId)
              setShowBillDetailModal(false)
              setSelectedBill(null)
              fetchData()
              Alert.alert('Success', 'Bill deleted')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete bill')
            }
          },
        },
      ]
    )
  }

  const handleMarkBillPaid = async (bill: BillInstance) => {
    Alert.alert(
      'Mark Bill as Paid',
      `Mark ${bill.vendor} as fully paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.updateBillInstance(bill.id, { status: 'PAID', paidDate: new Date().toISOString() })
              fetchData()
              setShowBillDetailModal(false)
              setSelectedBill(null)
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to mark bill as paid')
            }
          },
        },
      ]
    )
  }

  const openBillDetail = async (bill: BillInstance) => {
    try {
      const billData = await api.getBillInstance(bill.id)
      const payments = await api.getFounderPayments(bill.id)
      setSelectedBill({
        ...billData.instance,
        founderCount: summary?.founderCount || 0,
        perPersonAmount: billData.instance.amount / (summary?.founderCount || 1),
        founderPayments: payments.payments
      })
      setShowBillDetailModal(true)
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load bill details')
    }
  }

  const showVendorTypePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...VENDOR_TYPES.map(t => t.label)],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setNewBill({ ...newBill, vendorType: VENDOR_TYPES[buttonIndex - 1].value })
          }
        }
      )
    } else {
      Alert.alert(
        'Select Vendor Type',
        '',
        VENDOR_TYPES.map(t => ({
          text: t.label,
          onPress: () => setNewBill({ ...newBill, vendorType: t.value })
        }))
      )
    }
  }

  const getVendorTypeLabel = (value: string) => {
    return VENDOR_TYPES.find(t => t.value === value)?.label || value
  }

  const TabButton = ({ title, tabKey, icon }: { title: string; tabKey: TabKey; icon: string }) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tabKey && styles.tabActive]}
      onPress={() => setActiveTab(tabKey)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={activeTab === tabKey ? colors.text : colors.textMuted}
      />
      <Text style={[styles.tabText, activeTab === tabKey && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  )

  const renderBillRow = (bill: BillInstance) => {
    const days = getDaysUntilDue(bill.dueDate)
    const isOverdue = bill.status === 'OVERDUE' || (days !== null && days < 0 && bill.status === 'PENDING')
    const isPaid = bill.status === 'PAID'

    return (
      <TouchableOpacity
        key={bill.id}
        onPress={() => openBillDetail(bill)}
        activeOpacity={0.7}
        style={styles.billRow}
      >
        <View style={styles.billRowLeft}>
          <Text style={[styles.billVendor, isPaid && styles.billVendorPaid]}>{bill.vendor}</Text>
          {bill.recurringBill?.paymentMethod && (
            <Text style={styles.billPaymentMethod}>{bill.recurringBill.paymentMethod}</Text>
          )}
        </View>
        <View style={styles.billRowRight}>
          <Text style={[styles.billAmount, isPaid && styles.billAmountPaid]}>{formatCurrency(Number(bill.amount))}</Text>
          {isPaid ? (
            <View style={styles.paidIndicator}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.paidText}>Paid {bill.paidDate ? formatDate(bill.paidDate) : ''}</Text>
            </View>
          ) : (
            <Text style={[styles.billDueDate, isOverdue && styles.billDueDateOverdue]}>
              Due {bill.dueDate ? formatDate(bill.dueDate) : '-'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderBalanceCard = (balance: FounderBalance) => {
    const isSettled = balance.pendingAmount === 0

    return (
      <Card key={balance.founder.id} style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <View style={styles.founderAvatar}>
            <Text style={styles.founderAvatarText}>
              {(balance.founder.name || balance.founder.email || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.founderInfo}>
            <Text style={styles.founderName}>{balance.founder.name || balance.founder.email}</Text>
            {isSettled ? (
              <View style={styles.settledBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.settledText}>All caught up</Text>
              </View>
            ) : (
              <Text style={styles.outstandingAmount}>{formatCurrency(balance.pendingAmount)}</Text>
            )}
          </View>
        </View>
        {!isSettled && balance.owesFor.length > 0 && (
          <View style={styles.owesForContainer}>
            <Text style={styles.owesForLabel}>Pending:</Text>
            <Text style={styles.owesForList}>{balance.owesFor.join(', ')}</Text>
          </View>
        )}
      </Card>
    )
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Expenses</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('RecurringBills')}>
            <Ionicons name="repeat" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TabButton title="Monthly Bills" tabKey="monthly" icon="calendar" />
        <TabButton title="Balances" tabKey="balances" icon="people" />
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Monthly Bills Tab */}
        {activeTab === 'monthly' && summary && (
          <>
            {/* Period Navigator */}
            <View style={styles.periodNav}>
              <TouchableOpacity onPress={() => navigatePeriod('prev')} style={styles.periodButton}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.periodText}>{formatPeriod(currentPeriod)}</Text>
              <TouchableOpacity onPress={() => navigatePeriod('next')} style={styles.periodButton}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Monthly Summary Stats */}
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>Monthly Total</Text>
                <Text style={styles.summaryStatValue}>{formatCurrency(summary.totals.monthlyTotal)}</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>Pending</Text>
                <Text style={[styles.summaryStatValue, { color: colors.warning }]}>{formatCurrency(summary.totals.pending)}</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>Paid</Text>
                <Text style={[styles.summaryStatValue, { color: colors.success }]}>{formatCurrency(summary.totals.paid)}</Text>
              </View>
            </View>

            {/* Bills List */}
            <Card style={styles.billsCard}>
              {summary.bills.all.length === 0 ? (
                <View style={styles.emptyBills}>
                  <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyBillsText}>No bills for {formatPeriod(currentPeriod)}</Text>
                </View>
              ) : (
                <>
                  {summary.bills.overdue.length > 0 && (
                    <>
                      <Text style={[styles.billsSection, { color: colors.error }]}>Overdue</Text>
                      {summary.bills.overdue.map(renderBillRow)}
                    </>
                  )}
                  {summary.bills.pending.filter(b => !summary.bills.overdue.find(o => o.id === b.id)).length > 0 && (
                    <>
                      <Text style={styles.billsSection}>Pending</Text>
                      {summary.bills.pending.filter(b => !summary.bills.overdue.find(o => o.id === b.id)).map(renderBillRow)}
                    </>
                  )}
                  {summary.bills.paid.length > 0 && (
                    <>
                      <Text style={styles.billsSection}>Paid</Text>
                      {summary.bills.paid.map(renderBillRow)}
                    </>
                  )}
                </>
              )}
            </Card>

            {/* Upcoming Bills */}
            {summary.upcomingBills.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Due in Next 7 Days</Text>
                <Card style={styles.billsCard}>
                  {summary.upcomingBills.map(renderBillRow)}
                </Card>
              </>
            )}
          </>
        )}

        {/* Balances Tab */}
        {activeTab === 'balances' && summary && (
          <>
            {/* Quick Actions */}
            <TouchableOpacity
              style={styles.manageRecurringButton}
              onPress={() => navigation.navigate('RecurringBills')}
            >
              <Ionicons name="repeat" size={18} color={colors.primary} />
              <Text style={styles.manageRecurringText}>Manage Recurring Bills</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Outstanding Total */}
            <Card style={styles.outstandingCard}>
              <Text style={styles.outstandingLabel}>Total Outstanding</Text>
              <Text style={styles.outstandingValue}>{formatCurrency(summary.totalOutstanding)}</Text>
              <Text style={styles.outstandingSubtext}>
                Split among {summary.founderCount} founder{summary.founderCount !== 1 ? 's' : ''}
              </Text>
            </Card>

            {/* Founder Balances */}
            <Text style={styles.sectionTitle}>Outstanding Balances</Text>
            {summary.founderBalances.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No founders configured</Text>
              </Card>
            ) : (
              summary.founderBalances.map(renderBalanceCard)
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Bill Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Bill</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setSelectedImage(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Split equally among {summary?.founderCount || '?'} founders</Text>

            {/* Screenshot Upload */}
            <TouchableOpacity style={styles.imageUploadButton} onPress={showImageOptions} disabled={scanning}>
              {scanning ? (
                <View style={styles.scanningContainer}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.scanningText}>Scanning bill...</Text>
                </View>
              ) : selectedImage ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={32} color={colors.primary} />
                  <Text style={styles.uploadText}>Upload Bill Screenshot</Text>
                  <Text style={styles.uploadSubtext}>Auto-detect vendor & amount</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Vendor</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Duke Energy"
              placeholderTextColor={colors.textMuted}
              value={newBill.vendor}
              onChangeText={(text) => setNewBill({ ...newBill, vendor: text })}
            />

            <Text style={styles.inputLabel}>Type</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={showVendorTypePicker}>
              <Text style={styles.pickerButtonText}>{getVendorTypeLabel(newBill.vendorType)}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={newBill.amount}
              onChangeText={(text) => setNewBill({ ...newBill, amount: text })}
              keyboardType="decimal-pad"
            />
            {newBill.amount && summary && summary.founderCount > 0 && (
              <Text style={styles.splitPreview}>
                Per person: {formatCurrency(parseFloat(newBill.amount || '0') / summary.founderCount)}
              </Text>
            )}

            <Text style={styles.inputLabel}>Due Date (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={newBill.dueDate}
              onChangeText={(text) => setNewBill({ ...newBill, dueDate: text })}
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => { setShowAddModal(false); setSelectedImage(null); }} style={{ flex: 1 }} />
              <Button title="Create" onPress={handleAddBill} loading={submitting} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* Bill Detail Modal */}
      <Modal visible={showBillDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBill && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedBill.vendor}</Text>
                  <TouchableOpacity onPress={() => setShowBillDetailModal(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.billDetailRow}>
                  <Text style={styles.billDetailLabel}>Type</Text>
                  <Text style={styles.billDetailValue}>{getVendorTypeLabel(selectedBill.vendorType)}</Text>
                </View>

                <View style={styles.billDetailRow}>
                  <Text style={styles.billDetailLabel}>Total Amount</Text>
                  <Text style={[styles.billDetailValue, styles.billDetailAmount]}>{formatCurrency(Number(selectedBill.amount))}</Text>
                </View>

                <View style={styles.billDetailRow}>
                  <Text style={styles.billDetailLabel}>Per Person</Text>
                  <Text style={[styles.billDetailValue, { color: colors.primary }]}>{formatCurrency(selectedBill.perPersonAmount)}</Text>
                </View>

                <View style={styles.billDetailRow}>
                  <Text style={styles.billDetailLabel}>Due Date</Text>
                  <Text style={styles.billDetailValue}>{formatDate(selectedBill.dueDate)}</Text>
                </View>

                <View style={styles.billDetailRow}>
                  <Text style={styles.billDetailLabel}>Status</Text>
                  <Badge
                    text={selectedBill.status}
                    variant={selectedBill.status === 'PAID' ? 'success' : selectedBill.status === 'OVERDUE' ? 'error' : 'warning'}
                  />
                </View>

                {selectedBill.paidVia && (
                  <View style={styles.billDetailRow}>
                    <Text style={styles.billDetailLabel}>Paid Via</Text>
                    <Text style={styles.billDetailValue}>{selectedBill.paidVia}</Text>
                  </View>
                )}

                <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Founder Payments</Text>
                {selectedBill.founderPayments && selectedBill.founderPayments.length > 0 ? (
                  selectedBill.founderPayments.map((p) => (
                    <View key={p.id} style={styles.paymentRow}>
                      <View style={styles.paymentUserInfo}>
                        <View style={styles.paymentAvatar}>
                          <Text style={styles.paymentAvatarText}>
                            {(p.user.name || p.user.email || '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.paymentUserName}>{p.user.name || p.user.email}</Text>
                          <Text style={styles.paymentAmount}>{formatCurrency(Number(p.amount))}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.paymentStatusButton, p.status === 'PAID' ? styles.paymentStatusPaid : styles.paymentStatusPending]}
                        onPress={() => p.status !== 'PAID' && handleMarkPaid(selectedBill.id, p.user.id, p.user.name || p.user.email)}
                        disabled={p.status === 'PAID'}
                      >
                        <Text style={[styles.paymentStatusText, p.status === 'PAID' ? styles.paymentStatusTextPaid : styles.paymentStatusTextPending]}>
                          {p.status === 'PAID' ? 'Paid' : 'Mark Paid'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noPayments}>No payment splits created</Text>
                )}

                <View style={styles.modalButtons}>
                  {selectedBill.status !== 'PAID' && (
                    <Button
                      title="Mark Paid"
                      variant="outline"
                      onPress={() => handleMarkBillPaid(selectedBill)}
                      style={{ flex: 1, borderColor: colors.success }}
                      textStyle={{ color: colors.success }}
                    />
                  )}
                  <Button
                    title="Delete"
                    variant="outline"
                    onPress={() => handleDeleteBill(selectedBill.id)}
                    style={{ flex: 1, marginLeft: selectedBill.status !== 'PAID' ? spacing.sm : 0, borderColor: colors.error }}
                    textStyle={{ color: colors.error }}
                  />
                  <Button
                    title="Close"
                    onPress={() => setShowBillDetailModal(false)}
                    style={{ flex: 1, marginLeft: spacing.sm }}
                  />
                </View>
              </>
            )}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.text,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  // Period Navigator
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  periodButton: {
    padding: spacing.sm,
  },
  periodText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginHorizontal: spacing.lg,
  },
  // Summary Stats
  summaryStats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  summaryStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  summaryStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  // Bills Card
  billsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  billsSection: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billRowLeft: {
    flex: 1,
  },
  billRowRight: {
    alignItems: 'flex-end',
  },
  billVendor: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  billVendorPaid: {
    color: colors.textMuted,
  },
  billPaymentMethod: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  billAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  billAmountPaid: {
    color: colors.textMuted,
  },
  billDueDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  billDueDateOverdue: {
    color: colors.error,
  },
  paidIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  paidText: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginLeft: 4,
  },
  emptyBills: {
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyBillsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  // Manage Recurring Button
  manageRecurringButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  manageRecurringText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  // Outstanding Card
  outstandingCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  outstandingLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  outstandingValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  outstandingSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Balance Cards
  balanceCard: {
    marginBottom: spacing.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  founderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  founderAvatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  founderInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  founderName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  settledText: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginLeft: 4,
  },
  outstandingAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginTop: 2,
  },
  owesForContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  owesForLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  owesForList: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pickerButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  splitPreview: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  // Bill detail modal
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billDetailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  billDetailValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  billDetailAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  paymentAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  paymentUserName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  paymentAmount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  paymentStatusButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  paymentStatusPaid: {
    backgroundColor: colors.successBg,
  },
  paymentStatusPending: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  paymentStatusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  paymentStatusTextPaid: {
    color: colors.success,
  },
  paymentStatusTextPending: {
    color: colors.primary,
  },
  noPayments: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  // Image upload styles
  imageUploadButton: {
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  uploadSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  selectedImageContainer: {
    position: 'relative',
    height: 150,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.sm,
  },
})
