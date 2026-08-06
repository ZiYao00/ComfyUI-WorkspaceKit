import assert from "node:assert/strict";
import { openTemplateGroupContextMenu } from "../entry/templates/group-context-menu.js";
class E {
  constructor() { this.children=[]; this.listeners=new Map(); this.style={}; this.className=""; this.textContent=""; }
  append(...x){this.children.push(...x);} addEventListener(k,v){this.listeners.set(k,v);}
  getBoundingClientRect(){return {width:100,height:80};}
}
let bodyMenu;
const documentListeners=new Map();
const document={
  createElement:()=>new E(),
  body:{append:(x)=>{bodyMenu=x;}},
  addEventListener(type,listener){documentListeners.set(type,listener);},
};
const calls=[];
const event={clientX:999,clientY:999,preventDefault(){},stopPropagation(){}};
openTemplateGroupContextMenu({
  document,window:{innerWidth:300,innerHeight:200,setTimeout:(f)=>f()},state:{},t:(k)=>k,el:"panel",event,group:{id:"g"},
  closeMenu:()=>calls.push("close"),closeOnEvent:()=>calls.push("close-on-event"),onError:()=>calls.push("error"),
  onNewSubfolder:async()=>calls.push("new"),onRename:async()=>calls.push("rename"),onPersonalize:async()=>calls.push("personalize"),onResetStyle:async()=>calls.push("reset"),onDelete:async(_el,_group,button)=>calls.push(button === bodyMenu.children[4] ? "delete-anchor" : "delete-missing-anchor"),
});
assert.equal(bodyMenu.children.length,5);
assert.equal(bodyMenu.style.left,"192px");
assert.equal(bodyMenu.style.top,"112px");
assert.equal(typeof documentListeners.get("pointerdown"),"function");
assert.equal(typeof documentListeners.get("keydown"),"function");
await bodyMenu.children[0].listeners.get("click")({stopPropagation(){}});
assert.deepEqual(calls,["close","close","new"]);
await bodyMenu.children[4].listeners.get("click")({stopPropagation(){}});
assert.deepEqual(calls,["close","close","new","delete-anchor"], "delete keeps its menu anchor mounted for inline confirmation");

// T-048: flatten is a separate menu choice, ordered just before delete so the
// two structure-destroying actions sit together at the bottom.
const flatCalls=[];
let flatMenu;
const flatDocument={
  createElement:()=>new E(),
  body:{append:(x)=>{flatMenu=x;}},
  addEventListener(){},
};
openTemplateGroupContextMenu({
  document:flatDocument,window:{innerWidth:300,innerHeight:200,setTimeout:(f)=>f()},state:{},t:(k)=>k,el:"panel",event,group:{id:"g"},
  closeMenu:()=>{},closeOnEvent:()=>{},onError:()=>{},
  onNewSubfolder:async()=>{},onRename:async()=>{},onPersonalize:async()=>{},onResetStyle:async()=>{},
  onDelete:async()=>flatCalls.push("delete"),
  onFlatten:async(_el,_group,button)=>flatCalls.push(button === flatMenu.children[4] ? "flatten-anchor" : "flatten-missing-anchor"),
});
assert.equal(flatMenu.children.length,6);
assert.equal(flatMenu.children[4].textContent,"templates.flattenGroup");
assert.equal(flatMenu.children[5].textContent,"templates.deleteGroup");
// Flatten must keep the menu mounted: closing it first would detach the anchor
// and leave its confirmation invisible, exactly as for delete.
await flatMenu.children[4].listeners.get("click")({stopPropagation(){}});
assert.deepEqual(flatCalls,["flatten-anchor"]);

console.log("template group context-menu contract passed");
