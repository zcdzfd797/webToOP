import puppeteer from "puppeteer";
import ffmpegPath from "ffmpeg-static";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const DEFAULT_FRAME_FORMAT = "jpeg";
export const DEFAULT_JPEG_QUALITY = 88;
export const DEFAULT_VIDEO_PRESET = "veryfast";
export const DEFAULT_VIDEO_CRF = 23;

function normalizeFrameFormat(frameFormat = DEFAULT_FRAME_FORMAT) {
  const format = String(frameFormat).toLowerCase();
  if (format === "jpg") return "jpeg";
  if (format === "jpeg" || format === "png") return format;
  throw new Error(`Unsupported frame format: ${frameFormat}`);
}

function getFrameExtension(frameFormat) {
  return normalizeFrameFormat(frameFormat) === "jpeg" ? "jpg" : "png";
}

function getFrameCodec(frameFormat) {
  return normalizeFrameFormat(frameFormat) === "jpeg" ? "mjpeg" : "png";
}

function getScreenshotOptions({ frameFormat, jpegQuality, width, height, outputPath }) {
  const format = normalizeFrameFormat(frameFormat);
  const options = {
    type: format,
    clip: { x: 0, y: 0, width, height },
  };

  if (outputPath) options.path = outputPath;
  if (format === "jpeg") options.quality = jpegQuality;

  return options;
}

function buildVideoArgs({
  input,
  width,
  height,
  output,
  duration,
  audioPath,
  audioVolume = 0.6,
  audioLoop = false,
  videoPreset = DEFAULT_VIDEO_PRESET,
  videoCrf = DEFAULT_VIDEO_CRF,
}) {
  const args = ["-y", ...input];

  if (audioPath) {
    if (audioLoop) args.push("-stream_loop", "-1");
    args.push("-i", audioPath);
  }

  args.push(
    "-s", `${width}x${height}`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", String(videoPreset),
    "-crf", String(videoCrf),
  );

  if (audioPath) {
    args.push(
      "-c:a", "aac",
      "-b:a", "192k",
      "-af", `volume=${audioVolume}`,
    );

    if (!duration) args.push("-shortest");
  }

  if (duration) args.push("-t", String(duration));

  args.push("-movflags", "+faststart", output);
  return args;
}

