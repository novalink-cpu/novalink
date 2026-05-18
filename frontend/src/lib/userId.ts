interface TelegramUserLike {
  id: number;
}

/** Telegram user id as string; guest when testing in browser */
export function getUserId(user?: TelegramUserLike | null): string {
  return user?.id ? String(user.id) : 'guest';
}