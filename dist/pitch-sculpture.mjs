// Lit tube mesh for the cover of the presentation stack.
if (typeof customElements !== 'undefined' && !customElements.get('pitch-sculpture')) {
class PitchSculpture extends HTMLElement {
  connectedCallback() {
    const canvas = this.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scene = this.closest('.pv-art');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const tau = Math.PI * 2;
    const point = t => [(1+.34*Math.cos(3*t))*Math.cos(2*t),(1+.34*Math.cos(3*t))*Math.sin(2*t),.55*Math.sin(3*t)];
    const unit = v => v.map(n => n/Math.hypot(...v));
    const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const rings=100, sides=16, vertices=[];
    for(let i=0;i<rings;i++){
      const t=i*tau/rings, p=point(t), q=point(t+.001);
      const tangent=unit(q.map((n,k)=>n-p[k]));
      const normal=unit(cross(tangent,[0,0,1])), side=cross(tangent,normal);
      for(let j=0;j<sides;j++){
        const a=j*tau/sides;
        vertices.push(p.map((n,k)=>n+.24*(normal[k]*Math.cos(a)+side[k]*Math.sin(a))));
      }
    }
    let x=0,y=0,frame=0;
    const paint=()=>{
      frame=0;
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if(!w||!h)return;
      const d=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);
      ctx.setTransform(d,0,0,d,0,0);
      const a=.58+x*.4,b=-.36+y*.33,scale=Math.min(w*.3,h*.32);
      const pts=vertices.map(([u,v,z])=>{
        const X=u*Math.cos(a)+z*Math.sin(a),Z=z*Math.cos(a)-u*Math.sin(a);
        const Y=v*Math.cos(b)-Z*Math.sin(b),depth=v*Math.sin(b)+Z*Math.cos(b);
        const k=scale*5/(5-depth);
        return [X,Y,depth,w*.53+X*k,h*.49-Y*k];
      });
      const faces=[];
      for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
        const at=(r,s)=>pts[(r%rings)*sides+s%sides];
        const face=[at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1)];
        faces.push([face.reduce((v,p)=>v+p[2],0),face]);
      }
      faces.sort((a,b)=>a[0]-b[0]);
      for(const [,f] of faces){
        const delta=p=>p.slice(0,3).map((v,k)=>v-f[0][k]);
        const n=unit(cross(delta(f[1]),delta(f[3])));
        if(n[2]>0)continue;
        const light=Math.max(0,n[0]*.45-n[1]*.62-n[2]*.64);
        const shine=Math.pow(light,10);
        ctx.fillStyle=ctx.strokeStyle='hsl('+(273+light*12)+' '+(42+light*15)+'% '+(28+light*41+shine*27)+'%)';
        ctx.beginPath();f.forEach((p,k)=>k?ctx.lineTo(p[3],p[4]):ctx.moveTo(p[3],p[4]));ctx.closePath();ctx.fill();ctx.lineWidth=.45;ctx.stroke();
      }
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint);};
    const orient=(u,v)=>{x=u;y=v;scene.style.setProperty('--yaw',u*9+'deg');scene.style.setProperty('--pitch',-v*6+'deg');schedule();};
    const move=e=>{if(motion.matches||e.pointerType==='touch')return;const r=scene.getBoundingClientRect();orient(2*(e.clientX-r.left)/r.width-1,2*(e.clientY-r.top)/r.height-1);};
    const reset=()=>orient(0,0);
    scene.addEventListener('pointermove',move);scene.addEventListener('pointerleave',reset);motion.addEventListener('change',reset);
    const size=new ResizeObserver(schedule);size.observe(canvas);schedule();
    this.cleanup=()=>{size.disconnect();cancelAnimationFrame(frame);scene.removeEventListener('pointermove',move);scene.removeEventListener('pointerleave',reset);motion.removeEventListener('change',reset);};
  }
  disconnectedCallback(){this.cleanup?.();}
}
customElements.define('pitch-sculpture',PitchSculpture);

}
