import {chishuiPlaces} from './chishui-geography.mjs';
import interactions from '../data/interactions.json' with {type:'json'};
// WGS84 educational location anchors. Regional descriptions without a clear
// locality keep the route trigger point, rather than inventing a troop position.
export const places={
 '红四方面军（川陕边界）':[32.2,107],'红四方面军（懋功地区）':[31.0,102.55],
 '零陵':[26.22,111.62],'红二、六军团（湘西）':[29.12,109.9],
 '绥阳':[27.95,107.19],'团溪':[27.4,107.07],'赤水':[28.59,105.70],'合江':[28.81,105.83],
 '泸州':[28.87,105.44],'宜宾':[28.75,104.64],'重庆':[29.56,106.55],'毕节':[27.30,105.29],
 // Approximate WGS84 locality anchors, not surveyed battle positions.
 '道县':[25.53,111.60],'全州':[25.93,111.07],'兴安':[25.61,110.67],'灌阳':[25.49,111.16],
 '恭城':[24.83,110.83],'文市':[25.69,111.25],'新圩':[25.62,111.20],
 '凤凰嘴渡口':[25.86,111.00],
 '于都':[25.96,115.41],'湘江渡口':[25.64,110.67],'脚山铺':[25.83,111.07],'光华铺':[25.76,110.94],'界首':[25.80,110.95],
 '通道':[26.16,109.78],'黎平':[26.23,109.14],'遵义':[27.70,106.93],'娄山关':[28.13,106.82],'桐梓':[28.15,106.82],
 '土城':[28.31,105.99],'青杠坡':[28.30,106.04],'元厚':[28.45,105.78],'叙永':[28.16,105.44],'扎西':[27.85,105.05],
 '太平渡':[28.15,106.15],'二郎滩':[28.02,106.04],'茅台':[27.86,106.37],'鲁班场':[27.68,106.37],
 '贵阳':[26.58,106.71],'龙里':[26.45,106.98],'昆明':[25.04,102.71],'皎平渡':[26.30,102.37],'龙街渡':[26.26,101.90],
 '西昌':[27.89,102.26],'安顺场':[29.27,102.28],'泸定':[29.91,102.23],'泸定桥':[29.9145,102.230167],
 '夹金山':[30.85,102.70],'懋功':[31.00,102.36],'腊子口':[34.13,103.88],'吴起镇':[36.93,108.18]
};
Object.assign(places,chishuiPlaces);
export function eventPlaces(event){if(event.anchors)return event.anchors;if(event.locations)return event.locations.filter(name=>places[name]).map(name=>({name,point:places[name]}));const text=[event.place,event.text,event.context].join(' '),found=[];
 for(const name of Object.keys(places).sort((a,b)=>b.length-a.length)){if((name==='金沙'?text.replaceAll('金沙江',''):name==='赤水'?text.replaceAll('赤水河','').replace(/[一二三四西东再]?渡赤水/g,''):text).includes(name)&&(name!=='通道'||String(event.place)==='通道'||/通道转兵|通道会议|湖南通道/.test(text))&&!found.some(p=>p.name.includes(name)||name.includes(p.name)))found.push({name,point:places[name]});}
 return found.slice(0,5);
}
export function eventAnchor(event){return event.anchor||eventPlaces({...event,text:'',context:''})[0]?.point||event.point;}
export function interactionFor(event){return interactions[event.id];}
