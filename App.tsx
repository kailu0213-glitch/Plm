import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  LayoutDashboard, Clock, AlertCircle, Plus, Search, Zap, CheckCircle2, TrendingUp, X, Trash2, 
  Edit3, Calendar, UserCircle2, ChevronRight, Layers, Box, Factory, PlusCircle, Target, 
  PauseCircle, PlayCircle, Eye, EyeOff, Settings2, Wrench, Microscope, ZapOff, RotateCcw, 
  Mail, Loader2, Bell, Activity, Sparkles, ClipboardList, RefreshCw, Users, Briefcase, 
  Battery, LogOut, FileSpreadsheet, Download, UserPlus, Key, Flag, Table, FileDown, 
  FileUp, CalendarDays, ShieldAlert, StickyNote, PlusSquare, GanttChartSquare, Cloud, Check,
  Info, ListChecks, AlertTriangle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { Task, TaskStatus, TaskStatusLabels, Priority, PriorityLabels, MoldTrial } from './types';
import { STATUS_COLORS } from './constants';
import { getAIInsights, getTrialImprovementAI } from './services/geminiService';

// --- Constants ---
const STORAGE_KEYS = {
  TASKS: 'MOLD_PLM_TASKS',
  MEMBERS: 'MOLD_PLM_MEMBERS',
  USER: 'MOLD_PLM_AUTH_USER',
  SENDER_EMAIL: 'MOLD_PLM_SENDER_EMAIL'
};

const MOLD_PHASES = ['模具設計', '模具組立', '模具試模', '模具量試'];

// --- Helper Functions ---
const getDateOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const checkDateRange = (dateStr: string, range: 'THIS_WEEK' | 'NEXT_WEEK' | 'NEXT_MONTH') => {
  const d = new Date(dateStr);
  const now = new Date();
  if (range === 'THIS_WEEK') {
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);
    return d >= startOfWeek && d <= endOfWeek;
  }
  if (range === 'NEXT_WEEK') {
    const startOfNext = new Date(now.setDate(now.getDate() - now.getDay() + 8));
    startOfNext.setHours(0,0,0,0);
    const endOfNext = new Date(startOfNext);
    endOfNext.setDate(startOfNext.getDate() + 6);
    return d >= startOfNext && d <= endOfNext;
  }
  if (range === 'NEXT_MONTH') {
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return d >= startOfNextMonth && d <= endOfNextMonth;
  }
  return true;
};

const INITIAL_MEMBERS = [
  { empId: 'M001', name: '趙主管', email: 'manager@moldplm.com', role: 'MANAGER' as const, password: '123456' },
  { empId: 'E001', name: '張建國', email: 'engineer@moldplm.com', role: 'ENGINEER' as const, password: '123456' },
  { empId: 'E002', name: '林師傅', email: 'lin@moldplm.com', role: 'ENGINEER' as const, password: '123456' },
  { empId: 'E003', name: '王工程師', email: 'wang@moldplm.com', role: 'ENGINEER' as const, password: '123456' },
  { empId: 'E004', name: '李技術員', email: 'lee@moldplm.com', role: 'ENGINEER' as const, password: '123456' },
];

const INITIAL_TASKS: Task[] = [
  { id: 'D-101', moldName: 'MOLD-A1', title: '3D 結構優化', description: '針對核心結構進行流道優化與冷卻系統重新佈置。', status: TaskStatus.DONE, priority: Priority.HIGH, assignee: '張建國', startDate: getDateOffset(-30), dueDate: getDateOffset(-20), progress: 100, tags: ['模具設計'], trials: [] },
  { id: 'A-102', moldName: 'MOLD-A1', title: '型腔粗加工', description: 'CNC 粗加工，預留 0.5mm 餘量。', status: TaskStatus.DONE, priority: Priority.MEDIUM, assignee: '林師傅', startDate: getDateOffset(-19), dueDate: getDateOffset(-10), progress: 100, tags: ['模具組立'], trials: [] },
  { id: 'T-103', moldName: 'MOLD-A1', title: 'T1 試模', description: '首次射出成型測試，檢查產品完整性。', status: TaskStatus.DONE, priority: Priority.HIGH, assignee: '王工程師', startDate: getDateOffset(-9), dueDate: getDateOffset(-5), progress: 100, tags: ['模具試模'], trials: [{ id: 'tr-1', version: 'T1', date: getDateOffset(-6), condition: '澆口冷料，流痕明顯，縮水嚴重', result: 'ADJUST' }] },
  { id: 'T-104', moldName: 'MOLD-A1', title: 'T2 修正試模', description: '針對 T1 問題進行修正後的再次驗證。', status: TaskStatus.REVIEW, priority: Priority.HIGH, assignee: '王工程師', startDate: getDateOffset(-4), dueDate: getDateOffset(2), progress: 95, tags: ['模具試模'], trials: [{ id: 'tr-2', version: 'T2', date: getDateOffset(-1), condition: '尺寸已達標，表面咬花需優化', result: 'PENDING' }] },
  { id: 'M-105', moldName: 'MOLD-A1', title: '量產準備', description: '模具表面處理與量產參數設定。', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: '趙主管', startDate: getDateOffset(5), dueDate: getDateOffset(15), progress: 0, tags: ['模具量試'], trials: [] },
  { id: 'D-201', moldName: 'MOLD-B2', title: '滑塊機構模擬', description: '進行滑塊機構的動態模擬。', status: TaskStatus.IN_PROGRESS, priority: Priority.CRITICAL, assignee: '張建國', startDate: getDateOffset(-5), dueDate: getDateOffset(5), progress: 45, tags: ['模具設計'], trials: [] },
  { id: 'A-202', moldName: 'MOLD-B2', title: '頂出系統組立', description: '安裝核心頂針。', status: TaskStatus.DELAYED, priority: Priority.CRITICAL, assignee: '林師傅', startDate: getDateOffset(-15), dueDate: getDateOffset(-1), progress: 30, tags: ['模具組立'], trials: [] },
];

