Bot.on("message.group", e => {
  if (/.*有.*吗.*/.test(e.raw_message)) { 
    (new HaveReply()).reply(e);
  }
});

export class HaveReply extends plugin {
  constructor() {
    super({
      name: "有的兄弟,有的",
      event: "message",
      priority: -114514,
      rule: []
    });
  }

  reply(e) {
    // 排除机器人自己的消息
    if (e.user_id === this.client.uin) return;
    
    // 排除指令消息（以#或/开头）
    if (/^[#/]/.test(e.raw_message)) return;
    
    // 发送回复
    let ID = e.group_id;
    Bot.pickGroup(ID).sendMsg("有的兄弟，有的");
    
    // 调试用：打印匹配到的原始消息
    logger.warn("匹配到消息:", e.raw_message);
  }
}
