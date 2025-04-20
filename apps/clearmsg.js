export class RecallReply extends plugin {
    constructor() {
      super({
        name: "回复撤回",
        dsc: "撤回回复消息",
        event: "message",
        priority: -Infinity,
        rule: [
          {
            reg: `^#?(清|清理|清除|清空)(屏|屏幕|记录|历史)(\\d+)?$`,
            fnc: "recall"
          }
        ]
      });
    }
  
    async recall(e) {
      if (!e.isMaster && !["admin", "owner"].includes(e.sender.role)) {
        e.reply('我就喵一下，你懂我意思吧~₍˄·͈༝·͈˄*₎◞ ̑̑');
        return true;
      }
  
      const message = (e.msg || e.original_msg || e.raw_message) + '';
      const match = message.match(/^#?(清|清理|清除|清空)(屏|屏幕|记录|历史)(\d+)?$/u);
      const limit = match ? Number(match[3]) || 10 : 10;
      const maxLimit = 150;
  
      if (limit > maxLimit) {
        e.reply(`清屏数量过大，已自动调整为${maxLimit}条`, { recallMsg: 15 });
        limit = maxLimit;
      }
  
      if (!e.seq) {
        e.reply('没有找到开始消息Seq,已取消执行~', { recallMsg: 15 });
        return true;
      }
  
      const startTime = Date.now();
      const messagesToRecall = [];
      for (let i = e.seq; i >= e.seq - limit; i--) {
        const msg = (await e.group.getChatHistory(i, 1)).pop();
        if (msg) {
          messagesToRecall.push(msg.message_id);
        }
      }
  
      if (messagesToRecall.length === 0) {
        e.reply('没有历史消息喵~已取消执行', { recallMsg: 15 });
        return true;
      }
  
      e.reply(`[得到最近${messagesToRecall.length}条]消息，清屏开始执行，请确保我有管理权限，只会撤回权限低于我的用户消息~`, { recallMsg: 15 });
  
      for (const messageId of messagesToRecall) {
        await CheMsg(e, messageId);
        await Sleep(140);
      }
  
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      e.reply(`[iloli清屏]\n消息:${messagesToRecall.length}条\n用时:${duration}秒`);
      return true;
    }
  }
  
  async function Sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function CheMsg(context, messageId) {
    await context.group.recallMsg(messageId);
  }
  