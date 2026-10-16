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
  key.startsWith('@') ||
  key.startsWith('{') ||
  key.startsWith('odata') ||
  key.startsWith('OData_') ||
  key.includes('#') ||
  /^foto/i.test(key);

const isImageOrHugeValue = (value: string): boolean =>
  value.startsWith('data:') || value.length > 1500;

const formatDate = (sub: any): string => {
  const raw = sub.created_at || sub.Created;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return formatDateTime(d);
  }
  const data = safeText(sub['Data']);
  return data ? formatValue('Data', data) : '';
};

export const exportSubmissionsPdf = (submissions: any[], collaboratorName: string) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

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

  submissions.forEach((sub, idx) => {
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

    // Quebra de página se o título não couber
    if (cursorY > doc.internal.pageSize.getHeight() - 40) {
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

    cursorY = (doc as any).lastAutoTable.finalY + 10;
  });

  // Rodapé com numeração de páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    );
  }

  const safeName = collaboratorName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  doc.save(`Adesoes_${safeName}_${today}.pdf`);
};

