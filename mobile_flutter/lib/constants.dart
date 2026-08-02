import 'package:flutter/material.dart';

const String API_BASE_URL = 'http://10.76.147.209:5080/api';

// Theme Colors
const Color primaryColor = Color(0xFF3B82F6); // Vibrant Indigo/Blue
const Color accentColor = Color(0xFF10B981); // Emerald Green for budgets
const Color warningColor = Color(0xFFF59E0B); // Amber for pending
const Color textSecondaryColor = Color(0xFF94A3B8); // Soft Grey

// Global Theme Notifier
final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.dark);
