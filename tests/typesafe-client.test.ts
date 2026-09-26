import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
    systemOne,
    resolveTypesafeKey,
    redact,
    TypesafeError,
    TYPESAFE_URL,
    type SystemOneRequest,
} from '../src/core/typesafe/client';

const FAKE_KEY = 'ts_secret123';

const REQ: SystemOneRequest = {
    state: { message: 'hello' },
    model: 'jev-latest',
    questions: {
        dept: { type: 'choice', instructions: 'Which?', criteria: { a: 'A', b: 'B' } },
        human: { type: 'noul', instructions: 'Human?' },
    },
};

const OK_BODY = {
    model: 'jev-1.13.0',
    answers: {
        dept: { type: 'choice', choice: 'a', confidence: 0.9, probabilities: { a: 0.95, b: 0.05 } },
        human: { type: 'noul', noul: 0.1 },
    },
    usage: { input_tokens: 120, output_tokens: 12 },
};

function jsonResponse(status: number, body: unknown): Response {
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
}

async function caught(p: Promise<unknown>): Promise<TypesafeError> {
    try {
        await p;
    } catch (e) {
        expect(e).toBeInstanceOf(TypesafeError);
        return e as TypesafeError;
    }
    throw new Error('expected a TypesafeError');
}

describe('systemOne client', () => {
    it('posts the request with a Bearer header and returns the parsed response', async () => {
        const fetchMock = vi.fn(async () => jsonResponse(200, OK_BODY));
        const res = await systemOne(REQ, { apiKey: FAKE_KEY, fetch: fetchMock as never });

        expect(res.model).toBe('jev-1.13.0');
        expect(res.usage).toEqual({ input_tokens: 120, output_tokens: 12 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe(TYPESAFE_URL);
        expect(init.method).toBe('POST');
        expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${FAKE_KEY}`);
        expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
        expect(JSON.parse(init.body as string)).toEqual(REQ);
    });

    it('works through vi.stubGlobal fetch as well', async () => {
        const fetchMock = vi.fn(async () => jsonResponse(200, OK_BODY));
        vi.stubGlobal('fetch', fetchMock);
        try {
            const res = await systemOne(REQ, { apiKey: FAKE_KEY });
            expect(res.answers.dept).toMatchObject({ choice: 'a' });
            expect(fetchMock).toHaveBeenCalledTimes(1);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('401 → http error at once, no retry, key never in the message', async () => {
        const fetchMock = vi.fn(async () =>
            jsonResponse(401, { error: { message: `invalid key ${FAKE_KEY}` } })
        );
        const sleep = vi.fn(async () => {});
        const err = await caught(
            systemOne(REQ, { apiKey: FAKE_KEY, fetch: fetchMock as never, sleep })
        );
        expect(err.kind).toBe('http');
        expect(err.status).toBe(401);
        expect(err.message).not.toContain(FAKE_KEY);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(sleep).not.toHaveBeenCalled();
    });

    it('never leaks a key that does not look like ts_…', async () => {
        const odd = 'plainkeyvalue42';
        const fetchMock = vi.fn(async () => jsonResponse(400, `bad request for ${odd}`));
        const err = await caught(systemOne(REQ, { apiKey: odd, fetch: fetchMock as never }));
        expect(err.message).not.toContain(odd);
    });

    it('429 then 200 → one retry with exponential backoff + jitter', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse(429, { error: { message: 'slow down' } }))
            .mockResolvedValueOnce(jsonResponse(200, OK_BODY));
        const sleep = vi.fn(async () => {});
        const res = await systemOne(REQ, {
            apiKey: FAKE_KEY,
            fetch: fetchMock as never,
            sleep,
            random: () => 0.5,
        });
        expect(res.model).toBe('jev-1.13.0');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(sleep).toHaveBeenCalledTimes(1);
        expect(sleep).toHaveBeenCalledWith(400 + 100);
    });

    it('529 three times → http error after 2 retries', async () => {
        const fetchMock = vi.fn(async () => jsonResponse(529, 'overloaded'));
        const sleep = vi.fn(async () => {});
        const err = await caught(
            systemOne(REQ, { apiKey: FAKE_KEY, fetch: fetchMock as never, sleep, random: () => 0 })
        );
        expect(err.kind).toBe('http');
        expect(err.status).toBe(529);
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([400, 800]);
    });

    it('network TypeError is retried, then reported as network', async () => {
        const fetchMock = vi.fn(async () => {
            throw new TypeError('fetch failed');
        });
        const err = await caught(
            systemOne(REQ, {
                apiKey: FAKE_KEY,
                fetch: fetchMock as never,
                sleep: async () => {},
            })
        );
        expect(err.kind).toBe('network');
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('does not retry when the deadline leaves under a second', async () => {
        const fetchMock = vi.fn(async () => jsonResponse(429, 'busy'));
        const err = await caught(
            systemOne(REQ, {
                apiKey: FAKE_KEY,
                fetch: fetchMock as never,
                deadlineMs: 900,
                sleep: async () => {},
            })
        );
        expect(err.kind).toBe('http');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('aborts a hung request → timeout', async () => {
        const fetchMock = vi.fn(
            (_url: string, init: RequestInit) =>
                new Promise<Response>((_resolve, reject) => {
                    init.signal?.addEventListener('abort', () =>
                        reject(new DOMException('aborted', 'AbortError'))
                    );
                })
        );
        const err = await caught(
            systemOne(REQ, { apiKey: FAKE_KEY, fetch: fetchMock as never, timeoutMs: 30 })
        );
        expect(err.kind).toBe('timeout');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('non-JSON body → bad-response', async () => {
        const fetchMock = vi.fn(async () => jsonResponse(200, '<html>oops</html>'));
        const err = await caught(systemOne(REQ, { apiKey: FAKE_KEY, fetch: fetchMock as never }));
        expect(err.kind).toBe('bad-response');
    });

    it('missing answers or a type mismatch → bad-response', async () => {
        const noAnswers = vi.fn(async () => jsonResponse(200, { model: 'x' }));
        expect(
            (await caught(systemOne(REQ, { apiKey: FAKE_KEY, fetch: noAnswers as never }))).kind
        ).toBe('bad-response');

        const mismatch = vi.fn(async () =>
            jsonResponse(200, {
                ...OK_BODY,
                answers: { ...OK_BODY.answers, human: { type: 'choice', choice: 'a' } },
            })
        );
        expect(
            (await caught(systemOne(REQ, { apiKey: FAKE_KEY, fetch: mismatch as never }))).kind
        ).toBe('bad-response');
    });

    it('a choice that is not a string → bad-response', async () => {
        const numeric = vi.fn(async () =>
            jsonResponse(200, {
                ...OK_BODY,
                answers: {
                    ...OK_BODY.answers,
                    dept: { type: 'choice', choice: 1, confidence: 0.9 },
                },
            })
        );
        expect(
            (await caught(systemOne(REQ, { apiKey: FAKE_KEY, fetch: numeric as never }))).kind
        ).toBe('bad-response');
    });

    it('a string choice outside the criteria is not a bad response (the gate treats it as undecided)', async () => {
        const unknown = vi.fn(async () =>
            jsonResponse(200, {
                ...OK_BODY,
                answers: {
                    ...OK_BODY.answers,
                    dept: { type: 'choice', choice: 'zzz', confidence: 0.9 },
                },
            })
        );
        const res = await systemOne(REQ, { apiKey: FAKE_KEY, fetch: unknown as never });
        expect(res.answers.dept).toMatchObject({ choice: 'zzz' });
    });

    it('empty key → no-key without calling fetch', async () => {
        const fetchMock = vi.fn();
        const err = await caught(systemOne(REQ, { apiKey: '  ', fetch: fetchMock as never }));
        expect(err.kind).toBe('no-key');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('redact() masks ts_ keys and Bearer credentials', () => {
        expect(redact(`key ${FAKE_KEY} and Bearer abc.def`)).toBe('key *** and Bearer ***');
    });
});

describe('resolveTypesafeKey', () => {
    let root: string;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-tskey-'));
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    it('prefers the environment', async () => {
        await fs.writeFile(path.join(root, '.env'), 'TYPESAFE_API_KEY=ts_fromfile\n');
        const r = await resolveTypesafeKey(root, { TYPESAFE_API_KEY: ' ts_fromenv ' });
        expect(r).toEqual({ key: 'ts_fromenv', source: 'env' });
    });

    it('reads only its own key from .env, strips quotes and export, leaves env untouched', async () => {
        await fs.writeFile(
            path.join(root, '.env'),
            [
                'OTHER_SECRET=do-not-read',
                '# comment',
                'export TYPESAFE_API_KEY="ts_quoted_value"',
                'ANOTHER=1',
            ].join('\n')
        );
        const env: NodeJS.ProcessEnv = {};
        const r = await resolveTypesafeKey(root, env);
        expect(r).toEqual({ key: 'ts_quoted_value', source: '.env' });
        expect(env).toEqual({});
        expect(process.env.OTHER_SECRET).toBeUndefined();
    });

    it('handles single quotes and CRLF', async () => {
        await fs.writeFile(path.join(root, '.env'), "A=1\r\nTYPESAFE_API_KEY='ts_single'\r\n");
        expect(await resolveTypesafeKey(root, {})).toEqual({ key: 'ts_single', source: '.env' });
    });

    it('drops a trailing inline comment from an unquoted value', async () => {
        await fs.writeFile(
            path.join(root, '.env'),
            'TYPESAFE_API_KEY=ts_fake_inline   # personal key\n'
        );
        expect(await resolveTypesafeKey(root, {})).toEqual({
            key: 'ts_fake_inline',
            source: '.env',
        });
        // No whitespace before `#` → part of the value; quoted values are kept whole.
        await fs.writeFile(path.join(root, '.env'), 'TYPESAFE_API_KEY=ts_fake#1\n');
        expect((await resolveTypesafeKey(root, {})).key).toBe('ts_fake#1');
        await fs.writeFile(path.join(root, '.env'), 'TYPESAFE_API_KEY="ts_fake # kept"\n');
        expect((await resolveTypesafeKey(root, {})).key).toBe('ts_fake # kept');
    });

    it('returns null when there is no key anywhere', async () => {
        expect(await resolveTypesafeKey(root, {})).toEqual({ key: null, source: null });
        await fs.writeFile(path.join(root, '.env'), 'TYPESAFE_API_KEY=""\nOTHER=x\n');
        expect(await resolveTypesafeKey(root, {})).toEqual({ key: null, source: null });
    });
});
