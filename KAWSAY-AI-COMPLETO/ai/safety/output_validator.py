def validate_teacher_review(payload: dict) -> dict:
    payload["teacher_review_required"] = True
    return payload
