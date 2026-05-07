/**
 * deploy-indexes.js
 * Deploys composite Firestore indexes using a service account JSON.
 * Usage: node scripts/deploy-indexes.js
 * Place serviceacc.json in the project root first.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// Load service account
const saPath = path.join(__dirname, "..", "serviceacc.json");
if (!fs.existsSync(saPath)) {
  console.error("❌  serviceacc.json not found in project root.");
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));
const projectId = sa.project_id;

// ── JWT signing (using only built-ins, no extra packages) ───────────────────
const { createSign } = require("crypto");

function base64url(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform",
    })
  );
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(serviceAccount.private_key, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${payload}.${sig}`;
}

function postForm(url, formBody) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(formBody, "utf8");
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": data.length,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(raw));
          else reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function postAuth(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname, path: u.pathname + u.search, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": data.length, Authorization: `Bearer ${token}` },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(raw));
          else reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ── Index definitions ───────────────────────────────────────────────────────
const INDEXES = [
  // menu: isAvailable ASC + name ASC
  {
    collectionGroup: "menu",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "isAvailable", order: "ASCENDING" },
      { fieldPath: "name", order: "ASCENDING" },
    ],
  },
  // orders: status ASC + createdAt DESC  (for active filter + sort)
  {
    collectionGroup: "orders",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // orders: userId ASC + createdAt DESC  (for user's order history)
  {
    collectionGroup: "orders",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
];

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔑  Getting access token for project: ${projectId}…`);

  const jwt = makeJwt(sa);
  const tokenRes = await postForm(
    "https://oauth2.googleapis.com/token",
    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  );
  const token = tokenRes.access_token;
  console.log("✅  Access token obtained.\n");

  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups`;

  for (const idx of INDEXES) {
    const url = `${base}/${idx.collectionGroup}/indexes`;
    const body = { queryScope: idx.queryScope, fields: idx.fields };
    const label = idx.fields.map((f) => `${f.fieldPath}(${f.order[0]})`).join(" + ");
    try {
      const res = await postAuth(url, body, token);
      console.log(`✅  Index created: [${idx.collectionGroup}] ${label}`);
      console.log(`    Operation: ${res.name}\n`);
    } catch (err) {
      if (err.message.includes("ALREADY_EXISTS") || err.message.includes("409")) {
        console.log(`⏭️   Index already exists: [${idx.collectionGroup}] ${label}\n`);
      } else {
        console.error(`❌  Failed: [${idx.collectionGroup}] ${label}`);
        console.error(`    ${err.message}\n`);
      }
    }
  }

  console.log("🎉  Done! Indexes are building in Firestore (takes 1-3 minutes).");
  console.log("    Watch progress at: https://console.firebase.google.com/project/" + projectId + "/firestore/indexes");
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
