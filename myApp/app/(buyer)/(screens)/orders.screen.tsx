import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  shop: string;
  orderDate: string;
  status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
};

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao hàng',
  completed: 'Đã giao',
  cancelled: 'Đã hủy',
};

const API_BASE = 'http://10.0.2.2:5000';

const statusColors = {
  pending: '#fef3c7',
  confirmed: '#d1fae5',
  shipping: '#dbeafe',
  completed: '#d1fae5',
  cancelled: '#fee2e2',
};

const statusTextColors = {
  pending: '#f59e0b',
  confirmed: '#059669',
  shipping: '#2563eb',
  completed: '#059669',
  cancelled: '#ef4444',
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'confirmed' | 'shipping' | 'completed'>('all');

  const loadOrders = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) return;

      const user = JSON.parse(storedUser);
      const res = await axios.get(`${API_BASE}/orders?buyer_id=${user.id}`);

      setOrders(res.data);
    } catch (e) {
      console.log('Load orders error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders().finally(() => setRefreshing(false));
  };

  const filteredOrders = orders.filter(order => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'pending') return order.status === 'pending';
    if (selectedTab === 'confirmed') return order.status === 'confirmed';
    if (selectedTab === 'shipping') return order.status === 'shipping';
    if (selectedTab === 'completed') return order.status === 'completed';
    return true;
  });

  const renderItem = ({ item }: { item: OrderItem }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.shop}>Shop: {item.shop}</Text>
        <View style={styles.row}>
          <Text style={styles.price}>
            ₫{(item.price * item.quantity).toLocaleString('vi-VN')}
          </Text>
          <Text style={styles.quantity}>x{item.quantity}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.date}>{item.orderDate}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
            <Text style={[styles.statusText, { color: statusTextColors[item.status] }]}>
              {statusLabels[item.status]}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#e11d48" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>📜 Đơn hàng của tôi</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]} 
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>Tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'pending' && styles.tabActive]} 
          onPress={() => setSelectedTab('pending')}
        >
          <Text style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}>Chờ xác nhận</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'confirmed' && styles.tabActive]} 
          onPress={() => setSelectedTab('confirmed')}
        >
          <Text style={[styles.tabText, selectedTab === 'confirmed' && styles.tabTextActive]}>Đã xác nhận</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'shipping' && styles.tabActive]} 
          onPress={() => setSelectedTab('shipping')}
        >
          <Text style={[styles.tabText, selectedTab === 'shipping' && styles.tabTextActive]}>Đang giao</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'completed' && styles.tabActive]} 
          onPress={() => setSelectedTab('completed')}
        >
          <Text style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>Đã giao</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e11d48']} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color="#94a3b8" />
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
            <Text style={styles.emptySub}>Hãy mua sắm ngay nhé!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    padding: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    paddingHorizontal: 8, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderColor: '#e5e7eb',
    flexWrap: 'wrap',
  },
  tab: { 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 20, 
    backgroundColor: '#f3f4f6' 
  },
  tabActive: { backgroundColor: '#e11d48' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginTop: 12, 
    padding: 16, 
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.06, 
    shadowRadius: 10, 
    elevation: 3 
  },
  image: { width: 90, height: 90, borderRadius: 14, backgroundColor: '#f3f4f6' },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  shop: { fontSize: 13, color: '#64748b', marginVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  price: { fontSize: 17, fontWeight: 'bold', color: '#e11d48' },
  quantity: { fontSize: 14, color: '#6b7280' },
  date: { fontSize: 13, color: '#64748b' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, color: '#94a3b8', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
});