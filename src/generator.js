import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== Built-in SVG icon library (B站官方图标) =====
const ICONS = {
  like: { viewBox: "0 0 36 36", path: `<path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M9.77234 30.8573V11.7471H7.54573C5.50932 11.7471 3.85742 13.3931 3.85742 15.425V27.1794C3.85742 29.2112 5.50932 30.8573 7.54573 30.8573H9.77234ZM11.9902 30.8573V11.7054C14.9897 10.627 16.6942 7.8853 17.1055 3.33591C17.2666 1.55463 18.9633 0.814421 20.5803 1.59505C22.1847 2.36964 23.243 4.32583 23.243 6.93947C23.243 8.50265 23.0478 10.1054 22.6582 11.7471H29.7324C31.7739 11.7471 33.4289 13.402 33.4289 15.4435C33.4289 15.7416 33.3928 16.0386 33.3215 16.328L30.9883 25.7957C30.2558 28.7683 27.5894 30.8573 24.528 30.8573H11.9911H11.9902Z"/>` },
  coin: { viewBox: "0 0 28 28", path: `<path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M14.045 25.5454C7.69377 25.5454 2.54504 20.3967 2.54504 14.0454C2.54504 7.69413 7.69377 2.54541 14.045 2.54541C20.3963 2.54541 25.545 7.69413 25.545 14.0454C25.545 17.0954 24.3334 20.0205 22.1768 22.1771C20.0201 24.3338 17.095 25.5454 14.045 25.5454ZM9.66202 6.81624H18.2761C18.825 6.81624 19.27 7.22183 19.27 7.72216C19.27 8.22248 18.825 8.62807 18.2761 8.62807H14.95V10.2903C17.989 10.4444 20.3766 12.9487 20.3855 15.9916V17.1995C20.3854 17.6997 19.9799 18.1052 19.4796 18.1052C18.9793 18.1052 18.5738 17.6997 18.5737 17.1995V15.9916C18.5667 13.9478 16.9882 12.2535 14.95 12.1022V20.5574C14.95 21.0577 14.5444 21.4633 14.0441 21.4633C13.5437 21.4633 13.1382 21.0577 13.1382 20.5574V12.1022C11.1 12.2535 9.52148 13.9478 9.51448 15.9916V17.1995C9.5144 17.6997 9.10883 18.1052 8.60856 18.1052C8.1083 18.1052 7.70273 17.6997 7.70265 17.1995V15.9916C7.71158 12.9487 10.0992 10.4444 13.1382 10.2903V8.62807H9.66202C9.11309 8.62807 8.66809 8.22248 8.66809 7.72216C8.66809 7.22183 9.11309 6.81624 9.66202 6.81624Z"/>` },
  star: { viewBox: "0 0 28 28", path: `<path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M19.8071 9.26152C18.7438 9.09915 17.7624 8.36846 17.3534 7.39421L15.4723 3.4972C14.8998 2.1982 13.1004 2.1982 12.4461 3.4972L10.6468 7.39421C10.1561 8.36846 9.25639 9.09915 8.19315 9.26152L3.94016 9.91102C2.63155 10.0734 2.05904 11.6972 3.04049 12.6714L6.23023 15.9189C6.96632 16.6496 7.29348 17.705 7.1299 18.7605L6.39381 23.307C6.14844 24.6872 7.62063 25.6614 8.84745 25.0119L12.4461 23.0634C13.4276 22.4951 14.6544 22.4951 15.6359 23.0634L19.2345 25.0119C20.4614 25.6614 21.8518 24.6872 21.6882 23.307L20.8703 18.7605C20.7051 17.705 21.0339 16.6496 21.77 15.9189L24.9597 12.6714C25.9412 11.6972 25.3687 10.0734 24.06 9.91102L19.8071 9.26152Z"/>` },
  share: { viewBox: "0 0 28 28", path: `<path fill="currentColor" d="M12.6058 10.3326V5.44359C12.6058 4.64632 13.2718 4 14.0934 4C14.4423 4 14.78 4.11895 15.0476 4.33606L25.3847 12.7221C26.112 13.3121 26.2087 14.3626 25.6007 15.0684C25.5352 15.1443 25.463 15.2144 25.3847 15.2779L15.0476 23.6639C14.4173 24.1753 13.4791 24.094 12.9521 23.4823C12.7283 23.2226 12.6058 22.8949 12.6058 22.5564V18.053C7.59502 18.053 5.37116 19.9116 2.57197 23.5251C2.47607 23.6489 2.00031 23.7769 2.00031 23.2122C2.00031 16.2165 3.90102 10.3326 12.6058 10.3326Z"/>` },
  heart: { viewBox: "0 0 24 24", path: `<path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>` },
  fire: { viewBox: "0 0 24 24", path: `<path fill="currentColor" d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>` },
  bolt: { viewBox: "0 0 24 24", path: `<path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z"/>` },
  check: { viewBox: "0 0 24 24", path: `<path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>` },
};

