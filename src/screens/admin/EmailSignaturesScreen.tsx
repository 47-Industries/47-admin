import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { WebView } from 'react-native-webview'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface Signature {
  id: string
  name: string
  content: string
  isDefault: boolean
  forAddress: string | null
  createdAt: string
}

const EMAIL_ADDRESSES = [
  { value: '', label: 'All email addresses' },
  { value: 'kyle@47industries.com', label: 'kyle@47industries.com' },
  { value: 'support@47industries.com', label: 'support@47industries.com' },
  { value: 'info@47industries.com', label: 'info@47industries.com' },
  { value: 'contact@47industries.com', label: 'contact@47industries.com' },
  { value: 'press@47industries.com', label: 'press@47industries.com' },
  { value: 'support@motorevapp.com', label: 'support@motorevapp.com' },
  { value: 'press@motorevapp.com', label: 'press@motorevapp.com' },
]

export default function EmailSignaturesScreen({ navigation }: { navigation: any }) {
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingSignature, setEditingSignature] = useState<Signature | null>(null)
  const [formName, setFormName] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formForAddress, setFormForAddress] = useState('')
  const [showAddressPicker, setShowAddressPicker] = useState(false)

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false)
  const [previewSignature, setPreviewSignature] = useState<Signature | null>(null)
  const [previewMode, setPreviewMode] = useState<'html' | 'plain'>('html')

  const { height: windowHeight } = useWindowDimensions()

  const fetchSignatures = useCallback(async () => {
    try {
      const data = await api.getEmailSignatures()
      setSignatures(data.signatures || [])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load signatures')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchSignatures()
  }, [fetchSignatures])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchSignatures()
  }, [fetchSignatures])

  const resetForm = () => {
    setFormName('')
    setFormContent('')
    setFormIsDefault(false)
    setFormForAddress('')
    setEditingSignature(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowFormModal(true)
  }

  const openEditModal = (signature: Signature) => {
    setEditingSignature(signature)
    setFormName(signature.name)
    setFormContent(signature.content)
    setFormIsDefault(signature.isDefault)
    setFormForAddress(signature.forAddress || '')
    setShowFormModal(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation', 'Signature name is required')
      return
    }
    if (!formContent.trim()) {
      Alert.alert('Validation', 'Signature content is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        content: formContent.trim(),
        isDefault: formIsDefault,
        forAddress: formForAddress || null,
      }

      if (editingSignature) {
        await api.updateEmailSignature(editingSignature.id, payload)
      } else {
        await api.createEmailSignature(payload)
      }

      setShowFormModal(false)
      resetForm()
      fetchSignatures()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save signature')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (signature: Signature) => {
    Alert.alert(
      'Delete Signature',
      `Are you sure you want to delete "${signature.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteEmailSignature(signature.id)
              fetchSignatures()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete signature')
            }
          },
        },
      ]
    )
  }

  const handleSetDefault = async (signature: Signature) => {
    if (signature.isDefault) return
    try {
      await api.setDefaultSignature(signature.id)
      fetchSignatures()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set default signature')
    }
  }

  const handleDuplicate = async (signature: Signature) => {
    try {
      await api.createEmailSignature({
        name: `${signature.name} (Copy)`,
        content: signature.content,
        isDefault: false,
        forAddress: signature.forAddress,
      })
      fetchSignatures()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to duplicate signature')
    }
  }

  const openPreview = (signature: Signature) => {
    setPreviewSignature(signature)
    setPreviewMode('html')
    setShowPreview(true)
  }

  const getPlainText = (html: string) => {
    // Strip HTML tags and decode entities
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
  }

  const getPreviewHtml = (content: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              color: #000;
              background: #fff;
              padding: 16px;
              margin: 0;
              line-height: 1.5;
            }
            a { color: #3b82f6; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderSignatureItem = ({ item }: { item: Signature }) => (
    <Card style={styles.signatureCard}>
      <View style={styles.signatureHeader}>
        <View style={styles.signatureHeaderLeft}>
          <Text style={styles.signatureName}>{item.name}</Text>
          {item.isDefault && (
            <Badge text="Default" variant="primary" />
          )}
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => {
            Alert.alert(
              item.name,
              'Choose an action',
              [
                { text: 'Edit', onPress: () => openEditModal(item) },
                { text: 'Preview', onPress: () => openPreview(item) },
                ...(!item.isDefault ? [{ text: 'Set as Default', onPress: () => handleSetDefault(item) }] : []),
                { text: 'Duplicate', onPress: () => handleDuplicate(item) },
                { text: 'Delete', style: 'destructive' as const, onPress: () => handleDelete(item) },
                { text: 'Cancel', style: 'cancel' as const },
              ]
            )
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {item.forAddress ? (
        <View style={styles.addressRow}>
          <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
          <Text style={styles.addressText}>{item.forAddress}</Text>
        </View>
      ) : (
        <View style={styles.addressRow}>
          <Ionicons name="globe-outline" size={14} color={colors.textMuted} />
          <Text style={styles.addressText}>All email addresses</Text>
        </View>
      )}

      <Text style={styles.signaturePreview} numberOfLines={3}>
        {item.content.replace(/<[^>]*>/g, '').trim() || 'No preview available'}
      </Text>

      <View style={styles.signatureFooter}>
        <Text style={styles.dateText}>Created {formatDate(item.createdAt)}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => openPreview(item)}
          >
            <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No Signatures</Text>
      <Text style={styles.emptyDescription}>
        Create an email signature to automatically append to your outgoing messages.
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={openCreateModal}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>Create Signature</Text>
      </TouchableOpacity>
    </View>
  )

  const selectedAddressLabel = EMAIL_ADDRESSES.find(a => a.value === formForAddress)?.label || 'All email addresses'

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Email Signatures</Text>
          <Text style={styles.headerSubtitle}>
            {signatures.length} signature{signatures.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading signatures...</Text>
        </View>
      ) : (
        <FlatList
          data={signatures}
          keyExtractor={(item) => item.id}
          renderItem={renderSignatureItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={showFormModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowFormModal(false)
          resetForm()
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowFormModal(false)
                resetForm()
              }}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingSignature ? 'Edit Signature' : 'New Signature'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !formName.trim() || !formContent.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.modalSave,
                    (!formName.trim() || !formContent.trim()) && styles.modalSaveDisabled,
                  ]}
                >
                  {editingSignature ? 'Update' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Signature Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Signature Name</Text>
              <TextInput
                style={styles.formInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g., Work Signature"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Assign to Email Address */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Assign to Email Address</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowAddressPicker(true)}
              >
                <Text style={styles.pickerButtonText}>{selectedAddressLabel}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Signature Content */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Signature Content</Text>
              <Text style={styles.formHint}>HTML is supported for rich formatting</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formContent}
                onChangeText={setFormContent}
                placeholder="Enter your signature content..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Set as Default */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleLabel}>Set as Default</Text>
                <Text style={styles.toggleDescription}>
                  This signature will be used by default for{' '}
                  {formForAddress ? formForAddress : 'all email addresses'}
                </Text>
              </View>
              <Switch
                value={formIsDefault}
                onValueChange={setFormIsDefault}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Live Preview Section */}
            {formContent.trim() ? (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Preview</Text>
                <View style={styles.previewContainer}>
                  <WebView
                    source={{ html: getPreviewHtml(formContent) }}
                    style={styles.inlinePreview}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      {/* Address Picker Modal */}
      <Modal
        visible={showAddressPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddressPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddressPicker(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Email Address</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalBody}>
            {EMAIL_ADDRESSES.map((addr) => (
              <TouchableOpacity
                key={addr.value}
                style={[
                  styles.addressOption,
                  formForAddress === addr.value && styles.addressOptionActive,
                ]}
                onPress={() => {
                  setFormForAddress(addr.value)
                  setShowAddressPicker(false)
                }}
              >
                <Ionicons
                  name={addr.value ? 'mail-outline' : 'globe-outline'}
                  size={20}
                  color={formForAddress === addr.value ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.addressOptionText,
                    formForAddress === addr.value && styles.addressOptionTextActive,
                  ]}
                >
                  {addr.label}
                </Text>
                {formForAddress === addr.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Signature Preview</Text>
            <View style={{ width: 60 }} />
          </View>
          {previewSignature && (
            <View style={styles.previewBody}>
              <View style={styles.previewMeta}>
                <Text style={styles.previewMetaName}>{previewSignature.name}</Text>
                {previewSignature.isDefault && (
                  <Badge text="Default" variant="primary" />
                )}
              </View>
              {previewSignature.forAddress && (
                <Text style={styles.previewMetaAddress}>
                  For: {previewSignature.forAddress}
                </Text>
              )}
              {/* HTML/Plain text toggle */}
              <View style={styles.previewToggle}>
                <TouchableOpacity
                  style={[styles.previewToggleButton, previewMode === 'html' && styles.previewToggleButtonActive]}
                  onPress={() => setPreviewMode('html')}
                >
                  <Text style={[styles.previewToggleText, previewMode === 'html' && styles.previewToggleTextActive]}>HTML</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewToggleButton, previewMode === 'plain' && styles.previewToggleButtonActive]}
                  onPress={() => setPreviewMode('plain')}
                >
                  <Text style={[styles.previewToggleText, previewMode === 'plain' && styles.previewToggleTextActive]}>Plain Text</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewWebViewContainer}>
                {previewMode === 'html' ? (
                  <WebView
                    source={{ html: getPreviewHtml(previewSignature.content) }}
                    style={styles.previewWebView}
                    showsVerticalScrollIndicator={false}
                  />
                ) : (
                  <ScrollView style={styles.plainTextScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.plainText}>{getPlainText(previewSignature.content)}</Text>
                  </ScrollView>
                )}
              </View>
            </View>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  signatureCard: {
    marginBottom: spacing.md,
  },
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  signatureHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  signatureName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  moreButton: {
    padding: spacing.xs,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  signaturePreview: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  signatureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    padding: spacing.xs,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalSave: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  modalSaveDisabled: {
    opacity: 0.4,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  // Form
  formGroup: {
    marginBottom: spacing.xl,
  },
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  formHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  formTextArea: {
    minHeight: 150,
    paddingTop: spacing.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pickerButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  toggleLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  // Inline preview in form
  previewContainer: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    height: 160,
  },
  inlinePreview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Address picker options
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addressOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  addressOptionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  addressOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  // Preview modal
  previewBody: {
    flex: 1,
    padding: spacing.lg,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  previewMetaName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  previewMetaAddress: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  previewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  previewWebViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewWebView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewToggle: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewToggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  previewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  previewToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  previewToggleTextActive: {
    color: '#fff',
  },
  plainTextScroll: {
    flex: 1,
    backgroundColor: '#fff',
    padding: spacing.lg,
  },
  plainText: {
    fontSize: fontSize.md,
    lineHeight: 22,
    color: '#000',
  },
})
