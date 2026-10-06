const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS=['dom','lun','mar','mié','jue','vie','sáb'];
const DIAS_L=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const ESTADOS_POST=[['pendiente','Pendiente'],['editando','Editando'],['listo','Listo'],['publicado','Publicado']];
const RED_TXT={ig:'IG',fb:'FB',tt:'TikTok'};
const RUBROS=[['influencer','Influencer'],['ugc','Creador UGC'],['comercio','Comercio / distribuidor'],['proveedor','Proveedor'],['nahuel','Equipo de Nahuel'],['medio','Medio / prensa'],['otro','Otro']];
const IDEA_EST=[['nueva','Nueva'],['elegida','Elegida'],['usada','Usada'],['descartada','Descartada']];
const COMPETIDORES=[['rei-verde','Rei Verde'],['barao','Barão'],['verdecita','Verdecita'],['canarias','Canarias'],['sara','Sara'],['uruguai','Uruguaí']];
const UGC_EST=[['pedido','Pedido'],['recibido','Recibido'],['publicado','Publicado']];

const S={regs:[],meta:{frentes:[],marcas:{},calendario:{},redes:{},ejes:{},ugcMes:[],cuentasRed:[],cuentasCompetencia:[],estadosContacto:{}},ia:false,open:{},armed:null,vista:'hoy',doc:null,editDoc:false,filtroRubro:'todos',filtroIdea:'abiertas',chat:[],busy:{},compSel:'rei-verde',metSel:'ig-latina',mesAds:null,rol:null,calVista:'semana'};
try{const t=localStorage.getItem('gn-vista');if(t)S.vista=t;const c=localStorage.getItem('gn-cal');if(c)S.calVista=c}catch(e){}

