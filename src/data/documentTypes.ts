import { DocumentTypeItem } from '../types';

export const ADMINISTRATIVE_DOC_TYPES: DocumentTypeItem[] = [
  {
    id: 'cong-van',
    name: 'Công văn',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản hành chính dùng để giao dịch, trao đổi công tác giữa các cơ quan, tổ chức',
    isPopular: true,
    codePrefix: 'CV',
    decreeRef: 'Nghị định 30/2020/NĐ-CP - Điều 7, Phụ lục I',
    standardStructure: 'Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số ký hiệu, Địa danh ngày tháng, Kính gửi, Trích yếu nội dung, Nội dung, Chức vụ chữ ký, Nơi nhận',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 45/UBND-VP
V/v tăng cường công tác bảo đảm an toàn phòng cháy chữa cháy và trật tự đô thị

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 15 tháng 10 năm 2025

Kính gửi:
- Các ban ngành, đoàn thể phường;
- Ban cán sự các tổ dân phố trên địa bàn phường.

Thực hiện chỉ đạo của Ủy ban nhân dân thị xã về việc tăng cường công tác bảo đảm an toàn phòng cháy, chữa cháy (PCCC) và giữ gìn trật tự văn minh đô thị trong mùa hanh khô, Ủy ban nhân dân phường yêu cầu:

1. Ban chỉ huy Công an phường phối hợp với các tổ dân phố tiến hành rà soát, kiểm tra toàn bộ các cơ sở sản xuất, kinh doanh, nhà ở kết hợp kinh doanh có nguy cơ cháy nổ cao. Xử lý nghiêm các trường hợp vi phạm quy định về PCCC.

2. Bộ phận Văn hóa - Xã hội tăng cường công tác tuyên truyền trên hệ thống truyền thanh của phường và các trang mạng xã hội về kỹ năng thoát nạn, biện pháp phòng chống cháy nổ.

3. Đề nghị các đoàn thể chính trị - xã hội vận động đoàn viên, hội viên và nhân dân tự trang bị bình chữa cháy xách tay, không lấn chiếm lòng lề đường làm nơi kinh doanh buôn bán.

Yêu cầu các đơn vị, cá nhân nghiêm túc triển khai thực hiện./.

Nơi nhận:
- Như trên;
- Chủ tịch, các PCT UBND;
- Lưu: VT, VP.

TM. ỦY BAN NHÂN DÂN
CHỦ TỊCH
(Ký, ghi rõ họ tên và đóng dấu)

Nguyễn Văn Hùng`
  },
  {
    id: 'to-trinh',
    name: 'Tờ trình',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản trình cấp có thẩm quyền xem xét, phê duyệt hoặc quyết định một vấn đề',
    isPopular: true,
    codePrefix: 'TTr',
    decreeRef: 'Nghị định 30/2020/NĐ-CP - Điều 7, Phụ lục I',
    standardStructure: 'Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số ký hiệu, Địa danh ngày tháng, Tên loại văn bản & Trích yếu, Kính gửi, Lý do trình, Nội dung đề xuất, Kiến nghị',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 12/TTr-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 20 tháng 10 năm 2025

TỜ TRÌNH
Về việc đề nghị phê duyệt Kế hoạch chuyển đổi số và nâng cấp hạ tầng công nghệ thông tin năm 2026

Kính gửi: Ủy ban nhân dân thị xã Bỉm Sơn.

Căn cứ Quyết định số 749/QĐ-TTg ngày 03 tháng 6 năm 2020 của Thủ tướng Chính phủ phê duyệt "Chương trình Chuyển đổi số quốc gia đến năm 2025, định hướng đến năm 2030";
Căn cứ tình hình thực tế về hạ tầng công nghệ thông tin phục vụ giải quyết thủ tục hành chính tại Bộ phận Một cửa phường Đông Tiến;

Ủy ban nhân dân phường Đông Tiến kính trình Ủy ban nhân dân thị xã phê duyệt Kế hoạch chuyển đổi số với các nội dung sau:

I. SỰ CẦN THIẾT VÀ MỤC TIÊU
Nhằm nâng cao chất lượng phục vụ nhân dân, hiện đại hóa quy trình tiếp nhận và giải quyết hồ sơ công dân trực tuyến mức độ toàn trình, giảm thời gian xử lý hồ sơ hành chính.

II. NỘI DUNG ĐỀ XUẤT
1. Nâng cấp hệ thống máy vi tính tại Bộ phận Tiếp nhận và Trả kết quả: 06 bộ máy tính đồng bộ.
2. Lắp đặt hệ thống camera giám sát và đánh giá sự hài lòng của người dân.
3. Dự toán kinh phí thực hiện: 150.000.000 đồng (Một trăm năm mươi triệu đồng chẵn).

Ủy ban nhân dân phường kính trình Ủy ban nhân dân thị xã xem xét, quyết định phê duyệt để có cơ sở triển khai thực hiện./.

Nơi nhận:
- Như trên;
- Phòng Nội vụ thị xã;
- Phòng Tài chính - Kế hoạch thị xã;
- Lưu: VT, VP.

TM. ỦY BAN NHÂN DÂN
CHỦ TỊCH
(Ký, đóng dấu)

Nguyễn Văn Hùng`
  },
  {
    id: 'quyet-dinh',
    name: 'Quyết định',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản áp dụng pháp luật để giải quyết các vấn đề cụ thể, cá biệt trong quản lý',
    isPopular: true,
    codePrefix: 'QĐ',
    decreeRef: 'Nghị định 30/2020/NĐ-CP - Điều 7, Phụ lục I',
    standardStructure: 'Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số ký hiệu, Địa danh ngày tháng, Tên Quyết định, Thẩm quyền ban hành, Các căn cứ ban hành, QUYẾT ĐỊNH (Điều 1, 2, 3...)',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 88/QĐ-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 10 tháng 10 năm 2025

QUYẾT ĐỊNH
Về việc thành lập Tổ công tác triển khai Đề án 06 về phát triển ứng dụng dữ liệu dân cư trên địa bàn phường

CHỦ TỊCH ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN

Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015; Luật sửa đổi, bổ sung một số điều của Luật Tổ chức Chính phủ và Luật Tổ chức chính quyền địa phương ngày 22 tháng 11 năm 2019;
Căn cứ Quyết định số 06/QĐ-TTg ngày 06 tháng 01 năm 2022 của Thủ tướng Chính phủ phê duyệt Đề án 06;
Theo đề nghị của Trưởng Công an phường Đông Tiến và Công chức Văn phòng - Thống kê phường.

QUYẾT ĐỊNH:

Điều 1. Thành lập Tổ công tác triển khai Đề án 06 phường Đông Tiến gồm các ông (bà) có tên sau:
1. Ông Nguyễn Văn Hùng - Chủ tịch UBND phường - Tổ trưởng;
2. Ông Trần Minh Tuấn - Trưởng Công an phường - Tổ phó thường trực;
3. Bà Lê Thị Mai - Công chức Tư pháp - Hộ tịch - Thành viên.

Điều 2. Tổ công tác có nhiệm vụ chỉ đạo, phối hợp triển khai thu thập, làm sạch dữ liệu dân cư và hướng dẫn người dân kích hoạt tài khoản định danh điện tử VNeID.

Điều 3. Quyết định này có hiệu lực kể từ ngày ký. Công chức Văn phòng - Thống kê, Trưởng Công an phường và các ông (bà) có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này./.

Nơi nhận:
- Thường trực Đảng ủy phường;
- Thường trực HĐND phường;
- Các thành viên Tổ công tác;
- Lưu: VT, VP.

CHỦ TỊCH
(Ký, đóng dấu)

Nguyễn Văn Hùng`
  },
  {
    id: 'nghi-quyet',
    name: 'Nghị quyết',
    category: 'hanh_chinh',
    shortDesc: 'Nghị quyết cá biệt do HĐND hoặc tập thể lãnh đạo cơ quan ban hành',
    isPopular: true,
    codePrefix: 'NQ',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số ký hiệu, Địa danh ngày tháng, Tên Nghị quyết, Thẩm quyền, Căn cứ pháp lý, NGHỊ QUYẾT (Điều 1, 2, 3...)',
    defaultTemplate: `HỘI ĐỒNG NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 05/NQ-HĐND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 18 tháng 12 năm 2025

NGHỊ QUYẾT
Về nhiệm vụ phát triển kinh tế - xã hội, bảo đảm quốc phòng - an ninh năm 2026

HỘI ĐỒNG NHÂN DÂN PHƯỜNG ĐÔNG TIẾN
KHÓA IX, KỲ HỌP THỨ 8

Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;
Sau khi xem xét Báo cáo tình hình thực hiện nhiệm vụ kinh tế - xã hội năm 2025 và thảo luận của các đại biểu Hội đồng nhân dân phường,

QUYẾT NGHỊ:

Điều 1. Thông qua mục tiêu, nhiệm vụ và các chỉ tiêu phát triển kinh tế - xã hội năm 2026 với các định hướng chủ yếu...
Điều 2. Tổ chức thực hiện: Giao UBND phường tổ chức triển khai thực hiện thắng lợi Nghị quyết này.
Điều 3. Nghị quyết này đã được HĐND phường Đông Tiến khóa IX thông qua ngày 18 tháng 12 năm 2025./.

CHỦ TỊCH
(Ký, đóng dấu)

Lê Đình Trọng`
  },
  {
    id: 'chi-thi',
    name: 'Chỉ thị',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản của cơ quan, người có thẩm quyền chỉ đạo, giao nhiệm vụ cấp dưới',
    codePrefix: 'CT',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số ký hiệu, Tên Chỉ thị, Căn cứ, Các yêu cầu chỉ đạo',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 03/CT-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 05 tháng 01 năm 2026

CHỈ THỊ
Về việc tăng cường kỷ luật, kỷ cương hành chính và nâng cao hiệu quả công vụ năm 2026

Để nâng cao trách nhiệm của cán bộ, công chức trong việc phục vụ nhân dân, Chủ tịch Ủy ban nhân dân phường yêu cầu:
1. Toàn thể cán bộ, công chức thực hiện nghiêm túc giờ giấc làm việc, không sử dụng rượu bia trong giờ hành chính.
2. Nâng cao tinh thần trách nhiệm, thái độ giao tiếp chuẩn mực, tận tụy khi giải quyết hồ sơ cho công dân...`
  },
  {
    id: 'quy-che',
    name: 'Quy chế',
    category: 'hanh_chinh',
    shortDesc: 'Quy chế làm việc, quản lý nội bộ của cơ quan, đơn vị',
    codePrefix: 'QC',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Ban hành kèm theo Quyết định, gồm Chương, Điều, Khoản',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

QUY CHẾ
Làm việc của Ủy ban nhân dân phường Đông Tiến nhiệm kỳ 2021 - 2026
(Ban hành kèm theo Quyết định số 15/QĐ-UBND ngày 20 tháng 02 năm 2024 của UBND phường Đông Tiến)

Chương I: QUY ĐỊNH CHUNG
Điều 1. Phạm vi điều chỉnh và đối tượng áp dụng...`
  },
  {
    id: 'quy-dinh',
    name: 'Quy định',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản quy định chế độ, tiêu chuẩn hoặc các chuẩn mực bắt buộc thi hành',
    codePrefix: 'QyĐ',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Ban hành kèm Quyết định hoặc độc lập, chia thành các Điều',
    defaultTemplate: `QUY ĐỊNH
Về tiếp công dân và xử lý đơn thư khiếu nại, tố cáo tại trụ sở UBND phường Đông Tiến`
  },
  {
    id: 'thong-cao',
    name: 'Thông cáo',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản công bố sự kiện quan trọng, quyết sách lớn cho công chúng',
    codePrefix: 'TC',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Quốc hiệu, Tiêu ngữ, Tên cơ quan, Tiêu đề Thông cáo, Nội dung công bố',
    defaultTemplate: `THÔNG CÁO
Về việc tổ chức Lễ kỷ niệm ngày truyền thống và đón nhận Huân chương Lao động`
  },
  {
    id: 'thong-bao',
    name: 'Thông báo',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản truyền đạt thông tin, kết luận cuộc họp, lịch làm việc hoặc chủ trương',
    isPopular: true,
    codePrefix: 'TB',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số ký hiệu, Trích yếu, Nội dung thông báo, Nơi nhận',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 56/TB-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 12 tháng 10 năm 2025

THÔNG BÁO
Về việc treo cờ Tổ quốc nhân dịp kỷ niệm ngày lễ lớn

Ủy ban nhân dân phường Đông Tiến thông báo đến các cơ quan, đơn vị, trường học và toàn thể nhân dân trên địa bàn phường:
1. Tất cả các trụ sở cơ quan, đơn vị, trường học và hộ gia đình thực hiện treo cờ Tổ quốc từ ngày...
2. Các tổ dân phố tổ chức tổng vệ sinh môi trường, tạo cảnh quan đô thị sáng, xanh, sạch, đẹp./.`
  },
  {
    id: 'huong-dan',
    name: 'Hướng dẫn',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản chỉ dẫn nghiệp vụ, phương pháp thực hiện nhiệm vụ cụ thể',
    codePrefix: 'HD',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Tên văn bản Hướng dẫn, Mục đích, Đối tượng, Nội dung chỉ dẫn, Tổ chức thực hiện',
    defaultTemplate: `HƯỚNG DẪN
Quy trình tiếp nhận và số hóa hồ sơ thủ tục hành chính tại Bộ phận Một cửa`
  },
  {
    id: 'chuong-trinh',
    name: 'Chương trình',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản xác định mục tiêu, các nội dung công việc và lộ trình triển khai lớn',
    codePrefix: 'CTr',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Tên Chương trình, Mục tiêu, Nhiệm vụ giải pháp, Thời gian thực hiện, Phân công',
    defaultTemplate: `CHƯƠNG TRÌNH
Công tác trọng tâm của Ủy ban nhân dân phường năm 2026`
  },
  {
    id: 'ke-hoach',
    name: 'Kế hoạch',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản vạch ra mục đích, yêu cầu, nội dung tiến độ và phân công thực hiện công việc',
    isPopular: true,
    codePrefix: 'KH',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'I. Mục đích yêu cầu; II. Nội dung công việc; III. Thời gian tiến độ; IV. Kinh phí; V. Tổ chức thực hiện',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 34/KH-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 08 tháng 10 năm 2025

KẾ HOẠCH
Tổ chức Hội thi tìm hiểu pháp luật và Cải cách hành chính năm 2025

I. MỤC ĐÍCH, YÊU CẦU
Tuyên truyền sâu rộng các chủ trương của Đảng, chính sách pháp luật của Nhà nước đến cán bộ và nhân dân...`
  },
  {
    id: 'phuong-an',
    name: 'Phương án',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản đề xuất cách thức giải quyết một nhiệm vụ phức tạp, tình huống cụ thể',
    codePrefix: 'PA',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Tình huống dự kiến, Lực lượng phương tiện, Biện pháp xử lý, Dự phòng',
    defaultTemplate: `PHƯƠNG ÁN
Phòng chống thiên tai, tìm kiếm cứu nạn và bảo vệ đê điều mùa mưa bão năm 2026`
  },
  {
    id: 'de-an',
    name: 'Đề án',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản nghiên cứu toàn diện, đề xuất giải pháp cho một chủ đề có quy mô lớn',
    codePrefix: 'ĐA',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Thực trạng, Sự cần thiết, Mục tiêu, Nhiệm vụ, Kinh phí, Hiệu quả kinh tế xã hội',
    defaultTemplate: `ĐỀ ÁN
Xây dựng mô hình Tuyến phố văn minh đô thị không dùng tiền mặt tại phường Đông Tiến`
  },
  {
    id: 'du-an',
    name: 'Dự án',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản xác định mục tiêu, các nguồn lực và tiến độ của một công trình, dự án đầu tư',
    codePrefix: 'DA',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Tên dự án, Chủ đầu tư, Quy mô, Tổng mức đầu tư, Tiến độ triển khai',
    defaultTemplate: `DỰ ÁN
Nâng cấp, chỉnh trang khuôn viên Nhà văn hóa tổ dân phố số 3`
  },
  {
    id: 'bao-cao',
    name: 'Báo cáo',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản phản ánh tình hình, kết quả thực hiện nhiệm vụ trong một thời kỳ',
    isPopular: true,
    codePrefix: 'BC',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'I. Kết quả đạt được; II. Tồn tại, hạn chế và nguyên nhân; III. Phương hướng, nhiệm vụ trọng tâm',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 92/BC-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 30 tháng 09 năm 2025

BÁO CÁO
Tình hình thực hiện nhiệm vụ phát triển kinh tế - xã hội tháng 9 và phương hướng công tác tháng 10 năm 2025

Kính gửi: Ủy ban nhân dân thị xã Bỉm Sơn.

I. KẾT QUẢ ĐẠT ĐƯỢC
1. Về kinh tế - thu chi ngân sách: Thu ngân sách trên địa bàn đạt 105% kế hoạch tháng.
2. Về quản lý trật tự đô thị và môi trường: Tổ chức 12 đợt ra quân chấn chỉnh trật tự lòng lề đường...`
  },
  {
    id: 'bien-ban',
    name: 'Biên bản',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản ghi nhận lại các sự việc, diễn biến cuộc họp hoặc sự kiện thực tế',
    isPopular: true,
    codePrefix: 'BB',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Thời gian, địa điểm, thành phần tham dự, chủ trì, thư ký, diễn biến nội dung, kết luận, chữ ký',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

BIÊN BẢN CUỘC HỌP
Về việc kiểm tra trật tự xây dựng và an toàn vệ sinh lao động trên địa bàn

Thời gian bắt đầu: 08 giờ 30 phút, ngày 14 tháng 10 năm 2025.
Địa điểm: Phòng họp tầng 2, trụ sở UBND phường Đông Tiến.
Thành phần tham dự:
- Ông Nguyễn Văn Hùng - Chủ tịch UBND phường - Chủ trì;
- Đại diện Phòng Quản lý đô thị thị xã;
- Công chức Địa chính - Xây dựng phường;
- Thư ký cuộc họp: Đồng chí Lê Thị Thảo - Văn phòng UBND.

NỘI DUNG CUỘC HỌP:
Sau khi nghe báo cáo và ý kiến thảo luận của các thành viên...`
  },
  {
    id: 'hop-dong',
    name: 'Hợp đồng',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản thỏa thuận giữa cơ quan hành chính với các bên về quyền và nghĩa vụ',
    codePrefix: 'HĐ',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Căn cứ pháp lý, Thông tin các bên ký kết (Bên A, Bên B), Các điều khoản thực hiện, Giải quyết tranh chấp, Hiệu lực',
    defaultTemplate: `HỢP ĐỒNG KINH TẾ
Về việc cung cấp dịch vụ bảo dưỡng và vận hành hệ thống truyền thanh thông minh`
  },
  {
    id: 'cong-dien',
    name: 'Công điện',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản khẩn cấp phát qua vô tuyến hoặc viễn thông để truyền đạt chỉ đạo hỏa tốc',
    codePrefix: 'CĐ',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'CÔNG ĐIỆN HỎA TỐC, Nơi gửi, Nơi nhận, Nội dung chỉ đạo khẩn, Thời gian hạn chót báo cáo',
    defaultTemplate: `CÔNG ĐIỆN HỎA TỐC
CHỦ TỊCH ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN ĐIỆN:
- Trưởng Công an phường, Chỉ huy trưởng Quân sự phường;
- Các thành viên Ban Chỉ huy Phòng chống thiên tai phường.

Nội dung: Do ảnh hưởng của bão số 6, yêu cầu các đơn vị trực ban 24/24 giờ...`
  },
  {
    id: 'ban-ghi-nho',
    name: 'Bản ghi nhớ',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản ghi nhận thỏa thuận ban đầu giữa hai hay nhiều cơ quan đối tác',
    codePrefix: 'BGN',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Mục đích hợp tác, Các nguyên tắc phối hợp, Trách nhiệm mỗi bên',
    defaultTemplate: `BẢN GHI NHỚ HỢP TÁC
Về việc phối hợp đảm bảo an ninh trật tự khu vực giáp ranh giữa phường Đông Tiến và xã lân cận`
  },
  {
    id: 'ban-thoa-thuan',
    name: 'Bản thỏa thuận',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản xác lập sự đồng thuận giữa các cơ quan, đơn vị về một vấn đề cụ thể',
    codePrefix: 'BTT',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Nội dung thỏa thuận, Trách nhiệm phối hợp, Thời gian áp dụng',
    defaultTemplate: `BẢN THỎA THUẬN PHỐI HỢP
Về việc quản lý vệ sinh môi trường lưu vực kênh thoát nước liên xã, phường`
  },
  {
    id: 'giay-uy-quyen',
    name: 'Giấy ủy quyền',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản chuyển giao quyền hạn, trách nhiệm xử lý công việc cho người đại diện',
    isPopular: true,
    codePrefix: 'GUQ',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Người ủy quyền, Người được ủy quyền, Nội dung ủy quyền, Thời hạn ủy quyền, Cam kết',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 09/GUQ-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 02 tháng 11 năm 2025

GIẤY ỦY QUYỀN

Tôi là: Nguyễn Văn Hùng - Chức vụ: Chủ tịch UBND phường Đông Tiến.
Ủy quyền cho: Ông Trần Văn Nam - Chức vụ: Phó Chủ tịch UBND phường Đông Tiến.
Nội dung ủy quyền: Trực tiếp điều hành công việc của UBND phường và ký duyệt các văn bản hành chính thuộc thẩm quyền trong thời gian Chủ tịch đi học tập nghị quyết từ ngày 03/11 đến hết ngày 07/11/2025.`
  },
  {
    id: 'giay-moi',
    name: 'Giấy mời',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản mời đại biểu, cá nhân đến dự hội nghị, cuộc họp hoặc buổi lễ',
    isPopular: true,
    codePrefix: 'GM',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'UBND phường trân trọng kính mời..., Tới dự, Thời gian, Địa điểm, Nội dung, Chủ trì',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 48/GM-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 11 tháng 10 năm 2025

GIẤY MỜI
Dự Hội nghị đánh giá công tác cải cách hành chính và chuyển đổi số quý III năm 2025

Ủy ban nhân dân phường Đông Tiến trân trọng kính mời:
- Đồng chí Trưởng các đoàn thể chính trị - xã hội phường;
- Các đồng chí Bí thư Chi bộ, Tổ trưởng tổ dân phố trên địa bàn.

Thời gian: 14 giờ 00 phút, thứ Sáu, ngày 17 tháng 10 năm 2025.
Địa điểm: Hội trường tầng 2, UBND phường Đông Tiến.
Chủ trì: Đồng chí Nguyễn Văn Hùng - Chủ tịch UBND phường.

Rất mong các đồng chí đến dự đúng giờ để hội nghị thành công tốt đẹp./.

TM. ỦY BAN NHÂN DÂN
CHỦ TỊCH
(Ký, đóng dấu)

Nguyễn Văn Hùng`
  },
  {
    id: 'giay-gioi-thieu',
    name: 'Giấy giới thiệu',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản chứng nhận tư cách cán bộ được cử đi liên hệ công tác tại đơn vị khác',
    isPopular: true,
    codePrefix: 'GGT',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'UBND phường trân trọng giới thiệu ông/bà, Chức vụ, Đến liên hệ về việc, Giấy có giá trị đến ngày...',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 21/GGT-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 05 tháng 10 năm 2025

GIẤY GIỚI THIỆU

Ủy ban nhân dân phường Đông Tiến trân trọng giới thiệu:
Bà: Lê Thị Mai
Chức vụ: Công chức Tư pháp - Hộ tịch phường Đông Tiến.
Được cử đến: Sở Tư pháp tỉnh Thanh Hóa.
Về việc: Tiếp nhận tài liệu tập huấn nghiệp vụ chứng thực điện tử bản sao từ bản chính.
Giấy giới thiệu này có giá trị đến hết ngày 10 tháng 10 năm 2025./.

TM. ỦY BAN NHÂN DÂN
CHỦ TỊCH
(Ký, đóng dấu)

Nguyễn Văn Hùng`
  },
  {
    id: 'giay-nghi-phep',
    name: 'Giấy nghỉ phép',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản chấp thuận cho cán bộ, công chức nghỉ phép theo chế độ',
    codePrefix: 'GNP',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Họ tên cán bộ xin nghỉ, Thời gian nghỉ phép từ ngày... đến ngày..., Nơi nghỉ, Lý do',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 07/GNP-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 22 tháng 10 năm 2025

GIẤY NGHỈ PHÉP

Căn cứ Bộ luật Lao động và chế độ nghỉ phép năm của cán bộ, công chức;
Ủy ban nhân dân phường Đông Tiến chứng nhận:
Đồng chí: Trần Văn Nam - Phó Chủ tịch UBND phường.
Được nghỉ phép năm 2025 trong thời gian 03 ngày, kể từ ngày 27/10/2025 đến hết ngày 29/10/2025.
Nơi nghỉ phép: Thành phố Đà Nẵng.`
  },
  {
    id: 'phieu-gui',
    name: 'Phiếu gửi',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản kèm theo hồ sơ, tài liệu gửi cơ quan khác theo dõi, xử lý',
    codePrefix: 'PG',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Danh mục tài liệu gửi kèm, Số lượng, Mục đích gửi',
    defaultTemplate: `PHIẾU GỬI TÀI LIỆU
Kính gửi: Phòng Nội vụ thị xã Bỉm Sơn.
Ủy ban nhân dân phường Đông Tiến gửi kèm hồ sơ đánh giá, xếp loại cán bộ, công chức quý III/2025 gồm 12 bộ tài liệu...`
  },
  {
    id: 'phieu-chuyen',
    name: 'Phiếu chuyển',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản chuyển đơn thư, hồ sơ công dân đến cơ quan có đúng thẩm quyền thụ lý',
    isPopular: true,
    codePrefix: 'PC',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'UBND chuyển đơn thư của ông/bà... Đến đơn vị có thẩm quyền giải quyết theo quy định',
    defaultTemplate: `ỦY BAN NHÂN DÂN
PHƯỜNG ĐÔNG TIẾN
Số: 14/PC-UBND

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đông Tiến, ngày 06 tháng 10 năm 2025

PHIẾU CHUYỂN ĐƠN

Kính gửi: Chi nhánh Văn phòng Đăng ký đất đai thị xã Bỉm Sơn.

Ủy ban nhân dân phường Đông Tiến nhận được đơn đề nghị cấp đổi Giấy chứng nhận quyền sử dụng đất của ông Nguyễn Văn Bình, cư trú tại tổ dân phố 2, phường Đông Tiến.
Sau khi kiểm tra, nội dung thuộc thẩm quyền giải quyết của Chi nhánh Văn phòng Đăng ký đất đai thị xã. UBND phường chuyển đơn và toàn bộ hồ sơ kèm theo để quý cơ quan xem xét, giải quyết theo quy định của pháp luật./.`
  },
  {
    id: 'phieu-bao',
    name: 'Phiếu báo',
    category: 'hanh_chinh',
    shortDesc: 'Văn bản thông báo tình trạng xử lý đơn thư hoặc tiến độ hồ sơ cho cá nhân, cơ quan',
    codePrefix: 'PB',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Kính báo ông/bà về việc cơ quan đã thụ lý đơn, đang xác minh hoặc đã chuyển cơ quan thẩm quyền',
    defaultTemplate: `PHIẾU BÁO TIN
Kính gửi: Ông Lê Đình Hoàng (Trú tại tổ dân phố 4, phường Đông Tiến).
UBND phường thông báo đã tiếp nhận đơn kiến nghị của ông ngày 01/10/2025 và đã giao Công chức Địa chính - Xây dựng tiến hành kiểm tra thực địa...`
  },
  {
    id: 'thu-cong',
    name: 'Thư công',
    category: 'hanh_chinh',
    shortDesc: 'Thư trao đổi chính thức giữa người đứng đầu cơ quan hành chính với cơ quan, cá nhân',
    codePrefix: 'TCg',
    decreeRef: 'Nghị định 30/2020/NĐ-CP',
    standardStructure: 'Lời chào trang trọng, Nội dung bày tỏ sự cảm ơn, lời chúc mừng hoặc thăm hỏi chính thức, Ký tên',
    defaultTemplate: `THƯ CÔNG
(Thư cảm ơn / Thư chúc mừng của Chủ tịch UBND phường nhân dịp ngày Thầy thuốc Việt Nam / Ngày Nhà giáo Việt Nam)`
  }
];

export const PARTY_DOC_TYPES: DocumentTypeItem[] = [
  {
    id: 'dang-nghi-quyet',
    name: 'Nghị quyết của Đảng',
    category: 'dang',
    shortDesc: 'Văn bản của Đại hội hoặc Ban Chấp hành, Ban Thường vụ, Chi bộ lãnh đạo toàn diện',
    isPopular: true,
    codePrefix: 'NQ/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW ngày 23/11/2021 của Văn phòng Trung ương Đảng',
    standardStructure: 'ĐẢNG CỘNG SẢN VIỆT NAM, Tên cấp ủy, Số ký hiệu, Tiêu đề Nghị quyết, NGHỊ QUYẾT',
    defaultTemplate: `ĐẢNG BỘ PHƯỜNG ĐÔNG TIẾN
CHI BỘ TỔ DÂN PHỐ 1
Số: 03-NQ/CB

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 12 tháng 10 năm 2025

NGHỊ QUYẾT
Về việc lãnh đạo thực hiện nhiệm vụ phát triển kinh tế, trật tự an toàn xã hội quý IV năm 2025

Chi bộ Tổ dân phố 1 họp ngày 12 tháng 10 năm 2025, sau khi thảo luận Báo cáo công tác của Chi ủy;
QUYẾT NGHỊ:
1. Tiếp tục đẩy mạnh học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh.
2. Vận động 100% đảng viên gương mẫu tham gia ngày thứ Bảy tình nguyện dọn dẹp vệ sinh môi trường.
3. Chi ủy phân công các đồng chí đảng viên phụ trách từng cụm dân cư, kịp thời nắm bắt tâm tư nguyện vọng của quần chúng nhân dân.

T/M CHI BỘ
BÍ THƯ
(Ký, ghi rõ họ tên)

Trần Đình Khang`
  },
  {
    id: 'dang-quyet-dinh',
    name: 'Quyết định của Đảng',
    category: 'dang',
    shortDesc: 'Quyết định kết nạp Đảng, chỉ định cấp ủy, công nhận đảng viên, phân công nhiệm vụ',
    isPopular: true,
    codePrefix: 'QĐ/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'ĐẢNG CỘNG SẢN VIỆT NAM, Tên cấp ủy, Căn cứ Điều lệ Đảng, QUYẾT ĐỊNH',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 45-QĐ/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 05 tháng 10 năm 2025

QUYẾT ĐỊNH
Về việc phân công cấp ủy viên phụ trách theo dõi các chi bộ trực thuộc

BAN THƯỜNG VỤ ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Căn cứ Điều lệ Đảng Cộng sản Việt Nam;
Căn cứ Quy chế làm việc của Ban Chấp hành Đảng bộ phường nhiệm kỳ 2020 - 2025,
QUYẾT ĐỊNH:
Điều 1. Phân công các đồng chí Đảng ủy viên phụ trách theo dõi, chỉ đạo các chi bộ trực thuộc.
Điều 2. Các đồng chí được phân công có trách nhiệm định kỳ hằng tháng tham dự sinh hoạt chi bộ, hướng dẫn nghiệp vụ công tác Đảng.
Điều 3. Văn phòng Đảng ủy và các đồng chí có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này./.

Nơi nhận:
- Thường trực Thị ủy (báo cáo);
- Các chi bộ trực thuộc;
- Các đ/c Đảng ủy viên;
- Lưu: VP Đảng ủy.

T/M BAN THƯỜNG VỤ
BÍ THƯ
(Ký, đóng dấu)

Lê Thế Điệp`
  },
  {
    id: 'dang-chi-thi',
    name: 'Chỉ thị của Đảng',
    category: 'dang',
    shortDesc: 'Văn bản của cấp ủy lãnh đạo, chỉ đạo quán triệt các nhiệm vụ chính trị trọng tâm',
    isPopular: true,
    codePrefix: 'CT/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Cấp ủy ban hành, Nội dung chỉ đạo các chi bộ và tổ chức chính trị - xã hội',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 08-CT/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 10 tháng 01 năm 2026

CHỈ THỊ
Về việc tăng cường sự lãnh đạo của Đảng đối với công tác cải cách hành chính và chuyển đổi số năm 2026

Thời gian qua, công tác cải cách hành chính và chuyển đổi số trên địa bàn phường đã đạt được những kết quả tích cực...
Ban Thường vụ Đảng ủy phường yêu cầu các chi bộ, Mặt trận Tổ quốc và các đoàn thể:
1. Tiếp tục quán triệt sâu sắc các chủ trương của Đảng, chính sách pháp luật của Nhà nước về chuyển đổi số.
2. Nâng cao vai trò tiền phong, gương mẫu của cán bộ, đảng viên trong sử dụng dịch vụ công trực tuyến.
3. Giao Ủy ban nhân dân phường cụ thể hóa thành kế hoạch chi tiết triển khai đồng bộ.

T/M BAN THƯỜNG VỤ
BÍ THƯ
(Ký, đóng dấu)

Lê Thế Điệp`
  },
  {
    id: 'dang-ket-luan',
    name: 'Kết luận của Đảng',
    category: 'dang',
    shortDesc: 'Văn bản ghi nhận ý kiến chỉ đạo, kết luận của Thường trực, Ban Thường vụ cấp ủy',
    isPopular: true,
    codePrefix: 'KL/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'KẾT LUẬN CỦA BAN THƯỜNG VỤ ĐẢNG ỦY PHƯỜNG, Đánh giá tình hình, Các chủ trương chỉ đạo kết luận',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 15-KL/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 28 tháng 09 năm 2025

KẾT LUẬN
CỦA BAN THƯỜNG VỤ ĐẢNG ỦY TẠI CUỘC HỌP GIAO BAN ĐÁNH GIÁ CÔNG TÁC THÁNG 9 NĂM 2025

Ngày 28 tháng 9 năm 2025, Ban Thường vụ Đảng ủy phường họp giao ban thường kỳ đánh giá tình hình thực hiện nhiệm vụ chính trị tháng 9.
Sau khi nghe báo cáo và ý kiến thảo luận của các đồng chí dự họp, Ban Thường vụ Đảng ủy kết luận như sau:
I. ĐÁNH GIÁ TÌNH HÌNH
Trong tháng 9, kinh tế - xã hội trên địa bàn duy trì ổn định, an ninh chính trị được giữ vững...
II. MỘT SỐ NHIỆM VỤ TRỌNG TÂM THÁNG 10
1. Tập trung rà soát các chỉ tiêu phát triển kinh tế - xã hội quý IV/2025.
2. Chỉ đạo các chi bộ tổ chức sinh hoạt chuyên đề quý IV nghiêm túc, đúng quy định.

T/M BAN THƯỜNG VỤ
BÍ THƯ
(Ký, đóng dấu)

Lê Thế Điệp`
  },
  {
    id: 'dang-quy-che',
    name: 'Quy chế của Đảng',
    category: 'dang',
    shortDesc: 'Quy chế làm việc của Ban Chấp hành, Ban Thường vụ, Ủy ban Kiểm tra Đảng ủy',
    codePrefix: 'QC/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Quy định chức trách, nhiệm vụ, quyền hạn, nguyên tắc và chế độ làm việc',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 01-QC/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 15 tháng 08 năm 2025

QUY CHẾ LÀM VIỆC
CỦA BAN CHẤP HÀNH ĐẢNG BỘ PHƯỜNG ĐÔNG TIẾN KHÓA X, NHIỆM KỲ 2025 - 2030

Căn cứ Điều lệ Đảng Cộng sản Việt Nam;
Căn cứ Quy chế làm việc mẫu của Ban Bí thư Trung ương Đảng,
Ban Chấp hành Đảng bộ phường Đông Tiến ban hành Quy chế làm việc gồm các chương, điều sau:
Chương I: Nhiệm vụ và quyền hạn của Ban Chấp hành Đảng bộ
Điều 1. Ban Chấp hành Đảng bộ là cơ quan lãnh đạo cao nhất của Đảng bộ giữa hai kỳ Đại hội...`
  },
  {
    id: 'dang-quy-dinh',
    name: 'Quy định của Đảng',
    category: 'dang',
    shortDesc: 'Quy định về công tác đảng viên, bảo vệ chính trị nội bộ, phân cấp quản lý cán bộ',
    codePrefix: 'QyĐ/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Phạm vi điều chỉnh, đối tượng áp dụng, nội dung quy định cụ thể và tổ chức thực hiện',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 04-QyĐ/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 20 tháng 07 năm 2025

QUY ĐỊNH
Về trách nhiệm nêu gương của cán bộ, đảng viên, trước hết là Ủy viên Ban Chấp hành Đảng bộ phường

Căn cứ Quy định số 08-QĐi/TW ngày 25/10/2018 của Ban Chấp hành Trung ương Đảng;
Ban Thường vụ Đảng ủy phường Đông Tiến quy định trách nhiệm nêu gương của cán bộ, đảng viên như sau:
Điều 1. Phạm vi điều chỉnh và đối tượng áp dụng
Quy định này áp dụng đối với tất cả đảng viên thuộc Đảng bộ phường Đông Tiến, trước hết là các đồng chí Ủy viên Ban Chấp hành...`
  },
  {
    id: 'dang-thong-bao',
    name: 'Thông báo của Đảng',
    category: 'dang',
    shortDesc: 'Thông báo ý kiến kết luận của cấp ủy, phân công nhiệm vụ, kết quả kỳ họp Đảng bộ',
    isPopular: true,
    codePrefix: 'TB/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Nội dung thông báo kết luận, chỉ đạo hoặc phân công của cấp ủy gửi các tổ chức đảng trực thuộc',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 22-TB/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 14 tháng 10 năm 2025

THÔNG BÁO
Phân công nhiệm vụ Thường trực Đảng ủy và các Ủy viên Ban Thường vụ Đảng ủy phường khóa X

Ban Thường vụ Đảng ủy phường Đông Tiến thông báo phân công nhiệm vụ cụ thể như sau:
1. Đồng chí Lê Thế Điệp - Bí thư Đảng ủy: Lãnh đạo toàn diện các mặt công tác của Đảng bộ phường; phụ trách công tác tổ chức, cán bộ...
2. Đồng chí Trần Văn Nam - Phó Bí thư thường trực Đảng ủy: Phụ trách công tác tuyên giáo, dân vận...`
  },
  {
    id: 'dang-thong-cao',
    name: 'Thông cáo của Đảng',
    category: 'dang',
    shortDesc: 'Thông cáo báo chí về kết quả Đại hội, Hội nghị bất thường của Ban Chấp hành Đảng bộ',
    codePrefix: 'TC/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Nội dung thông cáo chính thức gửi cán bộ, đảng viên và nhân dân về sự kiện quan trọng',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 02-TC/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 02 tháng 06 năm 2025

THÔNG CÁO
Về kết quả Hội nghị Ban Chấp hành Đảng bộ phường Đông Tiến lần thứ năm

Ngày 02 tháng 6 năm 2025, Ban Chấp hành Đảng bộ phường Đông Tiến đã họp Hội nghị lần thứ năm khóa X.
Hội nghị đã thảo luận và quyết nghị các nội dung quan trọng về phương án nhân sự và điều chỉnh quy hoạch cán bộ nhiệm kỳ 2025 - 2030...`
  },
  {
    id: 'dang-huong-dan',
    name: 'Hướng dẫn của Đảng',
    category: 'dang',
    shortDesc: 'Hướng dẫn nghiệp vụ công tác Đảng, quy trình sinh hoạt chi bộ, đánh giá xếp loại đảng viên',
    isPopular: true,
    codePrefix: 'HD/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Mục đích yêu cầu, Đối tượng áp dụng, Các bước quy trình hướng dẫn cụ thể, Tổ chức thực hiện',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 05-HD/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 08 tháng 11 năm 2025

HƯỚNG DẪN
Kiểm điểm, đánh giá, xếp loại chất lượng đối với tổ chức đảng, đảng viên năm 2025

Thực hiện Hướng dẫn của Thị ủy Bỉm Sơn về đánh giá, xếp loại chất lượng tổ chức đảng và đảng viên hằng năm;
Đảng ủy phường hướng dẫn các chi bộ trực thuộc triển khai thực hiện như sau:
I. MỤC ĐÍCH, YÊU CẦU
Đánh giá đúng thực chất kết quả lãnh đạo, chỉ đạo và ý thức rèn luyện của đảng viên trong năm...
II. ĐỐI TƯỢNG VÀ NỘI DUNG ĐÁNH GIÁ
1. Đối với tập thể chi ủy, chi bộ.
2. Đối với cá nhân đảng viên.`
  },
  {
    id: 'dang-chuong-trinh',
    name: 'Chương trình của Đảng',
    category: 'dang',
    shortDesc: 'Chương trình hành động thực hiện Nghị quyết Đại hội Đảng bộ, chương trình công tác toàn khóa',
    codePrefix: 'CTr/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Mục tiêu, nhiệm vụ trọng tâm, các chỉ tiêu cụ thể, giải pháp thực hiện và phân công trách nhiệm',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 03-CTr/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 16 tháng 07 năm 2025

CHƯƠNG TRÌNH HÀNH ĐỘNG
Thực hiện Nghị quyết Đại hội đại biểu Đảng bộ phường Đông Tiến lần thứ X, nhiệm kỳ 2025 - 2030

Nhằm đưa Nghị quyết Đại hội Đảng bộ phường vào cuộc sống, Ban Chấp hành Đảng bộ phường xây dựng Chương trình hành động với các mục tiêu, nhiệm vụ chủ yếu:
I. MỤC TIÊU TỔNG QUÁT
Xây dựng Đảng bộ và hệ thống chính trị trong sạch, vững mạnh; phát huy dân chủ và sức mạnh khối đại đoàn kết toàn dân...
II. CÁC NHIỆM VỤ VÀ GIẢI PHÁP CHỦ YẾU`
  },
  {
    id: 'dang-ke-hoach',
    name: 'Kế hoạch công tác Đảng',
    category: 'dang',
    shortDesc: 'Kế hoạch kiểm tra, giám sát, sinh hoạt chuyên đề của cấp ủy, chi bộ',
    isPopular: true,
    codePrefix: 'KH/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Mục đích yêu cầu, Nội dung kiểm tra giám sát, Thời gian, Phân công tổ chức',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 18-KH/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 10 tháng 02 năm 2026

KẾ HOẠCH
Kiểm tra, giám sát của Đảng ủy đối với việc lãnh đạo thực hiện quy chế dân chủ ở cơ sở năm 2026

Thực hiện Chương trình kiểm tra, giám sát toàn khóa của Ban Chấp hành Đảng bộ phường;
Đảng ủy phường Đông Tiến ban hành Kế hoạch kiểm tra, giám sát năm 2026 với các nội dung sau:
I. MỤC ĐÍCH, YÊU CẦU
Kịp thời phát hiện ưu điểm để phát huy, nhận diện tồn tại hạn chế để chấn chỉnh, uốn nắn...
II. ĐỐI TƯỢNG VÀ NỘI DUNG KIỂM TRA
1. Đối tượng: Chi ủy Chi bộ Tổ dân phố 2, Tổ dân phố 5.
2. Nội dung: Việc lãnh đạo, chỉ đạo công tác thực hiện Quy chế dân chủ ở cơ sở.`
  },
  {
    id: 'dang-de-an',
    name: 'Đề án của Đảng',
    category: 'dang',
    shortDesc: 'Đề án nâng cao chất lượng sinh hoạt chi bộ, phát triển đảng viên, kiện toàn bộ máy',
    codePrefix: 'ĐA/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Sự cần thiết, căn cứ xây dựng đề án, thực trạng tình hình, mục tiêu, giải pháp và kinh phí tổ chức',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 02-ĐA/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 15 tháng 09 năm 2025

ĐỀ ÁN
Nâng cao chất lượng sinh hoạt chi bộ và năng lực lãnh đạo của tổ chức đảng cơ sở giai đoạn 2025 - 2030

Phần thứ nhất: SỰ CẦN THIẾT VÀ CĂN CỨ XÂY DỰNG ĐỀ ÁN
1. Sự cần thiết
Chi bộ là tế bào của Đảng, là nơi trực tiếp giáo dục, rèn luyện và quản lý đảng viên...
2. Căn cứ xây dựng Đề án
Căn cứ Điều lệ Đảng và Kết luận số 18-KL/TW của Ban Bí thư về tiếp tục thực hiện Chỉ thị 10-CT/TW...`
  },
  {
    id: 'dang-bao-cao',
    name: 'Báo cáo công tác Đảng',
    category: 'dang',
    shortDesc: 'Báo cáo tổng kết công tác xây dựng Đảng, đánh giá chất lượng tổ chức Đảng và đảng viên',
    isPopular: true,
    codePrefix: 'BC/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'I. Đánh giá công tác tư tưởng chính trị; II. Công tác tổ chức cán bộ; III. Công tác kiểm tra giám sát',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 68-BC/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 20 tháng 12 năm 2025

BÁO CÁO
Tổng kết công tác xây dựng Đảng năm 2025 và phương hướng, nhiệm vụ trọng tâm năm 2026

Năm 2025, trong điều kiện có nhiều thuận lợi đan xen khó khăn thách thức, Đảng bộ phường Đông Tiến đã đoàn kết, nỗ lực phấn đấu đạt nhiều kết quả quan trọng:
Phần thứ nhất: KẾT QUẢ THỰC HIỆN NHIỆM VỤ NĂM 2025
I. Công tác xây dựng Đảng và hệ thống chính trị
1. Công tác chính trị, tư tưởng: Tổ chức học tập, quán triệt đầy đủ các chỉ thị, nghị quyết của Trung ương.
2. Công tác tổ chức, cán bộ, đảng viên: Trong năm đã kết nạp 12 quần chúng ưu tú vào Đảng.
3. Công tác kiểm tra, giám sát: Tiến hành kiểm tra 04 chi bộ theo kế hoạch.`
  },
  {
    id: 'dang-bien-ban',
    name: 'Biên bản sinh hoạt Đảng',
    category: 'dang',
    shortDesc: 'Biên bản cuộc họp chi bộ định kỳ, sinh hoạt chuyên đề, hội nghị cấp ủy',
    isPopular: true,
    codePrefix: 'BB/CB',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Thời gian, địa điểm, thành phần dự họp, chủ trì, thư ký, diễn biến cuộc họp và kết luận biểu quyết',
    defaultTemplate: `ĐẢNG BỘ PHƯỜNG ĐÔNG TIẾN
CHI BỘ TỔ DÂN PHỐ 1
Số: 10-BB/CB

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 03 tháng 10 năm 2025

BIÊN BẢN
Hội nghị sinh hoạt thường kỳ Chi bộ Tổ dân phố 1 tháng 10 năm 2025

Thời gian: Vào hồi 19 giờ 30 phút, ngày 03 tháng 10 năm 2025.
Địa điểm: Tại Nhà văn hóa Tổ dân phố 1, phường Đông Tiến.
Chủ trì: Đồng chí Trần Đình Khang - Bí thư Chi bộ.
Thư ký: Đồng chí Nguyễn Thị Mai - Chi ủy viên.
Thành phần tham dự: Tổng số đảng viên của Chi bộ: 28 đồng chí. Có mặt: 26 đồng chí. Vắng mặt: 02 đồng chí (có lý do).

NỘI DUNG SINH HOẠT:
1. Đồng chí Bí thư Chi bộ thông tin thời sự và quán triệt các văn bản chỉ đạo mới của Đảng ủy phường.
2. Đánh giá tình hình thực hiện nhiệm vụ công tác tháng 9 và thảo luận phương hướng tháng 10.
3. Ý kiến phát biểu của các đảng viên trong chi bộ.
4. Biểu quyết kết luận: 100% đảng viên nhất trí thông qua Nghị quyết chi bộ tháng 10.`
  },
  {
    id: 'dang-to-trinh',
    name: 'Tờ trình cấp ủy',
    category: 'dang',
    shortDesc: 'Tờ trình đề nghị kết nạp Đảng, công nhận đảng viên chính thức, kiện toàn cấp ủy',
    isPopular: true,
    codePrefix: 'TTr/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Kính gửi Ban Thường vụ Thị ủy, Lý do đề nghị, Tiêu chuẩn đảng viên, Kiến nghị',
    defaultTemplate: `ĐẢNG BỘ THỊ XÃ BỈM SƠN
ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN
Số: 26-TTr/ĐU

ĐẢNG CỘNG SẢN VIỆT NAM

Đông Tiến, ngày 15 tháng 10 năm 2025

TỜ TRÌNH
Về việc đề nghị kết nạp quần chúng ưu tú vào Đảng Cộng sản Việt Nam

Kính gửi: Ban Thường vụ Thị ủy Bỉm Sơn.

Căn cứ Điều lệ Đảng Cộng sản Việt Nam;
Xét đề nghị của Chi bộ Trường Tiểu học Đông Tiến về việc đề nghị kết nạp quần chúng ưu tú Lê Thị Lan vào Đảng;
Ban Thường vụ Đảng ủy phường Đông Tiến đã tiến hành thẩm tra lý lịch, nhận thấy quần chúng Lê Thị Lan có phẩm chất đạo đức tốt, chấp hành nghiêm chủ trương của Đảng, hoàn thành xuất sắc nhiệm vụ chuyên môn được giao.

Ban Thường vụ Đảng ủy phường kính trình Ban Thường vụ Thị ủy xem xét, quyết định kết nạp quần chúng Lê Thị Lan vào Đảng Cộng sản Việt Nam./.

T/M BAN THƯỜNG VỤ
BÍ THƯ
(Ký, đóng dấu)

Lê Thế Điệp`
  }
];

export const ACADEMIC_DOC_TYPES: DocumentTypeItem[] = [
  {
    id: 'luan-van-thac-si',
    name: 'Luận văn thạc sĩ',
    category: 'hoc_thuat',
    shortDesc: 'Công trình nghiên cứu khoa học cấp thạc sĩ theo quy định Bộ Giáo dục & Đào tạo',
    isPopular: true,
    codePrefix: 'LVTS',
    decreeRef: 'Thông tư 23/2021/TT-BGDĐT ban hành Quy chế tuyển sinh và đào tạo thạc sĩ',
    standardStructure: 'Trang bìa, Trang phụ bìa, Lời cam đoan, Lời cảm ơn, Mục lục, Danh mục chữ viết tắt, Bảng biểu, Mở đầu, Các chương, Kết luận, Danh mục tài liệu tham khảo, Phụ lục',
    defaultTemplate: `BỘ GIÁO DỤC VÀ ĐÀO TẠO
TRƯỜNG ĐẠI HỌC KINH TẾ QUỐC DÂN

NGUYỄN VĂN HÙNG

LUẬN VĂN THẠC SĨ
CHUYÊN NGÀNH: QUẢN LÝ CÔNG

NÂNG CAO HIỆU QUẢ CẢI CÁCH HÀNH CHÍNH TẠI ỦY BAN NHÂN DÂN CẤP XÃ, PHƯỜNG TRÊN ĐỊA BÀN TỈNH THANH HÓA

Người hướng dẫn khoa học: PGS. TS. Trần Đình Long

Hà Nội - Năm 2025`
  },
  {
    id: 'luan-an-tien-si',
    name: 'Luận án tiến sĩ',
    category: 'hoc_thuat',
    shortDesc: 'Công trình nghiên cứu khoa học chuyên sâu, đóng góp luận điểm khoa học mới',
    isPopular: true,
    codePrefix: 'LATS',
    decreeRef: 'Thông tư 18/2021/TT-BGDĐT về đào tạo trình độ tiến sĩ',
    standardStructure: 'Trang bìa chính, Phụ bìa, Lời cam đoan, Mục lục, Danh mục công trình đã công bố, Mở đầu (tính cấp thiết, mục tiêu, đối tượng, phương pháp, đóng góp mới), 4 chương nội dung, Kết luận, Tài liệu tham khảo theo APA',
    defaultTemplate: `BỘ GIÁO DỤC VÀ ĐÀO TẠO
HỌC VIỆN HÀNH CHÍNH QUỐC GIA

LUẬN ÁN TIẾN SĨ QUẢN LÝ CÔNG
QUẢN TRỊ DỊCH VỤ CÔNG TRỰC TUYẾN TRONG TIẾN TRÌNH XÂY DỰNG CHÍNH QUYỀN ĐIỆN TỬ TẠI VIỆT NAM`
  },
  {
    id: 'bai-bao-khoa-hoc',
    name: 'Bài báo khoa học / Kỷ yếu hội thảo',
    category: 'hoc_thuat',
    shortDesc: 'Bài viết công bố kết quả nghiên cứu trên tạp chí khoa học hoặc kỷ yếu hội thảo',
    isPopular: true,
    codePrefix: 'BBKH',
    decreeRef: 'Chuẩn IMRAD (Introduction - Methods - Results - And - Discussion) & APA 7th',
    standardStructure: 'Tiêu đề tiếng Việt, Tác giả & Đơn vị công tác, Tóm tắt (150-250 từ), Từ khóa (3-5 từ), Tiêu đề tiếng Anh, Abstract, Keywords, 1. Đặt vấn đề, 2. Phương pháp nghiên cứu, 3. Kết quả và thảo luận, 4. Kết luận & hàm ý, Tài liệu tham khảo',
    defaultTemplate: `TÁC ĐỘNG CỦA CHUYỂN ĐỔI SỐ ĐẾN SỰ HÀI LÒNG CỦA NGƯỜI DÂN KHI THỰC HIỆN THỦ TỤC HÀNH CHÍNH CẤP CƠ SỞ

Tác giả: Nguyễn Văn Hùng (1), Trần Minh Tuấn (2)
(1) UBND phường Đông Tiến, thị xã Bỉm Sơn
(2) Học viện Hành chính Quốc gia

TÓM TẮT:
Nghiên cứu khảo sát tác động của việc áp dụng dịch vụ công trực tuyến và hệ thống một cửa điện tử đến mức độ hài lòng của công dân...
Từ khóa: Cải cách hành chính, dịch vụ công trực tuyến, chuyển đổi số, sự hài lòng của công dân.

ABSTRACT:
Impact of digital transformation on citizen satisfaction in local administrative procedures...
Keywords: Administrative reform, online public services, digital transformation, citizen satisfaction.`
  }
];

export const ALL_DOC_TYPES = [
  ...ADMINISTRATIVE_DOC_TYPES,
  ...PARTY_DOC_TYPES,
  ...ACADEMIC_DOC_TYPES
];
