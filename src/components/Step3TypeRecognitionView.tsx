import React, { useState } from 'react';
import { RuleLoader } from '../services/ruleLoader';
import { 
  FileType, Star, ChevronDown, ChevronUp, Check, 
  ArrowRight, ArrowLeft, ShieldCheck, Info 
} from 'lucide-react';

interface Step3TypeRecognitionViewProps {
  currentSystem: 'hanh_chinh' | 'dang' | 'academic';
  selectedDocTypeId: string;
  confidenceScore: number; // 0 - 100%
  onSelectType: (system: 'hanh_chinh' | 'dang' | 'academic', typeId: string, typeName: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const STORAGE_PINNED_TYPES_KEY = 'trolyvanthu_pinned_doc_types_v1';

export const Step3TypeRecognitionView: React.FC<Step3TypeRecognitionViewProps> = ({
  currentSystem,
  selectedDocTypeId,
  confidenceScore,
  onSelectType,
  onNext,
  onBack
}) => {
  const catalog = RuleLoader.getDocTypesCatalog();

  const [activeSystemTab, setActiveSystemTab] = useState<'hanh_chinh' | 'dang' | 'academic'>(currentSystem);
  const [showLessCommon, setShowLessCommon] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Danh sách loại văn bản ghim yêu thích
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PINNED_TYPES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      //
    }
    return ['cong-van', 'bao-cao', 'quyet-dinh', 'to-trinh'];
  });

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (pinnedIds.includes(id)) {
      updated = pinnedIds.filter(x => x !== id);
    } else {
      updated = [...pinnedIds, id];
    }
    setPinnedIds(updated);
    try {
      localStorage.setItem(STORAGE_PINNED_TYPES_KEY, JSON.stringify(updated));
    } catch {
      //
    }
  };

  const getSystemTypes = () => {
    if (activeSystemTab === 'hanh_chinh') return catalog.administrative;
    if (activeSystemTab === 'dang') return catalog.party;
    return catalog.academic;
  };

  const sysData = getSystemTypes();
  const commonList = (sysData as any).common || [];
  const lessCommonList = (sysData as any).lessCommon || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-6 font-sans text-xs">
      
      {/* Tiêu đề & Độ tin cậy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-black uppercase text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
            Bước 3: Nhận diện hệ thống & Loại văn bản
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Xác nhận Thể loại văn bản (NĐ 30, HD 05 hoặc Học thuật)
          </h3>
          <p className="text-slate-500 mt-0.5">
            Độ tin cậy nhận diện: <strong className={confidenceScore >= 80 ? 'text-emerald-700' : 'text-amber-700'}>{confidenceScore}%</strong>
            {confidenceScore < 80 && ' (Dưới 80%: Bắt buộc đồng chí xác nhận lại loại văn bản bên dưới)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>Tiếp tục sang Bước 4</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs chọn Hệ thống văn bản */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-lg">
        <button
          type="button"
          onClick={() => setActiveSystemTab('hanh_chinh')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
            activeSystemTab === 'hanh_chinh' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hành chính (29 loại NĐ 30)
        </button>
        <button
          type="button"
          onClick={() => setActiveSystemTab('dang')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
            activeSystemTab === 'dang' ? 'bg-white text-red-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Văn bản Đảng (HD 05)
        </button>
        <button
          type="button"
          onClick={() => setActiveSystemTab('academic')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
            activeSystemTab === 'academic' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tài liệu học thuật
        </button>
      </div>

      {/* Danh sách Thường dùng */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Loại văn bản thường dùng (Cấp xã / Cơ sở):
          </span>
          <span className="text-slate-400 text-[11px]">(★ Bấm ngôi sao để ghim lên đầu)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {commonList.map((item: any) => {
            const isSelected = selectedDocTypeId === item.id;
            const isPinned = pinnedIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onSelectType(activeSystemTab, item.id, item.name)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  isSelected 
                    ? 'bg-blue-50/80 border-2 border-blue-600 shadow-xs text-blue-950 font-bold' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-600 font-bold shrink-0">
                    {item.abbr || 'VB'}
                  </span>
                  <span className="truncate">{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => togglePin(item.id, e)}
                    className="p-1 hover:bg-slate-200 rounded text-amber-500 cursor-pointer"
                    title="Ghim yêu thích"
                  >
                    <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
                  </button>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danh sách Ít dùng (Thu gọn) */}
      {lessCommonList.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowLessCommon(!showLessCommon)}
            className="flex items-center gap-1.5 font-bold text-slate-600 hover:text-blue-700 cursor-pointer text-xs"
          >
            <span>{showLessCommon ? 'Thu gọn danh mục ít dùng' : `Xem thêm (${lessCommonList.length} thể loại ít dùng khác)`}</span>
            {showLessCommon ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showLessCommon && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 animate-fade-in">
              {lessCommonList.map((item: any) => {
                const isSelected = selectedDocTypeId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectType(activeSystemTab, item.id, item.name)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-blue-50/80 border-2 border-blue-600 shadow-xs text-blue-950 font-bold' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center font-mono text-[10px] text-slate-500 shrink-0">
                        {item.abbr || 'VB'}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
