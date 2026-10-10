import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import {request} from "./api";
import "./styles.css";

type Classroom = {id:string; name:string; school_id:string; school_year:number};
type School = {id:string; name:string; region:string|null};
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
      const result=await request<{user:{role:string};access_token:string}>("/auth/login",{method:"POST",body:JSON.stringify({email,password})});
      if(result.user.role!=="TEACHER") throw new Error("Esta pantalla es solo para cuentas docentes.");
      localStorage.setItem("token",result.access_token);
      done();
    } catch(error) { setError(error instanceof Error?error.message:"No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <div className="center"><form className="card login" onSubmit={submit}>
    <h1>KAWSAY AI</h1><p>Panel docente</p>
    {creating&&<><label>Nombre completo</label><input required value={fullName} onChange={event=>setFullName(event.target.value)}/></>}
    <label>Correo</label><input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/>
    <label>Contraseña</label><input type="password" required minLength={8} autoComplete={creating?"new-password":"current-password"} value={password} onChange={event=>setPassword(event.target.value)}/>
    {error&&<div className="notice error-box">{error}</div>}
    <button disabled={busy}>{busy?"Procesando…":creating?"Crear cuenta e ingresar":"Ingresar"}</button>
    <button className="link-button" type="button" onClick={()=>{setCreating(!creating);setError("");}}>
      {creating?"Ya tengo cuenta":"Crear cuenta docente"}
    </button>
  </form></div>;
}

function App() {
  const [logged,setLogged]=useState(!!localStorage.getItem("token"));
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
  const [schoolName,setSchoolName]=useState("");
  const [schoolRegion,setSchoolRegion]=useState("");
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

  async function loadBase() {
    const [classroomRows,schoolRows]=await Promise.all([
      request<Classroom[]>("/classrooms"),
      request<School[]>("/schools"),
    ]);
    setClassrooms(classroomRows); setSchools(schoolRows);
    if(!selectedClassroom&&classroomRows.length) setSelectedClassroom(classroomRows[0].id);
    if(!selectedSchool&&schoolRows.length) setSelectedSchool(schoolRows[0].id);
  }

  async function loadView(next:View, focusStudentId?:string) {
    setView(next); setError(""); setStatus(""); setLoading(true);
    try {
      if(next==="dashboard") setDashboard(await request<Dashboard>("/teacher/dashboard"));
      if(next==="classrooms") {
        await loadBase();
        setStudents(await request<Student[]>("/teacher/students"));
      }
      if(next==="students") setStudents(await request<Student[]>("/teacher/students"));
      if(next==="progress") setProgress(await request<ProgressStudent[]>("/teacher/progress"));
      if(next==="flags") {
        const [flagRows,studentRows]=await Promise.all([
          request<SupportFlag[]>("/teacher/support-flags"),
          request<Student[]>("/teacher/students"),
        ]);
        setFlags(flagRows); setStudents(studentRows);
      }
      if(next==="interventions") {
        const [studentRows,interventionRows]=await Promise.all([
          request<Student[]>("/teacher/students"),
          request<Intervention[]>("/teacher/interventions"),
        ]);
        setStudents(studentRows); setInterventions(interventionRows);
        if(focusStudentId) setInterventionStudent(focusStudentId);
        else if(!interventionStudent&&studentRows.length) setInterventionStudent(studentRows[0].id);
      }
      if(next==="assignments") setAssignments(await request<Assignment[]>("/teacher/assignments"));
      if(next==="create") await loadBase();
    } catch(error) { setError(error instanceof Error?error.message:"No se pudieron cargar los datos."); }
    finally { setLoading(false); }
  }

  useEffect(()=>{if(logged) void loadView("dashboard");},[logged]);

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
      })});
      setSchoolName(""); setSchoolRegion("");
      await loadBase(); setSelectedSchool(school.id);
    },"Escuela creada.");
  }

  async function createClassroom(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async()=>{
      if(!selectedSchool) throw new Error("Selecciona o crea una escuela primero.");
      await request<{id:string}>("/classrooms",{method:"POST",body:JSON.stringify({
        school_id:selectedSchool,name:classroomName.trim(),
      })});
      setClassroomName(""); await loadBase();
    },"Aula creada.");
  }

  async function enrollStudent(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async()=>{
      if(!selectedClassroom) throw new Error("Selecciona un aula primero.");
      await request<{student_id:string}>(`/classrooms/${selectedClassroom}/students/by-email`,{
        method:"POST",body:JSON.stringify({email:studentEmail.trim()}),
      });
      setStudentEmail(""); setStudents(await request<Student[]>("/teacher/students"));
    },"Estudiante matriculado.");
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

  async function loadVariants(id:string) {
    await runAction(async()=>{
      setAssignmentId(id);
      setVariants(await request<Variant[]>(`/teacher/assignments/${id}/variants`));
      setView("assignments");
    });
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

  return <div className="shell">
    <aside><h2>KAWSAY</h2><span>Docente</span>
      {([
        ["dashboard","Dashboard"],["classrooms","Mis aulas"],["students","Estudiantes"],
        ["progress","Progreso"],["assignments","Actividades"],["create","Crear actividad"],
        ["flags","Alertas"],["interventions","Intervenciones"],
      ] as [View,string][]).map(([key,label])=><button className={`nav ${view===key?"selected":""}`} key={key} onClick={()=>void loadView(key)}>{label}</button>)}
      <button className="ghost" onClick={()=>{localStorage.removeItem("token");setLogged(false);}}>Salir</button>
    </aside>
    <main>
      <header><div><h1>{viewTitles[view]}</h1><p>Decisiones claras para acompañar mejor a cada estudiante.</p></div></header>
      {error&&<div className="notice error-box" role="alert">{error}</div>}
      {status&&<div className="notice success-box" role="status">{status}</div>}
      {loading&&<p className="muted">Cargando información…</p>}

      {view==="dashboard"&&dashboard&&<>
        <section className="metrics">{([
          ["Aulas",dashboard.summary.classrooms],["Estudiantes",dashboard.summary.students],
          ["Actividades",dashboard.summary.assignments],["Alertas abiertas",dashboard.summary.open_flags],
        ] as [string,number][]).map(([label,value])=><div className="metric card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
        <section className="grid dashboard-grid">
          <div className="card"><h2>Actividades recientes</h2>
            {!dashboard.assignments.length&&<p>Aún no tienes actividades creadas.</p>}
            {dashboard.assignments.map(item=><article className="list-row" key={item.id}><div><b>{item.title}</b><small>{item.subject}</small></div><span className={`badge ${item.status.toLowerCase()}`}>{item.status}</span></article>)}
          </div>
          <div className="card"><h2>Alertas de apoyo</h2>
            {!dashboard.flags.length&&<p>No hay alertas abiertas.</p>}
            {dashboard.flags.map(flag=><article className="flag" key={flag.id}><b>{flag.reason}</b><p>{flag.evidence}</p></article>)}
          </div>
        </section>
      </>}

      {view==="classrooms"&&<section className="grid">
        <div className="card"><h2>Aulas a tu cargo</h2>
          {!classrooms.length&&<p>Aún no tienes aulas creadas.</p>}
          {classrooms.map(room=><article className="list-row" key={room.id}><div><b>{room.name}</b><small>Año escolar {room.school_year}</small></div><span>{students.flatMap(student=>student.classrooms).filter(item=>item.id===room.id).length} estudiantes</span></article>)}
          <h3>Matricular estudiante</h3>
          <form onSubmit={enrollStudent}>
            <label>Aula</label><select required value={selectedClassroom} onChange={event=>setSelectedClassroom(event.target.value)}><option value="">Seleccionar aula</option>{classrooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select>
            <label>Correo de la cuenta del estudiante</label><input required type="email" value={studentEmail} onChange={event=>setStudentEmail(event.target.value)}/>
            <button disabled={busy}>Matricular</button>
          </form>
        </div>
        <div className="card"><h2>Crear aula</h2>
          <form onSubmit={createSchool} className="subform">
            <h3>Escuela</h3><label>Nombre</label><input required value={schoolName} onChange={event=>setSchoolName(event.target.value)}/>
            <label>Región (opcional)</label><input value={schoolRegion} onChange={event=>setSchoolRegion(event.target.value)}/>
            <button className="secondary" disabled={busy}>Crear escuela</button>
          </form>
          <form onSubmit={createClassroom}>
            <h3>Aula</h3><label>Escuela</label><select required value={selectedSchool} onChange={event=>setSelectedSchool(event.target.value)}><option value="">Seleccionar escuela</option>{schools.map(school=><option key={school.id} value={school.id}>{school.name}</option>)}</select>
            <label>Nombre del aula</label><input required value={classroomName} onChange={event=>setClassroomName(event.target.value)} placeholder="Ej. 4.º primaria - A"/>
            <button disabled={busy||!schools.length}>Crear aula</button>
          </form>
        </div>
      </section>}

      {view==="students"&&<section className="card table-wrap">
        <h2>Estudiantes matriculados</h2>
        {!students.length?<p>No hay estudiantes en tus aulas todavía.</p>:<table><thead><tr><th>Estudiante</th><th>Correo</th><th>Grado</th><th>Idioma</th><th>Aulas</th><th></th></tr></thead><tbody>
          {students.map(student=><tr key={student.id}><td>{student.full_name}</td><td>{student.email}</td><td>{student.grade??"Sin perfil"}</td><td>{student.preferred_language??"—"}</td><td>{student.classrooms.map(room=>room.name).join(", ")}</td><td><button className="small-button" onClick={()=>void loadView("progress")}>Ver progreso</button></td></tr>)}
        </tbody></table>}
        <p className="muted">Para matricular, registra primero la cuenta del estudiante y luego usa el formulario de la sección “Mis aulas”.</p>
      </section>}

      {view==="progress"&&<section className="card table-wrap">
        <h2>Progreso por estudiante y área</h2>
        {!progress.some(student=>student.progress.length)&&<p>Aún no hay intentos registrados para tus aulas.</p>}
        {progress.map(student=><article className="progress-student" key={student.id}>
          <h3>{student.full_name} <small>{student.grade?`${student.grade}.º grado`:"Grado sin configurar"} · {student.classrooms.map(room=>room.name).join(", ")}</small></h3>
          {!student.progress.length?<p className="muted">Sin datos de progreso.</p>:<div className="table-wrap"><table><thead><tr><th>Área</th><th>Dominio</th><th>Intentos</th><th>Correctos</th><th>Actualizado</th></tr></thead><tbody>
            {student.progress.map(item=><tr key={`${student.id}-${item.subject}`}><td>{item.subject}</td><td><div className="progress-track"><span style={{width:`${Math.max(0,Math.min(100,item.mastery_level))}%`}}/></div>{item.mastery_level}%</td><td>{item.total_attempts}</td><td>{item.correct_attempts}</td><td>{new Date(item.updated_at).toLocaleDateString()}</td></tr>)}
          </tbody></table></div>}
        </article>)}
      </section>}

      {view==="flags"&&<section className="card"><h2>Alertas abiertas</h2>
        {!flags.length&&<p>No hay alertas abiertas para tus aulas.</p>}
        {flags.map(flag=><article className="flag" key={flag.id}><b>{flag.reason}</b><p>{flag.evidence}</p><small>Estudiante: {students.find(student=>student.id===flag.student_id)?.full_name??flag.student_id}</small>
          <button className="small-button" onClick={()=>void loadView("interventions",flag.student_id)}>Registrar intervención</button>
        </article>)}
      </section>}

      {view==="interventions"&&<section className="grid">
        <div className="card"><h2>Registrar intervención</h2>
          {!students.length?<p>Matricula estudiantes en tus aulas antes de registrar intervenciones.</p>:<form onSubmit={createIntervention}>
            <label>Estudiante</label><select required value={interventionStudent} onChange={event=>setInterventionStudent(event.target.value)}>{students.map(student=><option key={student.id} value={student.id}>{student.full_name} — {student.classrooms.map(room=>room.name).join(", ")}</option>)}</select>
            <label>Estrategia de acompañamiento</label><textarea required rows={5} value={strategy} onChange={event=>setStrategy(event.target.value)}/>
            <label>Notas (opcional)</label><textarea rows={3} value={interventionNotes} onChange={event=>setInterventionNotes(event.target.value)}/>
            <button disabled={busy}>Guardar intervención</button>
          </form>}
        </div>
        <div className="card"><h2>Intervenciones registradas</h2>
          {!interventions.length&&<p>Aún no has registrado intervenciones.</p>}
          {interventions.map(item=><article className="intervention" key={item.id}><b>{item.student_name}</b><small>{new Date(item.created_at).toLocaleString()}</small><p>{item.strategy}</p>{item.notes&&<p className="muted">{item.notes}</p>}</article>)}
        </div>
      </section>}

      {view==="assignments"&&<section className="grid">
        <div className="card"><div className="section-heading"><h2>Actividades</h2><button onClick={()=>void loadView("create")}>Crear actividad</button></div>
          {!assignments.length&&<p>Aún no tienes actividades.</p>}
          {assignments.map(item=><article className="list-row" key={item.id}><div><b>{item.title}</b><small>{item.subject} · {item.classroom_name}</small></div><div><span className={`badge ${item.status.toLowerCase()}`}>{item.status}</span><button className="small-button" onClick={()=>void loadVariants(item.id)}>Revisar</button></div></article>)}
        </div>
        <div className="card"><h2>Variantes por grado</h2>
          {!assignmentId?<p>Selecciona una actividad para revisar sus variantes.</p>:!variants.length?<p>No hay variantes generadas.</p>:<>
            {variants.map(variant=><article className="variant" key={variant.id}><b>{variant.grade}.º primaria</b><p>{variant.content}</p><span className={`badge ${variant.status.toLowerCase()}`}>{variant.status}</span></article>)}
            <div className="actions"><button disabled={busy||variants.every(item=>item.status==="APPROVED")} onClick={()=>void runAction(async()=>{
              await request(`/teacher/assignments/${assignmentId}/approve`,{method:"POST"});
              setVariants(await request<Variant[]>(`/teacher/assignments/${assignmentId}/variants`));
              setAssignments(await request<Assignment[]>("/teacher/assignments"));
            },"Variantes aprobadas.")}>Aprobar variantes</button>
            <button className="secondary" disabled={busy||variants.some(item=>item.status!=="APPROVED")} onClick={()=>void runAction(async()=>{
              await request(`/teacher/assignments/${assignmentId}/publish`,{method:"POST"});
              setAssignments(await request<Assignment[]>("/teacher/assignments"));
              setVariants(await request<Variant[]>(`/teacher/assignments/${assignmentId}/variants`));
            },"Actividad publicada.")}>Publicar actividad</button></div>
          </>}
        </div>
      </section>}

      {view==="create"&&<section className="grid">
        <form className="card" onSubmit={createAssignment}>
          <label>Aula</label><select required value={selectedClassroom} onChange={event=>setSelectedClassroom(event.target.value)}><option value="">Seleccionar aula</option>{classrooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select>
          <label>Área</label><input required value={subject} onChange={event=>setSubject(event.target.value)}/>
          <label>Título</label><input required value={title} onChange={event=>setTitle(event.target.value)} placeholder="Multiplicación"/>
          <label>Actividad base</label><textarea required rows={7} value={content} onChange={event=>setContent(event.target.value)}/>
          <label>Grados objetivo</label><div className="grades">{[1,2,3,4,5,6].map(grade=><button type="button" className={grades.includes(grade)?"active":""} key={grade} onClick={()=>setGrades(grades.includes(grade)?grades.filter(item=>item!==grade):[...grades,grade])}>{grade}.º</button>)}</div>
          <button disabled={busy||!classrooms.length}>{busy?"Procesando…":"Generar variantes"}</button>
        </form>
        <div className="card"><h2>Variantes para revisión</h2>
          {!variants.length?<p>Genera una actividad para ver sus variantes.</p>:variants.map(variant=><article className="variant" key={variant.id}><b>{variant.grade}.º primaria</b><p>{variant.content}</p><span className={`badge ${variant.status.toLowerCase()}`}>{variant.status}</span></article>)}
          {variants.length>0&&<p className="muted">Aprueba y publica las variantes desde la sección Actividades.</p>}
        </div>
      </section>}
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<App/>);
