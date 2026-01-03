import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = 'http://10.0.2.2:5000';

const PHONE_REGEX = /^(0[3|5|7|8|9][0-9]{8}|84[3|5|7|8|9][0-9]{8}|\+84[3|5|7|8|9][0-9]{8})$/;

export default function ProfileScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [currentField, setCurrentField] = useState<
    'name' | 'email' | 'address' | 'password' | 'phone' | ''
  >('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) return;

      const user = JSON.parse(storedUser);
      if (!user?.id) return;

      setUserId(user.id);

      const res = await axios.get(`${API_BASE}/profile/buyer/${user.id}`);

      setName(res.data.full_name || '');
      setEmail(res.data.email || '');
      setAddress(res.data.address_line || '');
      setRole(res.data.role || '');
      setPhone(res.data.phone || '');
    } catch (err) {
      Alert.alert('Lỗi', 'Không tải được hồ sơ');
    }
  };

  const handleSignOut = async () => {
    await AsyncStorage.removeItem('user');
    router.replace('/');
  };

  const openEditModal = (field: 'name' | 'email' | 'address' | 'password' | 'phone') => {
    setCurrentField(field);

    if (field === 'name') setInputValue(name);
    if (field === 'email') setInputValue(email);
    if (field === 'address') setInputValue(address);
    if (field === 'phone') setInputValue(phone);
    if (field === 'password') setInputValue('');

    setModalVisible(true);
  };

  const saveEdit = async () => {
    if (!userId) return;

    if (currentField === 'phone') {
      const cleanedPhone = inputValue.trim().replace(/\s+/g, '');
      if (!PHONE_REGEX.test(cleanedPhone)) {
        Alert.alert('Sai định dạng', 'Số điện thoại phải là 10 số, bắt đầu bằng 03,05,07,08,09');
        return;
      }
      const finalPhone = cleanedPhone.startsWith('84') || cleanedPhone.startsWith('+84') 
        ? cleanedPhone.replace(/^(\+?84)/, '0') 
        : cleanedPhone;
      setInputValue(finalPhone);
    }

    try {
      const payload: any = {};

      if (currentField === 'name') payload.full_name = inputValue;
      if (currentField === 'email') payload.email = inputValue;
      if (currentField === 'address') payload.address_line = inputValue;
      if (currentField === 'password') payload.password = inputValue;
      if (currentField === 'phone') payload.phone_number = inputValue;

      const res = await axios.put(`${API_BASE}/profile/buyer/${userId}`, payload);

      setName(res.data.full_name || name);
      setEmail(res.data.email || email);
      setAddress(res.data.address_line || address);
      setPhone(res.data.phone_number || phone);
      setRole(res.data.role || role);

      setModalVisible(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin!');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật');
    }
  };

  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4e8cff', '#6fb1fc']} style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name || 'Chưa có tên'}</Text>
        <Text style={styles.role}>Vị trí: {role || 'Người mua'}</Text>
      </LinearGradient>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => openEditModal('name')}>
          <Ionicons name="person-outline" size={24} color="#4e8cff" />
          <Text style={styles.menuText}>Tên: {name || 'Chưa có'}</Text>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openEditModal('email')}>
          <Ionicons name="mail-outline" size={24} color="#4e8cff" />
          <Text style={styles.menuText}>Email: {email || 'Chưa có'}</Text>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openEditModal('phone')}>
          <Ionicons name="call-outline" size={24} color="#4e8cff" />
          <Text style={styles.menuText}>SĐT: {phone || 'Chưa có'}</Text>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openEditModal('address')}>
          <Ionicons name="location-outline" size={24} color="#4e8cff" />
          <Text style={styles.menuText}>Địa chỉ: {address || 'Chưa có'}</Text>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openEditModal('password')}>
          <Ionicons name="lock-closed-outline" size={24} color="#4e8cff" />
          <Text style={styles.menuText}>Đổi mật khẩu</Text>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logout]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={[styles.menuText, { color: '#ef4444' }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {currentField === 'phone'
                ? 'Chỉnh sửa số điện thoại'
                : currentField === 'password'
                ? 'Đổi mật khẩu'
                : `Chỉnh sửa ${currentField === 'name' ? 'tên' : currentField === 'email' ? 'email' : 'địa chỉ'}`}
            </Text>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              keyboardType={currentField === 'phone' ? 'phone-pad' : 'default'}
              secureTextEntry={currentField === 'password'}
              maxLength={currentField === 'phone' ? 12 : undefined}
              placeholder={
                currentField === 'phone' ? 'Nhập số điện thoại (10 số)' :
                currentField === 'password' ? 'Nhập mật khẩu mới' :
                'Nhập thông tin mới'
              }
            />
            {currentField === 'phone' && (
              <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                Ví dụ: 0912345678 (10 số, bắt đầu 03/05/07/08/09)
              </Text>
            )}
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={saveEdit}>
                <Text style={styles.saveText}>Lưu</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fc' },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#4e8cff' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 12 },
  role: { fontSize: 16, color: '#e0e7ff', marginTop: 4 },
  menu: { marginTop: 20, paddingHorizontal: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  menuText: { flex: 1, marginLeft: 16, fontSize: 16 },
  logout: { marginTop: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  modalButtons: { flexDirection: 'row' },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    marginRight: 10,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#4e8cff',
    alignItems: 'center',
  },
  cancelText: { fontWeight: 'bold' },
  saveText: { color: '#fff', fontWeight: 'bold' },
});