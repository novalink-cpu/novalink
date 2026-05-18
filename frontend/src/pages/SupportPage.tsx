import { Layout } from '@/components/Layout';
import { Card } from '@/components/UI';
import { SUPPORT } from '@data/config';

export function SupportPage() {
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

        <p style={{ fontSize: 14, color: '#5a6b75', marginTop: 16 }}>
          သို့မဟုတ် ဒီ Bot ထဲမှာ မေးခွန်းပို့နိုင်ပါတယ်။
        </p>
      </Card>
    </Layout>
  );
}