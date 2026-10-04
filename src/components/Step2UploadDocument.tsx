import React, { useRef, useState } from 'react';
import { DocumentTypeItem, AgencySettings } from '../types';
import { SAMPLE_DOCUMENTS } from '../data/sampleDocs';
import { UploadCloud, FileUp, Sparkles, ArrowLeft, ArrowRight, RefreshCw, FileText, CheckCircle, AlertCircle } from 'lucide-react';
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

  // Xử lý đọc file .docx bằng mammoth
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploadStatus(`Đang đọc file: ${file.name}...`);
    try {
      if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (result && result.value) {
          setInputText(result.value);
          setUploadStatus(`Đã trích xuất văn bản từ ${file.name} thành công!`);
        } else {
          setUploadStatus('Không đọc được nội dung từ file .docx');
        }
      } else {
        // Fallback đọc file text thường hoặc .txt, .doc
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setInputText(content || '');
          setUploadStatus(`Đã tải file ${file.name} thành công!`);
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

  // Nạp mẫu chuẩn mặc định
  const handleLoadDefaultTemplate = () => {
    if (selectedType.defaultTemplate) {
      // Thay thế tên cơ quan nếu có cài đặt
      let template = selectedType.defaultTemplate;
      if (agencySettings.agencyName) {
        template = template.replace(/ỦY BAN NHÂN DÂN\s+PHƯỜNG ĐÔNG TIẾN/g, agencySettings.agencyName);
      }
      if (agencySettings.shortLocation) {
        template = template.replace(/Đông Tiến/g, agencySettings.shortLocation);
      }
      setInputText(template);
      setUploadStatus('Đã điền khung mẫu chuẩn theo Nghị định 30!');
    }
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  return (
    <div className="bg-white rounded-2xl p-5 md:p-7 shadow-xs border border-slate-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
            Bước 2 trên 4
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-2 font-serif">
            Gửi văn bản cần chuẩn hóa
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Tải lên tệp Word (.docx, .doc) hoặc dán trực tiếp nội dung văn bản vào khung bên dưới.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-800">
            Loại văn bản: {selectedType.name}
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
            ? 'border-red-500 bg-red-50/60 scale-[1.01]'
            : 'border-slate-300 hover:border-red-400 bg-slate-50/70 hover:bg-slate-50'
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

        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>

        <h4 className="font-bold text-slate-800 text-sm md:text-base">
          Kéo thả tệp Word (.docx, .doc) vào đây hoặc <span className="text-red-700 underline">bấm để chọn tệp</span>
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Hỗ trợ đọc trích xuất trực tiếp trong trình duyệt, bảo mật 100% không tải lên máy chủ.
        </p>

        {uploadStatus && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />
            {uploadStatus}
          </div>
        )}
      </div>

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
                setUploadStatus(`Đã nạp mẫu: ${doc.title}`);
              }}
              className="p-2.5 rounded-lg bg-white border border-amber-200 hover:border-amber-400 text-left transition-all hover:shadow-xs cursor-pointer group"
            >
              <div className="text-xs font-bold text-slate-800 group-hover:text-red-700 truncate">
                {doc.title}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {doc.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Text Area */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-500" />
            Nội dung văn bản (có thể chỉnh sửa trực tiếp):
          </label>

          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span>{wordCount} từ</span>
            <span>•</span>
            <span>{charCount} ký tự</span>
            {inputText && (
              <button
                onClick={() => setInputText('')}
                className="text-red-600 hover:text-red-800 font-medium underline ml-2 cursor-pointer"
              >
                Xóa trắng
              </button>
            )}
          </div>
        </div>

        <textarea
          rows={12}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Dán toàn bộ nội dung văn bản ${selectedType.name} vào đây để Tiểu Bảo chuẩn hóa...`}
          className="w-full p-4 rounded-xl border border-slate-300 font-serif text-[15px] leading-relaxed text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-inner"
        />
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
              : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Tiểu Bảo đang phân tích & chuẩn hóa...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Tiểu Bảo chuẩn hóa ngay (Bước 3)</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

    </div>
  );
};
