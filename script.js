// 国家配置数据
const countries = [
    { code: 'US', name: '美国', emoji: '🇺🇸', selected: true },
    { code: 'JP', name: '日本', emoji: '🇯🇵', selected: true },
    { code: 'SG', name: '新加坡', emoji: '🇸🇬', selected: true },
    { code: 'DE', name: '德国', emoji: '🇩🇪', selected: true },
    { code: 'GB', name: '英国', emoji: '🇬🇧', selected: true },
    { code: 'KR', name: '韩国', emoji: '🇰🇷', selected: true },
    { code: 'CA', name: '加拿大', emoji: '🇨🇦', selected: true },
    { code: 'FR', name: '法国', emoji: '🇫🇷', selected: true },
    { code: 'AU', name: '澳大利亚', emoji: '🇦🇺', selected: true },
    { code: 'NL', name: '荷兰', emoji: '🇳🇱', selected: true }
];

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    generateUUID();
    renderCountryOptions();
});

// 渲染国家选择选项
function renderCountryOptions() {
    const container = document.getElementById('countries-container');
    container.innerHTML = '';
    
    countries.forEach(country => {
        const countryElement = document.createElement('div');
        countryElement.className = `country-checkbox ${country.selected ? 'selected' : ''}`;
        countryElement.innerHTML = `
            <label>
                <input type="checkbox" ${country.selected ? 'checked' : ''} 
                       onchange="toggleCountry('${country.code}')">
                <span class="country-flag">${country.emoji}</span>
                ${country.name} (${country.code})
            </label>
        `;
        container.appendChild(countryElement);
    });
}

// 切换国家选择状态
function toggleCountry(code) {
    const country = countries.find(c => c.code === code);
    if (country) {
        country.selected = !country.selected;
        renderCountryOptions();
    }
}

// 生成UUID
function generateUUID() {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    document.getElementById('uuid').value = uuid;
    showToast('UUID已生成');
}

// 生成VLESS配置
function generateVlessConfig(country, uuid, host, premiumIp, port, remarks) {
    const address = premiumIp || `${country.code.toLowerCase()}.proxyip.cmliussss.net`;
    const path = `/proxyip=${country.code}.proxyip.cmliussss.net`;
    
    // 构建VLESS链接
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

// 生成全部订阅链接
function generateSubscriptions() {
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
    
    // 合并所有配置为订阅链接
    const subscriptionContent = configs.join('\n');
    const base64Content = btoa(subscriptionContent);
    const subscriptionUrl = `${window.location.origin}/sub?data=${encodeURIComponent(base64Content)}`;
    
    // 显示结果
    document.getElementById('subscription-output').value = subscriptionUrl;
    document.getElementById('individual-links').innerHTML = individualLinks.join('');
    
    // 生成二维码
    generateQRCode(subscriptionUrl);
    
    // 显示结果区域
    document.getElementById('result-section').style.display = 'block';
    
    // 滚动到结果区域
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
    
    showToast('订阅链接生成成功！');
}

// 生成二维码
function generateQRCode(url) {
    const container = document.getElementById('qrcode');
    container.innerHTML = '';
    
    QRCode.toCanvas(container, url, {
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    }, function(error) {
        if (error) {
            console.error('QR Code generation error:', error);
            container.innerHTML = '<p>二维码生成失败</p>';
        }
    });
}

// 复制订阅链接到剪贴板
function copySubscription() {
    const subscriptionUrl = document.getElementById('subscription-output').value;
    if (subscriptionUrl) {
        copyToClipboard(subscriptionUrl);
        showToast('订阅链接已复制到剪贴板');
    }
}

// 复制全部配置
function copyAll() {
    const uuid = document.getElementById('uuid').value;
    const host = document.getElementById('host').value;
    const premiumIp = document.getElementById('premium-ip').value;
    const port = document.getElementById('port').value || '443';
    const remarks = document.getElementById('remarks').value || 'VLESS';
    
    const text = `UUID: ${uuid}\nHost: ${host || '未设置'}\n优选IP: ${premiumIp || '未设置'}\n端口: ${port}\n备注前缀: ${remarks}`;
    
    copyToClipboard(text);
    showToast('配置信息已复制到剪贴板');
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Text copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        // 备用方法
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

// 重置表单
function resetForm() {
    document.getElementById('uuid').value = '';
    document.getElementById('host').value = '';
    document.getElementById('premium-ip').value = '';
    document.getElementById('port').value = '443';
    document.getElementById('remarks').value = 'VLESS';
    
    // 重置所有国家为选中
    countries.forEach(country => country.selected = true);
    renderCountryOptions();
    
    // 隐藏结果区域
    document.getElementById('result-section').style.display = 'none';
    
    // 生成新的UUID
    generateUUID();
    
    showToast('表单已重置');
}

// 显示通知
function showToast(message, type = 'success') {
    // 移除现有的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建新的toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // 设置颜色
    if (type === 'error') {
        toast.style.background = 'var(--danger-color)';
    }
    
    document.body.appendChild(toast);
    
    // 显示toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 隐藏toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// 绑定Enter键事件
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        if (document.getElementById('result-section').style.display === 'none') {
            generateSubscriptions();
        }
    }
});
