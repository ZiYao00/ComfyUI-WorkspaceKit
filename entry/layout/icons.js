const SVG_NS = "http://www.w3.org/2000/svg";

function element(document, name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function line(document, x1, y1, x2, y2) {
  return element(document, "line", { x1, y1, x2, y2, "vector-effect": "non-scaling-stroke" });
}

function rect(document, x, y, width, height, rx = 0.8) {
  return element(document, "rect", { x, y, width, height, rx, "vector-effect": "non-scaling-stroke" });
}

function path(document, d) {
  return element(document, "path", { d, "vector-effect": "non-scaling-stroke" });
}

function createSvg(document) {
  const svg = element(document, "svg", {
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
    focusable: "false",
  });
  svg.classList.add("workspacekit-layout-command-icon");
  return svg;
}

function addBadge(svg, document, kind) {
  if (kind === "plus") {
    svg.append(line(document, 18, 16, 18, 22), line(document, 15, 19, 21, 19));
  } else if (kind === "minus") {
    svg.append(line(document, 15, 19, 21, 19));
  }
}

/**
 * Compact alignment icons use the same visual grammar as professional Adobe-like
 * layout tools: a guide/axis plus differently-sized objects. The SVGs are an
 * independent WorkspaceKit implementation; they are not copied Adobe assets.
 */
export function createLayoutCommandIcon(document = globalThis.document, commandId) {
  if (!document?.createElementNS) return null;
  const svg = createSvg(document);

  switch (commandId) {
    case "workspacekit.layout.align.left":
      svg.append(
        line(document, 3, 3, 3, 21),
        rect(document, 6, 5, 11, 4),
        rect(document, 6, 13, 15, 4),
      );
      break;
    case "workspacekit.layout.align.horizontal-center":
      svg.append(
        line(document, 12, 3, 12, 21),
        rect(document, 6, 5, 12, 4),
        rect(document, 4, 13, 16, 4),
      );
      break;
    case "workspacekit.layout.align.right":
      svg.append(
        line(document, 21, 3, 21, 21),
        rect(document, 7, 5, 11, 4),
        rect(document, 3, 13, 15, 4),
      );
      break;
    case "workspacekit.layout.align.top":
      svg.append(
        line(document, 3, 3, 21, 3),
        rect(document, 5, 6, 4, 11),
        rect(document, 13, 6, 4, 15),
      );
      break;
    case "workspacekit.layout.align.vertical-center":
      svg.append(
        line(document, 3, 12, 21, 12),
        rect(document, 5, 6, 4, 12),
        rect(document, 13, 4, 4, 16),
      );
      break;
    case "workspacekit.layout.align.bottom":
      svg.append(
        line(document, 3, 21, 21, 21),
        rect(document, 5, 7, 4, 11),
        rect(document, 13, 3, 4, 15),
      );
      break;
    case "workspacekit.layout.distribute.horizontal":
      svg.append(
        line(document, 3, 3, 3, 21),
        line(document, 21, 3, 21, 21),
        rect(document, 6, 7, 3, 10),
        rect(document, 10.5, 5, 3, 14),
        rect(document, 15, 7, 3, 10),
      );
      break;
    case "workspacekit.layout.distribute.vertical":
      svg.append(
        line(document, 3, 3, 21, 3),
        line(document, 3, 21, 21, 21),
        rect(document, 7, 6, 10, 3),
        rect(document, 5, 10.5, 14, 3),
        rect(document, 7, 15, 10, 3),
      );
      break;
    case "workspacekit.layout.spacing.horizontal":
      svg.append(
        rect(document, 3, 5, 5, 14),
        rect(document, 16, 5, 5, 14),
        line(document, 9.5, 12, 14.5, 12),
        path(document, "M11.5 9.7 9.2 12l2.3 2.3M12.5 9.7l2.3 2.3-2.3 2.3"),
      );
      break;
    case "workspacekit.layout.spacing.vertical":
      svg.append(
        rect(document, 5, 3, 14, 5),
        rect(document, 5, 16, 14, 5),
        line(document, 12, 9.5, 12, 14.5),
        path(document, "M9.7 11.5 12 9.2l2.3 2.3M9.7 12.5l2.3 2.3 2.3-2.3"),
      );
      break;
    case "workspacekit.layout.size.equal-width":
      svg.append(rect(document, 3, 5, 15, 5), rect(document, 3, 14, 15, 5));
      addBadge(svg, document, "plus");
      break;
    case "workspacekit.layout.size.equal-min-width":
      svg.append(rect(document, 3, 5, 15, 5), rect(document, 6, 14, 12, 5));
      addBadge(svg, document, "minus");
      break;
    case "workspacekit.layout.size.equal-height":
      svg.append(rect(document, 5, 3, 5, 15), rect(document, 14, 3, 5, 15));
      addBadge(svg, document, "plus");
      break;
    case "workspacekit.layout.size.equal-min-height":
      svg.append(rect(document, 5, 3, 5, 15), rect(document, 14, 6, 5, 12));
      addBadge(svg, document, "minus");
      break;
    case "workspacekit.layout.size.equal-both":
      svg.append(
        rect(document, 4, 4, 12, 12),
        rect(document, 8, 8, 12, 12),
        path(document, "M4 20h16M20 4v16"),
      );
      break;
    default:
      svg.append(rect(document, 6, 6, 12, 12));
  }

  return svg;
}
