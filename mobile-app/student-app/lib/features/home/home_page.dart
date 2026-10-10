import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/sync/sync_service.dart';

/// Modelo ligero de una actividad publicada para el estudiante.
class StudentAssignment {
  StudentAssignment({
    required this.id,
    required this.title,
    required this.subject,
    required this.content,
    required this.grade,
  });

  final String id;
  final String title;
  final String subject;
  final String content;
  final int grade;

  factory StudentAssignment.fromJson(Map<String, dynamic> json) {
    return StudentAssignment(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Actividad',
      subject: json['subject'] as String? ?? 'General',
      content: json['content'] as String? ?? '',
      grade: (json['grade'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Pantalla principal del estudiante: saludo, tareas pendientes y estado offline.
class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.onLogout});
  final VoidCallback onLogout;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _api = ApiClient.instance;
  final _sync = SyncService.instance;

  bool _loading = true;
  String? _error;
  String _studentName = '';
  int _pendingSync = 0;
  List<StudentAssignment> _assignments = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final me = await _api.me();
      final rows = await _api.myAssignments();
      final pending = await _sync.pendingCount();
      // Intento de sincronización silencioso al abrir la app.
      await _sync.flushQueue();
      setState(() {
        _studentName = me['full_name'] as String? ?? 'Estudiante';
        _assignments = rows
            .map((row) => StudentAssignment.fromJson(row as Map<String, dynamic>))
            .toList();
        _pendingSync = pending;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _manualSync() async {
    final result = await _sync.flushQueue();
    if (!mounted) return;
    setState(() => _pendingSync = result.pending);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result.synced > 0
              ? 'Se sincronizaron ${result.synced} registros.'
              : 'No había registros pendientes de sincronizar.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KAWSAY AI'),
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            onPressed: () async {
              await _api.logout();
              widget.onLogout();
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: _buildBody(),
        ),
      ),
      floatingActionButton: _pendingSync > 0
          ? FloatingActionButton.extended(
              onPressed: _manualSync,
              icon: const Icon(Icons.sync),
              label: Text('Sincronizar ($_pendingSync)'),
            )
          : null,
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            color: const Color(0xFFFDECEC),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                _error!,
                style: const TextStyle(color: Color(0xFF8F2929)),
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: _load, child: const Text('Reintentar')),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Hola, $_studentName 👋',
          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        const Text('¿Qué quieres aprender hoy?'),
        const SizedBox(height: 20),
        if (_pendingSync > 0)
          Card(
            color: const Color(0xFFFFF6E5),
            child: ListTile(
              leading: const Icon(Icons.cloud_off_outlined),
              title: Text('$_pendingSync registro(s) sin sincronizar'),
              subtitle: const Text('Se enviarán cuando haya conexión.'),
            ),
          ),
        const SizedBox(height: 8),
        const Text('Mis tareas',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 10),
        if (_assignments.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 18),
            child: Text('Aún no tienes actividades publicadas.'),
          ),
        ..._assignments.map(
          (assignment) => Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ExpansionTile(
              leading: const Icon(Icons.assignment_outlined),
              title: Text(assignment.title),
              subtitle: Text(
                '${assignment.subject} · ${assignment.grade}º grado',
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(assignment.content),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
