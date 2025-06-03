@echo off
echo 选择操作:
echo 1. 查看后端容器日志
echo 2. 查看 Nginx 容器日志
echo 3. 进入后端容器内部
echo 4. 进入 Nginx 容器内部
echo 5. 重启所有容器
echo 6. 退出

set /p choice=请输入选项编号:

if "%choice%"=="1" (
    docker compose logs backend
    pause
    goto :eof
)

if "%choice%"=="2" (
    docker compose logs nginx
    pause
    goto :eof
)

if "%choice%"=="3" (
    echo 正在进入后端容器...
    docker exec -it hazard-report-backend bash
    goto :eof
)

if "%choice%"=="4" (
    echo 正在进入 Nginx 容器...
    docker exec -it hazard-report-nginx sh
    goto :eof
)

if "%choice%"=="5" (
    echo 重启所有容器...
    docker compose restart
    echo 容器已重启
    pause
    goto :eof
)

if "%choice%"=="6" (
    goto :eof
) 