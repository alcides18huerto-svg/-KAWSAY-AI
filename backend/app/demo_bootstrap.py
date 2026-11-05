"""Inicialización opt-in de cuentas docentes y administrativas con datos exclusivamente ficticios.

Sólo se ejecuta con KAWSAY_DEMO_BOOTSTRAP=1 / KAWSAY_DEMO_ADMIN_ENABLED=1 y credenciales
en variables privadas de entorno. No hay contraseñas por defecto ni puntos de acceso
públicos para crear usuarios. En cada arranque DEMO se restablecen las claves indicadas
para que el despliegue público siempre use las credenciales documentadas.
"""
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_engine
from app.core.security import hash_password
from app.modules.schools.models import School
from app.modules.teachers.models import TeacherProfile
from app.modules.users.models import Role, User
from app.modules.users.schemas import UserCreate
from app.modules.users.service import create_staff_user

DEMO_SCHOOL_CODE = "KAWSAY-DEMO-2026"


def _demo_school(db: Session) -> School:
    school = db.scalar(select(School).where(School.code == DEMO_SCHOOL_CODE))
    if school is None:
        school = School(name="Institucion educativa KAWSAY - DEMO", code=DEMO_SCHOOL_CODE,
                        region="Datos ficticios")
        db.add(school)
        db.flush()
        return school
    school.name = "Institucion educativa KAWSAY - DEMO"
    school.region = "Datos ficticios"
    school.deleted_at = None
    return school


def _reset_demo_login(user: User, password: str) -> None:
    user.password_hash = hash_password(password)
    user.is_active = True
    user.failed_login_count = 0
    user.locked_until = None
    user.deleted_at = None


def bootstrap_teacher() -> None:
    if os.environ.get("KAWSAY_DEMO_BOOTSTRAP") != "1":
        return
    email = os.environ.get("KAWSAY_DEMO_TEACHER_EMAIL", "").strip().lower()
    password = os.environ.get("KAWSAY_DEMO_TEACHER_PASSWORD", "")
    if not email or not password:
        raise RuntimeError("La inicializacion DEMO requiere correo y clave definidos en Render")

    with Session(get_engine(), expire_on_commit=False) as db:
        school = _demo_school(db)
        existing = db.scalar(select(User).where(User.email == email))
        if existing is not None:
            if existing.role != Role.TEACHER:
                raise RuntimeError("El correo DEMO ya pertenece a otro rol")
            _reset_demo_login(existing, password)
            profile = db.get(TeacherProfile, existing.id)
            if profile is None:
                db.add(TeacherProfile(user_id=existing.id, school_id=school.id))
            else:
                profile.school_id = school.id
            db.commit()
            print("KAWSAY DEMO: cuenta docente existente actualizada", flush=True)
            return

        create_staff_user(db, UserCreate(
            role="TEACHER", email=email, password=password,
            display_name="Docente demostracion", school_id=school.id
        ))
        print("KAWSAY DEMO: docente habilitado con datos ficticios", flush=True)


def bootstrap_administrator() -> None:
    if os.getenv("KAWSAY_DEMO_ADMIN_ENABLED") != "1":
        return
    username = os.environ["KAWSAY_DEMO_ADMIN_EMAIL"].strip().lower()
    passphrase = os.environ["KAWSAY_DEMO_ADMIN_PASSWORD"]
    with Session(get_engine(), expire_on_commit=False) as db:
        existing = db.scalar(select(User).where(User.email == username))
        if existing is not None:
            if existing.role != Role.ADMIN:
                raise ValueError("El correo ya pertenece a otro rol")
            _reset_demo_login(existing, passphrase)
            db.commit()
            print("KAWSAY DEMO: administrador existente actualizado", flush=True)
            return
        create_staff_user(db, UserCreate(
            role="ADMIN", email=username, password=passphrase, display_name="Administrador KAWSAY"
        ))
        print("KAWSAY DEMO: administrador creado", flush=True)


if __name__ == "__main__":
    bootstrap_teacher()
    bootstrap_administrator()
