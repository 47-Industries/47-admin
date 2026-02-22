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
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const LOW_STOCK_THRESHOLD = 10

interface ProductVariant {
  id: string
  productId: string
  productName: string
  name: string
  options: Record<string, string>
  price: number
  comparePrice: number | null
  stock: number
  sku: string | null
  isActive: boolean
  image: string | null
}

interface VariantStats {
  total: number
  totalStockValue: number
  lowStock: number
  outOfStock: number
}

type StockFilter = 'all' | 'in_stock' | 'low' | 'out'
type BulkAction = 'price_set' | 'price_increase' | 'price_decrease' | 'stock_set' | 'stock_add' | 'stock_subtract' | 'activate' | 'deactivate' | 'delete'

const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
]

export default function VariantsBulkEditScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  const [stats, setStats] = useState<VariantStats>({ total: 0, totalStockValue: 0, lowStock: 0, outOfStock: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [productFilter, setProductFilter] = useState<string>('')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Bulk action modal
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null)
  const [bulkValue, setBulkValue] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editSku, setEditSku] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const fetchVariants = useCallback(async () => {
    try {
      const data = await api.getAllVariants({
        search: search || undefined,
        stockStatus: stockFilter === 'all' ? undefined : stockFilter,
        productId: productFilter || undefined,
      })

      setVariants(data.variants || [])
      setProducts(data.products || [])

      // Calculate stats
      const allVariants = data.variants || []
      const calculatedStats: VariantStats = {
        total: allVariants.length,
        totalStockValue: allVariants.reduce((sum: number, v: ProductVariant) => sum + (v.price * v.stock), 0),
        lowStock: allVariants.filter((v: ProductVariant) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD).length,
        outOfStock: allVariants.filter((v: ProductVariant) => v.stock === 0).length,
      }
      setStats(calculatedStats)
    } catch (error) {
      console.error('Failed to fetch variants:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, stockFilter, productFilter])

  useEffect(() => {
    setLoading(true)
    fetchVariants()
  }, [fetchVariants])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchVariants()
  }, [fetchVariants])

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredVariants.map((v) => v.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Filter variants
  const filteredVariants = variants.filter((v) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesName = v.productName.toLowerCase().includes(searchLower)
      const matchesSku = v.sku?.toLowerCase().includes(searchLower)
      const matchesVariantName = v.name.toLowerCase().includes(searchLower)
      if (!matchesName && !matchesSku && !matchesVariantName) return false
    }

    // Stock filter
    if (stockFilter === 'in_stock' && v.stock <= LOW_STOCK_THRESHOLD) return false
    if (stockFilter === 'low' && (v.stock === 0 || v.stock > LOW_STOCK_THRESHOLD)) return false
    if (stockFilter === 'out' && v.stock > 0) return false

    // Product filter
    if (productFilter && v.productId !== productFilter) return false

    return true
  })

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

  // Bulk actions
  const openBulkModal = (action: BulkAction) => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one variant')
      return
    }
    setBulkAction(action)
    setBulkValue('')
    setShowBulkModal(true)
  }

  const executeBulkAction = async () => {
    if (!bulkAction) return

    // Validate value for price/stock actions
    if (['price_set', 'price_increase', 'price_decrease', 'stock_set', 'stock_add', 'stock_subtract'].includes(bulkAction)) {
      const numValue = parseFloat(bulkValue)
      if (isNaN(numValue) || numValue < 0) {
        Alert.alert('Invalid Value', 'Please enter a valid positive number')
        return
      }
    }

    // Confirm delete
    if (bulkAction === 'delete') {
      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete ${selectedIds.size} variant(s)? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performBulkAction() },
        ]
      )
      return
    }

    await performBulkAction()
  }

  const performBulkAction = async () => {
    setBulkLoading(true)
    try {
      const ids = Array.from(selectedIds)
      const numValue = parseFloat(bulkValue) || 0

      switch (bulkAction) {
        case 'price_set':
          await api.bulkUpdateVariants(ids, { priceAction: 'set', priceValue: numValue })
          break
        case 'price_increase':
          await api.bulkUpdateVariants(ids, { priceAction: 'increase_percent', priceValue: numValue })
          break
        case 'price_decrease':
          await api.bulkUpdateVariants(ids, { priceAction: 'decrease_percent', priceValue: numValue })
          break
        case 'stock_set':
          await api.bulkUpdateVariants(ids, { stockAction: 'set', stockValue: Math.floor(numValue) })
          break
        case 'stock_add':
          await api.bulkUpdateVariants(ids, { stockAction: 'add', stockValue: Math.floor(numValue) })
          break
        case 'stock_subtract':
          await api.bulkUpdateVariants(ids, { stockAction: 'subtract', stockValue: Math.floor(numValue) })
          break
        case 'activate':
          await api.bulkUpdateVariants(ids, { isActive: true })
          break
        case 'deactivate':
          await api.bulkUpdateVariants(ids, { isActive: false })
          break
        case 'delete':
          await api.bulkDeleteVariants(ids)
          break
      }

      Alert.alert('Success', `Updated ${ids.length} variant(s) successfully`)
      setShowBulkModal(false)
      setBulkAction(null)
      setBulkValue('')
      clearSelection()
      fetchVariants()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to perform bulk action')
    } finally {
      setBulkLoading(false)
    }
  }

  // Edit single variant
  const openEditModal = (variant: ProductVariant) => {
    setEditingVariant(variant)
    setEditPrice(variant.price.toString())
    setEditStock(variant.stock.toString())
    setEditSku(variant.sku || '')
    setShowEditModal(true)
  }

  const saveVariantEdit = async () => {
    if (!editingVariant) return

    const price = parseFloat(editPrice)
    const stock = parseInt(editStock, 10)

    if (isNaN(price) || price < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price')
      return
    }
    if (isNaN(stock) || stock < 0) {
      Alert.alert('Invalid Stock', 'Please enter a valid stock value')
      return
    }

    setEditSaving(true)
    try {
      await api.updateProductVariant(editingVariant.productId, editingVariant.id, {
        price,
        stock,
        sku: editSku || undefined,
      })

      Alert.alert('Success', 'Variant updated successfully')
      setShowEditModal(false)
      setEditingVariant(null)
      fetchVariants()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update variant')
    } finally {
      setEditSaving(false)
    }
  }

  const getBulkActionLabel = (action: BulkAction | null): string => {
    switch (action) {
      case 'price_set': return 'Set Price'
      case 'price_increase': return 'Increase Price %'
      case 'price_decrease': return 'Decrease Price %'
      case 'stock_set': return 'Set Stock'
      case 'stock_add': return 'Add Stock'
      case 'stock_subtract': return 'Subtract Stock'
      case 'activate': return 'Activate'
      case 'deactivate': return 'Deactivate'
      case 'delete': return 'Delete'
      default: return ''
    }
  }

  const renderVariant = ({ item }: { item: ProductVariant }) => {
    const stockStatus = getStockStatus(item.stock)
    const isSelected = selectedIds.has(item.id)
    const optionsText = Object.entries(item.options)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' / ')

    return (
      <TouchableOpacity
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.variantCard} borderColor={isSelected ? colors.primary : undefined}>
          <View style={styles.variantContent}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleSelect(item.id)}
            >
              <View style={[styles.checkboxInner, isSelected && styles.checkboxChecked]}>
                {isSelected && <Ionicons name="checkmark" size={14} color={colors.text} />}
              </View>
            </TouchableOpacity>

            <View style={styles.variantInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.variantName} numberOfLines={1}>
                {optionsText || item.name}
              </Text>
              {item.sku && (
                <Text style={styles.variantSku}>SKU: {item.sku}</Text>
              )}

              <View style={styles.variantMeta}>
                <Text style={styles.variantPrice}>{formatCurrency(item.price)}</Text>
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
              </View>

              <View style={styles.variantBadges}>
                <Badge text={stockStatus.label} variant={stockStatus.variant} />
                {!item.isActive && (
                  <Badge text="Inactive" variant="default" />
                )}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading variants...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Variants</Text>
        </View>
      )}

      {/* Stats Overview */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Variants</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Value</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(stats.totalStockValue)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Low Stock</Text>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.lowStock}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Out of Stock</Text>
          <Text style={[styles.statValue, { color: colors.error }]}>{stats.outOfStock}</Text>
        </View>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by product name or SKU..."
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

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Stock Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {STOCK_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterPill,
                stockFilter === filter.value && styles.filterPillActive,
              ]}
              onPress={() => setStockFilter(filter.value)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  stockFilter === filter.value && styles.filterPillTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Product Filter */}
        {products.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                !productFilter && styles.filterPillActive,
              ]}
              onPress={() => setProductFilter('')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  !productFilter && styles.filterPillTextActive,
                ]}
              >
                All Products
              </Text>
            </TouchableOpacity>
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.filterPill,
                  productFilter === product.id && styles.filterPillActive,
                ]}
                onPress={() => setProductFilter(product.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    productFilter === product.id && styles.filterPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {product.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Selection Controls */}
      <View style={styles.selectionBar}>
        <TouchableOpacity style={styles.selectAllButton} onPress={selectedIds.size === filteredVariants.length ? clearSelection : selectAll}>
          <View style={[styles.checkboxInner, selectedIds.size === filteredVariants.length && filteredVariants.length > 0 && styles.checkboxChecked]}>
            {selectedIds.size === filteredVariants.length && filteredVariants.length > 0 && (
              <Ionicons name="checkmark" size={12} color={colors.text} />
            )}
          </View>
          <Text style={styles.selectAllText}>
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </Text>
        </TouchableOpacity>

        {selectedIds.size > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSelection}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <View style={styles.bulkActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.primary }]}
              onPress={() => openBulkModal('price_set')}
            >
              <Ionicons name="pricetag-outline" size={16} color={colors.text} />
              <Text style={styles.bulkActionText}>Set Price</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.success }]}
              onPress={() => openBulkModal('price_increase')}
            >
              <Ionicons name="trending-up-outline" size={16} color={colors.text} />
              <Text style={styles.bulkActionText}>+%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.warning }]}
              onPress={() => openBulkModal('price_decrease')}
            >
              <Ionicons name="trending-down-outline" size={16} color={colors.text} />
              <Text style={styles.bulkActionText}>-%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.purple }]}
              onPress={() => openBulkModal('stock_set')}
            >
              <Ionicons name="cube-outline" size={16} color={colors.text} />
              <Text style={styles.bulkActionText}>Set Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.success }]}
              onPress={() => openBulkModal('stock_add')}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.text} />
              <Text style={styles.bulkActionText}>+Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.warning }]}
              onPress={() => openBulkModal('stock_subtract')}
            >
              <Ionicons name="remove-circle-outline" size={16} color={colors.text} />
              <Text style={styles.bulkActionText}>-Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.success }]}
              onPress={() => openBulkModal('activate')}
            >
              <Ionicons name="eye-outline" size={16} color={colors.text} />
              <Text style={styles.bulkActionText}>Activate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.surfaceHover }]}
              onPress={() => openBulkModal('deactivate')}
            >
              <Ionicons name="eye-off-outline" size={16} color={colors.text} />
              <Text style={styles.bulkActionText}>Deactivate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.error }]}
              onPress={() => openBulkModal('delete')}
            >
              <Ionicons name="trash-outline" size={16} color={colors.text} />
              <Text style={styles.bulkActionText}>Delete</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Variants List */}
      <FlatList
        data={filteredVariants}
        renderItem={renderVariant}
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
          <View style={styles.empty}>
            <Ionicons name="layers-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {search ? 'No variants match your search' : 'No variants found'}
            </Text>
          </View>
        }
      />

      {/* Bulk Action Modal */}
      <Modal visible={showBulkModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getBulkActionLabel(bulkAction)}</Text>
              <TouchableOpacity onPress={() => setShowBulkModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalInfo}>
                Applying to {selectedIds.size} variant(s)
              </Text>

              {bulkAction && ['price_set', 'price_increase', 'price_decrease', 'stock_set', 'stock_add', 'stock_subtract'].includes(bulkAction) && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>
                    {bulkAction.includes('price') ?
                      (bulkAction.includes('percent') ? 'Percentage' : 'Price ($)') :
                      'Quantity'
                    }
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={bulkValue}
                    onChangeText={setBulkValue}
                    placeholder={bulkAction.includes('price') ?
                      (bulkAction.includes('increase') || bulkAction.includes('decrease') ? 'Enter percentage' : 'Enter price') :
                      'Enter quantity'
                    }
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}

              {bulkAction === 'activate' && (
                <Text style={styles.modalDescription}>
                  This will make all selected variants visible in the shop.
                </Text>
              )}

              {bulkAction === 'deactivate' && (
                <Text style={styles.modalDescription}>
                  This will hide all selected variants from the shop.
                </Text>
              )}

              {bulkAction === 'delete' && (
                <Text style={[styles.modalDescription, { color: colors.error }]}>
                  This will permanently delete all selected variants. This action cannot be undone.
                </Text>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowBulkModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    bulkAction === 'delete' && { backgroundColor: colors.error },
                    bulkLoading && styles.buttonDisabled,
                  ]}
                  onPress={executeBulkAction}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text style={styles.confirmButtonText}>
                      {bulkAction === 'delete' ? 'Delete' : 'Apply'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Variant Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Variant</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {editingVariant && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalProductInfo}>
                  <Text style={styles.modalProductName} numberOfLines={2}>
                    {editingVariant.productName}
                  </Text>
                  <Text style={styles.modalVariantName}>
                    {Object.entries(editingVariant.options)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(' / ')}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Price ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    placeholder="Enter price"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Stock</Text>
                  <TextInput
                    style={styles.input}
                    value={editStock}
                    onChangeText={setEditStock}
                    placeholder="Enter stock"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>SKU</Text>
                  <TextInput
                    style={styles.input}
                    value={editSku}
                    onChangeText={setEditSku}
                    placeholder="Enter SKU (optional)"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowEditModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, editSaving && styles.buttonDisabled]}
                    onPress={saveVariantEdit}
                    disabled={editSaving}
                  >
                    {editSaving ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Text style={styles.confirmButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: fontSize.md,
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
  // Stats
  statsContainer: {
    maxHeight: 90,
    marginBottom: spacing.md,
  },
  statsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minWidth: 100,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  // Search
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
  // Filters
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  filterPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
    maxWidth: 150,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  // Selection Bar
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  clearButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  // Checkbox
  checkbox: {
    marginRight: spacing.md,
  },
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  // Bulk Actions
  bulkActionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  bulkActionText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.xs,
  },
  // List
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Variant Card
  variantCard: {
    marginBottom: spacing.sm,
  },
  variantContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  variantInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  variantName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  variantSku: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  variantMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  variantPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
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
  variantBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  // Empty State
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
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
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalBody: {
    paddingBottom: spacing.lg,
  },
  modalInfo: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  modalProductInfo: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  modalProductName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalVariantName: {
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
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
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
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