/* fechas: el navegador está en hora argentina */
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const [y,m,d]=String(s).slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const hoyISO=()=>iso(new Date());
function lunes(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
function semanaInicial(){const h=new Date();const l=lunes(h);if(h.getDay()===0||h.getDay()===6)l.setDate(l.getDate()+7);return l}
let semana=semanaInicial();
let mesCal=(()=>{const d=addDays(semana,2);return new Date(d.getFullYear(),d.getMonth(),1)})();
function lblSemana(l){const f=addDays(l,4);return `${l.getDate()}${l.getMonth()!==f.getMonth()?' de '+MESES[l.getMonth()]:''} al ${f.getDate()} de ${MESES[f.getMonth()]}`}
function corta(s){if(!s)return'';const d=String(s).length<=10?parse(s):new Date(s);return `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`}
const fmt=n=>(Number(n)||0).toLocaleString('es-AR');
const pesos=n=>'$'+Math.round(Number(n)||0).toLocaleString('es-AR');
const nmb=v=>Number(String(v??'').replace(/\./g,'').replace(',','.'))||0;

/* api */
async function api(method,path,body){
  const r=await fetch(path,{method,headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});
  const d=await r.json().catch(()=>({}));
  if(r.status===401&&d.login){S.logueado=false;render();throw new Error('Sesión vencida')}
  if(!r.ok)throw Object.assign(new Error(d.error||`Error ${r.status}`),{status:r.status,datos:d});
  return d;
}
function status(t){document.querySelectorAll('.status').forEach(el=>el.textContent=t)}
const hora=()=>new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
const NOMBRE={lautaro:'Lautaro',franco:'Franco'};
const SEGUIDOS=['posteo','evento','idea','paso'];
function queEs(r){return r.tipo==='posteo'?`la publicación del ${corta(r.fecha||r.clave)}`:r.tipo==='evento'?`el evento «${r.titulo}»`:r.tipo==='idea'?`la idea «${r.titulo}»`:r.tipo==='paso'?`la tarea «${r.texto}»`:'un registro'}
async function cargar(){
  const d=await api('GET','/api/datos');
  if(S.rol&&S.rol!==d.rol)$('app').innerHTML='';
  // Lo que cambió la otra persona desde la última lectura.
  if(S.logueado&&S.rol===d.rol){
    const vistos=new Map(S.regs.filter(r=>SEGUIDOS.includes(r.tipo)&&!String(r.id).startsWith('tmp-')).map(r=>[r.id,r]));
    const nuevos=d.registros.filter(r=>SEGUIDOS.includes(r.tipo));
    const msgs=[];
    for(const r of nuevos){const v=vistos.get(r.id);if(r.editadoPor&&r.editadoPor!==d.rol&&(!v||v.actualizado!==r.actualizado)){const quien=NOMBRE[r.editadoPor]||r.editadoPor;
      msgs.push(r.tipo==='paso'&&r.hecho&&v&&!v.hecho?`${quien} terminó ${queEs(r)}`:r.tipo==='paso'&&!v&&r.quien===d.rol?`${quien} te asignó ${queEs(r)}`:`${quien} ${v?'cambió':'cargó'} ${queEs(r)}`)}}
    const ids=new Set(nuevos.map(r=>r.id));
    for(const v of vistos.values())if(!ids.has(v.id)&&(v.tipo==='evento'||v.tipo==='paso'))msgs.push(`Se borró ${queEs(v)}`);
    if(msgs.length)aviso('info',msgs.slice(0,3).join(' · ')+(msgs.length>3?` y ${msgs.length-3} cambios más`:''));
  }
  Object.assign(S,{regs:d.registros,meta:d.meta,ia:d.ia,rol:d.rol,logueado:true});
  render();status('Actualizado '+hora());
}
const de=t=>S.regs.filter(r=>r.tipo===t);
const buscar=id=>S.regs.find(r=>r.id===id);

/* avisos abajo: cada cambio dice si la base lo confirmó o no */
// Abajo a la derecha. Entran deslizando desde la derecha, los que se cierran
// solos muestran una barrita de tiempo (se pausa con el mouse encima) y al
// salir se pliegan para que el resto baje suave. Máximo 4 a la vista.
let avisoN=0;
const ICO_AV={ok:'✓',error:'!',conflicto:'!',info:'↻'};
const DURA={ok:3500,info:9000};
function cerrarAviso(w){if(!w||!w.isConnected||w.classList.contains('sale'))return;w.classList.add('sale');setTimeout(()=>w.remove(),280)}
function temporizar(w,tipo){
  const a=w.querySelector('.aviso');a.querySelector('.aviso-b')?.remove();clearTimeout(w._t);
  if(!DURA[tipo])return;
  const b=document.createElement('span');b.className='aviso-b';b.style.animationDuration=DURA[tipo]+'ms';a.appendChild(b);
  b.addEventListener('animationend',()=>cerrarAviso(w));
}
function aviso(tipo,texto){
  const box=$('avisos');if(!box)return;
  const w=document.createElement('div');w.className='aviso-w';w.id='av'+(++avisoN);
  w.innerHTML=`<div><div class="aviso ${tipo}" role="${tipo==='error'||tipo==='conflicto'?'alert':'status'}"><span class="aviso-i">${tipo==='guardando'?'<span class="spin"></span>':ICO_AV[tipo]}</span><span class="aviso-t">${esc(texto)}</span><button class="aviso-x" aria-label="Cerrar">×</button></div></div>`;
  box.appendChild(w);
  const vivos=[...box.children].filter(x=>!x.classList.contains('sale'));
  vivos.slice(0,Math.max(0,vivos.length-4)).forEach(cerrarAviso);
  temporizar(w,tipo);
  return w;
}
function resolverAviso(w,tipo,texto){
  if(!w||!w.isConnected||w.classList.contains('sale')){aviso(tipo,texto);return}
  const a=w.querySelector('.aviso');a.className='aviso '+tipo;a.setAttribute('role',tipo==='ok'||tipo==='info'?'status':'alert');
  const i=a.querySelector('.aviso-i');i.textContent=ICO_AV[tipo];i.classList.remove('pop');void i.offsetWidth;i.classList.add('pop');
  a.querySelector('.aviso-t').textContent=texto;
  temporizar(w,tipo);
}
// La respuesta es la fila que devolvió la base (RETURNING): se compara campo por campo con lo que se mandó.
const coincide=(fila,datos)=>fila&&Object.entries(datos).every(([k,v])=>JSON.stringify(fila[k]??null)===JSON.stringify(v??null));
function fallaGuardado(el,e,verbo='se guardó'){
  if(e.status===401)return resolverAviso(el,'error','Se venció la sesión: volvé a entrar con tu PIN.');
  if(e.status===404){resolverAviso(el,'info',e.message);cargar().catch(()=>{});return}
  resolverAviso(el,'error',`No ${verbo}: ${e.message}. Recargué los datos de la base.`);cargar().catch(()=>{});
}
// silencioso: sin aviso si sale bien (para cargas en tanda, como una plantilla); si falla, avisa igual.
async function nuevo(tipo,datos,{silencioso=false}={}){
  status('Guardando…');const el=silencioso?null:aviso('guardando','Guardando…');
  try{const r=await api('POST','/api/datos',{tipo,datos});
    if(!r.id||!coincide(r,datos))throw new Error('la base no devolvió lo que mandaste');
    S.regs.push(r);render();status('Guardado '+hora());if(!silencioso)resolverAviso(el,'ok','Guardado en la base · '+hora());return r}
  catch(e){status('No se guardó: '+e.message);fallaGuardado(el,e)}
}
// `antes`: cómo veía la persona los campos que cambió. Si otro los tocó en el
// medio, el servidor no pisa nada y devuelve 409 con lo que hay en la base.
async function porClave(tipo,clave,datos,antes){
  const prev=S.regs.find(r=>r.tipo===tipo&&r.clave===clave);
  if(prev)Object.assign(prev,datos);else S.regs.push({tipo,clave,...datos,id:'tmp-'+tipo+clave});
  render();status('Guardando…');const el=aviso('guardando','Guardando…');
  try{const r=await api('POST','/api/datos',{tipo,clave,datos,antes});
    if(!coincide(r,datos))throw new Error('la base no devolvió lo que mandaste');
    S.regs=S.regs.filter(x=>!(x.tipo===tipo&&x.clave===clave));S.regs.push(r);status('Guardado '+hora());resolverAviso(el,'ok','Guardado en la base · '+hora())}
  catch(e){
    if(e.status===409){const act=e.datos?.actual;S.regs=S.regs.filter(x=>!(x.tipo===tipo&&x.clave===clave));if(act)S.regs.push(act);render(true);status('No se guardó: conflicto');
      resolverAviso(el,'conflicto',`${NOMBRE[act?.editadoPor]||'Otra persona'} cambió ${act?queEs(act):'esto'} mientras lo editabas. No pisé nada: quedó su versión, revisala y volvé a cargar lo tuyo si hace falta.`);return}
    status('No se guardó: '+e.message);fallaGuardado(el,e)}
}
async function cambiar(id,cambios){
  const r=buscar(id);if(r)Object.assign(r,cambios);render();status('Guardando…');const el=aviso('guardando','Guardando…');
  try{const f=await api('PATCH','/api/datos',{id,cambios});if(!coincide(f,cambios))throw new Error('la base no devolvió lo que mandaste');
    if(r)Object.assign(r,f);status('Guardado '+hora());resolverAviso(el,'ok','Guardado en la base · '+hora())}
  catch(e){status('No se guardó: '+e.message);fallaGuardado(el,e)}
}
async function quitar(id){
  S.regs=S.regs.filter(r=>r.id!==id);render();const el=aviso('guardando','Borrando…');
  try{await api('DELETE','/api/datos',{id});status('Borrado '+hora());resolverAviso(el,'ok',S.rol==='lautaro'?'Borrado. Se puede recuperar desde Historial.':'Borrado · '+hora())}
  catch(e){status('No se borró: '+e.message);fallaGuardado(el,e,'se borró')}
}
// Lo que la persona veía en la base (no los valores por defecto del calendario).
function vistoAntes(tipo,clave,campos){const r=S.regs.find(x=>x.tipo===tipo&&x.clave===clave)||{};return Object.fromEntries(campos.map(k=>[k,r[k]??null]))}
function armar(id){
  if(S.armed!==id){S.armed=id;render();setTimeout(()=>{if(S.armed===id){S.armed=null;render()}},3000);return false}
  S.armed=null;return true;
}
const delBtn=id=>`<button class="chip del ${S.armed===id?'armed':''}" data-del="${id}" aria-label="Borrar">${S.armed===id?'¿Borrar?':'×'}</button>`;
const marcaChip=m=>`<span class="marca ${m||'ambas'}">${esc(S.meta.marcas[m]||(m==='ambas'?'Las dos':m))}</span>`;
const frenteNombre=id=>S.meta.frentes.find(f=>f.id===id)?.nombre||id;

/* posteos */
function posteo(fecha){
  const p=S.regs.find(r=>r.tipo==='posteo'&&r.clave===fecha);
  const base=S.meta.calendario[parse(fecha).getDay()];
  if(!base)return p||null;
  return {marca:base.marca,aCargo:base.aCargo,estado:'pendiente',redes:{},...(p||{}),fecha};
}
const TIPO_F={feriado:'Feriado',puente:'Puente',comercial:'Fecha comercial',evento:'Evento'};
const fechasDe=f=>(S.meta.fechas||[]).filter(x=>x.fecha===f);
const fchChips=f=>{const l=fechasDe(f);return l.length?`<div class="fchs">${l.map(x=>`<span class="fch ${x.tipo}" title="${esc(TIPO_F[x.tipo])}">${esc(x.titulo)}</span>`).join('')}</div>`:''};
function faltan(f){const n=Math.round((parse(f)-parse(hoyISO()))/864e5);return n===0?'hoy':n===1?'mañana':n<0?'pasó':`en ${n} días`}
function listaFechas(dias,{borrar=false}={}){const hoy=hoyISO(),lim=iso(addDays(new Date(),dias));const l=(S.meta.fechas||[]).filter(x=>x.fecha>=hoy&&x.fecha<=lim);
  return l.length?`<ul class="flist">${l.map(x=>`<li><span><span class="fd">${corta(x.fecha)}</span><br><span class="fq">${faltan(x.fecha)}</span></span><span><span class="fch ${x.tipo}">${esc(TIPO_F[x.tipo])}</span> ${x.id?`<button class="evlink" data-ev="${x.id}">${esc(x.titulo)}</button>`:`<b style="font-size:13.5px">${esc(x.titulo)}</b>`}${x.lugar||x.marca&&x.marca!=='ambas'?`<br><span class="fq">${[x.marca&&S.meta.marcas[x.marca],x.lugar].filter(Boolean).map(esc).join(' · ')}</span>`:''}</span>${borrar&&x.id?delBtn(x.id):'<span></span>'}</li>`).join('')}</ul>`:'<p class="empty">Nada en este período.</p>'}
const diasSemana=l=>[0,1,2,3,4].map(i=>iso(addDays(l,i)));

/* ===== gráficos (SVG a mano, una serie, tooltip propio) ===== */
function sparkline(vals){
  if(vals.length<2)return `<svg class="spark" viewBox="0 0 120 36" aria-hidden="true"><line x1="0" y1="30" x2="120" y2="30" stroke="#E3E9E3"/></svg>`;
  const mn=Math.min(...vals),mx=Math.max(...vals),r=mx-mn||1;
  const pts=vals.map((v,i)=>[i/(vals.length-1)*116+2,32-((v-mn)/r)*26]);
  const d=pts.map(p=>p.join(',')).join(' ');const last=pts[pts.length-1];
  return `<svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true"><polygon class="ar" points="2,34 ${d} ${last[0]},34"/><polyline class="ln" points="${d}" vector-effect="non-scaling-stroke"/><circle class="pt" cx="${last[0]}" cy="${last[1]}" r="2.5"/></svg>`;
}
function niceTicks(mn,mx,n=4){const span=mx-mn||Math.max(1,Math.abs(mx));const step0=span/n;const mag=10**Math.floor(Math.log10(step0));const step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=step0);const a=Math.floor(mn/step)*step,b=Math.ceil(mx/step)*step;const t=[];for(let v=a;v<=b+1e-9;v+=step)t.push(v);return t}
const corto=n=>Math.abs(n)>=1000?(n/1000).toLocaleString('es-AR',{maximumFractionDigits:1})+' mil':fmt(n);
function lineChart(puntos,{alto=220,etiqueta='seguidores'}={}){
  if(puntos.length<2)return `<p class="empty">Hacen falta al menos dos cargas para dibujar la evolución.</p>`;
  const W=1000,H=alto*1.3,L=64,R=16,T=14,B=28;
  const ys=puntos.map(p=>p.y);const ticks=niceTicks(Math.min(...ys),Math.max(...ys));
  const y0=ticks[0],y1=ticks[ticks.length-1];
  const t0=parse(puntos[0].x).getTime(),t1=parse(puntos[puntos.length-1].x).getTime();
  const X=x=>L+((parse(x).getTime()-t0)/((t1-t0)||1))*(W-L-R);
  const Y=y=>T+(1-(y-y0)/((y1-y0)||1))*(H-T-B);
  const d=puntos.map(p=>`${X(p.x)},${Y(p.y)}`).join(' ');
  const xl=[puntos[0],puntos[Math.floor(puntos.length/2)],puntos[puntos.length-1]].filter((p,i,a)=>a.indexOf(p)===i);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de ${etiqueta}">
    ${ticks.map(t=>`<line class="grid" x1="${L}" x2="${W-R}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L-8}" y="${Y(t)+4}" text-anchor="end">${corto(t)}</text>`).join('')}
    ${xl.map(p=>`<text x="${X(p.x)}" y="${H-8}" text-anchor="middle">${corta(p.x)}</text>`).join('')}
    <polygon class="ar" points="${X(puntos[0].x)},${Y(y0)} ${d} ${X(puntos[puntos.length-1].x)},${Y(y0)}"/>
    <polyline class="ln" points="${d}"/>
    ${puntos.map(p=>`<circle class="pt" cx="${X(p.x)}" cy="${Y(p.y)}" r="4"/><circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="14" data-tip="${esc(corta(p.x)+'\n'+fmt(p.y)+' '+etiqueta)}"/>`).join('')}
  </svg>`;
}
function hBars(items,{fmtV=fmt}={}){
  if(!items.length)return '<p class="empty">Sin datos todavía.</p>';
  const W=1000,rowH=34,L=130,R=90,H=items.length*rowH+6;const mx=Math.max(...items.map(i=>i.v))||1;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Comparación">
    ${items.map((it,k)=>{const y=k*rowH+6,w=Math.max(4,(it.v/mx)*(W-L-R));return `<text x="${L-10}" y="${y+17}" text-anchor="end" style="${it.own?'fill:#142019;font-weight:700':''}">${esc(it.label)}</text>
      <path class="${it.own?'bar-own':'bar-oth'}" d="M${L},${y+4} h${w-4} a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 h-${w-4} z"/>
      <text class="vl" x="${L+w+8}" y="${y+17}">${it.v?fmtV(it.v):'sin dato'}</text>
      <rect class="hit" x="0" y="${y}" width="${W}" height="${rowH}" data-tip="${esc(it.tip||it.label+': '+fmtV(it.v))}"/>`}).join('')}
  </svg>`;
}
function vBars(items,{alto=200,fmtV=fmt}={}){
  if(!items.length)return '<p class="empty">Todavía no hay campañas cargadas.</p>';
  const W=1000,H=alto*1.3,L=44,R=10,T=18,B=30;const mx=Math.max(...items.map(i=>i.v),1);const ticks=niceTicks(0,mx,3);const top=ticks[ticks.length-1];
  const bw=Math.min(56,(W-L-R)/items.length-14);const step=(W-L-R)/items.length;
  const Y=v=>T+(1-v/top)*(H-T-B);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Consultas por campaña">
    ${ticks.map(t=>`<line class="grid" x1="${L}" x2="${W-R}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L-8}" y="${Y(t)+4}" text-anchor="end">${fmtV(t)}</text>`).join('')}
    ${items.map((it,k)=>{const x=L+k*step+(step-bw)/2,y=Y(it.v),h=Math.max(0,Y(0)-y);return `${h>0?`<path class="bar-own" d="M${x},${Y(0)} v-${Math.max(h-4,0)} a4,4 0 0 1 4,-4 h${bw-8} a4,4 0 0 1 4,4 v${Math.max(h-4,0)} z"/>`:''}
      <text class="vl" x="${x+bw/2}" y="${y-6}" text-anchor="middle">${fmtV(it.v)}</text>
      <text x="${x+bw/2}" y="${H-10}" text-anchor="middle">${esc(it.label)}</text>
      <rect class="hit" x="${L+k*step}" y="${T}" width="${step}" height="${H-T-B}" data-tip="${esc(it.tip)}"/>`}).join('')}
  </svg>`;
}
document.addEventListener('mousemove',e=>{const t=e.target.closest?.('[data-tip]');const tip=$('tip');if(!t){tip.hidden=true;return}tip.textContent=t.dataset.tip;tip.hidden=false;const x=Math.min(e.clientX+14,innerWidth-tip.offsetWidth-8);tip.style.left=x+'px';tip.style.top=(e.clientY+14)+'px'});

/* ===== render ===== */
const ICO={
  hoy:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  semana:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 13h3M8 17h8M15 13h1"/>',
  historial:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tareas:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  ads:'<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  metricas:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  ideas:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  competencia:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  saber:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  preguntar:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  bandeja:'<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  contactos:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
};
const GRUPOS_LAUTARO=[['Operación',[['hoy','Hoy'],['semana','Semana'],['calendario','Calendario'],['tareas','Tareas'],['ads','Meta Ads'],['metricas','Métricas']]],['Estrategia',[['ideas','Ideas'],['competencia','Competencia'],['saber','Saber'],['preguntar','Preguntar']]],['Registro',[['bandeja','Bandeja'],['contactos','Contactos'],['historial','Historial']]]];
// Franco ve sólo publicaciones y calendario; el servidor tampoco le manda el resto.
const GRUPOS_FRANCO=[['Publicaciones',[['semana','Semana'],['calendario','Calendario'],['ideas','Ideas']]]];
const grupos=()=>S.rol==='franco'?GRUPOS_FRANCO:GRUPOS_LAUTARO;
const vistaPermitida=v=>grupos().some(g=>g[1].some(([k])=>k===v));
const yo=()=>S.rol==='franco'?'Franco':'Lautaro';
function badges(){
  const mias=misPasos();
  return {semana:[mias.length,mias.some(p=>p.fecha<hoyISO())],bandeja:[de('nota').filter(n=>!n.archivada).length,true],ideas:[de('idea').filter(i=>i.estado==='nueva').length],tareas:[de('tarea').filter(t=>t.estado!=='hecho'&&!t.deNahuel).length]};
}
function navHTML(){
  const b=badges();
  return grupos().map(([g,items])=>`<div class="navgrp"><div class="gl">${g}</div>${items.map(([k,t])=>`<button class="nav" data-vista="${k}" ${S.vista===k?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>${t}${b[k]&&b[k][0]?`<span class="bd ${b[k][1]?'alert':''}">${b[k][0]}</span>`:''}</button>`).join('')}</div>`).join('');
}
const ICO_SALIR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/></svg>';
function usuarioHTML(){return `<div class="usr"><span class="av" aria-hidden="true">${yo()[0]}</span><span class="usr-t"><b>${yo()}</b><span>${S.rol==='franco'?'Publicaciones e ideas':'Acceso completo'}</span></span><button class="btn sm" id="salir">${ICO_SALIR}Salir</button></div>`}
function shell(){return `<div class="app">
  <aside class="side"><div class="brand"><div class="logos"><img src="/img/logo-latina.png" alt="LaTiNa"><img src="/img/logo-centenaria.png" alt="Centenaria"></div><b>Redes Latina <span>|</span> Centenaria</b></div>
    <nav id="nav-side" aria-label="Secciones"></nav>
    <div class="side-foot">${S.rol==='lautaro'?'<button class="btn primary" id="exportar">Reporte para Nahuel (PDF)</button>':''}</div></aside>
  <div style="min-width:0">
    <header class="topbar"><span class="status"></span>${usuarioHTML()}</header>
    <div class="topm"><div class="row between"><span class="row" style="gap:10px"><div class="logos"><img src="/img/logo-latina.png" alt="LaTiNa"><img src="/img/logo-centenaria.png" alt="Centenaria"></div><b>Redes Latina | Centenaria</b></span><span class="row">${S.rol==='lautaro'?'<button class="btn sm primary" id="exportar-m">Reporte</button>':''}</span></div><div class="usr-m"><span class="av">${yo()[0]}</span><span><b>${yo()}</b> · ${S.rol==='franco'?'Publicaciones e ideas':'Acceso completo'}</span><button class="salir-m" id="salir-m">Salir</button></div><nav id="nav-top" aria-label="Secciones"></nav></div>
    <main class="main" id="vista"></main>
  </div></div>`}
// soltar=true: no conservar lo que había en el campo activo (después de un
// conflicto tiene que verse lo que quedó en la base, no lo que se escribió).
// Si un redibujado saca de la página un campo con foco, el navegador dispara su
// "change" en medio del innerHTML; ese change vuelve a llamar a render(). El
// segundo espera a que termine el primero en vez de pisarlo.
let dibujando=false,modalPrevio=null;
function render(soltar=false){
  if(dibujando){queueMicrotask(()=>render());return}
  dibujando=true;
  try{dibujar(soltar)}finally{dibujando=false}
}
function dibujar(soltar){
  const app=$('app');
  if(!S.logueado){app.innerHTML=vLogin();$('modal-ev').innerHTML='';S.evAbierto=null;return}
  const a=document.activeElement;let keep=null;
  // Sin blur: soltar el foco dispararía otro "change" con el texto viejo.
  if(!soltar&&a&&a.id&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))keep={id:a.id,val:a.value,s:a.selectionStart,e:a.selectionEnd};
  if(!$('vista'))app.innerHTML=shell();
  if(!vistaPermitida(S.vista))S.vista=grupos()[0][1][0][0];
  const nav=navHTML();$('nav-side').innerHTML=nav;$('nav-top').innerHTML=grupos().flatMap(g=>g[1]).map(([k,t])=>`<button class="nav" data-vista="${k}" ${S.vista===k?'aria-current="page"':''}>${t}</button>`).join('');
  const V={hoy:vHoy,semana:vSemana,historial:vHistorial,calendario:()=>S.calVista==='mes'?vMes():vCalendario(),tareas:vTareas,ads:vAds,metricas:vMetricas,ideas:vIdeas,competencia:vCompetencia,saber:vSaber,preguntar:vPreguntar,bandeja:vBandeja,contactos:vContactos}[S.vista]||vHoy;
  $('vista').innerHTML=V();
  // La animación de entrada sólo la primera vez: cada guardado redibuja el detalle.
  const recien=S.evAbierto&&S.evAbierto!==modalPrevio;modalPrevio=S.evAbierto;
  $('modal-ev').innerHTML=S.evAbierto?vEvento(recien):'';
  document.querySelectorAll('[data-md]').forEach(el=>{try{el.innerHTML=DOMPurify.sanitize(marked.parse(el.textContent))}catch(e){}el.removeAttribute('data-md')});
  if(keep){const el=$(keep.id);if(el){if(el.tagName!=='SELECT')el.value=keep.val;el.focus();try{el.setSelectionRange(keep.s,keep.e)}catch(e){}}}
}
function vLogin(){return `<div class="login"><form id="login"><div class="logos"><img src="/img/logo-latina.png" alt="LaTiNa"><img src="/img/logo-centenaria.png" alt="Centenaria"></div><h1>Redes Latina | Centenaria</h1>
  <input class="f" id="pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="PIN" aria-label="PIN" autofocus>
  <button class="btn primary" style="justify-content:center">Entrar</button><span class="small muted" id="login-msg"></span></form></div>`}
const head=(t,sub,extra='')=>`<div class="head"><div><h1>${t}</h1>${sub?`<p class="sub">${sub}</p>`:''}</div>${extra}</div>`;

/* ===== HOY ===== */
function seguidores(cuenta){return de('metrica').filter(m=>m.cuenta===cuenta).sort((a,b)=>a.fecha.localeCompare(b.fecha))}
function deltaDias(serie,dias){if(serie.length<2)return null;const ult=serie[serie.length-1];const lim=iso(addDays(parse(ult.fecha),-dias));const ref=[...serie].reverse().find(m=>m.fecha<=lim)||serie[0];if(ref===ult)return null;return ult.seguidores-ref.seguidores}
function campanaActiva(f=hoyISO()){return de('campana').find(c=>c.inicio<=f&&c.fin>=f)}
function vHoy(){
  const h=new Date(),hoy=hoyISO();const p=posteo(hoy);
  const diario=S.regs.find(r=>r.tipo==='diario'&&r.clave===hoy)||{};
  const lun=lunes(h.getDay()===0||h.getDay()===6?addDays(h,2):h);const dias=diasSemana(lun);
  const posts=dias.map(posteo);const mios=posts.filter(x=>x&&x.aCargo!=='Franco');
  const pub=mios.filter(x=>x.estado==='publicado').length;
  const dist=posts.some(x=>x?.eje==='distribucion');
  const mes=hoy.slice(0,7);const ugc=de('ugc').filter(u=>u.mes===mes&&u.estado!=='pedido').length;
  const camp=campanaActiva();
  const restan=camp?Math.round((parse(camp.fin)-parse(hoy))/864e5):null;
  const espera=de('tarea').filter(t=>t.deNahuel&&t.estado!=='hecho');
  const curso=de('tarea').filter(t=>t.estado==='en curso');
  const hero=p?`<div class="hero"><div><span class="label">Hoy · ${DIAS_L[h.getDay()]} ${h.getDate()} de ${MESES[h.getMonth()]}</span>
      <h2>${p.aCargo==='Franco'?'Publica Franco: Cente Azul':'Publicás '+esc(S.meta.marcas[p.marca])}${p.eje?' · '+esc(S.meta.ejes[p.eje]):''}</h2>
      <p class="tema">${p.tema?esc(p.tema):'Todavía no tiene tema.'} <span class="chip" style="margin-left:6px">${esc(ESTADOS_POST.find(e=>e[0]===p.estado)?.[1]||p.estado)}</span></p></div>
      <div class="chk"><span class="label">Revisión de redes</span>${[['manana','Mañana'],['tarde','Tarde']].map(([k,t])=>`<button data-diario="${k}" aria-pressed="${!!diario[k]}"><span class="box">${diario[k]?'✓':''}</span>${t}: historias y publicaciones</button>`).join('')}</div></div>`
    :`<div class="hero"><div><span class="label">${DIAS_L[h.getDay()]} ${h.getDate()} de ${MESES[h.getMonth()]}</span><h2>Fin de semana: no hay publicación</h2><p class="tema">El lunes arranca con Centenaria.</p></div></div>`;
  const martes=h.getDay()===2?`<div class="alerta"><span style="font-size:20px">●</span><div><b>Hoy coordinás con la oficina</b><span class="muted">Lo que sale desde mañana: ${dias.slice(2).map(f=>{const x=posteo(f);return `${corta(f)} ${S.meta.marcas[x.marca]}${x.tema?' ('+esc(x.tema)+')':' (sin tema)'}`}).join(' · ')}</span></div></div>`:'';
  const tiles=S.meta.cuentasRed.map(c=>{const s=seguidores(c.id);const ult=s[s.length-1];const d=deltaDias(s,7);
    return `<div class="kpi"><div class="row between"><span class="label">${esc(c.red)}</span>${marcaChip(c.marca)}</div><div class="v num">${ult?fmt(ult.seguidores):'—'}</div>
    <div class="row between"><span class="d">${ult?'al '+corta(ult.fecha):'sin cargar'}</span>${d!=null?`<span class="delta ${d>=0?'up':'down'}">${d>=0?'+':''}${fmt(d)} en 7 días</span>`:''}</div>${sparkline(s.slice(-12).map(m=>m.seguidores))}</div>`}).join('');
  return `${head('Hola, Lautaro','Esto es lo que tenés hoy con LaTiNa y Centenaria.')}
  ${hero}${martes}${alertasHTML()}
  <div class="g4">
    <div class="kpi"><span class="label">Publicaciones de la semana</span><div class="v num">${pub}<small> / ${mios.length}</small></div><div class="bar"><i style="width:${mios.length?pub/mios.length*100:0}%"></i></div><span class="d">${dist?'Pieza de distribución: lista':'<b style="color:var(--wait)">Falta la pieza de distribución</b>'}</span></div>
    <div class="kpi ${camp?'':'warn'}"><span class="label">Meta Ads</span>${camp?`<div class="v num">${pesos(camp.gasto)}</div><span class="d">${esc(camp.nombre||'Campaña')} · ${fmt(camp.consultas)} consultas · ${restan<=0?'<b style="color:var(--wait)">termina hoy</b>':`quedan ${restan} días`}</span>`:`<div class="v" style="font-size:19px">Sin campaña activa</div><span class="d">Las campañas son de 7 días encadenadas.</span>`}</div>
    <div class="kpi"><span class="label">Reels UGC del mes</span><div class="v num">${ugc}<small> / 4</small></div><div class="bar"><i style="width:${ugc/4*100}%"></i></div><span class="d">Belén 2 para Centenaria · Santiago 2 para LaTiNa</span></div>
    <div class="kpi ${espera.length?'warn':''}"><span class="label">Esperando a Nahuel</span><div class="v num">${espera.length}</div><span class="d">${espera.length?'cosas que tiene que resolver él':'nada pendiente de su lado'}</span></div>
  </div>
  <section class="card"><div class="card-h"><h2>Semana del ${lblSemana(lun)}</h2><button class="btn sm" data-vista="calendario">Abrir calendario</button></div>
    <div class="g5">${dias.map(f=>{const x=posteo(f);return `<button class="day ${f===hoy?'hoy':''}" data-vista="calendario"><span class="dn">${DIAS[parse(f).getDay()]} ${parse(f).getDate()}</span>${marcaChip(x.marca)}<span class="tt ${x.tema?'':'no'}">${x.tema?esc(x.tema):x.aCargo==='Franco'?'Franco':'Sin tema'}</span>${fchChips(f)}<span class="row">${x.eje?`<span class="chip">${esc(S.meta.ejes[x.eje])}</span>`:''}<span class="chip ${x.estado==='publicado'?'ok':x.estado==='listo'?'doing':''}">${esc(ESTADOS_POST.find(e=>e[0]===x.estado)?.[1]||x.estado)}</span></span></button>`}).join('')}</div></section>
  <div class="g2">
    <section class="card"><div class="card-h"><h2>Próximas fechas</h2><button class="btn sm" data-vista="calendario">Cargar un evento</button></div>${listaFechas(30)}</section>
    <section class="card"><div class="card-h"><h2>En curso</h2><span class="count">${curso.length}</span></div><ul class="items">${curso.length?curso.map(itemHTML).join(''):'<li class="empty">Nada en curso.</li>'}</ul></section>
  </div>
  <section class="card espera"><div class="card-h"><h2>Esperando a Nahuel</h2><span class="count">${espera.length}</span></div><ul class="lst">${espera.length?espera.map(t=>`<li><span class="fr">${esc(frenteNombre(t.frente))}</span><span>${esc(t.texto)}</span></li>`).join(''):'<li class="empty">Nada pendiente de su lado.</li>'}</ul></section>
  <section style="display:grid;gap:12px"><div class="card-h"><h2>Seguidores</h2><button class="btn sm" data-vista="metricas">Cargar o ver evolución</button></div><div class="g3">${tiles}</div></section>
  <form class="card" id="captura"><h3>Anotar rápido</h3><div class="add"><input id="cap-txt" placeholder="Un teléfono, una idea, algo que te dijo Nahuel… va a la bandeja" aria-label="Nota rápida"><button class="btn primary">Anotar</button></div></form>`;
}

/* ===== TAREAS COMPARTIDAS (tipo 'paso') =====
   Las ven y las tildan los dos. Cada una tiene responsable (quien), fecha y,
   si es parte de un evento, eventoId. Las Tareas de Lautaro siguen aparte. */
const PERSONAS={lautaro:'Lautaro',franco:'Franco'};
const PLANTILLAS={
  sorteo:['Sorteo',[[-7,'Definir premio, bases y cuentas que participan'],[-5,'Armar la pieza del sorteo'],[-4,'Publicar el sorteo con las bases'],[-1,'Historia: último día para participar'],[0,'Cerrar y elegir al ganador'],[1,'Anunciar al ganador y coordinar la entrega']]],
  expo:['Expo o feria',[[-10,'Confirmar lugar, horarios y quién va'],[-5,'Pieza de aviso: dónde y cuándo'],[-1,'Historias: mañana estamos en…'],[0,'Cobertura en vivo en historias'],[2,'Posteo con las fotos']]],
  lanzamiento:['Lanzamiento',[[-10,'Fotos del producto'],[-5,'Adelanto en historias'],[0,'Posteo de lanzamiento'],[3,'Reel o UGC con el producto']]],
};
const dias_=f=>Math.round((parse(f)-parse(hoyISO()))/864e5);
function cuando(f){const n=dias_(f);return n===0?'hoy':n===1?'mañana':n===-1?'ayer':n<0?`hace ${-n} días`:`en ${n} días`}
const finSemana=()=>iso(addDays(lunes(new Date()),7));
// Las mías sin hacer hasta el domingo (atrasadas incluidas): el número del menú.
const misPasos=()=>de('paso').filter(p=>!p.hecho&&p.quien===S.rol&&p.fecha&&p.fecha<finSemana());
const pasosDeEvento=id=>de('paso').filter(p=>p.eventoId===id).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
function pasoHTML(p,{evento=true}={}){
  const ev=evento&&p.eventoId&&buscar(p.eventoId);const atr=!p.hecho&&p.fecha&&p.fecha<hoyISO();
  return `<li class="paso ${p.hecho?'hecho':''} ${atr?'atr':''}" data-pid="${p.id}">
    <input type="checkbox" data-pchk ${p.hecho?'checked':''} aria-label="Hecha">
    <span class="paso-t"><span>${esc(p.texto)}</span><span class="paso-m">${p.fecha?`<span class="${atr?'tarde':''}">${corta(p.fecha)} · ${atr?'atrasada':cuando(p.fecha)}</span>`:'sin fecha'}${ev?` · <button class="evlink sm" data-ev="${ev.id}">${esc(ev.titulo)}</button>`:''}${p.hecho&&p.hechoPor?` · hecha por ${esc(PERSONAS[p.hechoPor]||p.hechoPor)}`:''}</span></span>
    <select class="f quien" id="pq-${p.id}" data-pq aria-label="Responsable">${Object.entries(PERSONAS).map(([k,t])=>`<option value="${k}" ${p.quien===k?'selected':''}>${t}</option>`).join('')}</select>
    ${delBtn(p.id)}</li>`;
}
function formPaso(id,{eventoId='',fecha=hoyISO()}={}){
  const evs=de('evento').filter(e=>e.fecha>=hoyISO()).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  return `<form class="nuevo-paso" data-form-paso="${id}" data-evento="${eventoId}">
    <input class="f" id="${id}-t" placeholder="Agregar una tarea" aria-label="Tarea">
    <input class="f" type="date" id="${id}-f" value="${fecha}" aria-label="Fecha">
    <select class="f" id="${id}-q" aria-label="Responsable">${Object.entries(PERSONAS).map(([k,t])=>`<option value="${k}" ${S.rol===k?'selected':''}>${t}</option>`).join('')}</select>
    ${eventoId?'':`<select class="f" id="${id}-e" aria-label="Evento"><option value="">Sin evento</option>${evs.map(e=>`<option value="${e.id}">${esc(e.titulo)} (${corta(e.fecha)})</option>`).join('')}</select>`}
    <button class="btn primary">Agregar</button></form>`;
}
// Lo que hay que mirar ya: atrasadas, eventos a 7 días o menos y publicaciones cercanas sin tema.
function alertasHTML(){
  const hoy=hoyISO();const l=[];
  const atr=de('paso').filter(p=>!p.hecho&&p.fecha&&p.fecha<hoy).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  for(const p of atr)l.push(['tarde',`<b>Atrasada${p.quien===S.rol?'':' de '+esc(PERSONAS[p.quien])}:</b> ${esc(p.texto)} <span class="muted">(era para el ${corta(p.fecha)})</span>`]);
  for(const e of de('evento').filter(e=>e.fecha>=hoy&&dias_(e.fecha)<=7).sort((a,b)=>a.fecha.localeCompare(b.fecha))){
    const ps=pasosDeEvento(e.id);const h=ps.filter(p=>p.hecho).length;
    l.push(['cerca',`<button class="evlink" data-ev="${e.id}">${esc(e.titulo)}</button> es <b>${cuando(e.fecha)}</b> (${corta(e.fecha)})${ps.length?` · ${h} de ${ps.length} tareas hechas`:' · sin tareas cargadas'}`]);
  }
  let d=new Date(),n=0;while(n<3){const f=iso(d);const p=posteo(f);if(p){n++;if(!p.tema)l.push(['tema',`La publicación del <b>${corta(f)}</b> (${esc(S.meta.marcas[p.marca])}) todavía no tiene tema`])}d=addDays(d,1)}
  if(!l.length)return '';
  return `<section class="alertas" aria-label="Para mirar"><h2>Para mirar</h2><ul>${l.map(([t,h])=>`<li class="${t}">${h}</li>`).join('')}</ul></section>`;
}
function vSemana(){
  const dias=diasSemana(semana);const desde=dias[0],hasta=iso(addDays(semana,7));const hoy=hoyISO();
  const actual=iso(semana)===iso(lunes(new Date()))||iso(semana)===iso(semanaInicial());
  const orden=S.rol==='franco'?['franco','lautaro']:['lautaro','franco'];
  const cols=orden.map(q=>{
    const ab=de('paso').filter(p=>p.quien===q&&!p.hecho&&p.fecha&&p.fecha<hasta&&(p.fecha>=desde||(actual&&p.fecha<hoy))).sort((a,b)=>a.fecha.localeCompare(b.fecha));
    const he=de('paso').filter(p=>p.quien===q&&p.hecho&&p.fecha>=desde&&p.fecha<hasta);
    const k='sem-'+q;const o=!!S.open[k];
    return `<section class="card"><div class="card-h"><div class="row"><span class="av sm">${PERSONAS[q][0]}</span><h2>${q===S.rol?'Vos':PERSONAS[q]}</h2></div><span class="count">${ab.length}</span></div>
      <ul class="pasos">${ab.length?ab.map(x=>pasoHTML(x)).join(''):'<li class="empty">Nada pendiente esta semana.</li>'}</ul>
      ${he.length?`<button class="toggle-done" data-toggle="${k}" aria-expanded="${o}">${o?'▾':'▸'} Hechas (${he.length})</button>${o?`<ul class="pasos">${he.map(x=>pasoHTML(x)).join('')}</ul>`:''}`:''}</section>`}).join('');
  const prox=(S.meta.fechas||[]).filter(x=>x.fecha>=hoy&&dias_(x.fecha)<=30);
  const proxHTML=prox.length?`<div class="gauto proxs">${prox.map(x=>{const ev=x.id&&buscar(x.id);const ps=ev?pasosDeEvento(ev.id):[];const h=ps.filter(p=>p.hecho).length;const n=dias_(x.fecha);
    return `<${ev?'button':'div'} class="prox ${n<=7?'cerca':''}" ${ev?`data-ev="${ev.id}"`:''}><span class="prox-n"><b class="num">${n===0?'Hoy':n}</b>${n===0?'':n===1?'día':'días'}</span>
      <span class="prox-t"><span class="fch ${x.tipo}">${esc(TIPO_F[x.tipo])}</span><b>${esc(x.titulo)}</b><span class="muted small">${corta(x.fecha)}${x.marca&&x.marca!=='ambas'?' · '+esc(S.meta.marcas[x.marca]||''):''}</span>
      ${ev?`<span class="prog"><span class="bar"><i style="width:${ps.length?h/ps.length*100:0}%"></i></span><span class="small muted">${ps.length?`${h} de ${ps.length} tareas`:'Sin tareas: tocá para cargarlas'}</span></span>`:''}</span></${ev?'button':'div'}>`}).join('')}</div>`:'<p class="empty">Nada en los próximos 30 días.</p>';
  const tira=`<div class="g5">${dias.map(f=>{const x=posteo(f);return `<button class="day ${f===hoy?'hoy':''}" data-irsemana="${f}"><span class="dn">${DIAS[parse(f).getDay()]} ${parse(f).getDate()}</span>${marcaChip(x.marca)}<span class="tt ${x.tema?'':'no'}">${x.tema?esc(x.tema):'Sin tema'}</span>${fchChips(f)}<span class="row">${x.eje?`<span class="chip">${esc(S.meta.ejes[x.eje])}</span>`:''}<span class="chip ${EST_CHIP[x.estado]||''}">${esc(ESTADOS_POST.find(e=>e[0]===x.estado)?.[1]||x.estado)}</span></span></button>`}).join('')}</div>`;
  return `${head(S.rol==='franco'?'Hola, Franco':'Semana','Lo que tenemos que hacer los dos esta semana y lo que se viene.',
    `<div class="row"><button class="iconbtn" id="prev" aria-label="Semana anterior">‹</button><b class="num" style="min-width:12em;text-align:center">${lblSemana(semana)}</b><button class="iconbtn" id="next" aria-label="Semana siguiente">›</button><button class="btn sm" id="hoy">Esta semana</button></div>`)}
  ${alertasHTML()}
  <section style="display:grid;gap:12px"><div class="card-h"><h2>Para hacer</h2><span class="small muted">Tildala cuando esté: el otro lo ve al instante</span></div>
    <div class="g2">${cols}</div>
    <div class="card">${formPaso('np')}</div></section>
  <section class="card"><div class="card-h"><h2>Publicaciones</h2><span class="small muted">Tocá un día para editarlo</span></div>${tira}</section>
  <section style="display:grid;gap:12px"><div class="card-h"><h2>Se viene</h2><button class="btn sm" data-nuevo-ev="1">Cargar un evento</button></div>${proxHTML}</section>`;
}
function vEvento(recien){
  const e=buscar(S.evAbierto);if(!e||e.tipo!=='evento'){S.evAbierto=null;return ''}
  const ps=pasosDeEvento(e.id);const h=ps.filter(p=>p.hecho).length;const n=dias_(e.fecha);
  return `<div class="modal ${recien?'entra':''}" data-cerrar-ev><div class="ev-sheet" role="dialog" aria-modal="true" aria-labelledby="evd-tit">
    <div class="card-h"><span class="label">Evento · ${n<0?'pasó':cuando(e.fecha)}</span><button class="iconbtn" data-cerrar-ev aria-label="Cerrar">×</button></div>
    <input class="f evd-tit" id="evd-tit" data-evf="titulo" value="${esc(e.titulo)}" aria-label="Nombre del evento">
    <div class="row"><input class="f" type="date" id="evd-fecha" data-evf="fecha" value="${esc(e.fecha)}" aria-label="Fecha">
      <select class="f" id="evd-marca" data-evf="marca" aria-label="Marca">${[['ambas','Las dos'],['centenaria','Centenaria'],['latina','LaTiNa'],['cente-azul','Cente Azul']].map(([k,t])=>`<option value="${k}" ${e.marca===k?'selected':''}>${t}</option>`).join('')}</select>
      <input class="f" style="flex:1" id="evd-lugar" data-evf="lugar" value="${esc(e.lugar)}" placeholder="Lugar o nota" aria-label="Lugar"></div>
    <div class="card-h"><h3>Tareas ${ps.length?`<span class="count">${h} de ${ps.length}</span>`:''}</h3></div>
    ${ps.length?`<ul class="pasos">${ps.map(p=>pasoHTML(p,{evento:false})).join('')}</ul>`
      :`<div class="plantillas"><p class="small muted">Cargá los pasos típicos con las fechas calculadas desde el ${corta(e.fecha)}, y después ajustá lo que haga falta:</p><div class="row">${Object.entries(PLANTILLAS).map(([k,[t]])=>`<button class="btn sm" data-plantilla="${k}">${t}</button>`).join('')}</div></div>`}
    ${formPaso('ep',{eventoId:e.id,fecha:e.fecha})}
    <div class="row between"><span class="small muted">${e.autor?'Lo cargó '+esc(PERSONAS[e.autor]||e.autor):''}</span><button class="btn sm ${S.armed===e.id?'peligro':''}" data-borrar-ev="${e.id}">${S.armed===e.id?'¿Borrar el evento y sus tareas?':'Borrar evento'}</button></div>
  </div></div>`;
}

/* ===== HISTORIAL Y PAPELERA (sólo Lautaro) =====
   Nada se borra de verdad: va a la papelera 30 días y se recupera desde acá.
   El historial muestra quién cambió qué (Lautaro, Franco, el bot o la IA). */
const TIPO_NOMBRE={tarea:'Tarea',posteo:'Publicación',contacto:'Contacto',idea:'Idea',nota:'Nota',saber:'Documento',obs:'Observación',ugc:'Reel UGC',campana:'Campaña',metrica:'Métrica',diario:'Revisión diaria',evento:'Evento',paso:'Tarea compartida'};
const QUIEN_NOMBRE={lautaro:'Lautaro',franco:'Franco',bot:'Bot de Telegram',IA:'Claude',sistema:'Sistema'};
const ACCION={crear:'cargó',editar:'cambió',borrar:'borró',restaurar:'recuperó'};
const CAMPO={tema:'tema',estado:'estado',eje:'eje',link:'link',redes:'redes',texto:'texto',titulo:'título',fecha:'fecha',quien:'responsable',hecho:'hecha',marca:'marca',lugar:'lugar',descripcion:'detalle',seguidores:'seguidores',nombre:'nombre',telefono:'teléfono',nota:'nota',gasto:'gasto',consultas:'consultas'};
function nombreDe(tipo,d){d=d||{};const t=d.titulo||d.texto||d.tema||d.nombre||d.competidor;
  if(tipo==='posteo')return `${corta(d.fecha||d.clave)}${t?': '+t:''}`;if(tipo==='metrica')return `${d.cuenta||''} ${d.fecha||''}`.trim();return t||d.clave||''}
const corto_=v=>{if(v==null||v==='')return '—';if(typeof v==='boolean')return v?'sí':'no';if(typeof v==='object')return Object.entries(v).filter(([,x])=>x).map(([k])=>RED_TXT[k]||k).join(', ')||'—';const s=String(v);return s.length>60?s.slice(0,57)+'…':s};
const IGNORAR=new Set(['editadoPor','marca','aCargo','fecha','clave','hechoEn','hechoPor','autor']);
async function cargarHist(){S.busy.hist=true;try{S.hist=await api('GET','/api/historial')}catch(e){S.hist={error:e.message}}S.busy.hist=false;if(S.vista==='historial')render()}
function cuandoFue(m){const d=new Date(m);const h=d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});const f=iso(d);return f===hoyISO()?`hoy ${h}`:f===iso(addDays(new Date(),-1))?`ayer ${h}`:`${corta(f)} ${h}`}
function vHistorial(){
  if(!S.hist){if(!S.busy.hist)setTimeout(cargarHist);return `${head('Historial','')}<p class="muted"><span class="spin"></span> Cargando…</p>`}
  if(S.hist.error)return `${head('Historial','')}<div class="alerta"><b>No se pudo cargar</b><span class="muted">${esc(S.hist.error)}</span></div>`;
  const {cambios,papelera}=S.hist;
  const pap=papelera.length?`<ul class="lst">${papelera.map(r=>`<li class="hist-li"><span class="chip">${esc(TIPO_NOMBRE[r.tipo]||r.tipo)}</span><span class="hist-t"><b>${esc(nombreDe(r.tipo,r))||'(sin título)'}</b><span class="small muted">La borró ${esc(QUIEN_NOMBRE[r.borradoPor]||r.borradoPor||'—')} · ${cuandoFue(r.borrado)}</span></span><button class="btn sm" data-restaurar="${r.id}">Recuperar</button></li>`).join('')}</ul>`
    :'<p class="empty">La papelera está vacía.</p>';
  const lineas=cambios.map(c=>{
    const d=c.despues||c.antes||c.actual||{};const nom=nombreDe(c.tipo,{...(c.actual||{}),...d});
    let det='';
    if(c.accion==='editar'&&c.despues){const ks=Object.keys(c.despues).filter(k=>!IGNORAR.has(k));det=ks.map(k=>`${CAMPO[k]||k}: ${esc(corto_(c.antes?.[k]))} → <b>${esc(corto_(c.despues[k]))}</b>`).join(' · ')}
    return `<li class="hist-li"><span class="hist-q">${esc(QUIEN_NOMBRE[c.quien]||c.quien)}</span><span class="hist-t"><span>${ACCION[c.accion]||c.accion} ${esc((TIPO_NOMBRE[c.tipo]||c.tipo).toLowerCase())}${nom?` <b>${esc(nom)}</b>`:''}</span>${det?`<span class="small muted">${det}</span>`:''}</span><span class="when">${cuandoFue(c.momento)}</span></li>`}).join('');
  return `${head('Historial','Quién cambió qué, y la papelera: lo que se borra queda 30 días y se puede recuperar.',`<button class="btn sm" id="hist-recargar">Actualizar</button>`)}
  <section class="card"><div class="card-h"><h2>Papelera</h2><span class="count">${papelera.length}</span></div>${pap}</section>
  <section class="card"><div class="card-h"><h2>Últimos cambios</h2><span class="small muted">Los 200 más recientes</span></div>${cambios.length?`<ul class="lst">${lineas}</ul>`:'<p class="empty">Todavía no hay cambios registrados. Empieza a anotar desde ahora.</p>'}</section>`;
}

/* ===== CALENDARIO ===== */
function vCalendario(){
  const dias=diasSemana(semana);const hoy=hoyISO();
  const cards=dias.map(f=>{const p=posteo(f);const redes=S.meta.redes[p.marca]||[];
    return `<article class="dia ${f===hoy?'hoy':''} ${p.estado==='publicado'?'publicado':''}" data-fecha="${f}">
      <div class="dia-h"><b>${DIAS_L[parse(f).getDay()]} ${parse(f).getDate()}</b>${marcaChip(p.marca)}</div>
      ${fchChips(f)}
      <div class="seg ejes" role="group" aria-label="Eje">${Object.entries(S.meta.ejes).map(([k,t])=>`<button data-eje="${k}" class="${p.eje===k?'on':''}" aria-pressed="${p.eje===k}">${t}</button>`).join('')}</div>
      <textarea class="f" id="tema-${f}" data-pf="tema" rows="2" placeholder="Qué se publica" aria-label="Tema">${esc(p.tema)}</textarea>
      <input class="f" id="link-${f}" data-pf="link" value="${esc(p.link)}" placeholder="Link de la pieza o del Drive" aria-label="Link" style="font-size:12.5px">
      <div class="seg est" role="group" aria-label="Estado">${ESTADOS_POST.map(([k,t])=>`<button data-est="${k}" class="${p.estado===k?'on':''}" aria-pressed="${p.estado===k}">${t}</button>`).join('')}</div>
      <div class="redes"><span class="small muted">Salió en</span>${redes.map(r=>`<button data-red="${r}" aria-pressed="${!!p.redes?.[r]}">${RED_TXT[r]}</button>`).join('')}</div>
    </article>`}).join('');
  const posts=dias.map(posteo);
  const dist=posts.some(p=>p.eje==='distribucion');
  const ref=addDays(semana,2);const y=ref.getFullYear(),m=ref.getMonth();const mes=`${y}-${pad(m+1)}`;
  const ugcCards=S.meta.ugcMes.map(u=>`<div class="card"><div class="card-h"><h3>${esc(u.quien)}</h3>${marcaChip(u.marca)}</div>
    ${Array.from({length:u.cantidad},(_,i)=>{const k=`${mes}_${u.quien}_${i+1}`;const x=S.regs.find(r=>r.tipo==='ugc'&&r.clave===k)||{};
      return `<div class="ugc-slot" data-ugc="${k}" data-quien="${esc(u.quien)}" data-marca="${u.marca}"><input class="f" id="ugc-${k}" data-uf="titulo" value="${esc(x.titulo)}" placeholder="Reel ${i+1}: idea o guía" aria-label="Reel ${i+1}">
      <select class="f" id="ugce-${k}" data-uf="estado" aria-label="Estado">${UGC_EST.map(([s,t])=>`<option value="${s}" ${(x.estado||'pedido')===s?'selected':''}>${t}</option>`).join('')}</select>
      <input class="f" type="date" id="ugcf-${k}" data-uf="fecha" value="${esc(x.fecha)}" aria-label="Fecha de entrega"></div>`}).join('')}</div>`).join('');
  return `${calHead(`<button class="iconbtn" id="prev" aria-label="Semana anterior">‹</button><b class="num" style="min-width:12em;text-align:center">${lblSemana(semana)}</b><button class="iconbtn" id="next" aria-label="Semana siguiente">›</button><button class="btn sm" id="hoy">Esta semana</button>`)}
  ${dist?'':'<div class="alerta"><span style="font-size:20px;color:var(--wait)">●</span><div><b>Falta la pieza de distribución de esta semana</b><span class="muted">El plan pide un texto fuerte por semana para sumar distribuidores, con salida a WhatsApp.</span></div></div>'}
  <div class="g5">${cards}</div>
  ${avance(y,m)}
  ${calFechas()}
  ${S.rol==='lautaro'?`<section style="display:grid;gap:12px"><div class="card-h"><h2>Reels UGC de ${MESES[m]}</h2><span class="small muted">Lautaro coordina la idea, el mensaje y dónde se usa</span></div><div class="g2">${ugcCards}</div></section>`:''}`;
}
function calFechas(){
  return `<div class="g2"><section class="card"><div class="card-h"><h2>Fechas y eventos</h2><span class="small muted">Próximos 90 días · los feriados se leen solos</span></div>${listaFechas(90,{borrar:true})}</section>
  <form class="card" id="nuevo-evento"><h2>Cargar un evento</h2><p class="small muted">Una expo, una feria, un lanzamiento: aparece en el calendario, en el plan del lunes y la IA lo usa para las ideas.</p>
    <input class="f" id="ev-tit" placeholder="Expo Moto Gualeguaychú" aria-label="Nombre del evento">
    <div class="row"><input class="f" type="date" id="ev-fecha" aria-label="Fecha"><select class="f" id="ev-marca" aria-label="Marca"><option value="ambas">Las dos</option><option value="centenaria">Centenaria</option><option value="latina">LaTiNa</option><option value="cente-azul">Cente Azul</option></select></div>
    <input class="f" id="ev-lugar" placeholder="Lugar o nota (opcional)" aria-label="Lugar"><div><button class="btn primary">Agregar evento</button></div></form></div>`;
}
function avance(y,m){
  const tot={centenaria:[0,0],latina:[0,0],'cente-azul':[0,0]};
  for(let d=new Date(y,m,1);d.getMonth()===m;d.setDate(d.getDate()+1)){const p=posteo(iso(d));if(!p||!tot[p.marca])continue;tot[p.marca][1]++;if(p.estado==='publicado')tot[p.marca][0]++}
  return `<section class="card"><div class="card-h"><h2>Avance de ${MESES[m]}</h2><span class="small muted">Publicados sobre días asignados</span></div>
    <div class="g3">${Object.entries(tot).map(([k,[a,b]])=>`<div style="display:grid;gap:6px"><div class="row between">${marcaChip(k)}<b class="num">${a} / ${b}</b></div><div class="bar"><i style="width:${b?a/b*100:0}%"></i></div></div>`).join('')}</div></section>`;
}
function calHead(nav){
  const sub=S.rol==='franco'?'Las publicaciones de las tres marcas, un posteo por día hábil.':'Un posteo por día hábil, con su marca fija. Los martes se coordina con la oficina lo que sale desde el miércoles.';
  return head('Calendario',sub,`<div class="row"><div class="seg calv" role="group" aria-label="Vista">${[['semana','Semana'],['mes','Mes']].map(([k,t])=>`<button data-calv="${k}" class="${S.calVista===k?'on':''}" aria-pressed="${S.calVista===k}">${t}</button>`).join('')}</div><div class="row calnav">${nav}</div></div>`);
}

/* ===== CALENDARIO: grilla del mes ===== */
const EST_CHIP={publicado:'ok',listo:'doing',editando:'wait',pendiente:'ghost'};
function vMes(){
  const y=mesCal.getFullYear(),m=mesCal.getMonth();const hoy=hoyISO();
  const ini=lunes(new Date(y,m,1));const ult=new Date(y,m+1,0);
  const semanas=Math.ceil((Math.round((ult-ini)/864e5)+1)/7);
  const celdas=[];
  for(let i=0;i<semanas*7;i++){const d=addDays(ini,i);const f=iso(d);const fuera=d.getMonth()!==m;const finde=d.getDay()===0||d.getDay()===6;
    const p=finde?null:posteo(f);const fs=fechasDe(f);
    const cls=['mc',fuera?'fuera':'',f===hoy?'hoy':'',finde?'finde':'',p?.marca||'',p?.estado==='publicado'?'publicado':'',fs.length?'confecha':''].join(' ');
    const num=`<span class="mc-h"><span class="mc-n">${d.getDate()}</span><span class="mc-d">${DIAS_L[d.getDay()]}</span></span>`;
    if(finde){celdas.push(`<div class="${cls}">${num}${fchChips(f)}</div>`);continue}
    const est=ESTADOS_POST.find(e=>e[0]===p.estado)?.[1]||p.estado;
    celdas.push(`<button class="${cls}" data-irsemana="${f}" aria-label="${esc(`${DIAS_L[d.getDay()]} ${d.getDate()}: ${S.meta.marcas[p.marca]||''}, ${p.tema||'sin tema'}, ${est}`)}">
      ${num}${marcaChip(p.marca)}<span class="mc-t ${p.tema?'':'no'}">${p.tema?esc(p.tema):'Sin tema'}</span>${fchChips(f)}
      <span class="row mc-pie">${p.eje?`<span class="chip">${esc(S.meta.ejes[p.eje])}</span>`:''}<span class="chip ${EST_CHIP[p.estado]||''}">${esc(est)}</span></span></button>`)}
  const cab=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div class="dh">${d}</div>`).join('');
  const posts=[];for(let d=new Date(y,m,1);d.getMonth()===m;d.setDate(d.getDate()+1)){const p=posteo(iso(d));if(p)posts.push(p)}
  const cuenta=k=>posts.filter(p=>p.estado===k).length;
  return `${calHead(`<button class="iconbtn" id="mprev" aria-label="Mes anterior">‹</button><b style="min-width:9em;text-align:center;text-transform:capitalize">${MESES[m]} ${y}</b><button class="iconbtn" id="mnext" aria-label="Mes siguiente">›</button><button class="btn sm" id="mhoy">Este mes</button>`)}
  <div class="row"><span class="small muted">${posts.length} publicaciones en el mes:</span>${ESTADOS_POST.map(([k,t])=>`<span class="chip ${EST_CHIP[k]}">${t} ${cuenta(k)}</span>`).join('')}<span class="small muted">· Tocá un día para editarlo.</span></div>
  <div class="mes">${cab}${celdas.join('')}</div>
  ${avance(y,m)}
  ${calFechas()}`;
}

