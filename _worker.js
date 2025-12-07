/**
 * Cloudflare Worker: RenewHelper (v1.3)
 * Author: LOSTFREE
 * Features: Multi-Channel Notify, Import/Export, Channel Test, Bilingual UI, Precise ICS Alarm
 */

const APP_VERSION = "v1.3";

// ==========================================
// 1. Core Logic (Lunar & Calc)
// ==========================================
// 定义一个全局缓存 (Request 级别)
const _lunarCache = new Map();
const LUNAR_DATA = {
  info: [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0,
    0x09ad0, 0x055d2, 0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540,
    0x0d6a0, 0x0ada2, 0x095b0, 0x14977, 0x04970, 0x0a4b0, 0x0b4b5, 0x06a50,
    0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, 0x06566, 0x0d4a0,
    0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2,
    0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573,
    0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4,
    0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5,
    0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46,
    0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58,
    0x055c0, 0x0ab60, 0x096d5, 0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50,
    0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, 0x0a950, 0x0b4a0,
    0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260,
    0x0ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0,
    0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0,
    0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370,
    0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
    0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0,
    0x0a6d0, 0x055d4, 0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50,
    0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, 0x0b273, 0x06930, 0x07337, 0x06aa0,
    0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, 0x0e968, 0x0d520,
    0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
    0x0d520,
  ],
  gan: "甲乙丙丁戊己庚辛壬癸".split(""),
  zhi: "子丑寅卯辰巳午未申酉戌亥".split(""),
  months: "正二三四五六七八九十冬腊".split(""),
  days: "初一,初二,初三,初四,初五,初六,初七,初八,初九,初十,十一,十二,十三,十四,十五,十六,十七,十八,十九,二十,廿一,廿二,廿三,廿四,廿五,廿六,廿七,廿八,廿九,三十".split(
    ","
  ),
  lYearDays(y) {
    let s = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) s += this.info[y - 1900] & i ? 1 : 0;
    return s + this.leapDays(y);
  },
  leapDays(y) {
    if (this.leapMonth(y)) return this.info[y - 1900] & 0x10000 ? 30 : 29;
    return 0;
  },
  leapMonth(y) {
    return this.info[y - 1900] & 0xf;
  },
  monthDays(y, m) {
    return this.info[y - 1900] & (0x10000 >> m) ? 30 : 29;
  },
  solar2lunar(y, m, d) {
    // 1. 生成缓存 Key
    const cacheKey = `${y}-${m}-${d}`;
    // 2. 命中缓存直接返回
    if (_lunarCache.has(cacheKey)) return _lunarCache.get(cacheKey);
    if (y < 1900 || y > 2100) return null;
    const base = new Date(1900, 0, 31),
      obj = new Date(y, m - 1, d);
    let offset = Math.round((obj - base) / 86400000);
    let ly = 1900,
      temp = 0;
    for (; ly < 2101 && offset > 0; ly++) {
      temp = this.lYearDays(ly);
      offset -= temp;
    }
    if (offset < 0) {
      offset += temp;
      ly--;
    }
    let lm = 1,
      leap = this.leapMonth(ly),
      isLeap = false;
    for (; lm < 13 && offset > 0; lm++) {
      if (leap > 0 && lm === leap + 1 && !isLeap) {
        --lm;
        isLeap = true;
        temp = this.leapDays(ly);
      } else {
        temp = this.monthDays(ly, lm);
      }
      if (isLeap && lm === leap + 1) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && leap > 0 && lm === leap + 1) {
      if (isLeap) isLeap = false;
      else {
        isLeap = true;
        --lm;
      }
    }
    if (offset < 0) {
      offset += temp;
      --lm;
    }
    const ld = offset + 1,
      gIdx = (ly - 4) % 10,
      zIdx = (ly - 4) % 12;
    const yStr =
      this.gan[gIdx < 0 ? gIdx + 10 : gIdx] +
      this.zhi[zIdx < 0 ? zIdx + 12 : zIdx];
    const mStr = (isLeap ? "闰" : "") + this.months[lm - 1] + "月";
    const result = {
      year: ly,
      month: lm,
      day: ld,
      isLeap,
      yearStr: yStr,
      monthStr: mStr,
      dayStr: this.days[ld - 1],
      fullStr: yStr + "年" + mStr + this.days[ld - 1],
    };
    // 3. 写入缓存
    _lunarCache.set(cacheKey, result);
    return result;
  },
};

const calcBiz = {
  // 极速版农历转公历 (L2S)
  l2s(l) {
    let days = 0;
    const { year, month, day, isLeap } = l;

    // 1. 累加年份天数 (1900 -> year-1)
    for (let i = 1900; i < year; i++) {
      days += LUNAR_DATA.lYearDays(i);
    }

    // 2. 累加月份天数 (1 -> month-1)
    const leap = LUNAR_DATA.leapMonth(year); // 该年闰哪个月 (0为不闰)
    for (let i = 1; i < month; i++) {
      days += LUNAR_DATA.monthDays(year, i);
      // 如果经过了闰月，需累加闰月天数
      if (leap > 0 && i === leap) {
        days += LUNAR_DATA.leapDays(year);
      }
    }

    // 3. 处理当前月
    // 如果是闰月，说明已经过完了该月的"正常月"，需加上正常月的天数
    if (isLeap) {
      days += LUNAR_DATA.monthDays(year, month);
    }

    // 4. 累加日数 (day - 1)
    days += day - 1;

    // 5. 计算公历日期 (基准日 1900-01-31)
    // 使用 UTC 避免时区干扰
    const base = new Date(Date.UTC(1900, 0, 31));
    const target = new Date(base.getTime() + days * 86400000);

    return {
      year: target.getUTCFullYear(),
      month: target.getUTCMonth() + 1,
      day: target.getUTCDate(),
    };
  },

  addPeriod(l, val, unit) {
    let { year, month, day, isLeap } = l;
    if (unit === "year") {
      year += val;
      const lp = LUNAR_DATA.leapMonth(year);
      // 如果目标年没有该闰月，或者目标月不是闰月，取消闰月标记
      isLeap = isLeap && lp === month;
    } else if (unit === "month") {
      let tot = (year - 1900) * 12 + (month - 1) + val;
      year = Math.floor(tot / 12) + 1900;
      month = (tot % 12) + 1;
      const lp = LUNAR_DATA.leapMonth(year);
      isLeap = isLeap && lp === month;
    } else if (unit === "day") {
      // 日增加直接转公历加天数再转回农历
      const s = this.l2s(l);
      const d = new Date(Date.UTC(s.year, s.month - 1, s.day + val));
      return LUNAR_DATA.solar2lunar(
        d.getUTCFullYear(),
        d.getUTCMonth() + 1,
        d.getUTCDate()
      );
    }

    // 修正日期有效性 (例如: 农历30日变29日)
    let max = isLeap
      ? LUNAR_DATA.leapDays(year)
      : LUNAR_DATA.monthDays(year, month);
    let td = Math.min(day, max);

    // 递归检查有效性
    while (td > 0) {
      if (this.l2s({ year, month, day: td, isLeap }))
        return { year, month, day: td, isLeap };
      td--;
    }
    return { year, month, day, isLeap };
  },
};

// ==========================================
// 2. Infrastructure & Utils - REVISED
// ==========================================

class Router {
  constructor() {
    this.routes = [];
  }
  handle(method, path, handler) {
    this.routes.push({ method, path, handler });
  }
  get(path, handler) {
    this.handle("GET", path, handler);
  }
  post(path, handler) {
    this.handle("POST", path, handler);
  }

  async route(req, env) {
    const url = new URL(req.url);
    const method = req.method;

    for (const route of this.routes) {
      if (route.method === method && route.path === url.pathname)
        return await route.handler(req, env, url);
    }
    return new Response("Not Found", { status: 404 });
  }
}

const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const error = (msg, status = 400) => response({ code: status, msg }, status);

// ==========================================
// 3. Business Logic (Services)
// ==========================================

const Auth = {
  async login(password, env) {
    const settings = await DataStore.getSettings(env);
    if (password === (env.AUTH_PASSWORD || "admin"))
      return await this.sign(settings.jwtSecret);
    throw new Error("PASSWORD_ERROR");
  },
  async verify(req, env) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return false;
    const settings = await DataStore.getSettings(env);
    return await this.verifyToken(
      authHeader.replace("Bearer ", ""),
      settings.jwtSecret
    );
  },
  async sign(secret) {
    const h = { alg: "HS256", typ: "JWT" },
      p = {
        u: "admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800,
      };
    const str = this.b64(h) + "." + this.b64(p);
    return str + "." + (await this.cryptoSign(str, secret));
  },
  async verifyToken(t, s) {
    try {
      const [h, p, sig] = t.split(".");
      if (!sig) return false;
      // 使用恒定时间比较，防止时序攻击
      const expectedSig = await this.cryptoSign(h + "." + p, s);
      if (!(await this.safeCompare(expectedSig, sig))) return false;

      const pl = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
      return !(pl.exp && pl.exp < Math.floor(Date.now() / 1000));
    } catch {
      return false;
    }
  },
  async cryptoSign(t, s) {
    const k = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(s),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    return btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(t))
        )
      )
    )
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  },
  // 恒定时间比较函数
  async safeCompare(a, b) {
    const enc = new TextEncoder();
    const aBuf = enc.encode(a);
    const bBuf = enc.encode(b);
    // 长度不同直接返回false（HMAC-SHA256长度通常固定，此处作为防御）
    if (aBuf.byteLength !== bBuf.byteLength) return false;
    return crypto.subtle.timingSafeEqual(aBuf, bBuf);
  },
  // 生成高强度随机密钥
  genSecret() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  },
  b64(o) {
    return btoa(JSON.stringify(o))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  },
};

const DataStore = {
  KEYS: { SETTINGS: "SYS_CONFIG", ITEMS: "DATA_ITEMS", LOGS: "LOGS" },

  async getSettings(env) {
    let s = {};
    const raw = await env.RENEW_KV.get(this.KEYS.SETTINGS);
    if (raw)
      try {
        s = JSON.parse(raw);
      } catch (e) {}

    const defaults = {
      enableNotify: true,
      autoDisableDays: 30,
      language: "zh",
      timezone: "UTC",
      jwtSecret: "",
      calendarToken: "",
      enabledChannels: [],
      notifyConfig: {
        telegram: { token: "", chatId: "" },
        bark: { server: "https://api.day.app", key: "" },
        pushplus: { token: "" },
        notifyx: { apiKey: "" },
        resend: { apiKey: "", from: "", to: "" },
        webhook: { url: "" },
      },
    };

    s = { ...defaults, ...s };
    s.notifyConfig = { ...defaults.notifyConfig, ...(s.notifyConfig || {}) };

    let save = false;

    if (!s.jwtSecret) {
      s.jwtSecret = Auth.genSecret();
      save = true;
    }
    if (!s.calendarToken) {
      s.calendarToken = crypto.randomUUID();
      save = true;
    }

    if (save) await this.saveSettings(env, s);
    return s;
  },

  async saveSettings(env, data) {
    await env.RENEW_KV.put(this.KEYS.SETTINGS, JSON.stringify(data, null, 2));
  },

  async getItems(env) {
    const raw = await env.RENEW_KV.get(this.KEYS.ITEMS);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  async saveItems(env, data) {
    await env.RENEW_KV.put(this.KEYS.ITEMS, JSON.stringify(data));
  },

  async getCombined(env) {
    const [settings, items] = await Promise.all([
      this.getSettings(env),
      this.getItems(env),
    ]);
    return { settings, items };
  },

  async getLogs(env) {
    return JSON.parse((await env.RENEW_KV.get(this.KEYS.LOGS)) || "[]");
  },

  async saveLog(env, entry) {
    const logs = await this.getLogs(env);
    logs.unshift(entry);
    await env.RENEW_KV.put(this.KEYS.LOGS, JSON.stringify(logs.slice(0, 30)));
  },
};

// ==========================================
// 全局内存缓存 (用于 1秒/次 极速限流)
// Worker 实例未销毁前，Map 会一直存在
// ==========================================
const _memLimitCache = new Map();

const RateLimiter = {
  async check(env, ip, action) {
    if (!ip) return true; // 开发环境或获取不到IP时放行

    const now = Date.now();

    // ------------------------------------------------
    // 层级 1: 内存限流 (1秒/次)
    // 作用: 防止瞬间并发/脚本爆破，不消耗 KV 额度
    // ------------------------------------------------
    const memKey = `${action}:${ip}`;
    const lastTime = _memLimitCache.get(memKey) || 0;

    if (now - lastTime < 1000) {
      return false; // 触发 1s 冷却
    }
    _memLimitCache.set(memKey, now); // 更新内存时间戳

    // ------------------------------------------------
    // 层级 2: KV 限流 (每日 100次)
    // 作用: 限制每日总调用量，持久化存储
    // ------------------------------------------------
    const today = new Date().toISOString().split("T")[0];
    const kvKey = `RATELIMIT:${today}:${action}:${ip}`;

    // 获取当前计数值 (如果不存在则为 0)
    let count = await env.RENEW_KV.get(kvKey);
    count = count ? parseInt(count) : 0;

    if (count >= 100) {
      return false; // 触发每日上限
    }

    // 增加计数并写入 KV (设置 24小时过期)
    // 使用 waitUntil 可以在后台写入，不阻塞响应速度（如果你的环境支持，否则直接 await）
    await env.RENEW_KV.put(kvKey, (count + 1).toString(), {
      expirationTtl: 86400,
    });

    return true;
  },
};

const Calc = {
  parseYMD(s) {
    if (!s) return new Date();
    const p = s.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  },
  toYMD(d) {
    return d.toISOString().split("T")[0];
  },
  // 获取基于用户时区的“今天” (00:00:00 UTC)
  getTzToday(tz) {
    try {
      // 使用 en-CA 格式化出的就是 YYYY-MM-DD
      const f = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz || "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return this.parseYMD(f.format(new Date()));
    } catch (e) {
      // 如果时区无效，回退到 UTC
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
  },
};

// HTML转义工具
const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const Notifier = {
  async send(settings, title, body) {
    if (!settings.enableNotify) return "NOTIFY_DISABLED";

    const channels = settings.enabledChannels || [];
    if (channels.length === 0 && settings.notifyUrl) {
      return await this.adapters.webhook(
        { url: settings.notifyUrl },
        title,
        body
      );
    }

    const tasks = [];
    const cfg = settings.notifyConfig || {};

    for (const ch of channels) {
      if (this.adapters[ch] && cfg[ch]) {
        tasks.push(
          this.adapters[ch](cfg[ch], title, body)
            .then((res) => `[${ch}: ${res}]`)
            .catch((err) => `[${ch}: ERR ${err.message}]`)
        );
      }
    }

    if (tasks.length === 0) return "NO_CHANNELS";
    const results = await Promise.all(tasks);
    return results.join(" ");
  },

  adapters: {
    telegram: async (c, title, body) => {
      if (!c.token || !c.chatId) return "MISSING_CONF";
      const text = `*${title}*\n\n${body}`;
      const r = await fetch(
        `https://api.telegram.org/bot${c.token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: c.chatId,
            text,
            parse_mode: "Markdown",
          }),
        }
      );
      return r.ok ? "OK" : "FAIL";
    },
    bark: async (c, title, body) => {
      if (!c.key) return "MISSING_CONF";
      const server = (c.server || "https://api.day.app").replace(/\/$/, "");
      const r = await fetch(
        `${server}/${c.key}/${encodeURIComponent(title)}/${encodeURIComponent(
          body
        )}?group=RenewHelper`
      );
      return r.ok ? "OK" : "FAIL";
    },
    pushplus: async (c, title, body) => {
      if (!c.token) return "MISSING_CONF";
      const safeContent = escapeHtml(body).replace(/\n/g, "<br>");
      const r = await fetch("https://www.pushplus.plus/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: c.token,
          title,
          content: safeContent,
          template: "html",
        }),
      });
      return r.ok ? "OK" : "FAIL";
    },
    notifyx: async (c, title, body) => {
      if (!c.apiKey) return "MISSING_CONF";
      let description = "Alert";
      const content = body.replace(/\n/g, "\n\n"); // NotifyX 使用 Markdown
      const r = await fetch(`https://www.notifyx.cn/api/v1/send/${c.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, description }),
      });
      return r.ok ? "OK" : "FAIL";
    },
    resend: async (c, title, body) => {
      if (!c.apiKey || !c.to || !c.from) return "MISSING_CONF";
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: c.from,
          to: c.to,
          subject: title,
          text: body,
        }),
      });
      return r.ok ? "OK" : "FAIL";
    },
    webhook: async (c, title, body) => {
      if (!c.url) return "MISSING_CONF";
      try {
        const r = await fetch(c.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content: body }),
        });
        return r.ok ? "OK" : "FAIL";
      } catch (e) {
        return "ERR";
      }
    },
  },
};

