#!/usr/bin/env node

import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { htmlToVideo } from "./htmlToVideo.js";
import { generateHtml } from "./generator.js";

const { values } = parseArgs({
  options: {
    input: { type: "string", short: "i" },
    config: { type: "string", short: "c" },
    output: { type: "string", short: "o" },
    duration: { type: "string", short: "d" },
    fps: { type: "string", short: "f" },
    title: { type: "string", short: "t" },
    audio: { type: "string", short: "a" },
    "audio-volume": { type: "string", default: "0.6" },
    "audio-loop": { type: "boolean", default: false },
    "frame-format": { type: "string", default: "jpeg" },
    "jpeg-quality": { type: "string", default: "88" },
    "video-preset": { type: "string", default: "veryfast" },
    "video-crf": { type: "string", default: "23" },
    "keep-frames": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

function showHelp() {
  console.log(`
html-to-video - Render HTML to MP4 at 1080p

Usage (two modes):

  1. Config mode (recommended):
     node src/index.js --config config.json

  2. Direct HTML mode:
     node src/index.js --input templates/sanlian.html [options]

Options:
  -c, --config      JSON config file (drives the full template)
  -i, --input       Direct HTML file to render
  -o, --output      Output MP4 path (overrides config)
  -d, --duration    Video duration in seconds (overrides config)
  -f, --fps         Frames per second (overrides config)
  -t, --title       Override title text
  -a, --audio       Audio file path to mix as BGM
      --audio-volume  BGM volume 0-1 (default 0.6)
      --audio-loop    Loop BGM if shorter than video
      --frame-format  Intermediate frame format: jpeg|png (default jpeg)
      --jpeg-quality  JPEG frame quality 0-100 (default 88)
      --video-preset  libx264 preset (default veryfast; use medium for slower/high quality)
      --video-crf     libx264 CRF (default 23; lower means larger/better)
      --keep-frames Keep intermediate frames
  -h, --help        Show this help

Config mode lets you customize: title, avatar, background colors,
action labels/colors, animation timings, duration, fps, resolution.
See config.json for the full schema.

Examples:
  node src/index.js --config config.json
  node src/index.js --config config.json --title "我的频道" --output out.mp4
  node src/index.js --input templates/sanlian.html --duration 5
`);
}

if (values.help) {
  showHelp();
  process.exit(0);
}

async function runConfigMode() {
  const configPath = path.resolve(values.config);
  if (!existsSync(configPath)) {
    console.error(`Error: Config file not found: ${configPath}`);
    process.exit(1);
  }

  const config = JSON.parse(await fs.readFile(configPath, "utf-8"));

  // CLI overrides
  if (values.output) config.output = values.output;
  if (values.duration) config.duration = parseFloat(values.duration);
  if (values.fps) config.fps = parseFloat(values.fps);
  if (values.title) config.title.text = values.title;

  const tempHtml = path.join(
    path.dirname(path.resolve(config.output)),
    `_generated_${Date.now()}.html`,
  );

  console.log("[gen] Building HTML from config ...");
  const htmlPath = await generateHtml(config, tempHtml);

  console.log(`[run] Rendering ${config.duration}s @ ${config.fps}fps ...`);
  await htmlToVideo({
    input: htmlPath,
    output: path.resolve(config.output),
    duration: config.duration,
    fps: config.fps,
    width: config.width,
    height: config.height,
    keepFrames: values["keep-frames"],
    audioPath: values.audio ? path.resolve(values.audio) : undefined,
    audioVolume: parseFloat(values["audio-volume"]),
    audioLoop: values["audio-loop"],
    frameFormat: values["frame-format"],
    jpegQuality: parseInt(values["jpeg-quality"], 10),
    videoPreset: values["video-preset"],
    videoCrf: values["video-crf"],
  });

  await fs.unlink(htmlPath).catch(() => {});
}

async function runInputMode() {
  const absInput = path.resolve(values.input);
  if (!existsSync(absInput)) {
    console.error(`Error: Input file not found: ${absInput}`);
    process.exit(1);
  }

  await htmlToVideo({
    input: absInput,
    output: path.resolve(values.output || "output/video.mp4"),
    duration: parseFloat(values.duration || "5"),
    fps: parseFloat(values.fps || "30"),
    keepFrames: values["keep-frames"],
    audioPath: values.audio ? path.resolve(values.audio) : undefined,
    audioVolume: parseFloat(values["audio-volume"]),
    audioLoop: values["audio-loop"],
    frameFormat: values["frame-format"],
    jpegQuality: parseInt(values["jpeg-quality"], 10),
    videoPreset: values["video-preset"],
    videoCrf: values["video-crf"],
  });
}

if (values.config) {
  runConfigMode().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
} else if (values.input) {
  runInputMode().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
} else {
  console.error("Error: provide --config or --input. Use --help for usage.");
  process.exit(1);
}
