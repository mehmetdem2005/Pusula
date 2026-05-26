import { createDecipheriv } from 'node:crypto'

const ALGO = 'aes-256-gcm'

function getMasterKey(): Buffer {
  const hex = process.env.MASTER_ENCRYPTION_KEY
  if (!hex) throw new Error('MASTER_ENCRYPTION_KEY env eksik')
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== 32) throw new Error('MASTER_ENCRYPTION_KEY 32 byte olmalı')
  return buf
}

export function decryptApiKey(encrypted: Buffer, iv: Buffer, tag: Buffer): string {
  const key = getMasterKey()
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
