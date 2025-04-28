const groupCooldowns = new Map();

export class RandomMute extends plugin {
  constructor() {
    super({
      name: "天选之人",
      dsc: "随机选择一名群成员禁言",
      event: "message.group",
      priority: 500,
      rule: [
        {
          reg: "^#天选之人$",
          fnc: "randomMute"
        }
      ]
    });
  }

  async randomMute(e) {
    try {
      // 检查CD（5分钟）
      const now = Date.now();
      const lastUsed = groupCooldowns.get(e.group_id);
      const cooldownTime = 5 * 60 * 1000; // 5分钟CD（毫秒）
      
      if (lastUsed && now - lastUsed < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        await e.reply(`⏳ 技能冷却中，请等待 ${minutes}分${seconds}秒后再试`);
        return;
      }

      // 检查机器人权限
      const group = this.e.bot.pickGroup(this.e.group_id);
      if (!group.is_admin && !group.is_owner) {
        await e.reply("❌ 机器人需要管理员或群主权限才能执行禁言");
        return;
      }

      // 获取群成员列表
      const memberMap = await e.group.getMemberMap();
      const members = Array.from(memberMap.values());
      
      if (members.length === 0) {
        await e.reply("❌ 获取群成员失败");
        return;
      }

      // 过滤掉机器人自己和其他机器人
      const validMembers = members.filter(member => 
        member.user_id !== e.bot.uin && !member.is_robot
      );

      if (validMembers.length === 0) {
        await e.reply("❌ 没有可禁言的成员");
        return;
      }

      // 随机选择一名成员
      const randomIndex = Math.floor(Math.random() * validMembers.length);
      const target = validMembers[randomIndex];
      
      // 生成随机禁言时间（60-900秒）
      const muteTime = Math.floor(Math.random() * 841) + 60;
      const muteMinutes = Math.floor(muteTime / 60);
      const muteSeconds = muteTime % 60;
      
      // 执行禁言
      await e.group.muteMember(target.user_id, muteTime);
      
      // 更新CD时间
      groupCooldowns.set(e.group_id, now);

      // 发送结果
      const name = target.card || target.nickname || target.user_id;
      const role = target.is_owner ? "群主" : target.is_admin ? "管理员" : "成员";
      await e.reply([
        `🎲 天选之人已选出：${name}`,
        `👑 身份：${role}`,
        `⏳ 随机禁言时长：${muteMinutes}分${muteSeconds}秒`,
        `🕒 解禁时间：${new Date(now + muteTime * 1000).toLocaleTimeString()}`,
        `🔄 技能冷却：5分钟`
      ].join("\n"));
      
    } catch (err) {
      console.error("随机禁言出错:", err);
      await e.reply("❌ 随机禁言失败，请稍后再试");
    }
  }
}