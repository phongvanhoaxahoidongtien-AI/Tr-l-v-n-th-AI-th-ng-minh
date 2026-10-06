export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    let html = '';
    let filename = 'VanBan_ChuanHoa_ND30.doc';

    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        html = parsed.html || '';
        filename = parsed.filename || filename;
      } catch {
        const params = new URLSearchParams(req.body);
        html = params.get('html') || '';
        filename = params.get('filename') || filename;
      }
    } else if (req.body) {
      html = req.body.html || '';
      filename = req.body.filename || filename;
    }

    const wordDoc = `\ufeff<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${filename}</title>
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
      size: 21.0cm 29.7cm;
      margin: 2.0cm 1.5cm 2.0cm 3.0cm;
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: 'Times New Roman', serif;
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
  </style>
</head>
<body>
  <div class="Section1">
    ${html}
  </div>
</body>
</html>`;

    const asciiName = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const utf8Name = encodeURIComponent(filename);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/msword; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(Buffer.from(wordDoc, 'utf-8'));
  } catch (e: any) {
    res.status(500).send('Error: ' + e?.message);
  }
}
