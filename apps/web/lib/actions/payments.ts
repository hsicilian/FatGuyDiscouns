import { applyPaymentToBalance, calculateBalanceDue } from "@fatguydiscounts/core";
import { getBalanceCycle } from "../data/local-db";

export async function previewPaymentAction(paymentAmount: number, creditAmount: number) {
  const due = calculateBalanceDue(await getBalanceCycle());
  const result = applyPaymentToBalance(due, paymentAmount, creditAmount);

  return {
    ok: true,
    message: result.paidInFull
      ? `Balance reaches zero. Overpayment credit: $${result.overpayment.toFixed(2)}`
      : `Remaining balance after payment: $${Math.max(result.remaining, 0).toFixed(2)}`,
    remainingBalance: Math.max(result.remaining, 0),
    overpayment: result.overpayment,
  };
}