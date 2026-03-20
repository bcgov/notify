export default () => {
  const defaultEmailFrom =
    process.env.DEFAULT_EMAIL_FROM || 'noreply@localhost';
  const defaultSmsFrom = process.env.DEFAULT_SMS_FROM_NUMBER || '+15551234567';
  const defaultTemplateSubject =
    process.env.DEFAULT_TEMPLATE_SUBJECT || 'Notification';

  const isProd = process.env.NODE_ENV === 'production';
  const defaultLogLevel = isProd ? 'info' : 'debug';

  return {
    // Application
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development',

    // Logging (trace, debug, info, warn, error, fatal)
    log: {
      level: process.env.LOG_LEVEL || defaultLogLevel,
    },

    // Rate limiting (same semantics as soba backend)
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      apiWindowMs: parseInt(
        process.env.RATE_LIMIT_API_WINDOW_MS || '60000',
        10,
      ),
      apiMax: parseInt(process.env.RATE_LIMIT_API_MAX || '60', 10),
      publicWindowMs: parseInt(
        process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || '60000',
        10,
      ),
      publicMax: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '200', 10),
    },

    // Database
    database: {
      url: process.env.DATABASE_URL,
    },

    // System defaults (used when sender store or provider override not set)
    defaults: {
      email: { from: defaultEmailFrom },
      sms: { fromNumber: defaultSmsFrom },
      templates: { defaultSubject: defaultTemplateSubject },
    },

    // CHES (Common Hosted Email Service)
    ches: {
      baseUrl: process.env.CHES_BASE_URL,
      clientId: process.env.CHES_CLIENT_ID,
      clientSecret: process.env.CHES_CLIENT_SECRET,
      tokenUrl: process.env.CHES_TOKEN_URL,
      from: process.env.CHES_FROM || defaultEmailFrom,
    },

    // Nodemailer (SMTP)
    nodemailer: {
      host: process.env.NODEMAILER_HOST || 'localhost',
      port: parseInt(process.env.NODEMAILER_PORT || '1025', 10),
      secure: process.env.NODEMAILER_SECURE === 'true',
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
      from: process.env.NODEMAILER_FROM || defaultEmailFrom,
    },

    // Twilio (SMS)
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER || defaultSmsFrom,
    },

    auth: {
      strategies: process.env.AUTH_STRATEGIES
        ? process.env.AUTH_STRATEGIES.split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
      bootstrap: {
        path: process.env.AUTH_BOOTSTRAP_PATH,
        json: process.env.AUTH_BOOTSTRAP_JSON,
      },
      gatewayServiceClient: {
        clientIdHeader: process.env.AUTH_GATEWAY_SERVICE_CLIENT_ID_HEADER,
      },
      gcNotifyApiKey: {
        enabled: process.env.AUTH_GC_NOTIFY_API_KEY_ENABLED !== 'false',
        apiKey: process.env.AUTH_GC_NOTIFY_API_KEY,
        defaultWorkspaceId:
          process.env.AUTH_GC_NOTIFY_API_KEY_DEFAULT_WORKSPACE_ID || 'default',
      },
    },

    // GC Notify adapters (delivery, template, storage)
    delivery: {
      email:
        process.env.EMAIL_ADAPTER ||
        process.env.EMAIL_TRANSPORT ||
        'nodemailer',
      sms: process.env.SMS_ADAPTER || process.env.SMS_TRANSPORT || 'twilio',
    },

    // GC Notify template engine and external (passthrough mode)
    gcNotify: {
      defaultTemplateEngine:
        process.env.GC_NOTIFY_DEFAULT_TEMPLATE_ENGINE || 'jinja2',
      external: {
        baseUrl:
          process.env.GC_NOTIFY_BASE_URL ||
          'https://api.notification.canada.ca',
        enabled: process.env.GC_NOTIFY_EXTERNAL_ENABLED === 'true',
      },
    },
  };
};
