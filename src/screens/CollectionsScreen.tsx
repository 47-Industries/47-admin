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
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  type: 'AUTOMATIC' | 'MANUAL'
  autoQuery: any | null
  displayOnHome: boolean
  maxProducts: number
  accentColor: string | null
  active: boolean
  sortOrder: number
  _count?: {
    products: number
  }
}

interface FormData {
  name: string
  slug: string
  description: string
  type: 'AUTOMATIC' | 'MANUAL'
  autoQuery: {
    brand?: string
    category?: string
    tags?: string[]
  }
  displayOnHome: boolean
  maxProducts: string
  accentColor: string
  active: boolean
  sortOrder: string
}

type FilterType = 'ALL' | 'AUTOMATIC' | 'MANUAL'

const TYPE_FILTERS: { value: FilterType; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'AUTOMATIC', label: 'Automatic' },
]

const INITIAL_FORM_DATA: FormData = {
  name: '',
  slug: '',
  description: '',
  type: 'MANUAL',
  autoQuery: {},
  displayOnHome: true,
  maxProducts: '10',
  accentColor: '',
  active: true,
  sortOrder: '0',
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function CollectionsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [saving, setSaving] = useState(false)
  const [brands, setBrands] = useState<string[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  const fetchCollections = useCallback(async (refresh = false) => {
    try {
      const data = await api.getCollections()
      let filtered = data.collections || []
      if (typeFilter !== 'ALL') {
        filtered = filtered.filter((c: Collection) => c.type === typeFilter)
      }
      setCollections(filtered)
    } catch (error) {
      console.error('Failed to fetch collections:', error)
      Alert.alert('Error', 'Failed to load collections')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [typeFilter])

  const fetchBrandsAndCategories = useCallback(async () => {
    try {
      const [brandsData, categoriesData] = await Promise.all([
        api.getProductBrands(),
        api.getCategories(),
      ])
      setBrands(brandsData.brands || [])
      setCategories(categoriesData.categories || [])
    } catch (error) {
      console.error('Failed to fetch brands/categories:', error)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCollections()
  }, [typeFilter, fetchCollections])

  useEffect(() => {
    fetchBrandsAndCategories()
  }, [fetchBrandsAndCategories])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCollections(true)
  }

  const openCreateModal = () => {
    setEditingCollection(null)
    setFormData(INITIAL_FORM_DATA)
    setShowModal(true)
  }

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection)
    setFormData({
      name: collection.name,
      slug: collection.slug,
      description: collection.description || '',
      type: collection.type,
      autoQuery: collection.autoQuery || {},
      displayOnHome: collection.displayOnHome,
      maxProducts: collection.maxProducts.toString(),
      accentColor: collection.accentColor || '',
      active: collection.active,
      sortOrder: collection.sortOrder.toString(),
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCollection(null)
    setFormData(INITIAL_FORM_DATA)
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: editingCollection ? formData.slug : generateSlug(name),
    })
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Collection name is required')
      return
    }

    if (!formData.slug.trim()) {
      Alert.alert('Error', 'Collection slug is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        type: formData.type,
        autoQuery: formData.type === 'AUTOMATIC' ? formData.autoQuery : null,
        displayOnHome: formData.displayOnHome,
        maxProducts: parseInt(formData.maxProducts) || 10,
        accentColor: formData.accentColor || null,
        active: formData.active,
        sortOrder: parseInt(formData.sortOrder) || 0,
      }

      if (editingCollection) {
        await api.updateCollection(editingCollection.id, payload)
        Alert.alert('Success', 'Collection updated')
      } else {
        await api.createCollection(payload)
        Alert.alert('Success', 'Collection created')
      }
      closeModal()
      fetchCollections()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save collection')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (collection: Collection) => {
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${collection.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCollection(collection.id)
              fetchCollections()
              Alert.alert('Success', 'Collection deleted')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete collection')
            }
          },
        },
      ]
    )
  }

  const navigateToDetail = (collection: Collection) => {
    navigation.navigate('CollectionDetail', { id: collection.id })
  }

  const renderCollectionCard = ({ item }: { item: Collection }) => {
    const productCount = item._count?.products || 0

    return (
      <TouchableOpacity onPress={() => navigateToDetail(item)} activeOpacity={0.7}>
        <Card style={styles.collectionCard}>
          <View style={styles.collectionHeader}>
            <View style={styles.collectionInfo}>
              <View style={styles.nameRow}>
                {item.accentColor && (
                  <View style={[styles.accentDot, { backgroundColor: item.accentColor }]} />
                )}
                <Text style={[styles.collectionName, !item.active && styles.collectionNameInactive]}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.badgeContainer}>
                <Badge
                  text={item.type}
                  variant={item.type === 'AUTOMATIC' ? 'primary' : 'success'}
                />
                {!item.active && <Badge text="Inactive" variant="error" />}
                {item.displayOnHome && <Badge text="Home" variant="warning" />}
              </View>
            </View>
            <View style={styles.collectionActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
                <Ionicons name="pencil" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {item.description && (
            <Text style={styles.collectionDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.collectionMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.slug}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="cube-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {productCount} {productCount === 1 ? 'product' : 'products'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="reorder-three-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>Order: {item.sortOrder}</Text>
            </View>
          </View>

          {item.type === 'AUTOMATIC' && item.autoQuery && (
            <View style={styles.queryInfo}>
              <Text style={styles.queryLabel}>Query:</Text>
              {item.autoQuery.brand && (
                <Text style={styles.queryValue}>Brand: {item.autoQuery.brand}</Text>
              )}
              {item.autoQuery.category && (
                <Text style={styles.queryValue}>Category: {item.autoQuery.category}</Text>
              )}
              {item.autoQuery.tags && item.autoQuery.tags.length > 0 && (
                <Text style={styles.queryValue}>Tags: {item.autoQuery.tags.join(', ')}</Text>
              )}
            </View>
          )}
        </Card>
      </TouchableOpacity>
    )
  }

  const renderAutoQuerySection = () => {
    if (formData.type !== 'AUTOMATIC') return null

    return (
      <View style={styles.querySection}>
        <Text style={styles.sectionLabel}>Query Builder</Text>
        <Text style={styles.queryHint}>Define filters to automatically populate this collection</Text>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Brand</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.chip, !formData.autoQuery.brand && styles.chipActive]}
              onPress={() => setFormData({
                ...formData,
                autoQuery: { ...formData.autoQuery, brand: undefined }
              })}
            >
              <Text style={[styles.chipText, !formData.autoQuery.brand && styles.chipTextActive]}>
                All Brands
              </Text>
            </TouchableOpacity>
            {brands.map((brand) => (
              <TouchableOpacity
                key={brand}
                style={[styles.chip, formData.autoQuery.brand === brand && styles.chipActive]}
                onPress={() => setFormData({
                  ...formData,
                  autoQuery: { ...formData.autoQuery, brand }
                })}
              >
                <Text style={[styles.chipText, formData.autoQuery.brand === brand && styles.chipTextActive]}>
                  {brand}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.chip, !formData.autoQuery.category && styles.chipActive]}
              onPress={() => setFormData({
                ...formData,
                autoQuery: { ...formData.autoQuery, category: undefined }
              })}
            >
              <Text style={[styles.chipText, !formData.autoQuery.category && styles.chipTextActive]}>
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, formData.autoQuery.category === cat.id && styles.chipActive]}
                onPress={() => setFormData({
                  ...formData,
                  autoQuery: { ...formData.autoQuery, category: cat.id }
                })}
              >
                <Text style={[styles.chipText, formData.autoQuery.category === cat.id && styles.chipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Tags (comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., featured, new, sale"
            placeholderTextColor={colors.textMuted}
            value={formData.autoQuery.tags?.join(', ') || ''}
            onChangeText={(text) => setFormData({
              ...formData,
              autoQuery: {
                ...formData.autoQuery,
                tags: text ? text.split(',').map(t => t.trim()).filter(Boolean) : undefined
              }
            })}
          />
        </View>
      </View>
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
          <Text style={styles.title}>Collections</Text>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Type Filters */}
      <View style={styles.filtersContainer}>
        {TYPE_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[styles.filterChip, typeFilter === filter.value && styles.filterChipActive]}
            onPress={() => setTypeFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                typeFilter === filter.value && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
        {hideHeader && (
          <TouchableOpacity style={styles.addButtonSmall} onPress={openCreateModal}>
            <Ionicons name="add" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        renderItem={renderCollectionCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="layers-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No collections found</Text>
            <Button title="Create Collection" onPress={openCreateModal} style={styles.emptyButton} />
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCollection ? 'Edit Collection' : 'Create Collection'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Collection Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Summer Sale"
                  placeholderTextColor={colors.textMuted}
                  value={formData.name}
                  onChangeText={handleNameChange}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Slug *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., summer-sale"
                  placeholderTextColor={colors.textMuted}
                  value={formData.slug}
                  onChangeText={(text) => setFormData({ ...formData, slug: text })}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Optional description"
                  placeholderTextColor={colors.textMuted}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Collection Type *</Text>
                <View style={styles.typeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      formData.type === 'MANUAL' && styles.typeButtonActiveManual,
                    ]}
                    onPress={() => setFormData({ ...formData, type: 'MANUAL' })}
                  >
                    <Ionicons
                      name="hand-left-outline"
                      size={20}
                      color={formData.type === 'MANUAL' ? colors.success : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === 'MANUAL' && styles.typeButtonTextActiveManual,
                      ]}
                    >
                      Manual
                    </Text>
                    <Text style={styles.typeButtonSubtext}>Pick products</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      formData.type === 'AUTOMATIC' && styles.typeButtonActiveAutomatic,
                    ]}
                    onPress={() => setFormData({ ...formData, type: 'AUTOMATIC' })}
                  >
                    <Ionicons
                      name="flash-outline"
                      size={20}
                      color={formData.type === 'AUTOMATIC' ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === 'AUTOMATIC' && styles.typeButtonTextActiveAutomatic,
                      ]}
                    >
                      Automatic
                    </Text>
                    <Text style={styles.typeButtonSubtext}>Query-based</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {renderAutoQuerySection()}

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Max Products</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    value={formData.maxProducts}
                    onChangeText={(text) => setFormData({ ...formData, maxProducts: text })}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.md }]}>
                  <Text style={styles.inputLabel}>Sort Order</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={formData.sortOrder}
                    onChangeText={(text) => setFormData({ ...formData, sortOrder: text })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Accent Color (hex)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="#3b82f6"
                  placeholderTextColor={colors.textMuted}
                  value={formData.accentColor}
                  onChangeText={(text) => setFormData({ ...formData, accentColor: text })}
                  autoCapitalize="none"
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

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.switchLabel}>Display on Home</Text>
                    <Text style={styles.switchSubtext}>Show on homepage</Text>
                  </View>
                  <Switch
                    value={formData.displayOnHome}
                    onValueChange={(value) => setFormData({ ...formData, displayOnHome: value })}
                    trackColor={{ false: colors.border, true: colors.warning }}
                    thumbColor={colors.text}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="outline" onPress={closeModal} style={{ flex: 1 }} />
                <Button
                  title={editingCollection ? 'Update' : 'Create'}
                  onPress={handleSave}
                  loading={saving}
                  style={{ flex: 1, marginLeft: spacing.md }}
                />
              </View>
              <View style={{ height: spacing.xxl }} />
            </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  collectionCard: {
    marginBottom: spacing.md,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  collectionInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  collectionName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  collectionNameInactive: {
    color: colors.textMuted,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  collectionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  collectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  collectionMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
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
  queryInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  queryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  queryValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  typeButtonActiveManual: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: colors.successBg,
  },
  typeButtonActiveAutomatic: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  typeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  typeButtonTextActiveManual: {
    color: colors.success,
  },
  typeButtonTextActiveAutomatic: {
    color: colors.primary,
  },
  typeButtonSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  querySection: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  queryHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  chipScroll: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
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
    marginTop: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
})
