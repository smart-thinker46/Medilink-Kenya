import { Buffer } from 'buffer/';

if (
  typeof globalThis.Buffer === 'undefined' ||
  typeof globalThis.Buffer.alloc !== 'function'
) {
  // Ensure Node-compatible Buffer API for dependencies that rely on Buffer.alloc.
  // @ts-ignore
  globalThis.Buffer = Buffer;
}
