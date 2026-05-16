/**
 * Instagram posting helper
 * Delegates to a configured provider (ayrshare, late, or zernio) via INSTAGRAM_PROVIDER env var
 */
import { getENV } from "./env.js";

const PROVIDERS = {
  ayrshare: "./providers/ayrshare.js",
  late: "./providers/late.js",
  zernio: "./providers/zernio.js",
};

async function getProvider() {
  const name = getENV("INSTAGRAM_PROVIDER", "ayrshare");

  if (!PROVIDERS[name]) {
    throw new Error(
      `Unknown INSTAGRAM_PROVIDER "${name}". Supported: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }

  if (name === "ayrshare") {
    const apiKey = getENV("AYRSHARE_API_KEY", "");
    if (!apiKey || !apiKey.trim()) {
      throw new Error("AYRESHARE_API_KEY is required when INSTAGRAM_PROVIDER=ayrshare");
    }
  }

  if (name === "late") {
    const apiKey = getENV("LATE_API_KEY", "");
    if (!apiKey || !apiKey.trim()) {
      throw new Error("LATE_API_KEY is required when INSTAGRAM_PROVIDER=late");
    }
  }

  if (name === "zernio") {
    const apiKey = getENV("ZERNIO_API_KEY", "");
    if (!apiKey || !apiKey.trim()) {
      throw new Error("ZERNIO_API_KEY is required when INSTAGRAM_PROVIDER=zernio");
    }
    const accountId = getENV("ZERNIO_IG_ACCOUNT_ID", "");
    if (!accountId || !accountId.trim()) {
      throw new Error(
        "ZERNIO_IG_ACCOUNT_ID is required when INSTAGRAM_PROVIDER=zernio"
      );
    }
  }

  return await import(PROVIDERS[name]);
}

export async function publishImage(file, caption) {
  const provider = await getProvider();
  return await provider.publishImage(file, caption);
}

export async function publishVideo(videoFile, videoCover, caption) {
  const provider = await getProvider();
  return await provider.publishVideo(videoFile, videoCover, caption);
}

export async function publishStory(file) {
  const provider = await getProvider();
  return await provider.publishStory(file);
}
