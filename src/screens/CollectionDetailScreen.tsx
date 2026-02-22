import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface CollectionProduct {
  id: string
  productId: string
  sortOrder: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    images: string[]
    brand: string | null
    active: boolean
  }
}

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
  products: CollectionProduct[]
}

interface AvailableProduct {
  id: string
  name: string
  slug: string
  price: number
  images: string[]
  brand: string | null
  active: boolean
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

export default function CollectionDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [brands, setBrands] = useState<string[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  // Product picker modal
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [addingProducts, setAddingProducts] = useState(false)

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const fetchCollection = useCallback(async () => {
    try {
      const data = await api.getCollection(id)
      setCollection(data.collection)
    } catch (error) {
      console.error('Failed to fetch collection:', error)
      Alert.alert('Error', 'Failed to load collection')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

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

  const fetchAvailableProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const data = await api.getProducts({ limit: 100, search: searchQuery || undefined })
      // Filter out products already in collection
      const existingIds = collection?.products.map(p => p.productId) || []
      const filtered = (data.products || []).filter(
        (p: AvailableProduct) => !existingIds.includes(p.id)
      )
      setAvailableProducts(filtered)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoadingProducts(false)
    }
  }, [searchQuery, collection])

  useEffect(() => {
    fetchCollection()
    fetchBrandsAndCategories()
  }, [fetchCollection, fetchBrandsAndCategories])

  useEffect(() => {
    if (showProductPicker) {
      fetchAvailableProducts()
    }
  }, [showProductPicker, fetchAvailableProducts])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCollection()
  }

  const openEditModal = () => {
    if (!collection) return
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
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setFormData(null)
  }