// --- Memoized UI Components ---
const SidebarItem = memo(({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'}`}>
    <Icon size={18} />
    <span className="font-semibold text-sm tracking-wide text-left">{label}</span>
  </button>
));

const ProgressBar = memo(({ progress, status }: { progress: number, status: TaskStatus }) => {
  const statusKey = status as keyof typeof STATUS_COLORS;
  const bgColor = status === TaskStatus.DONE ? 'bg-emerald-500' : status === TaskStatus.DELAYED ? 'bg-rose-500' : status === TaskStatus.REVIEW ? 'bg-amber-500' : 'bg-indigo-500';
  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-1000 ${bgColor}`} style={{ width: `${progress}%` }} />
    </div>
  );
});

const PriorityBadge = memo(({ priority }: { priority: Priority }) => {
  const styles = {
    [Priority.LOW]: 'bg-slate-100 text-slate-500 border-slate-200',
    [Priority.MEDIUM]: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    [Priority.HIGH]: 'bg-orange-50 text-orange-600 border-orange-200',
    [Priority.CRITICAL]: 'bg-rose-50 text-rose-600 border-rose-200',
  };
  return <span className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[priority]}`}><Flag size={10} fill="currentColor" /><span>{PriorityLabels[priority]}級</span></span>;
});

const InfoRow = memo(({ label, value, icon: Icon, colorClass = "text-slate-700" }: any) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <div className="flex items-center space-x-2 text-slate-400"><Icon size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">{label}</span></div>
    <div className={`text-[11px] font-bold ${colorClass}`}>{value}</div>
  </div>
));

