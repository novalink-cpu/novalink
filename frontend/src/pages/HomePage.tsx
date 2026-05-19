import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { KeyIcon } from '@/components/KeyIcon';
import { MenuButton } from '@/components/UI';
import { APP_NAME, WELCOME_TEXT } from '@data/config';
import { useTelegram } from '@/hooks/useTelegram';

const MENU_ITEMS: {
  icon: ReactNode;
  label: string;
  path: string;
  featured?: boolean;
}[] = [
  { icon: '🔐', label: 'VPN Key ဝယ်ရန်', path: '/buy', featured: true },
  { icon: <KeyIcon />, label: 'ကျွန်ုပ်၏ Active Keys', path: '/keys' },
  { icon: '📦', label: 'ဝယ်ယူခဲ့သည့် မှတ်တမ်းများ', path: '/orders' },
  { icon: '💰', label: 'စျေးနှုန်းကြည့်ရန်', path: '/prices' },
  { icon: '📱', label: 'အသုံးပြုပုံ', path: '/guide' },
  { icon: '🔄', label: 'Key သက်တမ်းတိုးရန်', path: '/renew' },
  { icon: '❓', label: 'FAQ', path: '/faq' },
  { icon: '📞', label: 'အကူအညီဆက်သွယ်ရန်', path: '/support' },
];

export function HomePage() {
  const navigate = useNavigate();
  const { displayName, haptic } = useTelegram();

  return (
    <Layout>
      <MessageBubble icon="🔐">
        မင်္ဂလာပါ <span className="welcome-name">{displayName}</span> — {APP_NAME} မှ ကြိုဆိုပါတယ်။
        <br />
        {WELCOME_TEXT}
        <br />
        အောက်က Menu မှာ မိမိလိုအပ်တာကို ရွေးချယ်ပြီး ဆက်လုပ်ပါ👇
      </MessageBubble>

      <div className="menu-list">
        {MENU_ITEMS.map((item) => (
          <MenuButton
            key={item.path}
            icon={item.icon}
            label={item.label}
            featured={item.featured}
            onClick={() => {
              haptic('selection');
              navigate(item.path);
            }}
          />
        ))}
      </div>
    </Layout>
  );
}