/* ===== TAREAS ===== */
function itemHTML(i){
  const hecho=i.estado==='hecho';
  const chip=hecho?`<span class="when">${corta(i.hechoEn)}</span>`:`<button class="chip ${i.estado==='en curso'?'doing':'ghost'}" data-act="estado">${i.estado==='en curso'?'En curso':'Pendiente'}</button>`;
  return `<li class="item ${hecho?'hecho':''}" data-id="${i.id}"><input type="checkbox" data-act="check" ${hecho?'checked':''} aria-label="Hecho">
    <textarea class="txt" id="txt-${i.id}" rows="1" data-act="texto" aria-label="Tarea">${esc(i.texto)}</textarea>
    <span class="acts">${chip}<button class="chip ${i.deNahuel?'wait':'ghost'}" data-act="nahuel" aria-pressed="${!!i.deNahuel}" title="Lo tiene que resolver Nahuel">Nahuel</button>${delBtn(i.id)}</span></li>`;
}
const ordenEst={'en curso':0,'pendiente':1};
function vTareas(){
  return `${head('Tareas','Marcá «Nahuel» en lo que depende de él: aparece en Hoy y en el reporte.')}<div class="gauto">${S.meta.frentes.map(f=>{
    const todos=de('tarea').filter(i=>i.frente===f.id);
    const ab=todos.filter(i=>i.estado!=='hecho').sort((a,b)=>(ordenEst[a.estado]??1)-(ordenEst[b.estado]??1)||String(a.creado).localeCompare(String(b.creado)));
    const he=todos.filter(i=>i.estado==='hecho').sort((a,b)=>String(b.hechoEn).localeCompare(String(a.hechoEn)));
    if(f.id==='general'&&!todos.length)return '';
    const o=!!S.open[f.id];
    return `<article class="card"><div class="card-h"><div class="row"><h3>${f.nombre}</h3>${marcaChip(f.marca)}</div><span class="count">${ab.length}</span></div>
      <ul class="items">${ab.length?ab.map(itemHTML).join(''):'<li class="empty">Sin tareas abiertas.</li>'}</ul>
      <form class="add" data-frente="${f.id}"><input id="add-${f.id}" placeholder="Agregar tarea y Enter" aria-label="Nueva tarea en ${f.nombre}"></form>
      ${he.length?`<button class="toggle-done" data-toggle="${f.id}" aria-expanded="${o}">${o?'▾':'▸'} Hechas (${he.length})</button>${o?`<ul class="items">${he.map(itemHTML).join('')}</ul>`:''}`:''}</article>`}).join('')}</div>`;
}

