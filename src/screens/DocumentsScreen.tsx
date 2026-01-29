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
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

// Try to import expo-document-picker - if not installed, upload will show an alert
let DocumentPicker: any = null
try {
  DocumentPicker = require('expo-document-picker')
} catch {
  // expo-document-picker not installed
}

const CATEGORIES = [
  { value: null, label: 'All' },
  { value: 'TAX', label: 'Tax' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'HR', label: 'HR' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'OTHER', label: 'Other' },
]

type DocumentSource = 'all' | 'company' | 'contracts' | 'partner-contracts' | 'team' | 'requests'

const SOURCE_FILTERS: { value: DocumentSource; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: colors.textMuted },
  { value: 'company', label: 'Company', color: colors.primary },
  { value: 'contracts', label: 'Contracts', color: '#8b5cf6' },
  { value: 'partner-contracts', label: 'Partner', color: colors.success },
  { value: 'team', label: 'Team', color: '#f59e0b' },
  { value: 'requests', label: 'Requests', color: '#06b6d4' },
]

function getSourceColor(source: string | undefined): string {
  switch (source) {
    case 'company': return colors.primary
    case 'contracts': return '#8b5cf6'
    case 'partner-contracts': return colors.success
    case 'team': return '#f59e0b'
    case 'requests': return '#06b6d4'
    default: return colors.textMuted
  }
}

function getSourceLabel(source: string | undefined): string {
  switch (source) {
    case 'company': return 'Company'
    case 'contracts': return 'Contract'
    case 'partner-contracts': return 'Partner'
    case 'team': return 'Team'
    case 'requests': return 'Request'
    default: return ''
  }
}

function getContractStatusVariant(status: string | undefined): 'default' | 'success' | 'warning' | 'error' | 'primary' {
  switch (status) {
    case 'SIGNED': return 'success'
    case 'SENT': return 'warning'
    case 'DRAFT': return 'default'
    case 'ACTIVE': return 'success'
    default: return 'default'
  }
}

const FOLDER_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
]

