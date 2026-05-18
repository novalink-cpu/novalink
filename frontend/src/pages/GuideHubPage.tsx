import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { MenuButton } from '@/components/UI';
import { GUIDE_PLATFORMS } from '@data/config';
import { useTelegram } from '@/hooks/useTelegram';

export function GuideHubPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  return (
    <Layout>
      <MessageBubble>
        📱 Outline VPN အသုံးပြုပုံ
        <br />
        <br />
        အသုံးပြုမည့် Device အမျိုးအစားကို ရွေးချယ်ပါ👇 Setup လုပ်နည်းနှင့် Official Download Link
        ပါဝင်ပါသည်။
      </MessageBubble>

      <div className="menu-list">
        {GUIDE_PLATFORMS.map((p) => (
          <MenuButton
            key={p.id}
            icon={p.icon}
            label={p.label}
            onClick={() => {
              haptic('selection');
              navigate(`/guide/${p.id}`);
            }}
          />
        ))}
      </div>
    </Layout>
  );
}