import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { ActionButton } from '@/components/UI';
import { getBuyPlatformById, PACKAGES } from '@data/config';
import { useTelegram } from '@/hooks/useTelegram';
import { getUserId } from '@/lib/userId';
import { createOrderId, getPurchaseDraft, saveOrder, savePurchaseDraft } from '@data/store/appStore';
import type { Order } from '@data/types';

export function BuyPackagePage() {
  const navigate = useNavigate();
  const { haptic, user } = useTelegram();
  const userId = getUserId(user);
  const draft = getPurchaseDraft();
  const platform = draft.platformId ? getBuyPlatformById(draft.platformId) : undefined;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!platform || !draft.regionId || !draft.regionName) {
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
        regionId: draft.regionId!,
        regionName: draft.regionName!,
        packageId: pkg.id,
        packageLabel: pkg.label,
        amount: pkg.price,
        status: 'pending',
        orderType: 'purchase',
        createdAt: new Date().toISOString(),
      };

      const saved = await saveOrder(order, userId);
      if (!saved.id || saved.id > 2_147_483_647) {
        throw new Error('အော်ဒါ ID မရပါ — API ချိတ်ဆက်မှု စစ်ပါ။');
      }
      savePurchaseDraft({ ...draft, packageId: pkg.id, orderId: saved.id });
      navigate('/buy/confirm', { state: { order: saved } });
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
        Device: <strong>{platform.label}</strong>
        <br />
        အောက်ပါ Package ကို ရွေးချယ်ပါ
      </MessageBubble>

      {error ? <div className="alert-box alert-box--info">{error}</div> : null}

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
