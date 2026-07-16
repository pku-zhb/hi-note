<div align="center">
	<h1>HiNote - 高亮文本添加评论</h1>
	<img src="https://img.shields.io/github/downloads/CatMuse/HiNote/total" alt="GitHub Downloads (all assets, all releases)" />
	<img src="https://img.shields.io/github/v/release/CatMuse/HiNote" alt="GitHub release (latest by date)" />
	<img src="https://img.shields.io/github/last-commit/CatMuse/HiNote" alt="GitHub last commit" />
	<img src="https://img.shields.io/github/issues/CatMuse/HiNote" alt="GitHub issues" />
	<img src="https://img.shields.io/github/stars/CatMuse/HiNote?style=social" alt="GitHub stars" />
</div>

---

简体中文 | [English](./README.md)

这个 HiNote 定制版本能够自动提取笔记中的高亮文本、添加评论，并将高亮以知识卡片图片直接复制到剪贴板。

> 本分支基于 HiNote 0.5.5，已主动移除全部 AI、聊天、HiCard、FSRS、许可证、激活和笔记导出代码；仅保留高亮、评论和图片复制功能。

👇🏻 点击图片查看视频教程

[![HiNote Plugin Tutorial](https://img.youtube.com/vi/c1mxMGi1ZEk/maxresdefault.jpg)](https://www.youtube.com/watch?v=c1mxMGi1ZEk)

---

## ✨ 核心特性

🎯 自动提取多种格式的高亮文本 | 📝 为高亮添加评论和笔记 | 📸 将精美知识卡片复制到剪贴板

---

## 高亮文本获取

当打开包含高亮文本的笔记时，侧边栏会自动获取高亮文本以卡片的样式展示。支持以下三种格式的高亮标记：`==`、`<mark>`、`<span>`。同时支持设置正则表达式来自定义获取格式。

![高亮文本检索](./doc/highlighted-text-retrieval.jpg)

---

## 高亮评论

高亮评论功能让你能够快速与高亮文本进行对话，防止灵感稍纵即逝。只需点击编辑区的 Widgets 或直接在选中的高亮卡片上点击添加评论按钮，即可打开评论输入框。

笔记评论功能让你可以不依赖于任何高亮文本为整个文件添加你的思考。点击搜索栏右侧添加文件评论即可在高亮列表最顶部打开评论输入框。

>  所有评论和高亮数据都会保存在你自己知识库根目录的 `.hinote` 文件夹中，数据完全由你自行掌控。

---

## 导出为图片

点击高亮卡片上的图片按钮，使用默认模板生成知识卡片并直接复制到剪贴板。

![导出为图片](./doc/export-image.jpg)

---

## 主视图的扩展功能

将右侧侧边栏窗口拖动到主视图，可以解锁包含高亮文本的笔记列表和全部高亮卡片等功能。

- 笔记列表：显示知识库中所有包含高亮卡片的笔记，并显示高亮数量;
- 全部高亮：展示知识库中所有高亮卡片，让你更专注地查看高亮知识;

![主视图](./doc/main-view.jpg)

---

## 支持

如果你觉得这个插件很有用，你也可以支持插件的开发：

- [在 Ko-fi 上买我一杯咖啡](https://ko-fi.com/catmuse)
- 给项目点个 ⭐ 星，以表达你的支持！

---

## 许可证

这个定制版本采用 MIT 许可证发布，不包含任何需要许可证的运行时代码。
