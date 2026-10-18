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
  bool _obscurePassword = true;
  
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _shopNameController = TextEditingController();
  final TextEditingController _businessNoController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  
  String _selectedCategory = 'Electronics';
  final List<String> _categories = [
    'Electronics',
    'Clothing & Fashion',
    'Furniture & Home',
    'Books & Education',
    'Groceries',
    'Toys & Hobbies',
    'Sports & Outdoors',
    'Automotive',
    'Health & Beauty',
  ];

  bool isLoading = false;

  void toggleView() {
    setState(() {
      isLogin = !isLogin;
    });
  }

  bool _isValidPhone(String phone) {
    final clean = phone.replaceAll(RegExp(r'[\s\-]'), '');
    final regex = RegExp(r'^(?:\+?94|0)?[0-9]{9,10}$');
    return clean.length >= 9 && clean.length <= 12 && regex.hasMatch(clean);
  }

  Future<void> handleSubmit() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();
    final fullName = _fullNameController.text.trim();
    final shopName = _shopNameController.text.trim();
    final businessNo = _businessNoController.text.trim();
    final phone = _phoneController.text.trim();

    if (username.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your username')),
      );
      return;
    }
    if (password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your password')),
      );
      return;
    }

    if (!isLogin) {
      if (phone.isEmpty || !_isValidPhone(phone)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter a valid 10-digit mobile number (e.g. 0771234567)')),
        );
        return;
      }

      if (role == 'seller') {
        if (fullName.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enter your full name / owner name')),
          );
          return;
        }
        if (shopName.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enter your shop or business name')),
          );
          return;
        }
      }
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
        'phone': phone,
        'full_name': fullName,
      };
      if (role == 'seller') {
        payload['shop_name'] = shopName;
        payload['business_no'] = businessNo;
        payload['category'] = _selectedCategory;
      }

      final res = await ApiService.post('/auth/register', payload);

      setState(() {
        isLoading = false;
      });

      if (res['statusCode'] == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Registered successfully! Please enter your password to log in.')),
          );
        }
        setState(() {
          isLogin = true;
          _passwordController.clear();
        });
      } else {
        final errMsg = (res['data'] != null && res['data']['error'] != null)
            ? res['data']['error'].toString()
            : 'Registration failed';
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
                  Center(
                    child: Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF3B82F6), Color(0xFF10B981)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: primaryColor.withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.shopping_bag_outlined,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const SizedBox(width: 40),
                      const Text(
                        'BidBuy',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: primaryColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                      IconButton(
                        icon: Icon(
                          isDark ? Icons.light_mode : Icons.dark_mode,
                          color: isDark ? Colors.amber : Colors.grey[700],
                          size: 22,
                        ),
                        tooltip: isDark ? 'Switch to Day Mode' : 'Switch to Night Mode',
                        onPressed: () async {
                          themeNotifier.value = isDark ? ThemeMode.light : ThemeMode.dark;
                          final prefs = await SharedPreferences.getInstance();
                          await prefs.setBool('isDarkTheme', !isDark);
                          setState(() {});
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Reverse Marketplace Hub',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      color: textSecondaryColor,
                      fontWeight: FontWeight.w500,
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
                      prefixIcon: const Icon(Icons.person_outline, color: textSecondaryColor, size: 20),
                      hintText: 'Username',
                      hintStyle: const TextStyle(color: textSecondaryColor),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Password Input with show/hide toggle
                  TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.lock_outline, color: textSecondaryColor, size: 20),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: textSecondaryColor,
                          size: 20,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                      hintText: 'Password',
                      hintStyle: const TextStyle(color: textSecondaryColor),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Registration Fields (Name & Phone)
                  if (!isLogin) ...[
                    TextField(
                      controller: _fullNameController,
                      style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.badge_outlined, color: textSecondaryColor, size: 20),
                        hintText: role == 'seller' ? 'Owner / Contact Full Name' : 'Full Name (e.g. John Silva)',
                        hintStyle: const TextStyle(color: textSecondaryColor),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.phone_outlined, color: textSecondaryColor, size: 20),
                        hintText: 'Valid Phone Number (e.g. 0771234567)',
                        hintStyle: const TextStyle(color: textSecondaryColor),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Seller Specific Inputs
                  if (!isLogin && role == 'seller') ...[
                    TextField(
                      controller: _shopNameController,
                      style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.storefront_outlined, color: textSecondaryColor, size: 20),
                        hintText: 'Shop / Business Name',
                        hintStyle: const TextStyle(color: textSecondaryColor),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Business Category Selection Dropdown
                    DropdownButtonFormField<String>(
                      value: _selectedCategory,
                      dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                      style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.category_outlined, color: textSecondaryColor, size: 20),
                        labelText: 'Your Business Category',
                        labelStyle: const TextStyle(color: textSecondaryColor),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : Colors.grey[100],
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                      items: _categories.map((cat) {
                        return DropdownMenuItem<String>(
                          value: cat,
                          child: Text(cat, style: TextStyle(color: isDark ? Colors.white : Colors.black87)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedCategory = val;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _businessNoController,
                      style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.description_outlined, color: textSecondaryColor, size: 20),
                        hintText: 'Business Reg No. (Optional)',
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
                  if (isLogin) ...[
                    const SizedBox(height: 14),
                    Text(
                      'Tip: Login as Customer, Seller, or Admin using your credentials.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: isDark ? Colors.white60 : Colors.black54),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
