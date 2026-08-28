/**
 * VLESS‑WS Worker后端，配套你的Pages前端生成器
 * 读取 path: /proxyip=US.proxyip.cmliussss.net
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get("upgrade");

    // 判断是否 WebSocket 升级请求 (VLESS ws)
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("VLESS‑WS worker running, use ws/tls client connect", { status: 200 });
    }

    // 解析 path，提取目标代理域名
    let targetHost = null;
    const pathname = url.pathname;
    if (pathname.startsWith("/proxyip=")) {
      targetHost = pathname.replace("/proxyip=", "").trim();
    }

    if (!targetHost) {
      return new Response("missing proxyip target in path, e.g /proxyip=US.proxyip.cmliussss.net", { status: 400 });
    }

    // 建立 WebSocket 成对
    const [clientWs, serverWs] = new WebSocketPair();
    serverWs.accept();

    ctx.waitUntil((async () => {
      try {
        // 连接到目标出站代理域名，443 wss
        const targetUrl = `wss://${targetHost}:443`;
        const remoteResp = await fetch(targetUrl, {
          method: "GET",
          headers: {
            "Upgrade": "websocket",
            "Connection": "Upgrade",
            "Host": targetHost,
          },
          signal: AbortSignal.timeout(25000),
        });

        const remoteWs = remoteResp.webSocket;
        if (!remoteWs) {
          serverWs.close(1011, "remote no websocket");
          return;
        }
        remoteWs.accept();

        // 双向转发：客户端 <-> 远端proxyip
        serverWs.addEventListener("message", (ev) => {
          try { remoteWs.send(ev.data); } catch (e) {}
        });
        remoteWs.addEventListener("message", (ev) => {
          try { serverWs.send(ev.data); } catch (e) {}
        });

        serverWs.addEventListener("close", () => remoteWs.close());
        remoteWs.addEventListener("close", () => serverWs.close());

        serverWs.addEventListener("error", () => remoteWs.close());
        remoteWs.addEventListener("error", () => serverWs.close());

      } catch (err) {
        serverWs.close(1011, err.message.slice(0,100));
      }
    })());

    return new Response(null, {
      status: 101,
      webSocket: clientWs
    });
  }
};
