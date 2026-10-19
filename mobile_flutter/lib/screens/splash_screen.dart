import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'auth_screen.dart';
import 'customer_screen.dart';
import 'seller_screen.dart';
import 'admin_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  // Emblem scale & opacity
  late Animation<double> _emblemScale;
  late Animation<double> _emblemOpacity;

  // Symmetrical inward assemble of "Bid" (left) and "By" (right)
  late Animation<Offset> _bidSlide;
  late Animation<double> _bidOpacity;

  late Animation<Offset> _bySlide;
  late Animation<double> _byOpacity;

  // Burst flash when words unite in center
  late Animation<double> _burstOpacity;
  late Animation<double> _burstScale;

  // Tagline fade & expansion
  late Animation<double> _taglineOpacity;
  late Animation<double> _taglineSpacing;

  // Progress line
  late Animation<double> _progressWidth;

  Widget? _destinationScreen;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );

    // 1. Emblem zooms in dead center with spring
    _emblemScale = Tween<double>(begin: 0.25, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.52, curve: Curves.easeOutBack),
      ),
    );
    _emblemOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.38, curve: Curves.easeIn),
      ),
    );

    // 2. Symmetrical assembly into the exact center
    // "Bid" glides inwards from slightly left & rises up
    _bidSlide = Tween<Offset>(
      begin: const Offset(-0.35, 0.20),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.40, 0.72, curve: Curves.easeOutCubic),
      ),
    );
    _bidOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.40, 0.65, curve: Curves.easeIn),
      ),
    );

    // "By" glides inwards from slightly right & rises up
    _bySlide = Tween<Offset>(
      begin: const Offset(0.35, 0.20),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.40, 0.72, curve: Curves.easeOutCubic),
      ),
    );
    _byOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.40, 0.65, curve: Curves.easeIn),
      ),
    );

    // 3. Central light flash when words snap together
    _burstOpacity = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 0.85), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 0.85, end: 0.0), weight: 60),
    ]).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.62, 0.84, curve: Curves.easeInOut),
      ),
    );
    _burstScale = Tween<double>(begin: 0.4, end: 1.6).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.62, 0.84, curve: Curves.easeOut),
      ),
    );

    // 4. Tagline animation
    _taglineOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.68, 0.90, curve: Curves.easeIn),
      ),
    );
    _taglineSpacing = Tween<double>(begin: 2.0, end: 5.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.68, 0.94, curve: Curves.easeOut),
      ),
    );

    // 5. Loading progress
    _progressWidth = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.18, 0.95, curve: Curves.easeInOut),
      ),
    );

    _controller.forward();
    _prepareDestination();
  }

  Future<void> _prepareDestination() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');

    if (userStr != null) {
      try {
        final user = jsonDecode(userStr);
        final role = (user['role'] ?? '').toString().toLowerCase();
        if (role == 'admin') {
          _destinationScreen = const AdminScreen();
        } else if (role == 'customer') {
          _destinationScreen = const CustomerScreen();
        } else {
          _destinationScreen = const SellerScreen();
        }
      } catch (_) {
        _destinationScreen = const AuthScreen();
      }
    } else {
      _destinationScreen = const AuthScreen();
    }

    // Wait for the full animation sequence to be enjoyed
    await Future.delayed(const Duration(milliseconds: 2700));

    if (mounted) {
      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 600),
          pageBuilder: (context, animation, secondaryAnimation) =>
              _destinationScreen ?? const AuthScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF040815),
      body: SizedBox.expand(
        child: Stack(
          alignment: Alignment.center,
          children: [
            // 1. Center radial background glow (Perfect Center)
            Center(
              child: Container(
                width: 340,
                height: 340,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF00E5CC).withOpacity(0.18),
                      const Color(0xFF1D4ED8).withOpacity(0.12),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.55, 1.0],
                  ),
                ),
              ),
            ),

            // 2. Central Animated Content (Strictly Centered Column)
            Center(
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // --- TOP LOGO EMBLEM (Symmetrically scaled in center) ---
                      Opacity(
                        opacity: _emblemOpacity.value.clamp(0.0, 1.0),
                        child: Transform.scale(
                          scale: _emblemScale.value,
                          child: Container(
                            width: 140,
                            height: 140,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(32),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF00E5CC).withOpacity(0.35),
                                  blurRadius: 28,
                                  spreadRadius: 2,
                                  offset: const Offset(0, 8),
                                ),
                                BoxShadow(
                                  color: const Color(0xFF2563EB).withOpacity(0.4),
                                  blurRadius: 36,
                                  spreadRadius: 4,
                                  offset: const Offset(0, 12),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(32),
                              child: Image.asset(
                                'assets/images/logo.png',
                                fit: BoxFit.contain,
                              ),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 28),

                      // --- ASSEMBLED LETTERS: Centered convergence ---
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          // Central Burst Flash
                          if (_burstOpacity.value > 0.01)
                            Transform.scale(
                              scale: _burstScale.value,
                              child: Container(
                                width: 140,
                                height: 50,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(25),
                                  gradient: RadialGradient(
                                    colors: [
                                      const Color(0xFF00E5CC)
                                          .withOpacity(_burstOpacity.value),
                                      Colors.white
                                          .withOpacity(_burstOpacity.value * 0.7),
                                      Colors.transparent,
                                    ],
                                  ),
                                ),
                              ),
                            ),

                          // Symmetrical Row of Words meeting in the exact center
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // "Bid" - from slight left
                              SlideTransition(
                                position: _bidSlide,
                                child: Opacity(
                                  opacity: _bidOpacity.value.clamp(0.0, 1.0),
                                  child: const Text(
                                    'Bid',
                                    style: TextStyle(
                                      fontSize: 42,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                      letterSpacing: 1.0,
                                      shadows: [
                                        Shadow(
                                          color: Colors.black54,
                                          blurRadius: 14,
                                          offset: Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),

                              // "By" - from slight right
                              SlideTransition(
                                position: _bySlide,
                                child: Opacity(
                                  opacity: _byOpacity.value.clamp(0.0, 1.0),
                                  child: ShaderMask(
                                    shaderCallback: (bounds) =>
                                        const LinearGradient(
                                      colors: [
                                        Color(0xFF00F5D4),
                                        Color(0xFF00B4D8),
                                      ],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ).createShader(bounds),
                                    child: const Text(
                                      'By',
                                      style: TextStyle(
                                        fontSize: 42,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                        letterSpacing: 1.0,
                                        shadows: [
                                          Shadow(
                                            color: Color(0xFF00F5D4),
                                            blurRadius: 20,
                                            offset: Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      // --- SUBTITLE TAGLINE IN CENTER ---
                      Opacity(
                        opacity: _taglineOpacity.value.clamp(0.0, 1.0),
                        child: Text(
                          'REVERSE MARKETPLACE',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF94A3B8),
                            letterSpacing: _taglineSpacing.value,
                          ),
                        ),
                      ),

                      const SizedBox(height: 44),

                      // --- AMBIENT PROGRESS BAR IN CENTER ---
                      Container(
                        width: 140,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        alignment: Alignment.centerLeft,
                        child: Container(
                          width: 140 * _progressWidth.value,
                          height: 4,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                Color(0xFF2563EB),
                                Color(0xFF00E5CC),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(2),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF00E5CC).withOpacity(0.6),
                                blurRadius: 8,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),

            // 3. Bottom Centered Footer Text
            const Positioned(
              bottom: 28,
              left: 0,
              right: 0,
              child: Center(
                child: Text(
                  'Smart Auctions • Best Deals',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    color: Color(0xFF64748B),
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
