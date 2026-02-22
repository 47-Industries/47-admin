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
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const LOW_STOCK_THRESHOLD = 10

const STOCK_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
]

interface InventoryProduct {
  id: string
  name: string
  sku: string | null
  stock: number
  price: number
  category: { id: string; name: string } | null
  active: boolean
  images: string[]
}

interface StockMovement {
  id: string
  productId: string
  product?: { name: string }
  type: 'IN' | 'OUT' | 'ADJUSTMENT'
  quantity: number
  reason: string | null
  createdBy?: { name: string } | null
  createdAt: string
}

interface InventoryAlert {
  id: string
  productId: string
  product: { name: string; stock: number }
  type: 'LOW_STOCK' | 'OUT_OF_STOCK'
  isResolved: boolean
  createdAt: string
}

interface Category {
  id: string
  name: string
}

interface InventoryStats {
  totalProducts: number
  healthyStock: number
  lowStock: number
  outOfStock: number
  totalValue: number
}

type InventoryView = 'overview' | 'movements' | 'alerts'
type AdjustmentType = 'add' | 'subtract' | 'set'

const ADJUSTMENT_REASONS = [
  'Received shipment',
  'Sold',
  'Damaged goods',
  'Returned',
  'Inventory count correction',
  'Other',
]

export default function InventoryScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [activeView, setActiveView] = useState<InventoryView>('overview')

  // Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add')
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const fetchInventory = useCallback(async () => {
    try {
      const [inventoryData, movementsData, alertsData, categoriesData] = await Promise.all([
        api.getInventory({
          search: search || undefined,
          status: stockFilter === 'all' ? undefined : stockFilter,
        }),
        api.getInventoryMovements(),
        api.getInventoryAlerts(),
        api.getCategories(),
      ])

      const fetchedProducts = inventoryData.products || []

      // Apply category filter locally
      let filteredProducts = fetchedProducts
      if (categoryFilter) {
        filteredProducts = fetchedProducts.filter((p: InventoryProduct) => p.category?.id === categoryFilter)
      }

      setProducts(filteredProducts)
      setMovements(movementsData.movements || [])
      setAlerts(alertsData.alerts || [])
      setCategories(categoriesData.categories || [])

      // Calculate stats from all products (before category filter)
      const allProducts = fetchedProducts
      const calculatedStats: InventoryStats = {
        totalProducts: allProducts.length,
        healthyStock: allProducts.filter((p: InventoryProduct) => p.stock > LOW_STOCK_THRESHOLD).length,
        lowStock: allProducts.filter((p: InventoryProduct) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length,
        outOfStock: allProducts.filter((p: InventoryProduct) => p.stock === 0).length,
        totalValue: allProducts.reduce((sum: number, p: InventoryProduct) => sum + (p.price * p.stock), 0),
      }
      setStats(calculatedStats)
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, stockFilter, categoryFilter])

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

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.resolveInventoryAlert(alertId)
      fetchInventory()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resolve alert')
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

  const activeAlertCount = alerts.filter(a => !a.isResolved).length

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
            <Text style={styles.productPrice}>{formatCurrency(Number(item.price))}</Text>

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

  const renderMovementItem = ({ item }: { item: StockMovement }) => {
    const typeColor = item.type === 'IN' ? colors.success : item.type === 'OUT' ? colors.error : colors.warning
    const typeLabel = item.type === 'IN' ? 'Stock In' : item.type === 'OUT' ? 'Stock Out' : 'Adjustment'
    const quantityPrefix = item.type === 'IN' ? '+' : item.type === 'OUT' ? '-' : ''

    return (
      <View style={styles.movementItem}>
        <View style={styles.movementLeft}>
          <View style={[styles.movementTypeIndicator, { backgroundColor: typeColor }]} />
          <View style={styles.movementInfo}>
            <Text style={styles.movementProductName} numberOfLines={1}>
              {item.product?.name || 'Unknown Product'}
            </Text>
            <Text style={styles.movementMeta}>
              {typeLabel} - {item.reason || 'No reason provided'}
            </Text>
            <Text style={styles.movementDate}>
              {new Date(item.createdAt).toLocaleDateString()} {item.createdBy?.name ? `by ${item.createdBy.name}` : ''}
            </Text>
          </View>
        </View>
        <Text style={[styles.movementQuantity, { color: typeColor }]}>
          {quantityPrefix}{item.quantity}
        </Text>
      </View>
    )
  }

  const renderAlertItem = ({ item }: { item: InventoryAlert }) => {
    if (item.isResolved) return null

    const isOutOfStock = item.type === 'OUT_OF_STOCK'
    const borderColor = isOutOfStock ? 'rgba(239, 68, 68, 0.5)' : 'rgba(250, 204, 21, 0.5)'
    const bgColor = isOutOfStock ? colors.errorBg : colors.warningBg

    return (
      <View style={[styles.alertItem, { borderColor, backgroundColor: bgColor }]}>
        <View style={styles.alertContent}>
          <Ionicons
            name={isOutOfStock ? 'alert-circle' : 'warning'}
            size={24}
            color={isOutOfStock ? colors.error : colors.warning}
          />
          <View style={styles.alertInfo}>
            <Text style={styles.alertProductName}>{item.product.name}</Text>
            <Text style={styles.alertDescription}>
              {isOutOfStock ? 'Out of stock' : `Low stock (${item.product.stock} remaining)`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.resolveButton}
          onPress={() => handleResolveAlert(item.id)}
        >
          <Text style={styles.resolveButtonText}>Resolve</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Products</Text>
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Healthy Stock</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.healthyStock}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Low Stock</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.lowStock}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Out of Stock</Text>
            <Text style={[styles.statValue, { color: colors.error }]}>{stats.outOfStock}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Value</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(stats.totalValue)}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* View Tabs */}
      <View style={styles.viewTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewTabs}>
          <TouchableOpacity
            style={[styles.viewTab, activeView === 'overview' && styles.viewTabActive]}
            onPress={() => setActiveView('overview')}
          >
            <Ionicons
              name="cube-outline"
              size={16}
              color={activeView === 'overview' ? colors.text : colors.textMuted}
            />
            <Text style={[styles.viewTabText, activeView === 'overview' && styles.viewTabTextActive]}>
              Stock Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewTab, activeView === 'movements' && styles.viewTabActive]}
            onPress={() => setActiveView('movements')}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={16}
              color={activeView === 'movements' ? colors.text : colors.textMuted}
            />
            <Text style={[styles.viewTabText, activeView === 'movements' && styles.viewTabTextActive]}>
              Movements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewTab, activeView === 'alerts' && styles.viewTabActive]}
            onPress={() => setActiveView('alerts')}
          >
            <Ionicons
              name="notifications-outline"
              size={16}
              color={activeView === 'alerts' ? colors.text : colors.textMuted}
            />
            <Text style={[styles.viewTabText, activeView === 'alerts' && styles.viewTabTextActive]}>
              Alerts {activeAlertCount > 0 && `(${activeAlertCount})`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Overview View */}
      {activeView === 'overview' && (
        <>
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

            {/* Category Filter */}
            {categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    !categoryFilter && styles.filterPillActive,
                  ]}
                  onPress={() => setCategoryFilter('')}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      !categoryFilter && styles.filterPillTextActive,
                    ]}
                  >
                    All Categories
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.filterPill,
                      categoryFilter === cat.id && styles.filterPillActive,
                    ]}
                    onPress={() => setCategoryFilter(cat.id)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        categoryFilter === cat.id && styles.filterPillTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

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
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  {search ? 'No products match your search' : 'No products found'}
                </Text>
              </View>
            }
          />
        </>
      )}

      {/* Movements View */}
      {activeView === 'movements' && (
        <FlatList
          data={movements}
          renderItem={renderMovementItem}
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
              <Ionicons name="swap-vertical-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No stock movements yet</Text>
              <Text style={styles.emptySubtext}>
                Stock movements will appear here when you adjust inventory
              </Text>
            </View>
          }
        />
      )}

      {/* Alerts View */}
      {activeView === 'alerts' && (
        <FlatList
          data={alerts.filter(a => !a.isResolved)}
          renderItem={renderAlertItem}
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
            <View style={styles.emptyAlerts}>
              <View style={styles.emptyAlertsIcon}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={styles.emptyText}>No active alerts</Text>
              <Text style={styles.emptySubtext}>
                All inventory levels are healthy
              </Text>
            </View>
          }
        />
      )}

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
              <ScrollView showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.modalLabel}>Reason</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.reasonChips}
                  >
                    {ADJUSTMENT_REASONS.map((reason) => (
                      <TouchableOpacity
                        key={reason}
                        style={[
                          styles.reasonChip,
                          adjustmentReason === reason && styles.reasonChipActive,
                        ]}
                        onPress={() => setAdjustmentReason(reason)}
                      >
                        <Text
                          style={[
                            styles.reasonChipText,
                            adjustmentReason === reason && styles.reasonChipTextActive,
                          ]}
                        >
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={adjustmentReason}
                    onChangeText={setAdjustmentReason}
                    placeholder="Or enter custom reason..."
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
                    {adjusting ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
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
  // View Tabs
  viewTabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  viewTabs: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  viewTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  viewTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  viewTabText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  viewTabTextActive: {
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
    marginBottom: spacing.md,
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
  // List
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Product Card
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
    marginTop: spacing.xs,
  },
  productCategory: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  productPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  // Movement Item
  movementItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  movementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  movementTypeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  movementInfo: {
    flex: 1,
  },
  movementProductName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  movementMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  movementDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  movementQuantity: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginLeft: spacing.md,
  },
  // Alert Item
  alertItem: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  alertProductName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  alertDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  resolveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
  },
  resolveButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  // Empty States
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyAlerts: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyAlertsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
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
  reasonChips: {
    marginBottom: spacing.sm,
  },
  reasonChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  reasonChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasonChipText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  reasonChipTextActive: {
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
    height: 60,
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
    marginTop: spacing.md,
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
