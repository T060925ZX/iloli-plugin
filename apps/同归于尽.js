const userCooldowns = new Map();
 
export class MutualDestruction extends plugin {
  constructor() {
    super({
      name: "同归于尽",
      dsc: "与目标同归于尽",
      event: "message.group",
      priority: 500,
      rule: [
        {
          reg: "^#同归于尽",
          fnc: "mutualDestruction"
        }
      ]
    });
  }

  async mutualDestruction(e) {
    try {
      // 检查CD
      const now = Date.now();
      const lastUsed = userCooldowns.get(e.user_id);
      const cooldownTime = 25 * 60 * 1000; // 2分钟CD（毫秒）
      
      if (lastUsed && now - lastUsed < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
        await e.reply(`⏳ 技能冷却中，请等待 ${remaining} 秒后再试`, { quote: true });
        return;
      }

      // 检查机器人权限
      const group = this.e.bot.pickGroup(this.e.group_id);
      const botIsOwner = group.is_owner;
      const botIsAdmin = group.is_admin;

      if (!botIsAdmin && !botIsOwner) {
        await e.reply("❌ 机器人需要管理员或群主权限才能执行禁言");
        return;
      }

      // 获取发起人权限
      const sender = await e.group.getMember(e.user_id);
      const senderIsOwner = sender?.is_owner;
      const senderIsAdmin = sender?.is_admin;

      // 获取目标用户
      let targetId = e.at;
      if (!targetId) {
        await e.reply("请先@你要同归于尽的对象", { quote: true });
        return;
      }

      // 不能对自己使用
      if (targetId === e.user_id) {
        await e.reply("❌ 不能和自己同归于尽哦", { quote: true });
        return;
      }

      // 获取目标成员信息
      const targetMember = await e.group.getMember(targetId);
      if (!targetMember) {
        await e.reply("❌ 找不到目标用户", { quote: true });
        return;
      }

      // 获取目标权限
      const targetIsAdmin = targetMember.is_admin;
      const targetIsOwner = targetMember.is_owner;

      // 获取目标昵称
      let targetName = targetMember.card || targetMember.nickname || targetId;

      // 禁言时间 (30-90秒)
      const muteTime = Math.floor(Math.random() * 61) + 30; // 30-90秒
      const seconds = muteTime % 60;
      const showTime = muteTime > 60 ? 
        `${Math.floor(muteTime/60)}分${seconds}秒` : 
        `${muteTime}秒`;

      // 根据权限决定执行逻辑
      let resultMsg = "";
      
      // 情况1：双方都是管理员 - 随机逻辑
      if (senderIsAdmin && targetIsAdmin) {
        const random = Math.random();
        const resultType = random < 0.34 ? "both" : random < 0.67 ? "self" : "target";

        switch (resultType) {
          case "both":
            await Promise.all([
              e.group.muteMember(e.user_id, muteTime),
              e.group.muteMember(targetId, muteTime)
            ]);
            resultMsg = `⚔️ 管理员对决！\n你和 ${targetName} 一起被禁言 ${showTime}`;
            break;
            
          case "self":
            await e.group.muteMember(e.user_id, muteTime);
            resultMsg = `😵 管理员内战！\n你被禁言 ${showTime}\n${targetName} 安然无恙`;
            break;
            
          case "target":
            await e.group.muteMember(targetId, muteTime);
            resultMsg = `🎯 管理员对决！\n${targetName} 被禁言 ${showTime}\n你毫发无伤`;
            break;
        }
      }
      // 情况2：发起人是群主
      else if (senderIsOwner) {
        await e.group.muteMember(targetId, muteTime);
        resultMsg = `👑 群主制裁！\n${targetName} 被禁言 ${showTime}`;
      } 
      // 情况3：发起人是管理员且机器人是管理员
      else if (senderIsAdmin && botIsAdmin) {
        await e.group.muteMember(targetId, muteTime);
        resultMsg = `🛡️ 管理员执行！\n${targetName} 被禁言 ${showTime}`;
      }
      // 情况4：机器人是群主，正常随机逻辑
      else if (botIsOwner) {
        const random = Math.random();
        const resultType = random < 0.34 ? "both" : random < 0.67 ? "self" : "target";

        switch (resultType) {
          case "both":
            await Promise.all([
              e.group.muteMember(e.user_id, muteTime),
              e.group.muteMember(targetId, muteTime)
            ]);
            resultMsg = `💥 同归于尽成功！\n你和 ${targetName} 一起被禁言 ${showTime}`;
            break;
            
          case "self":
            await e.group.muteMember(e.user_id, muteTime);
            resultMsg = `😵 出师未捷身先死！\n你被禁言 ${showTime}\n${targetName} 安然无恙`;
            break;
            
          case "target":
            await e.group.muteMember(targetId, muteTime);
            resultMsg = `🎯 精准打击！\n${targetName} 被禁言 ${showTime}\n你毫发无伤`;
            break;
        }
      }
      // 情况5：无权限
      else {
        await e.reply("❌ 你没有足够的权限使用此功能", { quote: true });
        return;
      }

      // 更新CD时间
      userCooldowns.set(e.user_id, now);

      // 发送结果
      await e.reply([
        resultMsg,
        `⏳ 解禁时间: ${new Date(now + muteTime * 1000).toLocaleTimeString()}`,
        `🔄 技能冷却：2分钟`
      ].join("\n"), { quote: true });

    } catch (err) {
      console.error("同归于尽出错:", err);
      await e.reply("❌ 同归于尽失败，请稍后再试", { quote: true });
    }
  }
}