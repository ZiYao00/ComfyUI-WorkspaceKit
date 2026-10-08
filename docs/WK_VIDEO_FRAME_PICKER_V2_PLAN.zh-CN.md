# WK Video Frame Picker V2 规划

> 状态：**冻结设计草案 / 待未来启动**
> 基线：V1 已在提交 `267f8ea feat: add video frame picker` 落地并通过 Legacy / Nodes 2.0、保存刷新、真实 PyAV/Torch 解码与回归测试。
> 本文用于未来继续开发时恢复上下文，不代表 V2 已进入实施，也不应提前把未确认输出或 UI 暴露到 V1。

## 1. V2 目标

V2 不把 `WK Video Frame Picker` 发展成视频剪辑器，而是在 V1 的“看视频 → 拖 Playhead 找帧 → 输出当前帧”基础上增加一个能力：

> **在时间轴上给多个帧打标，并一次输出这些关键帧。**

典型用途：

- 从 AI 视频里标记人物最好的一帧；
- 标记产品展示最佳帧；
- 标记首帧 / 转场帧 / 异常帧；
- 选取多个参考帧继续送入图像、视觉模型或视频生成工作流；
- 后续直接形成 `IMAGE Batch`，供多参考图工作流使用。

V2 的核心仍然是“选帧”，不是“剪视频”。

---

## 2. V1 已稳定合同

以下内容在 V2 必须继续兼容，不重新定义：

### 2.1 节点名称

`WK Video Frame Picker`

### 2.2 持久化输入

- `video`
- `frame_index`

### 2.3 帧编号

统一 **1-based**：

- Frame 1 = 第一帧；
- 前端、工作流保存值、Marker 数据、后端公开语义均使用 1-based；
- 只有 PyAV / 数组内部实现允许临时换算成 0-based。

### 2.4 V1 输出

输出 0：

`frame_image : IMAGE`

含义固定为：

> 当前 Playhead / 当前选中帧对应的图片。

V2 不得移动、重命名或改变此输出的语义。

### 2.5 Playhead 事务

V1 已验证：

- pointermove：只更新浏览器预览与 Playhead；
- 不持续写 `frame_index`；
- 不持续污染 workflow dirty；
- pointerup：只提交一次最终 `frame_index`；
- 最终变更进入 ComfyUI 正常 widget / graph change transaction；
- 保存刷新后精确恢复。

V2 Marker 交互必须保持同一原则。

---

## 3. 视频帧命名规范

以下四个名称作为 WorkspaceKit 视频帧领域词汇保留：

| 名称 | 固定语义 | 状态 |
| --- | --- | --- |
| `frame_image` | 当前 Playhead 所在帧 | **已发布，稳定合同** |
| `key_image` | 当前激活的“已打标关键帧” | **保留名，是否真正输出待确认** |
| `batch_key_image` | 所有 Marker 帧组成的 IMAGE Batch | **V2 核心目标** |
| `batch_frame_image` | 普通批量抽帧 / 区间抽帧，不属于 Marker | **保留给未来其它能力，不在 V2** |

### 3.1 为什么 V2 不强制加入 `key_image`

如果未来点击某个 Marker 时，Playhead 会自动跳到该 Marker，那么：

`frame_image`

本身就已经代表当前激活关键帧。

因此 V2 不应仅为了“名字齐全”新增重复输出。

只有当未来出现明确独立语义，例如：

> Playhead 可以离开 Marker，但仍需要保留一个 Active Key Selection

才考虑追加：

`key_image`

### 3.2 输出兼容原则

公共输出采用 **append-only**：

V1：

```text
0  frame_image
```

V2 最小方案：

```text
0  frame_image
1  batch_key_image
```

未来如果真的加入 `key_image`：

```text
0  frame_image
1  batch_key_image
2  key_image
```

不得为了“更漂亮的排列”重新排序旧输出。

---

## 4. V2 Marker 交互

### 4.1 时间轴结构

继续复用 V1：

```text
filmstrip
├── marker-layer
└── playhead
```

