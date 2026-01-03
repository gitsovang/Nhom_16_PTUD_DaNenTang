import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AdminDashboardScreen from './(screens)/dashboard.screen';
import AdminModerationScreen from './(screens)/moderation.screen';
import AdminUsersScreen from './(screens)/users.screen';
import ProfileScreen from './(screens)/profile.screen';

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ size, color }) => {
          const icons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
            Dashboard: 'speedometer-outline',
            Moderation: 'shield-checkmark-outline',
            Users: 'people-outline',
            Profile: 'person-outline',
          };
          const iconName = icons[route.name] ?? 'help-circle-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4e8cff',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Moderation" component={AdminModerationScreen} />
      <Tab.Screen name="Users" component={AdminUsersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
