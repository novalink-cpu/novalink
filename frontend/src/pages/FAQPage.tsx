import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { Card, MenuButton } from '@/components/UI';
import { FAQ_ITEMS } from '@data/config';
import { useTelegram } from '@/hooks/useTelegram';

export function FAQPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  return (
    <Layout>
      <MessageBubble>❓ မေးလေ့ရှိသော မေးခွန်းများ</MessageBubble>

      <div className="menu-list">
        {FAQ_ITEMS.map((item) => (
          <MenuButton
            key={item.id}
            icon="❓"
            label={item.q}
            onClick={() => {
              haptic('selection');
              navigate(`/faq/${item.id}`);
            }}
          />
        ))}
      </div>
    </Layout>
  );
}

export function FAQDetailPage() {
  const { faqId } = useParams();
  const navigate = useNavigate();
  const item = FAQ_ITEMS.find((f) => f.id === faqId);

  if (!item) {
    navigate('/faq', { replace: true });
    return null;
  }

  return (
    <Layout>
      <Card title={item.q} icon="❓">
        <p style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.a}</p>
      </Card>
    </Layout>
  );
}