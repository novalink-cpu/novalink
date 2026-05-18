import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { RegionFlag } from '@/components/RegionFlag';
import { ActionButton } from '@/components/UI';
import { REGIONS } from '@data/config';
import { useTelegram } from '@/hooks/useTelegram';
import { savePurchaseDraft } from '@data/store/appStore';

export function BuyRegionPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  return (
    <Layout>
      <MessageBubble>
        အသုံးပြုလိုသော Region ကို ရွေးချယ်ပါ👇
        <br />
        <br />
        (မြန်မာနိုင်ငံအတွက် Japan Server ကို အကြံပြုပါသည် 🇯🇵)
      </MessageBubble>

      <div className="menu-list">
        {REGIONS.map((region) => (
          <ActionButton
            key={region.id}
            icon={<RegionFlag flagCode={region.flagCode} />}
            label={region.name}
            onClick={() => {
              haptic('selection');
              savePurchaseDraft({ regionId: region.id });
              navigate('/buy/package');
            }}
          />
        ))}
      </div>
    </Layout>
  );
}