"use strict";

// MathQuest never uses Next.js image optimization (next.config.ts sets images.unoptimized).
// This stub replaces `sharp` so its LGPL-licensed libvips binaries are never installed,
// which the hackathon rules (7.6) require.
function sharp() {
  throw new Error("sharp is intentionally not installed in MathQuest: image optimization is disabled.");
}

module.exports = sharp;
module.exports.default = sharp;
