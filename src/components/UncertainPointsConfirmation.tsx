import React, { useState } from 'react';
import { DocModel } from '../services/docModelEngine';
import { AlertCircle, CheckCircle2, Edit3, ArrowRight } from 'lucide-react';

interface UncertainPointsConfirmationProps {
  docModel: DocModel;
  onUpdateDocModel: (updated: DocModel) => void;
  onProceed: () => void;
}

export const UncertainPointsConfirmation: React.FC<UncertainPointsConfirmationProps> = ({
  docModel,
  onUpdateDocModel,
  onProceed
}) => {
  const [model, setModel] = useState<DocModel>(docModel);
  const [confirmedAll, setConfirmedAll] = useState(false);

  const updateField = (field: keyof DocModel, value: any) => {
    const updated = { ...model, [field]: value };
    setModel(updated);
    onUpdateDocModel(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 font-sans text-xs">
      
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm text-slate-800">
            Bước 4: Rà soát và xác nhận các điểm thể thức trước khi xuất
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Nguyên tắc bất biến: Hệ thống KHÔNG tự bịa số hiệu, ngày tháng, tên cơ quan hay người ký. Vui lòng xác nhận các trường bên dưới trước khi tạo file cuối cùng:
          </p>
        </div>
      </div>

      {/* Cảnh báo các điểm chưa rõ */}
      {model.uncertainPoints && model.uncertainPoints.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <span className="font-bold text-amber-900 block">Các điểm cần lưu ý từ văn bản:</span>
          <ul className="list-disc list-inside text-amber-800 space-y-0.5 pl-1">
            {model.uncertainPoints.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Form kiểm tra và xác nhận */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Cơ quan ban hành:</label>
          <input
            type="text"
            value={model.coQuanBanHanh}
            onChange={(e) => updateField('coQuanBanHanh', e.target.value.toUpperCase())}
            placeholder="[CẦN XÁC NHẬN] Ví dụ: ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN"
            className="w-full p-2.5 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Cơ quan cấp trên (nếu có):</label>
          <input
            type="text"
            value={model.coQuanChuQuan}
            onChange={(e) => updateField('coQuanChuQuan', e.target.value.toUpperCase())}
            placeholder="Ví dụ: ỦY BAN NHÂN DÂN THỊ XÃ BỈM SƠN"
            className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Số, ký hiệu (để trống hoặc điền thực tế):</label>
          <input
            type="text"
            value={model.soKyHieu}
            onChange={(e) => updateField('soKyHieu', e.target.value)}
            placeholder="Số: …/… hoặc để trống khi phát hành chính thức"
            className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Địa danh và ngày tháng (để trống khi phát hành):</label>
          <input
            type="text"
            value={model.diaDanh && model.ngayThang ? `${model.diaDanh}, ${model.ngayThang}` : (model.diaDanh || model.ngayThang)}
            onChange={(e) => {
              const val = e.target.value;
              if (val.includes(',')) {
                const parts = val.split(',');
                updateField('diaDanh', parts[0].trim());
                updateField('ngayThang', parts.slice(1).join(',').trim());
              } else {
                updateField('diaDanh', val.trim());
              }
            }}
            placeholder="Ví dụ: Đông Tiến, ngày … tháng … năm 2026"
            className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Quyền hạn & Chức vụ người ký:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={model.quyenHan}
              onChange={(e) => updateField('quyenHan', e.target.value.toUpperCase())}
              placeholder="TM., KT., TL."
              className="w-1/3 p-2.5 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={model.chucVu}
              onChange={(e) => updateField('chucVu', e.target.value.toUpperCase())}
              placeholder="CHỦ TỊCH / PHÓ CHỦ TỊCH / BÍ THƯ"
              className="w-2/3 p-2.5 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Họ và tên người ký:</label>
          <input
            type="text"
            value={model.hoTen}
            onChange={(e) => updateField('hoTen', e.target.value)}
            placeholder="Họ tên người ký thực tế trong văn bản"
            className="w-full p-2.5 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer text-slate-700">
          <input
            type="checkbox"
            checked={confirmedAll}
            onChange={(e) => setConfirmedAll(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Tôi đã rà soát và xác nhận các thông tin trên không bị sai lệch so với văn bản gốc.</span>
        </label>

        <button
          type="button"
          onClick={onProceed}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer justify-center"
        >
          <span>Tiếp tục xem Báo cáo & Xuất file</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