// ===== Built-in bird avatar SVG =====
const BIRD_SVG = `<svg class="avatar-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="115" rx="60" ry="68" fill="#FFD93D"/><ellipse cx="100" cy="135" rx="40" ry="42" fill="#FFE74C"/><ellipse cx="58" cy="120" rx="22" ry="35" fill="#FFC107" transform="rotate(-15 58 120)"/><ellipse cx="142" cy="120" rx="22" ry="35" fill="#FFC107" transform="rotate(15 142 120)"/><path d="M 85 50 Q 80 32 90 38 Q 100 28 95 42 Q 105 30 108 44" fill="#FFC107" stroke="#E0A800" stroke-width="1.5" stroke-linejoin="round"/><circle cx="80" cy="88" r="16" fill="#fff"/><circle cx="120" cy="88" r="16" fill="#fff"/><circle cx="83" cy="90" r="9" fill="#222"/><circle cx="123" cy="90" r="9" fill="#222"/><circle cx="86" cy="86" r="3.5" fill="#fff"/><circle cx="126" cy="86" r="3.5" fill="#fff"/><ellipse cx="65" cy="110" rx="12" ry="8" fill="#FF8A80" opacity="0.6"/><ellipse cx="135" cy="110" rx="12" ry="8" fill="#FF8A80" opacity="0.6"/><path d="M 88 108 L 112 108 L 100 125 Z" fill="#5C6BC0"/><rect x="85" y="170" width="8" height="18" rx="3" fill="#FF8F00"/><rect x="107" y="170" width="8" height="18" rx="3" fill="#FF8F00"/></svg>`;

function getAvatarContent(avatar) {
  if (avatar.imageUrl) {
    return `<img src="${avatar.imageUrl}" style="width:80%;height:80%;border-radius:50%;object-fit:cover;" alt="avatar"/>`;
  }
  return BIRD_SVG;
}

function buildActionItems(actions) {
  return actions
    .map((a, i) => {
      const icon = ICONS[a.icon] || ICONS.like;
      return `<div class="action action-${i}"><div class="icon-circle"><svg viewBox="${icon.viewBox}" xmlns="http://www.w3.org/2000/svg">${icon.path}</svg></div><div class="action-label">${a.label}</div></div>`;
    })
    .join("\n");
}

function buildActionStyles(actions, timings) {
  const rgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  return actions.map((a, i) => {
    const appearDelay = timings.iconAppearStart + i * timings.iconAppearStep;
    const activeDelay = a.delay || appearDelay + 0.8;
    const c = a.activeColor || "#ff4081";
    return `.action-${i}{animation:iconAppear .5s cubic-bezier(.34,1.56,.64,1) ${appearDelay}s forwards}.action-${i} .icon-circle{animation:lightUp-${i} .4s cubic-bezier(.34,1.56,.64,1) ${activeDelay}s forwards}.action-${i} .icon-circle svg{animation:iconColor-${i} .4s ease ${activeDelay}s forwards}.action-${i} .action-label{animation:labelActive .4s ease ${activeDelay}s forwards}@keyframes lightUp-${i}{to{background:${rgba(c,0.15)};border-color:${c};box-shadow:0 0 40px ${rgba(c,0.6)};transform:scale(1.15)}}@keyframes iconColor-${i}{to{color:${c};transform:scale(1.1)}}`;
  }).join("\n");
}

