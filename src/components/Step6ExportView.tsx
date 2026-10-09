import React, { useState, useEffect } from 'react';
import { DocModel, DocModelEngine } from '../services/docModelEngine';
import { OOXMLEditor, OOXMLProcessResult } from '../services/ooxmlEditor';
import { RuleLoader } from '../services/ruleLoader';
import { ContentModeEngine, ContentModeResult } from '../services/contentModeEngine';
import { DocxPreviewViewer } from './DocxPreviewViewer';
import { 
  Download, RefreshCw, FileText, Globe, Share2, 
  CheckCircle2, AlertTriangle, Undo2, ArrowLeft, ShieldCheck, Eye 
} from 'lucide-react';

interface Step6ExportViewProps {
  originalText: string;
  originalFileBuffer: ArrayBuffer | null;
  docModel: DocModel;
  onBack: () => void;
  onResetToOriginal: () => void;
  onOpenRuleImporter: () => void;
}

export const Step6ExportView: React.FC<Step6ExportViewProps> = ({
  originalText,
  originalFileBuffer,
  docModel,
  onBack,
  onResetToOriginal,
  onOpenRuleImporter
}) => {
  const [contentMode, setContentMode] = useState<'standard' | 'website' | 'fanpage'>('standard');
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [academicResult, setAcademicResult] = useState<OOXMLProcessResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('VanBan_ChuanHoa.docx');

  // Khởi tạo tệp .docx dựa trên hệ thống và bộ máy tương ứng
  useEffect(() => {
    let isMounted = true;
    const generateFile = async () => {
      setIsGenerating(true);
      try {
        if (docModel.heThong === 'academic' && originalFileBuffer) {
          // BỘ MÁY 2: TÀI LIỆU HỌC THUẬT - SỬA TRỰC TIẾP OOXML, KHÔNG DỰNG LẠI
          const rule = RuleLoader.getRule('academic', 'thesis');
          const res = await OOXMLEditor.processAcademicDocx(originalFileBuffer, rule);
          if (isMounted) {
            setAcademicResult(res);
            if (res.isVerified) {
              setGeneratedBlob(res.modifiedBlob);
              const url = URL.createObjectURL(res.modifiedBlob);
              setDownloadUrl(url);
              setFileName(`LuanVan_ChuanHoa_${Date.now()}.docx`);
            }
          }
        } else {
          // BỘ MÁY 1: HÀNH CHÍNH & ĐẢNG - DỰNG LẠI THEO MẪU CHUẨN NĐ 30 / HD 05
          const blob = await DocModelEngine.rebuildDocx(docModel);
          if (isMounted) {
            setGeneratedBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            const prefix = docModel.heThong === 'dang' ? 'Dang_HD05' : 'HanhChinh_ND30';
            setFileName(`${prefix}_${docModel.loai.replace(/\s+/g, '_')}_${Date.now()}.docx`);
          }
        }
      } catch (err: any) {
        console.error('Lỗi khi tạo file docx:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    generateFile();

    return () => {
      isMounted = false;
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [docModel, originalFileBuffer]);

  // Xử lý các chế độ nội dung Website & Fanpage
  const websiteArticle = ContentModeEngine.generateWebsiteArticle(originalText, docModel.trichYeu);
  const fanpagePost = ContentModeEngine.generateFanpagePost(originalText, docModel.trichYeu, docModel.coQuanBanHanh);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-6 font-sans text-xs">
      
      {/* Tiêu đề & Nút thao tác chính */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            Bước 6: Chỉnh sửa hoàn tất & Xuất file Word (.docx)
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Tải về tệp .docx chuẩn thể thức & Chuyển đổi 3 chế độ truyền thông
          </h3>
          <p className="text-slate-500 mt-0.5">
            {docModel.heThong === 'academic' 
              ? 'Áp dụng Bộ máy 2: Sửa trực tiếp OOXML, bảo toàn 100% hình, bảng, công thức toán.' 
              : 'Áp dụng Bộ máy 1: Dựng lại khung thể thức chuẩn 2 cột theo Nghị định 30 / Hướng dẫn 05.'}
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
            onClick={onResetToOriginal}
            className="px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
            title="Khôi phục nguyên bản"
          >
            <Undo2 className="w-4 h-4" />
            <span>Hoàn tác về bản gốc</span>
          </button>
        </div>
      </div>

      {/* 3 CHẾ ĐỘ NỘI DUNG */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
        <button
          type="button"
          onClick={() => setContentMode('standard')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            contentMode === 'standard' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>A. Chuẩn hóa thể thức (File Word)</span>
        </button>

        <button
          type="button"
          onClick={() => setContentMode('website')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            contentMode === 'website' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>B. Trang thông tin điện tử</span>
        </button>

        <button
          type="button"
          onClick={() => setContentMode('fanpage')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            contentMode === 'fanpage' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>C. Bản Fanpage / Mạng xã hội</span>
        </button>
      </div>

      {/* CHẾ ĐỘ A: FILE WORD (.DOCX) CHUẨN THỂ THỨC */}
      {contentMode === 'standard' && (
        <div className="space-y-4">
          
          {/* Kết quả kiểm thử toàn vẹn học thuật nếu có */}
          {academicResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              academicResult.isVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm">Kiểm tra bảo toàn tài liệu học thuật (Bắt buộc sau xuất):</strong>
                <p className="mt-0.5 text-xs">{academicResult.verificationMessage}</p>
              </div>
            </div>
          )}

          {/* Card tải về Word */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tệp Word sẵn sàng tải về: {fileName}</span>
              </h4>
              <p className="text-slate-600 mt-1">
                Đã chuẩn hóa Times New Roman, lề A4 chuẩn, bảng mã Unicode TCVN 6909:2001 (NFC), bảng biểu và chữ ký ẩn viền.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải về .docx ngay</span>
                </a>
              )}
            </div>
          </div>

          {/* Trình xem trước Word thật (docx-preview) */}
          <DocxPreviewViewer blob={generatedBlob} className="min-h-[500px]" />

        </div>
      )}

      {/* CHẾ ĐỘ B: BÀI ĐĂNG TRANG THÔNG TIN ĐIỆN TỬ */}
      {contentMode === 'website' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200">
            <strong>Chế độ Trang thông tin điện tử:</strong> Tự động bóc tách nội dung thuần túy, nâng cao tính trang trọng, mạch lạc, sửa lỗi hành văn công vụ để đăng tải tuyên truyền.
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-base">{websiteArticle.title}</h4>
            <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {websiteArticle.content}
            </div>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ C: BẢN FANPAGE */}
      {contentMode === 'fanpage' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-3 bg-purple-50 text-purple-900 rounded-xl border border-purple-200">
            <strong>Chế độ Fanpage / Mạng xã hội:</strong> Ngắn gọn, có icon thu hút, nhấn mạnh các mốc thời gian và nhiệm vụ trọng tâm, gợi ý hashtag, không bịa đặt số liệu ngoài bài gốc.
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 font-sans">
            <div className="text-slate-800 whitespace-pre-wrap leading-relaxed text-sm">
              {fanpagePost.content}
            </div>

            {fanpagePost.hashtags && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200">
                {fanpagePost.hashtags.map((tag, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[11px]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
