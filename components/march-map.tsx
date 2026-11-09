"use client";
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { milestones, routePosition } from '../lib/engine.mjs';
import { routePoints } from '../lib/history.mjs';
import {eventAnchor,eventPlaces,interactionFor} from '../lib/event-places.mjs';
import {layoutCards,cardEdge} from '../lib/event-layout.mjs';
type Props={events:any[];meters:number;follow:boolean;overview:number;layer:'terrain'|'satellite';onStatus:(s:string)=>void;onDrag:()=>void};
type Scene={map:Leaflet.Map;L:typeof Leaflet;trail:Leaflet.Polyline;marker:Leaflet.Marker;nodes:Leaflet.Marker[];tile?:Leaflet.TileLayer};
export default function MarchMap({events,meters,follow,overview,layer,onStatus,onDrag}:Props){
 const root=useRef<HTMLDivElement>(null),scene=useRef<Scene|null>(null),eventMarkers=useRef<Leaflet.Marker[]>([]);
 const [cards,setCards]=useState<any[]>([]);
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const cardNodes=useRef<Record<string,HTMLDivElement|null>>({});
 const riverData=useRef<Record<string,number[][][]>|null>(null);
 const current=useRef({meters,follow,onStatus,onDrag});current.current={meters,follow,onStatus,onDrag};
 useEffect(()=>{let disposed=false;let resize:ResizeObserver|undefined;
  import('leaflet').then(L=>{if(disposed||!root.current)return;
   const map=L.map(root.current,{zoomControl:false,minZoom:4,maxZoom:13});
   map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
   const compact=root.current.clientWidth<600;
   map.setView(routePosition(current.current.meters).point as Leaflet.LatLngTuple,7);
   L.polyline(routePoints as Leaflet.LatLngTuple[],{color:'#101b18',weight:8,opacity:.75,interactive:false,smoothFactor:0,noClip:true}).addTo(map);
   L.polyline(routePoints as Leaflet.LatLngTuple[],{color:'#cfb894',weight:2,dashArray:'5 7',opacity:.65,interactive:false,smoothFactor:0,noClip:true}).addTo(map);
   const trail=L.polyline([],{color:'#ee654b',weight:4,interactive:false,smoothFactor:0,noClip:true,className:'completed-route'}).addTo(map);
   const major=new Set([0,1,3,4,5,6,9,10,11]);
   const directions:Leaflet.Direction[]=compact?['left','bottom','right','right','right','right','right','right','right','right','right','right']:['right','bottom','left','right','left','left','left','right','left','right','left','right'];
   const nodes=milestones.map((e,i)=>L.marker(e.point as Leaflet.LatLngTuple,{interactive:false,icon:L.divIcon({className:`history-dot ${major.has(i)?'':'minor-route-dot'}`,html:`<span>${String(i+1).padStart(2,'0')}</span>`,iconSize:[23,23],iconAnchor:[11,11]})}).addTo(map).bindTooltip(e.name,{permanent:true,direction:directions[i],offset:directions[i]==='bottom'?[0,11]:[directions[i]==='right'?12:-12,0],className:`route-label ${major.has(i)?'':'minor-route-label'}`}));
   const marker=L.marker(routePoints[0] as Leaflet.LatLngTuple,{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'march-marker',html:'<span class="marker-halo"></span><span class="marker-core">★</span>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(map);
   [[35.69,105.05],[35.82,105.68]].forEach(([lat,lng],i)=>{const m=L.marker([lat,lng],{interactive:false,icon:L.divIcon({className:'reunion-dot',html:'◇',iconSize:[15,15]})}).addTo(map);if(i===0)m.bindTooltip('1936 · 会宁 / 将台堡',{permanent:true,direction:compact?'right':'left',offset:[compact?5:-5,0],className:'context-label'});});
   [[30.6,99.6,'青 藏 高 原'],[29.0,105.0,'四 川 盆 地'],[25.5,105.7,'云 贵 高 原'],[28.2,111.6,'湖 南'],[27.5,115.1,'江 西'],[35.4,108.9,'陕 西']].forEach(([lat,lng,name])=>L.marker([Number(lat),Number(lng)],{interactive:false,icon:L.divIcon({className:'geography-label',html:String(name),iconSize:[120,20]})}).addTo(map));
   scene.current={map,L,trail,marker,nodes};map.on('dragstart',()=>{map.stop();current.current.onDrag();});
   const labelDensity=()=>root.current?.classList.toggle('overview-map',map.getZoom()<=6);labelDensity();map.on('zoomend',labelDensity);
   resize=new ResizeObserver(()=>map.invalidateSize({pan:false}));resize.observe(root.current);
   const p=routePosition(current.current.meters);marker.setLatLng(p.point as Leaflet.LatLngTuple);trail.setLatLngs(p.line as Leaflet.LatLngTuple[]);
   nodes.forEach((node,i)=>node.getElement()?.classList.toggle('passed',milestones[i].meters<=current.current.meters+.01));
   root.current.dispatchEvent(new Event('map-ready'));
  }).catch(()=>current.current.onStatus('地图组件加载失败，请刷新页面；行走记录仍可使用。'));
  return()=>{disposed=true;resize?.disconnect();scene.current?.map.remove();scene.current=null;};
 },[]);
 useEffect(()=>{const load=()=>{const s=scene.current;if(!s)return;s.tile?.remove();let failures=0,loaded=0;
  const url=layer==='satellite'?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}':'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
  const tile=s.L.tileLayer(url,{maxZoom:17,attribution:layer==='satellite'?'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics':'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',className:layer==='satellite'?'satellite-tiles':'terrain-tiles'});s.tile=tile;
  tile.on('tileload',()=>{loaded++;if(s.tile===tile)current.current.onStatus('');});
  tile.on('tileerror',()=>{if(++failures>=3&&!loaded&&s.tile===tile)current.current.onStatus('底图连接受限，可切换底图或检查网络。路线与行走记录仍可使用。');});
  tile.addTo(s.map);tile.bringToBack();};
  load();const el=root.current;el?.addEventListener('map-ready',load);
  const timeout=setTimeout(()=>{if(scene.current&&!root.current?.querySelector('.leaflet-tile-loaded'))current.current.onStatus('底图响应较慢，可尝试切换底图。');},15000);
  return()=>{el?.removeEventListener('map-ready',load);clearTimeout(timeout);};
 },[layer]);
 useEffect(()=>{const s=scene.current;if(!s)return;const p=routePosition(meters);s.trail.setLatLngs(p.line as Leaflet.LatLngTuple[]);s.marker.setLatLng(p.point as Leaflet.LatLngTuple);s.nodes.forEach((node,i)=>node.getElement()?.classList.toggle('passed',milestones[i].meters<=meters+.01));if(follow)s.map.panTo(p.point as Leaflet.LatLngTuple,{animate:false});else s.map.stop();},[meters,follow]);
 useEffect(()=>{const s=scene.current;if(s&&overview>0){const compact=(root.current?.clientWidth||0)<600;s.map.flyToBounds(s.L.latLngBounds(routePoints as Leaflet.LatLngTuple[]),{paddingTopLeft:compact?[45,90]:[90,90],paddingBottomRight:compact?[45,190]:[90,210],duration:1});}},[overview]);
 useEffect(()=>{let alive=true;const layers:Leaflet.Layer[]=[];
 const draw=async()=>{if(!riverData.current){try{const response=await fetch(new URL('rivers.json',document.baseURI).href);if(response.ok)riverData.current=(await response.json() as {rivers:Record<string,number[][][]>}).rivers;}catch{}}
  const s=scene.current;if(!alive||!s||!riverData.current)return;
  const content=events.map(e=>[e.place,e.text,e.context,Number(e.part)===1?'湘江':Number(e.part)===4?'金沙江':Number(e.part)===6?'大渡河':[2,3].includes(Number(e.part))?'赤水河':''].join(' ')).join(' ');
  for(const [name,lines] of Object.entries(riverData.current)){if(!content.includes(name))continue;
   for(const line of lines){layers.push(s.L.polyline(line as Leaflet.LatLngTuple[],{color:name==='赤水河'?'#e7c581':'#59c8ed',weight:12,opacity:.2,interactive:false,smoothFactor:0,className:'river-glow'}).addTo(s.map));layers.push(s.L.polyline(line as Leaflet.LatLngTuple[],{color:name==='赤水河'?'#efd395':'#9be4ff',weight:3,opacity:.95,interactive:false,smoothFactor:0,dashArray:name==='赤水河'?'7 6':undefined,className:name==='赤水河'?'river-highlight river-schematic':'river-highlight'}).bindTooltip(name==='赤水河'?'赤水河（局部）':name,{permanent:name==='赤水河',direction:'center',className:'river-schematic-label'}).addTo(s.map));}
  }
 };draw();const el=root.current;el?.addEventListener('map-ready',draw);return()=>{alive=false;layers.forEach(layer=>layer.remove());el?.removeEventListener('map-ready',draw);};
 },[events]);
 useEffect(()=>{let raf=0;let attached:Leaflet.Map|undefined;
 const update=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const s=scene.current;if(!s)return;const size=s.map.getSize();
  const project=(point:any)=>s.map.latLngToContainerPoint(point as Leaflet.LatLngTuple);
  const route=[];for(let i=1;i<routePoints.length;i++){const a=project(routePoints[i-1]),b=project(routePoints[i]);for(let j=0;j<=8;j++)route.push({x:a.x+(b.x-a.x)*j/8,y:a.y+(b.y-a.y)*j/8});}
  const entries=events.map(e=>({event:e,id:e.id,anchor:project(eventAnchor(e)),height:cardNodes.current[e.id]?.getBoundingClientRect().height||(interactionFor(e)?345:235)}));
  const rects=layoutCards(entries,size.x,size.y,route);
  setCards(entries.map((entry,i)=>({...entry,rect:rects[i],places:eventPlaces(entry.event).map(p=>({...p,screen:project(p.point)}))})));
 });};
 const setup=()=>{const s=scene.current;if(!s)return;attached=s.map;s.map.on('move zoom resize',update);update();};setup();const el=root.current;el?.addEventListener('map-ready',setup);
 const resize=new ResizeObserver(update);Object.values(cardNodes.current).forEach(el=>{if(el)resize.observe(el);});
 return()=>{cancelAnimationFrame(raf);attached?.off('move zoom resize',update);el?.removeEventListener('map-ready',setup);resize.disconnect();};
 },[events,answers]);
 function answer(id:string,index:number){setAnswers(old=>{const next={...old,[id]:index};try{localStorage.setItem('long-march-reflections-v1',JSON.stringify(next));}catch{}return next;});}
 return <div className="map-canvas"><div ref={root} className="map-surface" role="img" aria-label="中央红军长征历史示意地图"/>
  <svg className="event-leaders" aria-hidden="true">{cards.flatMap(card=>{const points=card.places.length?card.places:[{name:String(card.event.place),screen:card.anchor}];return points.map((place:any,i:number)=>{const edge=cardEdge(card.rect,place.screen);return <g key={card.id+'-'+i} className={card.event.side==='red'?'red-leader':'blue-leader'}><line x1={edge.x} y1={edge.y} x2={place.screen.x} y2={place.screen.y} strokeDasharray={i?'3 5':undefined}/><circle cx={place.screen.x} cy={place.screen.y} r={i?4:6}/><text x={place.screen.x+10} y={place.screen.y-9}>{place.name}</text></g>;});})}</svg>
  <div className="event-card-layer">{cards.map(card=>{const e=card.event,q=interactionFor(e),chosen=answers[e.id];return <div key={e.id} ref={el=>{cardNodes.current[e.id]=el;}} className={'map-event-card '+(e.side==='red'?'red-event':'blue-event')} data-event-id={e.id} style={{left:card.rect.x,top:card.rect.y,width:card.rect.w,maxHeight:Math.max(150,(root.current?.clientHeight||800)-270)}}><header><time>{String(e.date)}</time><span>{e.side==='red'?'红军':'国民党军'}</span></header><h3>{String(e.place)}</h3><p>{String(e.text)}</p>{e.context&&<p className="event-context">{e.context}</p>}{q&&<section className="march-interaction"><h4>把历史带回脚下</h4><p>{q.question}</p>{chosen===undefined?<div>{q.options.map((option:string,i:number)=><button key={i} onClick={()=>answer(e.id,i)}>{option}</button>)}</div>:<p className="interaction-feedback" role="status">{q.answer===null?'':chosen===q.answer?'与历史上的做法一致。':'历史上的选择有所不同。'}{q.feedback}</p>}</section>}<a href={e.source} target="_blank" rel="noopener noreferrer">{e.sourceLabel||'参考'} ↗</a></div>;})}</div>
 </div>;
}
