export const SITE_CONFIG = {
  name: 'Садака',
  description: 'Цифровая платформа для прозрачных и доверенных пожертвований в мечетях Таджикистана',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://sadaka.tj',

  // Social links
  social: {
    facebook: 'https://facebook.com/sadaka',
    instagram: 'https://instagram.com/sadaka',
    twitter: 'https://twitter.com/sadaka',
    telegram: 'https://t.me/sadaka',
  },

  // Contact info
  contact: {
    email: 'info@sadaka.tj',
    support: 'support@sadaka.tj',
    phone: '+992 371 123 456',
  },

  // App links
  apps: {
    ios: 'https://apps.apple.com/tj/app/sadaka',
    android: 'https://play.google.com/store/apps/details?id=tj.sadaka',
  },
};

export default SITE_CONFIG;
