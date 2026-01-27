import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface Category {
  id: string
  name: string
  slug: string
  productType: 'PHYSICAL' | 'DIGITAL'
}

interface ProductFormData {
  name: string
  description: string
  price: string
  comparePrice: string
  stock: string
  sku: string
  categoryId: string
  active: boolean
  featured: boolean
}

export default function ProductCreateScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [productType, setProductType] = useState<'PHYSICAL' | 'DIGITAL'>('PHYSICAL')
  const [images, setImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    stock: '0',
    sku: '',
    categoryId: '',
    active: true,
    featured: false,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({})

  useEffect(() => {
    fetchCategories()
  }, [productType])

  const fetchCategories = async () => {
    setLoadingCategories(true)
    try {
      const data = await api.getCategories({ type: productType })
      setCategories(data.categories || [])
      // Reset category selection when product type changes
      setFormData((prev) => ({ ...prev, categoryId: '' }))
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required'
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      newErrors.price = 'Please enter a valid price'
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category'
    }

    if (productType === 'PHYSICAL') {
      if (!formData.stock.trim()) {
        newErrors.stock = 'Stock quantity is required'
      } else if (isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0) {
        newErrors.stock = 'Please enter a valid stock quantity'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true)
        try {
          // For now, we'll use the local URI
          // In production, you would upload to your server/R2
          const imageUri = result.assets[0].uri
          setImages((prev) => [...prev, imageUri])
        } catch (error) {
          Alert.alert('Error', 'Failed to upload image')
        } finally {
          setUploadingImage(false)
        }
      }
    } catch (error) {
      console.error('Image picker error:', error)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting')
      return
    }

    if (loading) return

    setLoading(true)

    try {
      await api.createProduct({
        name: formData.name.trim(),
        description: formData.description.trim(),
        productType,
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
        stock: productType === 'DIGITAL' ? 999999 : parseInt(formData.stock),
        sku: formData.sku.trim() || null,
        categoryId: formData.categoryId,
        active: formData.active,
        featured: formData.featured,
        images,
        requiresShipping: productType === 'PHYSICAL',
      })

      Alert.alert('Success', 'Product created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === formData.categoryId)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Type Selector */}
        <Text style={styles.sectionTitle}>Product Type</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeOption, productType === 'PHYSICAL' && styles.typeOptionActive]}
            onPress={() => setProductType('PHYSICAL')}
          >
            <Ionicons
              name="cube-outline"
              size={24}
              color={productType === 'PHYSICAL' ? colors.success : colors.textMuted}
            />
            <Text style={[styles.typeOptionText, productType === 'PHYSICAL' && styles.typeOptionTextActive]}>
              Physical
            </Text>
            <Text style={styles.typeOptionDesc}>Shipped to customers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, productType === 'DIGITAL' && styles.typeOptionActiveDigital]}
            onPress={() => setProductType('DIGITAL')}
          >
            <Ionicons
              name="cloud-download-outline"
              size={24}
              color={productType === 'DIGITAL' ? colors.purple : colors.textMuted}
            />
            <Text style={[styles.typeOptionText, productType === 'DIGITAL' && styles.typeOptionTextActiveDigital]}>
              Digital
            </Text>
            <Text style={styles.typeOptionDesc}>Downloadable files</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Card style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => {
                setFormData({ ...formData, name: text })
                if (errors.name) setErrors({ ...errors, name: undefined })
              }}
              placeholder="Enter product name"
              placeholderTextColor={colors.textMuted}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              value={formData.description}
              onChangeText={(text) => {
                setFormData({ ...formData, description: text })
                if (errors.description) setErrors({ ...errors, description: undefined })
              }}
              placeholder="Enter product description"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>
        </Card>

        {/* Pricing */}
        <Text style={styles.sectionTitle}>Pricing</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Price *</Text>
              <View style={styles.currencyInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.currencyTextInput, errors.price && styles.inputError]}
                  value={formData.price}
                  onChangeText={(text) => {
                    setFormData({ ...formData, price: text })
                    if (errors.price) setErrors({ ...errors, price: undefined })
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>
            <View style={{ width: spacing.md }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Compare Price</Text>
              <View style={styles.currencyInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.currencyTextInput}
                  value={formData.comparePrice}
                  onChangeText={(text) => setFormData({ ...formData, comparePrice: text })}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Inventory */}
        <Text style={styles.sectionTitle}>Inventory</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            {productType === 'PHYSICAL' && (
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Stock Quantity *</Text>
                <TextInput
                  style={[styles.input, errors.stock && styles.inputError]}
                  value={formData.stock}
                  onChangeText={(text) => {
                    setFormData({ ...formData, stock: text })
                    if (errors.stock) setErrors({ ...errors, stock: undefined })
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
                {errors.stock && <Text style={styles.errorText}>{errors.stock}</Text>}
              </View>
            )}
            {productType === 'PHYSICAL' && <View style={{ width: spacing.md }} />}
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>SKU</Text>
              <TextInput
                style={styles.input}
                value={formData.sku}
                onChangeText={(text) => setFormData({ ...formData, sku: text })}
                placeholder="Enter SKU"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
            </View>
          </View>
          {productType === 'DIGITAL' && (
            <View style={styles.digitalNote}>
              <Ionicons name="information-circle-outline" size={16} color={colors.purple} />
              <Text style={styles.digitalNoteText}>Digital products have unlimited stock</Text>
            </View>
          )}
        </Card>

        {/* Category */}
        <Text style={styles.sectionTitle}>Category</Text>
        <Card style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={[styles.pickerButton, errors.categoryId && styles.inputError]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={selectedCategory ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                {selectedCategory ? selectedCategory.name : 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}
          </View>
          {loadingCategories && (
            <View style={styles.loadingCategories}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingCategoriesText}>Loading categories...</Text>
            </View>
          )}
          {!loadingCategories && categories.length === 0 && (
            <View style={styles.noCategoriesNote}>
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text style={styles.noCategoriesText}>
                No {productType.toLowerCase()} categories found. Create one first.
              </Text>
            </View>
          )}
        </Card>

        {/* Category Picker Modal */}
        {showCategoryPicker && (
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select Category</Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerModalScroll}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.pickerOption, formData.categoryId === category.id && styles.pickerOptionActive]}
                    onPress={() => {
                      setFormData({ ...formData, categoryId: category.id })
                      setErrors({ ...errors, categoryId: undefined })
                      setShowCategoryPicker(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.categoryId === category.id && styles.pickerOptionTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                    {formData.categoryId === category.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Images */}
        <Text style={styles.sectionTitle}>Product Images</Text>
        <Card style={styles.card}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.productImage} />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage} disabled={uploadingImage}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="add" size={32} color={colors.textMuted} />
                  <Text style={styles.addImageText}>Add Image</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
          <Text style={styles.imageHint}>Tap to add product images (recommended: square images)</Text>
        </Card>

        {/* Status Toggles */}
        <Text style={styles.sectionTitle}>Status</Text>
        <Card style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="eye-outline" size={20} color={colors.textMuted} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Active</Text>
                <Text style={styles.toggleDescription}>Product is visible in the shop</Text>
              </View>
            </View>
            <Switch
              value={formData.active}
              onValueChange={(value) => setFormData({ ...formData, active: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>
          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.md }]}>
            <View style={styles.toggleInfo}>
              <Ionicons name="star-outline" size={20} color={colors.textMuted} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Featured</Text>
                <Text style={styles.toggleDescription}>Show on homepage featured section</Text>
              </View>
            </View>
            <Switch
              value={formData.featured}
              onValueChange={(value) => setFormData({ ...formData, featured: value })}
              trackColor={{ false: colors.border, true: colors.warning }}
              thumbColor={colors.text}
            />
          </View>
        </Card>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title={loading ? 'Creating...' : 'Create Product'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || categories.length === 0}
            style={styles.submitButton}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  card: {
    padding: spacing.lg,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  typeOptionActive: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  typeOptionActiveDigital: {
    borderColor: colors.purple,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  typeOptionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  typeOptionTextActive: {
    color: colors.success,
  },
  typeOptionTextActiveDigital: {
    color: colors.purple,
  },
  typeOptionDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
  },
  currencySymbol: {
    paddingLeft: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  currencyTextInput: {
    flex: 1,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  digitalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  digitalNoteText: {
    fontSize: fontSize.sm,
    color: colors.purple,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  pickerButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  pickerButtonPlaceholder: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  loadingCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  loadingCategoriesText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  noCategoriesNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  noCategoriesText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  pickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '60%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  pickerModalScroll: {
    padding: spacing.lg,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  pickerOptionActive: {
    backgroundColor: colors.surfaceHover,
  },
  pickerOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  pickerOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  imagesScroll: {
    marginBottom: spacing.md,
  },
  imageContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  imageHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  toggleDescription: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  submitContainer: {
    marginTop: spacing.xl,
  },
  submitButton: {
    paddingVertical: spacing.lg,
  },
})
