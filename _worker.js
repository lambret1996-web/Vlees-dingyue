// _worker.js - 用于Cloudflare Pages Functions
import staticAssetHandler from './worker.js';

export default {
  async fetch(request, env, ctx) {
    // 处理API请求
    const url = new URL(request.url);
    
    if (url.pathname === '/api/generate') {
      // 处理CORS预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }
      
      // 处理生成请求
      return handleGenerateRequest(request);
    }
    
    // 处理订阅请求
    if (url.pathname.startsWith('/sub/')) {
      return handleSubscriptionRequest(url);
    }
    
    // 其他请求交给静态资源处理
    return env.ASSETS.fetch(request);
  }
};

// 处理生成请求
async function handleGenerateRequest(request) {
  try {
    const data = await request.json();
    
    // 验证必需字段
    if (!data.uuid) {
      return new Response(JSON.stringify({ error: 'UUID is required' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const { uuid, host, premiumIp, port = '443', remarks = 'VLESS', countries = [] } = data;
    const selectedCountries = countries.filter(c => c.selected);
    
    if (selectedCountries.length === 0) {
      return new Response(JSON.stringify({ error: 'No countries selected' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
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
    
    // 简单存储到内存（生产环境应该使用KV）
    globalThis.subscriptions = globalThis.subscriptions || {};
    globalThis.subscriptions[subscriptionId] = {
      content: subscriptionContent,
      generatedAt: Date.now()
    };
    
    // 清理过期的订阅（24小时）
    setTimeout(() => {
      delete globalThis.subscriptions[subscriptionId];
    }, 24 * 60 * 60 * 1000);
    
    return new Response(JSON.stringify({
      success: true,
      subscriptionUrl: subscriptionUrl,
      directContent: subscriptionContent,
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
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// 处理订阅请求
function handleSubscriptionRequest(url) {
  const pathParts = url.pathname.split('/');
  const subscriptionId = pathParts[2];
  
  if (!subscriptionId) {
    return new Response('Subscription not found', { 
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
  
  const subscription = globalThis.subscriptions?.[subscriptionId];
  
  if (!subscription) {
    return new Response('Subscription expired or not found', { 
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
  
  return new Response(subscription.content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="vless_subscriptions.txt"',
      'Access-Control-Allow-Origin': '*'
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
