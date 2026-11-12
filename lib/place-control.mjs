import {timeline} from './timeline.mjs';
const at=id=>timeline.find(e=>e.id===id)?.meters??Infinity;
// Explicit place control/defence in lecture p01–p03. Intervals end at a known
// change or theatre exit; an ending does not imply enemy capture.
const intervals=[
 ['习水','red','chishui-tucheng','chishui-pursuit'],['习水','blue','chishui-pursuit','chishui-crossing'],
 ['道县','red','xiang-aim','xiang-pursuit'],['道县','blue','xiang-pursuit','chishui-old-plan'],
 ['全州','blue','xiang-net','xiang-withdraw'],['兴安','blue','xiang-net','xiang-withdraw'],['灌阳','blue','xiang-net','xiang-withdraw'],
 ['全州','blue','xiang-north-enemy','chishui-old-plan'],['灌阳','blue','xiang-xinxu-line','chishui-old-plan'],['界首','red','xiang-south-line','xiang-closing'],
 ['遵义','red','chishui-zunyi','chishui-advance'],['贵阳','blue','chishui-south','chishui-between-cities'],
 ['娄山关','blue','chishui-pass-defenders','chishui-pass-turn'],['娄山关','red','chishui-pass-turn','chishui-third'],
 ['桐梓','red','chishui-tongzi','chishui-third'],['遵义','red','chishui-city-retaken','chishui-third'],['鲁班场','blue','chishui-enemy-stops','chishui-third'],
];
export function controlAt(meters){return intervals.filter(([,side,from,to])=>meters>=at(from)&&meters<at(to)).map(([place,side,from])=>({place,side,source:timeline.find(e=>e.id===from)?.source}));}
