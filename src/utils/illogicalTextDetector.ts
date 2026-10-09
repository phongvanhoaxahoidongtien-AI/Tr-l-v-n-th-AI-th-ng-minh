import { IllogicalSegment } from '../types';

/**
 * Bộ rà soát văn bản hành chính thiếu tính logic theo Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW
 * Phát hiện:
 * 1. Tiêu đề quốc ngữ / đầu văn bản bị trùng lặp lọt vào thân văn bản (đặc biệt trước Căn cứ)
 * 2. Căn cứ pháp lý thiếu tính logic (chỉ đạo miệng, tin đồn, ý kiến cá nhân, chưa điền số hiệu)
 * 3. Quan hệ mệnh lệnh / thẩm quyền hành chính trái logic (cấp dưới yêu cầu/chỉ đạo cấp trên)
 * 4. Văn phong khẩu ngữ, cảm tính cá nhân, phi hành chính
 * 5. Mâu thuẫn logic nội dung trong điều khoản
 * 6. Ký tự giữ chỗ dang dở ([cần bổ sung], [chèn nội dung], [ghi rõ]...)
 * 7. Nhảy cóc thứ tự Điều/Khoản
 */
export function detectIllogicalAdministrativeText(
  text: string,
  _docTypeName?: string,
  _roleBlock?: string
): IllogicalSegment[] {
  if (!text) return [];

  const findings: IllogicalSegment[] = [];
  let idCounter = 1;

  // 1. Trùng lặp Tiêu đề quốc ngữ hoặc Tiêu đề Đảng trong thân bài
  const duplicateHeaderRules = [
    {
      regex: /CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/gi,
      reason: 'Tiêu đề Quốc hiệu bị trùng lặp hoặc lọt vào phần nội dung/trước phần Căn cứ.',
      suggestion: 'Xóa bỏ tiêu đề quốc ngữ thừa này'
    },
    {
      regex: /Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[\.:]?/gi,
      reason: 'Tiêu ngữ "Độc lập - Tự do - Hạnh phúc" bị lọt vào phần nội dung văn bản.',
      suggestion: 'Xóa bỏ tiêu ngữ thừa này'
    },
    {
      regex: /ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi,
      reason: 'Tiêu đề "Đảng Cộng sản Việt Nam" bị lọt vào phần nội dung thân văn bản.',
      suggestion: 'Xóa bỏ tiêu đề Đảng thừa này'
    }
  ];

  for (const rule of duplicateHeaderRules) {
    const matches = Array.from(text.matchAll(rule.regex));
    // Nếu xuất hiện nhiều hơn 1 lần trong toàn văn bản, các lần từ thứ 2 trở đi là thừa
    if (matches.length > 0) {
      matches.forEach((m, idx) => {
        // Nếu match nằm sâu trong văn bản (index > 150) hoặc là lần lặp thứ 2 trở lên
        if (m.index !== undefined && (m.index > 150 || idx > 0)) {
          findings.push({
            id: `illogical_dup_${idCounter++}`,
            target: m[0],
            reason: rule.reason,
            suggestion: rule.suggestion,
            category: 'duplicate_header'
          });
        }
      });
    }
  }

  // 2. Căn cứ pháp lý thiếu tính logic (chỉ đạo miệng, tin đồn, ý kiến cá nhân)
  const invalidBasisRules = [
    {
      regex: /Căn cứ\s+(?:vào\s+)?(?:sự\s+)?chỉ đạo miệng(?:\s+của\s+[^;,\.\n]+)?/gi,
      reason: 'Thiếu tính logic: Văn bản hành chính chỉ căn cứ vào văn bản quy phạm pháp luật hoặc văn bản chỉ đạo chính thức có số hiệu; không thể căn cứ vào "chỉ đạo miệng".',
      suggestion: 'Xóa căn cứ chỉ đạo miệng này hoặc thay bằng Thông báo kết luận / Công văn có số hiệu'
    },
    {
      regex: /Căn cứ\s+(?:theo|vào)\s+tin đồn(?:\s+[^;,\.\n]+)?/gi,
      reason: 'Thiếu tính logic: Không thể căn cứ vào tin đồn không có cơ sở pháp lý.',
      suggestion: 'Xóa bỏ căn cứ này'
    },
    {
      regex: /Căn cứ\s+(?:theo|vào)\s+(?:ý kiến cá nhân|suy nghĩ|cảm tính|suy đoán)(?:\s+của\s+[^;,\.\n]+)?/gi,
      reason: 'Thiếu tính logic: Văn bản hành chính nhà nước/Đảng không căn cứ vào cảm tính hay ý kiến cá nhân.',
      suggestion: 'Xóa bỏ căn cứ mang tính cảm tính cá nhân này'
    },
    {
      regex: /Căn cứ\s+vào\s+căn cứ/gi,
      reason: 'Lỗi lặp từ phi logic: "Căn cứ vào căn cứ".',
      suggestion: 'Sửa thành "Căn cứ"'
    },
    {
      regex: /Căn cứ\s+(?:Luật|Nghị định|Quyết định|Thông tư)\s*(?:số)?\s*(?:\[\s*\.{2,}\s*\]|…+|\.{3,}|_{3,}|\[chưa có.*?\])/gi,
      reason: 'Căn cứ pháp lý bị bỏ ngỏ chưa điền số hiệu văn bản.',
      suggestion: 'Bổ sung số hiệu chính xác của văn bản hoặc xóa căn cứ này'
    }
  ];

  for (const rule of invalidBasisRules) {
    const matches = Array.from(text.matchAll(rule.regex));
    for (const m of matches) {
      findings.push({
        id: `illogical_basis_${idCounter++}`,
        target: m[0],
        reason: rule.reason,
        suggestion: rule.suggestion,
        category: 'invalid_basis'
      });
    }
  }

  // 3. Quan hệ mệnh lệnh / Thẩm quyền hành chính trái logic (Cấp dưới ra lệnh / yêu cầu cấp trên)
  const authorityMismatchRules = [
    {
      regex: /(?:Ủy ban nhân dân phường|UBND phường|Ủy ban nhân dân xã|UBND xã|Ban cán sự|Chi bộ|Phòng|Tổ dân phố)\s+(?:yêu cầu|chỉ đạo|bắt buộc|ra lệnh cho)\s+(?:Ủy ban nhân dân thành phố|UBND thành phố|Ủy ban nhân dân thị xã|UBND thị xã|Ủy ban nhân dân tỉnh|UBND tỉnh|Sở|Bộ|Thị ủy|Huyện ủy|Tỉnh ủy|cấp trên)/gi,
      reason: 'Thiếu tính logic về thẩm quyền hành chính: Cơ quan cấp dưới không có quyền "chỉ đạo", "yêu cầu" hay "ra lệnh" cho cơ quan cấp trên.',
      suggestion: 'Sửa thành: "Kính đề nghị cơ quan cấp trên xem xét, chỉ đạo..."'
    },
    {
      regex: /\byêu cầu cấp trên\b/gi,
      reason: 'Sai thẩm quyền công vụ: Cấp dưới không được "yêu cầu cấp trên".',
      suggestion: 'Sửa thành: "Kính đề nghị cấp trên"'
    },
    {
      regex: /\bchỉ đạo cấp trên\b/gi,
      reason: 'Sai thẩm quyền công vụ: Cấp dưới không thể "chỉ đạo cấp trên".',
      suggestion: 'Sửa thành: "Báo cáo, kính trình cấp trên"'
    }
  ];

  for (const rule of authorityMismatchRules) {
    const matches = Array.from(text.matchAll(rule.regex));
    for (const m of matches) {
      findings.push({
        id: `illogical_auth_${idCounter++}`,
        target: m[0],
        reason: rule.reason,
        suggestion: rule.suggestion,
        category: 'authority_mismatch'
      });
    }
  }

  // 4. Văn phong khẩu ngữ, cảm tính cá nhân, phi hành chính
  const informalPhrasingRules = [
    {
      regex: /\bchúng tôi kính mong các bác\b/gi,
      reason: 'Văn phong thiếu tính logic công vụ: Dùng khẩu ngữ suồng sã "các bác", "chúng tôi kính mong" không phù hợp văn phong hành chính nhà nước.',
      suggestion: 'Sửa thành: "Đề nghị các đồng chí..." hoặc "Ủy ban nhân dân phường đề nghị..."'
    },
    {
      regex: /\bbác nào không làm\b/gi,
      reason: 'Khẩu ngữ dân sự cảm tính, không phù hợp văn bản quy phạm hoặc chỉ đạo công vụ.',
      suggestion: 'Sửa thành: "Trường hợp không thực hiện..."'
    },
    {
      regex: /\b(?:ai không thích thì thôi|ai thích thì làm)\b/gi,
      reason: 'Thiếu tính nghiêm túc và logic công vụ.',
      suggestion: 'Xóa bỏ câu văn tùy tiện này'
    },
    {
      regex: /\b(?:bản thân tôi cảm thấy|theo ý kiến riêng của tôi|theo thiển ý của tôi)\b/gi,
      reason: 'Văn phong hành chính mang tính cơ quan, tổ chức; không dùng nhận định cảm tính cá nhân "bản thân tôi cảm thấy".',
      suggestion: 'Xóa hoặc thay bằng: "Qua rà soát thực tế..."'
    },
    {
      regex: /\b(?:làm gấp giúp em|nhờ các bác làm nhanh|làm nhanh lên)\b/gi,
      reason: 'Khẩu ngữ xưng hô dân sự thiếu chuẩn mực công vụ.',
      suggestion: 'Sửa thành: "Yêu cầu khẩn trương triển khai thực hiện..."'
    }
  ];

  for (const rule of informalPhrasingRules) {
    const matches = Array.from(text.matchAll(rule.regex));
    for (const m of matches) {
      findings.push({
        id: `illogical_style_${idCounter++}`,
        target: m[0],
        reason: rule.reason,
        suggestion: rule.suggestion,
        category: 'informal_phrasing'
      });
    }
  }

  // 5. Mâu thuẫn logic nội dung
  const contradictionRules = [
    {
      regex: /\bvừa đồng ý vừa không đồng ý\b/gi,
      reason: 'Mâu thuẫn logic: Hai mệnh đề trái ngược nhau cùng tồn tại trong nội dung.',
      suggestion: 'Sửa lại rõ ràng quan điểm chấp thuận hoặc không chấp thuận'
    },
    {
      regex: /\bvừa cho phép vừa nghiêm cấm\b/gi,
      reason: 'Mâu thuẫn logic: Quy định vừa cho phép vừa nghiêm cấm gây hiểu lầm khi thi hành.',
      suggestion: 'Quy định rõ ràng điều kiện cho phép hoặc trường hợp bị nghiêm cấm'
    },
    {
      regex: /\bbắt buộc nhưng ai không làm cũng được\b/gi,
      reason: 'Mâu thuẫn logic tính hiệu lực của văn bản chỉ đạo.',
      suggestion: 'Quy định rõ tính chất bắt buộc thi hành'
    }
  ];

  for (const rule of contradictionRules) {
    const matches = Array.from(text.matchAll(rule.regex));
    for (const m of matches) {
      findings.push({
        id: `illogical_contra_${idCounter++}`,
        target: m[0],
        reason: rule.reason,
        suggestion: rule.suggestion,
        category: 'contradiction'
      });
    }
  }

  // 6. Ký tự giữ chỗ dang dở chưa hoàn thiện
  const placeholderRegex = /\[\s*(?:cần bổ sung|chèn nội dung|ghi rõ|chưa có số liệu|chưa có thông tin|ghi ngày|ghi họ tên|chèn tại đây)\s*\]/gi;
  const placeholderMatches = Array.from(text.matchAll(placeholderRegex));
  for (const m of placeholderMatches) {
    findings.push({
      id: `illogical_place_${idCounter++}`,
      target: m[0],
      reason: 'Đoạn văn chứa ký tự giữ chỗ chưa được hoàn thiện nội dung trước khi ban hành.',
      suggestion: 'Điền thông tin chính xác hoặc xóa thẻ giữ chỗ này',
      category: 'incomplete_placeholder'
    });
  }

  // 7. Nhảy cóc thứ tự Điều/Khoản
  const dieuMatches = Array.from(text.matchAll(/Điều\s+(\d+)[\.:]/gi));
  if (dieuMatches.length >= 2) {
    for (let i = 0; i < dieuMatches.length - 1; i++) {
      const currNum = parseInt(dieuMatches[i][1], 10);
      const nextNum = parseInt(dieuMatches[i + 1][1], 10);
      if (nextNum > currNum + 1) {
        findings.push({
          id: `illogical_jump_${idCounter++}`,
          target: dieuMatches[i + 1][0],
          reason: `Thiếu tính logic cấu trúc: Nhảy cóc thứ tự Điều từ Điều ${currNum} sang Điều ${nextNum} (thiếu Điều ${currNum + 1}).`,
          suggestion: `Đổi thành Điều ${currNum + 1}.`,
          category: 'numbering_jump'
        });
      }
    }
  }

  return findings;
}
