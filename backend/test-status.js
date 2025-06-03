const fetch = require('node-fetch');
const token = require('fs').readFileSync('admin.token', 'utf-8');

async function updateStatus(reportId) {
  const res = await fetch(`http://localhost:3000/api/admin/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status: '已整改' })
  });
  const data = await res.json();
  console.log('状态更新结果:', data);
}

// 默认测试第1条记录
updateStatus(1).catch(console.error); 