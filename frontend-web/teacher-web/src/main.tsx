import React, {useCallback, useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {claimFromToken, request, roleFromToken} from "./api";
import {Badge, Button, Card, EmptyState, Field, GradeChips, InfoNote, Metric, ProgressBar, Select, inputClass, tdClass, thClass} from "./components/ui";
import "./index.css";

/** Grados que ofrece el sistema (primaria, 1.º a 6.º). */
const GRADES = [1,2,3,4,5,6];
/** Años escolares seleccionables al crear un aula. */
const SCHOOL_YEARS = [2024,2025,2026,2027];
/** Áreas curriculares frecuentes, según el contexto peruano de primaria. */
const SUBJECTS = ["Matemática","Comunicación","Ciencia y Tecnología","Personal Social","Arte y Cultura","Educación Física"];

type Classroom = {
  id:string; name:string; school_id:string; school_name:string;
  school_year:number; grade_levels:number[]; student_count:number;
};
type School = {id:string; name:string; region:string|null; community:string|null; country:string; classroom_count:number};
type Student = {
  id:string; full_name:string; email:string; grade:number|null;
  preferred_language:string|null; classrooms:{id:string;name:string}[];
};
type ProgressStudent = Student & {progress:{
  subject:string; mastery_level:number; total_attempts:number;
  correct_attempts:number; updated_at:string;
}[]};
type Assignment = {
  id:string; title:string; subject:string; status:string;
  classroom_id:string; classroom_name:string; created_at:string;
};
type Variant = {id:string; grade:number; content:string; status:string};
type Intervention = {
  id:string; student_id:string; student_name:string; strategy:string;
  notes:string|null; created_at:string;
};
type Dashboard = {
  summary:{classrooms:number;students:number;assignments:number;open_flags:number};
  assignments:{id:string;title:string;subject:string;status:string;created_at:string}[];
  flags:{id:string;student_id:string;reason:string;evidence:string}[];
};
type SupportFlag = {id:string;student_id:string;reason:string;evidence:string};
type View = "dashboard"|"create"|"classrooms"|"students"|"progress"|"flags"|"interventions"|"assignments";

/** Secciones del panel agrupadas, como árbol de navegación fijo a la izquierda. */
const NAV_GROUPS: {label:string; items:[View,string,string][]}[] = [
  {label:"Inicio", items:[
    ["dashboard","Resumen","◧"],
  ]},
  {label:"Mi aula", items:[
    ["classrooms","Mis aulas","◫"],
    ["students","Estudiantes","◍"],
  ]},
  {label:"Enseñanza", items:[
    ["create","Crear actividad","＋"],
    ["assignments","Actividades","✎"],
  ]},
  {label:"Acompañamiento", items:[
    ["progress","Progreso","▲"],
    ["flags","Alertas","⚑"],
    ["interventions","Intervenciones","❖"],
  ]},
];

function Login({done}:{done:()=>void}) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [fullName,setFullName]=useState("");
  const [creating,setCreating]=useState(false);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if(creating) {
        await request<{id:string}>("/auth/register",{method:"POST",body:JSON.stringify({
          email,password,full_name:fullName,role:"TEACHER",
        })});
      }
      const result=await request<{access_token:string}>("/auth/login",{method:"POST",body:JSON.stringify({email,password})});
      const role=roleFromToken(result.access_token);
      if(role!=="TEACHER") throw new Error("Esta pantalla es solo para cuentas docentes.");
      localStorage.setItem("token",result.access_token);
      done();
    } catch(error) { setError(error instanceof Error?error.message:"No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <div className="grid min-h-screen place-items-center bg-gradient-to-br from-kawsay-50 via-canvas to-kawsay-100 p-4">
    <form className="motion-safe:transition-none w-full max-w-[430px] rounded-2xl border border-line bg-surface p-8 shadow-raised" onSubmit={submit}>
      <div className="mb-7 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-kawsay-600 text-lg font-black text-white shadow-card">K</span>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-ink">KAWSAY AI</h1>
          <p className="text-sm text-ink-soft">Panel docente</p>
        </div>
      </div>

      {creating&&<>
        <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="fullName">Nombre completo</label>
        <input id="fullName" className="mb-4 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-ink transition placeholder:text-ink-faint focus:border-kawsay-500 focus:bg-surface" required value={fullName} onChange={event=>setFullName(event.target.value)}/>
      </>}

      <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="email">Correo</label>
      <input id="email" className="mb-4 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-ink transition placeholder:text-ink-faint focus:border-kawsay-500 focus:bg-surface" type="email" required autoComplete="email" placeholder="docente@ejemplo.com" value={email} onChange={event=>setEmail(event.target.value)}/>

      <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="password">Contraseña</label>
      <input id="password" className="mb-5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-ink transition placeholder:text-ink-faint focus:border-kawsay-500 focus:bg-surface" type="password" required minLength={8} autoComplete={creating?"new-password":"current-password"} value={password} onChange={event=>setPassword(event.target.value)}/>
      {creating&&<p className="-mt-3 mb-5 text-xs text-ink-soft">Mínimo 8 caracteres.</p>}

      {error&&<div className="mb-5 flex items-start gap-2.5 rounded-xl border border-kawsay-alert/25 bg-kawsay-alert/8 px-3.5 py-3 text-sm font-medium text-kawsay-alert" role="alert">
        <span aria-hidden className="mt-px">⚠</span><span>{error}</span>
      </div>}

      <button className="motion-safe:transition-none w-full rounded-xl bg-kawsay-600 px-4 py-3 font-semibold text-white shadow-card transition hover:bg-kawsay-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60" disabled={busy}>
        {busy?"Procesando…":creating?"Crear cuenta e ingresar":"Ingresar"}
      </button>
      <button className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-kawsay-600 transition hover:bg-kawsay-50" type="button" onClick={()=>{setCreating(!creating);setError("");}}>
        {creating?"Ya tengo cuenta":"Crear cuenta docente"}
      </button>
    </form>
  </div>;
}

function readStoredSession():boolean {
  try {
    const token=localStorage.getItem("token");
    if(!token) return false;
    const role=roleFromToken(token);
    const exp=claimFromToken<number>(token,"exp");
    const valid=role==="TEACHER"&&!!exp&&exp*1000>Date.now();
    if(!valid) localStorage.removeItem("token");
    return valid;
  } catch {
    // localStorage no disponible o dato corrupto: siempre falla abierto hacia el login.
    return false;
  }
}

/** Error de límite (boundary): evita que un fallo al pintar la pantalla deje el sitio en blanco. */
class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:Error|null}> {
  state:{error:Error|null}={error:null};
  static getDerivedStateFromError(error:Error){ return {error}; }
  componentDidCatch(error:Error){ console.error("KAWSAY docente:",error); }
  render(){
    if(this.state.error) return <div className="grid min-h-screen place-items-center bg-canvas p-6">
      <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-raised">
        <h1 className="mb-2 text-lg font-bold text-ink">Algo salió mal</h1>
        <p className="mb-5 text-sm text-ink-soft">{this.state.error.message||"Ocurrió un error inesperado al mostrar la pantalla."}</p>
        <button className="rounded-xl bg-kawsay-600 px-4 py-2.5 font-semibold text-white transition hover:bg-kawsay-700" onClick={()=>window.location.reload()}>Recargar la página</button>
      </div>
    </div>;
    return this.props.children;
  }
}

