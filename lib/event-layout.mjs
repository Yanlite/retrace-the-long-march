export function layoutCards(items,width,height,route=[],previous=[]){
 const w=Math.min(width<600?252:286,width-32),top=82,bottom=Math.max(top+120,height-180);
 const capacity=width<600?1:2,slotHeight=(bottom-top-14*(capacity-1))/capacity;
 const old=new Map(previous.filter(r=>r.w===w&&r.viewport===height).map(r=>[r.id,r]));
 const slots=new Set(items.map(e=>old.get(e.id)?.slot).filter(s=>s!==undefined));
 return items.map(item=>{if(old.has(item.id))return old.get(item.id);let slot=0;while(slots.has(slot))slot++;slots.add(slot);return{id:item.id,slot,x:16,y:top+slot*(slotHeight+14),w,h:Math.min(item.height||230,slotHeight),viewport:height};});
}
export function cardEdge(rect,point){return{x:Math.max(rect.x,Math.min(rect.x+rect.w,point.x)),y:Math.max(rect.y,Math.min(rect.y+rect.h,point.y))};}
