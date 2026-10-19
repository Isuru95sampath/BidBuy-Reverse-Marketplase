import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:image_picker/image_picker.dart';
import '../constants.dart';
import '../services/api_service.dart';
import '../widgets/app_image.dart';

class ChatScreen extends StatefulWidget {
  final int requestId;
  final String requestTitle;
  final Map<String, dynamic> currentUser;
  final Map<String, dynamic> peerUser;

  const ChatScreen({
    super.key,
    required this.requestId,
    required this.requestTitle,
    required this.currentUser,
    required this.peerUser,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final AudioPlayer _audioPlayer = AudioPlayer();

  List<dynamic> _messages = [];
  bool _isLoading = true;
  Timer? _pollingTimer;
  int _lastMessageCount = 0;

  @override
  void initState() {
    super.initState();
    _fetchMessages(initial: true);
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) => _pollMessages());
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _pollMessages() async {
    if (!mounted) return;
    await _fetchMessages(initial: false);
  }

  Future<void> _fetchMessages({bool initial = false}) async {
    final myId = widget.currentUser['id'];
    final peerId = widget.peerUser['id'];

    final res = await ApiService.get(
      '/messages/chat?request_id=${widget.requestId}&user1_id=$myId&user2_id=$peerId',
    );

    if (!mounted) return;

    if (res['statusCode'] == 200) {
      final List newMessages = res['data'] as List? ?? [];

      // Check if new message received from peer
      if (!initial && newMessages.length > _lastMessageCount) {
        final lastMsg = newMessages.last;
        if (lastMsg['sender_id'] != myId) {
          _playNotificationSound();
        }
      }

      setState(() {
        _messages = newMessages;
        _lastMessageCount = newMessages.length;
        if (initial) _isLoading = false;
      });

      if (initial || newMessages.length > _lastMessageCount) {
        _scrollToBottom();
      }
    } else {
      if (initial) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _playNotificationSound() async {
    try {
      await _audioPlayer.play(
        UrlSource('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav'),
      );
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 60,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage({String? imageAttachment}) async {
    final text = _messageController.text.trim();
    if (text.isEmpty && (imageAttachment == null || imageAttachment.isEmpty)) return;

    _messageController.clear();

    final payload = {
      'request_id': widget.requestId,
      'sender_id': widget.currentUser['id'],
      'receiver_id': widget.peerUser['id'],
      'message': text,
      'image_attachment': imageAttachment ?? '',
    };

    final res = await ApiService.post('/messages', payload);
    if (res['statusCode'] == 201) {
      await _fetchMessages();
      _scrollToBottom();
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send message. Please retry.')),
        );
      }
    }
  }

  Future<void> _pickAndSendImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 850,
        maxHeight: 850,
        imageQuality: 75,
      );
      if (picked != null) {
        final bytes = await picked.readAsBytes();
        final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';
        await _sendMessage(imageAttachment: base64Image);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not access gallery: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = themeNotifier.value == ThemeMode.dark;
    final peerName = widget.peerUser['username'] ?? 'User';
    final peerRole = widget.peerUser['role'] ?? '';
    final peerShop = widget.peerUser['shop_name'] ?? '';
    final peerPhone = widget.peerUser['phone'] ?? '';

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: primaryColor.withOpacity(0.2),
              child: Text(
                peerName.isNotEmpty ? peerName[0].toUpperCase() : '?',
                style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    peerShop.isNotEmpty ? peerShop : peerName,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'Re: ${widget.requestTitle}',
                    style: const TextStyle(fontSize: 11, color: textSecondaryColor),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (peerPhone.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(right: 12),
              child: Chip(
                avatar: const Icon(Icons.phone, size: 14, color: accentColor),
                label: Text(
                  peerPhone,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: accentColor),
                ),
                backgroundColor: accentColor.withOpacity(0.15),
                side: BorderSide.none,
                padding: const EdgeInsets.symmetric(horizontal: 4),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Item Info Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: isDark ? const Color(0xFF1E293B) : Colors.grey[200],
            child: Row(
              children: [
                const Icon(Icons.shopping_bag_outlined, size: 16, color: primaryColor),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Inquiry for: ${widget.requestTitle}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: primaryColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    peerRole.toUpperCase(),
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: primaryColor),
                  ),
                ),
              ],
            ),
          ),

          // Messages View
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.chat_bubble_outline, size: 54, color: textSecondaryColor.withOpacity(0.5)),
                            const SizedBox(height: 12),
                            const Text(
                              'No messages yet',
                              style: TextStyle(color: textSecondaryColor, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Send a message to discuss price, item details, or delivery!',
                              style: TextStyle(color: textSecondaryColor, fontSize: 12),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg['sender_id'] == widget.currentUser['id'];

                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              constraints: BoxConstraints(
                                maxWidth: MediaQuery.of(context).size.width * 0.78,
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: isMe
                                    ? primaryColor
                                    : (isDark ? const Color(0xFF1E293B) : Colors.grey[200]),
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(isMe ? 16 : 2),
                                  bottomRight: Radius.circular(isMe ? 2 : 16),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.05),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  )
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment:
                                    isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                children: [
                                  if (!isMe)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 3),
                                      child: Text(
                                        msg['sender_name'] ?? peerName,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: isDark ? Colors.blue[300] : primaryColor,
                                        ),
                                      ),
                                    ),
                                  // Optional Image Attachment
                                  if (msg['image_attachment'] != null &&
                                      msg['image_attachment'].toString().trim().isNotEmpty) ...[
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 6),
                                      child: AppImage(
                                        imageSource: msg['image_attachment'],
                                        width: 220,
                                        height: 150,
                                        fit: BoxFit.cover,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                    ),
                                  ],
                                  if ((msg['message'] ?? '').toString().trim().isNotEmpty)
                                    Text(
                                      msg['message'] ?? '',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: isMe
                                            ? Colors.white
                                            : (isDark ? Colors.white : Colors.black87),
                                      ),
                                    ),
                                  const SizedBox(height: 4),
                                  Text(
                                    msg['created_at'] != null && msg['created_at'].toString().length >= 16
                                        ? msg['created_at'].toString().substring(11, 16)
                                        : '',
                                    style: TextStyle(
                                      fontSize: 9,
                                      color: isMe ? Colors.white70 : textSecondaryColor,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // Message Input Field
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : Colors.white,
              border: Border(
                top: BorderSide(
                  color: isDark ? Colors.white10 : Colors.black12,
                ),
              ),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.photo_library_outlined, color: primaryColor, size: 22),
                    tooltip: 'Send Image from Gallery',
                    onPressed: () => _pickAndSendImage(ImageSource.gallery),
                  ),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.grey[100],
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: TextField(
                        controller: _messageController,
                        style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _sendMessage(),
                        decoration: const InputDecoration(
                          hintText: 'Type a message...',
                          hintStyle: TextStyle(color: textSecondaryColor, fontSize: 13),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () => _sendMessage(),
                    borderRadius: BorderRadius.circular(24),
                    child: CircleAvatar(
                      radius: 20,
                      backgroundColor: primaryColor,
                      child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
