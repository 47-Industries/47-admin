import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, TextInput, FlatList, ActionSheetIOS, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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
  pendingAmount?: number
  pendingCount?: number
  paidAmount?: number
  paidCount?: number
}

interface FounderSummary {
  founder: Founder
  pending: { count: number; amount: number }
  paid: { count: number; amount: number }
  totalOwed: number
  totalPaid: number
}

interface BillPayment {
  id: string
  amount: number
  status: string
  paidDate: string | null
  user: { id: string; name: string | null; email: string }
}

interface Bill {
  id: string
  vendor: string
  vendorType: string
  amount: number
  dueDate: string | null
  status: string
  emailSubject?: string | null
  createdAt: string
  payments: BillPayment[]
  founderCount?: number
  perPersonAmount: number
}

interface GlobalTotals {
  totalPending: number
  totalPaid: number
  upcomingBillsCount: number
  overdueBillsCount: number
  founderCount: number
}

interface SyncStatus {
  configured: boolean
  accountEmail: string | null
  lastSync: string | null
  authUrl: string | null
}

const VENDOR_TYPES = [
  { value: 'UTILITY', label: 'Utility (Electric, Water, Gas)' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'BANK_ALERT', label: 'Bank Alert' },
  { value: 'OTHER', label: 'Other' }
]

type TabKey = 'summary' | 'bills' | 'founders'

