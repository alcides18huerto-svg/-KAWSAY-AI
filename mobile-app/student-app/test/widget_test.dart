import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kawsay_student/main.dart';

void main() {
  testWidgets('la app arranca y muestra el login de KAWSAY AI', (tester) async {
    await tester.pumpWidget(const KawsayApp());
    expect(find.text('KAWSAY AI'), findsOneWidget);
    expect(find.text('Ingresar'), findsOneWidget);
  });

  testWidgets('permite alternar a la creación de cuenta', (tester) async {
    await tester.pumpWidget(const KawsayApp());
    await tester.tap(find.text('Crear cuenta de estudiante'));
    await tester.pumpAndSettle();
    expect(find.text('Nombre completo'), findsOneWidget);
  });
}

