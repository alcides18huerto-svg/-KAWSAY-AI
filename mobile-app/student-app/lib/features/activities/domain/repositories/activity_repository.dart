import '../entities/activity_entity.dart';

/// Contrato de acceso a actividades.
///
/// La capa de presentación depende de esta abstracción (Domain), nunca de
/// `sqflite` ni de una fuente de datos concreta (Data).
abstract class ActivityRepository {
  Future<List<ActivityEntity>> getActivities({String? subject});

  Future<ActivityEntity?> getActivityById(String id);

  Future<void> saveActivities(List<ActivityEntity> activities);

  Future<void> saveActivity(ActivityEntity activity);

  Future<void> deleteActivity(String id);
}
