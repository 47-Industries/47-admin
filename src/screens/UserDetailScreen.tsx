import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { api } from '../services/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

interface UserDetails {
  id: string
  name: string | null
  email: string
  username: string | null
  phone?: string | null
  image: string | null
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'
  permissions: string[]
  emailAccess: string[] | null
  emailVerified: string | null
  isFounder: boolean
  signatureUrl?: string | null
  initialsUrl?: string | null
  title?: string | null
  createdAt: string
  updatedAt?: string
  lastLogin?: string
  totalSpent?: number
  orders?: any[]
  _count?: {
    orders?: number
  }
}

export default function UserDetailScreen({ navigation, route }: any) {
  const { id } = route.params
  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [id])

  const fetchUser = async () => {
    try {
      const data = await api.getUser(id)
      setUser(data.user)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      Alert.alert('Error', 'Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const getRoleBadgeVariant = (role: string): 'default' | 'success' | 'warning' | 'error' | 'primary' => {
    switch (role) {
      case 'SUPER_ADMIN': return 'error'
      case 'ADMIN': return 'warning'
      case 'CUSTOMER': return 'primary'
      default: return 'default'
    }
  }

  const getRoleBadgeText = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin'
      case 'ADMIN': return 'Admin'
      case 'CUSTOMER': return 'Customer'
      default: return role
    }
  }

  const handleDeleteUser = () => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user?.name || user?.email}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.deleteUser(id)
              Alert.alert('Success', 'User deleted successfully')
              navigation.goBack()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete user')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleUserUpdated = () => {
    setShowEditModal(false)
    setShowChangeRoleModal(false)
    setShowResetPasswordModal(false)
    fetchUser()
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={styles.loadingText}>User not found</Text>
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
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          {user.image ? (
            <Image source={{ uri: user.image }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && styles.adminAvatar]}>
              <Text style={styles.avatarText}>{getInitials(user.name, user.email)}</Text>
            </View>
          )}
          <Text style={styles.userName}>{user.name || 'No Name'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.username && (
            <Text style={styles.userUsername}>@{user.username}</Text>
          )}
          <View style={styles.badges}>
            <Badge text={getRoleBadgeText(user.role)} variant={getRoleBadgeVariant(user.role)} />
            {user.isFounder && <Badge text="Founder" variant="primary" />}
            {user.emailVerified && <Badge text="Verified" variant="success" />}
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(`mailto:${user.email}`)}
          >
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Email</Text>
          </TouchableOpacity>
          {user.phone && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Linking.openURL(`tel:${user.phone}`)}
            >
              <Ionicons name="call-outline" size={20} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Call</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats (for customers) */}
        {user.role === 'CUSTOMER' && (
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{user._count?.orders || 0}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {formatCurrency(user.totalSpent || 0)}
              </Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </Card>
          </View>
        )}

        {/* Account Info */}
        <Text style={styles.sectionTitle}>Account Information</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          {user.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          )}
          {user.username && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>@{user.username}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => setShowChangeRoleModal(true)}
            >
              <Badge text={getRoleBadgeText(user.role)} variant={getRoleBadgeVariant(user.role)} />
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Badge
              text={user.emailVerified ? 'Active' : 'Pending Verification'}
              variant={user.emailVerified ? 'success' : 'warning'}
            />
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Joined</Text>
            <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
          </View>
          {user.lastLogin && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Login</Text>
              <Text style={styles.infoValue}>{formatDateTime(user.lastLogin)}</Text>
            </View>
          )}
        </Card>

        {/* Recent Orders (for customers) */}
        {user.orders && user.orders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {user.orders.slice(0, 5).map((order: any) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
              >
                <Card style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <Badge
                      text={order.status}
                      variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'primary'}
                    />
                  </View>
                  <View style={styles.orderDetails}>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    <Text style={styles.orderTotal}>{formatCurrency(Number(order.total))}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Permissions (for admins) */}
        {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && user.permissions?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Permissions</Text>
            <Card style={styles.permissionsCard}>
              <View style={styles.permissionsList}>
                {user.permissions.map((permission: string, index: number) => (
                  <View key={index} style={styles.permissionBadge}>
                    <Ionicons name="checkmark" size={14} color={colors.success} />
                    <Text style={styles.permissionText}>{permission}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {/* Signature (for admins) */}
        {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
          <>
            <Text style={styles.sectionTitle}>Signature</Text>
            <Card style={styles.signatureCard}>
              {user.signatureUrl ? (
                <View style={styles.signatureContainer}>
                  <Image source={{ uri: user.signatureUrl }} style={styles.signatureImage} resizeMode="contain" />
                  <Text style={styles.signatureLabel}>Signature on file</Text>
                </View>
              ) : (
                <View style={styles.noSignature}>
                  <Ionicons name="create-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.noSignatureText}>No signature uploaded</Text>
                  <TouchableOpacity style={styles.uploadButton}>
                    <Text style={styles.uploadButtonText}>Upload Signature</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </>
        )}

        {/* Actions Section */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <Card style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setShowEditModal(true)}
          >
            <Ionicons name="person-outline" size={20} color={colors.text} />
            <Text style={styles.actionItemText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setShowChangeRoleModal(true)}
          >
            <Ionicons name="shield-outline" size={20} color={colors.text} />
            <Text style={styles.actionItemText}>Change Role</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setShowResetPasswordModal(true)}
          >
            <Ionicons name="key-outline" size={20} color={colors.warning} />
            <Text style={[styles.actionItemText, { color: colors.warning }]}>Reset Password</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, styles.actionItemLast]}
            onPress={handleDeleteUser}
            disabled={actionLoading}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={[styles.actionItemText, { color: colors.error }]}>Delete User</Text>
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditUserModal
        visible={showEditModal}
        user={user}
        onClose={() => setShowEditModal(false)}
        onSaved={handleUserUpdated}
      />

      {/* Change Role Modal */}
      <ChangeRoleModal
        visible={showChangeRoleModal}
        user={user}
        onClose={() => setShowChangeRoleModal(false)}
        onSaved={handleUserUpdated}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        visible={showResetPasswordModal}
        user={user}
        onClose={() => setShowResetPasswordModal(false)}
        onSaved={handleUserUpdated}
      />
    </SafeAreaView>
  )
}

// Edit User Modal
function EditUserModal({
  visible,
  user,
  onClose,
  onSaved,
}: {
  visible: boolean
  user: UserDetails
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone || '')
  const [username, setUsername] = useState(user.username || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setName(user.name || '')
      setEmail(user.email)
      setPhone(user.phone || '')
      setUsername(user.username || '')
      setError('')
    }
  }, [visible, user])

  const handleSave = async () => {
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.updateUser(user.id, {
        name: name.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        username: username.trim() || null,
      })
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={modalStyles.title}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={modalStyles.errorBox}>
              <Text style={modalStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Name</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Email *</Text>
            <TextInput
              style={modalStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Phone</Text>
            <TextInput
              style={modalStyles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Username</Text>
            <TextInput
              style={modalStyles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnSecondary]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnPrimary, loading && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnPrimaryText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// Change Role Modal
function ChangeRoleModal({
  visible,
  user,
  onClose,
  onSaved,
}: {
  visible: boolean
  user: UserDetails
  onClose: () => void
  onSaved: () => void
}) {
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'>(user.role)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setSelectedRole(user.role)
      setError('')
    }
  }, [visible, user])

  const handleSave = async () => {
    if (selectedRole === user.role) {
      onClose()
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.updateUser(user.id, { role: selectedRole })
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    { value: 'CUSTOMER', label: 'Customer', description: 'Standard user with shop access', icon: 'person-outline' },
    { value: 'ADMIN', label: 'Admin', description: 'Access to admin dashboard', icon: 'shield-half-outline' },
    { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full access to all features', icon: 'shield-checkmark-outline' },
  ] as const

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={modalStyles.title}>Change Role</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={modalStyles.errorBox}>
              <Text style={modalStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={modalStyles.infoText}>
            Select a new role for {user.name || user.email}
          </Text>

          {roles.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={[
                modalStyles.roleCard,
                selectedRole === role.value && modalStyles.roleCardActive
              ]}
              onPress={() => setSelectedRole(role.value)}
            >
              <View style={[
                modalStyles.roleIcon,
                selectedRole === role.value && modalStyles.roleIconActive
              ]}>
                <Ionicons
                  name={role.icon as any}
                  size={24}
                  color={selectedRole === role.value ? colors.text : colors.textMuted}
                />
              </View>
              <View style={modalStyles.roleInfo}>
                <Text style={[
                  modalStyles.roleLabel,
                  selectedRole === role.value && modalStyles.roleLabelActive
                ]}>
                  {role.label}
                </Text>
                <Text style={modalStyles.roleDescription}>{role.description}</Text>
              </View>
              {selectedRole === role.value && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnSecondary]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnPrimary, loading && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnPrimaryText}>
              {loading ? 'Updating...' : 'Update Role'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// Reset Password Modal
function ResetPasswordModal({
  visible,
  user,
  onClose,
  onSaved,
}: {
  visible: boolean
  user: UserDetails
  onClose: () => void
  onSaved: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setPassword('')
      setConfirmPassword('')
      setSendNotification(true)
      setError('')
    }
  }, [visible])

  const handleReset = async () => {
    if (!password.trim() || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.resetUserPassword(user.id, {
        newPassword: password,
        sendNotification,
      })
      Alert.alert('Success', 'Password has been reset' + (sendNotification ? ' and notification sent' : ''))
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={modalStyles.title}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={modalStyles.errorBox}>
              <Text style={modalStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={modalStyles.infoText}>
            Set a new password for {user.name || user.email}
          </Text>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>New Password *</Text>
            <TextInput
              style={modalStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <View style={modalStyles.formGroup}>
            <Text style={modalStyles.label}>Confirm Password *</Text>
            <TextInput
              style={modalStyles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={modalStyles.checkboxRow}
            onPress={() => setSendNotification(!sendNotification)}
          >
            <View style={[modalStyles.checkbox, sendNotification && modalStyles.checkboxActive]}>
              {sendNotification && <Ionicons name="checkmark" size={16} color={colors.text} />}
            </View>
            <Text style={modalStyles.checkboxLabel}>Send email notification to user</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnSecondary]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.footerBtnWarning, loading && { opacity: 0.5 }]}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={modalStyles.footerBtnPrimaryText}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
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
  profileCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  adminAvatar: {
    backgroundColor: '#f59e0b',
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  userUsername: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  actionText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  infoCard: {
    padding: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  orderCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  orderTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  permissionsCard: {
    padding: spacing.lg,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  permissionText: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginLeft: spacing.xs,
    textTransform: 'lowercase',
  },
  signatureCard: {
    padding: spacing.lg,
  },
  signatureContainer: {
    alignItems: 'center',
  },
  signatureImage: {
    width: '100%',
    height: 80,
    marginBottom: spacing.sm,
  },
  signatureLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  noSignature: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noSignatureText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  uploadButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  uploadButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  actionsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  actionItemLast: {
    borderBottomWidth: 0,
  },
  actionItemText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
})

const modalStyles = StyleSheet.create({
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
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  infoText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconActive: {
    backgroundColor: colors.primary,
  },
  roleInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  roleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  roleLabelActive: {
    color: colors.primary,
  },
  roleDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerBtnSecondaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  footerBtnPrimary: {
    backgroundColor: colors.primary,
  },
  footerBtnWarning: {
    backgroundColor: colors.warning,
  },
  footerBtnPrimaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
})
