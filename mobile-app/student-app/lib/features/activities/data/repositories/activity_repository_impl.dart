import '../../domain/entities/activity_entity.dart';
import '../../domain/repositories/activity_repository.dart';
import '../datasources/activity_local_datasource.dart';

/// Implementación del contrato de actividades sobre la fuente de datos local.
class ActivityRepositoryImpl implements ActivityRepository {
  ActivityRepositoryImpl({ActivityLocalDataSource? localDataSource})
      : _local = localDataSource ?? const ActivityLocalDataSource();

  final ActivityLocalDataSource _local;

  @override
  Future<List<ActivityEntity>> getActivities({String? subject}) =>
      _local.getActivities(subject: subject);

  @override
  Future<ActivityEntity?> getActivityById(String id) =>
      _local.getActivityById(id);

  @override
  Future<void> saveActivities(List<ActivityEntity> activities) =>
      _local.saveActivities(activities);

  @override
  Future<void> saveActivity(ActivityEntity activity) =>
      _local.saveActivity(activity);

  @override
  Future<void> deleteActivity(String id) => _local.deleteActivity(id);
}
