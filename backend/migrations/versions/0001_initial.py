"Initial KAWSAY schema.

Revision ID: 0001_initial
Revises:
""
from alembic import op
import sqlalchemy as sa
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table("users", sa.Column("id", sa.String(36), primary_key=True), sa.Column("email", sa.String(255), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("role", sa.String(20), nullable=False), sa.Column("full_name", sa.String(180), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime(), nullable=False), sa.UniqueConstraint("email"))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_table("schools", sa.Column("id", sa.String(36), primary_key=True), sa.Column("name", sa.String(200), nullable=False), sa.Column("country", sa.String(80), nullable=False), sa.Column("region", sa.String(100)), sa.Column("community", sa.String(120)))
    op.create_index("ix_schools_name", "schools", ["name"])
    op.create_table("classrooms", sa.Column("id", sa.String(36), primary_key=True), sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=False), sa.Column("teacher_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("school_year", sa.Integer(), nullable=False))
    op.create_index("ix_classrooms_school_id", "classrooms", ["school_id"])
    op.create_index("ix_classrooms_teacher_id", "classrooms", ["teacher_id"])
    op.create_table("student_profiles", sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), primary_key=True), sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id")), sa.Column("grade", sa.Integer(), nullable=False), sa.Column("native_language", sa.String(80), nullable=False), sa.Column("preferred_language", sa.String(80), nullable=False), sa.Column("interests", sa.Text()))
    op.create_table("classroom_students", sa.Column("classroom_id", sa.String(36), sa.ForeignKey("classrooms.id"), primary_key=True), sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), primary_key=True))
    op.create_table("subjects", sa.Column("id", sa.String(36), primary_key=True), sa.Column("name", sa.String(120), nullable=False), sa.Column("grade", sa.Integer(), nullable=False))
    op.create_index("ix_subjects_name", "subjects", ["name"])
    op.create_index("ix_subjects_grade", "subjects", ["grade"])
    op.create_table("competencies", sa.Column("id", sa.String(36), primary_key=True), sa.Column("subject_id", sa.String(36), sa.ForeignKey("subjects.id"), nullable=False), sa.Column("name", sa.String(255), nullable=False))
    op.create_index("ix_competencies_subject_id", "competencies", ["subject_id"])
    op.create_table("assignments", sa.Column("id", sa.String(36), primary_key=True), sa.Column("teacher_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("classroom_id", sa.String(36), sa.ForeignKey("classrooms.id"), nullable=False), sa.Column("subject", sa.String(120), nullable=False), sa.Column("title", sa.String(180), nullable=False), sa.Column("base_content", sa.Text(), nullable=False), sa.Column("status", sa.String(20), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_table("assignment_grades", sa.Column("assignment_id", sa.String(36), sa.ForeignKey("assignments.id"), primary_key=True), sa.Column("grade", sa.Integer(), primary_key=True))
    op.create_table("assignment_variants", sa.Column("id", sa.String(36), primary_key=True), sa.Column("assignment_id", sa.String(36), sa.ForeignKey("assignments.id"), nullable=False), sa.Column("grade", sa.Integer(), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("generated_by", sa.String(20), nullable=False), sa.Column("approval_status", sa.String(20), nullable=False), sa.Column("version", sa.Integer(), nullable=False), sa.UniqueConstraint("assignment_id", "grade", "version"))
    op.create_index("ix_assignment_variants_assignment_id", "assignment_variants", ["assignment_id"])
    op.create_table("learning_attempts", sa.Column("id", sa.String(36), primary_key=True), sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("assignment_id", sa.String(36), sa.ForeignKey("assignments.id")), sa.Column("question_key", sa.String(100), nullable=False), sa.Column("answer", sa.Text(), nullable=False), sa.Column("is_correct", sa.Boolean(), nullable=False), sa.Column("hints_used", sa.Integer(), nullable=False), sa.Column("response_time_seconds", sa.Float(), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_index("ix_learning_attempts_student_id", "learning_attempts", ["student_id"])
    op.create_table("student_progress", sa.Column("id", sa.String(36), primary_key=True), sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("subject", sa.String(120), nullable=False), sa.Column("mastery_level", sa.Float(), nullable=False), sa.Column("total_attempts", sa.Integer(), nullable=False), sa.Column("correct_attempts", sa.Integer(), nullable=False), sa.Column("updated_at", sa.DateTime(), nullable=False))
    op.create_index("ix_student_progress_student_id", "student_progress", ["student_id"])
    op.create_index("ix_student_progress_subject", "student_progress", ["subject"])
    op.create_table("support_flags", sa.Column("id", sa.String(36), primary_key=True), sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("reason", sa.Text(), nullable=False), sa.Column("evidence", sa.Text(), nullable=False), sa.Column("status", sa.String(20), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_index("ix_support_flags_student_id", "support_flags", ["student_id"])
    op.create_table("teacher_interventions", sa.Column("id", sa.String(36), primary_key=True), sa.Column("teacher_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("strategy", sa.Text(), nullable=False), sa.Column("notes", sa.Text()), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_index("ix_teacher_interventions_teacher_id", "teacher_interventions", ["teacher_id"])
    op.create_index("ix_teacher_interventions_student_id", "teacher_interventions", ["student_id"])

def downgrade() -> None:
    for table in ["teacher_interventions", "support_flags", "student_progress", "learning_attempts", "assignment_variants", "assignment_grades", "assignments", "competencies", "subjects", "classroom_students", "student_profiles", "classrooms", "schools", "users"]:
        op.drop_table(table)
