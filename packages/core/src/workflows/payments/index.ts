export function applyPaymentToBalance(balanceDue: number, paymentAmount: number, creditAmount = 0) {
  const remaining = balanceDue - paymentAmount - creditAmount;
  return {
    remaining,
    paidInFull: remaining <= 0,
    overpayment: remaining < 0 ? Math.abs(remaining) : 0,
  };
}

export function shouldArchiveBalance(remaining: number) {
  return remaining <= 0;
}

