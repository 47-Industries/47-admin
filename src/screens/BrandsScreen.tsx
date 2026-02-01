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
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface Brand {
  id: string
  name: string
  slug: string
  key: string
  tagline: string | null
  description: string | null
  accentColor: string
  logo: string | null
  active: boolean
  productCount?: number
  project?: {
    id: string
    title: string
    slug: string
  } | null
  createdAt: string
}

interface FormData {
  name: string
  slug: string
  key: string
  tagline: string
  description: string
  accentColor: string
  logo: string
  active: boolean
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  slug: '',
  key: '',
  tagline: '',
  description: '',
  accentColor: '#3b82f6',
  logo: '',
  active: true,
}

// Preset accent colors for quick selection
const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
]

export function BrandsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [saving, setSaving] = useState(false)

  const fetchBrands = useCallback(async (refresh = false) => {
    try {
      const data = await api.getBrands({ includeInactive: true })
      setBrands(data.brands || [])
    } catch (error) {
      console.error('Failed to fetch brands:', error)
      Alert.alert('Error', 'Failed to load brands')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchBrands()
  }, [fetchBrands])

  const onRefresh = () => {
    setRefreshing(true)
    fetchBrands(true)
  }

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const generateKey = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '')
  }

  const openCreateModal = () => {
    setEditingBrand(null)
    setFormData(INITIAL_FORM_DATA)
    setShowModal(true)
  }

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand)
    setFormData({
      name: brand.name,
      slug: brand.slug,
      key: brand.key,
      tagline: brand.tagline || '',
      description: brand.description || '',
      accentColor: brand.accentColor || '#3b82f6',
      logo: brand.logo || '',
      active: brand.active,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingBrand(null)
    setFormData(INITIAL_FORM_DATA)
  }

  const handleNameChange = (text: string) => {
    const newFormData = { ...formData, name: text }
    // Auto-generate slug and key if not editing existing
    if (!editingBrand) {
      newFormData.slug = generateSlug(text)
      newFormData.key = generateKey(text)
    }
    setFormData(newFormData)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Brand name is required')
      return
    }

    setSaving(true)
    try {
      if (editingBrand) {
        await api.updateBrand(editingBrand.id, formData)
        Alert.alert('Success', 'Brand updated')
      } else {
        await api.createBrand(formData)
        Alert.alert('Success', 'Brand created')
      }
      closeModal()
      fetchBrands()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save brand')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (brand: Brand) => {
    const productCount = brand.productCount || 0
    if (productCount > 0) {
      Alert.alert(
        'Cannot Delete',
        `This brand has ${productCount} ${productCount === 1 ? 'product' : 'products'}. Remove or reassign products first.`
      )
      return
    }

    Alert.alert(
      'Delete Brand',
      `Are you sure you want to delete "${brand.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteBrand(brand.id)
              fetchBrands()
              Alert.alert('Success', 'Brand deleted')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete brand')
            }
          },
        },
      ]
    )
  }

  const renderBrandCard = ({ item }: { item: Brand }) => {
    const productCount = item.productCount || 0

    return (
      <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
        <Card style={styles.brandCard}>
          <View style={styles.brandHeader}>
            <View style={styles.brandInfo}>
              <View style={styles.brandNameRow}>
                <View style={[styles.colorDot, { backgroundColor: item.accentColor }]} />
                <Text style={[styles.brandName, !item.active && styles.brandNameInactive]}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.badgeContainer}>
                {!item.active && <Badge text="Inactive" variant="error" />}
                {productCount > 0 && (
                  <Badge
                    text={`${productCount} ${productCount === 1 ? 'product' : 'products'}`}
                    variant="default"
                  />
                )}
              </View>
            </View>
            <View style={styles.brandActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
                <Ionicons name="pencil" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {item.tagline && (
            <Text style={styles.brandTagline} numberOfLines={1}>
              {item.tagline}
            </Text>
          )}

          <View style={styles.brandMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="link-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.slug}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="key-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.key}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Brands</Text>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Add button for when hideHeader is true */}
      {hideHeader && (
        <View style={styles.filtersContainer}>
          <View style={styles.filtersRow}>
            <Text style={styles.brandCount}>
              {brands.length} {brands.length === 1 ? 'brand' : 'brands'}
            </Text>
          </View>
          <TouchableOpacity style={styles.addButtonSmall} onPress={openCreateModal}>
            <Ionicons name="add" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={brands}
        renderItem={renderBrandCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pricetags-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No brands found</Text>
            <Button title="Add Brand" onPress={openCreateModal} style={styles.emptyButton} />
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBrand ? 'Edit Brand' : 'Create Brand'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[{ key: 'form' }]}
              renderItem={() => (
                <View>
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Brand Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., MotoRev"
                      placeholderTextColor={colors.textMuted}
                      value={formData.name}
                      onChangeText={handleNameChange}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                      <Text style={styles.inputLabel}>Slug</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="moto-rev"
                        placeholderTextColor={colors.textMuted}
                        value={formData.slug}
                        onChangeText={(text) => setFormData({ ...formData, slug: text })}
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
                      <Text style={styles.inputLabel}>Key</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="MOTO_REV"
                        placeholderTextColor={colors.textMuted}
                        value={formData.key}
                        onChangeText={(text) => setFormData({ ...formData, key: text })}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Accent Color</Text>
                    <View style={styles.colorPickerRow}>
                      {PRESET_COLORS.map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            formData.accentColor === color && styles.colorOptionSelected,
                          ]}
                          onPress={() => setFormData({ ...formData, accentColor: color })}
                        />
                      ))}
                    </View>
                    <TextInput
                      style={[styles.input, { marginTop: spacing.sm }]}
                      placeholder="#3b82f6"
                      placeholderTextColor={colors.textMuted}
                      value={formData.accentColor}
                      onChangeText={(text) => setFormData({ ...formData, accentColor: text })}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Logo URL</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="https://example.com/logo.png"
                      placeholderTextColor={colors.textMuted}
                      value={formData.logo}
                      onChangeText={(text) => setFormData({ ...formData, logo: text })}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Tagline</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="A short catchy phrase"
                      placeholderTextColor={colors.textMuted}
                      value={formData.tagline}
                      onChangeText={(text) => setFormData({ ...formData, tagline: text })}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Brand description"
                      placeholderTextColor={colors.textMuted}
                      value={formData.description}
                      onChangeText={(text) => setFormData({ ...formData, description: text })}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.switchRow}>
                      <View>
                        <Text style={styles.switchLabel}>Active</Text>
                        <Text style={styles.switchSubtext}>Visible in store</Text>
                      </View>
                      <Switch
                        value={formData.active}
                        onValueChange={(value) => setFormData({ ...formData, active: value })}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.text}
                      />
                    </View>
                  </View>
                </View>
              )}
              keyExtractor={() => 'form'}
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={closeModal} style={{ flex: 1 }} />
              <Button
                title={editingBrand ? 'Update' : 'Create'}
                onPress={handleSave}
                loading={saving}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
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
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  brandCount: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  addButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  brandCard: {
    marginBottom: spacing.md,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandInfo: {
    flex: 1,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  brandName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  brandNameInactive: {
    color: colors.textMuted,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  brandActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  brandTagline: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  brandMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
  emptyButton: {
    marginTop: spacing.lg,
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
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
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
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  switchSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
})
