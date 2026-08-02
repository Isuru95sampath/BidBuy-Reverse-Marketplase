import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'constants.dart';
import 'screens/auth_screen.dart';
import 'screens/customer_screen.dart';
import 'screens/seller_screen.dart';
import 'screens/admin_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Read stored theme preference
  final prefs = await SharedPreferences.getInstance();
  final isDark = prefs.getBool('isDarkTheme') ?? true;
  themeNotifier.value = isDark ? ThemeMode.dark : ThemeMode.light;

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeNotifier,
      builder: (context, currentThemeMode, child) {
        return MaterialApp(
          title: 'BidBuy',
          debugShowCheckedModeBanner: false,
          themeMode: currentThemeMode,
          theme: ThemeData(
            brightness: Brightness.light,
            primaryColor: Colors.blue,
            scaffoldBackgroundColor: const Color(0xFFF8FAFC),
            cardColor: Colors.white,
            dividerColor: Colors.grey[300],
            appBarTheme: const AppBarTheme(
              backgroundColor: Colors.white,
              foregroundColor: Colors.black,
            ),
          ),
          darkTheme: ThemeData(
            brightness: Brightness.dark,
            primaryColor: Colors.blue,
            scaffoldBackgroundColor: const Color(0xFF0F172A),
            cardColor: const Color(0xFF1E293B),
            dividerColor: const Color(0xFF334155),
            appBarTheme: const AppBarTheme(
              backgroundColor: Color(0xFF1E293B),
              foregroundColor: Colors.white,
            ),
          ),
          home: const HomeScreenRouter(),
          routes: {
            '/auth': (context) => const AuthScreen(),
            '/home': (context) => const HomeScreenRouter(),
          },
        );
      },
    );
  }
}

class HomeScreenRouter extends StatefulWidget {
  const HomeScreenRouter({super.key});

  @override
  State<HomeScreenRouter> createState() => _HomeScreenRouterState();
}

class _HomeScreenRouterState extends State<HomeScreenRouter> {
  Widget? screen;

  @override
  void initState() {
    super.initState();
    _checkRole();
  }

  Future<void> _checkRole() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');
    if (userStr != null) {
      final user = jsonDecode(userStr);
      final role = (user['role'] ?? '').toString().toLowerCase();
      setState(() {
        if (role == 'admin') {
          screen = const AdminScreen();
        } else if (role == 'customer') {
          screen = const CustomerScreen();
        } else {
          screen = const SellerScreen();
        }
      });
    } else {
      setState(() {
        screen = const AuthScreen();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (screen == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    return screen!;
  }
}
