import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { request } from "./api";
import "./styles.css";
function Login({ done }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            const result = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
            if (result.user.role !== "ADMIN")
                throw new Error("Esta pantalla es solo para cuentas de administración.");
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
    return _jsx("div", { className: "center", children: _jsxs("form", { className: "card login", onSubmit: submit, children: [_jsx("h1", { children: "KAWSAY AI" }), _jsx("p", { children: "Panel de administraci\u00F3n" }), _jsx("label", { children: "Correo" }), _jsx("input", { type: "email", required: true, autoComplete: "email", value: email, onChange: event => setEmail(event.target.value) }), _jsx("label", { children: "Contrase\u00F1a" }), _jsx("input", { type: "password", required: true, minLength: 8, autoComplete: "current-password", value: password, onChange: event => setPassword(event.target.value) }), error && _jsx("div", { className: "notice error-box", role: "alert", children: error }), _jsx("button", { disabled: busy, children: busy ? "Procesando…" : "Ingresar" }), _jsx("p", { className: "muted", children: "Las cuentas de administraci\u00F3n se crean desde el backend o con un usuario ADMIN existente." })] }) });
}
function App() {
    const [logged, setLogged] = useState(!!localStorage.getItem("token"));
    const [view, setView] = useState("dashboard");
    const [schools, setSchools] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [schoolRegion, setSchoolRegion] = useState("");
    const [classroomName, setClassroomName] = useState("");
    const [classroomYear, setClassroomYear] = useState(String(new Date().getFullYear()));
    const [subjectGrade, setSubjectGrade] = useState("");
    const [accountEmail, setAccountEmail] = useState("");
    const [accountName, setAccountName] = useState("");
    const [accountPassword, setAccountPassword] = useState("");
    const [accountRole, setAccountRole] = useState("TEACHER");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    async function loadView(next) {
        setView(next);
        setError("");
        setStatus("");
        setLoading(true);
        try {
            if (next === "dashboard" || next === "schools" || next === "classrooms") {
                const [schoolRows, classroomRows] = await Promise.all([
                    request("/schools"),
                    request("/classrooms"),
                ]);
                setSchools(schoolRows);
                setClassrooms(classroomRows);
                if (!selectedSchool && schoolRows.length)
                    setSelectedSchool(schoolRows[0].id);
            }
            if (next === "curriculum")
                setSubjects(await request(subjectGrade ? `/curriculum/subjects?grade=${subjectGrade}` : "/curriculum/subjects"));
            if (next === "accounts")
                setSchools(await request("/schools"));
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
            const rows = await request("/schools");
            setSchools(rows);
            setSelectedSchool(school.id);
        }, "Escuela registrada.");
    }
    async function createClassroom(event) {
        event.preventDefault();
        await runAction(async () => {
            if (!selectedSchool)
                throw new Error("Selecciona una escuela primero.");
            await request("/classrooms", { method: "POST", body: JSON.stringify({
                    school_id: selectedSchool, name: classroomName.trim(), school_year: Number(classroomYear) || new Date().getFullYear(),
                }) });
            setClassroomName("");
            setClassrooms(await request("/classrooms"));
        }, "Aula registrada.");
    }
    async function createAccount(event) {
        event.preventDefault();
        await runAction(async () => {
            await request("/auth/register", { method: "POST", body: JSON.stringify({
                    email: accountEmail.trim(), password: accountPassword, full_name: accountName.trim(), role: accountRole,
                }) });
            setAccountEmail("");
            setAccountName("");
            setAccountPassword("");
        }, "Cuenta creada.");
    }
    if (!logged)
        return _jsx(Login, { done: () => setLogged(true) });
    const viewTitles = {
        dashboard: "Resumen administrativo", schools: "Escuelas", classrooms: "Aulas",
        curriculum: "Currículo", accounts: "Cuentas",
    };
    return _jsxs("div", { className: "shell", children: [_jsxs("aside", { children: [_jsx("h2", { children: "KAWSAY" }), _jsx("span", { children: "Administraci\u00F3n" }), [
                        ["dashboard", "Dashboard"], ["schools", "Escuelas"], ["classrooms", "Aulas"],
                        ["curriculum", "Currículo"], ["accounts", "Cuentas"],
                    ].map(([key, label]) => _jsx("button", { className: `nav ${view === key ? "selected" : ""}`, onClick: () => void loadView(key), children: label }, key)), _jsx("button", { className: "ghost", onClick: () => { localStorage.removeItem("token"); setLogged(false); }, children: "Salir" })] }), _jsxs("main", { children: [_jsxs("header", { children: [_jsx("h1", { children: viewTitles[view] }), _jsx("p", { children: "Gesti\u00F3n de escuelas, aulas, curr\u00EDculo y cuentas de la plataforma." })] }), error && _jsx("div", { className: "notice error-box", role: "alert", children: error }), status && _jsx("div", { className: "notice success-box", role: "status", children: status }), loading && _jsx("p", { className: "muted", children: "Cargando informaci\u00F3n\u2026" }), view === "dashboard" && _jsxs(_Fragment, { children: [_jsx("section", { className: "metrics", children: [
                                    ["Escuelas", schools.length], ["Aulas", classrooms.length],
                                    ["Años escolares", new Set(classrooms.map(room => room.school_year)).size], ["Regiones", new Set(schools.map(school => school.region).filter(Boolean)).size],
                                ].map(([label, value]) => _jsxs("div", { className: "metric card", children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }, label)) }), _jsxs("section", { className: "grid dashboard-grid", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Escuelas registradas" }), !schools.length && _jsx("p", { children: "No hay escuelas registradas." }), schools.map(school => _jsxs("article", { className: "list-row", children: [_jsxs("div", { children: [_jsx("b", { children: school.name }), _jsx("small", { children: school.region ?? "Región sin definir" })] }), _jsxs("span", { children: [classrooms.filter(room => room.school_id === school.id).length, " aulas"] })] }, school.id))] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Aulas por a\u00F1o escolar" }), !classrooms.length && _jsx("p", { children: "No hay aulas registradas." }), classrooms.map(room => _jsxs("article", { className: "list-row", children: [_jsxs("div", { children: [_jsx("b", { children: room.name }), _jsx("small", { children: schools.find(school => school.id === room.school_id)?.name ?? "Escuela sin asignar" })] }), _jsx("span", { className: "badge", children: room.school_year })] }, room.id))] })] })] }), view === "schools" && _jsxs("section", { className: "grid", children: [_jsxs("div", { className: "card table-wrap", children: [_jsx("h2", { children: "Escuelas" }), !schools.length ? _jsx("p", { children: "No hay escuelas registradas." }) : _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Nombre" }), _jsx("th", { children: "Regi\u00F3n" }), _jsx("th", { children: "Aulas" })] }) }), _jsx("tbody", { children: schools.map(school => _jsxs("tr", { children: [_jsx("td", { children: school.name }), _jsx("td", { children: school.region ?? "—" }), _jsx("td", { children: classrooms.filter(room => room.school_id === school.id).length })] }, school.id)) })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Registrar escuela" }), _jsxs("form", { onSubmit: createSchool, children: [_jsx("label", { children: "Nombre" }), _jsx("input", { required: true, value: schoolName, onChange: event => setSchoolName(event.target.value), placeholder: "Ej. I.E. Jos\u00E9 Mar\u00EDa Arguedas" }), _jsx("label", { children: "Regi\u00F3n (opcional)" }), _jsx("input", { value: schoolRegion, onChange: event => setSchoolRegion(event.target.value), placeholder: "Ej. Cusco" }), _jsx("button", { disabled: busy, children: "Registrar escuela" })] })] })] }), view === "classrooms" && _jsxs("section", { className: "grid", children: [_jsxs("div", { className: "card table-wrap", children: [_jsx("h2", { children: "Aulas" }), !classrooms.length ? _jsx("p", { children: "No hay aulas registradas." }) : _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Aula" }), _jsx("th", { children: "Escuela" }), _jsx("th", { children: "A\u00F1o escolar" })] }) }), _jsx("tbody", { children: classrooms.map(room => _jsxs("tr", { children: [_jsx("td", { children: room.name }), _jsx("td", { children: schools.find(school => school.id === room.school_id)?.name ?? room.school_id }), _jsx("td", { children: room.school_year })] }, room.id)) })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Registrar aula" }), !schools.length ? _jsx("p", { children: "Registra una escuela antes de crear aulas." }) : _jsxs("form", { onSubmit: createClassroom, children: [_jsx("label", { children: "Escuela" }), _jsxs("select", { required: true, value: selectedSchool, onChange: event => setSelectedSchool(event.target.value), children: [_jsx("option", { value: "", children: "Seleccionar escuela" }), schools.map(school => _jsx("option", { value: school.id, children: school.name }, school.id))] }), _jsx("label", { children: "Nombre del aula" }), _jsx("input", { required: true, value: classroomName, onChange: event => setClassroomName(event.target.value), placeholder: "Ej. 4.\u00BA primaria - A" }), _jsx("label", { children: "A\u00F1o escolar" }), _jsx("input", { required: true, type: "number", min: 2000, max: 2100, value: classroomYear, onChange: event => setClassroomYear(event.target.value) }), _jsx("button", { disabled: busy, children: "Registrar aula" })] })] })] }), view === "curriculum" && _jsxs("section", { className: "card table-wrap", children: [_jsxs("div", { className: "actions", children: [_jsx("h2", { children: "\u00C1reas curriculares" }), _jsxs("select", { value: subjectGrade, onChange: event => { const value = event.target.value; setSubjectGrade(value); void runAction(async () => { setSubjects(await request(value ? `/curriculum/subjects?grade=${value}` : "/curriculum/subjects")); }); }, children: [_jsx("option", { value: "", children: "Todos los grados" }), [1, 2, 3, 4, 5, 6].map(grade => _jsxs("option", { value: grade, children: [grade, ".\u00BA grado"] }, grade))] })] }), !subjects.length ? _jsx("p", { children: "No hay \u00E1reas curriculares registradas para el filtro seleccionado." }) : _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u00C1rea" }), _jsx("th", { children: "Grado" })] }) }), _jsx("tbody", { children: subjects.map(subject => _jsxs("tr", { children: [_jsx("td", { children: subject.name }), _jsxs("td", { children: [subject.grade, ".\u00BA"] })] }, subject.id)) })] }), _jsx("p", { className: "muted", children: "El curr\u00EDculo se carga mediante las migraciones y datos iniciales del backend." })] }), view === "accounts" && _jsxs("section", { className: "grid", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Crear cuenta" }), _jsxs("form", { onSubmit: createAccount, children: [_jsx("label", { children: "Nombre completo" }), _jsx("input", { required: true, value: accountName, onChange: event => setAccountName(event.target.value) }), _jsx("label", { children: "Correo" }), _jsx("input", { required: true, type: "email", value: accountEmail, onChange: event => setAccountEmail(event.target.value) }), _jsx("label", { children: "Contrase\u00F1a" }), _jsx("input", { required: true, type: "password", minLength: 8, autoComplete: "new-password", value: accountPassword, onChange: event => setAccountPassword(event.target.value) }), _jsx("label", { children: "Rol" }), _jsxs("select", { value: accountRole, onChange: event => setAccountRole(event.target.value), children: [_jsx("option", { value: "TEACHER", children: "Docente" }), _jsx("option", { value: "STUDENT", children: "Estudiante" }), _jsx("option", { value: "ADMIN", children: "Administraci\u00F3n" })] }), _jsx("button", { disabled: busy, children: "Crear cuenta" })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Escuelas y aulas" }), _jsx("p", { className: "muted", children: "Las cuentas se asocian a escuelas y aulas desde los paneles docentes con el correo del usuario." }), schools.map(school => _jsxs("article", { className: "list-row", children: [_jsxs("div", { children: [_jsx("b", { children: school.name }), _jsx("small", { children: school.region ?? "Sin región" })] }), _jsxs("span", { children: [classrooms.filter(room => room.school_id === school.id).length, " aulas"] })] }, school.id)), !schools.length && _jsx("p", { children: "No hay escuelas registradas." })] })] })] })] });
}
createRoot(document.getElementById("root")).render(_jsx(App, {}));