function getFileIcon(fileType: string | null): { name: string; color: string } {
  if (!fileType) return { name: 'document-outline', color: colors.textMuted }
  if (fileType.includes('pdf')) return { name: 'document-text-outline', color: '#ef4444' }
  if (fileType.includes('image')) return { name: 'image-outline', color: '#3b82f6' }
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return { name: 'grid-outline', color: '#10b981' }
  if (fileType.includes('word') || fileType.includes('document') || fileType.includes('msword')) return { name: 'document-outline', color: '#3b82f6' }
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return { name: 'easel-outline', color: '#f59e0b' }
  if (fileType.includes('zip') || fileType.includes('archive') || fileType.includes('compressed')) return { name: 'archive-outline', color: '#8b5cf6' }
  if (fileType.includes('video')) return { name: 'videocam-outline', color: '#ec4899' }
  if (fileType.includes('audio')) return { name: 'musical-notes-outline', color: '#f97316' }
  if (fileType.includes('text')) return { name: 'document-text-outline', color: colors.textSecondary }
  return { name: 'document-outline', color: colors.textMuted }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getCategoryBadgeVariant(category: string | null): 'default' | 'success' | 'warning' | 'error' | 'primary' {
  switch (category) {
    case 'TAX': return 'warning'
    case 'LEGAL': return 'error'
    case 'CONTRACT': return 'primary'
    case 'HR': return 'success'
    case 'FINANCE': return 'warning'
    case 'OPERATIONS': return 'default'
    default: return 'default'
  }
}

interface Folder {
  id: string
  name: string
  description: string | null
  parentId: string | null
  color: string | null
  _count?: { documents: number }
  children?: Folder[]
}

interface Document {
  id: string
  name: string
  description: string | null
  fileName: string
  fileSize: number
  fileType: string | null
  fileUrl: string
  category: string | null
  tags: string[]
  year: number | null
  folderId: string | null
  visibility: string
  createdAt: string
  folder?: { id: string; name: string; color: string | null }
  downloadUrl?: string
  // Multi-source fields
  source?: string
  status?: string
  clientName?: string
  partnerName?: string
  teamMemberName?: string
  contractValue?: number
  documentType?: string
}

interface SourceCounts {
  all: number
  company: number
  contracts: number
  'partner-contracts': number
  team: number
  requests: number
}

export function DocumentsScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [allFoldersFlat, setAllFoldersFlat] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Root' },
  ])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<DocumentSource>('all')
  const [sourceCounts, setSourceCounts] = useState<SourceCounts>({
    all: 0,
    company: 0,
    contracts: 0,
    'partner-contracts': 0,
    team: 0,
    requests: 0,
  })

  // Modals
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [folderModalVisible, setFolderModalVisible] = useState(false)

  // Upload form state
  const [uploadFile, setUploadFile] = useState<any>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadCategory, setUploadCategory] = useState<string | null>(null)
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Create folder form state
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderDescription, setNewFolderDescription] = useState('')
  const [newFolderColor, setNewFolderColor] = useState<string>(FOLDER_COLORS[0])
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Edit document state
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchDocuments = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const params: any = {
        page: pageNum,
        limit: 20,
        source: sourceFilter,
      }
      if (currentFolderId) params.folderId = currentFolderId
      else params.folderId = 'root'
      if (search) params.search = search
      if (categoryFilter) params.category = categoryFilter

      const data = await api.getDocuments(params)
      const newDocs = data.documents || []

      if (refresh || pageNum === 1) {
        setDocuments(newDocs)
      } else {
        setDocuments(prev => [...prev, ...newDocs])
      }

      // Update source counts if provided
      if (data.counts) {
        setSourceCounts(data.counts)
      }

      setHasMore(newDocs.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentFolderId, search, categoryFilter, sourceFilter])

  const fetchFolders = useCallback(async () => {
    try {
      // Get flat folders for dropdowns
      const flatData = await api.getDocumentFolders(true)
      setAllFoldersFlat(flatData.folders || [])

      // Filter to get subfolders of current folder
      const allFolders = flatData.folders || []
      const subfolders = allFolders.filter(
        (f: Folder) => f.parentId === currentFolderId
      )
      setFolders(subfolders)
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    }
  }, [currentFolderId])

  useEffect(() => {
    setLoading(true)
    fetchDocuments(1, true)
    fetchFolders()
  }, [currentFolderId, search, categoryFilter, sourceFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchDocuments(1, true)
    fetchFolders()
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchDocuments(page + 1)
    }
  }

  const navigateToFolder = (folder: Folder) => {
    setCurrentFolderId(folder.id)
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }])
  }

  const navigateToBreadcrumb = (index: number) => {
    const target = folderPath[index]
    setCurrentFolderId(target.id)
    setFolderPath(prev => prev.slice(0, index + 1))
  }

  const openDocumentDetail = async (doc: Document) => {
    setSelectedDocument(doc)
    setDetailModalVisible(true)
    setLoadingDetail(true)
    try {
      const detail = await api.getDocument(doc.id)
      setSelectedDocument(detail)
    } catch (error) {
      console.error('Failed to fetch document detail:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDownload = () => {
    if (selectedDocument?.downloadUrl) {
      Linking.openURL(selectedDocument.downloadUrl)
    } else if (selectedDocument?.fileUrl) {
      Linking.openURL(selectedDocument.fileUrl)
    }
  }

  const handleDeleteDocument = () => {
    if (!selectedDocument) return
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${selectedDocument.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDocument(selectedDocument.id)
              setDetailModalVisible(false)
              setSelectedDocument(null)
              fetchDocuments(1, true)
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete document')
            }
          },
        },
      ]
    )
  }

  const openEditModal = () => {
    if (!selectedDocument) return
    setEditName(selectedDocument.name)
    setEditDescription(selectedDocument.description || '')
    setEditCategory(selectedDocument.category)
    setDetailModalVisible(false)
    setEditModalVisible(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedDocument) return
    setSaving(true)
    try {
      await api.updateDocument(selectedDocument.id, {
        name: editName,
        description: editDescription || null,
        category: editCategory,
      })
      setEditModalVisible(false)
      fetchDocuments(1, true)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update document')
    } finally {
      setSaving(false)
    }
  }

  const handlePickFile = async () => {
    if (!DocumentPicker) {
      Alert.alert(
        'Not Available',
        'expo-document-picker is not installed. Run: npx expo install expo-document-picker'
      )
      return
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0]
        setUploadFile(file)
        setUploadName(file.name || '')
        setUploadFolderId(currentFolderId)
        setUploadModalVisible(true)
      }
    } catch (error) {
      console.error('File picker error:', error)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', {
        uri: uploadFile.uri,
        name: uploadFile.name || 'file',
        type: uploadFile.mimeType || 'application/octet-stream',
      } as any)
      if (uploadName) formData.append('name', uploadName)
      if (uploadDescription) formData.append('description', uploadDescription)
      if (uploadCategory) formData.append('category', uploadCategory)
      if (uploadFolderId) formData.append('folderId', uploadFolderId)

      await api.uploadDocument(formData)

      setUploadModalVisible(false)
      resetUploadForm()
      fetchDocuments(1, true)
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const resetUploadForm = () => {
    setUploadFile(null)
    setUploadName('')
    setUploadDescription('')
    setUploadCategory(null)
    setUploadFolderId(null)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Folder name is required')
      return
    }
    setCreatingFolder(true)
    try {
      await api.createDocumentFolder({
        name: newFolderName.trim(),
        description: newFolderDescription || undefined,
        parentId: newFolderParentId || currentFolderId || undefined,
        color: newFolderColor,
      })
      setFolderModalVisible(false)
      resetFolderForm()
      fetchFolders()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  const resetFolderForm = () => {
    setNewFolderName('')
    setNewFolderDescription('')
    setNewFolderColor(FOLDER_COLORS[0])
    setNewFolderParentId(null)
  }

  const handleDeleteFolder = (folder: Folder) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? Documents inside will be moved to the root level.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDocumentFolder(folder.id)
              fetchFolders()
              fetchDocuments(1, true)
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete folder')
            }
          },
        },
      ]
    )
  }

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity
      style={styles.folderCard}
      onPress={() => navigateToFolder(item)}
      onLongPress={() => handleDeleteFolder(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.folderIconContainer, { backgroundColor: `${item.color || FOLDER_COLORS[0]}20` }]}>
        <Ionicons name="folder" size={28} color={item.color || FOLDER_COLORS[0]} />
      </View>
      <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.folderCount}>
        {item._count?.documents || 0} {item._count?.documents === 1 ? 'file' : 'files'}
      </Text>
    </TouchableOpacity>
  )

  const renderDocumentItem = ({ item }: { item: Document }) => {
    const icon = getFileIcon(item.fileType)
    const sourceColor = getSourceColor(item.source)

    // Get subtitle based on source
    let subtitle: string | null = null
    if (item.source === 'contracts' && item.clientName) {
      subtitle = item.clientName
    } else if (item.source === 'partner-contracts' && item.partnerName) {
      subtitle = item.partnerName
    } else if (item.source === 'team' && item.teamMemberName) {
      subtitle = item.teamMemberName
    }

    return (
      <TouchableOpacity onPress={() => openDocumentDetail(item)} activeOpacity={0.7}>
        <Card style={styles.documentCard}>
          <View style={styles.documentContent}>
            <View style={[styles.fileIconContainer, { backgroundColor: `${icon.color}15` }]}>
              <Ionicons name={icon.name as any} size={24} color={icon.color} />
              {/* Source indicator dot */}
              {item.source && item.source !== 'company' && (
                <View style={[styles.sourceDot, { backgroundColor: sourceColor }]} />
              )}
            </View>
            <View style={styles.documentInfo}>
              <View style={styles.documentNameRow}>
                <Text style={styles.documentName} numberOfLines={1}>{item.name}</Text>
              </View>
              {subtitle && (
                <Text style={styles.documentSubtitle} numberOfLines={1}>{subtitle}</Text>
              )}
              <View style={styles.documentMeta}>
                <Text style={styles.documentSize}>{formatFileSize(item.fileSize)}</Text>
                <Text style={styles.documentDot}>  </Text>
                <Text style={styles.documentDate}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={styles.documentBadgeRow}>
                {/* Status badge for contracts */}
                {(item.source === 'contracts' || item.source === 'partner-contracts') && item.status && (
                  <Badge text={item.status} variant={getContractStatusVariant(item.status)} />
                )}
                {/* Category badge */}
                {item.category && (
                  <Badge text={item.category} variant={getCategoryBadgeVariant(item.category)} />
                )}
                {/* Document type badge for team docs */}
                {item.source === 'team' && item.documentType && (
                  <Badge text={item.documentType} variant="default" />
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const ListHeader = () => (
    <View>
      {/* Folders Grid */}
      {folders.length > 0 && (
        <View style={styles.foldersSection}>
          <Text style={styles.sectionLabel}>Folders</Text>
          <FlatList
            data={folders}
            renderItem={renderFolderItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foldersRow}
          />
        </View>
      )}

      {/* Documents label */}
      {documents.length > 0 && (
        <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Documents</Text>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Documents</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => {
                setNewFolderParentId(currentFolderId)
                setFolderModalVisible(true)
              }}
            >
              <Ionicons name="folder-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handlePickFile}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {hideHeader && (
        <View style={styles.inlineHeader}>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => {
                setNewFolderParentId(currentFolderId)
                setFolderModalVisible(true)
              }}
            >
              <Ionicons name="folder-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handlePickFile}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Breadcrumb */}
      {folderPath.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.breadcrumbContainer}
          contentContainerStyle={styles.breadcrumbContent}
        >
          {folderPath.map((crumb, index) => (
            <View key={crumb.id || 'root'} style={styles.breadcrumbItem}>
              {index > 0 && (
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.breadcrumbSep} />
              )}
              <TouchableOpacity onPress={() => navigateToBreadcrumb(index)}>
                <Text
                  style={[
                    styles.breadcrumbText,
                    index === folderPath.length - 1 && styles.breadcrumbTextActive,
                  ]}
                >
                  {crumb.name}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents..."
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

      {/* Source Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sourceFiltersScroll}
        contentContainerStyle={styles.filtersContainer}
      >
        {SOURCE_FILTERS.map(src => {
          const count = sourceCounts[src.value] || 0
          const isActive = sourceFilter === src.value
          return (
            <TouchableOpacity
              key={src.value}
              style={[
                styles.sourceFilterChip,
                isActive && { backgroundColor: src.color, borderColor: src.color },
              ]}
              onPress={() => setSourceFilter(src.value)}
            >
              {!isActive && src.value !== 'all' && (
                <View style={[styles.sourceColorDot, { backgroundColor: src.color }]} />
              )}
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {src.label}
              </Text>
              {count > 0 && (
                <View style={[styles.sourceCountBadge, isActive && styles.sourceCountBadgeActive]}>
                  <Text style={[styles.sourceCountText, isActive && styles.sourceCountTextActive]}>
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContainer}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.label}
            style={[
              styles.filterChip,
              categoryFilter === cat.value && styles.filterChipActive,
            ]}
            onPress={() => setCategoryFilter(cat.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                categoryFilter === cat.value && styles.filterChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Documents List */}
      <FlatList
        data={documents}
        renderItem={renderDocumentItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {search || categoryFilter ? 'No documents match your filters' : 'No documents in this folder'}
              </Text>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )
        }
      />

      {/* Document Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Document Details</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={openEditModal} style={styles.modalActionBtn}>
                <Ionicons name="create-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteDocument} style={styles.modalActionBtn}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {selectedDocument && (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* File Preview Header */}
              <View style={styles.detailFileHeader}>
                <View style={[styles.detailFileIcon, { backgroundColor: `${getFileIcon(selectedDocument.fileType).color}15` }]}>
                  <Ionicons
                    name={getFileIcon(selectedDocument.fileType).name as any}
                    size={40}
                    color={getFileIcon(selectedDocument.fileType).color}
                  />
                </View>
                <Text style={styles.detailFileName}>{selectedDocument.name}</Text>
                <Text style={styles.detailOriginalName}>{selectedDocument.fileName}</Text>
              </View>

              {/* Source Badge */}
              {selectedDocument.source && (
                <View style={styles.sourceIndicatorRow}>
                  <View style={[styles.sourceIndicatorBadge, { backgroundColor: `${getSourceColor(selectedDocument.source)}20` }]}>
                    <View style={[styles.sourceIndicatorDot, { backgroundColor: getSourceColor(selectedDocument.source) }]} />
                    <Text style={[styles.sourceIndicatorText, { color: getSourceColor(selectedDocument.source) }]}>
                      {getSourceLabel(selectedDocument.source)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Metadata */}
              <Card style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Size</Text>
                  <Text style={styles.detailValue}>{formatFileSize(selectedDocument.fileSize)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{selectedDocument.fileType || 'Unknown'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Uploaded</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedDocument.createdAt)}</Text>
                </View>
                {selectedDocument.category && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Badge text={selectedDocument.category} variant={getCategoryBadgeVariant(selectedDocument.category)} />
                  </View>
                )}
                {selectedDocument.folder && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Folder</Text>
                    <View style={styles.detailFolderBadge}>
                      <Ionicons name="folder" size={14} color={selectedDocument.folder.color || colors.primary} />
                      <Text style={styles.detailValue}>{selectedDocument.folder.name}</Text>
                    </View>
                  </View>
                )}
                {selectedDocument.visibility && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Visibility</Text>
                    <Text style={styles.detailValue}>{selectedDocument.visibility}</Text>
                  </View>
                )}
              </Card>

              {/* Source-specific information */}
              {(selectedDocument.source === 'contracts' || selectedDocument.source === 'partner-contracts') && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailSectionTitle}>Contract Details</Text>
                  {selectedDocument.clientName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Client</Text>
                      <Text style={styles.detailValue}>{selectedDocument.clientName}</Text>
                    </View>
                  )}
                  {selectedDocument.partnerName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Partner</Text>
                      <Text style={styles.detailValue}>{selectedDocument.partnerName}</Text>
                    </View>
                  )}
                  {selectedDocument.status && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Badge text={selectedDocument.status} variant={getContractStatusVariant(selectedDocument.status)} />
                    </View>
                  )}
                  {selectedDocument.contractValue !== undefined && selectedDocument.contractValue !== null && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Value</Text>
                      <Text style={styles.detailValue}>
                        ${selectedDocument.contractValue.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </Card>
              )}

              {selectedDocument.source === 'team' && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailSectionTitle}>Team Document Details</Text>
                  {selectedDocument.teamMemberName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Team Member</Text>
                      <Text style={styles.detailValue}>{selectedDocument.teamMemberName}</Text>
                    </View>
                  )}
                  {selectedDocument.documentType && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Document Type</Text>
                      <Text style={styles.detailValue}>{selectedDocument.documentType}</Text>
                    </View>
                  )}
                </Card>
              )}

              {selectedDocument.description && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={[styles.detailValue, { marginTop: spacing.xs }]}>{selectedDocument.description}</Text>
                </Card>
              )}

              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Tags</Text>
                  <View style={styles.tagsRow}>
                    {selectedDocument.tags.map((tag: string, i: number) => (
                      <View key={i} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              {/* Download button */}
              <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                {loadingDetail ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={styles.downloadButtonText}>Download File</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Edit Document Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Document</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={colors.textMuted}
              placeholder="Document name"
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Optional description"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPickerScroll}>
              <View style={styles.categoryPickerRow}>
                {CATEGORIES.filter(c => c.value !== null).map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.filterChip,
                      editCategory === cat.value && styles.filterChipActive,
                    ]}
                    onPress={() => setEditCategory(editCategory === cat.value ? null : cat.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        editCategory === cat.value && styles.filterChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setUploadModalVisible(false)
          resetUploadForm()
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setUploadModalVisible(false)
              resetUploadForm()
            }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upload Document</Text>
            <TouchableOpacity onPress={handleUpload} disabled={uploading || !uploadFile}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveText, !uploadFile && { opacity: 0.4 }]}>Upload</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Selected file info */}
            {uploadFile && (
              <Card style={styles.selectedFileCard}>
                <View style={styles.selectedFileRow}>
                  <Ionicons
                    name={getFileIcon(uploadFile.mimeType).name as any}
                    size={24}
                    color={getFileIcon(uploadFile.mimeType).color}
                  />
                  <View style={styles.selectedFileInfo}>
                    <Text style={styles.selectedFileName} numberOfLines={1}>{uploadFile.name}</Text>
                    <Text style={styles.selectedFileSize}>{formatFileSize(uploadFile.size)}</Text>
                  </View>
                  <TouchableOpacity onPress={handlePickFile}>
                    <Text style={styles.changeFileText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={uploadName}
              onChangeText={setUploadName}
              placeholder="Document name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={uploadDescription}
              onChangeText={setUploadDescription}
              placeholder="Optional description"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPickerScroll}>
              <View style={styles.categoryPickerRow}>
                {CATEGORIES.filter(c => c.value !== null).map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.filterChip,
                      uploadCategory === cat.value && styles.filterChipActive,
                    ]}
                    onPress={() => setUploadCategory(uploadCategory === cat.value ? null : cat.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        uploadCategory === cat.value && styles.filterChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>Folder</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPickerScroll}>
              <View style={styles.categoryPickerRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !uploadFolderId && styles.filterChipActive,
                  ]}
                  onPress={() => setUploadFolderId(null)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !uploadFolderId && styles.filterChipTextActive,
                    ]}
                  >
                    Root
                  </Text>
                </TouchableOpacity>
                {allFoldersFlat.map(folder => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[
                      styles.filterChip,
                      uploadFolderId === folder.id && styles.filterChipActive,
                    ]}
                    onPress={() => setUploadFolderId(folder.id)}
                  >
                    <Ionicons name="folder" size={12} color={uploadFolderId === folder.id ? '#fff' : (folder.color || colors.textMuted)} />
                    <Text
                      style={[
                        styles.filterChipText,
                        { marginLeft: 4 },
                        uploadFolderId === folder.id && styles.filterChipTextActive,
                      ]}
                    >
                      {folder.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        visible={folderModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setFolderModalVisible(false)
          resetFolderForm()
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setFolderModalVisible(false)
              resetFolderForm()
            }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Folder</Text>
            <TouchableOpacity onPress={handleCreateFolder} disabled={creatingFolder}>
              {creatingFolder ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.saveText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Folder name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={newFolderDescription}
              onChangeText={setNewFolderDescription}
              placeholder="Optional description"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorPickerRow}>
              {FOLDER_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    newFolderColor === color && styles.colorSwatchActive,
                  ]}
                  onPress={() => setNewFolderColor(color)}
                >
                  {newFolderColor === color && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Parent Folder</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPickerScroll}>
              <View style={styles.categoryPickerRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !newFolderParentId && styles.filterChipActive,
                  ]}
                  onPress={() => setNewFolderParentId(null)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !newFolderParentId && styles.filterChipTextActive,
                    ]}
                  >
                    Root
                  </Text>
                </TouchableOpacity>
                {allFoldersFlat.map(folder => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[
                      styles.filterChip,
                      newFolderParentId === folder.id && styles.filterChipActive,
                    ]}
                    onPress={() => setNewFolderParentId(folder.id)}
                  >
                    <Ionicons name="folder" size={12} color={newFolderParentId === folder.id ? '#fff' : (folder.color || colors.textMuted)} />
                    <Text
                      style={[
                        styles.filterChipText,
                        { marginLeft: 4 },
                        newFolderParentId === folder.id && styles.filterChipTextActive,
                      ]}
                    >
                      {folder.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  // Breadcrumb
  breadcrumbContainer: {
    maxHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breadcrumbContent: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbSep: {
    marginHorizontal: spacing.xs,
  },
  breadcrumbText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  breadcrumbTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  // Search
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
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
  // Source Filters
  sourceFiltersScroll: {
    marginBottom: 16,
    minHeight: 48,
  },
  sourceFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
    gap: 6,
  },
  sourceColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourceCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  sourceCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  sourceCountText: {
    fontSize: 11,
    color: '#a1a1aa',
  },
  sourceCountTextActive: {
    color: '#ffffff',
  },
  // Filters
  filtersScroll: {
    marginBottom: 16,
    minHeight: 48,
  },
  filtersContainer: {
    paddingHorizontal: spacing.xl,
    gap: 10,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: '#e4e4e7',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  // Folders
  foldersSection: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  foldersRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  folderCard: {
    width: 110,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  folderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  folderName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  folderCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  // Documents
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
  },
  documentCard: {
    marginBottom: spacing.md,
  },
  documentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  documentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  documentName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  documentSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sourceDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  documentSize: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  documentDot: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  documentDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  documentBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  // Empty & loading
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  // Modals
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActionBtn: {
    padding: spacing.xs,
  },
  modalBody: {
    flex: 1,
    padding: spacing.xl,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  saveText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  // Detail modal
  detailFileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  detailFileIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  detailFileName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  detailOriginalName: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  detailCard: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  detailFolderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sourceIndicatorRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sourceIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  sourceIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourceIndicatorText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tagChip: {
    backgroundColor: colors.surfaceHover,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  downloadButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  // Form fields
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryPickerScroll: {
    maxHeight: 44,
    marginBottom: spacing.sm,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Color picker
  colorPickerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  // Selected file
  selectedFileCard: {
    marginBottom: spacing.md,
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedFileInfo: {
    flex: 1,
  },
  selectedFileName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  selectedFileSize: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  changeFileText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
})
