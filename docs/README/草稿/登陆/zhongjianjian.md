# 省系统扫码登录中间件 - 流程图

以下是中间件在 `127.0.0.1:13001` 上监听并轮询分发服务端端口的 Mermaid 流程图：

```mermaid
graph TD
    classDef init fill:#e1f5fe,stroke:#039be5,stroke-width:2px;
    classDef loop fill:#fff3e0,stroke:#ffb74d,stroke-width:2px;
    classDef action fill:#e8f5e9,stroke:#4caf50,stroke-width:2px;

    Start([开始运行中间件]) --> InitSock["1. 创建 Socket 对象 <br/> sock = socket.socket()"]:::init
    InitSock --> BindSock["2. 绑定本地回路端口 <br/> sock.bind('127.0.0.1', 13001)"]:::init
    BindSock --> ListenSock["3. 开始监听连接请求 <br/> sock.listen(5)"]:::init
    
    ListenSock --> LoopStart{4. while True <br/> 常驻外层循环}:::loop
    LoopStart --> ForPort[5. for 端口 in 服务端端口列表 <br/> 遍历切分后的端口列表]:::loop
    ForPort --> AcceptConn["6. sock.accept() <br/> 阻塞等待客户端发起 TCP 连接"]:::action
    AcceptConn --> RecvData["7. conn.recv(4096) <br/> 接收客户端消息并 UTF-8 解码"]:::action
    RecvData --> LogAlloc[8. 打印日志 <br/> 记录本次分配的端口号]:::action
    LogAlloc --> SendPort["9. conn.send() <br/> 发送分配的端口给客户端"]:::action
    SendPort --> LoopNext[10. 本次连接处理完成 <br/> 移动指针指向列表中下一个端口]:::loop
    
    LoopNext --> ForPort
```

---

1.用于给客户端可用的服务端接口 2.给与之后就会断开 3.断开之后会继续检测端口列表 4.分配的端口池通过【for 端口 in 服务端端口列表.replace('，',',').replace(' ','').split(',')】进行切割得到【'13002','13003'】 5.轮询分配端口 

