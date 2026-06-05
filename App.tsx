import { NavigationContainer, DefaultTheme, DarkTheme, type Theme as NavTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import FoodScreen from './screens/FoodScreen';
import { DateProvider } from './components/DateContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, useTheme, type Theme } from './theme';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

// Filled icon when active, outline when inactive.
function icon(active: keyof typeof Ionicons.glyphMap, inactive: keyof typeof Ionicons.glyphMap) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

// Home tab is wrapped in a native-stack so it gets a real iOS large title that
// collapses on scroll. Workout/Food stay header-less bottom-tab screens until
// PR2 reskins them.
function HomeStackScreen() {
  const t = useTheme();
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerLargeTitle: true,
        headerStyle: { backgroundColor: t.colors.bgGrouped },
        headerLargeTitleStyle: { color: t.colors.label },
        headerTitleStyle: { color: t.colors.label },
        headerTintColor: t.colors.accent,
        headerShadowVisible: false,
      }}
    >
      <HomeStack.Screen name="Today" component={HomeScreen} options={{ title: 'Today' }} />
    </HomeStack.Navigator>
  );
}

// Map the design tokens onto a react-navigation theme so scene backgrounds and
// chrome match (no white flash in dark mode).
function navThemeFrom(t: Theme): NavTheme {
  const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: t.scheme === 'dark',
    colors: {
      ...base.colors,
      primary: t.colors.accent,
      background: t.colors.bgGrouped,
      card: t.colors.card,
      text: t.colors.label,
      border: t.colors.separator,
      notification: t.colors.destructive,
    },
  };
}

function AppInner() {
  const t = useTheme();
  return (
    <NavigationContainer theme={navThemeFrom(t)}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <DateProvider>
        <Tab.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: t.colors.accent,
            tabBarInactiveTintColor: t.colors.tabInactive,
            tabBarStyle: { backgroundColor: t.colors.bg, borderTopColor: t.colors.separator },
          }}
        >
          <Tab.Screen
            name="Workout"
            component={WorkoutScreen}
            options={{ tabBarIcon: icon('barbell', 'barbell-outline') }}
          />
          <Tab.Screen
            name="Home"
            component={HomeStackScreen}
            options={{ tabBarLabel: 'Today', tabBarIcon: icon('home', 'home-outline') }}
          />
          <Tab.Screen
            name="Food"
            component={FoodScreen}
            options={{ tabBarIcon: icon('nutrition', 'nutrition-outline') }}
          />
        </Tab.Navigator>
      </DateProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
