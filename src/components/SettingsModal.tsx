import React, { useState, useEffect } from 'react';
import { AgencySettings, AgencyRoleBlock } from '../types';
import { getOfficerSalutation } from '../utils/officerSalutation';
import { AGENCY_PRESETS } from '../utils/agencyPresets';
import { Settings, X, Save, Building, MapPin, User, ShieldCheck, KeyRound, Sparkles, Calendar, Check, Eye, UserCheck, MessageSquareHeart } from 'lucide-react';

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
    setForm({
      ...settings,
      roleBlock: settings.roleBlock || 'ubnd'
    });
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

  const handleApplyPreset = (
    agency: string, 
    loc: string, 
    parent: string, 
    roleBlock: AgencyRoleBlock, 
    signerTitle: string,
    signerName: string
  ) => {
    setForm((prev) => ({
      ...prev,
      roleBlock,
      agencyName: agency,
      shortLocation: loc,
      parentAgency: parent,
      signerTitle,
      signerName
    }));
  };

  const currentRoleBlock = form.roleBlock || 'ubnd';
  const previewYear = form.issuingYear?.trim() || String(new Date().getFullYear());
  const previewLoc = form.shortLocation || 'Đông Tiến';
  const salutationPreview = getOfficerSalutation(form);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-serif">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <Settings className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg font-serif">Cài đặt Cơ quan & Vai trò công tác</h3>
              <p className="text-xs text-amber-200">
                Lưu cục bộ trong trình duyệt (localStorage) • Tự động áp dụng chuẩn thể thức
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
          
          {/* Quick presets */}
          <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 font-sans space-y-2.5">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Chọn nhanh cơ quan / phòng ban ban hành (Tự động chọn Tiêu đề Quốc ngữ):
            </span>

            {/* Dropdown danh sách phòng ban / cơ quan chi tiết */}
            <select
              onChange={(e) => {
                const presetId = e.target.value;
                if (!presetId) return;
                const p = AGENCY_PRESETS.find(item => item.id === presetId);
                if (p) {
                  setForm(prev => ({
                    ...prev,
                    roleBlock: p.roleBlock,
                    agencyName: p.agencyName,
                    department: p.department,
                    parentAgency: '', // Không tự ý thêm cấp trên, để trống nếu không có
                    signerTitle: p.defaultSignerTitle,
                    shortLocation: prev.shortLocation || 'Đông Tiến'
                  }));
                }
              }}
              defaultValue=""
              className="w-full p-2.5 bg-white rounded-lg border border-amber-300 text-xs font-sans text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
            >
              <option value="" disabled>-- Bấm để chọn vai trò cơ quan / phòng ban ban hành --</option>
              <optgroup label="🏛️ Khối UBND & Bộ phận chuyên môn (Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM)">
                {AGENCY_PRESETS.filter(p => p.group === 'ubnd').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="☭ Khối Đảng ủy (Tiêu đề Đảng: ĐẢNG CỘNG SẢN VIỆT NAM)">
                {AGENCY_PRESETS.filter(p => p.group === 'dang').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🤝 Khối MTTQ & Đoàn thể (Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM)">
                {AGENCY_PRESETS.filter(p => p.group === 'mttq_doanthe').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </optgroup>
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleApplyPreset(
                  'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN', 
                  'Đông Tiến', 
                  '', // Mặc định không tự ý thêm cấp trên
                  'ubnd', 
                  'CHỦ TỊCH',
                  form.signerName || 'Lê Thế Điệp'
                )}
                className="text-left p-2 rounded-lg bg-white border border-amber-300 hover:border-red-500 hover:bg-red-50/50 text-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                <div className="font-bold text-red-700">🏛️ Mẫu UBND Phường</div>
                <div className="text-[11px] text-slate-500">Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset(
                  'ĐẢNG BỘ PHƯỜNG ĐÔNG TIẾN\nĐẢNG ỦY PHƯỜNG', 
                  'Đông Tiến', 
                  '', // Mặc định không tự ý thêm cấp trên
                  'dang', 
                  'BÍ THƯ',
                  form.signerName || 'Nguyễn Văn Thắng'
                )}
                className="text-left p-2 rounded-lg bg-white border border-amber-300 hover:border-amber-600 hover:bg-amber-50/50 text-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                <div className="font-bold text-amber-800">☭ Mẫu Đảng ủy Phường</div>
                <div className="text-[11px] text-slate-500">Tiêu đề: ĐẢNG CỘNG SẢN VIỆT NAM</div>
              </button>
            </div>
          </div>

          {/* =========================================================================
              1. CÀI ĐẶT VAI TRÒ & KHỐI CÔNG TÁC (YÊU CẦU 2)
              ========================================================================= */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <label className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center justify-between">
              <span>1. Vai trò / Khối cơ quan công tác (*):</span>
              <span className="text-red-700 font-semibold lowercase">Tự động chọn Tiêu đề & Quốc hiệu</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              
              {/* Lựa chọn 1: Khối UBND / Nhà nước */}
              <label className={`p-3 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                currentRoleBlock === 'ubnd'
                  ? 'border-red-600 bg-red-50/80 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="roleBlock"
                    checked={currentRoleBlock === 'ubnd'}
                    onChange={() => setForm({ ...form, roleBlock: 'ubnd' })}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div className="font-bold text-red-950 text-xs">Khối UBND</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Chính quyền Nhà nước</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/80 text-[10px] text-red-800 font-medium">
                  ✓ Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM (NĐ 30)
                </div>
              </label>

              {/* Lựa chọn 2: Khối Đảng ủy */}
              <label className={`p-3 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                currentRoleBlock === 'dang'
                  ? 'border-amber-600 bg-amber-50/80 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="roleBlock"
                    checked={currentRoleBlock === 'dang'}
                    onChange={() => setForm({ ...form, roleBlock: 'dang' })}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="font-bold text-amber-950 text-xs">Khối Đảng ủy</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Cơ quan Đảng các cấp</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/80 text-[10px] text-amber-800 font-medium">
                  ✓ Tiêu đề: ĐẢNG CỘNG SẢN VIỆT NAM (HD 05-HD/VPTW)
                </div>
              </label>

              {/* Lựa chọn 3: Khối MTTQ & Đoàn thể */}
              <label className={`p-3 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                currentRoleBlock === 'mttq_doanthe'
                  ? 'border-blue-600 bg-blue-50/80 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="roleBlock"
                    checked={currentRoleBlock === 'mttq_doanthe'}
                    onChange={() => setForm({ ...form, roleBlock: 'mttq_doanthe' })}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-blue-950 text-xs">Khối MTTQ & Đoàn thể</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">MTTQ, Đoàn TN, Hội PN...</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/80 text-[10px] text-blue-800 font-medium">
                  ✓ Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
              </label>

            </div>
          </div>

          {/* =========================================================================
              2. CÀI ĐẶT PHẦN BÊN TRÁI CƠ QUAN BAN HÀNH CÓ 2 DÒNG (YÊU CẦU 2)
              ========================================================================= */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-red-600" />
                <span>2. Phần góc trái Cơ quan ban hành (Chuẩn 2 dòng NĐ 30 & HD 05):</span>
              </label>
              <span className="text-[11px] text-slate-500 font-normal">Góc trên cùng bên trái</span>
            </div>

            {/* DÒNG 1: CƠ QUAN CHỦ QUẢN CẤP TRÊN */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Dòng 1: Cơ quan chủ quản cấp trên (tùy chọn - để trống nếu không có):
              </label>
              <input
                type="text"
                value={form.parentAgency || ''}
                onChange={(e) => setForm({ ...form, parentAgency: e.target.value })}
                placeholder="Mặc định để trống (Hệ thống không tự ý thêm cấp trên, người dùng tự nhập nếu có)..."
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 font-serif uppercase"
              />
              <p className="text-[11px] text-slate-500 mt-0.5 italic">
                Hệ thống không tự ý thêm cấp trên; chỉ áp dụng đối với các phòng, ban, trung tâm chuyên môn trực thuộc tỉnh hoặc xã/phường (để trống nếu ban hành với tư cách UBND).
              </p>
            </div>

            {/* DÒNG 2: CƠ QUAN BAN HÀNH VĂN BẢN */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Dòng 2: Cơ quan ban hành văn bản (*):
              </label>
              <input
                type="text"
                required
                value={form.agencyName}
                onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                placeholder="Ví dụ: ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN hoặc ĐẢNG ỦY..."
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 font-serif font-bold uppercase"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Nếu là UBND các cấp, hệ thống tự động ngắt thành 2 dòng: Dòng 1: ỦY BAN NHÂN DÂN, Dòng 2: PHƯỜNG ĐÔNG TIẾN (in đậm kèm gạch ngang).
              </p>
            </div>

            {/* ĐỊA DANH VIẾT TẮT */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>Địa danh viết tắt (*):</span>
              </label>
              <input
                type="text"
                required
                value={form.shortLocation}
                onChange={(e) => setForm({ ...form, shortLocation: e.target.value })}
                placeholder="Ví dụ: Đông Tiến"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 font-serif"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dùng đối chiếu phần ngày tháng (Ví dụ: "{form.shortLocation || 'Đông Tiến'}, ngày      tháng      năm 2026").
              </p>
            </div>

          </div>

          {/* =========================================================================
              3. KHUNG TRỰC QUAN HÓA (LIVE PREVIEW MẪU ĐẦU VĂN BẢN 2 CỘT)
              ========================================================================= */}
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-300 font-serif">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 font-sans text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Mô phỏng tiêu đề văn bản theo cài đặt của đồng chí:
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Khổ A4 chuẩn công vụ
              </span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-xs">
              <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                <tbody>
                  <tr>
                    {/* Cột trái (Dòng 1 & Dòng 2) */}
                    <td style={{ width: '45%', verticalAlign: 'top', textAlign: 'center', border: 'none', paddingRight: '8pt' }}>
                      {form.parentAgency ? (
                        <>
                          <div style={{ fontSize: '10pt', textTransform: 'uppercase', lineHeight: 1.25, marginBottom: '2pt' }}>
                            {form.parentAgency}
                          </div>
                          <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.25 }}>
                            {form.agencyName || 'TÊN CƠ QUAN BAN HÀNH'}
                          </div>
                        </>
                      ) : (
                        (() => {
                          const ubndMatch = (form.agencyName || '').match(/^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)\s+(.+)$/i);
                          if (ubndMatch) {
                            return (
                              <>
                                <div style={{ fontSize: '10pt', textTransform: 'uppercase', lineHeight: 1.25, marginBottom: '2pt' }}>
                                  ỦY BAN NHÂN DÂN
                                </div>
                                <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.25 }}>
                                  {ubndMatch[1].toUpperCase()}
                                </div>
                              </>
                            );
                          }
                          return (
                            <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.25 }}>
                              {form.agencyName || 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN'}
                            </div>
                          );
                        })()
                      )}
                      <div style={{ width: '40%', margin: '2pt auto 3pt auto', borderBottom: '1.2pt solid #000' }}></div>
                      <div style={{ fontSize: '10pt', marginTop: '2pt' }}>
                        Số:<span style={{ display: 'inline-block', width: '1cm' }}>&nbsp;</span>/UBND-VP
                      </div>
                    </td>

                    {/* Cột phải (Quốc hiệu hoặc Tiêu đề Đảng) */}
                    <td style={{ width: '55%', verticalAlign: 'top', textAlign: 'center', border: 'none' }}>
                      {currentRoleBlock === 'dang' ? (
                        <>
                          <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ĐẢNG CỘNG SẢN VIỆT NAM
                          </div>
                          <div style={{ width: '40%', margin: '2pt auto 3pt auto', borderBottom: '1.2pt solid #000' }}></div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                          </div>
                          <div style={{ fontSize: '11pt', fontWeight: 'bold', margin: '2pt 0 1pt 0', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', borderBottom: '1.2pt solid #000', paddingBottom: '2pt', lineHeight: 1.15 }}>
                              Độc lập - Tự do - Hạnh phúc
                            </span>
                          </div>
                        </>
                      )}
                      <div style={{ fontSize: '10pt', fontStyle: 'italic', marginTop: '3pt' }}>
                        {previewLoc}, ngày&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tháng&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;năm {previewYear}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* =========================================================================
              4. CÀI ĐẶT TÊN CÔNG CHỨC, CHỨC DANH ĐỂ TIỂU BẢO BỐI CHÀO RIÊNG (YÊU CẦU 4)
              ========================================================================= */}
          <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 space-y-3.5 font-sans">
            <div className="flex items-center justify-between">
              <label className="font-bold text-rose-950 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-rose-600" />
                <span>4. Cán bộ / Công chức sử dụng (Tiểu Bảo Bối chào riêng tên bạn):</span>
              </label>
              <span className="text-[11px] text-rose-700 font-semibold bg-rose-100 px-2 py-0.5 rounded">
                Chào riêng tên • Không chào chung
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Họ và tên cán bộ / công chức (*):
                </label>
                <input
                  type="text"
                  value={form.officerName || ''}
                  onChange={(e) => setForm({ ...form, officerName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Thị Mai hoặc Lê Thế Điệp"
                  className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-serif text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chức vụ / Chức danh công tác:
                </label>
                <input
                  type="text"
                  value={form.officerTitle || ''}
                  onChange={(e) => setForm({ ...form, officerTitle: e.target.value })}
                  placeholder="Ví dụ: Chuyên viên Văn phòng, Phó Chủ tịch..."
                  className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-serif text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Cách xưng hô yêu thích:
                </label>
                <select
                  value={form.officerGreetingPrefix || 'đồng chí'}
                  onChange={(e) => setForm({ ...form, officerGreetingPrefix: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-serif text-slate-900 cursor-pointer"
                >
                  <option value="đồng chí">Đồng chí (Chuẩn công vụ)</option>
                  <option value="chị">Chị (Thân mật)</option>
                  <option value="anh">Anh (Thân mật)</option>
                  <option value="em">Em</option>
                  <option value="cán bộ">Cán bộ</option>
                </select>
              </div>
            </div>

            {/* Mô phỏng lời chào của Tiểu Bảo Bối */}
            <div className="p-3 bg-white rounded-xl border border-rose-200 flex items-start gap-2.5 text-xs text-rose-950 font-serif shadow-2xs">
              <span className="text-base shrink-0">🌸</span>
              <div>
                <div className="font-bold text-rose-800 text-[11px] uppercase flex items-center gap-1 font-sans">
                  <MessageSquareHeart className="w-3.5 h-3.5 text-rose-600" />
                  <span>Lời chào riêng từ Tiểu Bảo Bối:</span>
                </div>
                <p className="mt-1 leading-relaxed">
                  "{salutationPreview.greetingIntro} Em là <strong>Tiểu Bảo Bối</strong> – Trợ lý văn thư thông minh 1.0 của {salutationPreview.pronoun} đây ạ! Hôm nay {salutationPreview.shortName} cần em hỗ trợ rà soát, chuẩn hóa văn bản nào ạ?"
                </p>
              </div>
            </div>
          </div>

          {/* =========================================================================
              5. NĂM BAN HÀNH CHO KÝ SỐ & NGƯỜI KÝ
              ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1 font-sans">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>Năm ban hành (Ký số):</span>
              </label>
              <input
                type="text"
                value={form.issuingYear || ''}
                onChange={(e) => setForm({ ...form, issuingYear: e.target.value })}
                placeholder={`Ví dụ: ${new Date().getFullYear()}`}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-serif"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1 font-sans">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Chức vụ người ký:</span>
              </label>
              <input
                type="text"
                value={form.signerTitle || ''}
                onChange={(e) => setForm({ ...form, signerTitle: e.target.value })}
                placeholder="Ví dụ: CHỦ TỊCH / BÍ THƯ"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-serif uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-sans">
                Họ và tên người ký:
              </label>
              <input
                type="text"
                value={form.signerName || ''}
                onChange={(e) => setForm({ ...form, signerName: e.target.value })}
                placeholder="Ví dụ: Lê Thế Điệp"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-serif"
              />
            </div>
          </div>

          {/* 5. Tùy chọn Gemini API Key */}
          <div className="pt-2 border-t border-slate-200">
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5 font-sans">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Khóa Gemini API (Tùy chọn):</span>
            </label>
            <input
              type="password"
              value={form.geminiApiKey || ''}
              onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
              placeholder="Để trống để sử dụng chế độ Offline hoặc API proxy bảo mật"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
            />
          </div>

          {saveMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-2 animate-fade-in font-sans">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {saveMessage}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 font-sans">
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
