import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Image, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

export default function ProductDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
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
  }, [id])

  const fetchProduct = async () => {
    try {
      const data = await api.getProduct(id)
      setProduct(data.product)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
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
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Product Images */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
          {product.images?.length > 0 ? (
            product.images.map((image: string, index: number) => (
              <Image key={index} source={{ uri: image }} style={styles.productImage} />
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

        {/* Variants */}
        {product.variants?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Variants ({product.variants.length})</Text>
            {product.variants.map((variant: any) => (
              <Card key={variant.id} style={styles.variantCard}>
                <View style={styles.variantHeader}>
                  <Text style={styles.variantName}>{variant.name}</Text>
                  <Badge text={variant.active ? 'Active' : 'Inactive'} variant={variant.active ? 'success' : 'error'} />
                </View>
                <View style={styles.variantDetails}>
                  <View style={styles.variantDetail}>
                    <Text style={styles.variantLabel}>SKU</Text>
                    <Text style={styles.variantValue}>{variant.sku || '-'}</Text>
                  </View>
                  <View style={styles.variantDetail}>
                    <Text style={styles.variantLabel}>Price</Text>
                    <Text style={styles.variantValue}>{formatCurrency(Number(variant.price))}</Text>
                  </View>
                  <View style={styles.variantDetail}>
                    <Text style={styles.variantLabel}>Stock</Text>
                    <Text style={[styles.variantValue, { color: variant.stock > 0 ? colors.success : colors.error }]}>
                      {variant.stock}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* 3D Print Specs */}
        {product.material && (
          <>
            <Text style={styles.sectionTitle}>3D Print Specifications</Text>
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
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
  variantCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  variantName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  variantDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  variantDetail: {},
  variantLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  variantValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
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
})
