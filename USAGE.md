# Engineering Resource Planner — User Guide

**Demo logins** (password for every account is `<login>-Erp-2026!`):

- Project Manager: `pm`
- Specialists: `a1`, `a2`, `b1`, `c1`, `e1`, `s1`, `s2`, `s3`, `p1`, `p2`, `p3`

---

## PART 1 — PROJECT MANAGER (`pm`)

As the project manager you create projects and tasks, manage the team, arrange work in pyramid rows, generate the automatic plan, and resolve conflicts.

### Dashboard

- Stat cards: **Projects**, **Open tasks**, **Done tasks**, **Planned hours**, **Critical conflicts**.
- **Create automatic task plan for employees** — generates/refreshes the auto plan (see Planner).
- **Manage projects** — jumps to the Projects tab.
- **Projects overview** — each project's code, name, deadline, tasks-done count, budget planned/available.
- **Latest conflicts** — current warning/error/critical conflicts.
- **Team load** — specialists with skill, **Currently working on** (today's project, or *free*/*unavailable*), **Planned**, **Available (3 months)**, **Planned utilization**.

### Projects tab

- Table: **Code, Name, Deadline (dd/mm/yyyy), Budget, Budget planned, Budget available, Tasks done, Actions**.
- **+ New project**: name, deadline (dd/mm/yyyy), budget hours. The project code (`Z1`, `Z2`, …) is generated automatically.
- **Edit** (row): modify name, deadline, budget.
- **Delete** (row): soft-deletes the project and its tasks/entries (history stays in Versions).

### Tasks tab

- Filter by **project** (All projects or one project).
- **+ New task** opens a modal: project, **Task name** (hint: *include project phase*), **Skill/competence** (A–S), **Estimated hours**, optional **Task deadline**.
- Table columns: **Task code** (one line per assigned specialist), **Project**, **Project name**, **Task name**, **Task deadline**, **Skill**, **Hours estimated**, **Hours planned**, **Hours available** (= estimated − planned), **Assigned** (badges with an × to remove a specialist), **Status** (a separate badge per assigned specialist, e.g. `a1: In progress`, `a2: Not started`), **Actions**.
- **Assign** (row): opens the assignment editor —
  - tick the specialist(s),
  - set **Start day**, **Last day**, **Hours/day** (1–8);
  - every working day in the range is assigned.
  - Below, **Currently planned** entries can be **Edit** (change date/hours) or **Remove**.
- **Edit** (row): change name, skill, estimated hours, task deadline.
- **Delete** (row): soft-deletes the task.

### Dependencies tab (Pyramid)

- One pyramid per project. **Row 1** is the lowest row; tasks in lower rows must finish before tasks in the rows above.
- **Drag tasks between rows** to set their order.
- **+ Add row** / **Delete row** / **Save pyramid**.
- Task codes update automatically (the row number in the code reflects the row; the trailing task number is stable).
- This pyramid is the **single source of truth for dependencies**.

### Team tab

- Table: **Name, Login, Role, Competence, Planned hours, Available (3 months), Actions**.
- **Add specialist**: name + competence. The login is generated automatically from the competence (e.g. next A specialist → `a3`, next B → `b2`, etc.); password is `<login>-Erp-2026!`.
- **Modify** (row): change name/competence.
- **Delete** (row): remove the specialist (with confirmation).

### Planner tab

- **Create automatic task plan for employees** builds the plan:
  - projects are planned by earliest deadline, then larger budget;
  - tasks are planned bottom-up by pyramid row; a row starts only after lower rows finish; same-row tasks run in parallel;
  - only working days (weekdays, no Polish holidays);
  - each project finishes exactly **3 working days before its deadline**; the workload is stretched and specialists work **at least 3 h/day**;
  - only matching-skill specialists; daily load ≤ availability (default 8h); locked (manual) entries are never modified.
- The **weekly calendar** shows each specialist's planned hours per day.
  - **Drag a task between specialists** with the same competence (a pop-up asks how many hours to move).
  - **Orange-edge = manual (locked)**, **blue-edge = auto**.
  - **Lock/Unlock** and **Remove** an entry directly on the chip.
- Navigate weeks with ‹ › and **This week**.

### Availability tab

- Weekly grid of availability per specialist.
- Click a working day to **edit available hours** (0 = not available, 8 = full day; missing records default to 8h).
- As PM you can edit any specialist's availability.

### Kanban tab

- Per project: columns **To do, On hold, Work in progress, Done**.
- Each task appears as a box per specialist code (e.g. `Z1-P1-1`, `Z1-P2-1`, `Z1-P3-1`) with the hours assigned.
- **Drag a box to another column** to change that specialist's status (each specialist has their **own** status, so moving `XX-P1-X` only affects P1).
- As PM you can drag any box.

### Gantt tab

- Per project: a row per specialist code, with a **box per day** the specialist works (box thickness = hours that day; **orange = manual**, **blue = auto**).
- **Arrows** show the pyramid dependencies: an arrow starts at the point the lower row finishes latest and ends at the successor's start.

### Workload tab

- For each specialist: a row with a **subrow per project**, showing per-day boxes (same colours: orange manual, blue auto; thickness = hours).

### Conflicts tab

- Lists all conflicts with severity badges and descriptions, including:
  - project deadline, project budget exceeded, **unused budget**, **project schedule not satisfied**, no available employee, dependency violation, employee overload, task deadline, pyramid row order.

### Versions tab

- A snapshot is captured once per business day after a plan change.
- **View snapshot** opens the saved plan entries and conflicts; **Print to PDF** exports it.
- **Administration:**
  - **Reset database to seed** — wipes and restores the demo dataset.
  - **Wipe all projects and tasks** — soft-deletes business data (version history preserved).

---

## PART 2 — SPECIALIST (`a1`…`p3`)

As a specialist you see only what concerns you: your tasks, your availability, and read-only planning views. You manage your own task status and your own Kanban boxes.

### Dashboard

- Stat cards: **Assigned tasks, In progress, Done, On hold, My planned hours**, plus a table of your tasks.

### My Tasks tab

- Table of your assigned tasks: **Task code, Project, Skill, Hours estimated, Hours planned, Hours available, Worked, Status, Transition**.
- **Worked** — shows hours worked with an **Edit** button: change the hours worked (reduces planable remaining hours).
- **Transition** buttons — move your task through statuses (e.g. Start, On hold, Done). When completing a task you can set the hours worked.
- Status transitions respect the allowed rules (only PM can reopen a `Done` task).

### Team tab

- Read-only list of the whole team (name, login, role, competence, planned/available hours).

### Planner tab

- Read-only weekly view of **your** planned tasks.
- Orange-edge = manual, blue-edge = auto.

### Availability tab

- Edit **your own** availability: click a working day to set available hours (0 = not available, 8 = full day).

### Kanban tab

- Per project board (To do / On hold / Work in progress / Done).
- Your **own** boxes (e.g. `XX-A1-X` when logged in as `a1`) are highlighted **light orange**.
- **You can only move your own boxes**; moving one only changes that specialist's status.

### Gantt tab

- Read-only Gantt with per-day boxes and dependency arrows (orange = manual, blue = auto; thickness = hours).

### Workload tab

- Read-only workload view (specialist rows with project subrows and per-day boxes).

---

## Notes on editing/deleting

- Only the **project manager** creates/edits/deletes projects, tasks, and specialists.
- **Specialists** can edit their own task status, worked hours, and availability, and move their own Kanban boxes.
- Deletes are **soft deletes** — version history in the **Versions** tab is always preserved.