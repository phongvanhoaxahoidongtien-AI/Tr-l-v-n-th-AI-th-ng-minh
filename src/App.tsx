import React, { useState, useEffect } from 'react';
import { 
  AppTab, StepNumber, AgencySettings, DocumentTypeItem, NormalizeResult 
} from './types';
import { ADMINISTRATIVE_DOC_TYPES, ALL_DOC_TYPES } from './data/documentTypes';
import { SAMPLE_DOCUMENTS } from './data/sampleDocs';
import { runDocumentNormalization, detectAgencyDifference } from './services/normalizerEngine';
import { generateSingleHtmlBundle } from './services/offlineBundleExporter';

import { Navbar } from './components/Navbar';
import { HeroMascot } from './components/HeroMascot';
import { StepIndicator } from './components/StepIndicator';
import { Step1SelectType } from './components/Step1SelectType';
import { Step2UploadDocument } from './components/Step2UploadDocument';
import { Step3ExpertAnalysis } from './components/Step3ExpertAnalysis';
import { Step4Export } from './components/Step4Export';
import { SettingsModal } from './components/SettingsModal';
import { TemplatesView } from './components/TemplatesView';
import { AcademicView } from './components/AcademicView';
import { GuidelinesModal } from './components/GuidelinesModal';
import { FloatingMascotChat } from './components/FloatingMascotChat';

import { 
  Sparkles, FileText, GraduationCap, ShieldCheck, Download, 
  ArrowRight, CheckCircle2, Building, RefreshCw, Star
} from 'lucide-react';

const DEFAULT_AGENCY_SETTINGS: AgencySettings = {
  agencyName: 'UBND Phường Đông Tiến',
  shortLocation: 'Đông Tiến',
  parentAgency: 'UBND Thị xã Bỉm Sơn',
  signerTitle: 'CHỦ TỊCH',
  signerName: 'Lê Thế Điệp',
  department: 'Văn phòng HĐND & UBND'
};

