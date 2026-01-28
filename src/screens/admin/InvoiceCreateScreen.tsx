import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'
import { Client } from '../../types'

interface LineItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

interface InvoiceCreateScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
}

// Helper to format date as YYYY-MM-DD
const formatDateForApi = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

// Helper to format date for display
const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Helper to get default due date (30 days from now)
const getDefaultDueDate = (): Date => {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date
}

export function InvoiceCreateScreen({ navigation }: InvoiceCreateScreenProps) {
  // Client state
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [loadingClients, setLoadingClients] = useState(false)

  // Date state (using string format YYYY-MM-DD for simplicity)
  const [dueDateStr, setDueDateStr] = useState(formatDateForApi(getDefaultDueDate()))
  const [showDateModal, setShowDateModal] = useState(false)
  const [tempDate, setTempDate] = useState('')

  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: '1', unitPrice: '' },
  ])

  // Tax and notes state
  const [taxRate, setTaxRate] = useState('0')
  const [notes, setNotes] = useState('')

  // Form state
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch clients on mount
  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async (search?: string) => {
    setLoadingClients(true)
    try {
      const data = await api.getAdminClients({ search, status: 'ACTIVE' })
      setClients(data.clients || [])
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  // Line item functions
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: '', quantity: '1', unitPrice: '' },
    ])
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id))
    }
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
    // Clear error when user starts typing
    if (errors[`lineItem_${id}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`lineItem_${id}`]
        return newErrors
      })
    }
  }

  // Calculations
  const calculateLineTotal = (item: LineItem): number => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unitPrice) || 0
    return qty * price
  }

  const calculateSubtotal = (): number => {
    return lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  }

  const calculateTax = (): number => {
    return calculateSubtotal() * (parseFloat(taxRate) / 100)
  }

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax()
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  // Parse date string to display format
  const getDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Select date'
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return formatDateForDisplay(date)
    } catch {
      return dateStr
    }
  }

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedClient) {
      newErrors.client = 'Please select a client'
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() && parseFloat(item.unitPrice) > 0
    )

    if (validItems.length === 0) {
      newErrors.lineItems = 'Please add at least one line item with a description and price'
    }

    lineItems.forEach((item) => {
      if (item.description.trim() && !item.unitPrice) {
        newErrors[`lineItem_${item.id}`] = 'Price is required'
      }
      if (item.unitPrice && !item.description.trim()) {
        newErrors[`lineItem_${item.id}`] = 'Description is required'
      }
    })

    if (dueDateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)) {
      newErrors.dueDate = 'Please enter a valid date (YYYY-MM-DD)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit handlers
  const handleSaveDraft = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving')
      return
    }
    await saveInvoice(false)
  }

  const handleSaveAndSend = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before sending')
      return
    }
    await saveInvoice(true)
  }

  const saveInvoice = async (sendImmediately: boolean) => {
    if (!selectedClient) return

    setSaving(true)
    try {
      const validItems = lineItems.filter(
        (item) => item.description.trim() && parseFloat(item.unitPrice) > 0
      )

      const items = validItems.map((item) => ({
        description: item.description.trim(),
        quantity: parseInt(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice),
      }))

      const result = await api.createAdminInvoice({
        clientId: selectedClient.id,
        items,
        notes: notes.trim() || undefined,
        dueDate: dueDateStr || undefined,
        taxRate: parseFloat(taxRate) || 0,
      })

      if (sendImmediately && result.invoice?.id) {
        await api.sendAdminInvoice(result.invoice.id)
        Alert.alert('Success', 'Invoice created and sent!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ])
      } else {
        Alert.alert('Success', 'Invoice saved as draft!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ])
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to cancel? Any unsaved changes will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    )
  }

  // Date modal handlers
  const openDateModal = () => {
    setTempDate(dueDateStr)
    setShowDateModal(true)
  }

  const saveDateFromModal = () => {
    if (tempDate && /^\d{4}-\d{2}-\d{2}$/.test(tempDate)) {
      setDueDateStr(tempDate)
      if (errors.dueDate) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.dueDate
          return newErrors
        })
      }
    }
    setShowDateModal(false)
  }

  // Quick date options
  const setQuickDate = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    setTempDate(formatDateForApi(date))
  }

  // Filter clients based on search
  const filteredClients = clientSearchQuery
    ? clients.filter(
        (client) =>
          client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
          client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
          client.clientNumber.toLowerCase().includes(clientSearchQuery.toLowerCase())
      )
    : clients

  // Render client picker item
  const renderClientItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={[styles.clientItem, selectedClient?.id === item.id && styles.clientItemSelected]}
      onPress={() => {
        setSelectedClient(item)
        setShowClientPicker(false)
        setClientSearchQuery('')
        if (errors.client) {
          setErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors.client
            return newErrors
          })
        }
      }}
    >
      <View style={styles.clientItemContent}>
        <Text style={styles.clientItemName}>{item.name}</Text>
        <Text style={styles.clientItemEmail}>{item.email}</Text>
        <Text style={styles.clientItemNumber}>#{item.clientNumber}</Text>
      </View>
      {selectedClient?.id === item.id && (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  )

  // Render line item
  const renderLineItem = (item: LineItem, index: number) => (
    <View key={item.id} style={styles.lineItemContainer}>
      {index === 0 && (
        <View style={styles.lineItemHeader}>
          <Text style={[styles.lineItemHeaderText, { flex: 3 }]}>Description</Text>
          <Text style={[styles.lineItemHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
          <Text style={[styles.lineItemHeaderText, { flex: 1.5, textAlign: 'right' }]}>Price</Text>
          <Text style={[styles.lineItemHeaderText, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
          <View style={{ width: 32 }} />
        </View>
      )}
      <View style={styles.lineItemRow}>
        <TextInput
          style={[styles.input, styles.lineItemDescription, errors[`lineItem_${item.id}`] && styles.inputError]}
          placeholder="Description"
          placeholderTextColor={colors.textMuted}
          value={item.description}
          onChangeText={(value) => updateLineItem(item.id, 'description', value)}
        />
        <TextInput
          style={[styles.input, styles.lineItemQty]}
          placeholder="1"
          placeholderTextColor={colors.textMuted}
          value={item.quantity}
          onChangeText={(value) => updateLineItem(item.id, 'quantity', value)}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, styles.lineItemPrice, errors[`lineItem_${item.id}`] && styles.inputError]}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          value={item.unitPrice}
          onChangeText={(value) => updateLineItem(item.id, 'unitPrice', value)}
          keyboardType="decimal-pad"
        />
        <Text style={styles.lineItemTotal}>{formatCurrency(calculateLineTotal(item))}</Text>
        <TouchableOpacity
          style={styles.removeItemButton}
          onPress={() => removeLineItem(item.id)}
          disabled={lineItems.length === 1}
        >
          <Ionicons
            name="close-circle"
            size={24}
            color={lineItems.length === 1 ? colors.borderLight : colors.error}
          />
        </TouchableOpacity>
      </View>
      {errors[`lineItem_${item.id}`] && (
        <Text style={styles.lineItemError}>{errors[`lineItem_${item.id}`]}</Text>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Invoice</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Client Selection */}
          <Text style={styles.sectionTitle}>Client</Text>
          <Card style={styles.card}>
            <TouchableOpacity
              style={[styles.selectButton, errors.client && styles.selectButtonError]}
              onPress={() => setShowClientPicker(true)}
            >
              {selectedClient ? (
                <View style={styles.selectedClientInfo}>
                  <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
                  <Text style={styles.selectedClientEmail}>{selectedClient.email}</Text>
                </View>
              ) : (
                <Text style={styles.selectButtonPlaceholder}>Select a client...</Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {errors.client && <Text style={styles.errorText}>{errors.client}</Text>}
          </Card>

          {/* Due Date */}
          <Text style={styles.sectionTitle}>Due Date</Text>
          <Card style={styles.card}>
            <TouchableOpacity
              style={[styles.dateButton, errors.dueDate && styles.selectButtonError]}
              onPress={openDateModal}
            >
              <Text style={styles.dateButtonText}>{getDisplayDate(dueDateStr)}</Text>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {errors.dueDate && <Text style={styles.errorText}>{errors.dueDate}</Text>}
          </Card>

          {/* Line Items */}
          <View style={styles.lineItemsSection}>
            <View style={styles.lineItemsSectionHeader}>
              <Text style={styles.sectionTitle}>Line Items</Text>
              <TouchableOpacity style={styles.addItemButton} onPress={addLineItem}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>
            {errors.lineItems && <Text style={styles.errorText}>{errors.lineItems}</Text>}
          </View>

          <Card style={styles.card}>
            {lineItems.map((item, index) => renderLineItem(item, index))}

            {/* Totals */}
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(calculateSubtotal())}</Text>
              </View>
              <View style={styles.totalRow}>
                <View style={styles.taxInputContainer}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <TextInput
                    style={styles.taxInput}
                    value={taxRate}
                    onChangeText={setTaxRate}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.taxPercentLabel}>%</Text>
                </View>
                <Text style={styles.totalValue}>{formatCurrency(calculateTax())}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(calculateTotal())}</Text>
              </View>
            </View>
          </Card>

          {/* Notes */}
          <Text style={styles.sectionTitle}>Notes / Terms</Text>
          <Card style={styles.card}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add notes or payment terms (visible to client)..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleCancel}
              style={styles.cancelButton}
            />
            <Button
              title={saving ? 'Saving...' : 'Save Draft'}
              variant="secondary"
              onPress={handleSaveDraft}
              loading={saving}
              disabled={saving}
              style={styles.draftButton}
            />
            <Button
              title={saving ? 'Saving...' : 'Save & Send'}
              onPress={handleSaveAndSend}
              loading={saving}
              disabled={saving}
              style={styles.sendButton}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Client Picker Modal */}
      <Modal visible={showClientPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => {
                setShowClientPicker(false)
                setClientSearchQuery('')
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients..."
                placeholderTextColor={colors.textMuted}
                value={clientSearchQuery}
                onChangeText={setClientSearchQuery}
              />
              {clientSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setClientSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {loadingClients ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredClients}
                renderItem={renderClientItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.clientList}
                ListEmptyComponent={
                  <View style={styles.emptyClients}>
                    <Text style={styles.emptyClientsText}>
                      {clientSearchQuery ? 'No clients found' : 'No clients available'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Due Date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateModalBody}>
              {/* Quick date options */}
              <Text style={styles.quickDateLabel}>Quick Select</Text>
              <View style={styles.quickDateRow}>
                <TouchableOpacity style={styles.quickDateButton} onPress={() => setQuickDate(7)}>
                  <Text style={styles.quickDateButtonText}>7 days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickDateButton} onPress={() => setQuickDate(14)}>
                  <Text style={styles.quickDateButtonText}>14 days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickDateButton} onPress={() => setQuickDate(30)}>
                  <Text style={styles.quickDateButtonText}>30 days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickDateButton} onPress={() => setQuickDate(60)}>
                  <Text style={styles.quickDateButtonText}>60 days</Text>
                </TouchableOpacity>
              </View>

              {/* Manual date input */}
              <Text style={styles.dateInputLabel}>Or enter date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.dateInput}
                value={tempDate}
                onChangeText={setTempDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />

              {tempDate && (
                <Text style={styles.datePreview}>
                  Selected: {getDisplayDate(tempDate)}
                </Text>
              )}

              <View style={styles.dateModalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowDateModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Set Date"
                  onPress={saveDateFromModal}
                  style={{ flex: 1, marginLeft: spacing.md }}
                />
              </View>
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
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  card: {
    padding: spacing.lg,
  },

  // Client Selection
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  selectButtonError: {
    borderColor: colors.error,
  },
  selectButtonPlaceholder: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  selectedClientInfo: {
    flex: 1,
  },
  selectedClientName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  selectedClientEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Date
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  dateButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },

  // Line Items
  lineItemsSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  lineItemsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  addItemText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  lineItemContainer: {
    marginBottom: spacing.md,
  },
  lineItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingRight: 32,
  },
  lineItemHeaderText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  inputError: {
    borderColor: colors.error,
  },
  lineItemDescription: {
    flex: 3,
  },
  lineItemQty: {
    flex: 1,
    textAlign: 'center',
  },
  lineItemPrice: {
    flex: 1.5,
    textAlign: 'right',
  },
  lineItemTotal: {
    flex: 1.5,
    textAlign: 'right',
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  removeItemButton: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineItemError: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Totals
  totalsContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  taxInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taxInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: fontSize.sm,
    width: 50,
    textAlign: 'center',
  },
  taxPercentLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  grandTotalRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grandTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  // Notes
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
  },
  draftButton: {
    flex: 1,
  },
  sendButton: {
    flex: 1.5,
  },

  // Error
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
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
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientList: {
    padding: spacing.lg,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  clientItemContent: {
    flex: 1,
  },
  clientItemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  clientItemEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clientItemNumber: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyClients: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyClientsText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  // Date Modal
  dateModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  dateModalBody: {
    padding: spacing.xl,
  },
  quickDateLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  quickDateButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  dateInputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dateInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  datePreview: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  dateModalButtons: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
})
