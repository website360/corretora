/**
 * Asaas billing integration — SCAFFOLD.
 *
 * The data model (plans, subscription status, trial) is in place. Real charging
 * is wired here once an Asaas API key is provided. Recommended flow:
 *
 *   1. Store the API key as a server-only env var (ASAAS_API_KEY) and base URL
 *      (https://sandbox.asaas.com/api/v3 or https://api.asaas.com/v3).
 *   2. Create a server route /api/billing/checkout that:
 *        - ensures an Asaas customer for the company (POST /customers),
 *        - creates a subscription (POST /subscriptions) for the chosen plan,
 *        - returns the payment/invoice URL to redirect the user.
 *   3. Add a webhook route /api/billing/webhook to receive PAYMENT_CONFIRMED /
 *      PAYMENT_OVERDUE events and update companies.subscription_status
 *      (active | past_due | canceled) accordingly.
 *
 * Keeping these as stubs lets the UI flow (plan selection, trial counter,
 * limits) ship now and turn into real billing without refactoring.
 */

export interface CheckoutResult {
  /** URL to redirect the user to complete payment (Asaas invoice/checkout). */
  paymentUrl: string | null;
  /** Whether real billing is active (an API key is configured). */
  live: boolean;
}

export const asaasService = {
  /** Returns true when a real Asaas key is configured (server-side). */
  isConfigured(): boolean {
    return false; // flip to env-based check when the key is added
  },

  /**
   * Starts checkout for a plan. While unconfigured this is a no-op that keeps
   * the company on its trial; wire it to /api/billing/checkout to go live.
   */
  async startCheckout(_companyId: string, _planId: string): Promise<CheckoutResult> {
    return { paymentUrl: null, live: false };
  },
};
