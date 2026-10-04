import React, { useState, useEffect } from 'react';
import { AgencySettings } from '../types';
import { Settings, X, Save, Building, MapPin, User, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AgencySettings;
  onSave: (newSettings: AgencySettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [form, setForm] = useState<AgencySettings>(settings);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setSaveMessage('Đã lưu thành công thông tin cơ quan ban hành vào trình duyệt!');
    setTimeout(() => {
      setSaveMessage(null);
      onClose();
    }, 1200);
  };

  const handleApplyPreset = (agency: string, loc: string, parent?: string) => {
    setForm((prev) => ({
      ...prev,
      agencyName: agency,
      shortLocation: loc,
      parentAgency: parent || prev.parentAgency
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-rose-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <Settings className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg font-serif">Cài đặt Cơ quan ban hành</h3>
              <p className="text-xs text-amber-200">
                Lưu cục bộ trong trình duyệt (localStorage) • Bảo mật 100%
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 overflow-y-auto space-y-4">
          
          {/* Quick presets */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Gợi ý chọn nhanh cơ quan mẫu:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('UBND Phường Đông Tiến', 'Đông Tiến', 'UBND Thị xã Bỉm Sơn')}
                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-amber-300 hover:border-amber-500 text-amber-950 transition-colors cursor-pointer"
              >
                UBND Phường Đông Tiến
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('Đảng ủy Phường Đông Tiến', 'Đông Tiến', 'Thị ủy Bỉm Sơn')}
                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-amber-300 hover:border-amber-500 text-amber-950 transition-colors cursor-pointer"
              >
                Đảng ủy Phường Đông Tiến
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('UBND Xã Hải Ninh', 'Hải Ninh', 'UBND Thị xã Nghi Sơn')}
                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-amber-300 hover:border-amber-500 text-amber-950 transition-colors cursor-pointer"
              >
                UBND Xã Hải Ninh
              </button>
            </div>
          </div>

          {/* 1. Tên cơ quan ban hành đầy đủ */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <Building className="w-3.5 h-3.5 text-red-600" />
              Tên cơ quan ban hành đầy đủ: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={form.agencyName}
              onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
              placeholder="Ví dụ: UBND Phường Đông Tiến"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all font-medium text-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Tên cơ quan hiển thị ở góc trên bên trái của văn bản hành chính.
            </p>
          </div>

          {/* 2. Địa danh viết tắt */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              Địa danh viết tắt: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={form.shortLocation}
              onChange={(e) => setForm({ ...form, shortLocation: e.target.value })}
              placeholder="Ví dụ: Đông Tiến"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all font-medium text-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Dùng để đối chiếu với phần địa danh ngày tháng (Ví dụ: "Đông Tiến, ngày... tháng...").
            </p>
          </div>

          {/* 3. Cơ quan cấp trên */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              Tên cơ quan chủ quản cấp trên (tùy chọn):
            </label>
            <input
              type="text"
              value={form.parentAgency || ''}
              onChange={(e) => setForm({ ...form, parentAgency: e.target.value })}
              placeholder="Ví dụ: UBND Thị xã Bỉm Sơn"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-slate-900"
            />
          </div>

          {/* 4. Chức vụ & Họ tên người ký */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Chức vụ người ký:
              </label>
              <input
                type="text"
                value={form.signerTitle || ''}
                onChange={(e) => setForm({ ...form, signerTitle: e.target.value })}
                placeholder="Ví dụ: CHỦ TỊCH"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1 mb-1">
                Họ và tên người ký:
              </label>
              <input
                type="text"
                value={form.signerName || ''}
                onChange={(e) => setForm({ ...form, signerName: e.target.value })}
                placeholder="Ví dụ: Nguyễn Văn Hùng"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
              />
            </div>
          </div>

          {/* 5. Tùy chọn Gemini API Key */}
          <div className="pt-2 border-t border-slate-200">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              Khóa Gemini API (Tùy chọn cho nâng cao):
            </label>
            <input
              type="password"
              value={form.geminiApiKey || ''}
              onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
              placeholder="Để trống để sử dụng chế độ Offline hoặc API mặc định"
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Ứng dụng có sẵn bộ quy tắc chuẩn hóa Offline không cần mạng và không bắt buộc nhập API key.
            </p>
          </div>

          {saveMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {saveMessage}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-red-700 hover:bg-red-800 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Lưu cài đặt vào trình duyệt
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
