import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';

class AppImage extends StatelessWidget {
  final String? imageSource;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  const AppImage({
    super.key,
    required this.imageSource,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    if (imageSource == null || imageSource!.trim().isEmpty) {
      return const SizedBox.shrink();
    }

    final src = imageSource!.trim();

    Widget imageWidget;
    if (src.startsWith('data:image') || src.startsWith('data:application')) {
      try {
        final commaIdx = src.indexOf(',');
        final base64Data = commaIdx != -1 ? src.substring(commaIdx + 1) : src;
        final Uint8List bytes = base64Decode(base64Data);
        imageWidget = Image.memory(
          bytes,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (_, __, ___) => _errorPlaceholder(),
        );
      } catch (_) {
        imageWidget = _errorPlaceholder();
      }
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      imageWidget = Image.network(
        src,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => _errorPlaceholder(),
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return Container(
            width: width,
            height: height,
            color: Colors.black12,
            child: const Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        },
      );
    } else if (src.length > 100) {
      try {
        final Uint8List bytes = base64Decode(src);
        imageWidget = Image.memory(
          bytes,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (_, __, ___) => _errorPlaceholder(),
        );
      } catch (_) {
        imageWidget = _errorPlaceholder();
      }
    } else {
      imageWidget = _errorPlaceholder();
    }

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: imageWidget);
    }
    return imageWidget;
  }

  Widget _errorPlaceholder() {
    return Container(
      width: width,
      height: height,
      color: Colors.grey.withOpacity(0.12),
      child: const Center(
        child: Icon(Icons.broken_image_outlined, color: Colors.grey, size: 24),
      ),
    );
  }
}
