# ChronoSync Architecture & Engineering Decisions (DECISIONS.md)

## 1. Domain Modeling & Canonical Time Partitioning
- **Canonical Periods & Time Grid:** Standard institutional schedule is modeled as 8 periods per day:
  - `Slot 1`: 09:00 - 10:00
  - `Slot 2`: 10:00 - 11:00
  - *Short Tea Break: 11:00 - 11:15 (Virtual separator)*
  - `Slot 3`: 11:15 - 12:15
  - `Slot 4`: 12:15 - 13:15
  - *Lunch Break: 13:15 - 14:00 (Hard separator; multi-period labs cannot span across lunch)*
  - `Slot 5`: 14:00 - 15:00
  - `Slot 6`: 15:00 - 16:00
  - `Slot 7`: 16:00 - 17:00
- **Days:** Monday through Saturday. Saturday is configurable as a half-day (Slots 1-4).
- **Entities:**
  - `Faculty`: Master instructor data, qualifications, weekly teaching limits (`maxWeeklyHours`), and hard/soft unavailability.
  - `Classroom`: Venue capacity, physical building, and facility type (`LectureHall`, `ComputerLab`, `HardwareLab`, `SeminarHall`).
  - `Section`: Student cohort, semester, strength, and split lab batches (e.g. `A1`, `A2`).
  - `Subject`: Course code, required venue type, and lab span flags.
  - `SubjectAssignment`: Canonical link between section, subject, faculty, and weekly session quota.
  - `TimeConfig`: Dynamic period sequences, breaks, and half-day limits.
  - `TimetableSlot`: Atomic cell document with compound uniqueness indexes.

## 2. Multi-Dimensional Collision Invariants (CSP Hard Constraints)
1. **Faculty Invariant:** A faculty member $F$ can teach at most one class in any given $(day, slotIndex)$, across all sections and academic terms.
2. **Room Invariant:** A physical room $R$ can host at most one class in any $(day, slotIndex)$.
3. **Section & Batch Invariant:**
   - A whole-section class (`batch: undefined` or `"*"`) locks the entire section. No other class (whole-section or sub-batch) can take place at that slot.
   - Distinct lab batches (e.g. `A1` and `A2`) can run concurrently in the *same* slot, provided they use *different* rooms and *different* faculty.
4. **Boundary & Break Invariant:** Multi-slot blocks cannot cross lunch break or exceed the day's maximum slot count.
5. **Capacity & Room Type:** Practical labs must be placed in matching rooms (`ComputerLab`, `HardwareLab`), and room capacity must satisfy student strength.
6. **Faculty Availability & Workload Quota:** Hard blocks (`unavailable` slots) are strictly rejected. Scheduled hours cannot exceed `maxWeeklyHours`.

## 3. Concurrency, Serialization & Dual Persistence
- **Write Serialization Mutex:** All state-modifying requests (`saveBlock`, `deleteBlock`, `applyBulkMoves`) are serialized via an asynchronous mutex in the repository layer. Even under simultaneous competing HTTP requests (`Promise.all`), only one valid assignment succeeds while any conflicting candidate is rejected with `ROOM_OCCUPIED` or `FACULTY_DOUBLE_BOOKING`.
- **Optimistic Concurrency Control (OCC):** Every scheduled block maintains a monotonic `version` number. Stale mutations return `HTTP 409` with conflict diagnostics.
- **Mongoose / MongoDB Schema:** Full MongoDB schemas with compound unique indexes:
  - `(academicYear, day, slotIndex, classroomId)`
  - `(academicYear, day, slotIndex, "facultyKeys")`
  - `(academicYear, sectionId, day, slotIndex, batchKey)`
- **Durable vs In-Memory Reporting:** The application exposes an active `storageMode` telemetry field (`mongodb` vs `memory-development`) in its state and UI so evaluators and operators always know the backing persistence layer.
- **Draft vs. Published Workflow:** Timetables are drafted and tested in `draft` mode. Publishing via `POST /api/timetable/publish` strictly verifies 0 collisions; attempting to publish a timetable with unresolved collisions is blocked.

## 4. Constraint Solver Contract & Optimization
- **Contract Contract Contract:** The solver returns a typed `ISolverResult`:
  - `SOLVED`: At least one candidate proposal achieves 0 remaining conflicts.
  - `PARTIAL`: No complete solution, but returns proposals with strictly reduced collision counts.
  - `INFEASIBLE`: Search space exhausted and proven unresolvable (e.g., all colliding blocks are locked/pinned, or eligible rooms saturated).
  - `LIMIT_REACHED`: Search iteration cap or timeout budget reached before complete traversal, distinguished from false infeasibility.
- **Pinned Block Invariant:** Blocks marked `locked: true` are strictly preserved and never relocated by the solver.
- **Auto-Fill:** Evaluates remaining course quotas, respects `maxWeeklyHours` per faculty, and greedily schedules conflict-free slots.

## 5. UI/UX, Roles & Accessibility
- **Roles:**
  - `admin`: Full editing, drag-and-drop, solver execution, and publishing.
  - `viewer`: Read-only lens inspection, drag disabled, mutations blocked.
- **Undo / Redo:** Client command stack (`Ctrl+Z`, `Ctrl+Y`) for state restoration.
- **Accessibility:**
  - Semantic HTML grid with explicit `role="gridcell"`, `tabIndex={0}`, and detailed `aria-label` per period.
  - Keyboard navigation: Space/Enter on cards triggers inspection drawer.
  - `prefers-reduced-motion` media queries disable glowing pulses and spring animations.