export function ExpensesScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary')
  const [summary, setSummary] = useState<FounderSummary[]>([])
  const [globalTotals, setGlobalTotals] = useState<GlobalTotals | null>(null)
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([])
  const [overdueBills, setOverdueBills] = useState<Bill[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [founders, setFounders] = useState<Founder[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBillDetailModal, setShowBillDetailModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [newBill, setNewBill] = useState({ vendor: '', amount: '', vendorType: 'OTHER', dueDate: '' })
  const [submitting, setSubmitting] = useState(false)

  const user = useAuthStore((state) => state.user)
  const isFounder = user?.isFounder || false

  const fetchData = async () => {
    try {
      if (activeTab === 'summary') {
        const data = await api.getExpensesSummary()
        setSummary(data.summary || [])
        setGlobalTotals(data.globalTotals || null)
        setUpcomingBills(data.upcomingBills || [])
        setOverdueBills(data.overdueBills || [])
      } else if (activeTab === 'bills') {
        const [billsData, syncData] = await Promise.all([
          api.getBills(),
          api.getSyncStatus().catch(() => null)
        ])
        setBills(billsData.bills || [])
        setFounders(billsData.founders || [])
        if (syncData) setSyncStatus(syncData)
      } else if (activeTab === 'founders') {
        const data = await api.getFounders()
        setFounders(data.founders || [])
      }
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
  }, [activeTab])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  const handleSyncBills = async () => {
    setSyncing(true)
    try {
      const result = await api.syncBills()
      Alert.alert('Success', `Synced: ${result.created || 0} new bills found`)
      fetchData()
    } catch (error: any) {
      if (error.needsAuth && error.authUrl) {
        Alert.alert(
          'Gmail Not Connected',
          'You need to connect Gmail to sync bills. Please use the web admin to connect Gmail.',
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert('Error', error.message || 'Failed to sync bills')
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleAddBill = async () => {
    if (!newBill.vendor || !newBill.amount) {
      Alert.alert('Error', 'Vendor and amount are required')
      return
    }

    setSubmitting(true)
    try {
      await api.createBill({
        vendor: newBill.vendor,
        vendorType: newBill.vendorType,
        amount: parseFloat(newBill.amount),
        dueDate: newBill.dueDate || undefined,
      })
      setShowAddModal(false)
      setNewBill({ vendor: '', amount: '', vendorType: 'OTHER', dueDate: '' })
      fetchData()
      Alert.alert('Success', 'Bill created and split among founders')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create bill')
    } finally {
      setSubmitting(false)
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
              await api.markPaymentPaid(billId, userId)
              fetchData()
              if (selectedBill) {
                // Refresh bill detail if modal is open
                const billData = await api.getBill(billId)
                setSelectedBill(billData.bill)
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
              await api.deleteBill(billId)
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

  const openBillDetail = async (bill: Bill) => {
    try {
      const billData = await api.getBill(bill.id)
      setSelectedBill(billData.bill)
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
      // For Android, we'll use a simple alert with options
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

  const renderBillCard = (bill: Bill, showPayments = true) => {
    const days = getDaysUntilDue(bill.dueDate)
    const isOverdue = days !== null && days < 0

    return (
      <TouchableOpacity
        key={bill.id}
        onPress={() => openBillDetail(bill)}
        activeOpacity={0.7}
      >
        <Card style={[styles.billCard, isOverdue && styles.billCardOverdue]}>
          <View style={styles.billHeader}>
            <View style={styles.billInfo}>
              <Text style={styles.billVendor}>{bill.vendor}</Text>
              <Text style={styles.billType}>{getVendorTypeLabel(bill.vendorType)}</Text>
            </View>
            <Badge
              text={bill.status}
              variant={bill.status === 'PAID' ? 'success' : bill.status === 'OVERDUE' ? 'error' : 'warning'}
            />
          </View>
          <View style={styles.billAmounts}>
            <View>
              <Text style={styles.billLabel}>Total</Text>
              <Text style={styles.billAmount}>{formatCurrency(Number(bill.amount))}</Text>
            </View>
            <View>
              <Text style={styles.billLabel}>Per Person</Text>
              <Text style={[styles.billAmount, { color: isOverdue ? colors.error : colors.primary }]}>
                {formatCurrency(bill.perPersonAmount)}
              </Text>
            </View>
            {bill.dueDate && (
              <View>
                <Text style={styles.billLabel}>Due</Text>
                <Text style={[styles.billDate, isOverdue && { color: colors.error }]}>
                  {formatDate(bill.dueDate)}
                  {days !== null && (
                    <Text style={styles.daysText}> ({days}d)</Text>
                  )}
                </Text>
              </View>
            )}
          </View>
          {showPayments && bill.payments && bill.payments.length > 0 && (
            <View style={styles.payments}>
              <Text style={styles.paymentsLabel}>Payments</Text>
              <View style={styles.paymentsList}>
                {bill.payments.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.paymentBadge, p.status === 'PAID' ? styles.paymentPaid : styles.paymentPending]}
                    onPress={() => p.status !== 'PAID' && handleMarkPaid(bill.id, p.user.id, p.user.name || p.user.email)}
                    disabled={p.status === 'PAID'}
                  >
                    <Text style={[styles.paymentText, p.status === 'PAID' ? styles.paymentTextPaid : styles.paymentTextPending]}>
                      {(p.user.name || p.user.email || '').split(' ')[0]}: {p.status === 'PAID' ? 'Paid' : formatCurrency(Number(p.amount))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    )
  }

  const renderFounderCard = (founder: Founder) => (
    <Card key={founder.id} style={styles.founderCard}>
      <View style={styles.founderHeader}>
        <View style={styles.founderAvatar}>
          <Text style={styles.founderAvatarText}>
            {(founder.name || founder.email || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.founderInfo}>
          <Text style={styles.founderName}>{founder.name || founder.email || 'Unknown'}</Text>
          <Text style={styles.founderEmail}>{founder.email}</Text>
        </View>
      </View>
      <View style={styles.founderStats}>
        <View style={[styles.founderStatBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <Text style={styles.founderStatLabel}>Pending</Text>
          <Text style={[styles.founderStatValue, { color: colors.error }]}>
            {formatCurrency(founder.pendingAmount || 0)}
          </Text>
          <Text style={styles.founderStatCount}>{founder.pendingCount || 0} bills</Text>
        </View>
        <View style={[styles.founderStatBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
          <Text style={styles.founderStatLabel}>Paid</Text>
          <Text style={[styles.founderStatValue, { color: colors.success }]}>
            {formatCurrency(founder.paidAmount || 0)}
          </Text>
          <Text style={styles.founderStatCount}>{founder.paidCount || 0} bills</Text>
        </View>
      </View>
    </Card>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Expenses</Text>
          {activeTab === 'bills' && (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TabButton title="Summary" tabKey="summary" icon="stats-chart" />
        <TabButton title="Bills" tabKey="bills" icon="receipt" />
        <TabButton title="Founders" tabKey="founders" icon="people" />
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <>
            {/* Global Stats */}
            {globalTotals && (
              <>
                <View style={styles.statsRow}>
                  <Card style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Pending</Text>
                    <Text style={[styles.statValue, { color: colors.error }]}>{formatCurrency(globalTotals.totalPending)}</Text>
                  </Card>
                  <Card style={styles.statCard}>
                    <Text style={styles.statLabel}>Founders</Text>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{globalTotals.founderCount}</Text>
                    <Text style={styles.statSubtext}>splitting bills</Text>
                  </Card>
                </View>
                <View style={styles.statsRow}>
                  <Card style={[styles.statCard, globalTotals.overdueBillsCount > 0 && { borderColor: colors.error }]}>
                    <Text style={styles.statLabel}>Overdue</Text>
                    <Text style={[styles.statValue, { color: globalTotals.overdueBillsCount > 0 ? colors.error : colors.success }]}>
                      {globalTotals.overdueBillsCount}
                    </Text>
                  </Card>
                  <Card style={styles.statCard}>
                    <Text style={styles.statLabel}>Due in 7 days</Text>
                    <Text style={[styles.statValue, { color: colors.warning }]}>{globalTotals.upcomingBillsCount}</Text>
                  </Card>
                </View>
              </>
            )}

            {/* Founder Balances */}
            <Text style={styles.sectionTitle}>Founder Balances</Text>
            {summary.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No founders configured</Text>
                <Text style={styles.emptySubtext}>Mark users as founders in the Users section</Text>
              </Card>
            ) : (
              summary.map((s) => (
                <Card key={s.founder.id} style={styles.balanceCard}>
                  <View style={styles.balanceHeader}>
                    <View style={styles.founderAvatar}>
                      <Text style={styles.founderAvatarText}>
                        {(s.founder.name || s.founder.email || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.founderInfo}>
                      <Text style={styles.founderName}>{s.founder.name || s.founder.email}</Text>
                      <Text style={styles.founderEmail}>{s.founder.email}</Text>
                    </View>
                    <Badge
                      text={s.totalOwed > 0 ? `Owes ${formatCurrency(s.totalOwed)}` : 'Settled'}
                      variant={s.totalOwed > 0 ? 'error' : 'success'}
                    />
                  </View>
                  {isFounder && (
                    <View style={styles.balanceStats}>
                      <View style={styles.balanceStat}>
                        <Text style={styles.balanceStatLabel}>Pending:</Text>
                        <Text style={styles.balanceStatValue}>{s.pending.count} bills ({formatCurrency(s.pending.amount)})</Text>
                      </View>
                      <View style={styles.balanceStat}>
                        <Text style={styles.balanceStatLabel}>Paid:</Text>
                        <Text style={styles.balanceStatValue}>{s.paid.count} bills ({formatCurrency(s.paid.amount)})</Text>
                      </View>
                    </View>
                  )}
                </Card>
              ))
            )}

            {/* Overdue Bills */}
            {overdueBills.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.error }]}>Overdue Bills</Text>
                {overdueBills.map((bill) => renderBillCard(bill as Bill, false))}
              </>
            )}

            {/* Upcoming Bills */}
            {upcomingBills.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Upcoming Bills (7 days)</Text>
                {upcomingBills.map((bill) => renderBillCard(bill as Bill, false))}
              </>
            )}
          </>
        )}

        {/* Bills Tab */}
        {activeTab === 'bills' && (
          <>
            {/* Actions Row */}
            <View style={styles.actionsRow}>
              <Button
                title="Add Bill"
                onPress={() => setShowAddModal(true)}
                style={styles.actionButton}
              />
            </View>

            <Text style={styles.syncStatus}>
              Bills are automatically synced from email
            </Text>

            {bills.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No bills yet</Text>
                <Text style={styles.emptySubtext}>Add manually or sync from Gmail</Text>
                <Button
                  title="Add Bill"
                  onPress={() => setShowAddModal(true)}
                  style={{ marginTop: spacing.md }}
                />
              </Card>
            ) : (
              bills.map((bill) => renderBillCard(bill))
            )}
          </>
        )}

        {/* Founders Tab */}
        {activeTab === 'founders' && (
          <>
            <Text style={styles.foundersInfo}>
              Founders are users marked with the isFounder flag. All bills are automatically split equally among founders.
              To add or remove founders, edit users in the Users section.
            </Text>

            {founders.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No founders configured</Text>
                <Text style={styles.emptySubtext}>Mark users as founders in the Users section</Text>
              </Card>
            ) : (
              founders.map((founder) => renderFounderCard(founder))
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Bill Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Bill</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Split equally among {founders.length || '?'} founders</Text>

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
            {newBill.amount && founders.length > 0 && (
              <Text style={styles.splitPreview}>
                Per person: {formatCurrency(parseFloat(newBill.amount || '0') / founders.length)}
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
              <Button title="Cancel" variant="outline" onPress={() => setShowAddModal(false)} style={{ flex: 1 }} />
              <Button title="Create" onPress={handleAddBill} loading={submitting} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </View>
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

                <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Payments</Text>
                {selectedBill.payments && selectedBill.payments.length > 0 ? (
                  selectedBill.payments.map((p) => (
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
                  <Button
                    title="Delete Bill"
                    variant="outline"
                    onPress={() => handleDeleteBill(selectedBill.id)}
                    style={{ flex: 1, borderColor: colors.error }}
                    textStyle={{ color: colors.error }}
                  />
                  <Button
                    title="Close"
                    onPress={() => setShowBillDetailModal(false)}
                    style={{ flex: 1, marginLeft: spacing.md }}
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
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
  emptySubtext: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  // Founder balance cards
  balanceCard: {
    marginBottom: spacing.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceStats: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  balanceStatLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  balanceStatValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  // Founder cards (tab)
  founderCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  founderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  founderEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  founderStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  founderStatBox: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  founderStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  founderStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  founderStatCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  foundersInfo: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  // Bill cards
  billCard: {
    marginBottom: spacing.md,
  },
  billCardOverdue: {
    borderColor: colors.error,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  billInfo: {
    flex: 1,
  },
  billVendor: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  billType: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  billAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  billAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  billDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  daysText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  payments: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentsLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  paymentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  paymentBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  paymentPaid: {
    backgroundColor: colors.successBg,
  },
  paymentPending: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  paymentText: {
    fontSize: fontSize.xs,
  },
  paymentTextPaid: {
    color: colors.success,
  },
  paymentTextPending: {
    color: colors.primary,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  syncStatus: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textAlign: 'center',
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
})
