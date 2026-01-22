# 🎨 UI Design Standards - VivaTour Style

> **Version:** 1.0  
> **Ngày tạo:** 08/01/2026  
> **Dựa trên:** VivaTour Operator Module UI  
> **Mục đích:** Tiêu chuẩn thiết kế UI cho các dự án Next.js + Tailwind CSS + shadcn/ui

---

## 📋 Mục Lục

1. [Tổng Quan Design System](#1-tổng-quan-design-system)
2. [Color Palette](#2-color-palette)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Components](#5-components)
6. [Patterns & States](#6-patterns--states)
7. [Tailwind Config](#7-tailwind-config)
8. [Code Examples](#8-code-examples)

---

## 1. Tổng Quan Design System

### 1.1 Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VIVATOUR DESIGN PRINCIPLES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. CLARITY (Rõ ràng)                                                       │
│     • Hierarchy rõ ràng với color coding                                    │
│     • Labels và headings nhất quán                                          │
│     • States được phân biệt bằng màu sắc                                    │
│                                                                             │
│  2. EFFICIENCY (Hiệu quả)                                                   │
│     • 2-Panel Layout: List + Detail                                         │
│     • Quick actions luôn visible                                            │
│     • Keyboard shortcuts (Enter, Ctrl+Enter, Esc)                           │
│                                                                             │
│  3. WARMTH (Ấm áp)                                                          │
│     • Màu sắc gradient mềm mại                                              │
│     • Rounded corners (border-radius)                                       │
│     • Shadows tạo depth                                                     │
│                                                                             │
│  4. CONSISTENCY (Nhất quán)                                                 │
│     • Component library chuẩn hóa                                           │
│     • Spacing system 4px base                                               │
│     • Color semantic rõ ràng                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Layout Pattern - 2-Panel Master-Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              2-PANEL LAYOUT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐  ┌────────────────────────────────────────────┐   │
│  │   LEFT PANEL (30%)   │  │           RIGHT PANEL (70%)                │   │
│  │   ─────────────────  │  │           ────────────────                 │   │
│  │                      │  │                                            │   │
│  │  ┌────────────────┐  │  │  ┌──────────────────────────────────────┐  │   │
│  │  │ Header + Search│  │  │  │         Header + Booking Info        │  │   │
│  │  └────────────────┘  │  │  └──────────────────────────────────────┘  │   │
│  │                      │  │                                            │   │
│  │  ┌────────────────┐  │  │  ┌──────────────────────────────────────┐  │   │
│  │  │    Filters     │  │  │  │      Sub-panel: List Items           │  │   │
│  │  └────────────────┘  │  │  │      (Services/Revenue)              │  │   │
│  │                      │  │  └──────────────────────────────────────┘  │   │
│  │  ┌────────────────┐  │  │                                            │   │
│  │  │                │  │  │  ┌──────────────────────────────────────┐  │   │
│  │  │                │  │  │  │      Form Panel: Edit/Create         │  │   │
│  │  │   Item List    │  │  │  │      (with section headers)          │  │   │
│  │  │   (Scrollable) │  │  │  └──────────────────────────────────────┘  │   │
│  │  │                │  │  │                                            │   │
│  │  │                │  │  │  ┌──────────────────────────────────────┐  │   │
│  │  │                │  │  │  │         Action Buttons               │  │   │
│  │  └────────────────┘  │  │  └──────────────────────────────────────┘  │   │
│  │                      │  │                                            │   │
│  └──────────────────────┘  └────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Color Palette

### 2.1 Primary Colors

```css
/* ═══════════════════════════════════════════════════════════════════════════
   PRIMARY GRADIENT (Success/Action)
   Dùng cho: Primary buttons, success states, positive values
   ═══════════════════════════════════════════════════════════════════════════ */

--primary-50: #f0fdf4;
--primary-100: #dcfce7;
--primary-200: #bbf7d0;
--primary-300: #86efac;
--primary-400: #4ade80;
--primary-500: #22c55e;    /* Main green */
--primary-600: #16a34a;
--primary-700: #15803d;
--primary-800: #166534;
--primary-900: #14532d;

/* Gradient */
--primary-gradient: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
```

### 2.2 Accent Colors

```css
/* ═══════════════════════════════════════════════════════════════════════════
   WARNING/EDIT (Amber/Orange)
   Dùng cho: Edit mode, warnings, pending states, section headers
   ═══════════════════════════════════════════════════════════════════════════ */

--warning-50: #fffbeb;
--warning-100: #fef3c7;
--warning-200: #fde68a;
--warning-300: #fcd34d;
--warning-400: #fbbf24;
--warning-500: #f59e0b;    /* Main amber */
--warning-600: #d97706;
--warning-700: #b45309;
--warning-800: #92400e;
--warning-900: #78350f;

/* Orange variant */
--orange-500: #f97316;
--orange-600: #ea580c;

/* Section header gradient */
--section-header-gradient: linear-gradient(90deg, #f59e0b 0%, #f97316 100%);
```

```css
/* ═══════════════════════════════════════════════════════════════════════════
   DANGER (Red)
   Dùng cho: Delete buttons, errors, negative values
   ═══════════════════════════════════════════════════════════════════════════ */

--danger-50: #fef2f2;
--danger-100: #fee2e2;
--danger-200: #fecaca;
--danger-300: #fca5a5;
--danger-400: #f87171;
--danger-500: #ef4444;     /* Main red */
--danger-600: #dc2626;
--danger-700: #b91c1c;
--danger-800: #991b1b;
--danger-900: #7f1d1d;

/* Gradient */
--danger-gradient: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
```

### 2.3 Header Gradient (Dark Theme)

```css
/* ═══════════════════════════════════════════════════════════════════════════
   HEADER GRADIENT (Purple-Blue)
   Dùng cho: Panel headers, navigation bars
   ═══════════════════════════════════════════════════════════════════════════ */

--header-gradient-start: #4f46e5;   /* Indigo */
--header-gradient-mid: #6366f1;     /* Indigo lighter */
--header-gradient-end: #7c3aed;     /* Violet */

/* Full gradient */
--header-gradient: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #7c3aed 100%);

/* Alternative: Teal-Blue */
--header-gradient-alt: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
```

### 2.4 Neutral Colors

```css
/* ═══════════════════════════════════════════════════════════════════════════
   NEUTRALS (Gray scale)
   ═══════════════════════════════════════════════════════════════════════════ */

--neutral-50: #fafafa;     /* Background light */
--neutral-100: #f4f4f5;    /* Card background */
--neutral-200: #e4e4e7;    /* Borders, dividers */
--neutral-300: #d4d4d8;    /* Disabled states */
--neutral-400: #a1a1aa;    /* Placeholder text */
--neutral-500: #71717a;    /* Secondary text */
--neutral-600: #52525b;    /* Primary text */
--neutral-700: #3f3f46;    /* Headers */
--neutral-800: #27272a;    /* Dark text */
--neutral-900: #18181b;    /* Darkest */
```

### 2.5 Semantic Color Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SEMANTIC COLOR MAPPING                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Context                    │ Color                    │ Example            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Success / Positive         │ primary-500 (#22c55e)    │ Save button        │
│  Warning / Edit Mode        │ warning-500 (#f59e0b)    │ Edit badge         │
│  Danger / Delete            │ danger-500 (#ef4444)     │ Delete button      │
│  Info / Default             │ blue-500 (#3b82f6)       │ Info badge         │
│  Locked / Disabled          │ neutral-400 (#a1a1aa)    │ Lock badge         │
│  Section Headers            │ orange-500 (#f97316)     │ "THÔNG TIN..."     │
│  Money / Currency           │ warning-500 (#f59e0b)    │ "91.299.404 VND"   │
│  Negative Values            │ danger-500 (#ef4444)     │ "-28.110.000"      │
│  Selected Item              │ warning-100 (#fef3c7)    │ List item bg       │
│  Panel Header               │ header-gradient          │ "Danh sách..."     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Typography

### 3.1 Font Family

```css
/* System font stack optimized for Vietnamese */
--font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                    Roboto, 'Helvetica Neue', Arial, sans-serif;

--font-family-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### 3.2 Font Sizes

```css
/* Scale based on 16px root */
--text-xs: 0.75rem;      /* 12px - Labels, badges */
--text-sm: 0.875rem;     /* 14px - Secondary text, inputs */
--text-base: 1rem;       /* 16px - Body text */
--text-lg: 1.125rem;     /* 18px - Card titles */
--text-xl: 1.25rem;      /* 20px - Section headers */
--text-2xl: 1.5rem;      /* 24px - Panel headers */
--text-3xl: 1.875rem;    /* 30px - Page titles */
--text-4xl: 2.25rem;     /* 36px - Hero text */

/* Special: Large numbers (currency display) */
--text-currency: 1.25rem; /* 20px */
--text-currency-lg: 1.5rem; /* 24px */
```

### 3.3 Font Weights

```css
--font-normal: 400;      /* Body text */
--font-medium: 500;      /* Labels, emphasis */
--font-semibold: 600;    /* Subheadings, buttons */
--font-bold: 700;        /* Headings, important values */
```

### 3.4 Typography Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TYPOGRAPHY PATTERNS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PANEL HEADER (Dark background)                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Font: text-2xl (24px)                                                    │
│  • Weight: font-bold (700)                                                  │
│  • Color: white                                                             │
│  • Subtext: text-sm, font-normal, white/70                                  │
│                                                                             │
│  Example:                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 📋 Danh sách Booking                           ← Bold, 24px, white     │ │
│  │ Chọn booking để xem và quản lý dịch vụ        ← Normal, 14px, white/70 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  SECTION HEADER (Form sections)                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Font: text-sm (14px)                                                     │
│  • Weight: font-semibold (600)                                              │
│  • Color: orange-500 (#f97316)                                              │
│  • Transform: uppercase                                                     │
│  • Letter-spacing: 0.05em                                                   │
│                                                                             │
│  Example:                                                                   │
│  THÔNG TIN DỊCH VỤ    ← Orange, uppercase, tracking-wide                   │
│  THÔNG TIN THANH TOÁN                                                       │
│                                                                             │
│  LABEL (Form inputs)                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Font: text-sm (14px)                                                     │
│  • Weight: font-medium (500)                                                │
│  • Color: neutral-700 (#3f3f46)                                             │
│  • Column indicator: text-xs, neutral-400, parentheses                      │
│                                                                             │
│  Example:                                                                   │
│  CHI PHÍ TRƯỚC THUẾ (O)   ← Medium, neutral-700 + (column) in gray         │
│                                                                             │
│  CURRENCY VALUE                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Font: text-xl (20px) or text-lg (18px)                                   │
│  • Weight: font-bold (700)                                                  │
│  • Positive: warning-500 (#f59e0b) with 🔥 icon                             │
│  • Negative: danger-500 (#ef4444)                                           │
│  • Format: xxx.xxx.xxx VND                                                  │
│                                                                             │
│  Example:                                                                   │
│  🔥 91.299.404 VND    ← Bold, 20px, amber                                  │
│  -28.110.000          ← Bold, red                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (4px base)

```css
/* Spacing tokens */
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
```

### 4.2 Component Spacing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT SPACING GUIDE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PANEL PADDING                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Panel header: p-4 (16px) to p-6 (24px)                                   │
│  • Panel content: p-4 (16px) to p-6 (24px)                                  │
│  • Between panels: gap-4 (16px) or gap-6 (24px)                             │
│                                                                             │
│  CARD SPACING                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Card padding: p-3 (12px) to p-4 (16px)                                   │
│  • Card gap (list): gap-2 (8px) to gap-3 (12px)                             │
│  • Card border-radius: rounded-lg (8px) or rounded-xl (12px)                │
│                                                                             │
│  FORM SPACING                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Section gap: space-y-6 (24px)                                            │
│  • Field gap: space-y-4 (16px)                                              │
│  • Label to input: space-y-1.5 (6px) or space-y-2 (8px)                     │
│  • Input padding: px-3 py-2 (12px x 8px)                                    │
│                                                                             │
│  BUTTON SPACING                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Button group gap: gap-2 (8px) or gap-3 (12px)                            │
│  • Button padding (sm): px-3 py-1.5 (12px x 6px)                            │
│  • Button padding (md): px-4 py-2 (16px x 8px)                              │
│  • Button padding (lg): px-6 py-3 (24px x 12px)                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Layout Grid

```css
/* 2-Panel Layout */
.layout-2-panel {
  display: grid;
  grid-template-columns: 380px 1fr;  /* Fixed left, fluid right */
  gap: 0;
  height: 100vh;
}

/* Alternative: Percentage based */
.layout-2-panel-fluid {
  display: grid;
  grid-template-columns: 30% 70%;
  gap: 0;
}

/* Right panel internal grid */
.right-panel-grid {
  display: grid;
  grid-template-rows: auto 1fr auto;  /* Header, Content, Actions */
  gap: 1rem;
}
```

### 4.4 Border Radius

```css
--radius-none: 0;
--radius-sm: 0.25rem;     /* 4px - Small badges */
--radius-md: 0.375rem;    /* 6px - Inputs, small buttons */
--radius-lg: 0.5rem;      /* 8px - Cards, medium buttons */
--radius-xl: 0.75rem;     /* 12px - Large cards */
--radius-2xl: 1rem;       /* 16px - Panels */
--radius-full: 9999px;    /* Circular badges, pills */
```

---

## 5. Components

### 5.1 Badges

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BADGE VARIANTS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BOOKING CODE BADGE                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌──────────────────┐                                                       │
│  │   20250608COK    │  ← bg-primary-500, text-white, rounded-full          │
│  └──────────────────┘    px-3 py-1, text-xs font-semibold                   │
│                                                                             │
│  STATUS BADGES                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────────────┐                                                            │
│  │  Thêm mới   │  ← bg-primary-500, text-white                              │
│  └─────────────┘                                                            │
│  ┌─────────────┐                                                            │
│  │ Đang sửa    │  ← bg-warning-500, text-white                              │
│  └─────────────┘                                                            │
│  ┌─────────────┐                                                            │
│  │    Sửa      │  ← bg-warning-500/20, text-warning-700, border             │
│  └─────────────┘                                                            │
│  ┌─────────────┐                                                            │
│  │  🔒 Đã khóa │  ← bg-neutral-200, text-neutral-600                        │
│  └─────────────┘                                                            │
│                                                                             │
│  TAILWIND CLASSES:                                                          │
│  • Base: inline-flex items-center rounded-full text-xs font-medium          │
│  • Padding: px-2.5 py-0.5 (small) | px-3 py-1 (medium)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Buttons

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BUTTON VARIANTS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRIMARY (Success/Save)                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────┐                                                │
│  │     ➕ Cập nhật         │  ← bg-gradient-to-r from-primary-500           │
│  └─────────────────────────┘    to-primary-600, text-white                  │
│                                 hover: brightness-110, shadow-lg            │
│                                 rounded-lg, px-6 py-2.5                     │
│                                                                             │
│  WARNING (Lock/Edit)                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────┐                                                │
│  │      🔒 Khóa           │  ← bg-gradient-to-r from-warning-500           │
│  └─────────────────────────┘    to-warning-600, text-white                  │
│                                                                             │
│  DANGER (Delete)                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────┐                                                │
│  │      🗑️ Xóa            │  ← bg-gradient-to-r from-danger-500            │
│  └─────────────────────────┘    to-danger-600, text-white                   │
│                                                                             │
│  SECONDARY (Reset/Cancel)                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────┐                                                │
│  │      ↺ Làm mới         │  ← bg-white, border border-neutral-300         │
│  └─────────────────────────┘    text-neutral-700, hover:bg-neutral-50       │
│                                                                             │
│  BUTTON GROUP (Right-aligned)                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐                       │
│  │Làm mới │ │  Khóa   │ │  Xóa    │ │ ➕ Cập nhật │                        │
│  └─────────┘ └─────────┘ └─────────┘ └──────────────┘                       │
│   outline     warning     danger       primary (largest)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Cards

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CARD VARIANTS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LIST ITEM CARD (Normal)                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Kim Bool                                    [20250308KIK]             │ │
│  │  👤 Bao - Kevin  📅 08/03/2025  🌏 Australia                           │ │
│  │  🔥 DT DK: 54.153.000 VND                                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Styles:                                                                    │
│  • bg-white rounded-xl p-4 shadow-sm                                        │
│  • hover:shadow-md transition-shadow                                        │
│  • cursor-pointer                                                           │
│                                                                             │
│  LIST ITEM CARD (Selected)                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  █ Coralie Holloway                          [20250608COK]             │ │
│  │  │ 👤 Bao - Kevin  📅 08/06/2025  🌏 New Zealand                       │ │
│  │  │ 🔥 DT DK: 166.566.000 VND                                           │ │
│  └──┴─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Styles:                                                                    │
│  • bg-primary-50 border-l-4 border-primary-500                              │
│  • OR bg-warning-50 border-l-4 border-warning-500                           │
│  • shadow-md                                                                │
│                                                                             │
│  SERVICE CARD (In list)                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  VMB Quốc tế code BUJA6S                     05/05/2026                │ │
│  │  28.135.000                                  [🔒 Đã khóa]              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  SERVICE CARD (Selected - Yellow highlight)                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │▓▓VMB Quốc tế code BUJA6S                     05/05/2026              ▓▓│ │
│  │▓▓-28.110.000 (red)                                                   ▓▓│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Styles:                                                                    │
│  • bg-warning-100 border border-warning-300                                 │
│                                                                             │
│  BALANCE CARD                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Balance                                                               │ │
│  │  🔥 91.299.404 VND                           📅 22/01/2025            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Styles:                                                                    │
│  • bg-neutral-50 rounded-lg p-3                                             │
│  • Currency: text-warning-500 font-bold text-xl                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Form Inputs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             INPUT VARIANTS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TEXT INPUT                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  CHI PHÍ TRƯỚC THUẾ (O)           ← Label: text-sm font-medium              │
│  ┌────────────────────────────┐                                             │
│  │  VD: 5,000,000             │   ← Placeholder: text-neutral-400           │
│  └────────────────────────────┘                                             │
│                                                                             │
│  Styles:                                                                    │
│  • border border-neutral-300 rounded-md                                     │
│  • px-3 py-2 text-sm                                                        │
│  • focus:ring-2 focus:ring-primary-500 focus:border-primary-500             │
│  • placeholder:text-neutral-400                                             │
│                                                                             │
│  DATE PICKER                                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  NGÀY DÙNG DV *                   ← Required indicator: text-danger-500     │
│  ┌────────────────────────────┐                                             │
│  │  14 / 05 / 2025         📅 │   ← Calendar icon on right                  │
│  └────────────────────────────┘                                             │
│                                                                             │
│  SELECT / DROPDOWN                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  KHOẢN THU * (L)                                                            │
│  ┌────────────────────────────┐                                             │
│  │  Balance                 ▼ │                                             │
│  └────────────────────────────┘                                             │
│                                                                             │
│  COMBOBOX (Searchable Select)                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  LOẠI DỊCH VỤ *                                                             │
│  ┌────────────────────────────┐                                             │
│  │  Chọn hoặc nhập loại dv... │   ← Placeholder với search                  │
│  └────────────────────────────┘                                             │
│                                                                             │
│  CURRENCY INPUT (Special)                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  THU NGOẠI TỆ (Q)                                                           │
│  ┌────────────────────────────┐                                             │
│  │        2.847              │    ← Right-aligned, number format            │
│  └────────────────────────────┘                                             │
│  Nhập số, tự động format          ← Helper text: text-xs text-neutral-500   │
│                                                                             │
│  READ-ONLY VALUE                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  TỔNG TIỀN VND * (T)                                                        │
│  ┌────────────────────────────┐                                             │
│  │       73.338.720          │    ← bg-neutral-100, font-semibold           │
│  └────────────────────────────┘      Auto-calculated                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Panel Headers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PANEL HEADERS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LEFT PANEL HEADER (Dark gradient)                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  │▓  📋 Danh sách Booking                                                ▓│ │
│  │▓  Chọn booking để xem và quản lý dịch vụ                              ▓│ │
│  │▓                                                      [👤 Minh]       ▓│ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Styles:                                                                    │
│  • bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600            │
│  • text-white p-4 rounded-t-2xl                                             │
│  • Title: text-xl font-bold                                                 │
│  • Subtitle: text-sm text-white/70                                          │
│  • User badge: bg-white/20 rounded-full px-3 py-1                           │
│                                                                             │
│  RIGHT PANEL HEADER (Teal/Yellow gradient)                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  │▓  🔶 Chi tiết Dịch vụ                                                 ▓│ │
│  │▓  Xem, thêm, sửa và xóa dịch vụ cho booking đã chọn                   ▓│ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Styles:                                                                    │
│  • bg-gradient-to-r from-teal-600 to-amber-500                              │
│  • OR from-amber-500 to-orange-500 (warmer)                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Empty States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             EMPTY STATES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │                         📄                                             │ │
│  │                    (Illustration)                                      │ │
│  │                                                                        │ │
│  │                  Chưa có dịch vụ nào                                   │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Styles:                                                                    │
│  • Centered vertically and horizontally                                     │
│  • Illustration: 80-120px, muted colors                                     │
│  • Text: text-neutral-500, text-base                                        │
│  • Optional: Call-to-action button below                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Patterns & States

### 6.1 Form States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FORM STATES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CREATE MODE (Thêm mới)                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Badge: "Thêm mới" - bg-primary-500 text-white                            │
│  • Primary button: "➕ Thêm Dịch vụ" - primary gradient                     │
│  • Secondary button: "↺ Làm mới" - outline                                  │
│  • Form fields: Empty, with placeholders                                    │
│                                                                             │
│  EDIT MODE (Đang sửa / Sửa)                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Badge: "Đang sửa" - bg-warning-500 text-white                            │
│  • OR Badge: "Sửa" - bg-warning-100 text-warning-700 border                 │
│  • Primary button: "✓ Cập nhật" - primary gradient                          │
│  • Danger button: "🗑️ Xóa" - danger gradient                               │
│  • Secondary button: "↺ Làm mới" - outline                                  │
│  • Form fields: Pre-filled with existing data                               │
│                                                                             │
│  VIEW MODE (Xem / Locked)                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Badge: "🔒 Đã khóa" - bg-neutral-200 text-neutral-600                    │
│  • All fields: Disabled/read-only (bg-neutral-100)                          │
│  • No action buttons or only "Unlock" for admin                             │
│                                                                             │
│  KEYBOARD SHORTCUTS (shown in header)                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Enter: Lưu                                                               │
│  • Ctrl + Enter: Lưu & Thêm mới                                             │
│  • Esc: Hủy                                                                 │
│                                                                             │
│  Display: text-xs text-neutral-500 in header area                           │
│  Example: "Enter: Lưu | Ctrl + Enter: Lưu & Thêm mới | Esc: Hủy"           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.1.1 Form Validation Edge Cases

Key validation rules enforced across forms (client + server-side):

**Revenue Form (revenue-form.tsx)**
- Payment date: Cannot be in future (validated on blur + submit)
- Messages: Vietnamese validation errors shown in red alert box
- Server validation: Duplicate prevention via unique index on (requestId, paymentDate)

**Operator Form (operator-form.tsx)**
- Service date range: Must fall within request's startDate and endDate
- Validation: onBlur for serviceName field + handleBlur callbacks
- Date range check: Compared against request date boundaries

**Supplier Form (supplier-form.tsx)**
- Code generation: Client-side generation with debounced server-side request
- Race condition fix: Only accepts latest code generation request (ignores stale responses)
- Pre-submit validation: Ensures all required fields populated before API call

**General Rules**
- All currency fields: Must be > 0
- Required fields: Form prevents submit if empty
- Localized messages: All error messages in Vietnamese (VND, dates, etc.)

### 6.2 List Item States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LIST ITEM STATES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NORMAL                                                                     │
│  • bg-white                                                                 │
│  • shadow-sm                                                                │
│  • hover:shadow-md                                                          │
│                                                                             │
│  HOVER                                                                      │
│  • shadow-md                                                                │
│  • scale-[1.01] (subtle)                                                    │
│  • transition-all duration-200                                              │
│                                                                             │
│  SELECTED                                                                   │
│  • bg-primary-50 OR bg-warning-50                                           │
│  • border-l-4 border-primary-500 OR border-warning-500                      │
│  • shadow-md                                                                │
│                                                                             │
│  LOCKED                                                                     │
│  • opacity-75                                                               │
│  • Badge "🔒 Đã khóa"                                                       │
│                                                                             │
│  NEGATIVE VALUE                                                             │
│  • Amount text: text-danger-500                                             │
│  • Optional: bg-danger-50 for emphasis                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Animation & Transitions

```css
/* Standard transitions */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;

/* Common animations */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Hover effects */
.hover-lift {
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Button press effect */
.active-press:active {
  transform: scale(0.98);
}
```

---

## 7. Tailwind Config

### 7.1 Complete tailwind.config.js

```javascript
// tailwind.config.js
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary (Green - Success)
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Warning (Amber/Orange)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Danger (Red)
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'panel': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'gradient-warning': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'gradient-danger': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-header': 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #7c3aed 100%)',
        'gradient-header-warm': 'linear-gradient(135deg, #0d9488 0%, #f59e0b 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### 7.2 CSS Variables (globals.css)

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Brand Colors */
    --color-primary: 142 71% 45%;      /* #22c55e */
    --color-warning: 38 92% 50%;       /* #f59e0b */
    --color-danger: 0 84% 60%;         /* #ef4444 */
    
    /* Semantic Colors */
    --color-success: var(--color-primary);
    --color-error: var(--color-danger);
    --color-info: 217 91% 60%;         /* #3b82f6 */
    
    /* Layout */
    --panel-left-width: 380px;
    --header-height: 80px;
    --border-radius-base: 0.5rem;
    
    /* Shadows */
    --shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    --shadow-card-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    
    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-base: 200ms ease;
  }
}

@layer components {
  /* Panel Header */
  .panel-header {
    @apply bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600;
    @apply text-white p-4 rounded-t-2xl;
  }
  
  .panel-header-warm {
    @apply bg-gradient-to-r from-teal-600 to-amber-500;
    @apply text-white p-4 rounded-t-2xl;
  }
  
  /* Section Header */
  .section-header {
    @apply text-sm font-semibold text-orange-500 uppercase tracking-wide;
  }
  
  /* Booking Badge */
  .badge-booking {
    @apply inline-flex items-center px-3 py-1 rounded-full;
    @apply text-xs font-semibold bg-primary-500 text-white;
  }
  
  /* Status Badges */
  .badge-new {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full;
    @apply text-xs font-medium bg-primary-500 text-white;
  }
  
  .badge-edit {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full;
    @apply text-xs font-medium bg-warning-500 text-white;
  }
  
  .badge-locked {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full;
    @apply text-xs font-medium bg-neutral-200 text-neutral-600;
  }
  
  /* Buttons */
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2;
    @apply px-6 py-2.5 rounded-lg font-medium text-white;
    @apply bg-gradient-to-r from-primary-500 to-primary-600;
    @apply hover:brightness-110 hover:shadow-lg;
    @apply transition-all duration-200;
    @apply active:scale-[0.98];
  }
  
  .btn-warning {
    @apply inline-flex items-center justify-center gap-2;
    @apply px-6 py-2.5 rounded-lg font-medium text-white;
    @apply bg-gradient-to-r from-warning-500 to-warning-600;
    @apply hover:brightness-110 hover:shadow-lg;
    @apply transition-all duration-200;
  }
  
  .btn-danger {
    @apply inline-flex items-center justify-center gap-2;
    @apply px-6 py-2.5 rounded-lg font-medium text-white;
    @apply bg-gradient-to-r from-danger-500 to-danger-600;
    @apply hover:brightness-110 hover:shadow-lg;
    @apply transition-all duration-200;
  }
  
  .btn-outline {
    @apply inline-flex items-center justify-center gap-2;
    @apply px-6 py-2.5 rounded-lg font-medium;
    @apply bg-white border border-neutral-300 text-neutral-700;
    @apply hover:bg-neutral-50;
    @apply transition-all duration-200;
  }
  
  /* Card Styles */
  .card-list-item {
    @apply bg-white rounded-xl p-4 shadow-sm;
    @apply hover:shadow-md transition-shadow;
    @apply cursor-pointer;
  }
  
  .card-list-item-selected {
    @apply bg-primary-50 border-l-4 border-primary-500 shadow-md;
  }
  
  .card-service {
    @apply bg-white rounded-lg p-3;
    @apply hover:bg-neutral-50 transition-colors;
    @apply cursor-pointer;
  }
  
  .card-service-selected {
    @apply bg-warning-100 border border-warning-300;
  }
  
  /* Currency Display */
  .currency-positive {
    @apply text-warning-500 font-bold text-xl;
  }
  
  .currency-negative {
    @apply text-danger-500 font-bold;
  }
  
  /* Form Input */
  .input-field {
    @apply w-full px-3 py-2 text-sm;
    @apply border border-neutral-300 rounded-md;
    @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
    @apply placeholder:text-neutral-400;
    @apply transition-colors duration-200;
  }
  
  .input-readonly {
    @apply bg-neutral-100 cursor-not-allowed;
  }
}

@layer utilities {
  /* Text utilities */
  .text-currency {
    font-variant-numeric: tabular-nums;
  }
  
  /* Scrollbar styling */
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: theme('colors.neutral.300') transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: theme('colors.neutral.300');
    border-radius: 3px;
  }
}
```

---

## 8. Code Examples

### 8.1 Panel Header Component

```tsx
// components/ui/panel-header.tsx
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PanelHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  variant?: 'primary' | 'warm' | 'dark';
  children?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600',
  warm: 'bg-gradient-to-r from-teal-600 to-amber-500',
  dark: 'bg-gradient-to-r from-slate-800 to-slate-700',
};

export function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  variant = 'primary',
  children,
  className,
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'text-white p-4 rounded-t-2xl',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-6 w-6" />}
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && (
              <p className="text-sm text-white/70">{subtitle}</p>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
```

### 8.2 Status Badge Component

```tsx
// components/ui/status-badge.tsx
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type BadgeVariant = 'new' | 'edit' | 'editing' | 'locked' | 'booking';

interface StatusBadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  new: 'bg-primary-500 text-white',
  edit: 'bg-warning-100 text-warning-700 border border-warning-300',
  editing: 'bg-warning-500 text-white',
  locked: 'bg-neutral-200 text-neutral-600',
  booking: 'bg-primary-500 text-white',
};

const defaultLabels: Record<BadgeVariant, string> = {
  new: 'Thêm mới',
  edit: 'Sửa',
  editing: 'Đang sửa',
  locked: 'Đã khóa',
  booking: '',
};

export function StatusBadge({
  variant,
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full',
        'text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {variant === 'locked' && <Lock className="h-3 w-3" />}
      {children || defaultLabels[variant]}
    </span>
  );
}
```

### 8.3 Action Button Group

```tsx
// components/ui/action-buttons.tsx
import { cn } from '@/lib/utils';
import { Plus, RefreshCw, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  mode: 'create' | 'edit';
  onSave: () => void;
  onDelete?: () => void;
  onLock?: () => void;
  onReset: () => void;
  isLoading?: boolean;
  canLock?: boolean;
  className?: string;
}

export function ActionButtons({
  mode,
  onSave,
  onDelete,
  onLock,
  onReset,
  isLoading,
  canLock = true,
  className,
}: ActionButtonsProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3', className)}>
      {/* Reset Button */}
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        disabled={isLoading}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Làm mới
      </Button>

      {/* Lock Button (Edit mode only) */}
      {mode === 'edit' && canLock && onLock && (
        <Button
          type="button"
          className="btn-warning"
          onClick={onLock}
          disabled={isLoading}
        >
          <Lock className="h-4 w-4 mr-2" />
          Khóa
        </Button>
      )}

      {/* Delete Button (Edit mode only) */}
      {mode === 'edit' && onDelete && (
        <Button
          type="button"
          className="btn-danger"
          onClick={onDelete}
          disabled={isLoading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Xóa
        </Button>
      )}

      {/* Primary Save Button */}
      <Button
        type="submit"
        className="btn-primary"
        onClick={onSave}
        disabled={isLoading}
      >
        <Plus className="h-4 w-4 mr-2" />
        {mode === 'create' ? 'Thêm Dịch vụ' : 'Cập nhật'}
      </Button>
    </div>
  );
}
```

### 8.4 Currency Display Component

```tsx
// components/ui/currency-display.tsx
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';

interface CurrencyDisplayProps {
  value: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
};

export function CurrencyDisplay({
  value,
  currency = 'VND',
  size = 'md',
  showIcon = true,
  className,
}: CurrencyDisplayProps) {
  const isNegative = value < 0;
  const formattedValue = Math.abs(value).toLocaleString('vi-VN');

  return (
    <span
      className={cn(
        'font-bold tabular-nums',
        sizeStyles[size],
        isNegative ? 'text-danger-500' : 'text-warning-500',
        className
      )}
    >
      {showIcon && !isNegative && <Flame className="inline h-4 w-4 mr-1" />}
      {isNegative && '-'}
      {formattedValue} {currency}
    </span>
  );
}
```

### 8.5 Section Header Component

```tsx
// components/ui/section-header.tsx
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeader({ children, className }: SectionHeaderProps) {
  return (
    <h3
      className={cn(
        'text-sm font-semibold text-orange-500',
        'uppercase tracking-wide',
        'mb-4',
        className
      )}
    >
      {children}
    </h3>
  );
}
```

### 8.6 List Item Card Component

```tsx
// components/ui/booking-card.tsx
import { cn } from '@/lib/utils';
import { User, Calendar, Globe } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { CurrencyDisplay } from './currency-display';

interface BookingCardProps {
  code: string;
  name: string;
  seller: string;
  date: string;
  country: string;
  revenue: number;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function BookingCard({
  code,
  name,
  seller,
  date,
  country,
  revenue,
  isSelected,
  onClick,
  className,
}: BookingCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl p-4 cursor-pointer transition-all duration-200',
        isSelected
          ? 'bg-primary-50 border-l-4 border-primary-500 shadow-md'
          : 'bg-white shadow-sm hover:shadow-md',
        className
      )}
    >
      {/* Header: Name + Code */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-neutral-800">{name}</h3>
        <StatusBadge variant="booking">{code}</StatusBadge>
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-sm text-neutral-500 mb-2">
        <span className="flex items-center gap-1">
          <User className="h-3.5 w-3.5" />
          {seller}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {date}
        </span>
        <span className="flex items-center gap-1">
          <Globe className="h-3.5 w-3.5" />
          {country}
        </span>
      </div>

      {/* Revenue */}
      <div className="flex items-center">
        <span className="text-sm text-neutral-500 mr-2">DT DK:</span>
        <CurrencyDisplay value={revenue} size="sm" />
      </div>
    </div>
  );
}
```

---

## 📚 Tham Khảo Nhanh

### Color Quick Reference

| Use Case | Tailwind Class | Hex |
|----------|---------------|-----|
| Primary/Success | `bg-primary-500` | #22c55e |
| Warning/Edit | `bg-warning-500` | #f59e0b |
| Danger/Delete | `bg-danger-500` | #ef4444 |
| Section Header | `text-orange-500` | #f97316 |
| Currency Positive | `text-warning-500` | #f59e0b |
| Currency Negative | `text-danger-500` | #ef4444 |
| Panel Header | `from-indigo-600 to-violet-600` | #4f46e5 → #7c3aed |

### Typography Quick Reference

| Element | Classes |
|---------|---------|
| Panel Title | `text-xl font-bold text-white` |
| Section Header | `text-sm font-semibold text-orange-500 uppercase tracking-wide` |
| Form Label | `text-sm font-medium text-neutral-700` |
| Currency Large | `text-xl font-bold text-warning-500` |
| Helper Text | `text-xs text-neutral-500` |

### Component Patterns

```tsx
// Badge
<span className="badge-new">Thêm mới</span>
<span className="badge-edit">Sửa</span>
<span className="badge-locked">🔒 Đã khóa</span>

// Buttons
<button className="btn-primary">Cập nhật</button>
<button className="btn-warning">Khóa</button>
<button className="btn-danger">Xóa</button>
<button className="btn-outline">Làm mới</button>

// Cards
<div className="card-list-item">...</div>
<div className="card-list-item card-list-item-selected">...</div>

// Section Header
<h3 className="section-header">THÔNG TIN DỊCH VỤ</h3>
```

---

*Document created: 08/01/2026*  
*Based on: VivaTour Operator Module UI*  
*Maintainer: Minhnd*
