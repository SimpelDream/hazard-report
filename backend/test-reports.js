const fetch = require('node-fetch');
const token = require('fs').readFileSync('admin.token', 'utf-8');

async function testReports() {
  const res = await fetch('http://localhost:3000/api/admin/reports?page=1&limit=10', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('分页查询结果:', data);
}

testReports().catch(console.error); 