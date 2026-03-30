import { resetLocalDatabaseAction } from "../../app/actions/dev/reset-db";

export function ResetLocalDbForm() {
  return (
    <form action={resetLocalDatabaseAction}>
      <button style={{ background: "transparent", color: "#1f1d1a", border: "1px solid #d9c7b2", borderRadius: 999, padding: "10px 14px" }}>
        Reset Local Data
      </button>
    </form>
  );
}