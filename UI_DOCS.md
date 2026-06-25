# HumanOS — UI/UX Design System Documentation

This document describes the design language, styling tokens, responsive layout structures, and core interface pages developed for HumanOS.

---

## 1. Visual Aesthetics & Design System

HumanOS follows a premium **deep-space glassmorphism** styling system. It combines dark mode layouts, high-contrast typography, and colorful gradients to maximize visual impact.

### 1.1. Color System
Core styling colors are mapped via CSS variables in [src/app/globals.css](file:///c:/Users/PAAPA/Desktop/lifeOs/src/app/globals.css):
- **Dashboard Theme**: `#030712` (zinc-950 base background) with semi-transparent card panels (`bg-white/5` with `backdrop-blur-md`).
- **Accent Theme**: Purple/indigo gradient sweeps (`from-purple-600 to-indigo-600`).
- **Interactive States**: Clean hover highlights (`hover:bg-white/10`, `hover:border-white/20`).

### 1.2. Relationship Color Codes
Relationships across the application (like the network graph and lists) are color-classified to differentiate connection groups immediately:

| Class | Key Keywords | CSS Color (Hex) | Visual Meaning |
| :--- | :--- | :--- | :--- |
| **Family** | `family`, `mum`, `mummy`, `mom`, `dad`, `brother`, `sister`, `aunt`, `aunty`, `uncle` | Rose (`#f43f5e`) | High priority connections |
| **Close Friends** | `close friend`, `best friend`, `bff` | Fuchsia (`#d946ef`) | Tight personal inner circle |
| **Friends** | `friend`, `friends`, `buddy`, `pal`, `mate` | Emerald (`#10b981`) | Active social network |
| **Classmates** | `classmate`, `school`, `peer`, `uni` | Blue (`#3b82f6`) | Professional & school network |
| **Custom / Custom Aliases**| Custom inputs | Amber (`#eab308`) | Other customized user categories |

---

## 2. Core Layout & Responsive Design

- **Left Sidebar**: Desktop view mounts a fixed glassmorphic sidebar containing main routing controls (Dashboard, Network Graph, Analytics, Settings).
- **Mobile Navigation Bar**: Collapses the left sidebar into a bottom navigation bar or top dropdown menu on screens below `768px` wide, ensuring usability on mobile phones.
- **Glassmorphic Cards**: Cards are layered using:
  - `bg-white/5`
  - `backdrop-blur-md`
  - `border-white/10`
  - `shadow-[0_4px_30px_rgba(0,0,0,0.1)]`

---

## 3. Major Screens & Components

### 3.1. Dashboard (`/dashboard`)
The primary connection feed and verification hub.
- **Import Review Banner**: A gradient-themed card (`from-purple-950/50 to-indigo-950/50`) that appears dynamically if imported contacts have a `pending_verification` status.
- **Verification Modal**: Initiated from the banner, this glassmorphic popup steps users through unverified contacts. For each record, users can:
  - Edit the name and relationship category.
  - Review all parsed phone lines in a clean, vertical stack.
  - Choose to **Confirm** (saves to database), **Skip**, or **Reject** (deletes candidate) immediately.
- **Connection Grid**: Displays contact profile cards showing names, categorized tags, average health score indicators, and quick action icons.

### 3.2. Relationship Network Graph (`/dashboard/network`)
A dynamic 2D force-directed canvas visualizing user connections.
- **Node Size Equation**: Configured to scale from size `6` to `36` based on strength score (`6 + (strength_score) * 0.3`) to highlight close relationships visually. The user's center node is locked at size `45` to serve as a prominent hub.
- **Visual Color Legend**: A floating glassmorphic container displaying color-coded classes (Rose $\rightarrow$ Family, Fuchsia $\rightarrow$ Close Friends, etc.).
- **Node Click Editor Sidebar**: Clicking a node halts navigation and glides out a right-side control drawer, enabling inline modification of the contact's name, relationship type, and strength, plus direct access to their full timeline profiles.

### 3.3. Network Analytics (`/dashboard/analytics`)
Visual insights detailing communication activity.
- **Alias Grouping Normalizer**: Employs case-insensitive parsing to combine capitalization differences and spelling aliases (e.g. "aunt" and "aunty" combine into `"Aunt"`; "mum" and "mummy" combine into `"Mum/Mother"`).
- **Visual Analytics Charts**:
  - *Network Distribution*: Recharts Pie Chart representing connection type ratios.
  - *Average Health*: Multi-bar chart representing Strength vs Trust scores across groups.
  - *Interactions timeline*: Area gradient chart plotting communication frequency over the last 6 months.

### 3.4. App Settings & Profile (`/dashboard/settings`)
Account configurations and storage monitoring.
- **Account Details form**: Inputs for updating user handle, avatar files, profile data, and custom Gemini API keys.
- **Offline Storage Progress Meter**: A visual dashboard monitoring client-side cache state:
  - Total cache bytes consumed vs browser quota displayed as a linear gradient progress bar.
  - Numerical counts tracking cached contacts, cached analytics charts, and network graph caches.
  - A clean button to clear client cache data and force a sync reload.