V1 已经保留空的 `marker-layer`，V2 在该层启用标记即可，不重新构建 Timeline。

### 4.2 最小 Marker UI

建议只提供：

- 当前帧 `+ Marker` / 标记按钮；
- Timeline 上的小圆点或短竖线；
- 点击 Marker → Playhead 跳到对应帧；
- 删除当前 Marker；
- 清空全部 Marker。

示意：

```text
                ▼ Playhead
┌────┬────┬────┬────┬────┬────┐
│缩略│缩略│缩略│缩略│缩略│缩略│
└────┴────┴────┴────┴────┴────┘
      ●             ●       ●
     #1            #2      #3
```

### 4.3 V2 不做的 Marker 功能

暂不加入：

- Marker 名称；
- Marker 颜色分类；
- Marker 注释；
- 区间 Marker；
- In / Out；
- Trim；
- 多轨；
- 音频波形；
- 时间轴剪切；
- Marker 分组；
- Marker 拖动重排。

V2 只解决：

> **这几帧我要。**

---

## 5. Marker 数据模型

### 5.1 公开语义

推荐持久化字段：

`key_frames`

逻辑值：

```text
[35, 108, 246]
```

规则：

1. 全部使用 1-based；
2. 只允许正整数；
3. 不允许重复帧；
4. 默认按时间升序保存；
5. 超出视频总帧数的 Marker 在加载视频元数据后必须显式修复或拒绝，不能静默解码错误帧；
6. 切换视频时不能把旧视频 Marker 悄悄套到新视频上。

### 5.2 推荐序列化方式

V2 实施前优先评估：

> 后端标准 `STRING` 输入 `key_frames`，值使用紧凑 JSON 数组，例如 `[35,108,246]`。

前端 Marker UI 负责读写该标准 widget；视觉 Marker DOM 本身继续不序列化。

原因：

- 能进入 workflow JSON；
- 能进入 API prompt；
- 后端 Queue 时可以直接取得 Marker；
- 不依赖 DOM 保存；
- 不需要建立 WorkspaceKit 私有工作流存储结构。

若未来 ComfyUI 提供更合适的官方列表型输入，再评估是否迁移；在没有明确迁移方案前，不擅自改变已发布格式。

---

## 6. 切换视频时的 Marker 策略

这是 V2 实施前必须专项确认的风险点。

推荐默认行为：

1. 用户切换 `video`；
2. 如果当前 `key_frames` 非空，前端必须清空 Marker；
3. 该清空与视频切换属于同一次明确用户变更；
4. 不能把 A 视频的 Frame 35 / 108 / 246 自动解释成 B 视频的相同帧号。

未来如果需要“跨视频保留标记”，应该建立视频指纹 / 文件身份数据后再讨论，不在 V2 默认实现。

---

## 7. 后端架构

V1 已提前完成 V2 所需核心：

`service/video_frame_service.py`

### 7.1 已存在

```text
decode_frame_indices(video, indices)
frames_to_image_tensor(frames)
```

V1：

```text
decode_frame_indices(video, [85])
        ↓
IMAGE Batch [1]
        ↓
frame_image
```

V2：

```text
decode_frame_indices(video, [35,108,246])
        ↓
IMAGE Batch [3]
        ↓
batch_key_image
```

因此 V2 不应另写：

- 第二套 Marker 解码器；
- 第二套 IMAGE Batch 转换器；
- 动态数量 IMAGE 输出口。

### 7.2 Batch 顺序

`batch_key_image` 默认按照 Marker 的升序帧号输出：

```text
key_frames = [35,108,246]

batch_key_image[0] = Frame 35
batch_key_image[1] = Frame 108
batch_key_image[2] = Frame 246
```

顺序必须可预测。

---

## 8. 空 Marker 的输出语义

这是 V2 实施时必须先定的事项，V1 不提前暴露 `batch_key_image` 就是为了避免现在制造错误合同。

推荐优先方案：

> 如果没有任何 Marker，Queue 时明确报出可理解的验证信息，而不是制造伪造的空 IMAGE Tensor。

