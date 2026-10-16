import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const SIMPLIFIED_STATUSES = ['Ausente', 'Inexistente', 'Recusa', 'Lote Vago', 'Lote', 'Desabitado', 'Desativado'];

// Colunas de sistema do SharePoint / Power Automate que não interessam no relatório
const SYSTEM_KEYS = new Set([
  'ID', 'Id', 'id', '_id', 'ItemInternalId', 'Created', 'Modified', 'Author', 'Editor',
  'Author#Claims', 'Editor#Claims', 'ContentType', 'ContentTypeId', 'GUID', 'OData__UIVersionString',
  'Attachments', 'FileSystemObjectType', 'ServerRedirectedEmbedUri', 'ServerRedirectedEmbedUrl',
  'ComplianceAssetId', 'OData__ColorTag', 'Identifier', 'IsFolder', 'Thumbnail', 'Link', 'Name',
  'FilenameWithExtension', 'Path', 'FullPath', 'HasUnpublishedChanges', 'VersionNumber',
  'created_at', 'Title',
]);

// Campos já mostrados no bloco de resumo
const SUMMARY_KEYS = new Set([
  'NOMECOMPLETO', 'CPF', 'STATUSDAVISITA', 'BAIRRO', 'CIDADE', 'TIPODELOGRADOURO',
  'LOGRADOURO', 'N_x00da_MERO', 'COMPLEMENTO', 'Latitude0', 'Longitude0', 'Data',
]);

// Fotos que entram no PDF (aceita tanto o nome da coluna quanto chaves diretas do fluxo)
const PDF_PHOTOS: { keys: string[]; label: string }[] = [
  { keys: ['fachada', 'FACHADA'], label: 'Fachada' },
  { keys: ['frenteDoc', 'FOTODAFRENTEDODOCUMENTO0'], label: 'Documento - Frente' },
  { keys: ['versoDoc', 'FOTODOVERSODODOCUMENTO'], label: 'Documento - Verso' },
  { keys: ['adesao1', 'FOLHADEADES_x00c3_O'], label: 'Folha de Adesão' },
  { keys: ['adesao2', 'OUTRAS1'], label: 'Folha de Adesão 2' },
];

// Todas as colunas de imagem (nunca entram na tabela de texto)
const IMAGE_KEYS = new Set([
  'FOTOCADUNICO', 'FOTODAFRENTEDODOCUMENTO0', 'FOTODOVERSODODOCUMENTO',
  'FACHADA', 'FOLHADEADES_x00c3_O', 'OUTRAS', 'OUTRAS0', 'OUTRAS1',
  'fachada', 'frenteDoc', 'versoDoc', 'adesao1', 'adesao2',
]);

const getItemId = (sub: any): string => {
  const id = sub?.ID ?? sub?.Id ?? sub?.id ?? sub?.ItemInternalId;
  return id === undefined || id === null ? '' : String(id);
};

// Busca o item completo (todas as colunas + fotos) no fluxo "GCRP - Detalhes da Adesão"
const fetchSubmissionDetails = async (url: string, sub: any): Promise<any | null> => {
  const id = getItemId(sub);
  if (!id) return null;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  // Se vier { item: {...}, fachada: ..., ... }, mescla item com as fotos do topo
  if (data?.item && typeof data.item === 'object') {
    const { item, ...rest } = data;
    return { ...item, ...rest };
  }
  return data?.body ?? data;
};

type PreparedImage = { dataUrl: string; width: number; height: number };

// Extrai string Base64 ou Data URI de qualquer formato retornado pelo Power Automate
const extractImageString = (raw: any): string => {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object') {
    // Formato padrão do "Get file content" do Power Automate: { "$content-type": "image/jpeg", "$content": "/9j/4AAQ..." }
    if (typeof raw['$content'] === 'string') {
      const mime = raw['$content-type'] || 'image/jpeg';
      return `data:${mime};base64,${raw['$content']}`;
    }
    if (typeof raw.body?.['$content'] === 'string') {
      const mime = raw.body['$content-type'] || 'image/jpeg';
      return `data:${mime};base64,${raw.body['$content']}`;
    }
  }
  return '';
};

