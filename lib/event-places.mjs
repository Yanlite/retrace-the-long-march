// WGS84 educational location anchors. Regional descriptions without a clear
// locality keep the route trigger point, rather than inventing a troop position.
export const places={
 '于都':[25.96,115.41],'湘江渡口':[25.64,110.67],'脚山铺':[25.83,111.07],'光华铺':[25.60,110.67],'界首':[25.64,110.67],
 '通道':[26.16,109.78],'黎平':[26.23,109.14],'遵义':[27.70,106.93],'娄山关':[28.13,106.82],'桐梓':[28.15,106.82],
 '土城':[28.31,105.99],'青杠坡':[28.30,106.04],'元厚':[28.45,105.78],'叙永':[28.16,105.44],'扎西':[27.85,105.05],
 '太平渡':[28.15,106.15],'二郎滩':[28.02,106.04],'茅台':[27.86,106.37],'鲁班场':[27.68,106.37],
 '贵阳':[26.58,106.71],'龙里':[26.45,106.98],'昆明':[25.04,102.71],'皎平渡':[26.30,102.37],'龙街渡':[26.26,101.90],
 '西昌':[27.89,102.26],'安顺场':[29.27,102.28],'泸定':[29.91,102.23],'泸定桥':[29.91,102.23],
 '夹金山':[30.85,102.70],'懋功':[31.00,102.36],'腊子口':[34.13,103.88],'吴起镇':[36.93,108.18]
};
export function eventPlaces(event){const text=[event.place,event.text,event.context].join(' '),found=[];
 for(const name of Object.keys(places).sort((a,b)=>b.length-a.length)){if(text.includes(name)&&(name!=='通道'||String(event.place)==='通道'||/通道转兵|通道会议|湖南通道/.test(text))&&!found.some(p=>p.name.includes(name)||name.includes(p.name)))found.push({name,point:places[name]});}
 return found.slice(0,5);
}
export function eventAnchor(event){return eventPlaces({...event,text:'',context:''})[0]?.point||event.point;}
export const interactions={
 '土城、元厚渡口':{question:'战斗未能迅速结束，援军仍在靠近。此时怎样保留继续机动的条件？',options:['继续在原地消耗，等待取胜','撤出战斗，渡河调整方向'],answer:1,feedback:'红军依据变化的敌情撤出土城战斗，一渡赤水。实事求是也包括及时修正原计划。'},
 '皎平渡':{question:'船只有限，后续部队不断到达。你负责组织登船，会怎样安排？',options:['统一编组，听从渡运调度','各队自行争取先过江'],answer:0,feedback:'统一调度、按命令登船，使有限运力持续发挥作用。纪律与协作支撑整支队伍通过。'},
 '泸定桥':{question:'突击队攀索时，其他部队最需要怎样配合？',options:['只等待突击队单独完成任务','压制对岸火力，并跟进铺设木板'],answer:1,feedback:'夺桥依靠突击、火力掩护和铺板等任务配合。勇敢与协同共同保障后续部队通过。'},
 '川西北草地':{question:'今天和同伴行走时，如果有人落后，你准备采取哪一个实际行动？',options:['回头确认情况，一起调整节奏','提前约定休息点并共同抵达'],answer:null,feedback:'把互助落实为确认同伴状态、共同安排节奏，是把历史中的集体意识带回日常的一种方式。'}
};

export function interactionFor(event){if(event.place==='皎平渡'&&event.date!=='1935-05-03')return undefined;return interactions[event.place];}
