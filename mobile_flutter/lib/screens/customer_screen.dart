import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:audioplayers/audioplayers.dart';
import '../constants.dart';
import '../services/api_service.dart';

class CustomerScreen extends StatefulWidget {
  const CustomerScreen({super.key});

  @override
  State<CustomerScreen> createState() => _CustomerScreenState();
}

class _CustomerScreenState extends State<CustomerScreen> {
  Map<String, dynamic>? user;
  List<dynamic> requests = [];
  bool isLoading = false;
  
  String searchQuery = '';
  String categoryFilter = 'All';

  Timer? _timer;
  int _totalBidsCount = 0;
  final AudioPlayer _audioPlayer = AudioPlayer();

  final List<String> categories = [
    'Electronics', 'Clothing & Fashion', 'Furniture & Home', 'Books & Education',
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
      await _fetchRequests(initial: true);
      _startTimer();
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 10), (timer) {
      _pollRequests();
    });
  }

  Future<void> _pollRequests() async {
    if (!mounted) return;
    await _fetchRequests();
  }

  Future<void> _fetchRequests({bool initial = false}) async {
    if (user == null) return;
    if (initial) {
      setState(() {
        isLoading = true;
      });
    }
    final res = await ApiService.get('/requests?customer_id=${user!['id']}');
    if (initial) {
      setState(() {
        isLoading = false;
      });
    }
    if (res['statusCode'] == 200) {
      final List newRequests = res['data'] as List? ?? [];
      
      // Calculate total bids count
      int newBidsCount = 0;
      for (var req in newRequests) {
        final bidsList = req['bids'] as List? ?? [];
        newBidsCount += bidsList.length;
      }

      if (!initial && newBidsCount > _totalBidsCount) {
        _playNotificationSound();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🔔 New quote received for your request! Check it out.'),
              backgroundColor: primaryColor,
              duration: Duration(seconds: 4),
            ),
          );
        }
      }

      setState(() {
        requests = newRequests;
        _totalBidsCount = newBidsCount;
      });
    } else {
      final errMsg = (res['data'] != null && res['data']['error'] != null)
          ? res['data']['error'].toString()
          : 'Failed to load requests';
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

  Future<void> _showAddRequestDialog() async {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    final budgetController = TextEditingController();
    String selectedCategory = categories.first;
    final defaultDate = DateTime.now().add(const Duration(days: 7));
    final deadlineController = TextEditingController(
      text: "${defaultDate.year}-${defaultDate.month.toString().padLeft(2, '0')}-${defaultDate.day.toString().padLeft(2, '0')}",
    );

    final isDark = themeNotifier.value == ThemeMode.dark;
    final dialogBg = Theme.of(context).cardColor;
    final textColor = isDark ? Colors.white : Colors.black87;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: dialogBg,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  const Icon(Icons.add_task, color: primaryColor, size: 24),
                  const SizedBox(width: 8),
                  Text('Post New Request', style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: titleController,
                      style: TextStyle(color: textColor),
                      decoration: const InputDecoration(
                        labelText: 'What do you need? (e.g. iPhone 13, Sofa)',
                        labelStyle: TextStyle(color: textSecondaryColor, fontSize: 13),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: descController,
                      maxLines: 2,
                      style: TextStyle(color: textColor),
                      decoration: const InputDecoration(
                        labelText: 'Details / Specifications',
                        labelStyle: TextStyle(color: textSecondaryColor, fontSize: 13),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      dropdownColor: dialogBg,
                      value: selectedCategory,
                      style: TextStyle(color: textColor),
                      decoration: const InputDecoration(
                        labelText: 'Category',
                        labelStyle: TextStyle(color: textSecondaryColor),
                      ),
                      items: categories.map((cat) {
                        return DropdownMenuItem(value: cat, child: Text(cat, style: TextStyle(color: textColor)));
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() {
                            selectedCategory = val;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: budgetController,
                      keyboardType: TextInputType.number,
                      style: TextStyle(color: textColor),
                      decoration: const InputDecoration(
                        labelText: 'Your Max Budget (Rs.)',
                        labelStyle: TextStyle(color: textSecondaryColor),
                        prefixText: 'Rs. ',
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: deadlineController,
                      readOnly: true,
                      style: TextStyle(color: textColor),
                      decoration: InputDecoration(
                        labelText: 'Deadline Date',
                        labelStyle: const TextStyle(color: textSecondaryColor),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.calendar_today, color: primaryColor, size: 20),
                          onPressed: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: defaultDate,
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) {
                              setModalState(() {
                                deadlineController.text =
                                    "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
                              });
                            }
                          },
                        ),
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
                    final title = titleController.text.trim();
                    final budgetText = budgetController.text.trim();

                    if (title.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please enter what item or service you need')),
                      );
                      return;
                    }
                    if (budgetText.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please enter your budget amount')),
                      );
                      return;
                    }

                    final res = await ApiService.post('/requests', {
                      'customer_id': user!['id'],
                      'title': title,
                      'description': descController.text.trim(),
                      'category': selectedCategory,
                      'budget': double.tryParse(budgetText) ?? 0.0,
                      'deadline': deadlineController.text.trim(),
                    });

                    if (res['statusCode'] == 201) {
                      _fetchRequests();
                      if (mounted) {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Request posted! Local sellers will send you quotes.')),
                        );
                      }
                    }
                  },
                  child: const Text('Post Request', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _handleAcceptBid(int bidId, double price) async {
    final isDark = themeNotifier.value == ThemeMode.dark;
    final dialogBg = Theme.of(context).cardColor;
    final textColor = isDark ? Colors.white : Colors.black87;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: dialogBg,
        title: Text('Confirm Deal', style: TextStyle(color: textColor)),
        content: Text('Are you sure you want to accept this bid of Rs. ${price.toStringAsFixed(2)}?', style: TextStyle(color: isDark ? textSecondaryColor : Colors.grey[700])),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Accept')),
        ],
      ),
    );

    if (confirm == true) {
      final res = await ApiService.post('/bids/$bidId/accept', {});
      if (res['statusCode'] == 200) {
        _fetchRequests();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = requests.where((item) {
      final title = (item['title'] ?? '').toString().toLowerCase();
      final desc = (item['description'] ?? '').toString().toLowerCase();
      final matchesSearch = title.contains(searchQuery.toLowerCase()) || desc.contains(searchQuery.toLowerCase());
      final matchesCategory = categoryFilter == 'All' || item['category'] == categoryFilter;
      return matchesSearch && matchesCategory;
    }).toList();

    final isDark = themeNotifier.value == ThemeMode.dark;

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Customer Dashboard',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            if (user != null)
              Text(
                'Hello, @${user!['username']}',
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
        onRefresh: _fetchRequests,
        child: Column(
          children: [
            // Search Input
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextField(
                style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                decoration: InputDecoration(
                  hintText: '🔍 Search requests...',
                  hintStyle: const TextStyle(color: textSecondaryColor),
                  filled: true,
                  fillColor: Theme.of(context).cardColor,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                ),
                onChanged: (val) {
                  setState(() {
                    searchQuery = val;
                  });
                },
              ),
            ),

            // Horizontal Category Filters
            SizedBox(
              height: 36,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: categories.length + 1,
                itemBuilder: (context, index) {
                  final cat = index == 0 ? 'All' : categories[index - 1];
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
            const SizedBox(height: 16),

            // Main Requests list
            Expanded(
              child: isLoading && requests.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : filtered.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32.0),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.shopping_bag_outlined, size: 64, color: textSecondaryColor.withOpacity(0.5)),
                                const SizedBox(height: 16),
                                Text(
                                  searchQuery.isNotEmpty || categoryFilter != 'All'
                                      ? 'No requests found matching your filters.'
                                      : 'No requests posted yet!\n\nTap "Post Request" below to post what you need and get the best quotes from sellers.',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: textSecondaryColor, fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final req = filtered[index];
                            final bids = req['bids'] as List? ?? [];
                            final isPending = req['status'] == 'pending' || req['status'] == 'active';

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
                                          req['title'] ?? 'Request',
                                          style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: isDark ? Colors.white : Colors.black87,
                                          ),
                                        ),
                                        Chip(
                                          label: Text(
                                            req['category'] ?? 'General',
                                            style: TextStyle(fontSize: 10, color: isDark ? Colors.white : Colors.black87),
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
                                        Text('💰 Budget: Rs. ${(req['budget'] ?? 0).toString()}', style: const TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
                                        Text(
                                          '📅 Deadline: ${req['deadline'] ?? 'No Expiry'}',
                                          style: TextStyle(color: isDark ? textSecondaryColor : Colors.grey[600], fontSize: 11),
                                        ),
                                      ],
                                    ),
                                    Divider(color: isDark ? const Color(0xFF0F172A) : Colors.grey[200], height: 24),
                                    Text(
                                      'Quotes received (${bids.length})',
                                      style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
                                    ),
                                    const SizedBox(height: 8),
                                    ...bids.map((bid) {
                                      final isAccepted = bid['status'] == 'accepted';
                                      return Container(
                                        padding: const EdgeInsets.all(10),
                                        margin: const EdgeInsets.only(bottom: 8),
                                        decoration: BoxDecoration(
                                          color: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  bid['shop_name'] ?? 'Shop',
                                                  style: TextStyle(
                                                    color: isDark ? Colors.white : Colors.black87,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                Text(
                                                  'Delivery: ${bid['delivery_days'] ?? 1} days | Rating: ⭐ ${bid['rating'] ?? 5.0}',
                                                  style: TextStyle(color: isDark ? textSecondaryColor : Colors.grey[600], fontSize: 10),
                                                ),
                                              ],
                                            ),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.end,
                                              children: [
                                                Text('Rs. ${bid['price'] ?? 0}', style: const TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
                                                if (isPending && bid['status'] != 'accepted')
                                                  ElevatedButton(
                                                    style: ElevatedButton.styleFrom(backgroundColor: primaryColor, padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2)),
                                                    onPressed: () => _handleAcceptBid(bid['id'], double.tryParse(bid['price'].toString()) ?? 0.0),
                                                    child: const Text('Accept', style: TextStyle(fontSize: 10, color: Colors.white)),
                                                  )
                                                else if (isAccepted)
                                                  const Text('ACCEPTED', style: TextStyle(color: accentColor, fontWeight: FontWeight.bold, fontSize: 10)),
                                              ],
                                            ),
                                          ],
                                        ),
                                      );
                                    }),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: primaryColor,
        onPressed: _showAddRequestDialog,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Post Request', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
