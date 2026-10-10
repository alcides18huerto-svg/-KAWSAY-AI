"""Role-Based Access Control (RBAC) dependencies.

Usage as a FastAPI dependency::

    @router.get("/teacher-only")
    def endpoint(user=Depends(RequireRole(["TEACHER"]))):
        ...
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.core.security import get_current_user


class RequireRole:
    def __init__(self, roles: list[str]):
        self.roles = set(roles)

    def __call__(self, user=Depends(get_current_user)):
        if user.role not in self.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permiso insuficiente",
            )
        return user
