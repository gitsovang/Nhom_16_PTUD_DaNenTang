import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = 'http://10.0.2.2:5000';

type Period = 'today' | 'week' | 'month';

type StatsData = {
  views: number;
  new_orders: number;
  revenue: number;
};

export default function DashboardScreen() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');

  const loadStats = async (p: Period, isInitial = false) => {
    if (isInitial) setLoading(true);

    try {
      const u = await AsyncStorage.getItem('user');
      if (!u) throw new Error('Không tìm thấy thông tin người dùng');

      const user = JSON.parse(u);

      const res = await axios.get(`${API}/dashboard/stats`, {
        params: { user_id: user.id, role: 'seller', period: p },
      });

      setStats({
        views: res.data.views || 0,
        new_orders: res.data.new_orders || 0,
        revenue: res.data.revenue || 0,
      });
    } catch (error) {
      console.error('Lỗi tải thống kê:', error);
      setStats({ views: 0, new_orders: 0, revenue: 0 });
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(period, true);
  }, []);

  useEffect(() => {
    if (!loading) {
      loadStats(period);
    }
  }, [period]);

  if (loading || !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const periodLabel =
    period === 'today'
      ? 'Hôm nay'
      : period === 'week'
      ? '7 ngày gần nhất'
      : 'Tháng này';

  const statData = [
    {
      label: 'Lượt xem sản phẩm',
      value: stats.views.toLocaleString(),
      icon: 'eye-outline' as const,
      color: '#f59e0b',
    },
    {
      label: 'Đơn hàng mới',
      value: stats.new_orders.toString(),
      icon: 'bag-outline' as const,
      color: '#dc2626',
    },
    {
      label: 'Doanh thu',
      value: '₫' + Number(stats.revenue).toLocaleString('vi-VN'),
      icon: 'cash-outline' as const,
      color: '#10b981',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Thống kê cửa hàng</Text>
          <Text style={styles.subtitle}>{periodLabel}</Text>
        </View>

        <View style={styles.periodRow}>
          {(['today', 'week', 'month'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            >
              <Text
                style={[
                  styles.periodText,
                  period === p && styles.periodTextActive,
                ]}
              >
                {p === 'today' ? 'Hôm nay' : p === 'week' ? '7 ngày' : 'Tháng'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsGrid}>
          {statData.map((item, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.iconCircle, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {item.value}
              </Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 6,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 6,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
  },
  periodBtnActive: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#ffffff',
    width: '48%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,              
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    minWidth: 100, 
  },           
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
});