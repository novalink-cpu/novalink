import { config } from './config.js';
import { runExpiryRevocationJob } from './vpnLifecycle.js';

let timer;

export function startExpiryRevocationJob() {
  if (config.vpnDemoMode) {
    console.log('[expiry] job skipped — VPN_DEMO_MODE=1');
    return;
  }

  const run = () => {
    runExpiryRevocationJob()
      .then(({ revoked }) => {
        if (revoked > 0) {
          console.log(`[expiry] job finished — revoked ${revoked} order(s)`);
        }
      })
      .catch((e) => console.error('[expiry] job error', e));
  };

  run();
  timer = setInterval(run, config.vpnExpiryCheckMs);
  console.log(
    `[expiry] revocation job every ${Math.round(config.vpnExpiryCheckMs / 60000)} min`,
  );
}

export function stopExpiryRevocationJob() {
  if (timer) clearInterval(timer);
}
