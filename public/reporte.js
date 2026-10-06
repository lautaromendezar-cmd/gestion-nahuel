const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS=['dom','lun','mar','mié','jue','vie','sáb'];
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const [y,m,d]=String(s).slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const corta=s=>{if(!s)return'';const d=parse(s);return `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`};
const fmt=n=>(Number(n)||0).toLocaleString('es-AR');
const pesos=n=>'$'+Math.round(Number(n)||0).toLocaleString('es-AR');
const RED={ig:'Instagram',fb:'Facebook',tt:'TikTok'};
const EST={pendiente:'Pendiente',editando:'Editando',listo:'Listo',publicado:'Publicado'};
function lunes(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
const q=new URLSearchParams(location.search);
let rango=q.get('rango')==='mes'?'mes':'semana';
let base=q.get('lunes')?parse(q.get('lunes')):lunes(new Date());

function spark(v){if(v.length<2)return'';const mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1;const p=v.map((x,i)=>`${(i/(v.length-1)*96+2).toFixed(1)},${(26-((x-mn)/r)*22).toFixed(1)}`).join(' ');return `<svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="${p}" fill="none" stroke="#141416" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`}
function barras(items){
  const W=600,H=150,L=34,T=14,B=26;const mx=Math.max(...items.map(i=>i.v),1);const step=(W-L)/items.length;const bw=Math.min(46,step-16);
  const Y=v=>T+(1-v/mx)*(H-T-B);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Consultas por campaña"><line class="grid" x1="${L}" x2="${W}" y1="${Y(0)}" y2="${Y(0)}"/>
  ${items.map((it,k)=>{const x=L+k*step+(step-bw)/2,h=Y(0)-Y(it.v);return `${h>0?`<path class="b" d="M${x},${Y(0)} v-${Math.max(h-4,0)} a4,4 0 0 1 4,-4 h${bw-8} a4,4 0 0 1 4,4 v${Math.max(h-4,0)} z"/>`:''}<text class="vl" x="${x+bw/2}" y="${Y(it.v)-5}" text-anchor="middle">${fmt(it.v)}</text><text x="${x+bw/2}" y="${H-8}" text-anchor="middle">${esc(it.l)}</text>`}).join('')}</svg>`;
}

async function cargar(){
  $('b-semana').classList.toggle('on',rango==='semana');$('b-mes').classList.toggle('on',rango==='mes');
  history.replaceState(null,'',`?rango=${rango}&lunes=${iso(base)}`);
  $('hoja').innerHTML='<p class="cargando">Armando el reporte…</p>';
  const r=await fetch(`/api/reporte?rango=${rango}&lunes=${iso(base)}`,{credentials:'same-origin'});
  if(r.status===401){location.href='/';return}
  const d=await r.json();
  if(!r.ok){$('hoja').innerHTML=`<p class="cargando">No se pudo armar: ${esc(d.error)}</p>`;return}
  $('per').textContent=d.titulo.charAt(0).toUpperCase()+d.titulo.slice(1);
  document.title=`Reporte ${d.titulo} · LaTiNa y Centenaria`;
  pintar(d);
}

function pintar(d){
  const lautaro=d.publicaciones.filter(p=>p.aCargo!=='Franco');
  const pub=lautaro.filter(p=>p.estado==='publicado').length;
  const mk=m=>`<span class="m ${m}">${esc(d.marcas[m]||m)}</span>`;
  const segs=d.seguidores.filter(s=>s.actual!=null);
  const ganados=segs.reduce((t,s)=>t+(s.inicio!=null?s.actual-s.inicio:0),0);
  const pubRows=d.publicaciones.map(p=>`<tr><td style="white-space:nowrap">${corta(p.fecha)}</td><td>${mk(p.marca)}${p.aCargo==='Franco'?'<div class="muted" style="font-size:7.5pt">Franco</div>':''}</td><td>${p.eje?esc(d.ejes[p.eje]):'<span class="muted">—</span>'}</td><td>${p.tema?esc(p.tema):'<span class="muted">Sin definir</span>'}</td><td>${p.redes.map(r=>RED[r]).join(', ')||'<span class="muted">—</span>'}</td><td><span class="e ${p.estado}">${EST[p.estado]||esc(p.estado)}</span></td></tr>`).join('');
  const ads=d.campanas.length?`<table><thead><tr><th>Campaña</th><th>Período</th><th>Eje</th><th class="n">Inversión</th><th class="n">Consultas</th><th class="n">$ / consulta</th><th class="n">Compras</th></tr></thead><tbody>
    ${d.campanas.map(c=>`<tr><td><b>${esc(c.nombre||'Campaña')}</b>${c.nota?`<div class="muted" style="font-size:8pt">${esc(c.nota)}</div>`:''}</td><td style="white-space:nowrap">${corta(c.inicio)} a ${corta(c.fin)}</td><td>${c.eje?esc(d.ejes[c.eje]):''}</td><td class="n">${pesos(c.gasto)}</td><td class="n">${fmt(c.consultas)}</td><td class="n">${c.consultas?pesos(c.gasto/c.consultas):'—'}</td><td class="n">${fmt(c.compras)}</td></tr>`).join('')}
    <tr class="tot"><td colspan="3">Total</td><td class="n">${pesos(d.ads.gasto)}</td><td class="n">${fmt(d.ads.consultas)}</td><td class="n">${d.ads.costoConsulta?pesos(d.ads.costoConsulta):'—'}</td><td class="n">${fmt(d.ads.compras)}</td></tr></tbody></table>
    ${d.campanas.length>1?barras(d.campanas.map(c=>({l:corta(c.inicio),v:c.consultas}))):''}`:'<p class="vacio">No hubo campañas en este período.</p>';
  const segRows=d.seguidores.map(s=>{const dl=s.actual!=null&&s.inicio!=null?s.actual-s.inicio:null;return `<tr><td>${mk(s.marca)}</td><td>${esc(s.red)}</td><td class="n"><b>${s.actual!=null?fmt(s.actual):'—'}</b></td><td class="n">${dl!=null?`<span class="delta ${dl>=0?'up':'down'}">${dl>=0?'+':''}${fmt(dl)}</span>`:'<span class="muted">—</span>'}</td><td>${spark(s.serie)}</td></tr>`}).join('');
  const lista=g=>g.length?'<div style="display:grid;gap:1.5mm">'+g.map(x=>`<div class="grp">${esc(x.frente)}</div><ul class="lista">${x.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`).join('')+'</div>':'<p class="vacio">Nada en este período.</p>';
  const ugc=d.ugc.length?`<ul class="lista">${d.ugc.map(u=>`<li><span><b>${esc(u.quien)}</b> · ${esc(d.marcas[u.marca]||u.marca)}: ${esc(u.titulo||'reel')} <span class="e ${u.estado==='publicado'?'publicado':''}">${esc(u.estado)}</span></span></li>`).join('')}</ul>`:'<p class="vacio">Sin reels cargados todavía.</p>';
  $('hoja').innerHTML=`
  <header class="cab"><div class="top"><div class="mk"><img src="/img/logo-latina.png" alt="LaTiNa"><img src="/img/logo-centenaria.png" alt="Centenaria">Redes Latina | Centenaria</div><span class="lbl">Reporte ${d.tipo==='mes'?'mensual':'semanal'}</span></div>
    <div><span class="lbl">Gestión de redes, contenido y publicidad</span><h1>Reporte de gestión</h1><div class="per">${esc(d.titulo.charAt(0).toUpperCase()+d.titulo.slice(1))}</div></div><div style="height:4mm"></div></header>
  <div class="cuerpo">
    <div class="kpis">
      <div class="kpi"><div class="l">Publicaciones</div><div class="v">${pub}<small> / ${lautaro.length}</small></div><div class="d">Centenaria y LaTiNa${d.publicaciones.some(p=>p.aCargo==='Franco')?' (sin Cente Azul)':''}</div></div>
      <div class="kpi"><div class="l">Inversión en Ads</div><div class="v">${pesos(d.ads.gasto)}</div><div class="d">${d.campanas.length} ${d.campanas.length===1?'campaña':'campañas'}</div></div>
      <div class="kpi"><div class="l">Consultas</div><div class="v">${fmt(d.ads.consultas)}</div><div class="d">${d.ads.costoConsulta?pesos(d.ads.costoConsulta)+' cada una':'por WhatsApp'}</div></div>
      <div class="kpi"><div class="l">Seguidores nuevos</div><div class="v">${segs.length?(ganados>=0?'+':'')+fmt(ganados):'—'}</div><div class="d">entre todas las cuentas</div></div>
    </div>
    <section><h2>Publicaciones</h2><table><thead><tr><th style="width:12%">Día</th><th style="width:15%">Marca</th><th style="width:13%">Eje</th><th>Contenido</th><th style="width:18%">Redes</th><th style="width:12%">Estado</th></tr></thead><tbody>${pubRows||'<tr><td colspan="6" class="vacio">Sin publicaciones en el período.</td></tr>'}</tbody></table></section>
    <section><h2>Publicidad en Meta</h2>${ads}</section>
    <div class="g2">
      <section><h2>Seguidores</h2><table><thead><tr><th>Marca</th><th>Red</th><th class="n">Hoy</th><th class="n">Variación</th><th></th></tr></thead><tbody>${segRows}</tbody></table></section>
      <section><h2>Reels UGC</h2>${ugc}</section>
    </div>
    <div class="g2"><section><h2>Lo que se hizo</h2>${lista(d.hechas)}</section><section><h2>En curso</h2>${lista(d.enCurso)}</section></div>
    ${d.espera.length?`<section class="pedido"><h2>Lo que necesitamos de ustedes</h2><ul class="lista">${d.espera.map(e=>`<li><span>${esc(e.texto)} <span class="muted">· ${esc(e.frente)}</span></span></li>`).join('')}</ul></section>`:''}
  </div>
  <footer class="pie"><span>Preparado por Lautaro Mendez · lautaromendez.com.ar</span><span>Generado el ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</span></footer>`;
}

$('b-semana').onclick=()=>{rango='semana';cargar()};
$('b-mes').onclick=()=>{rango='mes';cargar()};
$('prev').onclick=()=>{if(rango==='mes'){const d=new Date(base);d.setDate(15);d.setMonth(d.getMonth()-1);base=lunes(new Date(d.getFullYear(),d.getMonth(),1));base.setDate(base.getDate()+7)}else base.setDate(base.getDate()-7);cargar()};
$('next').onclick=()=>{if(rango==='mes'){const d=new Date(base);d.setDate(15);d.setMonth(d.getMonth()+1);base=lunes(new Date(d.getFullYear(),d.getMonth(),1));base.setDate(base.getDate()+7)}else base.setDate(base.getDate()+7);cargar()};
$('pdf').onclick=()=>window.print();
cargar();
