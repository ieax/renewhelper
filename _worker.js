/**
 * Cloudflare Worker: RenewHelper (v2.0.20)
 * Author: LOSTFREE
 * Features: Multi-Channel Notify, Import/Export, Channel Test, Bilingual UI, Precise ICS Alarm，Bill Management.
 * See CHANGELOG.md for history.
 */

const APP_VERSION = "v2.0.20";
//接入免费汇率API
const EXCHANGE_RATE_API_URL = 'https://api.frankfurter.dev/v1/latest?base=';

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
        0x0d520
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
            } catch (e) { }

        const defaults = {
            enableNotify: true,
            autoDisableDays: 30,
            language: "zh",
            timezone: "UTC",
            defaultCurrency: "CNY",
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
                webhook2: { url: "" },
                webhook3: { url: "" },
                gotify: { server: "", token: "" },
                ntfy: { server: "https://ntfy.sh", topic: "", token: "" },
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

    async getItemsPackage(env) {

        const raw = await env.RENEW_KV.get(this.KEYS.ITEMS, { type: "text" });
        try {
            if (!raw) return { items: [], version: 0 };
            const parsed = JSON.parse(raw);

            // 兼容旧数据（纯数组格式）
            if (Array.isArray(parsed)) {
                return { items: parsed, version: 0 };
            }
            // 新数据格式
            return { items: parsed.items || [], version: parsed.version || 0 };
        } catch (e) {
            return { items: [], version: 0 };
        }
    },

    async getItems(env) {
        const pkg = await this.getItemsPackage(env);
        return pkg.items;
    },

    // 带乐观锁的保存
    async saveItems(env, newItems, expectedVersion = null, force = false) {
        // 1. 如果不是强制保存，先检查版本
        if (!force) {
            const currentPkg = await this.getItemsPackage(env);
            // 版本不匹配则抛出冲突
            if (expectedVersion !== null && currentPkg.version !== expectedVersion) {
                throw new Error("VERSION_CONFLICT");
            }
        }

        // 2. 生成新版本号 (时间戳)
        const newVersion = Date.now();
        const storageObj = {
            items: newItems,
            version: newVersion,
        };

        // 3. 写入 KV
        await env.RENEW_KV.put(this.KEYS.ITEMS, JSON.stringify(storageObj, null, 2));
        return newVersion;
    },

    async getCombined(env) {
        const [settings, pkg] = await Promise.all([
            this.getSettings(env),
            this.getItemsPackage(env),
        ]);
        return { settings, items: pkg.items, version: pkg.version };
    },

    // 【修复】增加 try-catch 容错，防止日志数据损坏导致无法写入
    async getLogs(env) {
        try {
            const raw = await env.RENEW_KV.get(this.KEYS.LOGS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            // 如果解析失败（数据损坏），返回空数组，确保新日志能写入
            return [];
        }
    },

    async saveLog(env, entry) {
        try {
            const logs = await this.getLogs(env);
            logs.unshift(entry);
            // 限制保留最近 30 条
            await env.RENEW_KV.put(this.KEYS.LOGS, JSON.stringify(logs.slice(0, 30)));
        } catch (e) {
            console.log(`[ERR] Log save failed: ${e.message}`);
        }
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
        return new Date(Date.UTC(+p[0], +p[1] - 1, parseInt(p[2])));
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
        webhook: webhookAdapterImpl,
        webhook2: webhookAdapterImpl,
        webhook3: webhookAdapterImpl,
        gotify: async (c, title, body) => {
            if (!c.server || !c.token) return "MISSING_CONF";
            const server = c.server.replace(/\/$/, "");
            const r = await fetch(`${server}/message`, {
                method: "POST",
                headers: { "X-Gotify-Key": c.token, "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    message: body,
                    priority: 5,
                }),
            });
            return r.ok ? "OK" : "FAIL";
        },
        ntfy: async (c, title, body) => {
            if (!c.topic) return "MISSING_CONF";
            const server = (c.server || "https://ntfy.sh").replace(/\/$/, "");
            const headers = { "Title": title }; // Encode title in header to avoid encoding issues
            if (c.token) headers["Authorization"] = `Bearer ${c.token}`;

            const r = await fetch(`${server}/${c.topic}`, {
                method: "POST",
                headers: headers,
                body: body,
            });
            return r.ok ? "OK" : "FAIL";
        },
    },
};

async function webhookAdapterImpl(c, title, body) {
    if (!c.url) return "MISSING_CONF";
    try {
        let headers = { "Content-Type": "application/json" };
        if (c.headers) {
            try {
                const h = JSON.parse(c.headers);
                headers = { ...headers, ...h };
            } catch { }
        }

        let reqBody = JSON.stringify({ title, content: body });
        if (c.body) {
            // Unescape JSON string placeholders safely
            // Users provide: {"text": "Title: {title}\nBody: {body}"}
            let raw = c.body
                .replace(/{title}/g, JSON.stringify(title).slice(1, -1))
                .replace(/{body}/g, JSON.stringify(body).slice(1, -1));
            reqBody = raw;
        }

        const r = await fetch(c.url, {
            method: "POST",
            headers: headers,
            body: reqBody,
        });
        return r.ok ? "OK" : "FAIL";
    } catch (e) {
        return "ERR";
    }
}

// ==========================================
// 4. Logic Controllers
// ==========================================

function calculateStatus(item, timezone = "UTC") {
    // 使用时区感知的“今天”
    const today = Calc.getTzToday(timezone);

    const cDate = item.createDate || Calc.toYMD(today),
        rDate = item.lastRenewDate || cDate;
    const interval = Number(item.intervalDays),
        unit = item.cycleUnit || "day";

    let nextObj;

    // ============================================================
    // 新逻辑: 优先使用续费历史中的 EndDate 作为下次到期日
    // ============================================================
    const hasHistory = Array.isArray(item.renewHistory) && item.renewHistory.length > 0 && item.renewHistory[0].endDate;

    if (hasHistory) {
        // 直接取最新一条历史记录的 endDate
        nextObj = Calc.parseYMD(item.renewHistory[0].endDate);

        // 如果开启了农历，仍需处理农历转换以便显示
        // 但 nextObj 本身已经确定，不需要再做加减运算
    } else {
        // ============================================================
        // 原逻辑: 根据 lastRenewDate + 周期 动态推算
        // ============================================================
        const rObj = Calc.parseYMD(rDate);

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
    }

    // 计算农历显示字符串
    let lNext = "",
        lLast = "";
    if (item.useLunar) {
        const ln = LUNAR_DATA.solar2lunar(
            nextObj.getUTCFullYear(),
            nextObj.getUTCMonth() + 1,
            nextObj.getUTCDate()
        );
        if (ln) lNext = ln.fullStr;

        // 如果是历史记录模式，rObj 可能已经不重要了，但为了兼容显示仍计算一下
        const rObjForLunar = Calc.parseYMD(rDate);
        const ll = LUNAR_DATA.solar2lunar(
            rObjForLunar.getUTCFullYear(),
            rObjForLunar.getUTCMonth() + 1,
            rObjForLunar.getUTCDate()
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
    // 使用 getItemsPackage 获取带版本的数据
    const [conf, pkg] = await Promise.all([
        DataStore.getSettings(env),
        DataStore.getItemsPackage(env),
    ]);

    const s = conf;
    const items = pkg.items;
    const currentVersion = pkg.version;

    const logs = [],
        log = (m) => {
            logs.push(m);
            console.log(m);
        };

    let trig = [],
        upd = [],
        dis = [],
        monitor = [],
        changed = false;

    log(`[SYSTEM] ${t("scan", lang, items.length)}`);

    // 1. 获取基于偏好时区的“今天”
    const today = Calc.getTzToday(s.timezone);
    const todayStr = Calc.toYMD(today);

    // 2. 获取当前时间 (用于 Cron 定时通知的时间比对)
    let nowH = 0, nowM = 0;
    try {
        const fmt = new Intl.DateTimeFormat("en-US", {
            timeZone: s.timezone || "UTC",
            hour12: false,
            hour: "numeric",
            minute: "numeric",
        });
        const parts = fmt.formatToParts(new Date());
        const find = (t) => {
            const p = parts.find(x => x.type === t);
            return p ? parseInt(p.value, 10) : 0;
        };
        nowH = find("hour");
        nowM = find("minute");
    } catch (e) { }

    for (let i = 0; i < items.length; i++) {
        let it = items[i];
        if (!it.createDate) it.createDate = Calc.toYMD(new Date());
        if (!it.lastRenewDate) it.lastRenewDate = it.createDate;
        if (it.enabled === false) continue;

        let st = calculateStatus(it, s.timezone),
            days = st.daysLeft;
        const msg = it.message ? ` (${t("note", lang)}: ${it.message})` : "";

        const iAutoRenew = it.autoRenew !== false;
        const iRenewDays = typeof it.autoRenewDays === "number" ? it.autoRenewDays : 3;
        const iNotifyDays = typeof it.notifyDays === "number" ? it.notifyDays : 3;

        // ============================================================
        // 逻辑 A: 自动禁用 (Auto Disable)
        // ============================================================
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
        // ============================================================
        // 逻辑 B: 自动续期 (Auto Renew)
        // ============================================================
        else if (iAutoRenew && days <= -Math.abs(iRenewDays)) {
            log(t("autoRenew", lang, it.name));

            // 1. 准备操作时间 (使用用户偏好时区)
            // 原逻辑: const opTimeStr = new Date().toISOString().replace('T', ' ').split('.')[0]; (UTC)
            // 新逻辑: 使用 s.timezone 格式化为 YYYY-MM-DD HH:mm:ss
            let opTimeStr;
            try {
                const tz = s.timezone || 'UTC';
                // en-CA 格式化结果通常为 "YYYY-MM-DD, HH:mm:ss"
                const fmt = new Intl.DateTimeFormat('en-CA', {
                    timeZone: tz,
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false
                });
                opTimeStr = fmt.format(new Date()).replace(', ', ' ');
            } catch (e) {
                // 如果时区无效，回退到 UTC
                opTimeStr = new Date().toISOString().replace('T', ' ').split('.')[0];
            }

            // 2. 确定“账单起始日” (Start Date) - 与手动逻辑保持一致
            // st.nextDueDate 即为“理论上的当前周期结束日”，也是“下一周期的开始日”
            let startStr = todayStr; // 默认为今天 (Reset模式 或 Cycle已过期模式)

            if (it.type !== 'reset') {
                // Cycle 模式
                // 如果还没有过期 (nextDueDate > today)，则无缝衔接
                // 如果已经过期 (nextDueDate <= today)，则从今天开始 (跳过空白期)
                if (st.nextDueDate > todayStr) {
                    startStr = st.nextDueDate;
                }
            }

            // 3. 计算“账单结束日” (End Date)
            let endStr = startStr;
            const intv = Number(it.intervalDays);
            const unit = it.cycleUnit || 'day';
            const sDate = Calc.parseYMD(startStr);

            if (it.useLunar) {
                const l = LUNAR_DATA.solar2lunar(sDate.getUTCFullYear(), sDate.getUTCMonth() + 1, sDate.getUTCDate());
                if (l) {
                    const nextL = calcBiz.addPeriod(l, intv, unit);
                    const nextS = calcBiz.l2s(nextL);
                    endStr = `${nextS.year}-${nextS.month.toString().padStart(2, '0')}-${nextS.day.toString().padStart(2, '0')}`;
                }
            } else {
                const d = new Date(sDate);
                if (unit === 'year') d.setUTCFullYear(d.getUTCFullYear() + intv);
                else if (unit === 'month') d.setUTCMonth(d.getUTCMonth() + intv);
                else d.setUTCDate(d.getUTCDate() + intv);
                endStr = Calc.toYMD(d);
            }

            // 4. 更新服务数据
            const oldLastRenew = it.lastRenewDate;
            it.lastRenewDate = todayStr; // “上次续费”更新为操作时间(今天)

            // 5. 写入历史记录 (Renew History)
            const historyItem = {
                renewDate: opTimeStr, // 这里现在是带时区的时间了
                startDate: startStr,
                endDate: endStr,
                price: it.fixedPrice || 0,
                currency: it.currency || 'CNY',
                note: 'Auto Renew'
            };

            if (!Array.isArray(it.renewHistory)) it.renewHistory = [];
            it.renewHistory.unshift(historyItem); // 插入到最前面

            // 6. 记录日志
            upd.push({
                name: it.name,
                old: oldLastRenew,
                new: todayStr,
                note: msg,
            });
            items[i] = it;
            changed = true;
        }
        // ============================================================
        // 逻辑 C: 到期提醒 (Notify)
        // ============================================================
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
                // 定时任务运行时，检查是否到达指定的推送时间 (notifyTime)
                const nTime = it.notifyTime || "08:00";
                const [tgtH, tgtM] = nTime.split(":").map(Number);
                const diffMinutes = Math.abs(nowH * 60 + nowM - (tgtH * 60 + tgtM));

                // 只有在设定时间前后 5分钟内才推送
                if (diffMinutes > 5) {
                    shouldPush = false;
                }
            }

            if (shouldPush) {
                trig.push({ ...st, note: msg });
            } else {
                monitor.push({ ...st });
            }
        } else {
            const statusText = days === 0 ? t("today", lang) : t("left", lang, days);
            log(t("checkLog", lang, it.name, statusText));
        }
    }

    // 保存变更
    if (changed) {
        try {
            await DataStore.saveItems(env, items, currentVersion);
            log(`[SYSTEM] Data saved successfully.`);
        } catch (e) {
            if (e.message === "VERSION_CONFLICT") {
                log(`[WARN] Data conflict detected during cron. Skipping save to protect data.`);
                upd = []; dis = []; // 避免发送误导性通知
            } else {
                log(`[ERR] Save failed: ${e.message}`);
            }
        }
    }

    // 推送通知逻辑
    if (s.enableNotify) {
        let pushBody = [];
        if (dis.length) {
            pushBody.push(`【${t("secDis", lang)}】`);
            dis.forEach((x, i) =>
                pushBody.push(`${i + 1}. ${x.name} (${t("overdue", lang, Math.abs(x.daysLeft))} / ${x.nextDueDate})\n${x.note}`)
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
                const dayStr = x.daysLeft === 0 ? t("today", lang) : (x.daysLeft < 0 ? t("overdue", lang, Math.abs(x.daysLeft)) : t("left", lang, x.daysLeft));
                pushBody.push(`${i + 1}. ${x.name}: ${dayStr} (${x.nextDueDate})\n${x.note}`);
            });
        }

        if (pushBody.length > 0) {
            const fullBody = pushBody.join("\n").trim();
            const pushRes = await Notifier.send(s, s.notifyTitle || t("pushTitle", lang), fullBody);
            log(`[PUSH] ${pushRes}`);
        }
    }

    const act = [
        upd.length ? "renew" : null,
        dis.length ? "disable" : null,
        trig.length ? "alert" : null,
        monitor.length ? "normal" : null,
    ].filter(Boolean);

    const hasError = logs.some(l => l.includes('[WARN]') || l.includes('[ERR]'));

    if (act.length === 0) act.push("normal");
    if (hasError && !act.includes("alert")) act.push("alert");

    if (act.length > 0) {
        await DataStore.saveLog(env, {
            time: new Date().toISOString(),
            trigger: isSched ? "CRON" : "MANUAL",
            content: logs,
            actions: act,
        });
    }

    return { logs, currentList: items, version: currentVersion };
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
        // 重新计算状态
        const displayList = res.currentList.map((i) =>
            calculateStatus(i, settings.timezone)
        );

        // 【修改】如果 checkAndRenew 内部保存成功，版本号应该变了，但我们这里为了简单，
        // 可以让前端在 check 后自动刷新一次列表，或者这里返回新的 version（如果能获取到）。
        // 最稳妥的方式是让前端 check 完后重新 fetchList。
        return response({
            code: 200,
            logs: res.logs,
            data: displayList,
        });
    })
);
app.get(
    "/api/logs",
    withAuth(async (req, env) => {
        return response({ code: 200, data: await DataStore.getLogs(env) });
    })
);

