import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../App';

export default function AdminScreen() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('stats'); // stats / users / requests / bids

  // Data States
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/stats`);
      setStats(response.data);
    } catch (err) {
      console.warn('Failed to load stats', err);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`);
      setUsers(response.data);
    } catch (err) {
      console.warn('Failed to load users', err);
    }
  };

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/requests`);
      setRequests(response.data);
    } catch (err) {
      console.warn('Failed to load requests', err);
    }
  };

  // Fetch Bids
  const fetchBids = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/bids`);
      setBids(response.data);
    } catch (err) {
      console.warn('Failed to load bids', err);
    }
  };

  const loadData = () => {
    setLoading(true);
    if (activeTab === 'stats') fetchStats().finally(() => setLoading(false));
    else if (activeTab === 'users') fetchUsers().finally(() => setLoading(false));
    else if (activeTab === 'requests') fetchRequests().finally(() => setLoading(false));
    else if (activeTab === 'bids') fetchBids().finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Moderate Delete User
  const handleDeleteUser = (userId, username) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to permanently delete user @${username}? This action will cascade delete all their requests, bids, and chat messages!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/admin/users/${userId}`);
              Alert.alert('Success', 'User deleted successfully.');
              fetchUsers();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  // Moderate Delete Request
  const handleDeleteRequest = (requestId, title) => {
    Alert.alert(
      'Delete Request',
      `Are you sure you want to delete request "${title}"? This will delete all quotes submitted for it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/admin/requests/${requestId}`);
              Alert.alert('Success', 'Request deleted successfully.');
              fetchRequests();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete request');
            }
          }
        }
      ]
    );
  };

  // Moderate Delete Bid
  const handleDeleteBid = (bidId, price) => {
    Alert.alert(
      'Delete Quote',
      `Are you sure you want to delete this bid of Rs. ${price.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/admin/bids/${bidId}`);
              Alert.alert('Success', 'Bid deleted successfully.');
              fetchBids();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete bid');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>System Admin Panel</Text>
          <Text style={styles.headerSub}>Logged: @{user.username}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
            onPress={() => setActiveTab('stats')}
          >
            <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>Stats Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Manage Users</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests List</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bids' && styles.activeTab]}
            onPress={() => setActiveTab('bids')}
          >
            <Text style={[styles.tabText, activeTab === 'bids' && styles.activeTabText]}>Quotes List</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{marginVertical: 40}} />
      ) : (
        <>
          {activeTab === 'stats' && stats && (
            <ScrollView contentContainerStyle={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Platform Users</Text>
                <Text style={styles.statValue}>{stats.users_count}</Text>
                <Text style={styles.statDetail}>Customers: {stats.customers_count} | Sellers: {stats.sellers_count}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Database File Size</Text>
                <Text style={styles.statValue}>{stats.db_size_kb.toFixed(1)} KB</Text>
                <Text style={styles.statDetail}>SQLite Database active state</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Platform Activities</Text>
                <Text style={styles.statValue}>{stats.requests_count + stats.bids_count}</Text>
                <Text style={styles.statDetail}>Requests: {stats.requests_count} | Bids: {stats.bids_count}</Text>
              </View>
            </ScrollView>
          )}

          {activeTab === 'users' && (
            <FlatList
              data={users}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View>
                    <Text style={styles.itemTitle}>@{item.username}</Text>
                    <Text style={styles.itemSub}>Role: {item.role.toUpperCase()} {item.role === 'seller' ? `(${item.shop_name})` : ''}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => handleDeleteUser(item.id, item.username)}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {activeTab === 'requests' && (
            <FlatList
              data={requests}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSub}>By: @{item.customer_name} | Category: {item.category}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => handleDeleteRequest(item.id, item.title)}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {activeTab === 'bids' && (
            <FlatList
              data={bids}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.itemTitle}>Rs. {item.price.toLocaleString()}</Text>
                    <Text style={styles.itemSub}>On: {item.request_title} | By: {item.shop_name}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => handleDeleteBid(item.id, item.price)}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  headerSub: {
    fontSize: 14,
    color: '#94a3b8',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderColor: '#1f2937',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderColor: '#3b82f6',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#3b82f6',
  },
  statsContainer: {
    padding: 20,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statDetail: {
    color: '#64748b',
    fontSize: 12,
  },
  listContainer: {
    padding: 16,
  },
  listItem: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  }
});
