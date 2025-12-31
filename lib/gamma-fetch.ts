// lib/gamma-fetch.ts
// Robust fetch helper for Polymarket Gamma API with TLS, retry, and User-Agent spoofing

import https from "https";
import { URL } from "url";

// Custom HTTPS agent with optimized TLS settings
const httpsAgent = new https.Agent({
  rejectUnauthorized: true, // Keep security
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
});

// User-Agent spoofing - mimic a real browser
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Exponential backoff retry helper
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RetryOptions = {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
};

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Native HTTPS request using Node.js https module
 * This gives us full control over TLS settings
 */
function nativeHttpsRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const headers: Record<string, string> = {
      "User-Agent": getRandomUserAgent(),
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Referer: "https://polymarket.com/",
      Host: urlObj.host,
      ...(options.headers as Record<string, string>),
    };

    const requestOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers,
      agent: httpsAgent,
      timeout: 30000,
    };

    const req = https.request(requestOptions, (res) => {
      const chunks: Buffer[] = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks);
        // Create a Response-like object compatible with fetch API
        const responseHeaders = new Headers();
        Object.entries(res.headers).forEach(([key, value]) => {
          if (value) {
            responseHeaders.set(key, Array.isArray(value) ? value[0] : value);
          }
        });

        const response = new Response(body.toString("utf-8"), {
          status: res.statusCode || 200,
          statusText: res.statusMessage || "OK",
          headers: responseHeaders,
        });
        resolve(response);
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (options.body) {
      if (typeof options.body === "string") {
        req.write(options.body);
      } else if (options.body instanceof Buffer) {
        req.write(options.body);
      }
    }

    req.end();
  });
}

/**
 * Robust fetch helper for Polymarket Gamma API
 * - TLS configuration for Node.js
 * - User-Agent spoofing
 * - Retry with exponential backoff
 * - CORS bypass (server-side)
 */
export async function gammaFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const retry = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
    try {
      const delay =
        attempt === 0
          ? 0
          : Math.min(
              retry.initialDelay * Math.pow(retry.backoffMultiplier, attempt - 1),
              retry.maxDelay
            );

      if (delay > 0) {
        await sleep(delay);
      }

      const response = await nativeHttpsRequest(url, options);

      // If successful, return immediately
      if (response.ok) {
        return response;
      }

      // For 429 (rate limit) or 5xx errors, retry
      if (
        response.status === 429 ||
        (response.status >= 500 && response.status < 600)
      ) {
        lastError = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
        continue; // Retry
      }

      // For other errors, don't retry
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Network errors, timeouts, etc. - retry
      if (attempt < retry.maxRetries) {
        continue;
      }
      
      // Last attempt failed, throw
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Failed to fetch after retries");
}

/**
 * Convenience wrapper that returns JSON directly
 */
export async function gammaFetchJson<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const response = await gammaFetch(url, options, retryOptions);
  
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Gamma API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`
    );
  }

  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

