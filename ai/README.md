# IA

La lógica de IA vive en `backend/app/ai_core/` (motor local determinista) y en
`backend/app/modules/ai/` (AI Gateway, adaptación por grado, validadores) +
`backend/app/modules/tutor/`.

Estado y límites: `docs/ai.md`. El proveedor activo es **local** (`AI_PROVIDER=local`),
sin APIs externas ni claves. Las pruebas usan proveedores falsos en `backend/tests/fakes.py`
y el motor local real en `backend/tests/test_ai_gateway.py`.
