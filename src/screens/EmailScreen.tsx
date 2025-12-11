import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface EmailFolder {
  id: string
  name: string
  path: string
  unreadCount?: number
}

interface EmailMessage {
  id: string
  messageId: string
  subject: string
  from: { address: string; name?: string }
  to: { address: string; name?: string }[]
  date: string
  snippet: string
  isRead: boolean
  hasAttachment: boolean
}

interface Mailbox {
  accountId: string
  email: string
  displayName?: string
}

export default function EmailScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [folders, setFolders] = useState<EmailFolder[]>([])
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox')
  const [selectedMailbox, setSelectedMailbox] = useState<string>('')
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [showEmailDetail, setShowEmailDetail] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false)

  const fetchFolders = async () => {
    try {
      const data = await api.getEmailFolders()
      setFolders(data.folders || [])
      setMailboxes(data.mailboxes || [])
      if (data.mailboxes?.length > 0 && !selectedMailbox) {
        setSelectedMailbox(data.mailboxes[0].accountId)
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    }
  }

  const fetchEmails = async () => {
    if (!selectedFolder) return
    try {
      const data = await api.getEmails({
        folderId: selectedFolder,
        accountId: selectedMailbox || undefined,
      })
      setEmails(data.emails || [])
      setNeedsAuth(false)
    } catch (error: any) {
      console.error('Failed to fetch emails:', error)
      // Check if email service needs authentication
      if (error.message?.includes('not connected') || error.message?.includes('Unauthorized')) {
        setNeedsAuth(true)
      }
      setEmails([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [])

  useEffect(() => {
    if (selectedFolder) {
      setLoading(true)
      fetchEmails()
    }
  }, [selectedFolder, selectedMailbox])

  const onRefresh = () => {
    setRefreshing(true)
    fetchEmails()
  }

  const openEmail = async (email: EmailMessage) => {
    try {
      const data = await api.getEmail(email.messageId || email.id, selectedMailbox)
      // Combine the email metadata with the content
      setSelectedEmail({ ...email, content: data.content })
      setShowEmailDetail(true)
    } catch (error: any) {
      console.error('Failed to load email:', error)
      if (error.message?.includes('not connected')) {
        Alert.alert('Email Not Connected', 'Connect your email in the web admin to view email content.')
      } else {
        Alert.alert('Error', 'Failed to load email content')
      }
    }
  }

  const handleSend = async () => {
    if (!composeTo || !composeSubject) {
      Alert.alert('Error', 'Please fill in recipient and subject')
      return
    }

    setSending(true)
    try {
      await api.sendEmail({
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
        accountId: selectedMailbox || undefined,
      })
      setShowCompose(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      Alert.alert('Success', 'Email sent successfully')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getFolderIcon = (folderName: string | undefined | null) => {
    if (!folderName) return 'folder'
    const lower = folderName.toLowerCase()
    if (lower.includes('inbox')) return 'mail'
    if (lower.includes('sent')) return 'paper-plane'
    if (lower.includes('draft')) return 'document-text'
    if (lower.includes('trash') || lower.includes('deleted')) return 'trash'
    if (lower.includes('spam') || lower.includes('junk')) return 'warning'
    if (lower.includes('archive')) return 'archive'
    return 'folder'
  }

  const defaultFolders = [
    { id: 'inbox', name: 'Inbox', path: 'inbox' },
    { id: 'sent', name: 'Sent', path: 'sent' },
    { id: 'drafts', name: 'Drafts', path: 'drafts' },
    { id: 'trash', name: 'Trash', path: 'trash' },
  ]

  const displayFolders = folders.length > 0 ? folders : defaultFolders

  const renderEmail = ({ item }: { item: EmailMessage }) => (
    <TouchableOpacity onPress={() => openEmail(item)} activeOpacity={0.7}>
      <Card style={StyleSheet.flatten([styles.emailCard, !item.isRead && styles.emailUnread])}>
        <View style={styles.emailHeader}>
          <View style={styles.emailFrom}>
            {!item.isRead && <View style={styles.unreadDot} />}
            <Text style={[styles.fromText, !item.isRead && styles.unreadText]} numberOfLines={1}>
              {item.from.name || item.from.address}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
        <Text style={[styles.subjectText, !item.isRead && styles.unreadText]} numberOfLines={1}>
          {item.subject || '(No Subject)'}
        </Text>
        <View style={styles.emailFooter}>
          <Text style={styles.snippetText} numberOfLines={1}>{item.snippet}</Text>
          {item.hasAttachment && (
            <Ionicons name="attach" size={14} color={colors.textMuted} />
          )}
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Email</Text>
          <TouchableOpacity onPress={() => setShowCompose(true)} style={styles.composeButton}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      {hideHeader && (
        <View style={styles.composeRow}>
          <TouchableOpacity onPress={() => setShowCompose(true)} style={styles.composeButtonInline}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={styles.composeButtonText}>Compose</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mailbox Selector */}
      {mailboxes.length > 1 && (
        <View style={styles.mailboxSelector}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={mailboxes}
            keyExtractor={(item) => item.accountId}
            contentContainerStyle={styles.mailboxList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.mailboxBtn, selectedMailbox === item.accountId && styles.mailboxBtnActive]}
                onPress={() => setSelectedMailbox(item.accountId)}
              >
                <Text
                  style={[styles.mailboxText, selectedMailbox === item.accountId && styles.mailboxTextActive]}
                  numberOfLines={1}
                >
                  {item.displayName || item.email}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Folder Tabs */}
      <View style={styles.folderTabs}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={displayFolders}
          keyExtractor={(item, index) => item.id || item.path || `folder-${index}`}
          contentContainerStyle={styles.folderList}
          renderItem={({ item }) => {
            const folder = item as EmailFolder
            return (
              <TouchableOpacity
                style={[styles.folderTab, selectedFolder === folder.id && styles.folderTabActive]}
                onPress={() => setSelectedFolder(folder.id)}
              >
                <Ionicons
                  name={getFolderIcon(folder.name) as any}
                  size={16}
                  color={selectedFolder === folder.id ? colors.text : colors.textMuted}
                />
                <Text style={[styles.folderText, selectedFolder === folder.id && styles.folderTextActive]}>
                  {folder.name}
                </Text>
                {folder.unreadCount && folder.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{folder.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* Email List */}
      <FlatList
        data={emails}
        renderItem={renderEmail}
        keyExtractor={(item, index) => item.id || item.messageId || `email-${index}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              {needsAuth ? (
                <>
                  <Ionicons name="mail-unread-outline" size={48} color={colors.warning} />
                  <Text style={styles.emptyText}>Email Not Connected</Text>
                  <Text style={styles.emptySubtext}>
                    Connect your email account in the web admin to view emails here.
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="mail-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No emails in this folder</Text>
                </>
              )}
            </View>
          ) : null
        }
      />

      {/* Email Detail Modal */}
      <Modal visible={showEmailDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEmailDetail(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalAction}>
                  <Ionicons name="arrow-undo-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalAction}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            {selectedEmail && (
              <View style={styles.emailDetail}>
                <Text style={styles.detailSubject}>{selectedEmail.subject || '(No Subject)'}</Text>
                <View style={styles.detailMeta}>
                  <View style={styles.detailFrom}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(selectedEmail.from?.name || selectedEmail.from?.address || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.fromInfo}>
                      <Text style={styles.fromName}>{selectedEmail.from?.name || selectedEmail.from?.address}</Text>
                      <Text style={styles.fromEmail}>{selectedEmail.from?.address}</Text>
                    </View>
                  </View>
                  <Text style={styles.detailDate}>{formatDate(selectedEmail.date)}</Text>
                </View>
                <View style={styles.detailBody}>
                  <Text style={styles.bodyText}>{selectedEmail.content || selectedEmail.body || selectedEmail.snippet}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Compose Modal */}
      <Modal visible={showCompose} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.composeContent}>
            <View style={styles.composeHeader}>
              <TouchableOpacity onPress={() => setShowCompose(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.composeTitle}>New Email</Text>
              <TouchableOpacity onPress={handleSend} disabled={sending}>
                <Text style={[styles.sendText, sending && styles.sendTextDisabled]}>
                  {sending ? 'Sending...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.composeField}>
              <Text style={styles.fieldLabel}>To:</Text>
              <TextInput
                style={styles.fieldInput}
                value={composeTo}
                onChangeText={setComposeTo}
                placeholder="recipient@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.composeField}>
              <Text style={styles.fieldLabel}>Subject:</Text>
              <TextInput
                style={styles.fieldInput}
                value={composeSubject}
                onChangeText={setComposeSubject}
                placeholder="Email subject"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.composeBody}>
              <TextInput
                style={styles.bodyInput}
                value={composeBody}
                onChangeText={setComposeBody}
                placeholder="Write your message..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  composeButton: {
    padding: spacing.sm,
  },
  composeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  composeButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  composeButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  mailboxSelector: {
    marginBottom: spacing.sm,
  },
  mailboxList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  mailboxBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mailboxBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mailboxText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  mailboxTextActive: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  folderTabs: {
    marginBottom: spacing.md,
  },
  folderList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  folderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  folderTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  folderText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  folderTextActive: {
    color: colors.text,
  },
  unreadBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    minWidth: 18,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emailCard: {
    marginBottom: spacing.sm,
  },
  emailUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  emailFrom: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  fromText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  unreadText: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  subjectText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  snippetText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.surface,
    marginTop: 60,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalAction: {
    padding: spacing.sm,
  },
  emailDetail: {
    flex: 1,
    padding: spacing.lg,
  },
  detailSubject: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  detailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailFrom: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  fromInfo: {
    flex: 1,
  },
  fromName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  fromEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailBody: {
    flex: 1,
  },
  bodyText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  composeContent: {
    flex: 1,
    backgroundColor: colors.surface,
    marginTop: 60,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  composeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  composeTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sendText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  sendTextDisabled: {
    opacity: 0.5,
  },
  composeField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    width: 60,
  },
  fieldInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  composeBody: {
    flex: 1,
    padding: spacing.lg,
  },
  bodyInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
})
