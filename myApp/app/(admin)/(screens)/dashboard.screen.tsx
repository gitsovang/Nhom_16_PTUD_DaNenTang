import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = 'http://10.0.2.2:5000'

export default function AdminDashboardScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [isStartPickerVisible, setStartPickerVisible] = useState(false)
  const [isEndPickerVisible, setEndPickerVisible] = useState(false)

  const [stats, setStats] = useState({
    gmv: 0,
    dau: 0,
    mau: 0,
    pending_products: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async (start = null, end = null) => {
  setLoading(true)
  try {
    const u = await AsyncStorage.getItem('user')
    if (!u) return

    const params = {}

    const formatDateParam = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    if (start) params.start_date = formatDateParam(start)
    if (end) params.end_date = formatDateParam(end)

    const res = await axios.get(`${API}/admin/stats`, { params })

    setStats({
      gmv: res.data.gmv || 0,
      dau: res.data.dau || 0,
      mau: res.data.mau || 0,
      pending_products: res.data.pending_products || 0,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    setStats({ gmv: 0, dau: 0, mau: 0, pending_products: 0 })
  } finally {
    setLoading(false)
  }
  }


  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchStats(startDate, endDate).finally(() => setRefreshing(false))
  }, [startDate, endDate])

  const handleConfirmStart = (date) => {
    setStartDate(date)
    setStartPickerVisible(false)
  }

  const handleConfirmEnd = (date) => {
    setEndDate(date)
    setEndPickerVisible(false)
  }

  const handleSubmit = () => {
    if (startDate && endDate) {
      fetchStats(startDate, endDate)
    }
  }

  const formatDate = (date) => (date ? date.toLocaleDateString('vi-VN') : 'Chọn ngày')

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4e8cff" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tổng quan</Text>
          <Text style={styles.subtitle}>Xem dữ liệu theo khoảng thời gian</Text>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity onPress={() => setStartPickerVisible(true)} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>Từ: {formatDate(startDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEndPickerVisible(true)} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>Đến: {formatDate(endDate)}</Text>
          </TouchableOpacity>
        </View>

        {startDate && endDate && (
          <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Áp dụng</Text>
          </TouchableOpacity>
        )}

        <DateTimePickerModal
          isVisible={isStartPickerVisible}
          mode="date"
          onConfirm={handleConfirmStart}
          onCancel={() => setStartPickerVisible(false)}
        />
        <DateTimePickerModal
          isVisible={isEndPickerVisible}
          mode="date"
          onConfirm={handleConfirmEnd}
          onCancel={() => setEndPickerVisible(false)}
        />

        <View style={styles.statsContainer}>
          <View style={styles.largeCard}>
            <Text style={styles.cardLabel}>Tổng GMV</Text>
            <Text style={styles.largeAmount}>₫{stats.gmv.toLocaleString('vi-VN')}</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.smallCardBlue}>
              <Text style={styles.smallLabel}>DAU</Text>
              <Text style={styles.smallValue}>{stats.dau.toLocaleString()}</Text>
            </View>
            <View style={styles.smallCardGreen}>
              <Text style={styles.smallLabel}>MAU</Text>
              <Text style={styles.smallValue}>{stats.mau.toLocaleString()}</Text>
            </View>
            <View style={styles.smallCardPurple}>
              <Text style={styles.smallLabel}>Tin mới chờ duyệt</Text>
              <Text style={styles.smallValue}>{stats.pending_products}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 18, color: '#6b7280', marginTop: 8 },
  filterContainer: { flexDirection: 'row', gap: 16, paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  dateButton: { flex: 1, backgroundColor: '#e5e7eb', borderRadius: 12, padding: 12, alignItems: 'center' },
  dateButtonText: { color: '#1f2937', fontSize: 16 },
  submitButton: { backgroundColor: '#2563eb', marginHorizontal: 20, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 16 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statsContainer: { paddingHorizontal: 20, marginTop: 16 },
  largeCard: { backgroundColor: '#4e8cff', borderRadius: 16, padding: 24, marginBottom: 20 },
  cardLabel: { color: '#fff', fontSize: 16 },
  largeAmount: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 8 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  smallCardBlue: { flex: 1, backgroundColor: '#3b82f6', borderRadius: 16, padding: 20 },
  smallCardGreen: { flex: 1, backgroundColor: '#10b981', borderRadius: 16, padding: 20 },
  smallCardPurple: { flex: 1, backgroundColor: '#8b5cf6', borderRadius: 16, padding: 20 },
  smallLabel: { color: '#fff', fontSize: 14 },
  smallValue: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
})