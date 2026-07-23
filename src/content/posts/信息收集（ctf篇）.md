---
title: 信息收集（ctf篇）
published: 2026-07-23
description: CTF信息收集技巧与常见泄露路径
category: 信息安全
draft: false
---

# 信息收集（ctf篇）

## 基础操作与查看源码

1. 直接右键查看源代码，寻找HTML注释
2. 禁用菜单：可以用快捷键 `Ctrl+U` （Windows）或者在网址前加上 `view-source:`查看源代码，也可以用**js禁用**
3. HTTP响应存在Flag（F12中的网络或者抓包）

## 常见的泄露路径

1. 访问**/robots.txt**，这个文件告诉搜索引擎哪些目录不能爬，但反过来也可能暴露敏感路径
2. 访问 `/index.phps`，服务器会返回PHP源码文件
3. 访问 `/www.zip`，下载网站的备份压缩包，解压查看源码
4. 访问 `/.git/`，这是Git版本控制系统的目录。版本控制很重要，但不要部署到生产环境更重要。
5. 访问 `/.svn/`，与web7类似，是SVN版本控制系统的泄露
6. 访问 `/index.php.swp`，这是Linux下用`vim`编辑器意外退出时留下的缓存文件，其中可能包含源码片段

## 页面信息

1. `Cookie`字段
2. 对域名 `flag.ctfshow.com` 进行DNS查询，可以通过在线工具或命令 `nslookup`或者用`dig` (更加详细，会更新dns)查看其DNS记录
3. 先访问 `/admin` 找到后台登录页。账号通常为`admin`，有时候网站上的公开信息，就是管理员常用密码。
4. "技术文档"（document）中出现敏感信息。

##  **编辑器/组件默认配置风险**

1. 访问 `/editor`，这是一个富文本编辑器的目录。利用其文件管理功能，可以通过"图片空间"遍历目录

## 信息相关

1. 公开的信息比如邮箱，在/admin的页面中尝试登入

## 服务器/应用配置信息泄露

1. 访问探针文件 `/tz.php`，

##  JavaScript与前端逻辑绕过

查看页面JS源码,在函数和加密过的数据包进行操作

## 工具

1. `nslookup`或`dig`:DNS查询
2. `dirsearch`:目录遍历，可以用字典`-w bicc.txt`(用绝对路径)或者用**SecLists** （更全面的字典集合）
3. AES加密网站：https://www.toolhelper.cn/SymmetricEncryption/AES



## 思路

1. **先看源码和抓包**：`Ctrl+U` 和 F12 是肌肉记忆。
2. **目录扫描**：用`dirsearch`等工具扫一遍
3. **记住常见"暗号"**：`robots.txt`, `www.zip`, `.git`, `.svn`, `.swp`, `tz.php`, `backup.sql`, `/db/db.mdb`
4. **页面上的任何文字**：电话、邮箱、QQ号、文档链接，都可能是突破的关键
5. **前端逻辑不等于后端逻辑**：JS的加密和校验都是可以绕过的，尤其是密钥暴露在前端的时候
