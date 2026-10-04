import React, { useState } from 'react';
import { ACADEMIC_DOC_TYPES } from '../data/documentTypes';
import { DocumentTypeItem } from '../types';
import { GraduationCap, BookOpen, CheckCircle, ArrowRight, Copy, Sparkles, FileText } from 'lucide-react';

interface AcademicViewProps {
  onUseAcademicDoc: (item: DocumentTypeItem, content: string) => void;
}

export const AcademicView: React.FC<AcademicViewProps> = ({ onUseAcademicDoc }) => {
  const [selectedDoc, setSelectedDoc] = useState<DocumentTypeItem>(ACADEMIC_DOC_TYPES[0]);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedDoc.defaultTemplate).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 rounded-2xl p-6 md:p-8 text-white shadow-md">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-200 bg-white/10 px-3 py-1 rounded-md border border-purple-300/30 mb-3">
            <GraduationCap className="w-4 h-4 text-purple-300" />
            Học thuật & Nghiên cứu khoa học
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif">
            Luận văn, luận án, bài báo khoa học
          </h2>
          <p className="text-purple-100 text-sm md:text-base mt-2 leading-relaxed">
            Hỗ trợ Cán bộ công chức đang theo học Cao học, Nghiên cứu sinh hoặc công bố công trình nghiên cứu: 
            Chuẩn hóa trang bìa, mục lục, tóm tắt khoa học (Abstract) và danh mục tài liệu tham khảo theo quy chuẩn Bộ Giáo dục & Đào tạo.
          </p>
        </div>
      </div>

      {/* Academic Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ACADEMIC_DOC_TYPES.map((item) => {
          const isSelected = selectedDoc.id === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedDoc(item)}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 font-bold">
                  🎓
                </div>
                <h3 className={`font-bold text-base ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                  {item.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                  {item.shortDesc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                {item.decreeRef}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Academic Document Preview */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-4">
          <div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              Quy chuẩn khoa học
            </span>
            <h3 className="font-bold text-lg text-slate-800 mt-1">
              Khung mẫu: {selectedDoc.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu trúc tiêu chuẩn: {selectedDoc.standardStructure}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Đã chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Sao chép khung
                </>
              )}
            </button>

            <button
              onClick={() => onUseAcademicDoc(selectedDoc, selectedDoc.defaultTemplate)}
              className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Chuẩn hóa tài liệu này</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
          {selectedDoc.defaultTemplate}
        </div>

        {/* Academic Best Practices */}
        <div className="mt-5 p-4 rounded-xl bg-purple-50/60 border border-purple-200 text-xs text-purple-950 space-y-1.5">
          <div className="font-bold text-purple-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Lưu ý trình bày công trình học thuật theo quy định hiện hành:
          </div>
          <div>• Font chữ Times New Roman, cỡ 13 hoặc 14, dãn dòng 1.3 - 1.5 lines.</div>
          <div>• Căn lề trang: Lề trên 2.0 - 2.5 cm, lề dưới 2.0 - 2.5 cm, lề trái 3.0 - 3.5 cm, lề phải 1.5 - 2.0 cm.</div>
          <div>• Trích dẫn tài liệu tham khảo theo thứ tự bảng chữ cái hoặc chuẩn APA 7th / IEEE.</div>
        </div>

      </div>

    </div>
  );
};
