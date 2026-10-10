import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';

/// Página de progreso: muestra el dominio por área del estudiante.
class ProgressPage extends StatefulWidget {
  const ProgressPage({super.key});
  @override
  State<ProgressPage> createState() => _ProgressPageState();
}

class _ProgressPageState extends State<ProgressPage> {
  final _api = ApiClient.instance;
  bool _loading = true;
  String? _error;
  List<dynamic> _rows = [];

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
      final rows = await _api.myProgress();
      setState(() => _rows = rows);
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: _load, child: const Text('Reintentar')),
            ],
          ),
        ),
      );
    }
    if (_rows.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('Aún no tienes intentos registrados.'),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text('Mi progreso',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          ..._rows.map((row) {
            final subject = row['subject'] as String? ?? 'General';
            final mastery = (row['mastery_level'] as num?)?.toDouble() ?? 0;
            final attempts = (row['attempts'] as num?)?.toInt() ?? 0;
            final correct = (row['correct'] as num?)?.toInt() ?? 0;
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(subject,
                            style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text('${mastery.toStringAsFixed(1)}%'),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: (mastery.clamp(0, 100)) / 100,
                        minHeight: 8,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text('$attempts intentos · $correct correctos',
                        style: const TextStyle(fontSize: 13, color: Colors.black54)),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
