# Supabase 数据库配置指南

## 🎯 目标
将项目从 Neon 数据库迁移到 Supabase 数据库，解决持续的连接问题。

## 📋 当前状态
✅ 已更新 `.env.local` 文件中的数据库配置  
❌ 需要设置实际的 Supabase 数据库密码

## 🔧 完成配置步骤

### 步骤 1: 获取 Supabase 数据库密码

1. **登录 Supabase 控制台**
   - 访问: https://supabase.com/dashboard
   - 登录您的账户

2. **选择项目**
   - 找到项目 ID: `xvdllqhvqltrvkbhatyq`
   - 点击进入项目

3. **获取数据库密码**
   - 点击左侧菜单 "Settings" → "Database"
   - 在 "Connection info" 部分找到密码
   - 或者点击 "Reset database password" 重置密码

### 步骤 2: 更新环境变量

编辑 `.env.local` 文件，将所有 `[YOUR-PASSWORD]` 替换为实际密码：

```bash
# 将这些行中的 [YOUR-PASSWORD] 替换为实际密码
DATABASE_URL=postgresql://postgres:实际密码@db.xvdllqhvqltrvkbhatyq.supabase.co:5432/postgres
PGPASSWORD=实际密码
DB_PASSWORD=实际密码
```

### 步骤 3: 测试连接

运行测试脚本验证连接：
```bash
node test-supabase-connection.js
```

## 🔍 连接信息

**当前配置的连接详情：**
- **主机**: `db.xvdllqhvqltrvkbhatyq.supabase.co`
- **端口**: `5432`
- **数据库**: `postgres`
- **用户名**: `postgres`
- **SSL**: 启用 (require)
- **Channel Binding**: 禁用 (为了兼容性)

## 🚀 优势

**为什么选择 Supabase：**
- ✅ 更稳定的连接
- ✅ 更好的 Node.js 兼容性
- ✅ 内置的实时功能
- ✅ 更友好的开发者体验
- ✅ 免费层更慷慨

## 🔧 故障排除

如果连接仍然失败，请检查：

1. **密码正确性**
   - 确保密码没有特殊字符编码问题
   - 尝试重置 Supabase 数据库密码

2. **网络连接**
   - 检查防火墙设置
   - 确保端口 5432 未被阻止

3. **Supabase 项目状态**
   - 确认项目处于活跃状态
   - 检查是否有使用限制

4. **IP 白名单**
   - Supabase 默认允许所有 IP
   - 如果启用了限制，请添加您的 IP

## 📞 获取帮助

如果问题持续存在：
- 查看 Supabase 文档: https://supabase.com/docs
- 联系 Supabase 支持: https://supabase.com/support
- 检查 Supabase 状态页面: https://status.supabase.com/

## 🎉 完成后

连接成功后，您可以：
1. 启动开发服务器: `npm run dev`
2. 测试应用功能
3. 如需要，迁移现有数据
4. 删除旧的 Neon 相关配置和测试文件