import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

  final List<String> categories = [
    'Electronics', 'Clothing & Fashion', 'Furniture & Home', 'Books & Education',
    'Groceries', 'Toys & Hobbies', 'Sports & Outdoors', 'Automotive', 'Health & Beauty'
  ];

  @override
  void initState() {
    super.initState();
    _loadUserAndData();
  }

  Future<void> _loadUserAndData() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');
    if (userStr != null) {
      setState(() {
        user = jsonDecode(userStr);
      });
      _fetchRequests();
    }
  }

  Future<void> _fetchRequests() async {
    if (user == null) return;
    setState(() {
      isLoading = true;
    });
    final res = await ApiService.get('/requests?customer_id=${user!['id']}');
    setState(() {
      isLoading = false;
    });
    if (res['statusCode'] == 200) {
      setState(() {
        requests = res['data'];
      });
    }
  }

  Future<void> _handleLogout() async {
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
    final deadlineController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: cardColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('New Request', style: TextStyle(color: Colors.white)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: titleController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Title',
                        labelStyle: TextStyle(color: textSecondaryColor),
                      ),
                    ),
                    TextField(
                      controller: descController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        labelStyle: TextStyle(color: textSecondaryColor),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      dropdownColor: cardColor,
                      value: selectedCategory,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Category',
                        labelStyle: TextStyle(color: textSecondaryColor),
                      ),
                      items: categories.map((cat) {
                        return DropdownMenuItem(value: cat, child: Text(cat));
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() {
                            selectedCategory = val;
                          });
                        }
                      },
                    ),
                    TextField(
                      controller: budgetController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Budget (Rs.)',
                        labelStyle: TextStyle(color: textSecondaryColor),
                      ),
                    ),
                    TextField(
                      controller: deadlineController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Deadline (e.g. YYYY-MM-DD)',
                        labelStyle: TextStyle(color: textSecondaryColor),
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
                    if (titleController.text.isEmpty || budgetController.text.isEmpty) return;
                    
                    final res = await ApiService.post('/requests', {
                      'customer_id': user!['id'],
                      'title': titleController.text.trim(),
                      'description': descController.text.trim(),
                      'category': selectedCategory,
                      'budget': double.tryParse(budgetController.text) ?? 0.0,
                      'deadline': deadlineController.text.trim(),
                    });

                    if (res['statusCode'] == 201) {
                      _fetchRequests();
                      if (mounted) Navigator.pop(ctx);
                    }
                  },
                  child: const Text('Submit', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _handleAcceptBid(int bidId, double price) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: cardColor,
        title: const Text('Confirm Deal', style: TextStyle(color: Colors.white)),
        content: Text('Are you sure you want to accept this bid of Rs. ${price.toStringAsFixed(2)}?', style: const TextStyle(color: textSecondaryColor)),
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

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: cardColor,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Customer Dashboard', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 18)),
            if (user != null)
              Text('Hello, @${user!['username']}', style: const TextStyle(color: textSecondaryColor, fontSize: 12)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
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
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: '🔍 Search requests...',
                  hintStyle: const TextStyle(color: textSecondaryColor),
                  filled: true,
                  fillColor: cardColor,
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
                      backgroundColor: cardColor,
                      labelStyle: TextStyle(color: isSelected ? Colors.white : textSecondaryColor),
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
                      ? const Center(child: Text('No requests found.', style: TextStyle(color: textSecondaryColor)))
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final req = filtered[index];
                            final bids = req['bids'] as List? ?? [];
                            final isPending = req['status'] == 'pending' || req['status'] == 'active';

                            return Card(
                              color: cardColor,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              margin: const EdgeInsets.bottom(16),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.between,
                                      children: [
                                        Text(req['title'] ?? 'Request', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                                        Chip(
                                          label: Text(req['category'] ?? 'General', style: const TextStyle(fontSize: 10, color: Colors.white)),
                                          backgroundColor: backgroundColor,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(req['description'] ?? '', style: const TextStyle(color: textSecondaryColor)),
                                    const SizedBox(height: 12),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.between,
                                      children: [
                                        Text('💰 Budget: Rs. ${(req['budget'] ?? 0).toString()}', style: const TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
                                        Text('📅 Deadline: ${req['deadline'] ?? 'No Expiry'}', style: const TextStyle(color: textSecondaryColor, fontSize: 11)),
                                      ],
                                    ),
                                    const Divider(color: backgroundColor, height: 24),
                                    Text('Quotes received (${bids.length})', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                    const SizedBox(height: 8),
                                    ...bids.map((bid) {
                                      final isAccepted = bid['status'] == 'accepted';
                                      return Container(
                                        padding: const EdgeInsets.all(10),
                                        margin: const EdgeInsets.only(bottom: 8),
                                        decoration: BoxDecoration(color: backgroundColor, borderRadius: BorderRadius.circular(8)),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.between,
                                          children: [
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(bid['shop_name'] ?? 'Shop', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                                Text('Delivery: ${bid['delivery_days']} days | Rating: ⭐ ${bid['rating']}', style: const TextStyle(color: textSecondaryColor, fontSize: 10)),
                                              ],
                                            ),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.end,
                                              children: [
                                                Text('Rs. ${bid['price']}', style: const TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
                                                if (isPending && bid['status'] != 'accepted')
                                                  ElevatedButton(
                                                    style: ElevatedButton.styleFrom(backgroundColor: primaryColor, padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2)),
                                                    onPressed: () => _handleAcceptBid(bid['id'], (bid['price'] as num).toDouble()),
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
      floatingActionButton: FloatingActionButton(
        backgroundColor: primaryColor,
        onPressed: _showAddRequestDialog,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
