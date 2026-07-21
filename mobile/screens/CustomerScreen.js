import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, API_BASE_URL } from '../App';

export default function CustomerScreen() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Request Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newBudget, setNewBudget] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Active Chats & Messages states
  const [selectedBid, setSelectedBid] = useState(null);
  const [activeChatRequest, setActiveChatRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const categories = [
    'Electronics', 'Clothing & Fashion', 'Furniture & Home', 'Books & Education',
    'Groceries', 'Toys & Hobbies', 'Sports & Outdoors', 'Automotive', 'Health & Beauty'
  ];

  // Load Customer Requests
  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/requests?customer_id=${user?.id}`);
      setRequests(response.data);
    } catch (err) {
      console.warn('Failed to load requests', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 8000);
    return () => clearInterval(interval);
  }, []);

  // Native notification sound
  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav' }
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.warn("Sound blocked:", e);
    }
  };

  // Poll Notifications (Bids and Messages)
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/notifications/check`, {
          params: { user_id: user.id, role: 'customer' }
        });
        const { bids, messages: msgList } = response.data;

        // Process Bids
        const notifiedStr = await AsyncStorage.getItem('notified_bids') || '[]';
        const notifiedBids = JSON.parse(notifiedStr);
        let changed = false;

        bids.forEach(bid => {
          if (!notifiedBids.includes(bid.id)) {
            setToast(`🔔 New bid of Rs. ${(bid.price || 0).toLocaleString()} from ${bid.shop_name} for "${bid.request_title}"!`);
            playSound();
            notifiedBids.push(bid.id);
            changed = true;
          }
        });

        if (changed) {
          await AsyncStorage.setItem('notified_bids', JSON.stringify(notifiedBids));
        }

        // Process Messages
        const notifiedMsgStr = await AsyncStorage.getItem('notified_messages') || '[]';
        const notifiedMsgs = JSON.parse(notifiedMsgStr);
        let msgChanged = false;

        msgList.forEach(m => {
          if (!notifiedMsgs.includes(m.id)) {
            // Show toast if chat screen is not currently open for this message
            if (!showChatModal || activeChatRequest?.id !== m.request_id) {
              setToast(`✉️ New message from @${m.sender_name}: "${m.message}"`);
              playSound();
            }
            notifiedMsgs.push(m.id);
            msgChanged = true;
          }
        });

        if (msgChanged) {
          await AsyncStorage.setItem('notified_messages', JSON.stringify(notifiedMsgs));
        }
      } catch (err) {
        console.warn('Failed notifications polling', err);
      }
    };

    const poll = setInterval(checkNotifications, 8000);
    return () => clearInterval(poll);
  }, [showChatModal, activeChatRequest]);

  // Handle Post New Request
  const handleAddRequest = async () => {
    if (!newTitle.trim() || !newBudget.trim() || !newDeadline.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/requests`, {
        customer_id: user.id,
        title: newTitle,
        description: newDesc,
        category: newCategory,
        budget: parseFloat(newBudget),
        deadline: newDeadline
      });
      Alert.alert('Success', 'Request posted successfully!');
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewBudget('');
      setNewDeadline('');
      fetchRequests();
    } catch (err) {
      Alert.alert('Error', 'Failed to submit request');
    }
  };

  // Accept Bid
  const handleAcceptBid = async (bidId, price) => {
    Alert.alert(
      'Confirm Deal',
      `Are you sure you want to accept this bid of Rs. ${(price || 0).toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await axios.post(`${API_BASE_URL}/bids/${bidId}/accept`);
              Alert.alert('Success', 'Bid accepted! Deal closed.');
              fetchRequests();
            } catch (err) {
              Alert.alert('Error', 'Failed to accept bid');
            }
          }
        }
      ]
    );
  };

  // Open Chat
  const openChat = async (requestItem, sellerId) => {
    setActiveChatRequest(requestItem);
    try {
      const response = await axios.get(`${API_BASE_URL}/messages?request_id=${requestItem.id}`);
      setMessages(response.data);
      setShowChatModal(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to load chat history');
    }
  };

  // Polling active chat messages
  useEffect(() => {
    if (!showChatModal || !activeChatRequest) return;
    const fetchChat = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/messages?request_id=${activeChatRequest.id}`);
        setMessages(response.data);
      } catch (err) {
        console.warn('Chat poll error', err);
      }
    };
    const poll = setInterval(fetchChat, 3000);
    return () => clearInterval(poll);
  }, [showChatModal, activeChatRequest]);

  // Send Message
  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    // Determine receiver (the seller of the selected bid or the one we are chatting with)
    // Find seller_id from bids
    const sellerId = (activeChatRequest?.bids || []).find(b => b.status === 'accepted' || b.status === 'pending')?.seller_id;
    if (!sellerId) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/messages`, {
        request_id: activeChatRequest.id,
        sender_id: user.id,
        receiver_id: sellerId,
        message: newMsg
      });
      setMessages(prev => [...prev, response.data]);
      setNewMsg('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderRequestItem = useCallback(({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.requestTitle}>{item.title}</Text>
        <Text style={styles.requestCategory}>{item.category}</Text>
      </View>
      <Text style={styles.requestDesc}>{item.description}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailText}>💰 Budget: <Text style={{color: '#10b981', fontWeight: 'bold'}}>Rs. ${(item.budget || 0).toLocaleString()}</Text></Text>
        <Text style={styles.detailText}>📅 Deadline: {item.deadline}</Text>
      </View>

      {/* Status Info */}
      <View style={styles.statusRow}>
        <Text style={styles.detailText}>Status: 
          <Text style={[styles.statusText, item.status === 'accepted' ? styles.statusAccepted : styles.statusPending]}>
            {" "}{item.status.toUpperCase()}
          </Text>
        </Text>
        {item.status === 'accepted' && (
          <TouchableOpacity style={styles.chatBtn} onPress={() => openChat(item)}>
            <Text style={styles.chatBtnText}>💬 Chat with Seller</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bids Section */}
      <Text style={styles.bidsTitle}>Quotes received ({(item.bids || []).length})</Text>
      {(item.bids || []).map(bid => (
        <View key={bid.id} style={styles.bidRow}>
          <View>
            <Text style={styles.bidSeller}>{bid.shop_name}</Text>
            <Text style={styles.bidDetails}>Delivery: {bid.delivery_days} days | Rating: ⭐ {bid.rating || 'N/A'}</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={styles.bidPrice}>Rs. ${(bid.price || 0).toLocaleString()}</Text>
            {item.status === 'pending' && (
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptBid(bid.id, bid.price)}>
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
            )}
            {bid.status === 'accepted' && (
              <Text style={styles.acceptedLabel}>ACCEPTED</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  ), [requests]);

  const filteredRequests = requests.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Customer Dashboard</Text>
          <Text style={styles.headerSub}>Hello, @{user?.username}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="🔍 Search requests..."
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <View style={{height: 40, marginVertical: 10, paddingLeft: 16}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['All', ...categories].map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.catBtn, categoryFilter === cat && styles.activeCatBtn]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text style={[styles.catText, categoryFilter === cat && styles.activeCatText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Floating Notification Toast */}
      {toast && (
        <TouchableOpacity style={styles.toastCard} onPress={() => setToast(null)}>
          <Text style={styles.toastText}>{toast}</Text>
        </TouchableOpacity>
      )}

      {/* Main requests list */}
      <FlatList
        data={filteredRequests}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No requests posted yet. Tap "New Request" to start receiving quotes!</Text>
          </View>
        }
        renderItem={renderRequestItem}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>+ New Request</Text>
      </TouchableOpacity>

      {/* Add Request Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Post New Request</Text>
            
            <TextInput
              placeholder="What do you need? (e.g. iPhone 15 Pro)"
              placeholderTextColor="#94a3b8"
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              placeholder="Describe details (color, specs, warranty etc.)"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              style={[styles.modalInput, {height: 80}]}
              value={newDesc}
              onChangeText={setNewDesc}
            />

            <Text style={styles.label}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {categories.map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.catBtn, newCategory === cat && styles.activeCatBtn]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text style={[styles.catText, newCategory === cat && styles.activeCatText]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              placeholder="Budget (Rs.)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              style={styles.modalInput}
              value={newBudget}
              onChangeText={setNewBudget}
            />
            <TextInput
              placeholder="Deadline (e.g. 2026-08-30)"
              placeholderTextColor="#94a3b8"
              style={styles.modalInput}
              value={newDeadline}
              onChangeText={setNewDeadline}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#374151'}]} onPress={() => setShowAddModal(false)}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#3b82f6'}]} onPress={handleAddRequest}>
                <Text style={styles.actionText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal visible={showChatModal} animationType="slide">
        <SafeAreaProvider style={{backgroundColor: '#0a0e17', flex: 1}}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatHeaderTitle}>💬 Deal Chat: {activeChatRequest?.title}</Text>
            <TouchableOpacity onPress={() => setShowChatModal(false)}>
              <Text style={{color: '#94a3b8', fontSize: 16, fontWeight: 'bold'}}>Close</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{padding: 16}}
            renderItem={({ item }) => (
              <View style={[styles.messageBubble, item.sender_id === user.id ? styles.myBubble : styles.otherBubble]}>
                <Text style={styles.msgSender}>@{item.sender_name}</Text>
                <Text style={styles.msgText}>{item.message}</Text>
              </View>
            )}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatInputRow}>
            <TextInput
              placeholder="Type message here..."
              placeholderTextColor="#94a3b8"
              style={styles.chatInput}
              value={newMsg}
              onChangeText={setNewMsg}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaProvider>
      </Modal>
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
  toastCard: {
    backgroundColor: '#1d4ed8',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderColor: '#3b82f6',
  },
  toastText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 13,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  requestCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  requestCategory: {
    fontSize: 11,
    backgroundColor: '#1e293b',
    color: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  requestDesc: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#1f2937',
    paddingTop: 10,
    marginBottom: 14,
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusAccepted: {
    color: '#10b981',
  },
  statusPending: {
    color: '#f59e0b',
  },
  chatBtn: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chatBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bidsTitle: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 8,
  },
  bidRow: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bidSeller: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bidDetails: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  bidPrice: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 14,
  },
  acceptBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  acceptedLabel: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 11,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  label: {
    color: '#94a3b8',
    marginBottom: 6,
    fontSize: 13,
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  catBtn: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  activeCatBtn: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  catText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  activeCatText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#1f2937',
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 2,
  },
  msgSender: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  msgText: {
    color: '#ffffff',
    fontSize: 14,
  },
  chatInputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  searchInput: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  catBtn: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#374151',
    height: 32,
    justifyContent: 'center',
  },
  activeCatBtn: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  catText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  activeCatText: {
    color: '#ffffff',
    fontWeight: 'bold',
  }
});
