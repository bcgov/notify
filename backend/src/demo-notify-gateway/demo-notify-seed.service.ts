import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DEFAULTS_STORE } from '../defaults/defaults.tokens';
import type { DefaultsStore } from '../defaults/stores/defaults-store.interface';
import { IdentitiesService } from '../identities/identities.service';
import {
  getDemoNotifySenderEmail,
  getDemoNotifyWorkspaceId,
  isDemoNotifyGatewayAuthEnabled,
} from './demo-notify-settings';

@Injectable()
export class DemoNotifySeedService implements OnModuleInit {
  private readonly logger = new Logger(DemoNotifySeedService.name);

  constructor(
    private readonly identitiesService: IdentitiesService,
    @Inject(DEFAULTS_STORE) private readonly defaultsStore: DefaultsStore,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!isDemoNotifyGatewayAuthEnabled()) {
      return;
    }

    const email = getDemoNotifySenderEmail();
    const workspaceId = getDemoNotifyWorkspaceId();
    if (!email) {
      this.logger.warn(
        'DEMO_NOTIFY_GATEWAY_AUTH_ENABLED is on but DEMO_NOTIFY_SENDER_EMAIL is unset; skipping demo seed',
      );
      return;
    }

    const { identities } = await this.identitiesService.getIdentities('email');
    let identityId = identities.find(
      (i) => i.emailAddress?.toLowerCase() === email.toLowerCase(),
    )?.id;

    if (!identityId) {
      const created = await this.identitiesService.createIdentity({
        type: 'email',
        emailAddress: email,
        isDefault: true,
      });
      identityId = created.id;
      this.logger.log(`Demo notify: created identity ${identityId}`);
    }

    this.defaultsStore.merge(workspaceId, {
      emailIdentityId: identityId,
      updatedAt: new Date().toISOString(),
    });
    this.logger.log(
      `Demo notify: merged defaults for workspace ${workspaceId}`,
    );
  }
}
