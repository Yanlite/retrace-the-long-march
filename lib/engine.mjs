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

/** Conservative outdoor walking filter. All coordinates stay in memory only.
 * Anchor deadband accumulates short steps; rejects poor accuracy, teleports,
 * high speed, stale timestamps, background gaps. Restart clears the anchor.
 * No web GPS algorithm can distinguish every slow drift from real walking.
 */
export class WalkingFilter {
  constructor() { this.reset(); }
  reset() { this.anchor=null; this.last=null; }
  add(p) {
    if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||!Number.isFinite(p.timestamp)||!Number.isFinite(p.accuracy)||Math.abs(p.lat)>90||Math.abs(p.lng)>180||p.accuracy<0) return {meters:0,reason:'无效定位'};
    if(p.accuracy>35) return {meters:0,reason:'定位精度不足，等待更清晰的信号'};
    if(!this.last) {this.last=p;this.anchor=p;return {meters:0,reason:'定位成功，开始行走吧'};}
    const dt=(p.timestamp-this.last.timestamp)/1000;
    if(dt<=0) return {meters:0,reason:'忽略过期定位'};
    if(dt>25) {this.last=p;this.anchor=p;return {meters:0,reason:'定位间断，已重新建立起点'};}
    const hop=haversine([this.last.lat,this.last.lng],[p.lat,p.lng]);
    const speed=hop/dt;
    // Keep last reliable point after an isolated jump; rebase after a long gap.
    if(speed>3.3 || (Number.isFinite(p.speed)&&p.speed>3.3)) return {meters:0,reason:'移动过快或定位跳变，未计入'};
    this.last=p;
    const distance=haversine([this.anchor.lat,this.anchor.lng],[p.lat,p.lng]);
    const deadband=Math.max(6,Math.min(18,Math.max(p.accuracy,this.anchor.accuracy)*0.8));
    if(distance<deadband) return {meters:0,reason:'信号正常 · 等待有效位移'};
    if(distance/((p.timestamp-this.anchor.timestamp)/1000)>3.3) {this.anchor=p;return {meters:0,reason:'位移异常，已重新建立起点'};}
    this.anchor=p;
    return {meters:distance,reason:'正在记录有效行走'};
  }
}
