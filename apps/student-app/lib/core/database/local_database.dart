import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class LocalDatabase {
  static Database? _db;
  static Future<Database> get database async {
    if (_db != null) return _db!;
    final path = join(await getDatabasesPath(), 'kawsay.db');
    _db = await openDatabase(path, version: 1, onCreate: (db, version) async {
      await db.execute('''CREATE TABLE assignments(
        id TEXT PRIMARY KEY,title TEXT,subject TEXT,content TEXT,grade INTEGER,sync_status TEXT
      )''');
      await db.execute('''CREATE TABLE attempts(
        id TEXT PRIMARY KEY,assignment_id TEXT,question_key TEXT,answer TEXT,
        is_correct INTEGER,hints_used INTEGER,response_time_seconds REAL,sync_status TEXT
      )''');
      await db.execute('''CREATE TABLE progress(
        subject TEXT PRIMARY KEY,mastery_level REAL,total_attempts INTEGER,correct_attempts INTEGER
      )''');
      await db.execute('''CREATE TABLE sync_queue(
        id INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT UNIQUE,event_type TEXT,payload TEXT,status TEXT
      )''');
    });
    return _db!;
  }
}
