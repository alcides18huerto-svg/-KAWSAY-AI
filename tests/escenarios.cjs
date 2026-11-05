// Escenarios A–G con estado compartido y formularios simulados, sin dependencias.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const paths=['assets/js/data.js','assets/js/core.js','modules/admin/admin.js','modules/docente/docente.js','modules/estudiante/estudiante.js','modules/machine-learning/ml.js','modules/adaptacion/adaptacion.js','modules/tutor-ia/tutor.js','modules/automatizacion/automatizacion.js','modules/offline/offline.js','modules/evaluaciones/evaluaciones.js','assets/js/app.js','assets/js/banco-ampliado.js','assets/js/integracion.js'];
const elements={};
const document={documentElement:{},body:{classList:{remove(){}}},getElementById(id){return elements[id]||=( {id,innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},value:''} )}};
class FormDataMock{constructor(el){this.el=el}entries(){return Object.entries(this.el.data||{})}}
const ctx=vm.createContext({document,FormData:FormDataMock,window:{scrollTo(){}},localStorage:{getItem(){return null},setItem(){}},console,setTimeout(fn){fn();return 1},clearTimeout(){},setInterval,clearInterval,confirm:()=>true,prompt:()=>null});
for(const path of paths)vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const run=code=>vm.runInContext(code,ctx);
run(`
function ensure(condition,message){if(!condition)throw Error(message)}
function resetTest(){Store.reset();Student.active=null;Student.last=null;ML.sourceResult=null;App.page='student'}
function answerSet(correctness){
 Student.start(1);const d=S().learningDraft;
 for(let i=0;i<5;i++){
   const q=d.items[i];document.getElementById('singleQuiz').data={answer:correctness[i]?q.answer:'respuesta equivocada'};
   Student.checkQuestion({preventDefault(){}});ensure(d.checked[i].correct===correctness[i],'Corrección individual');
   ensure(S().liveAnalysis.answered===i+1&&ML.values.correct===d.checked.filter(x=>x&&x.correct).length,'Datos parciales compartidos');
   ensure(Admin.render().includes('Actividad en curso'),'Seguimiento parcial de administrador');
   if(i===2&&!correctness[0]&&!correctness[1]&&!correctness[2])ensure(S().tutorActivation?.student===1,'Tutor no activado');
   Student.nextQuestion();
 }
 return S().results[0];
}
// A: todas correctas; los demás módulos consumen la misma evaluación.
resetTest();let r=answerSet([true,true,true,true,true]);
ensure(r.score===100,'A: calificación');ensure(S().learningAnalysis.score===100,'A: análisis');
ensure(ML.values.correct===5&&ML.values.incorrect===0,'A: entrada ML');
ensure(S().automations[0].actions.includes('Ejercicios de mayor dificultad'),'A: regla');
ensure(Student.render().includes('100%')&&Reports.render().includes('100%'),'A: progreso y reporte');
// B: mayoría incorrecta, alerta identificada y visible para docente.
resetTest();r=answerSet([false,false,true,false,false]);
ensure(r.score===20,'B: calificación');ensure(S().alerts.some(a=>a.priority==='Alta'&&a.origin.includes('Operaciones')),'B: alerta y origen');
ensure(Teacher.render().includes('Bajo rendimiento'),'B: panel docente');
ensure(Tutor.answer('mi error').includes(r.details.find(d=>!d.correct).question),'B: tutor contextual');
// C: tres errores consecutivos durante la evaluación, antes de terminar.
resetTest();r=answerSet([false,false,false,true,true]);
ensure(S().tutorActivation.reason==='Tres errores consecutivos','C: activación');
ensure(S().automations[0].actions.some(a=>a.includes('Tutor activado')),'C: regla final');
// D: ayuda contextual y mejora en el segundo intento.
const help=Tutor.answer('paso a paso');ensure(help.includes(r.details.find(d=>!d.correct).question),'D: ayuda sobre el error');
let previous=r.score;r=answerSet([true,true,true,true,false]);
ensure(r.score>previous&&S().alerts.some(a=>a.reason.includes('Progreso')),'D: mejora');
// E: asignación de una actividad de quinto a estudiantes de los seis grados.
resetTest();const activity=S().activities[0];prompt=()=> 'TODOS';Teacher.assign(activity.id);
ensure(activity.assigned.length===S().students.length,'E: asignación docente');
const adaptations=S().students.map(s=>Learning.select(activity,s,35));
ensure(adaptations.every((a,i)=>a.questions.length===5&&a.questions.every(q=>q.grade===S().students[i].grade)),'E: adaptación curricular');
for(const s of S().students){S().selectedStudent=s.id;Student.start(activity.id);ensure(S().learningDraft.items.every(q=>q.grade===s.grade),'E: actividad entregada por grado');ensure(Student.exercise().includes('Original:'),'E: comparación visible')}
const low=Learning.select(activity,student(1),35),high=Learning.select(activity,student(1),90);
ensure(low.level!==high.level&&low.questions[0].id!==high.questions[0].id,'E: adaptación individual');
// F: respuestas offline, cola, recuperación y sincronización.
resetTest();S().online=false;r=answerSet([true,true,false,true,true]);
ensure(!r.synced&&S().queue.length===1&&S().queue[0].status==='Pendiente','F: cola offline');
ensure(Student.render().includes('Operaciones en la chacra'),'F: actividad disponible offline');
Offline.toggle();ensure(S().online&&r.synced&&S().queue[0].status==='Sincronizado','F: sincronización');
// G: las estadísticas administrativas y el reporte reflejan el resultado.
Admin.tab='institutions';ensure(Admin.render().includes('80% promedio'),'G: estadísticas administrador');
ensure(Reports.render().includes('80%'),'G: reporte');
ensure(BANK.every(q=>q.question&&q.answer&&q.explanation&&q.feedback&&q.competency&&q.grade&&q.difficulty),'Metadatos del banco');
for(let g=1;g<=6;g++)for(const area of AREAS)ensure(bankFor(area,g,10).length===10,'Banco incompleto');
`);
assert.ok(elements.app.innerHTML);console.log('OK escenarios A–G: evaluación, tutor, adaptación, automatización, ML, offline y administración');
