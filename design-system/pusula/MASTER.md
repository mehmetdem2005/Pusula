# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **TOKEN BASE:** The canonical, runnable source of these tokens is
> `tools/_kit.mjs` (`TOKENS` + `CSS`). All mockups in `design/mockups/` are
> rendered from it. Keep this file and the kit in sync.

---

**Project:** Pusula
**Updated:** 2026-05-25
**Category:** Real Estate / second-hand listings marketplace
**Direction:** Light Editorial — Apple / Linear minimal (content-first, real photography)

---

## Global Rules

### Color Palette

| Role                  | Hex / Value | CSS Variable |
| --------------------- | ----------- | ------------ |
| Ink (text, dark CTA)  | `#0A0B0D`   | `--ink`      |
| Sub (secondary text)  | `#5B6470`   | `--sub`      |
| Faint (tertiary/meta) | `#9AA1AB`   | `--faint`    |
| Background (surface)  | `#FFFFFF`   | `--bg`       |
| Page (canvas)         | `#E9EAEE`   | `--page`     |
| Soft (fill / inputs)  | `#F6F7F9`   | `--soft`     |
| Line (border)         | `#ECECF0`   | `--line`     |
| Line-2 (control edge) | `#E4E6EA`   | `--line-2`   |
| Kelepir / positive    | `#15803D`   | `--green`    |
| Kelepir fill          | `#E7F3EC`   | `--green-bg` |
| Warning               | `#B45309`   | `--amber`    |

**Color Notes:** One ink for text and the single dark CTA. Green is reserved
**only** for the Kelepir (bargain) signal — never decorative. No gradients on
chrome, no neon, no pink. Photography supplies the color.

### Typography

- **Font (heading + body):** Inter
- **Headings:** weight 600–700, tracking `-0.022em` (`.h`)
- **Prices / numerics:** `font-variant-numeric: tabular-nums`, tracking `-0.01em` (`.tnum`)
- **Eyebrow:** 11px, 600, `letter-spacing:.15em`, uppercase, color `--faint`
- **Mood:** trustworthy, calm, editorial, premium, content-first

**CSS Import:**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
```

### Spacing Scale

| Token         | Value  | Usage                      |
| ------------- | ------ | -------------------------- |
| `--space-xs`  | `4px`  | Tight gaps                 |
| `--space-sm`  | `8px`  | Icon gaps, chip gaps       |
| `--space-md`  | `16px` | Standard padding           |
| `--space-lg`  | `24px` | Section padding / dividers |
| `--space-xl`  | `32px` | Large gaps                 |
| `--space-2xl` | `48px` | Section margins            |

### Radii

| Element          | Radius    |
| ---------------- | --------- |
| Chips / pills    | `999px`   |
| Buttons / inputs | `12–14px` |
| Cards            | `16–18px` |
| Avatars          | `50%`     |

### Shadows (soft, never harsh)

| Token           | Value                                                                | Usage          |
| --------------- | -------------------------------------------------------------------- | -------------- |
| `--shadow-soft` | `0 1px 2px rgba(16,24,40,.04), 0 12px 30px -16px rgba(16,24,40,.16)` | Hero, featured |
| `--shadow-card` | `0 1px 2px rgba(16,24,40,.05), 0 8px 24px -18px rgba(16,24,40,.22)`  | Listing cards  |

---

## Component Specs

### Buttons

```css
/* Primary — the single ink CTA per view */
.btn-dark {
  background: #0a0b0d;
  color: #fff;
  border: none;
  font: 600 15px Inter;
  border-radius: 12px;
  height: 46–54px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 200ms ease;
}
.btn-dark:hover {
  transform: translateY(-1px);
}

/* Ghost — secondary action */
.btn-ghost {
  background: #fff;
  color: #0a0b0d;
  border: 1px solid #e4e6ea;
  font: 600 15px Inter;
  border-radius: 12px;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #fff;
  border: 1px solid #ececf0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transition: all 200ms ease;
  cursor: pointer;
}
.card:hover {
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  background: #f6f7f9;
  border: 1px solid #ececf0;
  border-radius: 14px;
  padding: 0 16px;
  height: 46px;
  font-size: 15px;
  transition: border-color 200ms ease;
}
.input::placeholder {
  color: #9aa1ab;
}
.input:focus {
  border-color: #0a0b0d;
  outline: none;
}
```

### Chips

```css
.chip {
  background: #f6f7f9;
  border: 1px solid #ececf0;
  border-radius: 999px;
  padding: 7px 13px;
  font-size: 13px;
  font-weight: 500;
  color: #5b6470;
  cursor: pointer;
}
.chip.on {
  background: #0a0b0d;
  border-color: #0a0b0d;
  color: #fff;
}
```

### Kelepir badge (the brand signal)

```css
/* On photography: translucent green pill, white text, sparkle icon */
.badge-green {
  background: rgba(21, 128, 61, 0.92);
  color: #fff;
}
/* On surfaces: tinted pill */
.badge-soft {
  background: #e7f3ec;
  border: 1px solid #cfe6d8;
  color: #15803d;
}
```

---

## Navigation

- **Mobile:** frosted bottom nav, 5 slots — Akış · Keşfet · **(+ İlan ver, center ink tile)** · Listeler · Profil.
- **Web:** hairline top nav — `Pusula` wordmark · Akış / Keşfet / Listelerim / Asistan · `İlan ver` (ghost) + avatar.

## Page Pattern

- **Strategy:** content-first; photography leads; one ink CTA per view.
- **Section order (detail):** 1. Photo/hero, 2. Title + price (tnum), 3. Specs, 4. Kelepir skoru, 5. Gallery/details, 6. CTA.
- **Feed/Explore:** photo-led cards with overlaid Kelepir badge + save; tabular prices; hairline meta.

---

## Anti-Patterns (Do NOT Use)

- ❌ Dark "cinema" backgrounds, neon glow, pink, heavy gradients on chrome
- ❌ Green used decoratively (reserve it for the Kelepir signal)
- ❌ Poor / stocky photos — use real, well-lit property photography
- ❌ **Emojis as icons** — use SVG icons (Lucide / Heroicons)
- ❌ **Missing cursor:pointer** on clickable elements
- ❌ **Layout-shifting hovers** (use translate, not size jumps)
- ❌ **Low contrast text** (< 4.5:1)
- ❌ **Instant state changes** — always transition 150–300ms
- ❌ **Invisible focus states**

---

## Pre-Delivery Checklist

- [ ] Tokens match `tools/_kit.mjs` (`TOKENS` + `CSS`)
- [ ] Inter font; headings `-0.022em`; prices `tabular-nums`
- [ ] Single ink CTA per view; green only for Kelepir
- [ ] No emojis as icons; consistent SVG icon set
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover/focus states with 150–300ms transitions
- [ ] Text contrast ≥ 4.5:1
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375 / 768 / 1024 / 1440px
- [ ] No content hidden behind fixed navbars; no horizontal scroll on mobile
