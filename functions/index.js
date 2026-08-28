/**
 * VLESS Global Subscription Generator PRO
 * Cloudflare Workers / Pages Functions
 * 
 * Features:
 * - VLESS Base64
 * - Clash Meta
 * - Sing-boxs
 * - Shadowrocket
 * - Multi node management
 */


// ===============================
// Base64 UTF-8
// ===============================

function base64Encode(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";

    for (const b of bytes) {
        binary += String.fromCharCode(b);
    }

    return btoa(binary);
}



// ===============================
// UUID v4 Check
// ===============================

function validUUID(uuid) {

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(uuid);

}



// ===============================
// 节点配置
// 修改这里即可增加节点
// ===============================


const NODES = [

    {
        flag:"🇺🇸",
        code:"US",
        name:"United States",
        host:"us.vless.yourdomain.com"
    },


    {
        flag:"🇯🇵",
        code:"JP",
        name:"Japan",
        host:"jp.vless.yourdomain.com"
    },


    {
        flag:"🇸🇬",
        code:"SG",
        name:"Singapore",
        host:"sg.vless.yourdomain.com"
    },


    {
        flag:"🇩🇪",
        code:"DE",
        name:"Germany",
        host:"de.vless.yourdomain.com"
    },


    {
        flag:"🇬🇧",
        code:"GB",
        name:"United Kingdom",
        host:"gb.vless.yourdomain.com"
    }


];




// ===============================
// 自动识别客户端
// ===============================

function detectFormat(request){

    const ua =
        (request.headers.get("User-Agent") || "")
        .toLowerCase();


    if(
        ua.includes("clash")
    )
        return "clash";


    if(
        ua.includes("sing-box") ||
        ua.includes("nekobox")
    )
        return "singbox";


    return "v2ray";

}





// ===============================
// Worker入口
// ===============================


export default {


async fetch(request){


    const url = new URL(request.url);

    const params = url.searchParams;



    // 首页

    if(!params.has("uuid")){

        return new Response(
            getHTML(url.origin),
            {
                headers:{
                    "Content-Type":
                    "text/html;charset=utf-8"
                }
            }
        );

    }



    const uuid = params.get("uuid");


    if(!uuid){

        return new Response(
            "UUID missing",
            {
                status:400
            }
        );

    }



    if(!validUUID(uuid)){


        return new Response(
            "Invalid UUID",
            {
                status:400
            }
        );

    }



    const port =
        Number(params.get("port") || 443);



    const format =
        (
            params.get("format")
            ||
            detectFormat(request)
        )
        .toLowerCase();




    const tls = true;



    const config = {

        uuid,

        port,

        tls,

        path:"/vless",

        nodes:NODES

    };



    let response;



    if(format==="clash"){

        response =
        generateClash(config);


    }else if(format==="singbox"){

        response =
        generateSingbox(config);


    }else{


        response =
        generateVless(config);


    }



    return response;



}


};
// ===============================
// VLESS Base64 Generator
// ===============================

function generateVless(config){


    const list=[];


    for(const node of config.nodes){


        const params =
        new URLSearchParams();


        params.set(
            "encryption",
            "none"
        );


        params.set(
            "security",
            "tls"
        );


        params.set(
            "sni",
            node.host
        );


        params.set(
            "type",
            "ws"
        );


        params.set(
            "host",
            node.host
        );


        params.set(
            "path",
            config.path
        );


        params.set(
            "alpn",
            "h2,http/1.1"
        );



        const remark =
        `${node.flag} ${node.code} ${node.name}`;



        const link =
        `vless://${config.uuid}@${node.host}:${config.port}?${params.toString()}#${encodeURIComponent(remark)}`;



        list.push(link);


    }



    return new Response(

        base64Encode(
            list.join("\n")
        ),

        {

            headers:{

                "Content-Type":
                "text/plain;charset=utf-8",

                "Cache-Control":
                "public,max-age=300"

            }

        }

    );

}





// ===============================
// Clash Meta Generator
// ===============================

function generateClash(config){


    let yaml = "";



    yaml +=
`mixed-port: 7890
allow-lan: true
mode: rule
log-level: info

proxies:
`;



    const names=[];



    for(const node of config.nodes){


        const name =
        `${node.flag} ${node.code} ${node.name}`;


        names.push(name);



        yaml +=
`
  - name: "${name}"
    type: vless
    server: ${node.host}
    port: ${config.port}
    uuid: ${config.uuid}
    encryption: none
    tls: true
    udp: true
    network: ws
    servername: ${node.host}
    ws-opts:
      path: ${config.path}
      headers:
        Host: ${node.host}
`;

    }



    yaml +=
`

proxy-groups:

  - name: "🚀 节点选择"
    type: select
    proxies:
`;



    for(const n of names){

        yaml +=
        `      - "${n}"\n`;

    }



    yaml +=
`

rules:

  - MATCH,🚀 节点选择

`;



    return new Response(

        yaml,

        {

            headers:{

                "Content-Type":
                "text/yaml;charset=utf-8",

                "Cache-Control":
                "public,max-age=300"

            }

        }

    );

}





