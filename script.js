// script.js
let countries = [
    {code:"US",emoji:"🇺🇸",name:"美国"},
    {code:"JP",emoji:"🇯🇵",name:"日本"},
    {code:"SG",emoji:"🇸🇬",name:"新加坡"},
    {code:"DE",emoji:"🇩🇪",name:"德国"},
    {code:"GB",emoji:"🇬🇧",name:"英国"},
    {code:"KR",emoji:"🇰🇷",name:"韩国"},
    {code:"CA",emoji:"🇨🇦",name:"加拿大"},
    {code:"FR",emoji:"🇫🇷",name:"法国"},
    {code:"AU",emoji:"🇦🇺",name:"澳大利亚"},
    {code:"NL",emoji:"🇳🇱",name:"荷兰"},
];

//渲染国家选择框
function renderCountries(){
    const container = document.getElementById("countries-container");
    container.innerHTML = "";
    countries.forEach(c=>{
        const div = document.createElement("div");
        div.className = "country-checkbox";
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
        div.classList.add("selected");
        container.appendChild(div);
    })
}

//生成UUID
function generateUUID(){
    const uuid = crypto.randomUUID();
    document.getElementById("uuid").value = uuid;
    showToast("已生成UUID");
}

//获取选中国家
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

//生成单条vless链接
function generateVlessConfig(country,uuid,host,premiumIp,port,remarks){
    const remark = `${remarks}-${country.name}`;
    const path = `/proxyip=${country.code}.proxyip.cmliussss.net`;
    let addr = host;
    if(premiumIp.trim()!=="") addr = premiumIp.trim();
    const params = new URLSearchParams();
    params.set("type","ws");
    params.set("security","tls");
    params.set("path",path);
    params.set("sni",host);
    return `vless://${uuid}@${addr}:${port}?${params.toString()}#${encodeURIComponent(remark)}`;
}

//生成订阅
function generateSubscriptions(){
    const uuid = document.getElementById("uuid").value.trim();
    const host = document.getElementById("host").value.trim();
    const premiumIp = document.getElementById("premium-ip").value.trim();
    const port = parseInt(document.getElementById("port").value);
    const remarks = document.getElementById("remarks").value.trim();

    if(!uuid){ showToast("请填写UUID",true);return; }
    if(!host){ showToast("请填写Host",true);return; }

    const selectedCountries = getSelectedCountries();
    if(selectedCountries.length===0){ showToast("请至少选择一个国家",true);return; }

    const configs = [];
    const individualLinks = [];

    selectedCountries.forEach(country => {
        const config = generateVlessConfig(country, uuid, host, premiumIp, port, remarks);
        configs.push(config);
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

    const allText = configs.join("\n");
    document.getElementById("subscription-output").value = allText;

    //渲染单链接
    document.getElementById("individual-links").innerHTML = individualLinks.join("");
    document.getElementById("result-section").style.display = "block";

    //二维码
    try{
        const qrDom = document.getElementById("qrcode");
        qrDom.innerHTML="";
        new QRCode(qrDom, {text:allText,width:220,height:220});
    }catch(e){console.error(e)}

    showToast("生成完成");
}

//复制到剪贴板
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