例如：

```text
No key frames selected. Add at least one Marker before using batch_key_image.
```

但实施前必须检查 ComfyUI 对“可选 IMAGE 输出 / 空 batch / 未连接输出”的当前行为，再决定最终策略。

不要在没有验证的情况下：

- 输出当前帧冒充 Marker Batch；
- 输出尺寸为 0 的 IMAGE Tensor；
- 用黑图占位。

---

## 9. V2 Timeline 行为

### 9.1 Playhead

继续保持：

- 点击 Timeline → Playhead 跳转；
- 拖 Playhead → 实时找帧；
- pointermove 只预览；
- pointerup 才提交；
- `◀ 1` / `1 ▶` 逐帧。

### 9.2 Marker

推荐：

- Marker 点击：更新 Playhead，并提交对应 `frame_index`；
- 添加 Marker：只修改 `key_frames`；
- 删除 Marker：只修改 `key_frames`；
- 添加 / 删除属于一次正常 dirty transaction；
- 纯 Hover / 预览不 dirty。

### 9.3 键盘操作

V2 可考虑但不是必须：

- `M`：切换当前帧 Marker；
- `Delete`：删除当前激活 Marker。

只有确认不会抢占 ComfyUI 官方快捷键后才启用。

---

## 10. 缩略图策略

V2 继续复用 V1 的 sparse Filmstrip：

- 默认约 12 张浏览器缩略图；
- 缩略图是导航地图，不代表每帧；
- 不把所有视频帧作为 IMAGE batch 加载到前端；
- 不因 Marker 增加而生成更多完整视频帧；
- Marker 图标叠加在 Timeline，不复制缩略图数据。

如未来需要长视频精细查找，可单独讨论 Timeline zoom / virtualized thumbnails；不属于 V2 基线。

---

## 11. 性能与缓存

V2 实施时重点验证：

### 前端

- Marker 数量 1 / 10 / 50 / 100 的 Timeline 绘制；
- 切换视频时旧 thumbnail task 是否正确废弃；
- 节点删除时 listener / video / canvas 是否正确清理；
- Marker DOM 不进入 workflow JSON。

### 后端

当前 `decode_frame_indices()` 为一次顺序解码多个目标帧。

对 AI 常见 5–30 秒视频足够合理。

如果未来真实测试发现：

- 超长视频；
- 数百 Marker；
- 后段随机帧解码耗时明显；

再评估 seek + ordered decode / cache，不在 V2 未测前提前优化。

---

## 12. 文件级实施建议

V2 应优先扩展现有文件，不新增第二套平行系统。

预计主要修改：

```text
wk_nodes/video_frame_picker.py
service/video_frame_service.py

entry/wk_video_frame_picker.js
entry/nodes/video-frame-picker-model.js

scripts/test-wk-video-frame-service.py
scripts/test-wk-video-frame-picker-ui.mjs

scripts/e2e/wk-video-frame-picker.mjs
scripts/e2e/wk-video-frame-picker-save-reload.mjs

README.md
README.zh-CN.md
docs/TESTING.md
docs/THIRD_PARTY_NOTICES.md
```

原则：

- 不新建 `Video Key Frame Picker` 第二节点；
- 不复制一套 Marker backend；
- 不重写 V1 Filmstrip；
- V2 是同一节点的兼容扩展。

---

## 13. 兼容与迁移

V2 必须保证旧 V1 workflow 可直接打开。

旧 V1：

```text
video
frame_index
```

V2 如果新增：

```text
key_frames
```

必须提供合理默认值：

```text
[]
```

旧工作流：

- 不需要人工迁移；
- `frame_image` 仍在 output 0；
- 原 `frame_index` 原样恢复；
- Marker UI 显示为空；
- 保存一次后才写入新的 Marker 状态。

---

## 14. Nodes 2.0 / Legacy 约束

V2 继续遵守 WorkspaceKit 现有规范：

