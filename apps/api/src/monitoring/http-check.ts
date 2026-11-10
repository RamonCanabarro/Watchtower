import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(address, prefix, 'ipv4');
const publicV6 = new BlockList();
publicV6.addSubnet('2000::', 3, 'ipv6');
blocked.addSubnet('2001::', 23, 'ipv6');
blocked.addSubnet('2001:db8::', 32, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');

export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  return (
    family === 6 &&
    publicV6.check(address, 'ipv6') &&
    !blocked.check(address, 'ipv6')
  );
}

export type CheckResult = {
  status: 'ONLINE' | 'OFFLINE' | 'TIMEOUT' | 'ERROR';
  httpStatus: number | null;
  responseTime: number;
  error: string | null;
};

async function requestOnce(
  url: URL,
  signal: AbortSignal,
  allowPrivate: boolean,
) {
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('UNSAFE_URL');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true });
  signal.throwIfAborted();
  if (
    !addresses.length ||
    (!allowPrivate &&
      addresses.some(({ address }) => !isPublicAddress(address)))
  )
    throw new Error('UNSAFE_URL');
  const address = addresses[0]!;
  return new Promise<{ status: number; location?: string }>(
    (resolve, reject) => {
      const request = (url.protocol === 'https:' ? https : http).request(
        url,
        {
          method: 'GET',
          signal,
          agent: false,
          headers: { 'user-agent': 'Watchtower/0.1', accept: '*/*' },
          // Pin the validated DNS result, including after redirects, to prevent DNS rebinding.
          lookup: (_host, options, callback) =>
            options.all
              ? callback(null, addresses)
              : callback(null, address.address, address.family),
        },
        (response) => {
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location,
          });
          response.destroy();
        },
      );
      request.once('error', reject);
      request.end();
    },
  );
}

export async function checkHttp(
  target: string,
  timeout: number,
  allowPrivate = false,
): Promise<CheckResult> {
  const started = performance.now();
  const signal = AbortSignal.timeout(Math.ceil(timeout * 1000));
  const duration = () => Math.round(performance.now() - started);
  try {
    let url = new URL(target);
    for (let redirects = 0; redirects <= 5; redirects++) {
      // Include DNS resolution in the overall deadline.
      const response = await Promise.race([
        requestOnce(url, signal, allowPrivate),
        new Promise<never>((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          }),
        ),
      ]);
      if (
        [301, 302, 303, 307, 308].includes(response.status) &&
        response.location
      ) {
        if (redirects === 5) throw new Error('TOO_MANY_REDIRECTS');
        url = new URL(response.location, url);
        continue;
      }
      return {
        status:
          response.status >= 200 && response.status < 400
            ? 'ONLINE'
            : 'OFFLINE',
        httpStatus: response.status,
        responseTime: duration(),
        error: null,
      };
    }
    throw new Error('TOO_MANY_REDIRECTS');
  } catch (error) {
    const timedOut = signal.aborted;
    const reason = error instanceof Error ? error.message : '';
    return {
      status: timedOut ? 'TIMEOUT' : 'ERROR',
      httpStatus: null,
      responseTime: duration(),
      error: timedOut
        ? 'Tempo limite excedido.'
        : reason === 'UNSAFE_URL'
          ? 'Destino privado ou protocolo bloqueado.'
          : reason === 'TOO_MANY_REDIRECTS'
            ? 'Limite de redirecionamentos excedido.'
            : 'Falha de DNS, conexão ou TLS.',
    };
  }
}
