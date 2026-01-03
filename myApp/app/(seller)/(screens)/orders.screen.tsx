import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, parseISO, isValid } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const API_BASE = 'http://10.0.2.2:5000';
const ORDERS_PER_PAGE = 10;

type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
type OrderItemDetail = {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};
type OrderDetail = {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: string;
  status: OrderStatus;
  created_at: Date;
  items: OrderItemDetail[];
};

const statusConfig: Record<OrderStatus, { text: string; color: string; bg: string }> = {
  pending: { text: 'Chờ xác nhận', color: '#f59e0b', bg: '#fffbeb' },
  confirmed: { text: 'Đã xác nhận', color: '#3b82f6', bg: '#eff6ff' },
  shipping: { text: 'Đang giao', color: '#0ea5e9', bg: '#e0f2fe' },
  completed: { text: 'Hoàn thành', color: '#10b981', bg: '#ecfdf5' },
  cancelled: { text: 'Đã hủy', color: '#ef4444', bg: '#fef2f2' },
};

const quickDateOptions = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Hôm qua', value: 'yesterday' },
  { label: '7 ngày', value: 'last7' },
  { label: '30 ngày', value: 'last30' },
];

const formatSafe = (date: Date | null | undefined, pattern: string, fallback = '—'): string => {
  if (!date || !isValid(date)) return fallback;
  return format(date, pattern);
};

const parseVnDate = (str: string | null | undefined): Date => {
  if (!str) return new Date();
  try {
    const [datePart, timePart] = str.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hour = '00', minute = '00'] = (timePart || '').split(':');
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    return isValid(parsed) ? parsed : new Date();
  } catch {
    return new Date();
  }
};