// ===============================
// Sing-box Generator
// ===============================


function generateSingbox(config){



    const outbounds=[];


    const tags=[];



    for(const node of config.nodes){


        const tag =
        `${node.flag} ${node.code} ${node.name}`;


        tags.push(tag);



        outbounds.push({

            type:"vless",

            tag,


            server:
            node.host,


            server_port:
            config.port,


            uuid:
            config.uuid,



            tls:{

                enabled:true,

                server_name:
                node.host


            },


            transport:{

                type:"ws",

                path:
                config.path,


                headers:{

                    Host:
                    node.host

                }

            }


        });


    }





    const result={


        log:{

            level:"info"

        },


        outbounds:[


            {

                type:"selector",

                tag:"🚀 节点选择",

                outbounds:tags

            },


            ...outbounds,



            {

                type:"direct",

                tag:"direct"

            }



        ],



        route:{


            final:
            "🚀 节点选择"


        }



    };





    return new Response(

        JSON.stringify(
            result,
            null,
            2
        ),

        {


            headers:{


                "Content-Type":
                "application/json;charset=utf-8",


                "Cache-Control":
                "public,max-age=300"


            }


        }

    );


}
function getHTML(origin){

return `<!DOCTYPE html>

<html lang="zh-CN">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">


<title>
VLESS Global Generator PRO
</title>


<style>

*{
box-sizing:border-box;
}


body{

margin:0;

min-height:100vh;

background:
linear-gradient(
135deg,
#020617,
#0f172a
);

font-family:
system-ui,
-apple-system,
BlinkMacSystemFont,
"Segoe UI";

color:white;

display:flex;

justify-content:center;

align-items:center;

padding:20px;

}



.card{

width:100%;

max-width:460px;

background:
rgba(255,255,255,.08);

border:

1px solid
rgba(255,255,255,.15);


border-radius:24px;

padding:25px;

backdrop-filter:
blur(20px);

}



h1{

font-size:22px;

margin-top:0;

text-align:center;

}



label{

display:block;

margin-top:18px;

font-size:13px;

color:#cbd5e1;

}



input,
select{

width:100%;

margin-top:8px;

padding:14px;

border-radius:14px;

border:1px solid
rgba(255,255,255,.2);


background:
rgba(0,0,0,.25);

color:white;

font-size:15px;

}



button{

width:100%;

margin-top:20px;

padding:15px;

border:0;

border-radius:16px;

background:

linear-gradient(
135deg,
#38bdf8,
#6366f1
);


color:white;

font-size:16px;

font-weight:600;

cursor:pointer;

}



button:hover{

opacity:.9;

}



.result{

margin-top:20px;

padding:15px;

border-radius:15px;

background:
rgba(0,0,0,.25);

word-break:break-all;

font-size:13px;

}



.qrcode{

margin-top:20px;

text-align:center;

}



.qrcode img{

width:200px;

background:white;

padding:10px;

border-radius:15px;

}



.info{

margin-top:15px;

font-size:13px;

color:#94a3b8;

text-align:center;

}



</style>


</head>


<body>



<div class="card">


<h1>
🚀 VLESS Global Generator
</h1>



<label>
UUID
</label>


<input

id="uuid"

placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">


<label>
端口 Port
</label>


<input

id="port"

value="443">



<label>
订阅格式
</label>



<select id="format">


<option value="auto">
自动识别
</option>


<option value="v2ray">
VLESS Base64
</option>


<option value="clash">
Clash Meta
</option>


<option value="singbox">
Sing-box
</option>


</select>




<button onclick="generate()">

生成订阅

</button>



<button onclick="copyUrl()">

复制订阅链接

</button>




<div class="result" id="result">

等待生成...

</div>



<div class="qrcode">

<img id="qr">

</div>




<div class="info">

全球节点数量:
<span id="nodes">
5
</span>

</div>



</div>



<script>


const KEY="vless_uuid";


const uuidInput=
document.getElementById("uuid");



uuidInput.value =
localStorage.getItem(KEY)||"";



let current="";



function generate(){


let uuid=
uuidInput.value.trim();



if(!uuid){

alert("请输入UUID");

return;

}



localStorage.setItem(
KEY,
uuid
);



let port=
document.getElementById("port")
.value;



let format=
document.getElementById("format")
.value;



current =
location.origin
+
"/?uuid="
+
encodeURIComponent(uuid)
+
"&port="
+
port;



if(format!=="auto"){

current +=
"&format="
+
format;

}



document.getElementById(
"result"
).innerHTML =

`
<a href="${current}"
target="_blank">
${current}
</a>
`;



document.getElementById(
"qr"
).src =

"https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="
+
encodeURIComponent(current);



}



function copyUrl(){


if(!current){

alert(
"请先生成"
);

return;

}



navigator.clipboard.writeText(
current
);


alert(
"已复制"
);



}


</script>



</body>

</html>`;

}