// ========================================================
//  BACKGROUND EFFECTS
// ========================================================

function buildBgEffectHTML(effect, config) {
  const W = config.width, H = config.height;
  switch (effect) {
    case "particles": {
      let s = '<div class="bg-effect particles">';
      for (let i = 0; i < 45; i++) {
        const x = (Math.random() * 100).toFixed(1);
        const y = (Math.random() * 100).toFixed(1);
        const sz = (2 + Math.random() * 5).toFixed(0);
        const d = (Math.random() * 8).toFixed(1);
        const dur = (5 + Math.random() * 7).toFixed(1);
        s += `<span style="left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;animation-delay:${d}s;animation-duration:${dur}s"></span>`;
      }
      return s + "</div>";
    }
    case "bokeh": {
      let s = '<div class="bg-effect bokeh">';
      for (let i = 0; i < 14; i++) {
        const x = (Math.random() * 100).toFixed(1);
        const y = (Math.random() * 100).toFixed(1);
        const sz = (80 + Math.random() * 160).toFixed(0);
        const d = (Math.random() * 8).toFixed(1);
        const dur = (7 + Math.random() * 8).toFixed(1);
        s += `<span style="left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;animation-delay:${d}s;animation-duration:${dur}s"></span>`;
      }
      return s + "</div>";
    }
    case "stars": {
      let s = '<div class="bg-effect stars">';
      for (let i = 0; i < 80; i++) {
        const x = (Math.random() * 100).toFixed(1);
        const y = (Math.random() * 100).toFixed(1);
        const sz = (1 + Math.random() * 3).toFixed(0);
        const d = (Math.random() * 4).toFixed(1);
        const dur = (1.5 + Math.random() * 3).toFixed(1);
        s += `<span style="left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;animation-delay:${d}s;animation-duration:${dur}s"></span>`;
      }
      return s + "</div>";
    }
    case "bubbles": {
      let s = '<div class="bg-effect bubbles">';
      for (let i = 0; i < 25; i++) {
        const x = (Math.random() * 100).toFixed(1);
        const sz = (20 + Math.random() * 70).toFixed(0);
        const d = (Math.random() * 10).toFixed(1);
        const dur = (6 + Math.random() * 10).toFixed(1);
        s += `<span style="left:${x}%;width:${sz}px;height:${sz}px;animation-delay:${d}s;animation-duration:${dur}s"></span>`;
      }
      return s + "</div>";
    }
    case "aurora":
      return '<div class="bg-effect aurora"><div class="aurora-band a1"></div><div class="aurora-band a2"></div><div class="aurora-band a3"></div></div>';
    case "rays":
      return '<div class="bg-effect rays"></div>';
    case "snow": {
      let s = '<div class="bg-effect snow">';
      for (let i = 0; i < 60; i++) {
        const x = (Math.random() * 100).toFixed(1);
        const sz = (3 + Math.random() * 8).toFixed(0);
        const d = (Math.random() * 8).toFixed(1);
        const dur = (5 + Math.random() * 8).toFixed(1);
        const op = (0.3 + Math.random() * 0.5).toFixed(1);
        s += `<span style="left:${x}%;width:${sz}px;height:${sz}px;animation-delay:${d}s;animation-duration:${dur}s;opacity:${op}"></span>`;
      }
      return s + "</div>";
    }
    case "grid-pulse":
      return '<div class="bg-effect grid-pulse"></div>';
    default:
      return "";
  }
}