function App() {
  const [logged,setLogged]=useState(readStoredSession);
  const [view,setView]=useState<View>("dashboard");
  const [classrooms,setClassrooms]=useState<Classroom[]>([]);
  const [schools,setSchools]=useState<School[]>([]);
  const [students,setStudents]=useState<Student[]>([]);
  const [progress,setProgress]=useState<ProgressStudent[]>([]);
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [variants,setVariants]=useState<Variant[]>([]);
  const [interventions,setInterventions]=useState<Intervention[]>([]);
  const [flags,setFlags]=useState<SupportFlag[]>([]);
  const [dashboard,setDashboard]=useState<Dashboard|null>(null);
  const [assignmentId,setAssignmentId]=useState("");
  const [selectedClassroom,setSelectedClassroom]=useState("");
  const [selectedSchool,setSelectedSchool]=useState("");
  const [classroomName,setClassroomName]=useState("");
  const [classroomYear,setClassroomYear]=useState(2026);
  const [classroomGrades,setClassroomGrades]=useState<number[]>([]);
  const [schoolName,setSchoolName]=useState("");
  const [schoolRegion,setSchoolRegion]=useState("");
  const [schoolCommunity,setSchoolCommunity]=useState("");
  const [studentEmail,setStudentEmail]=useState("");
  const [interventionStudent,setInterventionStudent]=useState("");
  const [strategy,setStrategy]=useState("");
  const [interventionNotes,setInterventionNotes]=useState("");
  const [title,setTitle]=useState("");
  const [subject,setSubject]=useState("Matemática");
  const [content,setContent]=useState("");
  const [grades,setGrades]=useState<number[]>([1,2,3]);
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  /** Identificador de la sesión actual: invalida respuestas tardías al salir o cambiar de cuenta. */
  const sessionRef = useRef(0);

  /** Descarta resultados asíncronos si la sesión cambió o el componente se desmontó. */
  const guardSession = useCallback((token:number)=>token===sessionRef.current&&logged,[]);

  async function loadBase() {
    const token = sessionRef.current;
    try {
      const [classroomRows,schoolRows]=await Promise.all([
        request<Classroom[]>("/classrooms"),
        request<School[]>("/schools"),
      ]);
      if(!guardSession(token)) return;
      setClassrooms(classroomRows); setSchools(schoolRows);
      if(!selectedClassroom&&classroomRows.length) setSelectedClassroom(classroomRows[0].id);
      if(!selectedSchool&&schoolRows.length) setSelectedSchool(schoolRows[0].id);
    } catch {
      // Datos base opcionales: no bloquean el resto del panel.
    }
  }

  /** Grados derivados de las aulas del docente: alimenta el selector de actividad. */
  const availableGrades = Array.from(new Set(classrooms.flatMap(room=>room.grade_levels))).sort((a,b)=>a-b);

  /** Texto corto de grados: "1.º–2.º–3.º" o "Sin grados configurados". */
  function gradesLabel(grades:number[]):string {
    return grades.length?grades.map(g=>`${g}.º`).join("–"):"Sin grados configurados";
  }

  /** Opciones de aula con contexto de escuela, grados y matrícula. */
  const classroomOptions = classrooms.map(room=>({
    value:room.id,
    label:room.name,
    hint:`${room.school_name} · ${gradesLabel(room.grade_levels)} · ${room.student_count} estud.`,
  }));

  /** Opciones de escuela con región/comunidad y nº de aulas. */
  const schoolOptions = schools.map(school=>({
    value:school.id,
    label:school.name,
    hint:[school.community,school.region,`${school.classroom_count} aulas`].filter(Boolean).join(" · "),
  }));

  /** Estudiantes del aula elegida; si no hay aula, todos los del docente. */
  const studentsInClassroom = selectedClassroom
    ? students.filter(student=>student.classrooms.some(room=>room.id===selectedClassroom))
    : students;

  const selectedRoom = classrooms.find(room=>room.id===selectedClassroom) ?? null;

  /** Carga los datos del resumen en paralelo (una sola ronda de red, sin peticiones duplicadas). */
  async function loadDashboard(token:number) {
    const [dashboardResult,assignmentsResult,flagsResult,studentsResult,progressResult,interventionsResult]=
      await Promise.allSettled([
        request<Dashboard>("/teacher/dashboard"),
        request<Assignment[]>("/teacher/assignments"),
        request<SupportFlag[]>("/teacher/support-flags"),
        request<Student[]>("/teacher/students"),
        request<ProgressStudent[]>("/teacher/progress"),
        request<Intervention[]>("/teacher/interventions"),
      ]);
    if(!guardSession(token)) return;
    if(dashboardResult.status==="fulfilled") setDashboard(dashboardResult.value);
    if(assignmentsResult.status==="fulfilled") setAssignments(assignmentsResult.value);
    if(flagsResult.status==="fulfilled") setFlags(flagsResult.value);
    if(studentsResult.status==="fulfilled") setStudents(studentsResult.value);
    if(progressResult.status==="fulfilled") setProgress(progressResult.value);
    if(interventionsResult.status==="fulfilled") setInterventions(interventionsResult.value);
  }

  async function loadView(next:View, focusStudentId?:string) {
    const token = sessionRef.current;
    setView(next); setError(""); setStatus(""); setLoading(true);
    try {
      if(next==="dashboard") {
        await loadDashboard(token);
      }
      if(next==="classrooms") {
        await loadBase();
        try {
          const rows=await request<Student[]>("/teacher/students");
          if(guardSession(token)) setStudents(rows);
        } catch {
          // Sección secundaria: se reintenta al navegar de nuevo.
        }
      }
      if(next==="students") {
        try {
          const rows=await request<Student[]>("/teacher/students");
          if(guardSession(token)) setStudents(rows);
        } catch {
          // Sección secundaria: se reintenta al navegar de nuevo.
        }
      }
      if(next==="progress") {
        try {
          const rows=await request<ProgressStudent[]>("/teacher/progress");
          if(guardSession(token)) setProgress(rows);
        } catch {
          // Sección secundaria: se reintenta al navegar de nuevo.
        }
      }
      if(next==="flags") {
        try {
          const [flagRows,studentRows]=await Promise.all([
            request<SupportFlag[]>("/teacher/support-flags"),
            request<Student[]>("/teacher/students"),
          ]);
          if(!guardSession(token)) return;
          setFlags(flagRows); setStudents(studentRows);
        } catch {
          // Sección secundaria: se reintenta al navegar de nuevo.
        }
      }
      if(next==="interventions") {
        try {
          const [studentRows,interventionRows]=await Promise.all([
            request<Student[]>("/teacher/students"),
            request<Intervention[]>("/teacher/interventions"),
          ]);
          if(!guardSession(token)) return;
          setStudents(studentRows); setInterventions(interventionRows);
          if(focusStudentId) setInterventionStudent(focusStudentId);
          else if(!interventionStudent&&studentRows.length) setInterventionStudent(studentRows[0].id);
        } catch {
          // Sección secundaria: se reintenta al navegar de nuevo.
        }
      }
      if(next==="assignments") {
        try {
          const rows=await request<Assignment[]>("/teacher/assignments");
          if(guardSession(token)) setAssignments(rows);
        } catch {
          // Sección secundaria: se reintenta al navegar de nuevo.
        }
      }
      if(next==="create") await loadBase();
    } catch(error) {
      if(guardSession(token)) setError(error instanceof Error?error.message:"No se pudieron cargar los datos.");
    }
    finally { if(guardSession(token)) setLoading(false); }
  }

  useEffect(()=>{
    if(!logged) return;
    // Al iniciar sesión solo se carga el resumen (que ya trae actividades,
    // progreso, alertas e intervenciones); las demás vistas se cargan al navegar.
    void loadView("dashboard");
  },[logged]);

  async function runAction(action:()=>Promise<void>,successMessage?:string) {
    setBusy(true); setError(""); setStatus("");
    try { await action(); if(successMessage) setStatus(successMessage); }
    catch(error) { setError(error instanceof Error?error.message:"No se pudo completar la operación."); }
    finally { setBusy(false); }
  }

  async function createSchool(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async()=>{
      const school=await request<{id:string}>("/schools",{method:"POST",body:JSON.stringify({
        name:schoolName.trim(),country:"Perú",region:schoolRegion.trim()||null,
        community:schoolCommunity.trim()||null,
      })});
      setSchoolName(""); setSchoolRegion(""); setSchoolCommunity("");
      await loadBase(); setSelectedSchool(school.id);
    },"Escuela creada.");
  }

  async function createClassroom(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async()=>{
      if(!selectedSchool) throw new Error("Selecciona o crea una escuela primero.");
      if(!classroomGrades.length) throw new Error("Selecciona al menos un grado que atienda el aula.");
      const room=await request<{id:string}>("/classrooms",{method:"POST",body:JSON.stringify({
        school_id:selectedSchool,name:classroomName.trim(),school_year:classroomYear,
        grade_levels:classroomGrades,
      })});
      setClassroomName(""); setClassroomGrades([]);
      await loadBase(); setSelectedClassroom(room.id);
    },"Aula creada.");
  }

  async function enrollStudent(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async()=>{
      if(!selectedClassroom) throw new Error("Selecciona un aula primero.");
      if(!studentEmail.trim()) throw new Error("Ingresa el correo del estudiante.");
      await request<{student_id:string}>(`/classrooms/${selectedClassroom}/students/by-email`,{
        method:"POST",body:JSON.stringify({email:studentEmail.trim()}),
      });
      setStudentEmail("");
      const updatedStudents = await request<Student[]>("/teacher/students");
      setStudents(updatedStudents);
    },"Estudiante matriculado correctamente.");
  }

  async function createAssignment(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async()=>{
      if(!selectedClassroom) throw new Error("Selecciona un aula.");
      if(!grades.length) throw new Error("Selecciona al menos un grado.");
      const assignment=await request<{id:string}>("/teacher/assignments",{method:"POST",body:JSON.stringify({
        classroom_id:selectedClassroom,subject,title:title.trim(),base_content:content.trim(),grades,
      })});
      const response=await request<{variants:Variant[]}>(`/teacher/assignments/${assignment.id}/generate-variants`,{method:"POST"});
      setAssignmentId(assignment.id); setVariants(response.variants);
      setAssignments(await request<Assignment[]>("/teacher/assignments"));
      setTitle(""); setContent("");
    },"Variantes generadas. Revísalas antes de aprobar y publicar.");
  }

  /** Al elegir un aula, precarga los grados que atiende para la actividad. */
  function chooseClassroomForCreate(id:string) {
    setSelectedClassroom(id);
    const room=classrooms.find(item=>item.id===id);
    if(room?.grade_levels.length) setGrades(room.grade_levels);
  }

  async function loadVariants(id:string) {
    await runAction(async()=>{
      setAssignmentId(id);
      setVariants(await request<Variant[]>(`/teacher/assignments/${id}/variants`));
      setView("assignments");
    });
  }

  function editAssignment(id:string) {
    // For now just navigate to create - in a full implementation would load assignment data
    void id;
    setView("create");
    setStatus("Selecciona los datos para editar esta actividad (funcionalidad en desarrollo)");
  }

  async function createIntervention(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async()=>{
      await request<{id:string}>("/teacher/interventions",{method:"POST",body:JSON.stringify({
        student_id:interventionStudent,strategy:strategy.trim(),notes:interventionNotes.trim()||null,
      })});
      setStrategy(""); setInterventionNotes("");
      setInterventions(await request<Intervention[]>("/teacher/interventions"));
    },"Intervención registrada.");
  }

  if(!logged) return <Login done={()=>setLogged(true)}/>;
  const viewTitles:Record<View,string>={
    dashboard:"Resumen docente",create:"Crear actividad multigrado",classrooms:"Mis aulas",
    students:"Estudiantes",progress:"Progreso",flags:"Alertas de apoyo",
    interventions:"Intervenciones",assignments:"Actividades",
  };
  const viewHints:Record<View,string>={
    dashboard:"Decisiones claras para acompañar mejor a cada estudiante.",
    classrooms:"Gestiona tus aulas multigrado, sus grados y la matrícula de estudiantes.",
    students:"Estudiantes matriculados en tus aulas y su perfil.",
    progress:"Dominio por área, con datos provenientes de la actividad real de tus estudiantes.",
    assignments:"Revisa, aprueba y publica las variantes generadas por KAWSAY.",
    create:"Elige el aula, define la actividad base y adapta el contenido por grado.",
    flags:"Estudiantes que requieren revisión o acompañamiento adicional.",
    interventions:"Estrategias de acompañamiento registradas para tus estudiantes.",
  };

  return <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[272px_1fr]">
    <aside className="flex flex-col bg-kawsay-900 p-4 text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:p-6">
      <div className="mb-6 flex items-center gap-3 px-1">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-kawsay-500 text-base font-black shadow-card">K</span>
        <div>
          <h2 className="text-base font-bold leading-tight tracking-tight">KAWSAY AI</h2>
          <span className="text-xs text-kawsay-300">Panel docente</span>
        </div>
      </div>

      <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-6">
        {NAV_GROUPS.map(group=><div key={group.label}>
          <h3 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-kawsay-400">{group.label}</h3>
          <ul className="space-y-1">
            {group.items.map(([key,label,icon])=><li key={key}>
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${view===key?"bg-kawsay-600 text-white shadow-card":"text-kawsay-200 hover:bg-white/10 hover:text-white"}`}
                aria-current={view===key?"page":undefined}
                onClick={()=>void loadView(key)}>
                <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-lg text-xs ${view===key?"bg-white/20":"bg-white/5"}`}>{icon}</span>
                <span>{label}</span>
              </button>
            </li>)}
          </ul>
        </div>)}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4">
        <dl className="mb-4 grid w-full grid-cols-2 gap-2 px-1">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-kawsay-400">Aulas</dt>
            <dd className="tabular text-sm font-bold">{classrooms.length}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-kawsay-400">Estudiantes</dt>
            <dd className="tabular text-sm font-bold">{students.length}</dd>
          </div>
        </dl>
        <button className="w-full rounded-xl border border-white/15 px-3.5 py-2.5 text-sm font-medium text-kawsay-200 transition hover:bg-white/10 hover:text-white" onClick={()=>{sessionRef.current++; localStorage.removeItem("token"); setLogged(false);}}>Salir</button>
      </div>
    </aside>

    <main className="w-full max-w-[1400px] p-5 lg:p-9">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-[28px]">{viewTitles[view]}</h1>
          <p className="mt-1 text-sm text-ink-soft">{viewHints[view]}</p>
        </div>
      </header>
      {error&&<div className="mb-5 flex items-start gap-2.5 rounded-xl border border-kawsay-alert/25 bg-kawsay-alert/8 px-4 py-3 text-sm font-medium text-kawsay-alert" role="alert">
        <span aria-hidden className="mt-px">⚠</span><span>{error}</span>
      </div>}
      {status&&<div className="mb-5 flex items-start gap-2.5 rounded-xl border border-kawsay-success/25 bg-kawsay-success/8 px-4 py-3 text-sm font-medium text-kawsay-success" role="status">
        <span aria-hidden className="mt-px">✓</span><span>{status}</span>
      </div>}
      {loading&&<p className="mb-5 flex items-center gap-2 text-sm text-ink-soft">
        <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-kawsay-200 border-t-kawsay-600" aria-hidden/>Cargando información…
      </p>}

      {view==="dashboard"&&dashboard&&<>
        <section className="mb-6 grid w-full grid-cols-2 gap-4 lg:grid-cols-4">{([
          ["Aulas",dashboard.summary.classrooms,"◫","brand"],["Estudiantes",dashboard.summary.students,"◍","teal"],
          ["Actividades",dashboard.summary.assignments,"✎","purple"],["Alertas abiertas",dashboard.summary.open_flags,"⚑","alert"],
        ] as [string,number,string,"brand"|"teal"|"purple"|"alert"][]).map(([label,value,icon,tone])=><Metric key={label} label={label} value={value} icon={icon} tone={tone}/>)}</section>
        <section className="grid w-full items-start gap-6 lg:grid-cols-2">
          <Card title="Actividades recientes" variant="primary">
            {!dashboard.assignments.length?<EmptyState>Aún no tienes actividades creadas.</EmptyState>:
              <ul className="divide-y divide-line">{dashboard.assignments.map(item=><li className="flex items-center justify-between gap-3 py-3.5" key={item.id}>
                <div className="min-w-0"><p className="truncate font-semibold text-ink">{item.title}</p><p className="text-xs text-ink-soft">{item.subject}</p></div>
                <Badge status={item.status}/>
              </li>)}</ul>}
          </Card>
          <Card title="Alertas de apoyo" variant="warning">
            {!dashboard.flags.length?<EmptyState>No hay alertas abiertas.</EmptyState>:
              <ul className="space-y-3">{dashboard.flags.map(flag=><li className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5" key={flag.id}>
                <p className="text-sm font-semibold text-amber-900">{flag.reason}</p>
                <p className="mt-1 text-sm text-amber-800/90">{flag.evidence}</p>
              </li>)}</ul>}
          </Card>
        </section>
      </>}

      {view==="classrooms"&&<section className="grid w-full items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card title="Aulas a tu cargo" variant="primary">
            {!classrooms.length?<EmptyState>Aún no tienes aulas creadas. Usa el formulario de la derecha para crear una.</EmptyState>:
              <ul className="divide-y divide-line">{classrooms.map(room=><li className="flex items-center justify-between gap-3 py-3.5" key={room.id}>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{room.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{room.school_name} · Año escolar {room.school_year}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{room.grade_levels.length?room.grade_levels.map(grade=><span className="rounded-md bg-kawsay-50 px-2 py-0.5 text-xs font-semibold text-kawsay-700" key={grade}>{grade}.º grado</span>):<span className="text-xs text-ink-faint">Sin grados configurados</span>}</div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-kawsay-50 px-2.5 py-1 text-xs font-semibold text-kawsay-700">
                      {room.student_count} {room.student_count === 1 ? 'estudiante' : 'estudiantes'}
                    </span>
                    {room.grade_levels.length>1&&<span className="mt-1.5 block text-xs font-semibold text-kawsay-teal">Aula multigrado</span>}
                  </div>
                  <Button variant="small" disabled={busy} onClick={async()=>{
                    if(confirm(`¿Estás seguro de eliminar el aula "${room.name}"? Se eliminarán también las matrículas y las actividades relacionadas.`)){
                      await runAction(async()=>{
                        await request(`/classrooms/${room.id}`,{method:"DELETE"});
                        await loadBase();
                        setStudents(await request<Student[]>("/teacher/students"));
                      },"Aula eliminada correctamente.");
                    }
                  }}>Eliminar</Button>
                </div>
              </li>)}</ul>}
          </Card>

          <Card title="Matricular estudiante">
            <form onSubmit={enrollStudent}>
              <Field label="Selecciona el aula" hint={selectedRoom?`Grados: ${gradesLabel(selectedRoom.grade_levels)} · ${selectedRoom.student_count} estudiante(s) ya matriculado(s)`:undefined}>
                <Select className={inputClass} required value={selectedClassroom}
                  placeholder="Seleccionar aula"
                  options={classroomOptions}
                  onChange={event=>setSelectedClassroom(event.target.value)}/>
              </Field>
              <Field label="Correo electrónico del estudiante" hint="El estudiante debe tener una cuenta creada previamente en la plataforma.">
                <input className={inputClass} required type="email" placeholder="estudiante@ejemplo.com" value={studentEmail} onChange={event=>setStudentEmail(event.target.value)}/>
              </Field>
              <Button disabled={busy||!classrooms.length||!selectedClassroom} className="w-full sm:w-auto">Matricular estudiante</Button>
              {!classrooms.length&&<p className="mt-2 text-xs text-ink-soft">Primero debes crear un aula para matricular estudiantes.</p>}
            </form>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Nueva escuela">
            <form onSubmit={createSchool}>
              <Field label="Nombre de la escuela"><input className={inputClass} required value={schoolName} onChange={event=>setSchoolName(event.target.value)} placeholder="Ej. I.E. José María Arguedas"/></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Región (opcional)"><input className={inputClass} value={schoolRegion} onChange={event=>setSchoolRegion(event.target.value)} placeholder="Ej. Cusco"/></Field>
                <Field label="Comunidad (opcional)"><input className={inputClass} value={schoolCommunity} onChange={event=>setSchoolCommunity(event.target.value)} placeholder="Ej. Huayllabamba"/></Field>
              </div>
              <Button type="submit" variant="secondary" disabled={busy} className="w-full sm:w-auto">Crear escuela</Button>
            </form>
          </Card>

          <Card title="Nueva aula">
            <form onSubmit={createClassroom}>
              <Field label="Escuela" hint="Selecciona la escuela a la que pertenecerá esta aula.">
                <Select className={inputClass} required value={selectedSchool}
                  placeholder="Seleccionar escuela"
                  options={schoolOptions}
                  onChange={event=>setSelectedSchool(event.target.value)}/>
              </Field>
              <Field label="Nombre del aula" hint="Usa un nombre claro, por ejemplo: 'Aula multigrado 1.º a 3.º'">
                <input className={inputClass} required value={classroomName} onChange={event=>setClassroomName(event.target.value)} placeholder="Ej. Aula multigrado 1.º–3.º"/>
              </Field>
              <Field label="Año escolar">
                <Select className={inputClass} value={String(classroomYear)}
                  options={SCHOOL_YEARS.map(year=>({value:String(year),label:String(year)}))}
                  onChange={event=>setClassroomYear(Number(event.target.value))}/>
              </Field>
              <div className="mb-4">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Grados que atiende</span>
                <p className="mb-2 text-xs text-ink-soft">Selecciona uno o varios grados. Si son varios, se considera aula multigrado.</p>
                <GradeChips selected={classroomGrades}
                  onToggle={grade=>setClassroomGrades(classroomGrades.includes(grade)?classroomGrades.filter(item=>item!==grade):[...classroomGrades,grade].sort((a,b)=>a-b))}
                  onSelectAll={()=>setClassroomGrades(classroomGrades.length===GRADES.length?[]:[...GRADES])}
                  hint={classroomGrades.length>1?"Aula multigrado seleccionada":classroomGrades.length===1?"Un solo grado seleccionado":undefined}/>
              </div>
              <Button disabled={busy||!schools.length||!classroomGrades.length} className="w-full sm:w-auto">Crear aula</Button>
              {!schools.length&&<p className="mt-2 text-xs text-ink-soft">Crea primero una escuela para poder registrar aulas.</p>}
              {schools.length>0&&!classroomGrades.length&&<p className="mt-2 text-xs text-kawsay-alert">Debes seleccionar al menos un grado.</p>}
            </form>
          </Card>
        </div>
      </section>}

      {view==="students"&&<section className="flex flex-col gap-5">
        <Card title="Estudiantes matriculados">
          <div className="mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field label="Filtrar por aula" hint="Solo se muestran estudiantes matriculados en tus aulas.">
              <Select className={inputClass} value={selectedClassroom}
                placeholder="Todas mis aulas"
                options={classroomOptions}
                onChange={event=>setSelectedClassroom(event.target.value)}/>
            </Field>
            <p className="pb-4 text-sm text-ink-soft">
              <strong className="tabular font-bold text-ink">{studentsInClassroom.length}</strong> de {students.length} estudiantes
            </p>
          </div>

          {!students.length?<EmptyState>No hay estudiantes en tus aulas todavía.</EmptyState>:!studentsInClassroom.length?<EmptyState>Ningún estudiante matriculado en esta aula.</EmptyState>:<div className="overflow-x-auto"><table className="w-full border-collapse">
            <thead><tr><th className={thClass}>Estudiante</th><th className={thClass}>Correo</th><th className={thClass}>Grado</th><th className={thClass}>Idioma</th><th className={thClass}>Aulas</th><th className={thClass}></th></tr></thead>
            <tbody>{studentsInClassroom.map(student=><tr key={student.id}>
              <td className={`${tdClass} font-semibold`}>{student.full_name}</td>
              <td className={`${tdClass} text-ink-soft`}>{student.email}</td>
              <td className={tdClass}>{student.grade?<span className="rounded-full bg-kawsay-50 px-2.5 py-1 text-xs font-bold text-kawsay-600">{student.grade}.º</span>:<span className="text-ink-faint">Sin perfil</span>}</td>
              <td className={tdClass}>{student.preferred_language??"—"}</td>
              <td className={`${tdClass} text-ink-soft`}>{student.classrooms.map(room=>room.name).join(", ")}</td>
              <td className={tdClass}><Button variant="small" onClick={()=>void loadView("progress")}>Ver progreso</Button></td>
            </tr>)}</tbody>
          </table></div>}
        </Card>
      </section>}

      {view==="progress"&&<Card title="Progreso por estudiante y área">
        {!progress.some(student=>student.progress.length)&&<EmptyState>Aún no hay intentos registrados para tus aulas.</EmptyState>}
        <div className="space-y-5">{progress.map(student=><article className="rounded-xl border border-line p-4" key={student.id}>
          <header className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{student.full_name}</h3>
            {student.grade&&<span className="rounded-full bg-kawsay-50 px-2.5 py-1 text-xs font-bold text-kawsay-600">{student.grade}.º grado</span>}
            <span className="text-xs text-ink-soft">{student.classrooms.map(room=>room.name).join(", ")}</span>
          </header>
          {!student.progress.length?<p className="text-sm text-ink-soft">Sin datos de progreso.</p>:<div className="overflow-x-auto"><table className="w-full border-collapse">
            <thead><tr><th className={thClass}>Área</th><th className={thClass}>Dominio</th><th className={thClass}>Intentos</th><th className={thClass}>Correctos</th><th className={thClass}>Actualizado</th></tr></thead>
            <tbody>{student.progress.map(item=><tr key={`${student.id}-${item.subject}`}>
              <td className={`${tdClass} font-medium`}>{item.subject}</td>
              <td className={tdClass}><ProgressBar value={item.mastery_level}/></td>
              <td className={`${tdClass} tabular`}>{item.total_attempts}</td>
              <td className={`${tdClass} tabular`}>{item.correct_attempts}</td>
              <td className={`${tdClass} text-ink-soft`}>{new Date(item.updated_at).toLocaleDateString()}</td>
            </tr>)}</tbody>
          </table></div>}
        </article>)}</div>
      </Card>}

      {view==="flags"&&<Card title="Alertas abiertas">
        {!flags.length?<EmptyState>No hay alertas abiertas para tus aulas.</EmptyState>:
          <ul className="space-y-3">{flags.map(flag=><li className="rounded-xl border border-amber-200 bg-amber-50/70 p-4" key={flag.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-amber-900">{flag.reason}</p>
                <p className="mt-1 text-sm text-amber-800/90">{flag.evidence}</p>
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Estudiante: {students.find(student=>student.id===flag.student_id)?.full_name??flag.student_id}
                </p>
              </div>
              <Button variant="small" onClick={()=>void loadView("interventions",flag.student_id)}>Registrar intervención</Button>
            </div>
          </li>)}</ul>}
      </Card>}

      {view==="interventions"&&<section className="grid w-full items-start gap-6 lg:grid-cols-2">
        <Card title="Registrar intervención">
          {!students.length?<EmptyState>Matricula estudiantes en tus aulas antes de registrar intervenciones.</EmptyState>:<form onSubmit={createIntervention}>
            <Field label="Filtrar por aula" hint="Ayuda a encontrar al estudiante cuando el aula es multigrado.">
              <Select className={inputClass} value={selectedClassroom}
                placeholder="Todas mis aulas"
                options={classroomOptions}
                onChange={event=>{setSelectedClassroom(event.target.value);setInterventionStudent("");}}/>
            </Field>
            <Field label="Estudiante" hint={studentsInClassroom.length?`${studentsInClassroom.length} estudiantes disponibles`:undefined}>
              <Select className={inputClass} required value={interventionStudent}
                placeholder="Seleccionar estudiante"
                options={studentsInClassroom.map(student=>({
                  value:student.id,
                  label:student.full_name,
                  hint:[student.grade?`${student.grade}.º`:"Sin grado",student.classrooms.map(room=>room.name).join(", ")].filter(Boolean).join(" · "),
                }))}
                onChange={event=>setInterventionStudent(event.target.value)}/>
            </Field>
            <Field label="Estrategia de acompañamiento">
              <textarea className={inputClass} required rows={5} value={strategy} onChange={event=>setStrategy(event.target.value)} placeholder="Ej. Trabajo guiado con material concreto en pequeños grupos."/>
            </Field>
            <Field label="Notas (opcional)">
              <textarea className={inputClass} rows={3} value={interventionNotes} onChange={event=>setInterventionNotes(event.target.value)}/>
            </Field>
            <Button disabled={busy||!interventionStudent}>Guardar intervención</Button>
          </form>}
        </Card>
        <Card title="Intervenciones registradas">
          {!interventions.length?<EmptyState>Aún no has registrado intervenciones.</EmptyState>:
            <ul className="divide-y divide-line">{interventions.map(item=><li className="py-4" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{item.student_name}</p>
                <time className="text-xs text-ink-soft">{new Date(item.created_at).toLocaleString()}</time>
              </div>
              <p className="mt-1.5 text-sm text-ink">{item.strategy}</p>
              {item.notes&&<p className="mt-1 text-sm text-ink-soft">{item.notes}</p>}
            </li>)}</ul>}
        </Card>
      </section>}

      {view==="assignments"&&<section className="flex w-full flex-col gap-6">
        <Card title="Listado de actividades" variant="primary" action={<Button variant="small" onClick={()=>void loadView("create")}>+ Crear nueva actividad</Button>}>
          {!assignments.length?<EmptyState>No hay actividades creadas. Ve a "Crear actividad" para generar una con variantes por grado.</EmptyState>:
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr><th className={thClass}>Título</th><th className={thClass}>Área</th><th className={thClass}>Aula</th><th className={thClass}>Estado</th><th className={thClass}>Fecha de creación</th><th className={thClass}>Acciones</th></tr></thead>
                <tbody>{assignments.map(item=><tr key={item.id}>
                  <td className={`${tdClass} font-semibold text-ink`}>{item.title}</td>
                  <td className={tdClass}>{item.subject}</td>
                  <td className={`${tdClass} text-ink-soft`}>{item.classroom_name}</td>
                  <td className={tdClass}><Badge status={item.status}/></td>
                  <td className={`${tdClass} text-ink-soft`}>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="small" onClick={()=>void loadVariants(item.id)}>Ver detalles y variantes</Button>
                      <Button variant="small" onClick={()=>editAssignment(item.id)}>Editar</Button>
                    </div>
                  </td>
                </tr>)}</tbody>
              </table>
            </div>}
        </Card>

        <Card title="Detalle de variantes por grado">
          {!assignmentId?<EmptyState>Selecciona una actividad y pulsa "Ver detalles y variantes" para visualizar el contenido adaptado a cada grado.</EmptyState>:!variants.length?<EmptyState>No hay variantes generadas para esta actividad.</EmptyState>:<>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-ink-soft">Variantes generadas por KAWSAY AI adaptadas a cada grado</p>
              <Badge status={assignments.find(a=>a.id===assignmentId)?.status || ""}/>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{variants.map(variant=><article className="flex flex-col rounded-xl border-2 border-line bg-canvas p-4 transition hover:border-kawsay-300" key={variant.id}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="grid size-10 place-items-center rounded-lg bg-kawsay-600 text-base font-black text-white" aria-label={`Grado ${variant.grade}`}>{variant.grade}.º</span>
                <Badge status={variant.status}/>
              </div>
              <div className="flex-1 rounded-lg bg-white p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{variant.content}</p>
              </div>
            </article>)}</div>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5">
              <Button disabled={busy||variants.every(item=>item.status==="APPROVED")} onClick={()=>void runAction(async()=>{
                await request(`/teacher/assignments/${assignmentId}/approve`,{method:"POST"});
                setVariants(await request<Variant[]>(`/teacher/assignments/${assignmentId}/variants`));
                setAssignments(await request<Assignment[]>("/teacher/assignments"));
              },"Variantes aprobadas correctamente.")}>Aprobar todas las variantes</Button>
              <Button variant="secondary" disabled={busy||variants.some(item=>item.status!=="APPROVED")} onClick={()=>void runAction(async()=>{
                await request(`/teacher/assignments/${assignmentId}/publish`,{method:"POST"});
                setAssignments(await request<Assignment[]>("/teacher/assignments"));
                setVariants(await request<Variant[]>(`/teacher/assignments/${assignmentId}/variants`));
              },"Actividad publicada correctamente.")}>Publicar actividad</Button>
            </div>
            <p className="mt-3 text-xs text-ink-soft">Debes aprobar todas las variantes antes de poder publicar la actividad.</p>
          </>}
        </Card>
      </section>}

      {view==="create"&&<section className="grid w-full items-start gap-6 lg:grid-cols-2">
        <form onSubmit={createAssignment} className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <h2 className="mb-5 text-base font-bold tracking-tight text-ink">Datos de la actividad</h2>
          <Field label="Aula" hint={selectedRoom?`Atiende ${gradesLabel(selectedRoom.grade_levels)} · ${selectedRoom.student_count} estudiantes`:undefined}>
            <Select className={inputClass} required value={selectedClassroom}
              placeholder="Seleccionar aula"
              options={classroomOptions}
              onChange={event=>chooseClassroomForCreate(event.target.value)}/>
          </Field>
          {selectedRoom&&selectedRoom.grade_levels.length>1&&<InfoNote tone="teal">
            Aula multigrado: se precargaron los grados {gradesLabel(selectedRoom.grade_levels)}. KAWSAY generará una variante por grado.
          </InfoNote>}
          <Field label="Área" hint="Elige un área o escribe la tuya.">
            <input className={inputClass} required list="subjects-list" value={subject} onChange={event=>setSubject(event.target.value)} placeholder="Ej. Matemática"/>
            <datalist id="subjects-list">{SUBJECTS.map(item=><option key={item} value={item}/>)}</datalist>
          </Field>
          <Field label="Título de la actividad">
            <input className={inputClass} required value={title} onChange={event=>setTitle(event.target.value)} placeholder="Ej. Multiplicación"/>
          </Field>
          <Field label="Actividad base" hint="KAWSAY adapta este contenido a cada grado seleccionado.">
            <textarea className={inputClass} required rows={6} value={content} onChange={event=>setContent(event.target.value)} placeholder="Describe la actividad que trabajarán tus estudiantes…"/>
          </Field>
          <div className="mb-5">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Grados objetivo</span>
            <GradeChips selected={grades}
              onToggle={grade=>setGrades(grades.includes(grade)?grades.filter(item=>item!==grade):[...grades,grade].sort((a,b)=>a-b))}
              onSelectAll={()=>setGrades(grades.length===GRADES.length?[]:[...GRADES])}
              hint={availableGrades.length?`Grados disponibles en tus aulas: ${gradesLabel(availableGrades)}`:undefined}/>
          </div>
          <Button className="w-full" disabled={busy||!classrooms.length||!grades.length}>{busy?"Generando variantes…":"Adaptar con KAWSAY"}</Button>
          {!classrooms.length&&<p className="mt-2 text-xs text-ink-soft">Necesitas al menos un aula para crear actividades.</p>}
        </form>

        <Card title="Variantes para revisión">
          {!variants.length?<EmptyState>Completa la actividad y presiona «Adaptar con KAWSAY» para generar una variante por grado.</EmptyState>:<>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{variants.map(variant=><article className="flex flex-col rounded-xl border border-line bg-canvas p-4" key={variant.id}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="grid size-9 place-items-center rounded-lg bg-kawsay-600 text-sm font-black text-white" aria-label={`Grado ${variant.grade}`}>{variant.grade}.º</span>
                <Badge status={variant.status}/>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{variant.content}</p>
            </article>)}</div>
            <p className="mt-4 text-xs text-ink-soft">Revisa y aprueba las variantes desde la sección «Actividades».</p>
          </>}
        </Card>
      </section>}
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App/>
    </ErrorBoundary>
  </React.StrictMode>
);
