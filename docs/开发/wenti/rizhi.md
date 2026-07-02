[INFO] 07-01 14:35:34 test.py  [line:224] 登录省系统成功
[DEBUG] 07-01 14:35:34 获取对应省信息.py  [line:19] 正在查询所有cookie...
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:20] SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl
[DEBUG] 07-01 14:35:34 获取对应省信息.py  [line:21] 正在分割字符串...
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:22] ['SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl']
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:23] SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:61] 流程出错：list index out of range
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:62] 再给一次机会
[DEBUG] 07-01 14:35:34 获取对应省信息.py  [line:19] 正在查询所有cookie...
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:20] SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl
[DEBUG] 07-01 14:35:34 获取对应省信息.py  [line:21] 正在分割字符串...
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:22] ['SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl']
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:23] SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:61] 流程出错：list index out of range
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:62] 再给一次机会
[INFO] 07-01 14:35:34 test.py  [line:265] 主流程错误:local variable 'SESSION' referenced before assignment
[DEBUG] 07-01 14:35:34 test.py  [line:273] 正在关闭浏览器...



---

[INFO] 07-01 14:35:34 test.py  [line:222] True
[INFO] 07-01 14:35:34 test.py  [line:224] 登录省系统成功
[DEBUG] 07-01 14:35:34 获取对应省信息.py  [line:19] 正在查询所有cookie...
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:20] SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl
[DEBUG] 07-01 14:35:34 获取对应省信息.py  [line:21] 正在分割字符串...
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:22] ['SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl']
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:23] SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:61] 流程出错：list index out of range
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:62] 再给一次机会
[DEBUG] 07-01 14:35:34 获取对应省信息.py  [line:19] 正在查询所有cookie...
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:20] SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl
[DEBUG] 07-01 14:35:34 获取对应省信息.py  [line:21] 正在分割字符串...
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:22] ['SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl']
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:23] SESSION=MzE3ZDc2MDYtZGQxOS00MjI3LTg2MzMtMmZiMzAyYTNlYWZl
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:61] 流程出错：list index out of range
[INFO] 07-01 14:35:34 获取对应省信息.py  [line:62] 再给一次机会
[INFO] 07-01 14:35:34 test.py  [line:265] 主流程错误:local variable 'SESSION' referenced before assignment
[DEBUG] 07-01 14:35:34 test.py  [line:273] 正在关闭浏览器...

---

openstack_cookie_insert


---
会出现这个原因是因为现在的流程以及没有openstack_cookie_insert，我想要你删除掉服务端流程的openstack_cookie_insert相关内容

相关文件夹，请你聚焦省系统扫码登陆服务端