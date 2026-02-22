import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from './Button'
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

interface VariantEditorProps {
  visible: boolean
  onClose: () => void
  onSave: (data: VariantFormData) => Promise<void>
  variant?: ProductVariant | null
  optionTypes: OptionType[]
  productPrice: number
  loading?: boolean
}

interface VariantFormData {
  options: Record<string, string>
  sku: string
  price: number
  stock: number
  isActive: boolean
}

export function VariantEditor({
  visible,
  onClose,
  onSave,
  variant,
  optionTypes,
  productPrice,
  loading = false,
}: VariantEditorProps) {
  const [formData, setFormData] = useState<VariantFormData>({
    options: {},
    sku: '',
    price: productPrice,
    stock: 0,
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [showOptionPicker, setShowOptionPicker] = useState<string | null>(null)

  const isEditing = !!variant

  useEffect(() => {
    if (variant) {
      setFormData({
        options: variant.options || {},
        sku: variant.sku || '',
        price: Number(variant.price),
        stock: variant.stock,
        isActive: variant.isActive,
      })
    } else {
      setFormData({
        options: {},
        sku: '',
        price: productPrice,
        stock: 0,
        isActive: true,
      })
    }
  }, [variant, productPrice, visible])

  const handleSave = async () => {
    if (Object.keys(formData.options).length === 0 && optionTypes.length > 0) {
      return
    }

    setSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving variant:', error)
    } finally {
      setSaving(false)
    }
  }

  const variantName = Object.values(formData.options).filter(Boolean).join(' / ') || 'New Variant'

  const handleOptionSelect = (optionName: string, value: string) => {
    setFormData({
      ...formData,
      options: { ...formData.options, [optionName]: value },
    })
    setShowOptionPicker(null)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{isEditing ? 'Edit Variant' : 'Add Variant'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Variant Name Preview */}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Variant Name</Text>
              <Text style={styles.previewValue}>{variantName}</Text>
            </View>

            {/* Option Selection */}
            {optionTypes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Options</Text>
                {optionTypes.map((optionType) => (
                  <View key={optionType.id} style={styles.optionRow}>
                    <Text style={styles.optionLabel}>{optionType.name}</Text>
                    <TouchableOpacity
                      style={styles.optionSelector}
                      onPress={() => setShowOptionPicker(optionType.name)}
                    >
                      <Text
                        style={[
                          styles.optionValue,
                          !formData.options[optionType.name] && styles.optionPlaceholder,
                        ]}
                      >
                        {formData.options[optionType.name] || `Select ${optionType.name}`}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {optionTypes.length === 0 && (
              <View style={styles.warningCard}>
                <Ionicons name="warning-outline" size={20} color={colors.warning} />
                <Text style={styles.warningText}>
                  No option types defined. Create option types in the web admin first.
                </Text>
              </View>
            )}

            {/* SKU */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Inventory</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SKU (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.sku}
                  onChangeText={(text) => setFormData({ ...formData, sku: text })}
                  placeholder="e.g., PROD-001-SM-BLK"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Price and Stock */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Price</Text>
                <View style={styles.currencyInput}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.currencyTextInput}
                    value={formData.price.toString()}
                    onChangeText={(text) =>
                      setFormData({ ...formData, price: parseFloat(text) || 0 })
                    }
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={{ width: spacing.md }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Stock</Text>
                <TextInput
                  style={styles.input}
                  value={formData.stock.toString()}
                  onChangeText={(text) =>
                    setFormData({ ...formData, stock: parseInt(text) || 0 })
                  }
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Active Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="eye-outline" size={20} color={colors.textMuted} />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleLabel}>Active</Text>
                  <Text style={styles.toggleDescription}>Variant is available for purchase</Text>
                </View>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.text}
              />
            </View>

            <View style={{ height: spacing.xxl }} />
          </ScrollView>

          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button
              title={isEditing ? 'Save Changes' : 'Add Variant'}
              onPress={handleSave}
              loading={saving || loading}
              disabled={optionTypes.length > 0 && Object.keys(formData.options).length === 0}
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </View>

        {/* Option Picker Modal */}
        {showOptionPicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select {showOptionPicker}</Text>
                <TouchableOpacity onPress={() => setShowOptionPicker(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerContent}>
                {optionTypes
                  .find((o) => o.name === showOptionPicker)
                  ?.values.map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.pickerOption,
                        formData.options[showOptionPicker] === value && styles.pickerOptionActive,
                      ]}
                      onPress={() => handleOptionSelect(showOptionPicker, value)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.options[showOptionPicker] === value &&
                            styles.pickerOptionTextActive,
                        ]}
                      >
                        {value}
                      </Text>
                      {formData.options[showOptionPicker] === value && (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    padding: spacing.xl,
  },
  previewCard: {
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  previewLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  previewValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  optionRow: {
    marginBottom: spacing.md,
  },
  optionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  optionSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  optionValue: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  optionPlaceholder: {
    color: colors.textMuted,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
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
  row: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '50%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  pickerContent: {
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
})
