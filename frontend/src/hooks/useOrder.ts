import { useCallback, useEffect, useState } from 'react';
import { getOrder, getOrders, saveOrder } from '@data/store/appStore';
import type { Order } from '@data/types';

export function useOrders(userId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrders(userId);
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'အော်ဒါများ ရယူ၍ မရပါ');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { orders, loading, error, refresh };
}

export function useOrder(userId: string, orderId?: number) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getOrder(userId, orderId)
      .then((o) => {
        if (!cancelled) setOrder(o);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, orderId]);

  const update = useCallback(
    async (patch: Partial<Order>) => {
      if (!order) return;
      const next = { ...order, ...patch };
      await saveOrder(next, userId);
      setOrder(next);
      return next;
    },
    [order, userId],
  );

  return { order, loading, update, setOrder };
}