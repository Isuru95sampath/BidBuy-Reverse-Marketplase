import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants.dart';
import '../services/api_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool isLogin = true;
  String role = 'customer'; // 'customer' or 'seller'
  
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _shopNameController = TextEditingController();
  final TextEditingController _businessNoController = TextEditingController();
  
  bool isLoading = false;

  void toggleView() {
    setState(() {
      isLogin = !isLogin;
    });
  }

  Future<void> handleSubmit() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();
    final shopName = _shopNameController.text.trim();
    final businessNo = _businessNoController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all fields')),
      );
      return;
    }

    setState(() {
      isLoading = true;
    });

    if (isLogin) {
      // Login API call
      final res = await ApiService.post('/auth/login', {
        'username': username,
        'password': password,
      });

      setState(() {
        isLoading = false;
      });

      if (res['statusCode'] == 200 && res['data'] != null && res['data']['user'] != null) {
        final userData = res['data']['user'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user', jsonEncode(userData));
        
        if (mounted) {
          Navigator.pushReplacementNamed(context, '/home');
        }
      } else {
        final errMsg = (res['data'] != null && res['data']['error'] != null)
            ? res['data']['error'].toString()
            : 'Login failed';
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $errMsg')),
          );
        }
      }
    } else {
      // Registration API call
      final Map<String, dynamic> payload = {
        'username': username,
        'password': password,
        'role': role,
      };
      if (role == 'seller') {
        payload['shop_name'] = shopName;
        payload['business_no'] = businessNo;
      }

      final res = await ApiService.post('/auth/register', payload);

      setState(() {
        isLoading = false;
      });

      if (res['statusCode'] == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Registered successfully! Please log in.')),
          );
        }
        setState(() {
          isLogin = true;
        });
      } else {
        final errMsg = res['data']['error'] ?? 'Registration failed';
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $errMsg')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = themeNotifier.value == ThemeMode.dark;

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Card(
            color: Theme.of(context).cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 4,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 32.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'BidBuy',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: primaryColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Reverse Marketplace Hub',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: textSecondaryColor,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Login / Register Tabs
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => isLogin = true),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(
                                  color: isLogin ? primaryColor : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                            ),
                            child: Text(
                              'Log In',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: isLogin ? (isDark ? Colors.white : Colors.black87) : textSecondaryColor,
                                fontWeight: isLogin ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => isLogin = false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(
                                  color: !isLogin ? primaryColor : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                            ),
                            child: Text(
                              'Register',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: !isLogin ? (isDark ? Colors.white : Colors.black87) : textSecondaryColor,
                                fontWeight: !isLogin ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Register Role Selector
                  if (!isLogin) ...[
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              backgroundColor: role == 'customer' ? primaryColor : Colors.transparent,
                              side: BorderSide(color: role == 'customer' ? primaryColor : (isDark ? Colors.grey[800]! : Colors.grey[300]!)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () => setState(() => role = 'customer'),
                            child: Text(
                              '👤 Customer',
                              style: TextStyle(color: role == 'customer' ? Colors.white : (isDark ? textSecondaryColor : Colors.black54)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              backgroundColor: role == 'seller' ? primaryColor : Colors.transparent,
                              side: BorderSide(color: role == 'seller' ? primaryColor : (isDark ? Colors.grey[800]! : Colors.grey[300]!)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () => setState(() => role = 'seller'),
                            child: Text(
                              '🏬 Seller / Shop',
                              style: TextStyle(color: role == 'seller' ? Colors.white : (isDark ? textSecondaryColor : Colors.black54)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Username Input
                  TextField(
                    controller: _usernameController,
                    style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                    decoration: InputDecoration(
                      hintText: '👤 Username',
                      hintStyle: const TextStyle(color: textSecondaryColor),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Password Input
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                    decoration: InputDecoration(
                      hintText: '🔒 Password',
                      hintStyle: const TextStyle(color: textSecondaryColor),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Seller Specific Inputs
                  if (!isLogin && role == 'seller') ...[
                    TextField(
                      controller: _shopNameController,
                      style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                      decoration: InputDecoration(
                        hintText: '🏬 Shop / Business Name',
                        hintStyle: const TextStyle(color: textSecondaryColor),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _businessNoController,
                      style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                      decoration: InputDecoration(
                        hintText: '📝 Business Registration Number',
                        hintStyle: const TextStyle(color: textSecondaryColor),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Submit Button
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: isLoading ? null : handleSubmit,
                    child: isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Text(
                            isLogin ? 'Log In' : 'Register',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
