import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import FoodScreen from './screens/FoodScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#111',
          tabBarInactiveTintColor: '#aaa',
          tabBarStyle: { borderTopColor: '#eee' },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⌂</Text> }}
        />
        <Tab.Screen
          name="Workout"
          component={WorkoutScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>◈</Text> }}
        />
        <Tab.Screen
          name="Food"
          component={FoodScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⊛</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
