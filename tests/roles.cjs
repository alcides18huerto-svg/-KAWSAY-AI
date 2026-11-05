// Verifica la navegación por roles y un recorrido docente-estudiante-administrador.
const fs=require('fs'),vm=require('vm');
const paths=['assets/js/data.js','assets/js/core.js','modules/admin/admin.js','modules/docente/docente.js','modules/estudiante/estudiante.js','modules/machine-learning/ml.js','modules/adaptacion/adaptacion.js','modules/tutor-ia/tutor.js','modules/automatizacion/automatizacion.js','modules/offline/offline.js','modules/evaluaciones/evaluaciones.js','assets/js/app.js','assets/js/banco-ampliado.js','assets/js/integracion.js','assets/js/roles.js'];
const elements={};
const document={documentElement:{},body:{classList:{remove(){},toggle(){}}},getElementById(id){return elements[id]||={id,innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},value:''}}};
class FormDataMock{constructor(el){this.el=el}entries(){return Object.entries(this.el.data||{})}}
const ctx=vm.createContext({document,FormData:FormDataMock,window:{scrollTo(){}},localStorage:{getItem(){return null},setItem(){}},console,setTimeout(fn){fn();return 1},clearTimeout(){},setInterval,clearInterval,confirm:()=>true,prompt:()=>null});
for(const path of paths)vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
vm.runInContext(`
function ensure(ok,message){if(!ok)throw Error(message)}
let nav=document.getElementById('nav').innerHTML;
ensure((nav.match(/<button/g)||[]).length===3,'El menú debe tener exactamente tres perfiles');
for(const label of ['Administrador','Docente','Estudiante'])ensure(nav.includes(label),'Falta perfil '+label);
for(const label of ['Motor de ML','Automatizaciones','Modo offline','Demostración integral'])ensure(!nav.includes(label),'Se muestra un módulo técnico');
ensure(document.getElementById('app').innerHTML.includes('Tu comunidad en cifras'),'Inicio administrador');
Roles.manage('students');ensure(Roles.view==='manage'&&Admin.tab==='students'&&document.getElementById('app').innerHTML.includes('Nuevo registro'),'Gestión de estudiantes');
Roles.open('teacher');ensure(document.getElementById('app').innerHTML.includes('Resumen de tu aula'),'Inicio docente');
Roles.tab('work');ensure(document.getElementById('app').innerHTML.includes('Constructor de actividades'),'Constructor docente');
Teacher.assign(1);ensure(document.getElementById('app').innerHTML.includes('Asignar a estudiantes'),'Selector de asignación');
document.getElementById('assignStudent').value='all';Teacher.confirmAssignment({preventDefault(){}});ensure(S().activities[0].assigned.length===S().students.length,'Asignación visual');
Roles.open('student');ensure(document.getElementById('app').innerHTML.includes('Mis próximas actividades'),'Inicio estudiante');
Roles.start(1);ensure(Roles.view==='activities'&&S().learningDraft.items.length===5,'Inicio de actividad');
document.getElementById('singleQuiz').data={answer:'respuesta equivocada'};Student.checkQuestion({preventDefault(){}});
ensure(document.getElementById('app').innerHTML.includes('Revisemos juntos'),'Corrección visible');
App.go('tutor');ensure(Roles.current==='student'&&Roles.view==='help','Ayuda en perfil estudiante');
Tutor.ask('mi error');ensure(document.getElementById('app').innerHTML.includes(S().learningDraft.items[0].question),'Tutor contextual');
Roles.tab('activities');ensure(document.getElementById('app').innerHTML.includes('Revisemos juntos'),'Regreso al ejercicio');
Student.nextQuestion();
for(let i=1;i<5;i++){document.getElementById('singleQuiz').data={answer:S().learningDraft.items[i].answer};Student.checkQuestion({preventDefault(){}});Student.nextQuestion()}
ensure(S().results[0].score===80&&document.getElementById('app').innerHTML.includes('Última evaluación'),'Evaluación final');
Roles.tab('reports');ensure(document.getElementById('app').innerHTML.includes('80%'),'Progreso estudiante');
Roles.open('teacher');Roles.tab('reports');ensure(document.getElementById('app').innerHTML.includes('80%'),'Seguimiento docente');
Roles.open('admin');ensure(document.getElementById('app').innerHTML.includes('80%'),'Resumen administrador');
`,ctx);
console.log('OK: tres perfiles, gestión, actividad, ayuda y resultados compartidos');
