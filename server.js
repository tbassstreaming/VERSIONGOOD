const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.TBASS_DATA_DIR || path.join(ROOT, "data");
const UPLOADS = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, {recursive:true});

const db = new Database(path.join(DATA_DIR, "tbass.sqlite"));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  customer_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_path TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'N/A',
  plan TEXT NOT NULL,
  amount_htg INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_ref TEXT NOT NULL,
  payment_screenshot TEXT NOT NULL,
  client_password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  submitted_at TEXT NOT NULL,
  activated_at TEXT,
  subscription_start TEXT,
  subscription_end TEXT
);
`);

function logAction(action, customerId, details){
  db.prepare("INSERT INTO audit_logs(action,customer_id,details,created_at) VALUES(?,?,?,?)")
    .run(action, customerId ?? null, details ?? null, todayISO());
}
function getSetting(key, fallback=""){
  const row=db.prepare("SELECT value FROM settings WHERE key=?").get(key);
  return row ? row.value : fallback;
}
function setSetting(key, value){
  db.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at")
    .run(key, String(value ?? ""), todayISO());
}

const adminUser = process.env.TBASS_ADMIN_USER || "admin";
const adminPass = process.env.TBASS_ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "TBASS@2026!");
if(process.env.NODE_ENV === "production" && (!process.env.SESSION_SECRET || !process.env.TBASS_ADMIN_PASSWORD || !process.env.TBASS_ADMIN_USER)) {
  console.error("FATAL SECURITY CONFIG: set SESSION_SECRET, TBASS_ADMIN_USER and TBASS_ADMIN_PASSWORD before production start.");
  process.exit(1);
}
// Persist administrator password changes in SQLite across server restarts.
const storedAdminHash = getSetting("admin_password_hash", "");
let adminHash = storedAdminHash || (adminPass ? bcrypt.hashSync(adminPass, 12) : "");
if (!storedAdminHash && adminHash) setSetting("admin_password_hash", adminHash);

app.use(express.urlencoded({extended:true, limit:"100kb"}));
app.use(express.json({limit:"100kb"}));

// Basic production security headers without adding another dependency.
app.use((req,res,next)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  next();
});

// Lightweight in-memory rate limiting for login and public applications.
const rateBuckets = new Map();
function rateLimit({windowMs,max,keyFn}){
  return (req,res,next)=>{
    const key=keyFn(req);
    const now=Date.now();
    let b=rateBuckets.get(key);
    if(!b || now-b.start>=windowMs) b={start:now,count:0};
    b.count++; rateBuckets.set(key,b);
    if(b.count>max) return res.status(429).json({error:"Twòp demann. Tanpri eseye ankò pita."});
    next();
  };
}
const loginLimiter=rateLimit({windowMs:15*60*1000,max:10,keyFn:req=>"login:"+(req.ip||"unknown")});
const applyLimiter=rateLimit({windowMs:10*60*1000,max:20,keyFn:req=>"apply:"+(req.ip||"unknown")});
app.use(session({
  secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? undefined : "DEV_ONLY_CHANGE_THIS_SESSION_SECRET"),
  resave: false,
  saveUninitialized: false,
  cookie: {httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==='production', maxAge: 1000*60*60*8}
}));
app.use(express.static(path.join(ROOT, "public")));
// Friendly admin entry point: check session in admin.html, then open Dashboard or login.
app.get("/admin", (req, res) => res.redirect("/admin.html"));
app.get("/admin/", (req, res) => res.redirect("/admin.html"));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = Date.now()+"-"+Math.random().toString(36).slice(2)+ext;
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  limits:{fileSize: 5*1024*1024},
  fileFilter: (_, file, cb) => {
    const ok = ["image/jpeg","image/png","image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Images only"), ok);
  }
});

function requireAdmin(req,res,next){
  if(!req.session.admin) return res.status(401).json({error:"Unauthorized"});
  next();
}
function todayISO(){ return new Date().toISOString(); }
function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate()+days);
  return d.toISOString();
}
function expireSubscriptions(){
 const now=todayISO();
 const rows=db.prepare("SELECT id,name FROM customers WHERE status='ACTIVE' AND subscription_end IS NOT NULL AND subscription_end <= ?").all(now);
 const update=db.prepare("UPDATE customers SET status='EXPIRED' WHERE id=?");
 const tx=db.transaction(items=>items.forEach(x=>{update.run(x.id);logAction('SUBSCRIPTION_EXPIRED',x.id,x.name);}));
 tx(rows);
}

app.get("/api/health",(req,res)=>res.json({ok:true,service:"T-BASS",version:"V25.2"}));

app.post("/api/apply", applyLimiter, upload.fields([
  {name:"customer_photo", maxCount:1},
  {name:"payment_screenshot", maxCount:1}
]), (req,res)=>{
  try{
    const b=req.body;
    if(!b.name || !b.phone || !b.plan || !['NatCash','MonCash'].includes(b.payment_method) ||
       !req.files?.payment_screenshot?.[0]) return res.status(400).json({error:"Tout chan yo obligatwa."});
    const planCatalog={
      "opt1_400_month":{amount:400,label:"Option 1 — Plan 1 — 400 HTG / mois"},
      "opt1_1000_3months":{amount:1000,label:"Option 1 — Plan 2 — 1 000 HTG / 3 mois"},
      "opt2_1000_month":{amount:1000,label:"Option 2 — Plan 1 — 1 000 HTG / mois"},
      "opt2_2500_3months":{amount:2500,label:"Option 2 — Plan 2 — 2 500 HTG / 3 mois"}
    };
    const selectedPlan=planCatalog[b.plan];
    if(!selectedPlan) return res.status(400).json({error:"Plan invalide."});
    // Le formulaire public ne demande plus de mot de passe client.
    // On conserve le champ interne obligatoire en base avec un secret aléatoire inutilisable par le client.
    const internalSecret=require("crypto").randomBytes(32).toString("hex");
    const passHash=bcrypt.hashSync(internalSecret,12);
    const photo=req.files?.customer_photo?.[0]?.filename || null;
    const proof=req.files.payment_screenshot[0].filename;
    const info=db.prepare(`
      INSERT INTO customers
      (photo_path,name,phone,language,plan,amount_htg,payment_method,transaction_ref,payment_screenshot,client_password_hash,submitted_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(photo,b.name.trim(),b.phone.trim(),'N/A',selectedPlan.label,selectedPlan.amount,b.payment_method,String(b.transaction_ref||'').trim(),proof,passHash,todayISO());
    logAction('NEW_APPLICATION', info.lastInsertRowid, b.name.trim());
    res.json({ok:true,id:info.lastInsertRowid,message:"Demann lan resevwa. Li pral verifye pa admin."});
  }catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/admin/login", loginLimiter, (req,res)=>{
  const {username,password}=req.body||{};
  if(username===adminUser && adminHash && bcrypt.compareSync(password||"",adminHash)){
    return req.session.regenerate(err=>{
      if(err) return res.status(500).json({error:"Pa kapab louvri sesyon an. Eseye ankò."});
      req.session.admin=true;
      req.session.save(saveErr=> saveErr ? res.status(500).json({error:"Pa kapab sove sesyon an."}) : res.json({ok:true}));
    });
  }
  res.status(401).json({error:"Username oswa password pa bon."});
});
app.post("/api/admin/change-password", requireAdmin, loginLimiter, (req,res)=>{
  const body=req.body||{};
  const current=String(body.currentPassword||"");
  const next=String(body.newPassword||"");
  if(!adminHash || !bcrypt.compareSync(current,adminHash)) return res.status(401).json({error:"Modpas aktyèl la pa bon."});
  if(next.length < 12 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) return res.status(400).json({error:"Nouvo modpas la dwe gen omwen 12 karaktè, ak lèt ak chif."});
  if(next===current) return res.status(400).json({error:"Chwazi yon modpas diferan ak ansyen an."});
  adminHash=bcrypt.hashSync(next,12);
  setSetting('admin_password_hash', adminHash);
  logAction('ADMIN_PASSWORD_CHANGED',null,'Admin password changed and saved persistently');
  req.session.regenerate(err=>{
    if(err) return res.status(500).json({error:"Modpas la chanje, men sesyon an pa t kapab renouvle. Rekonekte."});
    req.session.admin=true;
    req.session.save(saveErr=>saveErr ? res.status(500).json({error:"Modpas la chanje. Rekonekte pou kontinye."}) : res.json({ok:true,message:"Modpas la chanje pou sesyon sèvè aktyèl la."}));
  });
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>{res.clearCookie('connect.sid');res.json({ok:true})}));

