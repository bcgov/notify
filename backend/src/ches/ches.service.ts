import {
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DeliveryAdapterResolver } from '../common/delivery-context/delivery-adapter.resolver';
import type { IEmailTransport } from '../adapters/interfaces';
import { ChesApiClient } from './ches-api.client';
import type { ChesStatusQuery } from './ches-api.client';
import { ChesMessageObject } from './v1/core/schemas/ches-message-object';
import { ChesTransactionResponse } from './v1/core/schemas/ches-transaction-response';
import { ChesMergeRequest } from './v1/core/schemas/ches-merge-request';
import { ChesStatusObject } from './v1/core/schemas/ches-status-object';

@Injectable()
export class ChesService {
  private readonly logger = new Logger(ChesService.name);

  constructor(
    private readonly deliveryAdapterResolver: DeliveryAdapterResolver,
    private readonly chesApiClient: ChesApiClient,
  ) {}

  /**
   * Returns the real email adapter if one is configured, or null to indicate
   * that requests should fall through to the CHES passthrough client.
   */
  private resolveEmailAdapter(): IEmailTransport | null {
    const adapter = this.deliveryAdapterResolver.getEmailAdapter();
    if (typeof adapter === 'object' && adapter !== null && 'send' in adapter) {
      return adapter;
    }
    return null;
  }

  async sendEmail(body: ChesMessageObject): Promise<ChesTransactionResponse> {
    const adapter = this.resolveEmailAdapter();

    if (!adapter) {
      return this.chesApiClient.sendEmail(body);
    }

    const txId = uuidv4();
    const msgId = uuidv4();

    this.logger.log(`Sending email via adapter to ${body.to[0]}: txId=${txId}`);

    await adapter.send({
      to: body.to[0],
      subject: body.subject,
      body: body.body,
      from: body.from,
    });

    return {
      txId,
      messages: [{ msgId, to: body.to }],
    };
  }

  async sendEmailMerge(
    body: ChesMergeRequest,
  ): Promise<ChesTransactionResponse[]> {
    const adapter = this.resolveEmailAdapter();

    if (!adapter) {
      return this.chesApiClient.sendEmailMerge(body);
    }

    const results: ChesTransactionResponse[] = [];

    for (const ctx of body.contexts) {
      const txId = uuidv4();
      const msgId = uuidv4();

      this.logger.log(
        `Sending merge email via adapter to ${ctx.to[0]}: txId=${txId}`,
      );

      await adapter.send({
        to: ctx.to[0],
        subject: body.subject,
        body: body.body,
        from: body.from,
      });

      results.push({ txId, messages: [{ msgId, to: ctx.to }] });
    }

    return results;
  }

  async previewEmailMerge(
    body: ChesMergeRequest,
  ): Promise<ChesMessageObject[]> {
    const adapter = this.resolveEmailAdapter();

    if (!adapter) {
      return this.chesApiClient.previewEmailMerge(body);
    }

    throw new NotImplementedException(
      'emailMerge preview is not supported when using a non-CHES adapter',
    );
  }

  async getStatusQuery(query: ChesStatusQuery): Promise<ChesStatusObject[]> {
    const adapter = this.resolveEmailAdapter();

    if (!adapter) {
      return this.chesApiClient.getStatusQuery(query);
    }

    // Emails sent via a real adapter are fire-and-forget; no queue to query
    return [];
  }

  async getStatusMessage(msgId: string): Promise<ChesStatusObject> {
    const adapter = this.resolveEmailAdapter();

    if (!adapter) {
      return this.chesApiClient.getStatusMessage(msgId);
    }

    throw new NotFoundException(`Message ${msgId} not found`);
  }

  async promoteQuery(query: ChesStatusQuery): Promise<void> {
    const adapter = this.resolveEmailAdapter();

    if (!adapter) {
      return this.chesApiClient.promoteQuery(query);
    }

    // No-op: real adapters send immediately, no queue to promote from
  }

  async promoteMessage(msgId: string): Promise<void> {
    const adapter = this.resolveEmailAdapter();

    if (!adapter) {
      return this.chesApiClient.promoteMessage(msgId);
    }

    // No-op: real adapters send immediately, no queue to promote from
  }

  async cancelQuery(query: ChesStatusQuery): Promise<void> {
    const adapter = this.resolveEmailAdapter();

    if (!adapter) {
      return this.chesApiClient.cancelQuery(query);
    }

    // No-op: real adapters send immediately, no queue to cancel from
  }

  async cancelMessage(msgId: string): Promise<void> {
    const adapter = this.resolveEmailAdapter();

    if (!adapter) {
      return this.chesApiClient.cancelMessage(msgId);
    }

    // No-op: real adapters send immediately, no queue to cancel from
  }
}
