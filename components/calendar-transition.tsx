"use client";
import {useEffect,useRef,useState} from 'react';
import {monthAt} from '../lib/map-context.mjs';
type Change={from:number;to:number;key:number};
export default function CalendarTransition({meters,ready}:{meters:number;ready:boolean}){
 const previous=useRef<number|null>(null),pending=useRef<Change[]>([]),timer=useRef<ReturnType<typeof setTimeout>|null>(null),serial=useRef(0);
 const [change,setChange]=useState<Change|null>(null);
 useEffect(()=>{if(!ready)return;const month=monthAt(meters),last=previous.current;previous.current=month;
  if(last===null||last===month)return;
  if(month<last){pending.current=[];if(timer.current)clearTimeout(timer.current);timer.current=null;setChange(null);return;}
  for(let from=last;from<month;from++)pending.current.push({from,to:from+1,key:++serial.current});
  const play=()=>{const next=pending.current.shift();setChange(next||null);timer.current=next?setTimeout(play,2300):null;};
  if(!timer.current)play();
 },[meters,ready]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 if(!change)return null;
 const years=Math.floor(change.from/12)!==Math.floor(change.to/12);
 const label=(n:number)=>years?Math.floor(n/12)+'年':n%12+1+'月';
 return <div key={change.key} className="calendar-transition" role="status" aria-label={label(change.from)+'至'+label(change.to)}><span className="calendar-old" aria-hidden="true">{label(change.from)}</span><span className="calendar-new" aria-hidden="true">{label(change.to)}</span></div>;
}
