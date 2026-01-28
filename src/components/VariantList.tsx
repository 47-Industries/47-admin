import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from './Card'
import { Badge } from './Badge'
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

interface VariantListProps {
  variants: ProductVariant[]
  onEdit: (variant: ProductVariant) => void
  onDelete: (variantId: string) => void
  formatCurrency?: (amount: number) => string
}

export function VariantList({ variants, onEdit, onDelete, formatCurrency }: VariantListProps) {
  const formatPrice = formatCurrency || ((amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  )

  if (variants.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="layers-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No Variants</Text>
        <Text style={styles.emptyText}>
          Add variants like different sizes or colors for this product.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {variants.map((variant) => (
        <Card key={variant.id} style={styles.variantCard}>
          <View style={styles.variantHeader}>
            <View style={styles.variantInfo}>
              <Text style={styles.variantName}>{variant.name}</Text>
              {variant.options && Object.keys(variant.options).length > 0 && (
                <Text style={styles.variantOptions}>
                  {Object.entries(variant.options).map(([key, value]) => `${key}: ${value}`).join(' | ')}
                </Text>
              )}
            </View>
            <Badge
              text={variant.isActive ? 'Active' : 'Inactive'}
              variant={variant.isActive ? 'success' : 'error'}
            />
          </View>

          <View style={styles.variantStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>SKU</Text>
              <Text style={styles.statValue}>{variant.sku || '-'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Price</Text>
              <Text style={styles.statValue}>{formatPrice(Number(variant.price))}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Stock</Text>
              <Text style={[
                styles.statValue,
                { color: variant.stock > 0 ? colors.success : colors.error }
              ]}>
                {variant.stock}
              </Text>
            </View>
          </View>

          <View style={styles.variantActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(variant)}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => onDelete(variant.id)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  variantCard: {
    padding: spacing.lg,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  variantInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  variantName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  variantOptions: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  variantStats: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  variantActions: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    gap: spacing.xs,
  },
  deleteButton: {
    backgroundColor: colors.errorBg,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
})
