import { tags as t } from "@lezer/highlight";
import { createTheme } from "@uiw/codemirror-themes";

export const playgroundTheme = createTheme({
  theme: "dark",
  settings: {
    background: "#0a0a0a",
    foreground: "#e4e4e7",
    caret: "#22d3ee",
    selection: "rgba(34, 211, 238, 0.15)",
    selectionMatch: "rgba(34, 211, 238, 0.1)",
    lineHighlight: "rgba(255, 255, 255, 0.03)",
    gutterBackground: "#0a0a0a",
    gutterForeground: "#6b7280",
    gutterBorder: "transparent",
    fontFamily: "'JetBrains Mono', monospace",
  },
  styles: [
    { tag: t.string, color: "#4ade80" },
    { tag: t.number, color: "#22d3ee" },
    { tag: t.bool, color: "#fbbf24" },
    { tag: t.null, color: "#71717a" },
    { tag: t.propertyName, color: "#a1a1aa" },
    { tag: [t.punctuation, t.bracket], color: "#71717a" },
  ],
});
