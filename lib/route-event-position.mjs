import {haversine} from './engine.mjs';
import {routePoints,routeIndexMap,TOTAL_METERS} from './history.mjs';
const cumulative=[0];for(let i=1;i<routePoints.length;i++)cumulative.push(cumulative[i-1]+haversine(routePoints[i-1],routePoints[i]));
export function eventPosition(index){
 const i=Math.floor(index),t=index-i,start=routeIndexMap[i],end=routeIndexMap[Math.min(i+1,routeIndexMap.length-1)];
 const distance=cumulative[start]+t*(cumulative[end]-cumulative[start]);let segment=start;
 while(segment<end-1&&cumulative[segment+1]<distance)segment++;
 const a=routePoints[segment],b=routePoints[Math.min(segment+1,routePoints.length-1)],u=(distance-cumulative[segment])/(cumulative[segment+1]-cumulative[segment]||1);
 const y=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
 return {meters:distance/cumulative.at(-1)*TOTAL_METERS,point:[(2*Math.atan(Math.exp(y(a[0])+(y(b[0])-y(a[0]))*u))-Math.PI/2)*180/Math.PI,a[1]+(b[1]-a[1])*u]};
}
