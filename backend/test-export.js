const fetch = require('node-fetch');
const fs = require('fs');
const token = fs.readFileSync('admin.token', 'utf-8');

async function exportExcel() {
  const res = await fetch('http://localhost:3000/api/admin/reports/export', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('导出失败');
  const buffer = await res.buffer();
  fs.writeFileSync('reports.xlsx', buffer);
  console.log('Excel 文件已保存为 reports.xlsx，大小:', buffer.length);
}

exportExcel().catch(console.error); 