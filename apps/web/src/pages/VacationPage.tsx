import { useAppState } from "../store/AppStateContext";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/Extras";
import { isWorkingDay, parseDateString, warsawToday } from "../utils/date";

const VACATION_HOURS = 240;
const FULL_DAY_HOURS = 8;

export function VacationPage() {
  const { data } = useAppState();
  if (!data) return null;

  const today = warsawToday();
  const specialists = data.team.filter((m) => m.role === "SPECIALIST");

  const vacationOf = (userId: string) => {
    let notAvailable = 0;
    for (const a of data.availability) {
      if (a.userId !== userId) continue;
      if (a.date > today) continue;
      if (a.availableHours >= FULL_DAY_HOURS) continue;
      if (!isWorkingDay(parseDateString(a.date))) continue;
      notAvailable += FULL_DAY_HOURS - a.availableHours;
    }
    const used = Math.max(0, VACATION_HOURS - notAvailable);
    const planned = VACATION_HOURS - used;
    return { available: VACATION_HOURS, planned, used };
  };

  return (
    <div>
      <p className="page-subtitle">
        Vacation hours per specialist. Working days with reduced availability count against the vacation budget.
      </p>
      <Card pad={false}>
        <Table
          rows={specialists}
          rowKey={(m) => m.id}
          empty={<EmptyState title="No specialists" />}
          columns={[
            { key: "name", header: "Specialist", render: (m) => <strong>{m.displayName}</strong> },
            { key: "login", header: "Login", render: (m) => <span className="mono">{m.login}</span> },
            { key: "skill", header: "Skill", render: (m) => <Badge tone="blue">{m.skill ?? "—"}</Badge> },
            { key: "vacAvail", header: "Vacation hours available", render: (m) => `${vacationOf(m.id).available}h` },
            { key: "vacPlanned", header: "Vacation hours planned", render: (m) => `${vacationOf(m.id).planned}h` },
            { key: "vacUsed", header: "Vacation hours used", render: (m) => `${vacationOf(m.id).used}h` },
          ]}
        />
      </Card>
    </div>
  );
}