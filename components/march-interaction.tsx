"use client";
import {useEffect,useState} from 'react';
import {interactionFor} from '../lib/event-places.mjs';
export default function MarchInteraction({realMeters,walking,event,chosen,onAnswer}:{realMeters:number;walking:boolean;event:any;chosen:number|undefined;onAnswer:(value:number)=>void}){
 const q=interactionFor(event) as any;const [start,setStart]=useState<number|null>(null);
 const target=q&&'walkMeters' in q?Number(q.walkMeters):15;
 const walked=start===null?0:Math.max(0,realMeters-start);
 useEffect(()=>{if(['walk','reports'].includes(q?.kind)&&start!==null&&walked>=target&&chosen===undefined)onAnswer(0);},[q,start,walked,target,chosen,onAnswer]);
 if(!q||chosen===-1)return null;
 const expandable=q.kind==='dispatch'||q.kind==='compare';
 const correct='correct' in q?q.correct:null;
 return <section className={'march-interaction interaction-'+q.kind}><h4>把历史带回脚下</h4>{(q.kind!=='reports'||chosen===undefined)&&<p>{q.question}</p>}
 {['walk','reports'].includes(q.kind)&&chosen===undefined?<div className="walk-interaction">{start===null?<><button disabled={!walking} onClick={()=>setStart(realMeters)}>{q.options[0]}</button>{!walking&&<small>在设置中开始行走后可体验，也可以略过。</small>}</>:<><progress max={target} value={Math.min(target,walked)}/><p>现实行走 {Math.min(target,walked).toFixed(1)} / {target} m</p>{q.kind==='reports'&&q.responses.map((report:string,i:number)=>walked>=target*(i+1)/q.responses.length&&<p className="dispatch-report" key={i}>{report}</p>)}{!walking&&<small>继续记录行走后再推进。</small>}</>}</div>:expandable?<div className="dispatch-options">{q.options.map((option:string,i:number)=>{const open=Boolean((chosen||0)&(1<<i));return <div key={i}><button aria-expanded={open} onClick={()=>onAnswer((chosen||0)^(1<<i))}>{option}<span aria-hidden="true">{open?'−':'＋'}</span></button>{open&&<p className="dispatch-report">{q.responses[i]}</p>}</div>;})}{q.feedback&&chosen===(1<<q.options.length)-1&&<p className="interaction-feedback">{q.feedback}</p>}</div>
 :chosen===undefined?<div>{q.options.map((option:string,i:number)=><button key={i} onClick={()=>onAnswer(i)}>{option}</button>)}</div>
 :<p className="interaction-feedback" role="status">{q.kind==='historical'&&<>{chosen===correct?'当时采取了这一方案。':'历史上选择了另一方案。'} </>}{q.kind==='reports'?q.responses.join(' '):q.responses[chosen]}{q.feedback&&<> {q.feedback}</>}</p>}
 <button className="skip-interaction" onClick={()=>onAnswer(-1)}>略过这项互动</button></section>;
}
