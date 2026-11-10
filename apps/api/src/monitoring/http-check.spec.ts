import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { checkHttp, isPublicAddress } from './http-check.js';

describe('HTTP checks', () => {
  let server: Server;
  let url: string;
  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/slow') return;
      if (req.url === '/redirect') {
        res.writeHead(302, { location: '/ok' });
        res.end();
        return;
      }
      res.writeHead(req.url === '/fail' ? 503 : 200);
      res.end('ok');
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Missing test address');
    url = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  it('records successful HTTP responses and follows redirects', async () => {
    expect(await checkHttp(`${url}/redirect`, 2, true)).toMatchObject({
      status: 'ONLINE',
      httpStatus: 200,
      error: null,
    });
  });
  it('distinguishes server errors from transport failures', async () => {
    expect(await checkHttp(`${url}/fail`, 2, true)).toMatchObject({
      status: 'OFFLINE',
      httpStatus: 503,
    });
    expect(await checkHttp('http://127.0.0.1:1', 2, true)).toMatchObject({
      status: 'ERROR',
      httpStatus: null,
    });
  });
  it('enforces the overall deadline', async () => {
    expect(await checkHttp(`${url}/slow`, 0.1, true)).toMatchObject({
      status: 'TIMEOUT',
      httpStatus: null,
    });
  });
  it('blocks loopback, link-local, private and mapped IPv6 addresses', async () => {
    for (const ip of [
      '127.0.0.1',
      '10.0.0.1',
      '169.254.169.254',
      '192.168.1.1',
      '::1',
      '::ffff:127.0.0.1',
      'fc00::1',
    ])
      expect(isPublicAddress(ip)).toBe(false);
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
    expect(await checkHttp(`${url}/ok`, 1)).toMatchObject({
      status: 'ERROR',
      error: 'Destino privado ou protocolo bloqueado.',
    });
    expect(await checkHttp('file:///etc/passwd', 1)).toMatchObject({
      status: 'ERROR',
    });
  });
});
