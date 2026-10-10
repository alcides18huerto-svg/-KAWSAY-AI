from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models import *
from app.schemas import *
from app.modules.ai.service import adapt_activity_sync, tutor_reply

api = APIRouter(prefix="/api/v1")

@api.get("/students/me")
def student_me(user=Depends(require_roles("STUDENT")), db: Session = Depends(get_db)):
    profile = db.get(StudentProfile, user.id)
    return {"id": user.id, "full_name": user.full_name, "email": user.email,
            "profile": None if not profile else {
                "grade": profile.grade, "native_language": profile.native_language,
                "preferred_language": profile.preferred_language, "interests": profile.interests
            }}

@api.put("/students/me/profile")
def set_student_profile(payload: StudentProfileCreate, user=Depends(require_roles("STUDENT")),
                        db: Session = Depends(get_db)):
    profile = db.get(StudentProfile, user.id)
    if not profile:
        profile = StudentProfile(user_id=user.id, **payload.model_dump())
        db.add(profile)
    else:
        for k,v in payload.model_dump().items(): setattr(profile,k,v)
    db.commit()
    return {"status":"ok"}

@api.post("/schools")
def create_school(payload: SchoolCreate, user=Depends(require_roles("ADMIN","TEACHER")),
                  db: Session = Depends(get_db)):
    obj=School(**payload.model_dump()); db.add(obj); db.commit(); db.refresh(obj)
    return {"id":obj.id,"name":obj.name}