async function preparePage({ input, width, height }) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--window-size=${width},${height}`,
      "--force-device-scale-factor=1",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--run-all-compositor-stages-before-draw",
      "--no-sandbox",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(input).href, {
      waitUntil: "networkidle0",
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.evaluate(() => {
      document.getAnimations().forEach((animation) => animation.pause());
    });

    return { browser, page };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

async function seekAnimations(page, frameTimeMs) {
  await page.evaluate((time) => {
    document.getAnimations().forEach((animation) => {
      animation.currentTime = time;
    });

    document.documentElement.getBoundingClientRect();
  }, frameTimeMs);
}

function writeProgress(current, total) {
  process.stdout.write(
    `\r  frames: ${current}/${total} (${((current / total) * 100).toFixed(1)}%)`,
  );
}

function logFfmpegTail(stderr) {
  if (!stderr) return;
  const lines = stderr.trim().split("\n");
  const tail = lines.slice(-3).join("\n");
  if (tail) console.log(`  ffmpeg: ${tail}`);
}

function createFfmpegProcess(args) {
  const child = spawn(ffmpegPath, args, {
    stdio: ["pipe", "ignore", "pipe"],
  });
  const stderr = [];

  child.stderr.on("data", (chunk) => {
    stderr.push(chunk);
  });

  const done = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      const stderrText = Buffer.concat(stderr).toString("utf-8");
      if (code === 0) {
        resolve(stderrText);
        return;
      }

      const tail = stderrText.trim().split("\n").slice(-8).join("\n");
      reject(new Error(`ffmpeg exited with code ${code}${tail ? `\n${tail}` : ""}`));
    });
  });

  return { child, done };
}

async function writeFrame(stdin, frame) {
  if (!stdin.write(frame)) {
    await once(stdin, "drain");
  }
}

/**
 * Capture frames from an HTML file using a headless browser.
 *
 * @param {object} opts
 * @param {string} opts.input      Absolute path to the HTML file.
 * @param {string} opts.framesDir  Directory to save individual frames.
 * @param {number} opts.duration   Total video duration in seconds.
 * @param {number} opts.fps        Frames per second.
 * @param {number} [opts.duration] Video duration in seconds.
 * @param {number} [opts.width]    Video width.
 * @param {number} [opts.height]   Video height.
 * @param {"jpeg"|"png"} [opts.frameFormat] Screenshot format.
 * @param {number} [opts.jpegQuality] JPEG quality 0-100.
 * @returns {Promise<number>} Number of frames captured.
 */
export async function captureFrames({
  input,
  framesDir,
  duration,
  fps,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
  frameFormat = DEFAULT_FRAME_FORMAT,
  jpegQuality = DEFAULT_JPEG_QUALITY,
}) {
  const totalFrames = Math.round(duration * fps);
  const normalizedFrameFormat = normalizeFrameFormat(frameFormat);
  const frameExt = getFrameExtension(normalizedFrameFormat);

  await fs.mkdir(framesDir, { recursive: true });
  const existing = await fs.readdir(framesDir);
  await Promise.all(
    existing
      .filter((fileName) => /\.(png|jpe?g)$/i.test(fileName))
      .map((fileName) => fs.unlink(path.join(framesDir, fileName))),
  );

  const { browser, page } = await preparePage({ input, width, height });

  try {
    for (let i = 0; i < totalFrames; i++) {
      await seekAnimations(page, (i / fps) * 1000);

      const padded = String(i).padStart(6, "0");
      await page.screenshot(getScreenshotOptions({
        frameFormat: normalizedFrameFormat,
        jpegQuality,
        width,
        height,
        outputPath: path.join(framesDir, `frame_${padded}.${frameExt}`),
      }));

      if ((i + 1) % Math.max(1, Math.floor(fps)) === 0 || i === totalFrames - 1) {
        writeProgress(i + 1, totalFrames);
      }
    }
    process.stdout.write("\n");
  } finally {
    await browser.close();
  }

  return totalFrames;
}

/**
 * Encode captured frames into an MP4 video via ffmpeg.
 *
 * @param {object} opts
 * @param {string} opts.framesDir  Directory containing frame_XXXXXX images.
 * @param {string} opts.output     Output MP4 file path.
 * @param {number} opts.fps        Frames per second.
 * @param {number} [opts.width]    Video width.
 * @param {number} [opts.height]   Video height.
 * @param {string} [opts.audioPath] Optional audio file to mix in.
 * @param {number} [opts.audioVolume] Audio volume 0-1.
 * @param {boolean} [opts.audioLoop] Loop audio if shorter than video.
 * @param {"jpeg"|"png"} [opts.frameFormat] Captured frame format.
 * @param {string} [opts.videoPreset] libx264 preset.
 * @param {number|string} [opts.videoCrf] libx264 CRF.
 */
export async function encodeVideo({
  framesDir,
  output,
  fps,
  duration,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
  audioPath,
  audioVolume = 0.6,
  audioLoop = false,
  frameFormat = DEFAULT_FRAME_FORMAT,
  videoPreset = DEFAULT_VIDEO_PRESET,
  videoCrf = DEFAULT_VIDEO_CRF,
}) {
  const outDir = path.dirname(output);
  const frameExt = getFrameExtension(frameFormat);
  await fs.mkdir(outDir, { recursive: true });

  const args = buildVideoArgs({
    input: [
      "-framerate",
      String(fps),
      "-i",
      path.join(framesDir, `frame_%06d.${frameExt}`),
    ],
    width,
    height,
    output,
    duration,
    audioPath,
    audioVolume,
    audioLoop,
    videoPreset,
    videoCrf,
  });

  const { stderr } = await execFileAsync(ffmpegPath, args, {
    maxBuffer: 10 * 1024 * 1024,
  });

  logFfmpegTail(stderr);
}

/**
 * Capture frames and stream them directly into ffmpeg.
 * This avoids writing hundreds of intermediate image files to disk.
 *
 * @param {object} opts
 * @param {string} opts.input     Path to the HTML file.
 * @param {string} opts.output    Path for the output MP4.
 * @param {number} opts.duration  Duration in seconds.
 * @param {number} [opts.fps]     Frames per second.
 * @param {number} [opts.width]   Video width.
 * @param {number} [opts.height]  Video height.
 * @returns {Promise<number>} Number of frames captured.
 */
export async function captureAndEncodeVideo({
  input,
  output,
  duration,
  fps = 30,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
  audioPath,
  audioVolume = 0.6,
  audioLoop = false,
  frameFormat = DEFAULT_FRAME_FORMAT,
  jpegQuality = DEFAULT_JPEG_QUALITY,
  videoPreset = DEFAULT_VIDEO_PRESET,
  videoCrf = DEFAULT_VIDEO_CRF,
  onProgress,
}) {
  const totalFrames = Math.round(duration * fps);
  const normalizedFrameFormat = normalizeFrameFormat(frameFormat);
  const outDir = path.dirname(output);
  await fs.mkdir(outDir, { recursive: true });

  const args = buildVideoArgs({
    input: [
      "-f",
      "image2pipe",
      "-framerate",
      String(fps),
      "-vcodec",
      getFrameCodec(normalizedFrameFormat),
      "-i",
      "pipe:0",
    ],
    width,
    height,
    output,
    duration,
    audioPath,
    audioVolume,
    audioLoop,
    videoPreset,
    videoCrf,
  });

  const { child, done } = createFfmpegProcess(args);
  const { browser, page } = await preparePage({ input, width, height });
  let ffmpegError;
  done.catch((err) => {
    ffmpegError = err;
  });

  try {
    onProgress?.({
      stage: "rendering",
      currentFrame: 0,
      totalFrames,
      percent: 0,
    });

    for (let i = 0; i < totalFrames; i++) {
      if (ffmpegError) throw ffmpegError;

      await seekAnimations(page, (i / fps) * 1000);
      const frame = await page.screenshot(getScreenshotOptions({
        frameFormat: normalizedFrameFormat,
        jpegQuality,
        width,
        height,
      }));
      await writeFrame(child.stdin, frame);

      if ((i + 1) % Math.max(1, Math.floor(fps)) === 0 || i === totalFrames - 1) {
        writeProgress(i + 1, totalFrames);
      }

      onProgress?.({
        stage: "rendering",
        currentFrame: i + 1,
        totalFrames,
        percent: Math.min(98, Math.round(((i + 1) / totalFrames) * 98)),
      });
    }
    process.stdout.write("\n");
    onProgress?.({
      stage: "finalizing",
      currentFrame: totalFrames,
      totalFrames,
      percent: 99,
    });
  } finally {
    child.stdin.end();
    await browser.close();
  }

  const stderr = await done;
  logFfmpegTail(stderr);
  onProgress?.({
    stage: "done",
    currentFrame: totalFrames,
    totalFrames,
    percent: 100,
  });
  return totalFrames;
}

/**
 * Full pipeline: HTML -> MP4.
 *
 * @param {object} opts
 * @param {string} opts.input     Path to the HTML file.
 * @param {string} opts.output    Path for the output MP4.
 * @param {number} opts.duration  Duration in seconds.
 * @param {number} [opts.fps]     Frames per second.
 * @param {boolean} [opts.keepFrames] Keep intermediate frames after encoding.
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
  frameFormat = DEFAULT_FRAME_FORMAT,
  jpegQuality = DEFAULT_JPEG_QUALITY,
  videoPreset = DEFAULT_VIDEO_PRESET,
  videoCrf = DEFAULT_VIDEO_CRF,
  onProgress,
}) {
  const absInput = path.resolve(input);
  const absOutput = path.resolve(output);
  const framesDir = path.join(
    path.dirname(absOutput),
    `${path.basename(absOutput, ".mp4")}_frames`,
  );

  if (!keepFrames) {
    console.log(`[1/2] Rendering and encoding ${absInput} -> ${absOutput}${audioPath ? " (+ audio)" : ""} ...`);
    await captureAndEncodeVideo({
      input: absInput,
      output: absOutput,
      duration,
      fps,
      width,
      height,
      audioPath,
      audioVolume,
      audioLoop,
      frameFormat,
      jpegQuality,
      videoPreset,
      videoCrf,
      onProgress,
    });
    console.log("[2/2] No frame cleanup needed.");
    console.log(`Done! Video saved to ${absOutput}`);
    return absOutput;
  }

  console.log(`[1/3] Rendering frames from ${absInput} ...`);
  const frameCount = await captureFrames({
    input: absInput,
    framesDir,
    duration,
    fps,
    width,
    height,
    frameFormat,
    jpegQuality,
  });

  console.log(`[2/3] Encoding ${frameCount} frames -> ${absOutput}${audioPath ? " (+ audio)" : ""} ...`);
  await encodeVideo({
    framesDir,
    output: absOutput,
    fps,
    duration,
    width,
    height,
    audioPath,
    audioVolume,
    audioLoop,
    frameFormat,
    videoPreset,
    videoCrf,
  });

  console.log(`[3/3] Frames kept in ${framesDir}`);
  console.log(`Done! Video saved to ${absOutput}`);
  return absOutput;
}
