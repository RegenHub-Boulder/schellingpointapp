// WebAuthn utilities for passkey registration and authentication

import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import * as CBOR from 'cbor-web'

// Extract P-256 public key coordinates from WebAuthn attestation
export async function extractPublicKey(attestationObject: ArrayBuffer): Promise<{ pubKeyX: string; pubKeyY: string }> {
  // The attestationObject is CBOR-encoded
  const decoded = await CBOR.decodeFirst(new Uint8Array(attestationObject))

  // Extract authData from the attestation object
  const authData = new Uint8Array(decoded.authData)

  // authData structure:
  // - rpIdHash: 32 bytes
  // - flags: 1 byte
  // - signCount: 4 bytes
  // - attestedCredentialData: variable length

  // Skip to attestedCredentialData (after 37 bytes)
  let offset = 37

  // Skip AAGUID (16 bytes)
  offset += 16

  // Read credential ID length (2 bytes, big-endian)
  const credIdLength = (authData[offset] << 8) | authData[offset + 1]
  offset += 2

  // Skip credential ID
  offset += credIdLength

  // Now we're at the credentialPublicKey (CBOR-encoded COSE key)
  const publicKeyBytes = authData.slice(offset)
  const publicKey = await CBOR.decodeFirst(publicKeyBytes)

  // COSE key format for P-256:
  // -1: kty (key type) = 2 (EC2)
  // -2: x coordinate (32 bytes)
  // -3: y coordinate (32 bytes)

  const x = new Uint8Array(publicKey.get(-2))
  const y = new Uint8Array(publicKey.get(-3))

  return {
    pubKeyX: arrayBufferToHex(x.buffer),
    pubKeyY: arrayBufferToHex(y.buffer)
  }
}

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return '0x' + Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16)
  }
  return bytes.buffer
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  // Pad if necessary
  const padded = base64 + '==='.slice((base64.length + 3) % 4)
  return base64ToArrayBuffer(padded)
}

export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const base64 = arrayBufferToBase64(buffer)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Format WebAuthn DER signature to raw (r, s) for contract
export function formatWebAuthnSignature(derSig: ArrayBuffer): string {
  // WebAuthn signatures are DER-encoded, need to convert to raw r||s format
  // DER format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]

  const sig = new Uint8Array(derSig)

  // Parse DER
  if (sig[0] !== 0x30) throw new Error('Invalid DER signature')

  let offset = 2
  if (sig[1] & 0x80) offset++ // handle long form length

  // Parse r
  if (sig[offset] !== 0x02) throw new Error('Invalid DER signature')
  const rLength = sig[offset + 1]
  let rStart = offset + 2
  let r = sig.slice(rStart, rStart + rLength)

  // Parse s
  offset = rStart + rLength
  if (sig[offset] !== 0x02) throw new Error('Invalid DER signature')
  const sLength = sig[offset + 1]
  let sStart = offset + 2
  let s = sig.slice(sStart, sStart + sLength)

  // Remove leading zeros and pad to 32 bytes
  if (r.length > 32) r = r.slice(r.length - 32)
  if (s.length > 32) s = s.slice(s.length - 32)

  const rPadded = new Uint8Array(32)
  const sPadded = new Uint8Array(32)
  rPadded.set(r, 32 - r.length)
  sPadded.set(s, 32 - s.length)

  // Concatenate r || s
  const rawSig = new Uint8Array(64)
  rawSig.set(rPadded, 0)
  rawSig.set(sPadded, 32)

  return arrayBufferToHex(rawSig.buffer)
}
