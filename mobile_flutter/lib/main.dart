import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'screens/auth_screen.dart';
import 'screens/customer_screen.dart';
import 'screens/seller_screen.dart';
import 'screens/admin_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Read stored user session
  final prefs = await SharedPreferences.getInstance();
  final userStr = prefs.getString('user');
  Widget initialScreen = const AuthScreen();

  if (userStr != null) {
    try {
      final user = jsonDecode(userStr);
      final role = (user['role'] ?? '').toString().toLowerCase();
      if (role == 'admin') {
        initialScreen = const AdminScreen();
      } else if (role == 'customer') {
        initialScreen = const CustomerScreen();
      } else {
        initialScreen = const SellerScreen();
      }
    } catch (e) {
      // Session parsing error
    }
  }

  runApp(MyApp(initialScreen: initialScreen));
}

class MyApp extends StatelessWidget {
  final Widget initialScreen;
  const MyApp({super.key, required this.initialScreen});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BidBuy',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        primaryColor: Colors.blue,
      ),
      home: initialScreen,
      routes: {
        '/auth': (context) => const AuthScreen(),
        '/home': (context) => const HomeScreenRouter(),
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
