import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.0.2.2:5000';
const BASE_URL = 'http://10.0.2.2:5000';
const PRODUCTS_PER_PAGE = 5;

type ProductStatus = 'waiting_for_approve' | 'approved' | 'rejected' | 'inactive' | 'all';

type Category = { id: number; name: string };

type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  status: ProductStatus;
  images: string[];
  createdAt: Date;
  category_id: number;
};

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [isSellerLoaded, setIsSellerLoaded] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: 0,
    images: [] as string[],
  });

  useEffect(() => {
    const loadSeller = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setSellerId(user.id);
        }
      } catch (e) {
        console.log('Failed to load seller ID', e);
      } finally {
        setIsSellerLoaded(true);
      }
    };
    loadSeller();
  }, []);

  useEffect(() => {
    if (!isSellerLoaded || !sellerId) return;
    fetchProducts();
    fetchCategories();
  }, [isSellerLoaded, sellerId]);

  const parseVnDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    try {
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month || !year) return new Date();
      return new Date(year, month - 1, day);
    } catch {
      return new Date();
    }
  };

  const fetchProducts = async () => {
    if (!sellerId) return;
    setLoadingProducts(true);

    try {
      const res = await axios.get(`${API_BASE}/seller/${sellerId}/products`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      const list = Array.isArray(res.data) ? res.data : res.data.products || [];

      const mapped: Product[] = list.map((p: any) => ({
        id: String(p.id ?? 'unknown'),
        name: String(p.name ?? '').trim(),
        description: String(p.description ?? ''),
        price: `₫${Number(p.price ?? 0).toLocaleString('vi-VN')}`,
        stock: Number(p.stock_quantity ?? 0),
        status: (p.status as ProductStatus) || 'waiting_for_approve',
        images: Array.isArray(p.images)
          ? p.images.map((img: string) => {
              let clean = img.trim().replace(/\\/g, '/');
              return clean.startsWith('http') ? clean : `${BASE_URL}/${clean}`;
            })
          : typeof p.images === 'string'
          ? p.images
              .split(',')
              .map((x: string) => x.trim().replace(/\\/g, '/'))
              .filter(Boolean)
              .map((img) => (img.startsWith('http') ? img : `${BASE_URL}/${img}`))
          : [],
        category_id: Number(p.category_id ?? 0),
        createdAt: parseVnDate(p.created_at),
      }));

      setProducts(mapped);
      setCurrentPage(1);
    } catch (e) {
      console.log('fetchProducts error', e);
      Alert.alert('Lỗi', 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data } = await axios.get(`${API_BASE}/categories`);
      setCategories(data || []);
      if (data?.length > 0 && form.category_id === 0) {
        setForm((prev) => ({ ...prev, category_id: data[0].id }));
      }
    } catch (e) {
      console.log('Fetch categories error:', e);
    } finally {
      setLoadingCategories(false);
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Thông báo', 'Cần quyền truy cập thư viện ảnh');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const uris = result.assets
          .map((a) => a?.uri)
          .filter((uri): uri is string => !!uri);

        setForm((prev) => ({ ...prev, images: [...prev.images, ...uris] }));
      }
    } catch (e) {
      console.log('pickImages error', e);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const uploadImage = async (uri: string) => {
    const filename = uri.split('/').pop() || 'image.jpg';
    const formData = new FormData();
    formData.append('image', {
      uri,
      name: filename,
      type: 'image/jpeg',
    } as any);
    try {
      const { data } = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.stock || form.category_id === 0) return;

    const priceNum = Number(form.price);
    const stockNum = Number(form.stock);
    if (isNaN(priceNum) || priceNum <= 0 || isNaN(stockNum) || stockNum < 0) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const uri of form.images) {
        if (uri.startsWith('http')) {
          uploadedUrls.push(uri);
        } else {
          const url = await uploadImage(uri);
          if (url) uploadedUrls.push(url);
        }
      }

      const payload = {
        name: form.name,
        description: form.description,
        price: priceNum,
        stock_quantity: stockNum,
        category_id: form.category_id,
        images: uploadedUrls,
        seller_id: sellerId,
      };

      if (isEditMode && editingProductId) {
        const { data } = await axios.put(`${API_BASE}/seller/${sellerId}/product/${editingProductId}`, payload);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProductId
              ? {
                  ...p,
                  ...payload,
                  price: `₫${priceNum.toLocaleString('vi-VN')}`,
                  stock: stockNum,
                  createdAt: new Date(p.createdAt),
                }
              : p
          )
        );
      } else {
        const { data } = await axios.post(`${API_BASE}/seller/${sellerId}/products`, payload);
        setProducts((prev) => [
          {
            id: String(data.id),
            name: data.name,
            description: data.description,
            price: `₫${priceNum.toLocaleString('vi-VN')}`,
            stock: stockNum,
            status: data.status as ProductStatus,
            images: uploadedUrls,
            category_id: data.category_id,
            createdAt: new Date(),
          },
          ...prev,
        ]);
      }
      await fetchProducts();
      setForm({
        name: '',
        description: '',
        price: '',
        stock: '',
        category_id: categories[0]?.id || 0,
        images: [],
      });
      setIsEditMode(false);
      setEditingProductId(null);
      setModalVisible(false);
    } catch (e) {
      console.log(e);
      Alert.alert('Lỗi', 'Không thể lưu sản phẩm');
    } finally {
      setUploading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    Alert.alert('Xác nhận', 'Bạn chắc chắn muốn xóa sản phẩm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_BASE}/seller/${sellerId}/product/${id}`);
            setProducts((prev) => prev.filter((p) => p.id !== id));
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể xóa sản phẩm');
          }
        },
      },
    ]);
  };

  const openAdd = () => {
    setIsEditMode(false);
    setEditingProductId(null);
    setForm({
      name: '',
      description: '',
      price: '',
      stock: '',
      category_id: categories[0]?.id || 0,
      images: [],
    });
    setModalVisible(true);
  };

  const openEdit = (p: Product) => {
    setIsEditMode(true);
    setEditingProductId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price: p.price.replace(/\D/g, ''),
      stock: p.stock.toString(),
      category_id: p.category_id,
      images: p.images,
    });
    setModalVisible(true);
  };

  const filteredProducts = products.filter((p) => {
    const name = String(p.name ?? '').trim();
    const search = (searchQuery || '').toLowerCase();
    return (
      name.toLowerCase().includes(search) &&
      (selectedStatus === 'all' || p.status === selectedStatus)
    );
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  if (!sellerId) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ textAlign: 'center', marginTop: 16 }}>Đang tải thông tin người bán...</Text>
      </SafeAreaView>
    );
  }

  if (loadingProducts) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sản phẩm</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAdd}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm mã SP, tên..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.statusPickerContainer}>
          <Picker
            selectedValue={selectedStatus}
            onValueChange={(itemValue) => {
              setSelectedStatus(itemValue as ProductStatus);
              setCurrentPage(1);
            }}
            style={styles.statusPicker}
          >
            <Picker.Item label="Tất cả trạng thái" value="all" />
            <Picker.Item label="Chờ duyệt" value="waiting_for_approve" />
            <Picker.Item label="Đã duyệt" value="approved" />
            <Picker.Item label="Từ chối" value="rejected" />
          </Picker>
        </View>
      </View>

      <FlatList
        data={paginatedProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const statusConfig = {
            waiting_for_approve: { text: 'Chờ duyệt', color: '#f97316', bg: '#fff7ed' },
            approved: { text: 'Đã duyệt', color: '#16a34a', bg: '#f0fdf4' },
            rejected: { text: 'Từ chối', color: '#dc2626', bg: '#fef2f2' },
            inactive: { text: 'Tạm ngưng', color: '#6b7280', bg: '#f3f4f6' },
          };
          const status = statusConfig[item.status] || { text: 'Không xác định', color: '#64748b', bg: '#f1f5f9' };
          const catName = categories.find((c) => c.id === item.category_id)?.name || 'Không xác định';

          return (
            <View style={styles.productCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.productId}>#{item.id}</Text>
                <Text style={styles.date}>
                  {item.createdAt ? format(item.createdAt, 'dd/MM/yyyy') : 'Không xác định'}
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {item.images.length > 0 ? (
                  item.images.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.productImage} resizeMode="cover" />
                  ))
                ) : (
                  <View style={styles.noImage}>
                    <Ionicons name="image-outline" size={40} color="#d1d5db" />
                  </View>
                )}
              </ScrollView>

              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.categoryText}>Danh mục: {catName}</Text>
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.footer}>
                <Text style={styles.price}>{item.price}</Text>
                <Text style={styles.stock}>Tồn kho: {item.stock}</Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={24} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteProduct(item.id)}>
                  <Ionicons name="trash-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Không tìm thấy sản phẩm nào</Text>}
      />

      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageBtn, currentPage === 1 && styles.disabled]}
          disabled={currentPage === 1}
          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
        >
          <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#cbd5e1' : '#64748b'} />
        </TouchableOpacity>

        <Text style={styles.pageText}>
          {currentPage} / {Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE) || 1}
        </Text>

        <TouchableOpacity
          style={[
            styles.pageBtn,
            currentPage === Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE) && styles.disabled,
          ]}
          disabled={currentPage === Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)}
          onPress={() => setCurrentPage((p) => p + 1)}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              currentPage === Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
                ? '#cbd5e1'
                : '#64748b'
            }
          />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="arrow-back" size={28} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditMode ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.label}>Tên sản phẩm *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              placeholder="Nhập tên sản phẩm"
            />

            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
              multiline
              placeholder="Mô tả chi tiết sản phẩm"
            />

            <Text style={styles.label}>Giá bán (₫) *</Text>
            <TextInput
              style={styles.input}
              value={form.price}
              onChangeText={(t) => setForm({ ...form, price: t.replace(/\D/g, '') })}
              keyboardType="numeric"
              placeholder="250000"
            />

            <Text style={styles.label}>Tồn kho *</Text>
            <TextInput
              style={styles.input}
              value={form.stock}
              onChangeText={(t) => setForm({ ...form, stock: t.replace(/\D/g, '') })}
              keyboardType="numeric"
              placeholder="100"
            />

            <Text style={styles.label}>Danh mục *</Text>
            {loadingCategories ? (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 12 }} />
            ) : categories.length === 0 ? (
              <Text style={{ color: '#ef4444', marginBottom: 12 }}>Chưa có danh mục nào</Text>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: Number(v) })}
                >
                  <Picker.Item label="Chọn danh mục" value={0} />
                  {categories.map((c) => (
                    <Picker.Item key={c.id} label={c.name} value={c.id} />
                  ))}
                </Picker>
              </View>
            )}

            <Text style={styles.label}>Hình ảnh sản phẩm</Text>
            <View style={styles.imagePickerButtons}>
              <TouchableOpacity style={styles.pickerBtn} onPress={pickImages}>
                <Ionicons name="images-outline" size={24} color="#2563eb" />
                <Text style={styles.pickerBtnText}>Chọn từ thư viện</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll}>
              {form.images.map((uri, i) => (
                <View key={i} style={styles.previewWrapper}>
                  <Image
                    source={{ uri }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() =>
                      setForm((prev) => ({
                        ...prev,
                        images: prev.images.filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    <Ionicons name="close-circle" size={26} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.btnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, uploading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  statusPickerContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  statusPicker: {
    height: 50,
    width: '100%',
    color: '#1e293b',
  },
  productCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  date: {
    fontSize: 13,
    color: '#94a3b8',
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginRight: 8,
  },
  noImage: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginRight: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16a34a',
  },
  stock: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 32,
    fontSize: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageBtn: {
    padding: 8,
  },
  disabled: {
    opacity: 0.4,
  },
  pageText: {
    fontSize: 16,
    color: '#475569',
    marginHorizontal: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1e293b',
  },
  label: {
    fontSize: 14,
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePickerButtons: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
    gap: 12,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    gap: 6,
  },
  pickerBtnText: {
    color: '#2563eb',
    fontWeight: '500',
  },
  previewScroll: {
    marginBottom: 12,
  },
  previewWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});