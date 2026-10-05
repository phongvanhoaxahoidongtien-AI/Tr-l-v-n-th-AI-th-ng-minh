/**
 * Tiện ích tải file Word (.doc) và sao chép định dạng an toàn 100%
 * Giải quyết triệt để lỗi "cần có quyền để tải xuống" do sandbox iframe hoặc thu hồi ObjectURL sớm.
 */

export interface DownloadWordOptions {
  htmlContent: string;
  fileName: string;
  plainText?: string;
}

/**
 * Tạo tài liệu Word chuẩn HTML với định dạng A4 và Times New Roman
 */
export function wrapWordHtmlDocument(innerHtml: string, title: string = 'VanBan_ChuanHoa_ND30'): string {
  return `\ufeff<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 21.0cm 29.7cm; /* Khổ A4 */
      margin: 2.0cm 2.0cm 2.0cm 3.0cm; /* Lề chuẩn NĐ 30: Trên 2cm, Phải 2cm, Dưới 2cm, Trái 3cm */
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
      mso-paper-source: 0;
    }
    div.Section1 { 
      page: Section1; 
      font-family: 'Times New Roman', Times, serif;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14pt;
      line-height: 1.5;
      color: #000000;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      padding: 0;
      border: none;
      mso-border-alt: none;
      vertical-align: top;
    }
    p {
      margin: 0;
      padding: 0;
      margin-bottom: 6pt;
    }
    .text-center {
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${innerHtml}
  </div>
</body>
</html>`;
}

/**
 * Tải file Word với nhiều cơ chế dự phòng để vượt qua sandbox iframe của trình duyệt
 */
export async function downloadWordDocument({ htmlContent, fileName, plainText }: DownloadWordOptions): Promise<{ success: boolean; method: string; message?: string }> {
  const safeFileName = fileName.endsWith('.doc') ? fileName : `${fileName}.doc`;
  const fullHtml = wrapWordHtmlDocument(htmlContent, fileName);

  // Cách 1: Sử dụng HTML Form POST đến /api/download-doc
  // Đây là cách tối ưu nhất trong môi trường iframe sandbox của Chrome/Edge,
  // vì trình duyệt xử lý native HTTP header Content-Disposition mà không bị chặn bởi Blob Sandbox.
  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/download-doc';
    form.target = '_blank';
    form.style.display = 'none';

    const inputHtml = document.createElement('input');
    inputHtml.type = 'hidden';
    inputHtml.name = 'html';
    inputHtml.value = htmlContent;
    form.appendChild(inputHtml);

    const inputFilename = document.createElement('input');
    inputFilename.type = 'hidden';
    inputFilename.name = 'filename';
    inputFilename.value = safeFileName;
    form.appendChild(inputFilename);

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      if (document.body.contains(form)) {
        document.body.removeChild(form);
      }
    }, 2000);

    return { success: true, method: 'server_form' };
  } catch (err) {
    console.warn('Không tải được qua Server Form, chuyển sang Blob trực tiếp:', err);
  }

  // Cách 2: Client-side Blob download với link gắn DOM & trì hoãn thu hồi URL
  try {
    const blob = new Blob([fullHtml], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFileName;
    link.target = '_blank';
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Quan trọng: Chỉ thu hồi URL sau 2 phút để trình duyệt có đủ thời gian hoàn tất tải file
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 120000);

    return { success: true, method: 'blob' };
  } catch (blobErr) {
    console.warn('Lỗi khi tải bằng Blob URL, thử Data URI:', blobErr);
  }

  // Cách 3: Data URI fallback nếu Blob bị trình duyệt từ chối
  try {
    const encodedUri = 'data:application/msword;charset=utf-8,' + encodeURIComponent(fullHtml);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = safeFileName;
    link.target = '_blank';
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 3000);

    return { success: true, method: 'data_uri' };
  } catch (uriErr: any) {
    return {
      success: false,
      method: 'failed',
      message: uriErr?.message || 'Trình duyệt đang chặn tải file. Vui lòng thử nút "Sao chép sang Word" bên cạnh!'
    };
  }
}

/**
 * Sao chép văn bản định dạng phong phú (Rich HTML) vào Clipboard
 * Giúp người dùng dán (Ctrl + V) thẳng vào Microsoft Word giữ nguyên 100% bố cục bảng 2 cột & căn lề
 */
export async function copyFormattedDocument(htmlContent: string, plainText: string): Promise<boolean> {
  const fullHtml = wrapWordHtmlDocument(htmlContent);

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        })
      ]);
      return true;
    }
  } catch (e) {
    console.warn('Không thể sao chép HTML, chuyển sang plain text:', e);
  }

  // Fallback sang plain text thông thường
  try {
    await navigator.clipboard.writeText(plainText);
    return true;
  } catch (e) {
    return false;
  }
}
