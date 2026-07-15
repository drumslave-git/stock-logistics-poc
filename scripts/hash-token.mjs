// Produce the SHA-256 hash of an access token, for the ACCESS_TOKEN_HASH secret
// / VITE_ACCESS_TOKEN_HASH env var used by the client-side access gate.
//
//   npm run hash-token -- "your-shared-token"
//
// The output matches what the browser computes via Web Crypto at runtime.
import { createHash } from 'node:crypto';

const token = process.argv[2] ?? process.env.TOKEN;
if (!token) {
  console.error('Usage: npm run hash-token -- "<token>"');
  process.exit(1);
}

process.stdout.write(createHash('sha256').update(token, 'utf8').digest('hex') + '\n');
