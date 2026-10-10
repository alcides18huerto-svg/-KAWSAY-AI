import 'package:flutter/material.dart';
import '../api/api_client.dart';

/// Pantalla de inicio de sesión / creación de cuenta de estudiante.
class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.onAuthenticated});
  final VoidCallback onAuthenticated;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _fullName = TextEditingController();
  final _api = ApiClient.instance;

  bool _creating = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _fullName.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_creating) {
        await _api.register(
          email: _email.text.trim(),
          password: _password.text,
          fullName: _fullName.text.trim(),
        );
      }
      final result = await _api.login(_email.text.trim(), _password.text);
      final role = (result['user'] as Map<String, dynamic>?)?['role'];
      if (role != 'STUDENT') {
        await _api.logout();
        throw ApiException('Esta aplicación es solo para cuentas de estudiante.');
      }
      widget.onAuthenticated();
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.school_outlined, size: 64),
                  const SizedBox(height: 12),
                  const Text('KAWSAY AI',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  const Text('Aprende a tu ritmo, incluso sin conexión.',
                      textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  if (_creating) ...[
                    const Text('Nombre completo'),
                    TextField(
                      controller: _fullName,
                      textInputAction: TextInputAction.next,
                    ),
                  ],
                  const Text('Correo'),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                  ),
                  const Text('Contraseña'),
                  TextField(
                    controller: _password,
                    obscureText: true,
                    autofillHints: const [AutofillHints.password],
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDECEC),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(_error!,
                          style: const TextStyle(color: Color(0xFF8F2929))),
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: Text(_busy
                        ? 'Procesando…'
                        : _creating
                            ? 'Crear cuenta e ingresar'
                            : 'Ingresar'),
                  ),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => setState(() {
                              _creating = !_creating;
                              _error = null;
                            }),
                    child: Text(_creating ? 'Ya tengo cuenta' : 'Crear cuenta de estudiante'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