// ==========================================
// 4. Logic Controllers
// ==========================================

function calculateStatus(item, timezone = "UTC") {
  // 使用时区感知的“今天”，而不是 UTC 的今天
  const today = Calc.getTzToday(timezone);

  const cDate = item.createDate || Calc.toYMD(today),
    rDate = item.lastRenewDate || cDate;
  const interval = Number(item.intervalDays),
    unit = item.cycleUnit || "day";
  const rObj = Calc.parseYMD(rDate);
  let nextObj;

  if (item.useLunar) {
    let l = LUNAR_DATA.solar2lunar(
      rObj.getUTCFullYear(),
      rObj.getUTCMonth() + 1,
      rObj.getUTCDate()
    );
    if (l) {
      let nl = calcBiz.addPeriod(l, interval, unit);
      let s = calcBiz.l2s(nl);
      nextObj = new Date(Date.UTC(s.year, s.month - 1, s.day));
    } else nextObj = new Date(rObj);
  } else {
    nextObj = new Date(rObj);
    if (unit === "year")
      nextObj.setUTCFullYear(nextObj.getUTCFullYear() + interval);
    else if (unit === "month")
      nextObj.setUTCMonth(nextObj.getUTCMonth() + interval);
    else nextObj.setUTCDate(nextObj.getUTCDate() + interval);
  }

  let lNext = "",
    lLast = "";
  if (item.useLunar) {
    const ln = LUNAR_DATA.solar2lunar(
      nextObj.getUTCFullYear(),
      nextObj.getUTCMonth() + 1,
      nextObj.getUTCDate()
    );
    if (ln) lNext = ln.fullStr;
    const ll = LUNAR_DATA.solar2lunar(
      rObj.getUTCFullYear(),
      rObj.getUTCMonth() + 1,
      rObj.getUTCDate()
    );
    if (ll) lLast = ll.fullStr;
  }

  return {
    ...item,
    enabled: item.enabled !== false,
    cycleUnit: unit,
    createDate: cDate,
    lastRenewDate: rDate,
    serviceDays: Math.floor((today - Calc.parseYMD(cDate)) / 86400000),
    daysLeft: Math.round((nextObj - today) / 86400000),
    nextDueDate: Calc.toYMD(nextObj),
    nextDueDateLunar: lNext,
    lastRenewDateLunar: lLast,
    tags: Array.isArray(item.tags) ? item.tags : [],
    useLunar: !!item.useLunar,
    notifyTime: item.notifyTime || "08:00",
  };
}

const I18N = {
  zh: {
    scan: "扫描 %s 个服务",
    autoDisable: "🚫 [%s] 过期 %s 天，已自动禁用",
    autoRenew: "🔄 [%s] 自动续期成功",
    today: "今天到期",
    overdue: "过期 %s 天",
    left: "剩 %s 天",
    checkLog: "[CHECK] %s | %s",
    thres: "(阈值: %s)",
    pushTitle: "RenewHelper 报告",
    secDis: "🚫 服务已禁用",
    secRen: "🔄 服务已续期",
    secAle: "⏳ 服务即将到期",
    note: "备注",
    lblEnable: "启用",
    lblToken: "令牌 (Token)",
    lblApiKey: "API Key",
    lblChatId: "会话ID",
    lblServer: "服务器URL",
    lblDevKey: "设备Key",
    lblFrom: "发件人",
    lblTo: "收件人",
    lblNotifyTime: "提醒时间",
    btnTest: "发送测试",
  },
  en: {
    scan: "Scan %s items",
    autoDisable: "🚫 [%s] Overdue %sd, Disabled",
    autoRenew: "🔄 [%s] Auto Renewed",
    today: "Due Today",
    overdue: "Overdue %sd",
    left: "Left %sd",
    checkLog: "[CHECK] %s | %s",
    thres: "(Thres: %s)",
    pushTitle: "RenewHelper Report",
    secDis: "🚫 Services Disabled",
    secRen: "🔄 Services Renewed",
    secAle: "⏳ Expiring Soon",
    note: "Note",
    lblEnable: "Enable",
    lblToken: "Token",
    lblApiKey: "API Key",
    lblChatId: "Chat ID",
    lblServer: "Server URL",
    lblDevKey: "Device Key",
    lblFrom: "From Email",
    lblTo: "To Email",
    lblNotifyTime: "Alarm Time",
    btnTest: "Send Test",
  },
};
function t(k, l, ...a) {
  let s = (I18N[l] || I18N.zh)[k] || k;
  a.forEach((x) => (s = s.replace("%s", x)));
  return s;
}

async function checkAndRenew(env, isSched, lang = "zh") {
  const [conf, items] = await Promise.all([
    DataStore.getSettings(env),
    DataStore.getItems(env),
  ]);
  const s = conf;
  const logs = [],
    log = (m) => {
      logs.push(m);
      console.log(m);
    };
  // 【修改 1】新增 monitor 数组，用于记录"在提醒期内但未到推送时间"的项目
  let trig = [],
    upd = [],
    dis = [],
    monitor = [],
    changed = false;

  log(`[SYSTEM] ${t("scan", lang, items.length)}`);

  // 1. 获取基于偏好时区的“今天”
  const today = Calc.getTzToday(s.timezone);

  // 2. 获取基于偏好时区的“当前时:分”
  let nowH = 0,
    nowM = 0;
  try {
    const now = new Date();
    const str = now.toLocaleString("en-US", {
      timeZone: s.timezone || "UTC",
      hour12: false,
      hour: "numeric",
      minute: "numeric",
    });
    [nowH, nowM] = str.split(":").map(Number);
  } catch (e) {
    /* Fallback */
  }

  for (let i = 0; i < items.length; i++) {
    let it = items[i];
    if (!it.createDate) it.createDate = Calc.toYMD(new Date());
    if (!it.lastRenewDate) it.lastRenewDate = it.createDate;
    if (it.enabled === false) continue;

    let st = calculateStatus(it, s.timezone),
      days = st.daysLeft;
    const msg = it.message ? ` (${t("note", lang)}: ${it.message})` : "";

    const iAutoRenew = it.autoRenew !== false;
    const iRenewDays =
      typeof it.autoRenewDays === "number" ? it.autoRenewDays : 3;
    const iNotifyDays = typeof it.notifyDays === "number" ? it.notifyDays : 3;

    // --- 逻辑 A: 自动禁用 ---
    if (!iAutoRenew && days <= -Math.abs(s.autoDisableDays)) {
      log(t("autoDisable", lang, it.name, Math.abs(days), s.autoDisableDays));
      it.enabled = false;
      items[i] = it;
      dis.push({
        ...it,
        daysLeft: days,
        nextDueDate: st.nextDueDate,
        note: msg,
      });
      changed = true;
      continue;
    }
    // --- 逻辑 B: 自动续期 ---
    else if (iAutoRenew && days <= -Math.abs(iRenewDays)) {
      log(t("autoRenew", lang, it.name));
      const rObj = Calc.parseYMD(it.lastRenewDate),
        unit = it.cycleUnit || "day",
        intv = Number(it.intervalDays);

      // 防止死循环保护
      // 防止 intervalDays 为 0 或负数导致死循环，耗尽 Worker CPU 资源
      let loopSafe = 0;
      const MAX_LOOPS = 300; // 限制最大推算次数（300个周期通常足够覆盖数年）

      let currentRenew = new Date(rObj);

      if (it.useLunar) {
        let l = LUNAR_DATA.solar2lunar(
          rObj.getUTCFullYear(),
          rObj.getUTCMonth() + 1,
          rObj.getUTCDate()
        );
        // 增加 l 对象的非空校验，防止农历转换失败导致 crash
        if (!l) {
          log(`[ERR] Lunar conversion failed for ${it.name}`);
        } else {
          while (true) {
            // 1. 安全中断检测
            if (++loopSafe > MAX_LOOPS) {
              log(
                `[WARN] Loop Limit Exceeded for item: ${it.name} (Check interval/date settings)`
              );
              break;
            }

            let nextL = calcBiz.addPeriod(l, intv, unit);
            let sol = calcBiz.l2s(nextL);

            // 2. 防止农历逆向转换失败
            if (!sol) {
              log(`[ERR] Lunar reverse calc failed for ${it.name}`);
              break;
            }

            let nextTime = new Date(Date.UTC(sol.year, sol.month - 1, sol.day));
            if (nextTime > today) break;
            currentRenew = nextTime;
            l = nextL;
          }
        }
      } else {
        while (true) {
          // 1. 安全中断检测
          if (++loopSafe > MAX_LOOPS) {
            log(
              `[WARN] Loop Limit Exceeded for item: ${it.name} (Check interval/date settings)`
            );
            break;
          }

          let nextCandidate = new Date(currentRenew);
          if (unit === "year")
            nextCandidate.setUTCFullYear(nextCandidate.getUTCFullYear() + intv);
          else if (unit === "month")
            nextCandidate.setUTCMonth(nextCandidate.getUTCMonth() + intv);
          else nextCandidate.setUTCDate(nextCandidate.getUTCDate() + intv);

          // 2. 防止日期未发生变化（如 interval=0）导致的死循环
          if (nextCandidate.getTime() <= currentRenew.getTime()) {
            log(`[ERR] Interval too small or zero for ${it.name}`);
            break;
          }

          if (nextCandidate > today) break;
          currentRenew = nextCandidate;
        }
      }

      const newD = Calc.toYMD(currentRenew);
      if (newD !== it.lastRenewDate) {
        upd.push({
          name: it.name,
          old: it.lastRenewDate,
          new: newD,
          note: msg,
        });
        it.lastRenewDate = newD;
        items[i] = it;
        changed = true;
      }
    }
    // --- 逻辑 C: 到期提醒 & 状态记录 ---
    else if (days <= iNotifyDays) {
      const statusText =
        days === 0
          ? t("today", lang)
          : days < 0
          ? t("overdue", lang, Math.abs(days))
          : t("left", lang, days);
      log(
        t(
          "checkLog",
          lang,
          it.name,
          `${statusText} ${t("thres", lang, iNotifyDays)}`
        )
      );

      let shouldPush = true;
      if (isSched) {
        const nTime = it.notifyTime || "08:00";
        const [tgtH, tgtM] = nTime.split(":").map(Number);
        const diffMinutes = Math.abs(nowH * 60 + nowM - (tgtH * 60 + tgtM));

        if (diffMinutes > 5) {
          shouldPush = false;
        }
      }

      if (shouldPush) {
        trig.push({ ...st, note: msg });
      } else {
        // 虽然不推送，但记入 monitor 列表，确保触发日志保存
        monitor.push({ ...st });
      }
    } else {
      const statusText = days === 0 ? t("today", lang) : t("left", lang, days);
      log(t("checkLog", lang, it.name, statusText));
    }
  }

  if (changed) await DataStore.saveItems(env, items);

  if (s.enableNotify) {
    let pushBody = [];
    if (dis.length) {
      pushBody.push(`【${t("secDis", lang)}】`);
      dis.forEach((x, i) =>
        pushBody.push(
          `${i + 1}. ${x.name} (${t("overdue", lang, Math.abs(x.daysLeft))} / ${
            x.nextDueDate
          })\n${x.note}`
        )
      );
      pushBody.push("");
    }
    if (upd.length) {
      pushBody.push(`【${t("secRen", lang)}】`);
      upd.forEach((x, i) =>
        pushBody.push(`${i + 1}. ${x.name}: ${x.old} -> ${x.new}\n${x.note}`)
      );
      pushBody.push("");
    }
    if (trig.length) {
      pushBody.push(`【${t("secAle", lang)}】`);
      trig.forEach((x, i) => {
        const dayStr =
          x.daysLeft === 0
            ? t("today", lang)
            : x.daysLeft < 0
            ? t("overdue", lang, Math.abs(x.daysLeft))
            : t("left", lang, x.daysLeft);
        pushBody.push(
          `${i + 1}. ${x.name}: ${dayStr} (${x.nextDueDate})\n${x.note}`
        );
      });
    }

    if (pushBody.length > 0) {
      const fullBody = pushBody.join("\n").trim();
      const pushRes = await Notifier.send(s, t("pushTitle", lang), fullBody);
      log(`[PUSH] ${pushRes}`);
    }
  }

  // 将 monitor 列表映射为 'normal' 动作
  // 只要有任何常规检查命中（在提醒期内），就会保存日志
  const act = [
    upd.length ? "renew" : null,
    dis.length ? "disable" : null,
    trig.length ? "alert" : null,
    monitor.length ? "normal" : null,
  ].filter(Boolean);

  if (act.length) {
    await DataStore.saveLog(env, {
      time: new Date().toISOString(),
      trigger: isSched ? "CRON" : "MANUAL",
      content: logs,
      actions: act,
    });
  }

  return { logs, currentList: items };
}
// ==========================================
// 5. Worker Entry & Router
// ==========================================

const app = new Router();
const withAuth = (handler) => async (req, env, url) => {
  if (!(await Auth.verify(req, env))) return error("UNAUTHORIZED", 401);
  return handler(req, env, url);
};

