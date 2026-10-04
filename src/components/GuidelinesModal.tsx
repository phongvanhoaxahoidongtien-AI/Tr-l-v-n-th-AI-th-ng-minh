import React from 'react';
import { BookOpen, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-rose-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg font-serif">
                Cẩm nang Thể thức Văn bản Hành chính
              </h3>
              <p className="text-xs text-amber-200">
                Theo Nghị định 30/2020/NĐ-CP & Hướng dẫn 05-HD/VPTW
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed font-sans">
          
          {/* Section 1: Font chữ & Khổ giấy */}
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              1. Khổ giấy, Font chữ và Định lề trang
            </h4>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs md:text-sm">
              <div>• <strong>Khổ giấy:</strong> A4 (210 mm x 297 mm), hướng dọc (trừ bảng biểu).</div>
              <div>• <strong>Font chữ:</strong> Times New Roman, bộ mã ký tự Unicode TCVN 6909:2001.</div>
              <div>• <strong>Định lề trang:</strong> Lề trên 20 - 25 mm; Lề dưới 20 - 25 mm; Lề trái 30 - 35 mm; Lề phải 15 - 20 mm.</div>
            </div>
          </div>

          {/* Section 2: 9 Thành phần thể thức chính */}
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              2. Quy cách 9 thành phần thể thức bắt buộc (Nghị định 30)
            </h4>

            <div className="space-y-3 text-xs md:text-sm">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <strong className="text-slate-900">Quốc hiệu và Tiêu ngữ:</strong>
                <p className="mt-1 text-slate-600">
                  - <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>: Cỡ 12-13, in hoa, đứng, đậm.<br/>
                  - <strong>Độc lập - Tự do - Hạnh phúc</strong>: Cỡ 13-14, chữ in thường, đứng, đậm; có đường kẻ ngang bằng độ dài của dòng chữ ở dưới.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <strong className="text-slate-900">Tên cơ quan, tổ chức ban hành:</strong>
                <p className="mt-1 text-slate-600">
                  - Cơ quan cấp trên: Chữ in hoa, cỡ 12-13, đứng, thường.<br/>
                  - Cơ quan ban hành: Chữ in hoa, cỡ 12-13, đứng, đậm; có đường kẻ ngang bên dưới bằng 1/3 đến 1/2 độ dài dòng chữ.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <strong className="text-slate-900">Số, ký hiệu văn bản:</strong>
                <p className="mt-1 text-slate-600">
                  - Số được ghi bằng chữ số Ả Rập, bắt đầu từ số 01 vào ngày đầu năm.<br/>
                  - Ví dụ Công văn: <em>Số: 45/UBND-VP</em>. Ví dụ Quyết định: <em>Số: 12/QĐ-UBND</em>.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <strong className="text-slate-900">Địa danh và thời gian ban hành:</strong>
                <p className="mt-1 text-slate-600">
                  - Cỡ chữ 13-14, chữ in thường, nghiêng.<br/>
                  - Ví dụ: <em>Đông Tiến, ngày 15 tháng 10 năm 2025</em> (ngày &lt; 10 và tháng &lt; 3 phải thêm số 0 ở trước: ngày 05 tháng 02).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <strong className="text-slate-900">Chức vụ, họ tên và chữ ký người có thẩm quyền:</strong>
                <p className="mt-1 text-slate-600">
                  - Ghi rõ quyền hạn ký: <strong>TM. ỦY BAN NHÂN DÂN</strong> hoặc <strong>KT. CHỦ TỊCH / PHÓ CHỦ TỊCH</strong>.<br/>
                  - Chức vụ ký: Chữ in hoa, cỡ 13-14, đứng, đậm. Họ tên người ký: Cỡ 13-14, đứng, đậm.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Văn bản Đảng theo Hướng dẫn 05 */}
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              3. Văn bản của Đảng (Hướng dẫn 05-HD/VPTW)
            </h4>
            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs md:text-sm text-amber-950 space-y-1">
              <div>• Tiêu ngữ thay bằng dòng chữ: <strong>ĐẢNG CỘNG SẢN VIỆT NAM</strong> (in hoa, đậm).</div>
              <div>• Tên cơ quan ban hành: Cấp ủy Đảng tương ứng (ĐẢNG BỘ, ĐẢNG ỦY, CHI BỘ).</div>
              <div>• Ký hiệu văn bản: Ví dụ: <em>Số: 05-QĐ/ĐU</em> hoặc <em>Số: 12-NQ/CB</em>.</div>
              <div>• Thẩm quyền ký: <strong>T/M BAN THƯỜNG VỤ / BÍ THƯ</strong> hoặc <strong>T/M CHI BỘ / BÍ THƯ</strong>.</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors cursor-pointer"
          >
            Đã hiểu & Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
