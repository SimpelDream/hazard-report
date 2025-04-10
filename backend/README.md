# 隐患上报平台 - 后端

## 最新更新

### 新功能支持

1. **位置定位功能**:
   - 后端数据库已准备好接收前端发送的位置坐标数据
   - 无需额外修改，location字段已可以存储坐标信息

2. **制度文件系统**:
   - 新增`/api/orders`接口，用于获取和访问制度文件
   - 文件存储在`backend/orders`目录中
   - 支持自动按文件名排序

3. **状态管理功能**:
   - 新增`/api/reports/:id/status`接口，用于更新报告状态
   - 在数据库中添加了`status`和`statusUpdatedAt`字段
   - 支持"进行中"和"已整改"两种状态

4. **数据导出功能**:
   - 新增`/api/reports/export`接口，用于导出报告数据为Excel格式
   - 支持根据筛选条件导出所有符合条件的数据
   - Excel文件包含完整的报告信息，并应用了格式化和样式

### 数据库迁移

需要执行以下迁移操作来更新数据库结构：

```bash
# 方法1: 使用Prisma迁移
npx prisma migrate dev --name add_status_field

# 方法2: 手动执行SQL迁移(如果Prisma迁移失败)
# 执行 migrations/manual_add_status_field/migration.sql 中的SQL语句
```

### 新增依赖

```bash
# 安装Excel导出功能依赖
npm install exceljs
```

## 原有功能 