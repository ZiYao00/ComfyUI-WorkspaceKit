/**
 * A dependency-free DOM stub, just wide enough to drive
 * entry/ui/topbar-save-button.js. It exists so the "always last" rule can be
 * proven against the real controller instead of only its planner: the failure
 * this guards against is ordering drift caused by a *neighbour's* DOM write,
 * which a pure-function test cannot express.
 *
 * MutationObserver callbacks fire synchronously here. The real one is a
 * microtask, so synchronous delivery is the stricter case: it turns any
 * re-entrancy bug into an immediate stack overflow rather than a hang.
 */

class StubClassList {
  constructor() {
    this.tokens = new Set();
  }

  add(...names) {
    for (const name of names) this.tokens.add(name);
  }

  remove(...names) {
    for (const name of names) this.tokens.delete(name);
  }

  contains(name) {
    return this.tokens.has(name);
  }
}

export class StubElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.classList = new StubClassList();
    this.attributes = new Map();
    this.listeners = new Map();
    this.observers = [];
    this.hidden = false;
    this.disabled = false;
    this.title = "";
    this.textContent = "";
    this.id = "";
    this._className = "";
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = String(value);
    this.classList = new StubClassList();
    this.classList.add(...this._className.split(/\s+/).filter(Boolean));
  }

  get lastElementChild() {
    return this.children.at(-1) ?? null;
  }

  get isConnected() {
    let node = this;
    while (node.parentElement) node = node.parentElement;
    return node.isRoot === true;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  dispatch(type) {
    for (const handler of this.listeners.get(type) ?? []) handler({ type });
  }

  detach(child) {
    const index = this.children.indexOf(child);
    if (index < 0) return false;
    this.children.splice(index, 1);
    child.parentElement = null;
    return true;
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parentElement?.detach(node);
      node.parentElement = this;
      this.children.push(node);
    }
    this.notify();
  }

  insertBefore(node, reference) {
    node.parentElement?.detach(node);
    const index = reference ? this.children.indexOf(reference) : -1;
    node.parentElement = this;
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
    this.notify();
    return node;
  }

  remove() {
    const parent = this.parentElement;
    if (!parent) return;
    parent.detach(this);
    parent.notify();
  }

  notify() {
    // Copied before iterating: an observer may disconnect during delivery.
    for (const observer of [...this.observers]) observer.deliver();
  }

  querySelectorAll() {
    return [];
  }
}

export class StubDocument {
  constructor() {
    this.head = new StubElement("head");
    this.head.isRoot = true;
    this.byId = new Map();
  }

  createElement(tagName) {
    const element = new StubElement(tagName);
    const document = this;
    // Mirrors the real getElementById contract closely enough for the
    // "inject the stylesheet once" guard to be exercised.
    Object.defineProperty(element, "id", {
      get() {
        return element._id ?? "";
      },
      set(value) {
        element._id = String(value);
        document.byId.set(element._id, element);
      },
    });
    return element;
  }

  getElementById(id) {
    return this.byId.get(id) ?? null;
  }
}

export function installStubMutationObserver() {
  const previous = globalThis.MutationObserver;
  globalThis.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
      this.targets = [];
    }

    observe(target) {
      target.observers.push(this);
      this.targets.push(target);
    }

    disconnect() {
      for (const target of this.targets) {
        const index = target.observers.indexOf(this);
        if (index >= 0) target.observers.splice(index, 1);
      }
      this.targets = [];
    }

    deliver() {
      this.callback([], this);
    }
  };
  return () => {
    globalThis.MutationObserver = previous;
  };
}

/**
 * Reproduces the part of ComfyUI's top bar this feature depends on:
 * `app.menu.element` is a flex row whose children are the three native
 * ComfyButtonGroups, appended into the Vue-rendered legacy container.
 */
export function createTopbarFixture(doc) {
  const legacyContainer = doc.createElement("div");
  legacyContainer.isRoot = true;
  legacyContainer.dataset.testid = "legacy-topbar-container";

  const menuElement = doc.createElement("div");
  menuElement.className = "flex gap-2 mx-2";

  const groups = ["actionsGroup", "settingsGroup", "viewGroup"].map((name) => {
    const group = doc.createElement("div");
    group.className = "comfyui-button-group";
    group.dataset.nativeGroup = name;
    return group;
  });
  menuElement.append(...groups);
  legacyContainer.append(menuElement);

  const [actionsGroup, settingsGroup, viewGroup] = groups;
  return { legacyContainer, menuElement, actionsGroup, settingsGroup, viewGroup };
}
