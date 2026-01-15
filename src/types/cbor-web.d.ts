declare module 'cbor-web' {
  export function decode(data: ArrayBuffer | Uint8Array): unknown
  export function decodeFirst(data: ArrayBuffer | Uint8Array): Promise<unknown>
  export function encode(data: unknown): ArrayBuffer
}
