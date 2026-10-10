import 'package:sqflite/sqflite.dart';

import '../../../../core/database/local_database.dart';
import '../../domain/entities/activity_entity.dart';

/// Único lugar con SQL de actividades.
///
/// Reutiliza la tabla `assignments` de [LocalDatabase] (actividades locales).
/// Todas las operaciones son asíncronas: `sqflite` ejecuta el acceso a disco
/// fuera del hilo de UI, por lo que no se bloquea el Main Thread.
class ActivityLocalDataSource {
  const ActivityLocalDataSource();

  static const String _table = 'assignments';

  Future<List<ActivityEntity>> getActivities({String? subject}) async {
    final db = await LocalDatabase.database;
    final rows = await db.query(
      _table,
      where: subject != null ? 'subject = ?' : null,
      whereArgs: subject != null ? [subject] : null,
      orderBy: 'title COLLATE NOCASE ASC',
    );
    return rows.map(ActivityEntity.fromMap).toList(growable: false);
  }

  Future<ActivityEntity?> getActivityById(String id) async {
    final db = await LocalDatabase.database;
    final rows = await db.query(
      _table,
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return ActivityEntity.fromMap(rows.first);
  }

  Future<void> saveActivities(List<ActivityEntity> activities) async {
    if (activities.isEmpty) return;
    final db = await LocalDatabase.database;
    final batch = db.batch();
    for (final activity in activities) {
      batch.insert(
        _table,
        activity.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<void> saveActivity(ActivityEntity activity) =>
      saveActivities([activity]);

  Future<void> deleteActivity(String id) async {
    final db = await LocalDatabase.database;
    await db.delete(_table, where: 'id = ?', whereArgs: [id]);
  }
}