app.get("/api/admin/me",requireAdmin,(req,res)=>res.json({ok:true,user:adminUser}));

app.get("/api/admin/stats",requireAdmin,(req,res)=>{
  expireSubscriptions();
  const pending=db.prepare("SELECT COUNT(*) c FROM customers WHERE status='PENDING'").get().c;
  const active=db.prepare("SELECT COUNT(*) c FROM customers WHERE status='ACTIVE'").get().c;
  const revenue=db.prepare("SELECT COALESCE(SUM(amount_htg),0) s FROM customers WHERE status='ACTIVE'").get().s;
  const payments=db.prepare("SELECT COUNT(*) c FROM customers WHERE payment_status='VERIFIED'").get().c;
  res.json({pending,active,revenue,payments});
});

app.get("/api/admin/customers",requireAdmin,(req,res)=>{
  expireSubscriptions();
  const rows=db.prepare("SELECT id,photo_path,name,phone,plan,amount_htg,payment_method,transaction_ref,payment_screenshot,status,payment_status,submitted_at,activated_at,subscription_start,subscription_end FROM customers ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/admin/customers/:id/verify-payment",requireAdmin,(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<1) return res.status(400).json({error:"Demann envalid."});
  const customer=db.prepare("SELECT id,status FROM customers WHERE id=?").get(id);
  if(!customer) return res.status(404).json({error:"Demann sa a pa egziste."});
  db.prepare("UPDATE customers SET payment_status='VERIFIED' WHERE id=?").run(id);
  logAction('PAYMENT_VERIFIED',id,'Payment manually verified by admin');
  res.json({ok:true,message:"Peman make kòm verifye. Ou ka aktive kliyan an kounye a."});
});

app.post("/api/admin/customers/:id/activate",requireAdmin,(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<1) return res.status(400).json({error:"Kliyan envalid."});
  const c=db.prepare("SELECT * FROM customers WHERE id=?").get(id);
  if(!c) return res.status(404).json({error:"Client introuvable"});
  if(c.payment_status!=="VERIFIED") return res.status(400).json({error:"Verify payment first."});
  const start=todayISO(), end=addDays(start,30);
  db.prepare("UPDATE customers SET status='ACTIVE',activated_at=?,subscription_start=?,subscription_end=? WHERE id=?")
    .run(start,start,end,id);
  logAction('CLIENT_ACTIVATED',id,c.name);
  res.json({ok:true});
});

