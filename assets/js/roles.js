/* Presentación del demo: tres perfiles sobre la lógica educativa compartida. */
const Roles={
  current:'admin',view:'home',
  config:{admin:{name:'Administrador',icon:'▦',caption:'Gestiona la comunidad',tabs:[['home','Inicio'],['manage','Gestión'],['reports','Estadísticas']]},teacher:{name:'Docente',icon:'▤',caption:'Acompaña el aprendizaje',tabs:[['home','Inicio'],['work','Cursos y actividades'],['reports','Seguimiento'],['alerts','Alertas']]},student:{name:'Estudiante',icon:'♙',caption:'Descubre y aprende',tabs:[['home','Inicio'],['activities','Mis actividades'],['reports','Mi progreso'],['help','Pedir ayuda']]}},
  open(role,view='home'){
    if(!this.config[role])return;
    if(role!=='teacher')Teacher.assignment=null;
    this.current=role;this.view=view;App.page=role;
    document.body.classList.remove('menu-open');
    log('Perfil abierto','Navegación',`${this.config[role].name} · ${view}`);
    this.render();window.scrollTo(0,0);
  },
  tab(view){this.view=view;log('Sección abierta','Navegación',`${this.config[this.current].name} · ${view}`);this.render()},
  manage(tab){Admin.tab=tab;Admin.edit=null;this.open('admin','manage')},
  start(id){this.current='student';this.view='activities';App.page='student';Student.start(id)},
  render(){
    const role=this.current,config=this.config[role];App.page=role;
    document.getElementById('nav').innerHTML=Object.entries(this.config).map(([id,item])=>`<button type="button" class="${id===role?'active':''}" onclick="Roles.open('${id}')" ${id===role?'aria-current="page"':''}><span class="nav-icon">${item.icon}</span><span>${item.name}<small class="role-nav-caption">${item.caption}</small></span></button>`).join('');
    document.getElementById('breadcrumb').textContent=config.name;
    document.getElementById('top-role').textContent=config.name;
    document.documentElement.lang=S().language;
    const tabs=config.tabs.map(([id,label])=>`<button type="button" class="role-tab ${this.view===id?'active':''}" ${this.view===id?'aria-current="page"':''} onclick="Roles.tab('${id}')">${label}${id==='alerts'&&S().alerts.some(a=>!a.attended)?` <span class="tab-count">${S().alerts.filter(a=>!a.attended).length}</span>`:''}</button>`).join('');
    let content;
    if(this.view==='home')content=this.home(role);
    else if(role==='admin'&&this.view==='manage')content=Admin.render();
    else if(role==='teacher'&&this.view==='work')content=Teacher.render().replace("Admin.tab='students';App.go('admin')","Roles.manage('students')");
    else if(role==='student'&&this.view==='activities')content=Student.render().replace("Admin.tab='students';App.go('admin')","Roles.manage('students')");
    else if(role==='student'&&this.view==='help')content=Tutor.render();
    else if(role==='teacher'&&this.view==='alerts')content=Alerts.render();
    else if(this.view==='reports'){if(role==='student')Reports.filter='Estudiante';content=Reports.render();if(role==='student')content=content.replace(/<div class="actions" style="margin-bottom:16px">[\s\S]*?<\/div>/,'')}
    else content=this.home(role);
    const app=document.getElementById('app');app.className=`role-${role}`;
    app.innerHTML=`<div class="role-tabs" aria-label="Secciones de ${config.name}">${tabs}</div><div class="role-content">${content}</div><div class="role-footer"><i></i> Entorno de demostración · Datos ficticios guardados en este navegador</div>`;
    Store.save();
  },
  stats(items){return `<div class="role-grid">${items.map(([label,value,detail,icon])=>`<div class="role-stat"><div class="role-stat-top"><span>${label}</span><span class="role-stat-icon">${icon}</span></div><strong>${value}</strong><small>${detail}</small></div>`).join('')}</div>`},
  action(icon,title,description,fn){return `<button type="button" class="role-action" onclick="${fn}"><span class="role-stat-icon">${icon}</span><b>${title}</b><small>${description}</small></button>`},
  section(title,desc=''){return `<div class="role-section-title"><div><h2>${title}</h2>${desc?`<p>${desc}</p>`:''}</div></div>`},
  welcome(kicker,title,description,button,action,icon){return `<section class="welcome-panel"><div class="welcome-content"><span class="welcome-kicker">✦ ${kicker}</span><h2>${title}</h2><p>${description}</p><div class="actions">${btn(button,action,'primary')}</div></div><div class="welcome-illustration" aria-hidden="true">${icon}</div></section>`},
  home(role){
    const pending=S().alerts.filter(a=>!a.attended),rs=S().results;
    if(role==='admin')return `<div class="role-heading"><div><div class="eyebrow">PANEL GENERAL</div><h1>Hola, administrador</h1><p>Un espacio para cuidar y acompañar a tu comunidad educativa.</p></div>${btn('↻ Reiniciar demostración','Roles.reset()')}</div>`+
      this.welcome('EDUCACIÓN EN COMUNIDAD','Juntos hacemos crecer el aprendizaje.','Gestiona instituciones, docentes y estudiantes desde un solo lugar. Cada cambio se refleja en toda la demostración.','Gestionar comunidad →',"Roles.tab('manage')",'✳')+
      this.section('Tu comunidad en cifras','Un vistazo a los registros de la demostración.')+
      this.stats([['Instituciones',S().institutions.length,'Comunidades educativas','⌂'],['Docentes',S().teachers.length,'Acompañando a estudiantes','♧'],['Estudiantes',S().students.length,'Perfiles registrados','♙'],['Rendimiento',`${average(rs.map(r=>r.score))}%`,`${rs.length} evaluaciones registradas`,'◒']])+
      `<div class="role-columns">${card('Accesos rápidos','Comienza por la tarea que necesitas realizar.',`<div class="role-action-grid">${this.action('⌂','Instituciones','Consulta y gestiona los centros.',"Roles.manage('institutions')")}${this.action('♧','Docentes','Administra los perfiles docentes.',"Roles.manage('teachers')")}${this.action('♙','Estudiantes','Registra y asigna estudiantes.',"Roles.manage('students')")}</div>`)}${card('Actividad reciente','Lo que sucede en tu comunidad.',this.recent())}</div>`;
    if(role==='teacher')return `<div class="role-heading"><div><div class="eyebrow">ESPACIO DOCENTE</div><h1>Enseñar deja huella.</h1><p>Planifica tus clases y acompaña el progreso de cada estudiante.</p></div>${btn('+ Crear actividad',"Roles.tab('work')",'primary')}</div>`+
      this.welcome('TU AULA, A TU MANERA','Cada estudiante tiene su propio ritmo.','Crea actividades, compártelas con tu aula y descubre dónde necesitan tu apoyo.','Ir a mis actividades →',"Roles.tab('work')",'✎')+
      this.section('Resumen de tu aula','Información actualizada con cada actividad.')+
      this.stats([['Estudiantes',S().students.length,'En la comunidad','♙'],['Cursos',S().courses.length,'Espacios de aprendizaje','▤'],['Actividades',S().activities.length,'Creadas para el aula','✎'],['Por atender',pending.length,'Alertas educativas','♧']])+
      `<div class="role-columns">${card('¿Qué quieres hacer hoy?','Accesos para preparar y acompañar tu clase.',`<div class="role-action-grid">${this.action('✎','Crear actividad','Diseña y asigna ejercicios.',"Roles.tab('work')")}${this.action('▥','Ver progreso','Consulta resultados y avances.',"Roles.tab('reports')")}${this.action('♧','Revisar alertas','Acompaña a quien lo necesita.',"Roles.tab('alerts')")}</div>`)}${card('Para acompañar de cerca',`${pending.length} alertas pendientes.`,this.alertPreview(pending))}</div>`;
    const s=student(S().selectedStudent),assigned=S().activities.filter(a=>a.assigned.includes(s?.id)),mine=resultsFor(s?.id),completed=assigned.filter(a=>mine.some(r=>r.activity===a.id)),first=assigned.find(a=>!mine.some(r=>r.activity===a.id))||assigned[0];
    return `<div class="role-heading"><div><div class="eyebrow">MI ESPACIO DE APRENDIZAJE</div><h1>¡Hola${s?', '+esc(s.name.split(' ')[0]):''}!</h1><p>Hoy es un gran día para descubrir algo nuevo.</p></div>${btn('Cambiar estudiante',"Roles.tab('activities')")}</div>`+
      this.welcome('APRENDER ES UNA AVENTURA','Cada paso te lleva más lejos.','Practica a tu ritmo, descubre lo que ya sabes y celebra todo lo que vas aprendiendo.',first?'Continuar aprendiendo →':'Ver mis actividades →',first?`Roles.start(${first.id})`:"Roles.tab('activities')",'✦')+
      this.section('Así va tu aprendizaje',s?`${gradeLabel(s.grade)} grado · sección ${esc(s.section)}`:'Selecciona un perfil para comenzar.')+
      this.stats([['Asignadas',assigned.length,'Actividades para ti','▤'],['Completadas',completed.length,'¡Buen trabajo!','✓'],['Pendientes',assigned.length-completed.length,'A tu propio ritmo','◷'],['Mi promedio',`${scoreFor(s?.id)}%`,`${mine.length} evaluaciones`,'✧']])+
      `<div class="role-columns">${card('Mis próximas actividades','Cada actividad es una nueva oportunidad para aprender.',this.activityPreview(assigned,mine))}${card('Tu camino de aprendizaje','Un pequeño resumen de tu progreso.',progress('Actividades completadas',assigned.length?Math.round(completed.length/assigned.length*100):0)+`<div class="role-quick-help"><div><b>¿Necesitas una mano?</b><p>Recibe una pista sobre tu ejercicio actual.</p></div>${btn('Pedir ayuda',"Roles.tab('help')",'small primary')}</div>`+`<div class="form-actions">${btn('Ver mi progreso',"Roles.tab('reports')",'small')}</div>`)}</div>`;
  },
  recent(){const events=S().events.filter(e=>e.module!=='Navegación').slice(0,3);return events.length?`<div class="role-list">${events.map(e=>`<div class="role-list-row"><span class="role-stat-icon">✦</span><div><b>${esc(e.action)}</b><small>${esc(e.module)} · ${esc(e.result)}</small></div></div>`).join('')}</div>`:'<div class="role-empty">Aquí verás los movimientos de tu comunidad.</div>'},
  alertPreview(alerts){return alerts.length?`<div class="role-list">${alerts.slice(0,3).map(a=>`<div class="role-list-row"><span class="role-stat-icon">!</span><div><b>${esc(student(a.student)?.name||'Estudiante')}</b><small>${esc(a.reason)} · ${esc(a.area)}</small></div><span class="badge ${a.priority==='Alta'?'red':'warn'}">${esc(a.priority)}</span></div>`).join('')}</div><div class="form-actions">${btn('Ver alertas',"Roles.tab('alerts')",'small')}</div>`:'<div class="role-empty">¡Todo al día! No hay alertas pendientes.</div>'},
  activityPreview(activities,results){return activities.length?`<div class="role-list">${activities.slice(0,4).map(a=>{const done=results.some(r=>r.activity===a.id);return `<div class="role-list-row"><span class="role-stat-icon">✎</span><div><b>${esc(a.title)}</b><small>${esc(a.area)} · 5 preguntas</small></div>${btn(done?'Repetir':'Empezar',`Roles.start(${a.id})`,'small '+(done?'':'primary'))}</div>`}).join('')}</div><div class="form-actions">${btn('Ver todas mis actividades',"Roles.tab('activities')",'small')}</div>`:'<div class="role-empty">Aún no tienes actividades asignadas.<br>Tu docente podrá compartirlas contigo.</div>'},
  reset(){if(!confirm('¿Reiniciar la demostración y restaurar los datos iniciales?'))return;ML.pause();ML.epoch=0;ML.history=[];Demo.pause();Student.active=null;Student.last=null;Admin.edit=null;Teacher.assignment=null;Store.reset();log('Demostración reiniciada','Sistema','Datos iniciales restaurados');this.open('admin');toast('Demostración reiniciada')}
};