/* ===== ADS ===== */
function vAds(){
  const hoy=hoyISO();if(!S.mesAds)S.mesAds=hoy.slice(0,7);
  const camps=de('campana').sort((a,b)=>String(b.inicio).localeCompare(String(a.inicio)));
  const act=campanaActiva();
  const [y,m]=S.mesAds.split('-').map(Number);const desde=`${S.mesAds}-01`,hasta=iso(new Date(y,m,1));
  const delMes=camps.filter(c=>c.inicio<hasta&&(c.fin||c.inicio)>=desde);
  const sum=k=>delMes.reduce((s,c)=>s+nmb(c[k]),0);const g=sum('gasto'),q=sum('consultas'),cp=sum('compras');
  let heroAds='';
  if(act){const tot=7,trans=Math.min(7,Math.round((parse(hoy)-parse(act.inicio))/864e5)+1),restan=Math.round((parse(act.fin)-parse(hoy))/864e5);
    heroAds=`<section class="card" style="border-color:#B9DCC4"><div class="card-h"><div><span class="label">Campaña activa · ${esc(act.cuenta||'yerbamatelatina')}</span><h2 style="margin-top:4px">${esc(act.nombre||'Sin nombre')}</h2></div>${act.eje?`<span class="chip">${esc(S.meta.ejes[act.eje])}</span>`:''}</div>
      <div class="g4"><div><span class="label">Día</span><div class="v num" style="font-size:22px;font-weight:800">${trans} de ${tot}</div><div class="bar" style="margin-top:6px"><i style="width:${trans/tot*100}%"></i></div></div>
      <div><span class="label">Gasto</span><div class="num" style="font-size:22px;font-weight:800">${pesos(act.gasto)}</div><span class="small muted">de ${pesos(act.presupuesto)} previstos</span></div>
      <div><span class="label">Consultas</span><div class="num" style="font-size:22px;font-weight:800">${fmt(act.consultas)}</div><span class="small muted">${nmb(act.consultas)?pesos(nmb(act.gasto)/nmb(act.consultas))+' cada una':'—'}</span></div>
      <div><span class="label">Compras atribuibles</span><div class="num" style="font-size:22px;font-weight:800">${fmt(act.compras)}</div></div></div>
      ${restan<=1?`<div class="alerta"><span style="color:var(--wait)">●</span><div><b>${restan<=0?'Termina hoy':'Termina mañana'}</b><span class="muted">Prepará la siguiente para que no quede un día sin pauta.</span></div></div>`:''}</section>`}
  else heroAds=`<div class="alerta"><span style="color:var(--wait);font-size:20px">●</span><div><b>No hay campaña activa</b><span class="muted">El plan pide campañas de 7 días, una detrás de otra. Cargá la de esta semana abajo.</span></div></div>`;
  const ult8=[...camps].slice(0,8).reverse();
  const chart=vBars(ult8.map(c=>({label:corta(c.inicio),v:nmb(c.consultas),tip:`${c.nombre||'Campaña'}\n${pesos(c.gasto)} · ${fmt(c.consultas)} consultas${nmb(c.consultas)?'\n'+pesos(nmb(c.gasto)/nmb(c.consultas))+' por consulta':''}`})));
  const fila=c=>{const cpq=nmb(c.consultas)?pesos(nmb(c.gasto)/nmb(c.consultas)):'—';
    return `<tr data-cid="${c.id}"><td><input id="an-${c.id}" data-cf="nombre" value="${esc(c.nombre)}" aria-label="Nombre"></td>
    <td><select id="ae-${c.id}" data-cf="eje" aria-label="Eje">${Object.entries(S.meta.ejes).map(([k,t])=>`<option value="${k}" ${c.eje===k?'selected':''}>${t}</option>`).join('')}</select></td>
    <td><input type="date" id="ai-${c.id}" data-cf="inicio" value="${esc(c.inicio)}" aria-label="Inicio"></td><td><input type="date" id="af-${c.id}" data-cf="fin" value="${esc(c.fin)}" aria-label="Fin"></td>
    <td class="n"><input id="ap-${c.id}" data-cf="presupuesto" value="${esc(c.presupuesto)}" aria-label="Presupuesto"></td><td class="n"><input id="ag-${c.id}" data-cf="gasto" value="${esc(c.gasto)}" aria-label="Gasto"></td>
    <td class="n"><input id="aq-${c.id}" data-cf="consultas" value="${esc(c.consultas)}" aria-label="Consultas"></td><td class="calc">${cpq}</td><td class="n"><input id="ac-${c.id}" data-cf="compras" value="${esc(c.compras)}" aria-label="Compras"></td>
    <td><input id="ao-${c.id}" data-cf="nota" value="${esc(c.nota)}" placeholder="Qué aprendiste" aria-label="Nota"></td><td>${delBtn(c.id)}</td></tr>`};
  const mesLbl=`${MESES[m-1]} ${y}`;
  return `${head('Meta Ads','Campañas de 7 días encadenadas, con los mismos tres ejes que el contenido. Cuenta: yerbamatelatina (distribuidores).',`<button class="btn primary" id="nueva-camp"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nueva campaña</button>`)}
  ${heroAds}
  <div class="row between"><h2>Resumen de ${mesLbl}</h2><div class="row"><button class="iconbtn" id="ads-prev" aria-label="Mes anterior">‹</button><button class="iconbtn" id="ads-next" aria-label="Mes siguiente">›</button></div></div>
  <div class="g4"><div class="kpi"><span class="label">Inversión</span><div class="v num">${pesos(g)}</div><span class="d">${delMes.length} campañas</span></div>
    <div class="kpi"><span class="label">Consultas</span><div class="v num">${fmt(q)}</div><span class="d">por WhatsApp</span></div>
    <div class="kpi"><span class="label">Costo por consulta</span><div class="v num">${q?pesos(g/q):'—'}</div><span class="d">inversión ÷ consultas</span></div>
    <div class="kpi"><span class="label">Compras atribuibles</span><div class="v num">${fmt(cp)}</div><span class="d">lo que se pueda atribuir</span></div></div>
  <section class="card"><div class="card-h"><h2>Consultas por campaña</h2><span class="small muted">Últimas 8 · pasá el mouse para ver gasto y costo</span></div>${chart}</section>
  <div class="tw"><table><thead><tr><th style="width:17%">Campaña</th><th style="width:10%">Eje</th><th style="width:10%">Inicio</th><th style="width:10%">Fin</th><th style="width:8%;text-align:right">Presup.</th><th style="width:8%;text-align:right">Gasto</th><th style="width:7%;text-align:right">Consultas</th><th style="width:7%;text-align:right">$/consulta</th><th style="width:6%;text-align:right">Compras</th><th>Nota</th><th style="width:44px"></th></tr></thead>
  <tbody>${camps.length?camps.map(fila).join(''):'<tr><td colspan="11" class="empty">Todavía no hay campañas. Tocá «Nueva campaña».</td></tr>'}</tbody></table></div>`;
}