// Converte a foto em JPEG reduzido (deixa o PDF leve) e devolve as dimensões
const prepareImage = (rawInput: any): Promise<PreparedImage | null> => {
  const value = extractImageString(rawInput);
  // Ignora vazios e a imagem 1x1 transparente (68 bytes) que o app envia quando não há foto
  if (value.length < 300) return Promise.resolve(null);
  const src = value.startsWith('data:') ? value : `data:image/jpeg;base64,${value}`;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < 10 || img.naturalHeight < 10) return resolve(null);
      const maxSide = 1400;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.75), width: canvas.width, height: canvas.height });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

const safeText = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.map(safeText).filter(Boolean).join(', ');
  if (typeof val === 'object') {
    return val.Value ?? val.value ?? val.DisplayName ?? val.Email ?? '';
  }
  return String(val).trim();
};

// Decodifica nomes internos do SharePoint (ex.: N_x00da_MERO -> NÚMERO)
const decodeKey = (key: string): string =>
  key
    .replace(/_x([0-9a-fA-F]{4})_/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/_/g, ' ')
    .trim();

// Normaliza para comparação: sem acento, sem espaço/pontuação, maiúsculo
const normalizeKey = (key: string): string =>
  decodeKey(key)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

// Nomes amigáveis, na ordem em que aparecem no formulário de adesão
const FIELD_LABELS: [string, string][] = [
  ['AGENTE', 'Agente'],
  ['AGENDAMENTODAOBRA', 'Agendamento da Obra'],
  ['AGENDAMENTOOBRA', 'Agendamento da Obra'],
  ['ENTRENUMEROS', 'Entre Números'],
  ['TIPODECOMPLEMENTO', 'Tipo de Complemento'],
  ['ZEIS', 'ZEIS'],
  ['RG', 'RG'],
  ['DATADENASCIMENTO', 'Data de Nascimento'],
  ['TELEFONE', 'Telefone'],
  ['EMAIL', 'E-mail'],
  ['TEMCADUNICO', 'Possui CadÚnico?'],
  ['CADUNICO', 'Possui CadÚnico?'],
  ['MATRICULA', 'Matrícula'],
  ['IDENTIFICADOR', 'Identificador'],
  ['NUMERODOHIDROMETRO', 'Número do Hidrômetro'],
  ['NUMEROHIDROMETRO', 'Número do Hidrômetro'],
  ['NUMERODEECONOMIAS', 'Número de Economias'],
  ['NUMEROECONOMIAS', 'Número de Economias'],
  ['TIPODEADESAO', 'Tipo de Adesão'],
  ['TIPODELIGACAO', 'Tipo de Ligação'],
  ['PAVIMENTOINTERNO', 'Pavimento Interno'],
  ['PAVIMENTOEXTERNO', 'Pavimento Externo'],
  ['SITUACAODOESGOTAMENTO', 'Situação do Esgotamento'],
  ['SITUACAOESGOTAMENTO', 'Situação do Esgotamento'],
  ['OBSERVACOES', 'Observações'],
  ['ENVIADOCONSORCIO', 'Enviado ao Consórcio?'],
  ['ENVIADOAOCONSORCIO', 'Enviado ao Consórcio?'],
];
const LABEL_MAP = new Map(FIELD_LABELS);
const ORDER_MAP = new Map(FIELD_LABELS.map(([k], i) => [k, i]));

// Fallback: "PAVIMENTO INTERNO" -> "Pavimento Interno"
const SMALL_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'ao', 'a', 'o']);
const toTitleCase = (text: string): string =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

const labelFor = (key: string): string => {
  const norm = normalizeKey(key);
  const normNoQuestion = norm.replace(/\?$/, '');
  return LABEL_MAP.get(norm) ?? LABEL_MAP.get(normNoQuestion) ?? toTitleCase(decodeKey(key));
};

