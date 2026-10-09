import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles, Send, CheckCircle2, BookOpen, ShieldAlert } from 'lucide-react';
import { AgencySettings } from '../types';
import { getOfficerSalutation } from '../utils/officerSalutation';

interface FloatingMascotChatProps {
  agencySettings: AgencySettings;
  openSettings: () => void;
  openGuidelines: () => void;
}

export const FloatingMascotChat: React.FC<FloatingMascotChatProps> = ({
  agencySettings,
  openSettings,
  openGuidelines
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const salutation = getOfficerSalutation(agencySettings);

  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>(() => [
    {
      sender: 'ai',
      text: `Dạ ${salutation.salutationText}! Em là Tiểu Bảo Bối – Trợ lý văn thư thông minh 1.0. ${salutation.shortName ? salutation.shortName : 'Đồng chí'} cần em giải đáp điều gì về thể thức Nghị định 30 hay Hướng dẫn 05 của Đảng không ạ?`
    }
  ]);

  // Update initial message when officer name changes
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].sender === 'ai') {
        return [{
          sender: 'ai',
          text: `Dạ ${salutation.salutationText}! Em là Tiểu Bảo Bối – Trợ lý văn thư thông minh 1.0. ${salutation.shortName ? salutation.shortName : 'Đồng chí'} cần em giải đáp điều gì về thể thức Nghị định 30 hay Hướng dẫn 05 của Đảng không ạ?`
        }];
      }
      return prev;
    });
  }, [agencySettings.officerName, agencySettings.officerTitle, agencySettings.officerGreetingPrefix]);

  const [inputValue, setInputValue] = useState('');

  const quickPrompts = [
    "Quy chuẩn gạch ngang dưới Tiêu ngữ?",
    "Quy cách ghi số ký hiệu Công văn?",
    "Quy tắc ghi ngày tháng năm ban hành?",
    "Nơi nhận văn bản trình bày thế nào?"
  ];

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg = { sender: 'user' as const, text: query };
    let aiReply = `Dạ, Tiểu Bảo Bối đã ghi nhận câu hỏi của ${salutation.shortName}!`;

    const lower = query.toLowerCase();
    if (lower.includes('tiêu ngữ') || lower.includes('gạch ngang')) {
      aiReply = `Dạ theo Nghị định 30/2020/NĐ-CP, Tiêu ngữ 'Độc lập - Tự do - Hạnh phúc' được đặt dưới Quốc hiệu, chữ in thường, cỡ 13-14, đứng, đậm. Bên dưới có đường kẻ ngang bằng độ dài của dòng chữ, liền nét, nét mảnh (0.5 - 1pt) ${salutation.shortName} nhé!`;
    } else if (lower.includes('công văn') || lower.includes('số ký hiệu') || lower.includes('số')) {
      aiReply = `Dạ, số ký hiệu Công văn gồm: Số thứ tự / Tên viết tắt loại văn bản - Tên viết tắt cơ quan. Ví dụ: Số: 45/UBND-VP hoặc Số: 12/CV-UBND ${salutation.shortName} nhé!`;
    } else if (lower.includes('ngày') || lower.includes('tháng') || lower.includes('địa danh')) {
      aiReply = `Dạ địa danh hiện tại đang áp dụng là "${agencySettings.shortLocation || 'Đông Tiến'}". Thời gian ghi bằng chữ in thường, nghiêng: "${agencySettings.shortLocation || 'Đông Tiến'}, ngày ... tháng ... năm ...". Các ngày dưới 10 và tháng 1, 2 phải ghi thêm số 0 ở trước (ví dụ ngày 05 tháng 02)!`;
    } else if (lower.includes('nơi nhận')) {
      aiReply = "Dạ từ 'Nơi nhận:' ghi cỡ 12, in thường, nghiêng đậm. Các dòng liệt kê cơ quan nhận bên dưới cỡ 11, thường, đứng, đầu dòng có gạch ngang (-), cuối mỗi dòng chấm phẩy (;), dòng cuối cùng '- Lưu: VT, ...' có dấu chấm (.) ạ!";
    } else {
      aiReply = `Dạ ${salutation.shortName} ơi, toàn bộ văn bản khi đưa vào hệ thống sẽ được em tự động chuẩn hóa sang định dạng 2 cột, căn lề chuẩn A4 (Trái 3cm, Trên 2cm, Dưới 2cm, Phải 1.5-2cm) và dùng đúng font Times New Roman theo quy định ạ!`;
    }

    setMessages((prev) => [...prev, userMsg, { sender: 'ai', text: aiReply }]);
    setInputValue('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 font-serif">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-rose-300 w-80 sm:w-96 mb-3 overflow-hidden flex flex-col h-[420px] animate-scale-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-700 via-red-700 to-rose-800 text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-rose-700 font-bold text-sm shadow-xs">
                👧
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">Tiểu Bảo Bối</h4>
                <p className="text-[11px] text-rose-200 font-sans">Trợ lý văn thư thông minh 1.0</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-rose-700 text-white rounded-br-xs font-sans'
                      : 'bg-white border border-rose-100 text-slate-800 shadow-xs rounded-bl-xs'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick suggestions */}
          <div className="p-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto font-sans">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-900 text-[10px] font-medium border border-rose-200 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Hỏi Tiểu Bảo Bối về thể thức..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
            />
            <button
              onClick={() => handleSend()}
              className="p-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Button / Avatar with speech prompt */}
      <div className="flex items-center gap-2.5 justify-end">
        {!isOpen && (
          <div 
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-1.5 bg-white border-2 border-rose-400 text-rose-950 px-3.5 py-1.5 rounded-full shadow-lg cursor-pointer hover:bg-rose-50 transition-all hover:scale-105 animate-bounce-subtle"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold font-serif">
              Hỏi Tiểu Bảo Bối nè đồng chí ơi!
            </span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Tiểu Bảo Bối - Trợ lý văn thư thông minh 1.0"
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 p-0.5 shadow-xl hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer border-2 border-white relative group"
        >
          <div className="w-full h-full rounded-full bg-rose-50 flex items-center justify-center overflow-hidden">
            <span className="text-2xl select-none">👧</span>
          </div>

          <div className="absolute -top-1 -right-1 bg-amber-400 text-red-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-xs">
            1.0
          </div>
        </button>
      </div>
    </div>
  );
};
