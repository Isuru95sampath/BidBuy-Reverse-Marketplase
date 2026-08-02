import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants.dart';
import '../services/api_service.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  Map<String, dynamic>? stats;
  List<dynamic> users = [];
  List<dynamic> requests = [];
  List<dynamic> bids = [];
  bool isLoading = false;
  
  String activeTab = 'stats'; // 'stats' | 'users' | 'requests' | 'bids'

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      isLoading = true;
    });

    final statsRes = await ApiService.get('/admin/stats');
    final usersRes = await ApiService.get('/admin/users');
    final requestsRes = await ApiService.get('/admin/requests');
    final bidsRes = await ApiService.get('/admin/bids');

    setState(() {
      isLoading = false;
    });

    if (statsRes['statusCode'] == 200) stats = statsRes['data'];
    if (usersRes['statusCode'] == 200) users = usersRes['data'];
    if (requestsRes['statusCode'] == 200) requests = requestsRes['data'];
    if (bidsRes['statusCode'] == 200) bids = bidsRes['data'];
  }

  Future<void> _handleDeleteUser(int userId) async {
    final res = await ApiService.delete('/admin/users/$userId');
    if (res['statusCode'] == 200) _fetchData();
  }

  Future<void> _handleDeleteRequest(int reqId) async {
    final res = await ApiService.delete('/admin/requests/$reqId');
    if (res['statusCode'] == 200) _fetchData();
  }

  Future<void> _handleDeleteBid(int bidId) async {
    final res = await ApiService.delete('/admin/bids/$bidId');
    if (res['statusCode'] == 200) _fetchData();
  }

  Future<void> _handleLogout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user');
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/auth');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = themeNotifier.value == ThemeMode.dark;

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        title: Text(
          'Admin Dashboard',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
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
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    TextButton(
                      onPressed: () => setState(() => activeTab = 'stats'),
                      child: Text(
                        'Stats',
                        style: TextStyle(
                          color: activeTab == 'stats' ? primaryColor : (isDark ? textSecondaryColor : Colors.grey[600]),
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => setState(() => activeTab = 'users'),
                      child: Text(
                        'Users',
                        style: TextStyle(
                          color: activeTab == 'users' ? primaryColor : (isDark ? textSecondaryColor : Colors.grey[600]),
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => setState(() => activeTab = 'requests'),
                      child: Text(
                        'Requests',
                        style: TextStyle(
                          color: activeTab == 'requests' ? primaryColor : (isDark ? textSecondaryColor : Colors.grey[600]),
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => setState(() => activeTab = 'bids'),
                      child: Text(
                        'Quotes',
                        style: TextStyle(
                          color: activeTab == 'bids' ? primaryColor : (isDark ? textSecondaryColor : Colors.grey[600]),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            Expanded(
              child: isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : activeTab == 'stats'
                      ? _buildStatsView()
                      : activeTab == 'users'
                          ? _buildUsersView()
                          : activeTab == 'requests'
                              ? _buildRequestsView()
                              : _buildBidsView(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsView() {
    if (stats == null) return const Center(child: Text('No statistics available.', style: TextStyle(color: textSecondaryColor)));
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildStatCard('Total Users', stats!['users_count'].toString(), 'Customers: ${stats!['customers_count']} | Sellers: ${stats!['sellers_count']}'),
        _buildStatCard('Database File Size', '${(stats!['db_size_kb'] as num).toStringAsFixed(1)} KB', 'SQLite Active Storage'),
        _buildStatCard('Platform Activities', '${stats!['requests_count'] + stats!['bids_count']}', 'Requests: ${stats!['requests_count']} | Bids: ${stats!['bids_count']}'),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, String desc) {
    return Card(
      color: cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: textSecondaryColor, fontSize: 14)),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(desc, style: const TextStyle(color: textSecondaryColor, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _buildUsersView() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: users.length,
      itemBuilder: (context, index) {
        final u = users[index];
        return Card(
          color: cardColor,
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            title: Text('@${u['username']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            subtitle: Text('Role: ${u['role'].toUpperCase()} ${u['role'] == 'seller' ? "(${u['shop_name']})" : ""}', style: const TextStyle(color: textSecondaryColor)),
            trailing: IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: () => _handleDeleteUser(u['id']),
            ),
          ),
        );
      },
    );
  }

  Widget _buildRequestsView() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: requests.length,
      itemBuilder: (context, index) {
        final r = requests[index];
        return Card(
          color: cardColor,
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            title: Text(r['title'] ?? 'Request', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            subtitle: Text('By: @${r['customer_name']} | Bids: ${r['bid_count']}', style: const TextStyle(color: textSecondaryColor)),
            trailing: IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: () => _handleDeleteRequest(r['id']),
            ),
          ),
        );
      },
    );
  }

  Widget _buildBidsView() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: bids.length,
      itemBuilder: (context, index) {
        final b = bids[index];
        return Card(
          color: cardColor,
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            title: Text('Rs. ${b['price']}', style: const TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
            subtitle: Text('On: ${b['request_title']} | By: ${b['shop_name']}', style: const TextStyle(color: textSecondaryColor)),
            trailing: IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: () => _handleDeleteBid(b['id']),
            ),
          ),
        );
      },
    );
  }
}