@api.get("/schools")
def schools(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id":x.id,"name":x.name,"region":x.region} for x in db.scalars(select(School)).all()]

@api.post("/classrooms")
def create_classroom(payload: ClassroomCreate, user=Depends(require_roles("TEACHER","ADMIN")),
                     db: Session = Depends(get_db)):
    obj=Classroom(**payload.model_dump(), teacher_id=user.id)
    db.add(obj); db.commit(); db.refresh(obj)
    return {"id":obj.id,"name":obj.name}

@api.get("/classrooms")
def classrooms(user=Depends(require_roles("TEACHER","ADMIN")), db: Session = Depends(get_db)):
    q=select(Classroom)
    if user.role=="TEACHER": q=q.where(Classroom.teacher_id==user.id)
    return [{"id":x.id,"name":x.name,"school_id":x.school_id,"school_year":x.school_year}
            for x in db.scalars(q).all()]

@api.post("/classrooms/{classroom_id}/students/by-email")
def add_student_by_email(
    classroom_id:str,
    payload:StudentEnrollmentRequest,
    user=Depends(require_roles("TEACHER")),
    db:Session=Depends(get_db),
):
    classroom=db.get(Classroom,classroom_id)
    if not classroom or classroom.teacher_id!=user.id:
        raise HTTPException(404,"Aula no encontrada")
    student=db.scalar(select(User).where(User.email==payload.email,User.role=="STUDENT"))
    if not student:
        raise HTTPException(404,"No se encontró una cuenta de estudiante con ese correo")
    if not db.get(ClassroomStudent,(classroom_id,student.id)):
        db.add(ClassroomStudent(classroom_id=classroom_id,student_id=student.id))
        db.commit()
    return {"status":"ok","student_id":student.id}

@api.get("/teacher/students")
def teacher_students(user=Depends(require_roles("TEACHER")), db:Session=Depends(get_db)):
    rows=db.execute(
        select(User, StudentProfile, Classroom.id, Classroom.name)
        .join(ClassroomStudent, ClassroomStudent.student_id==User.id)
        .join(Classroom, Classroom.id==ClassroomStudent.classroom_id)
        .outerjoin(StudentProfile, StudentProfile.user_id==User.id)
        .where(Classroom.teacher_id==user.id, User.role=="STUDENT")
        .order_by(User.full_name, Classroom.name)
    ).all()
    students={}
    for student, profile, classroom_id, classroom_name in rows:
        item=students.setdefault(student.id, {
            "id":student.id,
            "full_name":student.full_name,
            "email":student.email,
            "grade":profile.grade if profile else None,
            "preferred_language":profile.preferred_language if profile else None,
            "classrooms":[],
        })
        item["classrooms"].append({"id":classroom_id,"name":classroom_name})
    return list(students.values())

@api.get("/teacher/progress")
def teacher_progress(user=Depends(require_roles("TEACHER")), db:Session=Depends(get_db)):
    students=teacher_students(user, db)
    student_ids=[student["id"] for student in students]
    rows=db.scalars(
        select(StudentProgress)
        .where(StudentProgress.student_id.in_(student_ids))
        .order_by(StudentProgress.subject)
    ).all() if student_ids else []
    progress_by_student={}
    for row in rows:
        progress_by_student.setdefault(row.student_id, []).append({
            "subject":row.subject,
            "mastery_level":row.mastery_level,
            "total_attempts":row.total_attempts,
            "correct_attempts":row.correct_attempts,
            "updated_at":row.updated_at.isoformat(),
        })
    return [
        {**student,"progress":progress_by_student.get(student["id"],[])}
        for student in students
    ]

@api.get("/teacher/assignments")
def teacher_assignments(user=Depends(require_roles("TEACHER")), db:Session=Depends(get_db)):
    rows=db.execute(
        select(Assignment, Classroom.name)
        .join(Classroom, Classroom.id==Assignment.classroom_id)
        .where(Assignment.teacher_id==user.id)
        .order_by(Assignment.created_at.desc())
    ).all()
    return [{
        "id":assignment.id,
        "title":assignment.title,
        "subject":assignment.subject,
        "status":assignment.status,
        "classroom_id":assignment.classroom_id,
        "classroom_name":classroom_name,
        "created_at":assignment.created_at.isoformat(),
    } for assignment, classroom_name in rows]

@api.get("/teacher/interventions")
def teacher_interventions(user=Depends(require_roles("TEACHER")), db:Session=Depends(get_db)):
    student_ids=(
        select(ClassroomStudent.student_id)
        .join(Classroom, Classroom.id==ClassroomStudent.classroom_id)
        .where(Classroom.teacher_id==user.id)
    )
    rows=db.execute(
        select(TeacherIntervention, User.full_name)
        .join(User, User.id==TeacherIntervention.student_id)
        .where(
            TeacherIntervention.teacher_id==user.id,
            TeacherIntervention.student_id.in_(student_ids),
        )
        .order_by(TeacherIntervention.created_at.desc())
    ).all()
    return [{
        "id":intervention.id,
        "student_id":intervention.student_id,
        "student_name":student_name,
        "strategy":intervention.strategy,
        "notes":intervention.notes,
        "created_at":intervention.created_at.isoformat(),
    } for intervention, student_name in rows]

@api.post("/classrooms/{classroom_id}/students/{student_id}")
def add_student(classroom_id:str, student_id:str, user=Depends(require_roles("TEACHER","ADMIN")),
                db:Session=Depends(get_db)):
    classroom=db.get(Classroom,classroom_id)
    student=db.get(User,student_id)
    if not classroom or not student or student.role!="STUDENT": raise HTTPException(404,"Aula o estudiante no encontrado")
    if user.role=="TEACHER" and classroom.teacher_id != user.id: raise HTTPException(403,"No autorizado")
    if not db.get(ClassroomStudent, (classroom_id, student_id)):
        db.add(ClassroomStudent(classroom_id=classroom_id, student_id=student_id)); db.commit()
    return {"status":"ok"}

@api.get("/curriculum/subjects")
def subjects(grade:int|None=None, user=Depends(get_current_user), db:Session=Depends(get_db)):
    q=select(Subject)
    if grade: q=q.where(Subject.grade==grade)
    return [{"id":x.id,"name":x.name,"grade":x.grade} for x in db.scalars(q).all()]

@api.post("/teacher/assignments")
def create_assignment(payload:AssignmentCreate, user=Depends(require_roles("TEACHER")),
                      db:Session=Depends(get_db)):
    classroom=db.get(Classroom,payload.classroom_id)
    if not classroom or classroom.teacher_id != user.id: raise HTTPException(403,"Aula no autorizada")
    obj=Assignment(teacher_id=user.id,classroom_id=payload.classroom_id,subject=payload.subject,
                   title=payload.title,base_content=payload.base_content)
    db.add(obj); db.flush()
    for g in sorted(set(payload.grades)):
        if g < 1 or g > 6: raise HTTPException(400,"Grado inválido")
        db.add(AssignmentGrade(assignment_id=obj.id,grade=g))
    db.commit(); db.refresh(obj)
    return {"id":obj.id,"status":obj.status}

@api.post("/teacher/assignments/{assignment_id}/generate-variants")
def generate_variants(assignment_id:str,user=Depends(require_roles("TEACHER")),db:Session=Depends(get_db)):
    assignment=db.get(Assignment,assignment_id)
    if not assignment or assignment.teacher_id != user.id: raise HTTPException(404,"Actividad no encontrada")
    grades=db.scalars(select(AssignmentGrade).where(AssignmentGrade.assignment_id==assignment_id)).all()
    output=[]
    for ag in grades:
        exists=db.scalar(select(AssignmentVariant).where(
            AssignmentVariant.assignment_id==assignment_id, AssignmentVariant.grade==ag.grade))
        if exists:
            output.append({"id":exists.id,"grade":exists.grade,"content":exists.content,"status":exists.approval_status})
            continue
        generated=adapt_activity_sync(assignment.base_content, ag.grade, assignment.subject)
        v=AssignmentVariant(assignment_id=assignment.id, grade=ag.grade,
                            content=generated.content, generated_by=generated.provider)
        db.add(v); db.flush()
        output.append({"id":v.id,"grade":v.grade,"content":v.content,"status":v.approval_status})
    db.commit()
    return {"variants":output,"teacher_review_required":True}

@api.get("/teacher/assignments/{assignment_id}/variants")
def variants(assignment_id:str,user=Depends(require_roles("TEACHER")),db:Session=Depends(get_db)):
    a=db.get(Assignment,assignment_id)
    if not a or a.teacher_id!=user.id: raise HTTPException(404,"No encontrado")
    rows=db.scalars(select(AssignmentVariant).where(AssignmentVariant.assignment_id==assignment_id)).all()
    return [{"id":x.id,"grade":x.grade,"content":x.content,"status":x.approval_status} for x in rows]

@api.post("/teacher/assignments/{assignment_id}/approve")
def approve(assignment_id:str,user=Depends(require_roles("TEACHER")),db:Session=Depends(get_db)):
    a=db.get(Assignment,assignment_id)
    if not a or a.teacher_id!=user.id: raise HTTPException(404,"No encontrado")
    rows=db.scalars(select(AssignmentVariant).where(AssignmentVariant.assignment_id==assignment_id)).all()
    if not rows: raise HTTPException(400,"Primero genera variantes")
    for x in rows: x.approval_status="APPROVED"
    a.status="REVIEW"; db.commit()
    return {"status":"approved"}

@api.post("/teacher/assignments/{assignment_id}/publish")
def publish(assignment_id:str,user=Depends(require_roles("TEACHER")),db:Session=Depends(get_db)):
    a=db.get(Assignment,assignment_id)
    if not a or a.teacher_id!=user.id: raise HTTPException(404,"No encontrado")
    rows=db.scalars(select(AssignmentVariant).where(AssignmentVariant.assignment_id==assignment_id)).all()
    if not rows or any(x.approval_status!="APPROVED" for x in rows):
        raise HTTPException(400,"Todas las variantes deben estar aprobadas")
    a.status="PUBLISHED"; db.commit()
    return {"status":"published"}

@api.get("/students/me/assignments")
def my_assignments(user=Depends(require_roles("STUDENT")),db:Session=Depends(get_db)):
    profile=db.get(StudentProfile,user.id)
    if not profile: return []
    classroom_ids=select(ClassroomStudent.classroom_id).where(ClassroomStudent.student_id==user.id)
    q=select(Assignment).where(Assignment.classroom_id.in_(classroom_ids),Assignment.status=="PUBLISHED")
    assignments=db.scalars(q).all()
    result=[]
    for a in assignments:
        v=db.scalar(select(AssignmentVariant).where(
            AssignmentVariant.assignment_id==a.id,AssignmentVariant.grade==profile.grade,
            AssignmentVariant.approval_status=="APPROVED"))
        if v: result.append({"id":a.id,"title":a.title,"subject":a.subject,"content":v.content,"grade":v.grade})
    return result

@api.post("/learning/attempts")
def create_attempt(payload:AttemptCreate,user=Depends(require_roles("STUDENT")),db:Session=Depends(get_db)):
    if db.get(LearningAttempt,payload.id): return {"status":"already_synced","id":payload.id}
    obj=LearningAttempt(student_id=user.id,**payload.model_dump())
    db.add(obj)
    progress=db.scalar(select(StudentProgress).where(StudentProgress.student_id==user.id,
                                                     StudentProgress.subject=="General"))
    if not progress:
        progress=StudentProgress(student_id=user.id,subject="General")
        db.add(progress)
    progress.total_attempts += 1
    if payload.is_correct: progress.correct_attempts += 1
    progress.mastery_level = round(progress.correct_attempts / progress.total_attempts * 100, 2)
    db.commit()
    return {"status":"synced","id":payload.id}

@api.get("/progress/me")
def my_progress(user=Depends(require_roles("STUDENT")),db:Session=Depends(get_db)):
    rows=db.scalars(select(StudentProgress).where(StudentProgress.student_id==user.id)).all()
    return [{"subject":x.subject,"mastery_level":x.mastery_level,"attempts":x.total_attempts,
             "correct":x.correct_attempts} for x in rows]

@api.get("/teacher/dashboard")
def teacher_dashboard(user=Depends(require_roles("TEACHER")), db:Session=Depends(get_db)):
    classroom_query=select(Classroom.id).where(Classroom.teacher_id==user.id)
    classroom_ids=[x for x in db.scalars(classroom_query).all()]
    student_count=db.scalar(select(func.count()).select_from(ClassroomStudent).where(
        ClassroomStudent.classroom_id.in_(classroom_ids))) if classroom_ids else 0
    assignments=db.scalars(select(Assignment).where(Assignment.teacher_id==user.id).order_by(Assignment.created_at.desc()).limit(6)).all()
    flag_query=select(SupportFlag).join(ClassroomStudent, ClassroomStudent.student_id==SupportFlag.student_id).where(
        ClassroomStudent.classroom_id.in_(classroom_ids), SupportFlag.status=="OPEN") if classroom_ids else None
    flags=db.scalars(flag_query).all() if flag_query is not None else []
    return {
        "summary": {"classrooms": len(classroom_ids), "students": student_count or 0,
                    "assignments": len(assignments), "open_flags": len(flags)},
        "assignments": [{"id":x.id,"title":x.title,"subject":x.subject,"status":x.status,
                         "created_at":x.created_at.isoformat()} for x in assignments],
        "flags": [{"id":x.id,"student_id":x.student_id,"reason":x.reason,"evidence":x.evidence}
                  for x in flags[:6]],
    }

@api.get("/teacher/support-flags")
def flags(user=Depends(require_roles("TEACHER")),db:Session=Depends(get_db)):
    classroom_ids=select(Classroom.id).where(Classroom.teacher_id==user.id)
    student_ids=select(ClassroomStudent.student_id).where(ClassroomStudent.classroom_id.in_(classroom_ids))
    rows=db.scalars(select(SupportFlag).where(SupportFlag.student_id.in_(student_ids), SupportFlag.status=="OPEN")).all()
    return [{"id":x.id,"student_id":x.student_id,"reason":x.reason,"evidence":x.evidence} for x in rows]

@api.post("/teacher/interventions")
def intervention(payload:InterventionCreate,user=Depends(require_roles("TEACHER")),db:Session=Depends(get_db)):
    enrolled=db.scalar(
        select(ClassroomStudent.student_id)
        .join(Classroom, Classroom.id==ClassroomStudent.classroom_id)
        .join(User, User.id==ClassroomStudent.student_id)
        .where(
            Classroom.teacher_id==user.id,
            ClassroomStudent.student_id==payload.student_id,
            User.role=="STUDENT",
        )
        .limit(1)
    )
    if not enrolled:
        raise HTTPException(404,"Estudiante no encontrado en tus aulas")
    obj=TeacherIntervention(teacher_id=user.id,**payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return {"id":obj.id}

@api.post("/tutor/message")
def tutor(payload:TutorRequest,user=Depends(require_roles("STUDENT")),db:Session=Depends(get_db)):
    profile=db.get(StudentProfile,user.id)
    return {"reply":tutor_reply(payload.message, profile.grade if profile else None,
                                payload.subject,payload.topic)}
