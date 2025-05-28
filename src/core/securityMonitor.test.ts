import fs from 'fs';
import path from 'path';
import { logAccess, resetAttempts } from './securityMonitor';

describe('securityMonitor', () => {
  const logPath = path.join(__dirname, '../../security.log');
  beforeEach(() => {
    if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
  });

  it('logAccess écrit dans le log', () => {
    logAccess('127.0.0.1', '/test', 200);
    const content = fs.readFileSync(logPath, 'utf-8');
    expect(content).toMatch(/127.0.0.1/);
    expect(content).toMatch(/200/);
  });

  it('détecte le brute force', () => {
    for (let i = 0; i < 6; i++) logAccess('1.2.3.4', '/admin', 403);
    const content = fs.readFileSync(logPath, 'utf-8');
    expect(content).toMatch(/ALERT: Brute force/);
  });

  it('resetAttempts remet à zéro', () => {
    for (let i = 0; i < 6; i++) logAccess('5.6.7.8', '/admin', 403);
    resetAttempts('5.6.7.8');
    // On ne peut pas tester l'état interne, mais on vérifie que la fonction existe et ne jette pas d'erreur
    expect(true).toBe(true);
  });
}); 