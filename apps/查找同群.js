import moment from "moment"; 

export class Example3 extends plugin {
    constructor() {
        super({
            name: 'QTool_查找同群',
            dsc: '查找用户与机器人共同群聊',
            event: 'message',
            priority: 114514,
            rule: [
                { reg: /^(#|\/)?找(QQ|qq)?(信息)?(\s+)?(\d+)?$/, fnc: 'searchQQInGroups' },
            ]
        });
    }

// 查找QQ
async searchQQInGroups(e) {
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

    //e.reply(`正在查找与 ${qqNumber} 所在同群...`);

    const groupList = Array.from(this.e.bot.gl.values());

    // 创建一个数组来存储所有群聊的异步任务
    const tasks = groupList.map(group => {
        return (async () => {
            try {
                const groupId = group.group_id;
                const groupObj = this.e.bot.pickGroup(groupId);
                const memberMap = await groupObj.getMemberMap();

                // 检查群聊成员是否包含目标QQ号
                if (memberMap.has(Number(qqNumber))) {
                    const info = await groupObj.pickMember(qqNumber).getInfo();

                    // 将时间戳转换为可读的日期格式
                    info.join_time = moment(info.join_time * 1000).format('YYYY-MM-DD HH:mm:ss');
                    info.last_sent_time = moment(info.last_sent_time * 1000).format('YYYY-MM-DD HH:mm:ss');
                    info.update_time = moment(info.update_time * 1000).format('YYYY-MM-DD HH:mm:ss');
                    info.title_expire_time = info.title_expire_time === 4294967295 ? '永久' : moment(info.title_expire_time * 1000).format('YYYY-MM-DD HH:mm:ss');
                    info.shutup_time = info.shutup_time === 0 ? '无' : moment(info.shutup_time * 1000).format('YYYY-MM-DD HH:mm:ss');

                    // 美化输出格式
                    const formattedInfo = ` - 群名：${group.group_name}
 - 群号：${this.maskGroupId(groupId)}
 - 昵称: ${info.nickname}
 - 加群时间: ${info.join_time}
 - 最后发言时间: ${info.last_sent_time}
 - 身份: ${info.role}
 - 专属头衔: ${info.title ? info.title : '无'}
 - 更新时间: ${info.update_time}
 - 群成员数量: ${memberMap.size}`;

                    return formattedInfo;
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
    const foundGroups = results.filter(group => group !== null);

    // 输出结果
    if (foundGroups.length > 0) {
        // 构建一个包含所有群信息的消息列表
        const msgList = foundGroups.map((groupInfo, index) => ({
            user_id: e.user_id,
            message: groupInfo
        }));

        // 创建转发消息
        let msg;
        try {
            msg = await e.group.makeForwardMsg(msgList);
        } catch {
            msg = await e.friend.makeForwardMsg(msgList);
        }

        await e.reply(msg);
    } else {
        e.reply(`未找到QQ号 ${qqNumber} 在任何群聊`, { at: true });
    }
}
    // 处理群号，隐藏第3到第7位
    maskGroupId(groupId) {
        //const str = groupId.toString();
        //return str.substring(0, 2) + '*****' + str.substring(7);
        return groupId;  // 返回原始群号
    }

}