/* ===== MÉTRICAS ===== */
function vMetricas(){
  const hoy=hoyISO();
  const tiles=S.meta.cuentasRed.map(c=>{const s=seguidores(c.id);const ult=s[s.length-1];const d7=deltaDias(s,7),d30=deltaDias(s,30);
    return `<button class="kpi" style="text-align:left;border-color:${S.metSel===c.id?'var(--accent)':'var(--line)'}" data-met="${c.id}"><div class="row between"><span class="label">${esc(c.red)}</span>${marcaChip(c.marca)}</div><div class="v num">${ult?fmt(ult.seguidores):'—'}</div>
    <div class="row between"><span class="d">${d7!=null?`<span class="delta ${d7>=0?'up':'down'}">${d7>=0?'+':''}${fmt(d7)}</span> 7 días`:'sin comparación'}</span><span class="d">${d30!=null?`${d30>=0?'+':''}${fmt(d30)} en 30`:''}</span></div>${sparkline(s.slice(-12).map(m=>m.seguidores))}</button>`}).join('');
  const sel=S.meta.cuentasRed.find(c=>c.id===S.metSel)||S.meta.cuentasRed[0];
  const serie=seguidores(sel.id).map(m=>({x:m.fecha,y:m.seguidores}));
  const ultIG=id=>{const s=seguidores(id);return s.length?s[s.length-1].seguidores:0};
  const comp=[{label:'Centenaria',v:ultIG('ig-centenaria'),own:true},{label:'LaTiNa',v:ultIG('ig-latina'),own:true},...S.meta.cuentasCompetencia.map(c=>({label:c.nombre,v:ultIG(c.id),tip:`${c.nombre} ${c.usuario}: ${fmt(ultIG(c.id))}`}))].sort((a,b)=>b.v-a.v);
  return `${head('Métricas','Seguidores de cada cuenta. Cargalos una vez por semana acá o desde el bot con /seg.')}
  <form class="card" id="carga-met"><div class="card-h"><h2>Cargar seguidores</h2><input class="f" type="date" id="met-fecha" value="${hoy}" aria-label="Fecha"></div>
    <div class="g3">${S.meta.cuentasRed.map(c=>{const s=seguidores(c.id);const u=s[s.length-1];return `<label style="display:grid;gap:5px"><span class="row">${marcaChip(c.marca)}<span class="small muted">${esc(c.red)}</span></span><input class="f num" id="met-${c.id}" data-met-in="${c.id}" inputmode="numeric" placeholder="${u?fmt(u.seguidores):'seguidores'}"></label>`}).join('')}</div>
    <div class="row"><button class="btn primary">Guardar</button><span class="small muted">Dejá vacío lo que no cambió.</span></div></form>
  <div class="g3">${tiles}</div>
  <section class="card"><div class="card-h"><h2>${esc(sel.red)} · ${esc(S.meta.marcas[sel.marca])}</h2><span class="small muted">Tocá una cuenta arriba para cambiar el gráfico</span></div>${lineChart(serie)}</section>
  <section class="card"><div class="card-h"><h2>Instagram contra la competencia</h2><span class="small muted">Las de la competencia son del 4-oct (Sara es la cuenta uruguaya)</span></div>${hBars(comp)}
    <details><summary class="small muted" style="cursor:pointer">Actualizar seguidores de la competencia</summary><form id="carga-comp" class="g3" style="margin-top:12px">${S.meta.cuentasCompetencia.map(c=>`<label style="display:grid;gap:5px"><span class="small"><b>${esc(c.nombre)}</b> <span class="muted">${esc(c.usuario)}</span></span><input class="f num" id="met-${c.id}" data-met-in="${c.id}" inputmode="numeric" placeholder="${ultIG(c.id)?fmt(ultIG(c.id)):'sin dato'}"></label>`).join('')}<div><button class="btn">Guardar</button></div></form></details></section>`;
}

