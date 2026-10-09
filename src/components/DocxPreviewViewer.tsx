import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface DocxPreviewViewerProps {
  blob: Blob | null;
  className?: string;
}

export const DocxPreviewViewer: React.FC<DocxPreviewViewerProps> = ({ blob, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!blob || !containerRef.current) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const renderDocx = async () => {
      try {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          await renderAsync(blob, containerRef.current, undefined, {
            className: 'docx-preview-doc',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            experimental: true
          });
        }
      } catch (err: any) {
        console.warn('docx-preview error:', err);
        if (isMounted) {
          setError('Không thể kết xuất xem trước bằng docx-preview. Bạn vẫn có thể tải về tệp Word (.docx) bên dưới.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    renderDocx();

    return () => {
      isMounted = false;
    };
  }, [blob]);

  return (
    <div className={`relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex flex-col ${className}`}>
      
      {/* Thanh công cụ zoom */}
      <div className="bg-white/90 backdrop-blur-xs px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs z-10">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <span>Xem trước trực tiếp (Word thật)</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(60, prev - 10))}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-slate-500 w-10 text-center">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(150, prev + 10))}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Vùng xem trước */}
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start min-h-[400px]">
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 my-auto text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Đang nạp xem trước tài liệu Word...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 my-auto text-center max-w-md">
            {error}
          </div>
        )}

        <div 
          ref={containerRef}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className="shadow-xl bg-white transition-transform duration-150"
        />
      </div>

    </div>
  );
};
