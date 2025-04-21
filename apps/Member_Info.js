import axios from "axios";
import moment from "moment";

export class QQInfoPlugin extends plugin {
  constructor() {
    super({
      name: 'QQ信息查询',
      dsc: '查询QQ信息及同群信息',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: /^(#|\/)?找(QQ|qq)?(信息)?(\s+)?(\d+)?$/,
          fnc: 'searchQQInfo'
        }
      ]
    });
  }

  // 查找QQ信息及同群信息
  async searchQQInfo(e) {
    const match = e.msg.match(/^(#|\/)?找(QQ|qq)?(信息)?(\s+)?(\d+)?$/);

    // 如果消息中包含@，则优先使用@的QQ号，否则使用匹配的QQ号
    let qqNumber = e.at || (match && match[5] ? match[5].trim() : null);

    // 检查qqNumber是否为字符串并包含非数字字符，清除掉
    if (qqNumber && typeof qqNumber === 'string') {
      qqNumber = qqNumber.replace(/\D/g, '');  // 只保留数字
    }

    // 检查qqNumber是否为空
    if (!qqNumber) {
      await e.reply('你都没说你要查谁，我咋查！', { quote: true });
      return; // 终止函数执行
    }

    // 获取QQ信息
    const qqInfo = await this.getQQInfo(qqNumber);
    if (!qqInfo) {
      await e.reply('无法获取QQ信息，请重试');
      return;
    }

    // 获取同群信息
    const groupInfos = await this.getGroupInfos(qqNumber);

    // 构建转发消息
    const msgList = [];
    msgList.push({
      user_id: e.user_id,
      message: qqInfo
    });

    if (groupInfos.length > 0) {
      groupInfos.forEach(groupInfo => {
        msgList.push({
          user_id: e.user_id,
          message: groupInfo
        });
      });
    } else {
      msgList.push({
        user_id: e.user_id,
        message: `未在其他群内发现该用户 ${qqNumber}`
      });
    }

    // 创建转发消息
    let msg;
    try {
      msg = await e.group.makeForwardMsg(msgList);
    } catch {
      msg = await e.friend.makeForwardMsg(msgList);
    }

    await e.reply(msg);
  }

  // 获取QQ信息
  async getQQInfo(qqNumber) {
    try {
      const response = await axios.get(`http://jiuli.xiaoapi.cn/i/qq/qq_level.php?qq=${qqNumber}`);
      const data = response.data;
      if (data && data.code === 200) {
        return `=========个人信息=========
QQ: ${data.qq}
QID: ${data.qid}
昵称: ${data.name}
头像最后修改: ${data.sFaceTime}
等级: ${data.level}
等级图标: ${data.icon}
加速倍数: ${data.Accelerate}
成长值: ${data.iGrowthValue}
成长速度/天: ${data.iGrowthSpeed}
是否VIP: ${data.iVip}
是否SVIP: ${data.iSVip}
VIP等级: ${data.iVipLevel}
活跃时长(天): ${data.iTotalActiveDay}
下个等级需要天数: ${data.iNextLevelDay}
VIP到期时间: ${data.sVipExpireTime}
SVIP到期时间: ${data.sSVipExpireTime}
年费到期时间: ${data.sYearExpireTime}
是否大会员: ${data.XVip}
是否年费大会员: ${data.NXVip}
大会员等级: ${data.XVipLevel}
大会员成长值: ${data.XVipGrowth}
大会员成长速度/天: ${data.XVipSpeed}
昨天是否在线满1.0天: ${data.iYesterdayLogin}
今天是否在线满1.0天: ${data.iTodayLogin}
今日电脑QQ在线时长: ${data.iPCQQOnlineTime}
今日已加速*天: ${data.iRealDays}
今日最多加速*天: ${data.iMaxLvlRealDays}
注册时间: ${data.RegistrationTime}
注册时长: ${data.RegTimeLength}
IP属地(仅供参考): ${data.ip_city}`;
      } else {
        return null;
      }
    } catch (err) {
      logger.error(`[QQ信息] 查询失败: ${err.message}`);
      return null;
    }
  }

  // 获取同群信息
  async getGroupInfos(qqNumber) {
    const groupList = Array.from(this.e.bot.gl.values());
    const tasks = groupList.map(group => {
      return (async () => {
        try {
          const groupId = group.group_id;
          const groupObj = this.e.bot.pickGroup(groupId);
          const memberMap = await groupObj.getMemberMap();

          // 检查群聊成员是否包含目标QQ号
          if (memberMap.has(Number(qqNumber))) {
            const info = await groupObj.getInfo();
            const memberInfo = await groupObj.pickMember(qqNumber).getInfo();

            // 将时间戳转换为可读的日期格式
            info.last_join_time = moment(info.last_join_time * 1000).format('YYYY-MM-DD HH:mm:ss');
            info.shutup_time_whole = info.shutup_time_whole === 0 ? '无' : moment(info.shutup_time_whole * 1000).format('YYYY-MM-DD HH:mm:ss');
            info.shutup_time_me = info.shutup_time_me === 0 ? '无' : moment(info.shutup_time_me * 1000).format('YYYY-MM-DD HH:mm:ss');
            info.update_time = moment(info.update_time * 1000).format('YYYY-MM-DD HH:mm:ss');
            info.last_sent_time = moment(info.last_sent_time * 1000).format('YYYY-MM-DD HH:mm:ss');
            info.create_time = moment(info.create_time * 1000).format('YYYY-MM-DD HH:mm:ss');

            // 美化输出格式
            return `=========群组信息=========
 - 群ID: ${info.group_id}
 - 群名称: ${info.group_name}
 - 成员数量: ${info.member_count}
 - 最大成员数量: ${info.max_member_count}
 - 群主ID: ${info.owner_id}
 - 最后加入时间: ${info.last_join_time}
 - 全体禁言时间: ${info.shutup_time_whole}
 - 管理员标志: ${info.admin_flag ? '是' : '否'}
 - 更新时间: ${info.update_time}
 - 最后发言时间: ${info.last_sent_time}
 - 创建时间: ${info.create_time}
 - 群等级: ${info.grade}
 - 最大管理员数量: ${info.max_admin_count}
 - 活跃成员数量: ${info.active_member_count}
=========用户信息=========
 - 用户昵称: ${memberInfo.nickname}
 - 用户角色: ${memberInfo.role}
 - 用户专属头衔: ${memberInfo.title ? memberInfo.title : '无'}`;
          }
        } catch (error) {
          logger.warn(`获取群${group.group_id}成员列表时出错：`, error);
        }
        return null;
      })();
    });

    // 并行执行所有任务
    const results = await Promise.all(tasks);

    // 过滤出非空结果
    return results.filter(group => group !== null);
  }
}