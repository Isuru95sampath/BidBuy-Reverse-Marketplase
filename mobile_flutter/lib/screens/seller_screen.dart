import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:audioplayers/audioplayers.dart';
import '../constants.dart';
import '../services/api_service.dart';
import 'chat_screen.dart';

class SellerScreen extends StatefulWidget {
  const SellerScreen({super.key});

  @override
  State<SellerScreen> createState() => _SellerScreenState();
}

class _SellerScreenState extends State<SellerScreen> {
  Map<String, dynamic>? user;
  List<dynamic> browseRequests = [];
  List<dynamic> myBids = [];
  bool isLoading = false;
  
  String activeTab = 'browse'; // 'browse' or 'placed'
  String categoryFilter = 'All';

  Timer? _timer;
  int _acceptedBidsCount = 0;
  int _totalMessagesCount = -1;
  final Set<int> _knownRequestIds = {};
  final AudioPlayer _audioPlayer = AudioPlayer();

  final List<String> categories = [
    'All', 'Electronics', 'Clothing & Fashion', 'Furniture & Home', 'Books & Education',
    'Groceries', 'Toys & Hobbies', 'Sports & Outdoors', 'Automotive', 'Health & Beauty'
  ];

  @override
  void initState() {
    super.initState();
    _loadUserAndData();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _loadUserAndData() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');
    if (userStr != null) {
      setState(() {
        user = jsonDecode(userStr);
      });
      await _fetchData(initial: true);
      await _fetchNotifications(initial: true);
      _startTimer();
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 10), (timer) {
      _pollData();
    });
  }

  Future<void> _pollData() async {
    if (!mounted) return;
    await _fetchData();
    await _fetchNotifications();
  }

  Future<void> _fetchNotifications({bool initial = false}) async {
    if (user == null) return;
    try {
      final res = await ApiService.get('/notifications?user_id=${user!['id']}&role=seller');
      if (res['statusCode'] == 200 && res['data'] != null) {
        final data = res['data'];
        final totalMessages = data['total_messages'] as int? ?? 0;
        final latestMsg = data['latest_message'] as Map<String, dynamic>?;

        if (!initial && _totalMessagesCount != -1 && totalMessages > _totalMessagesCount && latestMsg != null) {
          _playNotificationSound();
          if (mounted) {
            final sender = latestMsg['sender_name']?.toString() ?? 'Customer';
            final text = (latestMsg['message'] != null && latestMsg['message'].toString().isNotEmpty)
                ? latestMsg['message'].toString()
                : 'Sent an image attachment';
            final reqTitle = latestMsg['request_title']?.toString() ?? 'item request';

            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('💬 $sender: "$text"'),
                backgroundColor: primaryColor,
                duration: const Duration(seconds: 6),
                action: SnackBarAction(
                  label: 'Open Chat',
                  textColor: Colors.white,
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ChatScreen(
                          requestId: latestMsg['request_id'] as int,
                          requestTitle: reqTitle,
                          currentUser: user!,
                          peerUser: {
                            'id': latestMsg['sender_id'],
                            'username': sender,
                            'role': 'customer',
                          },
                        ),
                      ),
                    );
                  },
                ),
              ),
            );
          }
        }
        _totalMessagesCount = totalMessages;
      }
    } catch (_) {}
  }

  Future<void> _fetchData({bool initial = false}) async {
    if (user == null) return;
    if (initial) {
      setState(() {
        isLoading = true;
      });
    }

    final browseRes = await ApiService.get('/requests');
    final bidsRes = await ApiService.get('/bids?seller_id=${user!['id']}');

    if (initial) {
      setState(() {
        isLoading = false;
      });
    }

    if (browseRes['statusCode'] == 200) {
      final List newBrowse = browseRes['data'] as List? ?? [];
      
      // Check for newly posted customer requests
      if (!initial && _knownRequestIds.isNotEmpty) {
        final newItems = newBrowse.where((r) => !_knownRequestIds.contains(r['id'])).toList();
        if (newItems.isNotEmpty) {
          _playNotificationSound();
          if (mounted) {
            final firstNew = newItems.first;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('🔔 New Demand Alert: A customer is looking for "${firstNew['title']}" (${firstNew['category'] ?? 'General'})!'),
                backgroundColor: primaryColor,
                duration: const Duration(seconds: 5),
              ),
            );
          }
        }
      }

      for (var r in newBrowse) {
        _knownRequestIds.add(r['id']);
      }

      setState(() {
        browseRequests = newBrowse;
      });
    } else {
      final errMsg = (browseRes['data'] != null && browseRes['data']['error'] != null)
          ? browseRes['data']['error'].toString()
          : 'Failed to load requests';
      if (mounted && initial) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $errMsg')),
        );
      }
    }

    if (bidsRes['statusCode'] == 200) {
      final List newBids = bidsRes['data'] as List? ?? [];
      
      int newAcceptedCount = 0;
      for (var bid in newBids) {
        if (bid['status'] == 'accepted') {
          newAcceptedCount++;
        }
      }

      if (!initial && newAcceptedCount > _acceptedBidsCount) {
        _playNotificationSound();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🎉 Congratulations! Your bid has been ACCEPTED by the customer!'),
              backgroundColor: accentColor,
              duration: Duration(seconds: 5),
            ),
          );
        }
      }

      setState(() {
        myBids = newBids;
        _acceptedBidsCount = newAcceptedCount;
      });
    }
  }

  Future<void> _playNotificationSound() async {
    try {
      await _audioPlayer.play(UrlSource('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav'));
    } catch (_) {}
  }

  Future<void> _handleLogout() async {
    _timer?.cancel();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user');
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/auth');
    }
  }

  Future<void> _showSubmitBidDialog(Map<String, dynamic> requestItem) async {
    final priceController = TextEditingController();
    final deliveryController = TextEditingController(text: '2');
    final phoneController = TextEditingController(text: user?['phone'] ?? '');

    final isDark = themeNotifier.value == ThemeMode.dark;
    final dialogBg = Theme.of(context).cardColor;
    final textColor = isDark ? Colors.white : Colors.black87;

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: dialogBg,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.local_offer_outlined, color: primaryColor, size: 22),
              const SizedBox(width: 8),
              Text('Submit Quote (Bid)', style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Item: ${requestItem['title'] ?? 'Request'}', style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text('Customer Budget: Rs. ${requestItem['budget'] ?? 0}', style: const TextStyle(color: accentColor, fontWeight: FontWeight.w600)),
                const SizedBox(height: 14),
                TextField(
                  controller: priceController,
                  keyboardType: TextInputType.number,
                  style: TextStyle(color: textColor),
                  decoration: const InputDecoration(
                    labelText: 'Your Offer Price (Rs.)',
                    labelStyle: TextStyle(color: textSecondaryColor),
                    prefixText: 'Rs. ',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: deliveryController,
                  keyboardType: TextInputType.number,
                  style: TextStyle(color: textColor),
                  decoration: const InputDecoration(
                    labelText: 'Delivery Days Needed',
                    labelStyle: TextStyle(color: textSecondaryColor),
                    suffixText: 'days',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  style: TextStyle(color: textColor),
                  decoration: const InputDecoration(
                    labelText: 'Seller Contact Phone',
                    labelStyle: TextStyle(color: textSecondaryColor),
                    prefixIcon: Icon(Icons.phone_outlined, size: 18, color: primaryColor),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: textSecondaryColor)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: primaryColor),
              onPressed: () async {
                final priceText = priceController.text.trim();
                final deliveryText = deliveryController.text.trim();

                if (priceText.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please enter your offer price')),
                  );
                  return;
                }
                if (deliveryText.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please enter estimated delivery days')),
                  );
                  return;
                }

                final res = await ApiService.post('/requests/${requestItem['id']}/bids', {
                  'seller_id': user!['id'],
                  'price': double.tryParse(priceText) ?? 0.0,
                  'delivery_days': int.tryParse(deliveryText) ?? 1,
                  'phone': phoneController.text.trim(),
                });

                if (res['statusCode'] == 201) {
                  _fetchData();
                  if (mounted) {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Quote submitted successfully to customer!')),
                    );
                  }
                }
              },
              child: const Text('Send Quote', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredRequests = browseRequests.where((item) {
      if (categoryFilter == 'All') return true;
      return item['category'] == categoryFilter;
    }).toList();

    final isDark = themeNotifier.value == ThemeMode.dark;
    final shopName = user?['shop_name'] ?? user?['username'] ?? 'Seller';

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Seller Dashboard',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            Text(
              shopName,
              style: TextStyle(
                color: isDark ? textSecondaryColor : Colors.grey[600],
                fontSize: 12,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode : Icons.dark_mode,
              color: isDark ? Colors.white : Colors.black87,
            ),
            onPressed: () async {
              themeNotifier.value = isDark ? ThemeMode.light : ThemeMode.dark;
              final prefs = await SharedPreferences.getInstance();
              await prefs.setBool('isDarkTheme', !isDark);
              setState(() {});
            },
          ),
          IconButton(
            icon: Icon(Icons.logout, color: isDark ? Colors.white : Colors.black87),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchData,
        child: Column(
          children: [
            // Beautiful Header Image / Hero Banner
            Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF311042), Color(0xFF4F46E5)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF4F46E5).withOpacity(0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Store: $shopName 🏬',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Live customer demand! Submit competitive quotes and win deals instantly.',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '🔥 ${browseRequests.length} Leads',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: accentColor.withOpacity(0.35),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '🎯 $_acceptedBidsCount Accepted',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 36),
                  ),
                ],
              ),
            ),

            // Tab Switcher
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => activeTab = 'browse'),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: activeTab == 'browse' ? primaryColor.withOpacity(0.15) : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: activeTab == 'browse' ? primaryColor : Colors.transparent,
                          ),
                        ),
                        child: Text(
                          'Browse Requests (${browseRequests.length})',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: activeTab == 'browse' ? primaryColor : (isDark ? textSecondaryColor : Colors.grey[600]),
                            fontWeight: activeTab == 'browse' ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => activeTab = 'placed'),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: activeTab == 'placed' ? primaryColor.withOpacity(0.15) : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: activeTab == 'placed' ? primaryColor : Colors.transparent,
                          ),
                        ),
                        child: Text(
                          'My Quotes (${myBids.length})',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: activeTab == 'placed' ? primaryColor : (isDark ? textSecondaryColor : Colors.grey[600]),
                            fontWeight: activeTab == 'placed' ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            if (activeTab == 'browse') ...[
              // Category filter list
              SizedBox(
                height: 36,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: categories.length,
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    final isSelected = categoryFilter == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ChoiceChip(
                        label: Text(cat),
                        selected: isSelected,
                        selectedColor: primaryColor,
                        backgroundColor: Theme.of(context).cardColor,
                        labelStyle: TextStyle(color: isSelected ? Colors.white : (isDark ? textSecondaryColor : Colors.black87)),
                        onSelected: (selected) {
                          if (selected) {
                            setState(() {
                              categoryFilter = cat;
                            });
                          }
                        },
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),

              // Browse list
              Expanded(
                child: isLoading && browseRequests.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : filteredRequests.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32.0),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.search_off_outlined, size: 64, color: textSecondaryColor.withOpacity(0.5)),
                                  const SizedBox(height: 16),
                                  Text(
                                    categoryFilter != 'All'
                                        ? 'No active requests in "$categoryFilter".\nTry choosing "All" to see all requests!'
                                        : 'No active requests right now.\nCustomers post new requests throughout the day, check back soon!',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(color: textSecondaryColor, fontSize: 14),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: filteredRequests.length,
                            itemBuilder: (context, index) {
                              final req = filteredRequests[index];
                              final hasImage = req['image'] != null && req['image'].toString().trim().isNotEmpty;
                              final customerPhone = req['customer_phone'] ?? '';

                              return Card(
                                color: Theme.of(context).cardColor,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                margin: const EdgeInsets.only(bottom: 16),
                                elevation: 2,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Item Image Preview (if present)
                                    if (hasImage)
                                      ClipRRect(
                                        borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                                        child: Image.network(
                                          req['image'],
                                          height: 150,
                                          width: double.infinity,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                                        ),
                                      ),

                                    Padding(
                                      padding: const EdgeInsets.all(16.0),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  req['title'] ?? '',
                                                  style: TextStyle(
                                                    fontSize: 18,
                                                    fontWeight: FontWeight.bold,
                                                    color: isDark ? Colors.white : Colors.black87,
                                                  ),
                                                ),
                                              ),
                                              Chip(
                                                label: Text(
                                                  req['category'] ?? 'General',
                                                  style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 10),
                                                ),
                                                backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.grey[200],
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            req['description'] ?? '',
                                            style: TextStyle(color: isDark ? textSecondaryColor : Colors.grey[800]),
                                          ),
                                          const SizedBox(height: 10),
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text('💰 Customer Budget: Rs. ${req['budget'] ?? 0}', style: const TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
                                              Text(
                                                '📅 ${req['deadline'] ?? 'No Expiry'}',
                                                style: TextStyle(color: isDark ? textSecondaryColor : Colors.grey[600], fontSize: 11),
                                              ),
                                            ],
                                          ),
                                          if (customerPhone.toString().isNotEmpty) ...[
                                            const SizedBox(height: 6),
                                            Row(
                                              children: [
                                                const Icon(Icons.phone, size: 14, color: primaryColor),
                                                const SizedBox(width: 4),
                                                Text(
                                                  'Customer Phone: $customerPhone',
                                                  style: const TextStyle(fontSize: 11, color: primaryColor, fontWeight: FontWeight.w600),
                                                ),
                                              ],
                                            ),
                                          ],
                                          const SizedBox(height: 14),
                                          Row(
                                            children: [
                                              // Chat with Customer Button
                                              OutlinedButton.icon(
                                                style: OutlinedButton.styleFrom(
                                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                                  side: const BorderSide(color: primaryColor),
                                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                ),
                                                icon: const Icon(Icons.chat_outlined, size: 16, color: primaryColor),
                                                label: const Text('Message Customer', style: TextStyle(fontSize: 12, color: primaryColor)),
                                                onPressed: () {
                                                  Navigator.push(
                                                    context,
                                                    MaterialPageRoute(
                                                      builder: (_) => ChatScreen(
                                                        requestId: req['id'],
                                                        requestTitle: req['title'] ?? 'Request',
                                                        currentUser: user!,
                                                        peerUser: {
                                                          'id': req['customer_id'],
                                                          'username': req['customer_name'] ?? 'Customer',
                                                          'phone': customerPhone,
                                                          'role': 'customer',
                                                        },
                                                      ),
                                                    ),
                                                  );
                                                },
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: ElevatedButton(
                                                  style: ElevatedButton.styleFrom(
                                                    backgroundColor: primaryColor,
                                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                  ),
                                                  onPressed: () => _showSubmitBidDialog(req),
                                                  child: const Text('Submit Quote', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
              ),
            ] else ...[
              // My Placed Bids List
              Expanded(
                child: isLoading && myBids.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : myBids.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32.0),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.local_offer_outlined, size: 64, color: textSecondaryColor.withOpacity(0.5)),
                                  const SizedBox(height: 16),
                                  const Text(
                                    "You haven't submitted any quotes yet.\n\nTap 'Browse Requests' above to find items you can supply and send your best price!",
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: textSecondaryColor, fontSize: 14),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: myBids.length,
                            itemBuilder: (context, index) {
                              final bid = myBids[index];
                              final status = (bid['status'] ?? 'pending').toString().toUpperCase();
                              
                              Color statusCol = warningColor;
                              if (status == 'ACCEPTED') statusCol = accentColor;
                              if (status == 'REJECTED') statusCol = Colors.red;

                              return Card(
                                color: Theme.of(context).cardColor,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                margin: const EdgeInsets.only(bottom: 16),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              bid['request_title'] ?? 'Request',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                color: isDark ? Colors.white : Colors.black87,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: statusCol.withOpacity(0.15),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(status, style: TextStyle(color: statusCol, fontWeight: FontWeight.bold, fontSize: 11)),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('Your Quote: Rs. ${bid['price'] ?? 0}', style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold)),
                                          Text(
                                            'Delivery: ${bid['delivery_days'] ?? 1} days',
                                            style: TextStyle(color: isDark ? textSecondaryColor : Colors.grey[600]),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                      // Message Customer
                                      OutlinedButton.icon(
                                        style: OutlinedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          side: const BorderSide(color: primaryColor),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        ),
                                        icon: const Icon(Icons.chat_outlined, size: 14, color: primaryColor),
                                        label: const Text('Message Customer', style: TextStyle(fontSize: 11, color: primaryColor)),
                                        onPressed: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => ChatScreen(
                                                requestId: bid['request_id'],
                                                requestTitle: bid['request_title'] ?? 'Request',
                                                currentUser: user!,
                                                peerUser: {
                                                  'id': bid['customer_id'],
                                                  'username': bid['customer_username'] ?? 'Customer',
                                                  'phone': bid['customer_phone'] ?? '',
                                                  'role': 'customer',
                                                },
                                              ),
                                            ),
                                          );
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