export default function App() {
  // Navigation & Modal states
  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // Agency Settings (saved in localStorage)
  const [agencySettings, setAgencySettings] = useState<AgencySettings>(() => {
    try {
      const saved = localStorage.getItem('agency_settings_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Cannot read localStorage', e);
    }
    return DEFAULT_AGENCY_SETTINGS;
  });

  // Normalization Workflow states (Steps 1 to 4)
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [maxAccessibleStep, setMaxAccessibleStep] = useState<StepNumber>(2);
  const [selectedType, setSelectedType] = useState<DocumentTypeItem>(ADMINISTRATIVE_DOC_TYPES[0]); // default: Công văn
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [normalizeResult, setNormalizeResult] = useState<NormalizeResult | null>(null);
  const [userAcceptedAgencyOverride, setUserAcceptedAgencyOverride] = useState(false);
  const [mascotMessage, setMascotMessage] = useState<string | undefined>(undefined);

  // Lưu Agency Settings vào localStorage mỗi khi thay đổi
  const handleSaveSettings = (newSettings: AgencySettings) => {
    setAgencySettings(newSettings);
    try {
      localStorage.setItem('agency_settings_v1', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Cannot save to localStorage', e);
    }
    setMascotMessage(`Đã cập nhật cơ quan: ${newSettings.agencyName} (${newSettings.shortLocation})! Tôi sẽ tự động đối chiếu văn bản với thông tin này.`);
  };

  // Bắt đầu chuẩn hóa văn bản
  const handleStartNormalize = (prefilledDoc?: { type: DocumentTypeItem; text: string }) => {
    if (prefilledDoc) {
      setSelectedType(prefilledDoc.type);
      setInputText(prefilledDoc.text);
      setCurrentStep(2);
      setMaxAccessibleStep(2);
    } else {
      setCurrentStep(1);
    }
    setCurrentTab('normalize');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Nạp nhanh văn bản thử nghiệm có lỗi
  const handleLoadSample = (sampleIndex: number) => {
    const sample = SAMPLE_DOCUMENTS[sampleIndex];
    if (!sample) return;
    const matchedType = ALL_DOC_TYPES.find(t => t.id === sample.docTypeId) || ADMINISTRATIVE_DOC_TYPES[0];
    setSelectedType(matchedType);
    setInputText(sample.content);
    setCurrentStep(2);
    setMaxAccessibleStep(2);
    setCurrentTab('normalize');
    setMascotMessage(`Đã nạp văn bản thử nghiệm: "${sample.title}". Nhấn "Tiểu Bảo Bối chuẩn hóa ngay" để em phân tích nhé!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Thực thi chuẩn hóa (Bước 2 -> Bước 3)
  const handleExecuteNormalization = async (overrideAccepted?: boolean) => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setMascotMessage('Tiểu Bảo Bối đang phân tích thể thức 2 cột, kiểm tra chính tả tiếng Việt và đối chiếu cơ quan...');

    try {
      const willOverride = overrideAccepted !== undefined ? overrideAccepted : userAcceptedAgencyOverride;
      const res = await runDocumentNormalization({
        rawText: inputText,
        docType: selectedType.name,
        docCategory: selectedType.category === 'dang' ? 'Hướng dẫn 05-HD/VPTW' : 'Nghị định 30/2020/NĐ-CP',
        agencySettings,
        userAcceptedAgencyOverride: willOverride
      });

      setNormalizeResult(res);
      setCurrentStep(3);
      setMaxAccessibleStep(4);

      if (res.canhBaoCoQuan) {
        setMascotMessage('⚠️ Đồng chí ơi, Tiểu Bảo Bối phát hiện có sự khác biệt về tên cơ quan hoặc địa danh trong văn bản so với Cài đặt! Hãy xem phần cảnh báo bên dưới nhé.');
      } else {
        setMascotMessage(`🎉 Tuyệt vời! Điểm thể thức đã tăng từ ${res.diemTruoc} lên ${res.diemSau}/100. Em đã sửa xong ${res.soLoi} lỗi theo đúng Nghị định 30 ạ!`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Có lỗi khi xử lý văn bản, vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Người dùng bấm "Đồng ý sửa thành tên đã cài đặt"
  const handleApplyAgencyFix = () => {
    setUserAcceptedAgencyOverride(true);
    // Chạy lại chuẩn hóa với cờ đồng ý sửa
    handleExecuteNormalization(true);
  };

  // Người dùng bấm "Giữ nguyên theo văn bản gốc"
  const handleDismissAgencyFix = () => {
    if (normalizeResult) {
      setNormalizeResult({
        ...normalizeResult,
        canhBaoCoQuan: null
      });
    }
    setMascotMessage('Đã giữ nguyên tên cơ quan và địa danh theo văn bản gốc của đồng chí.');
  };

  // Tải file HTML offline độc lập
  const handleDownloadOfflineBundle = () => {
    const html = generateSingleHtmlBundle();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tro-ly-van-thu-offline-1.0.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      
      {/* 1. Header Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        agencySettings={agencySettings}
        openSettings={() => setIsSettingsOpen(true)}
        openGuidelines={() => setIsGuidelinesOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Cute Mascot "Tiểu Bảo" Header Card */}
        <HeroMascot
          agencySettings={agencySettings}
          openSettings={() => setIsSettingsOpen(true)}
          customMessage={mascotMessage}
        />

        {/* VIEW 1: Trang chủ (Home) */}
        {currentTab === 'home' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* 3 Main Action Cards */}
            <div>
              <div className="text-center max-w-2xl mx-auto mb-6">
                <span className="text-xs font-black uppercase tracking-wider text-red-700 bg-red-100/80 px-3 py-1 rounded-full border border-red-200">
                  Dành cho Cán bộ, Công chức, Viên chức
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-serif">
                  Chuẩn hóa văn bản hành chính chỉ trong tích tắc!
                </h1>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Lựa chọn một trong ba phương thức tác nghiệp dưới đây để bắt đầu:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. Chuẩn hóa văn bản của tôi */}
                <div
                  onClick={() => handleStartNormalize()}
                  className="bg-white rounded-2xl p-6 border-2 border-red-200 hover:border-red-600 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center mb-4 shadow-md shadow-red-950/20 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-7 h-7" />
                    </div>

                    <div className="inline-block text-xs font-black text-red-600 uppercase tracking-wider mb-1">
                      Tính năng chính
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-700 transition-colors font-serif">
                      1. Chuẩn hóa văn bản của tôi
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Kiểm tra toàn diện <strong>29 loại văn bản hành chính</strong> (Nghị định 30) và <strong>văn bản Đảng</strong> (Hướng dẫn 05). Tự động phát hiện lỗi chính tả, đối chiếu cơ quan và nâng điểm tuân thủ.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-red-700">Quy trình 4 bước</span>
                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-700 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* 2. Soạn từ mẫu có sẵn */}
                <div
                  onClick={() => setCurrentTab('templates')}
                  className="bg-white rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-600 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-950/20 group-hover:scale-110 transition-transform">
                      <FileText className="w-7 h-7" />
                    </div>

                    <div className="inline-block text-xs font-black text-blue-600 uppercase tracking-wider mb-1">
                      Thư viện mẫu
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors font-serif">
                      2. Soạn từ mẫu có sẵn
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Kho biểu mẫu chuẩn hóa sẵn: Công văn, Quyết định, Tờ trình, Giấy mời, Biên bản... Tự động điền tên cơ quan <strong>{agencySettings.agencyName}</strong> và ngày tháng năm hiện tại.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">Đầy đủ 29 loại</span>
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* 3. Luận văn, luận án, bài báo khoa học */}
                <div
                  onClick={() => setCurrentTab('academic')}
                  className="bg-white rounded-2xl p-6 border-2 border-purple-200 hover:border-purple-600 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center mb-4 shadow-md shadow-purple-950/20 group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-7 h-7" />
                    </div>

                    <div className="inline-block text-xs font-black text-purple-600 uppercase tracking-wider mb-1">
                      Học thuật & NCKH
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors font-serif">
                      3. Luận văn, luận án, bài báo
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Chuẩn thể thức học thuật cho cán bộ học Cao học, Nghiên cứu sinh theo Thông tư Bộ GD&ĐT: Trang bìa, mục lục, trích dẫn khoa học chuẩn APA, cấu trúc IMRAD.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700">Chuẩn Bộ GD&ĐT</span>
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Test Samples */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧪</span>
                  <h3 className="font-bold text-slate-800 text-base">
                    Thử nghiệm ngay tính năng phát hiện lỗi & cảnh báo cơ quan:
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  (Nhấn vào văn bản mẫu bên dưới để xem Tiểu Bảo xử lý)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_DOCUMENTS.map((doc, idx) => (
                  <button
                    key={doc.id}
                    onClick={() => handleLoadSample(idx)}
                    className="p-3.5 rounded-xl bg-slate-50 hover:bg-red-50/60 border border-slate-200 hover:border-red-300 text-left transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-800 group-hover:text-red-700">
                      {doc.title}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {doc.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Features Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">29 Loại Văn Bản NĐ 30</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Áp dụng đúng thể thức theo quy định Chính phủ</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Đối Chiếu Cơ Quan & Địa Danh</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tự động phát hiện khác biệt và hỏi ý kiến trước khi sửa</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Soát Lỗi Chính Tả Công Vụ</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Chuẩn hóa dấu thanh, từ ngữ, văn phong hành chính</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Chạy Offline 100% Bảo Mật</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Không lưu dữ liệu lên server, tải bản 1 file HTML dùng ngay</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: Chuẩn hóa văn bản 4 bước */}
        {currentTab === 'normalize' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 4-Step Progress Bar */}
            <StepIndicator
              currentStep={currentStep}
              setStep={(s) => {
                if (s <= maxAccessibleStep) setCurrentStep(s);
              }}
              maxAccessibleStep={maxAccessibleStep}
            />

            {/* Step 1: Chọn loại văn bản */}
            {currentStep === 1 && (
              <Step1SelectType
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                onNext={() => {
                  setCurrentStep(2);
                  setMaxAccessibleStep(2);
                }}
              />
            )}

            {/* Step 2: Gửi văn bản */}
            {currentStep === 2 && (
              <Step2UploadDocument
                selectedType={selectedType}
                inputText={inputText}
                setInputText={setInputText}
                onBack={() => setCurrentStep(1)}
                onRunNormalize={() => handleExecuteNormalization()}
                isProcessing={isProcessing}
                agencySettings={agencySettings}
              />
            )}

            {/* Step 3: Ý kiến chuyên gia (Tiểu Bảo chuẩn hóa) */}
            {currentStep === 3 && normalizeResult && (
              <Step3ExpertAnalysis
                result={normalizeResult}
                selectedType={selectedType}
                agencySettings={agencySettings}
                originalText={inputText}
                onApplyAgencyFix={handleApplyAgencyFix}
                onDismissAgencyFix={handleDismissAgencyFix}
                onNext={() => setCurrentStep(4)}
                onBack={() => setCurrentStep(2)}
                onUpdateNormalizedText={(newText) => {
                  setNormalizeResult({
                    ...normalizeResult,
                    noiDungChuanHoa: newText
                  });
                }}
              />
            )}

            {/* Step 4: Chỉnh sửa và xuất file */}
            {currentStep === 4 && normalizeResult && (
              <Step4Export
                normalizedText={normalizeResult.noiDungChuanHoa}
                selectedType={selectedType}
                agencySettings={agencySettings}
                analysisReport={normalizeResult.analysisReport}
                originalText={inputText}
                onUpdateNormalizedText={(newText) => {
                  setNormalizeResult({
                    ...normalizeResult,
                    noiDungChuanHoa: newText
                  });
                }}
                onReset={() => {
                  setInputText('');
                  setNormalizeResult(null);
                  setCurrentStep(1);
                  setCurrentTab('home');
                }}
                openGuidelines={() => setIsGuidelinesOpen(true)}
              />
            )}

          </div>
        )}

        {/* VIEW 3: Soạn từ mẫu có sẵn */}
        {currentTab === 'templates' && (
          <div className="animate-fade-in">
            <TemplatesView
              agencySettings={agencySettings}
              openSettings={() => setIsSettingsOpen(true)}
              onUseTemplate={(type, filledContent) => {
                handleStartNormalize({ type, text: filledContent });
              }}
            />
          </div>
        )}

        {/* VIEW 4: Luận văn, luận án, bài báo */}
        {currentTab === 'academic' && (
          <div className="animate-fade-in">
            <AcademicView
              onUseAcademicDoc={(item, content) => {
                handleStartNormalize({ type: item, text: content });
              }}
            />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-red-600 text-yellow-300 font-bold flex items-center justify-center text-xs">
              ★
            </div>
            <div>
              <span className="font-bold text-slate-800">Trợ lý văn thư thông minh 1.0</span> (Tiểu Bảo Bối) — Chuẩn hóa văn bản hành chính theo Nghị định 30/2020/NĐ-CP & Hướng dẫn 05-HD/VPTW
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsGuidelinesOpen(true)}
              className="hover:text-red-700 transition-colors"
            >
              Cẩm nang NĐ 30
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-red-700 transition-colors"
            >
              Cài đặt Cơ quan
            </button>
            <button
              onClick={handleDownloadOfflineBundle}
              className="text-emerald-700 font-bold hover:underline"
            >
              Tải App Offline (.html)
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Chat Widget Tiểu Bảo Bối */}
      <FloatingMascotChat
        agencySettings={agencySettings}
        openSettings={() => setIsSettingsOpen(true)}
        openGuidelines={() => setIsGuidelinesOpen(true)}
      />

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={agencySettings}
        onSave={handleSaveSettings}
      />

      <GuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />

    </div>
  );
}
