import { test, expect } from '@playwright/test';
import {
  connectPhone,
  phoneJoinAndClaim,
  disconnectPhone,
  waitForEvent,
} from './helpers.js';

/** Helper: open /display?new=1, wait for room code, return it. */
async function createDisplayRoom(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/display?new=1');
  const heading = page.locator('h1');
  await expect(heading).toBeVisible({ timeout: 5000 });
  // Wait for QR code too — that guarantees the room is fully created on the server
  await expect(page.locator('img[alt="join QR"]')).toBeVisible({ timeout: 5000 });
  const code = await heading.textContent();
  expect(code).toMatch(/^[A-Z]{4}$/);
  return code!;
}

test.describe('Display Lobby', () => {
  test('shows room code and QR code after opening /display', async ({ page }) => {
    const code = await createDisplayRoom(page);
    expect(code).toMatch(/^[A-Z]{4}$/);
  });

  test('shows player count and role claim status', async ({ page }) => {
    const roomCode = await createDisplayRoom(page);

    // Initial state: 0/3 players, all roles unclaimed
    await expect(page.getByText('Players (0/3)')).toBeVisible();
    await expect(page.getByText('Defense —')).toBeVisible();
    await expect(page.getByText('Repair —')).toBeVisible();
    await expect(page.getByText('Weapons —')).toBeVisible();

    // Connect a phone and claim defense
    const phone1 = await connectPhone();
    try {
      await phoneJoinAndClaim(phone1, roomCode, 'defense');

      // Player count and defense should update
      await expect(page.getByText('Players (1/3)')).toBeVisible({ timeout: 3000 });
      await expect(page.getByText('Defense ✓')).toBeVisible({ timeout: 3000 });
    } finally {
      disconnectPhone(phone1);
    }
  });

  test('START button enables when 3 roles claimed', async ({ page }) => {
    const roomCode = await createDisplayRoom(page);

    const startBtn = page.getByRole('button', { name: 'START' });
    await expect(startBtn).toBeDisabled();

    const phones = await Promise.all([connectPhone(), connectPhone(), connectPhone()]);
    try {
      await phoneJoinAndClaim(phones[0]!, roomCode, 'defense');
      await phoneJoinAndClaim(phones[1]!, roomCode, 'repair');
      await phoneJoinAndClaim(phones[2]!, roomCode, 'weapons');

      await expect(startBtn).toBeEnabled({ timeout: 3000 });
    } finally {
      phones.forEach(disconnectPhone);
    }
  });
});

test.describe('Game Start Flow', () => {
  test('clicking START transitions through countdown to playing', async ({ page }) => {
    const roomCode = await createDisplayRoom(page);

    const phones = await Promise.all([connectPhone(), connectPhone(), connectPhone()]);
    try {
      await phoneJoinAndClaim(phones[0]!, roomCode, 'defense');
      await phoneJoinAndClaim(phones[1]!, roomCode, 'repair');
      await phoneJoinAndClaim(phones[2]!, roomCode, 'weapons');

      const startBtn = page.getByRole('button', { name: 'START' });
      await expect(startBtn).toBeEnabled({ timeout: 3000 });
      await startBtn.click();

      // Countdown number should appear (3, 2, or 1)
      const countdown = page.locator('div').filter({ hasText: /^[123]$/ }).first();
      await expect(countdown).toBeVisible({ timeout: 3000 });

      // After ~3s, the game canvas should appear (PixiArena renders a canvas)
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible({ timeout: 6000 });
    } finally {
      phones.forEach(disconnectPhone);
    }
  });
});

test.describe('New Game Button', () => {
  test('lobby "× new game" creates a new room code', async ({ page }) => {
    const oldCode = await createDisplayRoom(page);

    const newGameBtn = page.getByRole('button', { name: '× new game' });
    await newGameBtn.click();

    // A new room code should appear (different from old)
    const heading = page.locator('h1');
    await expect(heading).not.toHaveText(oldCode, { timeout: 5000 });
    const newCode = await heading.textContent();
    expect(newCode).toMatch(/^[A-Z]{4}$/);
    expect(newCode).not.toBe(oldCode);
  });

  test('"× new game" kicks phones with room:ended', async ({ page }) => {
    const roomCode = await createDisplayRoom(page);

    const phones = await Promise.all([connectPhone(), connectPhone()]);
    try {
      await phoneJoinAndClaim(phones[0]!, roomCode, 'defense');
      await phoneJoinAndClaim(phones[1]!, roomCode, 'repair');

      // Listen for room:ended on phones BEFORE clicking the button
      const ended1 = waitForEvent(phones[0]!, 'room:ended');
      const ended2 = waitForEvent(phones[1]!, 'room:ended');

      const newGameBtn = page.getByRole('button', { name: '× new game' });
      await newGameBtn.click();

      // Phones should receive room:ended
      await Promise.all([ended1, ended2]);
    } finally {
      phones.forEach(disconnectPhone);
    }
  });

  test('"× end game" during playing returns to lobby with new room', async ({ page }) => {
    const roomCode = await createDisplayRoom(page);

    const phones = await Promise.all([connectPhone(), connectPhone(), connectPhone()]);
    try {
      await phoneJoinAndClaim(phones[0]!, roomCode, 'defense');
      await phoneJoinAndClaim(phones[1]!, roomCode, 'repair');
      await phoneJoinAndClaim(phones[2]!, roomCode, 'weapons');

      // Start the game
      const startBtn = page.getByRole('button', { name: 'START' });
      await expect(startBtn).toBeEnabled({ timeout: 3000 });
      await startBtn.click();

      // Wait for game canvas
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible({ timeout: 6000 });

      // Click end game button (in HudOverlay during playing)
      const endGameBtn = page.getByRole('button', { name: '× end game' });
      await endGameBtn.click();

      // Should return to lobby with a new room code
      const heading = page.locator('h1');
      await expect(heading).toBeVisible({ timeout: 5000 });
      const newCode = await heading.textContent();
      expect(newCode).toMatch(/^[A-Z]{4}$/);
      expect(newCode).not.toBe(roomCode);
    } finally {
      phones.forEach(disconnectPhone);
    }
  });
});

test.describe('Phone Join Page', () => {
  test('phone can join via /play?room=CODE and see lobby', async ({ page, browser }) => {
    const roomCode = await createDisplayRoom(page);

    // Open a phone page in a new browser context
    const phoneContext = await browser.newContext();
    const phonePage = await phoneContext.newPage();
    try {
      await phonePage.goto(`/play?room=${roomCode}`);

      // Phone should show the lobby with "Pick your station" text
      await expect(phonePage.getByText('Pick your station')).toBeVisible({ timeout: 5000 });

      // Role buttons should be visible
      await expect(phonePage.getByRole('button', { name: 'DEFENSE OFFICER' })).toBeVisible({ timeout: 3000 });
      await expect(phonePage.getByRole('button', { name: 'REPAIR ENGINEER' })).toBeVisible();
      await expect(phonePage.getByRole('button', { name: 'WEAPONS ENGINEER' })).toBeVisible();

      // Display should reflect the phone joining (count may include stale sockets from prior tests)
      await expect(page.getByText(/Players \([1-3]\/3\)/)).toBeVisible({ timeout: 5000 });
    } finally {
      await phoneContext.close();
    }
  });

  test('phone shows error for invalid room code', async ({ page }) => {
    await page.goto('/play?room=ZZZZ');

    // Should show an error message
    await expect(page.getByText("Couldn't join ZZZZ")).toBeVisible({ timeout: 5000 });
  });
});
