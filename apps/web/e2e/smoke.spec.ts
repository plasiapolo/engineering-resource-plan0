import { test, expect } from "@playwright/test";

test("PM login shows the project manager dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("pm");
  await page.getByLabel("Password").fill("pm-Erp-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Project Manager", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Projects overview")).toBeVisible();
});

test("PM can navigate to Tasks and assign specialists", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("pm");
  await page.getByLabel("Password").fill("pm-Erp-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByRole("button", { name: "Tasks" }).click();
  await expect(page.getByText("Task code")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ New task" })).toBeVisible();
});

test("PM can edit an existing task", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("pm");
  await page.getByLabel("Password").fill("pm-Erp-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByRole("button", { name: "Tasks" }).click();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.getByText("Edit task")).toBeVisible();
  const hoursInput = page.getByLabel("Estimated hours");
  await expect(hoursInput).not.toHaveValue("");
  await hoursInput.fill("41");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Edit task")).toHaveCount(0);
  await expect(page.getByText("Hours planned")).toBeVisible();
  await expect(page.getByText("Hours available")).toBeVisible();
  await expect(page.getByRole("cell", { name: "41h" }).first()).toBeVisible();
});

test("generating the automatic plan shows the conflict banner", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("pm");
  await page.getByLabel("Password").fill("pm-Erp-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByRole("button", { name: "Create automatic task plan for employees" }).click();

  await expect(page.getByText("Plan updated")).toBeVisible();
  await expect(page.getByText(/planning conflict/)).toBeVisible();
});

test("specialist can log in and sees their own views only", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("a1");
  await page.getByLabel("Password").fill("a1-Erp-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Specialist A1").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "My Tasks" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Projects" })).toHaveCount(0);
});

test("specialist can open availability and edit own availability", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("a1");
  await page.getByLabel("Password").fill("a1-Erp-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByRole("button", { name: "Availability" }).click();
  await expect(page.getByText(/Click a day to set your availability/)).toBeVisible();
});