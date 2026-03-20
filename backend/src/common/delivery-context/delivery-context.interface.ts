import type { RequestPrincipal } from '../auth/types';

export interface DeliveryContext {
  emailAdapter: string;
  smsAdapter: string;
  templateSource?: string;
  templateEngine?: string;
  workspaceId?: string;
  workspaceKind?: string;
  principalType?: RequestPrincipal['type'];
  principal?: RequestPrincipal;
}
