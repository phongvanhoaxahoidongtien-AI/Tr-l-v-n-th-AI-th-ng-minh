import React, { useState } from 'react';
import { AgencyDiscrepancyReport, UnitProfile, AgencyMatcher } from '../services/agencyMatcher';
import { AlertTriangle, ShieldAlert, Check, Edit, Save, RefreshCw, X } from 'lucide-react';

interface AgencyDiscrepancyBannerProps {
  report: AgencyDiscrepancyReport;
  activeProfile: UnitProfile;
  onKeepDocValue: () => void;
  onApplyDefaultProfile: () => void;
  onManualEdit: (field: string, newValue: string) => void;
  onSaveAsNewProfile: (newProfile: UnitProfile) => void;
}

export const AgencyDiscrepancyBanner: React.FC<AgencyDiscrepancyBannerProps> = ({
  report,
  activeProfile,
  onKeepDocValue,
  onApplyDefaultProfile,
  onManualEdit,
  onSaveAsNewProfile
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  if (report.isConfidential) {
    return (
      <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-2xl shadow-md text-rose-950 flex items-start gap-3 animate-fade-in font-sans">
        <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm text-rose-900 flex items-center gap-1.5">
            <span>CẢNH BÁO BẢO MẬT: PHÁT HIỆN DẤU ĐỘ MẬT ("{report.confidentialKeyword}")</span>
          </h4>
          <p className="text-xs text-rose-800 mt-1 leading-relaxed">
            Theo nguyên tắc bảo mật tối cao của Nhà nước và quy chế của ứng dụng, <strong>toàn bộ lời gọi Gemini API đã được chặn tuyệt đối</strong>. Văn bản này sẽ chỉ được xử lý trên trình duyệt bằng <strong>Lớp quy tắc xác định cục bộ (100% Offline)</strong>. Không có bất kỳ dữ liệu nào được truyền ra ngoài.
          </p>
        </div>
      </div>
    );
  }

  if (!report.hasDiscrepancy && !report.jurisdictionWarning) {
    return null;
  }

  return (
    <div className="p-5 md:p-6 bg-gradient-to-br from-amber-50 via-orange-50/70 to-amber-100 border-2 border-amber-500 rounded-2xl shadow-md text-amber-950 space-y-4 animate-fade-in font-sans">
      <div className="flex items-start gap-3.5 pb-3 border-b border-amber-200">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs shrink-0 mt-0.5 animate-pulse">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase text-amber-900 bg-amber-200/90 px-2.5 py-0.5 rounded-full border border-amber-300">
              ⚠️ CẢNH BÁO ĐỒNG BỘ CÀI ĐẶT
            </span>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
              ĐƠN VỊ BAN HÀNH HOẶC THỂ THỨC KHÁC VỚI HỒ SƠ MẶC ĐỊNH
            </h4>
          </div>
          <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
            Hồ sơ đơn vị đang chọn: <strong className="font-serif font-bold text-slate-900">"{activeProfile.name}"</strong> (Cơ quan: <strong className="font-serif text-emerald-900">"{activeProfile.agencyName || 'Chưa thiết lập'}"</strong>).
          </p>
        </div>
      </div>

      {/* Danh sách các sai lệch */}
      <div className="space-y-2 text-xs">
        {report.items.map((item, idx) => (
          <div key={idx} className="p-2.5 bg-white/90 rounded-xl border border-amber-200 shadow-2xs">
            <span className="font-bold text-slate-800">{item.label}: </span>
            <span className="text-slate-700">{item.message}</span>
          </div>
        ))}

        {report.jurisdictionWarning && (
          <div className="p-2.5 bg-rose-50 text-rose-900 rounded-xl border border-rose-300 font-medium">
            {report.jurisdictionWarning}
          </div>
        )}
      </div>

      {/* Các lựa chọn bắt buộc cho người dùng to rõ */}
      <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-amber-200 text-xs">
        <span className="font-bold text-slate-800">Lựa chọn xử lý:</span>

        {/* Lựa chọn 1: Giữ nội dung trong văn bản */}
        <button
          type="button"
          onClick={onKeepDocValue}
          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
        >
          (1) Giữ nguyên nội dung trong văn bản
        </button>

        {/* Lựa chọn 2: Thay bằng giá trị mặc định */}
        <button
          type="button"
          onClick={onApplyDefaultProfile}
          className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-black shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 ring-2 ring-amber-400/40"
        >
          ⚡ (2) Thay bằng giá trị mặc định ("{activeProfile.agencyName}")
        </button>

        {/* Lựa chọn 4: Lưu thành Hồ sơ đơn vị mới */}
        <button
          type="button"
          onClick={() => setShowSaveModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span>(4) Lưu thành Hồ sơ mới</span>
        </button>
      </div>

      {/* Modal lưu hồ sơ mới */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl space-y-3">
            <h4 className="font-bold text-sm text-slate-800">Lưu thành Hồ sơ đơn vị mới</h4>
            <p className="text-xs text-slate-500">
              Nhập tên hồ sơ để sử dụng nhanh cho các văn bản tiếp theo của cơ quan này:
            </p>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="Ví dụ: UBND Phường Đông Tiến hoặc Chi bộ Bản Nguyên"
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newProfileName.trim()) {
                    onSaveAsNewProfile({
                      ...activeProfile,
                      id: `profile_${Date.now()}`,
                      name: newProfileName.trim()
                    });
                    setShowSaveModal(false);
                  }
                }}
                disabled={!newProfileName.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Lưu hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
