import { describe,expect,it } from 'vitest';
import { M,World } from './world';
import { detonate } from './tools';
const count=(w:World,m:number)=>w.material.reduce((n,value)=>n+(value===m?1:0),0);
describe('voxel materials simulation',()=>{
  it('lets sand fall and pile against the floor',()=>{const w=new World(40,32);w.set(20,2,M.Sand);for(let i=0;i<30;i++)w.step();expect(w.material[w.index(20,31)]).toBe(M.Sand);expect(w.getStats().active).toBe(1);});
  it('keeps lighter oil buoyant above a pooled water layer',()=>{const w=new World(30,30);for(let x=1;x<29;x++){w.set(x,27,M.Water);w.set(x,28,M.Steel);}w.set(15,26,M.Oil);for(let i=0;i<2;i++)w.step();expect(w.material.some((m,i)=>m===M.Oil&&Math.floor(i/w.width)<27)).toBe(true);expect(count(w,M.Water)).toBeGreaterThan(10);});
  it('quenches lava into stone and steam',()=>{const w=new World(20,20);w.set(10,10,M.Lava);w.set(11,10,M.Water);w.step();expect(count(w,M.Stone)).toBeGreaterThan(0);expect(count(w,M.Steam)).toBeGreaterThan(0);});
  it('acid corrodes a concrete reservoir',()=>{const w=new World(20,20);w.gravity=0;w.set(10,10,M.Acid);w.set(11,10,M.Concrete);for(let i=0;i<300&&w.material[w.index(11,10)]===M.Concrete;i++)w.step();expect(w.material[w.index(11,10)]).not.toBe(M.Concrete);});
  it('fire propagates to oil and wood',()=>{const w=new World(24,20);w.gravity=0;w.set(10,10,M.Fire);w.set(11,10,M.Oil);w.set(10,11,M.Wood);for(let i=0;i<3;i++)w.step();expect(count(w,M.Fire)).toBeGreaterThan(0);expect(count(w,M.Oil)).toBe(0);});
  it('C4 carves a crater and spawns ballistic debris',()=>{const w=new World(70,50);for(let y=15;y<42;y++)for(let x=15;x<55;x++)w.set(x,y,M.Concrete);w.set(35,30,M.C4);detonate(w,undefined,undefined,15);const empty=w.material.slice(20*w.width,40*w.width).filter(m=>m===M.Empty).length;const debris=count(w,M.Rubble)+count(w,M.Spark);expect(empty).toBeGreaterThan(30);expect(debris).toBeGreaterThan(10);});
});
it('collapses a disconnected tower after its support is blasted',()=>{const w=new World(40,60);for(let x=0;x<w.width;x++)w.set(x,59,M.Stone);for(let y=10;y<59;y++)w.set(20,y,M.Steel);w.set(20,48,M.C4);detonate(w,undefined,undefined,5);expect(w.material[w.index(20,15)]).toBe(M.Rubble);});
