import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, useWindowDimensions, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { WebView } from 'react-native-webview'
import { Card } from '../components/Card'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

// Hardcoded folders like web app
const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: 'mail' },
  { id: 'sent', label: 'Sent', icon: 'paper-plane' },
  { id: 'drafts', label: 'Drafts', icon: 'document-text' },
  { id: 'trash', label: 'Trash', icon: 'trash' },
]

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
  id: string
  label: string
  email: string
}

export default function EmailScreen({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) {
  const [isConnected, setIsConnected] = useState(true)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox')
  const [selectedMailbox, setSelectedMailbox] = useState<string>('all')
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [showEmailDetail, setShowEmailDetail] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [connectingZoho, setConnectingZoho] = useState(false)

  // Compose state
  const [composeFrom, setComposeFrom] = useState('')
  const [composeTo, setComposeTo] = useState('')
  const [composeCc, setComposeCc] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showFromPicker, setShowFromPicker] = useState(false)

  // Fetch mailboxes/accounts (includes group emails)
  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api.getEmailAccounts()
      const accounts = data.mailboxes || []
      setMailboxes(accounts)
      setIsConnected(true)

      // Set default from address
      if (accounts.length > 0 && !composeFrom) {
        setComposeFrom(accounts[0].email)
      }
    } catch (error: any) {
      console.error('Failed to fetch accounts:', error)
      if (error.message?.includes('not connected') || error.message?.includes('needsAuth')) {
        setIsConnected(false)
      }
    }
  }, [composeFrom])

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    try {
      const data = await api.getEmails({
        folderId: selectedFolder,
        accountId: selectedMailbox !== 'all' ? selectedMailbox : undefined,
      })
      setEmails(data.emails || [])
      setIsConnected(true)
    } catch (error: any) {
      console.error('Failed to fetch emails:', error)
      if (error.message?.includes('not connected') || error.message?.includes('needsAuth')) {
        setIsConnected(false)
      }
      setEmails([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedFolder, selectedMailbox])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    setLoading(true)
    fetchEmails()
  }, [fetchEmails])

  // Auto-refresh every 30 seconds like web app
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEmails()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchEmails])

  // Connect to Zoho Mail
  const handleConnectZoho = async () => {
    setConnectingZoho(true)
    try {
      const response = await api.getZohoConnectUrl()
      if (response.authUrl) {
        await Linking.openURL(response.authUrl)
        Alert.alert(
          'Complete Setup in Browser',
          'After authorizing Zoho, return here and pull down to refresh.',
          [{ text: 'Got it' }]
        )
      } else {
        Alert.alert('Error', 'Could not generate Zoho authorization link. Please try again.')
      }
    } catch (error: any) {
      console.error('Zoho connect error:', error)
      Alert.alert('Error', error.message || 'Failed to start Zoho connection. Please try again.')
    } finally {
      setConnectingZoho(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchEmails()
  }

  // Helper to extract HTML content from API response
  // API returns { content: "..." } or { content: { content: "..." } }
  const extractContent = (data: any): string => {
    if (!data) return ''
    if (typeof data === 'string') return data
    // Check nested content.content first (Zoho format)
    if (data.content?.content && typeof data.content.content === 'string') {
      return data.content.content
    }
    if (typeof data.content === 'string') return data.content
    if (typeof data.htmlContent === 'string') return data.htmlContent
    if (typeof data.textContent === 'string') return data.textContent
    if (typeof data.body === 'string') return data.body
    // Last resort - stringify
    return typeof data === 'object' ? JSON.stringify(data) : String(data)
  }

  const openEmail = async (email: EmailMessage) => {
    setSelectedEmail(email)
    setShowEmailDetail(true)
    setLoadingContent(true)

    try {
      const data = await api.getEmail(email.messageId || email.id, selectedMailbox !== 'all' ? selectedMailbox : undefined)
      const contentText = extractContent(data)
      setSelectedEmail({ ...email, content: contentText })
    } catch (error: any) {
      console.error('Failed to load email:', error)
      if (error.message?.includes('not connected')) {
        Alert.alert('Email Not Connected', 'Connect your email in the web admin to view email content.')
      }
    } finally {
      setLoadingContent(false)
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
        from: composeFrom,
        to: composeTo,
        cc: composeCc || undefined,
        subject: composeSubject,
        body: composeBody,
      })
      setShowCompose(false)
      resetComposeForm()
      Alert.alert('Success', 'Email sent successfully')
      fetchEmails() // Refresh to show sent email
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const resetComposeForm = () => {
    setComposeTo('')
    setComposeCc('')
    setComposeSubject('')
    setComposeBody('')
    if (mailboxes.length > 0) {
      setComposeFrom(mailboxes[0].email)
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

  // Get all mailboxes with "All Inboxes" option
  const allMailboxOptions = [
    { id: 'all', label: 'All Inboxes', email: '' },
    ...mailboxes,
  ]

  const renderEmail = ({ item }: { item: EmailMessage }) => (
    <TouchableOpacity onPress={() => openEmail(item)} activeOpacity={0.7}>
      <Card style={StyleSheet.flatten([styles.emailCard, !item.isRead && styles.emailUnread])}>
        <View style={styles.emailHeader}>
          <View style={styles.emailFrom}>
            {!item.isRead && <View style={styles.unreadDot} />}
            <Text style={[styles.fromText, !item.isRead && styles.unreadText]} numberOfLines={1}>
              {item.from?.name || item.from?.address || 'Unknown'}
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

  if (!isConnected) {
    return (
      <View style={styles.container}>
        {!hideHeader && (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Email</Text>
            <View style={{ width: 40 }} />
          </View>
        )}
        <ScrollView
          contentContainerStyle={styles.notConnected}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                fetchAccounts().finally(() => setRefreshing(false))
              }}
              tintColor={colors.primary}
            />
          }
        >
          <Ionicons name="mail-unread-outline" size={64} color={colors.warning} />
          <Text style={styles.notConnectedTitle}>Email Not Connected</Text>
          <Text style={styles.notConnectedText}>
            Connect your Zoho Mail account to access and send emails from the app.
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnectZoho}
            disabled={connectingZoho}
          >
            {connectingZoho ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                <Text style={styles.connectButtonText}>Connect Zoho Mail</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.notConnectedHint}>
            Pull down to refresh after connecting
          </Text>
        </ScrollView>
      </View>
    )
  }

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

      {/* Mailbox Selector - includes All Inboxes + group emails */}
      <View style={styles.mailboxSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mailboxList}>
          {allMailboxOptions.map((mailbox) => (
            <TouchableOpacity
              key={mailbox.id}
              style={[styles.mailboxBtn, selectedMailbox === mailbox.id && styles.mailboxBtnActive]}
              onPress={() => setSelectedMailbox(mailbox.id)}
            >
              <Text
                style={[styles.mailboxText, selectedMailbox === mailbox.id && styles.mailboxTextActive]}
                numberOfLines={1}
              >
                {mailbox.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Folder Tabs - hardcoded like web app */}
      <View style={styles.folderTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderList}>
          {FOLDERS.map((folder) => (
            <TouchableOpacity
              key={folder.id}
              style={[styles.folderTab, selectedFolder === folder.id && styles.folderTabActive]}
              onPress={() => setSelectedFolder(folder.id)}
            >
              <Ionicons
                name={folder.icon as any}
                size={16}
                color={selectedFolder === folder.id ? colors.text : colors.textMuted}
              />
              <Text style={[styles.folderText, selectedFolder === folder.id && styles.folderTextActive]}>
                {folder.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
              <Ionicons name="mail-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No emails in {selectedFolder}</Text>
            </View>
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )
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
                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => {
                    if (selectedEmail) {
                      setShowEmailDetail(false)
                      setComposeTo(selectedEmail.from?.address || '')
                      setComposeSubject(`Re: ${selectedEmail.subject || ''}`)
                      setShowCompose(true)
                    }
                  }}
                >
                  <Ionicons name="arrow-undo-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalAction}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.emailDetail}>
              {selectedEmail && (
                <>
                  <View style={styles.emailDetailHeader}>
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
                  </View>
                  <View style={styles.detailBody}>
                    {loadingContent ? (
                      <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                    ) : (
                      <WebView
                        originWhitelist={['*']}
                        source={{
                          html: `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                                <style>
                                  * {
                                    box-sizing: border-box;
                                    max-width: 100% !important;
                                  }
                                  html, body {
                                    width: 100% !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    overflow-x: hidden !important;
                                  }
                                  body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    font-size: 15px;
                                    line-height: 1.6;
                                    color: #e4e4e7;
                                    background-color: #18181b;
                                    padding: 12px !important;
                                    word-wrap: break-word !important;
                                    word-break: break-word !important;
                                    overflow-wrap: break-word !important;
                                  }
                                  a { color: #3b82f6; word-break: break-all; }
                                  img {
                                    max-width: 100% !important;
                                    height: auto !important;
                                    display: block;
                                  }
                                  pre, code {
                                    background: #27272a;
                                    padding: 8px;
                                    border-radius: 4px;
                                    overflow-x: auto;
                                    white-space: pre-wrap !important;
                                    word-wrap: break-word !important;
                                    max-width: 100% !important;
                                  }
                                  blockquote {
                                    border-left: 3px solid #3b82f6;
                                    margin: 10px 0;
                                    padding-left: 15px;
                                    color: #a1a1aa;
                                  }
                                  table {
                                    border-collapse: collapse;
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    table-layout: fixed !important;
                                    overflow: hidden;
                                  }
                                  td, th {
                                    border: 1px solid #3f3f46;
                                    padding: 8px;
                                    word-wrap: break-word !important;
                                    overflow: hidden;
                                  }
                                  div, p, span, td, th, li {
                                    max-width: 100% !important;
                                    overflow-wrap: break-word !important;
                                    word-wrap: break-word !important;
                                  }
                                  /* Force any fixed-width elements to be responsive */
                                  [width], [style*="width"] {
                                    width: auto !important;
                                    max-width: 100% !important;
                                  }
                                </style>
                              </head>
                              <body>
                                ${typeof selectedEmail.content === 'string'
                                  ? selectedEmail.content
                                  : typeof selectedEmail.body === 'string'
                                    ? selectedEmail.body
                                    : `<p>${selectedEmail.snippet || ''}</p>`}
                              </body>
                            </html>
                          `,
                        }}
                        style={styles.webView}
                        scrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        showsHorizontalScrollIndicator={false}
                        scalesPageToFit={false}
                        nestedScrollEnabled={true}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        renderLoading={() => <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
                      />
                    )}
                  </View>
                </>
              )}
            </View>
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
              <TouchableOpacity onPress={() => { setShowCompose(false); resetComposeForm(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.composeTitle}>New Email</Text>
              <TouchableOpacity onPress={handleSend} disabled={sending}>
                <Text style={[styles.sendText, sending && styles.sendTextDisabled]}>
                  {sending ? 'Sending...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* From Address Selector */}
            <TouchableOpacity style={styles.composeField} onPress={() => setShowFromPicker(true)}>
              <Text style={styles.fieldLabel}>From:</Text>
              <Text style={styles.fromValue} numberOfLines={1}>{composeFrom || 'Select...'}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>

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
              <Text style={styles.fieldLabel}>Cc:</Text>
              <TextInput
                style={styles.fieldInput}
                value={composeCc}
                onChangeText={setComposeCc}
                placeholder="cc@example.com"
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

      {/* From Address Picker Modal */}
      <Modal visible={showFromPicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowFromPicker(false)}
        >
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Select From Address</Text>
            {mailboxes.map((mailbox) => (
              <TouchableOpacity
                key={mailbox.id}
                style={[styles.pickerOption, composeFrom === mailbox.email && styles.pickerOptionActive]}
                onPress={() => {
                  setComposeFrom(mailbox.email)
                  setShowFromPicker(false)
                }}
              >
                <Text style={[styles.pickerOptionText, composeFrom === mailbox.email && styles.pickerOptionTextActive]}>
                  {mailbox.label}
                </Text>
                <Text style={styles.pickerOptionEmail}>{mailbox.email}</Text>
                {composeFrom === mailbox.email && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
  notConnected: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  notConnectedTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  notConnectedText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  connectButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    minHeight: 48,
  },
  connectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  notConnectedHint: {
    marginTop: spacing.lg,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
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
    marginRight: spacing.sm,
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
    marginRight: spacing.sm,
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
  loading: {
    paddingVertical: spacing.xxxl,
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
  },
  emailDetailHeader: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  detailSubject: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.md,
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
    minHeight: 300,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
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
  fromValue: {
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  pickerContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  pickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  pickerOptionActive: {
    backgroundColor: colors.surfaceHover,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  pickerOptionTextActive: {
    color: colors.primary,
  },
  pickerOptionEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
})
