// 生成全部订阅链接
async function generateSubscriptions() {
  const uuid = document.getElementById('uuid').value.trim();
  const host = document.getElementById('host').value.trim();
  const premiumIp = document.getElementById('premium-ip').value.trim();
  const port = document.getElementById('port').value || '443';
  const remarks = document.getElementById('remarks').value || 'VLESS';
  
  // 验证输入
  if (!uuid) {
    showToast('请填写UUID', 'error');
    return;
  }
  
  // UUID格式验证
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    showToast('UUID格式不正确', 'error');
    return;
  }
  
  // 获取选中的国家
  const selectedCountries = countries.filter(c => c.selected);
  if (selectedCountries.length === 0) {
    showToast('请至少选择一个国家', 'error');
    return;
  }
  
  // 显示加载状态
  const generateBtn = document.querySelector('.btn-primary');
  const originalText = generateBtn.innerHTML;
  generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
  generateBtn.disabled = true;
  
  try {
    // 发送请求到后端API
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uuid,
        host,
        premiumIp,
        port,
        remarks,
        countries: selectedCountries
      })
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // 显示订阅链接
    document.getElementById('subscription-output').value = result.subscriptionUrl;
    
    // 生成单个国家链接
    const individualLinks = result.individualConfigs.map(config => {
      return `
        <div class="link-item">
          <div>
            <span class="link-country">${config.emoji} ${config.country}</span>
            <span class="link-text">${config.config}</span>
          </div>
          <button class="link-copy" onclick="copyToClipboard('${config.config.replace(/'/g, "\\'")}')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      `;
    });
    
    document.getElementById('individual-links').innerHTML = individualLinks.join('');
    
    // 生成二维码
    generateQRCode(result.subscriptionUrl);
    
    // 显示结果区域
    document.getElementById('result-section').style.display = 'block';
    
    // 滚动到结果区域
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
    
    showToast(`成功生成 ${result.count} 个订阅配置！`);
    
  } catch (error) {
    console.error('生成订阅时出错:', error);
    showToast(`生成失败: ${error.message}`, 'error');
    
    // 如果API失败，使用前端生成（备选方案）
    useFrontendGeneration(uuid, host, premiumIp, port, remarks, selectedCountries);
  } finally {
    // 恢复按钮状态
    generateBtn.innerHTML = originalText;
    generateBtn.disabled = false;
  }
}

// 备选方案：前端生成
function useFrontendGeneration(uuid, host, premiumIp, port, remarks, selectedCountries) {
  // 生成配置
  const configs = [];
  const individualLinks = [];
  
  selectedCountries.forEach(country => {
    const config = generateVlessConfig(country, uuid, host, premiumIp, port, remarks);
    configs.push(config);
    
    // 为单个链接创建展示项
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
  
  // 生成Base64编码的订阅内容
  const subscriptionContent = configs.join('\n');
  const base64Content = btoa(subscriptionContent);
  
  // 创建Blob URL作为订阅链接
  const blob = new Blob([subscriptionContent], { type: 'text/plain' });
  const subscriptionUrl = URL.createObjectURL(blob);
  
  // 显示结果
  document.getElementById('subscription-output').value = subscriptionContent;
  document.getElementById('individual-links').innerHTML = individualLinks.join('');
  
  // 生成二维码（对于Blob URL，二维码可能无法正常工作）
  try {
    generateQRCode(subscriptionContent);
    document.getElementById('qrcode').innerHTML = '<p class="qr-help">请复制上方文本到小火箭中导入</p>';
  } catch (error) {
    document.getElementById('qrcode').innerHTML = '<p class="qr-help">请复制上方文本到小火箭中导入</p>';
  }
  
  // 显示结果区域
  document.getElementById('result-section').style.display = 'block';
  
  showToast('使用前端生成成功！请复制上方配置文本。');
}

// 前端VLESS生成函数
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