/* ===== IDEAS ===== */
function proximosDias(){const l=[];let d=new Date();while(l.length<10){const f=iso(d);const p=posteo(f);if(p&&p.aCargo!=='Franco')l.push([f,`${corta(f)} · ${S.meta.marcas[p.marca]}${p.tema?' (ocupado)':''}`]);d=addDays(d,1)}return l}
function vIdeas(){
  const filtro={abiertas:i=>i.estado==='nueva'||i.estado==='elegida',todas:()=>true,usadas:i=>i.estado==='usada'||i.estado==='descartada'}[S.filtroIdea];
  const lista=de('idea').filter(filtro).sort((a,b)=>String(b.creado).localeCompare(String(a.creado)));
  const dias=proximosDias().map(([f,t])=>`<option value="${f}">${esc(t)}</option>`).join('');
  const gen=S.ia?`<form class="card" id="gen-ideas"><div class="card-h"><h2>Generar ideas con Claude</h2></div>
    <p class="small muted">Busca qué está funcionando, lee Saber y lo que ya publicaste, y no repite. Tarda uno o dos minutos.</p>
    <div class="row"><select class="f" id="gi-marca" aria-label="Marca"><option value="ambas">Las dos marcas</option><option value="latina">LaTiNa</option><option value="centenaria">Centenaria</option></select>
    <select class="f" id="gi-cant" aria-label="Cantidad"><option>5</option><option selected>8</option><option>12</option></select>
    <input class="f" id="gi-foco" style="flex:1" placeholder="Foco: distribuidores, tienda, Día del Mate, verano…" aria-label="Foco">
    <button class="btn primary" ${S.busy.ideas?'disabled':''}>${S.busy.ideas?'<span class="spin"></span> Pensando':'Generar'}</button></div>
    ${S.ideasResumen?`<details><summary class="small muted">Lo que encontró</summary><div class="pre" style="margin-top:8px">${esc(S.ideasResumen)}</div></details>`:''}</form>`:'';
  const franco=S.rol==='franco';
  const anotar=franco?`<form class="card" id="nueva-idea"><h2>Anotar una idea</h2>
    <input class="f" id="ni-txt" placeholder="Qué se te ocurrió" aria-label="Idea">
    <textarea class="f" id="ni-desc" rows="2" placeholder="Más detalle (opcional): qué se muestra, para qué marca, de dónde salió" aria-label="Detalle"></textarea>
    <div class="row"><select class="f" id="ni-marca" aria-label="Marca"><option value="ambas">Las dos marcas</option><option value="centenaria">Centenaria</option><option value="latina">LaTiNa</option><option value="cente-azul">Cente Azul</option></select><button class="btn primary">Anotar</button></div></form>`
    :`<form class="add" id="nueva-idea"><input id="ni-txt" placeholder="Anotar una idea y Enter" aria-label="Nueva idea"></form>`;
  return `${head('Ideas',franco?'Lo que se te ocurra para las redes. Quedan anotadas a tu nombre y Lautaro las ve.':'Las tuyas, las de Franco, las del bot y las que salen de Saber. Cada una se puede mandar a un día del calendario.')}
  ${franco?'':gen}${anotar}
  <div class="row between"><span class="count">${lista.length} ideas</span><select class="f" id="filtro-idea" aria-label="Filtro"><option value="abiertas" ${S.filtroIdea==='abiertas'?'selected':''}>Nuevas y elegidas</option><option value="usadas" ${S.filtroIdea==='usadas'?'selected':''}>Usadas y descartadas</option><option value="todas" ${S.filtroIdea==='todas'?'selected':''}>Todas</option></select></div>
  <div class="gauto">${lista.length?lista.map(i=>`<article class="card idea ${i.estado}" data-iid="${i.id}">
    <div class="card-h"><div class="row">${marcaChip(i.marca)}${i.autor==='franco'&&!franco?'<span class="chip doing">Franco</span>':''}${i.formato?`<span class="chip">${esc(i.formato)}</span>`:''}${i.pilar?`<span class="chip">${esc(i.pilar)}</span>`:''}</div>${delBtn(i.id)}</div>
    <h3>${esc(i.titulo)}</h3>${i.descripcion?`<p>${esc(i.descripcion)}</p>`:''}${i.porque?`<p class="porque">${esc(i.porque)}</p>`:''}
    <div class="row between"><select class="f" id="ie-${i.id}" data-if="estado" aria-label="Estado">${IDEA_EST.map(([k,t])=>`<option value="${k}" ${i.estado===k?'selected':''}>${t}</option>`).join('')}</select>
    ${franco?'':`<span class="row"><select class="f" id="iu-${i.id}" aria-label="Día">${dias}</select><button class="btn sm" data-usar="${i.id}">Usar</button></span>`}</div>
    <span class="when">${i.autor==='franco'?(franco?'Anotada por vos':'Anotada por Franco'):esc(i.origen||'propia')} · ${corta(i.creado)}</span></article>`).join(''):`<p class="empty">${franco?'Todavía no anotaste ideas.':'No hay ideas en este filtro. En Saber hay 67 listas para copiar.'}</p>`}</div>`;
}

