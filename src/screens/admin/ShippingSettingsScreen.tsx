import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface ShippingRate {
  id: string
  name: string
  description?: string
  baseRate: number
  perItemRate: number
  perPoundRate: number
  freeShippingMin?: number
  minDays: number
  maxDays: number
  carrier?: string
  serviceCode?: string
  active: boolean
  sortOrder: number
}

interface ShippingZone {
  id: string
  name: string
  countries: string[]
  states?: string[]
  zipCodes?: string
  active: boolean
  priority: number
  rates: ShippingRate[]
}

const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL']

export function ShippingSettingsScreen({ navigation }: { navigation: any }) {
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Zone modal state
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)

  // Rate modal state
  const [showRateModal, setShowRateModal] = useState(false)
  const [editingRate, setEditingRate] = useState<{ zoneId: string; rate: ShippingRate | null } | null>(null)

  // Expanded zones
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())

  const fetchZones = useCallback(async () => {
    try {
      const data = await api.getShippingZones()
      setZones(data)
    } catch (error) {
      console.error('Error fetching shipping zones:', error)
      Alert.alert('Error', 'Failed to load shipping zones')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchZones()
  }, [fetchZones])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchZones()
  }, [fetchZones])

  const toggleZoneExpanded = (zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev)
      if (next.has(zoneId)) {
        next.delete(zoneId)
      } else {
        next.add(zoneId)
      }
      return next
    })
  }

  // Zone CRUD
  const handleSaveZone = async (data: Partial<ShippingZone>) => {
    try {
      setSaving(true)
      if (editingZone?.id) {
        await api.updateShippingZone(editingZone.id, data as any)
      } else {
        await api.createShippingZone(data as any)
      }
      setShowZoneModal(false)
      setEditingZone(null)
      fetchZones()
    } catch (error) {
      Alert.alert('Error', 'Failed to save shipping zone')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteZone = (zone: ShippingZone) => {
    Alert.alert(
      'Delete Shipping Zone',
      `Delete "${zone.name}" and all its rates? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteShippingZone(zone.id)
              fetchZones()
            } catch (error) {
              Alert.alert('Error', 'Failed to delete shipping zone')
            }
          },
        },
      ]
    )
  }

  // Rate CRUD
  const handleSaveRate = async (data: Partial<ShippingRate>) => {
    if (!editingRate) return
    try {
      setSaving(true)
      if (editingRate.rate?.id) {
        await api.updateShippingRate(editingRate.zoneId, editingRate.rate.id, data as any)
      } else {
        await api.createShippingRate(editingRate.zoneId, data as any)
      }
      setShowRateModal(false)
      setEditingRate(null)
      fetchZones()
    } catch (error) {
      Alert.alert('Error', 'Failed to save shipping rate')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRate = (zoneId: string, rate: ShippingRate) => {
    Alert.alert(
      'Delete Shipping Rate',
      `Delete "${rate.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteShippingRate(zoneId, rate.id)
              fetchZones()
            } catch (error) {
              Alert.alert('Error', 'Failed to delete shipping rate')
            }
          },
        },
      ]
    )
  }

  const renderRate = (zoneId: string, rate: ShippingRate) => (
    <View key={rate.id} style={styles.rateItem}>
      <View style={styles.rateInfo}>
        <View style={styles.rateHeader}>
          <Text style={styles.rateName}>{rate.name}</Text>
          {rate.carrier && (
            <Text style={styles.rateCarrier}>({rate.carrier})</Text>
          )}
          <Badge
            text={rate.active ? 'Active' : 'Inactive'}
            variant={rate.active ? 'success' : 'default'}
          />
        </View>
        <Text style={styles.rateDetails}>
          ${Number(rate.baseRate).toFixed(2)} base
          {Number(rate.perItemRate) > 0 && ` + $${Number(rate.perItemRate).toFixed(2)}/item`}
          {Number(rate.perPoundRate) > 0 && ` + $${Number(rate.perPoundRate).toFixed(2)}/lb`}
        </Text>
        {rate.freeShippingMin != null && Number(rate.freeShippingMin) > 0 && (
          <Text style={styles.rateFreeShipping}>
            Free over ${Number(rate.freeShippingMin).toFixed(0)}
          </Text>
        )}
        <Text style={styles.rateDays}>
          {rate.minDays}-{rate.maxDays} business days
        </Text>
      </View>
      <View style={styles.rateActions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            setEditingRate({ zoneId, rate })
            setShowRateModal(true)
          }}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleDeleteRate(zoneId, rate)}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderZone = (zone: ShippingZone) => {
    const isExpanded = expandedZones.has(zone.id)

    return (
      <Card key={zone.id} style={styles.zoneCard}>
        {/* Zone Header */}
        <TouchableOpacity
          style={styles.zoneHeader}
          onPress={() => toggleZoneExpanded(zone.id)}
          activeOpacity={0.7}
        >
          <View style={styles.zoneHeaderLeft}>
            <View style={styles.zoneTitleRow}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Badge
                text={zone.active ? 'Active' : 'Inactive'}
                variant={zone.active ? 'success' : 'default'}
              />
            </View>
            <Text style={styles.zoneCountries}>{zone.countries.join(', ')}</Text>
            {zone.states && zone.states.length > 0 && (
              <Text style={styles.zoneStates}>{zone.states.length} states</Text>
            )}
            <Text style={styles.zoneRateCount}>
              {zone.rates.length} rate{zone.rates.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.zoneContent}>
            {/* Zone Actions */}
            <View style={styles.zoneActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setEditingZone(zone)
                  setShowZoneModal(true)
                }}
              >
                <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                <Text style={styles.actionButtonText}>Edit Zone</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={() => handleDeleteZone(zone)}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Delete</Text>
              </TouchableOpacity>
            </View>

            {/* Rates Section */}
            <View style={styles.ratesSection}>
              <View style={styles.ratesSectionHeader}>
                <Text style={styles.ratesSectionTitle}>Shipping Rates</Text>
                <TouchableOpacity
                  style={styles.addRateButton}
                  onPress={() => {
                    setEditingRate({ zoneId: zone.id, rate: null })
                    setShowRateModal(true)
                  }}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                  <Text style={styles.addRateButtonText}>Add Rate</Text>
                </TouchableOpacity>
              </View>

              {zone.rates.length === 0 ? (
                <Text style={styles.noRatesText}>No rates configured</Text>
              ) : (
                zone.rates.map((rate) => renderRate(zone.id, rate))
              )}
            </View>
          </View>
        )}
      </Card>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Shipping Settings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading shipping settings...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Shipping Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.subtitle}>
          Configure shipping zones, rates, and delivery options
        </Text>

        {/* Add Zone Button */}
        <TouchableOpacity
          style={styles.addZoneButton}
          onPress={() => {
            setEditingZone(null)
            setShowZoneModal(true)
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addZoneButtonText}>Add Shipping Zone</Text>
        </TouchableOpacity>

        {/* Zones List */}
        {zones.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="airplane-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Shipping Zones</Text>
            <Text style={styles.emptySubtitle}>
              Add a shipping zone to configure delivery rates for your customers.
            </Text>
          </Card>
        ) : (
          zones.map(renderZone)
        )}
      </ScrollView>

      {/* Zone Modal */}
      <ZoneModal
        visible={showZoneModal}
        zone={editingZone}
        saving={saving}
        onSave={handleSaveZone}
        onClose={() => {
          setShowZoneModal(false)
          setEditingZone(null)
        }}
      />

      {/* Rate Modal */}
      <RateModal
        visible={showRateModal}
        rate={editingRate?.rate || null}
        saving={saving}
        onSave={handleSaveRate}
        onClose={() => {
          setShowRateModal(false)
          setEditingRate(null)
        }}
      />
    </View>
  )
}

