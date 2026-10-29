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

  // 1. Nhận diện các đoạn sắp xếp không phù hợp vị trí (Tiêu đề quốc ngữ, Tiêu ngữ, Tiêu đề Đảng, Địa danh ngày tháng, Tên loại văn bản lọt vào thân bài)
  // Xác định vị trí bắt đầu phần thân văn bản/căn cứ/tiêu đề (nơi các thành phần đầu văn bản không được phép lọt vào)
  const bodyStartRegex = /(?:^|\n)\s*(?:Căn\s+cứ\b|Kính\s*(?:gửi|trình):|QUYẾT\s+ĐỊNH\b|QUYẾT\s+NGHỊ\b|KẾT\s+LUẬN\b|CHỈ\s+THỊ\b|THÔNG\s+BÁO\b|BÁO\s+CÁO\b|KẾ\s+HOẠCH\b|TỜ\s+TRÌNH\b|NGHỊ\s+QUYẾT\b|Điều\s+\d+|Phần\s+[IVXLCDM\d]|Chương\s+[IVXLCDM\d])/i;
  const bodyStartMatch = text.match(bodyStartRegex);
  const bodyStartIndex = bodyStartMatch && bodyStartMatch.index !== undefined ? bodyStartMatch.index : -1;

  const misplacedHeaderRules = [
    {
      regex: /CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/gi,
      reason: 'Đoạn sắp xếp không phù hợp vị trí: Tiêu đề Quốc hiệu bị trùng lặp hoặc lọt vào phần nội dung/sau phần Căn cứ.',
      suggestion: 'Xóa bỏ tiêu đề quốc ngữ thừa này'
    },
    {
      regex: /Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[\.:]?/gi,
      reason: 'Đoạn sắp xếp không phù hợp vị trí: Tiêu ngữ "Độc lập - Tự do - Hạnh phúc" bị lọt vào phần nội dung văn bản.',
      suggestion: 'Xóa bỏ tiêu ngữ thừa này'
    },
    {
      regex: /ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi,
      reason: 'Đoạn sắp xếp không phù hợp vị trí: Tiêu đề "Đảng Cộng sản Việt Nam" bị lọt vào phần nội dung thân văn bản.',
      suggestion: 'Xóa bỏ tiêu đề Đảng thừa này'
    },
    {
      regex: /(?:^|\n)\s*([a-zA-ZÀ-ỹ\s]+,\s*ngày\s+[\d\w\s.…]+\s+tháng\s+[\d\w\s.…]+\s+năm\s+[\d\w.…]+)(?:\n|$)/gi,
      reason: 'Đoạn sắp xếp không phù hợp vị trí: Dòng địa danh, ngày tháng năm bị lặp lại hoặc đặt sai vị trí trong thân bài.',
      suggestion: 'Xóa bỏ dòng địa danh ngày tháng bị lặp này'
    },
    {
      regex: /(?:^|\n)\s*(Số\s*:\s*[\d\w\/\-–\.]+)(?:\n|$)/gi,
      reason: 'Đoạn sắp xếp không phù hợp vị trí: Dòng số văn bản bị lặp lại hoặc đặt sai vị trí trong thân bài.',
      suggestion: 'Xóa bỏ dòng số hiệu thừa này'
    },
    {
      regex: /(?:^|\n)\s*(V\/v\s+[^\n]+)(?:\n|$)/gi,
      reason: 'Đoạn sắp xếp không phù hợp vị trí: Dòng trích yếu V/v bị lặp lại trong nội dung thân văn bản.',
      suggestion: 'Xóa bỏ trích yếu lặp lại này'
    }
  ];

  for (const rule of misplacedHeaderRules) {
    const matches = Array.from(text.matchAll(rule.regex));
    if (matches.length > 0) {
      matches.forEach((m, idx) => {
        const mIdx = m.index !== undefined ? m.index : 0;
        const targetStr = (m[1] || m[0]).trim();
        // Lần xuất hiện đầu tiên (idx === 0) trước phần thân/căn cứ/tiêu đề là Tiêu ngữ / Quốc hiệu chuẩn theo NĐ 30 & HD 05
        // TUYỆT ĐỐI KHÔNG BÔI VÀNG VÀ KHÔNG COI LÀ LỖI
        const isLegitimateHeader = idx === 0 && (bodyStartIndex === -1 || mIdx < bodyStartIndex);
        if (isLegitimateHeader) {
          return;
        }

        // Chỉ coi là lỗi nếu xuất hiện lần thứ 2 trở lên (idx > 0) hoặc lọt sâu vào sau phần Căn cứ/Thân văn bản
        const isLeakedIntoBody = idx > 0 || (bodyStartIndex !== -1 && mIdx >= bodyStartIndex);
        if (isLeakedIntoBody) {
          findings.push({
            id: `illogical_dup_${idCounter++}`,
            target: targetStr,
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
      suggestion: 'Xóa bỏ thẻ giữ chỗ này hoặc điền thông tin',
      category: 'incomplete_placeholder'
    });
  }

  // 7. Ghi chú văn bản dự thảo, lưu hành nội bộ (đề xuất bôi vàng xóa bỏ trước khi ban hành)
  const draftNoteRules = [
    {
      regex: /\(\s*(?:Dự\s+thảo|Dự\s+thảo\s+lần\s+\d+|Lưu\s+hành\s+nội\s+bộ|Chưa\s+ký\s+duyệt|Tài\s+liệu\s+mật\s+nội\s+bộ)\s*\)/gi,
      reason: 'Ghi chú văn bản dự thảo / lưu hành nội bộ: Cần rà soát xóa bỏ trước khi phát hành chính thức.',
      suggestion: 'Xóa bỏ ghi chú dự thảo này'
    },
    {
      regex: /(?:^|\n)\s*(?:Dự\s+thảo|Dự\s+thảo\s+lần\s+\d+|Lưu\s+hành\s+nội\s+bộ)\s*(?:\n|$)/gi,
      reason: 'Dòng ghi chú dự thảo đứng độc lập trong văn bản.',
      suggestion: 'Xóa bỏ dòng ghi chú này'
    }
  ];
  for (const rule of draftNoteRules) {
    const matches = Array.from(text.matchAll(rule.regex));
    for (const m of matches) {
      findings.push({
        id: `illogical_draft_${idCounter++}`,
        target: m[0].trim(),
        reason: rule.reason,
        suggestion: rule.suggestion,
        category: 'draft_note' as any
      });
    }
  }

  // 8. Lời chào hỏi / câu giao tiếp ngoài luồng của trợ lý AI hoặc công cụ chat
  const aiChatterRules = [
    {
      regex: /(?:Chào bạn!|Dưới đây là (?:bản|văn bản) chuẩn hóa|Sau đây là văn bản được chuẩn hóa|Hy vọng văn bản này hữu ích cho bạn!|Chúc bạn một ngày làm việc hiệu quả!|Tôi đã (?:chuẩn hóa|rà soát) xong văn bản)[^\n]*/gi,
      reason: 'Câu giao tiếp ngoài luồng hoặc lời chào của trợ lý AI/công cụ sao chép.',
      suggestion: 'Xóa bỏ câu ngoài luồng này'
    }
  ];
  for (const rule of aiChatterRules) {
    const matches = Array.from(text.matchAll(rule.regex));
    for (const m of matches) {
      findings.push({
        id: `illogical_chatter_${idCounter++}`,
        target: m[0].trim(),
        reason: rule.reason,
        suggestion: rule.suggestion,
        category: 'ai_chatter' as any
      });
    }
  }

  // 9. Nhảy cóc thứ tự Điều/Khoản
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
