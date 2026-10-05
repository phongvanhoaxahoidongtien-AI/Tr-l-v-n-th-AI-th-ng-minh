import React, { useState, useEffect } from 'react';
import { DocumentTypeItem, AgencySettings, DocumentAnalysisReport } from '../types';
import { parseDocumentStructure, reconstructNormalizedText, StructuredDoc } from '../services/decree30Formatter';
import { 
  Building2, FileText, CheckCircle2, AlertTriangle, Sparkles, 
  HelpCircle, UserCheck, ChevronDown, ChevronUp, Edit3, Wand2,
  Check, X, Eye, Undo2, ArrowRight
} from 'lucide-react';

interface InteractiveDocumentEditorProps {
  normalizedText: string;
  selectedType: DocumentTypeItem;
  agencySettings: AgencySettings;
  onUpdateText: (text: string) => void;
  analysisReport?: DocumentAnalysisReport;
}

export const InteractiveDocumentEditor: React.FC<InteractiveDocumentEditorProps> = ({
  normalizedText,
  selectedType,
  agencySettings,
  onUpdateText,
  analysisReport
}) => {
  // Parse document into 3 structured sections
  const [doc, setDoc] = useState<StructuredDoc>(() => 
    parseDocumentStructure(normalizedText, agencySettings, selectedType.category, selectedType.name)
  );

  // Sync internal state if normalizedText changes externally
  useEffect(() => {
    setDoc(parseDocumentStructure(normalizedText, agencySettings, selectedType.category, selectedType.name));
  }, [normalizedText, selectedType.category, selectedType.name]);

  // Section toggle state (accordions)
  const [openSection1, setOpenSection1] = useState(true); // Đầu văn bản
  const [openSection2, setOpenSection2] = useState(true); // Nội dung văn bản
  const [openSection3, setOpenSection3] = useState(true); // Nơi nhận & Chữ ký

  // Body editor mode: 'highlight' (tô vàng sửa ngay) vs 'raw' (soạn thảo tự do)
  const [bodyMode, setBodyMode] = useState<'highlight' | 'raw'>('highlight');
  
  // Interactive fix popover states
  const [activeFix, setActiveFix] = useState<{
    type: 'spelling' | 'blank' | 'abbr' | 'long';
    target: string;
    suggestion?: string;
    index?: number;
  } | null>(null);

  const [blankInputVal, setBlankInputVal] = useState('');
  const [fixNotice, setFixNotice] = useState<string | null>(null);

  // Update a single field in doc and trigger parent onUpdateText
  const updateDocField = (field: keyof StructuredDoc, value: any) => {
    const updated = { ...doc, [field]: value };
    setDoc(updated);
    const newText = reconstructNormalizedText(updated);
    onUpdateText(newText);
  };

  // Re-sync all fields
  const commitDocChanges = (updatedDoc: StructuredDoc) => {
    setDoc(updatedDoc);
    const newText = reconstructNormalizedText(updatedDoc);
    onUpdateText(newText);
  };

  // Sửa lỗi chính tả từ chỗ tô vàng
  const handleApplySpellingFix = (wrong: string, right: string) => {
    const currentFullText = normalizedText;
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    const newText = currentFullText.replace(regex, right);
    onUpdateText(newText);
    setActiveFix(null);
    setFixNotice(`Đã sửa "${wrong}" ➔ "${right}" thành công!`);
    setTimeout(() => setFixNotice(null), 2500);
  };

  // Điền vào chỗ trống từ chỗ tô vàng
  const handleFillBlank = (target: string, value: string) => {
    if (!value.trim()) return;
    const currentFullText = normalizedText;
    const newText = currentFullText.replace(target, value.trim());
    onUpdateText(newText);
    setActiveFix(null);
    setBlankInputVal('');
    setFixNotice(`Đã điền "${value.trim()}" vào chỗ trống!`);
    setTimeout(() => setFixNotice(null), 2500);
  };

  const isCongVan = selectedType.id === 'cong-van' || doc.docTypeName === 'CÔNG VĂN';

  return (
    <div className="space-y-5 font-sans">
      
      {/* Toast Notice */}
      {fixNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{fixNotice}</span>
        </div>
      )}

      {/* =========================================================================
          HẠNG MỤC 1: ĐẦU VĂN BẢN (Quốc hiệu, Tiêu ngữ, Cơ quan, Số, Trích yếu, Kính gửi)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSection1(!openSection1)}
          className="w-full p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              1
            </span>
            <div className="text-left">
              <h4 className="font-bold text-slate-800 text-sm md:text-base font-serif">
                Đầu văn bản (Quốc hiệu, Tiêu ngữ, Cơ quan, Số hiệu, Trích yếu, Kính gửi)
              </h4>
              <p className="text-xs text-slate-500">
                Chỉnh sửa trực tiếp cơ quan ban hành, địa danh ngày tháng, số văn bản và tiêu đề
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-700 font-bold hidden sm:inline">
              {openSection1 ? 'Thu gọn' : 'Mở rộng chỉnh sửa'}
            </span>
            {openSection1 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </button>

        {openSection1 && (
          <div className="p-4 md:p-6 space-y-4 bg-white animate-fade-in text-xs">
            
            {/* CẢNH BÁO SAI LỆCH CƠ QUAN BAN HÀNH (YÊU CẦU 2) */}
            {agencySettings.agencyName && doc.agencyName && !doc.agencyName.toLowerCase().includes(agencySettings.agencyName.toLowerCase()) && !agencySettings.agencyName.toLowerCase().includes(doc.agencyName.toLowerCase()) && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 font-sans shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Cơ quan trong văn bản: <strong className="text-rose-800">"{doc.agencyName}"</strong> khác với Cài đặt người dùng: <strong className="text-blue-800">"{agencySettings.agencyName}"</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...doc,
                      agencyName: agencySettings.agencyName || doc.agencyName,
                      parentAgency: agencySettings.parentAgency || doc.parentAgency,
                      locationDate: agencySettings.shortLocation && doc.locationDate.includes(',') 
                        ? `${agencySettings.shortLocation}${doc.locationDate.substring(doc.locationDate.indexOf(','))}` 
                        : doc.locationDate
                    };
                    commitDocChanges(updated);
                    setFixNotice(`Đã đồng bộ cơ quan theo Cài đặt: "${agencySettings.agencyName}"!`);
                    setTimeout(() => setFixNotice(null), 2500);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shrink-0 cursor-pointer transition-colors shadow-xs"
                >
                  Đồng bộ theo Cài đặt
                </button>
              </div>
            )}

            {/* Lựa chọn Tiêu đề Quốc ngữ (Nhà nước NĐ 30 vs Đảng HD 05) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="font-bold text-slate-700 block mb-2 font-serif">
                Tiêu đề Quốc ngữ & Thể thức quản lý (NĐ 30 / HD 05):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-colors ${
                  !doc.isPartyDoc 
                    ? 'bg-blue-50/70 border-blue-400 text-blue-950 font-bold' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="docMottoType"
                    checked={!doc.isPartyDoc}
                    onChange={() => {
                      const updated = { 
                        ...doc, 
                        isPartyDoc: false, 
                        countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                        motto: 'Độc lập - Tự do - Hạnh phúc'
                      };
                      commitDocChanges(updated);
                    }}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="text-[11px] font-normal text-slate-500">Độc lập - Tự do - Hạnh phúc (Nghị định 30/2020/NĐ-CP)</div>
                  </div>
                </label>

                <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-colors ${
                  doc.isPartyDoc 
                    ? 'bg-red-50/70 border-red-400 text-red-950 font-bold' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="docMottoType"
                    checked={doc.isPartyDoc}
                    onChange={() => {
                      const updated = { 
                        ...doc, 
                        isPartyDoc: true, 
                        countryHeader: '',
                        motto: 'ĐẢNG CỘNG SẢN VIỆT NAM'
                      };
                      commitDocChanges(updated);
                    }}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div>ĐẢNG CỘNG SẢN VIỆT NAM</div>
                    <div className="text-[11px] font-normal text-slate-500">Tiêu đề Đảng (Hướng dẫn 05-HD/VPTW)</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Grid 2 cột cho Cơ quan và Địa danh / Số ký hiệu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Cột 1: Cơ quan ban hành */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cơ quan cấp trên (nếu có):
                  </label>
                  <input
                    type="text"
                    value={doc.parentAgency}
                    onChange={(e) => updateDocField('parentAgency', e.target.value)}
                    placeholder="Ví dụ: ỦY BAN NHÂN DÂN THỊ XÃ BỈM SƠN hoặc ĐẢNG BỘ PHƯỜNG..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cơ quan ban hành văn bản (*):
                  </label>
                  <input
                    type="text"
                    value={doc.agencyName}
                    onChange={(e) => updateDocField('agencyName', e.target.value)}
                    placeholder="Ví dụ: ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN hoặc CHI BỘ..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Số ký hiệu văn bản (*):
                  </label>
                  <input
                    type="text"
                    value={doc.docCode}
                    onChange={(e) => updateDocField('docCode', e.target.value)}
                    placeholder="Ví dụ: Số: 45/UBND-VP hoặc Số: ……-QĐ/CB"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cột 2: Địa danh, Ngày tháng & Tên loại */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Địa danh, ngày tháng năm (*):
                  </label>
                  <input
                    type="text"
                    value={doc.locationDate}
                    onChange={(e) => updateDocField('locationDate', e.target.value)}
                    placeholder="Ví dụ: Đông Tiến, ngày 15 tháng 10 năm 2026"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Loại văn bản:
                  </label>
                  <input
                    type="text"
                    value={doc.docTypeName}
                    onChange={(e) => updateDocField('docTypeName', e.target.value.toUpperCase())}
                    placeholder="Ví dụ: CÔNG VĂN, QUYẾT ĐỊNH, TỜ TRÌNH, BÁO CÁO..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Trích yếu nội dung (V/v hoặc Về việc):
                  </label>
                  <input
                    type="text"
                    value={doc.docSubjectShort || doc.docTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isCongVan || val.startsWith('V/v')) {
                        updateDocField('docSubjectShort', val);
                      } else {
                        updateDocField('docTitle', val);
                      }
                    }}
                    placeholder="Ví dụ: V/v tăng cường an toàn PCCC hoặc Về việc ban hành..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

            </div>

            {/* Ô nhập Kính gửi (YÊU CẦU 6: Mặc định Kính gửi, không cần viết chữ Kính gửi, các dòng tự động bắt đầu bằng -) */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <label className="font-bold text-slate-700 text-xs">
                  Kính gửi: <span className="font-normal text-slate-500">(Đã mặc định có sẵn "Kính gửi:", không cần gõ chữ "Kính gửi:")</span>
                </label>
                <span className="text-[11px] text-blue-700 font-semibold">
                  Mỗi dòng xuống dòng tự động bắt đầu bằng dấu gạch ngang (-)
                </span>
              </div>
              <textarea
                rows={3}
                value={doc.recipientsHeader}
                onChange={(e) => {
                  const raw = e.target.value;
                  const stripped = raw.replace(/^Kính gửi:?\s*/i, '');
                  const lines = stripped.split('\n');
                  const formatted = lines.map(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return '';
                    return trimmed.startsWith('-') ? trimmed : `- ${trimmed}`;
                  }).join('\n');
                  updateDocField('recipientsHeader', formatted);
                }}
                placeholder="- Các ban ngành, đoàn thể phường;&#10;- Ban cán sự các tổ dân phố trên địa bàn."
                className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 italic mt-0.5 block">
                Áp dụng cho Công văn, Tờ trình, Báo cáo, Giấy mời. Đứng trước phần nội dung văn bản.
              </span>
            </div>

          </div>
        )}
      </div>

      {/* =========================================================================
          HẠNG MỤC 2: NỘI DUNG VĂN BẢN & CHỖ TÔ VÀNG SỬA NGAY (Chuẩn trolyvanthu)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              2
            </span>
            <div>
              <h4 className="font-bold text-slate-800 text-sm md:text-base font-serif">
                Nội dung văn bản (Thân văn bản & Chỗ tô vàng sửa ngay)
              </h4>
              <p className="text-xs text-slate-500">
                Bấm vào các chỗ tô vàng để sửa nhanh chính tả, điền chỗ trống, giải thích từ viết tắt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Chuyển đổi chế độ Tô vàng sửa ngay vs Soạn thảo tự do */}
            <div className="bg-white p-1 rounded-lg border border-slate-300 flex items-center gap-1 shadow-xs">
              <button
                type="button"
                onClick={() => setBodyMode('highlight')}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  bodyMode === 'highlight'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Chỗ tô vàng sửa ngay</span>
              </button>

              <button
                type="button"
                onClick={() => setBodyMode('raw')}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  bodyMode === 'raw'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Soạn thảo tự do</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOpenSection2(!openSection2)}
              className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              {openSection2 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {openSection2 && (
          <div className="p-4 md:p-6 bg-white animate-fade-in text-xs font-sans">
            
            {/* CHẾ ĐỘ 1: TÔ VÀNG SỬA NGAY (Interactive Click-to-Fix) */}
            {bodyMode === 'highlight' ? (
              <div className="space-y-4">
                
                {/* Thanh trợ giúp */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <strong>Gợi ý thông minh: </strong>
                    Bấm vào các từ <span className="bg-yellow-200 px-1.5 py-0.5 rounded font-bold border border-yellow-400">tô vàng</span> để sửa chính tả; bấm vào chỗ <span className="bg-amber-200 px-1.5 py-0.5 rounded font-bold border border-amber-400 animate-pulse">…… trống</span> để điền thông tin ngay!
                  </span>

                  <button
                    type="button"
                    onClick={() => setBodyMode('raw')}
                    className="text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Chuyển sang gõ văn bản
                  </button>
                </div>

                {/* Popover xử lý tương tác khi bấm vào từ tô vàng */}
                {activeFix && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border-2 border-amber-400 shadow-md animate-fade-in">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm text-amber-950 font-serif flex items-center gap-1.5">
                          <Wand2 className="w-4 h-4 text-amber-700" />
                          {activeFix.type === 'spelling' && 'Khắc phục lỗi chính tả / văn phong'}
                          {activeFix.type === 'blank' && 'Điền thông tin vào chỗ trống'}
                          {activeFix.type === 'abbr' && 'Bổ sung tên đầy đủ cho từ viết tắt'}
                          {activeFix.type === 'long' && 'Gợi ý tách câu dài'}
                        </div>

                        {/* Sửa chính tả */}
                        {activeFix.type === 'spelling' && activeFix.suggestion && (
                          <div className="mt-2 text-xs text-slate-800">
                            <span>Từ trong văn bản: </span>
                            <span className="line-through text-rose-700 font-bold mr-2">{activeFix.target}</span>
                            <span>➔ Gợi ý sửa đúng: </span>
                            <strong className="text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300 text-sm">
                              {activeFix.suggestion}
                            </strong>
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApplySpellingFix(activeFix.target, activeFix.suggestion!)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Sửa ngay thành: {activeFix.suggestion}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFix(null)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg cursor-pointer"
                              >
                                Bỏ qua
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Điền chỗ trống */}
                        {activeFix.type === 'blank' && (
                          <div className="mt-2 text-xs text-slate-800">
                            <p className="mb-2">Nhập nội dung cần điền (họ tên, ngày tháng, chức vụ, số hiệu...):</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={blankInputVal}
                                onChange={(e) => setBlankInputVal(e.target.value)}
                                placeholder="Nhập thông tin điền vào chỗ trống..."
                                className="p-2 rounded-lg border border-amber-400 bg-white text-xs font-serif min-w-[260px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleFillBlank(activeFix.target, blankInputVal);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleFillBlank(activeFix.target, blankInputVal)}
                                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Điền ngay</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFix(null)}
                                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}

                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveFix(null)}
                        className="p-1 rounded-md text-amber-800 hover:bg-amber-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Khung hiển thị văn bản với các vị trí tô vàng */}
                <div 
                  className="p-5 md:p-8 bg-slate-50 rounded-xl border border-slate-300 leading-relaxed font-serif text-[15px] max-h-[500px] overflow-y-auto space-y-3"
                  style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
                >
                  {normalizedText.split('\n').map((paragraph, pIdx) => {
                    const trimmed = paragraph.trim();
                    if (!trimmed) return <div key={pIdx} className="h-2" />;

                    // Căn giữa chỉ thị hành động QUYẾT ĐỊNH:
                    if (/^(QUYẾT ĐỊNH|QUYẾT NGHỊ|CHỈ THỊ|KẾT LUẬN|YÊU CẦU)\s*[:\.]?$/i.test(trimmed)) {
                      return (
                        <p key={pIdx} className="text-center font-bold text-[16px] my-3 uppercase tracking-wider text-slate-900">
                          {trimmed.toUpperCase().endsWith(':') ? trimmed.toUpperCase() : trimmed.toUpperCase() + ':'}
                        </p>
                      );
                    }

                    // Tiêu đề Điều khoản
                    if (/^Điều\s+\d+/i.test(trimmed)) {
                      return (
                        <p key={pIdx} className="text-justify font-bold indent-6 text-slate-900">
                          {trimmed}
                        </p>
                      );
                    }

                    // Tô vàng các lỗi chính tả và chỗ trống trong đoạn
                    // Danh sách từ cần tô vàng
                    const highlightKeywords = [
                      { pattern: /sử lý/gi, wrong: 'sử lý', right: 'xử lý' },
                      { pattern: /bổ xung/gi, wrong: 'bổ xung', right: 'bổ sung' },
                      { pattern: /xắp xếp/gi, wrong: 'xắp xếp', right: 'sắp xếp' },
                      { pattern: /qui định/gi, wrong: 'qui định', right: 'quy định' },
                      { pattern: /qui chế/gi, wrong: 'qui chế', right: 'quy chế' },
                      { pattern: /bố chí/gi, wrong: 'bố chí', right: 'bố trí' },
                      { pattern: /chủ chí/gi, wrong: 'chủ chí', right: 'chủ trì' },
                      { pattern: /xơ xuất/gi, wrong: 'xơ xuất', right: 'sơ suất' },
                      { pattern: /sơ xuất/gi, wrong: 'sơ xuất', right: 'sơ suất' },
                      { pattern: /xem sét/gi, wrong: 'xem sét', right: 'xem xét' },
                      { pattern: /ba phần tư/gi, wrong: 'ba phần tư', right: 'ba phần tư' }
                    ];

                    return (
                      <p key={pIdx} className="text-justify indent-6 text-slate-800 leading-relaxed">
                        {renderParagraphWithHighlights(
                          trimmed,
                          highlightKeywords,
                          (wrong, right) => {
                            setActiveFix({ type: 'spelling', target: wrong, suggestion: right });
                          },
                          (blankStr) => {
                            setActiveFix({ type: 'blank', target: blankStr });
                          }
                        )}
                      </p>
                    );
                  })}
                </div>

              </div>
            ) : (
              /* CHẾ ĐỘ 2: SOẠN THẢO TỰ DO (Textarea) */
              <div>
                <textarea
                  rows={18}
                  value={normalizedText}
                  onChange={(e) => onUpdateText(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-300 font-serif text-[15px] leading-relaxed text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-inner"
                  style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
                  placeholder="Soạn thảo hoặc chỉnh sửa nội dung văn bản..."
                />
              </div>
            )}

          </div>
        )}
      </div>

      {/* =========================================================================
          HẠNG MỤC 3: NƠI NHẬN VÀ CHỮ KÝ (Cuối văn bản)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSection3(!openSection3)}
          className="w-full p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              3
            </span>
            <div className="text-left">
              <h4 className="font-bold text-slate-800 text-sm md:text-base font-serif">
                Cuối văn bản (Nơi nhận & Chữ ký, Thẩm quyền ký)
              </h4>
              <p className="text-xs text-slate-500">
                Chỉnh sửa danh sách nơi nhận, quyền hạn (TM., T/M), chức vụ và họ tên người ký
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-700 font-bold hidden sm:inline">
              {openSection3 ? 'Thu gọn' : 'Mở rộng chỉnh sửa'}
            </span>
            {openSection3 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </button>

        {openSection3 && (
          <div className="p-4 md:p-6 space-y-4 bg-white animate-fade-in text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Cột 1: Nơi nhận (YÊU CẦU 6: Mặc định Nơi nhận rồi, không cần gõ chữ Nơi nhận, các dòng tự động bắt đầu bằng -) */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <label className="font-bold text-slate-700 text-xs">
                    Nơi nhận: <span className="font-normal text-slate-500">(Đã mặc định "Nơi nhận:", không cần gõ chữ "Nơi nhận:")</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Tự động thêm dấu gạch ngang (-) đầu mỗi dòng
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={doc.recipients.map(r => r.startsWith('-') ? r : `- ${r}`).join('\n')}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const stripped = raw.replace(/^Nơi nhận:?\s*/i, '');
                    const list = stripped.split('\n')
                      .map(l => l.trim())
                      .filter(Boolean)
                      .map(l => l.startsWith('-') ? l : `- ${l}`);
                    updateDocField('recipients', list);
                  }}
                  placeholder="- Như trên;&#10;- Chủ tịch, các PCT UBND;&#10;- Lưu: VT, VP."
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 italic mt-0.5 block">
                  Trình bày chữ in thường cỡ 11, kết thúc các dòng bằng dấu chấm phẩy (;), dòng cuối cùng kết thúc bằng dấu chấm (.).
                </span>
              </div>

              {/* Cột 2: Quyền hạn, chức vụ & chữ ký */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Quyền hạn ký (TM., T/M, KT., Q.):
                  </label>
                  <input
                    type="text"
                    value={doc.signerAuthority}
                    onChange={(e) => updateDocField('signerAuthority', e.target.value.toUpperCase())}
                    placeholder="Ví dụ: TM. ỦY BAN NHÂN DÂN hoặc T/M CHI BỘ"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Chức vụ người ký (*):
                  </label>
                  <input
                    type="text"
                    value={doc.signerTitle}
                    onChange={(e) => updateDocField('signerTitle', e.target.value.toUpperCase())}
                    placeholder="Ví dụ: CHỦ TỊCH hoặc BÍ THƯ"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Họ và tên người ký (*):
                  </label>
                  <input
                    type="text"
                    value={doc.signerName}
                    onChange={(e) => updateDocField('signerName', e.target.value)}
                    placeholder="Mặc định: Lê Thế Điệp"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
};

/**
 * Hàm phân tích và render đoạn văn có gắn các vị trí tô vàng (chính tả, chỗ trống)
 */
function renderParagraphWithHighlights(
  text: string,
  keywords: Array<{ pattern: RegExp; wrong: string; right: string }>,
  onSpellingClick: (wrong: string, right: string) => void,
  onBlankClick: (blank: string) => void
) {
  // Regex tìm chỗ trống (……, ...., ____, [...])
  const combinedRegex = /(\b(?:sử lý|bổ xung|xắp xếp|qui định|qui chế|bố chí|chủ chí|xơ xuất|sơ xuất|xem sét|ba phần tư)\b|…{2,}|\.{3,}|_{3,}|\[\s*\.{3,}\s*\])/gi;

  const parts = text.split(combinedRegex);
  return parts.map((part, i) => {
    if (!part) return null;

    // Kiểm tra xem có phải chỗ trống
    if (/^(\.{3,}|…{2,}|_{3,}|\[\s*\.{3,}\s*\])/.test(part)) {
      return (
        <span
          key={i}
          onClick={() => onBlankClick(part)}
          title="Bấm vào để điền thông tin vào chỗ trống này"
          className="bg-amber-200 hover:bg-amber-300 text-amber-950 px-1.5 py-0.5 rounded border border-amber-400 font-bold cursor-pointer transition-colors animate-pulse inline-flex items-center gap-0.5 mx-0.5"
        >
          {part}
          <span className="text-[10px] text-amber-800">✏️</span>
        </span>
      );
    }

    // Kiểm tra xem có phải lỗi chính tả
    const matchedRule = keywords.find(k => k.pattern.test(part));
    if (matchedRule) {
      return (
        <span
          key={i}
          onClick={() => onSpellingClick(part, matchedRule.right)}
          title={`Gợi ý sửa chính tả: Bấm để sửa thành "${matchedRule.right}"`}
          className="bg-yellow-200 hover:bg-yellow-300 text-yellow-950 px-1 py-0.5 rounded border border-yellow-400 font-bold cursor-pointer transition-colors inline-flex items-center gap-0.5 mx-0.5"
        >
          {part}
          <span className="text-[10px] text-yellow-800">🪄</span>
        </span>
      );
    }

    return part;
  });
}
