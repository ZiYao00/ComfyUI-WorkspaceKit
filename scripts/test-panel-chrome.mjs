import assert from "node:assert/strict";
import { createPanelChrome } from "../entry/ui/panel-chrome.js";

class Element {
  constructor() { this.children=[]; this.listeners=new Map(); this.dataset={}; this.style={setProperty:(key,value)=>{this.style[key]=value;}}; this.className=""; this.textContent=""; this.value=""; this.hidden=false; }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this[name] = value; }
  focus() { this.focused = true; }
}

const calls = [];
const { createPanelHeader, createSearchToolbar } = createPanelChrome({
  document: { createElement: () => new Element() },
  translate: (key) => key,
  iconSvg: (name) => ({ icon: name }),
  prepareInput: () => calls.push("prepare"),
});
const header = createPanelHeader("Title", "Status", { statusDataset: "workspace2Status" });
assert.equal(header.children[0].textContent, "Title");
assert.equal(header.children[1].textContent, "Status");
assert.equal(header.children[1].dataset.workspace2Status, "1");

const action = new Element();
const toolbar = createSearchToolbar({ focusKey:"query", placeholder:"Search", value:"initial", onInput:(value)=>calls.push(`input:${value}`), buttons:[action] });
const search = toolbar.children[0].children[0];
const clear = toolbar.children[0].children[1];
assert.equal(toolbar.style["--workspace2-toolbar-actions"], "1");
assert.equal(search.dataset.workspace2Focus, "query");
assert.equal(clear.hidden, false);
search.value = "中";
search.listeners.get("compositionstart")({});
search.listeners.get("input")({isComposing:true});
assert.equal(calls.includes("input:中"), false);
search.listeners.get("compositionend")({});
assert.equal(calls.includes("input:中"), true);
clear.listeners.get("click")({preventDefault(){},stopPropagation(){}});
assert.equal(search.value, "");
assert.equal(clear.hidden, true);
assert.equal(search.focused, true);
assert.equal(calls.includes("input:"), true);
console.log("panel chrome contract passed");
