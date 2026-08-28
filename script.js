function generateVlessConfig(country,uuid,host,premiumIp,port,remarks){
    const remark = `${remarks}-${country.name}`;
    const pathRaw = `/proxyip=${country.code}.proxyip.cmliussss.net`;
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