// Asignación visual dentro del espacio docente, sin solicitar identificadores.
Teacher.assignment=null;
Teacher.assign=function(id){if(!S().activities.some(a=>a.id===id))return;this.assignment=id;App.render()};
Teacher.closeAssignment=function(){this.assignment=null;App.render()};
Teacher.confirmAssignment=function(e){e.preventDefault();const activity=S().activities.find(a=>a.id===this.assignment);if(!activity)return;const value=document.getElementById('assignStudent').value;const ids=value==='all'?S().students.map(s=>s.id):[Number(value)].filter(id=>student(id));if(!ids.length){toast('Registra o selecciona un estudiante');return}activity.assigned=[...new Set([...activity.assigned,...ids])];log('Actividad asignada','Docente',`${activity.title} · ${ids.length} estudiante(s)`,'Docente');this.assignment=null;App.render();toast('Actividad asignada correctamente')};
const teacherRoleRender=Teacher.render;
Teacher.render=function(){let html=teacherRoleRender.call(this);if(this.assignment!==null){const a=S().activities.find(x=>x.id===this.assignment);if(a)html+=`<div class="role-modal-backdrop"><section class="role-modal" role="dialog" aria-modal="true" aria-labelledby="assign-title"><div class="role-modal-heading"><div><div class="eyebrow">COMPARTIR ACTIVIDAD</div><h2 id="assign-title">Asignar a estudiantes</h2></div><button type="button" class="role-modal-close" aria-label="Cerrar" onclick="Teacher.closeAssignment()">×</button></div><p>Elige quién recibirá <b>${esc(a.title)}</b>. Los ejercicios se ajustan al grado de cada estudiante.</p><form onsubmit="Teacher.confirmAssignment(event)">${field('Estudiante','assignStudent',select('assignStudent',[['all','Todos los estudiantes'],...studentsOptions()]))}<div class="form-actions">${btn('Cancelar','Teacher.closeAssignment()')}<button class="btn primary">Asignar actividad</button></div></form></section></div>`}return html};

// Los enlaces anteriores abren secciones internas, sin añadir perfiles al menú.
App.go=function(page){if(page==='admin'||page==='teacher'||page==='student')return Roles.open(page);if(page==='tutor')return Roles.open('student','help');if(page==='alerts')return Roles.open('teacher','alerts');if(page==='reports'){Reports.filter='Estudiante';return Roles.open(Roles.current,'reports')}if(page==='dashboard'||page==='events')return Roles.open('admin');return Roles.open(Roles.current)};
App.render=function(){Roles.render()};
App.reset=function(){Roles.reset()};
Roles.render();
