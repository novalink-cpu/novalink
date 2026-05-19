import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { MenuButton } from '@/components/UI';
import { BUY_PLATFORMS, getRegionForPlatform } from '@data/config';
import { useTelegram } from '@/hooks/useTelegram';
import { savePurchaseDraft } from '@data/store/appStore';

export function BuyPlatformPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  return (
    <Layout>
      <MessageBubble>
        အသုံးပြုမည့် Device အမျိုးအစားကို ရွေးချယ်ပါ👇
      </MessageBubble>

      <div className="menu-list">
        {BUY_PLATFORMS.map((platform) => (
          <MenuButton
            key={platform.id}
            icon={platform.icon}
            label={platform.label}
            onClick={() => {
              haptic('selection');
              const region = getRegionForPlatform(platform.id);
              savePurchaseDraft({
                platformId: platform.id,
                platformLabel: platform.label,
                regionId: region.id,
                regionName: region.name,
              });
              navigate('/buy/package');
            }}
          />
        ))}
      </div>
    </Layout>
  );
}
