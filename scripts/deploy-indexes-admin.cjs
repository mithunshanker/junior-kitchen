/**
 * deploy-indexes-admin.cjs
 * Uses firebase-admin SDK to verify auth, then calls the REST API.
 * The firebase-adminsdk service account needs roles/datastore.owner or roles/datastore.indexAdmin
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { createSign } = require("crypto");

const saPath = path.join(__dirname, "..", "serviceacc.json");
if (!fs.existsSync(saPath)) { console.error("❌ serviceacc.json not found"); process.exit(1); }
const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));
const projectId = sa.project_id;

function b64url(s) { return Buffer.from(s).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }

function makeJwt() {
  const now = Math.floor(Date.now()/1000);
  const h = b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const p = b64url(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now, exp: now+3600,
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore"
  }));
  const sign = createSign("RSA-SHA256");
  sign.update(`${h}.${p}`);
  const sig = sign.sign(sa.private_key,"base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  return `${h}.${p}.${sig}`;
}

function req(opts, body) {
  return new Promise((res, rej) => {
    const d = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    const r = https.request({...opts, headers:{...opts.headers,"Content-Length":d.length}}, (resp) => {
      let raw="";
      resp.on("data",c=>raw+=c);
      resp.on("end",()=>{
        try { const j=JSON.parse(raw); if(resp.statusCode>=200&&resp.statusCode<300) res(j); else rej(new Error(`HTTP ${resp.statusCode}: ${raw}`)); }
        catch(e){rej(new Error(`Parse error: ${raw}`));}
      });
    });
    r.on("error",rej);
    r.write(d);
    r.end();
  });
}

const INDEXES = [
  { col:"menu", fields:[{fieldPath:"isAvailable",order:"ASCENDING"},{fieldPath:"name",order:"ASCENDING"}] },
  { col:"orders", fields:[{fieldPath:"status",order:"ASCENDING"},{fieldPath:"createdAt",order:"DESCENDING"}] },
  { col:"orders", fields:[{fieldPath:"userId",order:"ASCENDING"},{fieldPath:"createdAt",order:"DESCENDING"}] },
];

async function main() {
  console.log(`\n🔑 Authenticating as ${sa.client_email} …`);
  const jwt = makeJwt();
  const tokenUrl = new URL(sa.token_uri || "https://oauth2.googleapis.com/token");
  const form = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const tok = await req({hostname:tokenUrl.hostname,path:tokenUrl.pathname,method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"}}, form);
  const token = tok.access_token;
  if (!token) { console.error("❌ No access token:", JSON.stringify(tok)); process.exit(1); }
  console.log("✅ Token OK\n");

  for (const idx of INDEXES) {
    const label = idx.fields.map(f=>`${f.fieldPath}(${f.order[0]})`).join(" + ");
    const url = `/v1/projects/${projectId}/databases/(default)/collectionGroups/${idx.col}/indexes`;
    try {
      const r = await req({
        hostname:"firestore.googleapis.com", path:url, method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`}
      }, {queryScope:"COLLECTION",fields:idx.fields});
      console.log(`✅ Index queued: [${idx.col}] ${label}`);
      console.log(`   Operation: ${r.name}\n`);
    } catch(e) {
      if (e.message.includes("ALREADY_EXISTS")||e.message.includes('"code":409')) {
        console.log(`⏭️  Already exists: [${idx.col}] ${label}\n`);
      } else {
        console.error(`❌ Failed: [${idx.col}] ${label}`);
        console.error(`   ${e.message.slice(0,300)}\n`);
      }
    }
  }
  console.log("🎉 Done! Indexes build in 1-3 mins.");
  console.log(`   https://console.firebase.google.com/project/${projectId}/firestore/indexes`);
}
main().catch(e=>{console.error("Fatal:",e.message);process.exit(1);});
