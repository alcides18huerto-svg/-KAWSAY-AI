"""Transparent rules over actual attempts; never train on private answers."""
from collections import defaultdict

from sqlalchemy import select

from app.models import (
    Assignment,
    AssignmentVariant,
    ClassroomStudent,
    LearningAttempt,
    StudentProfile,
)
from app.modules.ai.inference import classify_stored_activity

LEVELS = ["BASIC", "INTERMEDIATE", "ADVANCED"]


def recommend(db, student_id: str, limit: int = 5):
    profile = db.get(StudentProfile, student_id)
    if not profile:
        return {"method": "pedagogical_rules_v1", "items": [], "reason": "missing_grade", "teacher_review_required": True}
    classrooms = select(ClassroomStudent.classroom_id).where(ClassroomStudent.student_id == student_id)
    # Bounded work; only approved, published content available to this learner.
    candidates = db.execute(
        select(Assignment, AssignmentVariant)
        .join(AssignmentVariant, AssignmentVariant.assignment_id == Assignment.id)
        .where(Assignment.classroom_id.in_(classrooms), Assignment.status == "PUBLISHED",
               AssignmentVariant.approval_status == "APPROVED", AssignmentVariant.grade == profile.grade)
        .order_by(Assignment.created_at.desc(), Assignment.id).limit(100)
    ).all()
    history = db.execute(
        select(LearningAttempt, Assignment.subject)
        .join(Assignment, Assignment.id == LearningAttempt.assignment_id)
        .where(LearningAttempt.student_id == student_id, Assignment.classroom_id.in_(classrooms))
        .order_by(LearningAttempt.created_at.desc(), LearningAttempt.id).limit(500)
    ).all()
    areas = defaultdict(list)
    attempted, recent = set(), set()
    for i, (attempt, subject) in enumerate(history):
        areas[subject].append(attempt)
        attempted.add(attempt.assignment_id)
        if i < 10:
            recent.add(attempt.assignment_id)
    evidence = {}
    for subject, attempts in areas.items():
        n = len(attempts)
        accuracy = sum(a.is_correct for a in attempts) / n
        hints = sum(a.hints_used for a in attempts) / n
        # No timing threshold without reliable task-level expected durations.
        target = "BASIC" if accuracy < 0.5 or hints >= 2 else "INTERMEDIATE"
        if n >= 5 and accuracy >= 0.85 and hints < 1:
            target = "ADVANCED"
        evidence[subject] = {"attempts": n, "accuracy": accuracy, "mean_hints": hints,
                             "mean_seconds": sum(a.response_time_seconds for a in attempts) / n,
                             "target_difficulty": target, "needs_reinforcement": accuracy < 0.65}
    ranked = []
    for assignment, variant in candidates:
        area = evidence.get(assignment.subject)
        prediction = classify_stored_activity(variant.content, profile.grade, assignment.subject)
        target = area["target_difficulty"] if area else "BASIC"
        # Synthetic or abstained classifications must not drive level assignment.
        reliable = prediction.dataset_origin == "authorized" and not prediction.abstained
        distance = abs(LEVELS.index(prediction.difficulty) - LEVELS.index(target)) if reliable else 0
        priority = (assignment.id in recent, assignment.id in attempted,
                    not (area and area["needs_reinforcement"]), distance, assignment.id)
        ranked.append((priority, {
            "assignment_id": assignment.id, "title": assignment.title, "subject": assignment.subject,
            "target_difficulty": target, "estimated_difficulty": prediction.difficulty if reliable else None,
            "reason": "reinforce_subject" if area and area["needs_reinforcement"] else "explore_approved_activity",
            "already_attempted": assignment.id in attempted,
        }))
    ranked.sort(key=lambda item: item[0])
    return {"method": "pedagogical_rules_v1", "items": [item for _, item in ranked[:limit]],
            "evidence_by_subject": evidence, "history_window": len(history),
            "competency_analysis": "unavailable_no_attempt_competency_link",
            "limitations": "Correctness is client-reported; no validated previous difficulty or timing baseline. Teacher may override.",
            "teacher_review_required": True}
