export default () => {
  const defaultEmailFrom =
    process.env.DEFAULT_EMAIL_FROM || 'noreply@localhost';
  const defaultSmsFrom = process.env.DEFAULT_SMS_FROM_NUMBER || '+15551234567';
  const defaultTemplateSubject =
    process.env.DEFAULT_TEMPLATE_SUBJECT || 'Notification';

  return {
    // Application
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development',

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

    // API Authentication
    api: {
      apiKey: process.env.API_KEY,
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
