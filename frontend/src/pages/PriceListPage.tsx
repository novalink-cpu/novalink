import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ActionButton, Card } from '@/components/UI';
import { PRICE_LIST } from '@data/config';

export function PriceListPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <Card title={PRICE_LIST.title} icon="💰">
        {PRICE_LIST.items.map((item) => (
          <div key={item.label} className="info-row">
            <span className="info-row__icon">📦</span>
            <span className="info-row__label">{item.label}</span>
            <span className="info-row__value">{item.price.toLocaleString()} MMK</span>
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          {PRICE_LIST.features.map((f) => (
            <p key={f} style={{ fontSize: 14, marginBottom: 6 }}>
              ✔️ {f}
            </p>
          ))}
        </div>
      </Card>

      <ActionButton icon="🛒" label="ဝယ်မည်" onClick={() => navigate('/buy')} />
    </Layout>
  );
}