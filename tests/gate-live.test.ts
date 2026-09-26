import { describe, it, expect } from 'vitest';
import { systemOne } from '../src/core/typesafe/client';

/**
 * Live smoke test against the real TypeSafe API. Opt-in only: runs when both
 * TYPESAFE_API_KEY is set and RULEBOOK_LIVE_TESTS=1, so CI and ordinary test
 * runs never spend tokens or need network access.
 */
const live = Boolean(process.env.TYPESAFE_API_KEY) && process.env.RULEBOOK_LIVE_TESTS === '1';

describe.skipIf(!live)('TypeSafe System One (live)', () => {
    it('answers the ping question with a noul and reports usage', async () => {
        const res = await systemOne(
            {
                state: 'ping',
                model: 'jev-latest',
                questions: { ping: { type: 'noul', instructions: 'Is `state` the word ping?' } },
            },
            { apiKey: process.env.TYPESAFE_API_KEY!, deadlineMs: 8500 }
        );
        expect(res.answers.ping.type).toBe('noul');
        expect(res.answers.ping).toHaveProperty('noul');
        expect(res.usage.input_tokens).toBeGreaterThan(0);
    }, 15000);
});