/* ===== COMPETENCIA ===== */
function vCompetencia(){
  const [slug,nombre]=COMPETIDORES.find(c=>c[0]===S.compSel)||COMPETIDORES[0];
  const doc=de('saber').find(d=>d.slug==='competencia-'+slug);
  const obs=de('obs').filter(o=>o.competidor===nombre).sort((a,b)=>String(b.creado).localeCompare(String(a.creado)));
  return `${head('Competencia','Fichas investigadas el 4-oct-2026 y lo que vayas viendo.',`<button class="btn" data-verdoc="competencia-resumen">Cuadro comparativo</button>`)}
  <div class="tabs">${COMPETIDORES.map(([s,n])=>`<button class="btn sm ${s===S.compSel?'primary':''}" data-comp="${s}">${n}</button>`).join('')}</div>
  <div class="docs" style="grid-template-columns:minmax(0,1fr) 360px">
    <article class="card doc-wrap">${doc?`<div class="doc" data-md>${esc(doc.cuerpo)}</div>`:`<p class="empty">Falta la ficha de ${esc(nombre)}.</p>`}</article>
    <aside style="display:grid;gap:14px;align-content:start">
      <form class="card" id="nueva-obs"><h3>Lo que viste de ${esc(nombre)}</h3><textarea class="f" id="obs-txt" rows="3" placeholder="Un posteo, un precio en góndola, un influencer, un link…" aria-label="Observación"></textarea>
        <div class="row between"><button class="btn sm">Guardar</button>${S.ia?`<button type="button" class="btn sm primary" id="obs-ia" ${S.busy.comp?'disabled':''}>${S.busy.comp?'<span class="spin"></span> Buscando':'Actualizar con Claude'}</button>`:''}</div></form>
      ${obs.map(o=>`<div class="card"><div class="card-h"><span class="when">${esc(o.fecha||corta(o.creado))} · ${esc(o.origen||'propia')}</span>${delBtn(o.id)}</div><div class="pre">${esc(o.texto)}</div></div>`).join('')}
    </aside></div>`;
}

/* ===== SABER ===== */
function vSaber(){
  const docs=de('saber').sort((a,b)=>(a.orden??99)-(b.orden??99)||String(a.titulo).localeCompare(String(b.titulo)));
  if(!S.doc&&docs.length)S.doc=docs[0].slug;
  const d=de('saber').find(x=>x.slug===S.doc);
  return `${head('Saber','La base de conocimiento: las marcas, el mate, el mercado, la competencia. Es lo que lee Claude para responder.')}
  <div class="docs"><nav class="doclist" aria-label="Documentos">${docs.map(x=>`<button data-doc="${esc(x.slug)}" aria-current="${x.slug===S.doc}">${esc(x.titulo)}</button>`).join('')}<button data-nuevodoc="1">+ Documento nuevo</button></nav>
    <article class="card doc-wrap">${d?(S.editDoc?`<input class="f" id="ed-tit" value="${esc(d.titulo)}" aria-label="Título"><textarea class="f" id="ed-cuerpo" rows="26" aria-label="Contenido">${esc(d.cuerpo)}</textarea><div class="row"><button class="btn primary" id="ed-guardar">Guardar</button><button class="btn" id="ed-cancelar">Cancelar</button></div>`
      :`<div class="card-h"><span class="when">Actualizado ${corta(d.actualizado)}</span><button class="btn sm" id="ed-abrir">Editar</button></div><div class="doc" data-md>${esc(d.cuerpo)}</div>`):'<p class="empty">No hay documentos.</p>'}</article></div>`;
}

/* ===== PREGUNTAR ===== */
function vPreguntar(){
  if(!S.ia)return `${head('Preguntar','')}<div class="card"><h3>Falta conectar la API de Claude</h3><p class="muted">Cuando cargues la clave en Vercel, acá le podés preguntar cualquier cosa: sabe todo lo que hay en Saber y Competencia, ve tus tareas y busca en la web. Mientras tanto, pedímelo en Claude Code.</p></div>`;
  return `${head('Preguntar','Sabe lo que hay en Saber y Competencia, ve tus tareas y busca en la web.')}
  <form class="card" id="preg"><textarea class="f" id="preg-txt" rows="3" placeholder="¿Qué precio tiene Canarias hoy? · Armame un guion de reel sobre el padrón uruguayo · ¿Cómo le escribo a un distribuidor de Paraná?" aria-label="Pregunta"></textarea>
    <div class="row"><button class="btn primary" ${S.busy.preg?'disabled':''}>${S.busy.preg?'<span class="spin"></span> Pensando':'Preguntar'}</button></div></form>
  ${S.chat.map((c,n)=>`<div class="card"><span class="label">Pregunta</span><b>${esc(c.q)}</b>
    ${c.a?`<div class="pre">${esc(c.a)}</div><div class="row"><button class="btn sm" data-guardar-resp="${n}">Guardar en Saber</button><button class="btn sm" data-bandeja-resp="${n}">A la bandeja</button></div>`:c.err?`<span class="chip bad">${esc(c.err)}</span>`:'<span class="muted"><span class="spin"></span> Buscando…</span>'}</div>`).join('')}`;
}

/* ===== BANDEJA ===== */
function vBandeja(){
  const notas=de('nota').filter(n=>!n.archivada).sort((a,b)=>String(b.creado).localeCompare(String(a.creado)));
  const opsF=S.meta.frentes.map(f=>`<option value="${f.id}">${f.nombre}</option>`).join('');
  return `${head('Bandeja','Lo que anotás acá o le mandás al bot. Pasalo a tarea, contacto o idea, o archivalo.')}
  <form class="card" id="captura"><div class="add"><input id="cap-txt" placeholder="Anotá algo rápido" aria-label="Nota rápida"><button class="btn primary">Anotar</button></div></form>
  <div style="display:grid;gap:12px">${notas.length?notas.map(n=>`<div class="card" data-nota="${n.id}">
    <div class="card-h"><span class="when">${corta(n.creado)} · ${esc(n.origen||'panel')}${n.de?' · de '+esc(n.de):''}</span>${delBtn(n.id)}</div>
    <div class="pre" style="color:var(--fg)">${esc(n.texto)}</div>
    <div class="row"><select class="f" id="nf-${n.id}" aria-label="Frente">${opsF}</select><button class="btn sm" data-a="tarea">A tarea</button><button class="btn sm" data-a="contacto">A contacto</button><button class="btn sm" data-a="idea">A idea</button><button class="btn sm ghost" data-a="archivar">Archivar</button></div></div>`).join('')
    :'<div class="card"><p class="empty">La bandeja está vacía. Mandale algo al bot de Telegram y aparece acá.</p></div>'}</div>`;
}

/* ===== CONTACTOS ===== */
function waLink(tel){const n=String(tel||'').replace(/\D/g,'');if(!n)return'';const full=n.startsWith('54')?n:'549'+n.replace(/^0/,'');return `<a class="wa" href="https://wa.me/${full}" target="_blank" rel="noopener">WhatsApp</a>`}
function vContactos(){
  const lista=de('contacto').filter(c=>S.filtroRubro==='todos'||c.rubro===S.filtroRubro).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)));
  const sel=(id,f,val,ops)=>`<select id="${id}" data-kf="${f}">${ops.map(([k,t])=>`<option value="${k}" ${val===k?'selected':''}>${t}</option>`).join('')}</select>`;
  const estOps=Object.entries(S.meta.estadosContacto);const mOps=[['ambas','Las dos'],['latina','LaTiNa'],['centenaria','Centenaria']];
  return `${head('Contactos','Influencers, creadores UGC, distribuidores, proveedores y la gente de Nahuel.',`<select class="f" id="filtro-rubro" aria-label="Filtrar"><option value="todos">Todos los rubros</option>${RUBROS.map(([k,t])=>`<option value="${k}" ${S.filtroRubro===k?'selected':''}>${t}</option>`).join('')}</select>`)}
  <div class="tw"><table><thead><tr><th style="width:17%">Nombre / cuenta</th><th style="width:14%">Rubro</th><th style="width:10%">Marca</th><th style="width:14%">Teléfono</th><th style="width:9%">Seguidores</th><th style="width:13%">Estado</th><th>Nota</th><th style="width:44px"></th></tr></thead><tbody>
  ${lista.map(c=>`<tr data-kid="${c.id}"><td><input id="kn-${c.id}" data-kf="nombre" value="${esc(c.nombre)}" aria-label="Nombre"></td><td>${sel('kr-'+c.id,'rubro',c.rubro,RUBROS)}</td><td>${sel('km-'+c.id,'marca',c.marca,mOps)}</td>
    <td><input id="kt-${c.id}" data-kf="telefono" value="${esc(c.telefono)}" aria-label="Teléfono"> ${waLink(c.telefono)}</td><td><input id="ks-${c.id}" data-kf="seguidores" value="${esc(c.seguidores)}" aria-label="Seguidores"></td>
    <td>${['influencer','ugc'].includes(c.rubro)?sel('ke-'+c.id,'estado',c.estado,estOps):''}</td><td><input id="kx-${c.id}" data-kf="nota" value="${esc(c.nota)}" aria-label="Nota"></td><td>${delBtn(c.id)}</td></tr>`).join('')}
  <tr class="nuevo"><td><input id="nc-nombre" placeholder="Nombre o @cuenta" aria-label="Nombre"></td><td><select id="nc-rubro" aria-label="Rubro">${RUBROS.map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select></td>
    <td><select id="nc-marca" aria-label="Marca">${mOps.map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select></td><td><input id="nc-tel" placeholder="343 4…" aria-label="Teléfono"></td><td><input id="nc-seg" placeholder="12k" aria-label="Seguidores"></td><td></td>
    <td><input id="nc-nota" placeholder="Quién es, de dónde salió" aria-label="Nota"></td><td><button class="btn sm primary" id="nc-add">Sumar</button></td></tr></tbody></table></div>`;
}

/* ===== eventos ===== */
document.addEventListener('submit',async e=>{
  const f=e.target;e.preventDefault();
  if(f.id==='login'){const pin=$('pin').value.trim();if(!pin)return;$('login-msg').textContent='Entrando…';try{await api('POST','/api/entrar',{pin});await cargar()}catch(err){$('login-msg').textContent=err.message}return}
  if(f.id==='captura'){const v=$('cap-txt').value.trim();if(!v)return;$('cap-txt').value='';await nuevo('nota',{texto:v,origen:'panel',archivada:false});status('Anotado en la bandeja');return}
  if(f.classList.contains('add')&&f.dataset.frente){const inp=f.querySelector('input');const v=inp.value.trim();if(!v)return;inp.value='';await nuevo('tarea',{frente:f.dataset.frente,texto:v,estado:'pendiente',deNahuel:false,hechoEn:null});$('add-'+f.dataset.frente)?.focus();return}
  if(f.id==='nueva-idea'){const v=$('ni-txt').value.trim();if(!v){$('ni-txt').focus();return}
    const datos={titulo:v,marca:$('ni-marca')?.value||'ambas',estado:'nueva',origen:S.rol==='franco'?'Franco':'propia'};const d=$('ni-desc')?.value.trim();if(d)datos.descripcion=d;
    $('ni-txt').value='';if($('ni-desc'))$('ni-desc').value='';await nuevo('idea',datos);return}
  if(f.id==='nueva-obs'){const v=$('obs-txt').value.trim();if(!v)return;$('obs-txt').value='';const nombre=COMPETIDORES.find(c=>c[0]===S.compSel)[1];await nuevo('obs',{competidor:nombre,texto:v,origen:'propia',fecha:hoyISO()});return}
  if(f.id==='nuevo-evento'){const titulo=$('ev-tit').value.trim(),fecha=$('ev-fecha').value;if(!titulo||!fecha){aviso('error','Falta el nombre o la fecha del evento');return}
    const r=await nuevo('evento',{titulo,fecha,marca:$('ev-marca').value,lugar:$('ev-lugar').value.trim()});await cargar();
    // recién creado: se abre para cargarle las tareas
    if(r){S.evAbierto=r.id;render()}return}
  if(f.dataset.formPaso){const id=f.dataset.formPaso;const texto=$(id+'-t').value.trim();if(!texto){$(id+'-t').focus();return}
    const datos={texto,fecha:$(id+'-f').value||null,quien:$(id+'-q').value,hecho:false};const ev=f.dataset.evento||$(id+'-e')?.value;if(ev)datos.eventoId=ev;
    $(id+'-t').value='';await nuevo('paso',datos);$(id+'-t')?.focus();return}
  if(f.id==='carga-met'||f.id==='carga-comp'){
    const fecha=f.id==='carga-met'?$('met-fecha').value||hoyISO():hoyISO();let n=0;
    for(const inp of f.querySelectorAll('[data-met-in]')){const v=nmb(inp.value.replace(/k$/i,'000'));if(!v)continue;n++;await porClave('metrica',`${inp.dataset.metIn}_${fecha}`,{cuenta:inp.dataset.metIn,fecha,seguidores:v})}
    status(n?`${n} cuentas guardadas`:'No cargaste ningún número');return;
  }
  if(f.id==='gen-ideas'){S.busy.ideas=true;render();
    try{const r=await api('POST','/api/ia',{modo:'ideas',marca:$('gi-marca').value,cantidad:$('gi-cant').value,foco:$('gi-foco').value});S.regs.push(...r.ideas);S.ideasResumen=r.resumen;S.filtroIdea='abiertas';status(`${r.ideas.length} ideas nuevas`)}catch(err){status('No salió: '+err.message)}
    S.busy.ideas=false;render();return}
  if(f.id==='preg'){const q=$('preg-txt').value.trim();if(!q)return;$('preg-txt').value='';const item={q};S.chat.unshift(item);S.busy.preg=true;render();
    try{const r=await api('POST','/api/ia',{modo:'pregunta',texto:q});item.a=r.texto}catch(err){item.err=err.message}S.busy.preg=false;render();return}
});

