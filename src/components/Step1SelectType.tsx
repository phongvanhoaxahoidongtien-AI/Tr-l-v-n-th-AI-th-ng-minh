import React, { useState } from 'react';
import { DocCategory, DocumentTypeItem } from '../types';
import { ADMINISTRATIVE_DOC_TYPES, PARTY_DOC_TYPES } from '../data/documentTypes';
import { Search, ArrowRight, Star, FileText, CheckCircle2 } from 'lucide-react';

interface Step1SelectTypeProps {
  selectedType: DocumentTypeItem;
  setSelectedType: (item: DocumentTypeItem) => void;
  onNext: () => void;
}

export const Step1SelectType: React.FC<Step1SelectTypeProps> = ({
  selectedType,
  setSelectedType,
  onNext
}) => {
  const [activeTab, setActiveTab] = useState<DocCategory>('hanh_chinh');
  const [searchTerm, setSearchTerm] = useState('');

  const currentList = activeTab === 'hanh_chinh' ? ADMINISTRATIVE_DOC_TYPES : PARTY_DOC_TYPES;

  const filteredList = currentList.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shortDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codePrefix.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl p-5 md:p-7 shadow-xs border border-slate-200">
      
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
            Bước 1 trên 4
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-2 font-serif">
            Chọn loại văn bản cần chuẩn hóa
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Áp dụng đúng chuẩn thể thức, số ký hiệu và bố cục mẫu quy định.
          </p>
        </div>

        {/* Search input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc ký hiệu (CV, QĐ...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 2 Tabs: Hành chính (29 loại NĐ 30) vs Đảng (HD 05) */}
      <div className="flex border-b border-slate-200 mt-5 mb-5">
        <button
          onClick={() => setActiveTab('hanh_chinh')}
          className={`pb-3 px-4 font-bold text-sm md:text-base border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'hanh_chinh'
              ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
          Văn bản hành chính (Nghị định 30/2020/NĐ-CP)
          <span className="ml-1 text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
            29 loại
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dang')}
          className={`pb-3 px-4 font-bold text-sm md:text-base border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'dang'
              ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          Văn bản của Đảng (Hướng dẫn 05-HD/VPTW)
          <span className="ml-1 text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
            Văn phòng TW
          </span>
        </button>
      </div>

      {/* Grid of types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
        {filteredList.map((item, index) => {
          const isSelected = selectedType.id === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedType(item)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'border-red-600 bg-red-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      {activeTab === 'hanh_chinh' ? `${index + 1}.` : '★'}
                    </span>
                    <h3 className={`font-bold text-base ${isSelected ? 'text-red-900' : 'text-slate-800'}`}>
                      {item.name}
                    </h3>
                  </div>

                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {item.codePrefix}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                  {item.shortDesc}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate max-w-[180px]" title={item.decreeRef}>
                  {item.category === 'hanh_chinh' ? 'Nghị định 30/2020' : 'HD 05-HD/VPTW'}
                </span>

                {item.isPopular && (
                  <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Phổ biến
                  </span>
                )}
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 text-red-600">
                  <CheckCircle2 className="w-5 h-5 fill-red-100" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredList.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p>Không tìm thấy loại văn bản phù hợp với từ khóa "{searchTerm}".</p>
        </div>
      )}

      {/* Selected Type Summary Banner & Next button */}
      <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm">
            {selectedType.codePrefix}
          </div>
          <div>
            <div className="text-xs text-slate-500">Đang chọn:</div>
            <div className="font-bold text-slate-800 text-sm md:text-base">
              {selectedType.name} ({selectedType.codePrefix})
            </div>
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold px-6 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <span>Tiếp tục sang bước 2 (Gửi văn bản)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