app.get(
  "/",
  () =>
    new Response(HTML, {
      headers: { "content-type": "text/html;charset=UTF-8" },
    })
);
// 修改登录接口，增加限流
app.post("/api/login", async (req, env) => {
  const ip = req.headers.get("cf-connecting-ip");
  if (!(await RateLimiter.check(env, ip, "login")))
    return error("RATE_LIMIT_EXCEEDED: Try again later", 429);

  try {
    const body = await req.json();
    return response({ code: 200, token: await Auth.login(body.password, env) });
  } catch (e) {
    return error("AUTH_ERROR", 403);
  }
});
app.get(
  "/api/list",
  withAuth(async (req, env) => {
    const data = await DataStore.getCombined(env);
    delete data.settings.jwtSecret;
    // 传入时区配置
    data.items = data.items.map((i) =>
      calculateStatus(i, data.settings.timezone)
    );
    return response({ code: 200, data });
  })
);
app.post(
  "/api/check",
  withAuth(async (req, env) => {
    const body = await req.json().catch(() => ({}));
    const res = await checkAndRenew(env, false, body.lang);
    const settings = await DataStore.getSettings(env);
    return response({
      code: 200,
      logs: res.logs,
      data: res.currentList.map((i) => calculateStatus(i, settings.timezone)),
    });
  })
);
app.get(
  "/api/logs",
  withAuth(async (req, env) => {
    return response({ code: 200, data: await DataStore.getLogs(env) });
  })
);
app.post(
  "/api/logs/clear",
  withAuth(async (req, env) => {
    await env.RENEW_KV.delete(DataStore.KEYS.LOGS);
    return response({ code: 200, msg: "CLEARED" });
  })
);

app.post(
  "/api/save",
  withAuth(async (req, env) => {
    const body = await req.json();
    const items = body.items.map((i) => ({
      ...i,
      id: i.id || Date.now().toString(),
      intervalDays: Number(i.intervalDays),
      enabled: i.enabled !== false,
      tags: Array.isArray(i.tags) ? i.tags : [],
      useLunar: !!i.useLunar,
      notifyDays: i.notifyDays !== null ? Number(i.notifyDays) : null,
      notifyTime: i.notifyTime || "08:00", // Save notifyTime
      autoRenew: i.autoRenew !== false,
      autoRenewDays: i.autoRenewDays !== null ? Number(i.autoRenewDays) : null,
    }));
    const currentSettings = await DataStore.getSettings(env);
    const newSettings = {
      ...body.settings,
      jwtSecret: currentSettings.jwtSecret,
    };
    await Promise.all([
      DataStore.saveItems(env, items),
      DataStore.saveSettings(env, newSettings),
    ]);
    return response({ code: 200, msg: "SAVED" });
  })
);

app.get(
  "/api/export",
  withAuth(async (req, env) => {
    const data = await DataStore.getCombined(env);
    delete data.settings.jwtSecret;
    const exportData = {
      meta: { version: APP_VERSION, exportedAt: new Date().toISOString() },
      ...data,
    };
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="RenewHelper_Backup_${
          new Date().toISOString().split("T")[0]
        }.json"`,
      },
    });
  })
);
app.post(
  "/api/import",
  withAuth(async (req, env) => {
    try {
      const body = await req.json();
      if (!Array.isArray(body.items) || !body.settings)
        throw new Error("INVALID_FILE_FORMAT");
      await DataStore.saveItems(env, body.items);
      const currentSettings = await DataStore.getSettings(env);
      const newSettings = {
        ...currentSettings,
        ...body.settings,
        jwtSecret: currentSettings.jwtSecret,
      };
      await DataStore.saveSettings(env, newSettings);
      return response({ code: 200, msg: "IMPORTED" });
    } catch (e) {
      return error("IMPORT_FAILED: " + e.message, 400);
    }
  })
);

// 修改测试通知接口，增加限流
app.post(
  "/api/test-notify",
  withAuth(async (req, env) => {
    const ip = req.headers.get("cf-connecting-ip");
    if (!(await RateLimiter.check(env, ip, "test_notify")))
      return error("RATE_LIMIT_EXCEEDED: Max 100/day, 1/sec", 429);

    try {
      const body = await req.json();
      const { channel, config } = body;
      if (!Notifier.adapters[channel]) return error("INVALID_CHANNEL");
      const res = await Notifier.adapters[channel](
        config,
        "RenewHelper Test",
        `Test message for channel: ${channel}`
      );
      return res === "OK"
        ? response({ code: 200, msg: "SENT" })
        : error("SEND_FAILED: " + res);
    } catch (e) {
      return error("TEST_ERROR: " + e.message);
    }
  })
);

// ICS Calendar Subscription (UUID Auth + I18N + Custom Layout + Outlook Fix + Same Day Alert)
app.get("/api/calendar.ics", async (req, env, url) => {
  const token = url.searchParams.get("token");
  const settings = await DataStore.getSettings(env);
  if (!token || token !== settings.calendarToken)
    return new Response("Unauthorized: Invalid Calendar Token", {
      status: 401,
    });

  const items = await DataStore.getItems(env);
  const lang = settings.language === "en" ? "en" : "zh";

  const T = {
    zh: {
      lblCycle: "提醒周期",
      lblLast: "上次续费",
      note: "备注",
      unit: { day: "天", month: "月", year: "年" },
    },
    en: {
      lblCycle: "Cycle",
      lblLast: "Last Renew",
      note: "Note",
      unit: { day: " Days", month: " Months", year: " Years" },
    },
  }[lang];

  const userTz = settings.timezone || "UTC";

  // ICS 文本转义函数
  const formatIcsText = (str) => {
    if (!str) return "";
    return (
      String(str)
        // 1. 如果有 HTML 标签，先去除 (可选，视你的数据源而定)
        // .replace(/<[^>]+>/g, '')
        // 2. 转义 ICS 特殊字符 (反斜杠必须最先转义)
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        // 3. 处理换行符：将实际换行转换为 ICS 认可的 \n 字符串
        .replace(/\r\n/g, "\\n")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\n")
    );
  };

  const parts = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RenewHelper//Calendar//EN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:RenewHelper",
    "REFRESH-INTERVAL;VALUE=DURATION:P1D",
    "CALSCALE:GREGORIAN",
    `X-WR-TIMEZONE:${userTz}`,
  ];
  const dtStamp =
    new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  items.forEach((item) => {
    if (!item.enabled) return;

    // 计算基于用户时区的日期
    const st = calculateStatus(item, settings.timezone);
    const dueStr = st.nextDueDate.replace(/-/g, ""); // Start: YYYYMMDD

    // 计算结束时间 (DTSTART + 1天) 以符合全天事件规范
    const startDateObj = Calc.parseYMD(st.nextDueDate);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endStr = Calc.toYMD(endDateObj).replace(/-/g, "");

    parts.push("BEGIN:VEVENT");
    parts.push(`UID:${item.id}@renewhelper`);
    parts.push(`DTSTAMP:${dtStamp}`);
    parts.push(`DTSTART;VALUE=DATE:${dueStr}`);
    parts.push(`DTEND;VALUE=DATE:${endStr}`);
    parts.push(`SUMMARY:${formatIcsText(item.name)}`);
    parts.push("STATUS:CONFIRMED");
    parts.push("TRANSP:TRANSPARENT");

    const unitLabel = T.unit[item.cycleUnit] || item.cycleUnit;

    // 构建描述时，对动态内容应用转义
    let descParts = [];
    descParts.push(`${T.lblCycle}: ${item.intervalDays}${unitLabel}`);
    descParts.push(`${T.lblLast}: ${item.lastRenewDate}`);
    if (item.message) {
      descParts.push(`${T.note}: ${formatIcsText(item.message)}`);
    }

    // 使用 \n 连接各行，并作为 DESCRIPTION 的值
    parts.push(`DESCRIPTION:${descParts.join("\\n")}`);

    // 使用 notifyTime 在当天提醒
    const nTime = item.notifyTime || "08:00";
    const [nH, nM] = nTime.split(":").map(Number);

    // 构造 ISO8601 持续时间字符串 (PTnHnM)
    // 全天事件从 00:00 开始，PT8H 即代表当天 08:00
    let triggerStr = "PT";
    if (nH > 0) triggerStr += `${nH}H`;
    if (nM > 0) triggerStr += `${nM}M`;
    if (triggerStr === "PT") triggerStr = "PT0M"; // 防止 00:00 时为空

    parts.push("BEGIN:VALARM");
    parts.push(`TRIGGER:${triggerStr}`);
    parts.push("ACTION:DISPLAY");
    parts.push(`DESCRIPTION:${formatIcsText(item.name)}`);
    parts.push("END:VALARM");

    parts.push("END:VEVENT");
  });
  parts.push("END:VCALENDAR");

  return new Response(parts.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="renewhelper.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAndRenew(env, true));
  },
  async fetch(req, env, ctx) {
    return app
      .route(req, env)
      .catch((err) => error("SERVER ERROR: " + err.message, 500));
  },
};

