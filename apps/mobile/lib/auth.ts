import { demoCustomer } from "@fatguydiscounts/db";

export async function getMobileSessionPreview() {
  return {
    id: demoCustomer.id,
    email: demoCustomer.email,
    role: demoCustomer.role,
    accountState: demoCustomer.accountState,
  };
}

