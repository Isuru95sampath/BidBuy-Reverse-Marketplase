import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static const String channelId = 'bidbuy_notifications_channel';
  static const String channelName = 'BidBuy Alerts';
  static const String channelDescription =
      'Real-time notifications for incoming messages, quotes, and accepted deals';

  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const InitializationSettings initializationSettings =
        InitializationSettings(
      android: initializationSettingsAndroid,
    );

    await _notificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        debugPrint("Notification tapped with payload: ${response.payload}");
      },
    );

    // Create High Importance Android Notification Channel for Heads-up alerts
    final AndroidFlutterLocalNotificationsPlugin? androidImplementation =
        _notificationsPlugin.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    if (androidImplementation != null) {
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        channelId,
        channelName,
        description: channelDescription,
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        showBadge: true,
      );

      await androidImplementation.createNotificationChannel(channel);

      // Request runtime notification permission on Android 13+ (API 33+)
      if (Platform.isAndroid) {
        await androidImplementation.requestNotificationsPermission();
      }
    }

    _isInitialized = true;
    debugPrint("NotificationService initialized successfully with Android High Importance Channel!");
  }

  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      const AndroidNotificationDetails androidDetails =
          AndroidNotificationDetails(
        channelId,
        channelName,
        channelDescription: channelDescription,
        importance: Importance.max,
        priority: Priority.high,
        ticker: 'BidBuy Alert',
        icon: '@mipmap/ic_launcher',
        playSound: true,
        enableVibration: true,
        fullScreenIntent: false,
        styleInformation: BigTextStyleInformation(''),
      );

      const NotificationDetails platformDetails = NotificationDetails(
        android: androidDetails,
      );

      await _notificationsPlugin.show(
        id,
        title,
        body,
        platformDetails,
        payload: payload,
      );
    } catch (e) {
      debugPrint("Error showing local notification: $e");
    }
  }

  // --- Convenience Helpers ---

  Future<void> showMessageNotification({
    required String senderName,
    required String message,
    int? requestId,
    int? senderId,
  }) async {
    final int notifId = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    await showNotification(
      id: notifId,
      title: '💬 New Message from $senderName',
      body: message.isNotEmpty ? message : 'Sent an image attachment',
      payload: 'chat:$requestId:$senderId',
    );
  }

  Future<void> showQuoteNotification({
    required String requestTitle,
    required String sellerName,
    required num price,
    int? requestId,
  }) async {
    final int notifId = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    await showNotification(
      id: notifId,
      title: '🔔 New Quote Received!',
      body: '$sellerName submitted a quote of Rs. ${price.toStringAsFixed(0)} for "$requestTitle".',
      payload: 'quote:$requestId',
    );
  }

  Future<void> showDealAcceptedNotification({
    required String requestTitle,
    int? bidId,
  }) async {
    final int notifId = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    await showNotification(
      id: notifId,
      title: '🎉 DEAL ACCEPTED!',
      body: 'Congratulations! A customer has accepted your quote for "$requestTitle".',
      payload: 'deal:$bidId',
    );
  }

  Future<void> showNewDemandNotification({
    required String requestTitle,
    required String category,
    int? requestId,
  }) async {
    final int notifId = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    await showNotification(
      id: notifId,
      title: '📢 New Demand Alert ($category)',
      body: 'A customer is looking for: "$requestTitle". Submit your quote now!',
      payload: 'request:$requestId',
    );
  }
}
