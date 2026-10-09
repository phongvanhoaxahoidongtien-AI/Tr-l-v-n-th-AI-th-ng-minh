export interface CleanChangeItem {
  id: string;
  category: 'markdown' | 'emoji' | 'ai_chatter' | 'whitespace' | 'bullet' | 'date' | 'punctuation' | 'fabrication_warning';
  title: string;
  description: string;
  originalSnippet: string;
  cleanedSnippet: string;
  applied: boolean;
  isWarningOnly?: boolean;
}

export interface AICleanResult {
  cleanedText: string;
  changes: CleanChangeItem[];
  itemsToVerify: {
    target: string;
    reason: string;
    type: 'legal_basis' | 'doc_code' | 'stat_number' | 'date';
  }[];
}

export class AITextCleaner {
  /**
   * Bộ làm sạch văn bản dán từ AI (Deterministic + Heuristic Verification)
   */
  public static cleanText(rawText: string): AICleanResult {
    let text = rawText;
    const changes: CleanChangeItem[] = [];
    const itemsToVerify: AICleanResult['itemsToVerify'] = [];

    let changeId = 1;
    const recordChange = (
      category: CleanChangeItem['category'],
      title: string,
      description: string,
      originalSnippet: string,
      cleanedSnippet: string
    ) => {
      changes.push({
        id: `clean_${changeId++}`,
        category,
        title,
        description,
        originalSnippet,
        cleanedSnippet,
        applied: true
      });
    };

    // 1. Chuẩn hóa ký tự trắng đặc biệt: non-breaking space, zero-width space
    if (/[\u00A0\u200B\u200C\u200D\uFEFF]/.test(text)) {
      const origSample = text.match(/[\u00A0\u200B\u200C\u200D\uFEFF]/)?.[0] || '';
      text = text.replace(/[\u00A0]/g, ' ').replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
      recordChange(
        'whitespace',
        'Xóa ký tự ẩn và khoảng trắng không ngắt',
        'Đã loại bỏ mã non-breaking space (\\u00A0) và zero-width space thường sinh từ AI',
        origSample,
        ' '
      );
    }

    // 2. Loại bỏ Emoji biểu tượng cảm xúc
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}]/gu;
    if (emojiRegex.test(text)) {
      const matchedEmojis = text.match(emojiRegex) || [];
      text = text.replace(emojiRegex, '');
      recordChange(
        'emoji',
        'Xóa biểu tượng cảm xúc (Emoji)',
        `Đã loại bỏ ${matchedEmojis.length} biểu tượng cảm xúc không phù hợp văn bản hành chính`,
        matchedEmojis.slice(0, 5).join(' '),
        ''
      );
    }

    // 3. Xóa lời mở đầu và lời kết của Chatbot AI
    const aiIntroPatterns = [
      /^(?:Dưới đây là|Sau đây là|Tôi xin gửi|Gửi bạn|Đây là|Theo yêu cầu của bạn|Chào bạn|Kính gửi đồng chí|Chắc chắn rồi|Tất nhiên rồi).*?(?:dự thảo|văn bản|nội dung|quyết định|công văn|tờ trình|mẫu|bản chuẩn hóa).*?[:\.]\s*\n+/gim,
      /^(?:Tôi đã (?:chuẩn hóa|rà soát|soạn thảo|sửa lại)).*?[:\.]\s*\n+/gim,
      /^(?:Dưới đây là toàn bộ|Dưới đây là nội dung chi tiết).*?[:\.]\s*\n+/gim
    ];

    for (const pat of aiIntroPatterns) {
      if (pat.test(text)) {
        const m = text.match(pat)?.[0] || '';
        text = text.replace(pat, '');
        recordChange(
          'ai_chatter',
          'Xóa lời mở đầu của AI',
          'Đã gỡ bỏ câu chào và lời dẫn chuyện tự động của chatbot',
          m.trim(),
          ''
        );
      }
    }

    const aiOutroPatterns = [
      /\n+(?:Hy vọng|Chúc bạn|Chúc đồng chí|Lưu ý khi ban hành|Lưu ý thêm|Nếu cần chỉnh sửa|Bạn có thể thay đổi|Ghi chú:).*$/gims,
      /\n+(?:Trên đây là dự thảo|Mọi thắc mắc|Cần hỗ trợ thêm).*$/gims,
      /\n+(?:Rất hân hạnh|Tôi luôn sẵn sàng).*$/gims
    ];

    for (const pat of aiOutroPatterns) {
      if (pat.test(text)) {
        const m = text.match(pat)?.[0] || '';
        text = text.replace(pat, '');
        recordChange(
          'ai_chatter',
          'Xóa lời kết luận của AI',
          'Đã gỡ bỏ câu chào kết thúc và lời nhắc của chatbot',
          m.trim().slice(0, 100) + '...',
          ''
        );
      }
    }

    // 4. Xóa dấu trích dẫn nguồn số [1], [2], [nguồn], 【1†source】
    if (/\[\d+\]|\[nguồn\]|【[^】]+】/i.test(text)) {
      text = text.replace(/\[\d+\]|\[nguồn\]|【[^】]+】/gi, '');
      recordChange(
        'markdown',
        'Xóa dấu trích dẫn nguồn AI',
        'Đã loại bỏ các thẻ chú thích nguồn dạng [1], [nguồn], 【source】',
        '[1], 【source】',
        ''
      );
    }

    // 5. Chuẩn hóa Markdown: Tiêu đề (#), in đậm (**), in nghiêng (*), code blocks (```)
    if (/^```|```$/m.test(text)) {
      text = text.replace(/^```[a-zA-Z0-9_-]*\s*/gm, '').replace(/```\s*$/gm, '');
      recordChange('markdown', 'Gỡ bỏ code block (```)', 'Đã xóa khối mã code block của Markdown', '```markdown', '');
    }

    if (/^#{1,6}\s+/m.test(text)) {
      text = text.replace(/^#{1,6}\s+/gm, '');
      recordChange('markdown', 'Chuyển đổi Header Markdown (#)', 'Đã chuyển tiêu đề markdown sang đoạn văn bản thuần', '# Tiêu đề', 'Tiêu đề');
    }

    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/(^|[^\w*])\*([^*\n]+)\*([^\w*]|$)/g, '$1$2$3');
    text = text.replace(/(^|[^\w_])_([^_\n]+)_([^\w_]|$)/g, '$1$2$3');

    // 6. Xử lý dấu gạch dài (em-dash / en-dash) và dấu ngoặc kép cong
    text = text.replace(/[\u201C\u201D\u00AB\u00BB]/g, '"');
    text = text.replace(/[\u2018\u2019]/g, "'");

    // 7. Chuẩn hóa ngày tháng theo Phụ lục I NĐ 30: ngày < 10 và tháng 1, 2 thêm số 0 ở trước
    const datePattern = /ngày\s+([1-9])\s+tháng\s+([1-9]|1[0-2])\s+năm\s+(\d{4})/gi;
    if (datePattern.test(text)) {
      text = text.replace(datePattern, (match, d, m, y) => {
        const dayStr = d.length === 1 ? `0${d}` : d;
        const monthStr = (m === '1' || m === '2') ? `0${m}` : m;
        const formatted = `ngày ${dayStr} tháng ${monthStr} năm ${y}`;
        if (formatted !== match) {
          recordChange(
            'date',
            'Chuẩn hóa ngày tháng số 0',
            `Thêm số 0 vào trước ngày/tháng theo quy định NĐ 30: "${match}" -> "${formatted}"`,
            match,
            formatted
          );
        }
        return formatted;
      });
    }

    // 8. Rà soát phát hiện các căn cứ pháp lý, điều luật, số hiệu và số liệu cần xác minh (Fabrication Detection)
    const lines = text.split('\n');
    for (const l of lines) {
      const trimmed = l.trim();
      // Nhận diện căn cứ pháp lý
      if (/^Căn cứ\s+/i.test(trimmed)) {
        if (/số\s+\d+[\/\-][A-Za-z0-9\-]+/i.test(trimmed) || /ngày\s+\d+\/\d+\/\d+/i.test(trimmed)) {
          itemsToVerify.push({
            target: trimmed,
            reason: 'Căn cứ pháp lý chứa số hiệu văn bản do AI sinh ra, cần đối chiếu với văn bản gốc để tránh bịa đặt số hiệu',
            type: 'legal_basis'
          });
        }
      }

      // Nhận diện số liệu thống kê hoặc cam kết tài chính
      if (/(?:kinh phí|ngân sách|tổng số tiền|số tiền|tỷ lệ|chiếm|dự kiến|kinh phí thực hiện).*?\d+(?:\.\d+)?\s*(?:triệu|tỷ|đồng|%)/i.test(trimmed)) {
        itemsToVerify.push({
          target: trimmed.slice(0, 120),
          reason: 'Chứa số liệu tài chính/thống kê do AI sinh, cần kiểm tra lại độ chính xác thực tế',
          type: 'stat_number'
        });
      }
    }

    // 9. Chuẩn hóa phân cấp Bullet: gạch đầu dòng '- ', dấu cộng '+ ', khoản '1. ', điểm 'a) '
    const cleanedLines: string[] = [];
    for (const l of lines) {
      let trimmed = l.trim();
      if (!trimmed) {
        cleanedLines.push('');
        continue;
      }

      // Đổi bullet tự do (•, ●, ○, ■, *, ►, ✓) thành gạch đầu dòng '- '
      if (/^[•●○■◆❖✓►➢*]\s+(.*)$/.test(trimmed)) {
        const content = trimmed.replace(/^[•●○■◆❖✓►➢*]\s+/, '');
        trimmed = `- ${content}`;
      }

      cleanedLines.push(trimmed);
    }

    text = cleanedLines.join('\n');

    // 10. Gộp dòng trống thừa (> 2 dòng liên tiếp)
    text = text.replace(/\n{3,}/g, '\n\n');

    // 11. Chuẩn hóa tiếng Việt Unicode dựng sẵn NFC
    text = text.normalize('NFC');

    return {
      cleanedText: text.trim(),
      changes,
      itemsToVerify
    };
  }
}
