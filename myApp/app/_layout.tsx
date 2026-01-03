import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName='index'>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(buyer)/buyertab" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)/admintab" options={{ headerShown: false }} />
        <Stack.Screen name="(seller)/sellertab" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login/index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register/index" options={{ headerShown: false }} />
        <Stack.Screen name="(buyer)/(details)/product-detail" options={{ title: 'Product Detail' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
