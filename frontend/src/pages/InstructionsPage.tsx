import { Layout } from '@/components/Layout';
import { Card } from '@/components/UI';
import { INSTRUCTIONS } from '@data/config';

export function InstructionsPage() {
  return (
    <Layout>
      <Card title="အသုံးပြုနည်းများ" icon="🔧">
        {INSTRUCTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 10 }}>{section.title}</h3>
            <ol style={{ paddingLeft: 20, lineHeight: 1.7, fontSize: 14, color: '#5a6b75' }}>
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </Card>
    </Layout>
  );
}