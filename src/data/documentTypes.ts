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
    shortDesc: 'Văn bản của Đại hội hoặc Ban Chấp hành, Ban Thường vụ cấp ủy lãnh đạo toàn diện',
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
2. Vận động 100% đảng viên gương mẫu tham gia ngày thứ Bảy tình nguyện dọn dẹp vệ sinh môi trường...

T/M CHI BỘ
BÍ THƯ
(Ký, ghi rõ họ tên)

Trần Đình Khang`
  },
  {
    id: 'dang-quyet-dinh',
    name: 'Quyết định của Đảng',
    category: 'dang',
    shortDesc: 'Quyết định kết nạp Đảng, chỉ định cấp ủy, phân công nhiệm vụ',
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
Điều 1. Phân công các đồng chí Đảng ủy viên phụ trách theo dõi, chỉ đạo các chi bộ...`
  },
  {
    id: 'dang-chi-thi',
    name: 'Chỉ thị của Đảng',
    category: 'dang',
    shortDesc: 'Văn bản của cấp ủy lãnh đạo, chỉ đạo quán triệt các nhiệm vụ chính trị trọng tâm',
    codePrefix: 'CT/ĐU',
    decreeRef: 'Hướng dẫn 05-HD/VPTW',
    standardStructure: 'Cấp ủy ban hành, Nội dung chỉ đạo các chi bộ và tổ chức chính trị - xã hội',
    defaultTemplate: `CHỈ THỊ CỦA BAN THƯỜNG VỤ ĐẢNG ỦY
Về việc tăng cường sự lãnh đạo của Đảng đối với công tác chuyển đổi số và cải cách thủ tục hành chính`
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
    defaultTemplate: `KẾT LUẬN
CỦA BAN THƯỜNG VỤ ĐẢNG ỦY TẠI CUỘC HỌP GIAO BAN ĐÁNH GIÁ CÔNG TÁC THÁNG 9 NĂM 2025`
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
    defaultTemplate: `KẾ HOẠCH
Kiểm tra, giám sát của Đảng ủy đối với việc lãnh đạo thực hiện quy chế dân chủ ở cơ sở năm 2026`
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
    defaultTemplate: `BÁO CÁO
Tổng kết công tác xây dựng Đảng năm 2025 và phương hướng, nhiệm vụ trọng tâm năm 2026`
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
    defaultTemplate: `TỜ TRÌNH
Về việc đề nghị kết nạp quần chúng ưu tú vào Đảng Cộng sản Việt Nam`
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
