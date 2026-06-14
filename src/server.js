import express from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateHtml } from "./generator.js";
import { captureFrames, encodeVideo } from "./htmlToVideo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const app = express();
app.use(express.json({ limit: "30mb" }));

// Serve editor static files
app.use("/editor", express.static(path.join(__dirname, "editor")));

// Default config endpoint
app.get("/api/config", async (req, res) => {
  try {
    const configPath = path.join(ROOT, "config.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    res.json(config);
  } catch {
    res.json({ error: "config.json not found" });
  }
});

// Preview: generate HTML and return it inline
app.post("/api/preview", async (req, res) => {
  try {
    const config = req.body;
    const html = await buildHtmlString(config);
    res.json({ ok: true, html });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate video
app.post("/api/generate", async (req, res) => {
  try {
    const config = req.body;
    const tempHtml = path.join(ROOT, "output", `_edit_${Date.now()}.html`);
    const outputName = `video_${Date.now()}.mp4`;
    const outputPath = path.join(ROOT, "output", outputName);

    await generateHtml(config, tempHtml);

    const width = config.width || 1920;
    const height = config.height || 1080;
    const duration = config.duration || 4;
    const fps = config.fps || 30;
    const framesDir = path.join(ROOT, "output", `_frames_${Date.now()}`);

    // Decode BGM data (base64) to a temp file if provided
    let audioPath = null;
    if (config.bgmData) {
      const base64Data = config.bgmData.replace(/^data:audio\/[a-z0-9.+-]+;base64,/, "");
      const ext = (config.bgmData.match(/^data:audio\/([a-z0-9]+)/) || [])[1] || "mp3";
      audioPath = path.join(ROOT, "output", `_bgm_${Date.now()}.${ext}`);
      await fs.writeFile(audioPath, Buffer.from(base64Data, "base64"));
    }

    await captureFrames({
      input: tempHtml,
      framesDir,
      duration,
      fps,
      width,
      height,
    });
    await encodeVideo({
      framesDir,
      output: outputPath,
      fps,
      width,
      height,
      audioPath,
      audioVolume: config.bgmVolume ?? 0.6,
      audioLoop: config.bgmLoop ?? false,
    });

    // Cleanup temp files
    await fs.unlink(tempHtml).catch(() => {});
    if (audioPath) await fs.unlink(audioPath).catch(() => {});
    const files = await fs.readdir(framesDir).catch(() => []);
    await Promise.all(
      files.map((f) => fs.unlink(path.join(framesDir, f)).catch(() => {})),
    );
    await fs.rmdir(framesDir).catch(() => {});

    res.json({ ok: true, file: outputName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download generated video
app.get("/api/download/:file", (req, res) => {
  const filePath = path.join(ROOT, "output", req.params.file);
  if (path.extname(filePath) !== ".mp4") {
    return res.status(400).send("Invalid file");
  }
  res.download(filePath);
});

// Redirect root to editor
app.get("/", (req, res) => res.redirect("/editor/"));

async function buildHtmlString(config) {
  const tempPath = path.join(ROOT, "output", `_preview_${Date.now()}.html`);
  await generateHtml(config, tempPath);
  const html = await fs.readFile(tempPath, "utf-8");
  await fs.unlink(tempPath).catch(() => {});
  return html;
}

const PORT = 3456;
const server = app.listen(PORT, () => {
  console.log(`\n  ┌────────────────────────────────────────┐`);
  console.log(`  │  HTML to Video Editor                  │`);
  console.log(`  │  http://localhost:${PORT}                 │`);
  console.log(`  │  按 Ctrl+C 停止服务                     │`);
  console.log(`  └────────────────────────────────────────┘\n`);
});

function shutdown() {
  console.log("\n  正在关闭服务器...");
  server.close(() => {
    console.log("  已停止.\n");
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
