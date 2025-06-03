@echo off
echo 停止并移除所有容器...
docker compose down

echo 移除所有相关镜像...
docker rmi hazard-report-backend

echo 清理完成。 