import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'

import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { api } from '../../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme'

interface ClientDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void
    goBack: () => void
  }
  route: {
    params: { id: string }
  }
}

// Types
interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  isPrimary: boolean
}

interface Project {
  id: string
  name: string
  description?: string
  type: string
  status: string
  contractValue?: number
  monthlyRecurring?: number
  startDate?: string
  endDate?: string
}

interface Note {
  id: string
  content: string
  authorName: string
  isPinned: boolean
  createdAt: string
}

interface Activity {
  id: string
  type: string
  description: string
  performedAt: string
}

interface Message {
  id: string
  content: string
  fromClient: boolean
  createdAt: string
}

// Constants
const CLIENT_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LEAD']
const CLIENT_TYPES = ['INDIVIDUAL', 'BUSINESS', 'ENTERPRISE']
const PROJECT_STATUSES = ['PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD']

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  SUSPENDED: 'error',
  LEAD: 'warning',
}

const projectStatusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  PLANNING: 'default',
  IN_PROGRESS: 'primary',
  REVIEW: 'warning',
  COMPLETED: 'success',
  ON_HOLD: 'error',
}

const typeLabels: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
}

type TabName = 'overview' | 'projects' | 'contacts' | 'notes' | 'activity'

export function ClientDetailScreen({ navigation, route }: ClientDetailScreenProps) {
  const { id } = route.params
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabName>('overview')

  // Edit client modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})

  // Projects
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    type: 'WEB_DEVELOPMENT',
    status: 'PLANNING',
    contractValue: '',
    monthlyRecurring: '',
    startDate: '',
    endDate: '',
  })
  const [savingProject, setSavingProject] = useState(false)

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    isPrimary: false,
  })
  const [savingContact, setSavingContact] = useState(false)

  // Notes
  const [notes, setNotes] = useState<Note[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Activity
  const [activities, setActivities] = useState<Activity[]>([])

  // Actions
  const [sendingQuote, setSendingQuote] = useState(false)
  const [generatingContract, setGeneratingContract] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchClient = async () => {
    try {
      const data = await api.getAdminClient(id)
      setClient(data.client)
      setFormData(data.client)
      // Set initial data from client response
      if (data.client.projects) setProjects(data.client.projects)
      if (data.client.contacts) setContacts(data.client.contacts)
      if (data.client.notes) setNotes(data.client.notes)
      if (data.client.activities) setActivities(data.client.activities)
    } catch (error) {
      console.error('Failed to fetch client:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.request<{ projects: Project[] }>(`/admin/clients/${id}/projects`)
      setProjects(response.projects || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await api.request<{ contacts: Contact[] }>(`/admin/clients/${id}/contacts`)
      setContacts(response.contacts || [])
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    }
  }

  const fetchNotes = async () => {
    try {
      const response = await api.request<{ notes: Note[] }>(`/admin/clients/${id}/notes`)
      setNotes(response.notes || [])
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    }
  }

  const fetchActivities = async () => {
    try {
      const response = await api.request<{ activities: Activity[] }>(`/admin/clients/${id}/activities`)
      setActivities(response.activities || [])
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    }
  }

  useEffect(() => {
    fetchClient()
  }, [id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchClient()
  }

  // Client Edit handlers
  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateAdminClient(id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        address: formData.address,
        type: formData.type,
        status: formData.status,
        notes: formData.notes,
        autopayEnabled: formData.autopayEnabled,
      })
      Alert.alert('Success', 'Client updated successfully')
      setShowEditModal(false)
      fetchClient()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update client')
    } finally {
      setSaving(false)
    }
  }

  // Project handlers
  const openProjectModal = (project?: Project) => {
    if (project) {
      setEditingProject(project)
      setProjectForm({
        name: project.name,
        description: project.description || '',
        type: project.type || 'WEB_DEVELOPMENT',
        status: project.status || 'PLANNING',
        contractValue: project.contractValue?.toString() || '',
        monthlyRecurring: project.monthlyRecurring?.toString() || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
      })
    } else {
      setEditingProject(null)
      setProjectForm({
        name: '',
        description: '',
        type: 'WEB_DEVELOPMENT',
        status: 'PLANNING',
        contractValue: '',
        monthlyRecurring: '',
        startDate: '',
        endDate: '',
      })
    }
    setShowProjectModal(true)
  }

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) {
      Alert.alert('Error', 'Project name is required')
      return
    }
    setSavingProject(true)
    try {
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim() || null,
        type: projectForm.type,
        status: projectForm.status,
        contractValue: projectForm.contractValue ? Number(projectForm.contractValue) : null,
        monthlyRecurring: projectForm.monthlyRecurring ? Number(projectForm.monthlyRecurring) : null,
        startDate: projectForm.startDate || null,
        endDate: projectForm.endDate || null,
      }

      if (editingProject) {
        await api.request(`/admin/clients/${id}/projects/${editingProject.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        Alert.alert('Success', 'Project updated')
      } else {
        await api.request(`/admin/clients/${id}/projects`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        Alert.alert('Success', 'Project created')
      }
      setShowProjectModal(false)
      fetchClient()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save project')
    } finally {
      setSavingProject(false)
    }
  }

  const handleDeleteProject = (projectId: string) => {
    Alert.alert('Delete Project', 'Are you sure you want to delete this project?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.request(`/admin/clients/${id}/projects/${projectId}`, { method: 'DELETE' })
            Alert.alert('Success', 'Project deleted')
            fetchClient()
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete project')
          }
        },
      },
    ])
  }

  // Contact handlers
  const openContactModal = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact)
      setContactForm({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        role: contact.role || '',
        isPrimary: contact.isPrimary,
      })
    } else {
      setEditingContact(null)
      setContactForm({ name: '', email: '', phone: '', role: '', isPrimary: false })
    }
    setShowContactModal(true)
  }

  const handleSaveContact = async () => {
    if (!contactForm.name.trim()) {
      Alert.alert('Error', 'Contact name is required')
      return
    }
    setSavingContact(true)
    try {
      const payload = {
        name: contactForm.name.trim(),
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        role: contactForm.role.trim() || null,
        isPrimary: contactForm.isPrimary,
      }

      if (editingContact) {
        await api.request(`/admin/clients/${id}/contacts/${editingContact.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        Alert.alert('Success', 'Contact updated')
      } else {
        await api.request(`/admin/clients/${id}/contacts`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        Alert.alert('Success', 'Contact added')
      }
      setShowContactModal(false)
      fetchClient()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save contact')
    } finally {
      setSavingContact(false)
    }
  }

  const handleDeleteContact = (contactId: string) => {
    Alert.alert('Delete Contact', 'Are you sure you want to delete this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.request(`/admin/clients/${id}/contacts/${contactId}`, { method: 'DELETE' })
            Alert.alert('Success', 'Contact deleted')
            fetchClient()
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete contact')
          }
        },
      },
    ])
  }

  const handleSetPrimaryContact = async (contactId: string) => {
    try {
      await api.request(`/admin/clients/${id}/contacts/${contactId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPrimary: true }),
      })
      fetchClient()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set primary contact')
    }
  }

  // Note handlers
  const openNoteModal = (note?: Note) => {
    if (note) {
      setEditingNote(note)
      setNoteContent(note.content)
    } else {
      setEditingNote(null)
      setNoteContent('')
    }
    setShowNoteModal(true)
  }

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      Alert.alert('Error', 'Note content is required')
      return
    }
    setSavingNote(true)
    try {
      if (editingNote) {
        await api.request(`/admin/clients/${id}/notes/${editingNote.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ content: noteContent.trim() }),
        })
        Alert.alert('Success', 'Note updated')
      } else {
        await api.request(`/admin/clients/${id}/notes`, {
          method: 'POST',
          body: JSON.stringify({ content: noteContent.trim() }),
        })
        Alert.alert('Success', 'Note added')
      }
      setShowNoteModal(false)
      fetchClient()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteNote = (noteId: string) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.request(`/admin/clients/${id}/notes/${noteId}`, { method: 'DELETE' })
            Alert.alert('Success', 'Note deleted')
            fetchClient()
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete note')
          }
        },
      },
    ])
  }

  // Action handlers
  const handleSendQuote = async () => {
    setSendingQuote(true)
    try {
      await api.request(`/admin/clients/${id}/send-quote`, { method: 'POST' })
      Alert.alert('Success', 'Quote sent successfully')
      fetchClient()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send quote')
    } finally {
      setSendingQuote(false)
    }
  }

  const handleGenerateContract = async (projectId: string) => {
    setGeneratingContract(true)
    try {
      await api.request(`/admin/clients/${id}/projects/${projectId}/generate-contract`, { method: 'POST' })
      Alert.alert('Success', 'Contract generated successfully')
      fetchClient()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate contract')
    } finally {
      setGeneratingContract(false)
    }
  }

  const handleLinkUserAccount = () => {
    navigation.navigate('UserDetail', { id: client?.userId })
  }

  const handleDeleteClient = () => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client?.name}? This will also delete all associated projects, contacts, notes, and invoices. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await api.deleteAdminClient(id)
              Alert.alert('Success', 'Client deleted successfully')
              navigation.goBack()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete client')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  // Helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??'
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getActivityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      INVOICE_SENT: 'document-text-outline',
      INVOICE_PAID: 'checkmark-circle-outline',
      CONTRACT_SIGNED: 'create-outline',
      PROJECT_STARTED: 'rocket-outline',
      PROJECT_COMPLETED: 'trophy-outline',
      NOTE_ADDED: 'chatbubble-outline',
      QUOTE_SENT: 'mail-outline',
    }
    return icons[type] || 'ellipse-outline'
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!client) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Client</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Client not found</Text>
        </View>
      </View>
    )
  }

  const tabs: { key: TabName; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'information-circle-outline' },
    { key: 'projects', label: 'Projects', icon: 'briefcase-outline' },
    { key: 'contacts', label: 'Contacts', icon: 'people-outline' },
    { key: 'notes', label: 'Notes', icon: 'chatbubble-outline' },
    { key: 'activity', label: 'Activity', icon: 'time-outline' },
  ]

  const renderOverviewTab = () => (
    <>
      {/* Financial Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Revenue</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(Number(client.totalRevenue || client.totalInvoiced || 0))}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Outstanding</Text>
          <Text style={[styles.statValue, { color: Number(client.totalOutstanding) > 0 ? colors.warning : colors.text }]}>
            {formatCurrency(Number(client.totalOutstanding || 0))}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Projects</Text>
          <Text style={styles.statValue}>{projects.length || 0}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Invoices</Text>
          <Text style={styles.statValue}>{client.invoices?.length || 0}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSendQuote}
            disabled={sendingQuote}
          >
            {sendingQuote ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            )}
            <Text style={styles.actionButtonText}>Send Quote</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('InvoiceCreate', { clientId: id })}
          >
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Create Invoice</Text>
          </TouchableOpacity>
          {client.userId ? (
            <TouchableOpacity style={styles.actionButton} onPress={handleLinkUserAccount}>
              <Ionicons name="person-outline" size={20} color={colors.success} />
              <Text style={styles.actionButtonText}>View User</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Link User', 'Link a user account to this client')}>
              <Ionicons name="link-outline" size={20} color={colors.textMuted} />
              <Text style={styles.actionButtonText}>Link User</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>

      {/* Recent Invoices */}
      {client.invoices && client.invoices.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
          {client.invoices.slice(0, 5).map((invoice: any) => (
            <TouchableOpacity
              key={invoice.id}
              style={styles.listItem}
              onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
            >
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemTitle}>{invoice.invoiceNumber}</Text>
                <Text style={styles.listItemSub}>{formatDate(invoice.createdAt)}</Text>
              </View>
              <View style={styles.listItemRight}>
                <Text style={styles.listItemAmount}>{formatCurrency(Number(invoice.total))}</Text>
                <Badge
                  text={invoice.status}
                  variant={invoice.status === 'PAID' ? 'success' : invoice.status === 'OVERDUE' ? 'error' : 'warning'}
                />
              </View>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {/* Contact Info */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${client.email}`)}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.contactText, { color: colors.primary }]}>{client.email}</Text>
        </TouchableOpacity>
        {client.phone && (
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${client.phone}`)}>
            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.contactText, { color: colors.primary }]}>{client.phone}</Text>
          </TouchableOpacity>
        )}
        {client.address && (
          <View style={styles.contactRow}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <Text style={styles.contactText}>{client.address}</Text>
          </View>
        )}
        <View style={styles.contactRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          <Text style={styles.contactText}>Client since {formatDate(client.createdAt)}</Text>
        </View>
      </Card>

      {/* Notes Preview */}
      {client.notes && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{client.notes}</Text>
        </Card>
      )}
    </>
  )

  const renderProjectsTab = () => (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabHeaderTitle}>Projects ({projects.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openProjectModal()}>
          <Ionicons name="add" size={20} color={colors.text} />
          <Text style={styles.addButtonText}>Add Project</Text>
        </TouchableOpacity>
      </View>

      {projects.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyStateText}>No projects yet</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => openProjectModal()}>
            <Text style={styles.emptyStateButtonText}>Create First Project</Text>
          </TouchableOpacity>
        </View>
      ) : (
        projects.map((project) => (
          <Card key={project.id} style={styles.projectCard}>
            <TouchableOpacity onPress={() => openProjectModal(project)}>
              <View style={styles.projectHeader}>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  {project.description && (
                    <Text style={styles.projectDescription} numberOfLines={2}>{project.description}</Text>
                  )}
                </View>
                <Badge text={project.status} variant={projectStatusColors[project.status] || 'default'} />
              </View>

              <View style={styles.projectDetails}>
                {project.contractValue && (
                  <View style={styles.projectDetail}>
                    <Text style={styles.projectDetailLabel}>Budget</Text>
                    <Text style={styles.projectDetailValue}>{formatCurrency(project.contractValue)}</Text>
                  </View>
                )}
                {project.monthlyRecurring && (
                  <View style={styles.projectDetail}>
                    <Text style={styles.projectDetailLabel}>Monthly</Text>
                    <Text style={styles.projectDetailValue}>{formatCurrency(project.monthlyRecurring)}/mo</Text>
                  </View>
                )}
                {project.startDate && (
                  <View style={styles.projectDetail}>
                    <Text style={styles.projectDetailLabel}>Started</Text>
                    <Text style={styles.projectDetailValue}>{formatDate(project.startDate)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.projectActions}>
                <TouchableOpacity
                  style={styles.projectActionButton}
                  onPress={() => handleGenerateContract(project.id)}
                  disabled={generatingContract}
                >
                  {generatingContract ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="document-outline" size={16} color={colors.primary} />
                      <Text style={styles.projectActionText}>Generate Contract</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.projectActionButton, styles.projectDeleteButton]}
                  onPress={() => handleDeleteProject(project.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Card>
        ))
      )}
    </>
  )

  const renderContactsTab = () => (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabHeaderTitle}>Contacts ({contacts.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openContactModal()}>
          <Ionicons name="add" size={20} color={colors.text} />
          <Text style={styles.addButtonText}>Add Contact</Text>
        </TouchableOpacity>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyStateText}>No contacts yet</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => openContactModal()}>
            <Text style={styles.emptyStateButtonText}>Add First Contact</Text>
          </TouchableOpacity>
        </View>
      ) : (
        contacts.map((contact) => (
          <Card key={contact.id} style={styles.contactCard}>
            <TouchableOpacity onPress={() => openContactModal(contact)}>
              <View style={styles.contactCardHeader}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>{getInitials(contact.name)}</Text>
                </View>
                <View style={styles.contactCardInfo}>
                  <View style={styles.contactNameRow}>
                    <Text style={styles.contactCardName}>{contact.name}</Text>
                    {contact.isPrimary && <Badge text="Primary" variant="primary" />}
                  </View>
                  {contact.role && <Text style={styles.contactCardRole}>{contact.role}</Text>}
                </View>
              </View>

              <View style={styles.contactCardDetails}>
                {contact.email && (
                  <TouchableOpacity
                    style={styles.contactDetailRow}
                    onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                  >
                    <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.contactDetailText, { color: colors.primary }]}>{contact.email}</Text>
                  </TouchableOpacity>
                )}
                {contact.phone && (
                  <TouchableOpacity
                    style={styles.contactDetailRow}
                    onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                  >
                    <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.contactDetailText, { color: colors.primary }]}>{contact.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.contactCardActions}>
                {!contact.isPrimary && (
                  <TouchableOpacity
                    style={styles.contactActionButton}
                    onPress={() => handleSetPrimaryContact(contact.id)}
                  >
                    <Ionicons name="star-outline" size={16} color={colors.warning} />
                    <Text style={styles.contactActionText}>Set Primary</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.contactActionButton, styles.contactDeleteButton]}
                  onPress={() => handleDeleteContact(contact.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Card>
        ))
      )}
    </>
  )

  const renderNotesTab = () => (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabHeaderTitle}>Notes ({notes.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openNoteModal()}>
          <Ionicons name="add" size={20} color={colors.text} />
          <Text style={styles.addButtonText}>Add Note</Text>
        </TouchableOpacity>
      </View>

      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyStateText}>No notes yet</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => openNoteModal()}>
            <Text style={styles.emptyStateButtonText}>Add First Note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        notes.map((note) => (
          <Card key={note.id} style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <View style={styles.noteInfo}>
                <Text style={styles.noteAuthor}>{note.authorName}</Text>
                <Text style={styles.noteDate}>{formatDateTime(note.createdAt)}</Text>
              </View>
              <View style={styles.noteActions}>
                <TouchableOpacity style={styles.noteActionButton} onPress={() => openNoteModal(note)}>
                  <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.noteActionButton} onPress={() => handleDeleteNote(note.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.noteContent}>{note.content}</Text>
            {note.isPinned && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={12} color={colors.warning} />
                <Text style={styles.pinnedText}>Pinned</Text>
              </View>
            )}
          </Card>
        ))
      )}
    </>
  )

  const renderActivityTab = () => (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabHeaderTitle}>Activity Log</Text>
      </View>

      {activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyStateText}>No activity recorded yet</Text>
        </View>
      ) : (
        <View style={styles.activityTimeline}>
          {activities.map((activity, index) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <View style={styles.activityIcon}>
                  <Ionicons name={getActivityIcon(activity.type) as any} size={16} color={colors.primary} />
                </View>
                {index < activities.length - 1 && <View style={styles.activityLine} />}
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <Text style={styles.activityTime}>{formatDateTime(activity.performedAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'projects':
        return renderProjectsTab()
      case 'contacts':
        return renderContactsTab()
      case 'notes':
        return renderNotesTab()
      case 'activity':
        return renderActivityTab()
      default:
        return renderOverviewTab()
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Client Details</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, client.status === 'SUSPENDED' && styles.avatarSuspended]}>
              <Text style={styles.avatarText}>{getInitials(client.name)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{client.name}</Text>
              <Text style={styles.profileNumber}>#{client.clientNumber}</Text>
              {client.company && <Text style={styles.profileCompany}>{client.company}</Text>}
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Badge text={client.status} variant={statusColors[client.status] || 'default'} />
            <Badge text={typeLabels[client.type] || client.type} variant="primary" />
            {client.autopayEnabled && <Badge text="Autopay" variant="success" />}
          </View>
        </Card>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {renderTabContent()}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Edit Client Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Client</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Full name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone || ''}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Company</Text>
              <TextInput
                style={styles.input}
                value={formData.company || ''}
                onChangeText={(text) => setFormData({ ...formData, company: text })}
                placeholder="Company name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address || ''}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Address"
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.optionButtons}>
                {CLIENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionButton, formData.type === type && styles.optionButtonActive]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text style={[styles.optionButtonText, formData.type === type && styles.optionButtonTextActive]}>
                      {typeLabels[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.optionButtons}>
                {CLIENT_STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.optionButton, formData.status === status && styles.optionButtonActive]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={[styles.optionButtonText, formData.status === status && styles.optionButtonTextActive]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes || ''}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Internal notes..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setFormData({ ...formData, autopayEnabled: !formData.autopayEnabled })}
              >
                <Text style={styles.toggleLabel}>Autopay Enabled</Text>
                <Ionicons
                  name={formData.autopayEnabled ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={formData.autopayEnabled ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>

              {/* Danger Zone */}
              <View style={styles.dangerZone}>
                <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setShowEditModal(false)
                    setTimeout(handleDeleteClient, 300)
                  }}
                  disabled={deleting}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={styles.deleteButtonText}>
                    {deleting ? 'Deleting...' : 'Delete Client'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowEditModal(false)} style={{ flex: 1 }} />
              <Button title="Save" onPress={handleSave} loading={saving} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Modal */}
      <Modal visible={showProjectModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProject ? 'Edit Project' : 'New Project'}</Text>
              <TouchableOpacity onPress={() => setShowProjectModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Project Name *</Text>
              <TextInput
                style={styles.input}
                value={projectForm.name}
                onChangeText={(text) => setProjectForm({ ...projectForm, name: text })}
                placeholder="Project name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={projectForm.description}
                onChangeText={(text) => setProjectForm({ ...projectForm, description: text })}
                placeholder="Project description..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.optionButtons}>
                {PROJECT_STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.optionButton, projectForm.status === status && styles.optionButtonActive]}
                    onPress={() => setProjectForm({ ...projectForm, status })}
                  >
                    <Text style={[styles.optionButtonText, projectForm.status === status && styles.optionButtonTextActive]}>
                      {status.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Contract Value</Text>
              <TextInput
                style={styles.input}
                value={projectForm.contractValue}
                onChangeText={(text) => setProjectForm({ ...projectForm, contractValue: text })}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Monthly Recurring</Text>
              <TextInput
                style={styles.input}
                value={projectForm.monthlyRecurring}
                onChangeText={(text) => setProjectForm({ ...projectForm, monthlyRecurring: text })}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowProjectModal(false)} style={{ flex: 1 }} />
              <Button
                title={editingProject ? 'Update' : 'Create'}
                onPress={handleSaveProject}
                loading={savingProject}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Contact Modal */}
      <Modal visible={showContactModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingContact ? 'Edit Contact' : 'Add Contact'}</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={contactForm.name}
                onChangeText={(text) => setContactForm({ ...contactForm, name: text })}
                placeholder="Contact name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Title / Role</Text>
              <TextInput
                style={styles.input}
                value={contactForm.role}
                onChangeText={(text) => setContactForm({ ...contactForm, role: text })}
                placeholder="e.g., CEO, Project Manager"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={contactForm.email}
                onChangeText={(text) => setContactForm({ ...contactForm, email: text })}
                placeholder="contact@company.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={contactForm.phone}
                onChangeText={(text) => setContactForm({ ...contactForm, phone: text })}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setContactForm({ ...contactForm, isPrimary: !contactForm.isPrimary })}
              >
                <Text style={styles.toggleLabel}>Primary Contact</Text>
                <Ionicons
                  name={contactForm.isPrimary ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={contactForm.isPrimary ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowContactModal(false)} style={{ flex: 1 }} />
              <Button
                title={editingContact ? 'Update' : 'Add'}
                onPress={handleSaveContact}
                loading={savingContact}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Note Modal */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingNote ? 'Edit Note' : 'Add Note'}</Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Note Content *</Text>
              <TextInput
                style={[styles.input, styles.textAreaLarge]}
                value={noteContent}
                onChangeText={setNoteContent}
                placeholder="Enter your note..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="outline" onPress={() => setShowNoteModal(false)} style={{ flex: 1 }} />
              <Button
                title={editingNote ? 'Update' : 'Add'}
                onPress={handleSaveNote}
                loading={savingNote}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: fontSize.lg, color: colors.textMuted, marginTop: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backIcon: { marginRight: spacing.md },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  editButton: { padding: spacing.sm },
  scroll: { flex: 1 },
  profileCard: { margin: spacing.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarSuspended: { backgroundColor: colors.error, opacity: 0.7 },
  avatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  profileName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  profileNumber: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  profileCompany: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },

  // Tabs
  tabsContainer: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  tabsContent: { paddingHorizontal: spacing.sm, gap: spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  tabActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  tabTextActive: { color: colors.primary },
  tabContentContainer: { paddingHorizontal: spacing.lg },

  // Tab Header
  tabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  tabHeaderTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.primary, borderRadius: borderRadius.md },
  addButtonText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },

  // Actions
  actionsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionButton: { flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, backgroundColor: colors.background, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  actionButtonText: { fontSize: fontSize.xs, color: colors.text },

  // Section
  section: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },

  // List Items
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  listItemInfo: { flex: 1 },
  listItemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  listItemSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  listItemRight: { alignItems: 'flex-end', gap: spacing.xs },
  listItemAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },

  // Contact Row
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  contactText: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  notesText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyStateText: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.md },
  emptyStateButton: { marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, backgroundColor: colors.primary, borderRadius: borderRadius.md },
  emptyStateButtonText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },

  // Project Card
  projectCard: { marginBottom: spacing.md },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  projectInfo: { flex: 1, marginRight: spacing.sm },
  projectName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  projectDescription: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  projectDetails: { flexDirection: 'row', gap: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
  projectDetail: {},
  projectDetailLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  projectDetailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginTop: 2 },
  projectActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  projectActionButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  projectActionText: { fontSize: fontSize.sm, color: colors.primary },
  projectDeleteButton: { paddingHorizontal: spacing.sm },

  // Contact Card
  contactCard: { marginBottom: spacing.md },
  contactCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  contactCardInfo: { flex: 1, marginLeft: spacing.md },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contactCardName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  contactCardRole: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  contactCardDetails: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  contactDetailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  contactDetailText: { fontSize: fontSize.sm, color: colors.text },
  contactCardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  contactActionButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  contactActionText: { fontSize: fontSize.sm, color: colors.warning },
  contactDeleteButton: { paddingHorizontal: spacing.sm },

  // Note Card
  noteCard: { marginBottom: spacing.md },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  noteInfo: {},
  noteAuthor: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  noteDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  noteActions: { flexDirection: 'row', gap: spacing.sm },
  noteActionButton: { padding: spacing.xs },
  noteContent: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  pinnedText: { fontSize: fontSize.xs, color: colors.warning },

  // Activity Timeline
  activityTimeline: { paddingLeft: spacing.md },
  activityItem: { flexDirection: 'row', marginBottom: spacing.md },
  activityIconContainer: { alignItems: 'center', marginRight: spacing.md },
  activityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  activityLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: spacing.xs },
  activityContent: { flex: 1, paddingBottom: spacing.md },
  activityDescription: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  activityTime: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  modalScroll: { maxHeight: 400 },
  inputLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, fontSize: fontSize.md, marginBottom: spacing.md },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  textAreaLarge: { minHeight: 150, textAlignVertical: 'top' },
  optionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  optionButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  optionButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionButtonText: { fontSize: fontSize.sm, color: colors.textMuted },
  optionButtonTextActive: { color: colors.text, fontWeight: fontWeight.medium },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, marginBottom: spacing.md },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
  modalButtons: { flexDirection: 'row', marginTop: spacing.lg },
  dangerZone: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  dangerZoneTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.error, marginBottom: spacing.md },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.error, borderRadius: borderRadius.md },
  deleteButtonText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.error },
})