// --- Main App ---
const App: React.FC = () => {
  const [user, setUser] = useState<{ empId: string, name: string, role: 'MANAGER' | 'ENGINEER' } | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    return saved ? JSON.parse(saved) : null;
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });
  const [senderEmail, setSenderEmail] = useState(() => localStorage.getItem(STORAGE_KEYS.SENDER_EMAIL) || 'plm-noreply@moldcorp.com');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'timeline' | 'team' | 'excel' | 'settings'>('dashboard');
  const [loginForm, setLoginForm] = useState({ empId: 'M001', pass: '123456' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<{id: string, message: string}[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [boardFilter, setBoardFilter] = useState<TaskStatus | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Task>>({});
  const [trialFormData, setTrialFormData] = useState<Partial<MoldTrial>>({ version: 'T1', date: getDateOffset(0), result: 'PENDING' });
  const [showTrialForm, setShowTrialForm] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingTrialId, setIsAnalyzingTrialId] = useState<string | null>(null);

  // Filters for timeline
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [timelinePhaseFilter, setTimelinePhaseFilter] = useState<string | 'ALL'>('ALL');
  const [timelineTimeFilter, setTimelineTimeFilter] = useState<'ALL' | 'THIS_WEEK' | 'NEXT_WEEK' | 'NEXT_MONTH'>('ALL');

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    setIsSyncing(true);
    const t = setTimeout(() => setIsSyncing(false), 500);
    return () => clearTimeout(t);
  }, [tasks]);

  useEffect(() => localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members)), [members]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SENDER_EMAIL, senderEmail), [senderEmail]);
  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.USER);
  }, [user]);

  const addToast = useCallback((message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(p => [...p, { id, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const stats = useMemo(() => {
    const c: any = { TODO:0, IN_PROGRESS:0, REVIEW:0, DONE:0, DELAYED:0, design:0, assembly:0, trial:0, mass:0, memberStats: {} };
    tasks.forEach(t => {
      c[t.status]++;
      if (t.tags.includes('模具設計')) c.design++;
      else if (t.tags.includes('模具組立')) c.assembly++;
      else if (t.tags.includes('模具試模')) c.trial++;
      else if (t.tags.includes('模具量試')) c.mass++;

      if (!c.memberStats[t.assignee]) c.memberStats[t.assignee] = { total:0, activeTasks: [] };
      const ms = c.memberStats[t.assignee];
      ms.total++;
      if (t.status !== TaskStatus.DONE) ms.activeTasks.push(t);
    });
    return c;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let res = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(t => t.title.toLowerCase().includes(q) || t.moldName.toLowerCase().includes(q) || t.assignee.toLowerCase().includes(q));
    }
    if (activeTab === 'timeline') {
      if (timelineStatusFilter !== 'ALL') res = res.filter(t => t.status === timelineStatusFilter);
      if (timelinePhaseFilter !== 'ALL') res = res.filter(t => t.tags.includes(timelinePhaseFilter));
      if (timelineTimeFilter !== 'ALL') res = res.filter(t => checkDateRange(t.dueDate, timelineTimeFilter));
    }
    if (activeTab === 'board' && boardFilter) res = res.filter(t => t.status === boardFilter);
    return res;
  }, [tasks, searchQuery, timelineStatusFilter, timelinePhaseFilter, timelineTimeFilter, boardFilter, activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const m = members.find(x => x.empId.toLowerCase() === loginForm.empId.toLowerCase());
    if (m && m.password === loginForm.pass) {
      setUser({ empId: m.empId, name: m.name, role: m.role });
      addToast(`登入成功，歡迎 ${m.name}`);
    } else addToast("登入失敗，工號或密碼錯誤");
  };

  const handleSaveTask = () => {
    if (!formData.title || !formData.moldName) return addToast("請填寫必要資訊");
    if (editingTask) {
      setTasks(p => p.map(t => t.id === editingTask.id ? { ...t, ...formData } as Task : t));
    } else {
      const id = `${formData.tags?.[0].charAt(0) || 'D'}-${Math.floor(Math.random()*900)+100}`;
      const newTask: Task = {
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        progress: 0,
        tags: [],
        trials: [],
        ...formData,
        id,
      } as Task;
      setTasks(p => [...p, newTask]);
    }
    setShowTaskModal(false);
    addToast("數據已成功同步");
  };

  const handleAddTrial = () => {
    if (!selectedTask || !trialFormData.condition) return addToast("請填寫描述");
    const nt: MoldTrial = { id: `tr-${Date.now()}`, version: trialFormData.version!, date: trialFormData.date!, condition: trialFormData.condition!, result: trialFormData.result as any };
    setTasks(p => p.map(t => t.id === selectedTask.id ? { ...t, trials: [...(t.trials || []), nt] } : t));
    setSelectedTask(p => p ? { ...p, trials: [...(p.trials || []), nt] } : null);
    setShowTrialForm(false);
    setTrialFormData({ version: 'T1', date: getDateOffset(0), result: 'PENDING' });
    addToast("試模紀錄已存檔");
  };

  const handleExportExcel = () => {
    const headers = ["ID", "模具案號", "標題", "狀態", "負責人", "截止日", "進度"];
    const rows = tasks.map(t => [t.id, t.moldName, t.title, TaskStatusLabels[t.status], t.assignee, t.dueDate, `${t.progress}%`].join(','));
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MoldPLM_Report_${getDateOffset(0)}.csv`;
    link.click();
    addToast("CSV 專業報表導出成功");
  };

  const handleAIAnalyze = async () => {
    setIsAnalyzing(true);
    const res = await getAIInsights(tasks);
    if (res) { setAiAnalysis(res); addToast("AI 生產力診斷完成"); }
    setIsAnalyzing(false);
  };

  const handleGetTrialAdvice = async (trial: MoldTrial) => {
    if (!selectedTask) return;
    setIsAnalyzingTrialId(trial.id);
    try {
      const advice = await getTrialImprovementAI(selectedTask.moldName, trial);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, trials: t.trials?.map(tr => tr.id === trial.id ? { ...tr, aiAdvice: advice } : tr) } : t));
      setSelectedTask(prev => prev ? { ...prev, trials: prev.trials?.map(tr => tr.id === trial.id ? { ...tr, aiAdvice: advice } : tr) } : null);
      addToast("AI 對策已生成");
    } catch (e) { addToast("分析失敗"); }
    finally { setIsAnalyzingTrialId(null); }
  };

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg bg-white rounded-[32px] p-12 shadow-2xl animate-in zoom-in-95 duration-500">
           <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-100"><Box size={32} /></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic leading-tight">Mold PLM Enterprise</h2>
           </div>
           <form onSubmit={handleLogin} className="space-y-5">
              <input type="text" value={loginForm.empId} onChange={e => setLoginForm(p => ({...p, empId: e.target.value}))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:ring-1 focus:ring-indigo-500/50" placeholder="工號 (例如: M001)" />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={loginForm.pass} onChange={e => setLoginForm(p => ({...p, pass: e.target.value}))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:ring-1 focus:ring-indigo-500/50 pr-14" placeholder="密碼" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest shadow-md transition-all active:scale-95">安全登入</button>
           </form>
           <p className="mt-8 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest italic">Secure Access Portal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-slate-900 bg-slate-50/30">
      {/* Toasts */}
      <div className="fixed top-6 right-6 z-[100] space-y-3 pointer-events-none text-left">
        {toasts.map(t => (
          <div key={t.id} className="bg-slate-900/95 text-white px-5 py-3.5 rounded-lg shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right-full backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-wide">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 flex flex-col p-6 space-y-8 z-20 shadow-2xl shrink-0">
        <div className="flex items-center space-x-3 px-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg"><Box size={18} strokeWidth={2.5} /></div>
          <div className="flex flex-col text-left"><span className="text-base font-black text-white uppercase italic leading-none">Mold PLM</span><span className="text-[8px] text-slate-500 font-bold tracking-widest uppercase mt-1 italic">Professional</span></div>
        </div>
        <nav className="flex-1 space-y-1.5">
          <SidebarItem icon={LayoutDashboard} label="管理總覽" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Users} label="成員看板" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
          <SidebarItem icon={Layers} label="開發看板" active={activeTab === 'board'} onClick={() => setActiveTab('board')} />
          <SidebarItem icon={Clock} label="排程軸線" active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} />
          <div className="h-px bg-slate-800/50 my-4 mx-2" />
          <SidebarItem icon={FileSpreadsheet} label="匯入&匯出工具" active={activeTab === 'excel'} onClick={() => setActiveTab('excel')} />
          <SidebarItem icon={Settings2} label="系統設定" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-800/80">
           <div className="flex items-center justify-between px-2 mb-4">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-bold text-xs">{user.name.charAt(0)}</div>
                <div className="flex flex-col"><span className="text-[11px] font-bold text-slate-200">{user.name}</span><span className="text-[9px] font-bold text-indigo-500 uppercase">{user.role}</span></div>
              </div>
              {isSyncing ? <Cloud size={14} className="text-indigo-500 animate-pulse" /> : <Check size={14} className="text-emerald-500" />}
           </div>
           <button onClick={() => setUser(null)} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all font-bold text-xs"><LogOut size={16} /><span>登出系統</span></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-6">
            <h1 className="text-base font-black text-slate-700 tracking-tight uppercase italic">{activeTab.toUpperCase()} View</h1>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="快速查找..." className="pl-9 pr-4 py-1.5 bg-slate-100 rounded-lg text-xs outline-none w-56 font-semibold focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all" />
            </div>
          </div>
          <button onClick={handleAIAnalyze} disabled={isAnalyzing} className="flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-[10px] uppercase bg-slate-900 text-white hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200">
            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} fill="#fbbf24" stroke="none" />}
            <span>{isAnalyzing ? '分析中...' : 'AI 生產診斷'}</span>
          </button>
        </header>

        <div className="p-8 pb-32 max-w-[1300px] mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               {stats[TaskStatus.DELAYED] > 0 && (
                <div className="bg-rose-500 text-white rounded-2xl p-5 flex items-center justify-between shadow-xl shadow-rose-100 text-left">
                  <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center border border-white/30"><Bell size={24} /></div>
                    <div><h4 className="text-sm font-black uppercase italic tracking-wider">生產警報 / Warning</h4><p className="text-[10px] font-bold opacity-90 uppercase mt-0.5 tracking-widest">目前有 {stats[TaskStatus.DELAYED]} 個開發項目已延遲，請確認進度</p></div>
                  </div>
                  {user.role === 'MANAGER' && (
                    <button onClick={() => addToast(`催辦郵件已由 ${senderEmail} 發出`)} className="px-5 py-2.5 bg-white text-rose-600 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-md hover:bg-slate-50 transition-all flex items-center space-x-2 active:scale-95">
                      <Mail size={14} /><span>發送催辦</span>
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                {[
                  { label: '待處理', value: stats[TaskStatus.TODO], color: 'text-slate-500', icon: PauseCircle, status: TaskStatus.TODO },
                  { label: '進行中', value: stats[TaskStatus.IN_PROGRESS], color: 'text-blue-600', icon: PlayCircle, status: TaskStatus.IN_PROGRESS },
                  { label: '審核中', value: stats[TaskStatus.REVIEW], color: 'text-amber-500', icon: Eye, status: TaskStatus.REVIEW },
                  { label: '已完成', value: stats[TaskStatus.DONE], color: 'text-emerald-600', icon: CheckCircle2, status: TaskStatus.DONE },
                  { label: '已延遲', value: stats[TaskStatus.DELAYED], color: 'text-rose-600', icon: AlertCircle, status: TaskStatus.DELAYED },
                ].map((s, idx) => (
                  <button key={idx} onClick={() => { setBoardFilter(s.status); setActiveTab('board'); }} className="bg-white p-6 rounded-[24px] border border-slate-200/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group">
                    <div className={`p-2 rounded-lg ${s.color.replace('text', 'bg')}/10 ${s.color} w-fit mb-4 group-hover:scale-110 transition-transform`}><s.icon size={18} /></div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">{s.label}</p>
                    <p className={`text-2xl font-black ${s.color} italic leading-none tracking-tighter`}>{s.value}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm h-[400px] flex flex-col">
                   <div className="flex items-center space-x-3 mb-6"><TrendingUp className="text-indigo-600" size={18} /><h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">進度數據分佈</h3></div>
                   <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: '待處理', value: stats[TaskStatus.TODO] }, { name: '進行中', value: stats[TaskStatus.IN_PROGRESS] }, 
                          { name: '審核中', value: stats[TaskStatus.REVIEW] }, { name: '已完成', value: stats[TaskStatus.DONE] }, 
                          { name: '已延遲', value: stats[TaskStatus.DELAYED] }
                        ]} layout="vertical" barCategoryGap={8}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} width={70} />
                          <Tooltip cursor={{ fill: '#f8fafc', radius: 8 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                            {[0,1,2,3,4].map((_,i) => <Cell key={i} fill={['#94a3b8', '#2563eb', '#d97706', '#059669', '#e11d48'][i]} />)}
                            <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 800, fill: '#334155' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-slate-950 text-white p-8 rounded-[40px] shadow-2xl h-[400px] flex flex-col">
                  <div className="flex items-center space-x-2.5 mb-6"><Sparkles size={18} className="text-indigo-400" /><h3 className="text-lg font-black uppercase italic tracking-tight">AI 診斷引擎</h3></div>
                  {aiAnalysis ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 text-left">
                      <div className="p-4 bg-indigo-600/10 rounded-xl border border-white/5"><p className="text-[12px] italic leading-relaxed text-slate-200">"{aiAnalysis.healthSummary}"</p></div>
                      <div className="space-y-4">
                        <div className="space-y-2"><p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={10} /> 加工瓶頸</p>
                        {aiAnalysis.bottlenecks?.map((it:any, i:any) => <p key={i} className="text-[11px] text-slate-400 pl-3 border-l border-white/10">{it}</p>)}</div>
                        <div className="space-y-2"><p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Clock size={10} /> 延遲風險</p>
                        {aiAnalysis.atRisk?.map((it:any, i:any) => <p key={i} className="text-[11px] text-slate-400 pl-3 border-l border-white/10">{it}</p>)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                      <div className={`w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center ${isAnalyzing ? 'animate-pulse' : ''}`}><ZapOff size={32} /></div>
                      <div><p className="text-sm font-black uppercase italic">AI 診斷已緒</p><p className="text-[9px] font-bold uppercase tracking-widest mt-1">點擊上方啟動專業分析</p></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'board' && (
            <div className="flex space-x-6 overflow-x-auto pb-10 custom-scrollbar -mx-8 px-8 min-h-[600px] animate-in slide-in-from-bottom-4 duration-500 items-start">
              {[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE, TaskStatus.DELAYED].filter(s => !boardFilter || s === boardFilter).map(status => {
                const list = filteredTasks.filter(t => t.status === status);
                return (
                  <div key={status} className="w-[300px] shrink-0 flex flex-col space-y-4 bg-slate-100/40 p-3 rounded-[32px] border border-slate-200/50 h-full">
                    <div className="flex items-center justify-between px-3 py-1">
                      <h3 className="font-black text-[11px] uppercase text-slate-500 tracking-widest leading-none">{TaskStatusLabels[status]} ({list.length})</h3>
                      <div className={`w-2 h-2 rounded-full ${status === TaskStatus.DONE ? 'bg-emerald-500' : status === TaskStatus.DELAYED ? 'bg-rose-500' : 'bg-slate-300'}`} />
                    </div>
                    <div className="space-y-4">
                      {list.map(t => (
                        <div key={t.id} onClick={() => { setSelectedTask(t); setShowDetailModal(true); }} className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer text-left group">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 italic uppercase">{t.moldName}</span>
                            <PriorityBadge priority={t.priority} />
                          </div>
                          <h4 className="font-bold text-slate-800 text-[13px] mb-4 leading-snug line-clamp-2">{t.title}</h4>
                          <div className="mb-4 bg-slate-50 p-2 rounded-xl border border-slate-100"><ProgressBar progress={t.progress} status={t.status} /></div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                            <div className="flex items-center space-x-2"><div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[9px] font-bold shadow-md">{t.assignee.charAt(0)}</div><span className="text-[9px] font-bold text-slate-700">{t.assignee}</span></div>
                            <div className="flex items-center space-x-1 text-slate-400"><Calendar size={10} /><span className="text-[9px] font-bold italic">{t.dueDate}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in duration-500 text-left">
               <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
                  <div className="flex items-center space-x-3"><div className="p-2 bg-indigo-600 text-white rounded-lg"><GanttChartSquare size={18} /></div><h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">開發軸線</h3></div>
                  <div className="flex items-center gap-4 flex-1">
                    <select value={timelineStatusFilter} onChange={(e) => setTimelineStatusFilter(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-bold outline-none cursor-pointer">
                      <option value="ALL">所有狀態</option>{Object.values(TaskStatus).map(s => <option key={s} value={s}>{TaskStatusLabels[s]}</option>)}
                    </select>
                    <select value={timelinePhaseFilter} onChange={(e) => setTimelinePhaseFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-bold outline-none cursor-pointer">
                      <option value="ALL">所有階段</option>{MOLD_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="flex bg-slate-100 p-1 rounded-lg flex-1 min-w-[200px]">
                      {['ALL', 'THIS_WEEK', 'NEXT_WEEK', 'NEXT_MONTH'].map(id => (
                        <button key={id} onClick={() => setTimelineTimeFilter(id as any)} className={`flex-1 px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${timelineTimeFilter === id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>{id === 'ALL' ? '全部' : id === 'THIS_WEEK' ? '本週' : '下週'}</button>
                      ))}
                    </div>
                  </div>
               </div>
               <div className="bg-white rounded-[24px] border border-slate-200 shadow-xl overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left table-fixed">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="w-32 px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">案號</th>
                          <th className="w-auto px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">開發項目標題</th>
                          <th className="w-40 px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">負責人員</th>
                          <th className="w-32 px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">截止日</th>
                          <th className="w-48 px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">進度</th>
                          <th className="w-32 px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">當前狀態</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredTasks.map(t => (
                          <tr key={t.id} onClick={() => { setSelectedTask(t); setShowDetailModal(true); }} className="hover:bg-slate-50 cursor-pointer transition-all group">
                            <td className="px-8 py-4 font-black text-[11px] text-indigo-700 italic">{t.moldName}</td>
                            <td className="px-4 py-4"><div className="flex items-center gap-2"><h4 className="font-bold text-[12px] truncate">{t.title}</h4><span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-black">{t.tags[0]}</span></div></td>
                            <td className="px-4 py-4"><div className="flex items-center gap-2 font-bold text-[11px]"><div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[9px]">{t.assignee.charAt(0)}</div>{t.assignee}</div></td>
                            <td className="px-4 py-4 text-center text-[10px] font-bold italic text-slate-500">{t.dueDate}</td>
                            <td className="px-4 py-4"><ProgressBar progress={t.progress} status={t.status} /></td>
                            <td className="px-8 py-4 text-right"><span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${STATUS_COLORS[t.status as keyof typeof STATUS_COLORS]}`}>{TaskStatusLabels[t.status]}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500 text-left">
              {members.map(m => {
                const ms = stats.memberStats[m.name] || { total:0, activeTasks: [] };
                const load = Math.min((ms.activeTasks.length / 5) * 100, 100);
                return (
                  <div key={m.empId} className="bg-white rounded-[32px] border border-slate-200 p-8 flex flex-col md:flex-row gap-8 hover:shadow-2xl transition-all border-l-4 overflow-hidden group" style={{ borderLeftColor: load > 80 ? '#f43f5e' : '#10b981' }}>
                    <div className="md:w-1/3 flex flex-col items-center border-r border-slate-100 pr-8 text-center shrink-0">
                      <div className="w-20 h-20 rounded-[24px] bg-slate-50 shadow-inner border border-slate-100 flex items-center justify-center text-indigo-600 text-3xl font-black mb-4 group-hover:scale-110 transition-transform">{m.name.charAt(0)}</div>
                      <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">{m.name}</h3>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1 italic">{m.role}</p>
                      <div className="w-full mt-6 space-y-2">
                        <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">開發負荷 {Math.round(load)}%</span></div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ${load > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${load}%` }} /></div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Briefcase size={12} /> 活躍任務項目</p>
                       <div className="grid gap-2">
                         {ms.activeTasks.length > 0 ? ms.activeTasks.map((t:any) => (
                           <div key={t.id} onClick={() => { setSelectedTask(t); setShowDetailModal(true); }} className="p-3 bg-slate-50 rounded-xl text-[11px] font-bold border border-slate-100 flex justify-between hover:bg-white hover:shadow-md transition-all cursor-pointer">
                             <div className="flex flex-col"><span className="text-[8px] text-indigo-600 italic uppercase">{t.moldName}</span><span>{t.title}</span></div>
                             <span className="text-[8px] font-black uppercase text-slate-400 self-center">{t.dueDate}</span>
                           </div>
                         )) : <div className="py-12 flex flex-col items-center justify-center opacity-20"><ClipboardList size={32} /><p className="text-[10px] font-bold uppercase mt-2">目前無任務</p></div>}
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'excel' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500 text-left">
               <div className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm text-center space-y-8 hover:shadow-xl transition-all border-t-4 border-indigo-600">
                 <div className="w-20 h-20 bg-indigo-50 rounded-[24px] flex items-center justify-center text-indigo-600 mx-auto shadow-inner"><FileDown size={40} strokeWidth={1.5} /></div>
                 <div><h3 className="font-black text-xl uppercase italic tracking-tighter">數據報告導出 / Export</h3><p className="text-sm text-slate-400 mt-2 font-medium italic">產生包含工序節點與試模紀錄的專業 CSV 報表</p></div>
                 <button onClick={handleExportExcel} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3"><Download size={18} /><span>導出 CSV 數據庫</span></button>
               </div>
               <div className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm text-center space-y-8 hover:shadow-xl transition-all border-t-4 border-slate-900">
                 <div className="w-20 h-20 bg-slate-900 rounded-[24px] flex items-center justify-center text-white mx-auto shadow-xl"><FileUp size={40} strokeWidth={1.5} /></div>
                 <div><h3 className="font-black text-xl uppercase italic tracking-tighter">批量數據導入 / Import</h3><p className="text-sm text-slate-400 mt-2 font-medium italic">透過 CSV 範本快速建立多筆開發工序</p></div>
                 <div className="relative w-full p-10 border-2 border-dashed border-slate-200 rounded-[32px] hover:border-indigo-600 hover:bg-indigo-50/50 transition-all group cursor-pointer">
                   <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => {
                     addToast("數據解析中..."); setTimeout(() => addToast("導入功能已完成就緒"), 1200);
                   }} />
                   <div className="flex flex-col items-center space-y-4">
                     <Table size={32} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">拖曳檔案或點擊此處上傳</span>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 text-left">
               {user.role === 'MANAGER' && (
                 <>
                   <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                     <div className="p-6 border-b bg-indigo-50/20 font-black uppercase italic text-slate-800 flex items-center gap-3 shadow-inner"><UserPlus size={20} className="text-indigo-600" />系統成員管理</div>
                     <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">員工工號</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm shadow-inner" placeholder="例如: E101" /></div>
                       <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">員工姓名</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm shadow-inner" /></div>
                       <div className="space-y-2 col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">技術信箱 (Email)</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm shadow-inner" /></div>
                       <button onClick={() => addToast("帳號建立功能僅供演示")} className="col-span-2 py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">確認建立新帳號</button>
                     </div>
                   </div>
                   <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                     <div className="p-6 border-b bg-rose-50/20 font-black uppercase italic text-slate-800 flex items-center gap-3 shadow-inner"><Mail size={20} className="text-rose-600" />郵件系統配置 / Email Config</div>
                     <div className="p-8 space-y-6">
                       <div className="max-w-md space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">系統發件人信箱設定</label>
                         <div className="flex gap-4">
                           <input className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none shadow-inner" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} />
                           <button onClick={() => addToast("郵件配置已更新")} className="px-8 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">更新</button>
                         </div>
                         <p className="text-[10px] text-slate-400 italic font-medium">此信箱將用於自動發送催辦與進度異常通知。</p>
                       </div>
                     </div>
                   </div>
                 </>
               )}
               <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b bg-slate-50 font-black uppercase italic text-slate-800 flex items-center gap-3"><Key size={20} />帳戶安全中心</div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">舊密碼</label><input type="password" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">新密碼</label><input type="password" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">確認新密碼</label><input type="password" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" /></div>
                    <div className="md:col-span-3 flex justify-end"><button onClick={() => addToast("密碼已成功變更")} className="px-8 py-3 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase shadow-md">儲存變更</button></div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {user.role === 'MANAGER' && (
          <button 
            onClick={() => { 
              setEditingTask(null); 
              setFormData({ moldName:'', title:'', tags:['模具設計'], assignee: user.name, startDate: getDateOffset(0), dueDate: getDateOffset(7), progress:0, status: TaskStatus.TODO, priority: Priority.MEDIUM }); 
              setShowTaskModal(true); 
            }} 
            className="fixed bottom-10 right-10 w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-2xl z-40 hover:-translate-y-2 hover:rotate-90 transition-all active:scale-90 shadow-indigo-200"
          >
            <Plus size={32} strokeWidth={3} />
          </button>
        )}
      </main>

      {/* Detail & Trial Modal (Combined Sidebar Style) */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[70] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] w-full max-w-6xl h-[88vh] flex overflow-hidden shadow-3xl text-left border border-white/20 animate-in zoom-in-95 duration-400">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-10">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black italic shadow-lg tracking-widest">{selectedTask.moldName}</span>
                    <PriorityBadge priority={selectedTask.priority} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">工序 ID: {selectedTask.id}</span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-800 italic uppercase tracking-tighter leading-tight">{selectedTask.title}</h2>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-[18px] text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90 shadow-sm"><X size={24} /></button>
              </div>
              
              <div className="grid grid-cols-2 gap-8 bg-slate-50/50 p-8 rounded-[40px] border border-slate-100 shadow-inner">
                <InfoRow label="負責技術專員" icon={UserCircle2} value={selectedTask.assignee} />
                <InfoRow label="加工進度階段" icon={Layers} value={selectedTask.tags[0]} colorClass="text-indigo-600" />
                <InfoRow label="啟動日期" icon={Calendar} value={selectedTask.startDate} />
                <InfoRow label="截止預計日期" icon={CalendarDays} value={selectedTask.dueDate} colorClass={selectedTask.status === TaskStatus.DELAYED ? 'text-rose-600 font-black underline decoration-rose-300 decoration-2 underline-offset-4' : ''} />
                <InfoRow label="當前狀態" icon={ShieldAlert} value={TaskStatusLabels[selectedTask.status]} colorClass={STATUS_COLORS[selectedTask.status as keyof typeof STATUS_COLORS]} />
                <InfoRow label="通知設定" icon={Mail} value={selectedTask.status === TaskStatus.DELAYED ? '已觸發預警' : '監控中'} colorClass={selectedTask.status === TaskStatus.DELAYED ? 'text-rose-500' : 'text-slate-400'} />
              </div>

              <div className="space-y-5 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Activity size={20} className="text-indigo-600" /><h4 className="text-sm font-black uppercase italic tracking-tight text-slate-700">當前工進報告 / Progress</h4></div>
                  <span className="text-4xl font-black text-slate-800 italic">{selectedTask.progress}%</span>
                </div>
                <ProgressBar progress={selectedTask.progress} status={selectedTask.status} />
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-3 ml-2"><StickyNote size={18} className="text-indigo-400" /><h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">技術備註與工法說明</h4></div>
                 <div className="p-8 bg-slate-50 rounded-[32px] italic text-sm text-slate-500 leading-relaxed border border-slate-100 shadow-inner">{selectedTask.description || '目前無額外技術說明或標註項目。'}</div>
              </div>

              {user.role === 'MANAGER' && (
                <div className="flex gap-6 pt-6">
                  <button onClick={() => { if(confirm('確定要移除此工序？')) { setTasks(p => p.filter(x => x.id !== selectedTask.id)); setShowDetailModal(false); } }} className="px-8 py-4 border-2 border-rose-100 text-rose-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-50 transition-all active:scale-95 shadow-sm">移除此項目</button>
                  <button onClick={() => { setEditingTask(selectedTask); setFormData(selectedTask); setShowDetailModal(false); setShowTaskModal(true); }} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3"><Edit3 size={16} /><span>修改技術數據</span></button>
                </div>
              )}
            </div>

            {/* Trial Sidebar */}
            <div className="w-[420px] bg-slate-50 border-l border-slate-200/50 p-10 overflow-y-auto custom-scrollbar flex flex-col space-y-8">
              <div className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md py-2 z-10">
                <div className="flex items-center gap-3"><div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl"><PlusSquare size={20} /></div><h4 className="font-black text-xs uppercase italic tracking-tight text-slate-800">試模紀錄 / Trial Log</h4></div>
                <button onClick={() => setShowTrialForm(!showTrialForm)} className={`p-2 rounded-xl transition-all shadow-md ${showTrialForm ? 'bg-rose-500 text-white rotate-45' : 'bg-indigo-600 text-white'}`}><Plus size={20} /></button>
              </div>

              {showTrialForm && (
                <div className="bg-white p-6 rounded-[32px] shadow-2xl border-2 border-indigo-100 space-y-5 animate-in slide-in-from-top-4 duration-400">
                  <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">回報新試模紀錄</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Version</label><input className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="例如: T1" value={trialFormData.version} onChange={e => setTrialFormData(p => ({...p, version: e.target.value}))} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Result</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl text-[10px] font-bold outline-none" value={trialFormData.result} onChange={e => setTrialFormData(p => ({...p, result: e.target.value as any}))}><option value="PASS">PASS</option><option value="ADJUST">ADJUST</option><option value="FAIL">FAIL</option><option value="PENDING">PENDING</option></select></div>
                  </div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase">狀況描述</label><textarea className="w-full p-4 bg-slate-50 border rounded-2xl text-[11px] font-semibold italic resize-none outline-none shadow-inner" placeholder="輸入成型缺陷或機台狀況描述..." rows={4} value={trialFormData.condition} onChange={e => setTrialFormData(p => ({...p, condition: e.target.value}))} /></div>
                  <button onClick={handleAddTrial} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all">儲存回報</button>
                </div>
              )}

              <div className="space-y-6">
                {[...(selectedTask.trials || [])].reverse().map(tr => (
                  <div key={tr.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4 group/card hover:shadow-xl transition-all relative">
                     <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3"><div className={`w-2.5 h-2.5 rounded-full ${tr.result === 'PASS' ? 'bg-emerald-500' : tr.result === 'FAIL' ? 'bg-rose-500' : 'bg-amber-500'}`} /><span className="text-[11px] font-black italic bg-indigo-50 px-3 py-1 rounded-xl text-indigo-700 border border-indigo-100">{tr.version} Trial</span></div>
                       <span className="text-[10px] text-slate-400 font-bold italic">{tr.date}</span>
                     </div>
                     <p className="text-[12px] italic text-slate-500 border-l-2 border-slate-100 pl-4 leading-relaxed">{tr.condition}</p>
                     {tr.aiAdvice ? (
                       <div className="p-5 bg-indigo-600 text-white rounded-[24px] text-[11px] italic leading-relaxed shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-2 opacity-20"><Zap size={40} fill="white" /></div>
                         <div className="flex items-center gap-2 mb-2 font-black uppercase text-[9px] text-indigo-200"><Zap size={10} fill="currentColor" /> AI 專家對策建議</div>
                         "{tr.aiAdvice}"
                       </div>
                     ) : (
                       <button onClick={() => handleGetTrialAdvice(tr)} disabled={isAnalyzingTrialId === tr.id} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-black active:scale-95 shadow-md">
                         {isAnalyzingTrialId === tr.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} fill="#fbbf24" stroke="none" />}
                         <span>{isAnalyzingTrialId === tr.id ? '分析中...' : '獲取 AI 對策'}</span>
                       </button>
                     )}
                  </div>
                ))}
                {(selectedTask.trials?.length || 0) === 0 && <div className="py-24 flex flex-col items-center justify-center opacity-10 space-y-4"><Microscope size={64} /><p className="text-xs font-black uppercase tracking-widest">目前尚無試模數據</p></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-3xl overflow-hidden text-left border border-white/20 animate-in zoom-in-95 duration-400">
            <div className="p-10 border-b bg-slate-50/50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100"><PlusCircle size={28} /></div>
                <div><h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">{editingTask ? '修改技術節點' : '建立模具任務'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mold Development Node Configuration</p></div>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="p-2 border rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">案號 / Mold ID</label><input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 shadow-inner focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all" value={formData.moldName} onChange={e => setFormData(p => ({...p, moldName: e.target.value}))} placeholder="MOLD-X001" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">工序標題 / Task Name</label><input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 shadow-inner focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all" value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} /></div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">加工階段 / Processing Phase</label>
                <div className="grid grid-cols-4 gap-3">
                  {MOLD_PHASES.map(ph => <button key={ph} onClick={() => setFormData(p => ({...p, tags: [ph]}))} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all shadow-sm ${formData.tags?.includes(ph) ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-100' : 'bg-white text-slate-400 hover:border-indigo-200'}`}>{ph}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">負責專員 / PIC</label><select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 shadow-inner outline-none cursor-pointer" value={formData.assignee} onChange={e => setFormData(p => ({...p, assignee: e.target.value}))}>{members.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}</select></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">進度 % / Progress</label><input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-indigo-600 shadow-inner" value={formData.progress} onChange={e => setFormData(p => ({...p, progress: Number(e.target.value)}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">啟動日 / Start</label><input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 shadow-inner" value={formData.startDate} onChange={e => setFormData(p => ({...p, startDate: e.target.value}))} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">截止日 / Deadline</label><input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 shadow-inner" value={formData.dueDate} onChange={e => setFormData(p => ({...p, dueDate: e.target.value}))} /></div>
              </div>
              <button onClick={handleSaveTask} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest italic shadow-2xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-[0.98]">儲存並同步數據 / Save & Sync</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;