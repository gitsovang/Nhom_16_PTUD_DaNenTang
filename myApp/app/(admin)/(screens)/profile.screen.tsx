import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function ProfileScreen() {
  const handleSignOut = async () => {
    await AsyncStorage.removeItem('user')
    router.replace('/')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AD</Text>
        </View>
        <Text style={styles.name}>Admin System</Text>
        <Text style={styles.role}>Quản trị viên cấp cao</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={[styles.menuItem, styles.logout]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={[styles.menuText, { color: '#ef4444' }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { alignItems: 'center', paddingTop: 40 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4e8cff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  role: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  menu: { marginTop: 40, paddingHorizontal: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuText: { flex: 1, marginLeft: 16, fontSize: 16 },
  logout: { marginTop: 32 },
})