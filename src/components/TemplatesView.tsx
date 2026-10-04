import React, { useState } from 'react';
import { DocumentTypeItem, AgencySettings } from '../types';
import { ADMINISTRATIVE_DOC_TYPES, PARTY_DOC_TYPES } from '../data/documentTypes';
import { Search, FileText, ArrowRight, Copy, CheckCircle, Sparkles, Building2 } from 'lucide-react';

interface TemplatesViewProps {
  agencySettings: AgencySettings;
  onUseTemplate: (type: DocumentTypeItem, filledContent: string) => void;
  openSettings: () => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  agencySettings,
  onUseTemplate,
  openSettings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<'hanh_chinh' | 'dang'>('hanh_chinh');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTypeItem>(ADMINISTRATIVE_DOC_TYPES[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const list = category === 'hanh_chinh' ? ADMINISTRATIVE_DOC_TYPES : PARTY_DOC_TYPES;
  const filtered = list.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shortDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codePrefix.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Điền thông tin cơ quan & ngày hiện tại vào mẫu
  const getFilledTemplate = (item: DocumentTypeItem): string => {
    let text = item.defaultTemplate || '';
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    if (agencySettings.agencyName) {
      text = text.replace(/ỦY BAN NHÂN DÂN\s+PHƯỜNG ĐÔNG TIẾN/g, agencySettings.agencyName);
      text = text.replace(/UBND Phường Đông Tiến/g, agencySettings.agencyName);
      text = text.replace(/ĐẢNG BỘ PHƯỜNG ĐÔNG TIẾN/g, agencySettings.agencyName.replace(/ỦY BAN NHÂN DÂN|UBND/g, 'ĐẢNG BỘ'));
    }

    if (agencySettings.shortLocation) {
      text = text.replace(/Đông Tiến/g, agencySettings.shortLocation);
    }

    // Cập nhật ngày tháng năm hiện tại
    text = text.replace(/ngày \d{1,2} tháng \d{1,2} năm \d{4}/g, `ngày ${day} tháng ${month} năm ${year}`);

    if (agencySettings.signerName) {
      text = text.replace(/Nguyễn Văn Hùng/g, agencySettings.signerName);
    }

    return text;
  };

  const handleCopy = (item: DocumentTypeItem) => {
    const text = getFilledTemplate(item);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-md border border-blue-200 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Thư viện biểu mẫu chuẩn
            </div>
            <h2 className="text-2xl font-bold text-slate-800 font-serif">
              Soạn văn bản từ mẫu có sẵn
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Đầy đủ 29 loại văn bản hành chính theo Nghị định 30/2020/NĐ-CP và văn bản Đảng theo Hướng dẫn 05-HD/VPTW. 
              Tự động điền cơ quan <strong className="text-slate-900">{agencySettings.agencyName || 'Đông Tiến'}</strong> và ngày tháng năm hiện tại.
            </p>
          </div>

          <button
            onClick={openSettings}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            Đổi thông tin cơ quan
          </button>
        </div>

        {/* Filter bar */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setCategory('hanh_chinh'); setSelectedTemplate(ADMINISTRATIVE_DOC_TYPES[0]); }}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                category === 'hanh_chinh'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Văn bản hành chính (29 loại)
            </button>
            <button
              onClick={() => { setCategory('dang'); setSelectedTemplate(PARTY_DOC_TYPES[0]); }}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                category === 'dang'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Văn bản của Đảng
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mẫu văn bản..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Left List, Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Template List Column */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
          {filtered.map((item) => {
            const isSelected = selectedTemplate.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedTemplate(item)}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.codePrefix}
                      </span>
                      <h4 className={`font-bold text-sm ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                        {item.name}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                      {item.shortDesc}
                    </p>
                  </div>
                  {isSelected && <span className="text-blue-600 font-bold text-xs">Đang xem</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Template Preview & Actions Column */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedTemplate.codePrefix}
                </span>
                <h3 className="font-bold text-lg text-slate-800 mt-1">
                  Mẫu: {selectedTemplate.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(selectedTemplate)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === selectedTemplate.id ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Sao chép
                    </>
                  )}
                </button>

                <button
                  onClick={() => onUseTemplate(selectedTemplate, getFilledTemplate(selectedTemplate))}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span>Sử dụng mẫu này</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-serif text-xs md:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[460px] overflow-y-auto">
              {getFilledTemplate(selectedTemplate)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Quy chuẩn: {selectedTemplate.decreeRef}</span>
            <span className="text-blue-600 font-medium">Đã tự động điền cơ quan và ngày tháng</span>
          </div>

        </div>

      </div>

    </div>
  );
};
