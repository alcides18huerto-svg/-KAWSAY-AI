"""Núcleo de IA local de KAWSAY.

Expone un motor determinista que no realiza llamadas de red ni requiere claves.
La interfaz `AIProvider` del gateway permite sustituirlo en el futuro por otro
adaptador sin cambiar los servicios de dominio.
"""

from app.ai_core.engine import LocalProvider, build_adaptation, build_tutor_hint

__all__ = ["LocalProvider", "build_adaptation", "build_tutor_hint"]
