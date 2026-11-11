// MIND – Web Push verschicken, nur mit dem, was Deno und jeder Browser eingebaut haben (WebCrypto), ohne Bibliothek.
// Zwei Standards stecken darin:
//   RFC 8291: Die Nachricht wird für genau ein Gerät verschlüsselt (aes128gcm). Nur dieses Gerät kann sie lesen,
//             auch der Push-Dienst von Apple, Google oder Mozilla nicht.
//   RFC 8292 (VAPID): Der Server weist sich beim Push-Dienst mit einer Unterschrift aus.
// tests/logik.html prüft beides: entschlüsselt die Nachricht wie ein Gerät und prüft die Unterschrift.
const enc=new TextEncoder();
export const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
export const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
const cat=(...parts)=>{const o=new Uint8Array(parts.reduce((n,x)=>n+x.length,0));let i=0;for(const x of parts){o.set(x,i);i+=x.length}return o};
const hkdf=async(salt,ikm,info,len)=>new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt,info},
  await crypto.subtle.importKey("raw",ikm,"HKDF",false,["deriveBits"]),len*8));
const P256={name:"ECDH",namedCurve:"P-256"};
const TTL=3*3600; // so lange hebt der Push-Dienst die Nachricht auf, wenn das Gerät aus ist (danach wäre sie veraltet)

// Neues Schlüsselpaar für den Server. pub = öffentlicher Schlüssel (65 Bytes als base64url, bekommt jedes Gerät),
// priv = privater Schlüssel (JWK als Text, bleibt im Tresor der Datenbank).
export async function newKeys(){
  const k=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign"]);
  return {pub:b64(await crypto.subtle.exportKey("raw",k.publicKey)),priv:JSON.stringify(await crypto.subtle.exportKey("jwk",k.privateKey))};
}

// Nachricht für ein Gerät verschlüsseln. sub = {p256dh, auth} aus der Anmeldung des Geräts. Gibt den fertigen Body zurück.
// fix = {salt, once} gibt es nur für den Test: Mit den festen Werten aus dem Standard muss genau dessen Beispiel herauskommen.
export async function encrypt(sub,payload,fix){
  const ua=bytes(sub.p256dh),auth=bytes(sub.auth),salt=fix?fix.salt:crypto.getRandomValues(new Uint8Array(16));
  const once=fix?fix.once:await crypto.subtle.generateKey(P256,true,["deriveBits"]); // Einmal-Schlüssel nur für diese Nachricht
  const as=new Uint8Array(await crypto.subtle.exportKey("raw",once.publicKey));
  const secret=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:await crypto.subtle.importKey("raw",ua,P256,false,[])},once.privateKey,256));
  const ikm=await hkdf(auth,secret,cat(enc.encode("WebPush: info\0"),ua,as),32);
  const key=await crypto.subtle.importKey("raw",await hkdf(salt,ikm,enc.encode("Content-Encoding: aes128gcm\0"),16),"AES-GCM",false,["encrypt"]);
  const iv=await hkdf(salt,ikm,enc.encode("Content-Encoding: nonce\0"),12);
  const body=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,cat(enc.encode(payload),new Uint8Array([2])))); // 2 = letzter Satz
  // Kopf: Salz (16) | Satzgröße 4096 (4) | Länge des Schlüssels (1) | öffentlicher Einmal-Schlüssel (65)
  return cat(salt,new Uint8Array([0,0,16,0,as.length]),as,body);
}

// Absender für einen Durchlauf. pub und priv wie aus newKeys(), subject = wer hinter dem Server steht (Adresse der App).
// request(sub, nachricht) baut die fertige Anfrage, send(sub, nachricht) schickt sie und gibt den HTTP-Status zurück.
export async function sender(pub,priv,subject){
  const key=await crypto.subtle.importKey("jwk",JSON.parse(priv),{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
  const tokens=new Map(); // pro Push-Dienst ein Ausweis (JWT), 12 Stunden gültig
  async function token(aud){
    if(!tokens.has(aud)){
      const t=b64(enc.encode(JSON.stringify({typ:"JWT",alg:"ES256"})))+"."+b64(enc.encode(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+12*3600,sub:subject})));
      tokens.set(aud,t+"."+b64(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,enc.encode(t))));
    }
    return tokens.get(aud);
  }
  const request=async(sub,msg)=>({method:"POST",body:await encrypt(sub,JSON.stringify(msg)),headers:{
    Authorization:`vapid t=${await token(new URL(sub.endpoint).origin)}, k=${pub}`,
    "Content-Encoding":"aes128gcm","Content-Type":"application/octet-stream",TTL:String(TTL),Urgency:"normal"}});
  const send=async(sub,msg)=>{const r=await fetch(sub.endpoint,await request(sub,msg));if(r.body)await r.body.cancel();return r.status};
  return {request,send};
}
