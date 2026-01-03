import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.0.2.2:5000';

const getImageUrl = (imageString) => {
  if (!imageString) {
    return 'https://via.placeholder.com/340x340?text=No+Image';
  }

  let path = imageString.split(',')[0].trim();

  path = path.replace(/(http:\/\/10\.0\.2\.2:5000)+/gi, 'http://10.0.2.2:5000');

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
};

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('Không tìm thấy ID sản phẩm');
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/products/${id}`);
        
        if (!response.ok) {
          throw new Error('Không thể tải thông tin sản phẩm');
        }

        const data = await response.json();
        setProduct(data);
      } catch (err) {
        console.log('Fetch product error:', err);
        setError(err.message || 'Có lỗi xảy ra khi tải sản phẩm');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const addToCart = async () => {
    if (!product?.id) return;

    const cartProduct = {
      id: product.id.toString(),
      name: product.name || '',
      price: product.price,
      image: getImageUrl(product.image_url),
      shop: product.shop || product.seller_name || '',
      quantity: 1,
    };

    try {
      const stored = await AsyncStorage.getItem('@cart_items');
      let currentCart = stored ? JSON.parse(stored) : [];

      const existingIndex = currentCart.findIndex(item => item.id === cartProduct.id);
      if (existingIndex >= 0) {
        currentCart[existingIndex].quantity += 1;
      } else {
        currentCart.push(cartProduct);
      }

      await AsyncStorage.setItem('@cart_items', JSON.stringify(currentCart));
      Alert.alert('Thành công', 'Đã thêm vào giỏ hàng!');
    } catch (err) {
      console.log('Add to cart error:', err);
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 50 }}>
          {error || 'Không tìm thấy sản phẩm'}
        </Text>
      </SafeAreaView>
    );
  }

  const mainImage = getImageUrl(product.image_url);

  const numericPrice = Number(product.price);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: mainImage }}
          style={styles.image}
          resizeMode="cover"
          cache="reload"
        />

        <View style={styles.content}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.shop}>Shop: {product.shop || product.seller_name || 'Unknown'}</Text>
          <Text style={styles.price}>
            ₫{numericPrice.toLocaleString('vi-VN')}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
            <Text style={styles.description}>
              {product.description || 'Không có mô tả chi tiết cho sản phẩm này.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cartBtn} onPress={addToCart}>
          <Text style={styles.cartText}>Thêm vào giỏ hàng</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  image: { width: '100%', height: 340, backgroundColor: '#f3f4f6' },
  content: { padding: 16 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  shop: { color: '#64748b', marginBottom: 8, fontSize: 14 },
  price: { fontSize: 24, color: '#e11d48', fontWeight: 'bold', marginBottom: 20 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 10 },
  description: { fontSize: 15, color: '#374151', lineHeight: 22 },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  cartBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cartText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});