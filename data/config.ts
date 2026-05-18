import type { Package, PaymentMethod, Region } from './types';

export const APP_NAME = 'NovaLink MM';

export const WELCOME_TEXT =
  'မြန်ဆန်၊ တည်ငြိမ်ပြီး လုံခြုံတဲ့ Internet အသုံးပြုနိုင်ရန် Outline VPN Key များ ဝယ်ယူနိုင်ပါတယ်။';

export const REGIONS: Region[] = [
  { id: 'jp', name: 'Tokyo', flagCode: 'jp', regionCode: 'jp' },
  { id: 'de', name: 'Germany', flagCode: 'de', regionCode: 'de' },
  { id: 'sg', name: 'Singapore', flagCode: 'sg', regionCode: 'sg' },
  { id: 'us', name: 'United States', flagCode: 'us', regionCode: 'us' },
  { id: 'au', name: 'Australia', flagCode: 'au', regionCode: 'au' },
];

export function getFlagUrl(flagCode: string, width = 80) {
  return `https://flagcdn.com/w${width}/${flagCode.toLowerCase()}.png`;
}

export function getRegionById(id: string) {
  return REGIONS.find((r) => r.id === id);
}

export const PACKAGES: Package[] = [
  { id: '1m', label: '1 Month', months: 1, price: 5000 },
  { id: '3m', label: '3 Months', months: 3, price: 13000 },
  { id: '6m', label: '6 Months', months: 6, price: 25000 },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'kbzpay',
    name: 'KBZPay',
    icon: '💳',
    accountNumber: '09682809928',
    accountName: 'U Hein Tun',
  },
  {
    id: 'wavepay',
    name: 'WavePay',
    icon: '📱',
    accountNumber: '09682809928',
    accountName: 'U Hein Tun',
  },
  {
    id: 'ayapay',
    name: 'AyaPay',
    icon: '🎫',
    accountNumber: '09682809928',
    accountName: 'U Hein Tun',
  },
  {
    id: 'other',
    name: 'Other Payment',
    icon: '💰',
    accountNumber: '09682809928',
    accountName: 'U Hein Tun',
  },
];

export const SUPPORT = {
  telegram: '@novalinkmm',
  telegramUrl: 'https://t.me/novalinkmm',
  phones: ['09682809928', '09985144895', '09660375050'],
};

export const PRICE_LIST = {
  title: '💰 NovaLink MM Outline VPN စျေးနှုန်းစာရင်း',
  items: [
    { label: '1 လ', price: 5000 },
    { label: '3 လ', price: 13000 },
    { label: '6 လ', price: 25000 },
  ],
  features: ['မြန်ဆန်', 'တည်ငြိမ်', 'လုံခြုံ'],
};

export const FAQ_ITEMS = [
  {
    id: 'outline',
    q: 'Outline VPN ဆိုတာဘာလဲ?',
    a: 'Outline VPN ဆိုတာ Internet ကို ပိုမိုလုံခြုံစွာ အသုံးပြုနိုင်စေသော private connection service တစ်ခုဖြစ်ပါတယ်။',
  },
  {
    id: 'safe',
    q: 'Safe ဖြစ်လား?',
    a: 'ဟုတ်ပါတယ် ✅\n\nOutline VPN သည် privacy ကိုပိုကောင်းစေပြီး လုံခြုံစွာ အသုံးပြုနိုင်ရန် ကူညီပေးပါသည်။',
  },
  {
    id: 'devices',
    q: 'ဘယ်နှစ်စက်သုံးလို့ရလဲ?',
    a: 'သင်၏ Key ကို မိမိအသုံးပြုသော စက်များတွင် အသုံးပြုနိုင်ပါသည် ✅\n\nသို့သော် public share မလုပ်ရန် အကြံပြုပါသည်။',
  },
  {
    id: 'connect',
    q: 'Connect မရဘူး?',
    a: 'Connect မရပါက အောက်ပါအချက်များကို စစ်ဆေးပါ👇\n\n• Internet ရှိ/မရှိ\n• Key မှန်/မမှန်\n• Outline App ထည့်ထား/မထား\n• App ကို restart လုပ်ပြီး ပြန်စမ်းကြည့်ပါ',
  },
  {
    id: 'refund',
    q: 'Refund ရလား?',
    a: 'ငွေလွှဲအတည်ပြုပြီး Key ပို့ပြီးနောက် Refund မရပါ။\n\nပြဿနာရှိပါက Support ကို ဆက်သွယ်နိုင်ပါတယ်။',
  },
];

