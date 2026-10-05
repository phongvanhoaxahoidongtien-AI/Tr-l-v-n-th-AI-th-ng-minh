export interface SampleDoc {
  id: string;
  title: string;
  docTypeId: string;
  docTypeName: string;
  description: string;
  content: string;
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'sample-dang-ban-nguyen',
    title: 'Quyết định Chi bộ Bản Nguyên (Chuẩn HD 05 của Đảng)',
    docTypeId: 'dang-quyet-dinh',
    docTypeName: 'Quyết định của Đảng',
    description: 'Chi bộ Bản Nguyên, Đảng bộ Phường Đông Tiến - kiểm tra nhận dạng 2 cột tiêu đề Đảng, nơi nhận & người ký Lê Thế Điệp',
    content: `ĐẢNG BỘ PHƯỜNG ĐÔNG TIẾN
CHI BỘ TỔ DÂN PHỐ BẢN NGUYÊN
*
ĐẢNG CỘNG SẢN VIỆT NAM

Số: ……-QĐ/CB
Bản Nguyên, ngày …… tháng …… năm 2026

QUYẾT ĐỊNH
Về việc phân công nhiệm vụ cho đảng viên Chi bộ năm 2026

CHI BỘ TỔ DÂN PHỐ BẢN NGUYÊN
Căn cứ Điều lệ Đảng Cộng sản Việt Nam;
Căn cứ Quy chế làm việc của Chi bộ nhiệm kỳ 2025 - 2027;
Xét yêu cầu nhiệm vụ và năng lực của cán bộ, đảng viên,

QUYẾT ĐỊNH:

Điều 1. Phân công các đồng chí đảng viên phụ trách các tổ liên gia tự quản và phụ trách công tác tuyên truyền chủ trương của Đảng.
Điều 2. Các đồng chí đảng viên trong Chi bộ có trách nhiệm xắp xếp công việc để hoàn thành tốt nhiệm vụ được giao. Cán bộ nào lơ là sẽ bị sử lý kỉ luật theo đúng qui chế.
Điều 3. Quyết định này có hiệu lực kể từ ngày ký.

Nơi nhận:
Đảng ủy phường Đông Tiến (báo cáo);
Chi ủy Chi bộ;
Các đồng chí đảng viên Chi bộ;
Lưu Chi bộ.

T/M CHI BỘ
BÍ THƯ
(Ký, ghi rõ họ tên)
Lê Thế Điệp`
  },
  {
    id: 'sample-cong-van-loi',
    title: 'Công văn PCCC (Sai địa danh Đông Sơn & lỗi chính tả)',
    docTypeId: 'cong-van',
    docTypeName: 'Công văn',
    description: 'Chứa lỗi sai địa danh (Đông Sơn thay vì Đông Tiến), lỗi chính tả "sử lý", "bổ xung", "xắp xếp", sai thể thức tiêu ngữ',
    content: `UBND HUYỆN ĐÔNG SƠN
PHÒNG NỘI VỤ
Số: 23/CV-NV
V/v tăng cường kiểm tra PCCC và sắp xếp cán bộ

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Sơn, ngày 12 tháng 10 năm 2025

Kính gửi: Các phòng ban, đơn vị trực thuộc.

Thực hiện ý kiến chỉ đạo của cấp trên về việc sử lý nghiêm các vi phạm an toàn phòng cháy và bổ xung lực lượng cứu nạn, đề nghị các cơ quan:

1. Tiến hành xắp xếp lại khu vực để hồ sơ giấy tờ, không để gần nguồn điện, nguồn nhiệt.
2. Kiểm tra lại toàn bộ trang thiết bị chữa cháy, nếu thiếu thì đề xuất bổ xung kịp thời.
3. Cán bộ nào lơ là, không chấp hành qui định sẽ bị sử lý kỷ luật theo đúng qui chế nội bộ.

Yêu cầu các đồng chí làm gấp và báo cáo về cho chúng tôi trước ngày 20/10.

Trưởng phòng
(Ký tên)
Trần Văn Nam`
  },
  {
    id: 'sample-to-trinh-bim-son',
    title: 'Tờ trình xin kinh phí (Ghi sai cơ quan Bỉm Sơn & thiếu căn cứ)',
    docTypeId: 'to-trinh',
    docTypeName: 'Tờ trình',
    description: 'Văn bản ghi cơ quan ban hành "UBND Thị xã Bỉm Sơn", sai thể thức căn cứ pháp lý theo NĐ 30',
    content: `ỦY BAN NHÂN DÂN
THỊ XÃ BỈM SƠN
Số: 08/TTr-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Bỉm Sơn, ngày 05 tháng 11 năm 2025

TỜ TRÌNH
Về việc xin hỗ trợ kinh phí chỉnh trang đường hoa đón Tết

Kính gửi: Sở Tài chính tỉnh Thanh Hóa.

Để phục vụ bà con nhân dân vui xuân đón tết nguyên đán 2026, cơ quan chúng tôi thấy rằng cần thiết phải tu sửa lại hệ thống đèn chiếu sáng và đường hoa cây cảnh.

Dự toán sơ bộ khoảng 200 triệu đồng. Kính mong cấp trên xem xét bố chí nguồn vốn cho địa phương sớm nhất có thể./.

CHỦ TỊCH
(Ký tên)
Lê Thế Điệp`
  },
  {
    id: 'sample-giay-moi-thieu-the-thuc',
    title: 'Giấy mời họp (Sai quy chuẩn ngày tháng, thiếu chữ ký)',
    docTypeId: 'giay-moi',
    docTypeName: 'Giấy mời',
    description: 'Thiếu dấu gạch nối tiêu ngữ, viết sai "tp. Thanh Hóa", câu cú thiếu kính ngữ công vụ',
    content: `UBND PHƯỜNG ĐÔNG TIẾN
Số: 15/GM

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập-Tự do-Hạnh phúc

Thanh Hóa, ngày 18 tháng 9 năm 2025

GIẤY MỜI
Họp triển khai bầu cử tổ trưởng dân phố

UBND phường kính mời các bác bí thư chi bộ, tổ trưởng tổ dân phố đến dự họp:
Thời gian: 8h sáng thứ 2 tuần sau.
Địa điểm: Hội trường uỷ ban.
Đề nghị các bác đi đúng giờ để cuộc họp tiến hành suôn sẻ.

UBND Phường Đông Tiến`
  }
];
