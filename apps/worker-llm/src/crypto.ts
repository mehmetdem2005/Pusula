import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getMasterKey(): Buffer {
  const hex = process.env.MASTER_ENCRYPTION_KEY
  if (!hex) throw new Error('MASTER_ENCRYPTION_KEY env değişkeni eksik')
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== 32) throw new Error('MASTER_ENCRYPTION_KEY 32 byte (64 hex karakter) olmalı')
  return buf
}

export interface EncryptedPayload {
  encrypted: Buffer
  iv: Buffer
  tag: Buffer
  last4: string
}

export function encryptApiKey(plaintext: string): EncryptedPayload {
  const key = getMasterKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    encrypted,
    iv,
    tag,
    last4: plaintext.slice(-4),
  }
}

export function decryptApiKey(encrypted: Buffer, iv: Buffer, tag: Buffer): string {
  const key = getMasterKey()
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

// Master key üretmek için yardımcı:
// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
