import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'
import { EmptyState } from '../../components/EmptyState'

interface DiscountCode {
  id: string
  code: string
  description?: string | null
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number | string
  minPurchase?: number | string | null
  maxUses?: number | null
  usedCount: number
  active: boolean
  startsAt?: string | null
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
}

interface DiscountCodeFormData {
  code: string
  description: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: string
  minPurchase: string
  maxUses: string
  expiresAt: string
  active: boolean
}

const EMPTY_FORM: DiscountCodeFormData = {
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: '',
  minPurchase: '',
  maxUses: '',
  expiresAt: '',
  active: true,
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDiscountValue(code: DiscountCode): string {
  const val = typeof code.value === 'string' ? parseFloat(code.value) : code.value
  if (code.type === 'PERCENTAGE') {
    return `${val}%`
  }
  return formatCurrency(val)
}

function isExpired(code: DiscountCode): boolean {
  if (!code.expiresAt) return false
  return new Date(code.expiresAt) < new Date()
}

function isAtMaxUses(code: DiscountCode): boolean {
  if (!code.maxUses || code.maxUses === 0) return false
  return code.usedCount >= code.maxUses
}

export function DiscountCodesScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filteredCodes, setFilteredCodes] = useState<DiscountCode[]>([])

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null)
  const [formData, setFormData] = useState<DiscountCodeFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalUses: 0,
  })

  const fetchCodes = useCallback(async () => {
    try {
      const data = await api.getDiscountCodes()
      const codesList = data.codes || []
      setCodes(codesList)

      const activeCount = codesList.filter((c: DiscountCode) => c.active && !isExpired(c) && !isAtMaxUses(c)).length
      const totalUses = codesList.reduce((sum: number, c: DiscountCode) => sum + (c.usedCount || 0), 0)
      setStats({
        total: codesList.length,
        active: activeCount,
        totalUses,
      })
    } catch (error) {
      console.error('Failed to fetch discount codes:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCodes()
  }, [fetchCodes])

  useEffect(() => {
    if (!search.trim()) {
      setFilteredCodes(codes)
    } else {
      const searchLower = search.toLowerCase()
      setFilteredCodes(
        codes.filter((c) =>
          c.code.toLowerCase().includes(searchLower) ||
          (c.description && c.description.toLowerCase().includes(searchLower))
        )
      )
    }
  }, [search, codes])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCodes()
  }

  const openCreateModal = () => {
    setEditingCode(null)
    setFormData(EMPTY_FORM)
    setShowFormModal(true)
  }

  const openEditModal = (code: DiscountCode) => {
    setEditingCode(code)
    setFormData({
      code: code.code,
      description: code.description || '',
      type: code.type,
      value: String(code.value),
      minPurchase: code.minPurchase ? String(code.minPurchase) : '',
      maxUses: code.maxUses ? String(code.maxUses) : '',
      expiresAt: code.expiresAt ? code.expiresAt.split('T')[0] : '',
      active: code.active,
    })
    setShowFormModal(true)
  }

  const handleAutoGenerate = () => {
    setFormData(prev => ({ ...prev, code: generateCode() }))
  }

  const handleSave = async () => {
    if (!formData.code.trim()) {
      Alert.alert('Validation Error', 'Please enter a discount code.')
      return
    }
    if (!formData.value || parseFloat(formData.value) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid discount value.')
      return
    }
    if (formData.type === 'PERCENTAGE' && parseFloat(formData.value) > 100) {
      Alert.alert('Validation Error', 'Percentage value cannot exceed 100.')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description || undefined,
        type: formData.type,
        value: parseFloat(formData.value),
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses, 10) : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
        active: formData.active,
      }

      if (editingCode) {
        await api.updateDiscountCode(editingCode.id, payload)
        Alert.alert('Success', 'Discount code updated.')
      } else {
        await api.createDiscountCode(payload)
        Alert.alert('Success', 'Discount code created.')
      }

      setShowFormModal(false)
      await fetchCodes()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save discount code.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (code: DiscountCode) => {
    Alert.alert(
      'Delete Discount Code',
      `Are you sure you want to delete the code "${code.code}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDiscountCode(code.id)
              Alert.alert('Success', 'Discount code deleted.')
              await fetchCodes()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete discount code.')
            }
          },
        },
      ]
    )
  }

  const handleToggleActive = async (code: DiscountCode) => {
    try {
      await api.updateDiscountCode(code.id, { active: !code.active })
      await fetchCodes()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update discount code.')
    }
  }

  const getStatusBadge = (code: DiscountCode): { text: string; variant: 'success' | 'error' | 'warning' | 'default' } => {
    if (!code.active) return { text: 'INACTIVE', variant: 'default' }
    if (isExpired(code)) return { text: 'EXPIRED', variant: 'error' }
    if (isAtMaxUses(code)) return { text: 'MAX USES', variant: 'warning' }
    return { text: 'ACTIVE', variant: 'success' }
  }

  const renderCodeItem = ({ item }: { item: DiscountCode }) => {
    const badge = getStatusBadge(item)

    return (
      <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
        <Card style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <View style={styles.codeInfo}>
              <Text style={styles.codeText}>{item.code}</Text>
              {item.description ? (
                <Text style={styles.codeDescription} numberOfLines={1}>{item.description}</Text>
              ) : null}
            </View>
            <Badge text={badge.text} variant={badge.variant} />
          </View>

          <View style={styles.codeDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
              <Text style={styles.detailText}>
                {item.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.valueText}>{formatDiscountValue(item)}</Text>
            </View>
          </View>

          <View style={styles.codeFooter}>
            <View style={styles.usageInfo}>
              <Ionicons name="bar-chart-outline" size={14} color={colors.textMuted} />
              <Text style={styles.usageText}>
                {item.usedCount} use{item.usedCount !== 1 ? 's' : ''}
                {item.maxUses ? ` / ${item.maxUses}` : ''}
              </Text>
            </View>
            {item.expiresAt && (
              <Text style={[styles.expiryText, isExpired(item) && styles.expiredText]}>
                {isExpired(item) ? 'Expired' : `Expires ${formatDate(item.expiresAt)}`}
              </Text>
            )}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => handleToggleActive(item)}
            >
              <Ionicons
                name={item.active ? 'toggle' : 'toggle-outline'}
                size={20}
                color={item.active ? colors.success : colors.textMuted}
              />
              <Text style={[styles.toggleText, item.active ? styles.toggleActiveText : null]}>
                {item.active ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCode ? 'Edit Discount Code' : 'Create Discount Code'}
              </Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Code Field */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Code</Text>
              <View style={styles.codeInputRow}>
                <TextInput
                  style={[styles.formInput, styles.codeInputField]}
                  value={formData.code}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, code: text.toUpperCase() }))}
                  placeholder="e.g. SAVE20"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  editable={!saving}
                />
                <TouchableOpacity style={styles.generateButton} onPress={handleAutoGenerate} disabled={saving}>
                  <Ionicons name="dice-outline" size={18} color={colors.primary} />
                  <Text style={styles.generateButtonText}>Generate</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Internal description for this code"
                placeholderTextColor={colors.textMuted}
                editable={!saving}
              />
            </View>

            {/* Type Selector */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Discount Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeOption, formData.type === 'PERCENTAGE' && styles.typeOptionActive]}
                  onPress={() => setFormData(prev => ({ ...prev, type: 'PERCENTAGE' }))}
                  disabled={saving}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={18}
                    color={formData.type === 'PERCENTAGE' ? '#fff' : colors.textMuted}
                  />
                  <Text style={[styles.typeOptionText, formData.type === 'PERCENTAGE' && styles.typeOptionTextActive]}>
                    Percentage
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeOption, formData.type === 'FIXED_AMOUNT' && styles.typeOptionActive]}
                  onPress={() => setFormData(prev => ({ ...prev, type: 'FIXED_AMOUNT' }))}
                  disabled={saving}
                >
                  <Ionicons
                    name="cash-outline"
                    size={18}
                    color={formData.type === 'FIXED_AMOUNT' ? '#fff' : colors.textMuted}
                  />
                  <Text style={[styles.typeOptionText, formData.type === 'FIXED_AMOUNT' && styles.typeOptionTextActive]}>
                    Fixed Amount
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Value */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>
                Value {formData.type === 'PERCENTAGE' ? '(%)' : '($)'}
              </Text>
              <View style={styles.valueInputContainer}>
                <Text style={styles.valuePrefix}>
                  {formData.type === 'PERCENTAGE' ? '%' : '$'}
                </Text>
                <TextInput
                  style={[styles.formInput, styles.valueInput]}
                  value={formData.value}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, value: text }))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>
            </View>

            {/* Min Purchase */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Minimum Order Amount (optional)</Text>
              <View style={styles.valueInputContainer}>
                <Text style={styles.valuePrefix}>$</Text>
                <TextInput
                  style={[styles.formInput, styles.valueInput]}
                  value={formData.minPurchase}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, minPurchase: text }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>
            </View>

            {/* Max Uses */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Maximum Uses (optional, 0 = unlimited)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.maxUses}
                onChangeText={(text) => setFormData(prev => ({ ...prev, maxUses: text }))}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                editable={!saving}
              />
            </View>

            {/* Expiry Date */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Expiry Date (optional, YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.expiresAt}
                onChangeText={(text) => setFormData(prev => ({ ...prev, expiresAt: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                editable={!saving}
              />
            </View>

            {/* Active Toggle */}
            <View style={styles.formSection}>
              <View style={styles.toggleRow}>
                <Text style={styles.formLabel}>Active</Text>
                <Switch
                  value={formData.active}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, active: val }))}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor={formData.active ? '#fff' : colors.textMuted}
                  disabled={saving}
                />
              </View>
            </View>

            {/* Save/Cancel Buttons */}
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowFormModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingCode ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Discount Codes</Text>
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Codes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalUses}</Text>
            <Text style={styles.statLabel}>Total Uses</Text>
          </View>
        </View>
      </View>

      {/* Search + Create */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search codes..."
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
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Codes List */}
      <FlatList
        data={filteredCodes}
        renderItem={renderCodeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="pricetags-outline" title="No discount codes found" />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )
        }
      />

      {/* Form Modal */}
      {renderFormModal()}
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
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
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  codeCard: {
    marginBottom: spacing.md,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  codeInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  codeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  codeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  valueText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  codeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  usageText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  expiryText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  expiredText: {
    color: colors.error,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  toggleText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  toggleActiveText: {
    color: colors.success,
  },
  deleteButton: {
    padding: spacing.sm,
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
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
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
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeInputField: {
    flex: 1,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  generateButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  typeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  typeOptionTextActive: {
    color: '#fff',
  },
  valueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  valuePrefix: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  valueInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
})
