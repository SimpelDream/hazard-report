@echo off
echo 测试健康检查接口...
curl -i http://localhost/health
echo.

echo 测试获取报告列表...
curl -i http://localhost/api/reports
echo.

echo 测试创建报告...
curl -i -X POST -H "Content-Type: application/json" -d "{\"project\":\"测试项目\",\"reporter\":\"测试人员\",\"phone\":\"13800138000\",\"foundAt\":\"2025-05-30T00:00:00.000Z\",\"location\":\"测试位置\",\"description\":\"测试描述\"}" http://localhost/api/reports
echo.

echo API 测试完成。
pause 