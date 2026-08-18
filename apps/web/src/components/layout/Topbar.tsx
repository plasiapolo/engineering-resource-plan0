import { useAppState } from "../../store/AppStateContext";
import { Badge } from "../ui/Badge";
import { ConflictBanner } from "./ConflictBanner";
import { Sidebar } from "./Sidebar";
import styles from "./layout.module.css";

const VIEW_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  tasks: "Tasks",
  dependencies: "Dependencies",
  team: "Team",
  planner: "Weekly Plan",
  availability: "Availability",
  conflicts: "Conflicts",
  versions: "Plan Versions",
  myTasks: "My Tasks",
};

export function Topbar() {
  const { user, view, refreshing } = useAppState();
  const roleLabel = user?.role === "PROJECT_MANAGER" ? "Project Manager" : "Specialist";
  return (
    <header className={styles.topbar}>
      <h1 className={styles.topbarTitle}>{VIEW_TITLES[view] ?? "Engineering Resource Planner"}</h1>
      <div className={styles.topbarRight}>
        {refreshing ? <span className={styles.refreshing}>syncing…</span> : null}
        <Badge tone={user?.role === "PROJECT_MANAGER" ? "blue" : "neutral"}>{roleLabel}</Badge>
        <span className={styles.topbarUser}>{user?.displayName}</span>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar />
        <ConflictBanner />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}