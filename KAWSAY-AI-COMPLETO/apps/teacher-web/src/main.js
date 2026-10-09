import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { request } from "./api";
import "./styles.css";
function Login({ done }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            if (creating) {
                await request("/auth/register", { method: "POST", body: JSON.stringify({
                        email, password, full_name: fullName, role: "TEACHER",
                    }) });
            }
            const result = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
            if (result.user.role !== "TEACHER")
                throw new Error("Esta pantalla es solo para cuentas docentes.");
            localStorage.setItem("token", result.access_token);
            done();
        }
        catch (error) {
            setError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
        }
        finally {
            setBusy(false);
        }
    }
    return _jsx("div", { className: "center", children: _jsxs("form", { className: "card login", onSubmit: submit, children: [_jsx("h1", { children: "KAWSAY AI" }), _jsx("p", { children: "Panel docente" }), creating && _jsxs(_Fragment, { children: [_jsx("label", { children: "Nombre completo" }), _jsx("input", { required: true, value: fullName, onChange: event => setFullName(event.target.value) })] }), _jsx("label", { children: "Correo" }), _jsx("input", { type: "email", required: true, autoComplete: "email", value: email, onChange: event => setEmail(event.target.value) }), _jsx("label", { children: "Contrase\u00F1a" }), _jsx("input", { type: "password", required: true, minLength: 8, autoComplete: creating ? "new-password" : "current-password", value: password, onChange: event => setPassword(event.target.value) }), error && _jsx("div", { className: "notice error-box", children: error }), _jsx("button", { disabled: busy, children: busy ? "Procesando…" : creating ? "Crear cuenta e ingresar" : "Ingresar" }), _jsx("button", { className: "link-button", type: "button", onClick: () => { setCreating(!creating); setError(""); }, children: creating ? "Ya tengo cuenta" : "Crear cuenta docente" })] }) });
}
function App() {
    const [logged, setLogged] = useState(!!localStorage.getItem("token"));
    const [view, setView] = useState("dashboard");
    const [classrooms, setClassrooms] = useState([]);
    const [schools, setSchools] = useState([]);
    const [students, setStudents] = useState([]);
    const [progress, setProgress] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [variants, setVariants] = useState([]);
    const [interventions, setInterventions] = useState([]);
    const [flags, setFlags] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [assignmentId, setAssignmentId] = useState("");
    const [selectedClassroom, setSelectedClassroom] = useState("");
    const [selectedSchool, setSelectedSchool] = useState("");
    const [classroomName, setClassroomName] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [schoolRegion, setSchoolRegion] = useState("");
    const [studentEmail, setStudentEmail] = useState("");
    const [interventionStudent, setInterventionStudent] = useState("");
    const [strategy, setStrategy] = useState("");
    const [interventionNotes, setInterventionNotes] = useState("");
    const [title, setTitle] = useState("");
    const [subject, setSubject] = useState("Matemática");
    const [content, setContent] = useState("");
    const [grades, setGrades] = useState([1, 2, 3]);
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    async function loadBase() {
        const [classroomRows, schoolRows] = await Promise.all([
            request("/classrooms"),
            request("/schools"),
        ]);
        setClassrooms(classroomRows);
        setSchools(schoolRows);
        if (!selectedClassroom && classroomRows.length)
            setSelectedClassroom(classroomRows[0].id);
        if (!selectedSchool && schoolRows.length)
            setSelectedSchool(schoolRows[0].id);
    }
    async function loadView(next, focusStudentId) {
        setView(next);
        setError("");
        setStatus("");
        setLoading(true);
        try {
            if (next === "dashboard")
                setDashboard(await request("/teacher/dashboard"));
            if (next === "classrooms") {
                await loadBase();
                setStudents(await request("/teacher/students"));
            }
            if (next === "students")
                setStudents(await request("/teacher/students"));
            if (next === "progress")
                setProgress(await request("/teacher/progress"));
            if (next === "flags") {
                const [flagRows, studentRows] = await Promise.all([
                    request("/teacher/support-flags"),
                    request("/teacher/students"),
                ]);
                setFlags(flagRows);
                setStudents(studentRows);
            }
            if (next === "interventions") {
                const [studentRows, interventionRows] = await Promise.all([
                    request("/teacher/students"),
                    request("/teacher/interventions"),
                ]);
                setStudents(studentRows);
                setInterventions(interventionRows);
                if (focusStudentId)
                    setInterventionStudent(focusStudentId);
                else if (!interventionStudent && studentRows.length)
                    setInterventionStudent(studentRows[0].id);
            }
            if (next === "assignments")
                setAssignments(await request("/teacher/assignments"));
            if (next === "create")
                await loadBase();
        }
        catch (error) {
            setError(error instanceof Error ? error.message : "No se pudieron cargar los datos.");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { if (logged)
        void loadView("dashboard"); }, [logged]);
    async function runAction(action, successMessage) {
        setBusy(true);
        setError("");
        setStatus("");
        try {
            await action();
            if (successMessage)
                setStatus(successMessage);
        }
        catch (error) {
            setError(error instanceof Error ? error.message : "No se pudo completar la operación.");
        }
        finally {
            setBusy(false);
        }
    }
    async function createSchool(event) {
        event.preventDefault();
        await runAction(async () => {
            const school = await request("/schools", { method: "POST", body: JSON.stringify({
                    name: schoolName.trim(), country: "Perú", region: schoolRegion.trim() || null,
                }) });
            setSchoolName("");
            setSchoolRegion("");
            await loadBase();
            setSelectedSchool(school.id);
        }, "Escuela creada.");
    }
    async function createClassroom(event) {
        event.preventDefault();
        await runAction(async () => {
            if (!selectedSchool)
                throw new Error("Selecciona o crea una escuela primero.");
            await request("/classrooms", { method: "POST", body: JSON.stringify({
                    school_id: selectedSchool, name: classroomName.trim(),
                }) });
            setClassroomName("");
            await loadBase();
        }, "Aula creada.");
    }
    async function enrollStudent(event) {
        event.preventDefault();
        await runAction(async () => {
            if (!selectedClassroom)
                throw new Error("Selecciona un aula primero.");
            await request(`/classrooms/${selectedClassroom}/students/by-email`, {
                method: "POST", body: JSON.stringify({ email: studentEmail.trim() }),
            });
            setStudentEmail("");
            setStudents(await request("/teacher/students"));
        }, "Estudiante matriculado.");
    }
    async function createAssignment(event) {
        event.preventDefault();
        await runAction(async () => {
            if (!selectedClassroom)
                throw new Error("Selecciona un aula.");
            if (!grades.length)
                throw new Error("Selecciona al menos un grado.");
            const assignment = await request("/teacher/assignments", { method: "POST", body: JSON.stringify({
                    classroom_id: selectedClassroom, subject, title: title.trim(), base_content: content.trim(), grades,
                }) });
            const response = await request(`/teacher/assignments/${assignment.id}/generate-variants`, { method: "POST" });
            setAssignmentId(assignment.id);
            setVariants(response.variants);
            setAssignments(await request("/teacher/assignments"));
            setTitle("");
            setContent("");
        }, "Variantes generadas. Revísalas antes de aprobar y publicar.");
    }
    async function loadVariants(id) {
        await runAction(async () => {
            setAssignmentId(id);
            setVariants(await request(`/teacher/assignments/${id}/variants`));
            setView("assignments");
        });
    }
    async function createIntervention(event) {
        event.preventDefault();
        await runAction(async () => {
            await request("/teacher/interventions", { method: "POST", body: JSON.stringify({
                    student_id: interventionStudent, strategy: strategy.trim(), notes: interventionNotes.trim() || null,
                }) });
            setStrategy("");
            setInterventionNotes("");
            setInterventions(await request("/teacher/interventions"));
        }, "Intervención registrada.");
    }
    if (!logged)
        return _jsx(Login, { done: () => setLogged(true) });
    const viewTitles = {
        dashboard: "Resumen docente", create: "Crear actividad multigrado", classrooms: "Mis aulas",
        students: "Estudiantes", progress: "Progreso", flags: "Alertas de apoyo",
        interventions: "Intervenciones", assignments: "Actividades",
    };
    return _jsxs("div", { className: "shell", children: [_jsxs("aside", { children: [_jsx("h2", { children: "KAWSAY" }), _jsx("span", { children: "Docente" }), [
                        ["dashboard", "Dashboard"], ["classrooms", "Mis aulas"], ["students", "Estudiantes"],
                        ["progress", "Progreso"], ["assignments", "Actividades"], ["create", "Crear actividad"],
                        ["flags", "Alertas"], ["interventions", "Intervenciones"],
                    ].map(([key, label]) => _jsx("button", { className: `nav ${view === key ? "selected" : ""}`, onClick: () => void loadView(key), children: label }, key)), _jsx("button", { className: "ghost", onClick: () => { localStorage.removeItem("token"); setLogged(false); }, children: "Salir" })] }), _jsxs("main", { children: [_jsx("header", { children: _jsxs("div", { children: [_jsx("h1", { children: viewTitles[view] }), _jsx("p", { children: "Decisiones claras para acompa\u00F1ar mejor a cada estudiante." })] }) }), error && _jsx("div", { className: "notice error-box", role: "alert", children: error }), status && _jsx("div", { className: "notice success-box", role: "status", children: status }), loading && _jsx("p", { className: "muted", children: "Cargando informaci\u00F3n\u2026" }), view === "dashboard" && dashboard && _jsxs(_Fragment, { children: [_jsx("section", { className: "metrics", children: [
                                    ["Aulas", dashboard.summary.classrooms], ["Estudiantes", dashboard.summary.students],
                                    ["Actividades", dashboard.summary.assignments], ["Alertas abiertas", dashboard.summary.open_flags],
                                ].map(([label, value]) => _jsxs("div", { className: "metric card", children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }, label)) }), _jsxs("section", { className: "grid dashboard-grid", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Actividades recientes" }), !dashboard.assignments.length && _jsx("p", { children: "A\u00FAn no tienes actividades creadas." }), dashboard.assignments.map(item => _jsxs("article", { className: "list-row", children: [_jsxs("div", { children: [_jsx("b", { children: item.title }), _jsx("small", { children: item.subject })] }), _jsx("span", { className: `badge ${item.status.toLowerCase()}`, children: item.status })] }, item.id))] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Alertas de apoyo" }), !dashboard.flags.length && _jsx("p", { children: "No hay alertas abiertas." }), dashboard.flags.map(flag => _jsxs("article", { className: "flag", children: [_jsx("b", { children: flag.reason }), _jsx("p", { children: flag.evidence })] }, flag.id))] })] })] }), view === "classrooms" && _jsxs("section", { className: "grid", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Aulas a tu cargo" }), !classrooms.length && _jsx("p", { children: "A\u00FAn no tienes aulas creadas." }), classrooms.map(room => _jsxs("article", { className: "list-row", children: [_jsxs("div", { children: [_jsx("b", { children: room.name }), _jsxs("small", { children: ["A\u00F1o escolar ", room.school_year] })] }), _jsxs("span", { children: [students.flatMap(student => student.classrooms).filter(item => item.id === room.id).length, " estudiantes"] })] }, room.id)), _jsx("h3", { children: "Matricular estudiante" }), _jsxs("form", { onSubmit: enrollStudent, children: [_jsx("label", { children: "Aula" }), _jsxs("select", { required: true, value: selectedClassroom, onChange: event => setSelectedClassroom(event.target.value), children: [_jsx("option", { value: "", children: "Seleccionar aula" }), classrooms.map(room => _jsx("option", { value: room.id, children: room.name }, room.id))] }), _jsx("label", { children: "Correo de la cuenta del estudiante" }), _jsx("input", { required: true, type: "email", value: studentEmail, onChange: event => setStudentEmail(event.target.value) }), _jsx("button", { disabled: busy, children: "Matricular" })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Crear aula" }), _jsxs("form", { onSubmit: createSchool, className: "subform", children: [_jsx("h3", { children: "Escuela" }), _jsx("label", { children: "Nombre" }), _jsx("input", { required: true, value: schoolName, onChange: event => setSchoolName(event.target.value) }), _jsx("label", { children: "Regi\u00F3n (opcional)" }), _jsx("input", { value: schoolRegion, onChange: event => setSchoolRegion(event.target.value) }), _jsx("button", { className: "secondary", disabled: busy, children: "Crear escuela" })] }), _jsxs("form", { onSubmit: createClassroom, children: [_jsx("h3", { children: "Aula" }), _jsx("label", { children: "Escuela" }), _jsxs("select", { required: true, value: selectedSchool, onChange: event => setSelectedSchool(event.target.value), children: [_jsx("option", { value: "", children: "Seleccionar escuela" }), schools.map(school => _jsx("option", { value: school.id, children: school.name }, school.id))] }), _jsx("label", { children: "Nombre del aula" }), _jsx("input", { required: true, value: classroomName, onChange: event => setClassroomName(event.target.value), placeholder: "Ej. 4.\u00BA primaria - A" }), _jsx("button", { disabled: busy || !schools.length, children: "Crear aula" })] })] })] }), view === "students" && _jsxs("section", { className: "card table-wrap", children: [_jsx("h2", { children: "Estudiantes matriculados" }), !students.length ? _jsx("p", { children: "No hay estudiantes en tus aulas todav\u00EDa." }) : _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Estudiante" }), _jsx("th", { children: "Correo" }), _jsx("th", { children: "Grado" }), _jsx("th", { children: "Idioma" }), _jsx("th", { children: "Aulas" }), _jsx("th", {})] }) }), _jsx("tbody", { children: students.map(student => _jsxs("tr", { children: [_jsx("td", { children: student.full_name }), _jsx("td", { children: student.email }), _jsx("td", { children: student.grade ?? "Sin perfil" }), _jsx("td", { children: student.preferred_language ?? "—" }), _jsx("td", { children: student.classrooms.map(room => room.name).join(", ") }), _jsx("td", { children: _jsx("button", { className: "small-button", onClick: () => void loadView("progress"), children: "Ver progreso" }) })] }, student.id)) })] }), _jsx("p", { className: "muted", children: "Para matricular, registra primero la cuenta del estudiante y luego usa el formulario de la secci\u00F3n \u201CMis aulas\u201D." })] }), view === "progress" && _jsxs("section", { className: "card table-wrap", children: [_jsx("h2", { children: "Progreso por estudiante y \u00E1rea" }), !progress.some(student => student.progress.length) && _jsx("p", { children: "A\u00FAn no hay intentos registrados para tus aulas." }), progress.map(student => _jsxs("article", { className: "progress-student", children: [_jsxs("h3", { children: [student.full_name, " ", _jsxs("small", { children: [student.grade ? `${student.grade}.º grado` : "Grado sin configurar", " \u00B7 ", student.classrooms.map(room => room.name).join(", ")] })] }), !student.progress.length ? _jsx("p", { className: "muted", children: "Sin datos de progreso." }) : _jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u00C1rea" }), _jsx("th", { children: "Dominio" }), _jsx("th", { children: "Intentos" }), _jsx("th", { children: "Correctos" }), _jsx("th", { children: "Actualizado" })] }) }), _jsx("tbody", { children: student.progress.map(item => _jsxs("tr", { children: [_jsx("td", { children: item.subject }), _jsxs("td", { children: [_jsx("div", { className: "progress-track", children: _jsx("span", { style: { width: `${Math.max(0, Math.min(100, item.mastery_level))}%` } }) }), item.mastery_level, "%"] }), _jsx("td", { children: item.total_attempts }), _jsx("td", { children: item.correct_attempts }), _jsx("td", { children: new Date(item.updated_at).toLocaleDateString() })] }, `${student.id}-${item.subject}`)) })] }) })] }, student.id))] }), view === "flags" && _jsxs("section", { className: "card", children: [_jsx("h2", { children: "Alertas abiertas" }), !flags.length && _jsx("p", { children: "No hay alertas abiertas para tus aulas." }), flags.map(flag => _jsxs("article", { className: "flag", children: [_jsx("b", { children: flag.reason }), _jsx("p", { children: flag.evidence }), _jsxs("small", { children: ["Estudiante: ", students.find(student => student.id === flag.student_id)?.full_name ?? flag.student_id] }), _jsx("button", { className: "small-button", onClick: () => void loadView("interventions", flag.student_id), children: "Registrar intervenci\u00F3n" })] }, flag.id))] }), view === "interventions" && _jsxs("section", { className: "grid", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Registrar intervenci\u00F3n" }), !students.length ? _jsx("p", { children: "Matricula estudiantes en tus aulas antes de registrar intervenciones." }) : _jsxs("form", { onSubmit: createIntervention, children: [_jsx("label", { children: "Estudiante" }), _jsx("select", { required: true, value: interventionStudent, onChange: event => setInterventionStudent(event.target.value), children: students.map(student => _jsxs("option", { value: student.id, children: [student.full_name, " \u2014 ", student.classrooms.map(room => room.name).join(", ")] }, student.id)) }), _jsx("label", { children: "Estrategia de acompa\u00F1amiento" }), _jsx("textarea", { required: true, rows: 5, value: strategy, onChange: event => setStrategy(event.target.value) }), _jsx("label", { children: "Notas (opcional)" }), _jsx("textarea", { rows: 3, value: interventionNotes, onChange: event => setInterventionNotes(event.target.value) }), _jsx("button", { disabled: busy, children: "Guardar intervenci\u00F3n" })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Intervenciones registradas" }), !interventions.length && _jsx("p", { children: "A\u00FAn no has registrado intervenciones." }), interventions.map(item => _jsxs("article", { className: "intervention", children: [_jsx("b", { children: item.student_name }), _jsx("small", { children: new Date(item.created_at).toLocaleString() }), _jsx("p", { children: item.strategy }), item.notes && _jsx("p", { className: "muted", children: item.notes })] }, item.id))] })] }), view === "assignments" && _jsxs("section", { className: "grid", children: [_jsxs("div", { className: "card", children: [_jsxs("div", { className: "section-heading", children: [_jsx("h2", { children: "Actividades" }), _jsx("button", { onClick: () => void loadView("create"), children: "Crear actividad" })] }), !assignments.length && _jsx("p", { children: "A\u00FAn no tienes actividades." }), assignments.map(item => _jsxs("article", { className: "list-row", children: [_jsxs("div", { children: [_jsx("b", { children: item.title }), _jsxs("small", { children: [item.subject, " \u00B7 ", item.classroom_name] })] }), _jsxs("div", { children: [_jsx("span", { className: `badge ${item.status.toLowerCase()}`, children: item.status }), _jsx("button", { className: "small-button", onClick: () => void loadVariants(item.id), children: "Revisar" })] })] }, item.id))] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Variantes por grado" }), !assignmentId ? _jsx("p", { children: "Selecciona una actividad para revisar sus variantes." }) : !variants.length ? _jsx("p", { children: "No hay variantes generadas." }) : _jsxs(_Fragment, { children: [variants.map(variant => _jsxs("article", { className: "variant", children: [_jsxs("b", { children: [variant.grade, ".\u00BA primaria"] }), _jsx("p", { children: variant.content }), _jsx("span", { className: `badge ${variant.status.toLowerCase()}`, children: variant.status })] }, variant.id)), _jsxs("div", { className: "actions", children: [_jsx("button", { disabled: busy || variants.every(item => item.status === "APPROVED"), onClick: () => void runAction(async () => {
                                                            await request(`/teacher/assignments/${assignmentId}/approve`, { method: "POST" });
                                                            setVariants(await request(`/teacher/assignments/${assignmentId}/variants`));
                                                            setAssignments(await request("/teacher/assignments"));
                                                        }, "Variantes aprobadas."), children: "Aprobar variantes" }), _jsx("button", { className: "secondary", disabled: busy || variants.some(item => item.status !== "APPROVED"), onClick: () => void runAction(async () => {
                                                            await request(`/teacher/assignments/${assignmentId}/publish`, { method: "POST" });
                                                            setAssignments(await request("/teacher/assignments"));
                                                            setVariants(await request(`/teacher/assignments/${assignmentId}/variants`));
                                                        }, "Actividad publicada."), children: "Publicar actividad" })] })] })] })] }), view === "create" && _jsxs("section", { className: "grid", children: [_jsxs("form", { className: "card", onSubmit: createAssignment, children: [_jsx("label", { children: "Aula" }), _jsxs("select", { required: true, value: selectedClassroom, onChange: event => setSelectedClassroom(event.target.value), children: [_jsx("option", { value: "", children: "Seleccionar aula" }), classrooms.map(room => _jsx("option", { value: room.id, children: room.name }, room.id))] }), _jsx("label", { children: "\u00C1rea" }), _jsx("input", { required: true, value: subject, onChange: event => setSubject(event.target.value) }), _jsx("label", { children: "T\u00EDtulo" }), _jsx("input", { required: true, value: title, onChange: event => setTitle(event.target.value), placeholder: "Multiplicaci\u00F3n" }), _jsx("label", { children: "Actividad base" }), _jsx("textarea", { required: true, rows: 7, value: content, onChange: event => setContent(event.target.value) }), _jsx("label", { children: "Grados objetivo" }), _jsx("div", { className: "grades", children: [1, 2, 3, 4, 5, 6].map(grade => _jsxs("button", { type: "button", className: grades.includes(grade) ? "active" : "", onClick: () => setGrades(grades.includes(grade) ? grades.filter(item => item !== grade) : [...grades, grade]), children: [grade, ".\u00BA"] }, grade)) }), _jsx("button", { disabled: busy || !classrooms.length, children: busy ? "Procesando…" : "Generar variantes" })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Variantes para revisi\u00F3n" }), !variants.length ? _jsx("p", { children: "Genera una actividad para ver sus variantes." }) : variants.map(variant => _jsxs("article", { className: "variant", children: [_jsxs("b", { children: [variant.grade, ".\u00BA primaria"] }), _jsx("p", { children: variant.content }), _jsx("span", { className: `badge ${variant.status.toLowerCase()}`, children: variant.status })] }, variant.id)), variants.length > 0 && _jsx("p", { className: "muted", children: "Aprueba y publica las variantes desde la secci\u00F3n Actividades." })] })] })] })] });
}
createRoot(document.getElementById("root")).render(_jsx(App, {}));
