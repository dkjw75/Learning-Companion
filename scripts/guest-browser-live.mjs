import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

process.loadEnvFile(resolve('.env'));
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Browser Supabase settings are required.');
}
const { createApp } = await import('../server/dist/http-app.js');
const api = createApp().listen(3001, '127.0.0.1');
const vite = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--port', '5174', '--strictPort'], {
  cwd: resolve('client'), env: { ...process.env, PORT: '3001' }, windowsHide: true, stdio: 'ignore',
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:5174/api/health');
      if (response.ok) { ready = true; break; }
    } catch { /* Vite is still starting. */ }
    await new Promise(done => setTimeout(done, 250));
  }
  assert.ok(ready, 'The isolated Vite/API pair did not start.');
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5174/');
  await page.getByRole('button', { name: 'Start as guest' }).click();
  try {
    await page.getByRole('heading', { name: 'What sparks your curiosity?' }).waitFor({ timeout: 15000 });
  } catch (error) {
    const alerts = await page.getByRole('alert').allTextContents();
    const visibleText = (await page.locator('body').innerText()).slice(0, 800);
    throw new Error(`Guest UI did not become ready. Alerts: ${alerts.join(' | ') || 'none'}. Page: ${visibleText}`, { cause: error });
  }
  const first = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(name => /^sb-.*-auth-token$/.test(name));
    if (!key) return null;
    const saved = JSON.parse(localStorage.getItem(key));
    return saved.user?.id ?? null;
  });
  assert.ok(first, 'Supabase did not persist the guest identity in browser storage.');
  await page.reload();
  await page.getByRole('heading', { name: 'What sparks your curiosity?' }).waitFor({ timeout: 15000 });
  if (process.env.ONBOARDING_PREVIEW_PATH) {
    await page.screenshot({ path: process.env.ONBOARDING_PREVIEW_PATH, fullPage: true });
  }
  await page.getByRole('button', { name: /Cloud computing/ }).click();
  await page.getByRole('button', { name: /Cybersecurity/ }).click();
  assert.equal(await page.getByRole('button', { name: /Cloud computing/ }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Where are you starting from?' }).waitFor();
  await page.getByRole('radio', { name: /Some experience/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Which tech topic would you explore first?' }).waitFor();
  await page.getByRole('button', { name: 'Skip check' }).click();
  await page.getByRole('heading', { name: /Welcome back/ }).waitFor({ timeout: 15000 });
  await page.reload();
  await page.getByRole('heading', { name: /Welcome back/ }).waitFor({ timeout: 15000 });
  const restored = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(name => /^sb-.*-auth-token$/.test(name));
    return key ? JSON.parse(localStorage.getItem(key)).user?.id ?? null : null;
  });
  assert.equal(restored, first);
  const profileResponse = await page.evaluate(async () => {
    const key = Object.keys(localStorage).find(name => /^sb-.*-auth-token$/.test(name));
    const token = key ? JSON.parse(localStorage.getItem(key)).access_token : null;
    const response = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
    return response.json();
  });
  assert.deepEqual(profileResponse.data.interests, ['cloud', 'cybersecurity']);
  assert.equal(profileResponse.data.experienceLevel, 'some');
  assert.equal(profileResponse.data.onboardingComplete, true);
  console.log('Live browser passed: broad tech interests and experience save to Supabase, skip onboarding, and survive refresh for the same guest.');
} finally {
  await browser?.close();
  vite.kill();
  await new Promise(done => api.close(done));
}
