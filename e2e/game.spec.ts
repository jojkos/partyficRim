import { test, expect, type Page } from "@playwright/test";
import {
  connectPhone,
  phoneJoinAndClaim,
  disconnectPhone,
  waitForEvent,
} from "./helpers.js";
async function createRoom(page: Page) {
  await page.goto("/display?new=1");
  const code = page.getByTestId("room-code");
  await expect(code).toHaveText(/^[A-Z]{4}$/);
  await expect(page.getByAltText("join QR")).toBeVisible();
  return (await code.innerText()).trim();
}
async function crew(code: string) {
  const phones = await Promise.all([
    connectPhone(),
    connectPhone(),
    connectPhone(),
  ]);
  for (const [i, role] of (["defense", "repair", "weapons"] as const).entries())
    await phoneJoinAndClaim(phones[i]!, code, role);
  return phones;
}
test("host lobby shows QR and truthful readiness", async ({ page }) => {
  const code = await createRoom(page);
  await expect(page.getByText("0/3 ready")).toBeVisible();
  const phone = await connectPhone();
  try {
    await phoneJoinAndClaim(phone, code, "defense");
    await expect(page.getByText("1/3 ready")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Launch game →" }),
    ).toBeDisabled();
  } finally {
    disconnectPhone(phone);
  }
});
test("three pilots can launch, and a disconnect pauses the arena", async ({
  page,
}) => {
  const code = await createRoom(page),
    phones = await crew(code);
  try {
    await page.getByRole("button", { name: "Launch game →" }).click();
    await expect(
      page.getByRole("heading", { name: "Let’s roll, crew." }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Cooperative robot arena" }),
    ).toBeVisible({ timeout: 7000 });
    await expect(page.getByTestId("survival-time")).not.toHaveText("00:00", {
      timeout: 7000,
    });
    disconnectPhone(phones[0]!);
    await expect(
      page.getByRole("heading", { name: "Waiting for the crew." }),
    ).toBeVisible();
  } finally {
    phones.forEach(disconnectPhone);
  }
});
test("host refresh retains the room and selected stations", async ({
  page,
}) => {
  const code = await createRoom(page),
    phone = await connectPhone();
  try {
    await phoneJoinAndClaim(phone, code, "repair");
    await expect(page.getByText("1/3 ready")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("room-code")).toHaveText(code);
    await expect(page.getByText("1/3 ready")).toBeVisible();
  } finally {
    disconnectPhone(phone);
  }
});
test("new room disconnects the old crew and replaces the join code", async ({
  page,
}) => {
  const code = await createRoom(page),
    phone = await connectPhone();
  try {
    await phoneJoinAndClaim(phone, code, "defense");
    const ended = waitForEvent(phone, "room:ended");
    await page.getByRole("button", { name: "New room", exact: true }).click();
    await ended;
    await expect(page.getByTestId("room-code")).not.toHaveText(code);
    await expect(page.getByText("0/3 ready")).toBeVisible();
  } finally {
    disconnectPhone(phone);
  }
});
test("mobile landing has complete usable Host and Join controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  for (const name of [/Host a game/, /Join the crew/]) {
    const button = page.getByRole("link", { name });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  }
});
test("phone lobby keeps all stations and launch on a 375 × 667 screen", async ({
  page,
}) => {
  const code = await createRoom(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`/play?room=${code}`);
  await expect(
    page.getByRole("button", { name: /Defense Steer/ }),
  ).toBeEnabled();
  for (const name of [/Defense Steer/, /Weapons Choose/, /Repair Steer/])
    await expect(page.getByRole("button", { name })).toBeVisible();
  const box = await page
    .getByRole("button", { name: "Launch game →" })
    .boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(667);
});
test("the same invalid join code can be retried", async ({ page }) => {
  await page.goto("/play");
  await page.getByLabel("Room code").fill("ZZZZ");
  await page.getByRole("button", { name: "Join the crew →" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Join the crew →" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});