function buildBgEffectCSS(effect, scene) {
  const c = scene.glowColor || "rgba(160,90,255,0.35)";
  const gridC = scene.gridColor || "rgba(255,255,255,0.04)";
  switch (effect) {
    case "particles":
      return `.particles{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1}.particles span{position:absolute;border-radius:50%;background:rgba(255,255,255,.5);animation:particleFloat linear infinite}@keyframes particleFloat{0%{transform:translateY(20px) scale(1);opacity:0}15%{opacity:.8}85%{opacity:.6}100%{transform:translateY(-300px) scale(.3);opacity:0}}`;
    case "bokeh":
      return `.bokeh{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1}.bokeh span{position:absolute;border-radius:50%;background:radial-gradient(circle,${c} 0%,transparent 65%);filter:blur(6px);animation:bokehDrift ease-in-out infinite}@keyframes bokehDrift{0%,100%{transform:translate(0,0) scale(.8);opacity:.15}50%{transform:translate(40px,-50px) scale(1.3);opacity:.4}}`;
    case "stars":
      return `.stars{position:absolute;inset:0;pointer-events:none;z-index:1}.stars span{position:absolute;border-radius:50%;background:#fff;box-shadow:0 0 4px rgba(255,255,255,.8);animation:twinkle ease-in-out infinite}@keyframes twinkle{0%,100%{opacity:.1;transform:scale(.6)}50%{opacity:1;transform:scale(1.3)}}`;
    case "bubbles":
      return `.bubbles{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1}.bubbles span{position:absolute;bottom:-80px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);animation:bubbleRise linear infinite}@keyframes bubbleRise{0%{transform:translateY(0) translateX(0);opacity:0}10%{opacity:.5}50%{transform:translateY(-600px) translateX(20px)}100%{transform:translateY(-1200px) translateX(-10px);opacity:0}}`;
    case "aurora":
      return `.aurora{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1;filter:blur(60px);opacity:.5}.aurora-band{position:absolute;width:60%;height:140%;top:-20%;border-radius:50%;mix-blend-mode:screen}.a1{left:-10%;background:linear-gradient(180deg,transparent,${c},transparent);animation:auroraMove1 8s ease-in-out infinite alternate}.a2{left:30%;background:linear-gradient(180deg,transparent,${gridC},transparent);animation:auroraMove2 10s ease-in-out infinite alternate}.a3{left:55%;background:linear-gradient(180deg,transparent,${c},transparent);animation:auroraMove3 12s ease-in-out infinite alternate}@keyframes auroraMove1{0%{transform:translateX(0) skewX(0) scale(1)}100%{transform:translateX(200px) skewX(-15deg) scale(1.3)}}@keyframes auroraMove2{0%{transform:translateX(0) skewX(0)}100%{transform:translateX(-150px) skewX(20deg)}}@keyframes auroraMove3{0%{transform:translateX(0) rotate(0)}100%{transform:translateX(100px) rotate(10deg)}}`;
    case "rays":
      return `.rays{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1}.rays::before{content:"";position:absolute;top:50%;left:50%;width:250%;height:250%;transform:translate(-50%,-50%);background:repeating-conic-gradient(from 0deg at 50% 50%,transparent 0deg,transparent 8deg,${c} 9deg,transparent 10deg);opacity:.12;animation:raysRotate 40s linear infinite}@keyframes raysRotate{to{transform:translate(-50%,-50%) rotate(360deg)}}`;
    case "snow":
      return `.snow{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1}.snow span{position:absolute;top:-20px;border-radius:50%;background:#fff;animation:snowFall linear infinite}@keyframes snowFall{0%{transform:translateY(0) translateX(0) rotate(0);opacity:0}10%{opacity:.8}90%{opacity:.8}100%{transform:translateY(1150px) translateX(60px) rotate(360deg);opacity:0}}`;
    case "grid-pulse":
      return `.grid-pulse{position:absolute;inset:0;pointer-events:none;z-index:1;background-image:linear-gradient(${gridC} 1px,transparent 1px),linear-gradient(90deg,${gridC} 1px,transparent 1px);background-size:${scene.gridSize||"48px"} ${scene.gridSize||"48px"};animation:gridPulse 3s ease-in-out infinite}@keyframes gridPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}`;
    default:
      return "";
  }
}

