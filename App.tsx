import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import FoodScreen from './screens/FoodScreen';
import { DateProvider } from './components/DateContext';

const Tab = createBottomTabNavigator();

// Filled when active, outline when inactive.
function icon(active: keyof typeof Ionicons.glyphMap, inactive: keyof typeof Ionicons.glyphMap) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <DateProvider>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#111',
          tabBarInactiveTintColor: '#aaa',
          tabBarStyle: { borderTopColor: '#eee' },
        }}
      >
        <Tab.Screen
          name="Workout"
          component={WorkoutScreen}
          options={{ tabBarIcon: icon('barbell', 'barbell-outline') }}
        />
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: icon('home', 'home-outline') }}
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
