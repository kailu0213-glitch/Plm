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

// --- Helper Functions ---
const getDateOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const isWithinThisWeek = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return d >= startOfWeek && d <= endOfWeek;
};

const isWithinNextWeek = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + 7;
  const startOfNextWeek = new Date(now.setDate(diff));
  startOfNextWeek.setHours(0, 0, 0, 0);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  return d >= startOfNextWeek && d <= endOfNextWeek;
};

const isWithinNextMonth = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  return d >= startOfNextMonth && d <= endOfNextMonth;
};

// --- Storage Keys ---
const STORAGE_KEYS = {
  TASKS: 'MOLD_PLM_TASKS',
  MEMBERS: 'MOLD_PLM_MEMBERS',
  USER: 'MOLD_PLM_AUTH_USER',
  SENDER_EMAIL: 'MOLD_PLM_SENDER_EMAIL'
};

// --- Memoized Sub-Components ---
const SidebarItem = memo(({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
    }`}
  >
    <Icon size={18} />
    <span className="font-semibold text-sm tracking-wide text-left">{label}</span>
  </button>
));

const ProgressBar = memo(({ progress, status }: { progress: number, status: TaskStatus }) => {
  const bgColor = useMemo(() => {
    if (status === TaskStatus.DONE) return 'bg-emerald-500';
    if (status === TaskStatus.DELAYED) return 'bg-rose-500';
    if (status === TaskStatus.REVIEW) return 'bg-amber-500';
    return 'bg-indigo-500';
  }, [status]);
  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-1000 ease-in-out ${bgColor}`} style={{ width: `${progress}%` }} />
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
  return (
    <span className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[priority]}`}>
      <Flag size={10} fill="currentColor" />
      <span>{PriorityLabels[priority]}級</span>
    </span>
  );
});

const InfoRow = memo(({ label, value, icon: Icon, colorClass = "text-slate-700" }: { label: string, value: any, icon: any, colorClass?: string }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <div className="flex items-center space-x-2 text-slate-400">
      <Icon size={14} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className={`text-[11px] font-bold ${colorClass}`}>
      {value}
    </div>
  </div>
));

// --- Constants ---
const INITIAL_MEMBERS = [
  { empId: 'M001', name: '趙主管', email: 'manager@moldplm.com', role: 'MANAGER' as const, password: '123456' },
  { empId: 'E001', name: '張建國', email: 'engineer@moldplm.com', role: 'ENGINEER' as const, password: '123456' },
  { empId: 'E002', name: '林師傅', email: 'lin@moldplm.com', role: 'ENGINEER' as const, password: '123456' },
  { empId: 'E003', name: '王工程師', email: 'wang@moldplm.com', role: 'ENGINEER' as const, password: '123456' },
  { empId: 'E004', name: '李技術員', email: 'lee@moldplm.com', role: 'ENGINEER' as const, password: '123456' },
];

const MOLD_PHASES = ['模具設計', '模具組立', '模具試模', '模具量試'];

const INITIAL_TASKS: Task[] = [
  { id: 'D-101', moldName: 'MOLD-A1', title: '3D 結構優化', description: '針對核心結構進行流道優化與冷卻系統重新佈置。', status: TaskStatus.DONE, priority: Priority.HIGH, assignee: '張建國', startDate: getDateOffset(-30), dueDate: getDateOffset(-20), progress: 100, tags: ['模具設計'], trials: [] },
  { id: 'A-102', moldName: 'MOLD-A1', title: '型腔粗加工', description: 'CNC 粗加工，預留 0.5mm 餘量。', status: TaskStatus.DONE, priority: Priority.MEDIUM, assignee: '林師傅', startDate: getDateOffset(-19), dueDate: getDateOffset(-10), progress: 100, tags: ['模具組立'], trials: [] },
  { id: 'T-103', moldName: 'MOLD-A1', title: 'T1 試模', description: '首次射出成型測試，檢查產品完整性。', status: TaskStatus.DONE, priority: Priority.HIGH, assignee: '王工程師', startDate: getDateOffset(-9), dueDate: getDateOffset(-5), progress: 100, tags: ['模具試模'], trials: [{ id: 'tr-1', version: 'T1', date: getDateOffset(-6), condition: '澆口冷料，流痕明顯，縮水嚴重', result: 'ADJUST' }] },
  { id: 'T-104', moldName: 'MOLD-A1', title: 'T2 修正試模', description: '針對 T1 問題進行修正後的再次驗證。', status: TaskStatus.REVIEW, priority: Priority.HIGH, assignee: '王工程師', startDate: getDateOffset(-4), dueDate: getDateOffset(2), progress: 95, tags: ['模具試模'], trials: [{ id: 'tr-2', version: 'T2', date: getDateOffset(-1), condition: '尺寸已達標，表面咬花需優化', result: 'PENDING' }] },
  { id: 'M-105', moldName: 'MOLD-A1', title: '量產準備', description: '模具表面處理與量產參數設定。', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: '趙主管', startDate: getDateOffset(5), dueDate: getDateOffset(15), progress: 0, tags: ['模具量試'], trials: [] },
  { id: 'D-201', moldName: 'MOLD-B2', title: '滑塊機構模擬', description: '進行滑塊機構的動態模擬。', status: TaskStatus.IN_PROGRESS, priority: Priority.CRITICAL, assignee: '張建國', startDate: getDateOffset(-5), dueDate: getDateOffset(5), progress: 45, tags: ['模具設計'], trials: [] },
  { id: 'A-202', moldName: 'MOLD-B2', title: '頂出系統組立', description: '安裝核心頂針。', status: TaskStatus.DELAYED, priority: Priority.CRITICAL, assignee: '林師傅', startDate: getDateOffset(-15), dueDate: getDateOffset(-1), progress: 30, tags: ['模具組立'], trials: [] },
];

const App: React.FC = () => {
  // --- State ---
  const [user, setUser] = useState<{ empId: string, name: string, role: 'MANAGER' | 'ENGINEER' } | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    return saved ? JSON.parse(saved) : null;
  });
  const [loginForm, setLoginForm] = useState({ empId: 'M001', pass: '123456' });
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'timeline' | 'team' | 'excel' | 'settings'>('dashboard');
  
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [senderEmail, setSenderEmail] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.SENDER_EMAIL) || 'plm-noreply@moldcorp.com';
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [newMemberData, setNewMemberData] = useState({ empId: '', name: '', email: '', role: 'ENGINEER' as 'MANAGER' | 'ENGINEER' });
  const [passChangeForm, setPassChangeForm] = useState({ old: '', new: '', confirm: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingTrialId, setIsAnalyzingTrialId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{id: string, message: string}[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [boardFilter, setBoardFilter] = useState<TaskStatus | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing'>('idle');

  const [showTrialForm, setShowTrialForm] = useState(false);
  const [trialFormData, setTrialFormData] = useState<Partial<MoldTrial>>({
    version: 'T1', date: new Date().toISOString().split('T')[0], condition: '', result: 'PENDING'
  });

  const [timelineStatusFilter, setTimelineStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [timelinePhaseFilter, setTimelinePhaseFilter] = useState<string | 'ALL'>('ALL');
  const [timelinePhaseList] = useState(MOLD_PHASES);
  const [timelineTimeFilter, setTimelineTimeFilter] = useState<'ALL' | 'THIS_WEEK' | 'NEXT_WEEK' | 'NEXT_MONTH'>('ALL');

  const [formData, setFormData] = useState<Partial<Task>>({
    moldName: '', title: '', description: '', status: TaskStatus.TODO,
    priority: Priority.MEDIUM, assignee: INITIAL_MEMBERS[0].name,
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    progress: 0, tags: ['模具設計']
  });

  // --- Persistence Side Effects ---
  useEffect(() => {
    setIsSyncing(true);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    const timer = setTimeout(() => setIsSyncing(false), 800);
    return () => clearTimeout(timer);
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SENDER_EMAIL, senderEmail);
  }, [senderEmail]);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.USER);
  }, [user]);

  // --- Memoized Values ---
  const stats = useMemo(() => {
    const counts = {
      [TaskStatus.TODO]: 0, [TaskStatus.IN_PROGRESS]: 0, [TaskStatus.REVIEW]: 0, [TaskStatus.DONE]: 0, [TaskStatus.DELAYED]: 0,
    };
    const phases = { design: 0, assembly: 0, trial: 0, mass: 0 };
    const memberStats: any = {};

    tasks.forEach(t => {
      counts[t.status]++;
      if (t.tags.includes('模具設計')) phases.design++;
      else if (t.tags.includes('模具組立')) phases.assembly++;
      else if (t.tags.includes('模具試模')) phases.trial++;
      else if (t.tags.includes('模具量試')) phases.mass++;

      if (!memberStats[t.assignee]) memberStats[t.assignee] = { total: 0, delayed: 0, done: 0, todo: 0, inProgress: 0, review: 0, activeTasks: [] };
      const ms = memberStats[t.assignee];
      ms.total++;
      if (t.status === TaskStatus.DELAYED) ms.delayed++;
      if (t.status === TaskStatus.DONE) ms.done++;
      else ms.activeTasks.push(t);
      if (t.status === TaskStatus.IN_PROGRESS) ms.inProgress++;
      if (t.status === TaskStatus.TODO) ms.todo++;
      if (t.status === TaskStatus.REVIEW) ms.review++;
    });

    return { ...counts, phases, memberStats, total: tasks.length, completionRate: tasks.length > 0 ? Math.round((counts[TaskStatus.DONE] / tasks.length) * 100) : 0 };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.moldName.toLowerCase().includes(q) || t.assignee.toLowerCase().includes(q));
    }
    if (activeTab === 'timeline') {
      if (timelineStatusFilter !== 'ALL') result = result.filter(t => t.status === timelineStatusFilter);
      if (timelinePhaseFilter !== 'ALL') result = result.filter(t => t.tags.includes(timelinePhaseFilter));
      if (timelineTimeFilter === 'THIS_WEEK') result = result.filter(t => isWithinThisWeek(t.dueDate));
      else if (timelineTimeFilter === 'NEXT_WEEK') result = result.filter(t => isWithinNextWeek(t.dueDate));
      else if (timelineTimeFilter === 'NEXT_MONTH') result = result.filter(t => isWithinNextMonth(t.dueDate));
    }
    if (activeTab === 'board' && boardFilter) result = result.filter(t => t.status === boardFilter);
    return result;
  }, [tasks, searchQuery, timelineStatusFilter, timelinePhaseFilter, timelineTimeFilter, boardFilter, activeTab]);

  // --- Handlers ---
  const addToast = useCallback((message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const handleLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const found = members.find((m: any) => m.empId.toLowerCase() === loginForm.empId.toLowerCase());
    if (found && loginForm.pass === found.password) {
      setUser({ empId: found.empId, name: found.name, role: found.role });
      addToast(`登入成功，歡迎 ${found.name}`);
    } else {
      addToast("登入失敗，工號或密碼錯誤");
    }
  }, [members, loginForm, addToast]);

  const handleCreateMember = useCallback(() => {
    if (!newMemberData.empId || !newMemberData.name || !newMemberData.email) {
      addToast("請填寫完整資訊"); return;
    }
    if (members.some((m: any) => m.empId.toLowerCase() === newMemberData.empId.toLowerCase())) {
      addToast("工號已存在"); return;
    }
    setMembers((prev: any) => [...prev, { ...newMemberData, password: '123456' }]);
    addToast(`成員 ${newMemberData.name} 已建立，預設密碼 123456`);
    setNewMemberData({ empId: '', name: '', email: '', role: 'ENGINEER' });
  }, [newMemberData, members, addToast]);

  const handlePassChange = useCallback(() => {
    if (!user) return;
    const m = members.find((x: any) => x.empId === user.empId);
    if (!m) return;
    if (!passChangeForm.old || !passChangeForm.new || !passChangeForm.confirm) {
      addToast("請完整填寫"); return;
    }
    if (passChangeForm.old !== m.password) {
      addToast("舊密碼錯誤"); return;
    }
    if (passChangeForm.new !== passChangeForm.confirm) {
      addToast("新密碼不一致"); return;
    }
    if (passChangeForm.new.length < 6) {
      addToast("新密碼長度不足"); return;
    }
    setMembers((prev: any) => prev.map((x: any) => x.empId === user.empId ? { ...x, password: passChangeForm.new } : x));
    addToast("密碼變更成功");
    setPassChangeForm({ old: '', new: '', confirm: '' });
  }, [user, members, passChangeForm, addToast]);

  const handleExportExcel = useCallback(() => {
    const BOM = "\ufeff";
    const headers = ["工序ID", "模具編號", "開發標題", "負責人", "當前狀態", "進度", "啟動日期", "截止日期", "試模歷程"].join(",");
    const rows = tasks.map(t => {
      const trials = t.trials?.map(tr => `[${tr.version}|${tr.date}|${tr.result}|${tr.condition.replace(/,/g, ' ')}]`).join(" / ") || "無紀錄";
      return [t.id, t.moldName, t.title.replace(/,/g, ' '), t.assignee, TaskStatusLabels[t.status], `${t.progress}%`, t.startDate, t.dueDate, trials].join(",");
    }).join("\n");
    const blob = new Blob([BOM + headers + "\n" + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Mold_PLM_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    addToast("專業報表已匯出");
  }, [tasks, addToast]);

  const handleImportExcel = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('processing');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const lines = (event.target?.result as string).split('\n');
        const newTasks: Task[] = lines.slice(1).filter(l => l.trim()).map(line => {
          const p = line.split(',');
          return {
            id: `IMP-${Math.floor(Math.random() * 1000)}`,
            moldName: p[0]?.trim() || 'MOLD', title: p[1]?.trim() || '任務',
            assignee: p[2]?.trim() || INITIAL_MEMBERS[0].name, dueDate: p[3]?.trim() || getDateOffset(7),
            description: 'Excel導入', status: TaskStatus.TODO, priority: Priority.MEDIUM,
            startDate: getDateOffset(0), progress: 0, tags: ['模具設計'], trials: []
          };
        });
        setTasks(prev => [...prev, ...newTasks]);
        addToast(`成功導入 ${newTasks.length} 筆案件`);
      } catch (err) { addToast("檔案解析錯誤"); }
      finally { setImportStatus('idle'); }
    };
    reader.readAsText(file);
  }, [addToast]);

  const handleAIAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await getAIInsights(tasks);
      if (result) { setAiAnalysis(result); addToast("AI 生產診斷完成"); }
    } catch (e) { addToast("AI 分析超時"); }
    finally { setIsAnalyzing(false); }
  }, [tasks, addToast]);

  const handleGetTrialAdvice = useCallback(async (trial: MoldTrial) => {
    if (!selectedTask || isAnalyzingTrialId) return;
    setIsAnalyzingTrialId(trial.id);
    try {
      const advice = await getTrialImprovementAI(selectedTask.moldName, trial);
      const update = (tList: Task[]) => tList.map(t => t.id === selectedTask.id ? { ...t, trials: t.trials?.map(tr => tr.id === trial.id ? { ...tr, aiAdvice: advice } : tr) } : t);
      setTasks(prev => update(prev));
      setSelectedTask(prev => prev ? { ...prev, trials: prev.trials?.map(tr => tr.id === trial.id ? { ...tr, aiAdvice: advice } : tr) } : null);
      addToast("AI 改善建議已送達");
    } catch (e) { addToast("AI 分析失敗"); }
    finally { setIsAnalyzingTrialId(null); }
  }, [selectedTask, isAnalyzingTrialId, addToast]);

  const handleSaveTask = useCallback(() => {
    if (!formData.title || !formData.moldName) { addToast("請填寫必要資訊"); return; }
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...formData } as Task : t));
    } else {
      const id = `${formData.tags?.[0].charAt(0) || 'D'}-${Math.floor(Math.random() * 900) + 100}`;
      setTasks(prev => [...prev, { ...formData, id, trials: [] } as Task]);
    }
    setShowTaskModal(false);
    addToast("開發任務已儲存");
  }, [editingTask, formData, addToast]);

  const handleAddTrial = useCallback(() => {
    if (!selectedTask || !trialFormData.condition) { addToast("請描述狀況"); return; }
    const nt: MoldTrial = {
      id: `tr-${Date.now()}`, version: trialFormData.version || 'T1',
      date: trialFormData.date || getDateOffset(0), condition: trialFormData.condition || '',
      result: (trialFormData.result as any) || 'PENDING'
    };
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, trials: [...(t.trials || []), nt] } : t));
    setSelectedTask(prev => prev ? { ...prev, trials: [...(prev.trials || []), nt] } : null);
    setShowTrialForm(false);
    setTrialFormData({ version: 'T1', date: getDateOffset(0), condition: '', result: 'PENDING' });
    addToast(`${nt.version} 紀錄已儲存`);
  }, [selectedTask, trialFormData, addToast]);

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg bg-white rounded-[32px] p-12 shadow-2xl animate-in zoom-in-95 duration-500">
           <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-100"><Box size={32} /></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic leading-tight">Mold PLM Enterprise</h2>
           </div>
           <form onSubmit={handleLogin} className="space-y-5">
              <input type="text" value={loginForm.empId} onChange={e => setLoginForm(p => ({...p, empId: e.target.value}))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all" placeholder="工號 (例如: M001)" />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={loginForm.pass} onChange={e => setLoginForm(p => ({...p, pass: e.target.value}))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all pr-14" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest shadow-md transition-all active:scale-[0.98]">安全登入</button>
           </form>
           <p className="mt-8 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest italic">Secure Access Portal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-slate-900 font-sans relative bg-slate-50/30">
      <div className="fixed top-6 right-6 z-[100] space-y-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-slate-900/95 text-white px-5 py-3.5 rounded-lg shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right-full backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
            <span className="text-[11px] font-bold tracking-tight uppercase">{t.message}</span>
          </div>
        ))}
      </div>

      <aside className="w-64 bg-slate-950 flex flex-col p-6 space-y-8 z-20 shadow-2xl shrink-0">
        <div className="flex items-center space-x-3 px-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg"><Box size={18} strokeWidth={2.5} /></div>
          <div className="flex flex-col"><span className="text-base font-black tracking-tight text-white uppercase italic leading-none">Mold PLM</span><span className="text-[8px] text-slate-500 font-bold tracking-widest uppercase mt-1 leading-none italic">Professional</span></div>
        </div>
        <nav className="flex-1 space-y-1.5">
          <SidebarItem icon={LayoutDashboard} label="管理總覽" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Users} label="成員看板" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
          <SidebarItem icon={Layers} label="開發看板" active={activeTab === 'board'} onClick={() => setActiveTab('board')} />
          <SidebarItem icon={Clock} label="排程軸線" active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} />
          <div className="h-px bg-slate-800/50 my-4 mx-2"></div>
          <SidebarItem icon={FileSpreadsheet} label="匯入&匯出工具" active={activeTab === 'excel'} onClick={() => setActiveTab('excel')} />
          <SidebarItem icon={Settings2} label="系統設定" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        <div className="mt-auto space-y-4 pt-4 border-t border-slate-800/80">
           <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-bold text-xs">{user.name.charAt(0)}</div>
                <div className="flex flex-col"><span className="text-[11px] font-bold text-slate-200">{user.name}</span><span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">{user.role}</span></div>
              </div>
              {isSyncing ? <Cloud size={14} className="text-indigo-500 animate-pulse" /> : <Check size={14} className="text-emerald-500" />}
           </div>
           <button onClick={() => { setUser(null); addToast("已安全登出系統"); }} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all font-bold text-xs"><LogOut size={16} /><span>登出系統</span></button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-6">
            <h1 className="text-base font-black text-slate-700 tracking-tight uppercase italic">
              {activeTab === 'dashboard' ? 'Analytics Overview' : activeTab === 'team' ? 'Team Workload' : activeTab === 'board' ? 'Development Kanban' : activeTab === 'excel' ? 'Data Management' : activeTab === 'settings' ? 'System Configuration' : 'Project Timeline'}
            </h1>
            <div className="h-5 w-px bg-slate-200"></div>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="快速查找..." className="pl-9 pr-4 py-1.5 bg-slate-100 rounded-lg text-xs outline-none w-56 transition-all font-semibold focus:ring-1 focus:ring-indigo-500/20" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${isSyncing ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
              {isSyncing ? <Loader2 size={12} className="text-indigo-600 animate-spin" /> : <Cloud size={12} className="text-slate-400" />}
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isSyncing ? 'text-indigo-600' : 'text-slate-400'}`}>{isSyncing ? '正在同步雲端...' : '雲端已連線'}</span>
            </div>
            <button onClick={handleAIAnalyze} disabled={isAnalyzing} className="flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-[10px] transition-all uppercase tracking-widest bg-slate-900 text-white hover:bg-black shadow-sm active:scale-95">
              {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} fill="#fbbf24" stroke="none" />}
              <span>{isAnalyzing ? '分析中...' : 'AI 生產診斷'}</span>
            </button>
          </div>
        </header>

        <div className="p-8 pb-32 max-w-[1300px] mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-2">
               {stats[TaskStatus.DELAYED] > 0 && (
                <div className="bg-rose-500 text-white rounded-2xl p-5 flex items-center justify-between shadow-md relative overflow-hidden">
                  <div className="flex items-center space-x-5 relative z-10">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-inner"><Bell size={24} /></div>
                    <div>
                      <h4 className="text-sm font-black uppercase italic">生產警報 / Warning</h4>
                      <p className="text-[10px] font-bold text-white/90 mt-0.5 uppercase tracking-wider">目前有 {stats[TaskStatus.DELAYED]} 個開發項目已延遲，請確認進度</p>
                    </div>
                  </div>
                  {user.role === 'MANAGER' && (
                    <button onClick={() => addToast(`已透過系統信箱 ${senderEmail} 發送催辦通知`)} className="px-5 py-2.5 bg-white text-rose-600 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center space-x-2">
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
                  <button key={idx} onClick={() => { setBoardFilter(s.status); setActiveTab('board'); }} className="bg-white p-6 rounded-[24px] border border-slate-200/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-left h-36 flex flex-col justify-between group">
                    <div className={`p-2 rounded-lg ${s.color.replace('text', 'bg')}/10 ${s.color} w-fit shadow-inner`}><s.icon size={18} strokeWidth={2.5} /></div>
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p><p className={`text-2xl font-black ${s.color} tracking-tighter italic leading-none`}>{s.value}</p></div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                 {[
                   { label: '設計階段', value: stats.phases.design, icon: Settings2, color: 'from-blue-500 to-indigo-600' },
                   { label: '組立進度', value: stats.phases.assembly, icon: Wrench, color: 'from-amber-400 to-orange-600' },
                   { label: '試模數據', value: stats.phases.trial, icon: Microscope, color: 'from-rose-400 to-pink-600' },
                   { label: '量試驗收', value: stats.phases.mass, icon: Factory, color: 'from-emerald-400 to-teal-600' }
                 ].map((p, i) => (
                   <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-200/50 shadow-sm flex items-center space-x-4 hover:border-indigo-100 transition-all group">
                     <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}><p.icon size={24} /></div>
                     <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{p.label}</p><div className="flex items-baseline space-x-1.5 leading-none"><p className="text-xl font-bold text-slate-800">{p.value}</p><span className="text-[9px] font-medium text-slate-400 uppercase">Tasks</span></div></div>
                   </div>
                 ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm flex flex-col h-[420px]">
                   <div className="flex items-center space-x-3 mb-6"><div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner"><TrendingUp size={18} /></div><h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">進度全域分佈 / Progress Stats</h3></div>
                   <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={[
                            { name: '待處理', value: stats[TaskStatus.TODO] }, 
                            { name: '進行中', value: stats[TaskStatus.IN_PROGRESS] }, 
                            { name: '審核中', value: stats[TaskStatus.REVIEW] }, 
                            { name: '已完成', value: stats[TaskStatus.DONE] }, 
                            { name: '已延遲', value: stats[TaskStatus.DELAYED] }
                          ]} 
                          layout="vertical"
                          barCategoryGap={8}
                          margin={{ right: 100, left: 10, top: 10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide domain={[0, (dataMax) => Math.max(dataMax + 6, 10)]} />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} 
                            width={70} 
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc', radius: 10 }} 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: 12, padding: '12px' }} 
                          />
                          <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20} background={{ fill: '#f8fafc', radius: 10 }}>
                            {[0,1,2,3,4].map((e,i) => (
                              <Cell 
                                key={i} 
                                fill={['#94a3b8', '#2563eb', '#d97706', '#059669', '#e11d48'][i]} 
                              />
                            ))}
                            <LabelList 
                              dataKey="value" 
                              position="right" 
                              offset={20}
                              style={{ fill: '#334155', fontSize: 14, fontWeight: 900, fontFamily: 'Inter' }} 
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-slate-950 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden flex flex-col h-[420px]">
                  <div className="flex items-center space-x-2.5 mb-6 relative z-10"><div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Sparkles size={18} fill="currentColor" /></div><h3 className="text-lg font-black tracking-tight uppercase italic leading-none">AI 技術診斷</h3></div>
                  {aiAnalysis ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 relative z-10 animate-in slide-in-from-bottom pr-1 text-left">
                      <div className="bg-indigo-600/10 p-4 rounded-xl border border-indigo-500/20">
                        <p className="text-[9px] font-bold text-indigo-400 uppercase mb-1.5 tracking-wider italic">健康評估</p>
                        <p className="text-[12px] leading-relaxed text-slate-200 font-medium italic">"{aiAnalysis.healthSummary}"</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle size={10} /> 加工瓶頸
                          </p>
                          <ul className="space-y-1">
                            {aiAnalysis.bottlenecks?.map((item: string, i: number) => (
                              <li key={i} className="text-[11px] text-slate-400 italic pl-3 border-l border-rose-500/40 leading-tight">{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={10} /> 延遲風險
                          </p>
                          <ul className="space-y-1">
                            {aiAnalysis.atRisk?.map((item: string, i: number) => (
                              <li key={i} className="text-[11px] text-slate-400 italic pl-3 border-l border-amber-500/40 leading-tight">{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest italic">改善建議策略</p>
                          <ul className="space-y-2">
                            {aiAnalysis.suggestions.map((item: string, i: number) => (
                              <li key={i} className="text-[11px] flex items-start space-x-2 text-slate-400 italic leading-tight group">
                                <ChevronRight size={12} className="text-indigo-500 mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                      <div className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${isAnalyzing ? 'animate-pulse' : ''}`}>{isAnalyzing ? <RefreshCw size={32} className="text-indigo-500 animate-spin" /> : <ZapOff size={32} className="text-slate-800" />}</div>
                      <div><p className="text-sm font-black text-slate-300 uppercase italic">AI 診斷已緒</p><p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">點擊上方啟動分析</p></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in duration-700 slide-in-from-bottom-2">
               <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-md flex flex-wrap items-center gap-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-md shadow-indigo-50">
                      <GanttChartSquare size={18} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight leading-none">排程軸線</h3>
                  </div>
                  <div className="h-8 w-px bg-slate-100 hidden md:block"></div>
                  <div className="flex items-center gap-4 flex-1">
                    <select value={timelineStatusFilter} onChange={(e) => setTimelineStatusFilter(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-bold outline-none cursor-pointer">
                      <option value="ALL">過濾狀態</option>{Object.values(TaskStatus).map(s => <option key={s} value={s}>{TaskStatusLabels[s]}</option>)}
                    </select>
                    <select value={timelinePhaseFilter} onChange={(e) => setTimelinePhaseFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-bold outline-none cursor-pointer">
                      <option value="ALL">過濾階段</option>{timelinePhaseList.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="flex bg-slate-100 p-1 rounded-lg flex-1 border border-slate-200/50">
                      {['ALL', 'THIS_WEEK', 'NEXT_WEEK', 'NEXT_MONTH'].map(id => (
                        <button key={id} onClick={() => setTimelineTimeFilter(id as any)} className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${timelineTimeFilter === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}>{id === 'ALL' ? '全部' : id === 'THIS_WEEK' ? '本週' : id === 'NEXT_WEEK' ? '下週' : id === 'NEXT_MONTH' ? '下月' : '全部'}</button>
                      ))}
                    </div>
                  </div>
               </div>
               <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-lg overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left table-fixed">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="w-32 pl-8 pr-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">模具案號</th>
                          <th className="w-auto px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">工序標題與階段</th>
                          <th className="w-40 px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">負責人員</th>
                          <th className="w-32 px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">截止日期</th>
                          <th className="w-48 px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">進度</th>
                          <th className="w-32 pr-8 pl-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">狀態</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredTasks.length > 0 ? filteredTasks.map(t => (
                          <tr key={t.id} className="group hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => { setSelectedTask(t); setShowDetailModal(true); }}>
                            <td className="pl-8 pr-4 py-3.5 whitespace-nowrap overflow-hidden">
                              <span className="text-[11px] font-bold text-indigo-700 italic">{t.moldName}</span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap overflow-hidden">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-bold text-slate-800 text-[12px] truncate max-w-[160px] leading-none">{t.title}</h4>
                                <span className="text-[8px] px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded font-bold uppercase shrink-0 leading-none">{t.tags[0]}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap overflow-hidden">
                              <div className="flex items-center space-x-2 bg-slate-50 w-fit pr-3 py-0.5 rounded-full border border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0">{t.assignee.charAt(0)}</div>
                                <span className="text-[11px] font-bold text-slate-700 uppercase">{t.assignee}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap overflow-hidden">
                              <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded border ${t.status === TaskStatus.DELAYED ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                <Calendar size={10} /><span className="text-[10px] font-bold italic">{t.dueDate}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap overflow-hidden">
                              <div className="flex items-center space-x-3">
                                <span className="text-[10px] font-bold text-slate-700 italic w-8 shrink-0">{t.progress}%</span>
                                <div className="flex-1 min-w-[80px]"><ProgressBar progress={t.progress} status={t.status} /></div>
                              </div>
                            </td>
                            <td className="pr-8 pl-4 py-3.5 text-right whitespace-nowrap overflow-hidden">
                              <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight shadow-sm ${STATUS_COLORS[t.status]}`}>{TaskStatusLabels[t.status]}</span>
                            </td>
                          </tr>
                        )) : (<tr><td colSpan={6} className="py-32 text-center opacity-30"><Search size={48} className="mx-auto text-slate-300" /><p className="text-sm font-bold uppercase mt-4 text-slate-400 tracking-widest">無相關數據</p></td></tr>)}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
              {members.map((m: any, idx: number) => {
                const ms = stats.memberStats[m.name] || { todo: 0, inProgress: 0, review: 0, delayed: 0, activeTasks: [] };
                const utilization = Math.min(((ms.todo + ms.inProgress + ms.review + ms.delayed) / 5) * 100, 100);
                const energyColor = utilization > 80 ? 'bg-rose-500' : utilization > 40 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <div key={idx} className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm flex flex-col md:flex-row hover:shadow-lg transition-all border-l-4 overflow-hidden group" style={{ borderLeftColor: utilization > 80 ? '#f43f5e' : '#10b981' }}>
                    <div className="md:w-1/3 bg-slate-50/50 p-6 border-r border-slate-100 flex flex-col items-center justify-between text-center">
                       <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-indigo-600 font-bold text-2xl relative border border-slate-100 group-hover:scale-105 transition-transform">{m.name.charAt(0)}<div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-slate-50 ${energyColor} flex items-center justify-center shadow-sm`}><Battery size={10} className="text-white" /></div></div>
                       <h3 className="text-lg font-black text-slate-800 mt-4 uppercase tracking-tight">{m.name}</h3>
                       <div className="w-full mt-4 bg-white p-3 rounded-xl shadow-inner border border-slate-100"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">負荷 {Math.round(utilization)}%</span><div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${energyColor}`} style={{ width: `${utilization}%` }}></div></div></div>
                    </div>
                    <div className="md:w-2/3 p-6 flex flex-col max-h-[260px] overflow-y-auto custom-scrollbar">
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-3 tracking-widest flex items-center"><Briefcase size={12} className="mr-2" />活躍任務</p>
                       <div className="space-y-2">
                          {ms.activeTasks.map((t: Task, i: number) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center cursor-pointer hover:bg-white hover:shadow-sm transition-all" onClick={() => { setSelectedTask(t); setShowDetailModal(true); }}>
                              <div className="text-left"><p className="text-[8px] font-bold text-indigo-600 uppercase tracking-tighter mb-0.5">{t.moldName}</p><p className="text-[11px] font-bold text-slate-700 tracking-tight truncate max-w-[140px]">{t.title}</p></div>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight shadow-sm ${STATUS_COLORS[t.status]}`}>{TaskStatusLabels[t.status]}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'board' && (
            <div className="flex flex-col space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-2">
               <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3"><div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-md"><Layers size={20} /></div><div><h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">工作看板 / Kanban</h2><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">開發工序技術同步</p></div></div>
                  {boardFilter && <button onClick={() => setBoardFilter(null)} className="flex items-center space-x-2 px-5 py-2 bg-white border border-indigo-600 rounded-lg text-[10px] font-bold uppercase text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm active:scale-95"><RotateCcw size={12} /><span>重置</span></button>}
               </div>
               <div className="flex space-x-5 overflow-x-auto pb-10 custom-scrollbar items-start min-h-[600px] -mx-8 px-8">
                {[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE, TaskStatus.DELAYED].filter(s => !boardFilter || s === boardFilter).map(status => {
                    const colTasks = tasks.filter(t => t.status === status);
                    return (
                      <div key={status} className="flex-shrink-0 w-[300px] bg-slate-200/20 rounded-[28px] p-3 flex flex-col h-full border border-slate-200/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between px-3 mb-5 sticky top-0 z-10 py-1">
                          <div className={`flex items-center space-x-2.5 px-4 py-2 rounded-lg shadow-md border ${status === TaskStatus.DELAYED ? 'bg-rose-600 text-white border-rose-500' : status === TaskStatus.DONE ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white text-slate-800 border-slate-100'}`}>
                            {status === TaskStatus.TODO ? <PauseCircle size={14} /> : status === TaskStatus.IN_PROGRESS ? <PlayCircle size={14} /> : status === TaskStatus.REVIEW ? <Eye size={14} /> : status === TaskStatus.DONE ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            <h3 className="font-bold text-[10px] uppercase tracking-wider">{TaskStatusLabels[status]}</h3>
                          </div>
                          <span className="bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full text-[9px] font-bold shadow-sm">{colTasks.length}</span>
                        </div>
                        <div className="space-y-3.5 flex-1">
                          {colTasks.map(t => (
                            <div key={t.id} onClick={() => { setSelectedTask(t); setShowDetailModal(true); }} className="bg-white p-5 rounded-[20px] border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden group">
                              <div className="flex items-start justify-between mb-2 text-left"><div><span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tighter mb-1 inline-block border border-indigo-100">{t.moldName}</span><h4 className="font-bold text-slate-800 text-[13px] tracking-tight leading-snug line-clamp-2">{t.title}</h4></div><PriorityBadge priority={t.priority} /></div>
                              <div className="mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 shadow-inner"><div className="flex justify-between items-center mb-1"><span className="text-[8px] font-bold text-slate-400 uppercase italic">Progress</span><span className="text-[10px] font-bold text-slate-800 italic">{t.progress}%</span></div><ProgressBar progress={t.progress} status={t.status} /></div>
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="flex items-center space-x-2"><div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">{t.assignee.charAt(0)}</div><span className="text-[9px] text-slate-700 font-bold uppercase">{t.assignee}</span></div>
                                <div className={`flex items-center space-x-1 px-2 py-1 rounded text-[9px] font-bold border ${t.status === TaskStatus.DELAYED ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}><Calendar size={10} /><span className="italic">{t.dueDate}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                })}
               </div>
            </div>
          )}

          {activeTab === 'excel' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center space-y-8 hover:shadow-lg transition-all border-t-4 border-t-indigo-600">
                      <div className="w-20 h-20 bg-indigo-50 rounded-[20px] flex items-center justify-center text-indigo-600 shadow-inner"><FileDown size={40} strokeWidth={1.5} /></div>
                      <div><h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">數據導出 / Export</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">包含技術節點與試模紀錄</p></div>
                      <button onClick={handleExportExcel} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest shadow-md active:scale-[0.98] transition-all flex items-center justify-center space-x-2"><Download size={18} /><span>導出 CSV 專業報表</span></button>
                  </div>
                  <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center space-y-8 hover:shadow-lg transition-all border-t-4 border-t-slate-900">
                      <div className="w-20 h-20 bg-slate-950 rounded-[20px] flex items-center justify-center text-white shadow-xl"><FileUp size={40} strokeWidth={1.5} /></div>
                      <div><h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">批量導入 / Import</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">快速建立多筆開發工序任務</p></div>
                      <div className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-8 group hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer relative">
                        <input type="file" accept=".csv" onChange={handleImportExcel} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="flex flex-col items-center space-y-3 pointer-events-none">
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:scale-105 transition-transform"><Table size={24} className="text-slate-400 group-hover:text-indigo-600 transition-colors" /></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">{importStatus === 'processing' ? '讀取中...' : '拖曳 CSV 檔案至此'}</span>
                        </div>
                      </div>
                      <button className="w-full py-4 bg-slate-950 text-white rounded-xl font-bold uppercase tracking-widest shadow-md active:scale-[0.98] transition-all flex items-center justify-center space-x-2"><Zap size={16} fill="#fbbf24" stroke="none" /><span>開始批量處理</span></button>
                  </div>
               </div>

               <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-10 overflow-hidden text-left">
                  <div className="flex items-center space-x-4 mb-6">
                     <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shadow-inner"><Info size={20} /></div>
                     <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">CSV 導入規範說明</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest italic">Import SOP Guidelines</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                       <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 text-indigo-600"><ListChecks size={14} />欄位順序</h4>
                       <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl space-y-3 shadow-inner text-[11px] font-medium text-slate-600">
                          <p>1. 模具案號 (ID)</p><p>2. 工序名稱 (Title)</p><p>3. 負責人員 (PIC)</p><p>4. 截止交期 (YYYY-MM-DD)</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 text-amber-500"><AlertTriangle size={14} />注意事項</h4>
                       <ul className="space-y-3">
                          {[
                            '檔案須為 .csv 編碼。',
                            '日期格式嚴格要求：2025-05-20。',
                            '第一行為標題列，系統會自動排除。'
                          ].map((text, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] font-semibold text-slate-500 italic">
                               <div className="w-4 h-4 bg-slate-800 rounded flex items-center justify-center text-white shrink-0 mt-0.5 font-bold text-[9px]">{i+1}</div>
                               <p className="leading-tight">{text}</p>
                            </li>
                          ))}
                       </ul>
                    </div>
                    <div className="space-y-3">
                       <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 text-emerald-500"><Activity size={14} />系統自動設定</h4>
                       <div className="bg-emerald-50/30 border border-emerald-100 p-5 rounded-2xl space-y-3 shadow-inner text-left text-[11px] font-bold text-emerald-800 italic">
                          <p>● 狀態：待處理</p><p>● 優先：中</p><p>● 進度：0%</p>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
               {user.role === 'MANAGER' && (
                 <>
                   <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden text-left">
                      <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-indigo-50/20"><UserPlus size={20} className="text-indigo-600" /><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">建立新帳號</h3></div>
                      <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-5">
                         <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">工號</label><input type="text" value={newMemberData.empId} onChange={e => setNewMemberData(p => ({...p, empId: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none" placeholder="E101" /></div>
                         <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">姓名</label><input type="text" value={newMemberData.name} onChange={e => setNewMemberData(p => ({...p, name: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none" /></div>
                         <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label><input type="email" value={newMemberData.email} onChange={e => setNewMemberData(p => ({...p, email: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none" /></div>
                         <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">權限</label><select value={newMemberData.role} onChange={e => setNewMemberData(p => ({...p, role: e.target.value as any}))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none cursor-pointer"><option value="ENGINEER">工程師</option><option value="MANAGER">主管</option></select></div>
                         <div className="md:col-span-4 flex justify-end pt-2"><button onClick={handleCreateMember} className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-md">確認建立</button></div>
                      </div>
                   </div>

                   <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden text-left">
                      <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-rose-50/20"><Mail size={20} className="text-rose-600" /><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">郵件系統配置 / Email Config</h3></div>
                      <div className="p-8">
                         <div className="max-w-md space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">系統寄件人信箱 / System Sender Email</label>
                            <div className="flex space-x-3">
                               <input 
                                 type="email" 
                                 value={senderEmail} 
                                 onChange={e => setSenderEmail(e.target.value)} 
                                 className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500/20" 
                                 placeholder="system@moldplm.com" 
                               />
                               <button onClick={() => addToast("郵件設定已同步至雲端")} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-md active:scale-95">儲存設定</button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium italic">此信箱將用於發送進度催辦與系統通知訊息。</p>
                         </div>
                      </div>
                   </div>
                 </>
               )}
               <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden text-left">
                  <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-slate-50/40"><Key size={20} className="text-slate-800" /><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">安全中心 / Security</h3></div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">舊密碼</label><input type="password" value={passChangeForm.old} onChange={e => setPassChangeForm(p => ({...p, old: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none" /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">新密碼</label><input type="password" value={passChangeForm.new} onChange={e => setPassChangeForm(p => ({...p, new: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none" /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">確認新密碼</label><input type="password" value={passChangeForm.confirm} onChange={e => setPassChangeForm(p => ({...p, confirm: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none" /></div>
                    <div className="md:col-span-3 flex justify-end pt-2"><button onClick={handlePassChange} className="px-8 py-3 bg-slate-950 text-white rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-md">變更密碼</button></div>
                  </div>
               </div>
            </div>
          )}
        </div>
        {user.role === 'MANAGER' && <button onClick={() => { setEditingTask(null); setFormData({ moldName: '', title: '', description: '', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: user.name, startDate: getDateOffset(0), dueDate: getDateOffset(7), progress: 0, tags: ['模具設計'] }); setShowTaskModal(true); }} className="fixed bottom-10 right-10 w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl z-40 hover:-translate-y-1 hover:rotate-90 transition-all active:scale-90 shadow-indigo-100"><Plus size={28} strokeWidth={3} /></button>}
      </main>

      {/* Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[70] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] w-full max-w-5xl shadow-3xl overflow-hidden flex flex-col md:flex-row h-[85vh] border border-white/20 animate-in zoom-in-95 duration-400">
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white flex flex-col">
               <div className={`px-10 py-10 relative ${selectedTask.status === TaskStatus.DELAYED ? 'bg-rose-50/30' : 'bg-slate-50/30'}`}>
                  <div className="relative z-10 flex items-start justify-between gap-6 text-left">
                    <div className="flex items-start space-x-6 flex-1">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0 mt-1 ${selectedTask.status === TaskStatus.DONE ? 'bg-emerald-600' : selectedTask.status === TaskStatus.DELAYED ? 'bg-rose-600' : 'bg-indigo-600'} text-white transition-all group`}><Target size={32} strokeWidth={2} className="group-hover:rotate-12 transition-transform" /></div>
                      <div className="flex flex-col space-y-3 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <div className="flex items-center space-x-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap">
                            <Box size={10} className="fill-white/20" />
                            <span className="text-[10px] font-bold uppercase tracking-wider italic">{selectedTask.moldName}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedTask.id}</span>
                          <div className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></div>
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest italic whitespace-nowrap">{selectedTask.tags[0]}</span>
                          <PriorityBadge priority={selectedTask.priority} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase italic tracking-tighter leading-snug break-words">{selectedTask.title}</h2>
                      </div>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm active:scale-90 shrink-0 mt-1"><X size={20} /></button>
                  </div>
               </div>
               <div className="p-10 space-y-8 flex-1 text-left">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 bg-slate-100/30 p-6 rounded-[24px] border border-slate-200/50 shadow-inner">
                    <InfoRow label="負責專員" icon={UserCircle2} value={selectedTask.assignee} /><InfoRow label="加工階段" icon={Layers} value={selectedTask.tags[0]} colorClass="text-indigo-600" />
                    <InfoRow label="啟動日期" icon={Calendar} value={selectedTask.startDate} /><InfoRow label="截止日期" icon={CalendarDays} value={selectedTask.dueDate} colorClass={selectedTask.status === TaskStatus.DELAYED ? "text-rose-700" : "text-slate-800"} />
                    <InfoRow label="當前狀態" icon={ShieldAlert} value={TaskStatusLabels[selectedTask.status]} colorClass={selectedTask.status === TaskStatus.DONE ? 'text-emerald-700' : selectedTask.status === TaskStatus.DELAYED ? 'text-rose-700' : 'text-slate-700'} />
                    <InfoRow label="案件類型" icon={Box} value="一般開發件" colorClass="text-slate-400 italic" />
                 </div>
                 <div className="space-y-5 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-1"><div className="flex items-center space-x-3"><Activity size={18} className="text-indigo-600" /><h4 className="text-sm font-black text-slate-700 uppercase tracking-tighter italic">當前工進 / Progress</h4></div><div className="flex items-baseline space-x-1 font-bold"><span className="text-3xl text-slate-800 tracking-tighter italic">{selectedTask.progress}</span><span className="text-[10px] text-slate-400 uppercase">%</span></div></div>
                    <ProgressBar progress={selectedTask.progress} status={selectedTask.status} />
                 </div>
                 <div className="space-y-3"><div className="flex items-center space-x-2"><StickyNote size={16} className="text-indigo-400" /><h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest italic">備註說明</h4></div><div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-200 text-[13px] font-semibold text-slate-500 leading-relaxed italic shadow-inner">{selectedTask.description || '目前無額外技術說明。'}</div></div>
                 {user.role === 'MANAGER' && (
                   <div className="flex items-center space-x-4 pt-4">
                     <button onClick={() => { if(window.confirm('確定移除？')) { setTasks(tasks.filter(t => t.id !== selectedTask.id)); setShowDetailModal(false); } }} className="px-6 py-3.5 text-rose-600 font-bold text-[10px] uppercase tracking-widest border border-rose-100 rounded-xl hover:bg-rose-50 transition-all flex items-center space-x-2 active:scale-95"><Trash2 size={14} /><span>移除任務</span></button>
                     <button onClick={() => { setShowDetailModal(false); setEditingTask(selectedTask); setFormData({ ...selectedTask }); setShowTaskModal(true); }} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black active:scale-[0.98] transition-all text-[10px] uppercase tracking-widest flex items-center justify-center space-x-3"><Edit3 size={14} /><span>修改數據</span></button>
                   </div>
                 )}
               </div>
            </div>
            <div className="w-full md:w-[380px] bg-slate-50 border-l border-slate-200/50 flex flex-col h-full overflow-hidden">
               <div className="p-6 border-b border-slate-200 bg-white sticky top-0 flex items-center justify-between z-10 shadow-sm">
                  <div className="flex items-center space-x-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-inner"><Activity size={18} /></div><h4 className="font-bold text-xs text-slate-800 uppercase italic tracking-tight">試模紀錄</h4></div>
                  <button onClick={() => setShowTrialForm(!showTrialForm)} className="flex items-center space-x-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm active:scale-90">{showTrialForm ? <X size={12} /> : <PlusSquare size={12} />}<span>{showTrialForm ? '取消' : '回報'}</span></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {showTrialForm && (
                    <div className="bg-white p-5 rounded-[24px] border-2 border-indigo-100 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-300">
                       <h5 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest text-left">回報試模</h5>
                       <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1 text-left"><label className="text-[9px] font-bold text-slate-400 uppercase">Version</label><input type="text" value={trialFormData.version} onChange={e => setTrialFormData(p => ({...p, version: e.target.value}))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold shadow-inner outline-none" /></div>
                          <div className="space-y-1 text-left"><label className="text-[9px] font-bold text-slate-400 uppercase">Result</label><select value={trialFormData.result} onChange={e => setTrialFormData(p => ({...p, result: e.target.value as any}))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold shadow-inner outline-none cursor-pointer"><option value="PENDING">PENDING</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="ADJUST">ADJUST</option></select></div>
                       </div>
                       <textarea value={trialFormData.condition} onChange={e => setTrialFormData(p => ({...p, condition: e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold h-20 resize-none shadow-inner outline-none" placeholder="輸入成型狀況描述..." />
                       <button onClick={handleAddTrial} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-md active:scale-95">確認儲存</button>
                    </div>
                  )}
                  {selectedTask.trials && selectedTask.trials.length > 0 ? [...selectedTask.trials].reverse().map((tr: any, i: number) => (
                    <div key={tr.id || i} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all group/card relative text-left">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2.5"><div className={`w-2.5 h-2.5 rounded-full shadow-sm ${tr.result === 'PASS' ? 'bg-emerald-500' : tr.result === 'FAIL' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`}></div><span className="text-[10px] font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-lg italic border border-slate-100">{tr.version} Trial</span></div>
                          <div className="flex items-center space-x-1 text-slate-400"><Clock size={10} /><span className="text-[10px] font-bold italic">{tr.date}</span></div>
                       </div>
                       <p className="text-[11px] font-semibold text-slate-500 leading-relaxed italic mb-5 border-l-2 border-slate-100 pl-3">{tr.condition}</p>
                       {tr.aiAdvice ? (
                         <div className="bg-indigo-600 text-white p-4 rounded-[20px] shadow-lg relative overflow-hidden"><div className="flex items-center space-x-2 mb-2"><Zap size={12} className="text-amber-400 fill-amber-400" /><span className="text-[9px] font-bold uppercase text-indigo-100 tracking-wider">AI 對策 / Advice</span></div><p className="text-[11px] font-medium leading-relaxed italic">"{tr.aiAdvice}"</p></div>
                       ) : (
                         <button onClick={() => handleGetTrialAdvice(tr)} disabled={isAnalyzingTrialId === tr.id} className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center space-x-2 transition-all active:scale-95 ${isAnalyzingTrialId === tr.id ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-slate-900 text-white hover:bg-black shadow-md'}`}>{isAnalyzingTrialId === tr.id ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} fill="#fbbf24" stroke="none" />}<span>{isAnalyzingTrialId === tr.id ? '分析中...' : '獲取 AI 對策'}</span></button>
                       )}
                    </div>
                  )) : (<div className="flex flex-col items-center justify-center py-24 opacity-20"><ClipboardList size={48} className="text-slate-400" /><p className="text-[10px] font-bold uppercase mt-4 tracking-widest">尚無紀錄</p></div>)}
               </div>
               <div className="p-6 bg-white border-t border-slate-100"><button onClick={() => setShowDetailModal(false)} className="w-full py-3.5 text-slate-500 font-bold text-[10px] uppercase tracking-widest bg-slate-50 rounded-xl hover:bg-slate-100 transition-all active:scale-95"><span>返回列表</span></button></div>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-xl shadow-3xl animate-in zoom-in-95 duration-400 overflow-hidden border border-white/20">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
                  <PlusCircle size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase italic leading-none">
                    {editingTask ? '修改開發節點' : '建立模具任務'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 italic">Mold Development Node Configuration</p>
                </div>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar text-left bg-white">
               {/* 案號與工序標題 */}
               <div className="space-y-5">
                 <div className="space-y-2">
                   <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block italic">案號 / Mold ID</label>
                   <input 
                     type="text" 
                     value={formData.moldName} 
                     onChange={e => setFormData(p => ({...p, moldName: e.target.value}))} 
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 text-sm shadow-inner placeholder:text-slate-300" 
                     placeholder="例如: MOLD-X001" 
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block italic">工序標題 / Task Name</label>
                   <input 
                     type="text" 
                     value={formData.title} 
                     onChange={e => setFormData(p => ({...p, title: e.target.value}))} 
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 text-sm shadow-inner placeholder:text-slate-300" 
                     placeholder="輸入任務描述 (例如: 3D 流道設計優化)"
                   />
                 </div>
               </div>

               {/* 加工階段選擇 */}
               <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block italic">加工階段選擇 / Phase Selection</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {timelinePhaseList.map((phase) => (
                      <button 
                        key={phase} 
                        type="button" 
                        onClick={() => setFormData(p => ({...p, tags: [phase]}))} 
                        className={`px-3 py-3.5 rounded-xl text-[10px] font-bold uppercase transition-all border shadow-sm ${
                          formData.tags?.includes(phase) 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200' 
                          : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50'
                        }`}
                      >
                        {phase}
                      </button>
                    ))}
                  </div>
               </div>

               {/* 負責人與進度 */}
               <div className="space-y-5">
                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block italic">負責專員 / Person in Charge</label>
                    <select 
                      value={formData.assignee} 
                      onChange={e => setFormData(p => ({...p, assignee: e.target.value}))} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none shadow-inner cursor-pointer text-sm focus:border-indigo-500 transition-all appearance-none"
                    >
                      {members.map((m: any) => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block italic">完成進度 % / Progress</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={formData.progress} 
                      onChange={e => setFormData(p => ({...p, progress: Number(e.target.value)}))} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-left shadow-inner text-sm focus:border-indigo-500 transition-all text-indigo-600" 
                    />
                  </div>
               </div>

               {/* 日期欄位：改為上下垂直排列並統一寬度 */}
               <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block italic">啟動日期 / Start Date</label>
                    <div className="relative group">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" size={18} />
                      <input 
                        type="date" 
                        value={formData.startDate} 
                        onChange={e => setFormData(p => ({...p, startDate: e.target.value}))} 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 text-sm shadow-inner cursor-pointer focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all outline-none" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block italic">截止日期 / Deadline</label>
                    <div className="relative group">
                      <CalendarDays className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-rose-500 transition-colors pointer-events-none" size={18} />
                      <input 
                        type="date" 
                        value={formData.dueDate} 
                        onChange={e => setFormData(p => ({...p, dueDate: e.target.value}))} 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 text-sm shadow-inner cursor-pointer focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 focus:bg-white transition-all outline-none" 
                      />
                    </div>
                  </div>
               </div>

               {/* 備註說明 */}
               <div className="space-y-2 text-left">
                 <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block italic">技術說明與備註 / Remarks</label>
                 <textarea 
                   value={formData.description} 
                   onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold h-28 resize-none shadow-inner outline-none text-sm italic text-slate-500 focus:border-indigo-500 transition-all placeholder:text-slate-300" 
                   placeholder="若有模具特殊加工需求或限制請於此註明..."
                 />
               </div>
            </div>
            
            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-5">
              <button 
                onClick={() => setShowTaskModal(false)} 
                className="px-6 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all active:scale-95"
              >
                取消退出
              </button>
              <button 
                onClick={handleSaveTask} 
                className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all text-xs uppercase tracking-widest italic flex items-center space-x-3"
              >
                <CheckCircle2 size={18} />
                <span>儲存技術數據</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;