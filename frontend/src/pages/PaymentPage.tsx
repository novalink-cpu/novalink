import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ActionButton, Card, NavFooter } from '@/components/UI';
import { PAYMENT_METHODS } from '@data/config';
import { useOrder } from '@/hooks/useOrder';
import { useTelegram } from '@/hooks/useTelegram';
import { getUserId } from '@/lib/userId';
import { getPurchaseDraft } from '@data/store/appStore';

export function PaymentPage() {
  const navigate = useNavigate();
  const { haptic, user } = useTelegram();
  const userId = getUserId(user);
  const draft = getPurchaseDraft();
  const { order, loading } = useOrder(userId, draft.orderId);
  const method = PAYMENT_METHODS.find((p) => p.id === draft.paymentMethodId);

  useEffect(() => {
    if (!loading && (!order || !method)) {
      navigate('/buy/confirm', { replace: true });
    }
  }, [loading, order, method, navigate]);

  if (loading || !order || !method) {
    return (
      <Layout>
        <div className="empty-state">Loading...</div>
      </Layout>
    );
  }

  const goToScreenshot = () => {
    haptic('success');
    navigate('/buy/verify');
  };

  return (
    <Layout>
      <Card title="ကျေးဇူးပြု၍ အောက်ပါအကောင့်သို့ ငွေလွှဲပါ  " icon="💳">
        <div className="payment-box">
          <div className="payment-box__row">
            <span>{method.icon}</span>
            <span>{method.name}</span>
            <span className="payment-box__number">{method.accountNumber}</span>
          </div>
          <div className="payment-box__row">
            <span>👤</span>
            <span>Name</span>
            <strong>{method.accountName}</strong>
          </div>
        </div>

        <div className="alert-box alert-box--warning">
          ငွေလွှဲပြီးပါက "ငွေလွှဲပြီးပါပြီ" ကိုနှိပ်ပြီး Screenshot ပေးပို့ပါ။
        </div>
      </Card>

      <NavFooter>
        <ActionButton icon="✅" label="ငွေလွှဲပြီးပါပြီ" onClick={goToScreenshot} />
        <ActionButton icon="🔄" label="Package ပြန်ရွေးမည်" variant="secondary" onClick={() => navigate('/buy/package')} />
      </NavFooter>
    </Layout>
  );
}