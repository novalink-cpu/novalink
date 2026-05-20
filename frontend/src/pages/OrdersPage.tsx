import { Layout } from '@/components/Layout';
import { Card, InfoRow } from '@/components/UI';
import { getOrderStatusLabel, normalizeOrderStatus } from '@data/config';
import { useOrders } from '@/hooks/useOrder';
import { useTelegram } from '@/hooks/useTelegram';
import { getUserId } from '@/lib/userId';

export function OrdersPage() {
  const { user } = useTelegram();
  const userId = getUserId(user);
  const { orders, loading, error } = useOrders(userId);

  return (
    <Layout>
      <Card title="ဝယ်ယူခဲ့သည့် မှတ်တမ်းများ" icon="📦">
        {loading && <div className="empty-state">Loading...</div>}
        {error && <div className="alert-box alert-box--info">{error}</div>}
        {!loading && !error && orders.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">📦</div>
            <p>အော်ဒါ မရှိသေးပါ</p>
          </div>
        )}
        {!loading &&
          orders.map((order) => (
            <div key={order.id} className="key-card">
              <InfoRow icon="📋" label="Order ID" value={order.id} />
              {order.orderType === 'renew' && <InfoRow icon="🔄" label="အမျိုးအစား" value="သက်တမ်းတိုင်" />}
              <InfoRow icon="📦" label="Package" value={order.packageLabel} />
              <InfoRow icon="💰" label="ငွေ" value={`${order.amount.toLocaleString()} MMK`} />
              <InfoRow
                icon="📌"
                label="Status"
                value={
                  <span
                    className={`status-badge status-badge--${normalizeOrderStatus(order.status)}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                }
              />
              {order.paymentMethodName && (
                <InfoRow icon="💳" label="Payment" value={order.paymentMethodName} />
              )}
            </div>
          ))}
      </Card>
    </Layout>
  );
}