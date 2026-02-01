import React, { useEffect, useState, useCallback } from 'react'
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
  Modal,
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

interface Brand {
  id: string
  name: string
  slug: string
}

interface OptionType {
  id: string
  name: string
  values: string[]
}

interface VariantDraft {
  id: string // temp id for UI
  options: Record<string, string>
  sku: string
  price: string
  stock: string
}

interface ProductFormData {
  name: string
  description: string
  price: string
  comparePrice: string
  costPrice: string
  stock: string
  lowStockThreshold: string
  sku: string
  categoryId: string
  brandId: string
  tags: string
  weight: string
  dimensionLength: string
  dimensionWidth: string
  dimensionHeight: string
  active: boolean
  featured: boolean
  trackInventory: boolean
}

// Validation constants
const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_SKU_LENGTH = 50

// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i

export default function ProductCreateScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [, setLoadingBrands] = useState(true)
  const [productType, setProductType] = useState<'PHYSICAL' | 'DIGITAL'>('PHYSICAL')
  const [fulfillmentType, setFulfillmentType] = useState<'SELF_FULFILLED' | 'PRINTFUL'>('SELF_FULFILLED')
  const [images, setImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showBrandPicker, setShowBrandPicker] = useState(false)
  const [showImageSourcePicker, setShowImageSourcePicker] = useState(false)
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([])
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState<VariantDraft[]>([])
  const [showAddVariant, setShowAddVariant] = useState(false)
  const [newVariant, setNewVariant] = useState<VariantDraft>({
    id: '',
    options: {},
    sku: '',
    price: '',
    stock: '0',
  })

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    stock: '0',
    lowStockThreshold: '5',
    sku: '',
    categoryId: '',
    brandId: '',
    tags: '',
    weight: '',
    dimensionLength: '',
    dimensionWidth: '',
    dimensionHeight: '',
    active: true,
    featured: false,
    trackInventory: true,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData | 'images', string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof ProductFormData | 'images', boolean>>>({})

  const fetchOptionTypes = useCallback(async () => {
    try {
      const data = await api.getOptionTypes()
      setOptionTypes(data.optionTypes || [])
    } catch (err) {
      console.error('Failed to fetch option types:', err)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true)
    try {
      const data = await api.getCategories({ type: productType })
      setCategories(data.categories || [])
      // Reset category selection when product type changes
      setFormData((prev) => ({ ...prev, categoryId: '' }))
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    } finally {
      setLoadingCategories(false)
    }
  }, [productType])

  const fetchBrands = useCallback(async () => {
    setLoadingBrands(true)
    try {
      const data = await api.getBrands()
      setBrands(data.brands || [])
    } catch (err) {
      console.error('Failed to fetch brands:', err)
    } finally {
      setLoadingBrands(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchBrands()
    fetchOptionTypes()
  }, [fetchCategories, fetchBrands, fetchOptionTypes])

  // Validate a single field
  const validateField = (field: keyof ProductFormData | 'images', value: any): string | undefined => {
    switch (field) {
      case 'name':
        if (!value || !value.trim()) {
          return 'Product name is required'
        }
        if (value.length > MAX_NAME_LENGTH) {
          return `Name must be ${MAX_NAME_LENGTH} characters or less`
        }
        break
      case 'description':
        if (!value || !value.trim()) {
          return 'Description is required'
        }
        if (value.length > MAX_DESCRIPTION_LENGTH) {
          return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`
        }
        break
      case 'price':
        if (!value || !value.trim()) {
          return 'Price is required'
        }
        const price = parseFloat(value)
        if (isNaN(price)) {
          return 'Please enter a valid price'
        }
        if (price < 0) {
          return 'Price cannot be negative'
        }
        if (!/^\d+(\.\d{0,2})?$/.test(value.trim())) {
          return 'Price must have at most 2 decimal places'
        }
        break
      case 'comparePrice':
      case 'costPrice':
        if (value && value.trim()) {
          const amount = parseFloat(value)
          if (isNaN(amount)) {
            return 'Please enter a valid amount'
          }
          if (amount < 0) {
            return 'Amount cannot be negative'
          }
        }
        break
      case 'stock':
        if (productType === 'PHYSICAL' && formData.trackInventory) {
          if (!value || !value.trim()) {
            return 'Stock quantity is required'
          }
          const stock = parseInt(value)
          if (isNaN(stock)) {
            return 'Please enter a valid stock quantity'
          }
          if (stock < 0) {
            return 'Stock cannot be negative'
          }
        }
        break
      case 'lowStockThreshold':
        if (value && value.trim()) {
          const threshold = parseInt(value)
          if (isNaN(threshold)) {
            return 'Please enter a valid threshold'
          }
          if (threshold < 0) {
            return 'Threshold cannot be negative'
          }
        }
        break
      case 'sku':
        if (value && value.length > MAX_SKU_LENGTH) {
          return `SKU must be ${MAX_SKU_LENGTH} characters or less`
        }
        break
      case 'categoryId':
        if (!value) {
          return 'Please select a category'
        }
        break
      case 'weight':
        if (value && value.trim()) {
          const weight = parseFloat(value)
          if (isNaN(weight)) {
            return 'Please enter a valid weight'
          }
          if (weight < 0) {
            return 'Weight cannot be negative'
          }
        }
        break
    }
    return undefined
  }

  // Validate image URLs
  const validateImageUrl = (url: string): boolean => {
    // For local URIs (from image picker), we accept them
    if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('ph://')) {
      return true
    }
    // For remote URLs, validate format
    return URL_REGEX.test(url)
  }

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData | 'images', string>> = {}

    // Validate all fields
    const fields: (keyof ProductFormData)[] = ['name', 'description', 'price', 'comparePrice', 'costPrice', 'stock', 'sku', 'categoryId']
    fields.forEach(field => {
      const error = validateField(field, formData[field])
      if (error) {
        newErrors[field] = error
      }
    })

    // Validate images
    const invalidImages = images.filter(img => !validateImageUrl(img))
    if (invalidImages.length > 0) {
      newErrors.images = 'One or more image URLs are invalid'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Check if form is valid for button state (without setting errors)
  const isFormValid = (): boolean => {
    const fields: (keyof ProductFormData)[] = ['name', 'description', 'price', 'categoryId']
    if (productType === 'PHYSICAL' && formData.trackInventory) {
      fields.push('stock')
    }

    for (const field of fields) {
      if (validateField(field, formData[field])) {
        return false
      }
    }

    // Check images
    if (images.some(img => !validateImageUrl(img))) {
      return false
    }

    return categories.length > 0
  }

  // Handle field blur for inline validation
  const handleBlur = (field: keyof ProductFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field])
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    return status === 'granted'
  }

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    return status === 'granted'
  }

  const pickImageFromCamera = async () => {
    setShowImageSourcePicker(false)

    const hasPermission = await requestCameraPermission()
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please allow access to your camera')
      return
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true)
        try {
          const imageUri = result.assets[0].uri
          setImages((prev) => [...prev, imageUri])
        } catch {
          Alert.alert('Error', 'Failed to add image')
        } finally {
          setUploadingImage(false)
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
      Alert.alert('Error', 'Failed to open camera')
    }
  }

  const pickImageFromGallery = async () => {
    setShowImageSourcePicker(false)

    const hasPermission = await requestMediaLibraryPermission()
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please allow access to your photo library')
      return
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true)
        try {
          const imageUri = result.assets[0].uri
          setImages((prev) => [...prev, imageUri])
        } catch {
          Alert.alert('Error', 'Failed to add image')
        } finally {
          setUploadingImage(false)
        }
      }
    } catch (err) {
      console.error('Image picker error:', err)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const moveImage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= images.length) return

    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    setImages(newImages)
  }

  const setFeaturedImage = (index: number) => {
    if (index === 0) return // Already featured
    const newImages = [...images]
    const [featuredImage] = newImages.splice(index, 1)
    newImages.unshift(featuredImage)
    setImages(newImages)
  }

  // Variant functions
  const getVariantName = (options: Record<string, string>) => {
    return Object.values(options).filter(Boolean).join(' / ') || 'New Variant'
  }

  const addVariant = () => {
    if (Object.keys(newVariant.options).length === 0 && optionTypes.length > 0) {
      Alert.alert('Error', 'Please select at least one option')
      return
    }

    const variant: VariantDraft = {
      ...newVariant,
      id: Date.now().toString(),
      price: newVariant.price || formData.price,
    }
    setVariants([...variants, variant])
    setNewVariant({
      id: '',
      options: {},
      sku: '',
      price: '',
      stock: '0',
    })
    setShowAddVariant(false)
  }

  const removeVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id))
  }

  const handleSubmit = async (asDraft: boolean = false) => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting')
      return
    }

    if (loading || savingDraft) return

    if (asDraft) {
      setSavingDraft(true)
    } else {
      setLoading(true)
    }

    try {
      // Build dimensions string if provided
      let dimensions: string | null = null
      if (formData.dimensionLength || formData.dimensionWidth || formData.dimensionHeight) {
        dimensions = `${formData.dimensionLength || '0'} x ${formData.dimensionWidth || '0'} x ${formData.dimensionHeight || '0'}`
      }

      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      await api.createProduct({
        name: formData.name.trim(),
        description: formData.description.trim(),
        productType,
        fulfillmentType: productType === 'PHYSICAL' ? fulfillmentType : null,
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        stock: productType === 'DIGITAL' ? 999999 : (formData.trackInventory ? parseInt(formData.stock) : null),
        lowStockThreshold: formData.trackInventory && formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : null,
        trackInventory: productType === 'PHYSICAL' ? formData.trackInventory : false,
        sku: formData.sku.trim() || null,
        categoryId: formData.categoryId,
        brandId: formData.brandId || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions: dimensions,
        active: asDraft ? false : formData.active,
        featured: formData.featured,
        images,
        requiresShipping: productType === 'PHYSICAL',
      })

      Alert.alert('Success', asDraft ? 'Product saved as draft' : 'Product created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create product')
    } finally {
      setLoading(false)
      setSavingDraft(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === formData.categoryId)
  const selectedBrand = brands.find((b) => b.id === formData.brandId)

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
            <View style={styles.labelRow}>
              <Text style={styles.label}>Product Name</Text>
              <Text style={styles.requiredIndicator}>*</Text>
            </View>
            <TextInput
              style={[styles.input, touched.name && errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => {
                setFormData({ ...formData, name: text })
                if (touched.name) {
                  const error = validateField('name', text)
                  setErrors(prev => ({ ...prev, name: error }))
                }
              }}
              onBlur={() => handleBlur('name')}
              placeholder="Enter product name"
              placeholderTextColor={colors.textMuted}
              maxLength={MAX_NAME_LENGTH}
            />
            <View style={styles.fieldFooter}>
              {touched.name && errors.name ? (
                <Text style={styles.errorText}>{errors.name}</Text>
              ) : (
                <Text style={styles.charCount}>{formData.name.length}/{MAX_NAME_LENGTH}</Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.requiredIndicator}>*</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea, touched.description && errors.description && styles.inputError]}
              value={formData.description}
              onChangeText={(text) => {
                setFormData({ ...formData, description: text })
                if (touched.description) {
                  const error = validateField('description', text)
                  setErrors(prev => ({ ...prev, description: error }))
                }
              }}
              onBlur={() => handleBlur('description')}
              placeholder="Enter product description"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <View style={styles.fieldFooter}>
              {touched.description && errors.description ? (
                <Text style={styles.errorText}>{errors.description}</Text>
              ) : (
                <Text style={styles.charCount}>{formData.description.length}/{MAX_DESCRIPTION_LENGTH}</Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SKU</Text>
            <TextInput
              style={[styles.input, touched.sku && errors.sku && styles.inputError]}
              value={formData.sku}
              onChangeText={(text) => {
                setFormData({ ...formData, sku: text })
                if (touched.sku) {
                  const error = validateField('sku', text)
                  setErrors(prev => ({ ...prev, sku: error }))
                }
              }}
              onBlur={() => handleBlur('sku')}
              placeholder="Enter SKU"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              maxLength={MAX_SKU_LENGTH}
            />
            {touched.sku && errors.sku && <Text style={styles.errorText}>{errors.sku}</Text>}
          </View>
        </Card>

        {/* Pricing */}
        <Text style={styles.sectionTitle}>Pricing</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Price</Text>
                <Text style={styles.requiredIndicator}>*</Text>
              </View>
              <View style={[styles.currencyInput, touched.price && errors.price && styles.inputError]}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.currencyTextInput}
                  value={formData.price}
                  onChangeText={(text) => {
                    setFormData({ ...formData, price: text })
                    if (touched.price) {
                      const error = validateField('price', text)
                      setErrors(prev => ({ ...prev, price: error }))
                    }
                  }}
                  onBlur={() => handleBlur('price')}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              {touched.price && errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>
            <View style={{ width: spacing.md }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Compare At Price</Text>
              <View style={[styles.currencyInput, touched.comparePrice && errors.comparePrice && styles.inputError]}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.currencyTextInput}
                  value={formData.comparePrice}
                  onChangeText={(text) => {
                    setFormData({ ...formData, comparePrice: text })
                    if (touched.comparePrice) {
                      const error = validateField('comparePrice', text)
                      setErrors(prev => ({ ...prev, comparePrice: error }))
                    }
                  }}
                  onBlur={() => handleBlur('comparePrice')}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              {touched.comparePrice && errors.comparePrice && <Text style={styles.errorText}>{errors.comparePrice}</Text>}
            </View>
          </View>

          <View style={[styles.inputGroup, { marginTop: spacing.sm }]}>
            <Text style={styles.label}>Cost Per Item</Text>
            <View style={[styles.currencyInput, touched.costPrice && errors.costPrice && styles.inputError]}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.currencyTextInput}
                value={formData.costPrice}
                onChangeText={(text) => {
                  setFormData({ ...formData, costPrice: text })
                  if (touched.costPrice) {
                    const error = validateField('costPrice', text)
                    setErrors(prev => ({ ...prev, costPrice: error }))
                  }
                }}
                onBlur={() => handleBlur('costPrice')}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={styles.helperText}>Used to calculate profit margin</Text>
            {touched.costPrice && errors.costPrice && <Text style={styles.errorText}>{errors.costPrice}</Text>}
          </View>
        </Card>

        {/* Inventory */}
        <Text style={styles.sectionTitle}>Inventory</Text>
        <Card style={styles.card}>
          {productType === 'PHYSICAL' && (
            <>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Ionicons name="layers-outline" size={20} color={colors.textMuted} />
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleLabel}>Track Inventory</Text>
                    <Text style={styles.toggleDescription}>Monitor stock levels for this product</Text>
                  </View>
                </View>
                <Switch
                  value={formData.trackInventory}
                  onValueChange={(value) => setFormData({ ...formData, trackInventory: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.text}
                />
              </View>

              {formData.trackInventory && (
                <View style={[styles.row, { marginTop: spacing.lg }]}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Stock Quantity</Text>
                      <Text style={styles.requiredIndicator}>*</Text>
                    </View>
                    <TextInput
                      style={[styles.input, touched.stock && errors.stock && styles.inputError]}
                      value={formData.stock}
                      onChangeText={(text) => {
                        setFormData({ ...formData, stock: text })
                        if (touched.stock) {
                          const error = validateField('stock', text)
                          setErrors(prev => ({ ...prev, stock: error }))
                        }
                      }}
                      onBlur={() => handleBlur('stock')}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                    {touched.stock && errors.stock && <Text style={styles.errorText}>{errors.stock}</Text>}
                  </View>
                  <View style={{ width: spacing.md }} />
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Low Stock Alert</Text>
                    <TextInput
                      style={[styles.input, touched.lowStockThreshold && errors.lowStockThreshold && styles.inputError]}
                      value={formData.lowStockThreshold}
                      onChangeText={(text) => {
                        setFormData({ ...formData, lowStockThreshold: text })
                        if (touched.lowStockThreshold) {
                          const error = validateField('lowStockThreshold', text)
                          setErrors(prev => ({ ...prev, lowStockThreshold: error }))
                        }
                      }}
                      onBlur={() => handleBlur('lowStockThreshold')}
                      placeholder="5"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                    <Text style={styles.helperText}>Alert when below this</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {productType === 'DIGITAL' && (
            <View style={styles.digitalNote}>
              <Ionicons name="information-circle-outline" size={16} color={colors.purple} />
              <Text style={styles.digitalNoteText}>Digital products have unlimited stock</Text>
            </View>
          )}
        </Card>

        {/* Organization */}
        <Text style={styles.sectionTitle}>Organization</Text>
        <Card style={styles.card}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.requiredIndicator}>*</Text>
            </View>
            <TouchableOpacity
              style={[styles.pickerButton, touched.categoryId && errors.categoryId && styles.inputError]}
              onPress={() => {
                setTouched(prev => ({ ...prev, categoryId: true }))
                setShowCategoryPicker(true)
              }}
            >
              <Text style={selectedCategory ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                {selectedCategory ? selectedCategory.name : 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {touched.categoryId && errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowBrandPicker(true)}
            >
              <Text style={selectedBrand ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                {selectedBrand ? selectedBrand.name : 'Select a brand (optional)'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tags</Text>
            <TextInput
              style={styles.input}
              value={formData.tags}
              onChangeText={(text) => setFormData({ ...formData, tags: text })}
              placeholder="Enter tags, separated by commas"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.helperText}>e.g., new, bestseller, limited-edition</Text>
          </View>
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

        {/* Brand Picker Modal */}
        {showBrandPicker && (
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select Brand</Text>
                <TouchableOpacity onPress={() => setShowBrandPicker(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerModalScroll}>
                <TouchableOpacity
                  style={[styles.pickerOption, !formData.brandId && styles.pickerOptionActive]}
                  onPress={() => {
                    setFormData({ ...formData, brandId: '' })
                    setShowBrandPicker(false)
                  }}
                >
                  <Text style={[styles.pickerOptionText, !formData.brandId && styles.pickerOptionTextActive]}>
                    No Brand
                  </Text>
                  {!formData.brandId && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
                {brands.map((brand) => (
                  <TouchableOpacity
                    key={brand.id}
                    style={[styles.pickerOption, formData.brandId === brand.id && styles.pickerOptionActive]}
                    onPress={() => {
                      setFormData({ ...formData, brandId: brand.id })
                      setShowBrandPicker(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.brandId === brand.id && styles.pickerOptionTextActive,
                      ]}
                    >
                      {brand.name}
                    </Text>
                    {formData.brandId === brand.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Media */}
        <Text style={styles.sectionTitle}>Product Images</Text>
        <Card style={styles.card}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.productImage} />
                {index === 0 && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>Featured</Text>
                  </View>
                )}
                <View style={styles.imageActions}>
                  {index > 0 && (
                    <TouchableOpacity
                      style={styles.imageActionButton}
                      onPress={() => moveImage(index, 'left')}
                    >
                      <Ionicons name="arrow-back" size={16} color={colors.text} />
                    </TouchableOpacity>
                  )}
                  {index < images.length - 1 && (
                    <TouchableOpacity
                      style={styles.imageActionButton}
                      onPress={() => moveImage(index, 'right')}
                    >
                      <Ionicons name="arrow-forward" size={16} color={colors.text} />
                    </TouchableOpacity>
                  )}
                  {index !== 0 && (
                    <TouchableOpacity
                      style={styles.imageActionButton}
                      onPress={() => setFeaturedImage(index)}
                    >
                      <Ionicons name="star-outline" size={16} color={colors.warning} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={() => setShowImageSourcePicker(true)}
              disabled={uploadingImage}
            >
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
          <Text style={styles.imageHint}>First image is the featured image. Tap to add from camera or gallery.</Text>
        </Card>

        {/* Image Source Picker Modal */}
        <Modal
          visible={showImageSourcePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageSourcePicker(false)}
        >
          <TouchableOpacity
            style={styles.imageSourceOverlay}
            activeOpacity={1}
            onPress={() => setShowImageSourcePicker(false)}
          >
            <View style={styles.imageSourceContent}>
              <Text style={styles.imageSourceTitle}>Add Image</Text>
              <TouchableOpacity style={styles.imageSourceOption} onPress={pickImageFromCamera}>
                <Ionicons name="camera-outline" size={24} color={colors.text} />
                <Text style={styles.imageSourceOptionText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageSourceOption} onPress={pickImageFromGallery}>
                <Ionicons name="images-outline" size={24} color={colors.text} />
                <Text style={styles.imageSourceOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageSourceOption, styles.imageSourceCancel]}
                onPress={() => setShowImageSourcePicker(false)}
              >
                <Text style={styles.imageSourceCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Fulfillment - Only for Physical Products */}
        {productType === 'PHYSICAL' && (
          <>
            <Text style={styles.sectionTitle}>Fulfillment</Text>
            <Card style={styles.card}>
              <View style={styles.fulfillmentSelector}>
                <TouchableOpacity
                  style={[styles.fulfillmentOption, fulfillmentType === 'SELF_FULFILLED' && styles.fulfillmentOptionActive]}
                  onPress={() => setFulfillmentType('SELF_FULFILLED')}
                >
                  <Ionicons
                    name="cube-outline"
                    size={20}
                    color={fulfillmentType === 'SELF_FULFILLED' ? colors.primary : colors.textMuted}
                  />
                  <View style={styles.fulfillmentOptionContent}>
                    <Text style={[styles.fulfillmentOptionText, fulfillmentType === 'SELF_FULFILLED' && styles.fulfillmentOptionTextActive]}>
                      Self-Fulfilled
                    </Text>
                    <Text style={styles.fulfillmentOptionDesc}>You handle shipping</Text>
                  </View>
                  {fulfillmentType === 'SELF_FULFILLED' && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fulfillmentOption, fulfillmentType === 'PRINTFUL' && styles.fulfillmentOptionActivePrintful]}
                  onPress={() => setFulfillmentType('PRINTFUL')}
                >
                  <Ionicons
                    name="shirt-outline"
                    size={20}
                    color={fulfillmentType === 'PRINTFUL' ? colors.warning : colors.textMuted}
                  />
                  <View style={styles.fulfillmentOptionContent}>
                    <Text style={[styles.fulfillmentOptionText, fulfillmentType === 'PRINTFUL' && styles.fulfillmentOptionTextActivePrintful]}>
                      Printful
                    </Text>
                    <Text style={styles.fulfillmentOptionDesc}>Print-on-demand</Text>
                  </View>
                  {fulfillmentType === 'PRINTFUL' && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.warning} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={[styles.row, { marginTop: spacing.lg }]}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Weight (lbs)</Text>
                  <TextInput
                    style={[styles.input, touched.weight && errors.weight && styles.inputError]}
                    value={formData.weight}
                    onChangeText={(text) => setFormData({ ...formData, weight: text })}
                    onBlur={() => handleBlur('weight')}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={[styles.label, { marginTop: spacing.md, marginBottom: spacing.sm }]}>Dimensions (inches)</Text>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    value={formData.dimensionLength}
                    onChangeText={(text) => setFormData({ ...formData, dimensionLength: text })}
                    placeholder="L"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Text style={styles.dimensionSeparator}>x</Text>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    value={formData.dimensionWidth}
                    onChangeText={(text) => setFormData({ ...formData, dimensionWidth: text })}
                    placeholder="W"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Text style={styles.dimensionSeparator}>x</Text>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    value={formData.dimensionHeight}
                    onChangeText={(text) => setFormData({ ...formData, dimensionHeight: text })}
                    placeholder="H"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </Card>
          </>
        )}

        {/* Variants Section - Only for Physical Products */}
        {productType === 'PHYSICAL' && (
          <>
            <Text style={styles.sectionTitle}>Variants</Text>
            <Card style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Ionicons name="layers-outline" size={20} color={colors.textMuted} />
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleLabel}>Has Variants</Text>
                    <Text style={styles.toggleDescription}>Add different options like size or color</Text>
                  </View>
                </View>
                <Switch
                  value={hasVariants}
                  onValueChange={(value) => {
                    setHasVariants(value)
                    if (!value) {
                      setVariants([])
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.text}
                />
              </View>

              {hasVariants && (
                <View style={styles.variantsContainer}>
                  {optionTypes.length === 0 ? (
                    <View style={styles.noOptionTypesWarning}>
                      <Ionicons name="warning-outline" size={20} color={colors.warning} />
                      <Text style={styles.noOptionTypesText}>
                        No option types defined. Create option types in the web admin first.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {variants.length > 0 && (
                        <View style={styles.variantsList}>
                          {variants.map((variant) => (
                            <View key={variant.id} style={styles.variantItem}>
                              <View style={styles.variantItemInfo}>
                                <Text style={styles.variantItemName}>{getVariantName(variant.options)}</Text>
                                <View style={styles.variantItemMeta}>
                                  <Text style={styles.variantItemMetaText}>
                                    ${variant.price || formData.price} | Stock: {variant.stock}
                                    {variant.sku ? ` | SKU: ${variant.sku}` : ''}
                                  </Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                style={styles.variantItemRemove}
                                onPress={() => removeVariant(variant.id)}
                              >
                                <Ionicons name="trash-outline" size={18} color={colors.error} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}

                      {showAddVariant ? (
                        <View style={styles.addVariantForm}>
                          <Text style={styles.addVariantFormTitle}>Add Variant</Text>

                          {/* Option Selectors */}
                          {optionTypes.map((optionType) => (
                            <View key={optionType.id} style={styles.optionSelector}>
                              <Text style={styles.optionSelectorLabel}>{optionType.name}</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.optionValues}>
                                  {optionType.values.map((value) => (
                                    <TouchableOpacity
                                      key={value}
                                      style={[
                                        styles.optionValue,
                                        newVariant.options[optionType.name] === value && styles.optionValueActive,
                                      ]}
                                      onPress={() =>
                                        setNewVariant({
                                          ...newVariant,
                                          options: { ...newVariant.options, [optionType.name]: value },
                                        })
                                      }
                                    >
                                      <Text
                                        style={[
                                          styles.optionValueText,
                                          newVariant.options[optionType.name] === value && styles.optionValueTextActive,
                                        ]}
                                      >
                                        {value}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </ScrollView>
                            </View>
                          ))}

                          {/* Variant Price */}
                          <View style={styles.variantInputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                              <Text style={styles.label}>Price (optional)</Text>
                              <View style={styles.currencyInput}>
                                <Text style={styles.currencySymbol}>$</Text>
                                <TextInput
                                  style={styles.currencyTextInput}
                                  value={newVariant.price}
                                  onChangeText={(text) => setNewVariant({ ...newVariant, price: text })}
                                  placeholder={formData.price || '0.00'}
                                  placeholderTextColor={colors.textMuted}
                                  keyboardType="decimal-pad"
                                />
                              </View>
                            </View>
                            <View style={{ width: spacing.md }} />
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                              <Text style={styles.label}>Stock</Text>
                              <TextInput
                                style={styles.input}
                                value={newVariant.stock}
                                onChangeText={(text) => setNewVariant({ ...newVariant, stock: text })}
                                placeholder="0"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="number-pad"
                              />
                            </View>
                          </View>

                          {/* Variant SKU */}
                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>SKU (optional)</Text>
                            <TextInput
                              style={styles.input}
                              value={newVariant.sku}
                              onChangeText={(text) => setNewVariant({ ...newVariant, sku: text })}
                              placeholder="e.g., PROD-001-SM-BLK"
                              placeholderTextColor={colors.textMuted}
                              autoCapitalize="characters"
                            />
                          </View>

                          <View style={styles.addVariantFormButtons}>
                            <TouchableOpacity
                              style={styles.cancelVariantButton}
                              onPress={() => {
                                setShowAddVariant(false)
                                setNewVariant({
                                  id: '',
                                  options: {},
                                  sku: '',
                                  price: '',
                                  stock: '0',
                                })
                              }}
                            >
                              <Text style={styles.cancelVariantButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveVariantButton} onPress={addVariant}>
                              <Text style={styles.saveVariantButtonText}>Add Variant</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addVariantButton} onPress={() => setShowAddVariant(true)}>
                          <Ionicons name="add" size={20} color={colors.primary} />
                          <Text style={styles.addVariantButtonText}>Add Variant</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              )}
            </Card>
          </>
        )}

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

        {/* Submit Buttons */}
        <View style={styles.submitContainer}>
          <View style={styles.submitRow}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
            />
            <Button
              title={savingDraft ? 'Saving...' : 'Save Draft'}
              variant="secondary"
              onPress={() => handleSubmit(true)}
              loading={savingDraft}
              disabled={loading || savingDraft}
              style={styles.draftButton}
            />
          </View>
          <Button
            title={loading ? 'Publishing...' : 'Save and Publish'}
            onPress={() => handleSubmit(false)}
            loading={loading}
            disabled={loading || savingDraft || !isFormValid()}
            style={styles.submitButton}
          />
          {!isFormValid() && (
            <Text style={styles.submitHint}>Please fill in all required fields to continue</Text>
          )}
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
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requiredIndicator: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginLeft: 4,
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
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  fieldFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: 'auto',
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
  featuredBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  imageActions: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  imageActionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    borderRadius: borderRadius.sm,
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
  imageSourceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  imageSourceContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  imageSourceTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  imageSourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  imageSourceOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  imageSourceCancel: {
    justifyContent: 'center',
    borderBottomWidth: 0,
    marginTop: spacing.md,
  },
  imageSourceCancelText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
  },
  fulfillmentSelector: {
    gap: spacing.sm,
  },
  fulfillmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  fulfillmentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  fulfillmentOptionActivePrintful: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  fulfillmentOptionContent: {
    flex: 1,
  },
  fulfillmentOptionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  fulfillmentOptionTextActive: {
    color: colors.primary,
  },
  fulfillmentOptionTextActivePrintful: {
    color: colors.warning,
  },
  fulfillmentOptionDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  dimensionSeparator: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    alignSelf: 'center',
    marginHorizontal: spacing.sm,
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
  submitRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  draftButton: {
    flex: 1,
  },
  submitButton: {
    paddingVertical: spacing.lg,
  },
  submitHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Variants styles
  variantsContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noOptionTypesWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  noOptionTypesText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  variantsList: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  variantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variantItemInfo: {
    flex: 1,
  },
  variantItemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  variantItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  variantItemMetaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  variantItemRemove: {
    padding: spacing.sm,
  },
  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  addVariantButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  addVariantForm: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addVariantFormTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  optionSelector: {
    marginBottom: spacing.lg,
  },
  optionSelectorLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  optionValues: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionValue: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionValueActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionValueText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  optionValueTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  variantInputRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  addVariantFormButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelVariantButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cancelVariantButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  saveVariantButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveVariantButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
})
