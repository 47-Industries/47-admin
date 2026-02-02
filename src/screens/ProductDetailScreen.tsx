import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { CachedImage } from '../components/CachedImage'
import { VariantList } from '../components/VariantList'
import { VariantEditor } from '../components/VariantEditor'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface ProductVariant {
  id: string
  name: string
  sku: string | null
  price: number
  stock: number
  options: Record<string, string>
  isActive: boolean
}

interface OptionType {
  id: string
  name: string
  values: string[]
}

export default function ProductDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showVariantEditor, setShowVariantEditor] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([])
  const [variantLoading, setVariantLoading] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    price: '',
    stock: '',
    active: true,
    featured: false,
  })
  const [stockAdjustment, setStockAdjustment] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add')

  useEffect(() => {
    fetchProduct()
    fetchOptionTypes()
  }, [id])

  const fetchProduct = async () => {
    try {
      const data = await api.getProduct(id)
      setProduct(data.product)
      setVariants(data.product.variants || [])
      setEditData({
        name: data.product.name,
        price: data.product.price.toString(),
        stock: data.product.stock.toString(),
        active: data.product.active,
        featured: data.product.featured,
      })
    } catch (error) {
      console.error('Failed to fetch product:', error)
      Alert.alert('Error', 'Failed to load product details')
    } finally {
      setLoading(false)
    }
  }

  const fetchVariants = async () => {
    try {
      const data = await api.getProductVariants(id)
      setVariants(data.variants || [])
    } catch (error) {
      console.error('Failed to fetch variants:', error)
    }
  }

  const fetchOptionTypes = async () => {
    try {
      const data = await api.getOptionTypes()
      setOptionTypes(data.optionTypes || [])
    } catch (error) {
      console.error('Failed to fetch option types:', error)
    }
  }

  const saveProduct = async () => {
    setSaving(true)
    try {
      await api.updateProduct(id, {
        name: editData.name,
        price: parseFloat(editData.price),
        stock: parseInt(editData.stock),
        active: editData.active,
        featured: editData.featured,
      })
      await fetchProduct()
      setShowEditModal(false)
      Alert.alert('Success', 'Product updated')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const adjustStock = async () => {
    if (!stockAdjustment || isNaN(parseInt(stockAdjustment))) {
      Alert.alert('Error', 'Please enter a valid number')
      return
    }

    let newStock = product.stock
    const adjustment = parseInt(stockAdjustment)

    switch (adjustmentType) {
      case 'add':
        newStock = product.stock + adjustment
        break
      case 'subtract':
        newStock = Math.max(0, product.stock - adjustment)
        break
      case 'set':
        newStock = adjustment
        break
    }

    setSaving(true)
    try {
      await api.updateProduct(id, { stock: newStock })
      await fetchProduct()
      setShowStockModal(false)
      setStockAdjustment('')
      Alert.alert('Success', 'Stock updated')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    setSaving(true)
    try {
      await api.updateProduct(id, { active: !product.active })
      setProduct({ ...product, active: !product.active })
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const toggleFeatured = async () => {
    setSaving(true)
    try {
      await api.updateProduct(id, { featured: !product.featured })
      setProduct({ ...product, featured: !product.featured })
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteProduct(id)
      setShowDeleteModal(false)
      Alert.alert('Success', 'Product deleted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  const confirmDelete = () => {
    setShowDeleteModal(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  // Variant handlers
  const handleAddVariant = () => {
    setEditingVariant(null)
    setShowVariantEditor(true)
  }

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant)
    setShowVariantEditor(true)
  }

  const handleDeleteVariant = (variantId: string) => {
    Alert.alert(
      'Delete Variant',
      'Are you sure you want to delete this variant? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setVariantLoading(true)
            try {
              await api.deleteProductVariant(id, variantId)
              setVariants(variants.filter((v) => v.id !== variantId))
              Alert.alert('Success', 'Variant deleted')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete variant')
            } finally {
              setVariantLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleSaveVariant = async (data: {
    options: Record<string, string>
    sku: string
    price: number
    stock: number
    isActive: boolean
  }) => {
    setVariantLoading(true)
    try {
      if (editingVariant) {
        // Update existing variant
        await api.updateProductVariant(id, editingVariant.id, {
          options: data.options,
          sku: data.sku || undefined,
          price: data.price,
          stock: data.stock,
          isActive: data.isActive,
        })
        Alert.alert('Success', 'Variant updated')
      } else {
        // Create new variant
        await api.createProductVariant(id, {
          options: data.options,
          sku: data.sku || undefined,
          price: data.price,
          stock: data.stock,
        })
        Alert.alert('Success', 'Variant created')
      }
      await fetchVariants()
      setShowVariantEditor(false)
      setEditingVariant(null)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save variant')
      throw error
    } finally {
      setVariantLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Product not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const stockStatus = product.stock === 0 ? 'Out of Stock' : product.stock <= 5 ? 'Low Stock' : 'In Stock'
  const stockColor = product.stock === 0 ? colors.error : product.stock <= 5 ? colors.warning : colors.success

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={confirmDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Product Images */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
          {product.images?.length > 0 ? (
            product.images.map((image: string, index: number) => (
              <CachedImage key={index} source={{ uri: image }} style={styles.productImage} />
            ))
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={64} color={colors.textMuted} />
            </View>
          )}
        </ScrollView>

        {/* Product Info */}
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.badges}>
            {product.featured && <Badge text="Featured" variant="warning" />}
            <Badge text={product.productType} variant="primary" />
            {!product.active && <Badge text="Inactive" variant="error" />}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(Number(product.price))}</Text>
            <Text style={styles.statLabel}>Price</Text>
          </Card>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowStockModal(true)}>
            <Card style={styles.statCard} borderColor={stockColor}>
              <Text style={[styles.statValue, { color: stockColor }]}>{product.stock}</Text>
              <Text style={styles.statLabel}>{stockStatus}</Text>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Toggles */}
        <Card style={styles.togglesCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="eye-outline" size={20} color={colors.textMuted} />
              <Text style={styles.toggleLabel}>Active</Text>
            </View>
            <Switch
              value={product.active}
              onValueChange={toggleActive}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>
          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.md }]}>
            <View style={styles.toggleInfo}>
              <Ionicons name="star-outline" size={20} color={colors.textMuted} />
              <Text style={styles.toggleLabel}>Featured</Text>
            </View>
            <Switch
              value={product.featured}
              onValueChange={toggleFeatured}
              trackColor={{ false: colors.border, true: colors.warning }}
              thumbColor={colors.text}
            />
          </View>
        </Card>

        {/* Details */}
        <Text style={styles.sectionTitle}>Details</Text>
        <Card style={styles.detailsCard}>
          {product.sku && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SKU</Text>
              <Text style={styles.detailValue}>{product.sku}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{product.category?.name || 'Uncategorized'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{product.productType}</Text>
          </View>
          {product.comparePrice && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Compare Price</Text>
              <Text style={[styles.detailValue, { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                {formatCurrency(Number(product.comparePrice))}
              </Text>
            </View>
          )}
          {product.weight && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{product.weight} lbs</Text>
            </View>
          )}
        </Card>

        {/* Description */}
        {product.description && (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Card style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </Card>
          </>
        )}

        {/* Variants Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Variants ({variants.length})</Text>
          <TouchableOpacity style={styles.addVariantButton} onPress={handleAddVariant}>
            <Ionicons name="add" size={18} color={colors.text} />
            <Text style={styles.addVariantButtonText}>Add Variant</Text>
          </TouchableOpacity>
        </View>
        <VariantList
          variants={variants}
          onEdit={handleEditVariant}
          onDelete={handleDeleteVariant}
          formatCurrency={formatCurrency}
        />

        {/* 3D Print Specs */}
        {product.material && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>3D Print Specifications</Text>
            <Card style={styles.specsCard}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Material</Text>
                <Text style={styles.specValue}>{product.material}</Text>
              </View>
              {product.printTime && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Print Time</Text>
                  <Text style={styles.specValue}>{product.printTime} min</Text>
                </View>
              )}
              {product.layerHeight && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Layer Height</Text>
                  <Text style={styles.specValue}>{product.layerHeight}mm</Text>
                </View>
              )}
              {product.infill && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Infill</Text>
                  <Text style={styles.specValue}>{product.infill}%</Text>
                </View>
              )}
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Product</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={editData.name}
              onChangeText={(text) => setEditData({ ...editData, name: text })}
              placeholder="Product name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Price</Text>
            <TextInput
              style={styles.input}
              value={editData.price}
              onChangeText={(text) => setEditData({ ...editData, price: text })}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Stock</Text>
            <TextInput
              style={styles.input}
              value={editData.stock}
              onChangeText={(text) => setEditData({ ...editData, stock: text })}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowEditModal(false)} style={{ flex: 1 }} />
              <Button title="Save" onPress={saveProduct} loading={saving} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Stock Modal */}
      <Modal visible={showStockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust Stock</Text>
            <Text style={styles.currentStock}>Current: {product?.stock}</Text>

            <Text style={styles.inputLabel}>Adjustment Type</Text>
            <View style={styles.adjustmentTypes}>
              {(['add', 'subtract', 'set'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.adjustmentType, adjustmentType === type && styles.adjustmentTypeActive]}
                  onPress={() => setAdjustmentType(type)}
                >
                  <Ionicons
                    name={type === 'add' ? 'add' : type === 'subtract' ? 'remove' : 'swap-horizontal'}
                    size={20}
                    color={adjustmentType === type ? colors.text : colors.textMuted}
                  />
                  <Text style={[styles.adjustmentTypeText, adjustmentType === type && styles.adjustmentTypeTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={stockAdjustment}
              onChangeText={setStockAdjustment}
              placeholder="Enter quantity"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowStockModal(false)} style={{ flex: 1 }} />
              <Button title="Update Stock" onPress={adjustStock} loading={saving} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={[styles.modalOverlay, styles.deleteModalOverlay]}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={48} color={colors.error} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Product?</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{product?.name}"? This action cannot be undone and will also delete all variants.
            </Text>
            <View style={styles.deleteModalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowDeleteModal(false)}
                style={{ flex: 1 }}
                disabled={deleting}
              />
              <Button
                title={deleting ? 'Deleting...' : 'Delete'}
                variant="danger"
                onPress={handleDelete}
                loading={deleting}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Variant Editor Modal */}
      <VariantEditor
        visible={showVariantEditor}
        onClose={() => {
          setShowVariantEditor(false)
          setEditingVariant(null)
        }}
        onSave={handleSaveVariant}
        variant={editingVariant}
        optionTypes={optionTypes}
        productPrice={Number(product.price)}
        loading={variantLoading}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  editButton: {
    padding: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  imagesScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
    backgroundColor: colors.surfaceHover,
  },
  productImagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productHeader: {
    marginBottom: spacing.lg,
  },
  productName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  togglesCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addVariantButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  detailsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
  descriptionCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  descriptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  specsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  specLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  specValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  currentStock: {
    fontSize: fontSize.md,
    color: colors.textMuted,
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
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  adjustmentTypes: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  adjustmentType: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustmentTypeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  adjustmentTypeText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  adjustmentTypeTextActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  deleteModalOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  deleteModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
})