const orderFor = (key: string): number => ORDER_MAP.get(normalizeKey(key)) ?? 999;

// Formata valores no padrão brasileiro
const formatValue = (key: string, value: string): string => {
  const lower = value.toLowerCase();
  if (lower === 'true') return 'Sim';
  if (lower === 'false') return 'Não';

  // Data pura: 2002-01-18 -> 18/01/2002
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;

  // Data com hora (ISO): 2002-01-18T00:00:00Z
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      // Datas sem hora relevante (meia-noite UTC) viram só a data
      if (/T00:00:00(\.0+)?Z?$/.test(value)) {
        const [y, m, day] = value.slice(0, 10).split('-');
        return `${day}/${m}/${y}`;
      }
      return formatDateTime(d);
    }
  }

  const norm = normalizeKey(key);
  const digits = value.replace(/\D/g, '');
  if (norm === 'CPF' && digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (norm === 'TELEFONE') {
    if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return value;
};

const formatDateTime = (d: Date): string =>
  `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

const isSkippedKey = (key: string): boolean =>
  SYSTEM_KEYS.has(key) ||
  SUMMARY_KEYS.has(key) ||
  IMAGE_KEYS.has(key) ||
  key.startsWith('@') ||
  key.startsWith('{') ||
  key.startsWith('odata') ||
  key.startsWith('OData_') ||
  key.includes('#') ||
  /^foto/i.test(key);

// Base64 sem espaços = imagem/arquivo; textos longos (ex.: Observações) continuam aparecendo
const isImageOrHugeValue = (value: string): boolean =>
  value.startsWith('data:') || (value.length > 3000 && !/\s/.test(value));

const formatDate = (sub: any): string => {
  const raw = sub.created_at || sub.Created;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return formatDateTime(d);
  }
  const data = safeText(sub['Data']);
  return data ? formatValue('Data', data) : '';
};

export interface ExportOptions {
  /** URL do fluxo "GCRP - Detalhes da Adesão". Sem ela, o PDF sai sem fotos. */
  detailsUrl?: string;
  onProgress?: (done: number, total: number) => void;
}

export interface ExportResult {
  photosAdded: number;
  detailsFailed: number;
}

export const exportSubmissionsPdf = async (
  submissions: any[],
  collaboratorName: string,
  options: ExportOptions = {},
): Promise<ExportResult> => {
  const { detailsUrl, onProgress } = options;
  const withPhotos = Boolean(detailsUrl);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const result: ExportResult = { photosAdded: 0, detailsFailed: 0 };

  // Cabeçalho
  doc.setFillColor(0, 40, 54);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GCRP - Relatório de Adesões', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Colaborador: ${collaboratorName}`, margin, 19);
  doc.text(
    `Gerado em: ${formatDateTime(new Date())}  |  ${submissions.length} registro(s)`,
    margin,
    24,
  );

  let cursorY = 36;

  for (let idx = 0; idx < submissions.length; idx++) {
    onProgress?.(idx, submissions.length);

    // Busca todas as colunas + fotos do item
    let sub = submissions[idx];
    if (detailsUrl) {
      try {
        const details = await fetchSubmissionDetails(detailsUrl, sub);
        if (details && typeof details === 'object') sub = { ...sub, ...details };
        else result.detailsFailed++;
      } catch (err) {
        console.error('Falha ao buscar detalhes do item', getItemId(sub), err);
        result.detailsFailed++;
      }
    }

    const status = safeText(sub['STATUSDAVISITA']);
    const isSimplified = SIMPLIFIED_STATUSES.includes(status);
    const nome = safeText(sub['NOMECOMPLETO']);
    const title = nome || (isSimplified ? status : 'Sem Nome');

    const endereco = [
      safeText(sub['TIPODELOGRADOURO']),
      safeText(sub['LOGRADOURO']),
      safeText(sub['N_x00da_MERO']) ? `, ${safeText(sub['N_x00da_MERO'])}` : '',
      safeText(sub['COMPLEMENTO']) ? ` - ${safeText(sub['COMPLEMENTO'])}` : '',
    ].join(' ').replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();

    const lat = safeText(sub['Latitude0']);
    const lng = safeText(sub['Longitude0']);

    const rows: [string, string][] = [];
    if (status) rows.push(['Status da Visita', status]);
    if (!isSimplified) rows.push(['CPF', formatValue('CPF', safeText(sub['CPF'])) || '-']);
    rows.push(['Bairro', safeText(sub['BAIRRO']) || '-']);
    rows.push(['Cidade', safeText(sub['CIDADE']) || '-']);
    rows.push(['Endereço', endereco || '-']);
    if (lat && lng) rows.push(['Localização', `${lat}, ${lng}`]);

    // Demais campos preenchidos (na ordem do formulário)
    Object.keys(sub)
      .filter((key) => !isSkippedKey(key))
      .sort((a, b) => orderFor(a) - orderFor(b) || labelFor(a).localeCompare(labelFor(b), 'pt-BR'))
      .forEach((key) => {
        const value = safeText(sub[key]);
        if (!value || isImageOrHugeValue(value)) return;
        rows.push([labelFor(key), formatValue(key, value)]);
      });

    // Com fotos, cada cliente começa em uma página nova
    if ((withPhotos && idx > 0) || cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setTextColor(0, 120, 170);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`#${idx + 1} - ${title}`, margin, cursorY);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const dateStr = formatDate(sub);
    if (dateStr) doc.text(dateStr, pageWidth - margin, cursorY, { align: 'right' });

    autoTable(doc, {
      startY: cursorY + 3,
      body: rows,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [240, 246, 250], textColor: [40, 40, 40] },
        1: { textColor: [30, 30, 30] },
      },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 8;

    // Fotos (grade de 2 colunas)
    if (withPhotos) {
      const photos: { label: string; img: PreparedImage }[] = [];
      for (const photo of PDF_PHOTOS) {
        const raw = photo.keys.map((k) => sub[k]).find((v) => v !== undefined && v !== null && v !== '');
        if (!raw) continue;
        const img = await prepareImage(raw);
        if (img) photos.push({ label: photo.label, img });
      }

      if (photos.length > 0) {
        const gap = 6;
        const cellW = (pageWidth - margin * 2 - gap) / 2;
        const maxImgH = 95;
        const labelH = 6;

        if (cursorY > pageHeight - 40) {
          doc.addPage();
          cursorY = 20;
        }
        doc.setTextColor(0, 120, 170);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Fotos', margin, cursorY);
        cursorY += 4;

        for (let p = 0; p < photos.length; p += 2) {
          const pair = photos.slice(p, p + 2).map(({ label, img }) => {
            const ratio = img.width / img.height;
            let w = cellW;
            let h = w / ratio;
            if (h > maxImgH) {
              h = maxImgH;
              w = h * ratio;
            }
            return { label, img, w, h };
          });
          const rowH = labelH + Math.max(...pair.map((x) => x.h)) + 6;

          if (cursorY + rowH > pageHeight - 14) {
            doc.addPage();
            cursorY = 20;
          }

          pair.forEach((item, col) => {
            const cellX = margin + col * (cellW + gap);
            doc.setTextColor(60, 60, 60);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(item.label, cellX, cursorY + 4);
            const imgX = cellX + (cellW - item.w) / 2;
            const imgY = cursorY + labelH;
            doc.addImage(item.img.dataUrl, 'JPEG', imgX, imgY, item.w, item.h, undefined, 'FAST');
            doc.setDrawColor(210, 210, 210);
            doc.rect(imgX, imgY, item.w, item.h);
            result.photosAdded++;
          });

          cursorY += rowH;
        }
      }
    }

    cursorY += 4;
  }

  onProgress?.(submissions.length, submissions.length);

  // Rodapé com numeração de páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const safeName = collaboratorName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  doc.save(`Adesoes_${safeName}_${today}.pdf`);
  return result;
};


