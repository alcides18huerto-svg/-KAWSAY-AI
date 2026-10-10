/// Entidad de dominio que representa una actividad escolar.
///
/// Es Dart puro: no conoce `sqflite`, HTTP ni widgets. El mapeo a/desde la
/// fila de SQLite se expone aquí porque es 1:1 y no crea dependencias externas.
class ActivityEntity {
  const ActivityEntity({
    required this.id,
    required this.title,
    required this.subject,
    required this.content,
    required this.grade,
    this.syncStatus = 'pending',
  });

  final String id;
  final String title;
  final String subject;
  final String content;
  final int grade;
  final String syncStatus;

  bool get isSynced => syncStatus == 'synced';

  /// Construye la entidad desde una fila de la tabla `assignments`.
  factory ActivityEntity.fromMap(Map<String, Object?> map) {
    return ActivityEntity(
      id: map['id'] as String,
      title: (map['title'] as String?) ?? '',
      subject: (map['subject'] as String?) ?? '',
      content: (map['content'] as String?) ?? '',
      grade: (map['grade'] as int?) ?? 1,
      syncStatus: (map['sync_status'] as String?) ?? 'pending',
    );
  }

  /// Convierte la entidad a una fila de la tabla `assignments`.
  Map<String, Object?> toMap() => {
        'id': id,
        'title': title,
        'subject': subject,
        'content': content,
        'grade': grade,
        'sync_status': syncStatus,
      };

  ActivityEntity copyWith({
    String? title,
    String? subject,
    String? content,
    int? grade,
    String? syncStatus,
  }) {
    return ActivityEntity(
      id: id,
      title: title ?? this.title,
      subject: subject ?? this.subject,
      content: content ?? this.content,
      grade: grade ?? this.grade,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is ActivityEntity &&
      other.id == id &&
      other.title == title &&
      other.subject == subject &&
      other.content == content &&
      other.grade == grade &&
      other.syncStatus == syncStatus;

  @override
  int get hashCode =>
      Object.hash(id, title, subject, content, grade, syncStatus);
}
