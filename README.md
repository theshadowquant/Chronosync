# ⚡ ChronoSync Studio

> **Next-Generation AI & Constraint-Driven Class Timetable Management and Collision-Resolution Studio**  
> Built with Next.js 14+ App Router, TypeScript, Tailwind CSS, Framer Motion, and a pure constraint satisfaction engine.

---

## 🌟 Overview & Architectural Philosophy

**ChronoSync** is an industrial-grade, Linear/Raycast-inspired workspace engineered to solve complex multi-dimensional **Constraint Satisfaction Problems (CSP)** with drag-and-drop mechanics, multi-lens visualization, and real-time collision resolution.

A valid timetable assignment is evaluated across the 4-tuple:
$$\text{Slot} = \{ \text{Day}, \text{TimeInterval}, \text{Subject}, \text{Faculty}, \text{Classroom}, \text{Section/Batch} \}$$

---

## ⚡ Key Capabilities

### 1. The 4-Way Multi-Dimensional Collision Engine (`lib/engine`)
A zero-dependency, pure functional engine enforcing:
- **Faculty Invariant:** Faculty $F$ cannot teach two classes simultaneously across any section or semester.
- **Space Overlap:** Classroom/Lab $R$ cannot host more than one active class during the same time window.
- **Batch/Section Collision:** Student Section $S$ cannot be assigned multiple overlapping courses. Distinct lab batches ($A_1$ and $A_2$) run concurrently in separate labs without collision.
- **Consecutive/Lab Span Locks:** Practical lab sessions occupy 2 or 3 consecutive hourly slots and lock the entire duration as an atomic block. Breaks and day boundaries are strictly safeguarded.
- **Room Fit & Capacity:** Ensures room type matches course requirements (`ComputerLab`, `HardwareLab`, `LectureHall`) and satisfies student strength.

### 2. Triple-Perspective Visualization Lenses
Pivot the master matrix across three lenses instantly with keyboard shortcuts `[1]`, `[2]`, `[3]`:
- **Section View (`1`):** Master weekly schedule for a specific semester and section with real-time drag previews and sub-batch rows.
- **Faculty View (`2`):** Teaching load meter, weekly hours vs max limits, clash alerts, and free consultation periods.
- **Room Utilization View (`3`):** Venue occupancy map, capacity details, and room-level double booking guards.

### 3. The CSP Auto-Resolve & Auto-Fill Engine (`lib/solver`)
- **⚡ Resolve Conflicts:** Runs a min-conflicts heuristic with randomized restarts and soft-penalty scoring to identify optimal, conflict-free swap coordinates without mutating the live grid until approved.
- **✨ Auto-Fill Unassigned:** Evaluates remaining syllabus quotas against institutional availability and places missing lectures without collisions.

### 4. Linear-Dark / Cyber-Bento Visual Identity
- Deep obsidian surfaces (`#09090b`, `#0d0e12`) with razor borders (`border-white/10`).
- Real-time reactive drag previews: valid targets glow in neon emerald; invalid targets show repeating diagonal crimson stripes with instant tooltip explanations.
- Native Command Menu (`Cmd+K` / `Ctrl+K`) for jumping to any section, professor, or venue.

---

## 📂 Project File Tree

```
CHRONOSYNC/
├── app/
│   ├── api/
│   │   ├── solver/
│   │   │   ├── apply/route.ts      # Atomic application of solver proposals
│   │   │   ├── autofill/route.ts   # Auto-fill unassigned course quotas
│   │   │   └── resolve/route.ts    # CSP min-conflicts heuristic engine
│   │   └── timetable/
│   │       ├── blocks/
│   │       │   ├── [blockId]/route.ts # PATCH move/resize & DELETE block
│   │       │   └── route.ts        # POST create scheduled block
│   │       ├── reset/route.ts      # Reset schedule to seed data
│   │       └── route.ts            # GET timetable state with live conflicts
│   ├── globals.css                 # Cyber-bento styles & print stylesheet
│   ├── layout.tsx                  # Root dark layout with Sonner toast
│   └── page.tsx                    # Studio dashboard & state coordinator
├── components/
│   ├── BacklogDock.tsx             # Collapsible course queue & progress rings
│   ├── CommandMenu.tsx             # Cmd+K / Ctrl+K quick find palette
│   ├── ConflictResolutionModal.tsx # Side-by-side proposal diff viewer
│   ├── ExportModal.tsx             # PDF print and CSV download dialog
│   ├── FacultyLensView.tsx         # Instructor workload lens
│   ├── InspectorDrawer.tsx         # Slot inspector & venue/faculty modifier
│   ├── RoomLensView.tsx            # Classroom/lab utilization lens
│   ├── TimetableMatrix.tsx         # Master matrix with reactive drag previews
│   └── TopHUD.tsx                  # Telemetry, lens switcher, and action strip
├── lib/
│   ├── db/
│   │   ├── repository.ts           # Dual persistence: MongoDB & in-memory
│   │   └── seedData.ts             # Realistic CSE Department seed with demo collision
│   ├── engine/
│   │   ├── __tests__/
│   │   │   └── engine.test.ts      # 8 constraint verification test suites
│   │   └── index.ts                # Pure functional collision engine
│   ├── models/
│   │   ├── Classroom.ts            # Mongoose classroom schema
│   │   ├── Faculty.ts              # Mongoose faculty schema
│   │   ├── Section.ts              # Mongoose section schema
│   │   ├── Subject.ts              # Mongoose subject schema
│   │   └── TimetableSlot.ts        # Compound indexed atomic unit
│   ├── solver/
│   │   ├── __tests__/
│   │   │   └── solver.test.ts      # Solver resolution & auto-fill test suites
│   │   └── index.ts                # Min-conflicts & greedy heuristic solver
│   └── types.ts                    # Canonical TypeScript interfaces & schemas
├── DECISIONS.md                    # Architecture & engineering decisions record
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suites
Verify all constraint satisfaction and solver tests with Vitest:
```bash
npm run test
```

### 3. Launch Development Studio
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

> **💡 Zero-Config Note:** If `MONGODB_URI` is not set, ChronoSync automatically launches its transactional in-memory store initialized with a complete CSE Department dataset, featuring 1 intentional demo conflict (Dr. Sarah Jenkins double-booked at Monday 10:00-11:00) so you can immediately click **⚡ Resolve** to experience the CSP engine.

### 4. Optional: Connect MongoDB Atlas or Local Replica Set
Set the following in your `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/chronosync?replicaSet=rs0
```

---

## ⌨️ Shortcuts & Hotkeys
- `1`: Switch to **Section View**
- `2`: Switch to **Faculty View**
- `3`: Switch to **Room View**
- `Cmd+K` / `Ctrl+K`: Open **Command Palette**
- Drag course cards directly onto the grid for real-time validity checks!
