import { FormEvent, useState } from 'react';
import { Layout } from '@/components/Layout';
import { ActionButton, Card } from '@/components/UI';
import { useTelegram } from '@/hooks/useTelegram';

export function ActivatePage() {
  const { haptic } = useTelegram();
  const [keyInput, setKeyInput] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim().startsWith('ss://')) {
      setMessage('မှန်ကန်သော ss:// key ကို ထည့်ပါ');
      haptic('error');
      return;
    }
    haptic('success');
    setMessage('Key အသက်ဝင်စေမှု တောင်းဆိုမှု ပို့ပြီးပါပြီ။ Admin က အတည်ပြုပေးပါမည်။');
  };

  return (
    <Layout>
      <Card title="Key အသက်ဝင်စေရန်" icon="⚙️">
        <p style={{ fontSize: 14, color: '#5a6b75', marginBottom: 16, lineHeight: 1.6 }}>
          သင့် VPN Key (ss:// link) ကို အောက်တွင် ထည့်သွင်းပြီး Activate လုပ်ပါ။
        </p>

        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="vpn-key">VPN Key</label>
          <input
            id="vpn-key"
            className="form-input"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="ss://..."
          />

          {message && (
            <div className="alert-box alert-box--warning" style={{ marginTop: 12 }}>
              {message}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <ActionButton icon="✅" label="Activate" type="submit" />
          </div>
        </form>
      </Card>
    </Layout>
  );
}