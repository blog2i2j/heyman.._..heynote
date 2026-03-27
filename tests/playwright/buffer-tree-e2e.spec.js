import { test, expect, _electron as electron } from "@playwright/test"
import os from "node:os"
import path from "node:path"
import fs from "node:fs/promises"
import { spawn } from "node:child_process"

async function ensureElectronBuild() {
    // Always rebuild so Electron e2e runs against current source, not stale dist output.
    await new Promise((resolve, reject) => {
        const child = spawn("npx", ["vite", "build"], {
            stdio: "inherit",
            env: {
                ...process.env,
            },
        })
        child.on("error", reject)
        child.on("exit", (code) => {
            if (code === 0) {
                resolve()
                return
            }
            reject(new Error(`vite build failed with exit code ${code}`))
        })
    })
}

async function dirExists(pathToCheck) {
    try {
        const stat = await fs.stat(pathToCheck)
        return stat.isDirectory()
    } catch (err) {
        if (err.code === "ENOENT") {
            return false
        }
        throw err
    }
}

async function removeDirWithRetry(dirPath, retries = 5) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            await fs.rm(dirPath, { recursive: true, force: true })
            return
        } catch (err) {
            if (err.code !== "ENOTEMPTY" || attempt === retries) {
                throw err
            }
            await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
        }
    }
}

test.describe("buffer tree folder e2e", { tag: "@e2e" }, () => {
    test.describe.configure({ mode: "serial" })
    test.skip(({ browserName }) => browserName !== "chromium", "Electron runs only once under chromium")

    let electronApp
    let page
    let tmpRoot
    let userDataDir

    test.beforeEach(async () => {
        test.setTimeout(60000)
        await ensureElectronBuild()
        tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "heynote-buffer-tree-e2e-"))
        userDataDir = path.join(tmpRoot, "user-data")
        await fs.mkdir(userDataDir)

        electronApp = await electron.launch({
            args: ["--no-sandbox", "tests/playwright/electron-runner.cjs"],
            env: {
                ...process.env,
                HEYNOTE_TEST_USER_DATA_DIR: userDataDir,
            },
        })

        page = await electronApp.firstWindow()
        await page.waitForLoadState("domcontentloaded")
        await expect(page.locator(".cm-editor")).toBeVisible()
    })

    test.afterEach(async () => {
        if (electronApp) {
            await electronApp.close()
        }
        if (await dirExists(tmpRoot)) {
            await removeDirWithRetry(tmpRoot)
        }
    })

    async function ensureLeftPanelVisible() {
        if ((await page.locator(".left-panel").count()) === 0) {
            await page.locator(".status .status-block.sidebar").click()
        }
        await expect(page.locator(".left-panel")).toBeVisible()
        await expect(page.locator(".buffer-tree")).toBeVisible()
        await expect(page.locator(".buffer-tree .item").first()).toBeVisible()
    }

    test("creates folder from inline buffer-tree input", async () => {
        await ensureLeftPanelVisible()

        await page.evaluate(() => {
            if (!window._heynote_buffer_tree) {
                throw new Error("BufferTree test handle not available")
            }
            window._heynote_buffer_tree.onCreateFolderRequested(null, "")
        })

        const input = page.locator(".buffer-tree input[placeholder='New folder name']")
        await expect(input).toBeVisible()
        await input.fill("alpha")
        await input.press("Enter")

        await expect.poll(async () => {
            return await page.evaluate(async () => {
                const dirs = await window.heynote.buffer.getDirectoryList()
                return dirs.includes("alpha")
            })
        }).toBe(true)

        await expect(page.locator(".buffer-tree .folder", { hasText: "alpha" })).toBeVisible()
    })

    test("deletes empty folder from buffer-tree flow", async () => {
        await ensureLeftPanelVisible()

        await page.evaluate(() => {
            if (!window._heynote_buffer_tree) {
                throw new Error("BufferTree test handle not available")
            }
            window._heynote_buffer_tree.onCreateFolderRequested(null, "")
        })
        const input = page.locator(".buffer-tree input[placeholder='New folder name']")
        await expect(input).toBeVisible()
        await input.fill("delete-me")
        await input.press("Enter")

        await expect.poll(async () => {
            return await page.evaluate(async () => {
                const dirs = await window.heynote.buffer.getDirectoryList()
                return dirs.includes("delete-me")
            })
        }).toBe(true)

        await electronApp.evaluate(({ BrowserWindow }) => {
            BrowserWindow.getAllWindows()[0].webContents.send("bufferTree:deleteDirectory", "delete-me")
        })

        await expect.poll(async () => {
            return await page.evaluate(async () => {
                const dirs = await window.heynote.buffer.getDirectoryList()
                return dirs.includes("delete-me")
            })
        }).toBe(false)
    })
})
