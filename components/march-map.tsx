"use client";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import MarchInteraction from './march-interaction';
import type * as Leaflet from 'leaflet';
import { milestones, routePosition } from '../lib/engine.mjs';
import { routePoints } from '../lib/history.mjs';
import {eventAnchor,eventPlaces,interactionFor,places} from '../lib/event-places.mjs';
import {geographyAt,alliedRegionsAt,tuchengDeploymentAt} from '../lib/map-context.mjs';
import {layoutCards,cardEdge} from '../lib/event-layout.mjs';
import {cameraPoints} from '../lib/camera-points.mjs';
import {controlAt} from '../lib/place-control.mjs';
type Props={realMeters:number;walking:boolean;events:any[];meters:number;follow:boolean;overview:number;resetRevision:number;layer:'terrain'|'satellite';onStatus:(s:string)=>void;onEventsVisible:(ids:string[])=>void;onInteractionComplete:(id:string)=>void};
type Scene={map:Leaflet.Map;L:typeof Leaflet;trail:Leaflet.Polyline;marker:Leaflet.Marker;nodes:Leaflet.Marker[];baseRoute:Leaflet.Polyline;baseShadow:Leaflet.Polyline;tile?:Leaflet.TileLayer};
export default function MarchMap({realMeters,walking,events,meters,follow,overview,resetRevision,layer,onStatus,onEventsVisible,onInteractionComplete}:Props){
 const root=useRef<HTMLDivElement>(null),scene=useRef<Scene|null>(null),riverLayers=useRef<Record<string,Leaflet.Polyline[]>>({}),moving=useRef(false);
 const returnToMarch = useRef(false);
 const leaders = useRef<SVGSVGElement>(null);
 const geography=geographyAt(meters);
 const geographyRef=useRef(geography);geographyRef.current=geography;
 const labelledPlaces=new Set(events.flatMap(e=>eventPlaces(e).map((p:any)=>p.name))),labelledKey=[...labelledPlaces].join('|');
 const shotKey=events.map(e=>e.id).join('|'),shotRef=useRef(shotKey);shotRef.current=shotKey;
 const [readyShot,setReadyShot]=useState(''),[settledRevision,setSettledRevision]=useState(0);
 const manualView=useRef(false),dragging=useRef(false),rectsRef=useRef<any[]>([]);
 const [viewRevision,setViewRevision]=useState(0);
 const focused=useRef(false);focused.current=follow&&events.length>0;
 const [cards,setCards]=useState<any[]>([]);
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const decisionOpen=events.some(e=>Boolean((interactionFor(e) as any)?.preview)&&answers[e.id]===undefined);
 const decisionRef=useRef(decisionOpen);decisionRef.current=decisionOpen;
 const cardNodes=useRef<Record<string,HTMLDivElement|null>>({});
 const reunionMarkers=useRef<Leaflet.Marker[]>([]);
 const riverData=useRef<Record<string,number[][][]>|null>(null);
 const current=useRef({meters,follow,onStatus,onEventsVisible,onInteractionComplete});current.current={meters,follow,onStatus,onEventsVisible,onInteractionComplete};
 useEffect(()=>{let disposed=false;let resize:ResizeObserver|undefined;
  import('leaflet').then(L=>{if(disposed||!root.current)return;
   const map=L.map(root.current,{zoomControl:false,zoomAnimation:false,zoomSnap:.25,minZoom:3,maxZoom:13,renderer:L.svg({padding:1})});
   map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
   const compact=root.current.clientWidth<600;
   map.setView(routePosition(current.current.meters).point as Leaflet.LatLngTuple,7);
   const baseShadow=L.polyline(routePoints as Leaflet.LatLngTuple[],{color:'#101b18',weight:8,opacity:.75,interactive:false,smoothFactor:0,noClip:true}).addTo(map);
   const baseRoute=L.polyline(routePoints as Leaflet.LatLngTuple[],{color:'#cfb894',weight:2,dashArray:'5 7',opacity:.65,interactive:false,smoothFactor:0,noClip:true}).addTo(map);
   // Keep the completed line in the same SVG projection as the full route.
   const trail=L.polyline([],{color:'#ee654b',weight:4,interactive:false,smoothFactor:0,noClip:true,className:'completed-route'}).addTo(map);
   const major=new Set([0,1,3,4,5,6,9,10,11]);
   const directions:Leaflet.Direction[]=compact?['left','bottom','right','right','right','right','right','right','right','right','right','right']:['right','bottom','left','right','left','left','left','right','left','right','left','right'];
   const nodes=milestones.map((e,i)=>L.marker(e.point as Leaflet.LatLngTuple,{interactive:false,icon:L.divIcon({className:`history-dot ${major.has(i)?'':'minor-route-dot'}`,html:`<span>${String(i+1).padStart(2,'0')}</span>`,iconSize:[23,23],iconAnchor:[11,11]})}).addTo(map).bindTooltip(e.name,{permanent:true,direction:directions[i],offset:directions[i]==='bottom'?[0,11]:[directions[i]==='right'?12:-12,0],className:`route-label ${major.has(i)?'':'minor-route-label'}`}));
   const marker=L.marker(routePoints[0] as Leaflet.LatLngTuple,{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'march-marker',html:'<span class="marker-halo"></span><span class="marker-core">★</span>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(map);
   [[35.69,105.05],[35.82,105.68]].forEach(([lat,lng],i)=>{const m=L.marker([lat,lng],{interactive:false,icon:L.divIcon({className:'reunion-dot',html:'◇',iconSize:[15,15]})}).addTo(map);m.bindTooltip(i===0?'1936 · 会宁 · 红一、四方面军会师':'1936 · 将台堡 · 红一、二方面军会师',{permanent:true,direction:compact?'right':'left',offset:[compact?5:-5,0],className:'context-label'});reunionMarkers.current.push(m);const visible=current.current.meters>=milestones[milestones.length-1].meters;m.setOpacity(visible?1:0);m.getTooltip()?.setOpacity(visible?1:0);});
   [[30.6,99.6,'青 藏 高 原'],[29.0,105.0,'四 川 盆 地'],[25.5,105.7,'云 贵 高 原'],[28.2,111.6,'湖 南'],[27.5,115.1,'江 西'],[35.4,108.9,'陕 西']].forEach(([lat,lng,name])=>L.marker([Number(lat),Number(lng)],{interactive:false,icon:L.divIcon({className:'geography-label',html:String(name),iconSize:[120,20]})}).addTo(map));
   scene.current={map,L,trail,marker,nodes,baseRoute,baseShadow};
   // Leaflet 1.9 scales its SVG container during flyTo. CSS non-scaling-stroke
   // cannot undo that outer raster scaling. Reproject the shared renderer on
   // every zoom frame so routes, rivers and circles keep their screen widths.
   const vectorRenderer=map.getRenderer(trail) as Leaflet.Renderer&{_reset:()=>void};
   map.on('zoom',()=>vectorRenderer._reset());
   map.on('movestart zoomstart',()=>{moving.current=true;root.current?.parentElement?.classList.add('camera-moving');});
   map.on('moveend',()=>{moving.current=false;
    const p=routePosition(current.current.meters);trail.setLatLngs(p.line as Leaflet.LatLngTuple[]);marker.setLatLng(p.point as Leaflet.LatLngTuple);
    root.current?.parentElement?.classList.remove('camera-moving');setReadyShot(shotRef.current);setSettledRevision(v=>v+1);});
   const inspect=()=>{manualView.current=true;returnToMarch.current=false;map.stop();};
   map.on('dragstart',()=>{dragging.current=true;inspect();});
   map.on('dragend',()=>{dragging.current=false;});
   map.getContainer().addEventListener('wheel',inspect,{passive:true});
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
 // Manual browsing lasts until the next marching-position update.
 useEffect(()=>{const s=scene.current;if(!s)return;const p=routePosition(meters);
  if(!moving.current){s.trail.setLatLngs(p.line as Leaflet.LatLngTuple[]);s.marker.setLatLng(p.point as Leaflet.LatLngTuple);}
  reunionMarkers.current.forEach(marker=>{const visible=meters>=milestones[milestones.length-1].meters;marker.setOpacity(visible?1:0);marker.getTooltip()?.setOpacity(visible?1:0);});
  s.nodes.forEach((node,i)=>node.getElement()?.classList.toggle('passed',milestones[i].meters<=meters+.01));
  if(!follow){returnToMarch.current=false;s.map.stop();s.map.fire('moveend');return;}
  if(dragging.current)return;
  if(manualView.current){manualView.current=false;setViewRevision(v=>v+1);}
  if(!focused.current&&!moving.current&&!returnToMarch.current)s.map.panTo(p.point as Leaflet.LatLngTuple,{animate:false});
 },[meters,follow]);
 useEffect(() => {
  const s = scene.current;
  if (!s || resetRevision === 0) return;
  manualView.current = false;
  returnToMarch.current = false;
  s.map.stop();
  s.map.setView(routePosition(0).point as Leaflet.LatLngTuple, 7, {animate: false});
 }, [resetRevision]);
 // A shot must contain every leader endpoint in the unobscured map area.
 useEffect(()=>{
  const frame=()=>{const s=scene.current;if(!s)return;
   if (!follow || manualView.current || dragging.current) {
    setReadyShot(shotKey);
    return;
   }
   if (!events.length) {
    const shouldReturn = returnToMarch.current;
    returnToMarch.current = false;
    if (shouldReturn) {
     s.map.stop();
     const destination = routePosition(current.current.meters).point as Leaflet.LatLngTuple;
     s.map.panTo(destination, {animate: true, duration: .65});
    } else {
     setReadyShot(shotKey);
    }
    return;
   }
   const size=s.map.getSize(),compact=size.x<600;
   const entries=events.map(e=>({id:e.id,height:interactionFor(e)?340:210}));
   rectsRef.current=layoutCards(entries,size.x,size.y,[],rectsRef.current);
   const reserved=rectsRef.current;
   const safe={left:compact?28:Math.max(...reserved.map(r=>r.x+r.w))+32,right:size.x-36,top:compact?Math.max(...reserved.map(r=>r.y+r.h))+24:90,bottom:size.y-180};
   const points=cameraPoints(events,compact) as Leaflet.LatLngTuple[];
   if(!points.length||safe.bottom-safe.top<60){setReadyShot(shotKey);return;}
   const bounds=s.L.latLngBounds(points).pad(.1),safeW=safe.right-safe.left,safeH=safe.bottom-safe.top;
   const maxZoom=Math.min(...events.map(e=>e.focus?.maxZoom??11))+(compact?.75:0);
   const zoom=Math.max(3,Math.min(maxZoom,s.map.getBoundsZoom(bounds,false,s.L.point(size.x-safeW,size.y-safeH))));
   const visible=points.every(point=>{const p=s.map.latLngToContainerPoint(point);return p.x>=safe.left&&p.x<=safe.right&&p.y>=safe.top&&p.y<=safe.bottom;});
   if(visible&&s.map.getZoom()>=zoom-.8){setReadyShot(shotKey);return;}
   const nw=s.map.project(bounds.getNorthWest(),zoom),se=s.map.project(bounds.getSouthEast(),zoom);
   const center=s.map.unproject(nw.add(se).divideBy(2).subtract(s.L.point((safe.left+safe.right-size.x)/2,(safe.top+safe.bottom-size.y)/2)),zoom);
   returnToMarch.current = true;
   s.map.stop();s.map.flyTo(center,zoom,{duration:.65});
  };frame();const el=root.current;el?.addEventListener('map-ready',frame);const resize=()=>frame();scene.current?.map.on('resize',resize);
  return()=>{el?.removeEventListener('map-ready',frame);scene.current?.map.off('resize',resize);};
 },[shotKey,follow,viewRevision]);
 useEffect(()=>{if(readyShot===shotKey&&!moving.current)current.current.onEventsVisible(events.map(e=>e.id));},[readyShot,shotKey,settledRevision]);
 // A direction choice must not reveal the already-authored answer in the route.
 useEffect(()=>{const draw=()=>{const s=scene.current;if(!s||moving.current)return;const hidden=decisionRef.current;
  const line=hidden?routePosition(current.current.meters).line:routePoints;
  s.baseRoute.setLatLngs(line as Leaflet.LatLngTuple[]);s.baseShadow.setLatLngs(line as Leaflet.LatLngTuple[]);
  s.nodes.forEach((node,i)=>{const show=!hidden||milestones[i].meters<=current.current.meters;node.setOpacity(show?1:0);const label=node.getTooltip()?.getElement();if(label)label.style.visibility=show?'':'hidden';});
 };draw();const map=scene.current?.map;map?.on('moveend',draw);const el=root.current;el?.addEventListener('map-ready',draw);return()=>{map?.off('moveend',draw);el?.removeEventListener('map-ready',draw);};},[decisionOpen]);
 useEffect(()=>{const s=scene.current;if(s&&overview>0){const compact=(root.current?.clientWidth||0)<600;s.map.flyToBounds(s.L.latLngBounds(routePoints as Leaflet.LatLngTuple[]),{paddingTopLeft:compact?[45,90]:[90,90],paddingBottomRight:compact?[45,190]:[90,210],duration:1});}},[overview]);
 // Keep each river path in one renderer for its lifetime. Recreating paths during
 // a flyTo zoom projects them at a different zoom from the existing SVG container.
 useEffect(()=>{let alive=true;let attached:Leaflet.Map|undefined;let loading=false;
  const draw=async()=>{const s=scene.current;if(!s||loading||Object.keys(riverLayers.current).length)return;loading=true;
   try{if(!riverData.current){const r=await fetch(new URL('rivers.json',document.baseURI).href);if(!r.ok)return;riverData.current=(await r.json()).rivers;}
    if(!alive||!riverData.current)return;
    // Wait for a stable projection before initially adding the shared paths.
    if(moving.current)return;
    for(const [name,lines] of Object.entries(riverData.current)){
     const visible=geographyRef.current.rivers.includes(name);const paths:Leaflet.Polyline[]=[];
     for(const line of lines){
      paths.push(s.L.polyline(line as Leaflet.LatLngTuple[],{color:'#59c8ed',weight:7,opacity:visible?.12:0,interactive:false,smoothFactor:0,noClip:true,className:'river-glow'}).addTo(s.map));
      paths.push(s.L.polyline(line as Leaflet.LatLngTuple[],{color:'#9be4ff',weight:2.5,opacity:visible?.95:0,interactive:false,smoothFactor:0,noClip:true,className:'river-highlight'}).addTo(s.map));
     }riverLayers.current[name]=paths;
    }
   }catch{}finally{loading=false;}
  };
  const setup=()=>{if(scene.current){attached=scene.current.map;attached.on('moveend',draw);}void draw();};
  setup();const el=root.current;el?.addEventListener('map-ready',setup);
  return()=>{alive=false;attached?.off('moveend',draw);el?.removeEventListener('map-ready',setup);Object.values(riverLayers.current).flat().forEach(p=>p.remove());riverLayers.current={};};
 },[]);
 useEffect(()=>{for(const [name,paths] of Object.entries(riverLayers.current)){const visible=geography.rivers.includes(name);paths.forEach((p,i)=>p.setStyle({opacity:visible?(i%2?.95:.12):0}));}},[geography.id]);
 useEffect(()=>{const markers:Leaflet.Marker[]=[];const draw=()=>{const s=scene.current;if(!s)return;markers.splice(0).forEach(p=>p.remove());
  for(const name of geography.places){const point=(places as Record<string,number[]>)[name];if(!point)continue;
   markers.push(s.L.marker(point as Leaflet.LatLngTuple,{interactive:false,icon:s.L.divIcon({className:'interval-place-dot',html:'<span></span>',iconSize:[8,8],iconAnchor:[4,4]})}).addTo(s.map).bindTooltip(name,{permanent:true,direction:'right',offset:[7,0],className:'interval-place-label',opacity:labelledPlaces.has(name)?0:1}));
  }
 };draw();const el=root.current;el?.addEventListener('map-ready',draw);return()=>{markers.forEach(p=>p.remove());el?.removeEventListener('map-ready',draw);};
 },[geography.id,labelledKey]);
 const controls=controlAt(meters).filter(e=>geography.places.includes(e.place)),controlKey=controls.map(e=>e.place+e.side).join('|');
 useEffect(()=>{const layers:Leaflet.Layer[]=[];const draw=()=>{const s=scene.current;if(!s||moving.current||layers.length)return;
  for(const control of controls){const p=(places as Record<string,number[]>)[control.place];if(!p)continue;
   const color=control.side==='red'?'#df745d':'#8ab6dc';
   layers.push(s.L.circleMarker(p as Leaflet.LatLngTuple,{radius:18,color,weight:1,opacity:.38,fillColor:color,fillOpacity:.12,interactive:false,className:'place-control place-control-'+control.side}).addTo(s.map));
  }
 };const map=scene.current?.map;draw();map?.on('moveend',draw);const el=root.current;el?.addEventListener('map-ready',draw);return()=>{map?.off('moveend',draw);el?.removeEventListener('map-ready',draw);layers.forEach(l=>l.remove());};},[controlKey,geography.id]);
 // Keep battlefield context after an individual report has left the screen.
 const showTucheng=tuchengDeploymentAt(meters),showYangtze=geography.rivers.includes('长江');
 useEffect(()=>{const layers:Leaflet.Layer[]=[];const draw=()=>{const s=scene.current;if(!s||moving.current||layers.length)return;
  if(showTucheng){
   layers.push(s.L.polyline([[28.33,106.21],[28.31,106.16],[28.30,106.11],[28.30,106.06]],{color:'#91bee3',weight:2,dashArray:'5 5',opacity:.8,interactive:false,smoothFactor:0,noClip:true}).addTo(s.map));
   layers.push(s.L.marker([28.30,106.06],{interactive:false,icon:s.L.divIcon({className:'army-approach-arrow',html:'←',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(s.map));
   layers.push(s.L.marker([28.31,106.13],{interactive:false,icon:s.L.divIcon({className:'army-approach-label',html:'川军追兵<small>由东逼近 · 示意</small>',iconSize:[110,36],iconAnchor:[55,40]})}).addTo(s.map));
  }
  if(showYangtze)layers.push(s.L.marker([28.94,105.45],{interactive:false,icon:s.L.divIcon({className:'river-name-label',html:'长 江',iconSize:[54,22],iconAnchor:[27,11]})}).addTo(s.map));
 };let map:Leaflet.Map|undefined;const setup=()=>{map=scene.current?.map;map?.off('moveend',draw);map?.on('moveend',draw);draw();};setup();const el=root.current;el?.addEventListener('map-ready',setup);return()=>{map?.off('moveend',draw);el?.removeEventListener('map-ready',setup);layers.forEach(l=>l.remove());};},[showTucheng,showYangtze]);
 // This is the demonstrative column with the headquarters radio, not the main route.
 const showGulinFeint=geography.id==='chishui-third';
 useEffect(()=>{const layers:Leaflet.Layer[]=[];let attached:Leaflet.Map|undefined;
  const draw=()=>{const s=scene.current;if(!s||moving.current||!showGulinFeint||layers.length)return;
   layers.push(s.L.polyline([[27.88,106.31],[27.96,106.15],[28.01,105.99],[28.04,105.81]],{color:'#e4a48b',weight:2,dashArray:'5 7',opacity:.75,interactive:false,smoothFactor:0,noClip:true}).addTo(s.map));
   layers.push(s.L.marker([28.01,105.99],{interactive:false,icon:s.L.divIcon({className:'maneuver-label',html:'佯动部队＋总部电台 → 古蔺',iconSize:[180,22],iconAnchor:[90,11]})}).addTo(s.map));
  };const setup=()=>{attached=scene.current?.map;attached?.on('moveend',draw);draw();};setup();const el=root.current;el?.addEventListener('map-ready',setup);
  return()=>{attached?.off('moveend',draw);el?.removeEventListener('map-ready',setup);layers.forEach(l=>l.remove());};
 },[showGulinFeint]);
 // Allied locations are regional context, not daily troop positions.
 const allied=alliedRegionsAt(meters,events);
 const alliedKey=allied.map(e=>e.id).join('|');
 useEffect(()=>{const layers:Leaflet.Layer[]=[];const draw=()=>{const s=scene.current;if(!s)return;
  for(const army of allied){
   layers.push(s.L.circle(army.point as Leaflet.LatLngTuple,{radius:army.radius,color:'#e7957b',weight:1,dashArray:'5 7',fillOpacity:.04,interactive:false}).addTo(s.map));
   layers.push(s.L.marker(army.point as Leaflet.LatLngTuple,{interactive:false,icon:s.L.divIcon({className:'allied-army-label',html:army.label+'<small>'+army.region+' · 区域示意</small>',iconSize:[150,40],iconAnchor:[75,20]})}).addTo(s.map));
  }
 };draw();const el=root.current;el?.addEventListener('map-ready',draw);return()=>{layers.forEach(l=>l.remove());el?.removeEventListener('map-ready',draw);};},[alliedKey]);
 useEffect(()=>{let raf=0;let attached:Leaflet.Map|undefined;
 const update=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const s=scene.current;if(!s||moving.current)return;const size=s.map.getSize();
  const project=(point:any)=>s.map.latLngToContainerPoint(point as Leaflet.LatLngTuple);
  const route=[];for(let i=1;i<routePoints.length;i++){const a=project(routePoints[i-1]),b=project(routePoints[i]);for(let j=0;j<=8;j++)route.push({x:a.x+(b.x-a.x)*j/8,y:a.y+(b.y-a.y)*j/8});}
  s.nodes.forEach((node,i)=>{const label=node.getTooltip()?.getElement();if(label)label.style.visibility=(decisionRef.current&&milestones[i].meters>current.current.meters)||[...labelledPlaces].some(name=>(String(milestones[i].place)+String(milestones[i].name)).includes(name))?'hidden':'';});
  const entries=events.map(e=>({event:e,id:e.id,anchor:project(eventAnchor(e)),height:cardNodes.current[e.id]?.getBoundingClientRect().height||(interactionFor(e)?345:235)}));
  const rects=layoutCards(entries,size.x,size.y,route,rectsRef.current);rectsRef.current=rects;
  setCards(entries.map((entry,i)=>({...entry,rect:rects[i],places:eventPlaces(entry.event)})));
 });};
 const setup=()=>{const s=scene.current;if(!s)return;attached=s.map;s.map.on('moveend zoomend resize',update);update();};setup();const el=root.current;el?.addEventListener('map-ready',setup);
 const resize=new ResizeObserver(update);Object.values(cardNodes.current).forEach(el=>{if(el)resize.observe(el);});
 return()=>{cancelAnimationFrame(raf);attached?.off('moveend zoomend resize',update);el?.removeEventListener('map-ready',setup);resize.disconnect();};
 },[events,answers]);
 // Update the overlay in the same Leaflet frame as the base map.
 useLayoutEffect(() => {
  const s = scene.current;
  if (!s || !leaders.current) return;
  const groups = leaders.current.querySelectorAll('g[data-leader]');
  const pins = cards.flatMap(card => {
   const places = card.places.length ? card.places : [{point:eventAnchor(card.event)}];
   return places.map((place:{point:number[]}, index:number) => ({point:place.point, rect:card.rect, index}));
  });
  const update = () => {
   const width = s.map.getSize().x;
   pins.forEach(({point, rect, index}, i) => {
    const group = groups[i];
    const screen = s.map.latLngToContainerPoint(point as Leaflet.LatLngTuple);
    const edge = cardEdge(rect, screen);
    const [line, circle, label] = Array.from(group.children);
    line.setAttribute('x1', String(edge.x));
    line.setAttribute('y1', String(edge.y));
    line.setAttribute('x2', String(screen.x));
    line.setAttribute('y2', String(screen.y));
    circle.setAttribute('cx', String(screen.x));
    circle.setAttribute('cy', String(screen.y));
    const alignLeft = screen.x > width - 120;
    label.setAttribute('text-anchor', alignLeft ? 'end' : 'start');
    label.setAttribute('x', String(screen.x + (alignLeft ? -10 : 10)));
    label.setAttribute('y', String(screen.y + (index >= 4 && index % 2 === 0 ? 16 : -9)));
   });
  };
  update();
  s.map.on('move resize', update);
  return () => { s.map.off('move resize', update); };
 }, [cards]);
 const cardsReady = readyShot === shotKey && cards.map(card => card.id).join('|') === shotKey;
 function answer(event:any,index:number){const id=event.id,q=interactionFor(event);setAnswers(old=>{const next={...old,[id]:index};try{localStorage.setItem('long-march-reflections-v1',JSON.stringify(next));}catch{}return next;});
  if(q&&(index===-1||!['dispatch','compare'].includes(q.kind)||index===(1<<q.options.length)-1))current.current.onInteractionComplete(id);
 }

 return <div className="map-canvas"><div ref={root} className="map-surface" role="img" aria-label="中央红军长征历史示意地图"/>
  <svg ref={leaders} className="event-leaders" style={{visibility:cardsReady?undefined:'hidden'}} aria-hidden="true">
   {cards.flatMap(card => (card.places.length ? card.places : [{name:String(card.event.place),point:eventAnchor(card.event)}]).map((place:{name:string;point:number[]}, i:number) => (
    <g key={card.id+'-'+i} data-leader="" className={card.event.side==='red'?'red-leader':'blue-leader'}>
     <line strokeDasharray={i?'3 5':undefined}/><circle r={i?4:6}/>
     <text>{place.name.replace(/ · /g,'·').replace(/方向/g,'').replace(/（示意）/g,'')}</text>
    </g>
   )))}
  </svg>
  <div className="event-card-layer" style={{visibility:cardsReady?undefined:"hidden"}}>{cards.map(card=>{const e=card.event,q=interactionFor(e) as any,chosen=answers[e.id],preview=chosen===undefined?q?.preview:undefined;return <div key={e.id} ref={el=>{cardNodes.current[e.id]=el;}} className={'map-event-card '+(e.side==='red'?'red-event':'blue-event')+(e.playbackMode==='flash'?' flash-event':'')} data-event-id={e.id} style={{left:card.rect.x,top:card.rect.y,width:card.rect.w,maxHeight:card.rect.h}}><header><time>{String(e.dateLabel||e.date)}</time><span>{e.side==='red'?'红军':'国民党军'}</span></header><h3>{String(preview?.headline||e.headline||e.place)}</h3><p>{String(preview?.text||e.text)}</p>{!preview&&e.context&&<p className="event-context">{e.context}</p>}{q&&e.playbackMode!=='flash'&&<MarchInteraction realMeters={realMeters} walking={walking} event={e} chosen={chosen} onAnswer={i=>answer(e,i)}/>} <a href={e.source} target="_blank" rel="noopener noreferrer">{e.sourceLabel||'参考'} ↗</a></div>;})}</div>
 </div>;
}
