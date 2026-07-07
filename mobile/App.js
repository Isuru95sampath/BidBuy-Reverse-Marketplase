import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import axios from 'axios';

// Screens
import AuthScreen from './screens/AuthScreen';
import CustomerScreen from './screens/CustomerScreen';
import SellerScreen from './screens/SellerScreen';
import AdminScreen from './screens/AdminScreen';

// Live PythonAnywhere API Endpoint
export const API_BASE_URL = 'https://Sampath95.pythonanywhere.com/api';

// Create Global Auth Context
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load stored session on startup
  useEffect(() => {
    async function loadUser() {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.warn('Failed to load user session', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
    // Clear notification caches
    await AsyncStorage.removeItem('notified_bids');
    await AsyncStorage.removeItem('notified_accepted');
    await AsyncStorage.removeItem('notified_messages');
  };

  if (loading) {
    return null; // Keep splash loading
  }

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={{ user, login, logout }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
              <Stack.Screen name="Auth" component={AuthScreen} />
            ) : (
              <>
                {user.role === 'customer' && (
                  <Stack.Screen name="CustomerHome" component={CustomerScreen} />
                )}
                {user.role === 'seller' && (
                  <Stack.Screen name="SellerHome" component={SellerScreen} />
                )}
                {user.role === 'admin' && (
                  <Stack.Screen name="AdminHome" component={AdminScreen} />
                )}
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
