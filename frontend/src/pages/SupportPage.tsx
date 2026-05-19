import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, ActionButton } from '@/components/UI';
import { MessageBubble } from '@/components/MessageBubble';
import { SUPPORT } from '@data/config';
import { useTelegram } from '@/hooks/useTelegram';
import { getUserId } from '@/lib/userId';
import { getOrders, isUsingApi } from '@data/store/appStore';
import { apiConfigErrorMessage, isApiEnabled, renderSubmitKeyIssue } from '@backend/api/client';
import type { Order } from '@data/types';

export function SupportPage() {
  const { haptic, user, isTelegram } = useTelegram();
  const userId = getUserId(user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getOrders(userId)
      .then((list) => {
        const now = Date.now();
        const eligible = list
          .filter(
            (o) =>
              o.status === 'completed' &&
              o.accessUrl &&
              o.orderType !== 'renew' &&
              (!o.expiresAt || new Date(o.expiresAt).getTime() > now),
          )
          .sort((a, b) => b.id - a.id);
        setOrders(eligible);
        if (eligible.length === 1) setSelectedId(eligible[0].id);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSubmitKeyIssue = async () => {
    if (!selectedId || submitting) return;
    if (!isTelegram || userId === 'guest') {
      setFeedback({
        ok: false,
        text: 'Telegram Mini App အတွင်းမှသာ တင်ပြနိုင်ပါသည်။',
      });
      return;
    }
    if (!isApiEnabled() || !isUsingApi()) {
      setFeedback({ ok: false, text: apiConfigErrorMessage() });
      return;
    }

    haptic('selection');
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await renderSubmitKeyIssue(userId, selectedId);
      haptic('success');
      setFeedback({ ok: true, text: result.message });
    } catch (e) {
      haptic('error');
      setFeedback({
        ok: false,
        text: e instanceof Error ? e.message : 'တင်ပြမရပါ',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Card title="အကူအညီဆက်သွယ်ရန်" icon="📞">
        <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
          📞 အကူအညီလိုပါက အောက်ပါအတိုင်း ဆက်သွယ်နိုင်ပါတယ်👇
        </p>

        <a href={SUPPORT.telegramUrl} target="_blank" rel="noopener noreferrer" className="ext-link">
          💬 Telegram: {SUPPORT.telegram}
        </a>

        {SUPPORT.phones.map((phone) => (
          <a key={phone} href={`tel:${phone}`} className="ext-link">
            📱 {phone}
          </a>
        ))}
      </Card>

      <MessageBubble icon="🔧">
        Key ချိတ်မရပါက အော်ဒါ နံပါတ် ရွေးပြီး တင်ပြပါ — Admin စစ်ပြီး key အသစ် ထုတ်ပေးပါမည်
        (အဟောင်း key အလိုအလျောက် ပိတ်ပါမည်)။
      </MessageBubble>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : orders.length === 0 ? (
        <p style={{ fontSize: 14, color: '#5a6b75', textAlign: 'center', margin: '12px 0' }}>
          သက်တမ်းကျန်သော Key မရှိပါ — VPN Key ဝယ်ယူပါ သို့မဟုတ် သက်တမ်းတိုး သုံးပါ။
        </p>
      ) : (
        <div className="menu-list">
          {orders.map((o) => (
            <ActionButton
              key={o.id}
              icon={selectedId === o.id ? '✅' : '📋'}
              label={`Order #${o.id} — ${o.regionName} (${o.packageLabel})`}
              onClick={() => {
                haptic('selection');
                setSelectedId(o.id);
                setFeedback(null);
              }}
            />
          ))}
          <ActionButton
            icon="📤"
            variant="accent"
            label={submitting ? 'တင်ပြနေသည်...' : 'Key ချိတ်မရ — Admin ဆီ တင်ပြရန်'}
            onClick={handleSubmitKeyIssue}
            disabled={!selectedId || submitting}
          />
        </div>
      )}

      {feedback && (
        <MessageBubble icon={feedback.ok ? '✅' : '⚠️'}>{feedback.text}</MessageBubble>
      )}
    </Layout>
  );
}
