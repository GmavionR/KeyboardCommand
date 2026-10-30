# 大目录按需分批加载

Type: grilling
Status: resolved

## 问题

树形目录如何处理子项很多或层级很深的目录？

## 答案

目录按需加载。单个文件夹的直接子项超过 50 个时默认视为大目录；该阈值可在统一设置弹窗中配置。超过阈值后按树内追加方式分批加载，并提供“加载更多”操作。设置保存后重新加载当前文件夹。交互及数量细节分别见 [票据 11](11-large-directory-threshold-prototype.md) 和 [票据 28](28-large-directory-batch-size.md)。
