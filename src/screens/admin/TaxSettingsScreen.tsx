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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface TaxRate {
  id: string
  name: string
  country: string
  state: string | null
  zipCode: string | null
  city: string | null
  rate: number
  isCompound: boolean
  includeShipping: boolean
  priority: number
  active: boolean
}

interface TaxRateFormData {
  name: string
  country: string
  state: string
  city: string
  zipCode: string
  rate: string
  isCompound: boolean
  includeShipping: boolean
  priority: string
  active: boolean
}

const EMPTY_FORM: TaxRateFormData = {
  name: '',
  country: 'US',
  state: '',
  city: '',
  zipCode: '',
  rate: '',
  isCompound: false,
  includeShipping: false,
  priority: '0',
  active: true,
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
]

const getStateName = (code: string | null): string => {
  if (!code) return ''
  return US_STATES.find((s) => s.code === code)?.name || code
}

const formatPercent = (rate: number): string => {
  return `${(Number(rate) * 100).toFixed(2)}%`
}

export function TaxSettingsScreen({ navigation }: { navigation: any }) {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showStatePickerModal, setShowStatePickerModal] = useState(false)
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null)
  const [form, setForm] = useState<TaxRateFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [stateSearch, setStateSearch] = useState('')

  const fetchTaxRates = useCallback(async () => {
    try {
      const data = await api.getTaxRates()
      setTaxRates(data)
    } catch (error) {
      console.error('Failed to fetch tax rates:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTaxRates()
  }, [fetchTaxRates])

  const onRefresh = () => {
    setRefreshing(true)
    fetchTaxRates()
  }

  const openCreateModal = () => {
    setEditingRate(null)
    setForm(EMPTY_FORM)
    setShowFormModal(true)
  }

  const openEditModal = (rate: TaxRate) => {
    setEditingRate(rate)
    setForm({
      name: rate.name,
      country: rate.country,
      state: rate.state || '',
      city: rate.city || '',
      zipCode: rate.zipCode || '',
      rate: (Number(rate.rate) * 100).toFixed(2),
      isCompound: rate.isCompound,
      includeShipping: rate.includeShipping,
      priority: rate.priority.toString(),
      active: rate.active,
    })
    setShowFormModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Rate name is required.')
      return
    }
    if (!form.rate || isNaN(parseFloat(form.rate)) || parseFloat(form.rate) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid tax rate percentage.')
      return
    }

    setSaving(true)
    try {
      const rateDecimal = parseFloat(form.rate) / 100
      const payload = {
        name: form.name.trim(),
        country: form.country,
        state: form.state || null,
        city: form.city || null,
        zipCode: form.zipCode || null,
        rate: rateDecimal,
        isCompound: form.isCompound,
        includeShipping: form.includeShipping,
        priority: parseInt(form.priority) || 0,
        active: form.active,
      }

      if (editingRate) {
        await api.updateTaxRate(editingRate.id, payload)
      } else {
        await api.createTaxRate(payload)
      }

      setShowFormModal(false)
      await fetchTaxRates()
      Alert.alert('Success', editingRate ? 'Tax rate updated.' : 'Tax rate created.')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save tax rate.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (rate: TaxRate) => {
    Alert.alert(
      'Delete Tax Rate',
      `Are you sure you want to delete "${rate.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTaxRate(rate.id)
              await fetchTaxRates()
              Alert.alert('Success', 'Tax rate deleted.')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete tax rate.')
            }
          },
        },
      ]
    )
  }

  const handleToggleActive = async (rate: TaxRate) => {
    setTogglingId(rate.id)
    try {
      await api.updateTaxRate(rate.id, {
        name: rate.name,
        country: rate.country,
        state: rate.state,
        city: rate.city,
        zipCode: rate.zipCode,
        rate: Number(rate.rate),
        isCompound: rate.isCompound,
        includeShipping: rate.includeShipping,
        priority: rate.priority,
        active: !rate.active,
      })
      await fetchTaxRates()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update tax rate.')
    } finally {
      setTogglingId(null)
    }
  }

  const getLocationString = (rate: TaxRate): string => {
    const parts: string[] = [rate.country]
    if (rate.state) parts.push(getStateName(rate.state))
    if (rate.city) parts.push(rate.city)
    if (rate.zipCode) parts.push(`ZIP: ${rate.zipCode}`)
    return parts.join(' / ')
  }

  const activeCount = taxRates.filter((r) => r.active).length
  const inactiveCount = taxRates.filter((r) => !r.active).length

  const filteredStates = stateSearch.trim()
    ? US_STATES.filter(
        (s) =>
          s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
          s.code.toLowerCase().includes(stateSearch.toLowerCase())
      )
    : US_STATES

  const renderTaxRate = ({ item }: { item: TaxRate }) => (
    <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
      <Card style={styles.rateCard}>
        <View style={styles.rateHeader}>
          <View style={styles.rateInfo}>
            <Text style={styles.rateName}>{item.name}</Text>
            <Text style={styles.rateLocation}>{getLocationString(item)}</Text>
          </View>
          <View style={styles.rateValueContainer}>
            <Text style={styles.rateValue}>{formatPercent(item.rate)}</Text>
            <Badge
              text={item.active ? 'Active' : 'Inactive'}
              variant={item.active ? 'success' : 'default'}
            />
          </View>
        </View>

        {/* Tags */}
        {(item.isCompound || item.includeShipping) && (
          <View style={styles.tagsRow}>
            {item.isCompound && (
              <View style={[styles.tag, styles.tagPurple]}>
                <Text style={[styles.tagText, styles.tagTextPurple]}>Compound</Text>
              </View>
            )}
            {item.includeShipping && (
              <View style={[styles.tag, styles.tagBlue]}>
                <Text style={[styles.tagText, styles.tagTextBlue]}>+Shipping</Text>
              </View>
            )}
            {item.priority > 0 && (
              <View style={[styles.tag, styles.tagDefault]}>
                <Text style={[styles.tagText, styles.tagTextDefault]}>Priority: {item.priority}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleToggleActive(item)}
            disabled={togglingId === item.id}
          >
            {togglingId === item.id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons
                  name={item.active ? 'pause-circle-outline' : 'play-circle-outline'}
                  size={18}
                  color={item.active ? colors.warning : colors.success}
                />
                <Text style={[styles.toggleText, { color: item.active ? colors.warning : colors.success }]}>
                  {item.active ? 'Deactivate' : 'Activate'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  )

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRate ? 'Edit Tax Rate' : 'New Tax Rate'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowFormModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Rate Name */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Rate Name</Text>
              <TextInput
                style={styles.formInput}
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                placeholder="e.g., California State Tax"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Country */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Country</Text>
              <View style={styles.formRow}>
                <TouchableOpacity
                  style={[
                    styles.countryOption,
                    form.country === 'US' && styles.countryOptionActive,
                  ]}
                  onPress={() => setForm({ ...form, country: 'US' })}
                >
                  <Text
                    style={[
                      styles.countryOptionText,
                      form.country === 'US' && styles.countryOptionTextActive,
                    ]}
                  >
                    United States
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.countryOption,
                    form.country === 'CA' && styles.countryOptionActive,
                  ]}
                  onPress={() => setForm({ ...form, country: 'CA' })}
                >
                  <Text
                    style={[
                      styles.countryOptionText,
                      form.country === 'CA' && styles.countryOptionTextActive,
                    ]}
                  >
                    Canada
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* State */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>State (optional)</Text>
              <TouchableOpacity
                style={styles.formInput}
                onPress={() => {
                  setStateSearch('')
                  setShowStatePickerModal(true)
                }}
              >
                <Text style={form.state ? styles.formInputText : styles.formInputPlaceholder}>
                  {form.state ? getStateName(form.state) : 'All States'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* City and ZIP */}
            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>City (optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.city}
                  onChangeText={(text) => setForm({ ...form, city: text })}
                  placeholder="e.g., Los Angeles"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>ZIP (optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.zipCode}
                  onChangeText={(text) => setForm({ ...form, zipCode: text })}
                  placeholder="e.g., 90210"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Rate and Priority */}
            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Tax Rate (%)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.rate}
                  onChangeText={(text) => setForm({ ...form, rate: text })}
                  placeholder="e.g., 8.25"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Priority</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.priority}
                  onChangeText={(text) => setForm({ ...form, priority: text })}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Toggle Options */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Options</Text>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Compound Tax</Text>
                  <Text style={styles.switchDescription}>Calculate on subtotal + other taxes</Text>
                </View>
                <Switch
                  value={form.isCompound}
                  onValueChange={(val) => setForm({ ...form, isCompound: val })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Include Shipping</Text>
                  <Text style={styles.switchDescription}>Apply tax to shipping costs</Text>
                </View>
                <Switch
                  value={form.includeShipping}
                  onValueChange={(val) => setForm({ ...form, includeShipping: val })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Active</Text>
                  <Text style={styles.switchDescription}>Enable this tax rate</Text>
                </View>
                <Switch
                  value={form.active}
                  onValueChange={(val) => setForm({ ...form, active: val })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowFormModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingRate ? 'Update' : 'Create'} Tax Rate
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  const renderStatePickerModal = () => (
    <Modal visible={showStatePickerModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select State</Text>
            <TouchableOpacity
              onPress={() => setShowStatePickerModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.stateSearchContainer}>
            <Ionicons name="search-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.stateSearchInput}
              value={stateSearch}
              onChangeText={setStateSearch}
              placeholder="Search states..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[
              styles.stateOption,
              !form.state && styles.stateOptionActive,
            ]}
            onPress={() => {
              setForm({ ...form, state: '' })
              setShowStatePickerModal(false)
            }}
          >
            <Text
              style={[
                styles.stateOptionText,
                !form.state && styles.stateOptionTextActive,
              ]}
            >
              All States
            </Text>
            {!form.state && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>

          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item.code}
            renderItem={({ item: state }) => (
              <TouchableOpacity
                style={[
                  styles.stateOption,
                  form.state === state.code && styles.stateOptionActive,
                ]}
                onPress={() => {
                  setForm({ ...form, state: state.code })
                  setShowStatePickerModal(false)
                }}
              >
                <View>
                  <Text
                    style={[
                      styles.stateOptionText,
                      form.state === state.code && styles.stateOptionTextActive,
                    ]}
                  >
                    {state.name}
                  </Text>
                  <Text style={styles.stateOptionCode}>{state.code}</Text>
                </View>
                {form.state === state.code && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Tax Settings</Text>
          <Text style={styles.subtitle}>Configure tax rates by location</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{taxRates.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.textMuted }]}>{inactiveCount}</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>
      </View>

      {/* Add Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Tax Rate</Text>
        </TouchableOpacity>
      </View>

      {/* Tax Rates List */}
      <FlatList
        data={taxRates}
        renderItem={renderTaxRate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="calculator-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No tax rates configured</Text>
              <Text style={styles.emptySubtext}>
                Add a tax rate to start collecting taxes on orders
              </Text>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )
        }
      />

      {/* Modals */}
      {renderFormModal()}
      {renderStatePickerModal()}
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
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
  addButtonContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  rateCard: {
    marginBottom: spacing.md,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rateInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  rateName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  rateLocation: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  rateValueContainer: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  rateValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tagPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  tagBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  tagDefault: {
    backgroundColor: colors.surfaceHover,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  tagTextPurple: {
    color: colors.purple,
  },
  tagTextBlue: {
    color: colors.primary,
  },
  tagTextDefault: {
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
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
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
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
    maxHeight: '92%',
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
  closeButton: {
    padding: spacing.xs,
  },

  // Form Styles
  formField: {
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
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  formInputText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  formInputPlaceholder: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  countryOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  countryOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  countryOptionText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  countryOptionTextActive: {
    color: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  switchDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },

  // State Picker Styles
  stateSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  stateSearchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
  stateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stateOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  stateOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  stateOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  stateOptionCode: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
})
