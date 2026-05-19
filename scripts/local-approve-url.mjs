/** Print admin approve URL for an order: node scripts/local-approve-url.mjs 1 */
import crypto from 'node:crypto';

const orderId = process.argv[2] || '1';
const secret = process.env.ADMIN_ACTION_SECRET || 'local-demo-secret';
const token = crypto
  .createHmac('sha256', secret)
  .update(`approve:${String(orderId)}`)
  .digest('hex')
  .slice(0, 24);

console.log(`http://localhost:3000/admin/approve/${orderId}?t=${token}`);
