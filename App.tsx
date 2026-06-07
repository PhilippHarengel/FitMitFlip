import { NavigationContainer, DefaultTheme, DarkTheme, type Theme as NavTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import FoodScreen from './screens/FoodScreen';
import { DateProvider } from './components/DateContext';
import ErrorBoundary from './components/ErrorBoundary';
import { FloatingTabBar } from './components/ui';
import { ThemeProvider, useTheme, type Theme } from './theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Every tab hides its native header; each screen's centered date row (rendered
// inside Screen's pinned header) is the only header, identical across all three
// tabs so the date reads as one continuous header.
function HomeStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Today" component={HomeScreen} />
    </Stack.Navigator>
  );
}

function WorkoutStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkoutMain" component={WorkoutScreen} />
    </Stack.Navigator>
  );
}

function FoodStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FoodMain" component={FoodScreen} />
    </Stack.Navigator>
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
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Workout" component={WorkoutStackScreen} />
          <Tab.Screen name="Home" component={HomeStackScreen} />
          <Tab.Screen name="Food" component={FoodStackScreen} />
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
