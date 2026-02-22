import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { CachedImage } from '../components/CachedImage'
import { SkeletonList } from '../components/Skeleton'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import { Product } from '../types'

type ProductTab = 'physical' | 'apparel' | 'digital'

// Extended Product type for all products
interface ExtendedProduct extends Product {
  fulfillmentType?: 'SELF_FULFILLED' | 'PRINTFUL' | null
  productType?: 'PHYSICAL' | 'DIGITAL' | null
  brand?: string | null
  gender?: string | null
}

export function ProductsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [activeTab, setActiveTab] = useState<ProductTab>('physical')
  const [products, setProducts] = useState<ExtendedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')

  // Filter state
  const [syncing, setSyncing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [brandFilter, setBrandFilter] = useState<string>('')
  const [brands, setBrands] = useState<{ key: string; name: string }[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const fetchProducts = async (pageNum = 1, refresh = false) => {
    try {
      let params: any = {
        page: pageNum,
        limit: 20,
        search: search || undefined,
      }

      // Add status filter
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }

      if (activeTab === 'physical') {
        // Physical products: PHYSICAL type, exclude Printful (self-fulfilled only)
        params.productType = 'PHYSICAL'
        params.excludeFulfillment = 'PRINTFUL'
        if (brandFilter) {
          params.brand = brandFilter
        }
      } else if (activeTab === 'apparel') {
        // Apparel products: Printful fulfilled
        params.productType = 'PHYSICAL'
        params.fulfillmentType = 'PRINTFUL'
        if (brandFilter) {
          params.brand = brandFilter
        }
      } else if (activeTab === 'digital') {
        // Digital products
        params.productType = 'DIGITAL'
      }

      const data = await api.getProducts(params)
      const newProducts = (data.products || []) as ExtendedProduct[]

      if (refresh || pageNum === 1) {
        setProducts(newProducts)
      } else {
        setProducts((prev) => [...prev, ...newProducts])
      }

      setHasMore(newProducts.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch brands from API
  const fetchBrands = async () => {
    try {
      const data = await api.getProductBrands()
      // API now returns { brands: [{ key: string, name: string }] }
      if (data.brands && Array.isArray(data.brands)) {
        // Handle both old format (string[]) and new format ({ key, name }[])
        const formattedBrands = data.brands.map((b: any) =>
          typeof b === 'string' ? { key: b, name: b } : b
        )
        setBrands(formattedBrands)
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error)
    }
  }

  useEffect(() => {
    fetchBrands()
  }, [])

  useEffect(() => {
    setLoading(true)
    setSelectedIds(new Set())
    setBrandFilter('')
    fetchProducts(1, true)
  }, [activeTab, search, statusFilter])

  useEffect(() => {
    if ((activeTab === 'apparel' || activeTab === 'physical') && brandFilter !== undefined) {
      setLoading(true)
      fetchProducts(1, true)
    }
  }, [brandFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchProducts(1, true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchProducts(page + 1)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  // Sync from Printful
  const handleSyncPrintful = async () => {
    setSyncing(true)
    try {
      await api.syncPrintful()
      Alert.alert('Success', 'Products synced from Printful successfully')
      fetchProducts(1, true)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sync products from Printful')
    } finally {
      setSyncing(false)
    }
  }

  // Selection handlers
  const toggleSelectProduct = (id: string) => {
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

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)))
    }
  }

  // Bulk actions
  const handleBulkAction = async (action: 'activate' | 'deactivate') => {
    if (selectedIds.size === 0) return

    const actionLabel = action === 'activate' ? 'activate' : 'deactivate'
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${actionLabel} ${selectedIds.size} product(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBulkLoading(true)
            try {
              const ids = Array.from(selectedIds)
              for (const id of ids) {
                const product = products.find((p) => p.id === id)
                if (product) {
                  await api.updateProduct(id, { active: action === 'activate' })
                }
              }
              setSelectedIds(new Set())
              fetchProducts(1, true)
              Alert.alert('Success', `${ids.length} product(s) ${actionLabel}d`)
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Some operations failed')
            } finally {
              setBulkLoading(false)
            }
          },
        },
      ]
    )
  }

  const renderProduct = ({ item }: { item: ExtendedProduct }) => {
    const isSelected = selectedIds.has(item.id)

    return (
      <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { id: item.id })} activeOpacity={0.7}>
        <Card style={[styles.productCard, isSelected && styles.productCardSelected]}>
          <View style={styles.productContent}>
            {activeTab === 'apparel' && (
              <TouchableOpacity
                style={styles.checkbox}
                onPress={(e) => {
                  e.stopPropagation?.()
                  toggleSelectProduct(item.id)
                }}
              >
                <View style={[styles.checkboxInner, isSelected && styles.checkboxChecked]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={colors.text} />}
                </View>
              </TouchableOpacity>
            )}
            {item.images?.[0] ? (
              <CachedImage source={{ uri: item.images[0] }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.productCategory}>
                {item.category?.name || 'Uncategorized'}
                {(activeTab === 'apparel' || activeTab === 'physical') && item.brand && ` - ${brands.find(b => b.key === item.brand)?.name || item.brand}`}
                {activeTab === 'digital' && ' - Digital Download'}
              </Text>
              <View style={styles.productMeta}>
                <Text style={styles.productPrice}>{formatCurrency(Number(item.price))}</Text>
                <Badge
                  text={item.stock > 0 ? `${item.stock} in stock` : 'Out of Stock'}
                  variant={item.stock > 0 ? (item.stock <= 5 ? 'warning' : 'success') : 'error'}
                />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
          {(item.featured || !item.active) && (
            <View style={styles.productBadges}>
              {item.featured && (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={12} color={colors.warning} />
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
              )}
              {!item.active && (
                <View style={styles.inactiveBadge}>
                  <Ionicons name="eye-off" size={12} color={colors.error} />
                  <Text style={styles.inactiveText}>Inactive</Text>
                </View>
              )}
            </View>
          )}
        </Card>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Products</Text>
          {activeTab === 'physical' && (
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('ProductCreate')}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'physical' && styles.tabActive]}
          onPress={() => setActiveTab('physical')}
        >
          <Ionicons
            name="cube-outline"
            size={16}
            color={activeTab === 'physical' ? colors.text : colors.textMuted}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'physical' && styles.tabTextActive]}>Physical</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'apparel' && styles.tabActiveApparel]}
          onPress={() => setActiveTab('apparel')}
        >
          <Ionicons
            name="shirt-outline"
            size={16}
            color={activeTab === 'apparel' ? colors.text : colors.textMuted}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'apparel' && styles.tabTextActive]}>Apparel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'digital' && styles.tabActiveDigital]}
          onPress={() => setActiveTab('digital')}
        >
          <Ionicons
            name="cloud-download-outline"
            size={16}
            color={activeTab === 'digital' ? colors.text : colors.textMuted}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'digital' && styles.tabTextActive]}>Digital</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter */}
      <View style={styles.statusFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFilterContent}>
          <TouchableOpacity
            style={[styles.statusChip, statusFilter === 'all' && styles.statusChipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.statusChipText, statusFilter === 'all' && styles.statusChipTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusChip, statusFilter === 'active' && styles.statusChipActiveGreen]}
            onPress={() => setStatusFilter('active')}
          >
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusChipText, statusFilter === 'active' && styles.statusChipTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusChip, statusFilter === 'inactive' && styles.statusChipActiveRed]}
            onPress={() => setStatusFilter('inactive')}
          >
            <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.statusChipText, statusFilter === 'inactive' && styles.statusChipTextActive]}>Inactive</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

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

      {/* Apparel Controls */}
      {activeTab === 'apparel' && (
        <View style={styles.apparelControls}>
          {/* Sync Button */}
          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleSyncPrintful}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="sync-outline" size={18} color={colors.text} />
            )}
            <Text style={styles.syncButtonText}>{syncing ? 'Syncing...' : 'Sync from Printful'}</Text>
          </TouchableOpacity>

          {/* Brand Filter */}
          {brands.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandFilterContainer}>
              <TouchableOpacity
                style={[styles.brandChip, !brandFilter && styles.brandChipActive]}
                onPress={() => setBrandFilter('')}
              >
                <Text style={[styles.brandChipText, !brandFilter && styles.brandChipTextActive]}>All Brands</Text>
              </TouchableOpacity>
              {brands.map((brand) => (
                <TouchableOpacity
                  key={brand.key}
                  style={[styles.brandChip, brandFilter === brand.key && styles.brandChipActive]}
                  onPress={() => setBrandFilter(brand.key)}
                >
                  <Text style={[styles.brandChipText, brandFilter === brand.key && styles.brandChipTextActive]}>
                    {brand.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Bulk Selection Controls */}
          <View style={styles.bulkControls}>
            <TouchableOpacity style={styles.selectAllButton} onPress={toggleSelectAll}>
              <View style={[styles.checkboxInner, selectedIds.size === products.length && styles.checkboxChecked]}>
                {selectedIds.size === products.length && products.length > 0 && (
                  <Ionicons name="checkmark" size={12} color={colors.text} />
                )}
              </View>
              <Text style={styles.selectAllText}>
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </Text>
            </TouchableOpacity>

            {selectedIds.size > 0 && (
              <View style={styles.bulkActions}>
                <TouchableOpacity
                  style={[styles.bulkActionButton, styles.bulkActionActivate]}
                  onPress={() => handleBulkAction('activate')}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <Ionicons name="eye-outline" size={16} color={colors.text} />
                      <Text style={styles.bulkActionText}>Activate</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bulkActionButton, styles.bulkActionDeactivate]}
                  onPress={() => handleBulkAction('deactivate')}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <Ionicons name="eye-off-outline" size={16} color={colors.text} />
                      <Text style={styles.bulkActionText}>Deactivate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Physical Tab: Brand Filter + Add Button */}
      {activeTab === 'physical' && (
        <View style={styles.apparelControls}>
          {/* Brand Filter */}
          {brands.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandFilterContainer}>
              <TouchableOpacity
                style={[styles.brandChip, !brandFilter && styles.brandChipActive]}
                onPress={() => setBrandFilter('')}
              >
                <Text style={[styles.brandChipText, !brandFilter && styles.brandChipTextActive]}>All Brands</Text>
              </TouchableOpacity>
              {brands.map((brand) => (
                <TouchableOpacity
                  key={brand.key}
                  style={[styles.brandChip, brandFilter === brand.key && styles.brandChipActive]}
                  onPress={() => setBrandFilter(brand.key)}
                >
                  <Text style={[styles.brandChipText, brandFilter === brand.key && styles.brandChipTextActive]}>
                    {brand.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <View style={styles.filtersContainer}>
            <View style={styles.filtersRow}>
              <Text style={styles.productCountText}>{products.length} products</Text>
            </View>
            <TouchableOpacity style={styles.addButtonSmall} onPress={() => navigation.navigate('ProductCreate')}>
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Digital Tab: Add Button */}
      {activeTab === 'digital' && (
        <View style={styles.filtersContainer}>
          <View style={styles.filtersRow}>
            <Text style={styles.productCountText}>{products.length} products</Text>
          </View>
          <TouchableOpacity style={styles.addButtonSmall} onPress={() => navigation.navigate('ProductCreate')}>
            <Ionicons name="add" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {loading && products.length === 0 ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons
                  name={activeTab === 'apparel' ? 'shirt-outline' : activeTab === 'digital' ? 'cloud-download-outline' : 'cube-outline'}
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyText}>
                  {activeTab === 'apparel' ? 'No apparel products found' :
                   activeTab === 'digital' ? 'No digital products found' :
                   'No physical products found'}
                </Text>
                {activeTab === 'apparel' && (
                  <Text style={styles.emptySubtext}>Sync products from Printful to get started</Text>
                )}
                {activeTab === 'digital' && (
                  <Text style={styles.emptySubtext}>Create a digital product to get started</Text>
                )}
              </View>
            ) : null
          }
        />
      )}
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
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabActiveApparel: {
    backgroundColor: colors.warning,
  },
  tabActiveDigital: {
    backgroundColor: colors.purple,
  },
  tabIcon: {
    marginRight: spacing.xs,
  },
  tabText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  statusFilterContainer: {
    marginBottom: spacing.md,
  },
  statusFilterContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipActiveGreen: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  statusChipActiveRed: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statusChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  productCountText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
  // Apparel Controls
  apparelControls: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  brandFilterContainer: {
    marginBottom: spacing.md,
  },
  brandChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  brandChipActive: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  brandChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  brandChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  bulkControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
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
  bulkActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  bulkActionActivate: {
    backgroundColor: colors.success,
  },
  bulkActionDeactivate: {
    backgroundColor: colors.error,
  },
  bulkActionText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.xs,
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
    backgroundColor: colors.warning,
    borderColor: colors.warning,
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
  addButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  productCard: {
    marginBottom: spacing.md,
  },
  productCardSelected: {
    borderWidth: 1,
    borderColor: colors.warning,
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
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
  productPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  productBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginLeft: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inactiveText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginLeft: spacing.xs,
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
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
})
