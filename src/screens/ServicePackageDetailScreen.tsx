import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

const CATEGORIES = [
  { value: 'WEB_DEVELOPMENT', label: 'Web Development' },
  { value: 'IOS_APP', label: 'iOS App' },
  { value: 'ANDROID_APP', label: 'Android App' },
  { value: 'CROSS_PLATFORM_APP', label: 'Cross-Platform App' },
  { value: 'DESKTOP_APP', label: 'Desktop App' },
  { value: 'THREE_D_PRINTING', label: '3D Printing' },
]

const BILLING_TYPES = [
  { value: 'one_time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
]

interface ServicePackage {
  id: string
  name: string
  slug: string
  category: string
  price: string | null
  priceDisplay: string | null
  billingType: string
  priceNote: string | null
  shortDesc: string
  description: string | null
  features: string[]
  includes: string | null
  platforms: string | null
  techStack: string | null
  integrations: string | null
  deliverables: string | null
  supportIncluded: string | null
  revisionRounds: number | null
  isPopular: boolean
  isActive: boolean
  sortOrder: number
  badge: string | null
  estimatedDays: number | null
  estimatedWeeks: string | null
  _count?: { inquiries: number }
}

export default function ServicePackageDetailScreen({ navigation, route }: any) {
  const { id, isNew } = route.params || {}
  const [pkg, setPkg] = useState<ServicePackage | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showEditModal, setShowEditModal] = useState(isNew || false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '',
    category: 'WEB_DEVELOPMENT',
    price: '',
    priceDisplay: '',
    billingType: 'one_time',
    priceNote: '',
    shortDesc: '',
    description: '',
    features: '',
    includes: '',
    platforms: '',
    techStack: '',
    integrations: '',
    deliverables: '',
    supportIncluded: '',
    revisionRounds: '',
    isPopular: false,
    isActive: true,
    sortOrder: '0',
    badge: '',
    estimatedDays: '',
    estimatedWeeks: '',
  })

  useEffect(() => {
    if (!isNew && id) {
      fetchPackage()
    }
  }, [id, isNew])

  // Helper to parse features which might be string, array, or JSON string
  const parseFeatures = (features: any): string[] => {
    if (!features) return []
    if (Array.isArray(features)) return features
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features)
        return Array.isArray(parsed) ? parsed : []
      } catch (error) {
        // If it's not JSON, treat as newline-separated string
        console.log('Features string is not JSON, parsing as newline-separated:', error)
        return features.split('\n').filter((f: string) => f.trim())
      }
    }
    return []
  }

  const fetchPackage = async () => {
    try {
      const data = await api.getServicePackage(id)
      // Handle both wrapped and unwrapped response
      const packageData = data.package || (data.id ? data : null)
      if (packageData) {
        // Parse features properly
        const featuresArray = parseFeatures(packageData.features)
        const normalizedPackage = { ...packageData, features: featuresArray }
        setPkg(normalizedPackage)
        setForm({
          name: packageData.name || '',
          category: packageData.category || 'WEB_DEVELOPMENT',
          price: packageData.price?.toString() || '',
          priceDisplay: packageData.priceDisplay || '',
          billingType: packageData.billingType || 'one_time',
          priceNote: packageData.priceNote || '',
          shortDesc: packageData.shortDesc || '',
          description: packageData.description || '',
          features: featuresArray.join('\n'),
          includes: packageData.includes || '',
          platforms: packageData.platforms || '',
          techStack: packageData.techStack || '',
          integrations: packageData.integrations || '',
          deliverables: packageData.deliverables || '',
          supportIncluded: packageData.supportIncluded || '',
          revisionRounds: packageData.revisionRounds?.toString() || '',
          isPopular: packageData.isPopular || false,
          isActive: packageData.isActive !== false,
          sortOrder: packageData.sortOrder?.toString() || '0',
          badge: packageData.badge || '',
          estimatedDays: packageData.estimatedDays?.toString() || '',
          estimatedWeeks: packageData.estimatedWeeks || '',
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch package:', error)
      Alert.alert('Error', error.message || 'Failed to load package')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Package name is required')
      return
    }
    if (!form.shortDesc.trim()) {
      Alert.alert('Error', 'Short description is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: form.price ? parseFloat(form.price) : null,
        priceDisplay: form.priceDisplay || null,
        billingType: form.billingType,
        priceNote: form.priceNote || null,
        shortDesc: form.shortDesc.trim(),
        description: form.description || null,
        features: form.features ? form.features.split('\n').filter(f => f.trim()) : [],
        includes: form.includes || null,
        platforms: form.platforms || null,
        techStack: form.techStack || null,
        integrations: form.integrations || null,
        deliverables: form.deliverables || null,
        supportIncluded: form.supportIncluded || null,
        revisionRounds: form.revisionRounds ? parseInt(form.revisionRounds) : null,
        isPopular: form.isPopular,
        isActive: form.isActive,
        sortOrder: parseInt(form.sortOrder) || 0,
        badge: form.badge || null,
        estimatedDays: form.estimatedDays ? parseInt(form.estimatedDays) : null,
        estimatedWeeks: form.estimatedWeeks || null,
      }

      if (isNew) {
        const result = await api.createServicePackage(payload)
        const newPkg = result.package || result
        setPkg(newPkg)
        setShowEditModal(false)
        Alert.alert('Success', 'Package created successfully')
      } else {
        await api.updateServicePackage(id, payload)
        await fetchPackage()
        setShowEditModal(false)
        Alert.alert('Success', 'Package updated successfully')
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save package')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteServicePackage(id)
      Alert.alert('Success', 'Package deleted')
      navigation.goBack()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete package')
    }
    setShowDeleteConfirm(false)
  }

  const toggleActive = async () => {
    if (!pkg) return
    try {
      await api.updateServicePackage(id, { ...pkg, isActive: !pkg.isActive })
      setPkg({ ...pkg, isActive: !pkg.isActive })
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update package')
    }
  }

  const togglePopular = async () => {
    if (!pkg) return
    try {
      await api.updateServicePackage(id, { ...pkg, isPopular: !pkg.isPopular })
      setPkg({ ...pkg, isPopular: !pkg.isPopular })
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update package')
    }
  }

  const formatCurrency = (price: string | null) => {
    if (!price) return 'Custom Pricing'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(price))
  }

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find(c => c.value === cat)?.label || cat
  }

  const getBillingLabel = (billing: string) => {
    return BILLING_TYPES.find(b => b.value === billing)?.label || billing
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

  if (!pkg && !isNew) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Package</Text>
        </View>
        <View style={styles.loading}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.loadingText}>Package not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }}>
            <Text style={{ color: colors.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>{pkg?.name || 'New Package'}</Text>
          {pkg && (
            <View style={styles.headerBadges}>
              <Badge text={getCategoryLabel(pkg.category)} variant="primary" />
              {!pkg.isActive && <Badge text="Inactive" variant="error" />}
              {pkg.isPopular && <Badge text="Popular" variant="warning" />}
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {pkg && (
          <>
            {/* Pricing Card */}
            <Card style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceValue}>{pkg.priceDisplay || formatCurrency(pkg.price)}</Text>
                <Text style={styles.priceBilling}>{getBillingLabel(pkg.billingType)}</Text>
              </View>
              {pkg.priceNote && <Text style={styles.priceNote}>{pkg.priceNote}</Text>}
              {pkg.estimatedDays && (
                <View style={styles.estimateRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.estimateText}>~{pkg.estimatedDays} days</Text>
                </View>
              )}
            </Card>

            {/* Quick Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, pkg.isActive ? styles.actionBtnSuccess : styles.actionBtnError]}
                onPress={toggleActive}
              >
                <Ionicons name={pkg.isActive ? 'eye' : 'eye-off'} size={20} color={pkg.isActive ? colors.success : colors.error} />
                <Text style={[styles.actionText, { color: pkg.isActive ? colors.success : colors.error }]}>
                  {pkg.isActive ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, pkg.isPopular && styles.actionBtnWarning]}
                onPress={togglePopular}
              >
                <Ionicons name={pkg.isPopular ? 'star' : 'star-outline'} size={20} color={pkg.isPopular ? colors.warning : colors.textMuted} />
                <Text style={[styles.actionText, pkg.isPopular && { color: colors.warning }]}>
                  {pkg.isPopular ? 'Popular' : 'Set Popular'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDelete]}
                onPress={() => setShowDeleteConfirm(true)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{pkg._count?.inquiries || 0}</Text>
                <Text style={styles.statLabel}>Inquiries</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{pkg.sortOrder}</Text>
                <Text style={styles.statLabel}>Sort Order</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{pkg.revisionRounds || '-'}</Text>
                <Text style={styles.statLabel}>Revisions</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.sectionTitle}>Description</Text>
            <Card style={styles.card}>
              <Text style={styles.shortDesc}>{pkg.shortDesc}</Text>
              {pkg.description && (
                <Text style={styles.description}>{pkg.description}</Text>
              )}
            </Card>

            {/* Features */}
            {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Features</Text>
                <Card style={styles.card}>
                  {pkg.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </Card>
              </>
            )}

            {/* Technical Details */}
            {(pkg.platforms || pkg.techStack || pkg.integrations || pkg.deliverables) && (
              <>
                <Text style={styles.sectionTitle}>Technical Details</Text>
                <Card style={styles.card}>
                  {pkg.platforms && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Platforms</Text>
                      <Text style={styles.detailValue}>{pkg.platforms}</Text>
                    </View>
                  )}
                  {pkg.techStack && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tech Stack</Text>
                      <Text style={styles.detailValue}>{pkg.techStack}</Text>
                    </View>
                  )}
                  {pkg.integrations && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Integrations</Text>
                      <Text style={styles.detailValue}>{pkg.integrations}</Text>
                    </View>
                  )}
                  {pkg.deliverables && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Deliverables</Text>
                      <Text style={styles.detailValue}>{pkg.deliverables}</Text>
                    </View>
                  )}
                </Card>
              </>
            )}

            {/* Support */}
            {(pkg.supportIncluded || pkg.includes) && (
              <>
                <Text style={styles.sectionTitle}>Support & Includes</Text>
                <Card style={styles.card}>
                  {pkg.supportIncluded && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Support</Text>
                      <Text style={styles.detailValue}>{pkg.supportIncluded}</Text>
                    </View>
                  )}
                  {pkg.includes && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Includes</Text>
                      <Text style={styles.detailValue}>{pkg.includes}</Text>
                    </View>
                  )}
                </Card>
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isNew ? 'New Package' : 'Edit Package'}</Text>
                <TouchableOpacity onPress={() => {
                  if (isNew) navigation.goBack()
                  else setShowEditModal(false)
                }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Package name"
                  placeholderTextColor={colors.textMuted}
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                />

                <Text style={styles.inputLabel}>Category *</Text>
                <View style={styles.categoryPicker}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.categoryBtn, form.category === cat.value && styles.categoryBtnActive]}
                      onPress={() => setForm({ ...form, category: cat.value })}
                    >
                      <Text style={[styles.categoryText, form.category === cat.value && styles.categoryTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Short Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Brief description"
                  placeholderTextColor={colors.textMuted}
                  value={form.shortDesc}
                  onChangeText={(v) => setForm({ ...form, shortDesc: v })}
                  multiline
                />

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Price</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      value={form.price}
                      onChangeText={(v) => setForm({ ...form, price: v })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Display Price</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., $999+"
                      placeholderTextColor={colors.textMuted}
                      value={form.priceDisplay}
                      onChangeText={(v) => setForm({ ...form, priceDisplay: v })}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Billing Type</Text>
                <View style={styles.billingPicker}>
                  {BILLING_TYPES.map(b => (
                    <TouchableOpacity
                      key={b.value}
                      style={[styles.billingBtn, form.billingType === b.value && styles.billingBtnActive]}
                      onPress={() => setForm({ ...form, billingType: b.value })}
                    >
                      <Text style={[styles.billingText, form.billingType === b.value && styles.billingTextActive]}>
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Est. Days</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      value={form.estimatedDays}
                      onChangeText={(v) => setForm({ ...form, estimatedDays: v })}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Sort Order</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      value={form.sortOrder}
                      onChangeText={(v) => setForm({ ...form, sortOrder: v })}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Features (one per line)</Text>
                <TextInput
                  style={[styles.input, styles.textAreaLarge]}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  placeholderTextColor={colors.textMuted}
                  value={form.features}
                  onChangeText={(v) => setForm({ ...form, features: v })}
                  multiline
                />

                <Text style={styles.inputLabel}>Full Description</Text>
                <TextInput
                  style={[styles.input, styles.textAreaLarge]}
                  placeholder="Detailed description..."
                  placeholderTextColor={colors.textMuted}
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                  multiline
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Active</Text>
                  <Switch
                    value={form.isActive}
                    onValueChange={(v) => setForm({ ...form, isActive: v })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Popular</Text>
                  <Switch
                    value={form.isPopular}
                    onValueChange={(v) => setForm({ ...form, isPopular: v })}
                    trackColor={{ false: colors.border, true: colors.warning }}
                  />
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    if (isNew) navigation.goBack()
                    else setShowEditModal(false)
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title={isNew ? 'Create' : 'Save'}
                  onPress={handleSave}
                  loading={saving}
                  style={{ flex: 1, marginLeft: spacing.md }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation */}
      <Modal visible={showDeleteConfirm} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 250 }]}>
            <Text style={styles.modalTitle}>Delete Package?</Text>
            <Text style={styles.deleteWarning}>
              Are you sure you want to delete "{pkg?.name}"? This action cannot be undone.
            </Text>
            {pkg?._count?.inquiries ? (
              <Text style={styles.deleteError}>
                This package has {pkg._count.inquiries} inquiry(ies). Please reassign or delete them first.
              </Text>
            ) : null}
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowDeleteConfirm(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Delete"
                variant="danger"
                onPress={handleDelete}
                disabled={!!pkg?._count?.inquiries}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
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
    marginTop: spacing.md,
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
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
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
  priceCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  priceRow: {
    alignItems: 'center',
  },
  priceValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  priceBilling: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  priceNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  estimateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  actionBtnSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  actionBtnError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionBtnWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  actionBtnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  actionText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  shortDesc: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
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
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  // Modal
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
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  formScroll: {
    maxHeight: '70%',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    height: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  categoryBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  categoryTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  billingPicker: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  billingBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billingBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  billingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  billingTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  deleteWarning: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  deleteError: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.lg,
  },
})
