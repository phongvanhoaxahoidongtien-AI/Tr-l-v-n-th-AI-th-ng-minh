import React, { useState, useMemo } from 'react';
import { DocCategory, DocumentTypeItem } from '../types';
import { ADMINISTRATIVE_DOC_TYPES, PARTY_DOC_TYPES } from '../data/documentTypes';
import { Search, ArrowRight, Star, FileText, CheckCircle2, Zap } from 'lucide-react';

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
  const [filterMode, setFilterMode] = useState<'all' | 'popular'>('popular');

  const currentList = activeTab === 'hanh_chinh' ? ADMINISTRATIVE_DOC_TYPES : PARTY_DOC_TYPES;

  // Sắp xếp: Ưu tiên đặt các loại văn bản phổ biến nhất ở trước (isPopular: true), các loại ít phổ biến ở sau cùng
  const prioritizedList = useMemo(() => {
    return [...currentList].sort((a, b) => {
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return 0;
    });
  }, [currentList]);

  const filteredList = useMemo(() => {
    return prioritizedList.filter((item) => {
      if (filterMode === 'popular' && !item.isPopular && !searchTerm) {
        return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(term) ||
        item.shortDesc.toLowerCase().includes(term) ||
        item.codePrefix.toLowerCase().includes(term)
      );
    });
  }, [prioritizedList, filterMode, searchTerm]);

  const popularCount = currentList.filter(i => i.isPopular).length;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200 font-sans">
      
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200">
              Bước 1 trên 4
            </span>
            <span className="text-xs text-slate-500">
              • Nhấp đúp vào loại văn bản để sang ngay Bước 2
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-800 mt-1.5 font-serif">
            Chọn loại văn bản cần chuẩn hóa
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Ưu tiên các loại phổ biến nhất (Công văn, Quyết định, Báo cáo, Tờ trình, Thông báo...) ở đầu danh sách.
          </p>
        </div>

        {/* Search input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm nhanh: CV, QĐ, Báo cáo, Tờ trình..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all font-serif"
          />
        </div>
      </div>

      {/* 2 Tabs: Hành chính vs Đảng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 mt-4 mb-3 gap-2">
        <div className="flex">
          <button
            onClick={() => { setActiveTab('hanh_chinh'); }}
            className={`pb-2.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'hanh_chinh'
                ? 'border-red-600 text-red-700 bg-red-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-600" />
            Văn bản hành chính (NĐ 30/2020)
            <span className="ml-1 text-[11px] bg-red-100 text-red-800 font-bold px-1.5 py-0.2 rounded-full">
              29 loại
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('dang'); }}
            className={`pb-2.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dang'
                ? 'border-red-600 text-red-700 bg-red-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Văn bản Đảng (HD 05-HD/VPTW)
            <span className="ml-1 text-[11px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded-full">
              15 loại
            </span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 pb-2">
          <button
            type="button"
            onClick={() => setFilterMode('popular')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterMode === 'popular'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span>Phổ biến nhất ({popularCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({currentList.length})
          </button>
        </div>
      </div>

      {/* Grid of types: Tên nhỏ hơn, ưu tiên phổ biến trước, nhấp đúp sang bước tiếp theo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
        {filteredList.map((item, index) => {
          const isSelected = selectedType.id === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedType(item)}
              onDoubleClick={() => {
                setSelectedType(item);
                onNext();
              }}
              title="Nhấp 1 lần để chọn • Nhấp đúp để chọn và sang ngay Bước 2"
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between select-none ${
                isSelected
                  ? 'border-red-600 bg-red-50/80 shadow-xs ring-1 ring-red-500/30'
                  : 'border-slate-200 bg-white hover:border-red-300 hover:bg-slate-50/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-mono text-slate-400 font-semibold shrink-0">
                      {index + 1}.
                    </span>
                    {/* Tên văn bản thiết kế nhỏ gọn hơn theo yêu cầu người dùng */}
                    <h3 className={`font-bold text-[13px] md:text-sm truncate font-serif ${
                      isSelected ? 'text-red-950 font-black' : 'text-slate-800'
                    }`}>
                      {item.name}
                    </h3>
                  </div>

                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                    {item.codePrefix}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 mb-2 font-serif">
                  {item.shortDesc}
                </p>
              </div>

              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="truncate max-w-[120px]">
                  {item.category === 'hanh_chinh' ? 'Nghị định 30' : 'HD 05-VPTW'}
                </span>

                <div className="flex items-center gap-1">
                  {item.isPopular && (
                    <span className="inline-flex items-center gap-0.5 text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200/60">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Phổ biến
                    </span>
                  )}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNext();
                      }}
                      className="inline-flex items-center gap-0.5 text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-2xs cursor-pointer animate-fade-in"
                    >
                      <span>Đi tiếp</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredList.length === 0 && (
        <div className="text-center py-10 text-slate-500 font-serif">
          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs">Không tìm thấy loại văn bản phù hợp với từ khóa "{searchTerm}".</p>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setFilterMode('all'); }}
            className="mt-2 text-xs text-red-600 hover:underline font-bold"
          >
            Hiển thị lại toàn bộ danh sách
          </button>
        </div>
      )}

      {/* Selected Type Summary Banner & Next button */}
      <div className="mt-4 pt-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs font-mono">
            {selectedType.codePrefix}
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Đang chọn loại văn bản:</div>
            <div className="font-bold text-slate-800 text-sm font-serif flex items-center gap-2">
              <span>{selectedType.name} ({selectedType.codePrefix})</span>
              {selectedType.isPopular && (
                <span className="text-[10px] font-sans font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  ★ Phổ biến
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer text-xs sm:text-sm font-serif"
        >
          <span>Tiếp tục sang bước 2 (Gửi văn bản)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
