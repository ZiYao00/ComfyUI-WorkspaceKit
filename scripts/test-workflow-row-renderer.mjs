import assert from "node:assert/strict";
import { renderWorkflowBrowseNode } from "../entry/workflows/row-renderer.js";

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = new Map();
    this.className = "";
    this.dataset = {};
    this.style = { setProperty() {} };
    this.classList = { add() {} };
  }
  append(...children) { this.children.push(...children); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
}

globalThis.document = { createElement: (tagName) => new Element(tagName) };

const calls = [];
const iconButton = (icon, title, action) => {
  const button = new Element("button");
  button.icon = icon;
  button.title = title;
  button.addEventListener("click", action);
  return button;
};
const node = { type: "file", path: "folder/example.json", name: "example.json", size_bytes: 128 };
const list = new Element("div");
renderWorkflowBrowseNode({
  state: { query: "", expanded: new Set(), selectedPath: "", editingPath: "", editingSurface: "", customOrderEnabled: false },
  t: (key) => key,
  matchesQuery: () => true,
  visibleChildren: () => [],
  parentPath: () => "folder",
  workflowFolderMeta: () => ({}),
  applyDecoratedIcon: () => {},
  defaultFolderIconClass: "folder",
  defaultFolderOpenIconClass: "folder-open",
  defaultFileIconClass: "file",
  getDisplayName: (item) => item.name.replace(/\.json$/, ""),
  createRenameInput: () => new Element("input"),
  iconButton,
  dangerIconButton: iconButton,
  onCloseContextMenu: () => {},
  onToggleFolder: () => {},
  onOpenWorkflow: async () => {},
  onOpenContextMenu: () => {},
  onPointerDrag: () => {},
  onDropTarget: () => {},
  onReorderDrag: () => {},
  onNewSubfolder: async () => {},
  onOpenWorkflowLocation: async () => {},
  onCopyWorkflow: async (_el, item) => calls.push(`copy:${item.path}`),
  onRename: () => calls.push("rename"),
  onMoveToTrash: async () => {},
  onError: (error) => { throw error; },
}, "panel", list, node, 0);

const actions = list.children[0].children[4];
assert.deepEqual(actions.children.map((button) => button.icon), ["folderOpen", "copy", "edit", "trash"]);
const event = { preventDefault() {}, stopPropagation() {} };
await actions.children[1].listeners.get("click")(event);
assert.deepEqual(calls, ["copy:folder/example.json"]);

console.log("Workflow row renderer copy contract passed.");
