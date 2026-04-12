# okxie-link 实施计划

## 1. 文档目标

本文档回答的是：

- `okxie-link` 接下来按什么顺序重写
- 每个阶段要交付什么
- 什么时候可以删除旧实现

它和 [design.md](/E:/Fighting/Project/okxie-link/docs/design.md) 的关系是：

- `design.md` 负责说明“要做成什么产品、架构如何设计”
- `implementation-plan.md` 负责说明“怎么把它一步步做出来”

## 2. 重写目标

这次重写不是局部修补，而是一次结构重建。

目标：

- 从旧的 interceptor/plugin 思路切换到 middleware 主模型
- 从“写死 `fetch`”切换到 transport 抽象
- 从“单一响应处理方式”切换到 `Response / JSON / data` 三层返回模型
- 保留上传等高频能力，但把高级能力与 `core` 解耦

重写后的结果应当是：

- 一个更小的 `core`
- 一个更稳的 middleware 执行链
- 一个可替换的 transport 层
- 一个更清晰的对外 API

## 3. 路线图

整体执行路径如下：

```text
阶段 1: 搭新骨架
  ->
阶段 2: 接通 middleware 内核
  ->
阶段 3: 接通 transport 和 request
  ->
阶段 4: 接通 response/json/data
  ->
阶段 5: 补齐用户 API
  ->
阶段 6: 迁移上传与官方 middleware
  ->
阶段 7: 删除旧实现
```

也可以理解为：

```text
先内核
  -> 再请求闭环
  -> 再响应闭环
  -> 再高频能力
  -> 最后清理旧代码
```

## 4. 总体策略

### 4.1 实施原则

- 先搭结构，再迁移能力
- 先做内核，再做 middleware
- 先做 `request/requestJson/requestData`，再做快捷方法
- 旧代码只迁移值得保留的工具，不迁移旧执行模型

### 4.2 直接废弃的旧抽象

下列旧抽象不作为新架构基础：

- request interceptor 主模型
- response interceptor 主模型
- 旧 `plugin + setup` 主模型
- 旧 `createBizPlugin`

### 4.3 可迁移的旧逻辑

这些逻辑可以迁移思路或代码：

- `toFormData`
- query 拼接
- body 类型识别
- timeout / abort 错误映射
- 现有错误类命名

## 5. 里程碑总览

建议拆成 6 个阶段。

### 阶段 1：创建新骨架

目标：

- 新目录结构建立完成
- 核心类型骨架建立完成

完成后应该能做到：

- 新目录已经存在
- `index.ts` 能导出基础类型
- TypeScript 编译通过

### 阶段 2：完成 middleware 内核

目标：

- middleware 链可运行
- `use()` 可用
- `next()` 规则稳定

完成后应该能做到：

- middleware 按 onion 顺序执行
- middleware 可以短路

### 阶段 3：完成 transport 与请求闭环

目标：

- 请求配置合并完成
- `fetchTransport` 跑通
- request 闭环建立完成

完成后应该能做到：

- `request()` 正常返回 `Response`
- transport 错误映射稳定

### 阶段 4：完成响应闭环

目标：

- `json()` / `text()` 缓存完成
- `requestJson()` / `requestData()` 完成

完成后应该能做到：

- 多个 middleware 可以重复读取 JSON
- `ctx.data` 可以稳定传递到调用层

### 阶段 5：完成用户 API

目标：

- HTTP 快捷方法补齐
- JSON 快捷方法补齐
- Data 快捷方法补齐

完成后应该能做到：

- 用户层 API 基本可用

### 阶段 6：迁移上传与官方 middleware

目标：

- 上传能力迁移完成
- `createBizMiddleware` 完成

完成后应该能做到：

- 单文件/多文件上传可用
- 业务异常处理闭环可用

## 6. 详细阶段拆解

## 阶段 1：创建新骨架

### 目标

建立新的目录结构和类型骨架，不接业务逻辑。

### 任务

1. 创建目录：

```text
src/
  client/
  context/
  pipeline/
  transport/
  middlewares/
  errors/
  helpers/
  types/
```

2. 创建首批文件：

```text
src/client/http-client.ts
src/context/http-context.ts
src/pipeline/compose.ts
src/transport/fetch-transport.ts
src/transport/xhr-transport.ts
src/errors/http-error.ts
src/errors/network-error.ts
src/errors/timeout-error.ts
src/errors/abort-error.ts
src/errors/biz-error.ts
src/helpers/request-config.ts
src/helpers/query.ts
src/helpers/headers.ts
src/helpers/body.ts
src/helpers/form-data.ts
src/types/http.ts
src/types/middleware.ts
src/types/transport.ts
src/types/upload.ts
src/index.ts
```

3. 定义基础类型：

