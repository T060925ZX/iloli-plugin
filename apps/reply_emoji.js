import Cfg from '../model/Cfg.js';

const config = Cfg.getConfig('config');
const whiteUserList = config.emoji_whiteUserList || []; // 无默认白名单用户
const whiteGroupList = config.emoji_whiteGroupList || []; // 无默认白名单群
const blackUserList = config.emoji_blackUserList || []; // 无默认黑名单用户
const blackGroupList = config.emoji_blackGroupList || []; // 无默认黑名单群
const random = config.emoji_random || 100;
const faceId = config.emoji_faceId || [66];
const sleepTime = config.emoji_sleepTime || 0;
const all = config.emoji_all !== false;
const enabled = config.emoji_enable !== false;

const isTRSS = Array.isArray(Bot.uin);

Bot.allMessageAddEmojiHandler = (e) => {
  if (!enabled) return;
  if (isTRSS && e.adapter_name !== "ICQQ") return;
  
  if (whiteGroupList.length && !whiteGroupList.includes(e.group_id)) return;
  if (whiteUserList.length && !whiteUserList.includes(e.user_id)) return;
  
  if (blackGroupList.length && blackGroupList.includes(e.group_id)) return;
  if (blackUserList.length && blackUserList.includes(e.user_id)) return;
  
  if (Math.random() < (random / 100)) {
    faceId.forEach(async i => {
      await setReaction(e.self_id, e.group_id, e.seq, i, i >= 9728 ? 2 : 1);
      if (sleepTime > 0) await sleep(sleepTime);
    });
  }
  
  if (all) {
    const face = [];
    e.message.forEach(i => {
      if (i.type == 'face') {
        face.push({ type: 1, id: i.id });
      } else if (i.type == 'text') {
        const emojiList = extractEmojis(i.text);
        if (emojiList.length) {
          for (const emoji of emojiList) {
            const id = emoji.codePointAt(0);
            face.push({ type: 2, id });
          }
        }
      }
    });
    
    const seq = e.source?.seq || e.seq;
    if (face.length) {
      face.forEach(async i => {
        if (sleepTime > 0) await sleep(sleepTime);
        await setReaction(e.self_id, e.group_id, seq, i.id, i.type);
      });
    }
  }
};

if (!Bot.allMessageAddEmojiHandlering) {
  Bot.allMessageAddEmojiHandlering = (() => {
    Bot.on('message.group', e => Bot.allMessageAddEmojiHandler(e));
    return true;
  })();
}

function extractEmojis(text) {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  return text.match(emojiRegex) || [];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setReaction(self_id, group_id, seq, face_id, type) {
  const body = {
    2: group_id,
    3: seq,
    4: `${face_id}`,
    5: type
  };
  return Bot[self_id].sendOidbSvcTrpcTcp('OidbSvcTrpcTcp.0x9082_1', body);
}

function delReaction(self_id, group_id, seq, face_id, type) {
  const body = {
    2: group_id,
    3: seq,
    4: `${face_id}`,
    5: type
  };
  return Bot[self_id].sendOidbSvcTrpcTcp('OidbSvcTrpcTcp.0x9082_2', body);
}
