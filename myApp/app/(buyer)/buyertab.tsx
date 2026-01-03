import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import HomeScreen from './(screens)/home.screen';
import OrdersScreen from './(screens)/orders.screen';
import ProfileScreen from './(screens)/profile.screen';
import CartScreen from './(screens)/carts.screen';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const CART_STORAGE_KEY = '@cart_items';

function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const cart = JSON.parse(stored);
          const total = cart.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0
          );
          setCount(total);
        } else {
          setCount(0);
        }
      } catch {
        setCount(0);
      }
    };

    loadCount();

    const interval = setInterval(loadCount, 3000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export default function BuyerTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Carts') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          const icon = <Ionicons name={iconName} size={size} color={color} />;

          if (route.name === 'Carts') {
            return (
              <View style={styles.iconContainer}>
                {icon}
                <CartBadge />
              </View>
            );
          }

          return icon;
        },
        tabBarActiveTintColor: '#4e8cff',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 2,
        },
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Carts" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -5,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});