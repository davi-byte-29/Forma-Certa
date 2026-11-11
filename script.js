(() => {
const BASE = {
  big1:{c:'#ff3d6e',p:[[0,0],[4,0],[2,2]]},
  big2:{c:'#ff8a00',p:[[0,0],[2,2],[0,4]]},
  med: {c:'#ffe600',p:[[4,2],[4,4],[2,4]]},
  sm1: {c:'#00f58d',p:[[3,1],[4,0],[4,2]]},
  sm2: {c:'#00b8ff',p:[[1,3],[3,3],[2,2]]},
  sq:  {c:'#b44dff',p:[[3,1],[4,2],[3,3],[2,2]]},
  par: {c:'#6c7bff',p:[[0,4],[1,3],[3,3],[2,4]]}
};
const ORDER = ['big1','med','sq','sm1','par','big2','sm2'];
const TOTAL = 20, NS = 'http://www.w3.org/2000/svg';
const $ = s => document.querySelector(s), svg = $('#board');
const rnd = n => Math.floor(Math.random()*n), pick = a => a[rnd(a.length)];

// ---------- geometria ----------
const cen = p => [p.reduce((s,v)=>s+v[0],0)/p.length, p.reduce((s,v)=>s+v[1],0)/p.length];
const tf = (p,r,f,tx=0,ty=0) => { const a=r*Math.PI/4,c=Math.cos(a),s=Math.sin(a);
  return p.map(([x,y]) => { if(f) x=-x; return [x*c-y*s+tx, x*s+y*c+ty]; }); };
const lerp = (a,b,t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
function inside(q,p){ let r=false; for(let i=0,j=p.length-1;i<p.length;j=i++){
  const [xi,yi]=p[i],[xj,yj]=p[j];
  if((yi>q[1])!==(yj>q[1]) && q[0]<(xj-xi)*(q[1]-yi)/(yj-yi)+xi) r=!r; } return r; }
function samples(p){ const c=cen(p), o=[c]; p.forEach((v,i)=>{ const w=p[(i+1)%p.length];
  o.push(lerp(v,c,.2), lerp([(v[0]+w[0])/2,(v[1]+w[1])/2],c,.2)); }); return o; }
const overlap = (a,b) => samples(a).some(q=>inside(q,b)) || samples(b).some(q=>inside(q,a));
function segDist(m,u,v){ const dx=v[0]-u[0],dy=v[1]-u[1];
  let t=((m[0]-u[0])*dx+(m[1]-u[1])*dy)/(dx*dx+dy*dy); t=Math.max(0,Math.min(1,t));
  return Math.hypot(m[0]-u[0]-t*dx, m[1]-u[1]-t*dy); }
const edges = p => p.map((v,i)=>[v,p[(i+1)%p.length]]);
const mids = p => edges(p).map(([u,v])=>[(u[0]+v[0])/2,(u[1]+v[1])/2]);
const touch = (a,b) => mids(a).some(m=>edges(b).some(([u,v])=>segDist(m,u,v)<1e-6)) ||
                       mids(b).some(m=>edges(a).some(([u,v])=>segDist(m,u,v)<1e-6));

// ---------- gerador de formas (peças sempre encostadas por uma aresta) ----------
const bbox = p => { const xs=p.map(v=>v[0]), ys=p.map(v=>v[1]); return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]; };
const bbTouch = (a,b) => a[0]<=b[2]+1e-6 && b[0]<=a[2]+1e-6 && a[1]<=b[3]+1e-6 && b[1]<=a[3]+1e-6;
function generate(n){
  const end=Date.now()+80; // limite de tempo: nunca trava a tela
  while(Date.now()<end){
    const placed=[]; let ok=true;
    for(let i=0;i<n && ok;i++){
      const id=ORDER[i]; let got=null;
      for(let a=0;a<150 && !got;a++){
        let q=tf(BASE[id].p, rnd(8), Math.random()<.5), bb;
        if(placed.length){
          const v=pick(q), w=pick(pick(placed).poly);
          q=q.map(([x,y])=>[x+w[0]-v[0], y+w[1]-v[1]]); bb=bbox(q);
          const near=placed.filter(o=>bbTouch(bb,o.bb));
          if(!near.length || near.some(o=>overlap(q,o.poly)) || !near.some(o=>touch(q,o.poly))) continue;
        } else bb=bbox(q);
        got={id,poly:q,bb};
      }
      if(got) placed.push(got); else ok=false;
    }
    if(ok) return placed;
  }
  return ORDER.slice(0,n).map(id=>({id,poly:BASE[id].p}));
}

// ---------- dificuldade ----------
// 1-6: de 2 a 7 peças | 7-20: 7 peças, formas mais espalhadas, contorno interno some (11+),
// menos dicas e margem de acerto menor
const tier = () => level<=6?'Fácil':level<=12?'Médio':level<=17?'Difícil':'Mestre';
const hintsFor = l => l<=6?Infinity:l<=10?5:l<=15?3:l<=19?1:0;
function setLevel(l){ level=l; hintsLeft=hintsFor(l); load(); }
function updHint(){ const b=$('#bHint'); b.textContent=hintsLeft===Infinity?'Dica':'Dica ('+hintsLeft+')'; b.disabled=hintsLeft<=0; b.style.opacity=hintsLeft<=0?.4:1; }
function pickShape(n){
  const d=(level-1)/(TOTAL-1), K=n<4?1:5, c=[], end=Date.now()+150;
  while(c.length<K && (!c.length || Date.now()<end)){
    const r=generate(n), b=bbox(r.flatMap(x=>x.poly));
    c.push({r,a:(b[2]-b[0])*(b[3]-b[1])});
  }
  c.sort((x,y)=>x.a-y.a);
  return c[Math.round(d*(c.length-1))].r;
}

// ---------- estado ----------
let hintsLeft=Infinity, level=1, moves=0, pieces=[], sol=[], VB=[24,14], portrait=false, selected=null, done=false;
const el=(t,a,p=svg)=>{ const e=document.createElementNS(NS,t); for(const k in a) e.setAttribute(k,a[k]); p.appendChild(e); return e; };
const pts = p => p.map(v=>v[0].toFixed(3)+','+v[1].toFixed(3)).join(' ');
const worldPoly = pc => tf(pc.loc, pc.rot, pc.flip, pc.x, pc.y);

function load(){
  done=false; moves=0; selected=null; $('#win').classList.add('hidden');
  const br=svg.getBoundingClientRect(); portrait = br.height > br.width;
  VB = portrait ? [14,24] : [24,14];
  const zs = portrait ? {x:0,y:0,w:14,h:12.5} : {x:0,y:0,w:13.5,h:14};
  const zt = portrait ? {x:0,y:12.5,w:14,h:11.5} : {x:13.5,y:0,w:10.5,h:14};
  svg.setAttribute('viewBox',`0 0 ${VB[0]} ${VB[1]}`); svg.innerHTML=''; const d=el('defs',{}); const pt=el('pattern',{id:'grid',width:1,height:1,patternUnits:'userSpaceOnUse'},d); el('path',{d:'M1 0H0V1',fill:'none',stroke:'#12306a','stroke-width':.03},pt); el('rect',{width:'100%',height:'100%',fill:'url(#grid)','pointer-events':'none'});
  $('#lvlTxt').innerHTML='Nível '+level+' <small>'+tier()+'</small>'; updHint(); $('#badge').textContent=level+'/'+TOTAL; $('#prog').style.width=((level-1)/TOTAL*100)+'%'; $('#moves').textContent='Jogadas: 0';

  const n=Math.min(7,level+1), raw=pickShape(n);
  const all=raw.flatMap(r=>r.poly);
  const xs=all.map(v=>v[0]), ys=all.map(v=>v[1]);
  const bw=Math.max(...xs)-Math.min(...xs), bh=Math.max(...ys)-Math.min(...ys);
  const bx=(Math.max(...xs)+Math.min(...xs))/2, by=(Math.max(...ys)+Math.min(...ys))/2;
  const k=Math.min(1,(zs.w-1.5)/bw,(zs.h-1.5)/bh);
  const zc=[zs.x+zs.w/2, zs.y+zs.h/2];
  sol=raw.map(r=>({id:r.id, poly:r.poly.map(([x,y])=>[(x-bx)*k+zc[0],(y-by)*k+zc[1]])}));

  // divisória
  if(portrait) el('line',{x1:.5,x2:VB[0]-.5,y1:zt.y,y2:zt.y,class:'div'});
  else el('line',{x1:zt.x,x2:zt.x,y1:.5,y2:VB[1]-.5,class:'div'});
  // silhueta
  const guide=level<=10;
  if(!guide) sol.forEach(s=>el('polygon',{points:pts(s.poly),class:'silo'}));
  sol.forEach(s=>el('polygon',{points:pts(s.poly),class:guide?'sil':'silf'}));
  el('g',{id:'hint','pointer-events':'none'});

  // peças na bandeja
  const cols=portrait?4:2, rows=Math.ceil(n/cols);
  const order=raw.map((_,i)=>i).sort(()=>Math.random()-.5);
  pieces=raw.map((r,i)=>{
    const b=BASE[r.id].p, c=cen(b), slot=order[i];
    const pc={id:r.id, loc:b.map(([x,y])=>[(x-c[0])*k,(y-c[1])*k]),
      x:zt.x+(slot%cols+.5)*zt.w/cols, y:zt.y+(Math.floor(slot/cols)+.5)*zt.h/rows,
      rot:rnd(8), flip:r.id==='par' && Math.random()<.5};
    pc.el=el('polygon',{points:pts(pc.loc),fill:BASE[r.id].c});
    draw(pc); bind(pc); return pc;
  });
}
function draw(pc){ pc.el.setAttribute('transform',`translate(${pc.x.toFixed(3)} ${pc.y.toFixed(3)}) rotate(${pc.rot*45}) scale(${pc.flip?-1:1} 1)`); }

// ---------- arrastar / girar ----------
function toSvg(e){ const p=svg.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; const q=p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x,q.y]; }
function select(pc){ pieces.forEach(p=>p.el.classList.toggle('sel',p===pc)); selected=pc; }
function bind(pc){
  pc.el.addEventListener('pointerdown',e=>{
    if(done || e.button>0) return; e.preventDefault();
    svg.appendChild(pc.el); select(pc);
    const id=e.pointerId, s=toSvg(e), off=[pc.x-s[0],pc.y-s[1]]; let moved=0, nx=pc.x, ny=pc.y, raf=0;
    const paintFrame=()=>{ raf=0; moved+=Math.hypot(nx-pc.x,ny-pc.y); pc.x=nx; pc.y=ny; draw(pc); };
    const mv=ev=>{ if(ev.pointerId!==id) return; const q=toSvg(ev);
      nx=Math.max(0,Math.min(VB[0],q[0]+off[0])); ny=Math.max(0,Math.min(VB[1],q[1]+off[1]));
      if(!raf) raf=requestAnimationFrame(paintFrame); };
    const up=ev=>{ if(ev.pointerId!==id) return;
      removeEventListener('pointermove',mv); removeEventListener('pointerup',up); removeEventListener('pointercancel',up);
      if(raf){ cancelAnimationFrame(raf); paintFrame(); }
      if(moved<.3){ pc.rot=(pc.rot+1)%8; draw(pc); }
      addMove(); check(); };
    addEventListener('pointermove',mv); addEventListener('pointerup',up); addEventListener('pointercancel',up);
  });
}
function addMove(){ moves++; $('#moves').textContent='Jogadas: '+moves; }

// ---------- verificação por pixels ----------
const R=10;
function paint(polys){ const c=document.createElement('canvas'); c.width=VB[0]*R; c.height=VB[1]*R;
  const g=c.getContext('2d',{willReadFrequently:true}); g.fillStyle='#000';
  polys.forEach(p=>{ g.beginPath(); p.forEach(([x,y],i)=>i?g.lineTo(x*R,y*R):g.moveTo(x*R,y*R)); g.closePath(); g.fill(); });
  return g.getImageData(0,0,c.width,c.height).data; }
function check(){
  if(done) return;
  const T=paint(sol.map(s=>s.poly)), U=paint(pieces.map(worldPoly));
  let tot=0, cov=0, spill=0;
  for(let i=3;i<T.length;i+=4){ const t=T[i]>128, u=U[i]>128; if(t){tot++; if(u)cov++;} else if(u) spill++; }
  const d=(level-1)/(TOTAL-1);
  if(cov/tot>=.93+.025*d && spill/tot<=.08-.03*d) win();
}
function win(){
  done=true; $('#prog').style.width=(level/TOTAL*100)+'%'; pieces.forEach(p=>p.el.classList.remove('sel'));
  const last=level===TOTAL;
  $('#winT').textContent=last?'Você venceu!':'Forma certa!';
  $('#winP').textContent=(last?'Todos os '+TOTAL+' níveis concluídos':'Nível '+level+' concluído')+' em '+moves+' jogadas.';
  $('#bNext').textContent=last?'Jogar de novo':'Próximo nível';
  $('#win').classList.remove('hidden');
}

// ---------- botões ----------
$('#bRot').onclick=()=>{ if(!selected||done) return; selected.rot=(selected.rot+1)%8; draw(selected); addMove(); check(); };
$('#bFlip').onclick=()=>{ if(!selected||done) return; selected.flip=!selected.flip; draw(selected); addMove(); check(); };
$('#bHint').onclick=()=>{ if(done||hintsLeft<=0) return; hintsLeft--; updHint(); const s=pick(sol), h=$('#hint');
  h.innerHTML=''; el('polygon',{points:pts(s.poly),fill:BASE[s.id].c,opacity:.7,stroke:'#fff','stroke-width':.08},h);
  clearTimeout(h._t); h._t=setTimeout(()=>h.innerHTML='',1800); };
$('#bNew').onclick=load;
$('#home').onclick=()=>setLevel(1);
$('#bNext').onclick=()=>setLevel(level===TOTAL?1:level+1);
let rt; new ResizeObserver(()=>{ clearTimeout(rt); rt=setTimeout(()=>{ const b=svg.getBoundingClientRect(); if(b.width&&((b.height>b.width)!==portrait)) load(); },150); }).observe(svg);
setLevel(1);
})();
