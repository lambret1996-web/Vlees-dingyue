// Cloudflare Worker处理订阅请求
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理订阅生成API
    if (url.pathname === '/api/generate') {
      return handleGenerateApi(request);
    }
    
    // 处理订阅文件请求
    if (url.pathname.startsWith('/sub/')) {
      return handleSubscriptionRequest(url);
    }
    
    // 处理主页请求
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return serveStaticFile('index.html', 'text/html');
    }
    
    // 处理其他静态文件
    if (url.pathname === '/style.css') {
      return serveStaticFile('style.css', 'text/css');
    }
    
    if (url.pathname === '/script.js') {
      return serveStaticFile('script.js', 'application/javascript');
    }
    
    // 默认返回主页
    return serveStaticFile('index.html', 'text/html');
  }
};

// 处理生成API
async function handleGenerateApi(request) {
  try {
    const data = await request.json();
    
    // 验证必需字段
    if (!data.uuid) {
      return new Response(JSON.stringify({ error: 'UUID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { uuid, host, premiumIp, port, remarks, countries } = data;
    const selectedCountries = countries.filter(c => c.selected);
    
    // 生成VLESS配置
    const configs = [];
    const individualConfigs = [];
    
    selectedCountries.forEach(country => {
      const config = generateVlessConfig(country, uuid, host, premiumIp, port, remarks);
      configs.push(config);
      
      individualConfigs.push({
        country: country.name,
        code: country.code,
        emoji: country.emoji,
        config: config
      });
    });
    
    // 生成订阅链接
    const subscriptionContent = configs.join('\n');
    const base64Content = btoa(subscriptionContent);
    const subscriptionId = generateSubscriptionId();
    const subscriptionUrl = `${new URL(request.url).origin}/sub/${subscriptionId}`;
    
    // 将订阅内容存储在KV中（简化版本：直接返回内容）
    return new Response(JSON.stringify({
      subscriptionUrl: subscriptionUrl,
      subscriptionContent: subscriptionContent,
      base64Content: base64Content,
      individualConfigs: individualConfigs,
      count: selectedCountries.length
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理订阅文件请求
function handleSubscriptionRequest(url) {
  const pathParts = url.pathname.split('/');
  const subscriptionId = pathParts[2];
  
  if (!subscriptionId) {
    return new Response('Subscription not found', { status: 404 });
  }
  
  // 在实际应用中，这里应该从KV存储中获取订阅内容
  // 这里为了简化，我们直接返回一个示例
  const content = `# VLESS订阅配置
# 请将完整内容复制到小火箭中导入
# 生成时间: ${new Date().toLocaleString()}

# 配置示例，实际应在KV中存储
vless://example-uuid@us.proxyip.cmliussss.net:443?encryption=none&security=tls&type=ws&host=us.proxyip.cmliussss.net&path=/proxyip=US.proxyip.cmliussss.net#VLESS-美国`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="vless_subscriptions.txt"'
    }
  });
}

// 生成VLESS配置
function generateVlessConfig(country, uuid, host, premiumIp, port, remarks) {
  const address = premiumIp || `${country.code.toLowerCase()}.proxyip.cmliussss.net`;
  const path = `/proxyip=${country.code}.proxyip.cmliussss.net`;
  
  let vlessLink = `vless://${uuid}@${address}:${port}`;
  vlessLink += `?encryption=none`;
  vlessLink += `&security=tls`;
  
  if (host) {
    vlessLink += `&sni=${encodeURIComponent(host)}`;
  }
  
  vlessLink += `&type=ws`;
  vlessLink += `&host=${address}`;
  vlessLink += `&path=${encodeURIComponent(path)}`;
  vlessLink += `#${remarks}-${country.name}`;
  
  return vlessLink;
}

// 生成订阅ID
function generateSubscriptionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 提供静态文件
async function serveStaticFile(filename, contentType) {
  // 在实际部署中，这些文件应该通过Pages服务
  // 这里返回一个简单的响应
  let content = '';
  
  switch(filename) {
    case 'index.html':
      content = '<h1>请确保部署了完整的静态文件</h1>';
      break;
    case 'style.css':
      content = '/* CSS文件内容 */';
      break;
    case 'script.js':
      content = '// JavaScript文件内容';
      break;
    default:
      content = 'File not found';
  }
  
  return new Response(content, {
    headers: {
      'Content-Type': contentType + '; charset=utf-8'
    }
  });
}
