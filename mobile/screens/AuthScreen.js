import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../App';

export default function AuthScreen() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('customer'); // customer / seller
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [businessNo, setBusinessNo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && role === 'seller' && (!shopName.trim() || !businessNo.trim())) {
      Alert.alert('Error', 'Please fill in all shop registration fields');
      return;
    }

    setLoading(false);
    try {
      setLoading(true);
      if (isLogin) {
        // Log In
        const response = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
        login(response.data.user);
      } else {
        // Register
        const payload = {
          role,
          username,
          password,
          shop_name: role === 'seller' ? shopName : null,
          business_no: role === 'seller' ? businessNo : null
        };
        const response = await axios.post(`${API_BASE_URL}/auth/register`, payload);
        Alert.alert('Success', 'Registration successful! Please log in.');
        setIsLogin(true);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Authentication failed. Please try again.';
      Alert.alert('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>BidBuy</Text>
        <Text style={styles.subtitle}>Reverse Marketplace Hub</Text>

        {/* Tab Toggle between Login & Register */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, isLogin && styles.activeTab]} 
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, !isLogin && styles.activeTab]} 
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Register Role Selector */}
        {!isLogin && (
          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'customer' && styles.activeRoleBtn]}
              onPress={() => setRole('customer')}
            >
              <Text style={[styles.roleText, role === 'customer' && styles.activeRoleText]}>Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'seller' && styles.activeRoleBtn]}
              onPress={() => setRole('seller')}
            >
              <Text style={[styles.roleText, role === 'seller' && styles.activeRoleText]}>Seller</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Inputs */}
        <TextInput
          placeholder="Username"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />

        {/* Seller Specific Inputs */}
        {!isLogin && role === 'seller' && (
          <>
            <TextInput
              placeholder="Shop / Business Name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={shopName}
              onChangeText={setShopName}
            />
            <TextInput
              placeholder="Business Registration Number"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={businessNo}
              onChangeText={setBusinessNo}
            />
          </>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>{isLogin ? 'LOG IN' : 'REGISTER'}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          {isLogin ? "Don't have an account? Tap Register above" : "Already have an account? Tap Log In above"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0a0e17',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 10,
    marginBottom: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  activeRoleBtn: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  roleText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  activeRoleText: {
    color: '#3b82f6',
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  submitBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  footerNote: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 20,
  }
});
