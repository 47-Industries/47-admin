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

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  productType: 'PHYSICAL' | 'DIGITAL'
  parentId: string | null
  active: boolean
  _count?: {
    products: number
  }
}

interface FormData {
  name: string
  description: string
  productType: 'PHYSICAL' | 'DIGITAL'
  active: boolean
}

type FilterType = 'ALL' | 'PHYSICAL' | 'DIGITAL'

const TYPE_FILTERS: { value: FilterType; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'DIGITAL', label: 'Digital' },
]

const INITIAL_FORM_DATA: FormData = {
  name: '',
  description: '',
  productType: 'PHYSICAL',
  active: true,
}

export function CategoriesScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async (refresh = false) => {
    try {
      const params: { type?: string; includeInactive?: boolean } = {
        includeInactive: true,
      }
      if (typeFilter !== 'ALL') {
        params.type = typeFilter
      }
      const data = await api.getCategories(params)
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      Alert.alert('Error', 'Failed to load categories')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [typeFilter])

  useEffect(() => {
    setLoading(true)
    fetchCategories()
  }, [typeFilter, fetchCategories])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCategories(true)
  }

  const openCreateModal = () => {
    setEditingCategory(null)
    setFormData({
      ...INITIAL_FORM_DATA,
      productType: typeFilter === 'ALL' ? 'PHYSICAL' : typeFilter,
    })
    setShowModal(true)
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      productType: category.productType,
      active: category.active,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCategory(null)
    setFormData(INITIAL_FORM_DATA)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Category name is required')
      return
    }

    setSaving(true)
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, formData)
        Alert.alert('Success', 'Category updated')
      } else {
        await api.createCategory(formData)
        Alert.alert('Success', 'Category created')
      }
      closeModal()
      fetchCategories()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (category: Category) => {
    const productCount = category._count?.products || 0
    if (productCount > 0) {
      Alert.alert(
        'Cannot Delete',
        `This category has ${productCount} ${productCount === 1 ? 'product' : 'products'}. Move or delete products first.`
      )
      return
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCategory(category.id)
              fetchCategories()
              Alert.alert('Success', 'Category deleted')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete category')
            }
          },
        },
      ]
    )
  }

  const physicalCategories = categories.filter((c) => c.productType === 'PHYSICAL')
  const digitalCategories = categories.filter((c) => c.productType === 'DIGITAL')

  const renderCategoryCard = ({ item }: { item: Category }) => {
    const productCount = item._count?.products || 0

    return (
      <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
        <Card style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryInfo}>
              <Text style={[styles.categoryName, !item.active && styles.categoryNameInactive]}>
                {item.name}
              </Text>
              <View style={styles.badgeContainer}>
                <Badge
                  text={item.productType}
                  variant={item.productType === 'PHYSICAL' ? 'success' : 'primary'}
                />
                {!item.active && <Badge text="Inactive" variant="error" />}
              </View>
            </View>
            <View style={styles.categoryActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
                <Ionicons name="pencil" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {item.description && (
            <Text style={styles.categoryDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.categoryMeta}>
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
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const renderSectionHeader = (title: string, count: number, color: string) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>({count})</Text>
    </View>
  )

  const renderListContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )
    }

    if (categories.length === 0) {
      return (
        <View style={styles.empty}>
          <Ionicons name="folder-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No categories found</Text>
          <Button title="Add Category" onPress={openCreateModal} style={styles.emptyButton} />
        </View>
      )
    }

    const sections: React.ReactNode[] = []

    if ((typeFilter === 'ALL' || typeFilter === 'PHYSICAL') && physicalCategories.length > 0) {
      sections.push(
        <View key="physical-header">
          {renderSectionHeader('Physical Products', physicalCategories.length, colors.success)}
        </View>
      )
      physicalCategories.forEach((category) => {
        sections.push(
          <View key={category.id}>
            {renderCategoryCard({ item: category })}
          </View>
        )
      })
    }

    if ((typeFilter === 'ALL' || typeFilter === 'DIGITAL') && digitalCategories.length > 0) {
      sections.push(
        <View key="digital-header" style={{ marginTop: spacing.lg }}>
          {renderSectionHeader('Digital Products', digitalCategories.length, colors.purple)}
        </View>
      )
      digitalCategories.forEach((category) => {
        sections.push(
          <View key={category.id}>
            {renderCategoryCard({ item: category })}
          </View>
        )
      })
    }

    if ((typeFilter === 'PHYSICAL' && physicalCategories.length === 0) ||
        (typeFilter === 'DIGITAL' && digitalCategories.length === 0)) {
      return (
        <View style={styles.empty}>
          <Ionicons name="folder-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            No {typeFilter.toLowerCase()} categories found
          </Text>
          <Button
            title={`Add ${typeFilter === 'PHYSICAL' ? 'Physical' : 'Digital'} Category`}
            onPress={openCreateModal}
            style={styles.emptyButton}
          />
        </View>
      )
    }

    return <>{sections}</>
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Categories</Text>
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
      </View>

      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => renderListContent()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Category Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 3D Printed Models"
                placeholderTextColor={colors.textMuted}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Optional description for this category"
                placeholderTextColor={colors.textMuted}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Product Type *</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.productType === 'PHYSICAL' && styles.typeButtonActivePhysical,
                  ]}
                  onPress={() => setFormData({ ...formData, productType: 'PHYSICAL' })}
                >
                  <Ionicons
                    name="cube-outline"
                    size={20}
                    color={formData.productType === 'PHYSICAL' ? colors.success : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.productType === 'PHYSICAL' && styles.typeButtonTextActivePhysical,
                    ]}
                  >
                    Physical
                  </Text>
                  <Text style={styles.typeButtonSubtext}>Shipped products</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.productType === 'DIGITAL' && styles.typeButtonActiveDigital,
                  ]}
                  onPress={() => setFormData({ ...formData, productType: 'DIGITAL' })}
                >
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color={formData.productType === 'DIGITAL' ? colors.purple : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.productType === 'DIGITAL' && styles.typeButtonTextActiveDigital,
                    ]}
                  >
                    Digital
                  </Text>
                  <Text style={styles.typeButtonSubtext}>Downloadable files</Text>
                </TouchableOpacity>
              </View>
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

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={closeModal} style={{ flex: 1 }} />
              <Button
                title={editingCategory ? 'Update' : 'Create'}
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
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sectionCount: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  categoryCard: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  categoryNameInactive: {
    color: colors.textMuted,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  categoryDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  categoryMeta: {
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
  typeButtonActivePhysical: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: colors.successBg,
  },
  typeButtonActiveDigital: {
    borderColor: colors.purple,
    borderWidth: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  typeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  typeButtonTextActivePhysical: {
    color: colors.success,
  },
  typeButtonTextActiveDigital: {
    color: colors.purple,
  },
  typeButtonSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