export default function OrdersScreen() {
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [quickDate, setQuickDate] = useState<string | null>('last30');
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 30));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [sellerId, setSellerId] = useState<number | null>(null);

  useEffect(() => {
    const loadSellerId = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setSellerId(user.id);
        }
      } catch {}
    };
    loadSellerId();
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const from = format(fromDate, 'yyyy-MM-dd');
      const to = format(toDate, 'yyyy-MM-dd');
      const url = `${API_BASE}/seller/${sellerId}/orders?from_date=${from}&to_date=${to}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRawOrders(data);
      const grouped: { [key: string]: OrderDetail } = {};
      data.forEach((item: any) => {
        const orderId = item.order_id.toString();
        if (!grouped[orderId]) {
          grouped[orderId] = {
            id: orderId,
            order_code: item.order_code,
            customer_name: item.buyer?.full_name || 'Khách hàng',
            customer_phone: item.buyer?.phone || '---',
            total_amount: `₫${Number(item.seller_subtotal).toLocaleString('vi-VN')}`,
            status: item.status as OrderStatus,
            created_at: parseVnDate(item.created_at),
            items: [],
          };
        }
        grouped[orderId].items.push({
          product_name: item.product.name,
          quantity: item.product.quantity,
          unit_price: item.product.price,
          subtotal: item.product.quantity * item.product.price,
        });
      });
      setOrders(Object.values(grouped));
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sellerId, fromDate, toDate]);

  useEffect(() => {
    if (sellerId) fetchOrders();
  }, [fetchOrders, sellerId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!sellerId) return;
    try {
      const res = await fetch(`${API_BASE}/seller/${sellerId}/order/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: newStatus } : prev);
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        o =>
          o.order_code.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q)
      );
    }
    if (selectedStatus !== 'all') {
      result = result.filter(o => o.status === selectedStatus);
    }
    return result.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }, [orders, searchQuery, selectedStatus]);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    switch (quickDate) {
      case 'today':
        setFromDate(today);
        setToDate(today);
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setFromDate(yesterday);
        setToDate(yesterday);
        break;
      case 'last7':
        setFromDate(subDays(today, 7));
        setToDate(today);
        break;
      case 'last30':
        setFromDate(subDays(today, 30));
        setToDate(today);
        break;
    }
    setCurrentPage(1);
  }, [quickDate]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Đơn hàng</Text>
        <View style={styles.headerCount}>
          <Text style={styles.countNumber}>{filteredOrders.length}</Text>
          <Text style={styles.countLabel}>đơn</Text>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm mã đơn, tên khách..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.statusDropdownContainer}>
          <Picker
            selectedValue={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value)}
            style={styles.statusPicker}
            dropdownIconColor="#3b82f6"
          >
            <Picker.Item label="Tất cả trạng thái" value="all" />
            <Picker.Item label="Chờ xác nhận" value="pending" />
            <Picker.Item label="Đã xác nhận" value="confirmed" />
            <Picker.Item label="Đang giao" value="shipping" />
            <Picker.Item label="Hoàn thành" value="completed" />
            <Picker.Item label="Đã hủy" value="cancelled" />
          </Picker>
        </View>

        <View style={styles.quickDatesContainer}>
          {quickDateOptions.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.quickDateButton,
                quickDate === opt.value && styles.quickDateActive
              ]}
              onPress={() => setQuickDate(opt.value)}
            >
              <Text style={[
                styles.quickDateText,
                quickDate === opt.value && styles.quickDateTextActive
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dateRangeContainer}>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowFromPicker(true)}>
            <Text style={styles.dateText}>{format(fromDate, 'dd/MM/yyyy')}</Text>
          </TouchableOpacity>
          <Text style={styles.dateToText}>đến</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowToPicker(true)}>
            <Text style={styles.dateText}>{format(toDate, 'dd/MM/yyyy')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={paginatedOrders}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
            <Text style={styles.emptySubtitle}>Đơn hàng sẽ hiển thị tại đây</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusItem = statusConfig[item.status];
          return (
            <TouchableOpacity
              style={styles.orderCard}
              activeOpacity={0.8}
              onPress={() => setSelectedOrder(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.orderCode}>#{item.order_code}</Text>
                <Text style={styles.orderDate}>
                  {formatSafe(item.created_at, 'dd/MM/yyyy · HH:mm')}
                </Text>
              </View>
              <Text style={styles.customerName} numberOfLines={1}>
                {item.customer_name}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.totalPrice}>{item.total_amount}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusItem.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusItem.color }]}>
                    {statusItem.text}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContent}>
            {selectedOrder && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>Chi tiết đơn hàng</Text>
                  <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                    <Ionicons name="close" size={28} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.detailBody}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Mã đơn hàng</Text>
                    <Text style={styles.detailValue}>#{selectedOrder.order_code}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Ngày tạo</Text>
                    <Text style={styles.detailValue}>
                      {formatSafe(selectedOrder.created_at, 'dd/MM/yyyy HH:mm')}
                    </Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Khách hàng</Text>
                    <Text style={styles.detailValue}>{selectedOrder.customer_name}</Text>
                    <Text style={styles.detailSubValue}>SĐT: {selectedOrder.customer_phone}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Sản phẩm</Text>
                    {selectedOrder.items.map((it, index) => (
                      <View key={index} style={styles.productItem}>
                        <Text style={styles.productName}>{it.product_name}</Text>
                        <Text style={styles.productInfo}>
                          Số lượng: {it.quantity} × ₫{Number(it.unit_price).toLocaleString('vi-VN')}
                        </Text>
                        <Text style={styles.productSubtotal}>
                          Subtotal: ₫{Number(it.subtotal).toLocaleString('vi-VN')}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Tổng tiền</Text>
                    <Text style={styles.detailTotal}>{selectedOrder.total_amount}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Trạng thái</Text>
                    <View style={styles.statusDropdownContainer}>
                      <Picker
                        selectedValue={selectedOrder.status}
                        onValueChange={(itemValue) => {
                          if (itemValue !== selectedOrder.status) {
                            updateOrderStatus(selectedOrder.id, itemValue as OrderStatus);
                          }
                        }}
                        style={styles.statusPicker}
                        dropdownIconColor="#3b82f6"
                      >
                        <Picker.Item
                          label={statusConfig[selectedOrder.status].text}
                          value={selectedOrder.status}
                          color={statusConfig[selectedOrder.status].color}
                        />
                        {Object.entries(statusConfig)
                          .filter(([key]) => key !== selectedOrder.status)
                          .map(([key, value]) => (
                            <Picker.Item
                              key={key}
                              label={value.text}
                              value={key}
                              color={value.color}
                            />
                          ))}
                      </Picker>
                    </View>
                  </View>
                </ScrollView>
                <View style={styles.detailFooter}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedOrder(null)}
                  >
                    <Text style={styles.closeButtonText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === 1 && styles.pageDisabled]}
            disabled={currentPage === 1}
            onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <Ionicons name="chevron-back" size={22} color={currentPage === 1 ? '#d1d5db' : '#4b5563'} />
          </TouchableOpacity>
          <Text style={styles.pageInfo}>{currentPage} / {totalPages}</Text>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === totalPages && styles.pageDisabled]}
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            <Ionicons name="chevron-forward" size={22} color={currentPage === totalPages ? '#d1d5db' : '#4b5563'} />
          </TouchableOpacity>
        </View>
      )}

      <DateTimePickerModal
        isVisible={showFromPicker}
        mode="date"
        onConfirm={date => {
          setShowFromPicker(false);
          setFromDate(date);
          setQuickDate(null);
        }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showToPicker}
        mode="date"
        onConfirm={date => {
          setShowToPicker(false);
          setToDate(date);
          setQuickDate(null);
        }}
        onCancel={() => setShowToPicker(false)}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
  },
  countLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 10,
  },
  statusDropdownContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 12,
  },
  statusPicker: {
    height: 50,
    color: '#111827',
  },
  quickDatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickDateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  quickDateActive: {
    backgroundColor: '#3b82f6',
  },
  quickDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  quickDateTextActive: {
    color: '#ffffff',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  dateToText: {
    paddingHorizontal: 12,
    color: '#9ca3af',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCode: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  orderDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  customerName: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPrice: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ec4899',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  detailBody: {
    paddingHorizontal: 24,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  productItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  productInfo: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  productSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ec4899',
    marginTop: 4,
  },
  detailTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ec4899',
  },
  currentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  currentStatusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  detailFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  closeButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 32,
  },
  pageButton: {
    padding: 8,
  },
  pageDisabled: {
    opacity: 0.4,
  },
  pageInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});