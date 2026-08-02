import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:audioplayers/audioplayers.dart';
import '../constants.dart';
import '../services/api_service.dart';

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
      setState(() {
        browseRequests = browseRes['data'];
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
      
      // Calculate accepted bids count
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
    } else {
      final errMsg = (bidsRes['data'] != null && bidsRes['data']['error'] != null)
          ? bidsRes['data']['error'].toString()
          : 'Failed to load your bids';
      if (mounted && initial) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $errMsg')),
        );
      }
    }
  }

  Future<void> _playNotificationSound() async {
    try {
      await _audioPlayer.play(UrlSource('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav'));
    } catch (e) {
      // Audio playback failed
    }
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
    final deliveryController = TextEditingController();

    final isDark = themeNotifier.value == ThemeMode.dark;
    final dialogBg = Theme.of(context).cardColor;
    final textColor = isDark ? Colors.white : Colors.black87;

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: dialogBg,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Submit Quote (Bid)', style: TextStyle(color: textColor)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Item: ${requestItem['title']}', style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
              Text('Customer Budget: Rs. ${requestItem['budget']}', style: const TextStyle(color: textSecondaryColor)),
              const SizedBox(height: 12),
              TextField(
                controller: priceController,
                keyboardType: TextInputType.number,
                style: TextStyle(color: textColor),
                decoration: const InputDecoration(
                  labelText: 'Your Price (Rs.)',
                  labelStyle: TextStyle(color: textSecondaryColor),
                ),
              ),
              TextField(
                controller: deliveryController,
                keyboardType: TextInputType.number,
                style: TextStyle(color: textColor),
                decoration: const InputDecoration(
                  labelText: 'Delivery Days',
                  labelStyle: TextStyle(color: textSecondaryColor),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: textSecondaryColor)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: primaryColor),
              onPressed: () async {
                if (priceController.text.isEmpty || deliveryController.text.isEmpty) return;

                final res = await ApiService.post('/requests/${requestItem['id']}/bids', {
                  'seller_id': user!['id'],
                  'price': double.tryParse(priceController.text) ?? 0.0,
                  'delivery_days': int.tryParse(deliveryController.text) ?? 1,
                });

                if (res['statusCode'] == 201) {
                  _fetchData();
                  if (mounted) Navigator.pop(ctx);
                }
              },
              child: const Text('Submit Quote', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredRequests = browseRequests.where((r) {
      return categoryFilter == 'All' || r['category'] == categoryFilter;
    }).toList();

    final isDark = themeNotifier.value == ThemeMode.dark;

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Seller Marketplace',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            if (user != null)
              Text(
                'Store: ${user!['shop_name']}',
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
            // Tab Switcher
            Container(
              color: Theme.of(context).cardColor,
              child: Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => setState(() => activeTab = 'browse'),
                      child: Text(
                        'Browse Requests',
                        style: TextStyle(
                          color: activeTab == 'browse' ? primaryColor : (isDark ? textSecondaryColor : Colors.grey[600]),
                          fontWeight: activeTab == 'browse' ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: TextButton(
                      onPressed: () => setState(() => activeTab = 'placed'),
                      child: Text(
                        'My Quotes',
                        style: TextStyle(
                          color: activeTab == 'placed' ? primaryColor : (isDark ? textSecondaryColor : Colors.grey[600]),
                          fontWeight: activeTab == 'placed' ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

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
                        ? const Center(child: Text('No requests found.', style: TextStyle(color: textSecondaryColor)))
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: filteredRequests.length,
                            itemBuilder: (context, index) {
                              final req = filteredRequests[index];
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
                                          Text(
                                            req['title'] ?? '',
                                            style: TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.bold,
                                              color: isDark ? Colors.white : Colors.black87,
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
                                      const SizedBox(height: 8),
                                      Text(
                                        req['description'] ?? '',
                                        style: TextStyle(color: isDark ? textSecondaryColor : Colors.grey[800]),
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('💰 Budget: Rs. ${req['budget']}', style: const TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
                                          Text(
                                            '📅 Deadline: ${req['deadline'] ?? 'No Expiry'}',
                                            style: TextStyle(color: isDark ? textSecondaryColor : Colors.grey[600], fontSize: 11),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(backgroundColor: primaryColor, minimumSize: const Size.fromHeight(40)),
                                        onPressed: () => _showSubmitBidDialog(req),
                                        child: const Text('Submit Quote (Bid)', style: TextStyle(color: Colors.white)),
                                      ),
                                    ],
                                  ),
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
                        ? const Center(child: Text("You haven't placed any quotes yet.", style: TextStyle(color: textSecondaryColor)))
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
                                          Text(
                                            bid['request_title'] ?? 'Request',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: isDark ? Colors.white : Colors.black87,
                                            ),
                                          ),
                                          Text(status, style: TextStyle(color: statusCol, fontWeight: FontWeight.bold, fontSize: 12)),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('Your Quote: Rs. ${bid['price']}', style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold)),
                                          Text(
                                            'Delivery: ${bid['delivery_days']} days',
                                            style: TextStyle(color: isDark ? textSecondaryColor : Colors.grey[600]),
                                          ),
                                        ],
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
