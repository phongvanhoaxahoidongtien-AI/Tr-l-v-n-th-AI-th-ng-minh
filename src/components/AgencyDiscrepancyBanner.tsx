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
    <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl shadow-xs text-amber-950 space-y-3 animate-fade-in font-sans">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-sm text-amber-900">
            CẢNH BÁO: ĐƠN VỊ BAN HÀNH HOẶC THỂ THỨC KHÁC HỒ SƠ MẶC ĐỊNH
          </h4>
          <p className="text-xs text-amber-800 mt-0.5">
            Hồ sơ đơn vị đang chọn: <strong>"{activeProfile.name}"</strong> ({activeProfile.agencyName || 'Chưa thiết lập'}).
          </p>
        </div>
      </div>

      {/* Danh sách các sai lệch */}
      <div className="space-y-1.5 pl-7 text-xs">
        {report.items.map((item, idx) => (
          <div key={idx} className="p-2 bg-white/80 rounded-lg border border-amber-200">
            <span className="font-bold text-slate-800">{item.label}: </span>
            <span className="text-slate-600">{item.message}</span>
          </div>
        ))}

        {report.jurisdictionWarning && (
          <div className="p-2 bg-rose-50 text-rose-900 rounded-lg border border-rose-200 font-medium">
            {report.jurisdictionWarning}
          </div>
        )}
      </div>

      {/* 4 lựa chọn bắt buộc cho người dùng */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60 pl-7 text-xs">
        <span className="font-bold text-slate-700">Lựa chọn xử lý:</span>

        {/* Lựa chọn 1: Giữ nội dung trong văn bản */}
        <button
          type="button"
          onClick={onKeepDocValue}
          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg font-bold shadow-xs cursor-pointer"
        >
          (1) Giữ nguyên nội dung trong văn bản
        </button>

        {/* Lựa chọn 2: Thay bằng giá trị mặc định */}
        <button
          type="button"
          onClick={onApplyDefaultProfile}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
        >
          (2) Thay bằng giá trị mặc định ("{activeProfile.agencyName}")
        </button>

        {/* Lựa chọn 4: Lưu thành Hồ sơ đơn vị mới */}
        <button
          type="button"
          onClick={() => setShowSaveModal(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1"
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
