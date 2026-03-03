type BufferInput = string | Uint8Array | ArrayBuffer;
type Encoding = 'utf8' | 'utf-8' | 'base64';

const toUtf8 = (value: string): Uint8Array => new TextEncoder().encode(value);
const fromUtf8 = (value: Uint8Array): string => new TextDecoder().decode(value);

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function normalizeBase64(value: string): string {
  const cleaned = value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const remainder = cleaned.length % 4;
  if (remainder === 0) return cleaned;
  return cleaned + '='.repeat(4 - remainder);
}

function decodeBase64(value: string): Uint8Array {
  const base64 = normalizeBase64(value);

  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }

  const map: Record<string, number> = {};
  for (let i = 0; i < BASE64_ALPHABET.length; i += 1) map[BASE64_ALPHABET[i]] = i;
  const bytes: number[] = [];

  for (let i = 0; i < base64.length; i += 4) {
    const c1 = base64[i];
    const c2 = base64[i + 1];
    const c3 = base64[i + 2];
    const c4 = base64[i + 3];

    const n1 = map[c1];
    const n2 = map[c2];
    const n3 = c3 === '=' ? 0 : map[c3];
    const n4 = c4 === '=' ? 0 : map[c4];

    const triple = (n1 << 18) | (n2 << 12) | (n3 << 6) | n4;
    bytes.push((triple >> 16) & 0xff);
    if (c3 !== '=') bytes.push((triple >> 8) & 0xff);
    if (c4 !== '=') bytes.push(triple & 0xff);
  }

  return Uint8Array.from(bytes);
}

function encodeBase64(value: Uint8Array): string {
  if (typeof globalThis.btoa === 'function') {
    let binary = '';
    for (let i = 0; i < value.length; i += 1) binary += String.fromCharCode(value[i]);
    return globalThis.btoa(binary);
  }

  let out = '';
  let i = 0;
  while (i < value.length) {
    const byte1 = value[i++];
    const hasByte2 = i < value.length;
    const byte2 = hasByte2 ? value[i++] : 0;
    const hasByte3 = i < value.length;
    const byte3 = hasByte3 ? value[i++] : 0;

    const triple = (byte1 << 16) | (byte2 << 8) | byte3;
    out += BASE64_ALPHABET[(triple >> 18) & 0x3f];
    out += BASE64_ALPHABET[(triple >> 12) & 0x3f];
    out += hasByte2 ? BASE64_ALPHABET[(triple >> 6) & 0x3f] : '=';
    out += hasByte3 ? BASE64_ALPHABET[triple & 0x3f] : '=';
  }
  return out;
}

class PolyfillBuffer {
  private readonly data: Uint8Array;

  private constructor(data: Uint8Array) {
    this.data = data;
  }

  static from(input: BufferInput, encoding: Encoding = 'utf8'): PolyfillBuffer {
    if (typeof input === 'string') {
      if (encoding === 'base64') return new PolyfillBuffer(decodeBase64(input));
      return new PolyfillBuffer(toUtf8(input));
    }
    if (input instanceof Uint8Array) return new PolyfillBuffer(input);
    if (input instanceof ArrayBuffer) return new PolyfillBuffer(new Uint8Array(input));
    throw new Error('Unsupported Buffer input');
  }

  static isBuffer(value: unknown): value is PolyfillBuffer {
    return value instanceof PolyfillBuffer;
  }

  toString(encoding: Encoding = 'utf8'): string {
    if (encoding === 'base64') return encodeBase64(this.data);
    return fromUtf8(this.data);
  }
}

export const Buffer = PolyfillBuffer;
export default { Buffer };
