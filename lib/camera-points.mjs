import {eventAnchor,eventPlaces,places} from './event-places.mjs';
// Regional context is part of the shot on phones too; optional overview padding
// remains desktop-only. River names are never resolved to similarly named towns.
export function cameraPoints(events,compact=false){
 const points=events.flatMap(e=>{
  const context=!compact||e.focus?.regional;
  return [eventAnchor(e),...eventPlaces(e).map(p=>p.point),...(context?(e.focus?.places||[]).map(name=>places[name]).filter(Boolean):[]),...(context?e.focus?.points||[]:[])];
 });
 return [...new Map(points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).map(p=>[p.join(','),p])).values()];
}
