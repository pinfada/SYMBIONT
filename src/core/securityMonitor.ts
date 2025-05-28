import fs from 'fs';
import path from 'path';

const LOG_PATH = path.join(__dirname, '../../security.log');
const attempts: Record<string, number> = {};

export function logAccess(ip: string, route: string, status: number) {
  const line = `${new Date().toISOString()} | ${ip} | ${route} | ${status}\n`;
  fs.appendFileSync(LOG_PATH, line);
  if (status === 403) {
    attempts[ip] = (attempts[ip] || 0) + 1;
    if (attempts[ip] > 5) {
      // Alerte brute force
      fs.appendFileSync(LOG_PATH, `ALERT: Brute force suspectée depuis ${ip}\n`);
    }
  }
}

export function resetAttempts(ip: string) {
  attempts[ip] = 0;
} 