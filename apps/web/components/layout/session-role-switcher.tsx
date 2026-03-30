import { selectSessionRole } from "../../app/actions/session/select";

const roles = [
  { value: "customer", label: "Customer View" },
  { value: "admin", label: "Admin View" },
  { value: "master_admin", label: "Master Admin View" },
];

export function SessionRoleSwitcher({ currentRole }: { currentRole: string }) {
  return (
    <form action={selectSessionRole} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {roles.map((role) => (
        <button
          key={role.value}
          name="role"
          value={role.value}
          style={{
            background: currentRole === role.value ? "#bb4d00" : "transparent",
            color: currentRole === role.value ? "#fff" : "#1f1d1a",
            border: "1px solid #d9c7b2",
            borderRadius: 999,
            padding: "10px 14px",
            cursor: "pointer",
          }}
        >
          {role.label}
        </button>
      ))}
    </form>
  );
}