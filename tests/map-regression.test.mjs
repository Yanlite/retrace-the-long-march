import test from 'node:test';import assert from 'node:assert/strict';
import {interpolateRoutePoint,routePosition} from '../lib/engine.mjs';import {routePoints,routeIndexMap,TOTAL_METERS} from '../lib/history.mjs';import {layoutCards} from '../lib/event-layout.mjs';import {eventPlaces,eventAnchor} from '../lib/event-places.mjs';
const y=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
test('partial route endpoint lies on same Mercator segment as full route',()=>{for(let i=1;i<routePoints.length;i++)for(const t of [.1,.5,.9]){const a=routePoints[i-1],b=routePoints[i],p=interpolateRoutePoint(a,b,t);assert.ok(Math.abs(y(p[0])-(y(a[0])+(y(b[0])-y(a[0]))*t))<1e-12);assert.ok(Math.abs(p[1]-(a[1]+(b[1]-a[1])*t))<1e-12);}});
test('surviving report never changes slots after removal and admission',()=>{const items=[{id:'a',height:200,anchor:{x:800,y:200}},{id:'b',height:240,anchor:{x:850,y:440}}];const first=layoutCards(items,1200,900);const next=layoutCards([items[1],{id:'c',height:180,anchor:{x:400,y:200}}],1200,900,[],first);assert.deepEqual(next[0],first[1]);assert.equal(next[1].slot,first[0].slot);assert.ok(next[1].y+next[1].h<next[0].y);});

test('ordinary word passage is not mapped to Tongdao county',()=>{assert.equal(eventPlaces({place:'界首渡口',text:'守住通道，为主力渡江争取时间',context:''}).some(e=>e.name==='通道'),false);assert.equal(eventPlaces({place:'通道',text:'转兵',context:''})[0].name,'通道');});
test('geographic event anchor differs from synthetic marching position',()=>{assert.deepEqual(eventAnchor({place:'昆明',text:'',context:'',point:[30,110]}),[25.04,102.71]);});
test('card leaves its geographic pin visible',()=>{const[a]=layoutCards([{id:'a',height:300,anchor:{x:190,y:430}}],390,844,[]);assert.ok(!(190>a.x&&190<a.x+a.w&&430>a.y&&430<a.y+a.h));});

test('Chishui representative route crosses the schematic river four times, in sequence',async()=>{const {readFileSync}=await import('node:fs');const river=JSON.parse(readFileSync(new URL('../public/rivers.json',import.meta.url),'utf8')).rivers['赤水河'][0],hits=[];
 for(let i=routeIndexMap[23];i<routeIndexMap[38];i++)for(let j=0;j<river.length-1;j++){
  const a=routePoints[i],b=routePoints[i+1],c=river[j],d=river[j+1],x=b[1]-a[1],y=b[0]-a[0],u=d[1]-c[1],v=d[0]-c[0],den=x*v-y*u;if(Math.abs(den)<1e-12)continue;
  const dx=c[1]-a[1],dy=c[0]-a[0],t=(dx*v-dy*u)/den,s=(dx*y-dy*x)/den;if(t< -1e-8||t>1+1e-8||s< -1e-8||s>1+1e-8)continue;
  const point=[a[0]+t*y,a[1]+t*x];if(!hits.some(h=>Math.abs(h.i-i)<=2&&Math.hypot(h.point[0]-point[0],h.point[1]-point[1])<.001))hits.push({i,point});
 }
 assert.equal(hits.length,4);assert.ok(Math.abs(hits[0].point[0]-28.31)<.01);assert.ok(Math.abs(hits[1].point[1]-106.02774)<.01);assert.ok(Math.abs(hits[2].point[1]-106.38)<.01);assert.ok(Math.abs(hits[3].point[1]-106.02774)<.01);
});

test('Jinsha River is not matched to Jinsha county; Chishui River is not Chishui town',()=>{for(const place of ['金沙江南岸','金沙江北岸','金沙江沿岸'])assert.ok(!eventPlaces({place,text:'红军渡过金沙江',context:''}).some(e=>e.name==='金沙'));assert.equal(eventPlaces({place:'金沙',text:'进攻金沙补给',context:''})[0].name,'金沙');assert.ok(!eventPlaces({place:'赤水河',text:'渡过赤水河',context:''}).some(e=>e.name==='赤水'));});
test('later events use named crossing anchors and regional camera bounds on mobile',async()=>{const {timeline}=await import('../lib/timeline.mjs');const {cameraPoints}=await import('../lib/camera-points.mjs');const event=id=>timeline.find(e=>e.id===id);for(const id of ['action-28','action-30','action-48']){assert.ok(!eventPlaces(event(id)).some(e=>e.name==='金沙'));assert.deepEqual(eventAnchor(event(id)),[26.3,102.37]);}assert.deepEqual(eventAnchor(event('action-37')),[31,102.36]);const p=cameraPoints([event('action-38')],true);assert.ok(p.some(p=>p[0]===32.16));assert.ok(p.some(p=>p[0]===33.22));assert.notEqual(event('action-27').viewId,event('action-28').viewId);});
