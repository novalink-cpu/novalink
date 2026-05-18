import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { ActionButton } from '@/components/UI';
import { PACKAGES } from '@data/config';
import { useTelegram } from '@/hooks/useTelegram';
import { getUserId } from '@/lib/userId';
import { createOrderId, getLastOrderRegion, saveOrder, savePurchaseDraft } from '@data/store/appStore';
import type { Order } from '@data/types';

const RENEW_LABELS: Record<string, string> = {
  '1m': '1 လ တိုးမည်',
  '3m': '3 လ တိုးမည်',
  '6m': '6 လ တိုးမည်',
};

export function RenewPage() {
  const navigate = useNavigate();
  const { haptic, user } = useTelegram();
  const userId = getUserId(user);
  const [region, setRegion] = useState<{ regionId: string; regionName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLastOrderRegion(userId)
      .then(setRegion)
      .finally(() => setLoading(false));
  }, [userId]);

  const go = (path: string) => {
    haptic('selection');
    navigate(path);
  };

  const handleRenew = async (packageId: string) => {
    if (!region || submitting) return;
    const pkg = PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return;

    haptic('selection');
    setSubmitting(true);
    try {
      const orderId = await createOrderId();
      const order: Order = {
        id: orderId,
        telegramUserId: userId,
        regionId: region.regionId,
        regionName: region.regionName,
        packageId: pkg.id,
        packageLabel: pkg.label,
        amount: pkg.price,
        status: 'pending',
        orderType: 'renew',
        createdAt: new Date().toISOString(),
      };
      await saveOrder(order, userId);
      savePurchaseDraft({ regionId: region.regionId, packageId: pkg.id, orderId });
      navigate('/buy/confirm', { state: { order } });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="empty-state">Loading...</div>
      </Layout>
    );
  }

  if (!region) {
    return (
      <Layout>
        <MessageBubble icon="🔑">
          ယခင်အော်ဒါ မရှိသေးပါ။ အရင် VPN Key ဝယ်ယူပြီးမှ သက်တမ်းတိုင် နိုင်ပါသည်။
        </MessageBubble>
        <div className="menu-list">
          <ActionButton icon="🔐" label="VPN Key ဝယ်ရန်" onClick={() => go('/buy')} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <MessageBubble icon="🔄">
        Key သက်တမ်းတိုးလိုပါက Package ကို ရွေးချယ်ပါ 👇
        <br />
        <br />
        ယခင်အသုံးပြုခဲ့သော Region ကိုအခြေခံပြီး Renewal Order အသစ်ဖန်တီးပေးပါမည်။
      </MessageBubble>

      <div className="menu-list">
        {PACKAGES.map((pkg) => (
          <ActionButton
            key={pkg.id}
            label={RENEW_LABELS[pkg.id] ?? pkg.label}
            onClick={() => handleRenew(pkg.id)}
            disabled={submitting}
          />
        ))}
        <ActionButton icon="📞" label="Support" onClick={() => go('/support')} />
      </div>
    </Layout>
  );
}