@echo off
echo 正在构建 Docker 镜像...
docker compose build

if %ERRORLEVEL% neq 0 (
    echo 构建失败，请检查错误信息。
    exit /b 1
)

echo 构建成功，正在启动容器...
docker compose up -d

if %ERRORLEVEL% neq 0 (
    echo 启动容器失败，请检查错误信息。
    exit /b 1
)

echo 容器已启动，等待服务就绪...
timeout /t 10

echo 测试健康检查接口...
curl -i http://localhost/health

echo 测试 API 接口...
curl -i -X POST -H "Content-Type: application/json" -d "{\"project\":\"测试项目\",\"reporter\":\"测试人员\",\"phone\":\"13800138000\",\"foundAt\":\"2025-05-30T00:00:00.000Z\",\"location\":\"测试位置\",\"description\":\"测试描述\"}" http://localhost/api/reports

echo 容器化测试完成。

echo 查看容器日志：
docker compose logs 