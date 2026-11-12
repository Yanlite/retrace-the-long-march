import section0 from '../data/events/00-start.json' with {type:'json'};
import section1 from '../data/events/01-xiangjiang.json' with {type:'json'};
import section2 from '../data/events/02-tongdao-zunyi.json' with {type:'json'};
import section3 from '../data/events/03-chishui.json' with {type:'json'};
import section4 from '../data/events/04-jinsha.json' with {type:'json'};
import section5 from '../data/events/05-dadu.json' with {type:'json'};
import section6 from '../data/events/06-north.json' with {type:'json'};
import {eventPosition} from './route-event-position.mjs';
import {interactionFor} from './event-places.mjs';
// The data files are authoritative: no content/location/camera overrides here.
const records=[...section0,...section1,...section2,...section3,...section4,...section5,...section6];
const ids=new Set();
export const timeline=records.map(e=>{
 if(ids.has(e.id))throw new Error('Duplicate event id: '+e.id);ids.add(e.id);
 if(!['auto','archive'].includes(e.mode))throw new Error('Invalid event mode: '+e.id);
 if(!Number.isFinite(e.routeIndex)||e.routeIndex<0||e.routeIndex>84)throw new Error('Invalid routeIndex: '+e.id);
 return {...e,...eventPosition(e.routeIndex),archiveOnly:e.mode==='archive',viewId:e.focus?.id||'part-'+e.part};
}).sort((a,b)=>a.meters-b.meters);
const automatic=timeline.filter(e=>!e.archiveOnly);
for(let i=0;i<automatic.length;i++){const e=automatic[i],next=automatic[i+1];e.untilMeters=Math.min(next?.meters??Infinity,e.meters+80000)+12000;}
for(const e of timeline)if(e.until){const target=timeline.find(a=>a.id===e.until.event);if(!target)throw new Error('Unknown until event: '+e.id);e.untilMeters=target.meters+(e.until.km||0)*1000;}

export function crossedEvents(from,to){return to>from?timeline.filter(e=>!e.archiveOnly&&e.meters>from&&e.meters<=to):[];}
// Reading starts after the shot is visible. Validity windows are route-based,
// so missed reports do not trail the walker into the following theatre.
export const PLAYBACK={read:12000,interaction:6000,gap:3500};
export class EventPlayback{
 constructor(){this.previous=null;this.pending=[];this.active=[];this.skipped=0;this.completed=new Set();this.capacity=2;this.lastShown=-Infinity;this.lastDate=null;}
 setPace(pace){}
 setCapacity(value){this.capacity=value===1?1:2;}
 seek(meters){if(this.previous===null){this.previous=meters;return;}if(meters<this.previous){this.pending=[];this.active=[];this.lastShown=-Infinity;this.lastDate=null;}else this.pending.push(...crossedEvents(this.previous,meters));this.previous=meters;}
 completeInteraction(id,now){this.completed.add(id);this.active=this.active.map(e=>e.id===id?{...e,readUntil:now+PLAYBACK.interaction}:e);}
 frame(now,meters){
  const waiting=e=>interactionFor(e)&&!this.completed.has(e.id);
  const valid=e=>meters<=(e.untilMeters??e.meters+80000);
  this.pending=this.pending.filter(e=>{if(!valid(e)){this.skipped++;return false;}return true;});
  this.active=this.active.filter(e=>valid(e)&&(waiting(e)||now<e.readUntil));
  if(this.active.length>this.capacity)this.active=this.active.slice(-this.capacity);
  const next=this.pending[0];
  if(next){const nextView=next.viewId||next.focus?.id||next.part;
   const sameView=this.active.every(e=>(e.viewId||e.focus?.id||e.part)===nextView);
   const blocked=this.active.some(waiting),ready=!this.active.length||now-this.lastShown>=PLAYBACK.gap;
   if(!blocked&&ready&&(this.active.length<this.capacity||!sameView)){
    if(!sameView)this.active=[];this.pending.shift();
    this.active.push({...next,playbackMode:'read',shownAt:now,readUntil:now+PLAYBACK.read,needsReadingStart:true});this.lastShown=now;this.lastDate=next.date;
   }
  }return this.active;
 }
 markVisible(ids,now){for(const e of this.active)if(ids.includes(e.id)&&e.needsReadingStart){e.needsReadingStart=false;e.readUntil=now+PLAYBACK.read;}}
 reset(){this.previous=null;this.pending=[];this.active=[];this.skipped=0;this.completed.clear();this.lastShown=-Infinity;this.lastDate=null;}
}