export const GUIDE_PLATFORMS = [
  {
    id: 'android',
    icon: '🤖',
    label: 'Android',
    title: 'Android အတွက် Outline Setup',
    steps: [
      'အောက်က Download Link ကိုနှိပ်ပြီး Outline App ကို Install လုပ်ပါ',
      'App ကိုဖွင့်ပါ',
      "'+' ကိုနှိပ်ပါ",
      'သင်၏ VPN Key ကို Paste လုပ်ပါ',
      'Connect ကိုနှိပ်ပါ',
    ],
    links: [
      { label: 'Play Store', url: 'https://play.google.com/store/apps/details?id=org.outline.android.client' },
      {
        label: 'APK (Alternative)',
        url: 'https://s3.amazonaws.com/outline-releases/client/android/stable/Outline-Client.apk',
      },
    ],
    note: 'APK ဖြင့် တိုက်ရိုက် Install လုပ်ပါက automatic updates မရနိုင်သောကြောင့် Google Play မှ Install လုပ်ရန် အကြံပြုပါသည်။',
  },
  {
    id: 'ios',
    icon: '🍎',
    label: 'iPhone / iPad',
    title: 'iPhone / iPad အတွက် Outline Setup',
    steps: [
      'အောက်က Download Link ကိုနှိပ်ပြီး Outline App ကို Install လုပ်ပါ',
      'App ကိုဖွင့်ပါ',
      "'+' ကိုနှိပ်ပါ",
      'သင်၏ VPN Key ကို Paste လုပ်ပါ',
      'Connect ကိုနှိပ်ပါ',
    ],
    links: [{ label: 'App Store', url: 'https://itunes.apple.com/us/app/outline-app/id1356177741' }],
  },
  {
    id: 'windows',
    icon: '🪟',
    label: 'Windows',
    title: 'Windows အတွက် Outline Setup',
    steps: [
      'အောက်က Download Link ကိုနှိပ်ပြီး Outline Client ကို Download လုပ်ပါ',
      'Install ပြုလုပ်ပါ',
      'App ကိုဖွင့်ပါ',
      "'+' ကိုနှိပ်ပြီး VPN Key ကို Paste လုပ်ပါ",
      'Connect ကိုနှိပ်ပါ',
    ],
    links: [
      {
        label: 'Download',
        url: 'https://s3.amazonaws.com/outline-releases/client/windows/stable/Outline-Client.exe',
      },
    ],
  },
  {
    id: 'macos',
    icon: '💻',
    label: 'macOS',
    title: 'macOS အတွက် Outline Setup',
    steps: [
      'အောက်က Download Link ကိုနှိပ်ပြီး Outline App ကို Install လုပ်ပါ',
      'App ကိုဖွင့်ပါ',
      "'+' ကိုနှိပ်ပါ",
      'သင်၏ VPN Key ကို Paste လုပ်ပါ',
      'Connect ကိုနှိပ်ပါ',
    ],
    links: [{ label: 'App Store', url: 'https://itunes.apple.com/us/app/outline-app/id1356178125' }],
  },
  {
    id: 'linux',
    icon: '🐧',
    label: 'Linux',
    title: 'Linux အတွက် Outline Setup',
    steps: [
      'အောက်က Official Linux Guide ကိုဖတ်ပြီး Install လုပ်ပါ',
      'သို့မဟုတ် .deb package ကို အသုံးပြုနိုင်ပါသည်',
      'App ကိုဖွင့်ပါ',
      'VPN Key ကို Paste လုပ်ပါ',
      'Connect ကိုနှိပ်ပါ',
    ],
    links: [
      { label: 'Official Guide', url: 'https://support.getoutline.org/client/getting-started/install-linux/' },
      {
        label: '.deb package',
        url: 'https://s3.amazonaws.com/outline-releases/client/linux/stable/outline-client_amd64.deb',
      },
    ],
  },
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'စောင့်ဆိုင်းဆဲ',
  paid: 'ငွေပေးပြီး — အတည်ပြုချိန်',
  verified: 'အတည်ပြုချိန် စောင့်ဆိုင်း',
  completed: 'ပြီးမြောက် — Key ရရှိပြီး',
  rejected: 'ငွေလွှဲ မအတည်ပြု',
  cancelled: 'ပယ်ဖျက်',
};

/** Legacy page (`InstructionsPage`) — route redirects to `/guide`. */
export const INSTRUCTIONS: { title: string; steps: string[] }[] = [];