- 使用 `app.registerExtension()`；
- 使用正式 DOM widget 路径；
- 不 patch LiteGraph / ComfyNode prototype；
- 不依赖私有 Vue store；
- DOM 不可用时 fail-open；
- Marker 状态必须通过标准 widget / workflow 序列化；
- 每个公开行为都分别跑 Legacy 与 Nodes 2.0。

---

## 15. V2 最低验收矩阵

### 数据

- V1 工作流打开无迁移错误；
- `key_frames` 1-based；
- Marker 去重；
- Marker 升序；
- 保存 / 刷新精确恢复；
- 切视频 Marker 不串用。

### UI

- 添加 Marker；
- 删除 Marker；
- 清空 Marker；
- Timeline 正确显示 Marker；
- 点击 Marker 跳到准确帧；
- Playhead 拖动仍不连续 dirty；
- Marker 变更只触发一次正常事务。

### 输出

- `frame_image` 与 V1 完全一致；
- `batch_key_image` Batch 数量 = Marker 数量；
- Batch 顺序 = Marker 时间顺序；
- 每一张 Batch 图与对应帧一致；
- 1 个 Marker 时 `batch_key_image` 仍是 Batch[1]；
- 空 Marker 行为按正式合同验证。

### 回归

必须继续通过：

- Legacy；
- Nodes 2.0；
- 保存 / 刷新；
- workflow dirty-state；
- Utility Nodes；
- Number Generator；
- T-058；
- `npm.cmd test`；
- Python / JS syntax；
- plugin import。

---

## 16. V2 建议实施阶段

### Phase A — Marker 数据层

只加入：

- `key_frames` 数据；
- 解析 / 校验 / 去重 / 排序；
- workflow 保存恢复；
- 不开放 `batch_key_image`。

先证明状态模型可靠。

### Phase B — Marker Timeline UI

启用 V1 已预留的 `marker-layer`：

- 添加；
- 删除；
- 点击跳转；
- 清空。

重点验证 dirty transaction 与 Legacy / Nodes 2.0。

### Phase C — `batch_key_image`

复用：

```text
decode_frame_indices()
frames_to_image_tensor()
```

追加 output 1：

`batch_key_image`

验证多帧 IMAGE Batch。

### Phase D — 人工体验与收口

只根据真实使用调整：

- Marker 尺寸；
- Marker 命中范围；
- Timeline 密度；
- 按钮位置；
- 是否需要 `key_image`。

不要在人工体验前继续扩大功能。

---

## 17. 明确不在 V2

以下能力未来即使需要，也应独立讨论，不自动塞进 V2：

- `batch_frame_image` 普通批量抽帧；
- 等间隔抽帧；
- 范围抽帧；
- In / Out；
- Trim；
- Cut；
- Timeline zoom；
- timeline pan；
- 多轨；
- 音频波形；
- 速度；
- 转场；
- 字幕；
- 视频导出；
- 完整 NLE。

如果这些需求开始大量出现，应重新评估是否应该做独立节点，而不是让 Frame Picker 变成剪辑器。

---

## 18. 冻结结论

未来重新启动 V2 时，默认从以下结论开始，不重新从零讨论：

1. 节点继续使用 `WK Video Frame Picker`；
2. `frame_image` 是 output 0，永久保持当前帧语义；
3. 帧编号永久使用 1-based；
4. Playhead pointermove 只预览，pointerup 才提交；
5. V2 核心新增能力是 Marker；
6. V2 核心新增输出是 `batch_key_image`；
7. `key_image` 是保留名，只有出现独立 Active Key 语义时才新增；
8. `batch_frame_image` 保留给未来普通批量抽帧，不属于 Marker；
9. Marker 推荐持久化为标准 `key_frames` 数据，不把视觉 DOM 当存储；
10. V1 已建立的多帧解码与 IMAGE Batch helper 直接复用；
11. 输出 append-only，不重排已发布端口；
12. 不把节点发展成视频剪辑器；
13. 所有 V2 行为必须重新通过 Legacy + Nodes 2.0 + 保存刷新 + dirty-state 实测。