// ==========================================
// 6. Frontend
// ==========================================

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RenewHelper ${APP_VERSION}</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg width='56' height='56' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cdefs%3E%3ClinearGradient id='c1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%232563eb'/%3E%3Cstop offset='100%25' style='stop-color:%2322d3ee'/%3E%3C/linearGradient%3E%3ClinearGradient id='h1' x1='108.5' y1='7.8' x2='122.4' y2='21.7' gradientTransform='matrix(0,0.433,-2.309,0,99.8,-0.06)' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0%25' style='stop-color:%232563eb'/%3E%3Cstop offset='100%25' style='stop-color:%2322d3ee'/%3E%3C/linearGradient%3E%3ClinearGradient id='b1' x1='30.4' y1='54.5' x2='30.4' y2='14.8' gradientTransform='scale(0.694,1.441)' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' style='stop-color:%2326afe1;stop-opacity:1'/%3E%3Cstop offset='1' style='stop-color:%23ee5a22;stop-opacity:0.7'/%3E%3C/linearGradient%3E%3ClinearGradient id='b2' xlink:href='%23b1' x1='16' y1='47.2' x2='71.3' y2='47.2' gradientUnits='userSpaceOnUse'/%3E%3Cfilter id='f1' x='-20%25' y='-20%25' width='140%25' height='140%25'%3E%3CfeGaussianBlur in='SourceGraphic' stdDeviation='1.5' result='blur'/%3E%3CfeMerge%3E%3CfeMergeNode in='blur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Cpath d='M50 5 L93 30 V70 L50 95 L7 70 V30 Z' stroke='url(%23c1)' stroke-width='4' fill='none' filter='url(%23f1)' stroke-linejoin='round'/%3E%3Cpath d='M7 30 L30 50 M93 30 L70 50 M7 70 L30 50 M93 70 L70 50' stroke='url(%23c1)' stroke-width='1' opacity='0.3'/%3E%3Cg filter='url(%23f1)'%3E%3Ccircle cx='50' cy='50' r='38' stroke='url(%23c1)' stroke-width='1' opacity='0.2' stroke-dasharray='3 3'/%3E%3Ccircle cx='50' cy='50' r='26' stroke='url(%23c1)' stroke-width='3' fill='none'/%3E%3Cpath d='M50 18 V24 M82 50 H76 M50 82 V76 M18 50 H24 M72 28 L67 33 M72 72 L67 67 M28 72 L33 67 M28 28 L33 33' stroke='url(%23c1)' stroke-width='4' stroke-linecap='round'/%3E%3C/g%3E%3Cg filter='url(%23f1)'%3E%3Ccircle cx='50' cy='50' r='5' fill='url(%23c1)'/%3E%3Cpath d='M50 50 L47 20 L50 18 L53 20 Z' fill='url(%23c1)'/%3E%3Cpath d='M47 20 L50 12 L53 20 L50 18 Z' fill='white'/%3E%3Cpath d='m 49.8,49.9 30,-3 2,3 -2,3 z' style='fill:url(%23h1)'/%3E%3Cpath d='M 45.1,22 C 58.7,24.2 68.3,37.4 66.1,51 63.9,64.7 50.7,74.2 37,72 30.2,71 23.9,67 20,61.2' style='fill:none;stroke:url(%23b2);stroke-width:9.75;stroke-linecap:butt' transform='matrix(-0.122,0.691,-0.691,-0.122,87.8,27.7)'/%3E%3C/g%3E%3C/svg%3E">
    <script src="https://cdn.tailwindcss.com/3.4.1"></script>
    <script>
        tailwind.config={
            darkMode: 'class',
            theme:{
                extend:{
                    fontFamily:{sans:['Rajdhani','sans-serif'],mono:['JetBrains Mono','monospace']},
                    colors:{body:'var(--bg-body)',panel:'var(--bg-panel)',border:'var(--border)',textMain:'var(--text-main)',textDim:'var(--text-dim)'}
                }
            }
        }
    </script>
    <link href="https://fonts.loli.net/css2?family=JetBrains+Mono:wght@400;700&family=Rajdhani:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/element-plus@2.11.9/dist/index.css" />
    <link rel="stylesheet" href="https://unpkg.com/element-plus@2.11.9/theme-chalk/dark/css-vars.css">
    
    <script src="https://unpkg.com/vue@3.5.25/dist/vue.global.prod.js"></script>
    <script src="https://unpkg.com/element-plus@2.11.9/dist/index.full.min.js"></script>
    <script src="https://unpkg.com/@element-plus/icons-vue@2.3.2/dist/index.iife.min.js"></script>
    <script src="//unpkg.com/element-plus@2.11.9/dist/locale/zh-cn.min.js"></script>
    <script>
        window.ElementPlusIconsVue = window.ElementPlusIconsVue || window.ElementPlusIcons;
        window.onload = function() {
            if (typeof Vue === 'undefined') alert('错误：Vue 加载失败，请检查网络或更换 CDN。');
            else if (typeof ElementPlus === 'undefined') alert('错误：ElementPlus 加载失败。');
        }
    </script>
    <style>
        :root {
            --bg-body: #f1f5f9;
            --bg-panel: #ffffff;
            --text-main: #0f172a;
            --text-dim: #64748b;
            --border: #cbd5e1;
            --el-bg-color: #ffffff;
        }
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        @keyframes breathe-glow {
            0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 0px rgba(34, 211, 238, 0)); }
            50% { opacity: 1; filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.8)); }
        }
        .anim-spin {
            transform-origin: center;
            transform-box: view-box;
            animation: spin-slow 30s linear infinite; /* 30秒转一圈 */
        }
        .anim-breathe {
            animation: breathe-glow 3s ease-in-out infinite;
        }
        /* --------------------------- */       
        html.dark {
            --bg-body: #020617; 
            --bg-panel: #0f172a; 
            --text-main: #f1f5f9; 
            --text-dim: #94a3b8; 
            --border: #1e293b;   
            --el-bg-color: #0f172a; 
            --el-text-color-primary: #f1f5f9;
            --el-text-color-regular: #cbd5e1;
            --el-border-color: #1e293b;
            --el-border-color-light: #334155;
            --el-fill-color-blank: #0f172a;
        }

        body { background: var(--bg-body); color: var(--text-main); font-family: 'Rajdhani', sans-serif; background-image: linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px); background-size: 40px 40px; transition: background-color 0.3s, color 0.3s; }
        /* Dark Mode Grid Background */
        html.dark body {
            background-image: linear-gradient(rgba(96, 165, 250, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(96, 165, 250, 0.1) 1px, transparent 1px);
            background-size: 40px 40px;
        }

        .mecha-panel { background: var(--bg-panel); border: 1px solid var(--border); clip-path: polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: background-color 0.3s, border-color 0.3s; }
        
        .mecha-btn { clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); border-radius: 0!important; border: none!important; font-weight: 700!important; letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s; }
        .mecha-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .mecha-btn.is-circle { clip-path: none !important; border-radius: 50% !important; width: 32px; height: 32px; padding: 8px; }
        
        .el-dialog, .el-drawer { --el-bg-color: var(--bg-panel); border: 1px solid var(--border); border-radius: 0!important; clip-path: polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%); }
        .el-dialog__title, .el-drawer__title { color: var(--text-main) !important; }
        .el-input__wrapper { background-color: var(--bg-body)!important; border-radius: 0!important; box-shadow: 0 0 0 1px var(--border) inset!important; }
        .el-input__inner { color: var(--text-main) !important; }
        
        .radio-group-fix { display: flex; width: 100%; gap: 8px; }
        .radio-item { flex: 1; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-dim); font-weight: 700; transition: all 0.3s; clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px); }
        .radio-item.active { background: rgba(37, 99, 235, 0.15); border-color: #2563eb; color: #2563eb; }
        
        .el-input-group__append { background-color: var(--bg-body) !important; box-shadow: none !important; padding: 0 !important; border-left: 1px solid var(--border); }
        .el-input-group__append .el-input__wrapper { box-shadow: none !important; background-color: transparent !important; }
        .el-input-group__append .el-select .el-input.is-focus .el-input__wrapper { box-shadow: none !important; }
        .el-input-group__append .el-select { margin: 0; }
        .el-input-group__append .el-select .el-input__inner { text-align: center; font-weight: bold; font-size: 12px; }
        
        .disabled-row { opacity: 0.5; filter: grayscale(1); }
        .tag-compact { display: inline-flex; height: 16px; padding: 0 6px; border-radius: 3px; font-size: 9px; font-weight: 600; background: var(--bg-body); color: var(--text-dim); border: 1px solid var(--border); align-items: center; }
        
        .filter-row { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
        @media (min-width: 640px) { .filter-row { flex-direction: row; align-items: center; } }
        .search-box { width: 100%; max-width: 250px; }
        .filter-bar { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; align-items: center; flex: 1; }
        .filter-chip { position: relative; padding: 4px 12px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-dim); transition: all 0.2s; clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px); overflow: hidden; flex-shrink: 0; }
        .filter-chip.active { background: #2563eb; color: white; border-color: #2563eb; }
        .tag-count-badge { display: inline-flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.1); border-radius: 4px; padding: 0 4px; margin-left: 6px; font-size: 10px; height: 16px; font-family: 'JetBrains Mono', monospace; }
        html.dark .tag-count-badge { background: rgba(255,255,255,0.1); color: #fff; }
        .filter-chip.active .tag-count-badge { background: rgba(255,255,255,0.3); color: #fff; }
        .chip-active-bar { position: absolute; bottom: 0; left: 0; height: 3px; background: #22d3ee; box-shadow: 0 -1px 4px #22d3ee; width: 0%; animation: chipScan 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes chipScan { from { width: 0%; opacity: 0.5; } to { width: 100%; opacity: 1; } }
        
        .hud-panel { margin-top: 10px; margin-bottom: 5px; background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%); border-left: 4px solid #3b82f6; color: #fff; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%); box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease-out; }
        .hud-text { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: bold; letter-spacing: 1px; }
        .hud-bar-container { display: flex; flex-direction: row; align-items: center; gap: 4px; height: 16px; }
        .hud-bar { width: 4px; background: #334155; transform: skewX(-20deg); flex-shrink: 0; animation: hud-equalizer 1s infinite ease-in-out; }
        @keyframes hud-equalizer { 0%,100% { height: 4px; opacity: 0.5; } 50% { height: 12px; background: #22d3ee; opacity: 1; box-shadow: 0 0 5px #22d3ee; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Lunar Popper Styles */
        .lunar-popper .el-date-table td { height: 40px!important; padding: 2px!important; }
        .lunar-popper .el-date-table td .el-date-table-cell { height: 100%!important; padding: 0!important; display: block; }
        .lunar-cell { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .lunar-cell .view-date { display: flex; flex-direction: column; align-items: center; gap: 0px !important; }
        .lunar-cell .view-month, .lunar-cell .view-year { display: none; }
        
        .lunar-popper .el-month-table .lunar-cell .view-date, .lunar-popper .el-month-table .lunar-cell .view-year { display: none!important; }
        .lunar-popper .el-month-table .lunar-cell .view-month { display: flex!important; align-items: center; justify-content: center; height: 100%; font-size: 14px; font-weight: bold; }
        .lunar-popper .el-year-table .lunar-cell .view-date, .lunar-popper .el-year-table .lunar-cell .view-month { display: none!important; }
        .lunar-popper .el-year-table .lunar-cell .view-year { display: flex!important; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
        
        .view-year .y-num { font-size: 16px; font-weight: bold; } 
        .view-year .y-ganzhi { font-size: 12px; color: #909399; transform: scale(0.9); margin-top: -2px; display: block!important; }
        .lunar-cell .lunar { font-size: 10px; color: #94a3b8; line-height: 1.1 !important; margin-top: 0 !important; transform: scale(0.9); }
        .bar-scanner { background-color: #3b82f6; box-shadow: 0 0 2px rgba(59,130,246,0.3); transform: scaleX(1); animation: scanner-wave 3s ease-in-out infinite; }
        @keyframes scanner-wave { 0%,100% { background-color:#3b82f6; transform:scaleX(1); } 50% { background-color:#22d3ee; box-shadow:0 0 12px #22d3ee; transform:scaleX(1.3); } }
        .sys-beat-container { display: inline-flex; align-items: center; gap: 2px; margin-left: 12px; padding-left: 12px; border-left: 1px solid #cbd5e1; height: 16px; }
        .sys-beat-bar { width: 3px; height: 8px; background: #94a3b8; transform: skewX(-20deg); animation: sys-beat 1.2s infinite ease-in-out; }
        @keyframes sys-beat { 0%,100% { height:6px; background:#cbd5e1; } 50% { height:14px; background:#10b981; box-shadow:0 0 5px #10b981; } }
        .terminal-window { background-color: #0f172a; color: #4ade80; font-family: 'JetBrains Mono', monospace; padding: 16px; height: 320px; overflow-y: auto; border: 1px solid #334155; font-size: 13px; line-height: 1.5; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); }
        .terminal-line { margin-bottom: 4px; display: flex; }
        .terminal-line::before { content: '>'; color: #3b82f6; margin-right: 8px; font-weight: bold; }
        .typing-cursor::after { content: '▋'; animation: blink 1s infinite; color: #4ade80; margin-left: 4px; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        
        /* Date Picker Active States */
        .lunar-popper .el-date-table td.current, .lunar-popper .el-year-table td.current, .lunar-popper .el-month-table td.current { --el-datepicker-active-color: transparent !important; background-color: transparent !important; }
        
        /* The blue selection box for date view */
        .lunar-popper .el-date-table td.current .lunar-cell { background-color: #2563eb; border-radius: 4px; color: #ffffff !important; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); }
        .lunar-popper .el-date-table td.current .el-date-table-cell__text { background-color: transparent !important; }
        .lunar-popper .el-date-table td.current .lunar-cell .solar, .lunar-popper .el-date-table td.current .lunar-cell .lunar { color: #ffffff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        
        /* Hover states for all views */
        .lunar-popper .el-date-table td.available:hover, .lunar-popper .el-year-table td.available:hover, .lunar-popper .el-month-table td.available:hover { background-color: transparent !important; }
        .lunar-popper .el-date-table td.available:not(.current):hover .lunar-cell { background-color: rgba(37, 99, 235, 0.05) !important; border-radius: 4px; box-shadow: 0 0 0 1px #2563eb inset; cursor: pointer; transition: all 0.2s; }
        .lunar-popper .el-date-table td.available:not(.current):hover .lunar-cell .solar, .lunar-popper .el-date-table td.available:not(.current):hover .lunar-cell .lunar { color: #2563eb !important; font-weight: bold; }        
        .lunar-cell .solar { line-height: 1.2 !important; font-size: 14px; font-weight: bold; }
        
        /* 年视图和月视图选中状态 - 使用 .lunar-cell 而不是 .cell */
        .lunar-popper .el-year-table td.current .lunar-cell, 
        .lunar-popper .el-month-table td.current .lunar-cell { 
            background-color: #2563eb !important; 
            color: #fff !important; 
            border-radius: 4px !important; 
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4) !important; 
        }
        
        /* 选中状态下的所有文字为白色 */
        .lunar-popper .el-year-table td.current .lunar-cell .y-num,
        .lunar-popper .el-year-table td.current .lunar-cell .y-ganzhi,
        .lunar-popper .el-month-table td.current .lunar-cell .view-month { 
            color: #ffffff !important; 
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        /* Hover 状态 - 年视图和月视图 */
        .lunar-popper .el-year-table td.available:not(.current):hover .lunar-cell,
        .lunar-popper .el-year-table td:not(.current):not(.disabled):hover .lunar-cell,
        .lunar-popper .el-month-table td.available:not(.current):hover .lunar-cell,
        .lunar-popper .el-month-table td:not(.current):not(.disabled):hover .lunar-cell { 
            background-color: rgba(37, 99, 235, 0.05) !important; 
            border-radius: 4px !important; 
            box-shadow: 0 0 0 1px #2563eb inset !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
        }
        
        /* Hover 状态下的文字颜色 - 年视图 */
        .lunar-popper .el-year-table td:not(.current):not(.disabled):hover .lunar-cell .y-num,
        .lunar-popper .el-year-table td:not(.current):not(.disabled):hover .lunar-cell .y-ganzhi { 
            color: #2563eb !important; 
            font-weight: bold !important;
        }
        
        /* Hover 状态下的文字颜色 - 月视图 */
        .lunar-popper .el-month-table td:not(.current):not(.disabled):hover .lunar-cell .view-month { 
            color: #2563eb !important; 
            font-weight: bold !important;
        }
        .el-table { --el-table-bg-color: var(--bg-panel); --el-table-tr-bg-color: var(--bg-panel); --el-table-header-bg-color: var(--bg-body); --el-table-row-hover-bg-color: var(--bg-body); --el-table-border-color: var(--border); --el-table-text-color: var(--text-main); --el-table-header-text-color: var(--text-dim); }
        html.dark .lunar-popper .el-year-table td .cell, html.dark .lunar-popper .el-month-table td .cell { color: #cbd5e1; }
        
        .notify-tabs .el-tabs__header { margin-bottom: 20px; }
        .notify-tabs .el-tabs__nav-wrap::after { background-color: var(--border); }
        .notify-item-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .notify-label { width: 90px; text-align: right; font-size: 12px; color: var(--text-dim); font-weight: 600; flex-shrink: 0; }
    </style>
</head>
<body>
    <div id="app" class="min-h-screen p-4 sm:p-8 flex flex-col transition-colors duration-300">
        <el-config-provider :locale="locale">
            <div v-if="!isLoggedIn" class="fixed inset-0 bg-slate-500/50 backdrop-blur flex items-center justify-center z-50">
                <div class="mecha-panel p-12 w-full max-w-md text-center !border-t-4 !border-t-blue-500" style="clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px);">
                    <h2 class="text-4xl mb-2 font-black tracking-[0.2em] text-blue-600">登录/LOGIN</h2>
                    <el-input v-model="password" type="password" :placeholder="t('passwordPlaceholder')" show-password class="mb-8" size="large" @keyup.enter="login"><template #prefix><el-icon><Lock /></el-icon></template></el-input>
                    <button class="w-full h-12 text-xl mecha-btn bg-blue-600 text-white" @click="login" :disabled="loading">{{ loading ? '验证中/AUTHENTICATING...' : '>> ' + t('unlockBtn') }}</button>
                </div>
            </div>

            <div v-else class="max-w-7xl mx-auto w-full">
                <div class="flex flex-col lg:flex-row justify-between items-center mb-10 gap-6">
                    <div class="flex items-center gap-5 self-start lg:self-center">
                        
                    <div class="relative w-14 h-14 shrink-0 drop-shadow-md">
                    <svg width="56" height="56" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                        <defs>
                            <linearGradient id="cGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#2563eb"/><stop offset="100%" style="stop-color:#22d3ee"/></linearGradient>
                            <linearGradient id="hGrad" x1="108.5" y1="7.8" x2="122.4" y2="21.7" gradientTransform="matrix(0,0.433,-2.309,0,99.8,-0.06)" gradientUnits="userSpaceOnUse"><stop offset="0%" style="stop-color:#2563eb"/><stop offset="100%" style="stop-color:#22d3ee"/></linearGradient>
                            <linearGradient id="bGradBase" x1="30.4" y1="54.5" x2="30.4" y2="14.8" gradientTransform="scale(0.694,1.441)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#26afe1;stop-opacity:1"/><stop offset="1" style="stop-color:#ee5a22;stop-opacity:0.7"/></linearGradient>
                            <linearGradient id="bGrad" xlink:href="#bGradBase" x1="16" y1="47.2" x2="71.3" y2="47.2" gradientUnits="userSpaceOnUse"/>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        </defs>
                        
                        <path class="anim-breathe" d="M50 5 L93 30 V70 L50 95 L7 70 V30 Z" stroke="url(#cGrad)" stroke-width="4" fill="none" filter="url(#glow)" stroke-linejoin="round"/>
                        <path d="M7 30 L30 50 M93 30 L70 50 M7 70 L30 50 M93 70 L70 50" stroke="url(#cGrad)" stroke-width="1" opacity="0.3"/>
                        
                        <g class="anim-spin" filter="url(#glow)">
                            <circle cx="50" cy="50" r="38" stroke="url(#cGrad)" stroke-width="1" opacity="0.2" stroke-dasharray="3 3"/>
                            <circle cx="50" cy="50" r="26" stroke="url(#cGrad)" stroke-width="3" fill="none"/>
                            <path d="M50 18 V24 M82 50 H76 M50 82 V76 M18 50 H24 M72 28 L67 33 M72 72 L67 67 M28 72 L33 67 M28 28 L33 33" stroke="url(#cGrad)" stroke-width="4" stroke-linecap="round"/>
                        </g>
                        
                        <g filter="url(#glow)">
                            <circle cx="50" cy="50" r="5" fill="url(#cGrad)"/>
                            <path d="M50 50 L47 20 L50 18 L53 20 Z" fill="url(#cGrad)"/>
                            <path d="M47 20 L50 12 L53 20 L50 18 Z" fill="white"/>
                            <path d="m 49.8,49.9 30,-3 2,3 -2,3 z" style="fill:url(#hGrad)"/>
                            <path class="anim-breathe" d="M 45.1,22 C 58.7,24.2 68.3,37.4 66.1,51 63.9,64.7 50.7,74.2 37,72 30.2,71 23.9,67 20,61.2" style="fill:none;stroke:url(#bGrad);stroke-width:9.75;stroke-linecap:butt" transform="matrix(-0.122,0.691,-0.691,-0.122,87.8,27.7)"/>
                        </g>
                    </svg>
                </div>
                        <div class="flex flex-col">
                            <div class="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                                <h1 class="text-4xl font-black tracking-tighter text-textMain">RenewHelper</h1>
                                <span class="text-2xl text-slate-300 font-light hidden sm:inline-block">|</span>
                                <span class="text-2xl font-bold text-blue-600 tracking-wider" style="font-family: 'Microsoft YaHei', sans-serif;">时序·守望</span>
                                <div class="sys-beat-container ml-1 pl-3 border-l border-slate-300 self-center" title="SYSTEM ONLINE" style="height: 20px">
                                    <div class="sys-beat-bar" style="animation-delay:0s"></div><div class="sys-beat-bar" style="animation-delay:0.15s"></div><div class="sys-beat-bar" style="animation-delay:0.3s"></div>
                                </div>
                            </div>
                            <div class="flex items-center mt-1 flex-wrap gap-2">
                                <p class="text-[10px] text-gray-400 font-mono tracking-[0.15em] uppercase whitespace-nowrap">Service Lifecycle Management</p>
                                <span class="text-[10px] text-blue-400 font-bold font-mono">///</span>
                                <p class="text-[10px] text-gray-500 font-bold tracking-[0.1em] whitespace-nowrap" style="font-family: 'Microsoft YaHei', sans-serif;">分布式云资产全周期托管中枢</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 p-3 mecha-panel">
                        <el-button class="mecha-btn !bg-emerald-600 !text-white" :icon="VideoPlay" @click="runCheck" :loading="checking">{{ t('check') }}</el-button>
                        <el-button class="mecha-btn !bg-blue-600 !text-white" :icon="Plus" @click="openAdd">{{ t('add') }}</el-button>
                        <div class="w-px h-8 bg-border mx-1 self-center"></div>
                        <el-button class="mecha-btn !bg-indigo-600 !text-white" :icon="Setting" @click="openSettings">{{ t('settings') }}</el-button>
                        <el-button class="mecha-btn !bg-amber-600 !text-white" :icon="Document" @click="openHistoryLogs">{{ t('logs') }}</el-button>
                        <el-button class="mecha-btn !bg-cyan-700 !text-white font-mono" @click="toggleLang">{{ lang==='zh'?'EN':'ZH' }}</el-button>
                        <el-button class="mecha-btn !bg-slate-600 !text-white" circle :icon="isDark ? Sunny : Moon" @click="toggleTheme"></el-button>
                        <div class="w-px h-8 bg-border mx-1 self-center"></div>
                        <el-button class="mecha-btn !bg-red-600 !text-white" :icon="SwitchButton" @click="logout">{{ t('logout') }}</el-button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div class="mecha-panel p-6 pl-8 border-l-4 !border-l-blue-500"><div class="text-blue-600 text-xs font-bold font-mono mb-2 tracking-widest">{{ t('totalServices') }}</div><div class="text-5xl font-black font-mono text-textMain">{{ list.length }}</div></div>
                    <div class="mecha-panel p-6 pl-8 border-l-4 !border-l-amber-500"><div class="text-amber-600 text-xs font-bold font-mono mb-2 tracking-widest">{{ t('expiringSoon') }}</div><div class="text-5xl font-black font-mono text-amber-500">{{ expiringCount }}</div></div>
                    <div class="mecha-panel p-6 pl-8 border-l-4 !border-l-red-500"><div class="text-red-600 text-xs font-bold font-mono mb-2 tracking-widest">{{ t('expiredAlert') }}</div><div class="text-5xl font-black font-mono text-red-500">{{ expiredCount }}</div></div>
                </div>

                <div class="filter-row" v-if="list.length > 0">
                    <div class="search-box"><el-input v-model="searchKeyword" :placeholder="t('searchPlaceholder')" clearable :prefix-icon="Search"></el-input></div>
                    <div class="filter-bar" v-if="allTags.length > 0">
                        <div class="filter-chip" :class="{active:currentTag===''}" @click="currentTag=''">{{ t('tagAll') }}<div v-if="currentTag===''" class="chip-active-bar"></div></div>
                        <div class="filter-chip" :class="{active:currentTag==='DISABLED'}" @click="currentTag='DISABLED'">{{ t('disabledFilter') }}<span class="tag-count-badge">{{ disabledCount }}</span><div v-if="currentTag==='DISABLED'" class="chip-active-bar"></div></div>
                        <div class="filter-chip" v-for="tag in allTags" :key="tag" :class="{active:currentTag===tag}" @click="currentTag=tag">{{ tag }} <span class="tag-count-badge">{{ getTagCount(tag) }}</span><div v-if="currentTag===tag" class="chip-active-bar"></div></div>
                    </div>
                </div>

                <div v-if="currentTag" class="hud-panel">
                    <div class="hud-text">MONITORING // TAG: <span class="hud-accent" style="color:#22d3ee">{{ currentTag }}</span></div>
                    <div class="hud-bar-container"><div class="hud-text" style="margin-right:12px;color:#94a3b8">MATCHED: <span class="text-white text-lg mx-1">{{ filteredList.length }}</span></div><div class="hud-bar" style="animation-delay:0s"></div><div class="hud-bar" style="animation-delay:0.1s"></div><div class="hud-bar" style="animation-delay:0.2s"></div><div class="hud-bar" style="animation-delay:0.3s"></div><div class="hud-bar" style="animation-delay:0.4s"></div></div>
                </div>
  <div class="mecha-panel p-1 !border-l-0">
    <el-table :key="tableKey" :data="pagedList" style="width:100%" v-loading="loading" :row-class-name="tableRowClassName" size="large">       
        <el-table-column :label="t('serviceName')" min-width="230">
            <template #default="scope">
                <div class="flex items-center gap-4">
                    <div class="w-1 h-8 shrink-0 rounded-[1px] transition-all" :class="[scope.row.enabled?'bar-scanner':'bg-gray-300']" :style="scope.row.enabled?{animationDelay:(scope.$index*0.15)+'s'}:{}"></div>
                    <div class="min-w-0">
                        <div class="font-bold text-base leading-tight tracking-tight text-textMain break-words flex items-center gap-2">{{ scope.row.name }}</div>
                        <div class="text-xs text-textDim font-mono mt-0.5" v-if="scope.row.message">// {{ scope.row.message }}</div>
                    </div>
                </div>
            </template>
        </el-table-column>

        <el-table-column :label="t('tagsCol')" min-width="120">
            <template #default="scope">
                <div class="tag-container"><span v-for="tag in scope.row.tags" :key="tag" class="tag-compact">{{ tag }}</span></div>
            </template>
        </el-table-column>

        <el-table-column :label="t('type')" width="100">
            <template #default="scope">
                <div class="flex items-center h-full">
                    <span v-if="scope.row.type==='reset'" class="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 tracking-wider whitespace-nowrap">{{ t('typeReset') }}</span>
                    <span v-else class="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 tracking-wider whitespace-nowrap">{{ t('typeCycle') }}</span>
                </div>
            </template>
        </el-table-column>

        <el-table-column :label="t('nextDue')" min-width="200">
            <template #default="scope">
                <div v-if="scope.row.enabled">
                    <div class="flex items-center gap-2">
                        <div class="font-mono text-xl font-bold leading-none tracking-tight" :class="getDaysClass(scope.row.daysLeft)">{{ formatDaysLeft(scope.row.daysLeft) }}</div>
                        <div v-if="scope.row.useLunar" class="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1 py-[2px] leading-none whitespace-nowrap">{{ t('lunarCal') }}</div>
                    </div>
                    <div class="text-[10px] text-textDim font-mono mt-1 flex flex-wrap items-center gap-1.5 leading-tight">
                        <span>TARGET: {{ scope.row.nextDueDate }}</span>
                        <span v-if="scope.row.useLunar && scope.row.nextDueDateLunar" class="text-blue-500/80">({{ scope.row.nextDueDateLunar }})</span>
                    </div>
                </div>
                <div v-else class="text-gray-400 font-mono text-xs tracking-widest">:: {{ t('lbOffline') }} ::</div>
            </template>
        </el-table-column>

        <el-table-column :label="t('uptime')" width="120">
            <template #default="scope">
                <span class="inline-block bg-body text-textDim border border-border px-2 py-1 font-mono text-sm font-bold">{{ scope.row.serviceDays }} {{ t('daysUnit') }}</span>
            </template>
        </el-table-column>

        <el-table-column :label="t('lastRenew')" width="140">
            <template #default="scope">
                <div class="font-mono text-textDim text-sm font-bold">{{ scope.row.lastRenewDate }}</div>
                <div v-if="scope.row.useLunar && scope.row.lastRenewDateLunar" class="text-[10px] text-gray-400 font-mono">({{ scope.row.lastRenewDateLunar }})</div>
            </template>
        </el-table-column>

        <el-table-column :label="t('cyclePeriod')" width="90">
            <template #default="scope">
                <span class="font-mono font-bold text-lg text-textDim">{{ scope.row.intervalDays }}</span> 
                <span class="text-[10px] text-gray-400 uppercase align-top">{{ t('unit.'+(scope.row.cycleUnit||'day')) }}</span>
            </template>
        </el-table-column>

        <el-table-column :label="t('actions')" width="180" fixed="right" align="right">
            <template #default="scope">
                <div class="flex justify-end items-center gap-2">
                    <el-tooltip :content="t('tipToggle')" placement="top" :hide-after="0">
                        <div class="inline-flex">
                            <el-switch v-model="scope.row.enabled" size="small" style="--el-switch-on-color:#2563eb;" @change="toggleEnable(scope.row)"></el-switch>
                        </div>
                    </el-tooltip>
                    <el-popconfirm 
                        :title="t('msg.confirmRenew').replace('%s', scope.row.name)"
                        :confirm-button-text="t('yes')" 
                        :cancel-button-text="t('no')"
                        width="200"
                        @confirm="manualRenew(scope.row)">
                        <template #reference>
                            <div class="inline-flex">
                                <el-tooltip :content="t('tipRenew')" placement="top" :hide-after="0">
                                    <el-button class="!p-2 !rounded-none !ml-0" size="small" type="success" plain :icon="RefreshRight"></el-button>
                                </el-tooltip>
                            </div>
                        </template>
                    </el-popconfirm>
                    <el-tooltip :content="t('tipEdit')" placement="top" :hide-after="0">
                        <el-button class="!p-2 !rounded-none !ml-0" size="small" type="primary" plain :icon="Edit" @click="editItem(scope.row)"></el-button>
                    </el-tooltip>
                <el-popconfirm 
                    :title="t('msg.confirmDel')"
                    :confirm-button-text="t('yes')" 
                    :cancel-button-text="t('no')"
                    width="200"
                    @confirm="deleteItem(scope.row)">
                    <template #reference>
                        <div class="inline-flex">
                            <el-tooltip :content="t('tipDelete')" placement="top" :hide-after="0">
                                <el-button class="!p-2 !rounded-none !ml-0" size="small" type="danger" plain :icon="Delete"></el-button>
                            </el-tooltip>
                        </div>
                    </template>
                </el-popconfirm>
                                </div>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
                <div class="mt-4 flex justify-end">
                    <div class="mecha-panel p-2 inline-block">
                        <el-pagination
                            v-model:current-page="currentPage"
                            v-model:page-size="pageSize"
                            :page-sizes="[10, 15, 30, 50, 100]"
                            :background="true"
                            layout="total, sizes, prev, pager, next, jumper"
                            :total="filteredList.length"
                            @size-change="() => window.scrollTo({top: 0, behavior: 'smooth'})"
                            @current-change="() => window.scrollTo({top: 0, behavior: 'smooth'})"
                        />
                    </div>
                </div>

                <div class="mt-8 py-6 text-center border-t border-slate-200/60">
                    <p class="text-[10px] text-gray-400 font-mono tracking-[0.2em] uppercase flex justify-center items-center gap-1">
                        &copy; 2025 <a href="https://github.com/ieax/renewhelper" target="_blank" class="font-bold text-slate-600 hover:text-blue-600 transition-colors border-b border-dashed border-slate-300 hover:border-blue-600 pb-0.5 mx-1 decoration-0">RenewHelper</a>
                        <span class="text-blue-500 font-bold">${APP_VERSION}</span><span class="mx-2 opacity-30">|</span>DESIGNED BY <span class="font-bold text-slate-600">LOSTFREE</span>
                    </p>
                </div>                  
            </div>

            <el-dialog v-model="dialogVisible" :title="isEdit?t('editService'):t('newService')" width="680px" align-center class="!rounded-none mecha-panel" style="clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);">
                <el-form :model="form" label-position="top">
                    <el-form-item :label="t('formName')"><el-input v-model="form.name" size="large"><template #prefix><el-icon><Monitor/></el-icon></template></el-input></el-form-item>
                    <el-form-item :label="t('tags')"><el-select v-model="form.tags" multiple filterable allow-create default-first-option :placeholder="t('tagPlaceholder')" style="width:100%" size="large"><el-option v-for="tag in allTags" :key="tag" :label="tag" :value="tag"></el-option></el-select></el-form-item>

                    <div class="flex flex-col sm:flex-row items-end gap-4 mb-4">
                        <el-form-item :label="t('formType')" class="!mb-0 flex-1 w-full"><div class="radio-group-fix"><div class="radio-item" :class="{active:form.type==='cycle'}" @click="form.type='cycle'">📅 {{ t('cycle') }}</div><div class="radio-item" :class="{active:form.type==='reset'}" @click="form.type='reset'">⏳ {{ t('reset') }}</div></div></el-form-item>
                        <div class="w-px h-8 bg-slate-300 hidden sm:block mb-1"></div>
                        <el-form-item :label="t('interval')" class="!mb-0 w-48">
                            <el-input v-model.number="form.intervalDays" type="number" :min="1">
                                <template #append>
                                    <el-select v-model="form.cycleUnit" style="width:80px" :teleported="false">
                                        <el-option :label="t('unit.day')" value="day"></el-option>
                                        <el-option :label="t('unit.month')" value="month"></el-option>
                                        <el-option :label="t('unit.year')" value="year"></el-option>
                                    </el-select>
                                </template>
                            </el-input>
                        </el-form-item>
                        <div class="w-px h-8 bg-slate-300 hidden sm:block mb-1"></div>
                        <el-form-item :label="t('useLunar')" class="!mb-0"><el-switch v-model="form.useLunar" style="--el-switch-on-color:#2563eb;"></el-switch></el-form-item>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <el-form-item class="!mb-0">
                            <template #label><div class="flex items-center gap-2"><span>{{ t('createDate') }}</span><span v-if="form.useLunar && form.createDate" class="text-[12px] font-bold text-purple-600 font-mono ml-1">{{ getLunarStr(form.createDate).replace('农历: ','') }}</span></div></template>
                            <el-date-picker v-model="form.createDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" :disabled="isEdit" popper-class="lunar-popper"><template #default="c"><div class="lunar-cell"><div class="view-date"><span class="solar">{{c.text}}</span><span class="lunar">{{getSmartLunarText(c)}}</span></div><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span><span class="y-ganzhi">{{getYearGanZhi(c.text)}}</span></div></div></template></el-date-picker>
                        </el-form-item>
                        <el-form-item class="!mb-0">
                            <template #label><div class="flex items-center gap-2"><span>{{ t('lastRenew') }}</span><span v-if="form.useLunar && form.lastRenewDate" class="text-[12px] font-bold text-purple-600 font-mono ml-1">{{ getLunarStr(form.lastRenewDate).replace('农历: ','') }}</span></div></template>
                            <el-date-picker v-model="form.lastRenewDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" popper-class="lunar-popper"><template #default="c"><div class="lunar-cell"><div class="view-date"><span class="solar">{{c.text}}</span><span class="lunar">{{getSmartLunarText(c)}}</span></div><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span><span class="y-ganzhi">{{getYearGanZhi(c.text)}}</span></div></div></template></el-date-picker>
                        </el-form-item>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 border-t border-slate-100 pt-4">
                        <el-form-item :label="t('policyNotify')" class="!mb-0">
                            <div class="flex gap-2">
                                <el-input-number v-model="form.notifyDays" :min="0" controls-position="right" class="!w-24"></el-input-number>
                                <el-time-select v-model="form.notifyTime" start="00:00" step="00:30" end="23:30" placeholder="08:00" class="!flex-1" :clearable="false"/>
                            </div>
                        </el-form-item>
                        <div class="flex items-end gap-3">
                            <el-form-item :label="t('policyAuto')" class="!mb-0 shrink-0"><el-switch v-model="form.autoRenew" style="--el-switch-on-color:#2563eb;"></el-switch></el-form-item>
                            <el-form-item v-if="form.autoRenew" :label="t('policyRenewDay')" class="!mb-0 flex-1"><el-input-number v-model="form.autoRenewDays" :min="0" controls-position="right" style="width:100%"></el-input-number></el-form-item>
                        </div>
                    </div>

                    <el-form-item :label="t('note')"><el-input v-model="form.message" type="textarea" rows="2"></el-input></el-form-item>
                </el-form>
                
                <template #footer>
                    <div class="flex justify-between items-center w-full pt-2 border-t border-slate-100">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-500">{{ t('status') }}</span>
                            <el-switch v-model="form.enabled" :active-text="t('active')" :inactive-text="t('disabledText')" style="--el-switch-on-color:#2563eb;"></el-switch>
                        </div>
                        <div class="flex gap-3">
                            <el-button @click="dialogVisible=false" size="large" class="mecha-btn">{{ t('cancel') }}</el-button>
                            <el-button type="primary" @click="saveItem" size="large" class="mecha-btn !bg-blue-600">{{ t('save') }}</el-button>
                        </div>
                    </div>
                </template>
            </el-dialog>
            
            <el-dialog v-model="settingsVisible" :title="t('settingsTitle')" width="800px" align-center class="!rounded-none mecha-panel" style="clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);">
                <el-form :model="settingsForm" label-position="left" label-width="120px">
                    <h4 class="text-xs font-bold text-blue-600 mb-4 border-b border-gray-300 pb-2 uppercase">{{ t('secPref') }}</h4>
                    <div class="grid grid-cols-2 gap-6">
                        <el-form-item :label="t('timezone')">
                            <el-select v-model="settingsForm.timezone" style="width:100%" filterable placeholder="Select Timezone">
                                <el-option 
                                    v-for="item in timezoneList" 
                                    :key="item.value" 
                                    :label="item.label" 
                                    :value="item.value">
                                </el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item :label="t('autoDisableThreshold')"><el-input-number v-model="settingsForm.autoDisableDays" :min="1" class="!w-full"></el-input-number></el-form-item>
                    </div>

                    <h4 class="text-xs font-bold text-blue-600 mb-4 mt-4 border-b border-gray-300 pb-2 uppercase">{{ t('secNotify') }}</h4>
                    <div class="flex items-center gap-4 mb-4">
                        <span class="text-sm font-bold text-slate-700">{{ t('pushSwitch') }}</span>
                        <el-switch v-model="settingsForm.enableNotify" style="--el-switch-on-color:#2563eb;"></el-switch>
                    </div>
                    
                    <div v-if="settingsForm.enableNotify">
                        <el-tabs type="border-card" class="notify-tabs">
                            <el-tab-pane>
                                <template #label><span class="flex items-center gap-2"><el-icon><Promotion /></el-icon> Telegram</span></template>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblEnable') }}</span><el-switch v-model="channelMap.telegram" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('telegram')"></el-switch><el-button size="small" type="primary" link @click="testChannel('telegram')" :loading="testing.telegram" style="margin-left:auto">{{ t('btnTest') }}</el-button></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblToken') }}</span><el-input v-model="settingsForm.notifyConfig.telegram.token" placeholder="123456:ABC-DEF..." clearable></el-input></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblChatId') }}</span><el-input v-model="settingsForm.notifyConfig.telegram.chatId" placeholder="-100xxxx" clearable></el-input></div>
                            </el-tab-pane>
                            <el-tab-pane>
                                <template #label><span class="flex items-center gap-2"><el-icon><Iphone /></el-icon> Bark</span></template>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblEnable') }}</span><el-switch v-model="channelMap.bark" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('bark')"></el-switch><el-button size="small" type="primary" link @click="testChannel('bark')" :loading="testing.bark" style="margin-left:auto">{{ t('btnTest') }}</el-button></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblServer') }}</span><el-input v-model="settingsForm.notifyConfig.bark.server" placeholder="https://api.day.app"></el-input></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblDevKey') }}</span><el-input v-model="settingsForm.notifyConfig.bark.key" placeholder="Key"></el-input></div>
                            </el-tab-pane>
                            <el-tab-pane>
                                <template #label><span class="flex items-center gap-2"><el-icon><Message /></el-icon> PushPlus</span></template>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblEnable') }}</span><el-switch v-model="channelMap.pushplus" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('pushplus')"></el-switch><el-button size="small" type="primary" link @click="testChannel('pushplus')" :loading="testing.pushplus" style="margin-left:auto">{{ t('btnTest') }}</el-button></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblToken') }}</span><el-input v-model="settingsForm.notifyConfig.pushplus.token" placeholder="Token"></el-input></div>
                            </el-tab-pane>
                            <el-tab-pane>
                                <template #label><span class="flex items-center gap-2"><el-icon><Bell /></el-icon> NotifyX</span></template>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblEnable') }}</span><el-switch v-model="channelMap.notifyx" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('notifyx')"></el-switch><el-button size="small" type="primary" link @click="testChannel('notifyx')" :loading="testing.notifyx" style="margin-left:auto">{{ t('btnTest') }}</el-button></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblApiKey') }}</span><el-input v-model="settingsForm.notifyConfig.notifyx.apiKey" placeholder="API Key"></el-input></div>
                            </el-tab-pane>
                            <el-tab-pane>
                                <template #label><span class="flex items-center gap-2"><el-icon><Message /></el-icon> Resend</span></template>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblEnable') }}</span><el-switch v-model="channelMap.resend" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('resend')"></el-switch><el-button size="small" type="primary" link @click="testChannel('resend')" :loading="testing.resend" style="margin-left:auto">{{ t('btnTest') }}</el-button></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblApiKey') }}</span><el-input v-model="settingsForm.notifyConfig.resend.apiKey" placeholder="re_..."></el-input></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblFrom') }}</span><el-input v-model="settingsForm.notifyConfig.resend.from" placeholder="onboarding@resend.dev"></el-input></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblTo') }}</span><el-input v-model="settingsForm.notifyConfig.resend.to" placeholder="user@example.com"></el-input></div>
                            </el-tab-pane>
                            <el-tab-pane>
                                <template #label><span class="flex items-center gap-2"><el-icon><Link /></el-icon> Webhook</span></template>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblEnable') }}</span><el-switch v-model="channelMap.webhook" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('webhook')"></el-switch><el-button size="small" type="primary" link @click="testChannel('webhook')" :loading="testing.webhook" style="margin-left:auto">{{ t('btnTest') }}</el-button></div>
                                <div class="notify-item-row"><span class="notify-label">{{ t('lblServer') }}</span><el-input v-model="settingsForm.notifyConfig.webhook.url" placeholder="https://..."></el-input></div>
                            </el-tab-pane>
                        </el-tabs>
                    </div>

					<h4 class="text-xs font-bold text-blue-600 mb-4 mt-8 border-b border-gray-300 pb-2">{{ t('lblIcsTitle') }}</h4>

					<div class="mt-2">
						<div class="flex justify-between items-center mb-2">
							<span class="text-xs font-bold text-gray-500">{{ t('lblIcsUrl') }}</span>
							<el-button 
								type="primary" 
								link 
								size="small" 
								@click="resetCalendarToken" 
								:loading="loading">
								{{ t('btnResetToken') }}
							</el-button>
						</div>

						<div class="flex gap-2 w-full">
							<el-input 
								v-model="calendarUrl" 
								readonly 
								id="icsUrlInput" 
								class="flex-1">
							</el-input>
							<el-button 
								class="mecha-btn !rounded-sm" 
								@click="copyIcsUrl">
								{{ t('btnCopy') }}
							</el-button>
						</div>
					</div>

                    <h4 class="text-xs font-bold text-blue-600 mb-4 mt-8 border-b border-gray-300 pb-2 uppercase">{{ t('secData') }}</h4>
                    <div class="flex gap-4">
                        <el-button type="success" plain :icon="Download" class="flex-1 mecha-btn" @click="exportData">{{ t('btnExport') }}</el-button>
                        <el-button type="warning" plain :icon="Upload" class="flex-1 mecha-btn" @click="triggerImport">{{ t('btnImport') }}</el-button>
                        <input type="file" ref="importRef" style="display:none" accept=".json" @change="handleImportFile">
                    </div>
                </el-form>
                <template #footer><el-button @click="settingsVisible=false" size="large" class="mecha-btn">{{ t('cancel') }}</el-button><el-button type="primary" @click="saveSettings" size="large" class="mecha-btn !bg-blue-600">{{ t('saveSettings') }}</el-button></template>
            </el-dialog>

            <el-drawer v-model="historyVisible" :title="t('sysLogs')" size="600px">
                <div class="p-6" v-loading="historyLoading">
                    <div class="flex gap-2 mb-6">
                        <el-button size="default" type="primary" plain class="flex-1 mecha-btn" @click="openHistoryLogs" :icon="Search">{{ t('btnRefresh') }}</el-button>
                        <el-button size="default" type="danger" plain class="flex-1 mecha-btn" @click="clearLogs" :icon="Delete">{{ t('clearHistory') }}</el-button>
                    </div>
                    <el-timeline v-if="historyLogs.length">
                        <el-timeline-item v-for="(l,i) in historyLogs" :key="i" :timestamp="formatLogTime(l.time)" :type="getLogColor(l.actions)" placement="top" hide-timestamp>
                            <div class="text-xs text-textDim mb-2 font-mono flex justify-between">
                                <span>{{ formatLogTime(l.time) }}</span>
                                <span class="font-bold text-blue-600">{{ l.trigger }}</span>
                            </div>
                            <div class="mecha-panel p-3 !border-l-0 !shadow-none bg-body">
                                <div class="flex flex-wrap gap-2 mb-3">
                                    <span v-for="tag in l.actions" class="text-[10px] font-bold px-1.5 py-0.5 border" :class="getTagClass(tag)">{{ t('tag.'+tag) }}</span>
                                </div>
                                <div class="p-3 text-xs overflow-x-auto max-h-[300px] font-mono text-textDim">
                                    <div v-for="(line,idx) in l.content" :key="idx" class="mb-1 border-l border-border pl-2">{{line}}</div>
                                </div>
                            </div>
                        </el-timeline-item>
                    </el-timeline>
                    <el-empty v-else :description="t('noLogs')"></el-empty>
                </div>
            </el-drawer>
            <el-dialog v-model="logVisible" :title="t('liveLog')" width="650px" align-center class="!rounded-none mecha-panel"><div class="terminal-window" ref="termRef"><div v-for="(line,i) in displayLogs" :key="i" class="terminal-line"><span class="typing-cursor" v-if="i===displayLogs.length-1 && checking"></span>{{ line }}</div><div v-if="checking" class="terminal-line text-blue-400">WAITING FOR RESPONSE...</div></div></el-dialog>
        </el-config-provider>
    </div>
    <script>
        const { createApp, ref, computed, onMounted, nextTick, reactive,watch } = Vue;
        const { ElMessage, ElMessageBox } = ElementPlus;
        const { Edit, Delete, Plus, VideoPlay, Setting, Bell, Document, Lock, Monitor, SwitchButton, Calendar, Timer, Files, AlarmClock, Warning, Search, Cpu, Upload, Download, Link, Message, Promotion, Iphone, Moon, Sunny, RefreshRight } = ElementPlusIconsVue;
        const ZhCn = window.ElementPlusLocaleZhCn || {};
        const messages = {
            zh: { secPref: '偏好设置',manualRenew: '手动续期',tipToggle: '切换状态',tipRenew: '手动续期',tipEdit: '编辑服务',tipDelete: '删除服务',secNotify: '通知配置',secData: '数据管理',lblIcsTitle: '日历订阅',lblIcsUrl: '订阅地址 (iOS/Google)',btnCopy: '复制',btnResetToken: '重置令牌',loginTitle:'身份验证',passwordPlaceholder:'请输入访问密钥/Authorization Key',unlockBtn:'解锁终端/UNLOCK',check:'立即检查',add:'新增服务',settings:'系统设置',logs:'运行日志',logout:'安全退出',totalServices:'服务总数',expiringSoon:'即将到期',expiredAlert:'已过期 / 警告',serviceName:'服务名称',type:'类型',nextDue:'下次到期',uptime:'已运行',lastRenew:'上次续费',cyclePeriod:'周期',actions:'操作',cycle:'循环订阅',reset:'到期重置',disabled:'已停用',days:'天',daysUnit:'天',typeReset:'到期重置',typeCycle:'循环订阅',lunarCal:'农历',lbOffline:'离线',unit:{day:'天',month:'月',year:'年'},editService:'编辑服务',newService:'新增服务',formName:'名称',namePlaceholder:'例如: Netflix',formType:'模式',createDate:'创建时间',interval:'周期时长',note:'备注信息',status:'状态',active:'启用',disabledText:'禁用',cancel:'取消',save:'保存数据',saveSettings:'保存配置',settingsTitle:'系统设置',setNotify:'通知配置',pushSwitch:'推送总开关',pushUrl:'Webhook 地址',notifyThreshold:'提醒阈值',setAuto:'自动化配置',autoRenewSwitch:'自动续期',autoRenewThreshold:'自动续期阈值',autoDisableThreshold:'自动禁用阈值',daysOverdue:'天后触发',sysLogs:'系统日志',execLogs:'执行记录',clearHistory:'清空历史',noLogs:'无记录',liveLog:'实时终端',btnExport: '导出备份',btnImport: '恢复备份',btnTest: '发送测试',btnRefresh:'刷新日志',
            lblEnable: '启用', lblToken: '令牌 (Token)', lblApiKey: 'API Key', lblChatId: '会话ID', 
            lblServer: '服务器URL', lblDevKey: '设备Key', lblFrom: '发件人', lblTo: '收件人',
            lblNotifyTime: '提醒时间', btnResetToken: '重置令牌',
            tag:{alert:'触发提醒',renew:'自动续期',disable:'自动禁用',normal:'检查正常'},msg:{confirmRenew: '确认将 [%s] 的续费日期更新为今天吗？',renewSuccess: '续期成功！日期已更新: %s -> %t',tokenReset: '令牌已重置，请更新订阅地址', copyOk: '链接已复制', exportSuccess: '备份已下载',importSuccess: '数据恢复成功，即将刷新',importFail: '导入失败，请检查文件格式',passReq:'请输入密码',saved:'保存成功',saveFail:'保存失败',cleared:'已清空',clearFail:'清空失败',loginFail:'验证失败',loadLogFail:'日志加载失败',confirmDel:'确认删除此项目?',dateError:'上次续费日期不能早于创建日期',nameReq:'服务名称不能为空',nameExist:'服务名称已存在',futureError:'上次续期不能是未来时间',serviceDisabled:'服务已停用',serviceEnabled:'服务已启用',execFinish: '执行完毕!'},tags:'标签',tagPlaceholder:'输入标签回车创建',searchPlaceholder:'搜索标题或备注...',tagsCol:'标签',tagAll:'全部',useLunar:'农历周期',lunarTip:'按农历日期计算周期',yes:'是',no:'否',timezone:'偏好时区',disabledFilter:'已停用',policyConfig:'自动化策略',policyNotify:'提醒提前期',policyAuto:'自动续期',policyRenewDay:'过期续期天数',useGlobal:'全局默认',autoRenewOnDesc:'过期自动续期',autoRenewOffDesc:'过期自动禁用',},
            en: { secPref: 'PREFERENCES',manualRenew: 'Quick Renew',tipToggle: 'Toggle Status',tipRenew: 'Quick Renew',tipEdit: 'Edit Service',tipDelete: 'Delete Service',secNotify: 'NOTIFICATIONS',secData: 'DATA MANAGEMENT',lblIcsTitle: 'CALENDAR SUBSCRIPTION',lblIcsUrl: 'ICS URL (iOS/Google Calendar)',btnCopy: 'COPY',btnResetToken: 'RESET TOKEN',loginTitle:'SYSTEM ACCESS',passwordPlaceholder:'Authorization Key',unlockBtn:'UNLOCK TERMINAL',check:'CHECK',add:'ADD NEW',settings:'CONFIG',logs:'LOGS',logout:'LOGOUT',totalServices:'TOTAL SERVICES',expiringSoon:'EXPIRING SOON',expiredAlert:'EXPIRED / ALERT',serviceName:'SERVICE NAME',type:'TYPE',nextDue:'NEXT DUE',uptime:'UPTIME',lastRenew:'LAST RENEW',cyclePeriod:'CYCLE',actions:'ACTIONS',cycle:'CYCLE',reset:'RESET',disabled:'DISABLED',days:'DAYS',daysUnit:'DAYS',typeReset:'RESET',typeCycle:'CYCLE',lunarCal:'Lunar',lbOffline:'OFFLINE',unit:{day:'DAY',month:'MTH',year:'YR'},editService:'EDIT SERVICE',newService:'NEW SERVICE',formName:'NAME',namePlaceholder:'e.g. Netflix',formType:'MODE',createDate:'CREATE DATE',interval:'INTERVAL',note:'NOTE',status:'STATUS',active:'ACTIVE',disabledText:'DISABLED',cancel:'CANCEL',save:'SAVE DATA',saveSettings:'SAVE CONFIG',settingsTitle:'SYSTEM CONFIG',setNotify:'NOTIFICATION',pushSwitch:'MASTER PUSH',pushUrl:'WEBHOOK URL',notifyThreshold:'ALERT THRESHOLD',setAuto:'AUTOMATION',autoRenewSwitch:'AUTO RENEW',autoRenewThreshold:'RENEW AFTER',autoDisableThreshold:'DISABLE AFTER',daysOverdue:'DAYS OVERDUE',sysLogs:'SYSTEM LOGS',execLogs:'EXECUTION LOGS',clearHistory:'CLEAR HISTORY',noLogs:'NO DATA',liveLog:'LIVE TERMINAL',btnExport: 'Export Data',btnImport: 'Import Data',btnTest: 'Send Test',btnRefresh:'REFRESH',
            lblEnable: 'Enable', lblToken: 'Token', lblApiKey: 'API Key', lblChatId: 'Chat ID', 
            lblServer: 'Server URL', lblDevKey: 'Device Key', lblFrom: 'From Email', lblTo: 'To Email',
            lblNotifyTime: 'Alarm Time', btnResetToken: 'RESET TOKEN',
            tag:{alert:'ALERT',renew:'RENEWED',disable:'DISABLED',normal:'NORMAL'},msg:{confirmRenew: 'Renew [%s] to today based on your timezone?',renewSuccess: 'Renewed! Date updated: %s -> %t',tokenReset: 'Token Reset. Update your calendar apps.', copyOk: 'Link Copied', exportSuccess: 'Backup Downloaded',importSuccess: 'Restore Success, Refreshing...',importFail: 'Import Failed, Check File Format',passReq:'Password Required',saved:'Data Saved',saveFail:'Save Failed',cleared:'Cleared',clearFail:'Clear Failed',loginFail:'Access Denied',loadLogFail:'Load Failed',confirmDel:'Confirm Delete?',dateError:'Last renew date cannot be earlier than create date',nameReq:'Name Required',nameExist:'Name already exists',futureError:'Renew date cannot be in the future',serviceDisabled:'Service Disabled',serviceEnabled:'Service Enabled',execFinish: 'EXECUTION FINISHED!'},tags:'TAGS',tagPlaceholder:'Press Enter to create tag',searchPlaceholder:'Search...',tagsCol:'TAGS',tagAll:'ALL',useLunar:'Lunar Cycle',lunarTip:'Calculate based on Lunar calendar',yes:'Yes',no:'No',timezone:'Timezone',disabledFilter:'DISABLED',policyConfig:'Policy Config',policyNotify:'Notify Days',policyAuto:'Auto Renew',policyRenewDay:'Renew Days',useGlobal:'Global Default',autoRenewOnDesc:'Auto Renew when overdue',autoRenewOffDesc:'Auto Disable when overdue'}
        };
        const LUNAR={info:[0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],gan:'甲乙丙丁戊己庚辛壬癸'.split(''),zhi:'子丑寅卯辰巳午未申酉戌亥'.split(''),months:'正二三四五六七八九十冬腊'.split(''),days:'初一,初二,初三,初四,初五,初六,初七,初八,初九,初十,十一,十二,十三,十四,十五,十六,十七,十八,十九,二十,廿一,廿二,廿三,廿四,廿五,廿六,廿七,廿八,廿九,三十'.split(','),lYearDays(y){let s=348;for(let i=0x8000;i>0x8;i>>=1)s+=(this.info[y-1900]&i)?1:0;return s+this.leapDays(y)},leapDays(y){if(this.leapMonth(y))return(this.info[y-1900]&0x10000)?30:29;return 0},leapMonth(y){return this.info[y-1900]&0xf},monthDays(y,m){return(this.info[y-1900]&(0x10000>>m))?30:29},solar2lunar(y,m,d){if(y<1900||y>2100)return null;const base=new Date(1900,0,31),obj=new Date(y,m-1,d);let offset=Math.round((obj-base)/86400000);let ly=1900,temp=0;for(;ly<2101&&offset>0;ly++){temp=this.lYearDays(ly);offset-=temp}if(offset<0){offset+=temp;ly--}let lm=1,leap=this.leapMonth(ly),isLeap=false;for(;lm<13&&offset>0;lm++){if(leap>0&&lm===(leap+1)&&!isLeap){--lm;isLeap=true;temp=this.leapDays(ly)}else{temp=this.monthDays(ly,lm)}if(isLeap&&lm===(leap+1))isLeap=false;offset-=temp}if(offset===0&&leap>0&&lm===leap+1){if(isLeap)isLeap=false;else{isLeap=true;--lm}}if(offset<0){offset+=temp;--lm}const ld=offset+1,gIdx=(ly-4)%10,zIdx=(ly-4)%12;const yStr=this.gan[gIdx<0?gIdx+10:gIdx]+this.zhi[zIdx<0?zIdx+12:zIdx];const mStr=(isLeap?'闰':'')+this.months[lm-1]+'月';return{year:ly,month:lm,day:ld,isLeap,yearStr:yStr,monthStr:mStr,dayStr:this.days[ld-1],fullStr:yStr+'年'+mStr+this.days[ld-1]}}};
        
        // 本地时间解析函数，防止时区偏差
        const parseYMD = (s) => { 
            if(!s) return new Date(); 
            const p = s.split('-'); 
            return new Date(p[0], p[1]-1, p[2]); 
        };

        createApp({
            setup() {
                const isLoggedIn = ref(!!localStorage.getItem('jwt_token')), password = ref(''), loading = ref(false), list = ref([]), settings = ref({});
                const dialogVisible = ref(false), settingsVisible = ref(false), historyVisible = ref(false), historyLoading = ref(false), historyLogs = ref([]);
                const checking = ref(false), logs = ref([]), displayLogs = ref([]), isEdit = ref(false), lang = ref('zh'), currentTag = ref(''), searchKeyword = ref('');
                const locale = ref(ZhCn), tableKey = ref(0), termRef = ref(null);
                const form = ref({ id:'', name:'', createDate:'', lastRenewDate:'', intervalDays:30, cycleUnit:'day', type:'cycle', message:'', enabled:true, tags:[], useLunar:false, notifyDays:3, notifyTime: '08:00', autoRenew:true, autoRenewDays:3 });
                const settingsForm = ref({ 
                    notifyUrl:'', 
                    enableNotify:true, 
                    autoDisableDays:30, 
                    timezone:'UTC',
                    enabledChannels: [],
                    notifyConfig: { telegram: {}, bark: {}, pushplus: {}, notifyx: {}, resend: {}, webhook: {} },
                    calendarToken: ''
                });
                const channelMap = reactive({ telegram:false, bark:false, pushplus:false, notifyx:false, resend:false, webhook:false });
                const testing = reactive({ telegram:false, bark:false, pushplus:false, notifyx:false, resend:false, webhook:false });
                
                // Dark Mode State
                const isDark = ref(document.documentElement.classList.contains('dark'));
                const toggleTheme = () => {
                    isDark.value = !isDark.value;
                    if (isDark.value) {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('theme', 'dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('theme', 'light');
                    }
                };
                // 2. 定义分页状态
                const currentPage = ref(1);
                const pageSize = ref(10); // 默认每页显示 10 条
                const t = (k) => { let v=messages[lang.value]; k.split('.').forEach(p=>v=v?v[p]:k); return v||k; };
                const expiringCount = computed(() => list.value.filter(i => i.enabled && i.daysLeft>0 && i.daysLeft<=((typeof i.notifyDays==='number')?i.notifyDays:3)).length);
                const expiredCount = computed(() => list.value.filter(i => i.enabled && i.daysLeft<=0).length);
                const disabledCount = computed(() => list.value.filter(i => !i.enabled).length);
                const allTags = computed(() => { const s=new Set(); list.value.forEach(i=>(i.tags||[]).forEach(t=>s.add(t))); return Array.from(s).sort(); });
                const filteredList = computed(() => {
                    let r = list.value;
                    if (currentTag.value === 'DISABLED') r = r.filter(i => !i.enabled);
                    else if (currentTag.value) r = r.filter(i => (i.tags||[]).includes(currentTag.value));
                    if (searchKeyword.value) { const k=searchKeyword.value.toLowerCase(); r = r.filter(i => i.name.toLowerCase().includes(k) || (i.message||'').toLowerCase().includes(k)); }
                    return r;
                });

                onMounted(() => {

                    const savedTheme = localStorage.getItem('theme');

                    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (savedTheme === 'dark' || (!savedTheme && sysDark)) {
                        isDark.value = true;
                        document.documentElement.classList.add('dark');
                    } else {
                        isDark.value = false;
                        document.documentElement.classList.remove('dark');
                    }

                    const l = localStorage.getItem('lang'); if(l) setLang(l);
                    const tk = localStorage.getItem('jwt_token'); if(tk) fetchList(tk);
                });

                const setLang = (l) => { lang.value=l; localStorage.setItem('lang',l); locale.value=(l==='zh'?ZhCn:null); };
                const toggleLang = async () => { setLang(lang.value==='zh'?'en':'zh'); settings.value.language=lang.value; await saveData(null,settings.value); };
                const login = async () => {
                    if(!password.value) return ElMessage.warning(t('msg.passReq')); loading.value=true;
                    try {
                        const r=await fetch('/api/login',{method:'POST',body:JSON.stringify({password:password.value})});
                        const d=await r.json();
                        if(r.ok&&d.token){ localStorage.setItem('jwt_token',d.token); fetchList(d.token); } else throw new Error(t('msg.loginFail'));
                    } catch(e) { ElMessage.error(e.message); loading.value=false; }
                };
                const logout = () => { localStorage.removeItem('jwt_token'); isLoggedIn.value=false; password.value=''; };
                const getAuth = () => ({ 'Authorization': 'Bearer '+localStorage.getItem('jwt_token') });
                const fetchList = async (tk) => {
                    loading.value=true; try {
                        const r=await fetch('/api/list',{headers:tk?{'Authorization':'Bearer '+tk}:getAuth()});
                        if(r.status===401) throw new Error(t('msg.loginFail'));
                        const d=await r.json(); list.value=d.data.items; settings.value=d.data.settings;
                        if(settings.value.language) setLang(settings.value.language); isLoggedIn.value=true;
                    } catch(e) { ElMessage.error(e.message); if(e.message===t('msg.loginFail')) logout(); } finally { loading.value=false; }
                };

                const saveData = async (items, set, msg=true) => {
                    loading.value=true; try {
                        const payload={ items:items||list.value, settings:set||settings.value }; payload.settings.language=lang.value;
                        await fetch('/api/save',{method:'POST',headers:{...getAuth(),'Content-Type':'application/json'},body:JSON.stringify(payload)});
                        if(msg) ElMessage.success(t('msg.saved')); await fetchList();
                    } catch { ElMessage.error(t('msg.saveFail')); } finally { loading.value=false; }
                };

                const saveItem = async () => {
                    if(!form.value.name.trim()) return ElMessage.error(t('msg.nameReq'));
                    if(list.value.some(i=>i.name.toLowerCase()===form.value.name.toLowerCase() && i.id!==form.value.id)) return ElMessage.error(t('msg.nameExist'));
                    if(form.value.lastRenewDate < form.value.createDate) return ElMessage.error(t('msg.dateError'));
                    if(form.value.lastRenewDate > new Date().toISOString().split('T')[0]) return ElMessage.error(t('msg.futureError'));
                    
                    let newList=[...list.value];
                    if(isEdit.value) { const i=newList.findIndex(x=>x.id===form.value.id); if(i!==-1) newList[i]=form.value; }
                    else newList.push(form.value);
                    list.value=newList; dialogVisible.value=false; tableKey.value++; await saveData(newList, null);
                };

                const toggleEnable = async (row) => { await saveData(null, null, false); tableKey.value++; row.enabled ? ElMessage.success(t('msg.serviceEnabled')) : ElMessage.warning(t('msg.serviceDisabled')); };

                const deleteItem = async (row) => {
                    const nl = list.value.filter(i => i.id !== row.id);
                    await saveData(nl, null);
                    list.value = nl;
                    tableKey.value++;
                };
                
                const logVisible = ref(false);
                const runCheck = async () => { 
                    checking.value = true; 
                    logVisible.value = true; 
                    displayLogs.value = []; 
                    try {
                        const r = await fetch('/api/check', { method: 'POST', headers: getAuth(), body: JSON.stringify({ lang: lang.value }) });
                        const d = await r.json(); 
                        for (const line of d.logs) {
                            displayLogs.value.push(line);
                            await new Promise(res => setTimeout(res, 30)); 
                            if (termRef.value) termRef.value.scrollTop = termRef.value.scrollHeight;
                        }
                        await new Promise(res => setTimeout(res, 200)); 
                        displayLogs.value.push(\`[SYSTEM] \${t('msg.execFinish')}\`);
                        if (termRef.value) termRef.value.scrollTop = termRef.value.scrollHeight;
                        if (d.data) { list.value = d.data; tableKey.value++; }
                    } catch(e) { displayLogs.value.push("ERR: " + e.message); } finally { checking.value = false; } 
                };
                const formatLogTime = (isoStr) => {
                    if (!isoStr) return '';
                    try {
                        const tz = settings.value.timezone || 'UTC';
                        const date = new Date(isoStr);
                        const timeStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date).replace(', ', ' ');
                        const offsetPart = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(date).find(p => p.type === 'timeZoneName').value;
                        const utcOffset = offsetPart.replace('GMT', 'UTC');
                        return \`\${timeStr} \${utcOffset}\`;
                    } catch (e) { return isoStr; }
                };                

                const openAdd = () => { isEdit.value=false; const d=new Date().toISOString().split('T')[0]; form.value={id:Date.now().toString(),name:'',createDate:d,lastRenewDate:d,intervalDays:30,cycleUnit:'day',type:'cycle',enabled:true,tags:[],useLunar:false, notifyDays:3, notifyTime: '08:00', autoRenew:true, autoRenewDays:3}; dialogVisible.value=true; };
                const editItem = (row) => { isEdit.value=true; form.value={...row,cycleUnit:row.cycleUnit||'day',tags:[...(row.tags||[])],useLunar:!!row.useLunar, notifyDays:(row.notifyDays!==undefined?row.notifyDays:3), notifyTime: (row.notifyTime || '08:00'), autoRenew:row.autoRenew!==false, autoRenewDays:(row.autoRenewDays!==undefined?row.autoRenewDays:3)}; dialogVisible.value=true; };
                const openSettings = () => { 
                    settingsForm.value = JSON.parse(JSON.stringify(settings.value)); 
                    const chans = settingsForm.value.enabledChannels || [];
                    Object.keys(channelMap).forEach(k => channelMap[k] = chans.includes(k));
                    settingsVisible.value=true; 
                };
                const saveSettings = async () => { 
                    settingsForm.value.enabledChannels = Object.keys(channelMap).filter(k => channelMap[k]);
                    settings.value={...settingsForm.value}; 
                    await saveData(null,settings.value); 
                    settingsVisible.value=false; 
                };
                const toggleChannel = (ch) => {};

                const testChannel = async (ch) => {
                    testing[ch] = true;
                    try {
                        const r = await fetch('/api/test-notify', { 
                            method: 'POST', 
                            headers: getAuth(), 
                            body: JSON.stringify({ channel: ch, config: settingsForm.value.notifyConfig[ch] }) 
                        });
                        const d = await r.json();
                        if (r.ok) ElMessage.success(\`\${ch.toUpperCase()} TEST OK\`);
                        else ElMessage.error(\`TEST FAIL: \${d.msg}\`);
                    } catch(e) { ElMessage.error(e.message); }
                    finally { testing[ch] = false; }
                };

                const calendarUrl = computed(() => {
                    const origin = window.location.origin;
                    const token = settingsForm.value.calendarToken || settings.value.calendarToken || '';
                    return token ? \`\${origin}/api/calendar.ics?token=\${token}\` : 'Save settings to generate URL...';
                });

                const copyIcsUrl = () => {
                    navigator.clipboard.writeText(calendarUrl.value).then(() => {
                        ElMessage.success(t('msg.copyOk'));
                    });
                };

                const resetCalendarToken = async () => {
                    try {
                        await ElMessageBox.confirm(
                            lang.value === 'zh' ? '重置将导致所有现有日历订阅失效，是否继续？' : 'Resetting invalidates all existing calendar subscriptions. Continue?',
                            'Warning', { type: 'warning', confirmButtonText: t('yes'), cancelButtonText: t('no') }
                        );
                        settingsForm.value.calendarToken = crypto.randomUUID();
                        await saveSettings(); 
                        ElMessage.success(t('msg.tokenReset'));
                    } catch {}
                };

                const clearLogs = async () => { await fetch('/api/logs/clear',{method:'POST',headers:getAuth()}); historyLogs.value=[]; ElMessage.success(t('msg.cleared')); };
                const openHistoryLogs = async () => { historyVisible.value=true; historyLoading.value=true; try { historyLogs.value=(await(await fetch('/api/logs',{headers:getAuth()})).json()).data; } finally { historyLoading.value=false; } };

                const getDaysClass = (d) => d<=0?'text-red-500 font-black':(d<=7?'text-amber-500 font-bold':'text-blue-600 font-bold');
                const formatDaysLeft = (d) => d===0?(lang.value==='zh'?'今天':'TODAY'):(d<0?(lang.value==='zh'?'过期 ':'OVERDUE ')+Math.abs(d)+(lang.value==='zh'?' 天':'DAYS'):d+(lang.value==='zh'?' 天':' DAYS'));
                const getTagClass = (t) => ({alert:'border-red-200 text-red-600 bg-red-50',renew:'border-amber-200 text-amber-600 bg-amber-50',disable:'border-gray-200 text-gray-500 bg-gray-50',normal:'border-blue-200 text-blue-600 bg-blue-50'}[t]||'border-blue-200 text-blue-600 bg-blue-50');
                const getLogColor = (a) => (a&&a.includes('alert')?'danger':(a&&a.includes('renew')?'warning':(a&&a.includes('disable')?'info':'success')));
                const tableRowClassName = ({row}) => row.enabled===false?'disabled-row':'';

                const getLunarStr = (s) => { const d=parseYMD(s); const l=LUNAR.solar2lunar(d.getFullYear(),d.getMonth()+1,d.getDate()); return l?\`农历: \${l.fullStr}\`:''; };

                const getSmartLunarText = (c) => { 
                    if(!c || !c.date) return ''; 
                    const l=LUNAR.solar2lunar(c.date.getFullYear(),c.date.getMonth()+1,c.date.getDate()); 
                    return l ? (l.day===1 ? l.monthStr : l.dayStr) : ''; 
                };
                const getYearGanZhi = (t) => { const y=parseInt(t); if(isNaN(y))return ''; const g=(y-4)%10,z=(y-4)%12; return '甲乙丙丁戊己庚辛壬癸'.split('')[g<0?g+10:g]+'子丑寅卯辰巳午未申酉戌亥'.split('')[z<0?z+12:z]+'年'; };
                const getMonthStr = (t) => { const m=Number(t); return lang.value==='zh'?(m+1)+'月':['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]; };
                const getTagCount = (t) => list.value.filter(i=>(i.tags||[]).includes(t)).length;

                const manualRenew = async (row) => {

                    const tz = settings.value.timezone || 'UTC';

                    let todayStr = '';
                    try {
                        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
                        todayStr = fmt.format(new Date());
                    } catch(e) {
                        todayStr = new Date().toISOString().split('T')[0];
                    }

                    const oldDate = row.lastRenewDate;
                    row.lastRenewDate = todayStr;

                    await saveData(null, null, false);

                    tableKey.value++; 
                    ElMessage.success(t('msg.renewSuccess').replace('%s', oldDate).replace('%t', todayStr));
                };

                const timezoneList = [
                    { label: 'UTC (世界协调时间)', value: 'UTC' },
                    { label: 'Asia/Shanghai (中国上海/北京)', value: 'Asia/Shanghai' },
                    { label: 'Asia/Hong_Kong (中国香港)', value: 'Asia/Hong_Kong' },
                    { label: 'Asia/Taipei (中国台北)', value: 'Asia/Taipei' },
                    { label: 'Asia/Tokyo (日本东京)', value: 'Asia/Tokyo' },
                    { label: 'Asia/Seoul (韩国首尔)', value: 'Asia/Seoul' },
                    { label: 'Asia/Singapore (新加坡)', value: 'Asia/Singapore' },
                    { label: 'Asia/Bangkok (泰国曼谷)', value: 'Asia/Bangkok' },
                    { label: 'Asia/Dubai (阿联酋迪拜)', value: 'Asia/Dubai' },
                    { label: 'Asia/Kolkata (印度加尔各答)', value: 'Asia/Kolkata' },
                    { label: 'Europe/London (英国伦敦)', value: 'Europe/London' },
                    { label: 'Europe/Paris (法国巴黎)', value: 'Europe/Paris' },
                    { label: 'Europe/Berlin (德国柏林)', value: 'Europe/Berlin' },
                    { label: 'Europe/Moscow (俄罗斯莫斯科)', value: 'Europe/Moscow' },
                    { label: 'Europe/Amsterdam (荷兰阿姆斯特丹)', value: 'Europe/Amsterdam' },
                    { label: 'America/New_York (美国纽约)', value: 'America/New_York' },
                    { label: 'America/Chicago (美国芝加哥)', value: 'America/Chicago' },
                    { label: 'America/Los_Angeles (美国洛杉矶)', value: 'America/Los_Angeles' },
                    { label: 'America/Toronto (加拿大力伦多)', value: 'America/Toronto' },
                    { label: 'America/Vancouver (加拿大温哥华)', value: 'America/Vancouver' },
                    { label: 'America/Sao_Paulo (巴西圣保罗)', value: 'America/Sao_Paulo' },
                    { label: 'Australia/Sydney (澳大利亚悉尼)', value: 'Australia/Sydney' },
                    { label: 'Pacific/Auckland (新西兰奥克兰)', value: 'Pacific/Auckland' }
                ];

                const pagedList = computed(() => {
                    const start = (currentPage.value - 1) * pageSize.value;
                    const end = start + pageSize.value;
                    return filteredList.value.slice(start, end);
                });

                watch([currentTag, searchKeyword], () => {
                    currentPage.value = 1;
                });
                const importRef = ref(null);
                const exportData = async () => {
                    try {
                        const res = await fetch('/api/export', { headers: getAuth() });
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url;
                        const disposition = res.headers.get('content-disposition');
                        let filename = 'renewhelper_backup.json';
                        if (disposition && disposition.includes('filename=')) { filename = disposition.split('filename=')[1].replace(/"/g, ''); }
                        a.download = filename; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
                        ElMessage.success(t('msg.exportSuccess'));
                    } catch (e) { ElMessage.error(e.message); }
                };
                const triggerImport = () => importRef.value.click();
                const handleImportFile = async (event) => {
                    const file = event.target.files[0]; if (!file) return;
                    try { await ElMessageBox.confirm(lang.value === 'zh' ? '此操作将覆盖当前的订阅列表，是否继续？' : 'Overwrite current subscriptions?', t('btnImport'), { confirmButtonText: t('yes'), cancelButtonText: t('no'), type: 'warning' }); } catch { event.target.value = ''; return; }
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            const json = JSON.parse(e.target.result); loading.value = true;
                            const res = await fetch('/api/import', { method: 'POST', headers: { ...getAuth(), 'Content-Type': 'application/json' }, body: JSON.stringify(json) });
                            const d = await res.json();
                            if (res.ok) { ElMessage.success(t('msg.importSuccess')); settingsVisible.value = false; setTimeout(() => window.location.reload(), 1500); } else { throw new Error(d.msg); }
                        } catch (err) { ElMessage.error(t('msg.importFail') + ': ' + err.message); } finally { loading.value = false; event.target.value = ''; }
                    };
                    reader.readAsText(file);
                };
                return {
                    tableKey, termRef, isLoggedIn, password, login, logout, loading, list, settings, lang, toggleLang, setLang, t, locale, disabledCount,
                    dialogVisible, settingsVisible, historyVisible, historyLoading, historyLogs, checking, logs, displayLogs, form, settingsForm, isEdit,
                    expiringCount, expiredCount, currentTag, allTags, filteredList, searchKeyword, logVisible,formatLogTime,Upload, Download,
                    openAdd, editItem, deleteItem, saveItem, openSettings, saveSettings, runCheck, openHistoryLogs, clearLogs, toggleEnable,importRef, exportData, triggerImport, handleImportFile,
                    Edit, Delete, Plus, VideoPlay, Setting, Bell, Document, Lock, Monitor, SwitchButton, Calendar, Timer, Files, AlarmClock, Warning, Search, Cpu, Link, Message, Promotion, Iphone, Moon, Sunny,
                    getDaysClass, formatDaysLeft, getTagClass, getLogColor, getLunarStr, getYearGanZhi, getSmartLunarText, getMonthStr, getTagCount, tableRowClassName, channelMap, toggleChannel, testChannel, testing,
                    calendarUrl, copyIcsUrl, resetCalendarToken,manualRenew,RefreshRight,timezoneList,currentPage, pageSize, pagedList,
                    isDark, toggleTheme
                };
            }
        }).use(ElementPlus).mount('#app');
    </script>
</body>
</html>`;
