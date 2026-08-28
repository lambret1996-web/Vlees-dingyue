// script.js 纯前端VLESS链接生成器，无后端，浏览器本地运算
let countries = [
    {code:"US",emoji:"🇺🇸",name:"美国", proxyipDomain:"us‑xxx.proxy.test"},
    {code:"JP",emoji:"🇯🇵",name:"日本", proxyipDomain:"2001:19f0:7002:1001:5400:6ff:fe24:c2cf"},
    {code:"SG",emoji:"🇸🇬",name:"新加坡", proxyipDomain:"sg‑bbb.proxy.test"},
    {code:"DE",emoji:"🇩🇪",name:"德国", proxyipDomain:"de‑ccc.proxy.test"},
    {code:"GB",emoji:"🇬🇧",name:"英国", proxyipDomain:"gb‑ddd.proxy.test"},
    {code:"KR",emoji:"🇰🇷",name:"韩国", proxyipDomain:"kr‑eee.proxy.test"},
    {code:"CA",emoji:"🇨🇦",name:"加拿大", proxyipDomain:"ca‑fff.proxy.test"},
    {code:"FR",emoji:"🇫🇷",name:"法国", proxyipDomain:"fr‑ggg.proxy.test"},
    {code:"AU",emoji:"🇦🇺",name:"澳大利亚", proxyipDomain:"au‑hhh.proxy.test"},
    {code:"NL",emoji:"🇳🇱",name:"荷兰", proxyipDomain:"nl‑iii.proxy.test"},
];
//渲染国家选择框
function renderCountries(){
    const container = document.getElementById("countries-container");
    container.innerHTML = "";
    countries.forEach(c=>{
        const div = document.createElement("div");
        div.className = "country-checkbox selected";
        div.dataset.code = c.code;
        div.innerHTML = `
            <input type="checkbox" class="country-check" data-code="${c.code}" checked>
            <span class="country-flag">${c.emoji}</span>
            <span>${c.name}</span>
        `;
        div.onclick = (e)=>{
            if(e.target.tagName!=="INPUT"){
                const inp = div.querySelector("input");
                inp.checked = !inp.checked;
                div.classList.toggle("selected",inp.checked);
            }
        };
        const inp = div.querySelector("input");
        inp.onchange=()=>div.classList.toggle("selected",inp.checked);
        container.appendChild(div);
    })
}

//生成UUID（浏览器本地）
function generateUUID(){
    const uuid = crypto.randomUUID();
    document.getElementById("uuid").value = uuid;
    showToast("已生成UUID");
}

//获取勾选的国家
function getSelectedCountries(){
    const checks = document.querySelectorAll(".country-check:checked");
    const sel = [];
    checks.forEach(cb=>{
        const code = cb.dataset.code;
        const item = countries.find(x=>x.code===code);
        if(item) sel.push(item);
    })
    return sel;
}

/**
 * 【核心】拼接标准VLESS分享链接字符串 vless:// 开头
 * 只做字符串拼接，不连接任何服务器
 */
function generateVlessConfig(country,uuid,host,premiumIp,port,remarks){
    const remark = `${remarks}-${country.name}`;
    //原来：const pathRaw = `/proxyip=${country.code}.proxyip.cmliussss.net`;
const pathRaw = `/proxyip=${country.proxyipDomain}`;
    let addr = host.trim();
    if(premiumIp.trim()!=="") addr = premiumIp.trim();

    const queryParts = [
        "type=ws",
        "security=tls",
        "encryption=none",
        `path=${pathRaw}`,
        `host=${host.trim()}`,   // ←新增 ws host 请求头
        `sni=${host.trim()}`
    ];
    const queryStr = queryParts.join("&");

    return `vless://${uuid}@${addr}:${port}?${queryStr}#${encodeURIComponent(remark)}`;
}
//生成订阅
function generateSubscriptions(){
    const uuid = document.getElementById("uuid").value.trim();
    const host = document.getElementById("host").value.trim();
    const premiumIp = document.getElementById("premium-ip").value.trim();
    const port = parseInt(document.getElementById("port").value);
    const remarks = document.getElementById("remarks").value.trim();

    if(!uuid){ showToast("请填写UUID",true);return; }
    if(!host){ showToast("请填写Host/SNI",true);return; }

    const selectedCountries = getSelectedCountries();
    if(selectedCountries.length===0){ showToast("请至少选择一个国家",true);return; }

    const configs = [];
    const individualLinks = [];

    selectedCountries.forEach(country => {
        const config = generateVlessConfig(country, uuid, host, premiumIp, port, remarks);
        configs.push(config);
        //渲染单条链接html
        individualLinks.push(`
            <div class="link-item">
                <div>
                    <span class="link-country">${country.emoji} ${country.name}</span>
                    <span class="link-text">${config}</span>
                </div>
                <button class="link-copy" onclick="copyToClipboard('${config.replace(/'/g, "\\'")}')">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        `);
    });

    //多行文本输出，每一行一条vless://链接，用于小火箭订阅
    const allText = configs.join("\n");
    document.getElementById("subscription-output").value = allText;

    document.getElementById("individual-links").innerHTML = individualLinks.join("");
    document.getElementById("result-section").style.display = "block";

    //生成二维码
    try{
        const qrDom = document.getElementById("qrcode");
        qrDom.innerHTML="";
        new QRCode(qrDom, {text:allText,width:220,height:220});
    }catch(e){console.error(e)}

    showToast("VLESS配置生成完成");
}

//复制剪贴板
async function copyToClipboard(text){
    try{
        await navigator.clipboard.writeText(text);
        showToast("已复制");
    }catch(e){showToast("复制失败",true)}
}

async function copySubscription(){
    const val = document.getElementById("subscription-output").value;
    await copyToClipboard(val);
}

async function copyAll(){
    await copySubscription();
}

function resetForm(){
    document.getElementById("uuid").value="";
    document.getElementById("host").value="";
    document.getElementById("premium-ip").value="";
    document.getElementById("port").value="443";
    document.getElementById("remarks").value="VLESS";
    document.getElementById("result-section").style.display="none";
    renderCountries();
}

//提示弹窗
function showToast(msg,isError=false){
    let t = document.querySelector(".toast");
    if(!t){
        t = document.createElement("div");
        t.className="toast";
        document.body.appendChild(t);
    }
    t.style.background = isError ? "var(--danger-color)" : "var(--secondary-color)";
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"),2200);
}

window.onload = ()=>{
    renderCountries();
}
