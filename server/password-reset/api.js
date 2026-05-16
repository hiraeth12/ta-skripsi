import "./load-env.js";
import http from "http";
import { PasswordResetError } from "./core.js";
import { initializePasswordResetAdmin } from "./firebase-admin.js";
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from "./handlers.js";

const PORT = Number(process.env.PORT || 8080);
const MAX_BODY_BYTES = 1024 * 32;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        reject(new PasswordResetError(413, "Request terlalu besar.", "payload_too_large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new PasswordResetError(400, "JSON tidak valid.", "invalid_json"));
      }
    });

    req.on("error", reject);
  });
}

async function routeRequest(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/healthz") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const services = initializePasswordResetAdmin();

  if (url.pathname === "/auth/password-reset/request") {
    sendJson(res, 200, await requestPasswordReset(services, body));
    return;
  }

  if (url.pathname === "/auth/password-reset/verify") {
    sendJson(res, 200, await verifyPasswordResetOtp(services, body));
    return;
  }

  if (url.pathname === "/auth/password-reset/confirm") {
    sendJson(res, 200, await confirmPasswordReset(services, body));
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer((req, res) => {
  routeRequest(req, res).catch((error) => {
    if (error instanceof PasswordResetError) {
      if (error.statusCode >= 500) {
        console.error("[password-reset-api] Config/runtime error:", error.code, error.message);
      }

      sendJson(res, error.statusCode, {
        error: error.message,
        code: error.code,
      });
      return;
    }

    console.error("[password-reset-api] Unhandled error:", error?.message || error);
    sendJson(res, 500, {
      error: "Terjadi kesalahan server.",
      code: "internal_error",
    });
  });
});

server.listen(PORT, () => {
  console.log(`[password-reset-api] Listening on port ${PORT}`);
});
