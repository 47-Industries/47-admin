import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, TextInput, ActionSheetIOS, Platform, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface RecurringBill {
  id: string
  name: string
  vendor: string
  amountType: 'FIXED' | 'VARIABLE'
  fixedAmount: number | null
  frequency: string
  dueDay: number
  emailPatterns: string[]
  paymentMethod: string | null
  vendorType: string
  active: boolean
  createdAt: string
}

const VENDOR_TYPES = [
  { value: 'RENT', label: 'Rent' },
  { value: 'UTILITY', label: 'Utility' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OTHER', label: 'Other' }
]

const FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' }
]

const PAYMENT_METHODS = [
  { value: 'Zelle', label: 'Zelle' },
  { value: 'Autopay', label: 'Autopay' },
  { value: 'Manual', label: 'Manual' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: null, label: 'Not specified' }
]

export function RecurringBillsScreen({ navigation }: { navigation: any }) {
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    amountType: 'VARIABLE' as 'FIXED' | 'VARIABLE',
    fixedAmount: '',
    frequency: 'MONTHLY',
    dueDay: '',
    emailPatterns: '',
    paymentMethod: null as string | null,
    vendorType: 'OTHER'
  })

  const fetchData = async () => {
    try {
      const data = await api.getRecurringBills()
      setRecurringBills(data.recurringBills || [])
    } catch (error) {
      console.error('Failed to fetch recurring bills:', error)
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

  const resetForm = () => {
    setFormData({
      name: '',
      vendor: '',
      amountType: 'VARIABLE',
      fixedAmount: '',
      frequency: 'MONTHLY',
      dueDay: '',
      emailPatterns: '',
      paymentMethod: null,
      vendorType: 'OTHER'
    })
  }

  const openEditModal = (bill: RecurringBill) => {
    setSelectedBill(bill)
    setFormData({
      name: bill.name,
      vendor: bill.vendor,
      amountType: bill.amountType,
      fixedAmount: bill.fixedAmount?.toString() || '',
      frequency: bill.frequency,
      dueDay: bill.dueDay.toString(),
      emailPatterns: (bill.emailPatterns || []).join(', '),
      paymentMethod: bill.paymentMethod,
      vendorType: bill.vendorType
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.vendor || !formData.dueDay) {
      Alert.alert('Error', 'Name, vendor, and due day are required')
      return
    }

    if (formData.amountType === 'FIXED' && !formData.fixedAmount) {
      Alert.alert('Error', 'Fixed amount is required for fixed bills')
      return
    }

    const dueDay = parseInt(formData.dueDay)
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 28) {
      Alert.alert('Error', 'Due day must be between 1 and 28')
      return
    }

    setSubmitting(true)
    try {
      const data = {
        name: formData.name,
        vendor: formData.vendor,
        amountType: formData.amountType,
        fixedAmount: formData.amountType === 'FIXED' ? parseFloat(formData.fixedAmount) : undefined,
        frequency: formData.frequency,
        dueDay,
        emailPatterns: formData.emailPatterns ? formData.emailPatterns.split(',').map(p => p.trim().toLowerCase()) : [],
        paymentMethod: formData.paymentMethod,
        vendorType: formData.vendorType
      }

      if (selectedBill) {
        await api.updateRecurringBill(selectedBill.id, data)
        Alert.alert('Success', 'Recurring bill updated')
      } else {
        await api.createRecurringBill(data)
        Alert.alert('Success', 'Recurring bill created')
      }

      setShowAddModal(false)
      setShowEditModal(false)
      resetForm()
      setSelectedBill(null)
      fetchData()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save recurring bill')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (bill: RecurringBill) => {
    Alert.alert(
      'Delete Recurring Bill',
      `Are you sure you want to delete "${bill.name}"? This will not affect existing bill instances.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteRecurringBill(bill.id)
              fetchData()
              Alert.alert('Success', 'Recurring bill deleted')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete recurring bill')
            }
          }
        }
      ]
    )
  }

  const handleToggleActive = async (bill: RecurringBill) => {
    try {
      await api.updateRecurringBill(bill.id, { active: !bill.active })
      fetchData()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update recurring bill')
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
            setFormData({ ...formData, vendorType: VENDOR_TYPES[buttonIndex - 1].value })
          }
        }
      )
    } else {
      Alert.alert('Select Type', '', VENDOR_TYPES.map(t => ({
        text: t.label,
        onPress: () => setFormData({ ...formData, vendorType: t.value })
      })))
    }
  }

  const showFrequencyPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...FREQUENCIES.map(f => f.label)],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setFormData({ ...formData, frequency: FREQUENCIES[buttonIndex - 1].value })
          }
        }
      )
    } else {
      Alert.alert('Select Frequency', '', FREQUENCIES.map(f => ({
        text: f.label,
        onPress: () => setFormData({ ...formData, frequency: f.value })
      })))
    }
  }

  const showPaymentMethodPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...PAYMENT_METHODS.map(p => p.label)],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setFormData({ ...formData, paymentMethod: PAYMENT_METHODS[buttonIndex - 1].value })
          }
        }
      )
    } else {
      Alert.alert('Select Payment Method', '', PAYMENT_METHODS.map(p => ({
        text: p.label,
        onPress: () => setFormData({ ...formData, paymentMethod: p.value })
      })))
    }
  }

  const showAmountTypePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Fixed (same every month)', 'Variable (from email)'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) setFormData({ ...formData, amountType: 'FIXED' })
          if (buttonIndex === 2) setFormData({ ...formData, amountType: 'VARIABLE' })
        }
      )
    } else {
      Alert.alert('Amount Type', '', [
        { text: 'Fixed (same every month)', onPress: () => setFormData({ ...formData, amountType: 'FIXED' }) },
        { text: 'Variable (from email)', onPress: () => setFormData({ ...formData, amountType: 'VARIABLE' }) },
      ])
    }
  }

  const getVendorTypeLabel = (value: string) => VENDOR_TYPES.find(t => t.value === value)?.label || value
  const getFrequencyLabel = (value: string) => FREQUENCIES.find(f => f.value === value)?.label || value
  const getPaymentMethodLabel = (value: string | null) => PAYMENT_METHODS.find(p => p.value === value)?.label || 'Not specified'

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'Variable'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const renderBillCard = (bill: RecurringBill) => (
    <TouchableOpacity
      key={bill.id}
      onPress={() => openEditModal(bill)}
      activeOpacity={0.7}
    >
      <Card style={[styles.billCard, !bill.active && styles.billCardInactive]}>
        <View style={styles.billHeader}>
          <View style={styles.billInfo}>
            <Text style={[styles.billName, !bill.active && styles.textInactive]}>{bill.name}</Text>
            <Text style={[styles.billVendor, !bill.active && styles.textInactive]}>{bill.vendor}</Text>
          </View>
          <View style={styles.billRight}>
            <Text style={[styles.billAmount, !bill.active && styles.textInactive]}>
              {bill.amountType === 'FIXED' ? formatCurrency(bill.fixedAmount) : 'Variable'}
            </Text>
            <Badge
              text={bill.active ? 'Active' : 'Inactive'}
              variant={bill.active ? 'success' : 'default'}
            />
          </View>
        </View>
        <View style={styles.billDetails}>
          <View style={styles.billDetailItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.billDetailText}>Due: {bill.dueDay}th</Text>
          </View>
          <View style={styles.billDetailItem}>
            <Ionicons name="repeat-outline" size={14} color={colors.textMuted} />
            <Text style={styles.billDetailText}>{getFrequencyLabel(bill.frequency)}</Text>
          </View>
          {bill.paymentMethod && (
            <View style={styles.billDetailItem}>
              <Ionicons name="card-outline" size={14} color={colors.textMuted} />
              <Text style={styles.billDetailText}>{bill.paymentMethod}</Text>
            </View>
          )}
        </View>
        {bill.emailPatterns && bill.emailPatterns.length > 0 && (
          <View style={styles.emailPatterns}>
            <Text style={styles.emailPatternsLabel}>Email patterns:</Text>
            <Text style={styles.emailPatternsText}>{bill.emailPatterns.join(', ')}</Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  )

  const renderForm = () => (
    <>
      <Text style={styles.inputLabel}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Electric Bill"
        placeholderTextColor={colors.textMuted}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
      />

      <Text style={styles.inputLabel}>Vendor</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Duke Energy"
        placeholderTextColor={colors.textMuted}
        value={formData.vendor}
        onChangeText={(text) => setFormData({ ...formData, vendor: text })}
      />

      <Text style={styles.inputLabel}>Type</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={showVendorTypePicker}>
        <Text style={styles.pickerButtonText}>{getVendorTypeLabel(formData.vendorType)}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.inputLabel}>Amount Type</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={showAmountTypePicker}>
        <Text style={styles.pickerButtonText}>
          {formData.amountType === 'FIXED' ? 'Fixed (same every month)' : 'Variable (from email)'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {formData.amountType === 'FIXED' && (
        <>
          <Text style={styles.inputLabel}>Fixed Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={formData.fixedAmount}
            onChangeText={(text) => setFormData({ ...formData, fixedAmount: text })}
            keyboardType="decimal-pad"
          />
        </>
      )}

      <Text style={styles.inputLabel}>Frequency</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={showFrequencyPicker}>
        <Text style={styles.pickerButtonText}>{getFrequencyLabel(formData.frequency)}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.inputLabel}>Due Day (1-28)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 15"
        placeholderTextColor={colors.textMuted}
        value={formData.dueDay}
        onChangeText={(text) => setFormData({ ...formData, dueDay: text })}
        keyboardType="number-pad"
      />

      <Text style={styles.inputLabel}>Payment Method</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={showPaymentMethodPicker}>
        <Text style={styles.pickerButtonText}>{getPaymentMethodLabel(formData.paymentMethod)}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.inputLabel}>Email Patterns (comma-separated)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., duke, energy"
        placeholderTextColor={colors.textMuted}
        value={formData.emailPatterns}
        onChangeText={(text) => setFormData({ ...formData, emailPatterns: text })}
      />
      <Text style={styles.inputHint}>Used to auto-match incoming emails to this bill</Text>
    </>
  )

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Recurring Bills</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowAddModal(true); }}>
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.description}>
          Define your recurring bills here. The system will auto-generate monthly instances and match incoming emails to the right bill.
        </Text>

        {recurringBills.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="repeat-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No recurring bills defined</Text>
            <Text style={styles.emptySubtext}>Add bills you expect each month</Text>
            <Button
              title="Add Recurring Bill"
              onPress={() => { resetForm(); setShowAddModal(true); }}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        ) : (
          <>
            {recurringBills.filter(b => b.active).map(renderBillCard)}
            {recurringBills.filter(b => !b.active).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Inactive</Text>
                {recurringBills.filter(b => !b.active).map(renderBillCard)}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Recurring Bill</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {renderForm()}

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowAddModal(false)} style={{ flex: 1 }} />
              <Button title="Create" onPress={handleSave} loading={submitting} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Recurring Bill</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setSelectedBill(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {renderForm()}

            <View style={styles.modalButtons}>
              {selectedBill && (
                <>
                  <Button
                    title={selectedBill.active ? 'Deactivate' : 'Activate'}
                    variant="outline"
                    onPress={() => { handleToggleActive(selectedBill); setShowEditModal(false); setSelectedBill(null); }}
                    style={{ flex: 1, borderColor: selectedBill.active ? colors.warning : colors.success }}
                    textStyle={{ color: selectedBill.active ? colors.warning : colors.success }}
                  />
                  <Button
                    title="Delete"
                    variant="outline"
                    onPress={() => { handleDelete(selectedBill); setShowEditModal(false); setSelectedBill(null); }}
                    style={{ flex: 1, marginLeft: spacing.sm, borderColor: colors.error }}
                    textStyle={{ color: colors.error }}
                  />
                </>
              )}
              <Button title="Save" onPress={handleSave} loading={submitting} style={{ flex: 1, marginLeft: spacing.sm }} />
            </View>
          </View>
        </ScrollView>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  billCard: {
    marginBottom: spacing.md,
  },
  billCardInactive: {
    opacity: 0.6,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  billVendor: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  textInactive: {
    color: colors.textMuted,
  },
  billDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  billDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  billDetailText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  emailPatterns: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emailPatternsLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  emailPatternsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
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
  // Modal
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
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
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
  inputHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: -spacing.md,
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
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
})