// Zone Modal
function ZoneModal({
  visible,
  zone,
  saving,
  onSave,
  onClose,
}: {
  visible: boolean
  zone: ShippingZone | null
  saving: boolean
  onSave: (data: Partial<ShippingZone>) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [countries, setCountries] = useState('US')
  const [states, setStates] = useState('')
  const [zipCodes, setZipCodes] = useState('')
  const [priority, setPriority] = useState('0')
  const [active, setActive] = useState(true)

  useEffect(() => {
    if (visible) {
      setName(zone?.name || '')
      setCountries(zone?.countries?.join(', ') || 'US')
      setStates(zone?.states?.join(', ') || '')
      setZipCodes(zone?.zipCodes || '')
      setPriority(String(zone?.priority || 0))
      setActive(zone?.active ?? true)
    }
  }, [visible, zone])

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Zone name is required')
      return
    }
    if (!countries.trim()) {
      Alert.alert('Validation', 'At least one country is required')
      return
    }
    onSave({
      name: name.trim(),
      countries: countries.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
      states: states ? states.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : [],
      zipCodes: zipCodes.trim() || undefined,
      priority: parseInt(priority) || 0,
      active,
    })
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {zone ? 'Edit Shipping Zone' : 'Add Shipping Zone'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Zone Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., United States, West Coast"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Countries (comma-separated codes)</Text>
            <TextInput
              style={styles.input}
              value={countries}
              onChangeText={setCountries}
              placeholder="US, CA"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Specific States (optional, comma-separated)</Text>
            <TextInput
              style={styles.input}
              value={states}
              onChangeText={setStates}
              placeholder="CA, NY, TX (leave empty for all)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>ZIP Code Ranges (optional)</Text>
            <TextInput
              style={styles.input}
              value={zipCodes}
              onChangeText={setZipCodes}
              placeholder="90000-90999, 91000-91999"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Priority (higher = checked first)</Text>
            <TextInput
              style={styles.input}
              value={priority}
              onChangeText={setPriority}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {zone ? 'Update Zone' : 'Create Zone'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// Rate Modal
function RateModal({
  visible,
  rate,
  saving,
  onSave,
  onClose,
}: {
  visible: boolean
  rate: ShippingRate | null
  saving: boolean
  onSave: (data: Partial<ShippingRate>) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [baseRate, setBaseRate] = useState('0')
  const [perItemRate, setPerItemRate] = useState('0')
  const [perPoundRate, setPerPoundRate] = useState('0')
  const [freeShippingMin, setFreeShippingMin] = useState('')
  const [minDays, setMinDays] = useState('3')
  const [maxDays, setMaxDays] = useState('7')
  const [carrier, setCarrier] = useState('')
  const [serviceCode, setServiceCode] = useState('')
  const [active, setActive] = useState(true)

  useEffect(() => {
    if (visible) {
      setName(rate?.name || '')
      setDescription(rate?.description || '')
      setBaseRate(rate?.baseRate?.toString() || '0')
      setPerItemRate(rate?.perItemRate?.toString() || '0')
      setPerPoundRate(rate?.perPoundRate?.toString() || '0')
      setFreeShippingMin(rate?.freeShippingMin?.toString() || '')
      setMinDays(String(rate?.minDays || 3))
      setMaxDays(String(rate?.maxDays || 7))
      setCarrier(rate?.carrier || '')
      setServiceCode(rate?.serviceCode || '')
      setActive(rate?.active ?? true)
    }
  }, [visible, rate])

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Rate name is required')
      return
    }
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      baseRate: parseFloat(baseRate) || 0,
      perItemRate: parseFloat(perItemRate) || 0,
      perPoundRate: parseFloat(perPoundRate) || 0,
      freeShippingMin: freeShippingMin ? parseFloat(freeShippingMin) : undefined,
      minDays: parseInt(minDays) || 3,
      maxDays: parseInt(maxDays) || 7,
      carrier: carrier || undefined,
      serviceCode: serviceCode.trim() || undefined,
      active,
    })
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {rate ? 'Edit Shipping Rate' : 'Add Shipping Rate'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Rate Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Standard, Express, Overnight"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="5-7 business days"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Base Rate ($)</Text>
                <TextInput
                  style={styles.input}
                  value={baseRate}
                  onChangeText={setBaseRate}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Per Item ($)</Text>
                <TextInput
                  style={styles.input}
                  value={perItemRate}
                  onChangeText={setPerItemRate}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Per Pound ($)</Text>
                <TextInput
                  style={styles.input}
                  value={perPoundRate}
                  onChangeText={setPerPoundRate}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Free Over ($)</Text>
                <TextInput
                  style={styles.input}
                  value={freeShippingMin}
                  onChangeText={setFreeShippingMin}
                  placeholder="None"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Min Days</Text>
                <TextInput
                  style={styles.input}
                  value={minDays}
                  onChangeText={setMinDays}
                  placeholder="3"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Max Days</Text>
                <TextInput
                  style={styles.input}
                  value={maxDays}
                  onChangeText={setMaxDays}
                  placeholder="7"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Carrier (optional)</Text>
            <View style={styles.carrierRow}>
              {CARRIERS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.carrierChip,
                    carrier === c && styles.carrierChipActive,
                  ]}
                  onPress={() => setCarrier(carrier === c ? '' : c)}
                >
                  <Text
                    style={[
                      styles.carrierChipText,
                      carrier === c && styles.carrierChipTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Service Code (optional)</Text>
            <TextInput
              style={styles.input}
              value={serviceCode}
              onChangeText={setServiceCode}
              placeholder="e.g., usps_priority"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {rate ? 'Update Rate' : 'Create Rate'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  // Add Zone Button
  addZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  addZoneButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Zone Card
  zoneCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  zoneHeaderLeft: {
    flex: 1,
  },
  zoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  zoneName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  zoneCountries: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  zoneStates: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  zoneRateCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Zone Content (expanded)
  zoneContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  zoneActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.sm,
  },
  actionButtonDanger: {
    backgroundColor: colors.errorBg,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  actionButtonTextDanger: {
    color: colors.error,
  },

  // Rates Section
  ratesSection: {
    padding: spacing.md,
  },
  ratesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ratesSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.sm,
  },
  addRateButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  noRatesText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Rate Item
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rateInfo: {
    flex: 1,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  rateName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  rateCarrier: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rateDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  rateFreeShipping: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginTop: 2,
  },
  rateDays: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  rateActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  modalBody: {
    padding: spacing.xl,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Form Fields
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },

  // Carrier Chips
  carrierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  carrierChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  carrierChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  carrierChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  carrierChipTextActive: {
    color: '#fff',
  },

  // Buttons
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
})
