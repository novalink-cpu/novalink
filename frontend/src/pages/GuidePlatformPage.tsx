import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/UI';
import { GUIDE_PLATFORMS } from '@data/config';

export function GuidePlatformPage() {
  const { platformId } = useParams();
  const navigate = useNavigate();
  const platform = GUIDE_PLATFORMS.find((p) => p.id === platformId);

  if (!platform) {
    navigate('/guide', { replace: true });
    return null;
  }

  return (
    <Layout>
      <Card title={platform.title} icon={platform.icon}>
        <ol style={{ paddingLeft: 20, lineHeight: 1.7, fontSize: 14, color: '#5a6b75' }}>
          {platform.steps.map((step, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              {step}
            </li>
          ))}
        </ol>

        <div className="link-list">
          {platform.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="ext-link">
              📥 {link.label}
            </a>
          ))}
        </div>

        {platform.note && <p className="alert-box alert-box--warning">{platform.note}</p>}
      </Card>
    </Layout>
  );
}