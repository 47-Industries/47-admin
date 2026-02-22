import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'
import { EmptyState } from '../../components/EmptyState'

interface OAuthApp {
  id: string
  name: string
  clientId: string
  clientSecret: string
  redirectUris: string[]
  scopes: string[]
  description: string | null
  websiteUrl: string | null
  active: boolean
  createdAt: string
  _count: {
    accessTokens: number
  }
}

type ViewMode = 'list' | 'detail' | 'create'

export function OAuthApplicationsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [apps, setApps] = useState<OAuthApp[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedApp, setSelectedApp] = useState<OAuthApp | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Create form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formRedirectUris, setFormRedirectUris] = useState<string[]>([''])
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchApps = useCallback(async () => {
    try {
      const data = await api.getOAuthApplications()
      setApps(data.applications || [])
    } catch (error) {
      console.error('Failed to fetch OAuth applications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchApps()
  }, [fetchApps])

  const onRefresh = () => {
    setRefreshing(true)
    fetchApps()
  }

  const truncateClientId = (clientId: string) => {
    if (clientId.length <= 16) return clientId
    return clientId.substring(0, 8) + '...' + clientId.substring(clientId.length - 8)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text)
      Alert.alert('Copied', `${label} copied to clipboard`)
    } catch {
      Alert.alert('Error', 'Failed to copy to clipboard')
    }
  }

  const openDetail = (app: OAuthApp) => {
    setSelectedApp(app)
    setShowSecret(false)
    setViewMode('detail')
  }

  const openCreateModal = () => {
    setFormName('')
    setFormDescription('')
    setFormRedirectUris([''])
    setFormError('')
    setShowCreateModal(true)
  }

  const addRedirectUri = () => {
    setFormRedirectUris(prev => [...prev, ''])
  }

  const updateRedirectUri = (index: number, value: string) => {
    setFormRedirectUris(prev => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const removeRedirectUri = (index: number) => {
    if (formRedirectUris.length <= 1) return
    setFormRedirectUris(prev => prev.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    setFormError('')

    if (!formName.trim()) {
      setFormError('Application name is required')
      return
    }

    const uris = formRedirectUris.map(u => u.trim()).filter(u => u.length > 0)
    if (uris.length === 0) {
      setFormError('At least one redirect URI is required')
      return
    }

    setFormSaving(true)
    try {
      await api.createOAuthApplication({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        redirectUris: uris,
      })
      setShowCreateModal(false)
      fetchApps()
      Alert.alert('Created', 'OAuth application created successfully')
    } catch (error: any) {
      setFormError(error.message || 'Failed to create application')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = (app: OAuthApp) => {
    Alert.alert(
      'Delete Application',
      `Are you sure you want to delete "${app.name}"? This will revoke all access tokens and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteOAuthApplication(app.id)
              setViewMode('list')
              setSelectedApp(null)
              fetchApps()
              Alert.alert('Deleted', 'Application deleted successfully')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete application')
            }
          },
        },
      ]
    )
  }

  const handleRegenerateSecret = (app: OAuthApp) => {
    Alert.alert(
      'Regenerate Secret',
      `Are you sure you want to regenerate the client secret for "${app.name}"? The current secret will stop working immediately. Any services using it will need to be updated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await api.regenerateOAuthSecret(app.id)
              setSelectedApp(data.application)
              setShowSecret(true)
              fetchApps()
              Alert.alert('Regenerated', 'Client secret has been regenerated. Make sure to copy the new secret.')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to regenerate secret')
            }
          },
        },
      ]
    )
  }

  const handleToggleActive = async (app: OAuthApp) => {
    try {
      const data = await api.updateOAuthApplication(app.id, { active: !app.active })
      setSelectedApp(data.application)
      fetchApps()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update application')
    }
  }

  // --- Render: App List Item ---
  const renderAppItem = ({ item }: { item: OAuthApp }) => (
    <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.7}>
      <Card style={styles.appCard}>
        <View style={styles.appHeader}>
          <View style={styles.appIcon}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.appInfo}>
            <View style={styles.appNameRow}>
              <Text style={styles.appName}>{item.name}</Text>
              <Badge
                text={item.active ? 'Active' : 'Inactive'}
                variant={item.active ? 'success' : 'error'}
              />
            </View>
            <Text style={styles.appClientId}>
              {truncateClientId(item.clientId)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        <View style={styles.appFooter}>
          <Text style={styles.appDate}>Created {formatDate(item.createdAt)}</Text>
          <Text style={styles.appTokens}>{item._count.accessTokens} active tokens</Text>
        </View>
      </Card>
    </TouchableOpacity>
  )

  // --- Render: Detail View ---
  const renderDetailView = () => {
    if (!selectedApp) return null

    return (
      <View style={styles.container}>
        {/* Detail Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity
            onPress={() => {
              setViewMode('list')
              setSelectedApp(null)
            }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Application Details</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={styles.detailScroll}
          contentContainerStyle={styles.detailContent}
        >
          {/* Name and Description */}
          <Card style={styles.detailCard}>
            <View style={styles.detailNameRow}>
              <Text style={styles.detailAppName}>{selectedApp.name}</Text>
              <Badge
                text={selectedApp.active ? 'Active' : 'Inactive'}
                variant={selectedApp.active ? 'success' : 'error'}
              />
            </View>
            {selectedApp.description ? (
              <Text style={styles.detailDescription}>{selectedApp.description}</Text>
            ) : (
              <Text style={styles.detailDescriptionEmpty}>No description</Text>
            )}
            <Text style={styles.detailDate}>Created {formatDate(selectedApp.createdAt)}</Text>
          </Card>

          {/* Client ID */}
          <Text style={styles.sectionLabel}>Client ID</Text>
          <Card style={styles.credentialCard}>
            <View style={styles.credentialRow}>
              <Text style={styles.credentialValue} numberOfLines={1} ellipsizeMode="middle">
                {selectedApp.clientId}
              </Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(selectedApp.clientId, 'Client ID')}
                style={styles.copyBtn}
              >
                <Ionicons name="copy-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Client Secret */}
          <Text style={styles.sectionLabel}>Client Secret</Text>
          <Card style={styles.credentialCard}>
            <View style={styles.credentialRow}>
              <Text style={styles.credentialValue} numberOfLines={1}>
                {showSecret ? selectedApp.clientSecret : '••••••••••••••••••••••••'}
              </Text>
              <View style={styles.secretActions}>
                <TouchableOpacity
                  onPress={() => setShowSecret(!showSecret)}
                  style={styles.secretBtn}
                >
                  <Ionicons
                    name={showSecret ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => copyToClipboard(selectedApp.clientSecret, 'Client Secret')}
                  style={styles.copyBtn}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* Redirect URIs */}
          <Text style={styles.sectionLabel}>Redirect URIs</Text>
          <Card style={styles.uriCard}>
            {selectedApp.redirectUris.map((uri, i) => (
              <View
                key={i}
                style={[
                  styles.uriItem,
                  i < selectedApp.redirectUris.length - 1 && styles.uriItemBorder,
                ]}
              >
                <Ionicons name="link-outline" size={16} color={colors.textMuted} />
                <Text style={styles.uriText} numberOfLines={2}>
                  {uri}
                </Text>
              </View>
            ))}
          </Card>

          {/* Token Count */}
          <Text style={styles.sectionLabel}>Statistics</Text>
          <Card style={styles.statsCard}>
            <View style={styles.statRow}>
              <Ionicons name="ticket-outline" size={18} color={colors.textMuted} />
              <Text style={styles.statText}>
                {selectedApp._count.accessTokens} active access token{selectedApp._count.accessTokens !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>

          {/* Actions */}
          <Text style={styles.sectionLabel}>Actions</Text>
          <Card style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleToggleActive(selectedApp)}
            >
              <Ionicons
                name={selectedApp.active ? 'pause-circle-outline' : 'play-circle-outline'}
                size={22}
                color={selectedApp.active ? colors.warning : colors.success}
              />
              <Text style={styles.actionText}>
                {selectedApp.active ? 'Disable Application' : 'Enable Application'}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleRegenerateSecret(selectedApp)}
            >
              <Ionicons name="refresh-outline" size={22} color={colors.warning} />
              <Text style={styles.actionText}>Regenerate Client Secret</Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleDelete(selectedApp)}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Delete Application</Text>
            </TouchableOpacity>
          </Card>

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </View>
    )
  }

  // --- Render: Create Modal ---
  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCreateModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New Application</Text>
          <TouchableOpacity onPress={handleCreate} disabled={formSaving}>
            <Text style={[styles.modalSave, formSaving && styles.modalSaveDisabled]}>
              {formSaving ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          {formError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Name */}
          <Text style={styles.fieldLabel}>Application Name *</Text>
          <TextInput
            style={styles.textInput}
            value={formName}
            onChangeText={setFormName}
            placeholder="e.g. LeadChopper"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          {/* Description */}
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="Brief description of this application"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Redirect URIs */}
          <View style={styles.uriHeaderRow}>
            <Text style={styles.fieldLabel}>Redirect URIs *</Text>
            <TouchableOpacity onPress={addRedirectUri} style={styles.addUriBtn}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addUriBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldHint}>
            Allowed callback URLs after authentication
          </Text>

          {formRedirectUris.map((uri, index) => (
            <View key={index} style={styles.uriInputRow}>
              <TextInput
                style={[styles.textInput, styles.uriInput]}
                value={uri}
                onChangeText={(text) => updateRedirectUri(index, text)}
                placeholder="https://example.com/callback"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
              {formRedirectUris.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeRedirectUri(index)}
                  style={styles.removeUriBtn}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <View style={{ height: spacing.xxxl * 2 }} />
        </ScrollView>
      </View>
    </Modal>
  )

  // --- Render: List View ---
  if (viewMode === 'detail') {
    return renderDetailView()
  }

  if (loading && apps.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>OAuth Applications</Text>
        </View>
      )}

      {hideHeader && (
        <View style={styles.inlineHeader}>
          <Text style={styles.inlineTitle}>OAuth Applications</Text>
        </View>
      )}

      <FlatList
        data={apps}
        renderItem={renderAppItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listCount}>
              {apps.length} application{apps.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={openCreateModal} style={styles.createBtn}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.createBtnText}>New App</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="key-outline" title="No OAuth Applications" />
        }
      />

      {renderCreateModal()}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  inlineHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  inlineTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  listCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  createBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: '#fff',
  },

  // App card
  appCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  appInfo: {
    flex: 1,
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  appName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  appClientId: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  appFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  appDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  appTokens: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Detail view
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  detailTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  detailCard: {
    marginBottom: spacing.lg,
  },
  detailNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailAppName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  detailDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  detailDescriptionEmpty: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  detailDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Section labels
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Credentials
  credentialCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credentialValue: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: spacing.sm,
  },
  secretActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secretBtn: {
    padding: spacing.sm,
  },
  copyBtn: {
    padding: spacing.sm,
  },

  // URI list
  uriCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  uriItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  uriItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  uriText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Stats
  statsCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },

  // Actions
  actionsCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 22 + spacing.md,
  },
  actionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  emptyCreateBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  emptyCreateBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: '#fff',
  },

  // Create Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalCancel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  modalSave: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },

  // Form
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  fieldHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  uriHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  addUriBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addUriBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  uriInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  uriInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: fontSize.sm,
  },
  removeUriBtn: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    flex: 1,
  },
})
