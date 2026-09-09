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

  const notAvailableHours = (userId: string, upToToday: boolean): number => {
    let total = 0;
    for (const a of data.availability) {
      if (a.userId !== userId) continue;
      if (a.availableHours >= FULL_DAY_HOURS) continue;
      if (!isWorkingDay(parseDateString(a.date))) continue;
      if (upToToday ? a.date > today : a.date <= today) continue;
      total += FULL_DAY_HOURS - a.availableHours;
    }
    return total;
  };

  const vacationOf = (userId: string) => {
    const used = notAvailableHours(userId, true);
    const planned = notAvailableHours(userId, false);
    const toBePlanned = Math.max(0, VACATION_HOURS - used - planned);
    return { available: VACATION_HOURS, used, planned, toBePlanned };
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
            { key: "vacUsed", header: "Vacation hours used", render: (m) => `${vacationOf(m.id).used}h` },
            { key: "vacPlanned", header: "Vacation hours planned", render: (m) => `${vacationOf(m.id).planned}h` },
            { key: "vacToBePlanned", header: "Vacation hours to be planned", render: (m) => `${vacationOf(m.id).toBePlanned}h` },
          ]}
        />
      </Card>
    </div>
  );
}