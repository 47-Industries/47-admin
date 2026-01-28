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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'
import { Invoice, InvoiceItem, Client } from '../../types'

interface InvoicesScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  hideHeader?: boolean
}

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
]

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  DRAFT: 'default',
  SENT: 'primary',
  VIEWED: 'primary',
  PAID: 'success',
  OVERDUE: 'error',
  CANCELLED: 'default',
  REFUNDED: 'warning',
}

interface LineItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

export function InvoicesScreen({ navigation, hideHeader }: InvoicesScreenProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstanding: 0,
    paid: 0,
    overdue: 0,
  })

  // Create Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: '1', unitPrice: '' },
  ])
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [creating, setCreating] = useState(false)

  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchInvoices = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const params: { page?: number; status?: string; search?: string } = { page: pageNum }
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search

      const data = await api.getAdminInvoices(params)
      const newInvoices = data.invoices || []

      if (refresh || pageNum === 1) {
        setInvoices(newInvoices)
      } else {
        setInvoices((prev) => [...prev, ...newInvoices])
      }

      // Calculate stats
      const allInvoices = refresh || pageNum === 1 ? newInvoices : [...invoices, ...newInvoices]
      const paidInvoices = allInvoices.filter((i: Invoice) => i.status === 'PAID')
      const overdueInvoices = allInvoices.filter((i: Invoice) => i.status === 'OVERDUE')
      const outstandingInvoices = allInvoices.filter((i: Invoice) =>
        ['SENT', 'VIEWED', 'OVERDUE'].includes(i.status)
      )

      setStats({
        totalRevenue: paidInvoices.reduce((sum: number, i: Invoice) => sum + Number(i.total), 0),
        outstanding: outstandingInvoices.reduce((sum: number, i: Invoice) => sum + Number(i.total), 0),
        paid: paidInvoices.length,
        overdue: overdueInvoices.length,
      })

      setHasMore(newInvoices.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, search, invoices])

  const fetchClients = async () => {
    try {
      const data = await api.getAdminClients()
      setClients(data.clients || [])
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchInvoices(1, true)
  }, [statusFilter])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setLoading(true)
      fetchInvoices(1, true)
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [search])

  const onRefresh = () => {
    setRefreshing(true)
    fetchInvoices(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchInvoices(page + 1)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
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

  const isOverdue = (invoice: Invoice) => {
    return invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && new Date(invoice.dueDate) < new Date()
  }

  // Create Invoice Functions
  const openCreateModal = () => {
    setSelectedClient(null)
    setLineItems([{ id: '1', description: '', quantity: '1', unitPrice: '' }])
    setInvoiceNotes('')
    setDueDate('')
    fetchClients()
    setShowCreateModal(true)
  }

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
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unitPrice) || 0
      return sum + qty * price
    }, 0)
  }

  const createInvoice = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client')
      return
    }

    const validItems = lineItems.filter(
      (item) => item.description && parseFloat(item.unitPrice) > 0
    )

    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one line item with a description and price')
      return
    }

    setCreating(true)
    try {
      const items = validItems.map((item) => ({
        description: item.description,
        quantity: parseInt(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice),
      }))

      await api.createAdminInvoice({
        clientId: selectedClient.id,
        items,
        notes: invoiceNotes || undefined,
        dueDate: dueDate || undefined,
      })

      Alert.alert('Success', 'Invoice created successfully')
      setShowCreateModal(false)
      fetchInvoices(1, true)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invoice')
    } finally {
      setCreating(false)
    }
  }

  // Detail View Functions
  const openDetailModal = async (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowDetailModal(true)
    setLoadingDetail(true)

    try {
      const data = await api.getAdminInvoice(invoice.id)
      setSelectedInvoice(data.invoice)
    } catch (error) {
      console.error('Failed to fetch invoice details:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const markAsPaid = async () => {
    if (!selectedInvoice) return

    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to mark this invoice as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.updateAdminInvoice(selectedInvoice.id, { status: 'PAID' })
              Alert.alert('Success', 'Invoice marked as paid')
              setShowDetailModal(false)
              fetchInvoices(1, true)
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update invoice')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const sendInvoice = async () => {
    if (!selectedInvoice) return

    Alert.alert(
      'Send Invoice',
      `Send invoice to ${selectedInvoice.client?.email || 'client'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.sendAdminInvoice(selectedInvoice.id)
              Alert.alert('Success', 'Invoice sent successfully')
              setShowDetailModal(false)
              fetchInvoices(1, true)
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send invoice')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const overdue = isOverdue(item)
    const displayStatus = overdue ? 'OVERDUE' : item.status

    return (
      <TouchableOpacity onPress={() => navigation.navigate('InvoiceDetail', { id: item.id })} activeOpacity={0.7}>
        <Card style={[styles.invoiceCard, overdue && styles.invoiceCardOverdue]}>
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.invoiceNumber}>#{item.invoiceNumber}</Text>
              <Text style={styles.clientName}>{item.client?.name || 'Unknown Client'}</Text>
            </View>
            <Badge text={displayStatus} variant={statusColors[displayStatus] || 'default'} />
          </View>
          <View style={styles.invoiceDetails}>
            <View style={styles.invoiceInfo}>
              <Text style={styles.infoLabel}>Due Date</Text>
              <Text style={[styles.infoValue, overdue && styles.infoValueOverdue]}>
                {formatDate(item.dueDate)}
              </Text>
            </View>
            <View style={styles.invoiceAmount}>
              <Text style={styles.infoLabel}>Amount</Text>
              <Text style={styles.amountValue}>{formatCurrency(Number(item.total))}</Text>
            </View>
          </View>
          <View style={styles.invoiceFooter}>
            <Text style={styles.footerText}>Created {formatDate(item.createdAt)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const renderClientItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.clientItem}
      onPress={() => {
        setSelectedClient(item)
        setShowClientPicker(false)
      }}
    >
      <View>
        <Text style={styles.clientItemName}>{item.name}</Text>
        <Text style={styles.clientItemEmail}>{item.email}</Text>
      </View>
      {selectedClient?.id === item.id && (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  )

  const renderLineItem = (item: LineItem, index: number) => (
    <View key={item.id} style={styles.lineItemRow}>
      <View style={styles.lineItemInputs}>
        <TextInput
          style={[styles.input, styles.lineItemDescription]}
          placeholder="Description"
          placeholderTextColor={colors.textMuted}
          value={item.description}
          onChangeText={(value) => updateLineItem(item.id, 'description', value)}
        />
        <TextInput
          style={[styles.input, styles.lineItemQty]}
          placeholder="Qty"
          placeholderTextColor={colors.textMuted}
          value={item.quantity}
          onChangeText={(value) => updateLineItem(item.id, 'quantity', value)}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, styles.lineItemPrice]}
          placeholder="Price"
          placeholderTextColor={colors.textMuted}
          value={item.unitPrice}
          onChangeText={(value) => updateLineItem(item.id, 'unitPrice', value)}
          keyboardType="decimal-pad"
        />
      </View>
      {lineItems.length > 1 && (
        <TouchableOpacity
          style={styles.removeItemButton}
          onPress={() => removeLineItem(item.id)}
        >
          <Ionicons name="close-circle" size={24} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Invoices</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('InvoiceCreate')}>
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Revenue</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(stats.totalRevenue)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Outstanding</Text>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {formatCurrency(stats.outstanding)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Paid</Text>
          <Text style={styles.statValue}>{stats.paid}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Overdue</Text>
          <Text style={[styles.statValue, { color: stats.overdue > 0 ? colors.error : colors.text }]}>
            {stats.overdue}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by invoice # or client..."
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

      {/* Status Filters */}
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

      {/* Invoice List */}
      <FlatList
        data={invoices}
        renderItem={renderInvoice}
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
              icon="receipt-outline"
              title="No invoices found"
              description="Create your first invoice to get started"
              actionLabel="Create Invoice"
              onAction={openCreateModal}
            />
          ) : null
        }
      />

      {/* Create Invoice Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Invoice</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Client Selection */}
              <Text style={styles.inputLabel}>Client *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowClientPicker(true)}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    !selectedClient && { color: colors.textMuted },
                  ]}
                >
                  {selectedClient ? selectedClient.name : 'Select a client...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Due Date */}
              <Text style={styles.inputLabel}>Due Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor={colors.textMuted}
                value={dueDate}
                onChangeText={setDueDate}
              />

              {/* Line Items */}
              <View style={styles.lineItemsHeader}>
                <Text style={styles.inputLabel}>Line Items *</Text>
                <TouchableOpacity style={styles.addItemButton} onPress={addLineItem}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={styles.addItemText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {lineItems.map((item, index) => renderLineItem(item, index))}

              {/* Subtotal */}
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>{formatCurrency(calculateSubtotal())}</Text>
              </View>

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes for the client..."
                placeholderTextColor={colors.textMuted}
                value={invoiceNotes}
                onChangeText={setInvoiceNotes}
                multiline
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowCreateModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Create Invoice"
                  onPress={createInvoice}
                  loading={creating}
                  style={{ flex: 1, marginLeft: spacing.md }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Client Picker Modal */}
      <Modal visible={showClientPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setShowClientPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={clients}
              renderItem={renderClientItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.clientList}
              ListEmptyComponent={
                <View style={styles.emptyClients}>
                  <Text style={styles.emptyClientsText}>No clients found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  #{selectedInvoice?.invoiceNumber || ''}
                </Text>
                {selectedInvoice && (
                  <Badge
                    text={isOverdue(selectedInvoice) ? 'OVERDUE' : selectedInvoice.status}
                    variant={
                      statusColors[
                        isOverdue(selectedInvoice) ? 'OVERDUE' : selectedInvoice.status
                      ] || 'default'
                    }
                  />
                )}
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : selectedInvoice ? (
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {/* Client Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Client</Text>
                  <Card style={styles.detailCard}>
                    <Text style={styles.detailClientName}>
                      {selectedInvoice.client?.name || 'Unknown'}
                    </Text>
                    <Text style={styles.detailClientEmail}>
                      {selectedInvoice.client?.email || ''}
                    </Text>
                    {selectedInvoice.client?.company && (
                      <Text style={styles.detailClientCompany}>
                        {selectedInvoice.client.company}
                      </Text>
                    )}
                  </Card>
                </View>

                {/* Dates */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Dates</Text>
                  <Card style={styles.detailCard}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Created</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedInvoice.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Due Date</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          isOverdue(selectedInvoice) && { color: colors.error },
                        ]}
                      >
                        {formatDate(selectedInvoice.dueDate)}
                      </Text>
                    </View>
                    {selectedInvoice.paidAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Paid</Text>
                        <Text style={[styles.detailValue, { color: colors.success }]}>
                          {formatDate(selectedInvoice.paidAt)}
                        </Text>
                      </View>
                    )}
                  </Card>
                </View>

                {/* Line Items */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Line Items</Text>
                  <Card style={styles.detailCard}>
                    {selectedInvoice.items?.map((item: InvoiceItem, index: number) => (
                      <View
                        key={item.id || index}
                        style={[
                          styles.lineItemDetail,
                          index < (selectedInvoice.items?.length || 0) - 1 &&
                            styles.lineItemDetailBorder,
                        ]}
                      >
                        <View style={styles.lineItemDetailLeft}>
                          <Text style={styles.lineItemDetailDesc}>{item.description}</Text>
                          <Text style={styles.lineItemDetailQty}>
                            {item.quantity} x {formatCurrency(Number(item.unitPrice))}
                          </Text>
                        </View>
                        <Text style={styles.lineItemDetailTotal}>
                          {formatCurrency(Number(item.total))}
                        </Text>
                      </View>
                    ))}
                  </Card>
                </View>

                {/* Totals */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Summary</Text>
                  <Card style={styles.detailCard}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Subtotal</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(Number(selectedInvoice.subtotal))}
                      </Text>
                    </View>
                    {selectedInvoice.tax > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Tax</Text>
                        <Text style={styles.detailValue}>
                          {formatCurrency(Number(selectedInvoice.tax))}
                        </Text>
                      </View>
                    )}
                    {selectedInvoice.discount > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Discount</Text>
                        <Text style={[styles.detailValue, { color: colors.success }]}>
                          -{formatCurrency(Number(selectedInvoice.discount))}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.detailRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>
                        {formatCurrency(Number(selectedInvoice.total))}
                      </Text>
                    </View>
                  </Card>
                </View>

                {/* Notes */}
                {selectedInvoice.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Notes</Text>
                    <Card style={styles.detailCard}>
                      <Text style={styles.notesText}>{selectedInvoice.notes}</Text>
                    </Card>
                  </View>
                )}

                {/* Actions */}
                {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                  <View style={styles.actionButtons}>
                    {selectedInvoice.status === 'DRAFT' && (
                      <Button
                        title="Send Invoice"
                        onPress={sendInvoice}
                        loading={actionLoading}
                        style={{ flex: 1 }}
                      />
                    )}
                    {['SENT', 'VIEWED', 'OVERDUE'].includes(selectedInvoice.status) && (
                      <>
                        <Button
                          title="Resend"
                          variant="outline"
                          onPress={sendInvoice}
                          loading={actionLoading}
                          style={{ flex: 1 }}
                        />
                        <Button
                          title="Mark Paid"
                          onPress={markAsPaid}
                          loading={actionLoading}
                          style={{ flex: 1, marginLeft: spacing.md }}
                        />
                      </>
                    )}
                  </View>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            ) : null}
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
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
  invoiceCard: {
    marginBottom: spacing.md,
  },
  invoiceCardOverdue: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  invoiceNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  clientName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  invoiceInfo: {},
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValueOverdue: {
    color: colors.error,
  },
  invoiceAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
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
  modalScroll: {
    padding: spacing.xl,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
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
  selectButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  lineItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addItemText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lineItemInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lineItemDescription: {
    flex: 3,
    marginBottom: 0,
  },
  lineItemQty: {
    flex: 1,
    marginBottom: 0,
  },
  lineItemPrice: {
    flex: 1.5,
    marginBottom: 0,
  },
  removeItemButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subtotalLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  subtotalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  // Client Picker
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
  },
  clientList: {
    padding: spacing.xl,
  },
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clientItemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  clientItemEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyClients: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyClientsText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  // Detail Modal
  detailModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScroll: {
    padding: spacing.xl,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  detailCard: {
    padding: spacing.lg,
  },
  detailClientName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  detailClientEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  detailClientCompany: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
  },
  lineItemDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  lineItemDetailBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineItemDetailLeft: {
    flex: 1,
  },
  lineItemDetailDesc: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  lineItemDetailQty: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  lineItemDetailTotal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
})
