# 将复制正文保存为文件快照

Type: grilling
Status: resolved

## 问题

复制历史是否应存入 SQLite，还是保存为文件？

## 答案

完整复制正文以文件快照保存，不放入 SQLite。SQLite 是为应用未来其他功能的结构化数据存储作准备；本次功能的设置配置通过设置弹窗读写 SQLite。每条历史记录由元数据 `.meta.json` 和原样正文 `.md` 两个文件组成，详见 [issue 20](20-history-file-layout.md)。
