@echo off
echo 正在下载Nginx...
powershell -Command "Invoke-WebRequest -Uri 'http://nginx.org/download/nginx-1.24.0.zip' -OutFile 'nginx.zip'"

echo 正在解压Nginx...
powershell -Command "Expand-Archive -Path 'nginx.zip' -DestinationPath '.' -Force"

echo 正在配置Nginx...
copy nginx.conf nginx-1.24.0\conf\nginx.conf

echo 创建必要的目录...
mkdir logs 2>nul
mkdir backend\uploads 2>nul

echo 启动Nginx...
cd nginx-1.24.0
start nginx.exe

echo Nginx已启动，请访问 http://localhost 