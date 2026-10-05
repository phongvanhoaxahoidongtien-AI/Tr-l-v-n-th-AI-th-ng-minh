import React, { useRef, useState, useMemo } from 'react';
import { DocumentTypeItem, AgencySettings } from '../types';
import { SAMPLE_DOCUMENTS } from '../data/sampleDocs';
import { cleanAIText, stripImportedNationalHeaders } from '../utils/cleanAIText';
import { analyzeDocumentText } from '../services/documentAnalyzer';
import { detectAgencyDifference } from '../services/normalizerEngine';
import { DocumentAnalysisReportView } from './DocumentAnalysisReportView';
import { 
  UploadCloud, FileUp, Sparkles, ArrowLeft, ArrowRight, RefreshCw, 
  FileText, CheckCircle, AlertCircle, AlertTriangle, Wand2, Eraser, Undo2, Check,
  Search, ChevronDown, ChevronUp, Info, Eye, Table as TableIcon, ShieldAlert
} from 'lucide-react';
import mammoth from 'mammoth';

interface Step2UploadDocumentProps {
  selectedType: DocumentTypeItem;
  inputText: string;
  setInputText: (text: string) => void;
  onBack: () => void;
  onRunNormalize: () => void;
  isProcessing: boolean;
  agencySettings: AgencySettings;
}

