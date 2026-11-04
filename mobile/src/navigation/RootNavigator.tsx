import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder screens (to be implemented)
const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>{name} Screen (TODO)</Text>
  </View>
);

// Navigation structure
export const RootNavigator = () => {
  // TODO: Check if user is authenticated
  // const isSignedIn = false;

  return (
    <NavigationContainer>
      {false ? (
        // Authenticated App
        <Tab.Navigator>
          <Tab.Screen
            name="Home"
            component={PlaceholderScreen}
            initialParams={{ name: 'Home' }}
          />
          <Tab.Screen
            name="Mosques"
            component={PlaceholderScreen}
            initialParams={{ name: 'Mosques' }}
          />
          <Tab.Screen
            name="Profile"
            component={PlaceholderScreen}
            initialParams={{ name: 'Profile' }}
          />
        </Tab.Navigator>
      ) : (
        // Auth Stack
        <Stack.Navigator>
          <Stack.Screen
            name="Login"
            component={PlaceholderScreen}
            initialParams={{ name: 'Login' }}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={PlaceholderScreen}
            initialParams={{ name: 'Register' }}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;

import { View, Text } from 'react-native';
