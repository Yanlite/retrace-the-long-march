"use client";
import {useEffect, useRef, useState, type PointerEvent} from 'react';
import {clampProgress, milestones} from '../lib/engine.mjs';
import {TOTAL_METERS} from '../lib/history.mjs';
import {dateAt} from '../lib/map-context.mjs';
import {timeline} from '../lib/timeline.mjs';

const visibleMeters = 1_200_000;
const datedEvents = timeline.map(event => ({meters: event.meters, time: Date.parse(event.date + 'T00:00:00Z')}));
const monthTicks: {meters: number; label: string}[] = [];
const tick = new Date(datedEvents[0].time);
tick.setUTCDate(1);
while (+tick <= datedEvents.at(-1)!.time) {
 const next = datedEvents.findIndex(event => event.time >= +tick);
 if (next > 0) {
  const a = datedEvents[next - 1], b = datedEvents[next];
  const meters = a.meters + (b.meters - a.meters) * (+tick - a.time) / (b.time - a.time);
  const month = tick.getUTCMonth() + 1;
  monthTicks.push({meters, label: month === 1 ? tick.getUTCFullYear() + '年1月' : month + '月'});
 }
 tick.setUTCMonth(tick.getUTCMonth() + 1);
}

type Drag = {id: number; startX: number; lastX: number; meters: number; moved: boolean; targetMeters?: number};

export default function MarchTimeline({meters, onSeek}: {meters: number; onSeek: (meters: number) => void}) {
 const track = useRef<HTMLDivElement>(null);
 const drag = useRef<Drag | null>(null);
 const [width, setWidth] = useState(440);
 const [dragging, setDragging] = useState(false);
 useEffect(() => {
  const element = track.current;
  if (!element) return;
  const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
  resize.observe(element);
  return () => resize.disconnect();
 }, []);
 const left = meters - visibleMeters / 2;
 const right = meters + visibleMeters / 2;
 const position = (value: number) => (value - left) / visibleMeters * 100;
 const inside = (value: number) => value >= left && value <= right;
 const start = Math.max(0, left), end = Math.min(TOTAL_METERS, right);
 const minorTicks = [];
 for (let value = Math.ceil(start / 50_000) * 50_000; value <= end; value += 50_000) minorTicks.push(value);
 const visibleMonths = monthTicks.filter(mark => inside(mark.meters));
 const nodes = milestones.filter(node => inside(node.meters));
 const date = dateAt(meters);
 const shortDate = new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'}).format(date);
 const dateLabel = shortDate.replaceAll('/', '.');
 const monthLabels = new Set<number>();
 let lastMonth = -Infinity;
 for (const mark of visibleMonths) {
  const x = position(mark.meters) * width / 100;
  if (x < 18 || x > width - 18 || x - lastMonth < 52) continue;
  monthLabels.add(mark.meters);
  lastMonth = x;
 }
 const nodeLabels = new Set<string>();
 let lastNode = -Infinity;
 for (const node of nodes) {
  const x = position(node.meters) * width / 100;
  if (x < 36 || x > width - 36 || Math.abs(x - width / 2) < 68 || x - lastNode < 85) continue;
  nodeLabels.add(node.id);
  lastNode = x;
 }

 function begin(event: PointerEvent<HTMLDivElement>) {
  if (drag.current || event.button !== 0) return;
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-node-meters]');
  drag.current = {id:event.pointerId, startX:event.clientX, lastX:event.clientX, meters, moved:false,
   targetMeters:target ? Number(target.dataset.nodeMeters) : undefined};
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function move(event: PointerEvent<HTMLDivElement>) {
  const gesture = drag.current;
  if (!gesture || gesture.id !== event.pointerId) return;
  if (!gesture.moved && Math.abs(event.clientX - gesture.startX) < 4) return;
  gesture.moved = true;
  setDragging(true);
  const span = event.currentTarget.getBoundingClientRect().width;
  gesture.meters = clampProgress(gesture.meters - (event.clientX - gesture.lastX) * visibleMeters / span);
  gesture.lastX = event.clientX;
  onSeek(gesture.meters);
 }
 function finish(event: PointerEvent<HTMLDivElement>, cancelled = false) {
  const gesture = drag.current;
  if (!gesture || gesture.id !== event.pointerId) return;
  drag.current = null;
  setDragging(false);
  if (cancelled || gesture.moved) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const offset = (event.clientX - bounds.left) / bounds.width - .5;
  onSeek(clampProgress(gesture.targetMeters ?? (meters + offset * visibleMeters)));
 }

 return <div ref={track} className={'march-timeline'+(dragging?' is-dragging':'')} role="slider" tabIndex={0}
   aria-label="长征时间轴" aria-valuemin={0} aria-valuemax={TOTAL_METERS} aria-valuenow={Math.round(meters)}
   aria-valuetext={shortDate+'，'+Math.round(meters/1000)+'公里'}
   onPointerDown={begin} onPointerMove={move} onPointerUp={event=>finish(event)}
   onPointerCancel={event=>finish(event,true)} onLostPointerCapture={event=>finish(event,true)}
   onKeyDown={event=>{
    const steps: Record<string,number> = {ArrowLeft:-2000, ArrowDown:-2000, ArrowRight:2000, ArrowUp:2000, PageDown:-100_000, PageUp:100_000};
    if (event.key !== 'Home' && event.key !== 'End' && !(event.key in steps)) return;
    event.preventDefault();
    onSeek(clampProgress(event.key==='Home'?0:event.key==='End'?TOTAL_METERS:meters+steps[event.key]));
   }}>
   <div className="march-timeline-strip" aria-hidden="true">
    <span className="march-timeline-line" style={{left:position(start)+'%',width:(position(end)-position(start))+'%'}}/>
    {minorTicks.map(value=><span key={value} className="march-timeline-tick" style={{left:position(value)+'%'}}/>)}
    {visibleMonths.map(mark=><span key={mark.meters} className="march-timeline-month" style={{left:position(mark.meters)+'%'}}>{monthLabels.has(mark.meters)&&<span>{mark.label}</span>}</span>)}
    {nodes.map(node=><span key={node.id} className="march-timeline-node" data-node-meters={node.meters} title={node.name} style={{left:position(node.meters)+'%'}}>{nodeLabels.has(node.id)&&<span>{node.name}</span>}</span>)}
   </div>
   <span className="march-timeline-cursor" aria-hidden="true"/>
   <span className="march-timeline-date" aria-hidden="true">{dateLabel}</span>
  </div>;
}
