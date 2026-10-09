import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Cliente HTTP hacia el backend KAWSAY AI (FastAPI).
///
/// Centraliza la URL base, el token JWT y el manejo de errores para que
/// todas las pantallas de la app de estudiante lo reutilicen.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  static const String _defaultBaseUrl = 'http://10.0.2.2:8000/api/v1';
  String _baseUrl = _defaultBaseUrl;
  String? _token;

  String get baseUrl => _baseUrl;

  /// Configura la URL del backend y restaura la sesión guardada.
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString('api_url') ?? _defaultBaseUrl;
    _token = prefs.getString('token');
  }

  Future<void> setBaseUrl(String url) async {
    _baseUrl = url.replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_url', _baseUrl);
  }

  bool get isAuthenticated => _token != null;

  Future<void> _saveToken(String? token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove('token');
    } else {
      await prefs.setString('token', token);
    }
  }

  Future<void> logout() => _saveToken(null);

  Map<String, String> _headers({bool json = false}) => {
        if (json) 'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  /// Realiza una petición y devuelve el cuerpo JSON decodificado.
  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$_baseUrl$path');
    late http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: _headers());
          break;
        case 'POST':
          response = await http.post(uri,
              headers: _headers(json: true), body: jsonEncode(body ?? {}));
          break;
        case 'PUT':
          response = await http.put(uri,
              headers: _headers(json: true), body: jsonEncode(body ?? {}));
          break;
        default:
          throw ApiException('Método HTTP no soportado: $method');
      }
    } catch (error) {
      throw ApiException('No se pudo conectar con el servidor. Revisa tu conexión.');
    }

    final decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      if (response.statusCode == 401) await _saveToken(null);
      throw ApiException(_extractMessage(decoded) ?? 'Error HTTP ${response.statusCode}');
    }
    return decoded;
  }

  String? _extractMessage(dynamic decoded) {
    if (decoded is Map) {
      final detail = decoded['detail'];
      if (detail is String) return detail;
      if (detail is List && detail.isNotEmpty) {
        return detail
            .map((item) => item is Map ? item['msg'] : null)
            .whereType<String>()
            .join(', ');
      }
      if (decoded['message'] is String) return decoded['message'] as String;
    }
    return null;
  }

  // ---------------------------------------------------------------- Auth
  Future<Map<String, dynamic>> login(String email, String password) async {
    final result = await _send('POST', '/auth/login',
        body: {'email': email, 'password': password}) as Map<String, dynamic>;
    await _saveToken(result['access_token'] as String?);
    return result;
  }

  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String fullName,
  }) async {
    return await _send('POST', '/auth/register', body: {
      'email': email,
      'password': password,
      'full_name': fullName,
      'role': 'STUDENT',
    }) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> me() async =>
      await _send('GET', '/students/me') as Map<String, dynamic>;

  Future<void> saveProfile({
    required int grade,
    required String nativeLanguage,
    required String preferredLanguage,
    String? interests,
  }) async {
    await _send('PUT', '/students/me/profile', body: {
      'grade': grade,
      'native_language': nativeLanguage,
      'preferred_language': preferredLanguage,
      'interests': interests,
    });
  }

  // ------------------------------------------------------------ Contenido
  Future<List<dynamic>> myAssignments() async =>
      await _send('GET', '/students/me/assignments') as List<dynamic>;

  Future<List<dynamic>> myProgress() async =>
      await _send('GET', '/progress/me') as List<dynamic>;

  // -------------------------------------------------------------- Offline
  Future<Map<String, dynamic>> pushAttempts(List<Map<String, dynamic>> items) async {
    return await _send('POST', '/sync/push', body: items) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> syncAttempt(Map<String, dynamic> attempt) async {
    return await _send('POST', '/learning/attempts', body: attempt)
        as Map<String, dynamic>;
  }

  // ---------------------------------------------------------------- Tutor
  Future<String> tutorMessage(String message, {String? subject, String? topic}) async {
    final result = await _send('POST', '/tutor/message', body: {
      'message': message,
      'subject': subject,
      'topic': topic,
    }) as Map<String, dynamic>;
    return result['reply'] as String? ?? '';
  }
}

/// Error de dominio lanzado por [ApiClient] con mensaje legible para la UI.
class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
