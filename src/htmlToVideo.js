import puppeteer from "puppeteer";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

/**
 * Capture frames from an HTML file using a headless browser.
 *
 * @param {object} opts
 * @param {string} opts.input      - Absolute path to the HTML file.
 * @param {string} opts.framesDir  - Directory to save individual frame PNGs.
 * @param {number} opts.duration   - Total video duration in seconds.
 * @param {number} opts.fps        - Frames per second.
 * @param {number} [opts.width]    - Video width  (default 1920).
 * @param {number} [opts.height]   - Video height (default 1080).
 * @returns {Promise<number>}      - Number of frames captured.
 */
export async function captureFrames({
  input,
  framesDir,
  duration,
  fps,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
}) {
  const totalFrames = Math.round(duration * fps);
  const frameInterval = 1000 / fps;

  await fs.mkdir(framesDir, { recursive: true });
  // Clear any previous frames so old ones don't leak into the new video.
  const existing = await fs.readdir(framesDir);
  await Promise.all(
    existing
      .filter((f) => f.endsWith(".png"))
      .map((f) => fs.unlink(path.join(framesDir, f))),
  );

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--window-size=${width},${height}`,
      "--force-device-scale-factor=1",
      "--disable-gpu",
      "--no-sandbox",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(`file:///${input.replace(/\\/g, "/")}`, {
      waitUntil: "networkidle0",
    });

    // Wait for all CSS animations to register, then pause them.
    // We control animation time manually per-frame to ensure
    // the video timeline matches exactly (no real-time drift).
    await new Promise((r) => setTimeout(r, 200));
    await page.evaluate(() => {
      document.getAnimations().forEach((a) => a.pause());
    });

    for (let i = 0; i < totalFrames; i++) {
      const frameTimeMs = (i / fps) * 1000;

      // Seek every animation to the exact frame timestamp.
      await page.evaluate((t) => {
        document.getAnimations().forEach((a) => {
          a.currentTime = t;
        });
      }, frameTimeMs);

      // Brief pause for the browser to paint the seeked state.
      await new Promise((r) => setTimeout(r, 30));

      const padded = String(i).padStart(6, "0");
      await page.screenshot({
        path: path.join(framesDir, `frame_${padded}.png`),
        type: "png",
        clip: { x: 0, y: 0, width, height },
      });

      if ((i + 1) % Math.max(1, Math.floor(fps)) === 0 || i === totalFrames - 1) {
        process.stdout.write(
          `\r  frames: ${i + 1}/${totalFrames} (${(((i + 1) / totalFrames) * 100).toFixed(1)}%)`,
        );
      }
    }
    process.stdout.write("\n");
  } finally {
    await browser.close();
  }

  return totalFrames;
}

/**
 * Encode captured PNG frames into an MP4 video via ffmpeg.
 *
 * @param {object} opts
 * @param {string} opts.framesDir  - Directory containing frame_XXXXXX.png files.
 * @param {string} opts.output     - Output MP4 file path.
 * @param {number} opts.fps        - Frames per second.
 * @param {number} [opts.width]    - Video width  (default 1920).
 * @param {number} [opts.height]   - Video height (default 1080).
 * @param {string} [opts.audioPath]  - Optional path to an audio file to mix in.
 * @param {number} [opts.audioVolume] - Audio volume 0–1 (default 0.6).
 * @param {boolean} [opts.audioLoop]  - Loop audio if shorter than video.
 */
export async function encodeVideo({
  framesDir,
  output,
  fps,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
  audioPath,
  audioVolume = 0.6,
  audioLoop = false,
}) {
  const outDir = path.dirname(output);
  await fs.mkdir(outDir, { recursive: true });

  const args = [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(framesDir, "frame_%06d.png"),
  ];

  if (audioPath) {
    if (audioLoop) args.push("-stream_loop", "-1");
    args.push("-i", audioPath);
  }

  args.push(
    "-s", `${width}x${height}`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "medium",
    "-crf", "18",
  );

  if (audioPath) {
    args.push(
      "-c:a", "aac",
      "-b:a", "192k",
      "-af", `volume=${audioVolume}`,
      "-shortest",
    );
  }

  args.push("-movflags", "+faststart", output);

  const { stderr } = await execFileAsync(ffmpegPath, args, {
    maxBuffer: 10 * 1024 * 1024,
  });

  if (stderr) {
    // ffmpeg writes progress info to stderr; surface a short tail.
    const lines = stderr.trim().split("\n");
    const tail = lines.slice(-3).join("\n");
    console.log(`  ffmpeg: ${tail}`);
  }
}

/**
 * Full pipeline: HTML -> frames -> MP4.
 *
 * @param {object} opts
 * @param {string} opts.input     - Path to the HTML file.
 * @param {string} opts.output    - Path for the output MP4.
 * @param {number} opts.duration  - Duration in seconds.
 * @param {number} [opts.fps]     - Frames per second (default 30).
 * @param {boolean} [opts.keepFrames] - Keep frame PNGs after encoding.
 */
export async function htmlToVideo({
  input,
  output,
  duration,
  fps = 30,
  keepFrames = false,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
  audioPath,
  audioVolume = 0.6,
  audioLoop = false,
}) {
  const absInput = path.resolve(input);
  const absOutput = path.resolve(output);
  const framesDir = path.join(
    path.dirname(absOutput),
    `${path.basename(absOutput, ".mp4")}_frames`,
  );

  console.log(`[1/3] Rendering frames from ${absInput} ...`);
  const frameCount = await captureFrames({
    input: absInput,
    framesDir,
    duration,
    fps,
    width,
    height,
  });

  console.log(`[2/3] Encoding ${frameCount} frames -> ${absOutput}${audioPath ? " (+ audio)" : ""} ...`);
  await encodeVideo({ framesDir, output: absOutput, fps, width, height, audioPath, audioVolume, audioLoop });

  if (!keepFrames) {
    console.log(`[3/3] Cleaning up frames ...`);
    const files = await fs.readdir(framesDir);
    await Promise.all(files.map((f) => fs.unlink(path.join(framesDir, f))));
    await fs.rmdir(framesDir);
  } else {
    console.log(`[3/3] Frames kept in ${framesDir}`);
  }

  console.log(`Done! Video saved to ${absOutput}`);
  return absOutput;
}
