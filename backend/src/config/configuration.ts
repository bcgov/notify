export default () => ({
  // Application
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // CHES (Common Hosted Email Service)
  ches: {
    baseUrl: process.env.CHES_BASE_URL,
    clientId: process.env.CHES_CLIENT_ID,
    clientSecret: process.env.CHES_CLIENT_SECRET,
    tokenUrl: process.env.CHES_TOKEN_URL,
  },

  // Nodemailer (SMTP)
  nodemailer: {
    host: process.env.NODEMAILER_HOST || 'localhost',
    port: parseInt(process.env.NODEMAILER_PORT || '1025', 10),
    secure: process.env.NODEMAILER_SECURE === 'true',
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
    from: process.env.NODEMAILER_FROM || 'noreply@localhost',
  },

  // Twilio (SMS)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  },

  // API Authentication
  api: {
    apiKey: process.env.API_KEY,
  },

  // GC Notify adapters (delivery, template, storage)
  delivery: {
    email:
      process.env.EMAIL_ADAPTER || process.env.EMAIL_TRANSPORT || 'nodemailer',
    sms: process.env.SMS_ADAPTER || process.env.SMS_TRANSPORT || 'twilio',
  },

  // GC Notify template engine
  gcNotify: {
    defaultTemplateEngine:
      process.env.GC_NOTIFY_DEFAULT_TEMPLATE_ENGINE || 'jinja2',
  },
});