// ========================================================
//  AVATAR EFFECTS
// ========================================================

function buildAvatarEffectCSS(effect, scene, timings) {
  const glow = scene.glowColor || "rgba(160,90,255,0.35)";
  const after = timings.avatarPopIn + 0.7;
  switch (effect) {
    case "ring-rotate":
      return `.avatar-wrap{position:relative}.avatar-ring::after{content:"";position:absolute;inset:-6px;border-radius:50%;background:conic-gradient(from 0deg,#00e5ff,#ff4081,#ffd700,#00e676,#00e5ff);animation:ringRotate 3s linear infinite;z-index:-1;filter:blur(2px)}@keyframes ringRotate{to{transform:rotate(360deg)}}`;
    case "breathe":
      return `.avatar-ring{animation:avatarPopIn .6s cubic-bezier(.34,1.56,.64,1) ${timings.avatarPopIn}s forwards,breathe 3s ease-in-out ${after}s infinite!important}@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`;
    case "float":
      return `.avatar-ring{animation:avatarPopIn .6s cubic-bezier(.34,1.56,.64,1) ${timings.avatarPopIn}s forwards,avatarFloat 3.5s ease-in-out ${after}s infinite!important}@keyframes avatarFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`;
    case "glow-pulse":
      return `.avatar-ring{animation:avatarPopIn .6s cubic-bezier(.34,1.56,.64,1) ${timings.avatarPopIn}s forwards,glowPulseAv 2.5s ease-in-out ${after}s infinite!important}@keyframes glowPulseAv{0%,100%{box-shadow:0 0 60px ${glow},0 8px 40px rgba(0,0,0,.3)}50%{box-shadow:0 0 140px ${glow},0 0 60px ${glow},0 8px 40px rgba(0,0,0,.3)}}`;
    case "tilt":
      return `.avatar-ring{animation:avatarPopIn .6s cubic-bezier(.34,1.56,.64,1) ${timings.avatarPopIn}s forwards,avatarTilt 4s ease-in-out ${after}s infinite!important}@keyframes avatarTilt{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}`;
    case "bounce":
      return `.avatar-ring{animation:avatarPopIn .6s cubic-bezier(.34,1.56,.64,1) ${timings.avatarPopIn}s forwards,avatarBounce 1.5s ease-in-out ${after}s infinite!important}@keyframes avatarBounce{0%,100%{transform:translateY(0)}30%{transform:translateY(-22px)}50%{transform:translateY(0)}65%{transform:translateY(-10px)}80%{transform:translateY(0)}}`;
    default:
      return "";
  }
}

function buildAvatarSparkleHTML(size) {
  let s = '<div class="sparkles">';
  const positions = [
    [0, -size * 0.55], [size * 0.5, -size * 0.35], [size * 0.58, size * 0.2],
    [-size * 0.5, -size * 0.35], [-size * 0.58, size * 0.2], [size * 0.35, -size * 0.55],
    [-size * 0.35, -size * 0.55], [0, size * 0.58],
  ];
  positions.forEach(([x, y], i) => {
    const d = (i * 0.3).toFixed(1);
    const sz = (8 + Math.random() * 8).toFixed(0);
    s += `<span class="sparkle" style="--sx:${x}px;--sy:${y}px;width:${sz}px;height:${sz}px;animation-delay:${d}s"></span>`;
  });
  return s + "</div>";
}

