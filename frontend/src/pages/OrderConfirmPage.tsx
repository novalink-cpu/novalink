import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { ActionButton, Card, InfoRow } from '@/components/UI';
import { PAYMENT_METHODS } from '@data/config';
import { useTelegram } from '@/hooks/useTelegram';
import { getUserId } from '@/lib/userId';
import { getOrder, getPurchaseDraft, saveOrder, savePurchaseDraft } from '@data/store/appStore';
import type { Order } from '@data/types';

export function OrderConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic, user } = useTelegram();
  const userId = getUserId(user);
  const draft = getPurchaseDraft();

  const stateOrder = (location.state as { order?: Order } | null)?.order;
  const [order, setOrder] = useState<Order | null>(stateOrder ?? null);
  const [loading, setLoading] = useState(!stateOrder);

  useEffect(() => {
    const orderId = stateOrder?.id ?? draft.orderId;
    if (!orderId) {
      navigate('/buy', { replace: true });
      return;
    }

    if (stateOrder) {
      setOrder(stateOrder);
      setLoading(false);
      return;
    }

    let cancelled = false;
    getOrder(userId, orderId).then((o) => {
      if (cancelled) return;
      if (o) {
        setOrder(o);
      } else {
        navigate('/buy', { replace: true });
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, draft.orderId, stateOrder, navigate]);

  if (loading || !order) {
    return (
      <Layout>
        <div className="empty-state">Loading...</div>
      </Layout>
    );
  }

  const selectPayment = async (paymentId: string) => {
    const method = PAYMENT_METHODS.find((p) => p.id === paymentId);
    if (!method) return;

    haptic('selection');
    const updated = {
      ...order,
      paymentMethodId: method.id,
      paymentMethodName: method.name,
      status: 'pending' as const,
    };
    await saveOrder(updated, userId);
    setOrder(updated);
    savePurchaseDraft({ ...draft, paymentMethodId: method.id, orderId: order.id });
    navigate('/buy/payment');
  };

  return (
    <Layout>
      <Card title="အော်ဒါဖန်တီးပြီးပါပြီ" icon="✅">
        <InfoRow icon="📋" label="Order ID" value={order.id} />
        <InfoRow icon="🌍" label="Region" value={order.regionName} />
        <InfoRow icon="📦" label="Package" value={order.packageLabel} />
        <InfoRow icon="💰" label="ကျသင့်ငွေ" value={`${order.amount.toLocaleString()} MMK`} />
      </Card>

      <MessageBubble>ငွေပေးချေမည့် နည်းလမ်းကို ရွေးချယ်ပါ 👇</MessageBubble>

      <div className="menu-list">
        {PAYMENT_METHODS.map((method) => (
          <ActionButton
            key={method.id}
            icon={method.icon}
            label={method.name}
            onClick={() => selectPayment(method.id)}
          />
        ))}
      </div>
    </Layout>
  );
}