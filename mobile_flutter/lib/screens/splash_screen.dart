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

  // Gavel slight rotation pulse
  late Animation<double> _gavelRotation;

  // "Bid" text slide & fade (from left)
  late Animation<Offset> _bidSlide;
  late Animation<double> _bidOpacity;

  // "By" text slide & fade (from right)
  late Animation<Offset> _bySlide;
  late Animation<double> _byOpacity;

  // Flash / Glow burst when letters unite
  late Animation<double> _burstOpacity;
  late Animation<double> _burstScale;

  // Tagline fade & letter spacing
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

    // 1. Emblem zooms in with elastic spring
    _emblemScale = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.50, curve: Curves.easeOutBack),
      ),
    );
    _emblemOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.35, curve: Curves.easeIn),
      ),
    );

    // 2. Gavel hammer tilt strike
    _gavelRotation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: -0.08), weight: 30),
      TweenSequenceItem(tween: Tween(begin: -0.08, end: 0.05), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 0.05, end: 0.0), weight: 30),
    ]).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.35, 0.65, curve: Curves.easeInOut),
      ),
    );

    // 3. Letters Assemble: "Bid" flies from left
    _bidSlide = Tween<Offset>(begin: const Offset(-0.8, 0.0), end: Offset.zero)
        .animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.40, 0.70, curve: Curves.easeOutCubic),
      ),
    );
    _bidOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.40, 0.60, curve: Curves.easeIn),
      ),
    );

    // 4. Letters Assemble: "By" flies from right
    _bySlide = Tween<Offset>(begin: const Offset(0.8, 0.0), end: Offset.zero)
        .animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.45, 0.72, curve: Curves.easeOutCubic),
      ),
    );
    _byOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.45, 0.62, curve: Curves.easeIn),
      ),
    );

    // 5. Burst light flash when letters touch
    _burstOpacity = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 0.8), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 0.8, end: 0.0), weight: 60),
    ]).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.60, 0.82, curve: Curves.easeInOut),
      ),
    );
    _burstScale = Tween<double>(begin: 0.5, end: 1.8).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.60, 0.82, curve: Curves.easeOut),
      ),
    );

    // 6. Tagline animation
    _taglineOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.70, 0.92, curve: Curves.easeIn),
      ),
    );
    _taglineSpacing = Tween<double>(begin: 2.0, end: 5.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.70, 0.95, curve: Curves.easeOut),
      ),
    );

    // 7. Loading progress bar fills up
    _progressWidth = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.20, 0.95, curve: Curves.easeInOut),
      ),
    );

    _controller.forward();

    // Check user authentication while animation runs
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

    // Wait until animation completes + pleasant small delay
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
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: const Color(0xFF050B1A),
      body: Stack(
        alignment: Alignment.center,
        children: [
          // Background ambient gradient glow
          Positioned(
            top: size.height * 0.22,
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF00E5CC).withOpacity(0.18),
                    const Color(0xFF1D4ED8).withOpacity(0.12),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.5, 1.0],
                ),
              ),
            ),
          ),

          // Central Logo & Assembling Text Content
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // --- 1. TOP LOGO EMBLEM (With scale, opacity & gavel tilt) ---
                  Opacity(
                    opacity: _emblemOpacity.value.clamp(0.0, 1.0),
                    child: Transform.scale(
                      scale: _emblemScale.value,
                      child: Transform.rotate(
                        angle: _gavelRotation.value,
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
                  ),

                  const SizedBox(height: 28),

                  // --- 2. ASSEMBLE LETTERS: "Bid" (left) + "By" (right) ---
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      // Light burst flash when "Bid" and "By" unite
                      if (_burstOpacity.value > 0.01)
                        Transform.scale(
                          scale: _burstScale.value,
                          child: Container(
                            width: 160,
                            height: 60,
                            decoration: BoxDecoration(
                              shape: BoxShape.rectangle,
                              borderRadius: BorderRadius.circular(30),
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

                      // Assembled Letters Row
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // "Bid" - Slides from Left
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
                                      color: Colors.black45,
                                      blurRadius: 12,
                                      offset: Offset(0, 4),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),

                          // "By" - Slides from Right (Vibrant Turquoise/Cyan)
                          SlideTransition(
                            position: _bySlide,
                            child: Opacity(
                              opacity: _byOpacity.value.clamp(0.0, 1.0),
                              child: ShaderMask(
                                shaderCallback: (bounds) => const LinearGradient(
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
                                        blurRadius: 18,
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

                  // --- 3. SUBTITLE TAGLINE WITH LETTER SPACING EXPANSION ---
                  Opacity(
                    opacity: _taglineOpacity.value.clamp(0.0, 1.0),
                    child: Text(
                      'REVERSE MARKETPLACE',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF94A3B8),
                        letterSpacing: _taglineSpacing.value,
                      ),
                    ),
                  ),

                  const SizedBox(height: 48),

                  // --- 4. SLEEK AMBIENT PROGRESS BAR ---
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

          // Bottom credit / version
          const Positioned(
            bottom: 24,
            child: Text(
              'Smart Auctions • Best Deals',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF64748B),
                letterSpacing: 1.2,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
