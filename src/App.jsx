import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  Copy,
  Eyedropper,
  GearSix,
  Trash,
} from "@phosphor-icons/react";

const DEFAULT_COLOR = "#2563EB";
const DEFAULT_RECENT = ["#2563EB", "#EF4444", "#10B981", "#8B5CF6", "#111827"];

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const number = Number.parseInt(value, 16);
  return `rgb(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255})`;
}

function normalizeHex(value) {
  return value.toUpperCase();
}

async function loadRecentColors() {
  if (globalThis.chrome?.storage?.local) {
    const result = await chrome.storage.local.get("recentColors");
    return result.recentColors ?? DEFAULT_RECENT;
  }

  const saved = localStorage.getItem("prism-pick-recent");
  return saved ? JSON.parse(saved) : DEFAULT_RECENT;
}

async function saveRecentColors(colors) {
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({ recentColors: colors });
    return;
  }

  localStorage.setItem("prism-pick-recent", JSON.stringify(colors));
}

async function writeToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy is unavailable");
}

export function App() {
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [recentColors, setRecentColors] = useState(DEFAULT_RECENT);
  const [copiedField, setCopiedField] = useState("");
  const [isPicking, setIsPicking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fallbackPicker = useRef(null);

  useEffect(() => {
    loadRecentColors().then(setRecentColors).catch(() => setRecentColors(DEFAULT_RECENT));
  }, []);

  const selectColor = async (nextColor) => {
    const normalized = normalizeHex(nextColor);
    setColor(normalized);
    const updated = [normalized, ...recentColors.filter((item) => item !== normalized)].slice(0, 5);
    setRecentColors(updated);
    await saveRecentColors(updated);
  };

  const startPicking = async () => {
    setIsPicking(true);
    try {
      if (globalThis.EyeDropper) {
        const result = await new EyeDropper().open();
        await selectColor(result.sRGBHex);
      } else {
        fallbackPicker.current?.click();
      }
    } catch (error) {
      if (error?.name !== "AbortError") console.error(error);
    } finally {
      setIsPicking(false);
    }
  };

  const copyValue = async (field, value) => {
    await writeToClipboard(value);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(""), 1600);
  };

  const clearHistory = async () => {
    setRecentColors([color]);
    await saveRecentColors([color]);
    setIsMenuOpen(false);
  };

  const rgb = hexToRgb(color);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/icons/icon-128.png" alt="" className="brand-mark" />
          <span>Prism Pick</span>
        </div>
        <div className="settings-wrap">
          <button
            className="icon-button settings-button"
            type="button"
            aria-label="Open settings"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((value) => !value)}
          >
            <GearSix size={24} weight="regular" />
          </button>
          {isMenuOpen && (
            <div className="settings-menu" role="menu">
              <button type="button" role="menuitem" onClick={clearHistory}>
                <Trash size={16} />
                Clear recent colors
              </button>
            </div>
          )}
        </div>
      </header>

      <p className="intro">Pick any color from the page and copy its value.</p>

      <section className="color-preview" style={{ "--selected-color": color }} aria-label={`Selected color ${color}`}>
        <strong>{color}</strong>
      </section>

      <button className="pick-button" type="button" onClick={startPicking} disabled={isPicking}>
        <Eyedropper size={22} weight="regular" />
        {isPicking ? "Picking…" : "Pick from page"}
      </button>
      <input
        ref={fallbackPicker}
        className="fallback-picker"
        type="color"
        aria-label="Choose a color"
        value={color}
        onChange={(event) => selectColor(event.target.value)}
      />

      <section className="values" aria-label="Color values">
        <div className="value-row">
          <span className="value-label">HEX</span>
          <div className="value-field">
            <span>{color}</span>
            {copiedField === "hex" && (
              <span className="copied-message" role="status">
                <CheckCircle size={17} weight="fill" /> Copied!
              </span>
            )}
            <button type="button" aria-label="Copy HEX value" onClick={() => copyValue("hex", color)}>
              <Copy size={20} />
            </button>
          </div>
        </div>

        <div className="value-row">
          <span className="value-label">RGB</span>
          <div className="value-field">
            <span>{rgb}</span>
            {copiedField === "rgb" && (
              <span className="copied-message" role="status">
                <CheckCircle size={17} weight="fill" /> Copied!
              </span>
            )}
            <button type="button" aria-label="Copy RGB value" onClick={() => copyValue("rgb", rgb)}>
              <Copy size={20} />
            </button>
          </div>
        </div>
      </section>

      <section className="recent-section" aria-labelledby="recent-title">
        <h2 id="recent-title">Recent colors</h2>
        <div className="recent-list">
          {recentColors.map((recentColor) => (
            <button
              className="recent-color"
              type="button"
              key={recentColor}
              aria-label={`Select ${recentColor}`}
              onClick={() => selectColor(recentColor)}
            >
              <span className="swatch" style={{ backgroundColor: recentColor }} />
              <span>{recentColor}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="escape-hint">Press Esc to cancel picking</p>
    </main>
  );
}
