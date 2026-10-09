import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';
import '../api/api_client.dart';
import '../database/local_database.dart';

/// Servicio de sincronización offline-first.
///
/// - Guarda los intentos localmente aunque no haya red.
/// - Los encola en `sync_queue` y los envía al backend cuando hay conexión.
/// - El backend es idempotente por `id`, así que reenviar no duplica datos.
class SyncService {
  SyncService._();
  static final SyncService instance = SyncService._();

  final _uuid = const Uuid();
  final _api = ApiClient.instance;

  bool _syncing = false;
  bool get isSyncing => _syncing;

  /// Registra un intento de respuesta del estudiante.
  ///
  /// Devuelve `true` si se sincronizó con el servidor, `false` si quedó
  /// pendiente en la cola local (modo offline).
  Future<bool> recordAttempt({
    required String questionKey,
    required String answer,
    required bool isCorrect,
    String? assignmentId,
    int hintsUsed = 0,
    double responseTimeSeconds = 0,
  }) async {
    final db = await LocalDatabase.database;
    final id = _uuid.v4();
    final payload = <String, dynamic>{
      'id': id,
      'assignment_id': assignmentId,
      'question_key': questionKey,
      'answer': answer,
      'is_correct': isCorrect,
      'hints_used': hintsUsed,
      'response_time_seconds': responseTimeSeconds,
    };

    await db.insert('attempts', {
      'id': id,
      'assignment_id': assignmentId,
      'question_key': questionKey,
      'answer': answer,
      'is_correct': isCorrect ? 1 : 0,
      'hints_used': hintsUsed,
      'response_time_seconds': responseTimeSeconds,
      'sync_status': 'pending',
    });

    if (await _hasConnection() && _api.isAuthenticated) {
      try {
        await _api.syncAttempt(payload);
        await _markAttemptSynced(id);
        return true;
      } catch (_) {
        // Cae a la cola local.
      }
    }

    await _enqueue(id, payload);
    return false;
  }

  Future<void> _enqueue(String eventId, Map<String, dynamic> payload) async {
    final db = await LocalDatabase.database;
    await db.insert(
      'sync_queue',
      {
        'event_id': eventId,
        'event_type': 'learning_attempt',
        'payload': jsonEncode(payload),
        'status': 'pending',
      },
      conflictAlgorithm: ConflictAlgorithm.ignore,
    );
  }

  Future<void> _markAttemptSynced(String id) async {
    final db = await LocalDatabase.database;
    await db.update('attempts', {'sync_status': 'synced'},
        where: 'id = ?', whereArgs: [id]);
  }

  /// Envía todos los eventos pendientes de la cola local.
  ///
  /// Se llama al iniciar sesión, al recuperar conexión o manualmente.
  Future<({int synced, int pending})> flushQueue() async {
    final db = await LocalDatabase.database;
    final pending = await db.query('sync_queue', where: 'status = ?', whereArgs: ['pending']);
    if (pending.isEmpty) return (synced: 0, pending: 0);

    if (!_api.isAuthenticated || !await _hasConnection()) {
      return (synced: 0, pending: pending.length);
    }

    _syncing = true;
    var synced = 0;
    try {
      final attempts = pending
          .map((row) => jsonDecode(row['payload'] as String) as Map<String, dynamic>)
          .toList();
      final result = await _api.pushAttempts(attempts);
      final confirmed = (result['synced'] as List<dynamic>? ?? []).cast<String>();
      final duplicates = (result['duplicates'] as List<dynamic>? ?? []).cast<String>();
      final resolved = {...confirmed, ...duplicates};

      for (final row in pending) {
        final eventId = row['event_id'] as String;
        // El backend confirma tanto sincronizados como duplicados;
        // en ambos casos el evento ya no debe reintentarse.
        if (!resolved.contains(eventId)) continue;
        await db.update('sync_queue', {'status': 'done'},
            where: 'event_id = ?', whereArgs: [eventId]);
        await _markAttemptSynced(eventId);
        synced++;
      }
    } catch (_) {
      // Se mantiene pendiente para el próximo intento.
    } finally {
      _syncing = false;
    }

    final remaining = await db.query('sync_queue',
        where: 'status = ?', whereArgs: ['pending']);
    return (synced: synced, pending: remaining.length);
  }

  Future<int> pendingCount() async {
    final db = await LocalDatabase.database;
    final rows = await db.query('sync_queue',
        where: 'status = ?', whereArgs: ['pending']);
    return rows.length;
  }

  Future<bool> _hasConnection() async {
    final result = await Connectivity().checkConnectivity();
    return result != ConnectivityResult.none;
  }
}