- `RequestConfig`
- `ClientConfig`
- `ResolvedRequestConfig`
- `HttpContext`
- `HttpMiddleware`
- `HttpTransport`

### 验收标准

- TypeScript 可编译
- 目录结构稳定
- 新 `index.ts` 能导出核心类型

## 阶段 2：完成 middleware 内核

### 目标

让 middleware 链跑起来。

### 任务

1. 实现 `compose`
2. 增加 `next()` 多次调用保护
3. 在 `HttpClient` 中实现 `use()`
4. 实现最小 `HttpContext`

### 验收标准

- middleware 按 onion 顺序执行
- `next()` 多次调用会报错
- middleware 可以短路

## 阶段 3：完成 transport 与请求闭环

### 目标

让请求能真正发出去，并建立 transport 抽象。

### 任务

1. 实现 config merge
2. 实现 `fetchTransport`
3. 定义 `xhrTransport` 接口壳
4. 在 middleware 链尾调用 transport
5. 建立 HTTP/网络/超时/取消错误映射

### 验收标准

- `request()` 可正常返回 `Response`
- 错误类型正确
- transport 可替换

## 阶段 4：完成响应缓存与三层返回模型

### 目标

让响应 JSON 和业务 data 流闭环。

### 任务

1. 在 `HttpContext` 内实现 `json()` 缓存
2. 实现 `text()` 缓存
3. 实现 `setResponse()`
4. 实现 `setJson()`
5. 实现：
   - `requestJson()`
   - `requestData()`

### 验收标准

- 多个 middleware 可以重复读取 JSON
- `requestJson()` 返回响应 JSON
- `requestData()` 返回 `ctx.data`

## 阶段 5：完成对外 API

### 目标

补齐用户实际会用到的主 API。

### 任务

1. 实现 HTTP 方法：

- `get`
- `post`
- `put`
- `patch`
- `delete`
- `head`
- `options`

2. 实现 JSON 方法：

- `getJson`
- `postJson`
- `putJson`
- `patchJson`
- `deleteJson`

3. 实现 Data 方法：

- `getData`
- `postData`
- `putData`
- `patchData`
- `deleteData`

### 验收标准

- 主 API 可以稳定调用
- 命名和返回语义清晰

## 阶段 6：迁移上传与官方 middleware

### 目标

补齐首版高频能力。

### 任务

1. 迁移 `toFormData`
2. 实现：
   - `upload`
   - `uploadJson`
   - 可选 `uploadData`
3. 实现 `createBizMiddleware`
4. `createBizMiddleware` 在成功时写 `ctx.data`

### 验收标准

- 单文件和多文件上传正常
- 业务 middleware 成功/失败路径正常
- `requestData()` 和 biz middleware 能协同工作

## 7. 首版暂不实现的内容

这些先不做：

- `auth middleware`
- `retry middleware`
- `logger middleware`
- `mock middleware`
- 上传进度
- 分片上传
- 断点续传
- 复杂 adapter 体系

原因：

- 先稳定内核
- 避免首轮范围失控

## 8. 测试计划

建议测试文件重建为：

```text
test/
  compose.test.ts
  context.test.ts
  request-config.test.ts
  transport.test.ts
  http-client.test.ts
  upload.test.ts
  biz-middleware.test.ts
  errors.test.ts
```

首轮必须覆盖：

- compose 执行顺序
- `next()` 限制
- config merge
- transport 错误映射
- context JSON 缓存
- `requestJson`
- `requestData`
- 上传
- `createBizMiddleware`

## 9. 删除旧实现的时机

建议分三步：

### 第一步

新骨架建起来，但旧代码先不删。

### 第二步

当新 `index.ts` 已经完成主 API 导出后，停止给旧实现加功能。

### 第三步

当以下能力都通过测试后，删除旧实现：

- `request`
- `requestJson`
- `requestData`
- 上传
- `createBizMiddleware`

## 10. 第一轮建议交付范围

如果希望尽快完成一次可用重构，第一轮建议只交付这些：

1. 新目录结构
2. `HttpMiddleware`
3. `HttpContext`
4. `HttpTransport`
5. `fetchTransport`
6. `request`
7. `requestJson`
8. `requestData`
9. `get/getJson/getData`
10. `toFormData`
11. `upload/uploadJson`
12. `createBizMiddleware`

不交付：

- `xhrTransport` 完整实现
- `auth middleware`
- `retry middleware`
- `uploadData`

## 11. 当前建议

下一步直接开始阶段 1。

优先顺序：

1. 建新目录和类型文件
2. 实现 `compose`
3. 实现 `HttpContext`
4. 实现 `fetchTransport`
5. 接通 `request/requestJson/requestData`

完成这一轮之后，再迁移上传和业务 middleware。
