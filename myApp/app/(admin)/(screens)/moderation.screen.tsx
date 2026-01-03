import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

const PAGE_SIZE = 10;
const API = 'http://10.0.2.2:5000';

const STATUS_MAP = {
  waiting_for_approve: { label: 'Chờ duyệt', color: '#f59e0b' },
  approved: { label: 'Đã duyệt', color: '#10b981' },
  rejected: { label: 'Từ chối', color: '#ef4444' },
};

const FILTER_OPTIONS = [
  { value: 'waiting_for_approve', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];

export default function AdminModerationScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('waiting_for_approve');
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const scaleApprove = useSharedValue(1);
  const scaleReject = useSharedValue(1);
  const effectScale = useSharedValue(0);
  const effectOpacity = useSharedValue(0);

  const animatedApprove = useAnimatedStyle(() => ({
    transform: [{ scale: scaleApprove.value }],
  }));

  const animatedReject = useAnimatedStyle(() => ({
    transform: [{ scale: scaleReject.value }],
  }));

  const effectAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: effectScale.value }],
    opacity: effectOpacity.value,
  }));

  const animateButton = (type) => {
    const scaleValue = type === 'approved' ? scaleApprove : scaleReject;
    scaleValue.value = withSpring(0.9, { duration: 150 }, () => {
      scaleValue.value = withSpring(1, { duration: 150 });
    });
  };

  const showSuccessEffect = () => {
    effectScale.value = 0;
    effectOpacity.value = 0;

    effectScale.value = withSpring(1.8, { damping: 8 });
    effectOpacity.value = withTiming(1, { duration: 300 }, () => {
      effectOpacity.value = withTiming(0, { duration: 600 });
    });
  };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/admin/products`, {
        params: { status: filter, page, per_page: PAGE_SIZE, search: search.trim() || undefined },
      });
      setPosts(res.data.products || []);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      setError('Không thể tải dữ liệu');
      setPosts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts().finally(() => setRefreshing(false));
  }, [fetchPosts]);

  const handleAction = (newStatus) => {
    animateButton(newStatus);
    setPendingAction(newStatus);
  };

  const confirmAction = async () => {
    if (!pendingAction || !selectedPost) return;

    const postId = selectedPost.id;
    const action = pendingAction;

    showSuccessEffect();

    try {
      await axios.patch(`${API}/admin/product/${postId}/status`, { status: action });
      fetchPosts();
      setSelectedPost(null);
      setPendingAction(null);
    } catch (err) {
      setError('Cập nhật trạng thái thất bại');
    }
  };

  const cancelAction = () => {
    setPendingAction(null);
  };

  const renderPostImage = (imageUrl) => {
    if (!imageUrl) return <View style={styles.imagePlaceholder} />;
    const firstImage = imageUrl.split(',')[0].trim();
    const uri = firstImage.startsWith('http') ? firstImage : `${API}${firstImage}`;
    return <Image source={{ uri }} style={styles.postImage} resizeMode="cover" />;
  };

  const getStatusColor = (status) => STATUS_MAP[status]?.color || '#6b7280';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Không xác định';
    
    try {
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
        return dateStr;
      }
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1e40af', '#3b82f6']} style={styles.headerGradient}>
        <Text style={styles.title}>Quản Lý Sản Phẩm</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#bfdbfe" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            placeholderTextColor="#bfdbfeaa"
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
          />
        </View>

        <View style={styles.filterContainer}>
          {FILTER_OPTIONS.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[styles.filterBtn, filter === value && styles.filterActive]}
              onPress={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cube-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyText}>Không tìm thấy sản phẩm</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        >
          {posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={[styles.productCard, styles.cardShadow]}
              onPress={() => setSelectedPost(post)}
              activeOpacity={0.88}
            >
              {renderPostImage(post.image_url)}

              <View style={styles.cardContent}>
                <Text style={styles.productName} numberOfLines={2}>
                  {post.name}
                </Text>

                <Text style={styles.productSeller}>
                  Người bán: {post.seller_name || 'Không xác định'}
                </Text>

                <Text style={styles.productPrice}>
                  ₫{Number(post.price).toLocaleString('vi-VN')}
                </Text>

                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(post.status) }]}>
                  <Text style={styles.statusText}>
                    {STATUS_MAP[post.status]?.label || 'Chờ duyệt'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page === 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            style={[styles.pageBtn, page === 1 && styles.pageDisabled]}
          >
            <Ionicons name="chevron-back" size={22} color={page === 1 ? '#94a3b8' : '#fff'} />
          </TouchableOpacity>

          <Text style={styles.pageText}>
            {page} / {totalPages}
          </Text>

          <TouchableOpacity
            disabled={page === totalPages}
            onPress={() => setPage((p) => p + 1)}
            style={[styles.pageBtn, page === totalPages && styles.pageDisabled]}
          >
            <Ionicons name="chevron-forward" size={22} color={page === totalPages ? '#94a3b8' : '#fff'} />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={!!selectedPost}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết sản phẩm</Text>
              <TouchableOpacity onPress={() => setSelectedPost(null)}>
                <Ionicons name="close" size={28} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {selectedPost && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {renderPostImage(selectedPost.image_url)}

                <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginVertical: 12, textAlign: 'center' }}>
                  {selectedPost.name}
                </Text>

                <View style={{ marginVertical: 12 }}>
                  <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 4 }}>Người bán</Text>
                  <Text style={{ fontSize: 17, color: '#111827', fontWeight: '600' }}>
                    {selectedPost.seller_name || 'Không xác định'}
                  </Text>
                </View>

                <View style={{ marginVertical: 12 }}>
                  <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 4 }}>Giá</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#1f2937' }}>
                    ₫{Number(selectedPost.price).toLocaleString('vi-VN')}
                  </Text>
                </View>

                <View style={{ marginVertical: 12 }}>
                  <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 4 }}>Trạng thái</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedPost.status), alignSelf: 'flex-start' }]}>
                    <Text style={styles.statusText}>
                      {STATUS_MAP[selectedPost.status]?.label || 'Chờ duyệt'}
                    </Text>
                  </View>
                </View>

                <View style={{ marginVertical: 12 }}>
                  <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 4 }}>Tạo lúc</Text>
                  <Text style={{ fontSize: 16, color: '#111827', fontWeight: '500' }}>
                    {formatDate(selectedPost.created_at)}
                  </Text>
                </View>

                {selectedPost.description && (
                  <View style={{ marginVertical: 12 }}>
                    <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 4 }}>Mô tả sản phẩm</Text>
                    <Text style={{ fontSize: 15, color: '#4b5563', lineHeight: 22 }}>
                      {selectedPost.description}
                    </Text>
                  </View>
                )}

                <View style={[styles.modalActions, { marginTop: 32 }]}>
                  <TouchableOpacity
                    style={[styles.modalConfirm, { backgroundColor: '#10b981' }]}
                    onPress={() => handleAction('approved')}
                  >
                    <Text style={styles.modalConfirmText}>Duyệt</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalConfirm, { backgroundColor: '#ef4444' }]}
                    onPress={() => handleAction('rejected')}
                  >
                    <Text style={styles.modalConfirmText}>Từ chối</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!pendingAction} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận</Text>
              <TouchableOpacity onPress={cancelAction}>
                <Ionicons name="close" size={28} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalQuestion}>
              Bạn chắc chắn muốn {pendingAction === 'approved' ? 'duyệt' : 'từ chối'} sản phẩm này?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={cancelAction}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  pendingAction === 'approved' ? { backgroundColor: '#10b981' } : { backgroundColor: '#ef4444' },
                ]}
                onPress={confirmAction}
              >
                <Text style={styles.modalConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {pendingAction && (
        <Animated.View style={[styles.effectOverlay, effectAnimatedStyle]}>
          <Ionicons
            name={pendingAction === 'approved' ? 'checkmark-circle' : 'close-circle'}
            size={160}
            color={pendingAction === 'approved' ? '#10b981' : '#ef4444'}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    marginTop: 16,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    alignItems: 'center',
  },
  filterActive: {
    backgroundColor: '#fff',
  },
  filterText: {
    color: '#bfdbfe',
    fontWeight: '700',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#1e40af',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 16,
  },
  errorText: {
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
  },
  productCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  imagePlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: '#e5e7eb',
  },
  postImage: {
    width: '100%',
    height: 240,
  },
  cardContent: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  productSeller: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 40,
  },
  pageBtn: {
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    minWidth: 56,
    alignItems: 'center',
  },
  pageDisabled: {
    backgroundColor: '#d1d5db',
  },
  pageText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1f2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  modalQuestion: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#4b5563',
    fontWeight: '700',
    fontSize: 16,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  effectOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
  },
});