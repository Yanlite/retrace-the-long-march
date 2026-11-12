import {timeline} from '../lib/timeline.mjs';
console.table(timeline.map(e=>({id:e.id,routeIndex:e.routeIndex,virtualKm:Number((e.meters/1000).toFixed(2)),mode:e.mode,headline:e.headline})));
