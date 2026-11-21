import { M, MATERIALS, World } from '../sim/world';
const hex=(c:string)=>{const n=parseInt(c.slice(1),16);return(255<<24)|((n&255)<<16)|(((n>>8)&255)<<8)|(n>>16);};
const colors=new Uint32Array(256);for(const m of MATERIALS)colors[m.id]=hex(m.color);
const mix=(base:number,v:number)=>{const r=Math.max(0,Math.min(255,(base&255)+v)),g=Math.max(0,Math.min(255,((base>>8)&255)+v)),b=Math.max(0,Math.min(255,((base>>16)&255)+v));return(255<<24)|(b<<16)|(g<<8)|r;};
export class CanvasRenderer {
  private image?:ImageData;private pixels?:Uint32Array;
  render(canvas:HTMLCanvasElement,world:World,glow=true){if(canvas.width!==world.width||canvas.height!==world.height){canvas.width=world.width;canvas.height=world.height;}const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;if(!this.image){this.image=ctx.createImageData(world.width,world.height);this.pixels=new Uint32Array(this.image.data.buffer);}const p=this.pixels!;for(let i=0;i<world.size;i++){const m=world.material[i];if(!m){p[i]=0xff09090b;continue;}const base=colors[m]||0xffffffff;let variant=(world.colorVariant[i]&7)-3;if(m===M.Fire||m===M.Lava||m===M.Ember||m===M.Spark)variant+=Math.sin((world.frame+i%widthSafe(world.width))*0.11)*24;let color=mix(base,variant);if(m===M.Glass)color=(color&0x00ffffff)|0xa0000000;p[i]=color;}ctx.putImageData(this.image,0,0);if(glow){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.14;ctx.filter='blur(5px)';ctx.drawImage(canvas,0,0);ctx.restore();} }
}
function widthSafe(n:number){return n||1;}
