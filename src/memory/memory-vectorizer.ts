/**
 * TF-IDF Vectorizer with Feature Hashing (FNV1a)
 *
 * Generates fixed-dimension text embeddings using TF-IDF weighting
 * with feature hashing (hashing trick). Zero external dependencies.
 */

const DEFAULT_DIMENSIONS = 256;

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'it',
  'as',
  'be',
  'was',
  'were',
  'been',
  'are',
  'am',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'not',
  'no',
  'nor',
  'so',
  'if',
  'then',
  'than',
  'that',
  'this',
  'these',
  'those',
  'what',
  'which',
  'who',
  'whom',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'some',
  'any',
  'such',
  'only',
  'own',
  'same',
  'too',
  'very',
  'just',
  'about',
  'above',
  'after',
  'again',
  'also',
  'because',
  'before',
  'between',
  'during',
  'into',
  'out',
  'over',
  'under',
  'up',
  'down',
  'here',
  'there',
  'other',
  'its',
  'my',
  'your',
  'his',
  'her',
  'our',
  'their',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'me',
  'him',
  'us',
  'them',
]);

/**
 * FNV-1a hash function - fast, simple, good distribution
 */
export function fnv1a(str: string): number {
  let hash = 0x811c9dc5; // FNV offset basis (32-bit)
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) | 0; // FNV prime, force 32-bit
  }
  return hash >>> 0; // unsigned
}

/**
 * Tokenize text: lowercase, split on non-word chars, remove stop words
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Vectorize text using TF-IDF with feature hashing
 *
 * 1. Tokenize and compute term frequencies
 * 2. Hash each token to a bucket via FNV1a
 * 3. Apply TF weight (1 + log(tf)) to bucket
 * 4. L2-normalize the result
 */
export function vectorize(text: string, dimensions: number = DEFAULT_DIMENSIONS): Float32Array {
  const vector = new Float32Array(dimensions);
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return vector;
  }

  // Compute term frequencies
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  // Hash tokens to buckets with TF-IDF weight
  for (const [token, count] of tf) {
    const bucket = fnv1a(token) % dimensions;
    const weight = 1 + Math.log(count); // TF weight: 1 + log(tf)
    // Use sign hashing to reduce collision bias
    const sign = fnv1a(token + '_sign') % 2 === 0 ? 1 : -1;
    vector[bucket] += sign * weight;
  }

  // L2 normalize
  let magnitude = 0;
  for (let i = 0; i < dimensions; i++) {
    magnitude += vector[i] * vector[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

/**
 * Cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal)
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;

  return dot / denominator;
}
