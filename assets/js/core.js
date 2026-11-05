const Store={state:seed(),save(){try{localStorage.setItem('kawsay-sim',JSON.stringify(this.state))}catch(e){}},load(){try{const x=localStorage.getItem('kawsay-sim');if(x)this.state={...seed(),...JSON.parse(x)}}catch(e){}},reset(){this.state=seed();this.save()}};
const S=()=>Store.state;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now()+Math.floor(Math.random()*1000);
const student=id=>S().students.find(x=>x.id==id);
const institution=id=>S().institutions.find(x=>x.id==id);
const average=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;
const resultsFor=id=>S().results.filter(r=>r.student==id);
const scoreFor=id=>average(resultsFor(id).map(r=>r.score));
const gradeLabel=g=>`${g}.°`;
const field=(label,name,content,full=false)=>`<div class="field ${full?'full':''}"><label for="${name}">${label}</label>${content}</div>`;
const input=(name,value='',type='text',extra='')=>`<input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
const select=(name,items,value)=>`<select id="${name}" name="${name}">${items.map(x=>{const [v,l]=Array.isArray(x)?x:[x,x];return `<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`}).join('')}</select>`;
const grades=()=>[1,2,3,4,5,6].map(x=>[x,`${x}.° grado`]);
const studentsOptions=()=>S().students.map(x=>[x.id,`${x.name} · ${gradeLabel(x.grade)}`]);
const card=(title,subtitle,body,action='')=>`<section class="card"><div class="card-head"><div><h2 class="card-title">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div>${action}</div>${body}</section>`;
const head=(eyebrow,title,desc,actions='')=>`<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div><div class="actions">${actions}</div></div>`;
const btn=(text,action,cls='')=>`<button type="button" class="btn ${cls}" onclick="${action}">${text}</button>`;
const progress=(label,n)=>`<div class="metric-line"><div><span>${esc(label)}</span><b>${n}%</b></div><div class="progress"><span style="width:${Math.max(0,Math.min(100,n))}%"></span></div></div>`;
function log(action,module,result,user='Equipo Kawsay'){S().events.unshift({id:uid(),time:new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),user,action,module,result});S().events=S().events.slice(0,150);Store.save()}
function toast(text){const t=document.getElementById('toast');t.textContent=text;t.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('show'),2800)}
function formData(id){return Object.fromEntries(new FormData(document.getElementById(id)).entries())}
function normalize(v){return String(v??'').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.,]$/,'').replace(/\s+/g,' ').replace(',','.')}
function checkAnswer(a,b){return normalize(a)===normalize(b)}
function bankFor(area,grade,count=5,offset=0){const list=BANK.filter(x=>x.area===area&&x.grade==grade);return Array.from({length:Math.min(Number(count),list.length)},(_,i)=>list[(i+offset)%list.length])}
function addAlert(sid,area,reason,priority,recommendation){S().alerts.unshift({id:uid(),student:Number(sid),area,reason,priority,recommendation,attended:false})}
function runRules(sid,area,score,previous,streak=0){let actions=[];if(score<50){actions.push('Dificultad registrada','Refuerzo recomendado','Alerta al docente');addAlert(sid,area,'Bajo rendimiento: '+score+'%','Alta','Acompañar con ejercicios de refuerzo.')}else if(score<80){actions.push('Práctica adicional','Dificultad progresiva')}else{actions.push('Ejercicios de mayor dificultad')};if(streak>=3)actions.push('Tutor activado: divide el problema en pasos','Error recurrente registrado');if(previous!==null&&score>previous){actions.push('Progreso registrado: +'+(score-previous)+' puntos');addAlert(sid,area,'Progreso académico: +'+(score-previous)+' puntos','Baja','Reconocer el avance y continuar la práctica.')}S().automations.unshift({time:new Date().toLocaleTimeString('es-PE'),student:Number(sid),score,actions});log('Reglas ejecutadas','Automatización',actions.join(' · '));return actions}
function recordResult(sid,activity,questions,answers,seconds){const previousResults=resultsFor(sid);const previous=previousResults.length?previousResults[0].score:null;const details=questions.map((q,i)=>({question:q.question,answer:q.answer,given:answers[i]||'',correct:checkAnswer(answers[i],q.answer),explanation:q.explanation,competency:q.competency}));const score=Math.round(details.filter(x=>x.correct).length/details.length*100);let streak=0,maxStreak=0;details.forEach(d=>{streak=d.correct?0:streak+1;maxStreak=Math.max(maxStreak,streak)});const result={id:uid(),student:Number(sid),activity:activity.id,title:activity.title,area:activity.area,grade:student(sid)?.grade||activity.grade,score,details,seconds,date:new Date().toLocaleString('es-PE'),synced:S().online};S().results.unshift(result);if(!S().online){S().queue.push({id:result.id,label:`${student(sid)?.name}: ${activity.title}`,time:new Date().toLocaleTimeString('es-PE'),status:'Pendiente'});log('Respuesta guardada sin conexión','Offline','Pendiente de sincronización',student(sid)?.name)}runRules(sid,activity.area,score,previous,maxStreak);log('Actividad evaluada','Evaluaciones',`${score}% · ${details.filter(x=>x.correct).length}/${details.length} correctas`,student(sid)?.name);Store.save();return result}
