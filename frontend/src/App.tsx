import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BottomMainMenu } from '@/components/BottomMainMenu';
import { useTelegram } from '@/hooks/useTelegram';
import { HomePage } from '@/pages/HomePage';
import { BuyPlatformPage } from '@/pages/BuyPlatformPage';
import { BuyPackagePage } from '@/pages/BuyPackagePage';
import { OrderConfirmPage } from '@/pages/OrderConfirmPage';
import { PaymentPage } from '@/pages/PaymentPage';
import { PaymentVerifyPage } from '@/pages/PaymentVerifyPage';
import { ActiveKeysPage } from '@/pages/ActiveKeysPage';
import { GuideHubPage } from '@/pages/GuideHubPage';
import { GuidePlatformPage } from '@/pages/GuidePlatformPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { FAQPage, FAQDetailPage } from '@/pages/FAQPage';
import { SupportPage } from '@/pages/SupportPage';
import { PriceListPage } from '@/pages/PriceListPage';
import { RenewPage } from '@/pages/RenewPage';
import { migrateStaleOrderData } from '@data/store/appStore';

function BackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { webApp } = useTelegram();

  useEffect(() => {
    if (!webApp) return;

    const handleBack = () => {
      if (location.pathname === '/') {
        webApp.close();
      } else if (location.pathname.startsWith('/buy/verify')) {
        navigate('/buy/payment');
      } else if (location.pathname.startsWith('/buy/payment')) {
        navigate('/buy/confirm');
      } else if (location.pathname.startsWith('/buy/confirm')) {
        navigate('/buy/package');
      } else if (location.pathname.startsWith('/buy/package')) {
        navigate('/buy');
      } else if (location.pathname.startsWith('/guide/')) {
        navigate('/guide');
      } else if (location.pathname.startsWith('/faq/')) {
        navigate('/faq');
      } else {
        navigate('/');
      }
    };

    if (location.pathname === '/') {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
      webApp.BackButton.onClick(handleBack);
    }

    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, [location.pathname, navigate, webApp]);

  return null;
}

export default function App() {
  const { isReady } = useTelegram();

  useEffect(() => {
    migrateStaleOrderData();
  }, []);

  if (!isReady) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#1c2b33', fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  return (
    <HashRouter>
      <BackButtonHandler />
      <BottomMainMenu />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/buy" element={<BuyPlatformPage />} />
        <Route path="/buy/package" element={<BuyPackagePage />} />
        <Route path="/buy/confirm" element={<OrderConfirmPage />} />
        <Route path="/buy/payment" element={<PaymentPage />} />
        <Route path="/buy/verify" element={<PaymentVerifyPage />} />
        <Route path="/keys" element={<ActiveKeysPage />} />
        <Route path="/prices" element={<PriceListPage />} />
        <Route path="/guide" element={<GuideHubPage />} />
        <Route path="/guide/:platformId" element={<GuidePlatformPage />} />
        <Route path="/renew" element={<RenewPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/faq/:faqId" element={<FAQDetailPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/instructions" element={<Navigate to="/guide" replace />} />
        <Route path="/activate" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}