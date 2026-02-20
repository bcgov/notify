import { AsyncLocalStorage } from 'async_hooks';
import type { DeliveryContext } from './delivery-context.interface';

export class DeliveryContextStorage {
  private readonly storage = new AsyncLocalStorage<DeliveryContext>();

  run<T>(ctx: DeliveryContext, fn: () => T): T {
    return this.storage.run(ctx, fn);
  }

  get(): DeliveryContext | undefined {
    return this.storage.getStore();
  }
}
