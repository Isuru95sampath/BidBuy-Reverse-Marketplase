import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Modal, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import axios from 'axios';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, API_BASE_URL } from '../App';

export default function SellerScreen() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState('browse'); // browse / placed

  // Filter/Select states
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);

  // Bid Submission Input
  const [price, setPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');

  // Active Chats & Messages
  const [activeChatRequest, setActiveChatRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);

  // Self Reviews Modal
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(5.0);

  // Toast Overlay
  const [toast, setToast] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const categories = [
    'All', 'Electronics', 'Clothing & Fashion', 'Furniture & Home', 'Books & Education',
    'Groceries', 'Toys & Hobbies', 'Sports & Outdoors', 'Automotive', 'Health & Beauty'
  ];

  // Fetch Requests (Open Only)
  const fetchBrowseRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/requests`);
      // Filter out completed/accepted requests
      const openRequests = (response.data || []).filter(r => r.status === 'active' || r.status === 'pending');
      setRequests(openRequests);
    } catch (err) {
      console.warn('Failed to load requests', err);
    }
  };

  // Fetch Seller Placed Bids
  const fetchMyBids = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bids?seller_id=${user.id}`);
      setMyBids(response.data);
    } catch (err) {
      console.warn('Failed to load bids', err);
    }
  };

  // Fetch Self Reviews
  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reviews?seller_id=${user.id}`);
      setReviews(response.data);
      if (response.data.length > 0) {
        const sum = response.data.reduce((acc, curr) => acc + curr.rating, 0);
        setAvgRating((sum / response.data.length).toFixed(1));
      }
    } catch (err) {
      console.warn('Failed to load reviews', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBrowseRequests(), fetchMyBids(), fetchReviews()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchBrowseRequests();
    fetchMyBids();
    fetchReviews();
    const interval = setInterval(() => {
      fetchBrowseRequests();
      fetchMyBids();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const playChime = async () => {
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
      console.warn("Audio blocked:", e);
    }
  };

  // Poll Notifications (Accepted Bids and Chat messages)
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/notifications/check`, {
          params: { user_id: user.id, role: 'seller' }
        });
        const { bids, messages: msgList } = response.data;

        // Process Accepted Bids
        const notifiedStr = await AsyncStorage.getItem('notified_accepted') || '[]';
        const notifiedAccepted = JSON.parse(notifiedStr);
        let changed = false;

        bids.forEach(bid => {
          if (bid.status === 'accepted' && !notifiedAccepted.includes(bid.id)) {
            setToast(`🎉 Congratulations! Your bid of Rs. ${(bid.price || 0).toLocaleString()} for "${bid.request_title}" was accepted!`);
            playChime();
            notifiedAccepted.push(bid.id);
            changed = true;
          }
        });

        if (changed) {
          await AsyncStorage.setItem('notified_accepted', JSON.stringify(notifiedAccepted));
        }

        // Process Unread Messages
        const notifiedMsgStr = await AsyncStorage.getItem('notified_messages') || '[]';
        const notifiedMsgs = JSON.parse(notifiedMsgStr);
        let msgChanged = false;

        msgList.forEach(m => {
          if (!notifiedMsgs.includes(m.id)) {
            if (!showChatModal || activeChatRequest?.id !== m.request_id) {
              setToast(`✉️ New message from @${m.sender_name}: "${m.message}"`);
              playChime();
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

  // Submit Bid
  const handlePlaceBid = async () => {
    if (!price.trim() || !deliveryDays.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/bids`, {
        request_id: selectedRequest.id,
        seller_id: user.id,
        price: parseFloat(price),
        delivery_days: parseInt(deliveryDays)
      });
      Alert.alert('Success', 'Quote submitted successfully!');
      setShowBidModal(false);
      setPrice('');
      setDeliveryDays('');
      fetchMyBids();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit quote');
    }
  };

  // Open Chat
  const openChat = async (bidItem) => {
    // Generate active chat mock request object
    const reqObj = { id: bidItem.request_id, title: bidItem.request_title, customer_id: bidItem.customer_id };
    setActiveChatRequest(reqObj);
    try {
      const response = await axios.get(`${API_BASE_URL}/messages?request_id=${bidItem.request_id}`);
      setMessages(response.data);
      setShowChatModal(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to load chat history');
    }
  };

  // Polling chat
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
    try {
      const customerId = activeChatRequest?.customer_id || messages.find(m => m.sender_id !== user?.id)?.sender_id || 1;
      const response = await axios.post(`${API_BASE_URL}/messages`, {
        request_id: activeChatRequest.id,
        sender_id: user?.id,
        receiver_id: customerId,
        message: newMsg
      });
      setMessages(prev => [...prev, response.data]);
      setNewMsg('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderBrowseItem = useCallback(({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.requestTitle}>{item.title}</Text>
        <Text style={styles.requestCategory}>{item.category}</Text>
      </View>
      <Text style={styles.requestDesc}>{item.description}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailText}>💰 Budget: <Text style={{color: '#10b981', fontWeight: 'bold'}}>Rs. {(item.budget || 0).toLocaleString()}</Text></Text>
        <Text style={styles.detailText}>📅 Deadline: {item.deadline}</Text>
      </View>
      <TouchableOpacity 
        style={styles.quoteBtn} 
        onPress={() => { setSelectedRequest(item); setShowBidModal(true); }}
      >
        <Text style={styles.quoteBtnText}>⚡ Submit Quote (Bid)</Text>
      </TouchableOpacity>
    </View>
  ), [requests]);

  const renderBidItem = useCallback(({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.requestTitle}>{item.request_title}</Text>
        <Text style={[
          styles.statusLabel,
          item.status === 'accepted' ? styles.statusAccepted : item.status === 'rejected' ? styles.statusRejected : styles.statusPending
        ]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailText}>Your Quote: <Text style={{color: '#3b82f6', fontWeight: 'bold'}}>Rs. {(item.price || 0).toLocaleString()}</Text></Text>
        <Text style={styles.detailText}>Delivery: {item.delivery_days} Days</Text>
      </View>
      {item.status === 'accepted' && (
        <TouchableOpacity style={styles.chatBtn} onPress={() => openChat(item)}>
          <Text style={styles.chatBtnText}>💬 Chat with Customer</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [myBids]);

  // Filter requests
  const filteredRequests = requests.filter(r => categoryFilter === 'All' || r.category === categoryFilter);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Seller Marketplace</Text>
          <TouchableOpacity onPress={() => setShowReviewsModal(true)}>
            <Text style={styles.headerSub}>Store: {user.shop_name} (⭐ {avgRating})</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Notification Toast */}
      {toast && (
        <TouchableOpacity style={styles.toastCard} onPress={() => setToast(null)}>
          <Text style={styles.toastText}>{toast}</Text>
        </TouchableOpacity>
      )}

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>Browse Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'placed' && styles.activeTab]}
          onPress={() => setActiveTab('placed')}
        >
          <Text style={[styles.tabText, activeTab === 'placed' && styles.activeTabText]}>My Quotes</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'browse' ? (
        <>
          {/* Category Filter */}
          <View style={{height: 50, marginVertical: 10, paddingLeft: 16}}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(cat => (
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

          {/* Open Requests List */}
          <FlatList
            data={filteredRequests}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No open requests found in this category.</Text>
              </View>
            }
            renderItem={renderBrowseItem}
          />
        </>
      ) : (
        /* Placed Quotes List */
        <FlatList
          data={myBids}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't placed any quotes yet.</Text>
            </View>
          }
          renderItem={renderBidItem}
        />
      )}

      {/* Submit Bid Modal */}
      <Modal visible={showBidModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Submit Quote</Text>
            <Text style={styles.label}>Item: {selectedRequest?.title}</Text>
            <Text style={styles.label}>Customer Budget: Rs. {selectedRequest?.budget?.toLocaleString() || '0'}</Text>

            <TextInput
              placeholder="Your Price (Rs.)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              style={styles.modalInput}
              value={price}
              onChangeText={setPrice}
            />

            <TextInput
              placeholder="Delivery Time (in Days)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              style={styles.modalInput}
              value={deliveryDays}
              onChangeText={setDeliveryDays}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#374151'}]} onPress={() => setShowBidModal(false)}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#3b82f6'}]} onPress={handlePlaceBid}>
                <Text style={styles.actionText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Reviews Modal */}
      <Modal visible={showReviewsModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContainer, {maxHeight: '80%'}]}>
            <Text style={styles.modalTitle}>Self Store Reviews</Text>
            <Text style={styles.reviewsAvg}>Average Rating: ⭐ {avgRating} ({reviews.length} reviews)</Text>
            
            <FlatList
              data={reviews}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.reviewRow}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                    <Text style={{color: '#ffffff', fontWeight: 'bold', fontSize: 13}}>@{item.customer_name}</Text>
                    <Text style={{color: '#f59e0b', fontSize: 12}}>⭐ {item.rating}</Text>
                  </View>
                  <Text style={{color: '#94a3b8', fontSize: 12}}>{item.comment}</Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={{color: '#64748b', textAlign: 'center', marginVertical: 20}}>No store reviews yet.</Text>
              }
            />

            <TouchableOpacity style={styles.closeReviewsBtn} onPress={() => setShowReviewsModal(false)}>
              <Text style={styles.actionText}>Close</Text>
            </TouchableOpacity>
          </View>
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
    fontSize: 13,
    color: '#94a3b8',
    textDecorationLine: 'underline',
    marginTop: 2,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderColor: '#1f2937',
  },
  tab: {
    flex: 1,
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
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 15,
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
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  requestCategory: {
    fontSize: 10,
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
    marginBottom: 12,
  },
  detailText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  quoteBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  quoteBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
  },
  statusAccepted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
  },
  statusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
  },
  chatBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  chatBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
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
    marginBottom: 8,
    fontSize: 13,
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
  reviewsAvg: {
    color: '#f59e0b',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 16,
  },
  reviewRow: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  closeReviewsBtn: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
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
  }
});