app.post("/api/admin/customers/:id/renew",requireAdmin,(req,res)=>{
 expireSubscriptions(); const id=Number(req.params.id);
 if(!Number.isInteger(id)||id<1)return res.status(400).json({error:"Kliyan envalid."});
 const c=db.prepare("SELECT * FROM customers WHERE id=?").get(id);
 if(!c)return res.status(404).json({error:"Kliyan sa a pa egziste."});
 if(c.payment_status!=="VERIFIED")return res.status(400).json({error:"Verifye peman renouvèlman an anvan."});
 const now=new Date(), prev=c.subscription_end?new Date(c.subscription_end):now, start=prev>now?prev:now, end=new Date(start); end.setDate(end.getDate()+30);
 db.prepare("UPDATE customers SET status='ACTIVE',subscription_start=COALESCE(subscription_start,?),subscription_end=?,activated_at=COALESCE(activated_at,?) WHERE id=?").run(start.toISOString(),end.toISOString(),now.toISOString(),id);
 logAction('SUBSCRIPTION_RENEWED',id,c.name+' • renewed for 30 days'); res.json({ok:true,message:"Abònman an renouvle pou 30 jou."});
});
app.post("/api/admin/customers/:id/expire",requireAdmin,(req,res)=>{
 const id=Number(req.params.id),c=db.prepare("SELECT id,name FROM customers WHERE id=?").get(id); if(!c)return res.status(404).json({error:"Kliyan sa a pa egziste."});
 db.prepare("UPDATE customers SET status='EXPIRED' WHERE id=?").run(id); logAction('SUBSCRIPTION_EXPIRED_MANUALLY',id,c.name); res.json({ok:true,message:"Abònman an make kòm ekspire."});
});

app.post("/api/admin/customers/:id/reject",requireAdmin,(req,res)=>{
  const id=Number(req.params.id); db.prepare("UPDATE customers SET status='REJECTED' WHERE id=?").run(id); logAction('REQUEST_REJECTED',id,'Rejected by admin');
  res.json({ok:true});
});

app.get("/api/admin/customers/:id/proof",requireAdmin,(req,res)=>{
  const c=db.prepare("SELECT payment_screenshot FROM customers WHERE id=?").get(Number(req.params.id));
  if(!c) return res.status(404).end();
  res.sendFile(path.join(UPLOADS,c.payment_screenshot));
});


app.get("/api/admin/settings",requireAdmin,(req,res)=>{
  const keys=["whatsapp_group","whatsapp_private","support_message"];
  const out={}; keys.forEach(k=>out[k]=getSetting(k,""));
  res.json(out);
});
app.post("/api/admin/settings",requireAdmin,(req,res)=>{
  const allowed=["whatsapp_group","whatsapp_private","support_message"];
  allowed.forEach(k=>{if(req.body[k]!==undefined)setSetting(k,req.body[k]);});
  logAction("SETTINGS_UPDATED",null,allowed.filter(k=>req.body[k]!==undefined).join(","));
  res.json({ok:true});
});
app.get("/api/admin/audit",requireAdmin,(req,res)=>{
  const rows=db.prepare(`SELECT a.*, c.name customer_name FROM audit_logs a LEFT JOIN customers c ON c.id=a.customer_id ORDER BY a.id DESC LIMIT 100`).all();
  res.json(rows);
});
app.get("/api/admin/subscriptions",requireAdmin,(req,res)=>{
  const rows=db.prepare(`SELECT id,name,phone,plan,amount_htg,status,subscription_start,subscription_end FROM customers WHERE status='ACTIVE' ORDER BY subscription_end ASC`).all();
  res.json(rows);
});

app.listen(PORT,()=>console.log(`T-BASS V13 running on http://localhost:${PORT}`));
