export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface FormActionState extends ActionResult {
  submittedAt?: string;
  nextStatus?: string;
  remainingBalance?: number;
  overpayment?: number;
  suggestedEmail?: string;
}
