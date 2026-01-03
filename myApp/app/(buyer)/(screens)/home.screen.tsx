import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = 'http://10.0.2.2:5000';

type Category = { id: number; name: string };

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  shop: string;
  description: string;
};

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories([{ id: 0, name: 'All' }, ...data]);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh mục');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      const mapped = data.map((p: any) => {
        let imageUrl = p.image_url ? p.image_url.split(',')[0].trim() : '';
        if (imageUrl.includes('http://10.0.2.2:5000http://10.0.2.2:5000')) {
          imageUrl = imageUrl.replace('http://10.0.2.2:5000http://10.0.2.2:5000', 'http://10.0.2.2:5000');
        }
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `${API_BASE}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }

        return {
          id: p.id.toString(),
          name: p.name,
          price: p.price,
          category: p.category?.name || 'Khác',
          image: imageUrl || 'https://via.placeholder.com/300x300?text=No+Image',
          shop: p.seller_name || `Shop ${p.seller_id}`,
          description: p.description || 'Không có mô tả',
        };
      });

      setProducts(mapped);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchCategory = selected === 'All' || p.category === selected;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase().trim());
    return matchCategory && matchSearch;
  });

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/product-detail',
          params: {
            id: item.id,
            name: item.name,
            price: item.price.toString(),
            image: item.image,
            shop: item.shop,
            description: item.description,
          },
        })
      }
    >
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.shop}>{item.shop}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.price}>₫{item.price.toLocaleString('vi-VN')}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Xin chào 👋</Text>
          <Text style={styles.username}>Khám phá ngay hôm nay</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#6b7280" />
        <TextInput
          placeholder="Tìm sản phẩm..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.category,
                selected === item.name && styles.categoryActive,
              ]}
              onPress={() => setSelected(item.name)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selected === item.name && styles.categoryTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
        renderItem={renderProduct}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào</Text>
        }
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
  hello: {
    fontSize: 14,
    color: '#6b7280',
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryList: {
    paddingHorizontal: 20,
  },
  category: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 10,
  },
  categoryActive: {
    backgroundColor: '#2563eb',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  categoryTextActive: {
    color: '#fff',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  productList: {
    paddingBottom: 30,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
  },
  info: {
    padding: 12,
  },
  shop: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    minHeight: 40,
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 40,
  },
});