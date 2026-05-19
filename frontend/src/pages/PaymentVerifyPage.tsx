import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MessageBubble } from '@/components/MessageBubble';
import { ActionButton, Card, NavFooter } from '@/components/UI';
import { useOrder } from '@/hooks/useOrder';
import { useTelegram } from '@/hooks/useTelegram';
import { getUserId } from '@/lib/userId';
import { getPurchaseDraft, submitPaymentProof } from '@data/store/appStore';

export function PaymentVerifyPage() {
  const navigate = useNavigate();
  const { haptic, user } = useTelegram();
  const userId = getUserId(user);
  const fileRef = useRef<HTMLInputElement>(null);
  const draft = getPurchaseDraft();
  const { order, loading, update } = useOrder(userId, draft.orderId);

  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setScreenshot(order.screenshot ?? order.screenshotUrl ?? null);
    }
  }, [order]);

  useEffect(() => {
    if (!loading && !order) {
      navigate('/buy', { replace: true });
    }
  }, [loading, order, navigate]);

  if (loading || !order) {
    return (
      <Layout>
        <div className="empty-state">Loading...</div>
      </Layout>
    );
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!screenshot) return;

    setSubmitting(true);
    setUploadError(null);
    setSuccessMessage(null);
    try {
      const updated = await submitPaymentProof(userId, order.id, screenshot);
      haptic('success');
      const msg =
        updated.submitMessage ??
        'တင်ပြပြီးပါပြီ — စောင့်ဆိုင်းဆဲ';
      setSuccessMessage(msg);
      try {
        await update({
          screenshot: updated.screenshot ?? screenshot,
          screenshotUrl: updated.screenshotUrl,
          status: updated.status,
        });
      } catch (syncErr) {
        console.warn('Local order sync after submit', syncErr);
      }
      window.setTimeout(() => navigate('/orders'), 2200);
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : 'တင်ပြခြင်း မအောင်မြင်ပါ။');
      haptic('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <MessageBubble>
        ငွေလွှဲပြီးပါက အောက်ပါ Screenshot ပေးပို့ပါ
      </MessageBubble>

      <Card>
        <div className="step-item">
          <span className="step-item__num">1</span>
          <div>
            <p className="step-item__title">Order ID</p>
            <p className="step-item__desc" style={{ fontWeight: 600 }}>
              {order.id}
            </p>
          </div>
        </div>

        <div className="step-item" style={{ marginTop: 20 }}>
          <span className="step-item__num">2</span>
          <div>
            <p className="step-item__title">Screenshot</p>
            <p className="step-item__desc">ငွေပေးချေမှု Screenshot တင်ပြပါ</p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {screenshot ? (
          <img src={screenshot} alt="Payment screenshot" className="upload-preview" />
        ) : (
          <button type="button" className="upload-zone" onClick={() => fileRef.current?.click()}>
            <div className="upload-zone__icon">📷</div>
            <div>Screenshot ရွေးချယ်ရန် နှိပ်ပါ</div>
          </button>
        )}

        <div className="alert-box alert-box--info">
          📌 ကျွန်ုပ်တို့ဘက်မှ အတည်ပြုပြီးပါက Key ကို ပေးပို့ပေးပါမည်။
        </div>

        {successMessage && (
          <div
            className="alert-box alert-box--info"
            style={{ marginTop: 12, borderColor: '#2e7d32', background: '#e8f5e9' }}
          >
            ✅ {successMessage}
          </div>
        )}

        {uploadError && (
          <div className="alert-box alert-box--warning" style={{ marginTop: 12 }}>
            {uploadError}
          </div>
        )}
      </Card>

      <form onSubmit={handleSubmit}>
        <NavFooter>
          <ActionButton
            icon="✅"
            label={
              successMessage
                ? 'အောင်မြင်ပါပြီ'
                : submitting
                  ? 'တင်ပြနေသည်...'
                  : 'Screenshot တင်ပြမည်'
            }
            type="submit"
            disabled={!screenshot || submitting || Boolean(successMessage)}
          />
        </NavFooter>
      </form>
    </Layout>
  );
}
