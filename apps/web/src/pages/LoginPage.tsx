import { useState } from "react";
import { useAppState } from "../store/AppStateContext";
import { Button } from "../components/ui/Button";
import { Input, Field } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import styles from "../pages/pages.module.css";

const DEMO_CREDENTIALS: Array<{ login: string; role: string }> = [
  { login: "pm", role: "Project Manager" },
  { login: "a1", role: "Specialist A" },
  { login: "a2", role: "Specialist A" },
  { login: "b1", role: "Specialist B" },
  { login: "e1", role: "Specialist E" },
  { login: "c1", role: "Specialist C" },
  { login: "s1", role: "Specialist S" },
  { login: "s2", role: "Specialist S" },
  { login: "s3", role: "Specialist S" },
  { login: "p1", role: "Specialist P" },
  { login: "p2", role: "Specialist P" },
  { login: "p3", role: "Specialist P" },
];

export function LoginPage() {
  const { login, error } = useAppState();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await login(loginName, password);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.loginWrap}>
      <form className={styles.loginCard} onSubmit={(e) => void submit(e)}>
        <div className={styles.loginBrand}>
          <span className={styles.loginMark}>E</span>
          <div>
            <h2>Engineering Resource Planner</h2>
            <p className="muted">Team planning, skills, availability and deadlines.</p>
          </div>
        </div>
        {error ? <Alert tone="warning">{error}</Alert> : null}
        {message ? <Alert tone="danger">{message}</Alert> : null}
        <Field label="Login">
          <Input value={loginName} onChange={(e) => setLoginName(e.target.value)} autoFocus autoComplete="username" />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Button type="submit" disabled={busy || !loginName || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <div className={styles.loginHint}>
          <strong>Demo credentials</strong>
          <p>Password for every account: <span className="mono">{`<login>-Erp-2026!`}</span></p>
          <ul className={styles.loginList}>
            {DEMO_CREDENTIALS.map((c) => (
              <li key={c.login}>
                <code>{c.login}</code> — {c.role}
              </li>
            ))}
          </ul>
        </div>
      </form>
    </div>
  );
}