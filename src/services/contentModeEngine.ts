import { diffWords, Change } from 'diff';

export interface DiffSegment {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface ContentModeResult {
  mode: 'standard' | 'website' | 'fanpage';
  title: string;
  content: string;
  summary?: string;
  hashtags?: string[];
  diffs?: DiffSegment[];
}

export class ContentModeEngine {
  /**
   * Chế độ B: Biên tập bài đăng Trang thông tin điện tử
   * (Gọi đúng "Trang thông tin điện tử", không dùng "Cổng thông tin điện tử")
   */
  public static generateWebsiteArticle(originalText: string, docTitle?: string): ContentModeResult {
    let clean = originalText;

    // Loại bỏ các khối hành chính cứng (Quốc hiệu, Tiêu ngữ, Số hiệu, Nơi nhận)
    clean = clean
      .replace(/CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM[\s\S]*?Độc\s+lập\s*-\s*Tự\s+do\s*-\s*Hạnh\s+phúc/gi, '')
      .replace(/ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi, '')
      .replace(/Số:\s*[\w\-\/\.]+/gi, '')
      .replace(/Nơi nhận:[\s\S]*$/gi, '')
      .trim();

    // Chuẩn hóa câu văn hành chính trang trọng
    const title = docTitle ? `Thông tin về ${docTitle.replace(/^(V\/v|Về việc)\s*/i, '')}` : 'Thông tin tuyên truyền, chỉ đạo điều hành';

    // Tính toán Diff so sánh
    const diffs = diffWords(originalText.slice(0, 500), clean.slice(0, 500));

    return {
      mode: 'website',
      title,
      content: clean,
      summary: `Bài viết biên tập cho Trang thông tin điện tử dựa trên nội dung văn bản gốc, tăng tính mạch lạc và trang trọng.`,
      diffs
    };
  }

  /**
   * Chế độ C: Bản đăng Fanpage / Mạng xã hội
   * (Ngắn gọn, giàu tính tuyên truyền, dễ lan tỏa, tiêu đề thu hút, gợi ý hashtag, không bịa số liệu)
   */
  public static generateFanpagePost(originalText: string, docTitle?: string, agency?: string): ContentModeResult {
    const mainTitle = docTitle 
      ? `📢 ${docTitle.replace(/^(V\/v|Về việc)\s*/i, '').toUpperCase()}` 
      : '📢 THÔNG TIN QUAN TRỌNG ĐẾN BÀ CON NHÂN DÂN';

    const agencyName = agency || 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN';

    // Bóc tách các ý chính (các gạch đầu dòng hoặc điểm)
    const lines = originalText.split('\n').map(l => l.trim()).filter(Boolean);
    const keyPoints: string[] = [];

    for (const l of lines) {
      if (/^[•\-\*+]\s+|^Điều\s+\d+|^\d+\.\s+/.test(l) && l.length > 20 && l.length < 160) {
        keyPoints.push(`🔹 ${l.replace(/^[•\-\*+]\s+/, '')}`);
        if (keyPoints.length >= 4) break;
      }
    }

    const postContent = `
${mainTitle}
--------------------------
🏛️ ${agencyName} trân trọng thông báo tới toàn thể cán bộ, đảng viên và Nhân dân trên địa bàn:

${keyPoints.length > 0 ? keyPoints.join('\n\n') : 'Chi tiết nội dung đã được ban hành và niêm yết công khai tại Trụ sở và Trang thông tin điện tử.'}

👉 Kính mong quý bà con, các cơ quan, đơn vị cùng phối hợp thực hiện hiệu quả!
    `.trim();

    const hashtags = [
      '#ThongTinChinhQuyen',
      '#TrangThongTinDienTu',
      '#DongTien',
      '#VanBanDieuHanh',
      '#CaiCachHanhChinh'
    ];

    return {
      mode: 'fanpage',
      title: mainTitle,
      content: postContent,
      hashtags
    };
  }
}
