import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../../domain/entities/activity_entity.dart';
import '../../domain/repositories/activity_repository.dart';

/// Estado de la lista de actividades para la UI.
///
/// Usa [ChangeNotifier] para no añadir dependencias de gestión de estado.
/// No contiene SQL ni llamadas a red: solo orquesta el repositorio de dominio.
class ActivityController extends ChangeNotifier {
  ActivityController(this._repository);

  final ActivityRepository _repository;

  List<ActivityEntity> _activities = const [];
  List<ActivityEntity> get activities => _activities;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  Future<void> load({String? subject}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _activities = await _repository.getActivities(subject: subject);
    } catch (_) {
      _error = 'No se pudieron cargar las actividades locales.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refresh({String? subject}) => load(subject: subject);

  Future<void> save(ActivityEntity activity) async {
    await _repository.saveActivity(activity);
    await load();
  }

  Future<void> remove(String id) async {
    await _repository.deleteActivity(id);
    await load();
  }
}

/// Expone un [ActivityController] en el árbol de widgets sin paquetes externos.
///
/// Uso:
/// ```dart
/// ActivityScope(
///   controller: ActivityController(ActivityRepositoryImpl())..load(),
///   child: const ActivitiesPage(),
/// )
/// // En el widget:
/// final controller = ActivityScope.of(context);
/// ```
class ActivityScope extends InheritedNotifier<ActivityController> {
  const ActivityScope({
    required ActivityController controller,
    required super.child,
    super.key,
  }) : super(notifier: controller);

  static ActivityController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ActivityScope>();
    assert(scope != null, 'ActivityScope no encontrado en el árbol de widgets');
    return scope!.notifier!;
  }
}