document.addEventListener('click',async e=>{
  const t=e.target.closest('button,[data-vista]');if(!t)return;
  if(t.classList.contains('aviso-x')){cerrarAviso(t.closest('.aviso-w'));return}
  if(t.dataset.ev){S.evAbierto=t.dataset.ev;S.armed=null;return render()}
  if(t.id==='hist-recargar'){S.hist=null;return render()}
  if(t.dataset.restaurar){const el=aviso('guardando','Recuperando…');
    try{const r=await api('POST','/api/historial',{restaurar:t.dataset.restaurar});resolverAviso(el,'ok',`Recuperado: ${nombreDe(r.tipo,r)||TIPO_NOMBRE[r.tipo]}`);S.hist=null;await cargar()}
    catch(e){resolverAviso(el,'error',e.message)}return}
  if(t.hasAttribute('data-cerrar-ev')&&t.tagName==='BUTTON')return cerrarEvento();
  if(t.dataset.nuevoEv){S.vista='calendario';S.calVista='semana';render();$('ev-tit')?.scrollIntoView({block:'center'});$('ev-tit')?.focus();return}
  if(t.dataset.plantilla){const e=buscar(S.evAbierto);if(!e)return;const [nombre,pasos]=PLANTILLAS[t.dataset.plantilla];
    const el=aviso('guardando',`Cargando las tareas de «${nombre}»…`);let n=0;
    for(const [d,texto] of pasos)if(await nuevo('paso',{texto,fecha:iso(addDays(parse(e.fecha),d)),quien:S.rol,hecho:false,eventoId:e.id},{silencioso:true}))n++;
    resolverAviso(el,n===pasos.length?'ok':'error',n===pasos.length?`${n} tareas de «${nombre}» guardadas en la base. Cambiá el responsable donde haga falta.`:`Se guardaron ${n} de ${pasos.length} tareas. Revisá cuáles faltan.`);return}
  if(t.dataset.borrarEv){const id=t.dataset.borrarEv;if(!armar(id))return;S.evAbierto=null;
    for(const p of pasosDeEvento(id))await quitar(p.id);await quitar(id);await cargar();return}
  if(t.dataset.vista){if(t.dataset.vista==='historial')S.hist=null;S.vista=t.dataset.vista;S.editDoc=false;try{localStorage.setItem('gn-vista',S.vista)}catch(err){}render();window.scrollTo(0,0);return}
  if(t.id==='exportar'||t.id==='exportar-m')return abrirReporte();
  if(t.id==='prev'){semana=addDays(semana,-7);return render()}
  if(t.id==='next'){semana=addDays(semana,7);return render()}
  if(t.id==='hoy'){semana=semanaInicial();return render()}
  if(t.id==='mprev'||t.id==='mnext'){mesCal=new Date(mesCal.getFullYear(),mesCal.getMonth()+(t.id==='mnext'?1:-1),1);return render()}
  if(t.id==='mhoy'){const d=new Date();mesCal=new Date(d.getFullYear(),d.getMonth(),1);return render()}
  if(t.dataset.calv){S.calVista=t.dataset.calv;try{localStorage.setItem('gn-cal',S.calVista)}catch(err){}
    if(S.calVista==='mes'){const d=addDays(semana,2);mesCal=new Date(d.getFullYear(),d.getMonth(),1)}return render()}
  if(t.dataset.irsemana){semana=lunes(parse(t.dataset.irsemana));S.calVista='semana';S.vista='calendario';try{localStorage.setItem('gn-cal','semana')}catch(err){}render();window.scrollTo(0,0);return}
  if(t.id==='salir'||t.id==='salir-m'){try{await api('DELETE','/api/entrar')}catch(err){}S.logueado=false;S.regs=[];return render()}
  if(t.dataset.del){if(armar(t.dataset.del)){const ev=buscar(t.dataset.del)?.tipo==='evento';await quitar(t.dataset.del);if(ev)cargar()}return}
  if(t.dataset.toggle){S.open[t.dataset.toggle]=!S.open[t.dataset.toggle];return render()}
  if(t.dataset.diario){const hoy=hoyISO();const d=S.regs.find(r=>r.tipo==='diario'&&r.clave===hoy)||{};return porClave('diario',hoy,{fecha:hoy,[t.dataset.diario]:!d[t.dataset.diario]})}
  const dia=t.closest('[data-fecha]');
  if(dia&&(t.dataset.eje||t.dataset.est||t.dataset.red)){const f=dia.dataset.fecha;const p=posteo(f);const c={marca:p.marca,aCargo:p.aCargo,fecha:f};
    if(t.dataset.eje)c.eje=p.eje===t.dataset.eje?null:t.dataset.eje;
    if(t.dataset.est)c.estado=t.dataset.est;
    if(t.dataset.red)c.redes={...(p.redes||{}),[t.dataset.red]:!p.redes?.[t.dataset.red]};
    if(c.estado==='publicado'&&!Object.values(p.redes||{}).some(Boolean))c.redes=Object.fromEntries((S.meta.redes[p.marca]||[]).map(r=>[r,true]));
    return porClave('posteo',f,c,vistoAntes('posteo',f,Object.keys(c).filter(k=>!['marca','aCargo','fecha'].includes(k))))}
  if(t.dataset.act){const li=t.closest('.item');const it=buscar(li.dataset.id);if(!it)return;
    if(t.dataset.act==='estado')return cambiar(it.id,{estado:it.estado==='en curso'?'pendiente':'en curso'});
    if(t.dataset.act==='nahuel')return cambiar(it.id,{deNahuel:!it.deNahuel});return}
  if(t.dataset.a){const card=t.closest('[data-nota]');const n=buscar(card.dataset.nota);if(!n)return;
    if(t.dataset.a==='tarea')await nuevo('tarea',{frente:$('nf-'+n.id).value,texto:n.texto,estado:'pendiente',deNahuel:false,hechoEn:null});
    if(t.dataset.a==='contacto'){const tel=(n.texto.match(/\+?\d[\d\s-]{7,}\d/)||[''])[0];await nuevo('contacto',{nombre:n.de||n.texto.replace(tel,'').replace(/[:\-]\s*$/,'').trim().slice(0,60),telefono:tel,rubro:'otro',marca:'ambas',estado:'encontrado',nota:n.texto})}
    if(t.dataset.a==='idea')await nuevo('idea',{titulo:n.texto.slice(0,140),descripcion:n.texto.length>140?n.texto:'',marca:'ambas',estado:'nueva',origen:'bandeja'});
    return cambiar(n.id,{archivada:true})}
  if(t.id==='nc-add'){const nombre=$('nc-nombre').value.trim();if(!nombre){$('nc-nombre').focus();return}
    await nuevo('contacto',{nombre,rubro:$('nc-rubro').value,marca:$('nc-marca').value,telefono:$('nc-tel').value.trim(),seguidores:$('nc-seg').value.trim(),nota:$('nc-nota').value.trim(),estado:'encontrado'});$('nc-nombre')?.focus();return}
  if(t.dataset.usar){const i=buscar(t.dataset.usar);const f=$('iu-'+i.id).value;const p=posteo(f);
    await porClave('posteo',f,{marca:p.marca,aCargo:p.aCargo,fecha:f,tema:i.titulo,ideaId:i.id},vistoAntes('posteo',f,['tema']));await cambiar(i.id,{estado:'elegida'});status('Quedó en el '+corta(f));return}
  if(t.id==='nueva-camp'){const ult=de('campana').sort((a,b)=>String(b.fin).localeCompare(String(a.fin)))[0];
    const ini=ult&&ult.fin>=hoyISO()?iso(addDays(parse(ult.fin),1)):hoyISO();const n=de('campana').length+1;
    await nuevo('campana',{nombre:`Distribuidores ${n}`,cuenta:'yerbamatelatina',eje:'distribucion',inicio:ini,fin:iso(addDays(parse(ini),6)),presupuesto:'',gasto:'',consultas:'',compras:'',nota:''});return}
  if(t.id==='ads-prev'||t.id==='ads-next'){const [y,m]=S.mesAds.split('-').map(Number);const d=new Date(y,m-1+(t.id==='ads-next'?1:-1),1);S.mesAds=`${d.getFullYear()}-${pad(d.getMonth()+1)}`;return render()}
  if(t.dataset.met){S.metSel=t.dataset.met;return render()}
  if(t.dataset.comp){S.compSel=t.dataset.comp;return render()}
  if(t.dataset.verdoc){S.vista='saber';S.doc=t.dataset.verdoc;return render()}
  if(t.id==='obs-ia'){const nombre=COMPETIDORES.find(c=>c[0]===S.compSel)[1];S.busy.comp=true;render();
    try{const r=await api('POST','/api/ia',{modo:'competidor',competidor:nombre});S.regs.push(r.obs);status('Análisis nuevo de '+nombre)}catch(err){status('No salió: '+err.message)}S.busy.comp=false;return render()}
  if(t.dataset.doc){S.doc=t.dataset.doc;S.editDoc=false;return render()}
  if(t.dataset.nuevodoc){const r=await nuevo('saber',{slug:'doc-'+Date.now(),titulo:'Documento nuevo',cuerpo:'# Documento nuevo\n\n',orden:50});if(r){S.doc=r.slug;S.editDoc=true;render()}return}
  if(t.id==='ed-abrir'){S.editDoc=true;return render()}
  if(t.id==='ed-cancelar'){S.editDoc=false;return render()}
  if(t.id==='ed-guardar'){const d=de('saber').find(x=>x.slug===S.doc);S.editDoc=false;return cambiar(d.id,{titulo:$('ed-tit').value.trim()||d.titulo,cuerpo:$('ed-cuerpo').value})}
  if(t.dataset.guardarResp){const c=S.chat[t.dataset.guardarResp];const r=await nuevo('saber',{slug:'resp-'+Date.now(),titulo:c.q.slice(0,70),cuerpo:`# ${c.q}\n\n${c.a}`,orden:80});if(r)status('Guardado en Saber');return}
  if(t.dataset.bandejaResp){const c=S.chat[t.dataset.bandejaResp];await nuevo('nota',{texto:`${c.q}\n\n${c.a}`,origen:'Claude',archivada:false});status('Mandado a la bandeja');return}
});

document.addEventListener('change',async e=>{
  const el=e.target;
  if(el.matches('[data-pchk]')){const id=el.closest('[data-pid]').dataset.pid;return cambiar(id,el.checked?{hecho:true,hechoEn:new Date().toISOString(),hechoPor:S.rol}:{hecho:false,hechoEn:null,hechoPor:null})}
  if(el.matches('[data-pq]')){const id=el.closest('[data-pid]').dataset.pid;return cambiar(id,{quien:el.value})}
  if(el.dataset.evf){const e=buscar(S.evAbierto);if(!e)return;const v=el.value.trim();if(el.dataset.evf!=='lugar'&&!v)return;await cambiar(e.id,{[el.dataset.evf]:v});if(el.dataset.evf==='fecha'||el.dataset.evf==='titulo')cargar().catch(()=>{});return}
  if(el.dataset.pf){const f=el.closest('[data-fecha]').dataset.fecha;const p=posteo(f);const v=el.value.trim();if(v===(p[el.dataset.pf]??''))return;
    return porClave('posteo',f,{marca:p.marca,aCargo:p.aCargo,fecha:f,[el.dataset.pf]:v},vistoAntes('posteo',f,[el.dataset.pf]))}
  if(el.dataset.uf){const s=el.closest('[data-ugc]');return porClave('ugc',s.dataset.ugc,{mes:s.dataset.ugc.slice(0,7),quien:s.dataset.quien,marca:s.dataset.marca,[el.dataset.uf]:el.value.trim()})}
  if(el.dataset.act==='check'){const id=el.closest('.item').dataset.id;return cambiar(id,el.checked?{estado:'hecho',hechoEn:new Date().toISOString()}:{estado:'pendiente',hechoEn:null})}
  if(el.dataset.act==='texto'){const id=el.closest('.item').dataset.id;const v=el.value.trim();if(v&&v!==buscar(id)?.texto)cambiar(id,{texto:v});return}
  if(el.dataset.cf){const id=el.closest('tr').dataset.cid;return cambiar(id,{[el.dataset.cf]:el.value.trim()})}
  if(el.dataset.kf){const id=el.closest('tr').dataset.kid;const c={[el.dataset.kf]:el.value.trim()};if(el.dataset.kf==='rubro'&&['influencer','ugc'].includes(el.value)&&!buscar(id).estado)c.estado='encontrado';return cambiar(id,c)}
  if(el.dataset.if){const id=el.closest('[data-iid]').dataset.iid;return cambiar(id,{[el.dataset.if]:el.value})}
  if(el.id==='filtro-rubro'){S.filtroRubro=el.value;return render()}
  if(el.id==='filtro-idea'){S.filtroIdea=el.value;return render()}
});
// Al cerrar el detalle se saca el foco primero: así el campo que se estaba
// editando dispara su "change" y se guarda antes de desaparecer.
function cerrarEvento(){document.activeElement?.blur?.();S.evAbierto=null;render()}
document.addEventListener('mousedown',e=>{if(e.target.matches?.('#modal-ev .modal'))cerrarEvento()});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&S.evAbierto){cerrarEvento();return}
  if(e.key==='Enter'&&e.target.matches('textarea.txt')){e.preventDefault();e.target.blur()}
  if(e.key==='Enter'&&e.target.closest('tr.nuevo')){e.preventDefault();$('nc-add').click()}
});

/* reporte: hoja A4 aparte, se descarga como PDF */
function abrirReporte(){window.open(`/reporte.html?rango=semana&lunes=${iso(S.vista==='calendario'?semana:lunes(new Date()))}`,'_blank')}

// "Escribiendo" = con el foco en un campo y habiendo tecleado hace menos de 15 s.
// Si el cursor quedó quieto en un campo, igual se traen los cambios del otro.
let ultimaTecla=0;
document.addEventListener('input',()=>{ultimaTecla=Date.now()});
function escribiendo(){const a=document.activeElement;return a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)&&Date.now()-ultimaTecla<15000}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.logueado&&!escribiendo())cargar().catch(()=>{})});
// Cada 30 s con la pestaña visible: así se ven los cambios de la otra persona. Con la pestaña oculta no consulta.
setInterval(()=>{if(!document.hidden&&S.logueado&&!escribiendo()&&!Object.values(S.busy).some(Boolean))cargar().catch(()=>{})},30000);
cargar().catch(()=>{S.logueado=false;render()});
