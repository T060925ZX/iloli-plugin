import { message } from "oicq"

Bot.on("message.group", e => {
  const message = e?.message?.[0]?.text;
  if (message && (message.match(/(.*)?有(.*)?(吗|嘛)(.*)?/) || message.match(/(.*)?有没(.*)?/))) {
    (new Huifu()).huifu(e);
  }
});

export class Huifu extends plugin {
  constructor() {
    super({
      name: "有的兄弟，有的",
      event: "message",
      priority: -114514,
      rule: []
    });
  }

  huifu(e) {
    // 实现随机回复逻辑
    let ID = e.group_id;
    Bot.pickGroup(ID).sendMsg('有的兄弟，有的');
  }
}
