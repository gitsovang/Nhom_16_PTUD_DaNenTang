import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from './(screens)/dashboard.screen';
import ProductsScreen from './(screens)/products.screen';
import OrdersScreen from './(screens)/orders.screen';
import ProfileScreen from './(screens)/profile.screen';

const Tab = createBottomTabNavigator();

export default function SellerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ size, color }) => {
          const icons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
            Dashboard: 'home-outline',
            Products: 'cube-outline',
            Orders: 'receipt-outline',
            Profile: 'person-outline',
          };
          const iconName = icons[route.name] ?? 'help-circle-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4e8cff',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
