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
  Image,
  Alert,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const LOW_STOCK_THRESHOLD = 10

const STOCK_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
]

interface InventoryProduct {
  id: string
  name: string
  sku: string | null
  stock: number
  price: number
  category: { name: string } | null
  active: boolean
  images: string[]
}

interface InventoryStats {
  totalProducts: number
  lowStock: number
  outOfStock: number
  totalValue: number
}

type AdjustmentType = 'add' | 'subtract' | 'set'

export default function InventoryScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<string>('all')

  // Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add')
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const fetchInventory = useCallback(async () => {
    try {
      const data = await api.getInventory({
        search: search || undefined,
        status: stockFilter === 'all' ? undefined : stockFilter,
      })

      const fetchedProducts = data.products || []
      setProducts(fetchedProducts)

      // Calculate stats from products if not provided by API
      if (data.stats) {
        setStats(data.stats)
      } else {
        const calculatedStats: InventoryStats = {
          totalProducts: fetchedProducts.length,
          lowStock: fetchedProducts.filter((p: InventoryProduct) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length,
          outOfStock: fetchedProducts.filter((p: InventoryProduct) => p.stock === 0).length,
          totalValue: fetchedProducts.reduce((sum: number, p: InventoryProduct) => sum + (p.price * p.stock), 0),
        }
        setStats(calculatedStats)
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, stockFilter])

  useEffect(() => {
    setLoading(true)
    fetchInventory()
  }, [fetchInventory])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchInventory()
  }, [fetchInventory])

  const openAdjustModal = (product: InventoryProduct) => {
    setSelectedProduct(product)
    setAdjustmentType('add')
    setAdjustmentQuantity('')
    setAdjustmentReason('')
    setShowAdjustModal(true)
  }

  const closeAdjustModal = () => {
    setShowAdjustModal(false)
    setSelectedProduct(null)
    setAdjustmentQuantity('')
    setAdjustmentReason('')
  }

  const handleAdjustStock = async () => {
    if (!selectedProduct || !adjustmentQuantity) return

    const quantity = parseInt(adjustmentQuantity, 10)
    if (isNaN(quantity) || quantity < 0) {
      Alert.alert('Error', 'Please enter a valid quantity')
      return
    }

    setAdjusting(true)
    try {
      await api.adjustStock(selectedProduct.id, {
        quantity,
        type: adjustmentType,
        reason: adjustmentReason || undefined,
      })

      Alert.alert('Success', 'Stock adjusted successfully')
      closeAdjustModal()
      fetchInventory()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to adjust stock')
    } finally {
      setAdjusting(false)
    }
  }

  const calculateNewStock = (): number => {
    if (!selectedProduct || !adjustmentQuantity) return selectedProduct?.stock || 0

    const quantity = parseInt(adjustmentQuantity, 10)
    if (isNaN(quantity)) return selectedProduct?.stock || 0

    switch (adjustmentType) {
      case 'add':
        return selectedProduct.stock + quantity
      case 'subtract':
        return Math.max(0, selectedProduct.stock - quantity)
      case 'set':
        return quantity
      default:
        return selectedProduct.stock
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const getStockStatus = (stock: number): { variant: 'success' | 'warning' | 'error'; label: string } => {
    if (stock === 0) {
      return { variant: 'error', label: 'Out of Stock' }
    }
    if (stock <= LOW_STOCK_THRESHOLD) {
      return { variant: 'warning', label: 'Low Stock' }
    }
    return { variant: 'success', label: 'In Stock' }
  }

  const renderProduct = ({ item }: { item: InventoryProduct }) => {
    const stockStatus = getStockStatus(item.stock)

    return (
      <Card style={styles.productCard}>
        <View style={styles.productContent}>
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.sku && (
              <Text style={styles.productSku}>SKU: {item.sku}</Text>
            )}
            <Text style={styles.productCategory}>
              {item.category?.name || 'Uncategorized'}
            </Text>

            <View style={styles.productMeta}>
              <View style={styles.stockContainer}>
                <Text style={[
                  styles.stockNumber,
                  item.stock === 0 && { color: colors.error },
                  item.stock > 0 && item.stock <= LOW_STOCK_THRESHOLD && { color: colors.warning },
                  item.stock > LOW_STOCK_THRESHOLD && { color: colors.success },
                ]}>
                  {item.stock}
                </Text>
                <Text style={styles.stockLabel}>units</Text>
              </View>
              <Badge text={stockStatus.label} variant={stockStatus.variant} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => openAdjustModal(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.productFooter}>
          <Text style={styles.productValue}>
            Value: {formatCurrency(item.price * item.stock)}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
            activeOpacity={0.7}
          >
            <Text style={styles.viewDetailsLink}>View Details</Text>
          </TouchableOpacity>
        </View>
      </Card>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Inventory</Text>
        </View>
      )}

      {/* Stats Overview */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalProducts}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {stats.lowStock}
              </Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.error }]}>
                {stats.outOfStock}
              </Text>
              <Text style={styles.statLabel}>Out of Stock</Text>
            </View>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
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

      {/* Stock Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {STOCK_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              stockFilter === filter.value && styles.filterChipActive,
            ]}
            onPress={() => setStockFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                stockFilter === filter.value && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products List */}
      <FlatList
        data={products}
        renderItem={renderProduct}
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
              <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {search ? 'No products match your search' : 'No products found'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Adjust Stock Modal */}
      <Modal visible={showAdjustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Stock</Text>
              <TouchableOpacity onPress={closeAdjustModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                {/* Product Info */}
                <View style={styles.modalProductInfo}>
                  {selectedProduct.images?.[0] ? (
                    <Image
                      source={{ uri: selectedProduct.images[0] }}
                      style={styles.modalProductImage}
                    />
                  ) : (
                    <View style={styles.modalProductImagePlaceholder}>
                      <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.modalProductDetails}>
                    <Text style={styles.modalProductName} numberOfLines={2}>
                      {selectedProduct.name}
                    </Text>
                    <Text style={styles.modalCurrentStock}>
                      Current stock: {selectedProduct.stock} units
                    </Text>
                  </View>
                </View>

                {/* Adjustment Type */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Adjustment Type</Text>
                  <View style={styles.adjustmentTypeRow}>
                    {(['add', 'subtract', 'set'] as AdjustmentType[]).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.adjustmentTypeButton,
                          adjustmentType === type && styles.adjustmentTypeButtonActive,
                        ]}
                        onPress={() => setAdjustmentType(type)}
                      >
                        <Ionicons
                          name={
                            type === 'add' ? 'add-circle-outline' :
                            type === 'subtract' ? 'remove-circle-outline' :
                            'swap-horizontal-outline'
                          }
                          size={20}
                          color={adjustmentType === type ? colors.text : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.adjustmentTypeText,
                            adjustmentType === type && styles.adjustmentTypeTextActive,
                          ]}
                        >
                          {type === 'add' ? 'Add' : type === 'subtract' ? 'Remove' : 'Set'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Quantity */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={adjustmentQuantity}
                    onChangeText={setAdjustmentQuantity}
                    placeholder="Enter quantity"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>

                {/* Reason */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Reason (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={adjustmentReason}
                    onChangeText={setAdjustmentReason}
                    placeholder="e.g., Received shipment, Damaged goods"
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>

                {/* New Stock Preview */}
                {adjustmentQuantity && (
                  <View style={styles.newStockPreview}>
                    <Text style={styles.newStockLabel}>New stock level:</Text>
                    <Text style={styles.newStockValue}>{calculateNewStock()} units</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeAdjustModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!adjustmentQuantity || adjusting) && styles.saveButtonDisabled,
                    ]}
                    onPress={handleAdjustStock}
                    disabled={!adjustmentQuantity || adjusting}
                  >
                    <Text style={styles.saveButtonText}>
                      {adjusting ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statsContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
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
  productCard: {
    marginBottom: spacing.md,
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  productSku: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  productCategory: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  stockNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  stockLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  adjustButton: {
    padding: spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: borderRadius.md,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  productValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  viewDetailsLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
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
  modalProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  modalProductImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
  },
  modalProductImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalProductDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  modalProductName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalCurrentStock: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  modalLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  adjustmentTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  adjustmentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustmentTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  adjustmentTypeText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  adjustmentTypeTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
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
    height: 80,
    textAlignVertical: 'top',
  },
  newStockPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  newStockLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  newStockValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
})
