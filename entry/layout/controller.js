import {
  calculateLayoutCommand,
  layoutCommandState,
} from "./command-registry.js";
import { collectLayoutSelection } from "./selection-service.js";
import { applyLayoutChangeSet } from "./transaction.js";

export function createLayoutController(app, { target = globalThis } = {}) {
  const selection = () => collectLayoutSelection(app, { target });

  return Object.freeze({
    selection,
    state(commandId) {
      return layoutCommandState(commandId, selection());
    },
    execute(commandId, options = {}) {
      const current = selection();
      const changeSet = calculateLayoutCommand(commandId, current, options);
      if (!changeSet.ok) {
        return Object.freeze({ ok: false, reason: changeSet.reason, changeSet, selection: current });
      }
      const result = applyLayoutChangeSet({ app, selection: current, changeSet, target });
      return Object.freeze({ ...result, changeSet, selection: current });
    },
  });
}
