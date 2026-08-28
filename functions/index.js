/**
 * CF Pages VLESS 订阅转换器
 * WS Path: /proxyip=XX.proxyip.cmliussss.net
 * Support Shadowrocket / V2Ray / ClashMeta / Sing‑box
 */

function base64Encode(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (const b of bytes) {
        binary += String.fromCharCode(b);
    }
    return btoa(binary);
}

function validUUID(uuid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

// 10个主流国家配置
const COUNTRY_LIST = [
    { flag: "🇺🇸", code: "US", name: "United States" },
    { flag: "🇯🇵", code: "JP", name: "Japan" },
    { flag: "🇸🇬", code: "SG", name: "Singapore" },
    { flag: "🇩🇪", code: "DE", name: "Germany" },
    { flag: "🇬🇧", code: "GB", name: "United Kingdom" },
    { flag: "🇨🇦", code: "CA", name: "Canada" },
    { flag: "🇦🇺", code: "AU", name: "Australia" },
    { flag: "🇫🇷", code: "FR", name: "France" },
    { flag: "🇰🇷", code: "KR", name: "Korea" },
    { flag: "🇳🇱", code: "NL", name: "Netherlands" }
];

function detectFormat(request) {
    const ua = (request.headers.get("User-Agent") || "").toLowerCase();
    if (ua.includes("clash")) return "clash";
    if (ua.includes("sing-box") || ua.includes("nekobox")) return "singbox";
    if (ua.includes("shadowrocket")) return "v2ray";
    return "v2ray";
}

export async function onRequest(request) {
    const url = new URL(request.url);
    const params = url.searchParams;

    // 返回UI首页
    if (!params.has("uuid") || !params.has("host")) {
        return new Response(getHTML(url.origin), {
            headers: { "Content-Type": "text/html;charset=utf-8" }
        });
    }

    const uuid = params.get("uuid").trim();
    const host = params.get("host").trim();
    const port = Number(params.get("port") || 443);
    const format = (params.get("format") || detectFormat(request)).toLowerCase();

    if (!validUUID(uuid)) {
        return new Response("Invalid UUID", { status: 400 });
    }
    if (!host) {
        return new Response("Host is empty", { status: 400 });
    }

    // 组装节点，每个国家独立path
    const nodes = COUNTRY_LIST.map(item => {
        return {
            ...item,
            wsPath: `/proxyip=${item.code}.proxyip.cmliussss.net`
        };
    });

    const config = {
        uuid,
        host,
        port,
        nodes
    };

    let response;
    if (format === "clash") {
        response = generateClash(config);
    } else if (format === "singbox") {
        response = generateSingbox(config);
    } else {
        response = generateV2ray(config);
    }
    return response;
}

// V2Ray base64 (Shadowrocket兼容)
function generateV2ray(config) {
    const links = [];
    for (const node of config.nodes) {
        const sp = new URLSearchParams();
        sp.set("encryption", "none");
        sp.set("security", "tls");
        sp.set("sni", config.host);
        sp.set("type", "ws");
        sp.set("host", config.host);
        sp.set("path", node.wsPath);
        sp.set("alpn", "h2,http/1.1");
        const remark = `${node.flag} ${node.code} ${node.name}`;
        const link = `vless://${config.uuid}@${config.host}:${config.port}?${sp.toString()}#${encodeURIComponent(remark)}`;
        links.push(link);
    }
    return new Response(base64Encode(links.join("\n")), {
        headers: {
            "Content-Type": "text/plain;charset=utf-8",
            "Cache-Control": "public,max-age=300"
        }
    });
}

// Clash Meta
function generateClash(config) {
    let yaml = `mixed-port: 7890
allow-lan: true
mode: rule
log-level: info
proxies:
`;
    const names = [];
    for (const node of config.nodes) {
        const name = `${node.flag} ${node.code} ${node.name}`;
        names.push(name);
        yaml += `
  - name: "${name}"
    type: vless
    server: ${config.host}
    port: ${config.port}
    uuid: ${config.uuid}
    encryption: none
    tls: true
    udp: true
    network: ws
    servername: ${config.host}
    ws-opts:
      path: ${node.wsPath}
      headers:
        Host: ${config.host}
`;
    }
    yaml += `
proxy-groups:
  - name: "🚀节点选择"
    type: select
    proxies:
`;
    names.forEach(n => yaml += `      - "${n}"\n`);
    yaml += `
rules:
  - MATCH,🚀节点选择
`;
    return new Response(yaml, {
        headers: {
            "Content-Type": "text/yaml;charset=utf-8",
            "Cache-Control": "public,max-age=300"
        }
    });
}

// Sing‑box
function generateSingbox(config) {
    const outbounds = [];
    const tags = [];
    for (const node of config.nodes) {
        const tag = `${node.flag} ${node.code} ${node.name}`;
        tags.push(tag);
        outbounds.push({
            type: "vless",
            tag,
            server: config.host,
            server_port: config.port,
            uuid: config.uuid,
            tls: {
                enabled: true,
                server_name: config.host
            },
            transport: {
                type: "ws",
                path: node.wsPath,
                headers: { Host: config.host }
            }
        });
    }
    const jsonOut = {
        log: { level: "info" },
        outbounds: [
            { type: "selector", tag: "🚀节点选择", outbounds: tags },
            ...outbounds,
            { type: "direct", tag: "direct" }
        ],
        route: { final: "🚀节点选择" }
    };
    return new Response(JSON.stringify(jsonOut, null, 2), {
        headers: {
            "Content-Type": "application/json;charset=utf-8",
            "Cache-Control": "public,max-age=300"
        }
    });
}

// UI页面
function getHTML(origin) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>VLESS Multi‑Country Sub Converter</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{
    min-height:100vh;
    background:linear-gradient(135deg,#0f172a,#1e293b);
    font-family:system-ui,-apple-system,Segoe UI,sans-serif;
    color:#fff;
    display:flex;
    justify-content:center;
    align-items:center;
    padding:20px;
}
.card{
    width:100%;
    max-width:480px;
    background:rgba(255,255,255,0.07);
    border:1px solid rgba(255,255,255,0.14);
    border-radius:22px;
    padding:28px;
    backdrop-filter:blur(18px);
}
h1{
    text-align:center;
    font-size:22px;
    margin-bottom:24px;
}
label{
    display:block;
    margin-top:16px;
    font-size:14px;
    color:#cbd5e1;
}
input,select{
    width:100%;
    margin-top:8px;
    padding:13px 14px;
    border-radius:12px;
    border:1px solid rgba(255,255,255,0.18);
    background:rgba(0,0,0,0.24);
    color:#fff;
    font-size:15px;
}
.btns{
    margin-top:22px;
    display:grid;
    gap:12px;
}
button{
    width:100%;
    padding:14px;
    border:none;
    border-radius:12px;
    background:linear-gradient(120deg,#38bdf8,#6366f1);
    color:white;
    font-size:15px;
    font-weight:600;
    cursor:pointer;
}
button:active{opacity:0.88;}
.result-box{
    margin-top:20px;
    padding:14px;
    background:rgba(0,0,0,0.26);
    border-radius:12px;
    word-break:break-all;
    font-size:13px;
}
.qrcode-wrap{
    margin-top:20px;
    text-align:center;
}
.qrcode-wrap img{
    width:210px;
    background:#fff;
    padding:10px;
    border-radius:12px;
}
.info-text{
    margin-top:16px;
    font-size:13px;
    color:#94a3b8;
    text-align:center;
}
</style>
</head>
<body>
<div class="card">
<h1>🌍 VLESS多国家订阅生成器</h1>

<label>UUID</label>
<input id="uuid" placeholder="填入你的VLESS UUID">

<label>Host (域名)</label>
<input id="host" placeholder="example.cloudflare.com">

<label>端口 Port</label>
<input id="port" value="443">

<label>订阅格式</label>
<select id="format">
<option value="v2ray">V2Ray / Shadowrocket(Base64)</option>
<option value="clash">Clash Meta</option>
<option value="singbox">Sing‑box</option>
</select>

<div class="btns">
<button onclick="buildLink()">生成订阅链接</button>
<button onclick="copyLink()">复制订阅链接</button>
</div>

<div class="result-box" id="res">等待生成...</div>

<div class="qrcode-wrap">
<img id="qrimg">
</div>

<div class="info-text">
共10个国家节点 | WS Path自动生成 proxyip=XX.proxyip.cmliussss.net
</div>
</div>

<script>
let currentUrl = "";

function buildLink(){
    const uuid = document.getElementById("uuid").value.trim();
    const host = document.getElementById("host").value.trim();
    const port = document.getElementById("port").value.trim();
    const fmt = document.getElementById("format").value;

    if(!uuid){ alert("请填写UUID"); return; }
    if(!host){ alert("请填写Host域名"); return; }

    currentUrl = location.origin + "/?uuid="+encodeURIComponent(uuid)+"&host="+encodeURIComponent(host)+"&port="+port+"&format="+fmt;
    document.getElementById("res").innerHTML = `<a href="${currentUrl}" target="_blank">${currentUrl}</a>`;
    document.getElementById("qrimg").src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="+encodeURIComponent(currentUrl);
}

function copyLink(){
    if(!currentUrl){ alert("请先生成订阅链接"); return; }
    navigator.clipboard.writeText(currentUrl);
    alert("订阅链接已复制");
}
</script>
</body>
</html>`;
}
