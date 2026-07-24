// Delete remains a ComfyUI-native shortcut unless a WorkspaceKit group is
// selected. A direct group selection can coexist with stale native-node
// selection, so the group selection deliberately wins in that case; otherwise
// the first Delete would reach ComfyUI, clear native selection, and only the
// second Delete would remove the intended group frame.
import { isEditableTarget } from "./selection-cancel-events.js";

export function shouldDeleteSelectedWorkspaceKitGroups(event, {
  activeElement,
  selectedGroupCount = 0,
} = {}) {
  return event?.key === "Delete"
    && !event.repeat
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
    && !isEditableTarget(activeElement)
    && Number(selectedGroupCount) > 0;
}
