import {timeline} from './timeline.mjs';
import {milestones} from './engine.mjs';
const node=id=>milestones.find(e=>e.id===id)?.meters??Infinity;
const at=place=>timeline.find(e=>e.place===place)?.meters??Infinity;
const beat=id=>timeline.find(e=>e.id===id)?.meters??Infinity;
const regions=[
 {id:'xiangjiang',from:timeline.find(e=>e.part===1)?.meters??0,to:timeline.find(e=>e.id==='chishui-old-plan').meters,rivers:['湘江'],places:['道县','全州','兴安','灌阳','文市','新圩','脚山铺','光华铺','界首','凤凰嘴渡口']},
 {id:'zunyi',from:timeline.find(e=>e.id==='chishui-old-plan').meters,to:at('遵义'),rivers:['乌江'],places:['通道','黎平','遵义','贵阳']},
 {id:'chishui-early',from:at('遵义'),to:beat('chishui-zhaxi-ring'),rivers:['赤水河','乌江','长江'],places:['习水','遵义','土城','青杠坡','元厚','叙永','扎西','赤水']},
 {id:'chishui-zhaxi',from:beat('chishui-zhaxi-ring'),to:beat('chishui-second'),rivers:['赤水河','长江'],places:['扎西','镇雄','彝良','毕节','叙永','太平渡','二郎滩']},
 {id:'chishui-second',from:beat('chishui-second'),to:beat('chishui-city-retaken'),rivers:['赤水河'],places:['太平渡','二郎滩','桐梓','官店','娄山关','板桥']},
 {id:'chishui-city',from:beat('chishui-city-retaken'),to:beat('chishui-new-net'),rivers:[],places:['遵义','老鸦山','红花岗','忠庄铺']},
 {id:'chishui-luban',from:beat('chishui-new-net'),to:beat('chishui-third'),rivers:['赤水河','乌江'],places:['遵义','鸭溪','鲁班场','金沙','仁怀','茅台']},
 {id:'chishui-third',from:beat('chishui-third'),to:beat('chishui-fourth'),rivers:['赤水河','长江'],places:['茅台','古蔺','叙永','太平渡','九溪口','二郎滩']},
 {id:'chishui-south',from:beat('chishui-fourth'),to:beat('chishui-guiyang-feint'),rivers:['赤水河','乌江'],places:['太平渡','二郎滩','仁怀','鸭溪','沙土','乌江南渡区']},
 {id:'chishui-guiyang',from:beat('chishui-guiyang-feint'),to:at('昆明外围'),rivers:['乌江'],places:['乌江南渡区','息烽','贵阳','清水河佯渡区','龙里']},
 {id:'jinsha',from:at('昆明外围'),to:at('安顺场'),rivers:['金沙江'],places:['昆明','皎平渡','龙街渡']},
 {id:'dadu',from:at('安顺场'),to:at('夹金山'),rivers:['大渡河'],places:['西昌','安顺场','泸定桥']},
];
/** @type {{id:string,rivers:string[],places:string[]}} */
const empty={id:'none',rivers:[],places:[]};
export function geographyAt(meters){return regions.find(e=>meters>=e.from&&meters<e.to)||empty;}
// Calendar interpolation is an illustrative mapping of route progress, not a daily troop itinerary.
export function dateAt(meters){
 let previous=timeline[0],next;
 for(const e of timeline){if(e.meters>meters){next=e;break;}previous=e;}
 const first=Date.parse(previous.date+'T00:00:00Z');
 const last=next?Date.parse(next.date+'T00:00:00Z'):first;
 const t=next?Math.max(0,Math.min(1,(meters-previous.meters)/(next.meters-previous.meters||1))):0;
 return new Date(first+(last-first)*t);
}

export function monthAt(meters){
 const d=dateAt(meters);
 return d.getUTCFullYear()*12+d.getUTCMonth();
}

const hunanArmy={id:'second-sixth-hunan',label:'红二、六军团',region:'湘西',point:[29.12,109.9],radius:42000};
const sichuanArmy={id:'fourth-sichuan',label:'红四方面军',region:'川陕边界',point:[32.2,107],radius:80000};
const meetingArmy={id:'fourth-maogong',label:'红四方面军',region:'懋功会师地区',point:[31.0,102.55],radius:35000};
export function alliedRegionsAt(meters,events=[]){
 const result=[];const area=geographyAt(meters).id;
 if(['xiangjiang','zunyi'].includes(area)||area.startsWith('chishui'))result.push(hunanArmy);
 const reference=events.find(e=>[e.text,e.context].join(' ').includes('红四方面军'));
 const regional=meters>=timeline.find(e=>e.id==='chishui-strategy').meters&&meters<timeline.find(e=>e.date==='1935-03-15').meters;
 if(reference&&String(reference.date)>='1935-06-01'&&String(reference.date)<'1935-08-01')result.push(meetingArmy);
 else if(regional||(reference&&String(reference.date)<'1935-03-15'))result.push(sichuanArmy);
 return result;
}

// p02 frames 30–32: blue approach from Xishui toward Qinggangpo/Tucheng.
// Direction and extent are schematic; do not imply a precise daily troop position.
export function tuchengDeploymentAt(meters){return meters>=beat('chishui-blocked')&&meters<beat('chishui-crossing');}