app.get(
    "/api/rates",
    withAuth(async (req, env) => {
        const url = new URL(req.url);
        const base = url.searchParams.get("base") || "CNY";
        const cacheKey = "RATES_" + base;

        // 1. Try KV Cache
        const cached = await env.RENEW_KV.get(cacheKey, { type: "json" });
        if (cached && cached.ts && (Date.now() - cached.ts < 86400000)) { // 24h
            return response(cached.data);
        }

        // 2. Fetch Upstream
        try {
            const res = await fetch(EXCHANGE_RATE_API_URL + base);
            if (!res.ok) throw new Error("Upstream API Error");
            const data = await res.json();

            // 3. Cache Result
            await env.RENEW_KV.put(cacheKey, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: 86400 });

            return response(data);
        } catch (e) {
            return error("RATE_FETCH_FAILED", 502);
        }
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

        // 1. 先获取新的设置（为了拿到最新的时区 timezone）
        const currentSettings = await DataStore.getSettings(env);
        const newSettings = {
            ...body.settings,
            jwtSecret: currentSettings.jwtSecret,
        };

        // 2. 处理 items 数据清洗 + 【关键修复】强制重新计算状态
        const items = body.items.map((i) => {
            // 基础数据清洗
            const cleanItem = {
                ...i,
                id: i.id || Date.now().toString(),
                intervalDays: Number(i.intervalDays),
                enabled: i.enabled !== false,
                tags: Array.isArray(i.tags) ? i.tags : [],
                useLunar: !!i.useLunar,
                notifyDays: i.notifyDays !== null ? Number(i.notifyDays) : null,
                notifyTime: i.notifyTime || "08:00",
                autoRenew: i.autoRenew !== false,
                autoRenewDays: i.autoRenewDays !== null ? Number(i.autoRenewDays) : null,
                fixedPrice: Number(i.fixedPrice) || 0,
                currency: i.currency || 'CNY',
                renewHistory: Array.isArray(i.renewHistory) ? i.renewHistory : [],
            };

            // 【核心修复】在保存前，使用后端逻辑重新计算 nextDueDate 等字段
            // 确保存入 KV/数据库 的数据永远是基于当前历史记录计算出的最新状态
            return calculateStatus(cleanItem, newSettings.timezone);
        });

        try {
            // 获取前端传来的 version，进行乐观锁保存
            const clientVersion =
                body.version !== undefined ? Number(body.version) : null;

            const newVersion = await DataStore.saveItems(env, items, clientVersion);
            await DataStore.saveSettings(env, newSettings);

            // 返回新版本号给前端
            return response({ code: 200, msg: "SAVED", version: newVersion });
        } catch (e) {
            if (e.message === "VERSION_CONFLICT") {
                return error("DATA_CHANGED_RELOAD_REQUIRED", 409);
            }
            throw e;
        }
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
                "Content-Disposition": `attachment; filename="RenewHelper_Backup_${new Date().toISOString().split("T")[0]
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
    <script src="https://unpkg.com/element-plus@2.11.9/dist/locale/zh-cn.min.js"></script>
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
        
        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.8); }
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

        /* Timeline Fixes */
        .el-timeline-item__node--normal { width: 10px; height: 10px; left: 0px; }
        .el-timeline-item__tail { left: 4px; border-left: 2px dashed var(--border); }
        .el-timeline-item__wrapper { padding-left: 24px; top: -3px; }
        
        /* Dark Mode adjustments for Timeline */
        html.dark .mecha-panel { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); }
        html.dark .el-timeline-item__tail { border-left-color: #334155; }
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
        .el-table .cell { padding-left: 8px !important; padding-right: 8px !important; }
        html.dark .lunar-popper .el-year-table td .cell, html.dark .lunar-popper .el-month-table td .cell { color: #cbd5e1; }

        .notify-item-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .notify-label { width: 90px; text-align: right; font-size: 12px; color: var(--text-dim); font-weight: 600; flex-shrink: 0; }
        
        [v-cloak] { display: none !important; }

        /* Accordion Settings Styles */
        .settings-accordion { display: flex; flex-direction: column; gap: 8px; }
        .accordion-item { border: 1px solid var(--border); background: var(--bg-panel); border-radius: 4px; overflow: hidden; }
        .accordion-header { padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-weight: 700; color: var(--text-dim); transition: all 0.2s; user-select: none; }
        .accordion-header:hover { background: var(--bg-body); color: var(--text-main); }
        .accordion-header.active { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
        .accordion-content { display: none; padding: 20px; border-top: 1px solid var(--border); background: var(--bg-body); }
        .accordion-content.expanded { display: block; animation: slideIn 0.2s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div id="app" v-cloak class="min-h-screen p-4 sm:p-8 flex flex-col transition-colors duration-300">
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
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div class="mecha-panel p-6 pl-8 border-l-4 !border-l-blue-500">
                        <div class="text-blue-600 text-xs font-bold font-mono mb-2 tracking-widest">{{ t('totalServices') }}</div>
                        <div class="flex items-baseline gap-3">
                            <div class="text-5xl font-black font-mono text-textMain">{{ list.length }}</div>
                            <div class="text-xs font-bold font-mono text-blue-600/60" v-if="list.length > 0">≈ {{ totalAmount }} {{ settings.defaultCurrency || 'CNY' }}</div>
                        </div>
                    </div>
                    <div class="mecha-panel p-6 pl-8 border-l-4 !border-l-amber-500">
                        <div class="text-amber-600 text-xs font-bold font-mono mb-2 tracking-widest">{{ t('expiringSoon') }}</div>
                        <div class="flex items-baseline gap-3">
                            <div class="text-5xl font-black font-mono text-amber-500 leading-none">{{ expiringCount }}</div>
                            <div class="text-xs font-bold font-mono text-amber-600/60" v-if="expiringCount > 0">≈ {{ expiringTotal }} {{ settings.defaultCurrency || 'CNY' }}</div>
                        </div>
                    </div>
                    <div class="mecha-panel p-6 pl-8 border-l-4 !border-l-red-500">
                        <div class="text-red-600 text-xs font-bold font-mono mb-2 tracking-widest">{{ t('expiredAlert') }}</div>
                        <div class="flex items-baseline gap-3">
                            <div class="text-5xl font-black font-mono text-red-500 leading-none">{{ expiredCount }}</div>
                            <div class="text-xs font-bold font-mono text-red-600/60" v-if="expiredCount > 0">≈ {{ expiredTotal }} {{ settings.defaultCurrency || 'CNY' }}</div>
                        </div>
                    </div>
                    <div class="mecha-panel p-6 pl-8 border-l-4 !border-l-purple-500">
                        <div class="text-purple-600 text-xs font-bold font-mono mb-2 tracking-widest">{{ t('viewSwitch') }}</div>
                        <div class="mt-3 flex w-full bg-gray-200 dark:bg-slate-800 rounded-lg p-1 border border-gray-300 dark:border-slate-700">
                            <button @click="currentView = 'project'" :class="['flex-1 px-4 py-2 rounded text-xs font-mono font-bold transition-all text-center justify-center', currentView === 'project' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white']">
                                {{ t('viewProjects') }}
                            </button>
                            <button @click="currentView = 'spending'" :class="['flex-1 px-4 py-2 rounded text-xs font-mono font-bold transition-all text-center justify-center', currentView === 'spending' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white']">
                                {{ t('viewSpending') }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Project View -->
                <template v-if="currentView === 'project'">

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
    <el-table :key="tableKey" :data="pagedList" style="width:100%" v-loading="loading" :row-class-name="tableRowClassName" size="large" @sort-change="handleSortChange" @filter-change="handleFilterChange" :default-sort="{prop: 'daysLeft', order: 'ascending'}" show-summary :summary-method="getSummaries">       
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

        <el-table-column :label="t('fixedPrice')" width="100" prop="fixedPrice" sortable="custom">
            <template #default="scope">
                <div class="font-mono">
                    <span class="text-base font-bold text-slate-700 dark:text-slate-200">{{ scope.row.fixedPrice }}</span>
                    <span class="text-[10px] text-gray-400 font-bold ml-1 align-top">{{ scope.row.currency }}</span>
                </div>
            </template>
        </el-table-column>

        <el-table-column :label="t('type')" width="100" prop="type" column-key="type" :filters="typeFilters">
            <template #default="scope">
                <div class="flex items-center h-full">
                    <span v-if="scope.row.type==='reset'" class="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 tracking-wider whitespace-nowrap">{{ t('typeReset') }}</span>
                    <span v-else class="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 tracking-wider whitespace-nowrap">{{ t('typeCycle') }}</span>
                </div>
            </template>
        </el-table-column>

        <el-table-column :label="t('nextDue')" min-width="200" prop="daysLeft" sortable="custom" column-key="daysLeft" :filters="nextDueFilters">
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

        <el-table-column :label="t('uptime')" width="120" prop="serviceDays" sortable="custom" column-key="serviceDays" :filters="uptimeFilters">
            <template #default="scope">
                <span class="inline-block bg-body text-textDim border border-border px-2 py-1 font-mono text-sm font-bold">{{ scope.row.serviceDays }} {{ t('daysUnit') }}</span>
            </template>
        </el-table-column>

        <el-table-column :label="t('lastRenew')" width="120" prop="lastRenewDate" sortable="custom" column-key="lastRenewDate" :filters="lastRenewFilters">
            <template #default="scope">
                <div class="font-mono text-textDim text-sm font-bold">{{ scope.row.lastRenewDate ? scope.row.lastRenewDate.replace(/\s+/g, '').replace(/(\d{4}-\d{2}-\d{2}).*/, '$1') : '' }}</div>
                <div v-if="scope.row.useLunar && scope.row.lastRenewDateLunar" class="text-[10px] text-gray-400 font-mono">({{ scope.row.lastRenewDateLunar }})</div>
            </template>
        </el-table-column>

        <el-table-column :label="t('cyclePeriod')" width="90">
            <template #default="scope">
                <span class="font-mono font-bold text-lg text-textDim">{{ scope.row.intervalDays }}</span> 
                <span class="text-[10px] text-gray-400 uppercase align-top">{{ t('unit.'+(scope.row.cycleUnit||'day')) }}</span>
            </template>
        </el-table-column>

        <el-table-column :label="t('actions')" :width="actionColWidth" fixed="right" align="right">
            <template #default="scope">
                <div class="flex justify-end items-center gap-2">
                    <el-tooltip :content="t('tipToggle')" placement="top" :hide-after="0">
                        <div class="inline-flex">
                            <el-switch v-model="scope.row.enabled" size="small" style="--el-switch-on-color:#2563eb;" @change="toggleEnable(scope.row)"></el-switch>
                        </div>
                    </el-tooltip>

                    <!-- Desktop View -->
                    <template v-if="windowWidth >= 640">
                        <div class="inline-flex">
                             <el-tooltip :content="t('tipRenew')" placement="top" :hide-after="0">
                                 <el-button class="!p-2 !rounded-none !ml-0" size="small" type="success" plain :icon="RefreshRight" @click="openRenew(scope.row)"></el-button>
                             </el-tooltip>
                             <el-tooltip :content="t('history')" placement="top" :hide-after="0">
                                 <el-button class="!p-2 !rounded-none !ml-0" size="small" type="warning" plain :icon="Tickets" @click="openHistory(scope.row)"></el-button>
                             </el-tooltip>

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
                            </div>    
                            </template>
                        </el-popconfirm>
                    </template>

                    <!-- Mobile View -->
                    <template v-else>
                         <el-dropdown trigger="click">
                            <el-button class="!p-2 !rounded-none !ml-0" size="small" type="primary" plain :icon="More"></el-button>
                            <template #dropdown>
                              <el-dropdown-menu>
                                <el-dropdown-item :icon="RefreshRight" @click="openRenew(scope.row)">{{ t('tipRenew') }}</el-dropdown-item>
                                <el-dropdown-item :icon="Tickets" @click="openHistory(scope.row)">{{ t('history') }}</el-dropdown-item>
                                <el-dropdown-item :icon="Edit" @click="editItem(scope.row)">{{ t('tipEdit') }}</el-dropdown-item>
                                <el-dropdown-item :icon="Delete" @click="confirmDelete(scope.row)" divided class="text-red-500">{{ t('tipDelete') }}</el-dropdown-item>
                              </el-dropdown-menu>
                            </template>
                          </el-dropdown>
                    </template>
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
                            :layout="paginationLayout"
                            :small="windowWidth < 640"
                            :pager-count="windowWidth < 640 ? 5 : 7"
                            :total="filteredList.length"
                            @size-change="() => window.scrollTo({top: 0, behavior: 'smooth'})"
                            @current-change="() => window.scrollTo({top: 0, behavior: 'smooth'})"
                        />
                    </div>
                </div>

                </template>
                <!-- End Project View -->

                <!-- Spending View -->
                <template v-else>
                    <div class="spending-dashboard animate-fade-in" v-if="spendingStats.hasData">
                         <!-- Header & Toggle -->
                         <div class="flex justify-between items-center mb-6">
                             <el-popover placement="bottom-start" :width="320" trigger="click" popper-class="!p-0 !bg-white dark:!bg-slate-900 !border-gray-200 dark:!border-slate-700">
                                <template #reference>
                                     <div class="flex items-center gap-2 cursor-pointer group select-none">
                                         <div class="relative flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                                             <el-icon :class="upcomingBillsList.length>0?'animate-pulse text-amber-500':'text-gray-400'"><Bell /></el-icon>
                                             <div v-if="upcomingBillsList.length > 0" class="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 shadow-sm ring-2 ring-white dark:ring-slate-900">
                                                 {{ upcomingBillsList.length }}
                                             </div>
                                         </div>
                                         <div class="flex flex-col justify-center h-8">
                                             <span class="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">{{ t('upcomingBills').replace('%s', settings.upcomingBillsDays || 7) }}</span>
                                         </div>
                                     </div>
                                </template>
                                <!-- Popover Content -->
                                <div class="flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <div class="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur flex justify-between items-center">
                                        <div class="text-xs font-bold font-mono text-slate-500 dark:text-gray-400">{{ t('filter.w7').replace('%s', settings.upcomingBillsDays || 7) }}</div>
                                        <div class="text-xs font-bold font-mono text-cyan-600 dark:text-cyan-400" v-if="upcomingBillsList.length > 0">{{ upcomingBillsTotal }}</div>
                                    </div>
                                    <div v-if="upcomingBillsList.length > 0" class="p-2 space-y-1">
                                         <div v-for="(bill, idx) in upcomingBillsList" :key="'up-'+idx" class="flex justify-between items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors cursor-default group">
                                             <div class="flex flex-col overflow-hidden mr-3">
                                                 <div class="flex items-center gap-1">
                                                     <span class="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 truncate">{{ bill.name }}</span>
                                                     <span v-if="bill.isProjected" class="text-[9px] px-1 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 scale-90 origin-left whitespace-nowrap">{{ t('predictedTag') }}</span>
                                                 </div>
                                                 <span class="text-xs text-amber-600 dark:text-amber-500 font-mono font-bold">{{ bill.days === 0 ? (lang==='zh'?'今天':'TODAY') : bill.days + (lang==='zh'?' 天剩余':' DAYS LEFT') }}</span>
                                             </div>
                                             <div class="text-right shrink-0">
                                                  <div class="text-xs font-bold font-mono text-cyan-600 dark:text-cyan-400">{{ bill.amount }} <span class="text-[9px] opacity-70">{{ bill.currency }}</span></div>
                                             </div>
                                         </div>
                                    </div>
                                    <div v-else class="p-8 text-center">
                                        <el-icon class="text-4xl text-slate-200 dark:text-slate-800 mb-2"><files /></el-icon>
                                        <div class="text-xs text-gray-400 dark:text-gray-600 font-mono">{{ t('noData') }}</div>
                                    </div>
                                </div>
                            </el-popover>

                             <div class="flex bg-gray-200 dark:bg-slate-800 rounded-lg p-1 border border-gray-300 dark:border-slate-700">
                                 <button @click="spendingMode='bill'" :class="['px-3 py-1 text-xs font-mono rounded transition-all', spendingMode==='bill' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white']">{{ t('billAmount') }}</button>
                                 <button @click="spendingMode='op'" :class="['px-3 py-1 text-xs font-mono rounded transition-all', spendingMode==='op' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white']">{{ t('opSpending') }}</button>
                             </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                             <!-- LEFT PANEL: Monthly Trend Chart & Item Details -->
                             <div class="lg:col-span-8 flex flex-col space-y-6">
                                 <!-- 1. Monthly Trend Chart Panel -->
                                 <div class="mecha-panel p-6 border-l-4 transition-colors duration-500 animate-slide-in flex-1" 
                                      :class="spendingMode==='bill' ? '!border-l-cyan-500' : '!border-l-purple-500'"
                                      style="animation-delay: 0.1s; min-height: 380px;">
                                     
                                     <div class="flex justify-between items-center mb-6">
                                         <div class="text-xs font-bold font-mono tracking-widest uppercase transition-colors duration-300"
                                              :class="spendingMode==='bill' ? 'text-cyan-600' : 'text-purple-600'">
                                              {{ t('monthlyTrend') }} <span class="opacity-50">({{ spendingMode==='bill' ? '12M' : '12M' }})</span>
                                         </div>
                                     </div>

                                     <!-- Chart Container (Restored height to h-52) -->
                                     <div class="relative h-52 pl-12 pr-4 pt-6 select-none">
                                         <!-- Y-axis labels -->
                                         <div class="absolute left-0 top-8 bottom-8 flex flex-col justify-between text-[10px] font-mono text-gray-400 pr-2 w-10 text-right">
                                             <span>{{ Math.max(...spendingStats[spendingMode].trends.map(m => parseFloat(m.val)), 0).toFixed(0) }}</span>
                                             <span>0</span>
                                         </div>
                                         
                                         <div class="h-full relative chart-container" @mouseleave="hoverIndex = -1">
                                             <!-- 1. Bars Layer (HTML for perfect aspect ratio) -->
                                             <div class="absolute inset-0">
                                                 <div v-for="(item, idx) in spendingStats[spendingMode].trends" :key="spendingMode+'-bar-'+idx"
                                                      class="absolute h-full flex items-end justify-center cursor-pointer"
                                                      :style="{ left: ((idx / 12) * 100) + '%', width: (100/12) + '%' }"
                                                      @mouseenter="hoverIndex = idx"
                                                      @click="selectedMonth = selectedMonth === item.month ? null : item.month">
                                                     
                                                      <div class="w-[70%] rounded-t transition-all duration-300 relative bar-animate"
                                                          :class="selectedMonth === item.month ? 'ring-2 ring-offset-1 ring-offset-transparent ' + (spendingMode==='bill' ? 'ring-cyan-300' : 'ring-purple-300') : ''"
                                                          :style="{ 
                                                              height: item.pct + '%', 
                                                              opacity: selectedMonth === item.month ? 1 : ((hoverIndex === -1 || hoverIndex === idx) ? 1 : 0.3),
                                                              animationDelay: (idx * 0.05) + 's' 
                                                          }">
                                                          <!-- Gradient Background -->
                                                          <div class="absolute inset-0 rounded-t"
                                                               :class="spendingMode==='bill' ? 'bg-gradient-to-t from-cyan-400 to-cyan-600' : 'bg-gradient-to-t from-purple-400 to-purple-600'"
                                                               :style="{ opacity: selectedMonth === item.month ? 1 : 0.8 }"></div>
                                                          <!-- Selected/Hover Highlight Line -->
                                                          <div v-if="hoverIndex === idx || selectedMonth === item.month" class="absolute top-0 left-0 right-0 h-[2px] bg-white shadow-glow"></div>
                                                      </div>
                                                 </div>
                                             </div>

                                             <!-- 2. Line Layer (SVG for path) -->
                                             <svg :key="spendingMode+'-line'" class="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                 <!-- Average Line (Dashed) -->
                                                 <line v-if="spendingStats[spendingMode].avgPct > 0"
                                                     x1="0" 
                                                     :y1="100 - spendingStats[spendingMode].avgPct" 
                                                     x2="100" 
                                                     :y2="100 - spendingStats[spendingMode].avgPct"
                                                     :stroke="spendingMode==='bill' ? '#22d3ee' : '#a78bfa'"
                                                     stroke-width="1.5"
                                                     stroke-dasharray="4 3"
                                                     vector-effect="non-scaling-stroke"
                                                     opacity="0.7"
                                                 />
                                                 <polyline 
                                                     fill="none" 
                                                     :stroke="spendingMode==='bill' ? '#67e8f9' : '#c4b5fd'"
                                                     stroke-width="2"
                                                     stroke-linecap="round"
                                                     stroke-linejoin="round"
                                                     vector-effect="non-scaling-stroke"
                                                     class="draw-line-animate"
                                                     :points="spendingStats[spendingMode].trends.map((item, idx) => {
                                                         const x = ((idx + 0.5) / 12) * 100;
                                                         const y = 100 - item.pct;
                                                         return x + ',' + y;
                                                     }).join(' ')"
                                                 />
                                             </svg>

                                             <!-- Average Value Label (Above Dashed Line) -->
                                             <div v-if="spendingStats[spendingMode].avgPct > 0"
                                                  class="absolute left-2 pointer-events-none text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900/70 dark:bg-slate-800/90 backdrop-blur-sm border transition-colors duration-300"
                                                  :class="spendingMode==='bill' ? 'text-cyan-400 border-cyan-500/30' : 'text-purple-400 border-purple-500/30'"
                                                  :style="{ top: 'calc(' + (100 - spendingStats[spendingMode].avgPct) + '% - 22px)' }">
                                                 {{ t('avgMonthlyLabel') }}: {{ spendingStats[spendingMode].avgVal.toFixed(2) }} {{ settings.defaultCurrency || 'CNY' }}
                                             </div>

                                             <!-- 3. Dots Layer (HTML for non-distorted dots) -->
                                             <div class="absolute inset-0 pointer-events-none">
                                                 <div v-for="(item, idx) in spendingStats[spendingMode].trends" :key="spendingMode+'-dot-'+idx"
                                                      class="absolute w-3 h-3 rounded-full border-2 transition-transform duration-300 fade-in-animate"
                                                      :class="[
                                                          item.isCurrent ? 'bg-white border-amber-500 scale-125 z-10' : (spendingMode==='bill' ? 'bg-cyan-500 border-cyan-200' : 'bg-purple-500 border-purple-200'),
                                                          hoverIndex === idx ? 'scale-150' : ''
                                                      ]"
                                                      :style="{ 
                                                          left: 'calc(' + ((idx + 0.5) / 12) * 100 + '% - 6px)', 
                                                          top: 'calc(' + (100 - item.pct) + '% - 6px)',
                                                          animationDelay: (0.8 + idx * 0.05) + 's' 
                                                      }">
                                                 </div>
                                             </div>

                                             <!-- Tooltip -->
                                             <div v-if="hoverIndex !== -1" 
                                                  class="absolute z-20 pointer-events-none transform -translate-x-1/2 transition-all duration-75"
                                                  :style="{ 
                                                      left: ((hoverIndex + 0.5) / 12) * 100 + '%', 
                                                      top: Math.max(0, 100 - spendingStats[spendingMode].trends[hoverIndex].pct - 20) + '%' 
                                                  }">
                                                 <div class="bg-slate-900/95 backdrop-blur border border-slate-600 text-white text-xs rounded p-3 shadow-2xl whitespace-nowrap min-w-[120px]">
                                                     <div class="font-bold text-[10px] text-slate-400 mb-2 uppercase">{{ spendingStats[spendingMode].trends[hoverIndex].month }}</div>
                                                     <div class="flex justify-between items-end mb-1">
                                                         <span class="text-[10px] text-slate-400">{{ t('total') }}</span>
                                                         <span class="font-mono font-bold text-sm">{{ spendingStats[spendingMode].trends[hoverIndex].total }} <span class="text-[10px] opacity-70">{{ settings.defaultCurrency || 'CNY' }}</span></span>
                                                     </div>
                                                     <div class="flex justify-between items-center mb-1">
                                                         <span class="text-[10px] text-slate-400">{{ t('count') }}</span>
                                                         <span class="font-mono font-bold text-[11px]">{{ spendingStats[spendingMode].trends[hoverIndex].count }}</span>
                                                     </div>
                                                     <div class="flex justify-between items-center border-t border-slate-700 pt-1 mt-1">
                                                         <span class="text-[9px] text-slate-500">{{ t('growth') }}</span>
                                                         <span :class="['font-mono text-[10px] font-bold', parseFloat(spendingStats[spendingMode].trends[hoverIndex].growth) > 0 ? 'text-red-400' : (parseFloat(spendingStats[spendingMode].trends[hoverIndex].growth) < 0 ? 'text-green-400' : 'text-gray-400')]">
                                                             {{ parseFloat(spendingStats[spendingMode].trends[hoverIndex].growth) > 0 ? '+' : '' }}{{ spendingStats[spendingMode].trends[hoverIndex].growth }}%
                                                         </span>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                     
                                     <!-- X-Axis Labels -->
                                     <div class="ml-12 mr-4 flex justify-between mt-2">
                                         <div v-for="(item, idx) in spendingStats[spendingMode].trends" :key="'l-'+item.month" 
                                              class="flex-1 text-center" @mouseenter="hoverIndex = idx">
                                             <div :class="['text-[9px] font-mono mt-1 transition-colors', 
                                                 item.isCurrent ? 'text-amber-500 font-bold' : 'text-gray-400',
                                                 hoverIndex === idx ? 'text-blue-500 font-bold' : '']">
                                                 {{ item.month.slice(5) }}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                                 
                                <!-- 2. Month Detail Card -->
                                <div class="mecha-panel p-4 border-t-4 transition-all duration-300 animate-slide-in flex-1"
                                      :class="spendingMode==='bill' ? '!border-t-cyan-500' : '!border-t-purple-500'"
                                      style="min-height: 280px;">
                                     <div class="flex justify-between items-center mb-3">
                                         <div class="text-xs font-bold font-mono tracking-widest uppercase transition-colors"
                                              :class="spendingMode==='bill' ? 'text-cyan-500' : 'text-purple-500'">
                                             {{ selectedMonth || '-' }} {{ t('itemDetails') }}
                                         </div>
                                         <div class="text-xs font-mono text-gray-400">{{ monthDetails.length }} {{ t('count') }}</div>
                                     </div>
                                     <div class="overflow-y-auto custom-scrollbar space-y-1" style="max-height: 280px;">
                                         <div v-if="monthDetails.length === 0" class="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm font-mono">
                                             {{ t('noData') }}
                                         </div>
                                      <div v-else v-for="(item, idx) in monthDetails" :key="'md-'+idx"
                                          class="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-slate-800/50 text-sm mb-1">
                                          <div class="flex flex-col overflow-hidden mr-2">
                                              <div class="flex items-center gap-2">
                                                  <span class="font-mono truncate font-bold text-slate-700 dark:text-slate-300">{{ item.name }}</span>
                                                  <span v-if="item.isProjected" class="text-[9px] px-1 rounded bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">{{ t('predictedTag') }}</span>
                                              </div>
                                              <div class="text-[10px] text-gray-400 font-mono truncate">{{ item.period }}</div>
                                          </div>
                                          <span class="font-mono font-bold whitespace-nowrap" :class="spendingMode==='bill' ? 'text-cyan-500' : 'text-purple-500'">
                                              {{ item.amount }} <span class="text-[10px] opacity-70">{{ settings.defaultCurrency || 'CNY' }}</span>
                                          </span>
                                      </div>
                                     </div>
                                 </div>
                             </div>

                             <!-- RIGHT PANEL: Stats -->
                             <div class="lg:col-span-4 space-y-6">
                                 <!-- Annual Summary -->
                                 <div class="mecha-panel p-6 border-t-4 transition-colors duration-500 animate-slide-in" 
                                      :class="spendingMode==='bill' ? '!border-t-cyan-500' : '!border-t-purple-500'"
                                      style="animation-delay: 0.2s; min-height: 380px;">
                                     <div class="flex justify-between items-center mb-6">
                                         <div class="text-xs font-bold font-mono tracking-widest uppercase">{{ t('annualSummary') }}</div>
                                         <el-icon class="text-gray-400"><component :is="Money" /></el-icon>
                                     </div>
                                     
                                     <!-- Selected Period Big Number -->
                                     <div class="mb-6">
                                          <div class="text-xs text-gray-400 font-mono mb-1">{{ spendingStats[spendingMode].selectedInfo?.label === '12M' ? t('last12M') : spendingStats[spendingMode].selectedInfo?.label }} {{ t('total') }}</div>
                                          <div class="text-3xl font-bold font-mono tracking-tight" :class="spendingMode==='bill' ? 'text-cyan-500' : 'text-purple-500'">
                                              {{ parseFloat(spendingStats[spendingMode].selectedInfo?.total || 0).toFixed(2) }} <span class="text-lg opacity-70">{{ settings.defaultCurrency || 'CNY' }}</span>
                                          </div>
                                     </div>

                                     <!-- Annual Bars with 12M option -->
                                     <div class="grid grid-cols-4 gap-2 h-52 items-end">
                                         <!-- 3 Year Bars -->
                                         <div v-for="y in spendingStats[spendingMode].annual" :key="'y-'+y.year" 
                                              class="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer transition-all"
                                              @click="selectedYear = y.year">
                                             <div class="text-[10px] font-mono font-bold transition-opacity -mb-4 z-10 bg-slate-800 text-white px-1 rounded"
                                                  :class="selectedYear === y.year ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'">{{ parseFloat(y.total).toFixed(2) }} {{ settings.defaultCurrency || 'CNY' }}</div>
                                             <div class="w-full rounded-t transition-all duration-300 relative overflow-hidden"
                                                  :class="[
                                                      selectedYear === y.year 
                                                          ? (spendingMode==='bill' ? 'bg-cyan-500/60 ring-2 ring-cyan-400' : 'bg-purple-500/60 ring-2 ring-purple-400') 
                                                          : (spendingMode==='bill' ? 'bg-cyan-500/20 hover:bg-cyan-500/40' : 'bg-purple-500/20 hover:bg-purple-500/40')
                                                  ]"
                                                  :style="{ height: Math.max(y.pct, 5) + '%' }">
                                                  <div class="absolute bottom-0 left-0 right-0 top-0"
                                                       :class="spendingMode==='bill' ? 'bg-cyan-500' : 'bg-purple-500'"
                                                       :style="{ opacity: selectedYear === y.year ? 0.8 : 0.5, height: '80%' }"></div>
                                             </div>
                                             <div class="text-xs font-mono font-bold transition-colors"
                                                  :class="selectedYear === y.year ? (spendingMode==='bill' ? 'text-cyan-400' : 'text-purple-400') : 'text-gray-500'">{{ y.year }}</div>
                                         </div>
                                         
                                         <!-- 12M (Recent) Bar -->
                                         <div class="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer transition-all"
                                              @click="selectedYear = 'recent'">
                                             <div class="text-[10px] font-mono font-bold transition-opacity -mb-4 z-10 bg-slate-800 text-white px-1 rounded"
                                                  :class="selectedYear === 'recent' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'">{{ spendingStats[spendingMode].recentTotal?.toFixed(2) || '0.00' }} {{ settings.defaultCurrency || 'CNY' }}</div>
                                             <div class="w-full rounded-t transition-all duration-300 relative overflow-hidden"
                                                  :class="[
                                                      selectedYear === 'recent' 
                                                          ? (spendingMode==='bill' ? 'bg-amber-500/60 ring-2 ring-amber-400' : 'bg-amber-500/60 ring-2 ring-amber-400') 
                                                          : (spendingMode==='bill' ? 'bg-amber-500/20 hover:bg-amber-500/40' : 'bg-amber-500/20 hover:bg-amber-500/40')
                                                  ]"
                                                  :style="{ height: Math.max(spendingStats[spendingMode].recentPct || 0, 5) + '%' }">
                                                  <div class="absolute bottom-0 left-0 right-0 top-0 bg-amber-500"
                                                       :style="{ opacity: selectedYear === 'recent' ? 0.8 : 0.5, height: '80%' }"></div>
                                             </div>
                                             <div class="text-xs font-mono font-bold transition-colors"
                                                  :class="selectedYear === 'recent' ? 'text-amber-400' : 'text-gray-500'">{{ t('last12M') }}</div>
                                         </div>
                                     </div>
                                 </div>

                                 <!-- Monthly Breakdown List -->
                                 <div class="mecha-panel p-0 overflow-hidden animate-slide-in" 
                                      style="animation-delay: 0.3s; min-height: 280px;">
                                     <div class="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
                                         <div class="text-xs font-bold font-mono tracking-widest uppercase">{{ t('monthlyBreakdown') }}</div>
                                     </div>
                                     <div class="overflow-y-auto custom-scrollbar p-2" style="max-height: 280px;">
                                         <div v-for="m in spendingStats[spendingMode].trends.slice().reverse()" :key="'mb-'+m.month"
                                              class="flex items-center justify-between p-3 mb-1 rounded transition-colors group cursor-pointer"
                                              :class="selectedMonth === m.month ? (spendingMode==='bill' ? 'bg-cyan-500/20 ring-1 ring-cyan-500/50' : 'bg-purple-500/20 ring-1 ring-purple-500/50') : 'hover:bg-gray-100 dark:hover:bg-slate-700/50'"
                                              @click="selectedMonth = selectedMonth === m.month ? null : m.month">
                                              
                                              <div class="flex items-center gap-3">
                                                  <div class="w-1.5 h-8 rounded-full transition-colors"
                                                       :class="[
                                                           selectedMonth === m.month ? (spendingMode==='bill' ? 'bg-cyan-400' : 'bg-purple-400') :
                                                           (m.isCurrent ? (spendingMode==='bill' ? 'bg-cyan-500' : 'bg-purple-500') : 'bg-gray-200 dark:bg-slate-700')
                                                       ]"></div>
                                                  <div>
                                                      <div class="text-xs font-bold font-mono">{{ m.month }}</div>
                                                      <div class="text-xs text-gray-400" v-if="m.isCurrent">{{ t('currMonth') }}</div>
                                                  </div>
                                              </div>

                                              <div class="text-right">
                                                  <div class="font-mono font-bold text-sm">{{ m.total }} <span class="text-[10px] opacity-70">{{ settings.defaultCurrency || 'CNY' }}</span></div>
                                                  <div class="text-[10px] font-mono mt-0.5" 
                                                       v-if="m.val > 0 || m.prevVal > 0"
                                                       :class="parseFloat(m.growth) > 0 ? 'text-red-500' : (parseFloat(m.growth) < 0 ? 'text-green-500' : 'text-gray-500')">
                                                      {{ parseFloat(m.growth) > 0 ? '↑' : (parseFloat(m.growth) < 0 ? '↓' : '-') }} {{ Math.abs(m.growth) }}%
                                                  </div>
                                              </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>
                    <div v-else class="mecha-panel p-12 text-center animate-fade-in">
                        <div class="text-gray-500 dark:text-gray-400 font-mono text-lg">{{ t('noSpendingData') }}</div>
                    </div>

                    <style>
                        @keyframes growUp {
                            from { transform: scaleY(0); }
                            to { transform: scaleY(1); }
                        }
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes slideIn {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        @keyframes drawLine {
                            0% { stroke-dashoffset: 2000; }
                            100% { stroke-dashoffset: 0; }
                        }
                        .bar-animate {
                            transform-origin: center bottom;
                            animation: growUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                        }
                        .fade-in-animate {
                            animation: fadeIn 0.5s ease-out backwards;
                        }
                        .animate-slide-in {
                            animation: slideIn 0.5s ease-out backwards;
                        }
                        .draw-line-animate {
                            stroke-dasharray: 2000;
                            stroke-dashoffset: 2000;
                            animation: drawLine 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                            animation-delay: 0.3s;
                        }
                        .shadow-glow {
                            box-shadow: 0 0 10px rgba(255,255,255,0.5);
                        }
                    </style>
                </template>
                <!-- End Spending View -->

                <div class="mt-8 py-6 text-center border-t border-slate-200/60">
                    <p class="text-[10px] text-gray-400 font-mono tracking-[0.2em] uppercase flex justify-center items-center gap-1">
                        &copy; 2025-2026 <a href="https://github.com/ieax/renewhelper" target="_blank" class="font-bold text-slate-600 hover:text-blue-600 transition-colors border-b border-dashed border-slate-300 hover:border-blue-600 pb-0.5 mx-1 decoration-0">RenewHelper</a>
                        <span class="text-blue-500 font-bold">${APP_VERSION}</span><span class="mx-2 opacity-30">|</span>DESIGNED BY <span class="font-bold text-slate-600">LOSTFREE</span>
                    </p>
                </div>                  
            </div>

            <el-dialog v-model="dialogVisible" :title="isEdit?t('editService'):t('newService')" width="680px" align-center class="!rounded-none mecha-panel" style="clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);">
                <el-form :model="form" label-position="top">
                    <el-form-item :label="t('formName')"><el-input v-model="form.name" size="large"><template #prefix><el-icon><Monitor/></el-icon></template></el-input></el-form-item>
                    <el-form-item :label="t('tags')"><el-select v-model="form.tags" multiple filterable allow-create default-first-option :reserve-keyword="false" :placeholder="t('tagPlaceholder')" style="width:100%" size="large"><el-option v-for="tag in allTags" :key="tag" :label="tag" :value="tag"></el-option></el-select></el-form-item>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <el-form-item :label="t('fixedPrice')" class="!mb-0"><el-input-number v-model="form.fixedPrice" :min="0" :precision="2" class="!w-full" controls-position="right"></el-input-number></el-form-item>
                        <el-form-item :label="t('currency')" class="!mb-0"><el-select v-model="form.currency" filterable class="!w-full"><el-option v-for="c in currencyList" :key="c" :label="c" :value="c"></el-option></el-select></el-form-item>
                    </div>

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
                            <el-date-picker v-if="form.useLunar" v-model="form.createDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" :disabled="isEdit" popper-class="lunar-popper"><template #default="c"><div class="lunar-cell"><el-tooltip :content="getLunarTooltip(c)" placement="top" :hide-after="0" :enterable="false"><div class="view-date"><span class="solar font-bold">{{c.text}}</span><span class="lunar">{{getSmartLunarText(c)}}</span></div></el-tooltip><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span><span class="y-ganzhi">{{getYearGanZhi(c.text)}}</span></div></div></template></el-date-picker>
                            <el-date-picker v-else v-model="form.createDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" :disabled="isEdit" popper-class="lunar-popper"><template #default="c"><div class="lunar-cell"><div class="view-date"><span class="solar font-bold">{{c.text}}</span></div><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span></div></div></template></el-date-picker>
                        </el-form-item>
                        <el-form-item class="!mb-0">
                            <template #label><div class="flex items-center gap-2"><span>{{ t('lastRenew') }}</span><span v-if="form.useLunar && form.lastRenewDate" class="text-[12px] font-bold text-purple-600 font-mono ml-1">{{ getLunarStr(form.lastRenewDate).replace('农历: ','') }}</span></div></template>
                            <el-date-picker v-if="form.useLunar" v-model="form.lastRenewDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" popper-class="lunar-popper"><template #default="c"><div class="lunar-cell"><el-tooltip :content="getLunarTooltip(c)" placement="top" :hide-after="0" :enterable="false"><div class="view-date"><span class="solar font-bold">{{c.text}}</span><span class="lunar">{{getSmartLunarText(c)}}</span></div></el-tooltip><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span><span class="y-ganzhi">{{getYearGanZhi(c.text)}}</span></div></div></template></el-date-picker>
                            <el-date-picker v-else v-model="form.lastRenewDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" popper-class="lunar-popper"><template #default="c"><div class="lunar-cell"><div class="view-date"><span class="solar font-bold">{{c.text}}</span></div><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span></div></div></template></el-date-picker>
                        </el-form-item>
                    </div>

                    <div v-if="previewData" class="relative mb-4 overflow-hidden rounded-sm border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 shadow-sm group">
                        <div class="flex justify-between items-center p-3 pl-5">
                            <div>
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-0.5">{{ t('nextDue') }}</div>
                                <div class="text-xl font-bold text-slate-700 dark:text-slate-200 font-mono tracking-tight leading-none">{{ previewData.date }}</div>
                            </div>
                            <div class="text-right">
                                 <div class="text-[10px] text-slate-400 font-mono mb-0.5">{{ t('previewCalc') }}</div>
                                 <div class="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono leading-none">{{ previewData.diff }}</div>
                            </div>
                        </div>
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
            
            <el-dialog v-model="settingsVisible" :title="t('settingsTitle')" :width="windowWidth < 768 ? '95%' : '600px'" align-center class="!rounded-none mecha-panel">
                <div class="settings-accordion">
                    <!-- 1. PREFERENCES -->
                    <div class="accordion-item">
                        <div class="accordion-header" :class="{active:settingsExpanded.pref}" @click="toggleSettingsSection('pref')">
                            <span class="flex items-center gap-2">
                                <el-icon><Setting /></el-icon> {{ t('secPref') }}
                            </span>
                            <el-icon :style="{transform: settingsExpanded.pref ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s'}">
                                <ArrowDown />
                            </el-icon>
                        </div>
                        <div class="accordion-content" :class="{expanded:settingsExpanded.pref}">
                            <el-form :model="settingsForm" label-position="top">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <el-form-item :label="t('defaultCurrency')">
                                        <el-select v-model="settingsForm.defaultCurrency" style="width:100%" filterable>
                                            <el-option v-for="c in currencyList" :key="c" :label="c" :value="c"></el-option>
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item :label="t('autoDisableThreshold')"><el-input-number v-model="settingsForm.autoDisableDays" :min="1" :max="365" class="!w-full"></el-input-number></el-form-item>
                                    <el-form-item :label="t('upcomingBillsDays')"><el-input-number v-model="settingsForm.upcomingBillsDays" :min="1" :max="365" class="!w-full"></el-input-number></el-form-item>
                                </div>
                            </el-form>
                        </div>
                    </div>

                    <!-- 2. NOTIFICATIONS -->
                    <div class="accordion-item">
                        <div class="accordion-header" :class="{active:settingsExpanded.notify}" @click="toggleSettingsSection('notify')">
                            <span class="flex items-center gap-2">
                                <el-icon><Bell /></el-icon> {{ t('secNotify') }}
                            </span>
                            <el-icon :style="{transform: settingsExpanded.notify ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s'}">
                                <ArrowDown />
                            </el-icon>
                        </div>
                        <div class="accordion-content" :class="{expanded:settingsExpanded.notify}">
                            <div class="flex items-center gap-4 mb-4">
                                <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ t('pushSwitch') }}</span>
                                <el-switch v-model="settingsForm.enableNotify" style="--el-switch-on-color:#2563eb;"></el-switch>
                                <div v-if="settingsForm.enableNotify" class="ml-auto flex items-center gap-2">
                                    <span class="text-xs text-gray-500">{{ t('lblPushTitle') || 'Title' }}</span>
                                    <el-input v-model="settingsForm.notifyTitle" :placeholder="t('pushTitle')" size="small" class="!w-48"></el-input>
                                </div>
                            </div>

                            <div v-if="settingsForm.enableNotify">
                                <el-collapse v-model="expandedChannels" accordion>
                            <!-- Telegram -->
                            <el-collapse-item name="telegram">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Promotion /></el-icon>
                                        <span class="font-bold flex-1">Telegram</span>
                                        <el-switch v-model="channelMap.telegram" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('telegram')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblToken') }}</span><el-input v-model="settingsForm.notifyConfig.telegram.token" placeholder="123456:ABC-DEF..." size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblChatId') }}</span><el-input v-model="settingsForm.notifyConfig.telegram.chatId" placeholder="-100xxxx" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('telegram')" :loading="testing.telegram">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>
                            
                            <!-- Bark -->
                            <el-collapse-item name="bark">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Iphone /></el-icon>
                                        <span class="font-bold flex-1">Bark</span>
                                        <el-switch v-model="channelMap.bark" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('bark')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblServer') }}</span><el-input v-model="settingsForm.notifyConfig.bark.server" placeholder="https://api.day.app" size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblDevKey') }}</span><el-input v-model="settingsForm.notifyConfig.bark.key" placeholder="Key" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('bark')" :loading="testing.bark">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>

                            <!-- Gotify -->
                            <el-collapse-item name="gotify">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Bell /></el-icon>
                                        <span class="font-bold flex-1">Gotify</span>
                                        <el-switch v-model="channelMap.gotify" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('gotify')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblServer') }}</span><el-input v-model="settingsForm.notifyConfig.gotify.server" placeholder="https://gotify.example.com" size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblToken') }}</span><el-input v-model="settingsForm.notifyConfig.gotify.token" placeholder="App Token" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('gotify')" :loading="testing.gotify">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>

                            <!-- Ntfy -->
                            <el-collapse-item name="ntfy">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Position /></el-icon>
                                        <span class="font-bold flex-1">Ntfy</span>
                                        <el-switch v-model="channelMap.ntfy" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('ntfy')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblServer') }}</span><el-input v-model="settingsForm.notifyConfig.ntfy.server" placeholder="https://ntfy.sh" size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblTopic') }}</span><el-input v-model="settingsForm.notifyConfig.ntfy.topic" placeholder="Topic" size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblToken') }}</span><el-input v-model="settingsForm.notifyConfig.ntfy.token" placeholder="Optional Token" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('ntfy')" :loading="testing.ntfy">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>

                            <!-- PushPlus -->
                            <el-collapse-item name="pushplus">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Comment /></el-icon>
                                        <span class="font-bold flex-1">PushPlus</span>
                                        <el-switch v-model="channelMap.pushplus" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('pushplus')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblToken') }}</span><el-input v-model="settingsForm.notifyConfig.pushplus.token" placeholder="Token" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('pushplus')" :loading="testing.pushplus">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>

                            <!-- NotifyX -->
                            <el-collapse-item name="notifyx">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Notification /></el-icon>
                                        <span class="font-bold flex-1">NotifyX</span>
                                        <el-switch v-model="channelMap.notifyx" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('notifyx')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblApiKey') }}</span><el-input v-model="settingsForm.notifyConfig.notifyx.apiKey" placeholder="API Key" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('notifyx')" :loading="testing.notifyx">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>

                            <!-- Resend -->
                            <el-collapse-item name="resend">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Message /></el-icon>
                                        <span class="font-bold flex-1">Resend</span>
                                        <el-switch v-model="channelMap.resend" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('resend')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblApiKey') }}</span><el-input v-model="settingsForm.notifyConfig.resend.apiKey" placeholder="re_..." size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblFrom') }}</span><el-input v-model="settingsForm.notifyConfig.resend.from" placeholder="From" size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblTo') }}</span><el-input v-model="settingsForm.notifyConfig.resend.to" placeholder="To" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('resend')" :loading="testing.resend">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>

                            <!-- Webhook 1 -->
                            <el-collapse-item name="webhook">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Connection /></el-icon>
                                        <span class="font-bold flex-1">Webhook 1</span>
                                        <el-switch v-model="channelMap.webhook" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('webhook')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblServer') }}</span><el-input v-model="settingsForm.notifyConfig.webhook.url" placeholder="https://..." size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblHeaders') }}</span><el-input v-model="settingsForm.notifyConfig.webhook.headers" type="textarea" :rows="2" placeholder="JSON" size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblBody') }}</span><el-input v-model="settingsForm.notifyConfig.webhook.body" type="textarea" :rows="2" placeholder="JSON" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('webhook')" :loading="testing.webhook">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>

                            <!-- Webhook 2 -->
                            <el-collapse-item name="webhook2">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Connection /></el-icon>
                                        <span class="font-bold flex-1">Webhook 2</span>
                                        <el-switch v-model="channelMap.webhook2" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('webhook2')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblServer') }}</span><el-input v-model="settingsForm.notifyConfig.webhook2.url" placeholder="https://..." size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblHeaders') }}</span><el-input v-model="settingsForm.notifyConfig.webhook2.headers" type="textarea" :rows="2" placeholder="JSON" size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblBody') }}</span><el-input v-model="settingsForm.notifyConfig.webhook2.body" type="textarea" :rows="2" placeholder="JSON" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('webhook2')" :loading="testing.webhook2">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>

                            <!-- Webhook 3 -->
                            <el-collapse-item name="webhook3">
                                <template #title>
                                    <div class="flex items-center w-full pr-4">
                                        <el-icon class="mr-2 text-lg"><Connection /></el-icon>
                                        <span class="font-bold flex-1">Webhook 3</span>
                                        <el-switch v-model="channelMap.webhook3" style="--el-switch-on-color:#2563eb;" @change="toggleChannel('webhook3')" @click.stop></el-switch>
                                    </div>
                                </template>
                                <div class="p-2">
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblServer') }}</span><el-input v-model="settingsForm.notifyConfig.webhook3.url" placeholder="https://..." size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblHeaders') }}</span><el-input v-model="settingsForm.notifyConfig.webhook3.headers" type="textarea" :rows="2" placeholder="JSON" size="small"></el-input></div>
                                    <div class="notify-item-row"><span class="notify-label">{{ t('lblBody') }}</span><el-input v-model="settingsForm.notifyConfig.webhook3.body" type="textarea" :rows="2" placeholder="JSON" size="small"></el-input></div>
                                    <div class="flex justify-end mt-2"><el-button size="small" type="primary" link @click="testChannel('webhook3')" :loading="testing.webhook3">{{ t('btnTest') }}</el-button></div>
                                </div>
                            </el-collapse-item>
                        </el-collapse>
                            </div>
                        </div>
                    </div>

                    <!-- 3. CALENDAR -->
                    <div class="accordion-item">
                        <div class="accordion-header" :class="{active:settingsExpanded.calendar}" @click="toggleSettingsSection('calendar')">
                            <span class="flex items-center gap-2">
                                <el-icon><Calendar /></el-icon> {{ t('lblIcsTitle') }}
                            </span>
                            <el-icon :style="{transform: settingsExpanded.calendar ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s'}">
                                <ArrowDown />
                            </el-icon>
                        </div>
                        <div class="accordion-content" :class="{expanded:settingsExpanded.calendar}">
                            <div class="flex justify-between items-center bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-100 dark:border-amber-900 mb-3">
                                <span class="text-xs text-amber-700 dark:text-amber-500 font-bold">{{ t('lblIcsUrl') }}</span>
                                <el-button type="primary" link size="small" @click="resetCalendarToken" :loading="loading">{{ t('btnResetToken') }}</el-button>
                            </div>
                            <div class="flex gap-2 w-full">
                                <el-input v-model="calendarUrl" readonly id="icsUrlInput" class="flex-1"></el-input>
                                <el-button class="mecha-btn !rounded-sm" @click="copyIcsUrl">{{ t('btnCopy') }}</el-button>
                            </div>
                        </div>
                    </div>

                    <!-- 4. DATA -->
                    <div class="accordion-item">
                        <div class="accordion-header" :class="{active:settingsExpanded.data}" @click="toggleSettingsSection('data')">
                            <span class="flex items-center gap-2">
                                <el-icon><Files /></el-icon> {{ t('secData') }}
                            </span>
                            <el-icon :style="{transform: settingsExpanded.data ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s'}">
                                <ArrowDown />
                            </el-icon>
                        </div>
                        <div class="accordion-content" :class="{expanded:settingsExpanded.data}">
                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <el-button type="success" plain :icon="Download" class="w-full h-12 mecha-btn" @click="exportData">{{ t('btnExport') }}</el-button>
                                <el-button type="warning" plain :icon="Upload" class="w-full h-12 mecha-btn" @click="triggerImport">{{ t('btnImport') }}</el-button>
                                <input type="file" ref="importRef" style="display:none" accept=".json" @change="handleImportFile">
                            </div>
                            <el-button type="info" plain class="w-full mecha-btn" @click="migrateOldData">
                                {{ lang === 'zh' ? '升级旧数据 (生成初始账单)' : 'Migrate Old Data (Generate Initial Bills)' }}
                            </el-button>
                        </div>
                    </div>
                </div>

                <template #footer><el-button @click="settingsVisible=false" size="large" class="mecha-btn">{{ t('cancel') }}</el-button><el-button type="primary" @click="saveSettings" size="large" class="mecha-btn !bg-blue-600">{{ t('saveSettings') }}</el-button></template>
            </el-dialog>

            <!-- Renew Dialog (also used for Add History) -->
            <el-dialog v-model="renewDialogVisible" :title="renewMode === 'addHistory' ? t('btnAddHist') : t('manualRenew')" width="500px" align-center class="mecha-panel !rounded-none">
               <el-form label-position="top">
                 <el-form-item :label="t('renewDate')">
                    <el-date-picker v-model="renewForm.renewDate" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" class="!w-full"></el-date-picker>
                 </el-form-item>
                 <el-form-item :label="t('billPeriod')">
                     <template #label>
                        {{t('billPeriod')}}
                        <div class="inline-flex items-center gap-1 ml-2 align-middle">
                            <span v-if="currentRenewItem.intervalDays" class="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1 py-[2px] leading-none whitespace-nowrap uppercase">
                                {{ currentRenewItem.intervalDays }} {{ t('unit.' + (currentRenewItem.cycleUnit || 'day')) }}
                            </span>
                            <span v-if="currentRenewItem.useLunar" class="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1 py-[2px] leading-none whitespace-nowrap">
                                {{ t('lunarCal') }}
                            </span>
                        </div>
                     </template>
                     <div class="flex items-center gap-4">
                         <div class="flex-1 min-w-0">
                             <el-date-picker v-if="currentRenewItem.useLunar" v-model="renewForm.startDate" type="date" value-format="YYYY-MM-DD" :placeholder="t('startDate')" style="width:100%" :clearable="false" popper-class="lunar-popper" :disabled="renewMode === 'renew' && currentRenewItem.type === 'cycle'"><template #default="c"><div class="lunar-cell"><el-tooltip :content="getLunarTooltip(c)" placement="top" :hide-after="0" :enterable="false"><div class="view-date"><span class="solar font-bold">{{c.text}}</span><span class="lunar">{{getSmartLunarText(c)}}</span></div></el-tooltip><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span><span class="y-ganzhi">{{getYearGanZhi(c.text)}}</span></div></div></template></el-date-picker>
                             <el-date-picker v-else v-model="renewForm.startDate" type="date" value-format="YYYY-MM-DD" :placeholder="t('startDate')" style="width:100%" :clearable="false" popper-class="lunar-popper" :disabled="renewMode === 'renew' && currentRenewItem.type === 'cycle'"><template #default="c"><div class="lunar-cell"><div class="view-date"><span class="solar font-bold">{{c.text}}</span></div><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span></div></div></template></el-date-picker>
                             <div v-if="currentRenewItem.useLunar" class="text-xs text-purple-600 mt-1 font-mono">{{ getLunarStr(renewForm.startDate) }}</div>
                         </div>
                         <span class="text-gray-400 flex-shrink-0">-</span>
                         <div class="flex-1 min-w-0">
                             <el-date-picker v-if="currentRenewItem.useLunar" v-model="renewForm.endDate" type="date" value-format="YYYY-MM-DD" :placeholder="t('endDate')" style="width:100%" :clearable="false" popper-class="lunar-popper" :disabled="renewMode === 'renew' && currentRenewItem.type === 'cycle'"><template #default="c"><div class="lunar-cell"><el-tooltip :content="getLunarTooltip(c)" placement="top" :hide-after="0" :enterable="false"><div class="view-date"><span class="solar font-bold">{{c.text}}</span><span class="lunar">{{getSmartLunarText(c)}}</span></div></el-tooltip><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span><span class="y-ganzhi">{{getYearGanZhi(c.text)}}</span></div></div></template></el-date-picker>
                             <el-date-picker v-else v-model="renewForm.endDate" type="date" value-format="YYYY-MM-DD" :placeholder="t('endDate')" style="width:100%" :clearable="false" popper-class="lunar-popper" :disabled="renewMode === 'renew' && currentRenewItem.type === 'cycle'"><template #default="c"><div class="lunar-cell"><div class="view-date"><span class="solar font-bold">{{c.text}}</span></div><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span></div></div></template></el-date-picker>
                             <div v-if="currentRenewItem.useLunar" class="text-xs text-purple-600 mt-1 font-mono">{{ getLunarStr(renewForm.endDate) }}</div>
                         </div>
                     </div>
                 </el-form-item>
                 <div class="grid grid-cols-2 gap-4">
                     <el-form-item :label="t('actualPrice')">
                         <el-input-number v-model="renewForm.price" :precision="2" style="width:100%" class="!w-full" controls-position="right"></el-input-number>
                     </el-form-item>
                     <el-form-item :label="t('currency')">
                         <el-select v-model="renewForm.currency" filterable class="!w-full">
                             <el-option v-for="c in currencyList" :key="c" :label="c" :value="c"></el-option>
                         </el-select>
                     </el-form-item>
                 </div>
                 <el-form-item :label="t('note')">
                     <el-input v-model="renewForm.note" type="textarea" :placeholder="t('notePlaceholder')"></el-input>
                 </el-form-item>
               </el-form>
               <template #footer>
                  <el-button @click="renewDialogVisible=false">{{t('cancel')}}</el-button>
                  <el-button type="primary" @click="submitRenew" :loading="submitting">{{t('yes')}}</el-button>
               </template>
            </el-dialog>

            <!-- History Dialog -->
<el-dialog v-model="historyDialogVisible" :title="currentHistoryItem.name + ' - ' + t('historyTitle')" width="700px" align-center class="mecha-panel !rounded-none" style="clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);">
                <div class="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded border border-slate-100 dark:border-slate-700 relative flex items-center justify-between">
                     <div class="flex items-center gap-6 flex-wrap">
                         <div class="flex items-center gap-2">
                             <div class="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{{t('totalCost')}}</div> 
                             <div class="font-black text-xl font-mono text-blue-600 dark:text-blue-400 leading-none">{{historyStats.convertedTotal}} <span class="text-xs text-gray-400 font-bold">{{historyStats.preferredCurrency}}</span></div>
                         </div>
                         <div v-if="Object.keys(historyStats.byCurrency).length > 1" class="flex items-center gap-2 flex-wrap">
                             <span v-for="(amount, cur) in historyStats.byCurrency" :key="cur" class="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{{amount.toFixed(2)}} {{cur}}</span>
                         </div>
                         <div class="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                         <div class="flex items-center gap-2">
                             <div class="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{{t('totalCount')}}</div> 
                             <div class="font-black text-xl font-mono text-amber-500 leading-none">{{historyStats.count}}</div>
                         </div>
                     </div>
                     <el-tooltip :content="t('btnAddHist')" placement="left">
                         <el-button type="success" circle plain @click="addHistoryRecord" :icon="Plus" class="!border-emerald-200 !text-emerald-600 hover:!bg-emerald-50"></el-button>
                     </el-tooltip>
                </div>
                
                <div class="max-h-[500px] overflow-y-auto px-1">
                    <el-timeline v-if="pagedHistory.length > 0">
                        <el-timeline-item v-for="(item, index) in pagedHistory" :key="index" :type="index===0?'primary':''" :hollow="index!==0" :timestamp="formatLogTime(item.renewDate)" placement="top" hide-timestamp>
                            
                            <div class="mecha-panel p-3 mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative group">
                                
                                <div v-if="editingHistoryIndex !== index">
                                    <div class="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono text-base font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                                                {{ item.renewDate ? item.renewDate.substring(0, 16) : 'N/A' }}
                                            </span>
                                            <span v-if="index===0 && historyPage===1" class="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-sm font-bold">{{ t('tagLatest') }}</span>
                                            <span v-if="item.note && (item.note.includes('Auto') || item.note.includes('自动'))" class="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-sm font-bold">{{ t('tagAuto') }}</span>
                                            <span v-else class="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm font-bold">{{ t('tagManual') }}</span>
                                        </div>
                                        <div class="flex gap-1">
                                            <el-button type="primary" link size="small" @click="startEditHistory(index, item)" :icon="Edit"></el-button>
                                            <el-popconfirm :title="t('msg.confirmDel')" @confirm="removeHistoryRecord(index)">
                                                <template #reference><el-button type="danger" link size="small" :icon="Delete"></el-button></template>
                                            </el-popconfirm>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2 mb-1">
                                        <div class="flex items-center gap-2 flex-1">
                                            <span class="text-xs text-gray-400 uppercase font-bold">{{ t('billPeriod') }}</span>
                                            <div class="font-mono text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 inline-block px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded-sm">
                                                {{ item.startDate }} <span class="mx-1 text-gray-300">-></span> {{ item.endDate }}
                                            </div>
                                        </div>
                                        <div class="text-lg font-black font-mono text-blue-600 dark:text-blue-400 leading-none">{{ item.price }} <span class="text-xs font-bold text-gray-400">{{ item.currency }}</span></div>
                                    </div>

                                    <div class="flex items-start gap-3" v-if="item.note && !item.note.includes('Auto')">
                                        <div class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5 break-all">
                                            📝 {{ item.note }}
                                        </div>
                                    </div>
                                </div>

                                <div v-else class="bg-blue-50/50 dark:bg-slate-800/50 -m-2 p-4 border border-blue-200 dark:border-blue-800 relative">
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <div class="text-[10px] text-blue-500 font-bold mb-1">{{ t('opDate') }}</div>
                                            <el-date-picker v-model="tempHistoryItem.renewDate" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" size="small" style="width:100%" :clearable="false"></el-date-picker>
                                        </div>
                                        <div>
                                            <div class="text-[10px] text-blue-500 font-bold mb-1">{{ t('amount') }}</div>
                                            <div class="flex gap-2">
                                                <el-input-number v-model="tempHistoryItem.price" :min="0" :precision="2" :controls="false" size="small" style="flex:1"></el-input-number>
                                                <el-select v-model="tempHistoryItem.currency" size="small" style="width:80px">
                                                    <el-option v-for="c in currencyList" :key="c" :label="c" :value="c"></el-option>
                                                </el-select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3 opacity-60">
                                        <div class="text-[10px] text-gray-500 font-bold mb-1">{{ t('billPeriod') }} ({{ t('readOnly') }})</div>
                                        <div class="flex items-center gap-2">
                                            <el-input v-model="tempHistoryItem.startDate" size="small" disabled class="!w-32"></el-input>
                                            <span class="text-gray-400">-</span>
                                            <el-input v-model="tempHistoryItem.endDate" size="small" disabled class="!w-32"></el-input>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <div class="text-[10px] text-blue-500 font-bold mb-1">{{ t('note') }}</div>
                                        <el-input v-model="tempHistoryItem.note" size="small" placeholder="Optional note..."></el-input>
                                    </div>
                                    <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-blue-100 dark:border-blue-900">
                                        <el-button size="small" text @click="cancelEditHistory">{{ t('cancel') }}</el-button>
                                        <el-button size="small" type="primary" @click="saveEditHistory(index)">{{ t('save') }}</el-button>
                                    </div>
                                </div>

                            </div>
                        </el-timeline-item>
                    </el-timeline>
                    <el-empty v-else :description="t('noLogs')"></el-empty>
                </div>

                <div class="mt-4 flex justify-end" v-if="currentHistoryItem.renewHistory.length > historyPageSize">
                     <el-pagination layout="prev, pager, next" :total="currentHistoryItem.renewHistory.length" :page-size="historyPageSize" v-model:current-page="historyPage" hide-on-single-page background small></el-pagination>
                </div>
            </el-dialog>


            <el-drawer v-model="historyVisible" :title="t('sysLogs')" :size="drawerSize">
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
        const { createApp, ref, computed, onMounted, onUnmounted, nextTick, reactive,watch } = Vue;
        const { ElMessage, ElMessageBox } = ElementPlus;
        const { Edit, Delete, Plus, VideoPlay, Setting, Bell, Document, Lock, Monitor, SwitchButton, Calendar, Timer, Files, AlarmClock, Warning, Search, Cpu, Upload, Download, Link, Connection, Message, Promotion, Iphone, Moon, Sunny, RefreshRight, More, ArrowDown, Tickets } = ElementPlusIconsVue;
        const ZhCn = window.ElementPlusLocaleZhCn || {};
        const frontendCalc = {
            l2s(l) {
                let days = 0;
                const { year, month, day, isLeap } = l;
                for (let i = 1900; i < year; i++) days += LUNAR.lYearDays(i);
                const leap = LUNAR.leapMonth(year);
                for (let i = 1; i < month; i++) {
                    days += LUNAR.monthDays(year, i);
                    if (leap > 0 && i === leap) days += LUNAR.leapDays(year);
                }
                if (isLeap) days += LUNAR.monthDays(year, month);
                days += day - 1;
                const base = new Date(Date.UTC(1900, 0, 31));
                const target = new Date(base.getTime() + days * 86400000);
                return { year: target.getUTCFullYear(), month: target.getUTCMonth() + 1, day: target.getUTCDate() };
            },
            addPeriod(l, val, unit) {
                let { year, month, day, isLeap } = l;
                if (unit === 'year') {
                    year += val;
                    const lp = LUNAR.leapMonth(year);
                    isLeap = isLeap && lp === month;
                } else if (unit === 'month') {
                    let tot = (year - 1900) * 12 + (month - 1) + val;
                    year = Math.floor(tot / 12) + 1900;
                    month = (tot % 12) + 1;
                    const lp = LUNAR.leapMonth(year);
                    isLeap = isLeap && lp === month;
                } else if (unit === 'day') {
                    const s = this.l2s(l);
                    const d = new Date(Date.UTC(s.year, s.month - 1, s.day + val));
                    return LUNAR.solar2lunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
                }
                let max = isLeap ? LUNAR.leapDays(year) : LUNAR.monthDays(year, month);
                let td = Math.min(day, max);
                while (td > 0) {
                    if (this.l2s({ year, month, day: td, isLeap })) return { year, month, day: td, isLeap };
                    td--;
                }
                return { year, month, day, isLeap };
            }
        };
        const messages = {
            zh: { upcomingBillsDays:'待付款提醒天数', upcomingBills: '%s日内待付款项', filter:{expired:'已过期 / 今天', w7:'%s天内', w30:'30天内', thisMonth:'本月内', nextMonth:'下月内', halfYear:'半年内', oneYear:'1年内', new:'新服务 (<30天)', stable:'稳定 (1个月-1年)', long:'长期 (>1年)', m1:'最近1个月', m6:'半年内', year:'今年内', earlier:'更早以前'}, viewSwitch:'视图切换',viewProjects:'项目列表',viewSpending:'支出分析',annualSummary:'年度汇总',monthlyTrend:'月度趋势',noSpendingData:'暂无支出数据',avgMonthly:'月均',billAmount:'账单金额 (按账单周期)',opSpending:'实际支出 (按操作日期)',secPref: '偏好设置',manualRenew: '手动续期',tipToggle: '切换状态',tipRenew: '手动续期',tipEdit: '编辑服务',tipDelete: '删除服务',secNotify: '通知配置',secData: '数据管理',lblIcsTitle: '日历订阅',lblIcsUrl: '订阅地址 (iOS/Google)',btnCopy: '复制',btnResetToken: '重置令牌',loginTitle:'身份验证',passwordPlaceholder:'请输入访问密钥/Authorization Key',unlockBtn:'解锁终端/UNLOCK',check:'立即检查',add:'新增服务',settings:'系统设置',logs:'运行日志',logout:'安全退出',totalServices:'服务总数',expiringSoon:'即将到期',expiredAlert:'已过期 / 警告',serviceName:'服务名称',type:'类型',nextDue:'下次到期',uptime:'已运行',lastRenew:'上次续期',cyclePeriod:'周期',actions:'操作',cycle:'循环订阅',reset:'到期重置',disabled:'已停用',days:'天',daysUnit:'天',typeReset:'到期重置',typeCycle:'循环订阅',lunarCal:'农历',lbOffline:'离线',unit:{day:'天',month:'月',year:'年'},editService:'编辑服务',newService:'新增服务',formName:'名称',namePlaceholder:'例如: Netflix',formType:'模式',createDate:'创建时间',interval:'周期时长',note:'备注信息',status:'状态',active:'启用',disabledText:'禁用',cancel:'取消',save:'保存数据',saveSettings:'保存配置',settingsTitle:'系统设置',setNotify:'通知配置',pushSwitch:'推送总开关',pushUrl:'Webhook 地址',notifyThreshold:'提醒阈值',setAuto:'自动化配置',autoRenewSwitch:'自动续期',autoRenewThreshold:'自动续期阈值',autoDisableThreshold:'自动禁用阈值',daysOverdue:'天后触发',sysLogs:'系统日志',execLogs:'执行记录',clearHistory:'清空历史',noLogs:'无记录',liveLog:'实时终端',btnExport: '导出备份',btnImport: '恢复备份',btnTest: '发送测试',btnRefresh:'刷新日志',
            lblEnable: '启用', lblToken: '令牌 (Token)', lblApiKey: 'API Key', lblChatId: '会话ID', 
            lblServer: '服务器URL', lblDevKey: '设备Key', lblFrom: '发件人', lblTo: '收件人',
            lblTopic: '主题 (Topic)',readOnly: '只读',
            lblNotifyTime: '提醒时间', btnResetToken: '重置令牌',
            lblHeaders: '请求头 (JSON)', lblBody: '消息体 (JSON)',
            tag:{alert:'触发提醒',renew:'自动续期',disable:'自动禁用',normal:'检查正常'},tagLatest:'最新',tagAuto:'自动',tagManual:'手动',msg:{confirmRenew: '确认将 [%s] 的更新日期设置为今天吗？',renewSuccess: '续期成功！日期已更新: %s -> %t',tokenReset: '令牌已重置，请更新订阅地址', copyOk: '链接已复制', exportSuccess: '备份已下载',importSuccess: '数据恢复成功，即将刷新',importFail: '导入失败，请检查文件格式',passReq:'请输入密码',saved:'保存成功',saveFail:'保存失败',cleared:'已清空',clearFail:'清空失败',loginFail:'验证失败',loadLogFail:'日志加载失败',confirmDel:'确认删除此项目?',dateError:'上次更新日期不能早于创建日期',nameReq:'服务名称不能为空',nameExist:'服务名称已存在',futureError:'上次续期不能是未来时间',serviceDisabled:'服务已停用',serviceEnabled:'服务已启用',execFinish: '执行完毕!'},tags:'标签',tagPlaceholder:'输入标签回车创建',searchPlaceholder:'搜索标题或备注...',tagsCol:'标签',tagAll:'全部',useLunar:'农历周期',lunarTip:'按农历日期计算周期',yes:'是',no:'否',timezone:'偏好时区',disabledFilter:'已停用',policyConfig:'自动化策略',policyNotify:'提醒提前期',policyAuto:'自动续期',policyRenewDay:'过期续期天数',useGlobal:'全局默认',autoRenewOnDesc:'过期自动续期',autoRenewOffDesc:'过期自动禁用',previewCalc:'根据上次续期日期和周期计算',nextDue:'下次到期',
            fixedPrice:'账单额',currency:'币种',defaultCurrency:'默认币种',history:'历史记录',historyTitle:'续费历史',totalCost:'总花费',totalCount:'续费次数',renewDate:'操作日期',billPeriod:'账单周期',startDate:'开始日期',endDate:'结束日期',actualPrice:'实付金额',notePlaceholder:'可选备注...',btnAddHist:'补录历史',modify:'修改',confirmDelHist:'删除此记录?',opDate:'操作日',amount:'金额',period:'周期',spendingDashboard:'花销看板',monthlyBreakdown:'月度明细',total:'总计',count:'笔',growth:'环比',currMonth:'本月',avgMonthlyLabel:'月均支出',itemDetails:'项目明细',noData:'暂无数据',predictedTag:'预测',last12M:'最近12个月', lblPushTitle:'自定义标题', pushTitle:'RenewHelper 报告'},
            en: { upcomingBillsDays:'Pending Reminder', upcomingBills: '%s Days Pending', viewSwitch:'VIEW SWITCH',viewProjects:'PROJECTS',viewSpending:'DASHBOARD',annualSummary:'Annual Summary',monthlyTrend:'Monthly Trend',noSpendingData:'No Spending Data',billAmount:'BILL AMOUNT',opSpending:'ACTUAL COST', avgMonthly:'AVG', avgMonthlyLabel:'AVG MONTHLY', filter:{expired:'Overdue/Today', w7:'Within %s Days', w30:'Within 30 Days', future:'Future(>30d)', new:'New (<30d)', stable:'Stable (1m-1y)', long:'Long Term (>1y)', m1:'Last Month', m6:'Last 6 Months', year:'This Year', earlier:'Earlier'}, secPref: 'PREFERENCES',manualRenew: 'Quick Renew',tipToggle: 'Toggle Status',tipRenew: 'Quick Renew',tipEdit: 'Edit Service',tipDelete: 'Delete Service',secNotify: 'NOTIFICATIONS',secData: 'DATA MANAGEMENT',lblIcsTitle: 'CALENDAR SUBSCRIPTION',lblIcsUrl: 'ICS URL (iOS/Google Calendar)',btnCopy: 'COPY',btnResetToken: 'RESET TOKEN',loginTitle:'SYSTEM ACCESS',passwordPlaceholder:'Authorization Key',unlockBtn:'UNLOCK TERMINAL',check:'CHECK',add:'ADD NEW',settings:'CONFIG',logs:'LOGS',logout:'LOGOUT',totalServices:'TOTAL SERVICES',expiringSoon:'EXPIRING SOON',expiredAlert:'EXPIRED / ALERT',serviceName:'SERVICE NAME',type:'TYPE',nextDue:'NEXT DUE',uptime:'UPTIME',lastRenew:'LAST RENEW',cyclePeriod:'CYCLE',actions:'ACTIONS',cycle:'CYCLE',reset:'RESET',disabled:'DISABLED',days:'DAYS',daysUnit:'DAYS',typeReset:'RESET',typeCycle:'CYCLE',lunarCal:'Lunar',lbOffline:'OFFLINE',unit:{day:'DAY',month:'MTH',year:'YR'},editService:'EDIT SERVICE',newService:'NEW SERVICE',formName:'NAME',namePlaceholder:'e.g. Netflix',formType:'MODE',createDate:'CREATE DATE',interval:'INTERVAL',note:'NOTE',status:'STATUS',active:'ACTIVE',disabledText:'DISABLED',cancel:'CANCEL',save:'SAVE DATA',saveSettings:'SAVE CONFIG',settingsTitle:'SYSTEM CONFIG',setNotify:'NOTIFICATION',pushSwitch:'MASTER PUSH',pushUrl:'WEBHOOK URL',notifyThreshold:'ALERT THRESHOLD',setAuto:'AUTOMATION',autoRenewSwitch:'AUTO RENEW',autoRenewThreshold:'RENEW AFTER',autoDisableThreshold:'DISABLE AFTER',daysOverdue:'DAYS OVERDUE',sysLogs:'SYSTEM LOGS',execLogs:'EXECUTION LOGS',clearHistory:'CLEAR HISTORY',noLogs:'NO DATA',liveLog:'LIVE TERMINAL',btnExport: 'Export Data',btnImport: 'Import Data',btnTest: 'Send Test',btnRefresh:'REFRESH',last12M:'LAST 12M',
            lblEnable: 'Enable', lblToken: 'Token', lblApiKey: 'API Key', lblChatId: 'Chat ID', 
            lblServer: 'Server URL', lblDevKey: 'Device Key', lblFrom: 'From Email', lblTo: 'To Email',
            lblTopic: 'Topic',readOnly: 'Read-only',
            lblNotifyTime: 'Alarm Time', btnResetToken: 'RESET TOKEN',
            lblHeaders: 'Headers (JSON)', lblBody: 'Body (JSON)',
            tag:{alert:'ALERT',renew:'RENEWED',disable:'DISABLED',normal:'NORMAL'},tagLatest:'LATEST',tagAuto:'AUTO',tagManual:'MANUAL',msg:{confirmRenew: 'Renew [%s] to today based on your timezone?',renewSuccess: 'Renewed! Date updated: %s -> %t',tokenReset: 'Token Reset. Update your calendar apps.', copyOk: 'Link Copied', exportSuccess: 'Backup Downloaded',importSuccess: 'Restore Success, Refreshing...',importFail: 'Import Failed, Check File Format',passReq:'Password Required',saved:'Data Saved',saveFail:'Save Failed',cleared:'Cleared',clearFail:'Clear Failed',loginFail:'Access Denied',loadLogFail:'Load Failed',confirmDel:'Confirm Delete?',dateError:'Last renew date cannot be earlier than create date',nameReq:'Name Required',nameExist:'Name already exists',futureError:'Renew date cannot be in the future',serviceDisabled:'Service Disabled',serviceEnabled:'Service Enabled',execFinish: 'EXECUTION FINISHED!'},tags:'TAGS',tagPlaceholder:'Press Enter to create tag',searchPlaceholder:'Search...',tagsCol:'TAGS',tagAll:'ALL',useLunar:'Lunar Cycle',lunarTip:'Calculate based on Lunar calendar',yes:'Yes',no:'No',timezone:'Timezone',disabledFilter:'DISABLED',policyConfig:'Policy Config',policyNotify:'Notify Days',policyAuto:'Auto Renew',policyRenewDay:'Renew Days',useGlobal:'Global Default',autoRenewOnDesc:'Auto Renew when overdue',autoRenewOffDesc:'Auto Disable when overdue',previewCalc:'Based on Last Renew Date & Interval',nextDue:'NEXT DUE',
            fixedPrice:'PRICE',currency:'Currency',defaultCurrency:'Default Currency',history:'History',historyTitle:'Renewal History',totalCost:'Total Cost',totalCount:'Total Count',renewDate:'Op Date',billPeriod:'Bill Period',startDate:'Start Date',endDate:'End Date',actualPrice:'Actual Price',notePlaceholder:'Optional note...',btnAddHist:'Add Record',modify:'Edit',confirmDelHist:'Delete record?',opDate:'Op Date',amount:'Amount',period:'Period',spendingDashboard:'SPENDING DASHBOARD',monthlyBreakdown:'MONTHLY BREAKDOWN',total:'TOTAL',count:'COUNT',growth:'GROWTH',currMonth:'CURRENT',itemDetails:'ITEMS',noData:'NO DATA',predictedTag:'PREDICTED', lblPushTitle:'Push Title', pushTitle:'RenewHelper Report'}
        };
        const LUNAR={info:[0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],gan:'甲乙丙丁戊己庚辛壬癸'.split(''),zhi:'子丑寅卯辰巳午未申酉戌亥'.split(''),months:'正二三四五六七八九十冬腊'.split(''),days:'初一,初二,初三,初四,初五,初六,初七,初八,初九,初十,十一,十二,十三,十四,十五,十六,十七,十八,十九,二十,廿一,廿二,廿三,廿四,廿五,廿六,廿七,廿八,廿九,三十'.split(','),lYearDays(y){let s=348;for(let i=0x8000;i>0x8;i>>=1)s+=(this.info[y-1900]&i)?1:0;return s+this.leapDays(y)},leapDays(y){if(this.leapMonth(y))return(this.info[y-1900]&0x10000)?30:29;return 0},leapMonth(y){return this.info[y-1900]&0xf},monthDays(y,m){return(this.info[y-1900]&(0x10000>>m))?30:29},solar2lunar(y,m,d){if(y<1900||y>2100)return null;const base=new Date(1900,0,31),obj=new Date(y,m-1,d);let offset=Math.round((obj-base)/86400000);let ly=1900,temp=0;for(;ly<2101&&offset>0;ly++){temp=this.lYearDays(ly);offset-=temp}if(offset<0){offset+=temp;ly--}let lm=1,leap=this.leapMonth(ly),isLeap=false;for(;lm<13&&offset>0;lm++){if(leap>0&&lm===(leap+1)&&!isLeap){--lm;isLeap=true;temp=this.leapDays(ly)}else{temp=this.monthDays(ly,lm)}if(isLeap&&lm===(leap+1))isLeap=false;offset-=temp}if(offset===0&&leap>0&&lm===leap+1){if(isLeap)isLeap=false;else{isLeap=true;--lm}}if(offset<0){offset+=temp;--lm}const ld=offset+1,gIdx=(ly-4)%10,zIdx=(ly-4)%12;const yStr=this.gan[gIdx<0?gIdx+10:gIdx]+this.zhi[zIdx<0?zIdx+12:zIdx];const mStr=(isLeap?'闰':'')+this.months[lm-1]+'月';return{year:ly,month:lm,day:ld,isLeap,yearStr:yStr,monthStr:mStr,dayStr:this.days[ld-1],fullStr:yStr+'年'+mStr+this.days[ld-1]}}};
        

        // 本地时间解析函数，防止时区偏差
        const parseYMD = (s) => { 
            if(!s) return new Date(); 
            const p = s.split('-'); 
            return new Date(p[0], p[1]-1, p[2]); 
        };

        // Date calculation logic shared between validation and auto-fill
        const calculateCycleEndDate = (startDateStr, item) => {
            if (!startDateStr || !item || !item.intervalDays) return null;
            
            try {
                if (item.useLunar && typeof frontendCalc !== 'undefined' && frontendCalc.addPeriod) {
                    const p = startDateStr.split('-');
                    const y = parseInt(p[0]), m = parseInt(p[1]), d = parseInt(p[2]);
                    const l = LUNAR.solar2lunar(y, m, d);
                    if (l) {
                        const nl = frontendCalc.addPeriod({ year: l.year, month: l.month, day: l.day, isLeap: l.isLeap }, parseInt(item.intervalDays), item.cycleUnit || 'day');
                        const ns = frontendCalc.l2s(nl);
                        const nextDateUTC = new Date(Date.UTC(ns.year, ns.month - 1, ns.day));
                        return nextDateUTC.toISOString().split('T')[0];
                    }
                } else {
                    const start = new Date(startDateStr);
                    const unit = item.cycleUnit || 'day';
                    const interval = parseInt(item.intervalDays) || 1;
                    if (unit === 'year') start.setFullYear(start.getFullYear() + interval);
                    else if (unit === 'month') start.setMonth(start.getMonth() + interval);
                    else start.setDate(start.getDate() + interval);
                    const y = start.getFullYear();
                    const m = (start.getMonth() + 1).toString().padStart(2, '0');
                    const d = start.getDate().toString().padStart(2, '0');
                    return y + '-' + m + '-' + d;
                }
            } catch (e) {
                console.error('Cycle calculation error:', e);
            }
            return null;
        };

        const app = createApp({
            setup() {
                const isLoggedIn = ref(!!localStorage.getItem('jwt_token')), password = ref(''), loading = ref(false), list = ref([]), settings = ref({ upcomingBillsDays: 7 });
                const dataVersion = ref(0); // 新增版本号状态
                const dialogVisible = ref(false), settingsVisible = ref(false), historyVisible = ref(false), historyLoading = ref(false), historyLogs = ref([]);
                const checking = ref(false), logs = ref([]), displayLogs = ref([]), isEdit = ref(false), lang = ref('zh'), currentTag = ref(''), searchKeyword = ref('');
                const currentView = ref('project');
                const hoverIndex = ref(-1);
                const spendingMode = ref('op');
                const selectedYear = ref('recent'); // 'recent' = last 12 months, or year number like 2024
                const selectedMonth = ref(null); // selected month key like '2026-01' for detail view
                const locale = ref(ZhCn), tableKey = ref(0), termRef = ref(null), submitting = ref(false);
                const form = ref({ id:'', name:'', createDate:'', lastRenewDate:'', intervalDays:30, cycleUnit:'day', type:'cycle', message:'', enabled:true, tags:[], useLunar:false, notifyDays:3, notifyTime: '08:00', autoRenew:true, autoRenewDays:3, fixedPrice:0, currency:'CNY', renewHistory:[] });
                const settingsForm = ref({ 
                    notifyUrl:'', 
                    enableNotify:true, 
                    autoDisableDays:30, 
                    upcomingBillsDays: 7,
                    notifyTitle: '',
                    timezone:'UTC',
                    defaultCurrency:'CNY',
                    enabledChannels: [],
                    notifyConfig: { telegram: {}, bark: {}, pushplus: {}, notifyx: {}, resend: {}, webhook: {}, webhook2: {}, webhook3: {}, gotify: {}, ntfy: {} },
                    calendarToken: ''
                });
                const channelMap = reactive({ telegram:false, bark:false, pushplus:false, notifyx:false, resend:false, webhook:false, webhook2:false, webhook3:false, gotify:false, ntfy:false });
                const testing = reactive({ telegram:false, bark:false, pushplus:false, notifyx:false, resend:false, webhook:false, webhook2:false, webhook3:false, gotify:false, ntfy:false });
                const expandedChannels = ref('');

                // Settings Accordion State
                const settingsExpanded = reactive({ pref: false, notify: false, calendar: false, data: false });
                const toggleSettingsSection = (k) => { settingsExpanded[k] = !settingsExpanded[k]; };

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
                
                // Responsive Drawer
                const windowWidth = ref(window.innerWidth);
                const updateWidth = () => windowWidth.value = window.innerWidth;
                const drawerSize = computed(() => windowWidth.value < 640 ? '100%' : '600px'); // 640px matching tailwind sm
                const actionColWidth = computed(() => windowWidth.value < 640 ? 100 : 180);
                const paginationLayout = computed(() => windowWidth.value < 640 ? 'prev, pager, next, jumper' : 'total, sizes, prev, pager, next, jumper');
                // 2. 定义分页状态
                const currentPage = ref(1);
                const pageSize = ref(10); // 默认每页显示 10 条
                const sortState = ref({ prop: 'daysLeft', order: 'ascending' });
                const filterState = ref({});
                const handleSortChange = ({ prop, order }) => { sortState.value = { prop, order }; };
                const handleFilterChange = (filters) => { filterState.value = { ...filterState.value, ...filters }; };
                const nextDueFilters = computed(() => [
                    { text: t('filter.expired'), value: 'expired' },
                    { text: t('filter.w7').replace('%s', settings.value.upcomingBillsDays || 7), value: 'w7' },                    { text: t('filter.w30'), value: 'w30' },
                    { text: t('filter.thisMonth'), value: 'thisMonth' },
                    { text: t('filter.nextMonth'), value: 'nextMonth' },
                    { text: t('filter.halfYear'), value: 'halfYear' },
                    { text: t('filter.oneYear'), value: 'oneYear' }
                ]);
                const typeFilters = computed(() => [
                    { text: t('typeCycle'), value: 'cycle' },
                    { text: t('typeReset'), value: 'reset' }
                ]);
                const uptimeFilters = computed(() => [
                    { text: t('filter.new'), value: 'new' },
                    { text: t('filter.stable'), value: 'stable' },
                    { text: t('filter.long'), value: 'long' }
                ]);
                const lastRenewFilters = computed(() => [
                    { text: t('filter.m1'), value: 'm1' },
                    { text: t('filter.m6'), value: 'm6' },
                    { text: t('filter.year'), value: 'year' },
                    { text: t('filter.earlier'), value: 'earlier' }
                ]);
                const t = (k) => { let v=messages[lang.value]; k.split('.').forEach(p=>v=v?v[p]:k); return v||k; };
                
                const calculateTotal = (items) => {
                    let total = 0;
                    const defaultCur = settings.value.defaultCurrency || 'CNY';
                    const rates = exchangeRates.value || {};
                    items.forEach(item => {
                        const price = parseFloat(item.fixedPrice) || 0;
                        const cur = item.currency || defaultCur;
                        if (cur === defaultCur) {
                            total += price;
                        } else if (rates[cur]) {
                            total += price / rates[cur];
                        } else {
                            total += price; 
                        }
                    });
                    return total.toFixed(2);
                };

                const expiringItems = computed(() => list.value.filter(i => i.enabled && i.daysLeft>0 && i.daysLeft<=((typeof i.notifyDays==='number')?i.notifyDays:3)));
                const expiredItems = computed(() => list.value.filter(i => i.enabled && i.daysLeft<=0));
                
                const expiringCount = computed(() => expiringItems.value.length);
                const expiredCount = computed(() => expiredItems.value.length);
                
                const expiringTotal = computed(() => calculateTotal(expiringItems.value));
                const expiredTotal = computed(() => calculateTotal(expiredItems.value));
                const totalAmount = computed(() => calculateTotal(list.value));
                
// Spending Stats (Refactored: Fix Year Range & Project Details)
                const spendingStats = computed(() => {
                    const defaultCur = settings.value.defaultCurrency || 'CNY';
                    const now = new Date();
                    const currentMonthKey = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
                    const rates = exchangeRates.value || {};
                    const convert = (p, c) => (c !== defaultCur && rates[c]) ? p / rates[c] : p;
                    
                    // Define Ranges based on selectedYear
                    const monthKeys = [];
                    const sel = selectedYear.value;
                    if (sel === 'recent') {
                        for(let i=11; i>=0; i--) {
                            const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
                            monthKeys.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
                        }
                    } else {
                        const y = parseInt(sel);
                        for(let m=1; m<=12; m++) {
                            monthKeys.push(y + '-' + String(m).padStart(2, '0'));
                        }
                    }
                    
                    // 【修改 1】年度范围：仅保留今年、去年、前年 (去除明年)
                    const yearKeys = [now.getFullYear()-2, now.getFullYear()-1, now.getFullYear()];

                    // 【修改 2】增加 details 字段用于存储明细
                    const data = {
                        bill: { months: {}, years: {}, monthCounts: {}, details: {} },
                        op:   { months: {}, years: {}, monthCounts: {}, details: {} }
                    };
                    
                    // 辅助函数：添加明细
                    const addDetail = (mode, monthKey, item, price, dateStr, periodStr, isProjected = false) => {
                        if (!data[mode].details[monthKey]) data[mode].details[monthKey] = [];
                        data[mode].details[monthKey].push({
                            name: item.name,
                            amount: price.toFixed(2),
                            currency: defaultCur, // 已转换为默认币种
                            date: dateStr,
                            period: periodStr,
                            isProjected: isProjected,
                            tags: item.tags || []
                        });
                    };

                    list.value.forEach(item => {
                         const history = item.renewHistory || [];
                         const cur = item.currency || defaultCur;
                         const processedBillDates = new Set();
                         
                         // 1. History Records (Past Data)
                         history.forEach(r => {
                             let price = parseFloat(r.price || r.actualPrice || item.fixedPrice) || 0;
                             price = convert(price, r.currency || cur);
                             
                             // Bill Amount (Start Date based)
                             if(r.startDate) {
                                 processedBillDates.add(r.startDate);
                                 const p = r.startDate.split('-');
                                 const y = parseInt(p[0]), m = parseInt(p[1]);
                                 if(y && m) {
                                     const mk = y + '-' + String(m).padStart(2,'0');
                                     data.bill.months[mk] = (data.bill.months[mk]||0) + price;
                                     data.bill.monthCounts[mk] = (data.bill.monthCounts[mk]||0) + 1;
                                     data.bill.years[y] = (data.bill.years[y]||0) + price;
                                     // 记录明细
                                     addDetail('bill', mk, item, price, r.startDate, \`\${ r.startDate } -> \${ r.endDate || '?' } \`);
                                 }
                             }
                             // Operation Spending (Op Date based)
                             if(r.renewDate) {
                                 const p = r.renewDate.split('-'); 
                                 const y = parseInt(p[0]), m = parseInt(p[1]);
                                 if(y && m) {
                                     const mk = y + '-' + String(m).padStart(2,'0');
                                     data.op.months[mk] = (data.op.months[mk]||0) + price;
                                     data.op.monthCounts[mk] = (data.op.monthCounts[mk]||0) + 1;
                                     data.op.years[y] = (data.op.years[y]||0) + price;
                                     // 记录明细
                                     addDetail('op', mk, item, price, r.renewDate.split(' ')[0], \`\${ r.startDate || '?' } -> \${ r.endDate || '?' } \`);
                                 }
                             }
                         });

                         // 2. Legacy/Current Data (No history yet)
                         if(item.startDate || item.lastRenewDate) {
                             const dateStr = (item.startDate || item.lastRenewDate).substring(0, 10);
                             if (!processedBillDates.has(dateStr)) {
                                 processedBillDates.add(dateStr);
                                 let price = parseFloat(item.fixedPrice) || 0;
                                 price = convert(price, cur);
                                 const p = dateStr.split('-');
                                 const y = parseInt(p[0]), m = parseInt(p[1]);
                                 if(y && m) {
                                     const mk = y + '-' + String(m).padStart(2,'0');
                                     data.bill.months[mk] = (data.bill.months[mk]||0) + price;
                                     data.bill.monthCounts[mk] = (data.bill.monthCounts[mk]||0) + 1;
                                     data.bill.years[y] = (data.bill.years[y]||0) + price;
                                     // 估算结束日期用于显示
                                     let legacyEnd = '?'; 
                                     // 这里简单处理，因为没有 rigorous calculation context
                                     addDetail('bill', mk, item, price, dateStr, \`\${ dateStr } -> \${ legacyEnd } \`);
                                 }
                             }
                         }

                         // 3. Future Projection (Auto-Renew)
                         if(item.autoRenew && item.nextDueDate && item.enabled !== false) {
                             let price = parseFloat(item.fixedPrice) || 0;
                             price = convert(price, cur);
                             
                             let nextStart = parseYMD(item.nextDueDate);
                             const maxYear = Math.max(...yearKeys); // 只预测到统计图显示的年份
                             const unit = item.cycleUnit || 'day';
                             const val = parseInt(item.intervalDays) || 1;
                             
                             for(let i=0; i<12; i++) { 
                                 const y = nextStart.getFullYear();
                                 if(y > maxYear) break;

                                 const mm = nextStart.getMonth() + 1;
                                 const dd = nextStart.getDate();
                                 const dateStr = y + '-' + String(mm).padStart(2,'0') + '-' + String(dd).padStart(2,'0');

                                 // 计算该周期的结束日 (用于 UI 显示)
                                 const currentStartObj = new Date(nextStart);
                                 let currentEndObj = new Date(nextStart);
                                 if(unit === 'year') currentEndObj.setFullYear(currentEndObj.getFullYear() + val);
                                 else if(unit === 'month') currentEndObj.setMonth(currentEndObj.getMonth() + val);
                                 else currentEndObj.setDate(currentEndObj.getDate() + val);
                                 const endY = currentEndObj.getFullYear();
                                 const endM = currentEndObj.getMonth() + 1;
                                 const endD = currentEndObj.getDate();
                                 const endDateStr = endY + '-' + String(endM).padStart(2,'0') + '-' + String(endD).padStart(2,'0');

                                 if(!processedBillDates.has(dateStr)) {
                                     const mk = y + '-' + String(mm).padStart(2,'0');
                                     data.bill.months[mk] = (data.bill.months[mk]||0) + price;
                                     data.bill.monthCounts[mk] = (data.bill.monthCounts[mk]||0) + 1;
                                     data.bill.years[y] = (data.bill.years[y]||0) + price;
                                     processedBillDates.add(dateStr);
                                     
                                     // 【修改 3】将预测数据加入明细
                                     // 注意：预测只有在“账单金额”模式下才有效，操作支出模式下无法预测未来的操作时间
                                     addDetail('bill', mk, item, price, dateStr, \`\${ dateStr } -> \${ endDateStr } \`, true);
                                 }

                                 // 推进到下个周期
                                 nextStart = currentEndObj;
                             }
                         }
                    });

                    const processStats = (source) => {
                         const trends = monthKeys.map((key, idx) => {
                             const val = source.months[key] || 0;
                             const [y, m] = key.split('-').map(Number);
                             const prevD = new Date(y, m-2, 1);
                             const prevKey = prevD.getFullYear() + '-' + String(prevD.getMonth()+1).padStart(2,'0');
                             const prevVal = source.months[prevKey] || 0;
                             let growth = 0;
                             if(prevVal > 0) growth = ((val - prevVal)/prevVal)*100;
                             else if(val > 0) growth = 100;
                             return { month: key, total: val.toFixed(2), val: val, count: source.monthCounts[key] || 0, growth: growth.toFixed(1), isCurrent: key === currentMonthKey, prevVal: prevVal };
                         });
                         const maxM = Math.max(...trends.map(t=>t.val), 1);
                         trends.forEach(t => t.pct = Math.round((t.val/maxM)*100));
                         const sumVal = trends.reduce((acc, t) => acc + t.val, 0);
                         const avgVal = sumVal / trends.length;
                         const avgPct = Math.round((avgVal / maxM) * 100);
                         
                         // Annual Data
                         const annual = yearKeys.map(y => ({ year: y, total: (source.years[y]||0).toFixed(2), val: source.years[y]||0 }));
                         return { trends, annual, avgVal, avgPct, recentTotal: sumVal, details: source.details };
                    };

                    const recentMonthKeys = [];
                    for(let i=11; i>=0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
                        recentMonthKeys.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
                    }
                    const calcRecentTotal = (source) => recentMonthKeys.reduce((sum, mk) => sum + (source.months[mk] || 0), 0);

                    const billStats = processStats(data.bill);
                    const opStats = processStats(data.op);
                    
                    billStats.recentTotal = calcRecentTotal(data.bill);
                    opStats.recentTotal = calcRecentTotal(data.op);
                    
                    const billMaxWithRecent = Math.max(...billStats.annual.map(a => a.val), billStats.recentTotal, 1);
                    const opMaxWithRecent = Math.max(...opStats.annual.map(a => a.val), opStats.recentTotal, 1);
                    billStats.annual.forEach(a => a.pct = Math.round((a.val / billMaxWithRecent) * 100));
                    opStats.annual.forEach(a => a.pct = Math.round((a.val / opMaxWithRecent) * 100));
                    billStats.recentPct = Math.round((billStats.recentTotal / billMaxWithRecent) * 100);
                    opStats.recentPct = Math.round((opStats.recentTotal / opMaxWithRecent) * 100);

                    const getSelectedInfo = (stats) => {
                        if (sel === 'recent') return { label: '12M', total: stats.recentTotal.toFixed(2) };
                        const y = parseInt(sel);
                        const found = stats.annual.find(a => a.year === y);
                        return { label: String(y), total: found ? found.total : '0' };
                    };
                    billStats.selectedInfo = getSelectedInfo(billStats);
                    opStats.selectedInfo = getSelectedInfo(opStats);

                    return { bill: billStats, op: opStats, hasData: billStats.recentTotal > 0 || opStats.recentTotal > 0 || billStats.annual.some(a => a.val > 0) || opStats.annual.some(a => a.val > 0) };
                });

                // Month Details: 直接从 spendingStats 中获取预处理好的明细
                const monthDetails = computed(() => {
                    if (!selectedMonth.value || !spendingStats.value.hasData) return [];
                    const mode = spendingMode.value;
                    const details = spendingStats.value[mode].details[selectedMonth.value] || [];
                    // 按日期倒序排列
                    return details.sort((a, b) => b.date.localeCompare(a.date));
                });

                const disabledCount = computed(() => list.value.filter(i => !i.enabled).length);
                const upcomingBillsList = computed(() => {
                    const daysLimit = settings.value.upcomingBillsDays || 7;
                    const results = [];
                    const todayDate = parseYMD(getLocalToday()); // Use local today for diff calc

                    list.value.forEach(i => {
                        if (!i.enabled) return;

                        // 1. Current Next Due (Existing Logic)
                        if (i.daysLeft >= 0 && i.daysLeft <= daysLimit) {
                            results.push({
                                name: i.name,
                                days: i.daysLeft,
                                amount: i.fixedPrice,
                                currency: i.currency || settings.value.defaultCurrency,
                                isProjected: false
                            });
                        }

                        // 2. Future Projections (Auto-Renew)
                        if (i.autoRenew && i.intervalDays && i.nextDueDate) {
                            let currentBaseDate;
                            try { currentBaseDate = parseYMD(i.nextDueDate); } catch(e) { return; }
                            
                            const unit = i.cycleUnit || 'day';
                            const val = parseInt(i.intervalDays) || 1;

                            // Prevent infinite loop if interval is 0 (safety)
                            if (val <= 0) return;

                            let safetyCounter = 0;
                            while (true) {
                                // Safety Break to prevent infinite loop (e.g. if nextDate doesn't advance correctly)
                                if (safetyCounter++ > 366) break; // Max 365 days + 1 buffer
                                // Advance date
                                let nextDate;
                                if (i.useLunar && typeof LUNAR !== 'undefined' && typeof frontendCalc !== 'undefined') {
                                    const y = currentBaseDate.getFullYear(), m = currentBaseDate.getMonth() + 1, d = currentBaseDate.getDate();
                                    const l = LUNAR.solar2lunar(y, m, d);
                                    if (!l) break;
                                    const nextL = frontendCalc.addPeriod({ year: l.year, month: l.month, day: l.day, isLeap: l.isLeap }, val, unit);
                                    const nextS = frontendCalc.l2s(nextL);
                                    nextDate = new Date(nextS.year, nextS.month - 1, nextS.day);
                                } else {
                                    nextDate = new Date(currentBaseDate);
                                    if (unit === 'year') nextDate.setFullYear(nextDate.getFullYear() + val);
                                    else if (unit === 'month') nextDate.setMonth(nextDate.getMonth() + val);
                                    else nextDate.setDate(nextDate.getDate() + val);
                                }

                                // Update base for next iteration
                                currentBaseDate = nextDate;

                                // Calculate diff
                                const diffTime = nextDate - todayDate;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                if (diffDays > daysLimit) break;

                                // Only add valid future dates
                                if (diffDays >= 0) {
                                    results.push({
                                        name: i.name,
                                        days: diffDays,
                                        amount: i.fixedPrice,
                                        currency: i.currency || settings.value.defaultCurrency,
                                        isProjected: true
                                    });
                                }
                            }
                        }
                    });

                    return results.sort((a, b) => a.days - b.days);
                });
                const upcomingBillsTotal = computed(() => {
                    const rates = exchangeRates.value || {};
                    const defaultCur = settings.value.defaultCurrency || 'CNY';
                    let total = 0;
                    upcomingBillsList.value.forEach(bill => {
                        const price = parseFloat(bill.amount) || 0;
                        const cur = bill.currency || defaultCur;
                         if (cur === defaultCur) {
                            total += price;
                        } else if (rates[cur]) {
                            total += price / rates[cur];
                        } else {
                            total += price; // Fallback
                        }
                    });
                    return '≈ ' + total.toFixed(2) + ' ' + defaultCur;
                });
                const allTags = computed(() => { const s=new Set(); list.value.forEach(i=>(i.tags||[]).forEach(t=>s.add(t))); return Array.from(s).sort(); });
                const filteredList = computed(() => {
                    let r = list.value;
                    if (currentTag.value === 'DISABLED') r = r.filter(i => !i.enabled);
                    else if (currentTag.value) r = r.filter(i => (i.tags||[]).includes(currentTag.value));
                    if (searchKeyword.value) { const k=searchKeyword.value.toLowerCase(); r = r.filter(i => i.name.toLowerCase().includes(k) || (i.message||'').toLowerCase().includes(k)); }

                    if (filterState.value.daysLeft && filterState.value.daysLeft.length > 0) {
                        const fv = filterState.value.daysLeft;
                        const w7Days = settings.value.upcomingBillsDays || 7;
                            r = r.filter(row => {
                                const d = row.daysLeft;
                                const nd = row.nextDueDate || '';
                                const today = new Date();
                                const curY = today.getFullYear();
                                const curM = today.getMonth() + 1;
                                
                                return fv.some(v => {
                                    if (v === 'expired') return d <= 0;
                                    if (v === 'w7') return d > 0 && d <= w7Days;
                                    if (v === 'w30') return d > 0 && d <= 30;
                                    if (v === 'thisMonth') {
                                        if (!nd) return false;
                                        const [y, m] = nd.split('-').map(Number);
                                        return y === curY && m === curM;
                                    }
                                    if (v === 'nextMonth') {
                                        if (!nd) return false;
                                        let ty = curY, tm = curM + 1;
                                        if (tm > 12) { tm = 1; ty++; }
                                        const [y, m] = nd.split('-').map(Number);
                                        return y === ty && m === tm;
                                    }
                                    if (v === 'halfYear') return d > 0 && d <= 183;
                                    if (v === 'oneYear') return d > 0 && d <= 366;
                                    return false;
                                });
                            });
                        }

                    if (filterState.value.type && filterState.value.type.length > 0) {
                        const fv = filterState.value.type;
                        r = r.filter(row => fv.includes(row.type));
                    }

                    if (filterState.value.serviceDays && filterState.value.serviceDays.length > 0) {
                        const fv = filterState.value.serviceDays;
                        r = r.filter(row => {
                            const d = row.serviceDays;
                            return fv.some(v => {
                                if (v === 'new') return d < 30;
                                if (v === 'stable') return d >= 30 && d <= 365;
                                if (v === 'long') return d > 365;
                                return false;
                            });
                        });
                    }

                    if (filterState.value.lastRenewDate && filterState.value.lastRenewDate.length > 0) {
                        const fv = filterState.value.lastRenewDate;
                        const now = new Date();
                        const todayStr = getLocalToday();
                        r = r.filter(row => {
                            const rd = new Date(row.lastRenewDate);
                            const diffDays = (now - rd) / (1000 * 3600 * 24);
                            return fv.some(v => {
                                if (v === 'm1') return diffDays <= 30;
                                if (v === 'm6') return diffDays <= 180;
                                if (v === 'year') return rd.getFullYear() === now.getFullYear();
                                if (v === 'earlier') return diffDays > 180;
                                return false;
                            });
                        });
                    }

                    if (sortState.value.prop && sortState.value.order) {
                        const { prop, order } = sortState.value;
                        const k = order === 'ascending' ? 1 : -1;
                        r = [...r].sort((a,b) => {
                            if (a[prop] > b[prop]) return k;
                            if (a[prop] < b[prop]) return -k;
                            return 0;
                        });
                    }

                    return r;
                });

                onMounted(() => {
                    // Check if migration is needed (Once per day)
                    const checkMigrationNeeded = async () => {
                        const lastCheck = localStorage.getItem('lastMigrationCheck');
                        const today = new Date().toDateString();
                        
                        if (lastCheck === today) return; // Already checked today
                        
                        // Wait for list to load (simple poll since list is loaded async in login or initial load)
                        // Actually list is empty until login. Assuming user is logged in or will log in.
                        // We can hook into the login success or list load.
                        // But onMounted runs once. 
                        // Let's rely on list watcher or check after a delay if logged in.
                        // However, simpler approach: Check when list is populated.
                    };
                    
                    // Theme init
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
                    
                    // After initial fetchList (if token exists), check for migration
                    // Using a watcher on list.value to ensure it's populated
                    const unwatchList = watch(list, (newList) => {
                        if (newList && newList.length > 0) {
                            const info = newList.filter(item => (!item.renewHistory || item.renewHistory.length === 0) && item.lastRenewDate && item.intervalDays);
                            if (info.length > 0) {
                                const lastCheck = localStorage.getItem('lastMigrationCheck');
                                const today = new Date().toDateString();
                                if (lastCheck !== today) {
                                    localStorage.setItem('lastMigrationCheck', today);
                                    ElMessageBox.confirm(
                                        lang.value === 'zh' 
                                            ? '检测到 ' + info.length + ' 个项目缺少历史账单。建议先备份数据再执行迁移，是否继续？(今日仅提示一次)' 
                                            : 'Found ' + info.length + ' items without history. Recommend backup first. Continue? (Ask once today)',
                                        lang.value === 'zh' ? '数据优化建议' : 'Optimization Suggestion',
                                        { confirmButtonText: lang.value === 'zh' ? '备份并迁移' : 'Backup & Migrate', cancelButtonText: t('cancel'), type: 'info' }
                                    ).then(async () => {
                                        await exportData();
                                        setTimeout(() => {
                                            ElMessageBox.confirm(
                                                lang.value === 'zh' ? '备份文件是否已保存？确认后将开始迁移。' : 'Is the backup saved? Migration will start upon confirmation.',
                                                lang.value === 'zh' ? '最后确认' : 'Final Confirmation',
                                                { confirmButtonText: lang.value === 'zh' ? '确认迁移' : 'Start Migration', cancelButtonText: t('cancel'), type: 'warning' }
                                            ).then(() => {
                                                migrateOldData(true);
                                            }).catch(()=>{});
                                        }, 1000);
                                    }).catch(()=>{});
                            }
                        }
                            fetchExchangeRates(settings.value.defaultCurrency || 'CNY'); // Ensure rates are available for summary
                            unwatchList(); // Stop watching after the first check
                        }
                    });

                    window.addEventListener('resize', updateWidth);
                });

                onUnmounted(() => {
                    window.removeEventListener('resize', updateWidth);
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
                    loading.value = true;
                    try {
                        const r = await fetch('/api/list', { headers: tk ? { 'Authorization': 'Bearer ' + tk } : getAuth() });
                        
                        // 1. 处理 401 认证失败
                        if (r.status === 401) throw new Error(t('msg.loginFail'));
                        
                        const d = await r.json();

                        // 2. 【核心修复】检查 d.data 是否存在
                        // 如果后端报错(500/429等)，d.data 是 undefined，直接读取 items 会报错
                        if (!d.data) {
                            throw new Error(d.msg || 'Server Error / Load Failed');
                        }

                        list.value = d.data.items;
                        settings.value = d.data.settings || {};
                        if (!settings.value.upcomingBillsDays) settings.value.upcomingBillsDays = 7;
                        dataVersion.value = d.data.version || 0;

                        if (settings.value.language) setLang(settings.value.language);
                        isLoggedIn.value = true;
                    } catch (e) {
                        ElMessage.error(e.message);
                        if (e.message === t('msg.loginFail')) logout();
                    } finally {
                        loading.value = false;
                    }
                };

                const saveData = async (items, set, msg=true) => {
                    loading.value=true; try {
                        // 【新增】Payload 中加入 version
                        const payload={ 
                            items:items||list.value, 
                            settings:set||settings.value,
                            version: dataVersion.value 
                        }; 
                        payload.settings.language=lang.value;

                        const res = await fetch('/api/save',{method:'POST',headers:{...getAuth(),'Content-Type':'application/json'},body:JSON.stringify(payload)});

                        // 【新增】处理冲突 (409)
                        if (res.status === 409) {
                            // 弹出对话框，强制用户刷新
                            await ElMessageBox.alert(
                                lang.value === 'zh' ? '数据版本冲突！后台系统（或自动续期）已修改了数据。请刷新页面后重试。' : 'Data Conflict! Data has been modified by system or another session. Please refresh.',
                                'Sync Error',
                                { confirmButtonText: 'OK', type: 'error' }
                            );
                            await fetchList(); // 自动刷新
                            return; // 中止后续流程
                        }

                        if (!res.ok) throw new Error('Save Failed');

                        const d = await res.json();
                        // 【新增】保存成功后更新本地版本号，避免连续保存报错
                        if (d.version) dataVersion.value = d.version;

                        if(msg) ElMessage.success(t('msg.saved')); 
                        // 成功后通常不需要重新 fetchList，因为本地已经是新的，除非为了通过 fetchList 更新计算属性
                        await fetchList(); 

                    } catch(e) { 
                        if (e !== 'cancel') ElMessage.error(t('msg.saveFail')); 
                    } finally { loading.value=false; }
                };

                const getLocalToday = () => { try { const tz = settings.value.timezone || 'UTC'; return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch(e) { return new Date().toISOString().split('T')[0]; } };

                const saveItem = async () => {
                    if(!form.value.name.trim()) return ElMessage.error(t('msg.nameReq'));
                    if(list.value.some(i=>i.name.toLowerCase()===form.value.name.toLowerCase() && i.id!==form.value.id)) return ElMessage.error(t('msg.nameExist'));
                    if(form.value.lastRenewDate < form.value.createDate) return ElMessage.error(t('msg.dateError'));
                    if(form.value.lastRenewDate > getLocalToday()) return ElMessage.error(t('msg.futureError'));
                    
// 新建时自动创建初始账单记录
                    if (!isEdit.value && form.value.lastRenewDate && form.value.intervalDays) {
                        const startDate = form.value.lastRenewDate;
                        let endDate = startDate;
                        
                        // 计算 endDate = startDate + intervalDays (往后推算)
                        if (form.value.useLunar && typeof LUNAR !== 'undefined' && typeof frontendCalc !== 'undefined') {
                            // 【修复】农历逻辑：先转为农历对象 -> 计算 -> 转回公历
                            const d = parseYMD(startDate); // 字符串转 Date
                            const l = LUNAR.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
                            
                            if (l) {
                                const nextL = frontendCalc.addPeriod(l, Number(form.value.intervalDays), form.value.cycleUnit || 'day');
                                const nextS = frontendCalc.l2s(nextL);
                                endDate = \`\${nextS.year}-\${nextS.month.toString().padStart(2, '0')}-\${nextS.day.toString().padStart(2, '0')}\`;
                            }
                        } else {
                            // 公历：普通日期计算
                            const start = new Date(startDate);
                            const unit = form.value.cycleUnit || 'day';
                            const interval = Number(form.value.intervalDays) || 1;
                            if (unit === 'year') start.setFullYear(start.getFullYear() + interval);
                            else if (unit === 'month') start.setMonth(start.getMonth() + interval);
                            else start.setDate(start.getDate() + interval);
                            const y = start.getFullYear();
                            const m = (start.getMonth() + 1).toString().padStart(2, '0');
                            const d = start.getDate().toString().padStart(2, '0');
                            endDate = y + '-' + m + '-' + d;
                        }
                        
                        // 使用 startDate(即 lastRenewDate) 的 0点作为操作时间
                        const renewDate = startDate + ' 00:00:00';
                        
                        form.value.renewHistory = [{
                            renewDate: renewDate,
                            startDate: startDate,
                            endDate: endDate,
                            price: form.value.fixedPrice || 0,
                            currency: form.value.currency || settings.value.defaultCurrency || 'CNY',
                            note: lang.value === 'zh' ? '自动初始账单' : 'Auto Initial'
                        }];
                    }
                    
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
                const confirmDelete = (row) => {
                     ElMessageBox.confirm(
                        t('msg.confirmDel'),
                        t('tipDelete'),
                        { confirmButtonText: t('yes'), cancelButtonText: t('no'), type: 'warning' }
                    ).then(() => {
                        deleteItem(row);
                    }).catch(() => {});
                };
                const confirmRenew = (row) => {
                    ElMessageBox.confirm(
                        t('msg.confirmRenew').replace('%s', row.name),
                        t('manualRenew'),
                        { confirmButtonText: t('yes'), cancelButtonText: t('no'), type: 'warning' }
                    ).then(() => {
                        manualRenew(row);
                    }).catch(() => {});
                };
                
                const logVisible = ref(false);
                const runCheck = async () => { 
                    checking.value = true; 
                    logVisible.value = true; 
                    displayLogs.value = []; 
                    try {
                        const r = await fetch('/api/check', { method: 'POST', headers: getAuth(), body: JSON.stringify({ lang: lang.value }) });
                        const d = await r.json(); 
                        
                        // 1. 循环显示日志动画
                        for (const line of d.logs) {
                            displayLogs.value.push(line);
                            await new Promise(res => setTimeout(res, 30)); 
                            if (termRef.value) termRef.value.scrollTop = termRef.value.scrollHeight;
                        }
                        await new Promise(res => setTimeout(res, 200)); 
                        displayLogs.value.push(\`[SYSTEM] \${t('msg.execFinish')}\`);
                        if (termRef.value) termRef.value.scrollTop = termRef.value.scrollHeight;

                        // ================== 【这里是修改点】 ==================
                        // 原来的代码是：if (d.data) { list.value = d.data; tableKey.value++; }
                        // 现在的代码（请使用下面这一行）：
                        await fetchList(); 
                        // ====================================================

                    } catch(e) { 
                        displayLogs.value.push("ERR: " + e.message); 
                    } finally { 
                        checking.value = false; 
                    } 
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

                const openAdd = () => { isEdit.value=false; const d=getLocalToday(); form.value={id:Date.now().toString(),name:'',createDate:d,lastRenewDate:d,intervalDays:30,cycleUnit:'day',type:'cycle',enabled:true,tags:[],useLunar:false, notifyDays:3, notifyTime: '08:00', autoRenew:true, autoRenewDays:3, fixedPrice:0, currency:settings.value.defaultCurrency||'CNY', renewHistory:[]}; dialogVisible.value=true; };
                const editItem = (row) => { isEdit.value=true; form.value={...row,cycleUnit:row.cycleUnit||'day',tags:[...(row.tags||[])],useLunar:!!row.useLunar, notifyDays:(row.notifyDays!==undefined?row.notifyDays:3), notifyTime: (row.notifyTime || '08:00'), autoRenew:row.autoRenew!==false, autoRenewDays:(row.autoRenewDays!==undefined?row.autoRenewDays:3)}; dialogVisible.value=true; };
                const openSettings = () => { 
                    settingsForm.value = JSON.parse(JSON.stringify(settings.value)); 
                    if (!settingsForm.value.upcomingBillsDays) settingsForm.value.upcomingBillsDays = 7;
                    const chans = settingsForm.value.enabledChannels || [];
                    Object.keys(channelMap).forEach(k => channelMap[k] = chans.includes(k));
                    settingsVisible.value=true; 
                };
                const saveSettings = async () => { 
                    settingsForm.value.enabledChannels = Object.keys(channelMap).filter(k => channelMap[k]);
                    const oldCurrency = settings.value.defaultCurrency;
                    settings.value={...settingsForm.value}; 
                    await saveData(null,settings.value); 
                    settingsVisible.value=false; 
                    
                    if (settings.value.defaultCurrency !== oldCurrency) {
                        fetchExchangeRates(settings.value.defaultCurrency);
                    }
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

                // 迁移旧数据：为没有续费记录的项目生成初始账单
                const migrateOldData = async (skipConfirm = false) => {
                    try {
                        if (!skipConfirm) {
                            await ElMessageBox.confirm(
                                lang.value === 'zh' 
                                    ? '此操作将为所有没有续费记录的项目生成初始账单，是否继续？' 
                                    : 'This will generate initial bills for all items without history. Continue?',
                                lang.value === 'zh' ? '数据迁移' : 'Data Migration',
                                { type: 'info', confirmButtonText: t('yes'), cancelButtonText: t('no') }
                            );
                        }
                        
                        let count = 0;
                        const now = new Date();
                        const renewDate = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0') + ' ' + now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
                        
                        list.value.forEach(item => {
                            if ((!item.renewHistory || item.renewHistory.length === 0) && item.lastRenewDate && item.intervalDays) {
                                const startDate = item.lastRenewDate;
                                let endDate = startDate;
                                
                                // 计算 endDate = startDate + interval（支持农历和公历）
                                if (item.useLunar && typeof LUNAR !== 'undefined' && typeof frontendCalc !== 'undefined') {
                                    // 【修复】农历逻辑：先转为农历对象 -> 计算 -> 转回公历
                                    const d = parseYMD(startDate);
                                    const l = LUNAR.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
                                    
                                    if (l) {
                                        const nextL = frontendCalc.addPeriod(l, Number(item.intervalDays), item.cycleUnit || 'day');
                                        const nextS = frontendCalc.l2s(nextL);
                                        endDate = \`\${nextS.year}-\${nextS.month.toString().padStart(2, '0')}-\${nextS.day.toString().padStart(2, '0')}\`;
                                    }
                                } else {
                                    // 公历：普通日期计算
                                    const start = new Date(startDate);
                                    const unit = item.cycleUnit || 'day';
                                    const interval = Number(item.intervalDays) || 1;
                                    if (unit === 'year') start.setFullYear(start.getFullYear() + interval);
                                    else if (unit === 'month') start.setMonth(start.getMonth() + interval);
                                    else start.setDate(start.getDate() + interval);
                                    const y = start.getFullYear();
                                    const m = (start.getMonth() + 1).toString().padStart(2, '0');
                                    const d = start.getDate().toString().padStart(2, '0');
                                    endDate = y + '-' + m + '-' + d;
                                }
                                
                                item.renewHistory = [{
                                    renewDate: startDate + ' 00:00:00',
                                    startDate: startDate,
                                    endDate: endDate,
                                    price: item.fixedPrice || 0,
                                    currency: item.currency || settings.value.defaultCurrency || 'CNY',
                                    note: lang.value === 'zh' ? '自动初始账单' : 'Auto Initial'
                                }];
                                count++;
                            }
                        });
                        
                        if (count > 0) {
                            await saveData(null, null, false);
                            tableKey.value++;
                            ElMessage.success(lang.value === 'zh' ? '已为 ' + count + ' 个项目生成初始账单' : 'Generated initial bills for ' + count + ' items');
                        } else {
                            ElMessage.info(lang.value === 'zh' ? '没有需要迁移的项目' : 'No items need migration');
                        }
                    } catch {}
                };

                const clearLogs = async () => { await fetch('/api/logs/clear',{method:'POST',headers:getAuth()}); historyLogs.value=[]; ElMessage.success(t('msg.cleared')); };
                const openHistoryLogs = async () => { historyVisible.value=true; historyLoading.value=true; try { historyLogs.value=(await(await fetch('/api/logs',{headers:getAuth()})).json()).data; } finally { historyLoading.value=false; } };

                const getDaysClass = (d) => d<=0?'text-red-500 font-black':(d<=7?'text-amber-500 font-bold':'text-blue-600 font-bold');
                const formatDaysLeft = (d) => d===0?(lang.value==='zh'?'今天':'TODAY'):(d<0?(lang.value==='zh'?'过期 ':'OVERDUE ')+Math.abs(d)+(lang.value==='zh'?' 天':'DAYS'):d+(lang.value==='zh'?' 天':' DAYS'));
                const getTagClass = (t) => ({alert:'border-red-200 text-red-600 bg-red-50',renew:'border-amber-200 text-amber-600 bg-amber-50',disable:'border-gray-200 text-gray-500 bg-gray-50',normal:'border-blue-200 text-blue-600 bg-blue-50'}[t]||'border-blue-200 text-blue-600 bg-blue-50');
                const getLogColor = (a) => (a&&a.includes('alert')?'danger':(a&&a.includes('renew')?'warning':(a&&a.includes('disable')?'info':'success')));
                const tableRowClassName = ({row}) => row.enabled===false?'disabled-row':'';

                const getLunarStr = (s) => { const d=parseYMD(s); const l=LUNAR.solar2lunar(d.getFullYear(),d.getMonth()+1,d.getDate()); return l ? ('农历: ' + l.fullStr) : ''; };



                const getLunarTooltip = (c) => { 
                    if(!c || !c.date) return ''; 
                    const l=LUNAR.solar2lunar(c.date.getFullYear(),c.date.getMonth()+1,c.date.getDate()); 
                    return l ? l.fullStr : ''; 
                };

                const getSmartLunarText = (c) => { 
                    if(!c || !c.date) return ''; 
                    const l=LUNAR.solar2lunar(c.date.getFullYear(),c.date.getMonth()+1,c.date.getDate()); 
                    return l ? (l.day===1 ? l.monthStr : l.dayStr) : ''; 
                };
                const getYearGanZhi = (t) => { const y=parseInt(t); if(isNaN(y))return ''; const g=(y-4)%10,z=(y-4)%12; return '甲乙丙丁戊己庚辛壬癸'.split('')[g<0?g+10:g]+'子丑寅卯辰巳午未申酉戌亥'.split('')[z<0?z+12:z]+'年'; };
                const getMonthStr = (t) => { const m=Number(t); return lang.value==='zh'?(m+1)+'月':['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]; };
                const getTagCount = (t) => list.value.filter(i=>(i.tags||[]).includes(t)).length;

                const manualRenew = async (row) => {
                    const todayStr = getLocalToday();
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
                const currencyList = ['CNY', 'USD', 'EUR', 'GBP', 'HKD', 'JPY', 'SGD', 'MYR', 'KRW'];

                // --- Bill Management Logic ---
                const renewDialogVisible = ref(false);
                const renewMode = ref('renew'); // 'renew' | 'addHistory'
                const renewForm = ref({ id:'', name:'', renewDate:'', startDate:'', endDate:'', price:0, currency:'', note:'' });
                const historyDialogVisible = ref(false);
                const currentHistoryItem = ref({ renewHistory: [] });
                const editingHistoryIndex = ref(-1);
                const tempHistoryItem = ref({});
                const historyPage = ref(1);
                const historyPageSize = ref(5);
// --- History Edit Logic ---



                // 覆盖原有的 saveHistoryInfo (现在不需要手动点底部的保存了，改为行内保存，或者你可以保留它作为批量保存)
                // 这里我们修改原有的 saveHistoryInfo 为关闭弹窗，因为现在是行内即时保存
                const saveHistoryInfo = async () => {
                   const realRow = list.value.find(i => i.id === currentHistoryItem.value.id);
                   if (realRow) {
                       realRow.renewHistory = currentHistoryItem.value.renewHistory;
                       await saveData(null, null, true);
                   }
                   historyDialogVisible.value = false;
                };
                
                // 监听弹窗关闭，重置编辑状态
                watch(historyDialogVisible, (val) => {
                    if (!val) cancelEditHistory();
                });                // --- Currency Exchange Rates ---
                const exchangeRates = ref({});
                const ratesLoading = ref(false);

                const fetchExchangeRates = async (baseCurrency) => {
                    if (!baseCurrency) baseCurrency = 'CNY';
                    const cacheKey = 'renew_ex_rates_' + baseCurrency;
                    try {
                        const cached = localStorage.getItem(cacheKey);
                        if (cached) {
                            const p = JSON.parse(cached);
                            if (Date.now() - p.ts < 86400000) { // 24 hours cache
                                exchangeRates.value = p.data;
                                return;
                            }
                        }
                    } catch(e){}

                    ratesLoading.value = true;
                    try {
                        const res = await fetch('/api/rates?base='+baseCurrency, { headers: getAuth() });
                        if (res.ok) {
                            const data = await res.json();
                            const rates = { ...data.rates, [baseCurrency]: 1 };
                            exchangeRates.value = rates;
                            localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: rates }));
                        }
                    } catch (e) { console.error('Failed to fetch exchange rates:', e); }
                    ratesLoading.value = false;
                };

                // Compute current item info for Renew Dialog display
                const currentRenewItem = computed(() => {
                    if (!renewForm.value.id) return {};
                    return list.value.find(i => i.id === renewForm.value.id) || {};
                });

                const openRenew = (row) => {
                    // Helper: 格式化日期 (YYYY-MM-DD)
                    const formatDate = (d) => \`\${d.getFullYear()}-\${(d.getMonth() + 1).toString().padStart(2, '0')}-\${d.getDate().toString().padStart(2, '0')}\`;
                    // Helper: 格式化日期时间 (YYYY-MM-DD HH:mm:ss)
                    const formatDateTime = (d) => \`\${formatDate(d)} \${d.getHours().toString().padStart(2, '0')}:\${d.getMinutes().toString().padStart(2, '0')}:\${d.getSeconds().toString().padStart(2, '0')}\`;

                    const now = new Date();
                    const opDateStr = formatDateTime(now); // 操作日期：始终为当前时间
                    const todayStr = getLocalToday();      // 今天日期：YYYY-MM-DD

                    // ============================================================
                    // 1. 确定账单周期起始日 (Start Date Logic)
                    // ============================================================
                    let start = todayStr; // 默认值

                    if (row.type === 'reset') {
                        // 【Reset 模式】：起始日 = 操作日当天
                        // 逻辑：不管之前什么时候到期，买了就是从今天开始算
                        start = todayStr;
                    } else {
                        // 【Cycle 模式】：起始日 = 上次历史的结束日 (接续)
                        // 逻辑：保持订阅的连续性
                        const hist = row.renewHistory || [];
                        if (hist.length > 0) {
                            // 有历史记录：取最近一条历史的 EndDate
                            const sorted = [...hist].sort((a, b) => (a.endDate < b.endDate ? 1 : -1));
                            if (sorted[0].endDate) {
                                start = sorted[0].endDate.substring(0, 10); // 截取 YYYY-MM-DD
                            }
                        } else if (row.lastRenewDate) {
                            // 无历史记录：兜底使用 LastRenewDate
                            start = row.lastRenewDate.substring(0, 10);
                        }
                    }

                    // ============================================================
                    // 2. 计算账单周期结束日 (End Date = Start + Interval)
                    // ============================================================
                    let end = start;
                    if (row.intervalDays && start) {
                        const sDate = parseYMD(start);
                        
                        // 农历计算逻辑
                        if (row.useLunar) {
                            const l = LUNAR.solar2lunar(sDate.getFullYear(), sDate.getMonth() + 1, sDate.getDate());
                            if (l) {
                                const nextL = frontendCalc.addPeriod({ year: l.year, month: l.month, day: l.day, isLeap: l.isLeap }, row.intervalDays, row.cycleUnit || 'day');
                                const nextS = frontendCalc.l2s(nextL);
                                end = \`\${nextS.year}-\${nextS.month.toString().padStart(2, '0')}-\${nextS.day.toString().padStart(2, '0')}\`;
                            }
                        } 
                        // 公历计算逻辑
                        else {
                            const d = new Date(sDate);
                            const u = row.cycleUnit || 'day';
                            const n = row.intervalDays;
                            if (u === 'year') d.setFullYear(d.getFullYear() + n);
                            else if (u === 'month') d.setMonth(d.getMonth() + n);
                            else d.setDate(d.getDate() + n);
                            end = formatDate(d);
                        }
                    }

                    // ============================================================
                    // 3. 填充表单
                    // ============================================================
                    renewForm.value = {
                        id: row.id,
                        name: row.name,
                        renewDate: opDateStr, // 操作时间
                        startDate: start,     // 周期开始
                        endDate: end,         // 周期结束
                        price: row.fixedPrice || 0,
                        currency: row.currency || settings.value.defaultCurrency || 'CNY',
                        note: ''
                    };
                    renewMode.value = 'renew';
                    renewDialogVisible.value = true;
                };

                const submitRenew = async () => {
                    if (submitting.value) return;
                    
                    const rf = renewForm.value;
                    
                    // 构建历史记录对象
                    const historyRecord = {
                        renewDate: rf.renewDate,
                        startDate: rf.startDate,
                        endDate: rf.endDate,
                        price: rf.price,
                        currency: rf.currency,
                        note: rf.note
                    };
                    
                    submitting.value = true;
                    // 【优化】立即关闭弹窗，提升响应速度并防止重复点击
                    renewDialogVisible.value = false;
                    
                    try {
                        // 1. 验证日期与周期是否匹配 (Common Validation) - 适用于 renew 和 addHistory
                        let item = null;
                        if (renewMode.value === 'addHistory') {
                            item = currentHistoryItem.value;
                        } else {
                            item = list.value.find(i => i.id === rf.id);
                        }

                        if (item && item.intervalDays) {
                            const expectedEnd = calculateCycleEndDate(rf.startDate, item);
                            if (expectedEnd && expectedEnd !== rf.endDate) {
                                try {
                                    await ElMessageBox.confirm(
                                        lang.value === 'zh' ? '当前结束日期与周期设置不符，是否确认保存？' : 'End date does not match the cycle settings. Save anyway?',
                                        lang.value === 'zh' ? '周期不匹配' : 'Cycle Mismatch',
                                        { confirmButtonText: t('yes'), cancelButtonText: t('cancel'), type: 'warning' }
                                    );
                                } catch (e) {
                                    renewDialogVisible.value = true;
                                    submitting.value = false;
                                    return;
                                }
                            }
                        }

                        // ===== addHistory 模式：补录历史 =====
                        if (renewMode.value === 'addHistory') {

                            // 验证周期重叠
                            const overlapResult = checkPeriodOverlap(rf.startDate, rf.endDate);
                            if (overlapResult.overlap) {
                                // 验证失败，重新打开弹窗（虽然闪烁但为了安全）
                                renewDialogVisible.value = true;
                                submitting.value = false;
                                const existRecord = overlapResult.record;
                                ElMessage.warning(lang.value === 'zh' 
                                    ? '账单周期与已有记录重叠 (' + existRecord.startDate + ' ~ ' + existRecord.endDate + ')，请修改已有记录而非添加新记录'
                                    : 'Period overlaps with existing record (' + existRecord.startDate + ' ~ ' + existRecord.endDate + '). Please edit the existing record instead.'
                                );
                                return;
                            }
                            
                            // 添加记录后按 endDate 降序排序（最新的在前）
                            const history = currentHistoryItem.value.renewHistory;
                            history.push(historyRecord);
                            history.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
                            
                            // 同步到主列表并保存
                            const realRow = list.value.find(i => i.id === currentHistoryItem.value.id);
                            if (realRow) {
                                realRow.renewHistory = currentHistoryItem.value.renewHistory;
                                await saveData(null, null, true);
                            }
                            
                            historyPage.value = 1;
                            return;
                        }
                        
                        // ===== renew 模式：手动续期 =====
                        const row = list.value.find(i => i.id === rf.id);
                        if (!row) return;
                        
                        if (!Array.isArray(row.renewHistory)) row.renewHistory = [];
                        row.renewHistory.unshift(historyRecord);

                        // 更新主记录的 lastRenewDate
                        const oldDate = row.lastRenewDate;
                        row.lastRenewDate = rf.renewDate.substring(0, 10);
                        
                        // 乐观更新 UI
                        tableKey.value++;
                        ElMessage.success(t('msg.renewSuccess').replace('%s', oldDate).replace('%t', row.lastRenewDate));

                        // 异步保存
                        await saveData(null, null, false);
                    } catch(e) {
                         console.error(e);
                         renewDialogVisible.value = true; // 发生错误重新打开以便重试
                         ElMessage.error(e.message||'Error');
                    } finally {
                        submitting.value = false;
                    }
                };

                const openHistory = (row) => {
                    // Deep copy to avoid direct mutation until saved
                    currentHistoryItem.value = JSON.parse(JSON.stringify(row));
                    if (!Array.isArray(currentHistoryItem.value.renewHistory)) currentHistoryItem.value.renewHistory = [];
                    historyPage.value = 1;
                    historyDialogVisible.value = true;
                    editingHistoryIndex.value = -1;
                    // Fetch exchange rates for currency conversion
                    fetchExchangeRates(settings.value.defaultCurrency || 'CNY');
                };

                const startEditHistory = (index, item) => {
                    editingHistoryIndex.value = index;
                    tempHistoryItem.value = JSON.parse(JSON.stringify(item));
                };

                const cancelEditHistory = () => {
                    editingHistoryIndex.value = -1;
                    tempHistoryItem.value = {};
                };

                const saveEditHistory = (index) => {
                    // Update the array item
                    const realIndex = (historyPage.value - 1) * historyPageSize.value + index;
                    
                    // Logic to update the actual item in renewHistory
                    if (realIndex >= 0 && realIndex < currentHistoryItem.value.renewHistory.length) {
                         const updated = { ...currentHistoryItem.value.renewHistory[realIndex], ...tempHistoryItem.value };
                         // Ensure strings are saved (inputs bind to strings mostly)
                         currentHistoryItem.value.renewHistory[realIndex] = updated;
                    }
                    
                    editingHistoryIndex.value = -1;
                    saveHistoryInfo(); // Auto save to persist
                };

                const pagedHistory = computed(() => {
                    const hist = currentHistoryItem.value.renewHistory || [];
                    const start = (historyPage.value - 1) * historyPageSize.value;
                    return hist.slice(start, start + historyPageSize.value);
                });

                // --- Add History Dialog State ---
                const addHistoryDialogVisible = ref(false);
                const addHistoryForm = ref({ renewDate: '', startDate: '', endDate: '', price: 0, currency: 'CNY', note: '' });

                // Check for period overlap
                const checkPeriodOverlap = (startDate, endDate, excludeIndex = -1) => {
                    if (!startDate || !endDate) return { overlap: false };
                    const newStart = new Date(startDate);
                    const newEnd = new Date(endDate);
                    const history = currentHistoryItem.value.renewHistory || [];
                    
                    for (let i = 0; i < history.length; i++) {
                        if (i === excludeIndex) continue;
                        if (!history[i].startDate || !history[i].endDate) continue;
                        const existStart = new Date(history[i].startDate);
                        const existEnd = new Date(history[i].endDate);
                        // Overlap: newStart < existEnd && newEnd > existStart (允许边界相等，即前一账单结束日=后一账单开始日)
                        if (newStart < existEnd && newEnd > existStart) {
                            return { overlap: true, index: i, record: history[i] };
                        }
                    }
                    return { overlap: false };
                };

// Watch startDate to auto-calculate endDate in AddHistory mode
                watch(() => renewForm.value.startDate, (newVal) => {
                    if (!newVal) return;
                    
                    let item = null;
                    if (renewMode.value === 'addHistory') {
                        item = currentHistoryItem.value;
                    } else if (renewMode.value === 'renew') {
                        item = list.value.find(i => i.id === renewForm.value.id);
                    }
                    
                    if (!item || !item.intervalDays) return;

                    const newEnd = calculateCycleEndDate(newVal, item);
                    if (newEnd) {
                        renewForm.value.endDate = newEnd;
                    }
                });

                // Open Add History via Renew Dialog (reuse)
                const addHistoryRecord = () => {
                    const now = new Date();
                    const formatDateTime = (d) => d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
                    const d = getLocalToday();
                    renewForm.value = {
                        id: currentHistoryItem.value.id, // Use currentHistoryItem's id for addHistory mode 
                        name: currentHistoryItem.value.name,
                        renewDate: formatDateTime(now),
                        startDate: d,
                        endDate: d, // Will be updated by watcher
                        price: currentHistoryItem.value.fixedPrice || 0,
                        currency: currentHistoryItem.value.currency || settings.value.defaultCurrency || 'CNY',
                        note: ''
                    };
                    renewMode.value = 'addHistory';
                    renewDialogVisible.value = true;
                    submitting.value = false;
                };

                // Submit Add History
                const submitAddHistory = async () => {
                    const form = addHistoryForm.value;
                    
                    // Validate required fields
                    if (!form.renewDate || !form.startDate || !form.endDate) {
                        ElMessage.error(lang.value === 'zh' ? '请填写完整的日期信息' : 'Please fill in all date fields');
                        return;
                    }
                    
                    // Check for period overlap
                    const overlapResult = checkPeriodOverlap(form.startDate, form.endDate);
                    if (overlapResult.overlap) {
                        const existRecord = overlapResult.record;
                        ElMessage.warning(lang.value === 'zh' 
                            ? '账单周期与已有记录重叠 (' + existRecord.startDate + ' ~ ' + existRecord.endDate + ')，请修改已有记录而非添加新记录'
                            : 'Period overlaps with existing record (' + existRecord.startDate + ' ~ ' + existRecord.endDate + '). Please edit the existing record instead.'
                        );
                        return;
                    }
                    
                    // Add record
                    const newRecord = {
                        renewDate: form.renewDate,
                        startDate: form.startDate,
                        endDate: form.endDate,
                        price: form.price,
                        currency: form.currency,
                        note: form.note
                    };
                    currentHistoryItem.value.renewHistory.unshift(newRecord);
                    
                    // Sync and save
                    const realRow = list.value.find(i => i.id === currentHistoryItem.value.id);
                    if (realRow) {
                        realRow.renewHistory = currentHistoryItem.value.renewHistory;
                        await saveData(null, null, true);
                    }
                    
                    addHistoryDialogVisible.value = false;
                    historyPage.value = 1;
                };
                const removeHistoryRecord = async (index) => {
                    const realIndex = (historyPage.value - 1) * historyPageSize.value + index;
                    currentHistoryItem.value.renewHistory.splice(realIndex, 1);
                    // Sync to main list and persist
                    const realRow = list.value.find(i => i.id === currentHistoryItem.value.id);
                    if (realRow) {
                        realRow.renewHistory = currentHistoryItem.value.renewHistory;
                        await saveData(null, null, true);
                    }
                };


                const historyStats = computed(() => {
                    const hist = currentHistoryItem.value.renewHistory || [];
                    const count = hist.length;
                    const preferredCurrency = settings.value.defaultCurrency || 'CNY';
                    
                    // Group by currency
                    const byCurrency = {};
                    hist.forEach(item => {
                        const cur = item.currency || 'CNY';
                        const price = Number(item.price) || 0;
                        byCurrency[cur] = (byCurrency[cur] || 0) + price;
                    });
                    
                    // Convert to preferred currency
                    let convertedTotal = 0;
                    const rates = exchangeRates.value;
                    Object.keys(byCurrency).forEach(cur => {
                        const amount = byCurrency[cur];
                        if (cur === preferredCurrency) {
                            convertedTotal += amount;
                        } else if (rates[cur]) {
                            // rates 是以 preferredCurrency 为基准的
                            // 所以 amount / rates[cur] = 换算后的 preferredCurrency 金额
                            convertedTotal += amount / rates[cur];
                        } else {
                            // 无汇率时直接累加（近似）
                            convertedTotal += amount;
                        }
                    });
                    
                    return { 
                        count, 
                        byCurrency, 
                        convertedTotal: convertedTotal.toFixed(2), 
                        preferredCurrency 
                    };
                });


                const previewData = computed(() => {
                    const { lastRenewDate, intervalDays, cycleUnit, useLunar } = form.value;
                    if (!lastRenewDate || !intervalDays) return null;
                    
                    try {
                        let nextDateUTC;

                        // --- 步骤 1: 计算“下一次到期日” (纯日期运算，使用 UTC 避免偏差) ---
                        if (useLunar) {
                            const p = lastRenewDate.split('-');
                            const y = parseInt(p[0]), m = parseInt(p[1]), d = parseInt(p[2]);
                            const l = LUNAR.solar2lunar(y, m, d);
                            const nl = frontendCalc.addPeriod({ year: l.year, month: l.month, day: l.day, isLeap: l.isLeap }, intervalDays, cycleUnit);
                            const ns = frontendCalc.l2s(nl);
                            nextDateUTC = new Date(Date.UTC(ns.year, ns.month - 1, ns.day));
                        } else {
                            const p = lastRenewDate.split('-');
                            nextDateUTC = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));

                            if (cycleUnit === 'day') nextDateUTC.setUTCDate(nextDateUTC.getUTCDate() + intervalDays);
                            else if (cycleUnit === 'month') nextDateUTC.setUTCMonth(nextDateUTC.getUTCMonth() + intervalDays);
                            else if (cycleUnit === 'year') nextDateUTC.setUTCFullYear(nextDateUTC.getUTCFullYear() + intervalDays);
                        }
                        const nextStr = nextDateUTC.toISOString().split('T')[0];

                        // --- 步骤 2: 获取“用户偏好时区”的“今天” ---
                        let todayInUserTzStr;
                        try {
                            const userTz = settings.value.timezone || 'UTC';
                            // 使用 Intl 格式化出用户时区的 YYYY-MM-DD
                            const fmt = new Intl.DateTimeFormat('en-CA', { 
                                timeZone: userTz, 
                                year: 'numeric', month: '2-digit', day: '2-digit' 
                            });
                            todayInUserTzStr = fmt.format(new Date());
                        } catch (e) {
                            // 降级处理
                            todayInUserTzStr = new Date().toISOString().split('T')[0];
                        }

                        // --- 步骤 3: 计算差值 (统一转成 UTC 0点相减，消除时分秒干扰) ---
                        const pToday = todayInUserTzStr.split('-');
                        const todayUTC = new Date(Date.UTC(+pToday[0], +pToday[1]-1, +pToday[2]));

                        // 计算毫秒差 -> 天数
                        const diff = Math.round((nextDateUTC - todayUTC) / (1000 * 3600 * 24));
                        
                        const diffStr = (lang.value === 'zh' ? '距今 ' : 'Due in ') + (diff > 0 ? '+' : '') + diff + ' ' + (lang.value === 'zh' ? '天' : 'Days');
                        
                        return { date: nextStr, diff: diffStr };
                    } catch (e) { 
                        console.error(e);
                        return null; 
                    }
                });

                const getSummaries = (param) => {
                    const { columns } = param;
                    const sums = [];
                    const sourceData = filteredList.value; // Use filtered list for total
                    const defaultCur = settings.value.defaultCurrency || 'CNY';
                    const rates = exchangeRates.value || {};

                    columns.forEach((column, index) => {
                        if (index === 0) {
                            sums[index] = t('totalCost');
                            return;
                        }
                        if (column.property === 'fixedPrice') {
                            let total = 0;
                            sourceData.forEach(item => {
                                const price = parseFloat(item.fixedPrice) || 0;
                                const cur = item.currency || defaultCur;
                                if (cur === defaultCur) {
                                    total += price;
                                } else if (rates[cur]) {
                                    total += price / rates[cur];
                                } else {
                                    total += price; // Fallback
                                }
                            });
                            sums[index] = '≈ ' + total.toFixed(2) + ' ' + defaultCur;
                        } else {
                            sums[index] = '';
                        }
                    });

                    return sums;
                };

                const pagedList = computed(() => {
                    const start = (currentPage.value - 1) * pageSize.value;
                    const end = start + pageSize.value;
                    return filteredList.value.slice(start, end);
                });

                watch([currentTag, searchKeyword], () => {
                    currentPage.value = 1;
                });
                
                // Initialize selectedMonth to the latest month when data is available
                watch(() => spendingStats.value, (stats) => {
                    if (stats.hasData && !selectedMonth.value) {
                        const trends = stats[spendingMode.value]?.trends;
                        if (trends && trends.length > 0) {
                            selectedMonth.value = trends[trends.length - 1].month;
                        }
                    }
                }, { immediate: true });
                
                // Reset selectedMonth when spendingMode or selectedYear changes
                watch([spendingMode, selectedYear], () => {
                    const stats = spendingStats.value;
                    if (stats.hasData) {
                        const trends = stats[spendingMode.value]?.trends;
                        if (trends && trends.length > 0) {
                            selectedMonth.value = trends[trends.length - 1].month;
                        }
                    }
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
                    tableKey, termRef, isLoggedIn, password, login, logout, loading, list, settings, lang, toggleLang, setLang, t, locale, disabledCount, currentView, hoverIndex, spendingStats, spendingMode, selectedYear, selectedMonth, monthDetails, Close: ElementPlusIconsVue.Close,
                    dialogVisible, settingsVisible, historyVisible, historyLoading, historyLogs, checking, logs, displayLogs, form, settingsForm, isEdit,
                    expiringCount, expiredCount, currentTag, allTags, filteredList, upcomingBillsList, upcomingBillsTotal, searchKeyword, logVisible,formatLogTime,Upload, Download,
                    openAdd, editItem, deleteItem, saveItem, openSettings, saveSettings, runCheck, openHistoryLogs, clearLogs, toggleEnable,importRef, exportData, triggerImport, handleImportFile,
                    Edit, Delete, Plus, VideoPlay, Setting, Bell, Document, Lock, Monitor, SwitchButton, Calendar, Timer, Files, AlarmClock, Warning, Search, Cpu, Link, Connection, Message, Promotion, Iphone, Moon, Sunny, ArrowDown, Tickets,
                    getDaysClass, formatDaysLeft, getTagClass, getLogColor, getLunarStr, getYearGanZhi, getSmartLunarText, getLunarTooltip, getMonthStr, getTagCount, tableRowClassName, channelMap, toggleChannel, testChannel, testing,
                    expandedChannels,
                    settingsExpanded, toggleSettingsSection,
                    calendarUrl, copyIcsUrl, resetCalendarToken, migrateOldData, manualRenew,RefreshRight,timezoneList,currentPage, pageSize, pagedList, previewData,
                    isDark, toggleTheme, drawerSize, actionColWidth, paginationLayout, confirmDelete, confirmRenew, More, windowWidth,
                    handleSortChange, handleFilterChange, 
                    nextDueFilters, typeFilters, uptimeFilters, lastRenewFilters,
                    currencyList,editingHistoryIndex, tempHistoryItem, startEditHistory, cancelEditHistory, saveEditHistory,
                    Money: ElementPlusIconsVue.Coin, 
                    renewDialogVisible, renewMode, renewForm, openRenew, submitRenew,
                    historyDialogVisible, currentHistoryItem, historyPage, historyPageSize, pagedHistory, openHistory, saveHistoryInfo, addHistoryRecord, removeHistoryRecord, historyStats, exchangeRates, ratesLoading,
                    addHistoryDialogVisible, addHistoryForm, submitAddHistory,
                    editingHistoryIndex, tempHistoryItem, startEditHistory, saveEditHistory, cancelEditHistory, submitting, currentRenewItem,
                    getSummaries, expiringTotal, expiredTotal, totalAmount
                };
            }
        });
        
        app.use(ElementPlus);
        for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
            app.component(key, component);
        }
        app.mount('#app');
    </script>
</body>
</html>`;
