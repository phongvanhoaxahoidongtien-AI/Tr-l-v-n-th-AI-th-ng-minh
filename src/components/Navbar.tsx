import React from 'react';
import { AppTab, AgencySettings } from '../types';
import { FileText, Settings, Download, BookOpen, GraduationCap, Home, Sparkles } from 'lucide-react';
import { generateSingleHtmlBundle } from '../services/offlineBundleExporter';

interface NavbarProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  agencySettings: AgencySettings;
  openSettings: () => void;
  openGuidelines: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  agencySettings,
  openSettings,
  openGuidelines
}) => {
  const handleDownloadOfflineBundle = () => {
    const htmlContent = generateSingleHtmlBundle();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tro-ly-van-thu-offline-1.0.html';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-red-700 via-red-800 to-rose-900 text-white shadow-lg border-b-4 border-amber-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentTab('home')}
          >
            <div className="relative w-11 h-11 rounded-full bg-red-600 border-2 border-yellow-300 flex items-center justify-center shadow-md shadow-red-950/40 group-hover:scale-105 transition-transform">
              <span className="text-yellow-300 font-bold text-xl drop-shadow">★</span>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-red-900 text-[10px] font-black px-1 rounded-full border border-yellow-200">
                1.0
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm font-serif">
                  Trợ lý văn thư 1.0
                </span>
                <span className="bg-amber-400/90 text-red-950 text-xs font-bold px-2 py-0.5 rounded-full shadow-xs">
                  AI Thông Minh
                </span>
              </div>
              <p className="text-xs text-amber-200 font-medium tracking-wide hidden sm:block">
                Chuẩn hóa văn bản hành chính chỉ trong tích tắc!
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setCurrentTab('home')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'home'
                  ? 'bg-white/20 text-yellow-200 shadow-inner'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              Trang chủ
            </button>

            <button
              onClick={() => setCurrentTab('normalize')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'normalize'
                  ? 'bg-white/20 text-yellow-200 shadow-inner'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Chuẩn hóa văn bản
            </button>

            <button
              onClick={() => setCurrentTab('templates')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'templates'
                  ? 'bg-white/20 text-yellow-200 shadow-inner'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Soạn từ mẫu có sẵn
            </button>

            <button
              onClick={() => setCurrentTab('academic')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'academic'
                  ? 'bg-white/20 text-yellow-200 shadow-inner'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Luận văn, luận án
            </button>

            <button
              onClick={openGuidelines}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4" />
              Cẩm nang NĐ 30
            </button>
          </nav>

          {/* Action buttons (Settings & Offline Export) */}
          <div className="flex items-center gap-2">
            
            {/* Quick Agency Badge */}
            <button
              onClick={openSettings}
              title="Nhấn để đổi Cài đặt Cơ quan ban hành"
              className="hidden lg:flex items-center gap-1.5 bg-red-950/40 hover:bg-red-950/70 border border-amber-400/40 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-100 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate max-w-[160px]">
                {agencySettings.agencyName || 'Cài đặt Cơ quan'}
              </span>
              <Settings className="w-3.5 h-3.5 text-amber-300 ml-1" />
            </button>

            {/* Offline Bundle Download Button */}
            <button
              onClick={handleDownloadOfflineBundle}
              title="Tải trọn bộ ứng dụng 1 file HTML duy nhất để chạy Offline không cần Internet"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 text-xs font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Tải App Offline</span> (.html)
            </button>

            {/* Settings Mobile Button */}
            <button
              onClick={openSettings}
              className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              aria-label="Cài đặt"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
