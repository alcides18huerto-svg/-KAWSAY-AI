// Prueba de integración de la lógica local, sin dependencias ni servidor.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const paths = ['assets/js/data.js','assets/js/core.js','modules/admin/admin.js','modules/docente/docente.js','modules/estudiante/estudiante.js','modules/machine-learning/ml.js','modules/adaptacion/adaptacion.js','modules/tutor-ia/tutor.js','modules/automatizacion/automatizacion.js','modules/offline/offline.js','modules/evaluaciones/evaluaciones.js','assets/js/app.js','assets/js/banco-ampliado.js','assets/js/integracion.js'];
const elements = {};
const document = {documentElement:{},body:{classList:{remove(){}}},getElementById(id){return elements[id] ||= {innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},value:''}}};
const context = vm.createContext({document,window:{scrollTo(){}},localStorage:{getItem(){return null},setItem(){}},console,setTimeout,clearTimeout,setInterval,clearInterval,confirm:()=>true,prompt:()=>null});
for (const path of paths) vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
vm.runInContext(`
  if (BANK.length !== 240) throw Error('Banco incompleto');
  for (let g=1;g<=6;g++) for (const a of AREAS) if (bankFor(a,g,10).length!==10) throw Error('Faltan ejercicios');
  if (!checkAnswer(' 4,2 ', '4.2') || checkAnswer('7','8')) throw Error('Comparación incorrecta');
  const q=bankFor('Matemáticas',5,5), a=S().activities[0];
  const result=recordResult(1,a,q,q.map((x,i)=>i<2?x.answer:'incorrecta'),30);
  if(result.score!==40 || !S().alerts.some(x=>x.priority==='Alta')) throw Error('Evaluación o alerta incorrecta');
  S().online=false;
  recordResult(1,a,q,q.map(x=>x.answer),30);
  if(S().queue.length!==1 || S().queue[0].status!=='Pendiente') throw Error('Cola offline incorrecta');
  S().online=true;
  for (const page of ['dashboard','admin','teacher','student','ml','adapt','tutor','automation','alerts','offline','reports','demo','events']) { App.page=page; App.render(); }
  Store.reset(); App.page='demo'; for(let i=0;i<20;i++) Demo.next();
  if(S().demoStep!==20 || S().results.length!==3 || S().queue[0].status!=='Sincronizado') throw Error('Demostración incompleta');
  if(!S().alerts.some(x=>x.reason.includes('Progreso'))) throw Error('Mejora no detectada');
`,context);
assert.ok(elements.app.innerHTML.length>0);
console.log('OK: banco, calificación, alertas, offline, módulos y demostración de 20 pasos');