function buildSceneImageCSS(scene) {
  if (!scene.backgroundImage) return "";

  const fitMap = {
    cover: "cover",
    contain: "contain",
    stretch: "100% 100%",
  };
  const size = fitMap[scene.backgroundFit] || "cover";

  return `.scene::before{content:"";position:absolute;inset:0;background-image:url("${scene.backgroundImage}");background-size:${size};background-position:center;background-repeat:no-repeat;z-index:0}`;
}

// ========================================================
//  CUSTOM TEXTS
// ========================================================

function buildCustomTextsHTML(texts) {
  if (!texts || !texts.length) return "";
  return texts
    .map((t, i) => `<div class="ctx-text ctx-text-${i}">${t.text}</div>`)
    .join("\n  ");
}

function buildCustomTextsCSS(texts, timings) {
  if (!texts || !texts.length) return "";
  const animStart = timings.titleFadeUp + 0.2;

  return texts
    .map((t, i) => {
      const delay = (t.delay !== undefined ? t.delay : animStart + i * 0.3).toFixed(1);
      const anim = t.animation || "fade";
      let animCSS = "";
      switch (anim) {
        case "fade":
          animCSS = `opacity:0;animation:ctxFade .6s ease-out ${delay}s forwards`;
          break;
        case "fadeUp":
          animCSS = `opacity:0;transform:translate(-50%,-50%) translateY(40px);animation:ctxFadeUp .6s ease-out ${delay}s forwards`;
          break;
        case "slideLeft":
          animCSS = `opacity:0;transform:translate(-50%,-50%) translateX(80px);animation:ctxSlideLeft .6s ease-out ${delay}s forwards`;
          break;
        case "slideRight":
          animCSS = `opacity:0;transform:translate(-50%,-50%) translateX(-80px);animation:ctxSlideRight .6s ease-out ${delay}s forwards`;
          break;
        case "pop":
          animCSS = `opacity:0;transform:translate(-50%,-50%) scale(.3);animation:ctxPop .5s cubic-bezier(.34,1.56,.64,1) ${delay}s forwards`;
          break;
        default:
          animCSS = "";
      }
      return `.ctx-text-${i}{position:absolute;left:${t.x}%;top:${t.y}%;transform:translate(-50%,-50%);z-index:8;font-size:${t.fontSize || "36px"};font-weight:${t.fontWeight || 700};color:${t.color || "#fff"};text-shadow:0 2px 12px rgba(0,0,0,.5);white-space:nowrap;${animCSS}}`;
    })
    .join("\n  ")
    .concat("\n  @keyframes ctxFade{to{opacity:1}}\n  @keyframes ctxFadeUp{to{opacity:1;transform:translate(-50%,-50%) translateY(0)}}\n  @keyframes ctxSlideLeft{to{opacity:1;transform:translate(-50%,-50%) translateX(0)}}\n  @keyframes ctxSlideRight{to{opacity:1;transform:translate(-50%,-50%) translateX(0)}}\n  @keyframes ctxPop{to{opacity:1;transform:translate(-50%,-50%) scale(1)}}");
}

// ========================================================
//  MAIN GENERATOR
// ========================================================

export async function generateHtml(config, outPath) {
  const { scene, avatar, title, actions, timings, texts } = config;
  const bgEffect = scene.effect || "none";
  const avatarEffect = avatar.effect || "none";

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${config.width}px;height:${config.height}px;overflow:hidden;font-family:"Noto Sans SC","Microsoft YaHei",sans-serif}

.scene{width:${config.width}px;height:${config.height}px;background:${scene.background};${bgEffect === "gradient-shift" ? "background-size:200% 200%;" : ""}display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;opacity:0;animation:bgFadeIn .6s ease-out ${timings.bgFadeIn}s forwards${bgEffect === "gradient-shift" ? `,gradShift 8s ease-in-out ${timings.bgFadeIn + 0.6}s infinite` : ""}}
${buildSceneImageCSS(scene)}

