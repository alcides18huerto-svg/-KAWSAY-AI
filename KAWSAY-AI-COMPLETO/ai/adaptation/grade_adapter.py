class GradeAdapter:
    def adapt(self, activity: dict, grade: int) -> dict:
        return {"grade": grade, "activity": activity, "teacher_review_required": True}
