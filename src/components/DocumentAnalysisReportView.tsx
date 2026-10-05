import React from 'react';
import { DocumentAnalysisReport } from '../types';
import { 
  AlertTriangle, CheckCircle2, AlertCircle, Info, Sparkles, 
  HelpCircle, FileText, Check, ShieldCheck, Clock, BookOpen
} from 'lucide-react';

interface DocumentAnalysisReportViewProps {
  report: DocumentAnalysisReport;
  onJumpToEdit?: () => void;
}

export const DocumentAnalysisReportView: React.FC<DocumentAnalysisReportViewProps> = ({
  report,
  onJumpToEdit
}) => {
  const { detected, missingInDoc, reviewIssues, autoFixItems, passedItems } = report;

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. KHUNG THÔNG BÁO CÁC MỤC "CHƯA CÓ TRONG VĂN BẢN" (Chuẩn trolyvanthu) */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 shadow-xs">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            {missingInDoc.length > 0 ? (
              <p className="text-amber-950 leading-relaxed">
                <strong className="font-bold">Chưa có trong văn bản: </strong>
                <span className="font-semibold text-rose-800">{missingInDoc.join(', ')}</span>.
                <span className="text-slate-600 ml-1">Không phải lỗi, bạn điền ở bước sau nếu cần.</span>
              </p>
            ) : (
              <p className="text-emerald-900 leading-relaxed font-medium">
                <strong className="font-bold text-emerald-800">Đầy đủ thể thức ban đầu: </strong>
                Văn bản đã có đầy đủ tên Cơ quan, Địa danh, Ngày tháng, Số hiệu và Chữ ký.
              </p>
            )}

            {/* Thông tin đọc & nhận diện được */}
            <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-900">
              <span><strong>Thể thức:</strong> {detected.docTypeName || 'Văn bản hành chính'}</span>
              {detected.agencyName && <span>• <strong>Cơ quan:</strong> {detected.agencyName}</span>}
              {detected.location && <span>• <strong>Địa danh:</strong> {detected.location}</span>}
              {detected.dateStr && <span>• <strong>Thời gian:</strong> {detected.dateStr}</span>}
              {detected.docCode && <span>• <strong>Số:</strong> {detected.docCode}</span>}
              {detected.signerName && <span>• <strong>Người ký:</strong> {detected.signerName}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 2. KHỐI "CẦN XEM LẠI" & "CẦN SỬA" (Chuẩn trolyvanthu) */}
      {reviewIssues.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
              Cần xem lại ({reviewIssues.length})
            </span>
            <span className="text-xs text-slate-500">
              Các lưu ý quan trọng về văn phong, câu từ và nội dung cần rà soát
            </span>
          </div>

          <div className="space-y-3">
            {reviewIssues.map((issue) => (
              <div 
                key={issue.id}
                className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      issue.type === 'can_sua' 
                        ? 'bg-rose-600 text-white' 
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      {issue.type === 'can_sua' ? 'Cần sửa' : 'Gợi ý'}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm md:text-base font-serif">
                      {issue.title}
                    </h4>
                  </div>
                </div>

                <p className="text-xs md:text-sm text-slate-600 mt-2 leading-relaxed font-serif">
                  {issue.description}
                </p>

                {/* Danh sách ví dụ chi tiết */}
                {issue.examples && issue.examples.length > 0 && (
                  <div className="mt-3 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-serif text-slate-800">
                    {issue.examples.map((ex, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-400 select-none">•</span>
                        <span className="leading-relaxed font-medium">{ex.snippet}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Căn cứ pháp lý / quy tắc */}
                {issue.basis && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-sans italic flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{issue.basis}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. KHỐI "CÔNG CỤ SẼ TỰ CHUẨN HÓA MỤC TRÌNH BÀY" (Chuẩn trolyvanthu) */}
      {autoFixItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              Công cụ sẽ tự chuẩn hóa ({autoFixItems.length} mục trình bày)
            </span>
            <span className="text-xs text-slate-500">
              Tự động áp dụng theo Nghị định 30/2020/NĐ-CP & Hướng dẫn 05-HD/VPTW
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {autoFixItems.map((item) => (
              <div 
                key={item.id}
                className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 text-slate-800 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs md:text-sm text-blue-950 font-serif">
                    {item.title}
                  </h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-serif">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. KHỐI "MỤC ĐẠT YÊU CẦU" (Chuẩn trolyvanthu) */}
      {passedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              {passedItems.length} mục đạt yêu cầu
            </span>
            <span className="text-xs text-slate-500">
              Các thành phần thể thức đã được soạn chuẩn mực
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {passedItems.map((item) => (
              <div 
                key={item.id}
                className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200 flex items-start gap-2.5"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <div className="font-bold text-xs md:text-sm text-emerald-950 font-serif">
                    {item.title}
                  </div>
                  {item.detail && (
                    <div className="text-[11px] text-emerald-800 mt-0.5 truncate max-w-[200px]" title={item.detail}>
                      {item.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
