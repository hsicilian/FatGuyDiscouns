import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AccountState, UserRole } from "@fatguydiscounts/types";

export interface StoredSessionAccount {
  id: string;
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  accountState: AccountState;
  customerId?: string;
}

interface LocalAuthDatabase {
  accounts: StoredSessionAccount[];
}

const authDbPath = join(process.cwd(), "apps", "web", "data", "local-auth.json");

const initialAuthDatabase: LocalAuthDatabase = {
  accounts: [
    {
      id: "acct-cust-001",
      displayName: "Jordan Rivers",
      email: "jordan@example.com",
      password: "jordan123",
      role: "customer",
      accountState: "approved",
      customerId: "cust-001",
    },
    {
      id: "acct-cust-002",
      displayName: "Casey Morgan",
      email: "casey@example.com",
      password: "casey123",
      role: "customer",
      accountState: "pending_approval",
      customerId: "cust-002",
    },
    {
      id: "acct-cust-003",
      displayName: "Taylor West",
      email: "taylor@example.com",
      password: "taylor123",
      role: "customer",
      accountState: "claiming_disabled",
      customerId: "cust-003",
    },
    {
      id: "acct-admin-001",
      displayName: "Operations Admin",
      email: "admin@fatguydiscounts.com",
      password: "admin123",
      role: "admin",
      accountState: "approved",
    },
    {
      id: "acct-master-001",
      displayName: "Store Owner",
      email: "owner@fatguydiscounts.com",
      password: "owner123",
      role: "master_admin",
      accountState: "approved",
    },
  ],
};

function serialize(db: LocalAuthDatabase) {
  return `${JSON.stringify(db, null, 2)}\n`;
}

function normalizeDatabase(db: Partial<LocalAuthDatabase>): LocalAuthDatabase {
  return {
    accounts: db.accounts ?? initialAuthDatabase.accounts,
  };
}

async function ensureAuthDatabaseFile() {
  try {
    const raw = await readFile(authDbPath, "utf8");
    const parsed = normalizeDatabase(JSON.parse(raw) as Partial<LocalAuthDatabase>);
    await writeFile(authDbPath, serialize(parsed), "utf8");
  } catch {
    await mkdir(dirname(authDbPath), { recursive: true });
    await writeFile(authDbPath, serialize(initialAuthDatabase), "utf8");
  }
}

async function readAuthDatabase(): Promise<LocalAuthDatabase> {
  await ensureAuthDatabaseFile();
  const raw = await readFile(authDbPath, "utf8");
  return normalizeDatabase(JSON.parse(raw) as Partial<LocalAuthDatabase>);
}

async function writeAuthDatabase(db: LocalAuthDatabase) {
  await writeFile(authDbPath, serialize(db), "utf8");
}

export async function resetLocalAuthDatabase() {
  await mkdir(dirname(authDbPath), { recursive: true });
  await writeAuthDatabase(initialAuthDatabase);
}

export async function listStoredAccounts() {
  const db = await readAuthDatabase();
  return db.accounts;
}

export async function hasStoredAccountWithEmail(email: string) {
  const db = await readAuthDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  return db.accounts.some((entry) => entry.email.toLowerCase() === normalizedEmail);
}

export async function createStoredCustomerAccount(input: {
  displayName: string;
  email: string;
  password: string;
  customerId: string;
}) {
  const db = await readAuthDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();

  const exists = db.accounts.some((entry) => entry.email.toLowerCase() === normalizedEmail);
  if (exists) {
    return { ok: false as const, message: "An account with that email already exists." };
  }

  const account: StoredSessionAccount = {
    id: `acct-${Date.now()}`,
    displayName: input.displayName.trim(),
    email: normalizedEmail,
    password: input.password,
    role: "customer",
    accountState: "pending_approval",
    customerId: input.customerId,
  };

  db.accounts.push(account);
  await writeAuthDatabase(db);
  return { ok: true as const, account };
}

export async function updateStoredAccountState(customerId: string, nextState: AccountState) {
  const db = await readAuthDatabase();
  const account = db.accounts.find((entry) => entry.customerId === customerId);

  if (account) {
    account.accountState = nextState;
    await writeAuthDatabase(db);
  }
}
export async function updateStoredAccountRole(customerId: string, nextRole: UserRole) {
  const db = await readAuthDatabase();
  const account = db.accounts.find((entry) => entry.customerId === customerId);

  if (account) {
    account.role = nextRole;
    account.accountState = "approved";
    await writeAuthDatabase(db);
  }
}
