import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants.dart';

class ApiService {
  static Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final response = await http.post(
        Uri.parse('$API_BASE_URL$endpoint'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      
      dynamic parsedData;
      try {
        parsedData = jsonDecode(response.body);
      } catch (e) {
        parsedData = {'error': 'Server error (${response.statusCode}). Please try again.'};
      }

      return {
        'statusCode': response.statusCode,
        'data': parsedData,
      };
    } catch (e) {
      return {
        'statusCode': 500,
        'data': {'error': 'Network connection failed. Please check your internet connection.'},
      };
    }
  }

  static Future<Map<String, dynamic>> get(String endpoint) async {
    try {
      final response = await http.get(
        Uri.parse('$API_BASE_URL$endpoint'),
        headers: {'Content-Type': 'application/json'},
      );

      dynamic parsedData;
      try {
        parsedData = jsonDecode(response.body);
      } catch (e) {
        parsedData = {'error': 'Server error (${response.statusCode}). Please try again.'};
      }

      return {
        'statusCode': response.statusCode,
        'data': parsedData,
      };
    } catch (e) {
      return {
        'statusCode': 500,
        'data': {'error': 'Network connection failed. Please check your internet connection.'},
      };
    }
  }

  static Future<Map<String, dynamic>> delete(String endpoint) async {
    try {
      final response = await http.delete(
        Uri.parse('$API_BASE_URL$endpoint'),
        headers: {'Content-Type': 'application/json'},
      );

      dynamic parsedData;
      try {
        parsedData = jsonDecode(response.body);
      } catch (e) {
        parsedData = {'error': 'Server error (${response.statusCode}). Please try again.'};
      }

      return {
        'statusCode': response.statusCode,
        'data': parsedData,
      };
    } catch (e) {
      return {
        'statusCode': 500,
        'data': {'error': 'Network connection failed. Please check your internet connection.'},
      };
    }
  }
}
