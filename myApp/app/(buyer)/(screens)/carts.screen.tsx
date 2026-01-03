import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import axios from 'axios';

const API_BASE = 'http://10.0.2.2:5000';

type CartItem = {
  id: string;           
  name: string;
  price: number;
  quantity: number;
  image: string;
  shop: string;
};

export default function CartScreen() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadCart = async () => {
    try {
      const stored = await AsyncStorage.getItem('@cart_items');
      setCart(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Load cart error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const updatedCart = cart.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );

    setCart(updatedCart);

    try {
      await AsyncStorage.setItem('@cart_items', JSON.stringify(updatedCart));
    } catch (error) {
      console.error('Update quantity error:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    const updatedCart = cart.filter(item => item.id !== itemId);
    setCart(updatedCart);

    try {
      await AsyncStorage.setItem('@cart_items', JSON.stringify(updatedCart));
    } catch (error) {
      console.error('Remove item error:', error);
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const buyNow = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để tiếp tục');
        return;
      }

      const user = JSON.parse(storedUser);
      const res = await axios.get(`${API_BASE}/profile/buyer/${user.id}`);

      if (!res.data.address_line) {
        Alert.alert('Thiếu địa chỉ', 'Vui lòng cập nhật địa chỉ giao hàng trước');
        return;
      }

      setProfile(res.data);
      setConfirmVisible(true);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kiểm tra thông tin');
    } finally {
      setLoading(false);
    }
  };

  const syncCartToBackend = async (buyerId: number) => {
    for (const item of cart) {
      await axios.post(`${API_BASE}/cart`, {
        buyer_id: buyerId,
        product_id: parseInt(item.id), 
        quantity: item.quantity,
      });
    }
  };

  const confirmOrder = async () => {
    setLoading(true);
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) return;

      const user = JSON.parse(storedUser);

      await syncCartToBackend(user.id);

      await axios.post(`${API_BASE}/orders`, {
        buyer_id: user.id,
      });

      await AsyncStorage.removeItem('@cart_items');
      setCart([]);
      setConfirmVisible(false);

      Alert.alert('Thành công', 'Đặt hàng thành công! 🎉');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể đặt hàng');
    } finally {
      setLoading(false);
    }
  };


  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/90' }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={2}>
            {item.name}
        </Text>
        <Text style={styles.shop}>Shop: {item.shop}</Text>
        <Text style={styles.price}>₫{item.price.toLocaleString('vi-VN')}</Text>

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={18} color="#2563eb" />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={18} color="#2563eb" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeItem(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🛒 Giỏ hàng</Text>

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={90} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Giỏ hàng của bạn đang trống</Text>
          <Text style={styles.emptyDescription}>
            Thêm sản phẩm yêu thích vào giỏ để mua sắm ngay nhé!
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />

          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Tổng tiền:</Text>
              <Text style={styles.totalPrice}>₫{totalPrice.toLocaleString('vi-VN')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutButton, loading && styles.checkoutDisabled]}
              onPress={buyNow}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkoutText}>Thanh toán</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác nhận đơn hàng</Text>

            <View style={styles.modalInfo}>
              <Text style={styles.modalLabel}>Người nhận</Text>
              <Text style={styles.modalValue}>{profile?.full_name}</Text>

              <Text style={styles.modalLabel}>Số điện thoại</Text>
              <Text style={styles.modalValue}>{profile?.phone}</Text>

              <Text style={styles.modalLabel}>Giao đến</Text>
              <Text style={styles.modalValue}>{profile?.address_line}</Text>
              <Text style={styles.modalLabel}>Phương thức thanh toán</Text>
               <Text style={styles.modalValue}>COD</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalPriceModal}>₫{totalPrice.toLocaleString('vi-VN')}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmOrder}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 140, // tăng để tránh che footer
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  shop: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    backgroundColor: '#eff6ff',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  removeBtn: {
    marginLeft: 16,
    padding: 4,
  },
  // ... phần còn lại của styles giữ nguyên
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  shopNowButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  shopNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: '#4b5563',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  checkoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutDisabled: {
    backgroundColor: '#fca5a5',
  },
  checkoutText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalInfo: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  modalValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginBottom: 24,
  },
  totalPriceModal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});