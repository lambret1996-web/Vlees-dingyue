// Cloudflare Worker处理订阅请求
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理订阅请求
    if (url.pathname === '/sub') {
      const data = url.searchParams.get('data');
      
      if (!data) {
        return new Response('No data provided', { status: 400 });
      }
      
      try {
        // 解码Base64数据
        const decodedData = atob(data);
        
        // 返回订阅内容
        return new Response(decodedData, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': 'attachment; filename="vless_subscriptions.txt"'
          }
        });
      } catch (error) {
        return new Response('Error decoding data', { status: 400 });
      }
    }
    
    // 默认返回主页
    const response = await fetch('https://raw.githubusercontent.com/yourusername/vless-converter/main/index.html');
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
};
