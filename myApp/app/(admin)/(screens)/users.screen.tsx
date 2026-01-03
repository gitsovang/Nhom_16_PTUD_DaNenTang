import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Dimensions,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Image } from 'expo-image'

const { width } = Dimensions.get('window')
const PAGE_SIZE = 10
const API = 'http://10.0.2.2:5000'

export default function AdminUsersScreen() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page,
        per_page: PAGE_SIZE,
        ...(search.trim() && { search: search.trim() }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      }

      const res = await axios.get(`${API}/admin/users`, { params })

      const enhancedUsers = (res.data.users || []).map(u => ({
        ...u,
        uniqueKey: `${u.type}-${u.id}`,
        avatar: u.avatar || null,
      }))

      setUsers(enhancedUsers)
      setTotalPages(res.data.total_pages || 1)
    } catch (err) {
      setError('Không thể tải danh sách người dùng')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const onRefresh = useCallback(() => {
    setPage(1)
    fetchUsers()
  }, [fetchUsers])

  const toggleUserStatus = (user) => {
    const newIsActive = user.status !== 'active'
    const newStatus = newIsActive ? 'active' : 'banned'

    setUsers(prev =>
      prev.map(u =>
        u.uniqueKey === user.uniqueKey ? { ...u, status: newStatus } : u
      )
    )

    axios.patch(`${API}/admin/user/${user.type}/${user.id}/status`, {
      is_active: newIsActive,
    }).catch(() => {
      setError('Cập nhật trạng thái thất bại')
      setUsers(prev =>
        prev.map(u =>
          u.uniqueKey === user.uniqueKey ? { ...u, status: user.status } : u
        )
      )
    })
  }

  const getStatusStyle = (status) => ({
    backgroundColor: status === 'active' ? '#dcfce7' : '#fee2e2',
    color: status === 'active' ? '#166534' : '#991b1b',
  })

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1d4ed8', '#3b82f6']}
        style={styles.header}
      >
        <Text style={styles.title}>Quản Lý Người Dùng</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={22} color="#bfdbfe" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên hoặc số điện thoại..."
            placeholderTextColor="#bfdbfeaa"
            value={search}
            onChangeText={t => {
              setSearch(t)
              setPage(1)
            }}
          />
        </View>

        <View style={styles.filterBar}>
          <View style={styles.filterOption}>
            <Text style={styles.filterLabel}>Trạng thái</Text>
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  statusFilter === 'all' && styles.segmentActive,
                ]}
                onPress={() => {
                  setStatusFilter('all')
                  setPage(1)
                }}
              >
                <Text style={[
                  styles.segmentText,
                  statusFilter === 'all' && styles.segmentTextActive,
                ]}>Tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  statusFilter === 'active' && styles.segmentActive,
                ]}
                onPress={() => {
                  setStatusFilter('active')
                  setPage(1)
                }}
              >
                <Text style={[
                  styles.segmentText,
                  statusFilter === 'active' && styles.segmentTextActive,
                ]}>Hoạt động</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  statusFilter === 'banned' && styles.segmentActive,
                ]}
                onPress={() => {
                  setStatusFilter('banned')
                  setPage(1)
                }}
              >
                <Text style={[
                  styles.segmentText,
                  statusFilter === 'banned' && styles.segmentTextActive,
                ]}>Bị khóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>

      {error ? (
        <Animated.View entering={FadeInDown} style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : users.length === 0 ? (
        <Animated.View entering={FadeInDown} style={styles.center}>
          <Ionicons name="people-outline" size={90} color="#cbd5e1" />
          <Text style={styles.emptyText}>Không tìm thấy người dùng</Text>
        </Animated.View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
        >
          {users.map((user, index) => (
            <Animated.View
              key={user.uniqueKey}
              entering={FadeInDown.delay(index * 80)}
            >
              <View style={styles.userCard}>
                <View style={styles.userLeft}>
                  <View style={styles.avatarContainer}>
                    {user.avatar ? (
                      <Image
                        source={{ uri: `${API}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}` }}
                        style={styles.avatarImage}
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <Text style={styles.avatarInitial}>
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    )}
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.name || 'Chưa đặt tên'}
                    </Text>
                    <Text style={styles.userRole}>
                      {user.type === 'buyer' ? 'Người mua' : 'Người bán'}
                    </Text>
                    <Text style={styles.userPhone}>
                      {user.phone || 'Chưa có số điện thoại'}
                    </Text>
                  </View>
                </View>

                <View style={styles.statusSection}>
                  <View style={[styles.statusBadge, getStatusStyle(user.status)]}>
                    <Text style={styles.statusText}>
                      {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                    </Text>
                  </View>

                  <Switch
                    value={user.status === 'active'}
                    onValueChange={() => toggleUserStatus(user)}
                    trackColor={{ false: '#fca5a5', true: '#86efac' }}
                    thumbColor={user.status === 'active' ? '#16a34a' : '#ef4444'}
                    ios_backgroundColor="#e5e7eb"
                  />
                </View>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page === 1}
            onPress={() => setPage(p => Math.max(1, p - 1))}
            style={[styles.pageBtn, page === 1 && styles.pageDisabled]}
          >
            <Ionicons name="chevron-back" size={22} color={page === 1 ? '#94a3b8' : '#3b82f6'} />
          </TouchableOpacity>

          <Text style={styles.pageText}>
            {page} / {totalPages}
          </Text>

          <TouchableOpacity
            disabled={page === totalPages}
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            style={[styles.pageBtn, page === totalPages && styles.pageDisabled]}
          >
            <Ionicons name="chevron-forward" size={22} color={page === totalPages ? '#94a3b8' : '#3b82f6'} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 60,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.8,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 12,
  },
  filterBar: {
    marginTop: 16,
  },
  filterOption: {
    gap: 8,
  },
  filterLabel: {
    color: '#bfdbfe',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  segmentText: {
    color: '#bfdbfe',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  list: {
    flex: 1,
  },
  errorBox: {
    margin: 24,
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 16,
  },
  errorText: {
    color: '#991b1b',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  userRole: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#64748b',
  },
  statusSection: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 24,
  },
  pageBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageDisabled: {
    backgroundColor: '#f1f5f9',
  },
  pageText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
})