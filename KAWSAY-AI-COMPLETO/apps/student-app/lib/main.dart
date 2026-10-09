import 'package:flutter/material.dart';
import 'core/api/api_client.dart';
import 'core/database/local_database.dart';
import 'core/sync/sync_engine.dart';
import 'features/auth/login_page.dart';
import 'features/home/home_page.dart';
import 'features/progress/progress_page.dart';
import 'features/tutor/tutor_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalDatabase.database;
  await ApiClient.instance.init();
  SyncEngine.instance.start();
  runApp(const KawsayApp());
}

class KawsayApp extends StatelessWidget {
  const KawsayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'KAWSAY AI',
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF1D705B),
        useMaterial3: true,
      ),
      home: const RootGate(),
    );
  }
}

/// Decide si mostrar el login o la app principal según la sesión guardada.
class RootGate extends StatefulWidget {
  const RootGate({super.key});

  @override
  State<RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<RootGate> {
  bool _authenticated = ApiClient.instance.isAuthenticated;

  @override
  Widget build(BuildContext context) {
    if (!_authenticated) {
      return LoginPage(
        onAuthenticated: () => setState(() => _authenticated = true),
      );
    }
    return MainScaffold(
      onLogout: () => setState(() => _authenticated = false),
    );
  }
}

/// Contenedor principal con navegación inferior entre las secciones.
class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key, required this.onLogout});
  final VoidCallback onLogout;

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomePage(onLogout: widget.onLogout),
      const ProgressPage(),
      const TutorPage(),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.home_outlined), label: 'Inicio'),
          NavigationDestination(
              icon: Icon(Icons.insights_outlined), label: 'Progreso'),
          NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline), label: 'Tutor'),
        ],
      ),
    );
  }
}