export const Step2UploadDocument: React.FC<Step2UploadDocumentProps> = ({
  selectedType,
  inputText,
  setInputText,
  onBack,
  onRunNormalize,
  isProcessing,
  agencySettings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [autoCleanOnPaste, setAutoCleanOnPaste] = useState(true);
  const [lastRawText, setLastRawText] = useState<string | null>(null);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // Phát hiện sai lệch cơ quan ban hành theo Cài đặt người dùng (Yêu cầu 2)
  const agencyDiff = useMemo(() => {
    if (!inputText.trim()) return null;
    return detectAgencyDifference(inputText, agencySettings);
  }, [inputText, agencySettings]);

  // Phân tích văn bản thời gian thực (chuẩn trolyvanthu.isavn.edu.vn)
  const liveAnalysis = useMemo(() => {
    if (!inputText.trim() || inputText.trim().length < 25) return null;
    return analyzeDocumentText(inputText, agencySettings, selectedType.category, selectedType.name);
  }, [inputText, agencySettings, selectedType.category, selectedType.name]);

  // Kiểm tra bảng biểu trong văn bản (Yêu cầu 4)
  const hasTable = useMemo(() => {
    return inputText.includes('<table') || inputText.includes('___TABLE_BLOCK_') || /(?:^|\n)\|[^\n]+\|\r?\n\|[\s:-|]+\|/m.test(inputText);
  }, [inputText]);

  // Đồng bộ cơ quan ban hành và địa danh theo cài đặt của người dùng
  const handleSyncAgencyWithSettings = () => {
    if (!agencyDiff) return;
    let updated = inputText;
    if (agencyDiff.detectedAgency && agencySettings.agencyName) {
      updated = updated.replace(agencyDiff.detectedAgency, agencySettings.agencyName);
    }
    if (agencyDiff.detectedLocation && agencySettings.shortLocation) {
      const dateRegex = new RegExp(`${agencyDiff.detectedLocation}(,\\s*ngày\\s+[\\d\\w\\s.…]+tháng\\s+[\\d\\w\\s.…]+năm\\s+[\\d\\w.…]+)`, 'gi');
      updated = updated.replace(dateRegex, `${agencySettings.shortLocation}$1`);
    }
    setInputText(updated);
    setUploadStatus(`Đã đồng bộ cơ quan ban hành thành: "${agencySettings.agencyName}" và địa danh "${agencySettings.shortLocation}"`);
  };

  // Xử lý đọc file .docx bằng mammoth (bảo toàn bảng biểu và tự động chuyển font về Times New Roman, Unicode)
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploadStatus(`Đang đọc và phân tích tệp: ${file.name}...`);
    try {
      if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
        const arrayBuffer = await file.arrayBuffer();
        
        let extractedContent = '';
        // Ưu tiên đọc HTML để bảo toàn các thẻ bảng biểu (table) nếu có
        try {
          const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
          if (htmlResult && htmlResult.value && htmlResult.value.includes('<table')) {
            extractedContent = htmlResult.value;
          }
        } catch {
          // Bỏ qua nếu convertToHtml có cảnh báo
        }

        if (!extractedContent) {
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedContent = result?.value || '';
        }

        if (extractedContent) {
          const cleaned = autoCleanOnPaste 
            ? cleanAIText(extractedContent, { preserveTables: true, stripNationalHeader: true }) 
            : extractedContent;
          setLastRawText(extractedContent);
          setInputText(cleaned);
          setUploadStatus(`✓ Đã trích xuất ${file.name}, chuyển font Times New Roman & Unicode (TCVN 6909:2001), tách tiêu đề quốc ngữ thành công!`);
        } else {
          setUploadStatus('Không đọc được nội dung từ file .docx');
        }
      } else {
        // Fallback đọc file text thường hoặc .txt, .doc
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = (e.target?.result as string) || '';
          const cleaned = autoCleanOnPaste 
            ? cleanAIText(content, { preserveTables: true, stripNationalHeader: true }) 
            : content;
          setLastRawText(content);
          setInputText(cleaned);
          setUploadStatus(`✓ Đã tải và chuẩn hóa tệp ${file.name} thành công!`);
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      console.error(err);
      setUploadStatus(`Lỗi khi mở file: ${err?.message || 'Không thể đọc'}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Tự động làm sạch khi người dùng dán (paste) nội dung từ AI (ChatGPT, DeepSeek, Claude, Gemini...)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!autoCleanOnPaste) return;
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    e.preventDefault();
    const cleaned = cleanAIText(pastedText, { preserveTables: true, stripNationalHeader: true });

    // Chèn văn bản đã làm sạch vào vị trí con trỏ
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const newText = inputText.substring(0, start) + cleaned + inputText.substring(end);
    
    setLastRawText(inputText.substring(0, start) + pastedText + inputText.substring(end));
    setInputText(newText);
    
    setUploadStatus('✨ Đã tự động chuyển font Times New Roman, gỡ bỏ tiêu đề quốc ngữ thừa và bảo toàn bảng biểu vừa trang!');
  };

  // Nút chủ động làm sạch văn bản hiện tại
  const handleManualClean = () => {
    if (!inputText.trim()) return;
    const cleaned = cleanAIText(inputText, { preserveTables: true, stripNationalHeader: true });
    setLastRawText(inputText);
    setInputText(cleaned);
    setUploadStatus('✨ Đã chuyển bảng mã Unicode, font Times New Roman, gỡ tiêu đề quốc ngữ thừa và căn chỉnh bảng biểu vừa vặn!');
  };

  // Hoàn tác về bản chưa làm sạch
  const handleUndoClean = () => {
    if (lastRawText !== null) {
      setInputText(lastRawText);
      setLastRawText(null);
      setUploadStatus('Đã hoàn tác về văn bản gốc trước khi làm sạch.');
    }
  };

  // Nạp mẫu chuẩn mặc định
  const handleLoadDefaultTemplate = () => {
    if (selectedType.defaultTemplate) {
      let template = selectedType.defaultTemplate;
      if (agencySettings.agencyName) {
        template = template.replace(/ỦY BAN NHÂN DÂN\s+PHƯỜNG ĐÔNG TIẾN/g, agencySettings.agencyName);
      }
      if (agencySettings.shortLocation) {
        template = template.replace(/Đông Tiến/g, agencySettings.shortLocation);
      }
      setInputText(template);
      setUploadStatus(`Đã điền khung mẫu chuẩn của ${selectedType.name}!`);
    }
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  const isPartyDoc = selectedType.category === 'dang' || /Đảng/i.test(selectedType.name);

  return (
    <div className="bg-white rounded-2xl p-5 md:p-7 shadow-xs border border-slate-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            Bước 2 trên 4
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-2 font-serif">
            Gửi văn bản cần chuẩn hóa
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Tải lên tệp Word (.docx, .doc) hoặc dán trực tiếp nội dung văn bản vào khung bên dưới.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Tiêu chuẩn áp dụng */}
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
            isPartyDoc 
              ? 'bg-red-50 border-red-200 text-red-900' 
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            {isPartyDoc 
              ? 'Tiêu đề: ĐẢNG CỘNG SẢN VIỆT NAM (HD 05-HD/VPTW)' 
              : 'Tiêu đề: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM (NĐ 30/2020/NĐ-CP)'}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
            Loại: {selectedType.name}
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-5 p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
          isDragOver
            ? 'border-rose-500 bg-rose-50/60 scale-[1.01]'
            : 'border-slate-300 hover:border-rose-400 bg-slate-50/70 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.doc,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>

        <h4 className="font-bold text-slate-800 text-sm md:text-base">
          Kéo thả tệp Word (.docx, .doc) vào đây hoặc <span className="text-rose-700 underline">bấm để chọn tệp</span>
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Hỗ trợ đọc trích xuất bảng biểu nguyên vẹn, chuyển tự động về Times New Roman & Unicode (TCVN 6909:2001).
        </p>
      </div>

      {/* CẢNH BÁO SAI LỆCH CƠ QUAN BAN HÀNH (YÊU CẦU 2) */}
      {agencyDiff && agencyDiff.hasDifference && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in font-sans">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <span>Cảnh báo sai lệch cơ quan ban hành</span>
                <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-bold">Cần kiểm tra</span>
              </h4>
              <div className="text-xs text-slate-800 mt-1 space-y-1">
                {agencyDiff.hasAgencyDifference && (
                  <div>
                    • Cơ quan trong văn bản: <strong className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded font-serif">"{agencyDiff.detectedAgency}"</strong>
                    {' ➔ '} Cài đặt của bạn: <strong className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-serif">"{agencySettings.agencyName}"</strong>
                  </div>
                )}
                {agencyDiff.hasLocationDifference && (
                  <div>
                    • Địa danh trong văn bản: <strong className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded font-serif">"{agencyDiff.detectedLocation}"</strong>
                    {' ➔ '} Cài đặt của bạn: <strong className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-serif">"{agencySettings.shortLocation}"</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncAgencyWithSettings}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            Đồng bộ theo Cài đặt của bạn
          </button>
        </div>
      )}

      {/* Thông báo tính năng bổ trợ (Bảng biểu, Tiêu đề quốc ngữ, Bộ mã Unicode) */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Font: Times New Roman
        </span>
        <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Bộ mã: Unicode (TCVN 6909:2001)
        </span>
        <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-semibold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Tự động tách tiêu đề quốc ngữ (không lặp lại)
        </span>
        {hasTable && (
          <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 font-bold flex items-center gap-1 animate-pulse">
            <TableIcon className="w-3.5 h-3.5 text-amber-700" />
            Đã nhận diện Bảng biểu (vừa khít trang A4)
          </span>
        )}
      </div>

      {/* Notification banner for clean actions */}
      {uploadStatus && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadStatus}</span>
          </div>
          {lastRawText !== null && (
            <button
              onClick={handleUndoClean}
              className="text-xs text-emerald-700 hover:text-emerald-900 underline font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Hoàn tác
            </button>
          )}
        </div>
      )}

      {/* Sample Quick-Test Documents */}
      <div className="mt-5 p-4 rounded-xl bg-amber-50/60 border border-amber-200">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Thử nghiệm nhanh với văn bản thực tế có lỗi (nhấn để nạp):
          </span>

          <button
            onClick={handleLoadDefaultTemplate}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            + Nạp khung mẫu chuẩn của {selectedType.name}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SAMPLE_DOCUMENTS.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                setInputText(doc.content);
                setUploadStatus(`Đã nạp mẫu thử nghiệm: ${doc.title}`);
              }}
              className="p-2.5 rounded-lg bg-white border border-amber-200 hover:border-amber-400 text-left transition-all hover:shadow-xs cursor-pointer group"
            >
              <div className="text-xs font-bold text-slate-800 group-hover:text-rose-700 truncate font-serif">
                {doc.title}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {doc.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Text Area Toolbar */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 font-serif">
            <FileText className="w-4 h-4 text-slate-500" />
            Nội dung văn bản (font Times New Roman, Unicode TCVN 6909:2001):
          </label>

          {/* Smart AI Clean Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCleanOnPaste}
                onChange={(e) => setAutoCleanOnPaste(e.target.checked)}
                className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <span className="font-medium">Tự động làm sạch khi dán (Paste)</span>
            </label>

            <button
              onClick={handleManualClean}
              disabled={!inputText.trim()}
              title="Chuyển bảng mã Unicode, font Times New Roman, gỡ tiêu đề quốc ngữ thừa và căn chỉnh bảng biểu"
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Wand2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Chuyển Unicode & Chuẩn hóa NĐ 30</span>
            </button>

            {/* Word & Char counter */}
            <div className="text-xs text-slate-500 flex items-center gap-2 pl-1 border-l border-slate-200">
              <span>{wordCount} từ</span>
              <span>•</span>
              <span>{charCount} ký tự</span>
              {inputText && (
                <button
                  onClick={() => {
                    setInputText('');
                    setLastRawText(null);
                  }}
                  className="text-red-600 hover:text-red-800 font-medium underline ml-1 cursor-pointer"
                >
                  Xóa trắng
                </button>
              )}
            </div>
          </div>
        </div>

        <textarea
          rows={14}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onPaste={handlePaste}
          style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
          placeholder={`Dán toàn bộ nội dung văn bản ${selectedType.name} vào đây. Tiểu Bảo Bối sẽ tự động gỡ bỏ Markdown, icon, chuyển mã về Unicode, căn chỉnh bảng biểu vừa khổ A4...`}
          className="w-full p-4 rounded-xl border border-slate-300 text-[15px] leading-relaxed text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-inner"
        />

        {/* Live Document Inspection & Analysis Card (chuẩn trolyvanthu.isavn.edu.vn) */}
        {liveAnalysis && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border border-amber-300 shadow-xs animate-fade-in font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 text-base shadow-xs">
                  🔍
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-amber-950 font-serif">
                      Đã đọc & nhận diện thể thức: {liveAnalysis.detected.docTypeName || selectedType.name}
                    </span>
                    {liveAnalysis.detected.agencyName && (
                      <span className="text-xs bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-900 font-semibold font-serif">
                        {liveAnalysis.detected.agencyName}
                      </span>
                    )}
                  </div>

                  {/* Dòng hiển thị: Chưa có trong văn bản */}
                  <div className="text-xs text-amber-900 mt-1 leading-relaxed">
                    {liveAnalysis.missingInDoc.length > 0 ? (
                      <>
                        <strong className="text-rose-800">Chưa có trong văn bản: </strong>
                        <span className="font-semibold text-rose-700">{liveAnalysis.missingInDoc.join(', ')}</span>.
                        <span className="text-slate-600 ml-1">Không phải lỗi, bạn điền ở bước sau nếu cần.</span>
                      </>
                    ) : (
                      <span className="text-emerald-800 font-medium">
                        ✓ Văn bản đã có đủ các trường thể thức cơ bản (Địa danh, Ngày tháng, Số hiệu, Người ký).
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats badges & toggle detail button */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
                {liveAnalysis.reviewIssues.length > 0 && (
                  <span className="px-2.5 py-1 rounded-md bg-rose-100 border border-rose-300 text-rose-800 font-bold text-xs">
                    {liveAnalysis.reviewIssues.length} cần xem lại
                  </span>
                )}

                {liveAnalysis.autoFixItems.length > 0 && (
                  <span className="px-2.5 py-1 rounded-md bg-blue-100 border border-blue-300 text-blue-800 font-bold text-xs">
                    {liveAnalysis.autoFixItems.length} tự chuẩn hóa
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
                  className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-700" />
                  <span>{showDetailedAnalysis ? 'Thu gọn phân tích' : 'Xem chi tiết phân tích'}</span>
                  {showDetailedAnalysis ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Expanded Detailed Report */}
            {showDetailedAnalysis && (
              <div className="mt-4 pt-4 border-t border-amber-200/90 animate-fade-in">
                <DocumentAnalysisReportView report={liveAnalysis} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại bước 1
        </button>

        <button
          onClick={onRunNormalize}
          disabled={!inputText.trim() || isProcessing}
          className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
            !inputText.trim() || isProcessing
              ? 'bg-slate-300 cursor-not-allowed opacity-70'
              : 'bg-gradient-to-r from-rose-700 via-red-700 to-rose-800 hover:from-rose-800 hover:to-red-900 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Tiểu Bảo Bối đang phân tích & chuẩn hóa...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Tiểu Bảo Bối chuẩn hóa ngay (Bước 3)</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

    </div>
  );
};
