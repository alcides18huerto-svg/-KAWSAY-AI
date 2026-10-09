import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';

import '../api/api_client.dart';
import '../database/local_database.dart';

/// Resultado de un ciclo de sincronización.
class SyncResult {
  const SyncResult({required this.synced, required this.pending});

  final int synced;
  final int pending;
}

/// Motor de sincronización offline-first.
///
/// - Empuja la tabla `sync_queue` al backend en lotes de máximo 50 eventos.
/// - Idempotencia por `client_event_id`: el backend responde ACK tanto para
///   eventos nuevos como duplicados, por lo que en ambos casos se marcan `done`.
/// - Si la red falla a mitad del envío, los eventos restantes quedan en
///   `PENDING` y se reintentan en el próximo [flush].
class SyncEngine {
  SyncEngine._();
  static final SyncEngine instance = SyncEngine._();

  /// Tope de eventos por petición, alineado con `MAX_BATCH_SIZE` del backend.
  static const int batchSize = 50;

  final ApiClient _api = ApiClient.instance;
  final Connectivity _connectivity = Connectivity();
  final Uuid _uuid = const Uuid();

  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _flushing = false;

  bool get isFlushing => _flushing;

  /// Escucha cambios de conectividad y vacía la cola al recuperar la red.
  void start() {
    _subscription ??= _connectivity.onConnectivityChanged.listen((results) {
      if (_isOnline(results)) {
        unawaited(flush());
      }
    });
  }

  void dispose() {
    _subscription?.cancel();
    _subscription = null;
  }

  /// Vacía la cola por lotes hasta agotarla o hasta un fallo de red.
  ///
  /// Nunca descarta eventos: solo marca `done` los que el servidor confirma.
  Future<SyncResult> flush() async {
    if (_flushing) {
      return SyncResult(synced: 0, pending: await _pendingCount());
    }
    _flushing = true;
    var synced = 0;
    try {
      while (true) {
        if (!_api.isAuthenticated || !await _hasConnection()) break;

        final batch = await _nextBatch(batchSize);
        if (batch.isEmpty) break;

        final events =
            batch.map(_toEvent).toList(growable: false);
        final Map<String, dynamic> response;
        try {
          response = await _api.pushSyncBatch(
            clientBatchId: _uuid.v4(),
            events: events,
          );
        } catch (_) {
          // Corte de red o error del servidor: la cola permanece PENDING.
          break;
        }

        final acked = {
          ..._stringList(response['accepted']),
          ..._stringList(response['duplicates']),
        };
        if (acked.isEmpty) break; // evita bucle si el servidor no confirma nada

        for (final row in batch) {
          final eventId = row['event_id'] as String;
          if (!acked.contains(eventId)) continue;
          await _markDone(eventId);
          synced++;
        }
      }
    } finally {
      _flushing = false;
    }
    return SyncResult(synced: synced, pending: await _pendingCount());
  }

  Future<List<Map<String, Object?>>> _nextBatch(int limit) async {
    final db = await LocalDatabase.database;
    return db.query(
      'sync_queue',
      where: 'status = ?',
      whereArgs: ['pending'],
      orderBy: 'id ASC',
      limit: limit,
    );
  }

  Map<String, dynamic> _toEvent(Map<String, Object?> row) {
    final payload =
        jsonDecode(row['payload'] as String) as Map<String, dynamic>;
    return {
      'client_event_id': row['event_id'] as String,
      'assignment_id': payload['assignment_id'],
      'question_key': payload['question_key'] ?? '',
      'answer': payload['answer'] ?? '',
      'is_correct': payload['is_correct'] == true,
      'hints_used': payload['hints_used'] ?? 0,
      'response_time_seconds':
          (payload['response_time_seconds'] as num?)?.toDouble() ?? 0,
    };
  }

  Future<void> _markDone(String eventId) async {
    final db = await LocalDatabase.database;
    await db.update('sync_queue', {'status': 'done'},
        where: 'event_id = ?', whereArgs: [eventId]);
    await db.update('attempts', {'sync_status': 'synced'},
        where: 'id = ?', whereArgs: [eventId]);
  }

  Future<int> _pendingCount() async {
    final db = await LocalDatabase.database;
    final rows = await db.query('sync_queue',
        where: 'status = ?', whereArgs: ['pending']);
    return rows.length;
  }

  Future<bool> _hasConnection() async =>
      _isOnline(await _connectivity.checkConnectivity());

  bool _isOnline(List<ConnectivityResult> results) =>
      results.any((result) => result != ConnectivityResult.none);

  Iterable<String> _stringList(dynamic value) =>
      (value as List<dynamic>? ?? const []).whereType<String>();
}