.grid-overlay{position:absolute;inset:0;background-image:linear-gradient(${scene.gridColor} 1px,transparent 1px),linear-gradient(90deg,${scene.gridColor} 1px,transparent 1px);background-size:${scene.gridSize} ${scene.gridSize};z-index:0}

.glow{position:absolute;width:800px;height:800px;border-radius:50%;background:radial-gradient(circle,${scene.glowColor} 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);animation:glowPulse 4s ease-in-out infinite;z-index:0}

.content{text-align:center;position:relative;z-index:5}

.avatar-wrap{position:relative;display:inline-block;margin-bottom:40px}
.avatar-ring{width:${avatar.size}px;height:${avatar.size}px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 80px ${scene.glowColor},0 8px 40px rgba(0,0,0,.3);overflow:hidden;opacity:0;transform:scale(.3);animation:avatarPopIn .6s cubic-bezier(.34,1.56,.64,1) ${timings.avatarPopIn}s forwards;position:relative}
.avatar-svg{width:72%;height:72%}

${avatarEffect === "sparkle" ? `.sparkles{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${avatar.size}px;height:${avatar.size}px;pointer-events:none;z-index:6}.sparkle{position:absolute;top:50%;left:50%;transform:translate(calc(-50% + var(--sx)),calc(-50% + var(--sy))) scale(0);background:#fff;border-radius:2px;filter:drop-shadow(0 0 4px #fff);opacity:0;animation:sparkleTwinkle 1.8s ease-in-out infinite}@keyframes sparkleTwinkle{0%,100%{transform:translate(calc(-50% + var(--sx)),calc(-50% + var(--sy))) scale(0) rotate(0);opacity:0}50%{transform:translate(calc(-50% + var(--sx)),calc(-50% + var(--sy))) scale(1) rotate(45deg);opacity:1}}` : ""}

.title{font-size:${title.fontSize};font-weight:${title.fontWeight};color:${title.color};letter-spacing:${title.letterSpacing};margin-bottom:70px;opacity:0;transform:translateY(40px);text-shadow:0 4px 24px rgba(0,0,0,.4);animation:titleFadeUp .6s ease-out ${timings.titleFadeUp}s forwards}

.actions{display:flex;justify-content:center;gap:100px}
.action{display:flex;flex-direction:column;align-items:center;opacity:0;transform:translateY(30px) scale(.5)}
.icon-circle{width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.2)}
.icon-circle svg{width:56px;height:56px;color:#fff;fill:currentColor;transition:color .3s ease,transform .3s ease}
.action-label{font-size:24px;color:rgba(255,255,255,.5);margin-top:16px;font-weight:700}

${buildActionStyles(actions, timings)}
${buildBgEffectCSS(bgEffect, scene)}
${buildAvatarEffectCSS(avatarEffect, scene, timings)}
${buildCustomTextsCSS(texts, timings)}

@keyframes bgFadeIn{to{opacity:1}}
@keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes glowPulse{0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}}
@keyframes avatarPopIn{to{opacity:1;transform:scale(1)}}
@keyframes titleFadeUp{to{opacity:1;transform:translateY(0)}}
@keyframes iconAppear{to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes labelActive{to{color:rgba(255,255,255,.95)}}
</style>
</head>
<body>
<div class="scene">
  <div class="grid-overlay"></div>
  <div class="glow"></div>
  ${buildBgEffectHTML(bgEffect, config)}
  ${buildCustomTextsHTML(texts)}
  <div class="content">
    <div class="avatar-wrap">
      ${avatarEffect === "sparkle" ? buildAvatarSparkleHTML(avatar.size) : ""}
      <div class="avatar-ring">${getAvatarContent(avatar)}</div>
    </div>
    <div class="title">${title.text}</div>
    <div class="actions">
${buildActionItems(actions)}
    </div>
  </div>
</div>
</body>
</html>`;

  const resolvedPath = path.resolve(outPath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, html, "utf-8");
  return resolvedPath;
}
