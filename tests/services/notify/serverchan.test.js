import { afterEach, describe, expect, it, vi } from 'vitest';
import { serverChanChannel } from '../../../src/services/notify/serverchan.js';

afterEach(() => vi.restoreAllMocks());

describe('Server酱 endpoint compatibility', () => {
  it.each([
    ['sctp123tTestKey', 'https://123.push.ft07.com/send/sctp123tTestKey.send'],
    ['SCTTestKey', 'https://sctapi.ftqq.com/SCTTestKey.send'],
    [' sctp123tTestKey ', 'https://123.push.ft07.com/send/sctp123tTestKey.send']
  ])('routes %s and preserves notification content', async (key, endpoint) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 0 }))
    );
    const result = await serverChanChannel.send(
      { title: '会员到期提醒', content: '还有 3 天到期' },
      { SERVERCHAN_SENDKEY: key }
    );
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(endpoint);
    expect(init?.method).toBe('POST');
    const body = new URLSearchParams(String(init?.body));
    expect(body.get('title')).toBe('会员到期提醒');
    expect(body.get('desp')).toContain('还有 3 天到期');
  });

  it.each(['sctpBadKey', 'sctp123t', '   ', 'SCT/key', 'SCT?key'])('rejects malformed key without sending: %s', async (key) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const result = await serverChanChannel.test({ SERVERCHAN_SENDKEY: key });
    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [200, { code: 1, message: 'rejected' }],
    [500, { code: 0 }]
  ])('reports API or HTTP failure', async (status, body) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), { status })
    );
    const result = await serverChanChannel.test({ SERVERCHAN_SENDKEY: 'sctp123tTestKey' });
    expect(result.success).toBe(false);
  });

  it('reports network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));
    const result = await serverChanChannel.test({ SERVERCHAN_SENDKEY: 'sctp123tTestKey' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('network unavailable');
  });
});
