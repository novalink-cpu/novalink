import { config } from './config.js';

const API = 'https://api.telegram.org';

export async function tg(method, body = {}) {
  if (!config.botToken) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const res = await fetch(`${API}/bot${config.botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method}: ${JSON.stringify(data)}`);
  }
  return data.result;
}

export async function sendUserMessage(telegramUserId, text) {
  await tg('sendMessage', {
    chat_id: telegramUserId,
    text,
    disable_web_page_preview: false,
  });
}
