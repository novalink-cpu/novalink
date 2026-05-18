import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MessageBubble } from '../components/MessageBubble';
import { ActionButton } from '../components/UI';
import { RegionFlag } from '../components/RegionFlag';
import { getRegionById, PACKAGES } from '../data/config';
import { useTelegram } from '../hooks/useTelegram';
import { getUserId } from '../lib/userId';
import { createOrderId, getPurchaseDraft, saveOrder, savePurchaseDraft } from '../store/appStore';
import type { Order } from '../types';

export function BuyPackagePage() {
  const navigate = useNavigate();
  const { haptic, user } = useTelegram();
  const userId = getUserId(user);
  const draft = getPurchaseDraft();
  const region = draft.regionId ? getRegionById(draft.regionId) : undefined;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!region) {
    navigate('/buy', { replace: true });
    return null;
  }

  const handleSelect = async (packageId: string) => {
    const pkg = PACKAGES.find((p) => p.id === packageId);
    if (!pkg || submitting) return;

    haptic('selection');
    setSubmitting(true);
    setError(null);
    try {
      const orderId = await createOrderId();
      const order: Order = {
        id: orderId,
        telegramUserId: userId,
        regionId: region.id,
        regionName: region.name,
        packageId: pkg.id,
        packageLabel: pkg.label,
        amount: pkg.price,
        status: 'pending',
        orderType: 'purchase',
        createdAt: new Date().toISOString(),
      };

      await saveOrder(order, userId);
      savePurchaseDraft({ ...draft, packageId: pkg.id, orderId });
      navigate('/buy/confirm', { state: { order } });
    } catch (e) {
      console.error(e);
      haptic('error');
      setError('အော်ဒါ ဖန်တီးရာတွင် ပြဿနာရှိပါသည်။ ထပ်စမ်းကြည့်ပါ။');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <MessageBubble>
        Region:{' '}
        <strong className="region-label">
          <RegionFlag flagCode={region.flagCode} size={22} />
          {region.name}
        </strong>
        <br />
        အသုံးပြုလိုသော Package ကို ရွေးချယ်ပါ👇
      </MessageBubble>

      {error && <div className="alert-box alert-box--info">{error}</div>}

      <div className="menu-list">
        {PACKAGES.map((pkg) => (
          <ActionButton
            key={pkg.id}
            label={submitting ? 'အော်ဒါ ဖန်တီးနေသည်...' : `${pkg.label} — ${pkg.price.toLocaleString()} MMK`}
            onClick={() => handleSelect(pkg.id)}
            disabled={submitting}
          />
        ))}
      </div>
    </Layout>
  );
}
