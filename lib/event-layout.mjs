// Screen-space layout: cards avoid each other, controls, distance and route.
export function layoutCards(items,width,height,route=[]){
 const margin=12,w=Math.min(width<600?240:290,width-24),top=82,bottom=Math.max(top+120,height-180),placed=[];
 const intersects=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 for(const item of items){const h=Math.min(item.height||205,Math.max(150,bottom-top));let best=null;
  for(let y=top;y<=Math.max(top,bottom-h);y+=18){for(const x of [...new Set([margin,Math.max(margin,width-w-margin),Math.max(margin,Math.min(width-w-margin,item.anchor.x-w/2))])]){
   const rect={x,y,w,h};const overlap=placed.reduce((s,p)=>s+intersects(rect,p),0);
   const onRoute=route.filter(p=>p.x>x-9&&p.x<x+w+9&&p.y>y-9&&p.y<y+h+9).length;
   const distance=Math.hypot(x+w/2-item.anchor.x,y+h/2-item.anchor.y);
   const coveredPins=items.filter(item=>item.anchor.x>x-14&&item.anchor.x<x+w+14&&item.anchor.y>y-14&&item.anchor.y<y+h+14).length; const score=overlap*200+coveredPins*100000+onRoute*180+distance*.08;
   if(!best||score<best.score)best={...rect,score};
  }}placed.push({...best,id:item.id});
 }return placed;
}
export function cardEdge(rect,point){return {x:Math.max(rect.x,Math.min(rect.x+rect.w,point.x)),y:Math.max(rect.y,Math.min(rect.y+rect.h,point.y))};}
