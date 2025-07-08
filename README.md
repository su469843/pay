# 支付管理系统

一个基于 Next.js 和 PostgreSQL 的现代化支付管理系统，支持订单管理、优惠码系统和支付处理。

## 功能特性

- 📦 **订单管理**: 创建、查看、更新订单状态
- 🎫 **优惠码系统**: 创建和验证优惠码，支持固定金额和全额优惠
- 💳 **支付处理**: 模拟支付流程，支持多种支付方式
- 📊 **数据统计**: 实时显示订单、收入、优惠码等统计数据
- 📱 **响应式设计**: 移动端友好的用户界面

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL (Neon)
- **样式**: Tailwind CSS
- **部署**: Vercel (推荐)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local` 文件并配置你的数据库连接信息：

```env
# PostgreSQL Database Configuration
DATABASE_URL=your_postgresql_connection_string

# Database Connection Settings
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=true

# Next.js Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── orders/        # 订单相关 API
│   │   ├── discounts/     # 优惠码相关 API
│   │   ├── payment/       # 支付相关 API
│   │   └── stats/         # 统计数据 API
│   ├── payment/           # 支付页面
│   ├── success/           # 支付成功页面
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   └── globals.css        # 全局样式
└── lib/                   # 工具库
    ├── database.ts        # 数据库连接和初始化
    └── storage.ts         # 数据服务层
```

## API 接口

### 订单管理
- `GET /api/orders` - 获取订单列表
- `POST /api/orders` - 创建新订单
- `GET /api/orders/[orderId]` - 获取单个订单
- `PUT /api/orders/[orderId]` - 更新订单

### 优惠码管理
- `GET /api/discounts` - 获取优惠码列表
- `POST /api/discounts` - 创建新优惠码
- `POST /api/discounts/validate` - 验证优惠码

### 支付处理
- `POST /api/payment` - 处理支付请求

### 统计数据
- `GET /api/stats` - 获取统计数据

## 数据库表结构

### orders (订单表)
- `order_id` - 订单ID (主键)
- `payment_id` - 支付ID
- `amount` - 订单金额
- `balance` - 实付金额
- `status` - 订单状态 (pending/paid/cancelled)
- `payment_method` - 支付方式
- `description` - 订单描述
- `user_id` - 用户ID
- `created_at` - 创建时间
- `updated_at` - 更新时间

### discounts (优惠码表)
- `discount_id` - 优惠码ID (主键)
- `code` - 优惠码
- `balance` - 优惠金额
- `is_full_discount` - 是否全额优惠
- `status` - 状态 (active/used/expired)
- `description` - 描述
- `usage_count` - 使用次数
- `max_usage` - 最大使用次数
- `min_amount` - 最小订单金额
- `created_at` - 创建时间

### payment_records (支付记录表)
- `record_id` - 记录ID (主键)
- `payment_id` - 支付ID
- `order_id` - 订单ID
- `amount` - 原始金额
- `paid_amount` - 实付金额
- `discount_amount` - 优惠金额
- `payment_method` - 支付方式
- `user_id` - 用户ID
- `discount_id` - 优惠码ID
- `discount_code` - 优惠码
- `paid_at` - 支付时间
- `order_description` - 订单描述

## 部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

### 环境变量配置

确保在生产环境中正确配置所有环境变量，特别是数据库连接信息。

## 开发说明

- 数据库会在首次 API 调用时自动初始化表结构
- 支付功能目前为模拟实现，实际部署时需要集成真实的支付网关
- 用户认证系统需要根据实际需求实现

## 许可证

MIT License