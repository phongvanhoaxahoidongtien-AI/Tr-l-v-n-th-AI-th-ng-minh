import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NormalizeResult, DocumentTypeItem, AgencySettings } from '../types';
import { getOfficerSalutation } from '../utils/officerSalutation';
import { generateDecree30A4Html } from '../services/decree30Formatter';
import { downloadWordDocument, copyFormattedDocument } from '../services/fileDownloader';
import { analyzeDocumentText } from '../services/documentAnalyzer';
import { DocumentAnalysisReportView } from './DocumentAnalysisReportView';
import { InteractiveDocumentEditor } from './InteractiveDocumentEditor';
import { checkVietnameseSpelling, autoFixVietnameseSpelling, SpellingErrorMatch } from '../utils/vietnameseSpellingChecker';
import { 
  AlertTriangle, CheckCircle, ShieldCheck, ArrowRight, ArrowLeft, 
  Copy, FileCheck, Eye, GitCompare, Sparkles, Check, X, Edit3, Printer,
  Search, Replace, ChevronDown, ChevronUp, RefreshCw, Download, FileText, Home, Wand2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Step3ExpertAnalysisProps {
  result: NormalizeResult;
  selectedType: DocumentTypeItem;
  agencySettings: AgencySettings;
  originalText: string;
  onApplyAgencyFix: () => void;
  onDismissAgencyFix: () => void;
  onNext: () => void;
  onBack: () => void;
  onUpdateNormalizedText: (text: string) => void;
  onGoHome?: () => void;
}

export const Step3ExpertAnalysis: React.FC<Step3ExpertAnalysisProps> = ({
  result,
  selectedType,
  agencySettings,
  originalText,
  onApplyAgencyFix,
  onDismissAgencyFix,
  onNext,
  onBack,
  onUpdateNormalizedText,
  onGoHome
}) => {
  const [activeTab, setActiveTab] = useState<'paper' | 'report' | 'edit' | 'diff' | 'errors'>('paper');
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedWord, setIsCopiedWord] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [hasCompletedAgencySync, setHasCompletedAgencySync] = useState(false);

  // Soát lỗi chính tả chuyên sâu thời gian thực
  const spellingCheckList = useMemo(() => {
    return checkVietnameseSpelling(result.noiDungChuanHoa);
  }, [result.noiDungChuanHoa]);

  // Phát âm thanh chúc mừng pháo hoa nhẹ nhàng (Web Audio API offline)
  const playFireworksChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // Hợp âm Đô trưởng C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
      });
    } catch (e) {
      // ignore
    }
  };

  // Kích hoạt pháo hoa chúc mừng khi người dùng bấm Chuẩn hóa thông tin cài đặt
  const handleNormalizeAgencyWithFireworks = () => {
    playFireworksChime();
    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 40, spread: 360, ticks: 70, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 55 * (timeLeft / duration);
      // Pháo hoa 2 bên bắn lên
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors: ['#ff0000', '#ffd700', '#00ff88', '#00e1ff', '#ff00ea', '#ff6b00'] });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors: ['#ff0000', '#ffd700', '#00ff88', '#00e1ff', '#ff00ea', '#ff6b00'] });
    }, 220);

    // Bắn chùm pháo hoa cực lớn ở trung tâm
    confetti({
      particleCount: 160,
      spread: 120,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ffd700', '#ec4899']
    });

    setHasCompletedAgencySync(true);
    onApplyAgencyFix();
  };

  // Báo cáo phân tích chuyên sâu chuẩn trolyvanthu.isavn.edu.vn
  const analysisReport = useMemo(() => {
    return result.analysisReport || analyzeDocumentText(result.noiDungChuanHoa, agencySettings, selectedType.category, selectedType.name);
  }, [result.analysisReport, result.noiDungChuanHoa, agencySettings, selectedType.category, selectedType.name]);

  // Search & Replace states (Ctrl + F, Ctrl + H)
  const [showSearch, setShowSearch] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [replaceNotice, setReplaceNotice] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Trigger celebration confetti when entering step with high score
  useEffect(() => {
    if (result.diemSau >= 90) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#dc2626', '#f59e0b', '#10b981']
        });
      } catch (e) {
        // ignore
      }
    }
  }, [result.diemSau]);

  // Global Keyboard shortcuts: Ctrl + F & Ctrl + H
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      // Ctrl+H or Cmd+H
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowSearch(true);
        setShowReplace(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      // Escape to close
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.noiDungChuanHoa).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleCopyWordFormat = async () => {
    const success = await copyFormattedDocument(renderedA4Html, result.noiDungChuanHoa);
    if (success) {
      setIsCopiedWord(true);
      setTimeout(() => setIsCopiedWord(false), 2500);
    }
  };

  const handleDownloadWordDoc = async () => {
    const safeName = (selectedType.name || 'VanBan').replace(/\s+/g, '_');
    setDownloadNotice('Đang tải tệp Word (.doc) về máy...');
    const res = await downloadWordDocument({
      htmlContent: renderedA4Html,
      fileName: `${safeName}_ChuanHoa_ND30.doc`,
      plainText: result.noiDungChuanHoa
    });
    if (res.success) {
      setDownloadNotice('Đã tải file Word thành công!');
      setTimeout(() => setDownloadNotice(null), 3000);
    } else {
      setDownloadNotice(res.message || 'Lỗi tải file. Hãy dùng nút Sao chép sang Word!');
      setTimeout(() => setDownloadNotice(null), 4000);
    }
  };

  // Tính số lượng kết quả tìm kiếm
  const matchesCount = searchQuery.trim()
    ? (result.noiDungChuanHoa.match(new RegExp(searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi')) || []).length
    : 0;

  // Thực hiện Thay thế 1 vị trí
  const handleReplaceOne = () => {
    if (!searchQuery.trim()) return;
    const regex = new RegExp(searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    if (regex.test(result.noiDungChuanHoa)) {
      const newText = result.noiDungChuanHoa.replace(regex, replaceQuery);
      onUpdateNormalizedText(newText);
      setReplaceNotice('Đã thay thế 1 vị trí!');
      setTimeout(() => setReplaceNotice(null), 1500);
    }
  };

  // Thực hiện Thay thế tất cả (Replace All)
  const handleReplaceAll = () => {
    if (!searchQuery.trim()) return;
    const regex = new RegExp(searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    const count = (result.noiDungChuanHoa.match(regex) || []).length;
    if (count > 0) {
      const newText = result.noiDungChuanHoa.replace(regex, replaceQuery);
      onUpdateNormalizedText(newText);
      setReplaceNotice(`Đã thay thế tất cả ${count} vị trí!`);
      setTimeout(() => setReplaceNotice(null), 2000);
    } else {
      setReplaceNotice('Không tìm thấy từ khóa cần thay thế.');
      setTimeout(() => setReplaceNotice(null), 1500);
    }
  };

  const renderedA4Html = generateDecree30A4Html(
    result.noiDungChuanHoa, 
    agencySettings, 
    selectedType.category,
    selectedType.name
  );

  return (
    <div className="space-y-6 font-serif">
      
      {/* Top Quick Bar with HOME button */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              title="Quay về Trang chủ mặc định (HOME)"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs sm:text-sm font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
            >
              <Home className="w-4 h-4 text-amber-700" />
              <span>Trang chủ (HOME)</span>
            </button>
          )}
          <span className="text-xs font-bold text-slate-700">
            Bước 3: Nhận dạng thể thức (Ý kiến chuyên gia & Chấm điểm Nghị định 30)
          </span>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span>Sang Bước 4: Chỉnh sửa văn bản</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Critical Agency & Location Difference Warning */}
      {result.canhBaoCoQuan && (
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-500 rounded-2xl p-5 shadow-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm text-2xl">
              👧
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded font-sans">
                  Tiểu Bảo Bối lưu ý
                </span>
                <span className="text-xs font-semibold text-amber-800 font-sans">
                  Phát hiện khác biệt tên Cơ quan / Địa danh
                </span>
              </div>

              <p className="text-sm md:text-[15px] font-bold text-amber-950 mt-1.5 leading-relaxed">
                {result.canhBaoCoQuan}
              </p>

              <div className="mt-2 text-xs text-amber-800 bg-white/80 p-2.5 rounded-lg border border-amber-300 font-sans">
                <span>Cài đặt của {getOfficerSalutation(agencySettings).shortName}: </span>
                <strong className="text-amber-950 font-serif">{agencySettings.agencyName || 'Chưa cài'}</strong>
                {agencySettings.shortLocation && (
                  <span> — Địa danh: <strong className="text-amber-950 font-serif">{agencySettings.shortLocation}</strong></span>
                )}
              </div>

              {/* Confirmation Question & Actions */}
              <div className="mt-4 pt-3 border-t border-amber-300/80 flex flex-wrap items-center gap-3">
                <span className="text-xs sm:text-sm font-bold text-amber-950">
                  {getOfficerSalutation(agencySettings).shortName} ơi, Tiểu Bảo Bối Bối sửa thành tên cơ sở đã cài đặt không?
                </span>

                <button
                  type="button"
                  onClick={handleNormalizeAgencyWithFireworks}
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 font-sans ring-2 ring-emerald-400/50"
                >
                  <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                  <span>Chuẩn hóa thông tin cài đặt</span>
                </button>

                <button
                  type="button"
                  onClick={onDismissAgencyFix}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer font-sans"
                >
                  <X className="w-3.5 h-3.5 inline mr-1" />
                  Giữ nguyên theo văn bản gốc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hiệu ứng pháo hoa thông báo hoàn thành chuẩn hóa tên cơ sở theo cài đặt */}
      {hasCompletedAgencySync && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 shadow-lg animate-fade-in font-sans">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="text-3xl sm:text-4xl animate-bounce shrink-0">🎆</span>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-emerald-950 flex flex-wrap items-center gap-2">
                  <span>ĐÃ HOÀN THÀNH CHUẨN HÓA THÔNG TIN CÀI ĐẶT THÀNH CÔNG!</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold">100% Khớp Cài Đặt</span>
                </h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  Tiểu Bảo Bối Bối đã thay thế tên cơ sở: <strong>"{agencySettings.agencyName}"</strong> và địa danh <strong>"{agencySettings.shortLocation}"</strong> vào toàn bộ văn bản.
                </p>
              </div>
            </div>
            <span className="text-2xl hidden md:inline">✨</span>
          </div>
        </div>
      )}

      {/* Compliance Scoreboard */}
      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          
          {/* Score Before */}
          <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center font-black shadow-xs font-sans">
              <span className="text-xl leading-none">{result.diemTruoc}</span>
              <span className="text-[10px] text-red-200">/ 100</span>
            </div>
            <div>
              <div className="text-xs font-bold text-red-800 uppercase tracking-wide font-sans">
                Điểm thể thức ban đầu
              </div>
              <div className="text-xs text-red-600 mt-0.5 font-sans">
                Còn tồn tại lỗi chính tả & chưa khớp mẫu
              </div>
            </div>
          </div>

          {/* Transformation Arrow */}
          <div className="text-center hidden md:block">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold font-sans border border-rose-200">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              Tiểu Bảo Bối đã chuẩn hóa
            </div>
            <div className="text-xs text-slate-500 mt-1 font-sans">
              Phát hiện & sửa: <strong className="text-slate-800">{result.soLoi} lỗi</strong>
            </div>
          </div>

          {/* Score After */}
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center font-black shadow-xs font-sans">
              <span className="text-xl leading-none">{result.diemSau}</span>
              <span className="text-[10px] text-emerald-200">/ 100</span>
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1 font-sans">
                Điểm sau chuẩn hóa
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xs text-emerald-700 mt-0.5 font-sans">
                Chuẩn Nghị định 30/2020 & Hướng dẫn 05
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Document Workspace */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        
        {/* Tab Buttons & Search/Replace Trigger Bar */}
        <div className="p-3.5 md:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 font-sans">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                title="Quay về Trang chủ mặc định (HOME)"
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              >
                <Home className="w-4 h-4 text-amber-700" />
                <span>Trang chủ</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('paper')}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'paper'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              Trang in A4 chuẩn NĐ 30 & HD 05
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Báo cáo phân tích thể thức</span>
              {analysisReport.reviewIssues.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {analysisReport.reviewIssues.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Chỉnh sửa trực tiếp
            </button>

            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              So sánh Trước - Sau
            </button>

            <button
              onClick={() => setActiveTab('errors')}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'errors'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              Lỗi đã sửa ({result.danhSachLoi.length})
            </button>
          </div>

          {/* Quick Action Tools: Search (Ctrl+F) & Replace (Ctrl+H) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setShowSearch(true);
                setShowReplace(false);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              title="Tìm kiếm văn bản (Phím tắt: Ctrl + F)"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                showSearch && !showReplace
                  ? 'bg-rose-100 border-rose-400 text-rose-900'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-rose-700" />
              <span>Tìm (Ctrl+F)</span>
            </button>

            <button
              onClick={() => {
                setShowSearch(true);
                setShowReplace(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              title="Tìm kiếm và Thay thế (Phím tắt: Ctrl + H)"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                showSearch && showReplace
                  ? 'bg-rose-100 border-rose-400 text-rose-900'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Replace className="w-3.5 h-3.5 text-rose-700" />
              <span>Thay thế (Ctrl+H)</span>
            </button>

            <button
              onClick={() => window.print()}
              title="Xem bản in A4 hoặc xuất PDF"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>In A4</span>
            </button>

            <button
              onClick={handleCopyWordFormat}
              title="Sao chép toàn bộ bảng 2 cột & căn lề chuẩn NĐ 30 để dán (Ctrl+V) vào Microsoft Word"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isCopiedWord ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <FileCheck className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{isCopiedWord ? 'Đã sao chép Word!' : 'Sao chép Word'}</span>
            </button>

            <button
              onClick={handleDownloadWordDoc}
              title="Tải file Word (.doc) căn lề 2 cột chuẩn NĐ 30 về máy"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Tải .doc</span>
            </button>

            <button
              onClick={handleCopy}
              title="Sao chép văn bản thuần"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 cursor-pointer"
            >
              {isCopied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Đã chép text' : 'Chép text'}</span>
            </button>
          </div>
        </div>

        {downloadNotice && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-900 text-xs font-sans font-semibold flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{downloadNotice}</span>
          </div>
        )}

        {/* Floating / Docked Search & Replace Toolbar (Ctrl + F, Ctrl + H) */}
        {showSearch && (
          <div className="p-3 bg-amber-50/90 border-b border-amber-300 flex flex-wrap items-center gap-2.5 font-sans animate-fade-in text-xs">
            <div className="flex items-center gap-1.5 bg-white border border-amber-400 rounded-lg px-2.5 py-1 shadow-inner min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-amber-700" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kiếm từ ngữ (Ctrl+F)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-xs text-slate-900 font-serif"
              />
              {searchQuery && (
                <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">
                  {matchesCount} kết quả
                </span>
              )}
            </div>

            {/* Replace Input */}
            {showReplace && (
              <div className="flex items-center gap-1.5 bg-white border border-amber-400 rounded-lg px-2.5 py-1 shadow-inner min-w-[200px]">
                <Replace className="w-3.5 h-3.5 text-amber-700" />
                <input
                  type="text"
                  placeholder="Thay thế bằng (Ctrl+H)..."
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-xs text-slate-900 font-serif"
                />
              </div>
            )}

            {showReplace && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReplaceOne}
                  disabled={!searchQuery.trim()}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-md cursor-pointer transition-colors"
                >
                  Thay thế
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={!searchQuery.trim()}
                  className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold rounded-md cursor-pointer transition-colors"
                >
                  Thay thế tất cả
                </button>
              </div>
            )}

            {replaceNotice && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                {replaceNotice}
              </span>
            )}

            <button
              onClick={() => setShowSearch(false)}
              className="ml-auto p-1 rounded-md text-amber-900 hover:bg-amber-200 transition-colors"
              title="Đóng thanh tìm kiếm (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: Real A4 Format with 2-Column Tables per Decree 30 */}
        {activeTab === 'paper' && (
          <div className="p-4 md:p-8 bg-slate-200/90 flex flex-col items-center overflow-x-auto">
            
            {/* Quick helper tip above A4 sheet */}
            <div className="max-w-[820px] w-full mb-3 flex items-center justify-between text-xs text-slate-600 font-sans">
              <span>Định dạng A4 chuẩn Nghị định 30 & HD 05 • Lề trái 3cm, trên 2cm, dưới 2cm, phải 2cm</span>
              <button 
                onClick={() => setActiveTab('edit')}
                className="text-rose-700 hover:text-rose-900 font-bold underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Chuyển sang sửa trực tiếp văn bản
              </button>
            </div>

            {/* Real A4 Sheet */}
            <div 
              className="w-full max-w-[820px] bg-white rounded-sm shadow-2xl border border-slate-300 p-8 md:p-14 min-h-[920px] select-text relative"
              style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: renderedA4Html }} 
              />
            </div>
          </div>
        )}

        {/* Tab 2: Deep Analysis Report (Chuẩn trolyvanthu.isavn.edu.vn) */}
        {activeTab === 'report' && (
          <div className="p-4 md:p-8 bg-slate-50 font-sans">
            <div className="max-w-4xl mx-auto">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 font-serif">
                    Báo cáo phân tích thể thức & văn phong chi tiết
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đối soát theo Nghị định 30/2020/NĐ-CP của Chính phủ và Hướng dẫn 05-HD/VPTW của Ban Chấp hành Trung ương
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('paper')}
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem trang in A4 chuẩn</span>
                </button>
              </div>

              <DocumentAnalysisReportView 
                report={analysisReport} 
                onJumpToEdit={() => setActiveTab('edit')} 
              />
            </div>
          </div>
        )}

        {/* Tab 3: Interactive 3-Section Editor with Click-to-Fix Highlights (Chuẩn trolyvanthu.isavn.edu.vn) */}
        {activeTab === 'edit' && (
          <div className="p-4 md:p-6 bg-slate-50 font-sans">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="font-bold text-rose-800 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-rose-600" />
                  Chỉnh sửa 3 hạng mục văn bản (Đầu văn bản • Nội dung tô vàng • Nơi nhận & Chữ ký):
                </span>
                <span>Dùng phím tắt <strong>Ctrl+F</strong> để tìm kiếm hoặc <strong>Ctrl+H</strong> để thay thế</span>
              </div>

              <InteractiveDocumentEditor
                normalizedText={result.noiDungChuanHoa}
                selectedType={selectedType}
                agencySettings={agencySettings}
                onUpdateText={onUpdateNormalizedText}
                analysisReport={analysisReport}
              />

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Font chữ: Times New Roman • Bảng mã: Unicode dựng sẵn • Căn lề A4 chuẩn NĐ 30</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('paper')}
                  className="font-bold text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem lại trang in A4 chuẩn NĐ 30 →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Diff view */}
        {activeTab === 'diff' && (
          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50">
            <div>
              <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1 font-sans">
                <span>🔴 Văn bản gốc ban đầu (Chưa sửa):</span>
              </div>
              <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[550px] overflow-y-auto">
                {originalText}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1 font-sans">
                <span>🟢 Văn bản sau khi Tiểu Bảo Bối chuẩn hóa:</span>
              </div>
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 font-serif text-sm leading-relaxed text-slate-900 whitespace-pre-wrap max-h-[550px] overflow-y-auto">
                {result.noiDungChuanHoa}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Errors and Recommendations */}
        {activeTab === 'errors' && (
          <div className="p-5 md:p-6 space-y-6">
            {/* Thẻ soát lỗi chính tả chuyên sâu */}
            {spellingCheckList.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50/90 border-2 border-amber-400 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-600 text-white">
                      <Wand2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="font-bold text-amber-950 text-sm">
                        Phát hiện {spellingCheckList.length} lỗi chính tả & văn phong:
                      </h5>
                      <p className="text-xs text-amber-800">
                        Hệ thống tự động phát hiện theo chuẩn từ điển tiếng Việt & Nghị định 30
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const fixed = autoFixVietnameseSpelling(result.noiDungChuanHoa);
                      onUpdateNormalizedText(fixed.fixedText);
                      setDownloadNotice(`Đã tự động sửa ${fixed.fixedCount} lỗi chính tả thành công!`);
                      setTimeout(() => setDownloadNotice(null), 3000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto transition-transform hover:scale-105 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Tự động sửa tất cả ({spellingCheckList.length}) lỗi ngay</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                  {spellingCheckList.map((err, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-white border border-amber-200 flex items-start justify-between gap-2 shadow-2xs">
                      <div>
                        <span className="text-rose-600 font-bold line-through">{err.wrong}</span>
                        <span className="text-slate-400 mx-1.5">➔</span>
                        <strong className="text-emerald-700 font-bold">{err.right}</strong>
                      </div>
                      <span className="text-[10px] text-slate-500 italic shrink-0">({err.reason})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-900 text-sm md:text-base mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Các điểm lỗi thể thức & chính tả đã được Tiểu Bảo Bối rà soát:
              </h4>

              {result.danhSachLoi.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
                  {result.danhSachLoi.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs md:text-sm text-slate-800"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  Không phát hiện lỗi chính tả nghiêm trọng nào.
                </p>
              )}
            </div>

            {/* Suggestions */}
            {result.goiY && result.goiY.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm md:text-base mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Gợi ý nâng cao chất lượng văn bản từ Tiểu Bảo Bối:
                </h4>
                <div className="space-y-2 font-sans">
                  {result.goiY.map((g, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs md:text-sm text-amber-950 flex items-start gap-2"
                    >
                      <span className="text-amber-600 font-bold shrink-0">•</span>
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 font-sans">
        <button
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sửa lại văn bản gốc (Bước 2)</span>
        </button>

        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-amber-700" />
            <span>Trang chủ (HOME)</span>
          </button>
        )}

        <button
          onClick={onNext}
          className="w-full sm:w-auto bg-gradient-to-r from-rose-700 via-red-700 to-rose-800 hover:from-rose-800 hover:to-red-900 text-white font-bold px-7 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <span>Tiếp tục sang Bước 4: Chỉnh sửa văn bản</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
