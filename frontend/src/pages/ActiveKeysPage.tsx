import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { KeyIcon } from '@/components/KeyIcon';
import { ActionButton, Card } from '@/components/UI';
import { useTelegram } from '@/hooks/useTelegram';
import { getUserId } from '@/lib/userId';
import { getActiveKeys } from '@data/store/appStore';
import type { VpnKey } from '@data/types';

export function ActiveKeysPage() {
  const navigate = useNavigate();
  const { haptic, user, webApp } = useTelegram();
  const userId = getUserId(user);
  const [keys, setKeys] = useState<VpnKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  async function copyKeyText(text: string): Promise<boolean> {
    const tgCopy = (webApp as { copyText?: (t: string, cb?: () => void) => void } | undefined)
      ?.copyText;
    if (tgCopy) {
      try {
        tgCopy(text);
        return true;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  const handleCopyKey = async (key: VpnKey) => {
    haptic('selection');
    await copyKeyText(key.accessUrl);
    haptic('success');
    setCopiedKeyId(key.id);
    window.setTimeout(() => {
      setCopiedKeyId((current) => (current === key.id ? null : current));
    }, 2500);
  };

  useEffect(() => {
    getActiveKeys(userId)
      .then(setKeys)
      .finally(() => setLoading(false));
  }, [userId]);

  const go = (path: string) => {
    haptic('selection');
    navigate(path);
  };

  if (loading) {
    return (
      <Layout>
        <div className="empty-state">Loading...</div>
      </Layout>
    );
  }

  if (keys.length === 0) {
    return (
      <Layout>
        <MessageBubble icon="🔑">
          လက်ရှိအသုံးပြုနိုင်သော Active Key မရှိသေးပါ။
          <br />
          <br />
          အသစ်ဝယ်ယူရန် သို့မဟုတ် သက်တမ်းတိုးရန် Menu မှ ဆက်လုပ်နိုင်ပါတယ်။
        </MessageBubble>

        <div className="menu-list">
          <ActionButton icon="🔄" label="Key သက်တမ်းတိုးရန်" onClick={() => go('/renew')} />
          <ActionButton icon="🔐" label="VPN Key ဝယ်ရန်" onClick={() => go('/buy')} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Card title="ကျွန်ုပ်၏ Active Keys" icon={<KeyIcon size={20} />}>
        {keys.map((key, index) => (
          <div key={key.id} className="key-card">
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              {index + 1}. အသုံးပြုနိုင်ဆဲ ✅
            </p>
            {key.orderId && <p style={{ fontSize: 14 }}>🧾 Order ID: {key.orderId}</p>}
            <p style={{ fontSize: 14 }}>🌍 Region: {key.region}</p>
            <p style={{ fontSize: 14 }}>📦 Package: {key.packageLabel}</p>
            {key.expiresAt && (
              <p style={{ fontSize: 14 }}>
                📅 Expiry: {new Date(key.expiresAt).toLocaleString('my-MM')}
              </p>
            )}
            {key.accessUrl.startsWith('ssconf://') && (
              <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                ssconf — Outline app ထဲ paste လုပ်ပါ
              </p>
            )}
            <div className="key-card__url">{key.accessUrl}</div>
            <ActionButton
              icon={copiedKeyId === key.id ? '✅' : '📋'}
              label={copiedKeyId === key.id ? 'Copied' : 'Copy Key'}
              variant={copiedKeyId === key.id ? 'copied' : 'primary'}
              onClick={() => void handleCopyKey(key)}
            />
          </div>
        ))}
      </Card>

      <div className="menu-list" style={{ marginTop: 12 }}>
        <ActionButton icon="🔄" label="Key သက်တမ်းတိုးရန်" onClick={() => go('/renew')} />
        <ActionButton icon="🔐" label="VPN Key ဝယ်ရန်" onClick={() => go('/buy')} />
      </div>
    </Layout>
  );
}