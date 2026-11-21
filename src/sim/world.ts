export const enum M {
  Empty, Steel, Concrete, Brick, Wood, Glass, Ice, Sand, Gunpowder, Ash,
  Water, Oil, Acid, Lava, Fire, Smoke, Steam, Stone, Rubble, Ember, Spark, C4,
}
export const MATERIALS = [
  { id:M.Steel,name:'Steel',color:'#737b89',kind:'solid' },{ id:M.Concrete,name:'Concrete',color:'#99948b',kind:'solid' },
  { id:M.Brick,name:'Brick',color:'#ae5846',kind:'solid' },{ id:M.Wood,name:'Wood',color:'#9b6238',kind:'solid' },
  { id:M.Glass,name:'Glass',color:'#65c7d4',kind:'solid' },{ id:M.Ice,name:'Ice',color:'#a0e3ed',kind:'solid' },
  { id:M.Sand,name:'Sand',color:'#dfbd75',kind:'powder' },{ id:M.Gunpowder,name:'Gunpowder',color:'#655e67',kind:'powder' },
  { id:M.Ash,name:'Ash',color:'#8d8b8e',kind:'powder' },{ id:M.Water,name:'Water',color:'#4189da',kind:'liquid' },
  { id:M.Oil,name:'Oil',color:'#9a7a35',kind:'liquid' },{ id:M.Acid,name:'Acid',color:'#5cdb90',kind:'liquid' },
  { id:M.Lava,name:'Lava',color:'#ff642e',kind:'liquid' },{ id:M.Fire,name:'Fire',color:'#ffb64b',kind:'gas' },
  { id:M.Smoke,name:'Smoke',color:'#7f8089',kind:'gas' },{ id:M.Steam,name:'Steam',color:'#cad7df',kind:'gas' },
  { id:M.Stone,name:'Stone',color:'#666b77',kind:'solid' },{ id:M.Rubble,name:'Rubble',color:'#9e9383',kind:'powder' },
  { id:M.Ember,name:'Ember',color:'#ff6738',kind:'powder' },{ id:M.Spark,name:'Spark',color:'#f8e39b',kind:'gas' },
  { id:M.C4,name:'C4',color:'#df4b5f',kind:'solid' },
] as const;
export type MaterialId = M;
export const WIDTH=360, HEIGHT=220, SIZE=WIDTH*HEIGHT;
const gas=(m:number)=>m===M.Fire||m===M.Smoke||m===M.Steam||m===M.Spark;
const liquid=(m:number)=>m===M.Water||m===M.Oil||m===M.Acid||m===M.Lava;
export class World {
  readonly material=new Uint8Array(SIZE); readonly colorVariant=new Uint8Array(SIZE);
  readonly velocityX=new Float32Array(SIZE); readonly velocityY=new Float32Array(SIZE);
  readonly life=new Uint16Array(SIZE); readonly temperature=new Float32Array(SIZE);
  readonly updatedClock=new Uint16Array(SIZE);
  frame=0; gravity=1; wind=0; paused=false;
  private seed=92821;
  constructor(readonly width=WIDTH,readonly height=HEIGHT){}
  get size(){return this.width*this.height}
  index(x:number,y:number){return y*this.width+x}
  private rand(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296}
  set(x:number,y:number,m:number){if(x<0||y<0||x>=this.width||y>=this.height)return;const i=this.index(x|0,y|0);this.material[i]=m;this.colorVariant[i]=(this.rand()*16)|0;this.temperature[i]=m===M.Lava?1200:m===M.Fire?800:20;this.life[i]=m===M.Fire?30+this.rand()*50|0:m===M.Smoke||m===M.Steam?55+this.rand()*90|0:m===M.Spark?8:0;this.velocityX[i]=this.velocityY[i]=0;}
  clear(){this.material.fill(0);this.colorVariant.fill(0);this.velocityX.fill(0);this.velocityY.fill(0);this.life.fill(0);this.temperature.fill(20);this.updatedClock.fill(0);this.frame=0;}
  getStats(){let active=0,hot=0;for(let i=0;i<this.size;i++){if(this.material[i])active++;if(this.material[i]===M.Fire||this.material[i]===M.Lava||this.material[i]===M.Ember)hot++;}return{active,hot};}
  step(){if(this.paused)return;this.frame=(this.frame+1)&65535;this.updatedClock.fill(0);const down=this.gravity>0?1:this.gravity<0?-1:0;const yStep=this.gravity<0?1:-1;for(let y=this.gravity<0?0:this.height-1;this.gravity<0?y<this.height:y>=0;y+=yStep){const reverse=(this.frame&1)!==0;for(let n=0;n<this.width;n++){const x=reverse?this.width-1-n:n;const i=this.index(x,y),m=this.material[i];if(!m||this.updatedClock[i]===this.frame)continue;this.updatedClock[i]=this.frame;this.react(x,y,i,m);const current=this.material[i];if(!current)continue;if((current===M.Rubble||current===M.Spark)&&(this.velocityX[i]||this.velocityY[i])){const vx=this.velocityX[i],vy=this.velocityY[i]+down*.16,nx=Math.round(x+vx),ny=Math.round(y+vy);if(this.move(x,y,nx,ny)){const j=this.index(nx,ny);this.velocityX[j]=vx*.94;this.velocityY[j]=vy*.94;}else{this.velocityX[i]*=.45;this.velocityY[i]=0;}continue;}
      if(current===M.Fire||current===M.Spark||current===M.Smoke||current===M.Steam){this.temperature[i]=Math.max(20,this.temperature[i]-.8);if(this.life[i]&&--this.life[i]===0){this.set(x,y,current===M.Fire&&this.rand()<.2?M.Smoke:M.Empty);continue;}if(gas(current)){const vy=current===M.Fire||current===M.Spark?-1:-1;this.move(x,y,x+((this.rand()<.5?-1:1)+(this.wind*.2|0)),y+vy); }continue;}
      if(current===M.Ice&&this.temperature[i]>100){this.set(x,y,M.Water);continue;}if(current===M.Lava){this.temperature[i]=Math.max(100,this.temperature[i]-.15);if(this.rand()<.025)this.set(x,y,M.Stone);}
      if(current===M.Sand||current===M.Ash||current===M.Rubble||current===M.Ember||current===M.Gunpowder){const ny=y+down;if(this.canDisplace(x,ny,current)){this.move(x,y,x,ny);continue;}const dir=this.rand()<.5?-1:1;if(this.canDisplace(x+dir,ny,current)){this.move(x,y,x+dir,ny);continue;}if(this.canDisplace(x-dir,ny,current))this.move(x,y,x-dir,ny);continue;}
      if(liquid(current)){const vy=y+down;if(this.canDisplace(x,vy,current)){this.move(x,y,x,vy);continue;}const spread=current===M.Lava?1:current===M.Acid?3:5;for(let s=1;s<=spread;s++){const dir=this.rand()<.5?-1:1;if(this.canDisplace(x+dir*s,y,current)){this.move(x,y,x+dir*s,y);break;}}}
    }} }
  private move(x:number,y:number,nx:number,ny:number){if(nx<0||ny<0||nx>=this.width||ny>=this.height)return false;const a=this.index(x,y),b=this.index(nx,ny);if(this.material[b]&&!(this.material[b]===M.Water&&this.material[a]===M.Oil)&&!(this.material[b]===M.Oil&&this.material[a]===M.Sand))return false;const bm=this.material[b],bv=this.colorVariant[b],bt=this.temperature[b],bl=this.life[b];this.material[b]=this.material[a];this.colorVariant[b]=this.colorVariant[a];this.temperature[b]=this.temperature[a];this.life[b]=this.life[a];this.velocityX[b]=nx-x;this.velocityY[b]=ny-y;this.material[a]=bm;this.colorVariant[a]=bv;this.temperature[a]=bt;this.life[a]=bl;this.velocityX[a]=this.velocityY[a]=0;this.updatedClock[a]=this.updatedClock[b]=this.frame;return true;}
  private canDisplace(x:number,y:number,m:number){if(x<0||x>=this.width||y<0||y>=this.height)return false;const d=this.material[this.index(x,y)];return d===M.Empty||(d===M.Water&&(m===M.Sand||m===M.Rubble))||(d===M.Oil&&m===M.Sand)||(d===M.Fire&&m!==M.Steel);}
  private react(x:number,y:number,i:number,m:number){for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){if(!ox&&!oy)continue;const nx=x+ox,ny=y+oy;if(nx<0||ny<0||nx>=this.width||ny>=this.height)continue;const j=this.index(nx,ny),n=this.material[j];if(m===M.Water&&n===M.Lava){this.set(nx,ny,M.Stone);this.set(x,y,M.Steam);return;}if(m===M.Lava&&n===M.Water){this.set(x,y,M.Stone);this.set(nx,ny,M.Steam);return;}if(m===M.Acid&&(n===M.Concrete||n===M.Brick||n===M.Wood||n===M.Sand||n===M.Steel)){if(this.rand()<.18){this.set(nx,ny,M.Smoke);this.life[this.index(nx,ny)]=24;this.temperature[i]+=50;}return;}if((m===M.Fire||m===M.Lava||m===M.Spark)&&(n===M.Wood||n===M.Oil||n===M.Gunpowder)){this.set(nx,ny,n===M.Gunpowder?M.Fire:n===M.Oil?M.Fire:M.Fire);this.life[j]=n===M.Gunpowder?90:60;}if(m===M.Fire&&n===M.Water)this.set(x,y,M.Steam);if((m===M.Fire||m===M.Lava)&&n===M.Ice)this.set(nx,ny,M.Water);if(m===M.Lava&&n===M.Wood)this.set(nx,ny,M.Fire);if(m===M.Water&&n===M.Ice&&this.temperature[i]<0)this.set(x,y,M.Ice);}
    if(m===M.Fire||m===M.Lava||m===M.Ember)this.temperature[i]=Math.max(this.temperature[i],m===M.Lava?1000:700);
    if(m===M.Steam&&y<4&&this.rand()<.03)this.set(x,y,M.Water);
  }
  paintCircle(cx:number,cy:number,r:number,m:number){for(let y=Math.max(0,cy-r);y<=Math.min(this.height-1,cy+r);y++)for(let x=Math.max(0,cx-r);x<=Math.min(this.width-1,cx+r);x++)if((x-cx)**2+(y-cy)**2<=r*r)this.set(x,y,m);}
}
