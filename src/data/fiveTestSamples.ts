export interface TestSample {
  id: string;
  name: string;
  category: 'hanh_chinh' | 'dang' | 'academic' | 'ai_generated';
  docType: string;
  description: string;
  text: string;
}

export const FIVE_TEST_SAMPLES: TestSample[] = [
  {
    id: 'sample_cong_van_error',
    name: '1. Công văn có lỗi thể thức & chính tả',
    category: 'hanh_chinh',
    docType: 'Công văn',
    description: 'Chứa lỗi sai căn lề, thiếu số 0 ngày tháng, sai font, viết hoa sai quy định, lỗi gõ telex',
    text: `UBND THỊ XÃ BỈM SƠN
ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN
Số: 45/ubnd-vp
V/v Tăng Cường Công Tác Phòng Cháy Chữa Cháy Mùa Hanh Khô

Đông Tiến, ngày 5 tháng 2 năm 2026

Kính gửi:
- Công an phường Đông Tiến;
- Ban chỉ huy quân sự phường;
- Các tổ dân phố trên địa bàn.

Thực hiện kế hoạch của ủy ban nhân dân thị xã về việc phòng cháy chữa cháy năm 2026.
Hiện nay thời tiết bắt đầu bước vào mùa hanh khô, nguy cơ sảy ra cháy nổ rất cao. Nhằm bảo đảm an toàn tính mạng và tài sản của nhân dân, UBND phường yêu cầu các đơn vị triển khai các nhiệm vụ sau:
* Một là: Tăng cường tuyên truyền sâu rộng trong các khu dân cư.
* Hai là: Kiểm tra các cơ sở kinh doanh có điều kiện về pccc.
* Ba là: Chuẩn bị phương tiện chữa cháy tại chỗ, đảm bảo ứng phó kịp thời khi có sự cố sảy ra.

Nơi nhận:
- Như trên;
- Chủ tịch, các PCT UBND;
- Lưu: VT.

KT. CHỦ TỊCH
PHÓ CHỦ TỊCH
Mai Xuân Thế`
  },
  {
    id: 'sample_quyet_dinh',
    name: '2. Quyết định (cá biệt)',
    category: 'hanh_chinh',
    docType: 'Quyết định (cá biệt)',
    description: 'Quyết định thành lập ban chỉ đạo với các căn cứ pháp lý và các điều khoản cụ thể',
    text: `ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN
Số: 102/QĐ-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Đông Tiến, ngày 12 tháng 03 năm 2026

QUYẾT ĐỊNH
Về việc thành lập Ban Chỉ đạo Chuyển đổi số phường Đông Tiến năm 2026

CHỦ TỊCH ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN

Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;
Căn cứ Quyết định số 749/QĐ-TTg ngày 03 tháng 6 năm 2020 của Thủ tướng Chính phủ phê duyệt Chương trình Chuyển đổi số quốc gia;
Theo đề nghị của Công chức Văn phòng - Thống kê phường.

QUYẾT ĐỊNH:

Điều 1. Thành lập Ban Chỉ đạo Chuyển đổi số phường Đông Tiến gồm các ông (bà) có tên sau:
1. Ông Lê Thế Điệp - Chủ tịch UBND phường: Trưởng ban.
2. Ông Mai Xuân Thế - Phó Chủ tịch UBND phường: Phó Trưởng ban thường trực.
3. Ông Nguyễn Văn Hùng - Trưởng Công an phường: Thành viên.

Điều 2. Ban Chỉ đạo có nhiệm vụ xây dựng kế hoạch và đôn đốc các tổ dân phố triển khai dịch vụ công trực tuyến.

Điều 3. Văn phòng HĐND - UBND, các ban ngành đoàn thể và các ông (bà) có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này.

Nơi nhận:
- Thường trực Đảng ủy phường (báo cáo);
- Thường trực HĐND phường;
- Như Điều 3;
- Lưu: VT.

TM. ỦY BAN NHÂN DÂN
CHỦ TỊCH
Lê Thế Điệp`
  },
  {
    id: 'sample_bao_cao_bang',
    name: '3. Báo cáo có bảng biểu phức tạp',
    category: 'hanh_chinh',
    docType: 'Báo cáo',
    description: 'Báo cáo kinh tế xã hội có cấu trúc bảng biểu, cột số liệu và tỷ lệ phần trăm',
    text: `ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN
Số: 88/BC-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Đông Tiến, ngày 28 tháng 06 năm 2026

BÁO CÁO
Tình hình thực hiện nhiệm vụ phát triển kinh tế - xã hội 6 tháng đầu năm 2026

Trong 6 tháng đầu năm 2026, UBND phường đã tập trung chỉ đạo toàn diện các mặt công tác, đạt được các kết quả nổi bật như sau:

I. KẾT QUẢ THỰC HIỆN CÁC CHỈ TIÊU KINH TẾ

<table class="decree30-table" border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #000; text-align: center;">STT</th>
      <th style="border: 1px solid #000; text-align: center;">Chỉ tiêu chủ yếu</th>
      <th style="border: 1px solid #000; text-align: center;">Kế hoạch năm</th>
      <th style="border: 1px solid #000; text-align: center;">Ước thực hiện 6 tháng</th>
      <th style="border: 1px solid #000; text-align: center;">Tỷ lệ đạt (%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #000; text-align: center;">1</td>
      <td style="border: 1px solid #000;">Thu ngân sách nhà nước</td>
      <td style="border: 1px solid #000; text-align: right;">12.500 triệu đồng</td>
      <td style="border: 1px solid #000; text-align: right;">7.200 triệu đồng</td>
      <td style="border: 1px solid #000; text-align: center;">57.6%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; text-align: center;">2</td>
      <td style="border: 1px solid #000;">Tỷ lệ hộ nghèo đa chiều</td>
      <td style="border: 1px solid #000; text-align: right;">Dưới 0.8%</td>
      <td style="border: 1px solid #000; text-align: right;">0.75%</td>
      <td style="border: 1px solid #000; text-align: center;">Đạt</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; text-align: center;">3</td>
      <td style="border: 1px solid #000;">Tỷ lệ gia đình văn hóa</td>
      <td style="border: 1px solid #000; text-align: right;">95%</td>
      <td style="border: 1px solid #000; text-align: right;">94.8%</td>
      <td style="border: 1px solid #000; text-align: center;">99.7%</td>
    </tr>
  </tbody>
</table>

II. PHƯƠNG HƯỚNG NHIỆM VỤ 6 THÁNG CUỐI NĂM
- Tiếp tục đẩy mạnh thu ngân sách và giải phóng mặt bằng các dự án trọng điểm.
- Giữ vững an ninh chính trị và trật tự an toàn xã hội trên địa bàn.

Nơi nhận:
- UBND thị xã Bỉm Sơn;
- Đảng ủy, HĐND phường;
- Lưu: VT, TH.

TM. ỦY BAN NHÂN DÂN
CHỦ TỊCH
Lê Thế Điệp`
  },
  {
    id: 'sample_chatgpt_ai',
    name: '4. Văn bản dán từ ChatGPT (Nhiều Markdown, Emoji, Bịa căn cứ)',
    category: 'ai_generated',
    docType: 'Công văn',
    description: 'Chứa lời chào chatbot, codeblock, emoji, markdown asterisks, trích dẫn nguồn số và căn cứ giả',
    text: `Dưới đây là bản dự thảo công văn theo yêu cầu của bạn nha! 😊 Hy vọng sẽ giúp ích cho đồng chí:

\`\`\`markdown
# CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
**Độc lập - Tự do - Hạnh phúc** [1]

**ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN**
Số: 999/UBND-AI ngày 01/01/2026

**Kính gửi:** Các tổ dân phố và bà con nhân dân thân mến! 💖

> Căn cứ vào Nghị định số 9999/2025/NĐ-CP của Chính phủ về quy định AI trong quản lý nhà nước 【1†source】;
> Căn cứ Thông tư số 88/2026/TT-BTP về chuyển đổi số toàn diện;

Tôi xin thông báo tới các bạn các nội dung quan trọng sau đây:
* 1. Toàn thể cán bộ phải học tập kỹ năng sử dụng máy tính. 💻
* 2. Ngân sách dự kiến cấp cho mỗi tổ dân phố là 500 triệu đồng để mua trang thiết bị.
* 3. Mọi thắc mắc xin vui lòng liên hệ hotline 19001000.

Nếu bạn cần sửa đổi thêm phần nào, hãy bảo tôi nhé! Chúc bạn một ngày làm việc vui vẻ! ✨
\`\`\``
  },
  {
    id: 'sample_academic_thesis',
    name: '5. Luận văn học thuật (Hình, Bảng, Công thức, Mục lục)',
    category: 'academic',
    docType: 'Luận văn thạc sĩ / Luận án tiến sĩ',
    description: 'Tài liệu học thuật có công thức toán m:oMath, bảng gộp ô, mục lục TOC, bìa và danh mục tài liệu',
    text: `ĐẠI HỌC QUỐC GIA HÀ NỘI
TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN

LUẬN VĂN THẠC SĨ KHOA HỌC

ĐỀ TÀI:
ỨNG DỤNG MÔ HÌNH HỌC SÂU TRONG CHUẨN HÓA VÀ BÓC TÁCH THỂ THỨC VĂN BẢN HÀNH CHÍNH VIỆT NAM

Chuyên ngành: Khoa học dữ liệu
Mã số: 8480109

HỌC VIÊN: NGUYỄN VĂN AN
NGƯỜI HƯỚNG DẪN KHOA HỌC: PGS. TS. TRẦN VĂN BÌNH

Hà Nội - 2026

MỤC LỤC
LỜI CAM ĐOAN
DANH MỤC CÁC KÝ HIỆU VÀ CHỮ VIẾT TẮT
DANH MỤC CÁC BẢNG VÀ HÌNH VẼ
CHƯƠNG 1. TỔNG QUAN TÀI LIỆU
1.1. Khái quát về văn bản hành chính Việt Nam và Nghị định 30/2020/NĐ-CP
1.2. Thể thức văn bản Đảng theo Hướng dẫn 05-HD/VPTW
CHƯƠNG 2. MÔ HÌNH TOÁN HỌC VÀ THUẬT TOÁN
Công thức xác suất phân loại thành phần văn bản:
P(Y|X) = softmax(W * h_t + b)
CHƯƠNG 3. THỰC NGHIỆM VÀ KẾT QUẢ ĐÁNH GIÁ
Bảng 3.1. Độ chính xác F1-Score trên tập dữ liệu kiểm thử
KẾT LUẬN VÀ KIẾN NGHỊ
TÀI LIỆU THAM KHẢO`
  }
];
