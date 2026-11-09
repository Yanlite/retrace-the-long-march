import { TOTAL_METERS, events, routePoints, nodeIndices } from './history.mjs';

export function haversine(a, b) {
  const rad = Math.PI / 180;
  const dlat = (b[0] - a[0]) * rad, dlng = (b[1] - a[1]) * rad;
  const x = Math.sin(dlat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dlng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
const cumulative = [0];
for (let i = 1; i < routePoints.length; i++) cumulative.push(cumulative[i-1] + haversine(routePoints[i-1], routePoints[i]));
const scale = TOTAL_METERS / cumulative.at(-1);
export const milestones = events.map(e => ({...e, meters: cumulative[nodeIndices[e.id]] * scale, point:routePoints[nodeIndices[e.id]]}));
export function clampProgress(meters) { return Number.isFinite(meters) ? Math.max(0, Math.min(TOTAL_METERS, meters)) : 0; }
export function interpolateRoutePoint(a,b,t){ if(t<=0)return [...a];if(t>=1)return [...b];
 const y=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
 return [(2*Math.atan(Math.exp(y(a[0])+(y(b[0])-y(a[0]))*t))-Math.PI/2)*180/Math.PI,a[1]+(b[1]-a[1])*t];
}
export function routePosition(meters) {
  const d = clampProgress(meters) / scale;
  let i = 1;
  while (i < cumulative.length-1 && cumulative[i] < d) i++;
  const t = Math.max(0,Math.min(1,(d-cumulative[i-1])/(cumulative[i]-cumulative[i-1] || 1)));
  const a=routePoints[i-1], b=routePoints[i];
  const point = interpolateRoutePoint(a,b,t);
  return {point, line:[...routePoints.slice(0,i),point]};
}
export function currentMilestone(meters) { return [...milestones].reverse().find(e => e.meters <= clampProgress(meters)+0.01) || milestones[0]; }
export function unlockThrough(meters, previous = []) {
  return [...new Set([...previous.filter(id => milestones.some(e=>e.id===id)), ...milestones.filter(e=>e.meters<=clampProgress(meters)+0.01).map(e=>e.id)])];
}
export function advance(state, distance, multiplier) {
  if (!Number.isFinite(distance) || distance <= 0 || !validMultiplier(multiplier)) return state;
  const virtualMeters = clampProgress(state.virtualMeters + distance * multiplier);
  return {...state, realMeters:state.realMeters+distance, virtualMeters, unlocked:unlockThrough(virtualMeters,state.unlocked)};
}
export function seek(state, meters) { const virtualMeters=clampProgress(meters); return {...state, virtualMeters, unlocked:unlockThrough(virtualMeters,state.unlocked)}; }
export function validMultiplier(n) { return Number.isFinite(n) && n>=1 && n<=100000; }
export const initialState = () => ({version:1,realMeters:0,virtualMeters:0,multiplier:1000,unlocked:['yudu'],seconds:0,sessions:0});
export function restore(raw) {
  try {
    const s = JSON.parse(raw);
    if(s?.version!==1) return initialState();
    const virtualMeters=clampProgress(s.virtualMeters);
    return {version:1,realMeters:Number.isFinite(s.realMeters)?Math.max(0,s.realMeters):0,virtualMeters,multiplier:validMultiplier(s.multiplier)?s.multiplier:1000,unlocked:unlockThrough(virtualMeters,Array.isArray(s.unlocked)?s.unlocked:[]),seconds:Number.isFinite(s.seconds)?Math.max(0,s.seconds):0,sessions:Number.isFinite(s.sessions)?Math.max(0,Math.floor(s.sessions)):0};
  } catch { return initialState(); }
}

/** Adaptive multi-fix walking filter. Coordinates remain in memory only.
 * Accuracy is an uncertainty estimate, not proof of actual displacement.
 * Consistent slow drift cannot always be distinguished from walking by web GPS.
 */
export class WalkingFilter {
 constructor(){this.reset();}
 reset(){this.anchor=null;this.last=null;this.points=[];this.moving=false;}
 add(p){
  const result=(reason,status='waiting',meters=0)=>({meters,reason,status});
  if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||!Number.isFinite(p.timestamp)||!Number.isFinite(p.accuracy)||Math.abs(p.lat)>90||Math.abs(p.lng)>180||p.accuracy<0)return result('无效定位','invalid');
  if(p.accuracy>100){this.moving=false;this.points=[];return result('定位信号很弱，暂不计程','poor');}
  if(this.last&&p.timestamp<=this.last.timestamp)return result('定位尚未更新','stale');
  const dt=this.last?(p.timestamp-this.last.timestamp)/1000:0;
  if(!this.last||dt>25){this.last=p;this.anchor=p;this.points=[p];this.moving=false;return result(dt>25?'定位间断，已重新建立起点':'定位成功，正在确认移动');}
  const hop=haversine([this.last.lat,this.last.lng],[p.lat,p.lng]);
  if(hop/dt>6||(Number.isFinite(p.speed)&&p.speed>6))return result('定位跳变或移动过快，未计入','jump');
  this.last=p;this.points.push(p);this.points=this.points.slice(-6);
  const first=this.points[0],span=(p.timestamp-first.timestamp)/1000;
  let path=0;for(let i=1;i<this.points.length;i++)path+=haversine([this.points[i-1].lat,this.points[i-1].lng],[this.points[i].lat,this.points[i].lng]);
  const net=haversine([first.lat,first.lng],[p.lat,p.lng]),coherence=path>0?net/path:0;
  const accuracy=Math.max(p.accuracy,this.anchor.accuracy);
  const threshold=Math.max(3,Math.min(10,accuracy<=15?accuracy*.5:accuracy*.12));
  const coherent=this.points.length>=4&&span>=2&&coherence>=(accuracy>35?.8:.72);
  const distance=haversine([this.anchor.lat,this.anchor.lng],[p.lat,p.lng]);
  if(!coherent){this.moving=false;if((p.timestamp-this.anchor.timestamp)>15000){this.anchor=p;}return result(accuracy>35?'定位较粗，正在核对连续移动':'等待连续有效位移',accuracy>35?'coarse':'waiting');}
  const minimum=this.moving?(accuracy>35?1.2:1):threshold;
  if(distance<minimum)return result('正在确认小幅位移');
  const elapsed=(p.timestamp-this.anchor.timestamp)/1000;
  if(distance/elapsed>6){this.anchor=p;this.moving=false;return result('位移异常，已重新建立起点','jump');}
  this.anchor=p;this.moving=true;
  return result(accuracy>35?'正在计程 · 定位较粗':'正在记录有效行走','moving',distance);
 }
}
