import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  width?: string;
  className?: string;
}

export function Table<T>({ columns, rows, rowKey, empty }: { columns: Array<TableColumn<T>>; rows: T[]; rowKey: (row: T) => string; empty?: ReactNode }) {
  if (rows.length === 0) {
    return <div className={styles.empty}>{empty ?? "No records to display."}</div>;
  }
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}