import { logoutSessionAction } from "../../app/actions/session/logout";

export function SignOutForm() {
  return (
    <form action={logoutSessionAction}>
      <button style={{ background: "transparent", color: "#1f1d1a", border: "1px solid #d9c7b2", borderRadius: 999, padding: "10px 14px", cursor: "pointer" }}>
        Sign Out
      </button>
    </form>
  );
}