  const handleSave = async () => {
    if (!formData || !collection) return

    if (!formData.name.trim()) {
      Alert.alert('Error', 'Collection name is required')
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

      await api.updateCollection(collection.id, payload)
      Alert.alert('Success', 'Collection updated')
      closeEditModal()
      fetchCollection()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update collection')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!collection) return

    setDeleting(true)
    try {
      await api.deleteCollection(collection.id)
      Alert.alert('Success', 'Collection deleted', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete collection')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const openProductPicker = () => {
    setSelectedProductIds([])
    setSearchQuery('')
    setShowProductPicker(true)
  }

  const closeProductPicker = () => {
    setShowProductPicker(false)
    setSelectedProductIds([])
    setSearchQuery('')
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  const handleAddProducts = async () => {
    if (!collection || selectedProductIds.length === 0) return

    setAddingProducts(true)
    try {
      await api.addProductsToCollection(collection.id, selectedProductIds)
      Alert.alert('Success', `${selectedProductIds.length} product(s) added`)
      closeProductPicker()
      fetchCollection()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add products')
    } finally {
      setAddingProducts(false)
    }
  }

  const handleRemoveProduct = (productId: string, productName: string) => {
    if (!collection) return

    Alert.alert(
      'Remove Product',
      `Remove "${productName}" from this collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeProductsFromCollection(collection.id, [productId])
              fetchCollection()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove product')
            }
          },
        },
      ]
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!collection) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Collection not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
      </View>
    )
  }

  const productCount = collection.products?.length || 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collection Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditModal} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Collection Info */}
        <View style={styles.collectionHeader}>
          <View style={styles.nameRow}>
            {collection.accentColor && (
              <View style={[styles.accentDot, { backgroundColor: collection.accentColor }]} />
            )}
            <Text style={styles.collectionName}>{collection.name}</Text>
          </View>
          <View style={styles.badges}>
            <Badge
              text={collection.type}
              variant={collection.type === 'AUTOMATIC' ? 'primary' : 'success'}
            />
            {!collection.active && <Badge text="Inactive" variant="error" />}
            {collection.displayOnHome && <Badge text="On Home" variant="warning" />}
          </View>
        </View>

        {collection.description && (
          <Text style={styles.description}>{collection.description}</Text>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{productCount}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{collection.maxProducts}</Text>
            <Text style={styles.statLabel}>Max Display</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{collection.sortOrder}</Text>
            <Text style={styles.statLabel}>Sort Order</Text>
          </Card>
        </View>

        {/* Details Card */}
        <Text style={styles.sectionTitle}>Details</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Slug</Text>
            <Text style={styles.detailValue}>{collection.slug}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{collection.type}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, { color: collection.active ? colors.success : colors.error }]}>
              {collection.active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Display on Home</Text>
            <Text style={styles.detailValue}>{collection.displayOnHome ? 'Yes' : 'No'}</Text>
          </View>
          {collection.accentColor && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Accent Color</Text>
              <View style={styles.colorRow}>
                <View style={[styles.colorSwatch, { backgroundColor: collection.accentColor }]} />
                <Text style={styles.detailValue}>{collection.accentColor}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Query Info for Automatic Collections */}
        {collection.type === 'AUTOMATIC' && collection.autoQuery && (
          <>
            <Text style={styles.sectionTitle}>Query Filters</Text>
            <Card style={styles.detailsCard}>
              {collection.autoQuery.brand && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Brand</Text>
                  <Text style={styles.detailValue}>{collection.autoQuery.brand}</Text>
                </View>
              )}
              {collection.autoQuery.category && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{collection.autoQuery.category}</Text>
                </View>
              )}
              {collection.autoQuery.tags && collection.autoQuery.tags.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tags</Text>
                  <Text style={styles.detailValue}>{collection.autoQuery.tags.join(', ')}</Text>
                </View>
              )}
              {!collection.autoQuery.brand && !collection.autoQuery.category && (!collection.autoQuery.tags || collection.autoQuery.tags.length === 0) && (
                <Text style={styles.noQueryText}>No query filters defined</Text>
              )}
            </Card>
          </>
        )}

        {/* Products Section */}
        <View style={styles.productsHeader}>
          <Text style={styles.sectionTitle}>Products ({productCount})</Text>
          {collection.type === 'MANUAL' && (
            <TouchableOpacity style={styles.addProductButton} onPress={openProductPicker}>
              <Ionicons name="add" size={18} color={colors.text} />
              <Text style={styles.addProductButtonText}>Add Products</Text>
            </TouchableOpacity>
          )}
        </View>

        {collection.type === 'AUTOMATIC' && (
          <View style={styles.automaticNotice}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.automaticNoticeText}>
              Products are automatically populated based on query filters
            </Text>
          </View>
        )}

        {productCount === 0 ? (
          <View style={styles.emptyProducts}>
            <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyProductsText}>No products in this collection</Text>
            {collection.type === 'MANUAL' && (
              <Button
                title="Add Products"
                size="sm"
                onPress={openProductPicker}
                style={{ marginTop: spacing.md }}
              />
            )}
          </View>
        ) : (
          <View style={styles.productsList}>
            {collection.products.map((cp) => (
              <Card key={cp.id} style={styles.productCard}>
                <View style={styles.productCardContent}>
                  {cp.product.images?.[0] ? (
                    <Image source={{ uri: cp.product.images[0] }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{cp.product.name}</Text>
                    <Text style={styles.productPrice}>{formatCurrency(cp.product.price)}</Text>
                    {cp.product.brand && (
                      <Text style={styles.productBrand}>{cp.product.brand}</Text>
                    )}
                    <View style={styles.productBadges}>
                      {!cp.product.active && <Badge text="Inactive" variant="error" />}
                    </View>
                  </View>
                  {collection.type === 'MANUAL' && (
                    <TouchableOpacity
                      style={styles.removeProductButton}
                      onPress={() => handleRemoveProduct(cp.productId, cp.product.name)}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Collection</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {formData && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Collection Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Summer Sale"
                    placeholderTextColor={colors.textMuted}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Slug</Text>
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
                  <Text style={styles.inputLabel}>Collection Type</Text>
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
                    </TouchableOpacity>
                  </View>
                </View>

                {formData.type === 'AUTOMATIC' && (
                  <View style={styles.querySection}>
                    <Text style={styles.sectionLabel}>Query Builder</Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.inputLabel}>Brand</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                          style={[styles.chip, !formData.autoQuery.brand && styles.chipActive]}
                          onPress={() => setFormData({
                            ...formData,
                            autoQuery: { ...formData.autoQuery, brand: undefined }
                          })}
                        >
                          <Text style={[styles.chipText, !formData.autoQuery.brand && styles.chipTextActive]}>
                            All
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
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                          style={[styles.chip, !formData.autoQuery.category && styles.chipActive]}
                          onPress={() => setFormData({
                            ...formData,
                            autoQuery: { ...formData.autoQuery, category: undefined }
                          })}
                        >
                          <Text style={[styles.chipText, !formData.autoQuery.category && styles.chipTextActive]}>
                            All
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
                )}

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
                    placeholder=colors.primary
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
                  <Button title="Cancel" variant="outline" onPress={closeEditModal} style={{ flex: 1 }} />
                  <Button
                    title="Save"
                    onPress={handleSave}
                    loading={saving}
                    style={{ flex: 1, marginLeft: spacing.md }}
                  />
                </View>
                <View style={{ height: spacing.xxl }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={showProductPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Products</Text>
              <TouchableOpacity onPress={closeProductPicker}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={fetchAvailableProducts}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {loadingProducts ? (
              <View style={styles.pickerLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={availableProducts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedProductIds.includes(item.id)
                  return (
                    <TouchableOpacity
                      style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                      onPress={() => toggleProductSelection(item.id)}
                    >
                      {item.images?.[0] ? (
                        <Image source={{ uri: item.images[0] }} style={styles.pickerImage} />
                      ) : (
                        <View style={styles.pickerImagePlaceholder}>
                          <Ionicons name="cube-outline" size={20} color={colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.pickerInfo}>
                        <Text style={styles.pickerName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.pickerPrice}>{formatCurrency(item.price)}</Text>
                      </View>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color={colors.text} />}
                      </View>
                    </TouchableOpacity>
                  )
                }}
                ListEmptyComponent={
                  <View style={styles.emptyPicker}>
                    <Text style={styles.emptyPickerText}>No products available</Text>
                  </View>
                }
                contentContainerStyle={styles.pickerList}
              />
            )}

            <View style={styles.pickerFooter}>
              <Text style={styles.selectedCount}>
                {selectedProductIds.length} selected
              </Text>
              <View style={styles.pickerButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={closeProductPicker}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Add Selected"
                  onPress={handleAddProducts}
                  loading={addingProducts}
                  disabled={selectedProductIds.length === 0}
                  style={{ flex: 1, marginLeft: spacing.md }}
                />
              </View>
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
            <Text style={styles.deleteModalTitle}>Delete Collection?</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{collection?.name}"? This will remove all product associations.
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
  errorText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
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
  collectionHeader: {
    marginBottom: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  accentDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: spacing.sm,
  },
  collectionName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
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
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noQueryText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addProductButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  automaticNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  automaticNoticeText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flex: 1,
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyProductsText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  productsList: {
    gap: spacing.md,
  },
  productCard: {
    padding: spacing.md,
  },
  productCardContent: {
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
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  productPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  productBrand: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  productBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  removeProductButton: {
    padding: spacing.sm,
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
    marginBottom: spacing.md,
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
  // Product picker styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
  pickerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  pickerList: {
    paddingBottom: spacing.md,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  pickerImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceHover,
  },
  pickerImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pickerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  pickerPrice: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyPicker: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyPickerText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  pickerFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  selectedCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  pickerButtons: {
    flexDirection: 'row',
  },
  // Delete modal styles
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
    borderRadius: 40,
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
