import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';

const API = 'http://10.0.2.2:5000';

export default function SellerProfileScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showSaveAvatarBtn, setShowSaveAvatarBtn] = useState(false);

  const [avatar, setAvatar] = useState('https://via.placeholder.com/100');
  const [shopName, setShopName] = useState('---');
  const [shopNameInput, setShopNameInput] = useState('---');
  const [email, setEmail] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [password, setPassword] = useState('');

  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
    pending: 0,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const u = await AsyncStorage.getItem('user');
      if (!u) return;
      const user = JSON.parse(u);
      const res = await axios.get(`${API}/profile/seller/${user.id}`);

      setAvatar(res.data.avatar || 'https://via.placeholder.com/100');
      setShopName(res.data.shop_name || '---');
      setShopNameInput(res.data.shop_name || '---');
      setEmail(res.data.email || '');
      setInitialEmail(res.data.email || '');
      setStats({
        products: Number(res.data.stats?.products ?? 0),
        orders: Number(res.data.stats?.orders ?? 0),
        revenue: Number(res.data.stats?.revenue ?? 0),
        pending: Number(res.data.stats?.pending ?? 0),
      });
    } catch (error) {
      console.error('Load profile error:', error);
      setStats({ products: 0, orders: 0, revenue: 0, pending: 0 });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile().finally(() => setRefreshing(false));
  }, []);

  const pickImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  });

  if (!result.canceled && result.assets?.[0]?.uri) {
    const resized = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 512 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    setAvatar(resized.uri);
    setShowSaveAvatarBtn(true);
  }
};

  const saveAvatarOnly = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const u = await AsyncStorage.getItem('user');
      if (!u) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        return;
      }
      const user = JSON.parse(u);

      const formData = new FormData();

      if (avatar && !avatar.startsWith('http')) {
        const uri = avatar;
        let filename = uri.split('/').pop() || `avatar_${Date.now()}.jpg`;
        if (!filename.includes('.')) filename += '.jpg';

        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;

        formData.append('avatar', {
          uri,
          name: filename,
          type: `image/${mimeType}`,
        } as any);
      }

      await axios.post(`${API}/profile/seller/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowSaveAvatarBtn(false);
      Alert.alert('Thành công', 'Đã lưu ảnh đại diện');
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        'Không thể lưu ảnh đại diện';
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const u = await AsyncStorage.getItem('user');
      if (!u) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        return;
      }
      const user = JSON.parse(u);

      const formData = new FormData();

      if (avatar && !avatar.startsWith('http')) {
        const uri = avatar;
        let filename = uri.split('/').pop() || `avatar_${Date.now()}.jpg`;
        if (!filename.includes('.')) filename += '.jpg';

        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;

        formData.append('avatar', {
          uri,
          name: filename,
          type: `image/${mimeType}`,
        } as any);
      }

      if (shopNameInput.trim() !== shopName.trim()) {
        formData.append('shop_name', shopNameInput.trim());
      }

      if (email.trim() && email.trim() !== initialEmail.trim()) {
        formData.append('email', email.trim());
      }

      if (password.trim()) {
        formData.append('password', password.trim());
      }

      await axios.post(`${API}/profile/seller/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await loadProfile();

      setShopName(shopNameInput);
      setModalVisible(false);
      setPassword('');
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        'Không thể cập nhật thông tin';
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('user');
          router.replace('/');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#e11d48" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <View style={{ alignItems: 'center', position: 'relative' }}>
            <TouchableOpacity onPress={pickImage}>
              <Image
              source={{ uri: avatar }}
              style={styles.avatar}
              fadeDuration={150}
              />
              <View style={styles.editAvatarOverlay}>
                <Ionicons name="camera-outline" size={24} color="#fff" />
              </View>
            </TouchableOpacity>

            {showSaveAvatarBtn && (
              <TouchableOpacity
                style={[styles.saveAvatarButton, saving && { opacity: 0.6 }]}
                onPress={saveAvatarOnly}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveAvatarText}>Lưu ảnh</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.shopName}>{shopName}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.products}</Text>
            <Text style={styles.statLabel}>Sản phẩm</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.orders}</Text>
            <Text style={styles.statLabel}>Đơn hàng</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₫{stats.revenue.toLocaleString('vi-VN')}</Text>
            <Text style={styles.statLabel}>Doanh thu</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Đang xử lý</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setModalVisible(true)}>
            <Ionicons name="storefront-outline" size={24} color="#e11d48" />
            <Text style={styles.menuText}>Thông tin cá nhân</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <Text style={[styles.menuText, { color: '#ef4444' }]}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Ionicons name="close-circle" size={36} color="#e11d48" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>

            <TextInput
              style={styles.input}
              value={shopNameInput}
              onChangeText={setShopNameInput}
              placeholder="Tên cửa hàng"
              placeholderTextColor="#9ca3af"
              editable={!saving}
            />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
              editable={!saving}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mật khẩu mới (để trống nếu không đổi)"
              secureTextEntry
              placeholderTextColor="#9ca3af"
              editable={!saving}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  editAvatarOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 16,
    backgroundColor: '#e11d48',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  saveAvatarButton: {
    marginTop: 12,
    backgroundColor: '#e11d48',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    elevation: 3,
  },
  saveAvatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  shopName: { fontSize: 24, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, gap: 12 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '48%', alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: '#6b7280' },
  menuSection: { padding: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10
  },
  menuText: { flex: 1, fontSize: 16, marginLeft: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 28,
    borderRadius: 24,
    width: '86%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
    borderRadius: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  saveBtn: {
    width: '100%',
    backgroundColor: '#e11d48',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  }
});