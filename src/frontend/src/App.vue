<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, reactive, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import en from 'element-plus/es/locale/lang/en';
import ServerChan3 from './components/icons/ServerChan3.vue';
import DingTalk from './components/icons/DingTalk.vue';

// 图标解构
const { Edit, Delete, Plus, VideoPlay, Setting, Bell, Document, Lock, Monitor, SwitchButton, Calendar, Timer, Files, AlarmClock, Warning, Search, Cpu, Upload, Download, Link, Connection, Message, Promotion, Iphone, Moon, Sunny, RefreshRight, More, ArrowDown, Tickets, Sort, ArrowLeft, ArrowRight, InfoFilled, Close, Coin, Position, Notification, Comment, SuccessFilled, WarningFilled } = ElementPlusIconsVue;

// Element Plus 语言包
const ZhCn = zhCn;
const ElementPlusLocaleEn = en;
const Money = Coin;

// =================================================================================
// [用户配置区] 默认汇率兜底配置 (API 请求失败时使用)
// 基准币种 (请确保此币种在下方的汇率表中值为 1)
const FALLBACK_BASE = 'CNY';
// 汇率表 (1 基准币种 = 多少目标币种)
const FALLBACK_RATES = {
    'CNY': 1,
    'USD': 0.14413,
    'EUR': 0.12213,
    'GBP': 0.10532,
    'HKD': 1.1261,
    'JPY': 22.463,
    'SGD': 0.18313,
    'MYR': 0.56679,
    'KRW': 208.78
};
// =================================================================================

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
            zh: { upcomingBillsDays:'待付款提醒天数', upcomingBills: '%s日内待付款项', filter:{expired:'已过期 / 今天', w7:'%s天内', w30:'30天内', thisMonth:'本月内', nextMonth:'下月内', halfYear:'半年内', oneYear:'1年内', new:'新服务 (<30天)', stable:'稳定 (1个月-1年)', long:'长期 (>1年)', m1:'最近1个月', m6:'半年内', year:'今年内', earlier:'更早以前'}, viewSwitch:'视图切换',viewProjects:'项目列表',viewSpending:'支出分析',annualSummary:'年度汇总',monthlyTrend:'月度趋势',noSpendingData:'暂无支出数据',avgMonthly:'月均',billAmount:'账单金额 (按账单周期)',opSpending:'实际支出 (按操作日期)',secPref: '偏好设置',manualRenew: '手动续期',tipToggle: '切换状态',tipRenew: '手动续期',tipEdit: '编辑服务',tipDelete: '删除服务',tipDeleteCh: '删除渠道',secNotify: '通知配置',secData: '数据管理',lblIcsTitle: '日历订阅',lblIcsUrl: '订阅地址 (iOS/Google)',btnCopy: '复制',btnResetToken: '重置令牌',loginTitle:'身份验证',passwordPlaceholder:'请输入访问密钥/Authorization Key',unlockBtn:'解锁终端/UNLOCK',check:'立即检查',add:'新增服务',settings:'系统设置',logs:'运行日志',logout:'安全退出',totalServices:'服务总数',expiringSoon:'即将到期',expiredAlert:'已过期 / 警告',serviceName:'服务名称',type:'类型',nextDue:'下次到期',uptime:'已运行',lastRenew:'上次续期',cyclePeriod:'周期',actions:'操作',cycle:'循环订阅',reset:'到期重置',disabled:'已停用',days:'天',daysUnit:'天',typeReset:'到期重置',typeCycle:'循环订阅',lunarCal:'农历',lbOffline:'离线',unit:{day:'天',month:'月',year:'年'},editService:'编辑服务',editLastRenewHint:'请在「历史记录」中修改',newService:'新增服务',formName:'名称',namePlaceholder:'例如: Netflix',formType:'模式',createDate:'创建时间',interval:'周期时长',note:'备注信息',status:'状态',active:'启用',disabledText:'禁用',cancel:'取消',save:'保存数据',saveSettings:'保存配置',settingsTitle:'系统设置',setNotify:'通知配置',pushSwitch:'推送总开关',pushUrl:'Webhook 地址',notifyThreshold:'提醒阈值',setAuto:'自动化配置',autoRenewSwitch:'自动续期',autoRenewThreshold:'自动续期阈值',autoDisableThreshold:'自动禁用阈值',daysOverdue:'天后触发',sysLogs:'系统日志',execLogs:'执行记录',clearHistory:'清空历史',noLogs:'无记录',liveLog:'实时终端',btnExport: '导出备份',btnImport: '恢复备份',btnTest: '发送测试',btnRefresh:'刷新日志',
            lblEnable: '启用', lblToken: '令牌 (Token)', lblApiKey: 'API Key', lblChatId: '会话ID', 
            lblServer: '服务器URL', lblDevKey: '设备Key', lblFrom: '发件人', lblTo: '收件人', lblUid: '用户ID (UID)', lblSendKey: '发送密钥 (SendKey)', lblSecret: '加签密钥 (Secret)',
            lblTopic: '主题 (Topic)',readOnly: '只读',
            lblNotifyTime: '提醒时间', btnResetToken: '重置令牌',
            lblHeaders: '请求头 (JSON)', lblBody: '消息体 (JSON)',
            tag:{alert:'触发提醒',renew:'自动续期',disable:'自动禁用',normal:'检查正常'},tagLatest:'最新',tagAuto:'自动',tagManual:'手动',msg:{confirmRenew: '确认将 [%s] 的更新日期设置为今天吗？',renewSuccess: '续期成功！日期已更新: %s -> %t',tokenReset: '令牌已重置，请更新订阅地址', copyOk: '链接已复制', exportSuccess: '备份已下载',importSuccess: '数据恢复成功，即将刷新',importFail: '导入失败，请检查文件格式',passReq:'请输入密码',saved:'保存成功',saveFail:'保存失败',cleared:'已清空',clearFail:'清空失败',loginFail:'验证失败',loadLogFail:'日志加载失败',confirmDel:'确认删除此项目?',dateError:'上次更新日期不能早于创建日期',nameReq:'服务名称不能为空',nameExist:'服务名称已存在',futureError:'上次续期不能是未来时间',serviceDisabled:'服务已停用',serviceEnabled:'服务已启用',execFinish: '执行完毕!', rateFallback:'API请求失败，已使用默认汇率'},tags:'标签',tagPlaceholder:'输入标签回车创建',searchPlaceholder:'搜索标题或备注...',tagsCol:'标签',tagAll:'全部',useLunar:'农历周期',lunarTip:'按农历日期计算周期',yes:'是',no:'否',timezone:'偏好时区',disabledFilter:'已停用',policyConfig:'自动化策略',policyNotify:'提醒提前期',policyAuto:'自动续期',policyRenewDay:'过期续期天数',useGlobal:'全局默认',autoRenewOnDesc:'过期自动续期',autoRenewOffDesc:'过期自动禁用',previewCalc:'根据上次续期日期和周期计算',nextDue:'下次到期',
            fixedPrice:'账单额',currency:'币种',defaultCurrency:'默认币种',history:'历史记录',historyTitle:'续费历史',totalCost:'总花费',totalCount:'续费次数',renewDate:'操作日期',billPeriod:'账单周期',startDate:'开始日期',endDate:'结束日期',actualPrice:'实付金额',notePlaceholder:'可选备注...',btnAddHist:'补录历史',modify:'修改渠道',confirmDelHist:'删除此记录?',opDate:'操作日',amount:'金额',period:'周期',spendingDashboard:'花销看板',monthlyBreakdown:'月度明细',total:'总计',count:'笔',growth:'环比',currMonth:'本月',avgMonthlyLabel:'月均支出',itemDetails:'项目明细',noData:'暂无数据',predictedTag:'预测',last12M:'最近12个月', lblPushTitle:'自定义标题', pushTitle:'RenewHelper 报告',
            addChannel: '添加渠道', noChannels: '暂无推送渠道，请点击右上角添加。', modifyChannel: '配置渠道', channelType: '渠道类型', channelName: '渠道名称 (备注)', selectChannels: '选择推送渠道 (留空则默认推送所有)'},
            en: { upcomingBillsDays:'Pending Reminder', upcomingBills: '%s Days Pending', viewSwitch:'VIEW SWITCH',viewProjects:'PROJECTS',viewSpending:'DASHBOARD',annualSummary:'Annual Summary',monthlyTrend:'Monthly Trend',noSpendingData:'No Spending Data',billAmount:'BILL AMOUNT',opSpending:'ACTUAL COST', avgMonthly:'AVG', avgMonthlyLabel:'AVG MONTHLY', filter:{expired:'Overdue/Today', w7:'Within %s Days', w30:'Within 30 Days', future:'Future(>30d)', new:'New (<30d)', stable:'Stable (1m-1y)', long:'Long Term (>1y)', m1:'Last Month', m6:'Last 6 Months', year:'This Year', earlier:'Earlier'}, secPref: 'PREFERENCES',manualRenew: 'Quick Renew',tipToggle: 'Toggle Status',tipRenew: 'Quick Renew',tipEdit: 'Edit Service',tipDelete: 'Delete Service',tipDeleteCh: 'Delete Channel',secNotify: 'NOTIFICATIONS',secData: 'DATA MANAGEMENT',lblIcsTitle: 'CALENDAR SUBSCRIPTION',lblIcsUrl: 'ICS URL (iOS/Google Calendar)',btnCopy: 'COPY',btnResetToken: 'RESET TOKEN',loginTitle:'SYSTEM ACCESS',passwordPlaceholder:'Authorization Key',unlockBtn:'UNLOCK TERMINAL',check:'CHECK',add:'ADD NEW',settings:'CONFIG',logs:'LOGS',logout:'LOGOUT',totalServices:'TOTAL SERVICES',expiringSoon:'EXPIRING SOON',expiredAlert:'EXPIRED / ALERT',serviceName:'SERVICE NAME',type:'TYPE',nextDue:'NEXT DUE',uptime:'UPTIME',lastRenew:'LAST RENEW',cyclePeriod:'CYCLE',actions:'ACTIONS',cycle:'CYCLE',reset:'RESET',disabled:'DISABLED',days:'DAYS',daysUnit:'DAYS',typeReset:'RESET',typeCycle:'CYCLE',lunarCal:'Lunar',lbOffline:'OFFLINE',unit:{day:'DAY',month:'MTH',year:'YR'},editService:'EDIT SERVICE',editLastRenewHint:'Please modify in History',newService:'NEW SERVICE',formName:'NAME',namePlaceholder:'e.g. Netflix',formType:'MODE',createDate:'CREATE DATE',interval:'INTERVAL',note:'NOTE',status:'STATUS',active:'ACTIVE',disabledText:'DISABLED',cancel:'CANCEL',save:'SAVE DATA',saveSettings:'SAVE CONFIG',settingsTitle:'SYSTEM CONFIG',setNotify:'NOTIFICATION',pushSwitch:'MASTER PUSH',pushUrl:'WEBHOOK URL',notifyThreshold:'ALERT THRESHOLD',setAuto:'AUTOMATION',autoRenewSwitch:'AUTO RENEW',autoRenewThreshold:'RENEW AFTER',autoDisableThreshold:'DISABLE AFTER',daysOverdue:'DAYS OVERDUE',sysLogs:'SYSTEM LOGS',execLogs:'EXECUTION LOGS',clearHistory:'CLEAR HISTORY',noLogs:'NO DATA',liveLog:'LIVE TERMINAL',btnExport: 'Export Data',btnImport: 'Import Data',btnTest: 'Send Test',btnRefresh:'REFRESH',last12M:'LAST 12M',
            lblEnable: 'Enable', lblToken: 'Token', lblApiKey: 'API Key', lblChatId: 'Chat ID', 
            lblServer: 'Server URL', lblDevKey: 'Device Key', lblFrom: 'From Email', lblTo: 'To Email', lblUid: 'UID', lblSendKey: 'SendKey', lblSecret: 'Secret (Optional)',

            lblTopic: 'Topic',readOnly: 'Read-only',
            lblNotifyTime: 'Alarm Time', btnResetToken: 'RESET TOKEN',
            lblHeaders: 'Headers (JSON)', lblBody: 'Body (JSON)',
            tag:{alert:'ALERT',renew:'RENEWED',disable:'DISABLED',normal:'NORMAL'},tagLatest:'LATEST',tagAuto:'AUTO',tagManual:'MANUAL',msg:{confirmRenew: 'Renew [%s] to today based on your timezone?',renewSuccess: 'Renewed! Date updated: %s -> %t',tokenReset: 'Token Reset. Update your calendar apps.', copyOk: 'Link Copied', exportSuccess: 'Backup Downloaded',importSuccess: 'Restore Success, Refreshing...',importFail: 'Import Failed, Check File Format',passReq:'Password Required',saved:'Data Saved',saveFail:'Save Failed',cleared:'Cleared',clearFail:'Clear Failed',loginFail:'Access Denied',loadLogFail:'Load Failed',confirmDel:'Confirm Delete?',dateError:'Last renew date cannot be earlier than create date',nameReq:'Name Required',nameExist:'Name already exists',futureError:'Renew date cannot be in the future',serviceDisabled:'Service Disabled',serviceEnabled:'Service Enabled',execFinish: 'EXECUTION FINISHED!', rateFallback:'Network Error. Used default rates.'},tags:'TAGS',tagPlaceholder:'Press Enter to create tag',searchPlaceholder:'Search...',tagsCol:'TAGS',tagAll:'ALL',useLunar:'Lunar Cycle',lunarTip:'Calculate based on Lunar calendar',yes:'Yes',no:'No',timezone:'Timezone',disabledFilter:'DISABLED',policyConfig:'Policy Config',policyNotify:'Notify Days',policyAuto:'Auto Renew',policyRenewDay:'Renew Days',useGlobal:'Global Default',autoRenewOnDesc:'Auto Renew when overdue',autoRenewOffDesc:'Auto Disable when overdue',previewCalc:'Based on Last Renew Date & Interval',nextDue:'NEXT DUE',
            fixedPrice:'PRICE',currency:'Currency',defaultCurrency:'Default Currency',history:'History',historyTitle:'Renewal History',totalCost:'Total Cost',totalCount:'Total Count',renewDate:'Op Date',billPeriod:'Bill Period',startDate:'Start Date',endDate:'End Date',actualPrice:'Actual Price',notePlaceholder:'Optional note...',btnAddHist:'Add Record',modify:'Edit Channel',confirmDelHist:'Delete record?',opDate:'Op Date',amount:'Amount',period:'Period',spendingDashboard:'SPENDING DASHBOARD',monthlyBreakdown:'MONTHLY BREAKDOWN',total:'TOTAL',count:'COUNT',growth:'GROWTH',currMonth:'CURRENT',itemDetails:'ITEMS',noData:'NO DATA',predictedTag:'PREDICTED', lblPushTitle:'Push Title', pushTitle:'RenewHelper Report',
            addChannel: 'Add Channel', noChannels: 'No channels. Add one!', modifyChannel: 'Edit Channel', channelType: 'Type', channelName: 'Name', selectChannels: 'Notification Channels (Leave empty for All)'}
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

    const isLoggedIn = ref(!!localStorage.getItem('jwt_token')), password = ref(''), loading = ref(false), list = ref([]), settings = ref({ upcomingBillsDays: 7 });
    const dataVersion = ref(0); // 新增版本号状态
    const hasNewVersion = ref(false); // 版本更新提示
    const newVersionCode = ref('');
    const dialogVisible = ref(false), settingsVisible = ref(false), historyVisible = ref(false), historyLoading = ref(false), historyLogs = ref([]);
    const checking = ref(false), logs = ref([]), displayLogs = ref([]), isEdit = ref(false), lang = ref('zh'), currentTag = ref(''), searchKeyword = ref('');
    const currentView = ref('project');
    const hoverIndex = ref(-1);
    const spendingMode = ref('op');
    const selectedYear = ref('recent'); // 'recent' = last 12 months, or year number like 2024
    const selectedMonth = ref(null); // selected month key like '2026-01' for detail view
    const locale = ref(ZhCn), tableKey = ref(0), termRef = ref(null), submitting = ref(false);
    const form = ref({ id:'', name:'', createDate:'', lastRenewDate:'', intervalDays:30, cycleUnit:'day', type:'cycle', message:'', enabled:true, tags:[], useLunar:false, notifyDays:3, notifyTime: '08:00', autoRenew:true, autoRenewDays:3, fixedPrice:0, currency:'CNY', notifyChannelIds:[], renewHistory:[] });
    const settingsForm = ref({ 
        notifyUrl:'', 
        enableNotify:true, 
        autoDisableDays:30, 
        upcomingBillsDays: 7,
        notifyTitle: '',
        timezone:'UTC',
        defaultCurrency:'CNY',
        channels: [], // New structure
        calendarToken: '',
        backupKey: ''
    });
    // const channelMap = reactive({ ... }); // Removed
    // const testing = reactive({ ... }); // Removed
    const channelDialogVisible = ref(false);
    const channelForm = ref({ id:'', type:'', name:'', config:{}, enable:true });
    const editingChannelIndex = ref(-1);
    
    const channelTypes = ['telegram', 'bark', 'pushplus', 'dingtalk', 'serverchan3', 'notifyx', 'resend', 'webhook', 'gotify', 'ntfy'];
    
    const onChannelTypeChange = () => {
        // Reset config when type changes
        channelForm.value.config = {};
        // Auto-update name: "Type + 3 Random Digits"
        const randomNum = Math.floor(Math.random() * 900 + 100);
        channelForm.value.name = channelForm.value.type + randomNum;
    };
    
    const getChannelSummary = (ch) => {
        if (!ch || !ch.config) return '';
        if (ch.type === 'telegram') return `${ ch.config.chatId || '?'} (${ ch.config.token ? '***' : '' })`;
        if (ch.type === 'bark') return ch.config.server || 'Default';
        if (ch.type === 'webhook') return ch.config.url;
        if (ch.type === 'ntfy') return `${ ch.config.topic } @${ ch.config.server || 'ntfy.sh' } `;
        if (ch.type === 'serverchan3') return ch.config.uid;
        if (ch.type === 'dingtalk') return `...${ch.config.token.slice(-6)}`;
        if (ch.type === 'resend') return `${ ch.config.from } -> ${ ch.config.to } `;
        return '';
    };

    const openAddChannel = () => {
        const randomNum = Math.floor(Math.random() * 900 + 100);
        channelForm.value = { id:'', type:'telegram', name: 'telegram' + randomNum, config:{}, enable:true };
        editingChannelIndex.value = -1;
        channelDialogVisible.value = true;
    };

    const openEditChannel = (idx) => {
        const ch = settingsForm.value.channels[idx];
        channelForm.value = JSON.parse(JSON.stringify(ch));
        editingChannelIndex.value = idx;
        channelDialogVisible.value = true;
    };


    // UUID Generator (Compatible with HTTP context)
    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const saveChannel = () => {
        if (!channelForm.value.type) return;
        if (!channelForm.value.name) return ElMessage.error(t('msg.nameReq'));
        
        // Check duplicate name
        const existing = settingsForm.value.channels || [];
        const isDuplicate = existing.some(c => c.name === channelForm.value.name && c.id !== channelForm.value.id);
        if (isDuplicate) {
            return ElMessage.error(lang.value === 'zh' ? '渠道名称已存在' : 'Channel name already exists');
        }

        const newCh = JSON.parse(JSON.stringify(channelForm.value));
        
        if (editingChannelIndex.value >= 0) {
            // Edit
            const realIdx = settingsForm.value.channels.findIndex(c => c.id === newCh.id);
            if (realIdx !== -1) settingsForm.value.channels[realIdx] = newCh;
        } else {
            // Add
            newCh.id = generateUUID();
            if (!settingsForm.value.channels) settingsForm.value.channels = [];
            settingsForm.value.channels.push(newCh);
            // Expand list if needed
            if (channelLimit.value < settingsForm.value.channels.length) {
                    channelLimit.value = settingsForm.value.channels.length;
            }
        }
        channelDialogVisible.value = false;
    };


    
    
    // Load More Pattern for Channels
    const channelLimit = ref(10);
    const pagedChannels = computed(() => {
        const list = settingsForm.value.channels || [];
        return list.slice(0, channelLimit.value);
    });
    
    const loadMoreChannels = () => {
        channelLimit.value += 10;
    };

    const deleteChannelById = (id) => {
        ElMessageBox.confirm(t('msg.confirmDel'), 'Delete', {type:'warning'})
            .then(() => {
                const i = settingsForm.value.channels.findIndex(c => c.id === id);
                if (i !== -1) settingsForm.value.channels.splice(i, 1);
            }).catch(()=>{});
    };
    
    const testChannel = async (ch) => {
        const loadingMsg = ElMessage({ type: 'loading', duration: 0, message: 'Testing...' });
        try {
            const r = await fetch('/api/test-notify', { 
                method: 'POST', 
                headers: getAuth(), 
                body: JSON.stringify({ channelObj: ch }) 
            });
            const d = await r.json();
            loadingMsg.close();
            if (r.ok) ElMessage.success(`TEST OK: ${ d.msg } `);
            else ElMessage.error(`TEST FAIL: ${ d.msg } `);
        } catch(e) { 
            loadingMsg.close();
            ElMessage.error(e.message); 
        }
    };

    const testCurrentChannel = async () => {
        if (!channelForm.value.type) return;
        // Construct temp channel object from form
        const tempCh = JSON.parse(JSON.stringify(channelForm.value));
        tempCh.enable = true; // Force enable for test
        await testChannel(tempCh);
    };
    const expandedChannels = ref('');
    
    const activeTab = ref('pref');
    
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
                            addDetail('bill', mk, item, price, r.startDate, `${ r.startDate } -> ${ r.endDate || '?' } `);
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
                            addDetail('op', mk, item, price, r.renewDate.split(' ')[0], `${ r.startDate || '?' } -> ${ r.endDate || '?' } `);
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
                            addDetail('bill', mk, item, price, dateStr, `${ dateStr } -> ${ legacyEnd } `);
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
                    
                    for(let i=0; i<366; i++) { 
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
                            addDetail('bill', mk, item, price, dateStr, `${ dateStr } -> ${ endDateStr } `, true);
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

    
    const checkAppVersion = async () => {
        try {
            const res = await fetch('https://versync.pages.dev/renewhelper.json');
            if(res.ok) {
                const data = await res.json();
                if(data.version) {
                     // Title format: "RenewHelper v2.2.7"
                     const title = document.title;
                     const match = title.match(/v(\d+\.\d+\.\d+)/);
                     if(match) {
                         const currentVer = match[1];
                         console.log('Version Check:', currentVer, 'vs', data.version);
                         
                         const v1 = data.version.split('.').map(Number);
                         const v2 = currentVer.split('.').map(Number);
                         let isNew = false;
                         for(let i=0; i<Math.max(v1.length, v2.length); i++) {
                             const n1 = v1[i] || 0;
                             const n2 = v2[i] || 0;
                             if(n1 > n2) { isNew = true; break; }
                             if(n1 < n2) break;
                         }

                         if(isNew) {
                             hasNewVersion.value = true;
                             newVersionCode.value = data.version;
                         }
                     }
                }
            }
        } catch(e) { console.error('Version check failed', e); }
    };

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
        // 1. Version Check (Async, non-blocking)
        checkAppVersion();        
        // After initial fetchList (if token exists), check for migration (Bills & Channels) AND Version Check
        const unwatchList = watch([list, settings], ([newList, newSettings]) => {
            if (newList && newList.length > 0) {
                const lastCheck = localStorage.getItem('lastMigrationCheck');
                const today = new Date().toDateString();
                
                // Only check once a day (Shared Key for Migration & Version Check)
                if (lastCheck !== today) {
                    


                    // 2. Migration Check
                    const billInfo = newList.filter(item => (!item.renewHistory || item.renewHistory.length === 0) && item.lastRenewDate && item.intervalDays);
                    let channelCount = 0;
                    if (newSettings && newSettings.notifyConfig) {
                        const oldConf = newSettings.notifyConfig;
                        const existingChannels = newSettings.channels || [];
                        const types = ['telegram', 'bark', 'pushplus', 'notifyx', 'resend', 'webhook', 'gotify', 'ntfy'];
                        types.forEach(t => {
                            const c = oldConf[t];
                            if (c && Object.values(c).some(v => v && v.trim())) {
                                 if (t === 'bark' && (!c.key || !c.key.trim())) return;
                             if (t === 'ntfy' && (!c.topic || !c.topic.trim())) return;  // topic 不能为空
                             
                                 if (!existingChannels.some(ex => ex.type === t && ex.name.endsWith('_Old'))) {
                                     channelCount++;
                                 }
                            }
                        });
                    }

                    if (billInfo.length > 0 || channelCount > 0) {
                            let msg = '';
                            if (billInfo.length > 0 && channelCount > 0) {
                                msg = lang.value === 'zh' ? `检测到 ${billInfo.length} 个项目缺少账单，${channelCount} 个通知渠道待迁移。` : `Found ${billInfo.length} items lacking bills and ${channelCount} legacy channels.`;
                            } else if (billInfo.length > 0) {
                                msg = lang.value === 'zh' ? `检测到 ${billInfo.length} 个项目缺少历史账单。` : `Found ${billInfo.length} items without history.`;
                            } else {
                                msg = lang.value === 'zh' ? `检测到 ${channelCount} 个旧版通知渠道待迁移。` : `Found ${channelCount} legacy channels to migrate.`;
                            }
                            
                            ElMessageBox.confirm(
                                msg + (lang.value === 'zh' ? ' 建议先备份数据再执行迁移，是否继续？(今日仅提示一次)' : ' Recommend backup first. Continue? (Ask once today)'),
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
                    
                    // Mark as checked for today
                    localStorage.setItem('lastMigrationCheck', today);
                }
            }
                fetchExchangeRates(settings.value.defaultCurrency || 'CNY');
                unwatchList();

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
                    endDate = `${nextS.year}-${nextS.month.toString().padStart(2, '0')}-${nextS.day.toString().padStart(2, '0')}`;
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
            displayLogs.value.push(`[SYSTEM] ${t('msg.execFinish')}`);
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
            return `${timeStr} ${utcOffset}`;
        } catch (e) { return isoStr; }
    };                

    const openAdd = () => { isEdit.value=false; const d=getLocalToday(); form.value={id:Date.now().toString(),name:'',createDate:d,lastRenewDate:d,intervalDays:30,cycleUnit:'day',type:'cycle',enabled:true,tags:[],useLunar:false, notifyDays:3, notifyTime: '08:00', autoRenew:true, autoRenewDays:3, fixedPrice:0, currency:settings.value.defaultCurrency||'CNY', notifyChannelIds:[], renewHistory:[]}; dialogVisible.value=true; };
    const editItem = (row) => { isEdit.value=true; form.value={...row,cycleUnit:row.cycleUnit||'day',tags:[...(row.tags||[])],useLunar:!!row.useLunar, notifyDays:(row.notifyDays!==undefined?row.notifyDays:3), notifyTime: (row.notifyTime || '08:00'), autoRenew:row.autoRenew!==false, autoRenewDays:(row.autoRenewDays!==undefined?row.autoRenewDays:3), notifyChannelIds: (Array.isArray(row.notifyChannelIds) ? row.notifyChannelIds : [])}; dialogVisible.value=true; };
    const openSettings = () => { 
        settingsForm.value = JSON.parse(JSON.stringify(settings.value)); 
        if (!settingsForm.value.upcomingBillsDays) settingsForm.value.upcomingBillsDays = 7;
        if (!settingsForm.value.channels) settingsForm.value.channels = [];
        settingsVisible.value=true; 
    };
    const saveSettings = async (close = true) => { 
        // Validate Backup Key
        const bk = settingsForm.value.backupKey;
        if (bk && bk.trim()) {
            if (bk.length < 8) {
                return ElMessage.error(lang.value === 'zh' ? '备份密钥长度至少8位' : 'Backup Key must be at least 8 chars');
            }
            if (!/^(?=.*[a-zA-Z])(?=.*\d).+$/.test(bk)) {
                 return ElMessage.error(lang.value === 'zh' ? '备份密钥需包含字母和数字' : 'Backup Key must contain letters and numbers');
            }
        } 
        const oldCurrency = settings.value.defaultCurrency;
        settings.value={...settingsForm.value}; 
        await saveData(null,settings.value); 
        if(close) settingsVisible.value=false; 
        
        if (settings.value.defaultCurrency !== oldCurrency) {
            fetchExchangeRates(settings.value.defaultCurrency);
        }
    };
    const calendarUrl = computed(() => {
        const origin = window.location.origin;
        const token = settingsForm.value.calendarToken || settings.value.calendarToken || '';
        return token ? `${origin}/api/calendar.ics?token=${token}` : 'Save settings to generate URL...';
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

    // 迁移旧数据：账单历史 + 通知渠道
    const migrateOldData = async (skipConfirm = false) => {
        try {
            // 1. 预先计算迁移内容用于显示确认信息
            const itemsToMigrate = list.value.filter(item => 
                (!item.renewHistory || item.renewHistory.length === 0) && item.lastRenewDate && item.intervalDays
            );
            const billCount = itemsToMigrate.length;
            
            const oldConf = settings.value.notifyConfig || {};
            const legacyEnabled = settings.value.enabledChannels || [];
            const existingChannels = settings.value.channels || [];
            const types = ['telegram', 'bark', 'pushplus', 'notifyx', 'resend', 'webhook', 'webhook2', 'webhook3', 'gotify', 'ntfy'];
            const channelsToMigrate = [];
            
            types.forEach(type => {
                const c = oldConf[type];
                if (!c) return;
                
                // 特殊检查：bark 需要 key，ntfy 需要 topic
                if (type === 'bark' && (!c.key || !c.key.trim())) return;
                if (type === 'ntfy' && (!c.topic || !c.topic.trim())) return;
                
                // 通用检查：至少有一个非空值
                if (!Object.values(c).some(v => {
                    if (v === null || v === undefined) return false;
                    if (typeof v === 'string') return v.trim() !== '';
                    return true;
                })) return;
                
                const suffix = '_Old';
                const newName = type.charAt(0).toUpperCase() + type.slice(1) + suffix;
                const actualType = (type === 'webhook2' || type === 'webhook3') ? 'webhook' : type;
                if (existingChannels.some(ch => ch.name === newName)) return;
                channelsToMigrate.push({
                    type: actualType, name: newName,
                    config: JSON.parse(JSON.stringify(c)),
                    enable: legacyEnabled.includes(type)
                });
            });
            const channelCount = channelsToMigrate.length;
            
            // 2. 没有数据时提示并返回
            if (billCount === 0 && channelCount === 0) {
                ElMessage.info(lang.value === 'zh' ? '没有需要迁移的数据' : 'No data to migrate');
                return;
            }
            
            // 3. 显示确认对话框（在try块内，用户取消时会被catch捕获）
            if (skipConfirm !== true) {
                let msg = lang.value === 'zh' 
                    ? '此操作将进行以下迁移：'
                    : 'This will perform the following migrations:';
                if (billCount > 0) {
                    msg += lang.value === 'zh' 
                        ? ' 为 ' + billCount + ' 个项目生成初始账单；'
                        : ' Generate initial bills for ' + billCount + ' items;';
                }
                if (channelCount > 0) {
                    msg += lang.value === 'zh'
                        ? ' 迁移 ' + channelCount + ' 个旧版通知渠道。'
                        : ' Migrate ' + channelCount + ' legacy channels.';
                }
                msg += lang.value === 'zh' ? ' 是否继续？' : ' Continue?';
                
                await ElMessageBox.confirm(
                    msg,
                    lang.value === 'zh' ? '确认数据迁移' : 'Confirm Migration',
                    { type: 'warning', confirmButtonText: t('yes'), cancelButtonText: t('no') }
                );
            }
            
            // 4. 执行账单迁移
            itemsToMigrate.forEach(item => {
                const startDate = item.lastRenewDate;
                let endDate = startDate;
                
                if (item.useLunar && typeof LUNAR !== 'undefined' && typeof frontendCalc !== 'undefined') {
                    const d = parseYMD(startDate);
                    const l = LUNAR.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
                    if (l) {
                        const nextL = frontendCalc.addPeriod(l, Number(item.intervalDays), item.cycleUnit || 'day');
                        const nextS = frontendCalc.l2s(nextL);
                        endDate = `${nextS.year}-${nextS.month.toString().padStart(2, '0')}-${nextS.day.toString().padStart(2, '0')}`;
                    }
                } else {
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
            });

            // 5. 执行渠道迁移
            const migratedNames = [];
            if (channelCount > 0) {
                if (!settings.value.channels) settings.value.channels = [];
                channelsToMigrate.forEach(c => {
                    settings.value.channels.push({
                        id: crypto.randomUUID(),
                        type: c.type, name: c.name, config: c.config, enable: c.enable
                    });
                    migratedNames.push(c.name);
                });
                delete settings.value.notifyConfig;
                delete settings.value.enabledChannels;
                if (settingsVisible.value) {
                    settingsForm.value = JSON.parse(JSON.stringify(settings.value));
                }
            }
            
            // 6. 保存并显示报告
            await saveData(null, settings.value, false);
            tableKey.value++;
            
            const details = [];
            if (billCount > 0) details.push(lang.value === 'zh' ? `- 生成 ${billCount} 个初始账单` : `- Generated ${billCount} initial bills`);
            if (channelCount > 0) details.push(lang.value === 'zh' ? `- 迁移 ${channelCount} 个通知渠道: ${migratedNames.join(', ')}` : `- Migrated ${channelCount} channels: ${migratedNames.join(', ')}`);
            if (channelCount > 0) details.push(lang.value === 'zh' ? `- 已清理旧版通知配置` : `- Cleaned up legacy config`);
            
            ElMessageBox.alert(
                details.join('<br>'),
                lang.value === 'zh' ? '迁移报告' : 'Migration Report',
                { dangerouslyUseHTMLString: true, type: 'success' }
            );
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
    const usingFallbackRates = ref(false);

    const fetchExchangeRates = async (baseCurrency) => {
        if (!baseCurrency) baseCurrency = 'CNY';
        const cacheKey = 'renew_ex_rates_' + baseCurrency;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const p = JSON.parse(cached);
                if (Date.now() - p.ts < 86400000) { // 24 hours cache
                    exchangeRates.value = p.data;
                    usingFallbackRates.value = p.isFallback || false; // Restore fallback state from cache if possible, or assume false
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
                usingFallbackRates.value = false;
                localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: rates, isFallback: false }));
            } else { throw new Error('API returns ' + res.status); }
        } catch (e) { 
            console.error('Failed to fetch exchange rates:', e);
            // 兜底逻辑
            const baseRate = FALLBACK_RATES[baseCurrency];
            if (baseCurrency === FALLBACK_BASE || baseRate) {
                const newRates = {};
                // 如果请求的基准就是默认基准，直接使用
                if (baseCurrency === FALLBACK_BASE) {
                    Object.assign(newRates, FALLBACK_RATES);
                } 
                // 否则进行换算：Rate(X/Target) = Rate(X/Base) / Rate(Target/Base)
                else {
                    for (const [code, rate] of Object.entries(FALLBACK_RATES)) {
                        newRates[code] = rate / baseRate;
                    }
                }
                exchangeRates.value = newRates;
                usingFallbackRates.value = true;
                // Cache fallback rates too to avoid annoying retries, but maybe with shorter TTL? Keeping same for now.
                localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: newRates, isFallback: true }));
                // ElMessage removed as per user request
            }
        }
        ratesLoading.value = false;
    };

    // Compute current item info for Renew Dialog display
    const currentRenewItem = computed(() => {
        if (!renewForm.value.id) return {};
        return list.value.find(i => i.id === renewForm.value.id) || {};
    });

    const openRenew = (row) => {
        // Helper: 格式化日期 (YYYY-MM-DD)
        const formatDate = (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        // Helper: 格式化日期时间 (YYYY-MM-DD HH:mm:ss)
        const formatDateTime = (d) => `${formatDate(d)} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

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
                    end = `${nextS.year}-${nextS.month.toString().padStart(2, '0')}-${nextS.day.toString().padStart(2, '0')}`;
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
        const rates = exchangeRates.value || {};
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

    const tagScrollbar = ref(null);
    const scrollTags = (direction) => {
        if (!tagScrollbar.value) return;
        const wrap = tagScrollbar.value.wrapRef;
        if (wrap) {
            const scrollAmount = 150;
            wrap.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
        }
    };
    
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
    const getChannelTagClass = (type) => {
        const map = {
            telegram: 'text-blue-500 border-blue-500',
            bark: 'text-red-500 border-red-500',
            pushplus: 'text-emerald-500 border-emerald-500',
            notifyx: 'text-purple-500 border-purple-500',
            gotify: 'text-cyan-500 border-cyan-500',
            ntfy: 'text-teal-500 border-teal-500',
            resend: 'text-indigo-500 border-indigo-500',
            webhook: 'text-amber-500 border-amber-500',
            serverchan3: 'text-green-500 border-green-500',
            dingtalk: 'text-sky-500 border-sky-500'
        };
        return map[type] || 'text-slate-500 border-slate-500';
    };
    const openLink = (url) => { if(url) window.open(url, '_blank'); };
</script>
<template>
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
                        <div class="text-blue-600 text-xs font-bold font-mono mb-2 tracking-widest flex items-center gap-2">
                            {{ t('totalServices') }}
                        </div>
                        <div class="flex items-baseline gap-3">
                            <div class="text-5xl font-black font-mono text-textMain">{{ list.length }}</div>
                            <div class="text-xs font-bold font-mono text-blue-600/60 flex items-center gap-1.5" v-if="list.length > 0">
                                ≈ {{ totalAmount }} {{ settings.defaultCurrency || 'CNY' }}
                                <el-tooltip v-if="usingFallbackRates !== undefined" :content="usingFallbackRates ? (lang==='zh'?'默认汇率':'Fallback Rate') : (lang==='zh'?'实时汇率':'Realtime Rate')" placement="top" :hide-after="0" :enterable="false">
                                    <div class="flex items-center">
                                        <el-icon :style="{ color: usingFallbackRates ? '#f59e0b' : '#10b981' }" class="cursor-help text-sm opacity-80 hover:opacity-100 transition-opacity"><component :is="usingFallbackRates ? WarningFilled : SuccessFilled" /></el-icon>
                                    </div>
                                </el-tooltip>
                            </div>
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
                            <button @click="currentView = 'project'" :class="['flex-1 px-4 py-2 rounded text-xs font-mono font-bold transition-all text-center justify-center cursor-pointer', currentView === 'project' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white']">
                                {{ t('viewProjects') }}
                            </button>
                            <button @click="currentView = 'spending'" :class="['flex-1 px-4 py-2 rounded text-xs font-mono font-bold transition-all text-center justify-center cursor-pointer', currentView === 'spending' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white']">
                                {{ t('viewSpending') }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Project View -->
                <template v-if="currentView === 'project'">

                <div class="filter-row" v-if="list.length > 0">
                    <div class="search-box"><el-input v-model="searchKeyword" :placeholder="t('searchPlaceholder')" clearable :prefix-icon="Search"></el-input></div>
                    <div class="filter-bar-wrapper" v-if="allTags.length > 0">
                        <!-- Fixed Tags -->
                        <div class="fixed-tags">
                            <div class="filter-chip" :class="{active:currentTag===''}" @click="currentTag=''">{{ t('tagAll') }}<div v-if="currentTag===''" class="chip-active-bar"></div></div>
                            <div class="filter-chip" :class="{active:currentTag==='DISABLED'}" @click="currentTag='DISABLED'">{{ t('disabledFilter') }}<span class="tag-count-badge">{{ disabledCount }}</span><div v-if="currentTag==='DISABLED'" class="chip-active-bar"></div></div>
                        </div>

                        <!-- Scrollable Tags -->
                        <div class="scroll-tags">
                            <el-scrollbar ref="tagScrollbar" class="tag-scrollbar" view-class="filter-bar-view" wrap-class="tag-scroll-wrap" :wrap-style="[{'scrollbar-width':'none', '-ms-overflow-style':'none', 'padding-bottom':'0'}]">
                                <div class="flex gap-2">
                                    <div class="filter-chip" v-for="tag in allTags" :key="tag" :class="{active:currentTag===tag}" @click="currentTag=tag">{{ tag }} <span class="tag-count-badge">{{ getTagCount(tag) }}</span><div v-if="currentTag===tag" class="chip-active-bar"></div></div>
                                </div>
                            </el-scrollbar>
                        </div>
                        
                        <!-- Scroll Controls -->
                         <div class="scroll-controls">
                            <div class="btn-scroll" @click="scrollTags(-1)">
                                <el-icon><Arrow-Left /></el-icon>
                            </div>
                            <div class="btn-scroll" @click="scrollTags(1)">
                                <el-icon><Arrow-Right /></el-icon>
                            </div>
                        </div>
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
                <div class="font-mono text-textDim text-sm font-bold">{{ scope.row.lastRenewDate ? scope.row.lastRenewDate.replace(/s+/g, '').replace(/(d{4}-d{2}-d{2}).*/, '$1') : '' }}</div>
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
                            </template>
                        </el-popconfirm>
                        </div>
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
                                 <button @click="spendingMode='bill'" :class="['px-3 py-1 text-xs font-mono rounded transition-all cursor-pointer', spendingMode==='bill' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white']">{{ t('billAmount') }}</button>
                                 <button @click="spendingMode='op'" :class="['px-3 py-1 text-xs font-mono rounded transition-all cursor-pointer', spendingMode==='op' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white']">{{ t('opSpending') }}</button>
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
                                          class="flex justify-between items-center p-3 rounded bg-gray-50 dark:bg-slate-800/50 text-sm mb-1">
                                          <div class="flex flex-col overflow-hidden mr-2">
                                              <div class="flex items-center gap-2">
                                                  <span class="font-mono truncate font-bold text-slate-700 dark:text-slate-300">{{ item.name }}</span>
                                                  <span v-if="item.isProjected" class="text-[10px] px-1.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">{{ t('predictedTag') }}</span>
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

                </template>
                <!-- End Spending View -->

                <div class="mt-8 py-6 text-center border-t border-slate-200/60">
                    <p class="text-[10px] text-gray-400 font-mono tracking-[0.2em] uppercase flex justify-center items-center gap-1">
                        &copy; 2025-2026 <a href="https://github.com/ieax/renewhelper" target="_blank" class="font-bold text-slate-600 hover:text-blue-600 transition-colors border-b border-dashed border-slate-300 hover:border-blue-600 pb-0.5 mx-1 decoration-0">RenewHelper</a>
                        <span class="text-blue-500 font-bold">${APP_VERSION}</span>
                        <el-tag v-if="hasNewVersion" type="success" size="small" effect="plain" class="ml-1 cursor-pointer !bg-transparent !px-1 !h-4 !text-[9px] !leading-none !tracking-normal !font-bold" @click="openLink('https://github.com/ieax/renewhelper/releases')">NEW v{{ newVersionCode }}</el-tag>
                        <span class="mx-2 opacity-30">|</span>DESIGNED BY <span class="font-bold text-slate-600">LOSTFREE</span>
                    </p>
                </div>                  
            </div>

            <el-dialog v-model="dialogVisible" :title="isEdit?t('editService'):t('newService')" width="680px" align-center class="!rounded-none mecha-panel" style="clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);">
                <el-form :model="form" label-position="top">
                    <el-form-item :label="t('formName')"><el-input v-model="form.name" size="large"><template #prefix><el-icon><Monitor/></el-icon></template></el-input></el-form-item>
                    <el-form-item :label="t('tags')"><el-select v-model="form.tags" multiple filterable allow-create default-first-option :reserve-keyword="false" :placeholder="t('tagPlaceholder')" style="width:100%" size="large"><el-option v-for="tag in allTags" :key="tag" :label="tag" :value="tag"></el-option></el-select></el-form-item>
                    
                    <!-- NEW Channel Selection -->
                    <el-form-item :label="t('selectChannels')">
                        <el-select v-model="form.notifyChannelIds" multiple filterable style="width:100%" size="large" :placeholder="t('selectChannels')">
                            <el-option v-for="ch in (settings.channels || [])" :key="ch.id" :label="ch.name" :value="ch.id">
                                <span style="float: left">{{ ch.name }}</span>
                                <span style="float: right; color: #8492a6; font-size: 13px">{{ ch.type }}</span>
                            </el-option>
                        </el-select>
                    </el-form-item>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <el-form-item :label="t('fixedPrice')" class="!mb-0"><el-input-number v-model="form.fixedPrice" :min="0" :precision="2" class="!w-full" controls-position="right"></el-input-number></el-form-item>
                        <el-form-item :label="t('currency')" class="!mb-0"><el-select v-model="form.currency" filterable class="!w-full"><el-option v-for="c in currencyList" :key="c" :label="c" :value="c"></el-option></el-select></el-form-item>
                    </div>

                    <div class="flex flex-col sm:flex-row items-end gap-4 mb-4">
                        <el-form-item :label="t('formType')" class="!mb-0 flex-1 w-full"><div class="radio-group-fix" :style="{opacity:isEdit?0.6:1, pointerEvents:isEdit?'none':'auto'}"><div class="radio-item" :class="{active:form.type==='cycle'}" @click="!isEdit && (form.type='cycle')">📅 {{ t('cycle') }}</div><div class="radio-item" :class="{active:form.type==='reset'}" @click="!isEdit && (form.type='reset')">⏳ {{ t('reset') }}</div></div></el-form-item>
                        <div class="w-px h-8 bg-slate-300 hidden sm:block mb-1"></div>
                        <el-form-item :label="t('interval')" class="!mb-0 w-48">
                            <el-input v-model.number="form.intervalDays" type="number" :min="1" :disabled="isEdit">
                                <template #append>
                                    <el-select v-model="form.cycleUnit" style="width:80px" :teleported="false" :disabled="isEdit">
                                        <el-option :label="t('unit.day')" value="day"></el-option>
                                        <el-option :label="t('unit.month')" value="month"></el-option>
                                        <el-option :label="t('unit.year')" value="year"></el-option>
                                    </el-select>
                                </template>
                            </el-input>
                        </el-form-item>
                        <div class="w-px h-8 bg-slate-300 hidden sm:block mb-1"></div>
                        <el-form-item :label="t('useLunar')" class="!mb-0"><el-switch v-model="form.useLunar" style="--el-switch-on-color:#2563eb;" :disabled="isEdit"></el-switch></el-form-item>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <el-form-item class="!mb-0">
                            <template #label><div class="flex items-center gap-2"><span>{{ t('createDate') }}</span><span v-if="form.useLunar && form.createDate" class="text-[12px] font-bold text-purple-600 font-mono ml-1">{{ getLunarStr(form.createDate).replace('农历: ','') }}</span></div></template>
                            <el-date-picker v-if="form.useLunar" v-model="form.createDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" :disabled="isEdit" popper-class="lunar-popper"><template #default="c"><div class="lunar-cell"><el-tooltip :content="getLunarTooltip(c)" placement="top" :hide-after="0" :enterable="false"><div class="view-date"><span class="solar font-bold">{{c.text}}</span><span class="lunar">{{getSmartLunarText(c)}}</span></div></el-tooltip><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span><span class="y-ganzhi">{{getYearGanZhi(c.text)}}</span></div></div></template></el-date-picker>
                            <el-date-picker v-else v-model="form.createDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" :disabled="isEdit" popper-class="lunar-popper"><template #default="c"><div class="lunar-cell"><div class="view-date"><span class="solar font-bold">{{c.text}}</span></div><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span></div></div></template></el-date-picker>
                        </el-form-item>
                        <el-form-item class="!mb-0">
                            <template #label><div class="flex items-center gap-2"><span>{{ t('lastRenew') }}</span><span v-if="form.useLunar && form.lastRenewDate" class="text-[12px] font-bold text-purple-600 font-mono ml-1">{{ getLunarStr(form.lastRenewDate).replace('农历: ','') }}</span></div></template>
                            <el-date-picker v-if="form.useLunar" v-model="form.lastRenewDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" popper-class="lunar-popper" :disabled="isEdit"><template #default="c"><div class="lunar-cell"><el-tooltip :content="getLunarTooltip(c)" placement="top" :hide-after="0" :enterable="false"><div class="view-date"><span class="solar font-bold">{{c.text}}</span><span class="lunar">{{getSmartLunarText(c)}}</span></div></el-tooltip><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span><span class="y-ganzhi">{{getYearGanZhi(c.text)}}</span></div></div></template></el-date-picker>
                            <el-date-picker v-else v-model="form.lastRenewDate" type="date" value-format="YYYY-MM-DD" style="width:100%" class="!w-full" popper-class="lunar-popper" :disabled="isEdit"><template #default="c"><div class="lunar-cell"><div class="view-date"><span class="solar font-bold">{{c.text}}</span></div><div class="view-month">{{getMonthStr(c.text)}}</div><div class="view-year"><span class="y-num">{{c.text}}</span></div></div></template></el-date-picker>
                            <div v-if="isEdit" class="text-[10px] text-gray-400 mt-1 dark:text-gray-500 flex items-center gap-1"><el-icon><InfoFilled /></el-icon>{{ t('editLastRenewHint') }}</div>
                        </el-form-item>
                    </div>

                    <div v-if="previewData && !isEdit" class="relative mb-4 overflow-hidden rounded-sm border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 shadow-sm group">
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
            
            <el-dialog v-model="settingsVisible" :title="t('settingsTitle')" width="800px" align-center class="mecha-panel !rounded-none settings-body-fix" style="clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);" :show-close="true">
                <div class="flex h-[550px] text-left border-t border-slate-100 dark:border-slate-800">
                    <!-- Sidebar -->
                    <div class="w-12 sm:w-28 bg-gray-50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-slate-800 flex flex-col pt-4 shrink-0 transition-all duration-300">
                         <div 
                            v-for="tab in ['pref', 'notify', 'calendar', 'data']" 
                            :key="tab"
                            class="px-2 sm:px-3 py-3 cursor-pointer text-xs font-medium transition-colors border-l-2 flex items-center justify-center sm:justify-start gap-2"
                            :class="activeTab === tab ? 'bg-white dark:bg-slate-800 text-blue-600 border-blue-600' : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-gray-100 dark:hover:bg-slate-800/50'"
                            @click="activeTab = tab"
                         >
                                <el-icon v-if="tab==='pref'"><Setting /></el-icon>
                                <el-icon v-else-if="tab==='notify'"><Bell /></el-icon>
                                <el-icon v-else-if="tab==='calendar'"><Calendar /></el-icon>
                                <el-icon v-else><Files /></el-icon>
                                <span class="hidden sm:block">
                                    {{ tab === 'pref' ? (lang==='zh'?'偏好设置':'Preferences') : 
                                       tab === 'notify' ? (lang==='zh'?'通知配置':'Notifications') :
                                       tab === 'calendar' ? (lang==='zh'?'日历订阅':'Calendar') :
                                       (lang==='zh'?'数据管理':'Data')
                                    }}
                                </span>
                             </div>
                        </div>
    
                        <!-- Content Area -->
                        <div class="flex-1 bg-white dark:bg-slate-900 flex flex-col h-full relative min-w-0 scrollbar-thin overflow-y-auto">
                             <div class="flex-1 p-4">
                                 <!-- 1. Preferences -->
                                 <div v-if="activeTab === 'pref'" class="space-y-4">
                                      <h3 class="text-base font-bold text-slate-800 dark:text-gray-100 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                                          {{ lang==='zh'?'偏好设置':'Preferences' }}
                                      </h3>
                                      <el-form :model="settingsForm" label-position="top">
                                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                              <el-form-item :label="t('timezone')">
                                                  <el-select v-model="settingsForm.timezone" style="width:100%" filterable placeholder="Select Timezone">
                                                      <el-option v-for="item in timezoneList" :key="item.value" :label="item.label" :value="item.value"></el-option>
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

                             <!-- 2. Notifications -->
                             <div v-if="activeTab === 'notify'" class="space-y-4">
                                  <h3 class="text-base font-bold text-slate-800 dark:text-gray-100 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">{{ lang==='zh'?'通知配置':'Notifications' }}</h3>
                                  
                                  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 p-3 bg-blue-50 dark:bg-slate-800/50 rounded-lg">
                                      <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ t('pushSwitch') }}</span>
                                      <el-switch v-model="settingsForm.enableNotify" style="--el-switch-on-color:#2563eb;"></el-switch>
                                      <div v-if="settingsForm.enableNotify" class="w-full sm:w-auto sm:ml-auto flex items-center gap-2 border-t border-blue-100 dark:border-slate-700 sm:border-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                                          <span class="text-xs text-gray-500 whitespace-nowrap">{{ t('lblPushTitle') || 'Title' }}</span>
                                          <el-input v-model="settingsForm.notifyTitle" :placeholder="t('pushTitle')" size="small" class="!w-full sm:!w-48"></el-input>
                                      </div>
                                  </div>
                                  
                                  <div v-if="settingsForm.enableNotify">
                                      <div class="flex items-center justify-between mb-4">
                                          <div class="text-sm font-bold text-gray-600 dark:text-gray-400">{{ lang==='zh'?'渠道配置':'Channel Config' }}</div>
                                          <el-button type="primary" link @click="openAddChannel" :icon="Plus">{{ t('addChannel') }}</el-button>
                                      </div>

                                      <div v-if="!settingsForm.channels || settingsForm.channels.length === 0" class="text-center text-gray-400 text-sm py-8 border border-dashed rounded-lg bg-gray-50 dark:bg-slate-800/30">
                                          {{ t('noChannels') }}
                                      </div>

                                      <div v-else class="border border-gray-100 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col">
                                          <div>
                                              <div v-for="(ch, idx) in pagedChannels" :key="ch.id" class="p-3 border-b border-gray-100 dark:border-slate-700 last:border-0 bg-white dark:bg-slate-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group">
                                                  <!-- Left: Icon + Info -->
                                                  <div class="flex items-center gap-3 overflow-hidden">
                                                      <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 text-base transition-all duration-300 relative" :class="{'grayscale opacity-50': !ch.enable}">
                                                          <el-icon v-if="ch.type==='telegram'"><Promotion /></el-icon>
                                                          <el-icon v-else-if="ch.type==='bark'"><Iphone /></el-icon>
                                                          <el-icon v-else-if="ch.type==='pushplus'"><Comment /></el-icon>
                                                          <el-icon v-else-if="ch.type==='notifyx'"><Notification /></el-icon>
                                                          <el-icon v-else-if="ch.type==='gotify'"><Bell /></el-icon>
                                                          <el-icon v-else-if="ch.type==='ntfy'"><Position /></el-icon>
                                                          <el-icon v-else-if="ch.type==='resend'"><Message /></el-icon>
                                                          <el-icon v-else-if="ch.type==='resend'"><Message /></el-icon>
                                                          <el-icon v-else-if="ch.type==='serverchan3'"><ServerChan3 /></el-icon>
                                                          <el-icon v-else-if="ch.type==='dingtalk'"><DingTalk /></el-icon>
                                                          <el-icon v-else><Connection /></el-icon>
                                                          
                                                          <!-- Status Dot -->
                                                          <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800" :class="ch.enable ? 'bg-green-500' : 'bg-gray-400'"></span>
                                                      </div>
                                                      <div class="flex flex-col">
                                                          <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                              <span class="font-bold text-sm text-slate-700 dark:text-gray-200" :class="{'text-gray-400 dark:text-gray-600': !ch.enable}">{{ ch.name }}</span>
                                                              <span class="text-[10px] px-1.5 py-0.5 rounded-sm bg-transparent font-mono uppercase border self-start sm:self-auto" :class="[{'opacity-60': !ch.enable}, getChannelTagClass(ch.type)]">{{ ch.type }}</span>
                                                          </div>
                                                      </div>
                                                  </div>

                                                  <!-- Right: Actions -->
                                                  <div class="flex items-center gap-3 shrink-0">
                                                      <el-switch v-model="ch.enable" size="small" style="--el-switch-on-color:#3b82f6;"></el-switch>
                                                      
                                                      <!-- Desktop Actions -->
                                                      <div class="hidden sm:flex items-center gap-0">
                                                          <el-tooltip :content="t('btnTest')" placement="top" :show-after="500">
                                                              <el-button link type="primary" :icon="VideoPlay" @click="testChannel(ch)" class="!px-1.5"></el-button>
                                                          </el-tooltip>
                                                          <el-tooltip :content="t('modify')" placement="top" :show-after="500">
                                                              <el-button link type="primary" :icon="Edit" @click="openEditChannel(settingsForm.channels.findIndex(c=>c.id===ch.id))" class="!px-1.5"></el-button>
                                                          </el-tooltip>
                                                          <el-tooltip :content="t('tipDeleteCh')" placement="top" :show-after="500">
                                                              <el-button link type="danger" :icon="Delete" @click="deleteChannelById(ch.id)" class="!px-1.5"></el-button>
                                                          </el-tooltip>
                                                      </div>
                                                      
                                                      <!-- Mobile Actions (Dropdown) -->
                                                      <div class="flex sm:hidden">
                                                          <el-dropdown trigger="click" placement="bottom-end">
                                                              <el-button link type="primary" :icon="More" class="!px-1"></el-button>
                                                              <template #dropdown>
                                                                <el-dropdown-menu>
                                                                  <el-dropdown-item :icon="VideoPlay" @click="testChannel(ch)">{{ t('btnTest') }}</el-dropdown-item>
                                                                  <el-dropdown-item :icon="Edit" @click="openEditChannel(settingsForm.channels.findIndex(c=>c.id===ch.id))">{{ t('modify') }}</el-dropdown-item>
                                                                  <el-dropdown-item :icon="Delete" divided @click="deleteChannelById(ch.id)" class="!text-red-500">{{ t('tipDeleteCh') }}</el-dropdown-item>
                                                                </el-dropdown-menu>
                                                              </template>
                                                          </el-dropdown>
                                                      </div>
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          <!-- Load More -->
                                          <div v-if="settingsForm.channels && settingsForm.channels.length > channelLimit" class="text-center py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" @click="loadMoreChannels">
                                              <span class="text-xs text-blue-500 font-bold">{{ lang === 'zh' ? '加载更多...' : 'Load More...' }}</span>
                                          </div>
                                      </div>
                                  </div>
                             </div>
                             
                             <!-- 3. Calendar -->
                             <div v-if="activeTab === 'calendar'">
                                  <h3 class="text-base font-bold text-slate-800 dark:text-gray-100 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">{{ lang==='zh'?'日历订阅':'Calendar Subscription' }}</h3>
                                  
                                  <div class="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                                      <div class="flex justify-between items-center mb-3">
                                          <span class="text-sm font-bold text-gray-700 dark:text-gray-300">{{ t('lblIcsUrl') }}</span>
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
                                      <div class="mt-4 text-xs text-gray-400 leading-relaxed">
                                          {{ lang==='zh' ? '您可以将此链接添加到各类日历软件（如 Google Calendar, iOS Calendar）中，以订阅您的续费提醒事项。' : 'Subscribe to this URL in calendar apps (Google Calendar, iOS) to sync renewable events.' }}
                                      </div>
                                  </div>
                             </div>

                             <!-- 4. Data -->
                             <div v-if="activeTab === 'data'">
                                  <h3 class="text-base font-bold text-slate-800 dark:text-gray-100 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">{{ lang==='zh'?'数据管理':'Data Management' }}</h3>
                                  
                                  <div class="space-y-3">
                                      <div class="p-3 border border-gray-100 dark:border-slate-700 rounded-lg">
                                          <div class="font-bold text-slate-700 dark:text-gray-200">{{ lang==='zh'?'备份密钥':'Backup Key' }}</div>
                                          <el-input v-model="settingsForm.backupKey" :placeholder="lang==='zh'?'至少8位，包含字母和数字 (留空不启用)' : 'Min 8 chars, Alphanumeric (Optional)'" show-password type="password">
                                              <template #prefix><el-icon><Lock /></el-icon></template>
                                          </el-input>
                                          <div class="text-[10px] text-gray-400 mt-1">{{ lang==='zh'?'用于 /api/backup 接口的专用访问密钥，配置后可替代 JWT Token 使用。' : 'Dedicated key for /api/backup, can be used instead of JWT Token.' }}</div>
                                      </div>

                                      <div class="p-3 border border-gray-100 dark:border-slate-700 rounded-lg flex items-center justify-between">
                                          <div>
                                              <div class="font-bold text-slate-700 dark:text-gray-200">{{ t('btnExport') }}</div>
                                              <div class="text-xs text-gray-400 mt-1">{{ lang==='zh'?'导出所有数据和配置为 JSON 文件':'Export all data and settings as JSON' }}</div>
                                          </div>
                                          <el-button type="success" plain :icon="Download" @click="exportData">{{ lang==='zh'?'导出':'Export' }}</el-button>
                                      </div>
                                      
                                      <div class="p-3 border border-gray-100 dark:border-slate-700 rounded-lg flex items-center justify-between">
                                          <div>
                                              <div class="font-bold text-slate-700 dark:text-gray-200">{{ t('btnImport') }}</div>
                                              <div class="text-xs text-gray-400 mt-1">{{ lang==='zh'?'从 JSON 文件恢复数据':'Restore data from JSON file' }}</div>
                                          </div>
                                          <div>
                                              <el-button type="warning" plain :icon="Upload" @click="triggerImport">{{ lang==='zh'?'导入':'Import' }}</el-button>
                                              <input type="file" ref="importRef" style="display:none" accept=".json" @change="handleImportFile">
                                          </div>
                                      </div>
                                      
                                      <div class="p-3 border border-gray-100 dark:border-slate-700 rounded-lg flex items-center justify-between bg-gray-50 dark:bg-slate-800/30">
                                          <div>
                                              <div class="font-bold text-slate-700 dark:text-gray-200">{{ lang==='zh'?'数据迁移':'Migration' }}</div>
                                              <div class="text-xs text-gray-400 mt-1">{{ lang==='zh'?'迁移旧版账单与通知渠道配置':'Migrate legacy bills & channels' }}</div>
                                          </div>
                                          <el-button type="info" plain :icon="Sort" @click="migrateOldData">
                                              {{ lang === 'zh' ? '迁移' : 'Migrate' }}
                                          </el-button>
                                      </div>
                                  </div>
                             </div>
                         </div>
                         
                         <!-- Footer Actions (Save) -->
                         <div class="p-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
                               <el-button @click="settingsVisible=false">{{ t('cancel') }}</el-button>
                               <el-button type="primary" @click="saveSettings">{{ t('saveSettings') }}</el-button>
                         </div>
                    </div>
                </div>
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

            <!-- Channel Edit Dialog -->
            <el-dialog v-model="channelDialogVisible" :title="channelForm.id ? t('modifyChannel') : t('addChannel')" width="500px" align-center class="mecha-panel">
                <el-form :model="channelForm" label-position="top">
                    <!-- Type Selection (Only for new) -->
                    <el-form-item :label="t('channelType')" v-if="!channelForm.id">
                        <el-select v-model="channelForm.type" style="width:100%" filterable @change="onChannelTypeChange">
                            <el-option v-for="type in channelTypes" :key="type" :label="type" :value="type"></el-option>
                        </el-select>
                    </el-form-item>
                    
                    <el-form-item :label="t('channelName')">
                        <el-input v-model="channelForm.name" :placeholder="t('namePlaceholder')"></el-input>
                    </el-form-item>

                    <!-- Dynamic Config Fields -->
                    <div v-if="channelForm.type === 'telegram'" class="space-y-3">
                        <el-form-item :label="t('lblToken')"><el-input v-model="channelForm.config.token"></el-input></el-form-item>
                        <el-form-item :label="t('lblChatId')"><el-input v-model="channelForm.config.chatId"></el-input></el-form-item>
                        <el-form-item :label="t('lblServer')"><el-input v-model="channelForm.config.apiServer" placeholder="Optional"></el-input></el-form-item>
                    </div>
                    <div v-else-if="channelForm.type === 'bark'" class="space-y-3">
                        <el-form-item :label="t('lblServer')"><el-input v-model="channelForm.config.server"></el-input></el-form-item>
                        <el-form-item :label="t('lblDevKey')"><el-input v-model="channelForm.config.key"></el-input></el-form-item>
                    </div>
                    <div v-else-if="channelForm.type === 'pushplus'">
                        <el-form-item :label="t('lblToken')"><el-input v-model="channelForm.config.token"></el-input></el-form-item>
                    </div>
                    <div v-else-if="channelForm.type === 'notifyx'">
                        <el-form-item :label="t('lblApiKey')"><el-input v-model="channelForm.config.apiKey"></el-input></el-form-item>
                    </div>
                    <div v-else-if="channelForm.type === 'gotify'" class="space-y-3">
                        <el-form-item :label="t('lblServer')"><el-input v-model="channelForm.config.server"></el-input></el-form-item>
                        <el-form-item :label="t('lblToken')"><el-input v-model="channelForm.config.token"></el-input></el-form-item>
                    </div>
                    <div v-else-if="channelForm.type === 'ntfy'" class="space-y-3">
                        <el-form-item :label="t('lblServer')"><el-input v-model="channelForm.config.server"></el-input></el-form-item>
                        <el-form-item :label="t('lblTopic')"><el-input v-model="channelForm.config.topic"></el-input></el-form-item>
                        <el-form-item :label="t('lblToken')"><el-input v-model="channelForm.config.token"></el-input></el-form-item>
                    </div>
                    <div v-else-if="channelForm.type === 'serverchan3'" class="space-y-3">
                        <el-form-item :label="t('lblUid')"><el-input v-model="channelForm.config.uid"></el-input></el-form-item>
                        <el-form-item :label="t('lblSendKey')"><el-input v-model="channelForm.config.key"></el-input></el-form-item>
                    </div>
                    <div v-else-if="channelForm.type === 'dingtalk'" class="space-y-3">
                        <el-form-item :label="t('lblToken')"><el-input v-model="channelForm.config.token" placeholder="access_token"></el-input></el-form-item>
                        <el-form-item :label="t('lblSecret')"><el-input v-model="channelForm.config.secret" placeholder="SEC... (Optional)"></el-input></el-form-item>
                    </div>
                    <div v-else-if="channelForm.type === 'resend'" class="space-y-3">
                        <el-form-item :label="t('lblApiKey')"><el-input v-model="channelForm.config.apiKey"></el-input></el-form-item>
                        <el-form-item :label="t('lblFrom')"><el-input v-model="channelForm.config.from"></el-input></el-form-item>
                        <el-form-item :label="t('lblTo')"><el-input v-model="channelForm.config.to"></el-input></el-form-item>
                    </div>
                    <div v-else-if="channelForm.type === 'webhook'" class="space-y-3">
                         <el-form-item :label="t('pushUrl')"><el-input v-model="channelForm.config.url"></el-input></el-form-item>
                         <el-form-item :label="t('lblHeaders')"><el-input v-model="channelForm.config.headers" type="textarea" :rows="2"></el-input></el-form-item>
                         <el-form-item :label="t('lblBody')"><el-input v-model="channelForm.config.body" type="textarea" :rows="3" placeholder="{title} {body}"></el-input></el-form-item>
                    </div>
                </el-form>
                <template #footer>
                    <div class="flex justify-between w-full">
                        <el-button type="warning" plain @click="testCurrentChannel" :icon="VideoPlay">{{ t('btnTest') }}</el-button>
                        <div>
                            <el-button @click="channelDialogVisible=false">{{t('cancel')}}</el-button>
                            <el-button type="primary" @click="saveChannel">{{t('yes')}}</el-button>
                        </div>
                    </div>
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
</template>
<style>
@import './styles/main.css';

/* Spending View 动画样式 */
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
