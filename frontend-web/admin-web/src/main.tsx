import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import {request} from "./api";
import "./styles.css";

type School = {id:string; name:string; region:string|null};
type Classroom = {id:string; name:string; school_id:string; school_year:number};
type Subject = {id:string; name:string; grade:number};
type View = "dashboard"|"schools"|"classrooms"|"curriculum"|"accounts";

function Login({done}:{done:()=>void}) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result=await request<{user:{role:string};access_token:string}>("/auth/login",{method:"POST",body:JSON.stringify({email,password})});
      if(result.user.role!=="ADMIN") throw new Error("Esta pantalla es solo para cuentas de administración.");
      localStorage.setItem("token",result.access_token);
      done();
    } catch(error) { setError(error instanceof Error?error.message:"No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <div className="center"><form className="card login" onSubmit={submit}>
    <h1>KAWSAY AI</h1><p>Panel de administración</p>
    <label>Correo</label><input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/>
    <label>Contraseña</label><input type="password" required minLength={8} autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/>
    {error&&<div className="notice error-box" role="alert">{error}</div>}
    <button disabled={busy}>{busy?"Procesando…":"Ingresar"}</button>
    <p className="muted">Las cuentas de administración se crean desde el backend o con un usuario ADMIN existente.</p>
  </form></div>;
}

function App() {
  const [logged,setLogged]=useState(!!localStorage.getItem("token"));
  const [view,setView]=useState<View>("dashboard");
  const [schools,setSchools]=useState<School[]>([]);
  const [classrooms,setClassrooms]=useState<Classroom[]>([]);
  const [subjects,setSubjects]=useState<Subject[]>([]);
  const [selectedSchool,setSelectedSchool]=useState("");
  const [schoolName,setSchoolName]=useState("");
  const [schoolRegion,setSchoolRegion]=useState("");
  const [classroomName,setClassroomName]=useState("");
  const [classroomYear,setClassroomYear]=useState(String(new Date().getFullYear()));
  const [subjectGrade,setSubjectGrade]=useState("");
  const [accountEmail,setAccountEmail]=useState("");
  const [accountName,setAccountName]=useState("");
  const [accountPassword,setAccountPassword]=useState("");
  const [accountRole,setAccountRole]=useState("TEACHER");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [status,setStatus]=useState("");

  async function loadView(next:View) {
    setView(next); setError(""); setStatus(""); setLoading(true);
    try {
      if(next==="dashboard"||next==="schools"||next==="classrooms") {
        const [schoolRows,classroomRows]=await Promise.all([
          request<School[]>("/schools"),
          request<Classroom[]>("/classrooms"),
        ]);
        setSchools(schoolRows); setClassrooms(classroomRows);
        if(!selectedSchool&&schoolRows.length) setSelectedSchool(schoolRows[0].id);
      }
      if(next==="curriculum") setSubjects(await request<Subject[]>(subjectGrade?`/curriculum/subjects?grade=${subjectGrade}`:"/curriculum/subjects"));
      if(next==="accounts") setSchools(await request<School[]>("/schools"));
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
      const rows=await request<School[]>("/schools"); setSchools(rows); setSelectedSchool(school.id);
    },"Escuela registrada.");
  }

  async function createClassroom(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async()=>{
      if(!selectedSchool) throw new Error("Selecciona una escuela primero.");
      await request<{id:string}>("/classrooms",{method:"POST",body:JSON.stringify({
        school_id:selectedSchool,name:classroomName.trim(),school_year:Number(classroomYear)||new Date().getFullYear(),
      })});
      setClassroomName("");
      setClassrooms(await request<Classroom[]>("/classrooms"));
    },"Aula registrada.");
  }

  async function createAccount(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async()=>{
      await request<{id:string}>("/auth/register",{method:"POST",body:JSON.stringify({
        email:accountEmail.trim(),password:accountPassword,full_name:accountName.trim(),role:accountRole,
      })});
      setAccountEmail(""); setAccountName(""); setAccountPassword("");
    },"Cuenta creada.");
  }

  if(!logged) return <Login done={()=>setLogged(true)}/>;
  const viewTitles:Record<View,string>={
    dashboard:"Resumen administrativo",schools:"Escuelas",classrooms:"Aulas",
    curriculum:"Currículo",accounts:"Cuentas",
  };

  return <div className="shell">
    <aside><h2>KAWSAY</h2><span>Administración</span>
      {([
        ["dashboard","Dashboard"],["schools","Escuelas"],["classrooms","Aulas"],
        ["curriculum","Currículo"],["accounts","Cuentas"],
      ] as [View,string][]).map(([key,label])=><button className={`nav ${view===key?"selected":""}`} key={key} onClick={()=>void loadView(key)}>{label}</button>)}
      <button className="ghost" onClick={()=>{localStorage.removeItem("token");setLogged(false);}}>Salir</button>
    </aside>
    <main>
      <header><h1>{viewTitles[view]}</h1><p>Gestión de escuelas, aulas, currículo y cuentas de la plataforma.</p></header>
      {error&&<div className="notice error-box" role="alert">{error}</div>}
      {status&&<div className="notice success-box" role="status">{status}</div>}
      {loading&&<p className="muted">Cargando información…</p>}

      {view==="dashboard"&&<>
        <section className="metrics">{([
          ["Escuelas",schools.length],["Aulas",classrooms.length],
          ["Años escolares",new Set(classrooms.map(room=>room.school_year)).size],["Regiones",new Set(schools.map(school=>school.region).filter(Boolean)).size],
        ] as [string,number][]).map(([label,value])=><div className="metric card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
        <section className="grid dashboard-grid">
          <div className="card"><h2>Escuelas registradas</h2>
            {!schools.length&&<p>No hay escuelas registradas.</p>}
            {schools.map(school=><article className="list-row" key={school.id}><div><b>{school.name}</b><small>{school.region??"Región sin definir"}</small></div><span>{classrooms.filter(room=>room.school_id===school.id).length} aulas</span></article>)}
          </div>
          <div className="card"><h2>Aulas por año escolar</h2>
            {!classrooms.length&&<p>No hay aulas registradas.</p>}
            {classrooms.map(room=><article className="list-row" key={room.id}><div><b>{room.name}</b><small>{schools.find(school=>school.id===room.school_id)?.name??"Escuela sin asignar"}</small></div><span className="badge">{room.school_year}</span></article>)}
          </div>
        </section>
      </>}

      {view==="schools"&&<section className="grid">
        <div className="card table-wrap"><h2>Escuelas</h2>
          {!schools.length?<p>No hay escuelas registradas.</p>:<table><thead><tr><th>Nombre</th><th>Región</th><th>Aulas</th></tr></thead><tbody>
            {schools.map(school=><tr key={school.id}><td>{school.name}</td><td>{school.region??"—"}</td><td>{classrooms.filter(room=>room.school_id===school.id).length}</td></tr>)}
          </tbody></table>}
        </div>
        <div className="card"><h2>Registrar escuela</h2>
          <form onSubmit={createSchool}>
            <label>Nombre</label><input required value={schoolName} onChange={event=>setSchoolName(event.target.value)} placeholder="Ej. I.E. José María Arguedas"/>
            <label>Región (opcional)</label><input value={schoolRegion} onChange={event=>setSchoolRegion(event.target.value)} placeholder="Ej. Cusco"/>
            <button disabled={busy}>Registrar escuela</button>
          </form>
        </div>
      </section>}

      {view==="classrooms"&&<section className="grid">
        <div className="card table-wrap"><h2>Aulas</h2>
          {!classrooms.length?<p>No hay aulas registradas.</p>:<table><thead><tr><th>Aula</th><th>Escuela</th><th>Año escolar</th></tr></thead><tbody>
            {classrooms.map(room=><tr key={room.id}><td>{room.name}</td><td>{schools.find(school=>school.id===room.school_id)?.name??room.school_id}</td><td>{room.school_year}</td></tr>)}
          </tbody></table>}
        </div>
        <div className="card"><h2>Registrar aula</h2>
          {!schools.length?<p>Registra una escuela antes de crear aulas.</p>:<form onSubmit={createClassroom}>
            <label>Escuela</label><select required value={selectedSchool} onChange={event=>setSelectedSchool(event.target.value)}><option value="">Seleccionar escuela</option>{schools.map(school=><option key={school.id} value={school.id}>{school.name}</option>)}</select>
            <label>Nombre del aula</label><input required value={classroomName} onChange={event=>setClassroomName(event.target.value)} placeholder="Ej. 4.º primaria - A"/>
            <label>Año escolar</label><input required type="number" min={2000} max={2100} value={classroomYear} onChange={event=>setClassroomYear(event.target.value)}/>
            <button disabled={busy}>Registrar aula</button>
          </form>}
        </div>
      </section>}

      {view==="curriculum"&&<section className="card table-wrap">
        <div className="actions"><h2>Áreas curriculares</h2>
          <select value={subjectGrade} onChange={event=>{const value=event.target.value;setSubjectGrade(value);void runAction(async()=>{setSubjects(await request<Subject[]>(value?`/curriculum/subjects?grade=${value}`:"/curriculum/subjects"));});}}>
            <option value="">Todos los grados</option>{[1,2,3,4,5,6].map(grade=><option key={grade} value={grade}>{grade}.º grado</option>)}
          </select>
        </div>
        {!subjects.length?<p>No hay áreas curriculares registradas para el filtro seleccionado.</p>:<table><thead><tr><th>Área</th><th>Grado</th></tr></thead><tbody>
          {subjects.map(subject=><tr key={subject.id}><td>{subject.name}</td><td>{subject.grade}.º</td></tr>)}
        </tbody></table>}
        <p className="muted">El currículo se carga mediante las migraciones y datos iniciales del backend.</p>
      </section>}

      {view==="accounts"&&<section className="grid">
        <div className="card"><h2>Crear cuenta</h2>
          <form onSubmit={createAccount}>
            <label>Nombre completo</label><input required value={accountName} onChange={event=>setAccountName(event.target.value)}/>
            <label>Correo</label><input required type="email" value={accountEmail} onChange={event=>setAccountEmail(event.target.value)}/>
            <label>Contraseña</label><input required type="password" minLength={8} autoComplete="new-password" value={accountPassword} onChange={event=>setAccountPassword(event.target.value)}/>
            <label>Rol</label><select value={accountRole} onChange={event=>setAccountRole(event.target.value)}>
              <option value="TEACHER">Docente</option><option value="STUDENT">Estudiante</option><option value="ADMIN">Administración</option>
            </select>
            <button disabled={busy}>Crear cuenta</button>
          </form>
        </div>
        <div className="card"><h2>Escuelas y aulas</h2>
          <p className="muted">Las cuentas se asocian a escuelas y aulas desde los paneles docentes con el correo del usuario.</p>
          {schools.map(school=><article className="list-row" key={school.id}><div><b>{school.name}</b><small>{school.region??"Sin región"}</small></div><span>{classrooms.filter(room=>room.school_id===school.id).length} aulas</span></article>)}
          {!schools.length&&<p>No hay escuelas registradas.</p>}
        </div>
      </section>}
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<App/>);
