/**
 * Demo data for a fictional Nadakacheri. Every person, document and number here is made up.
 * Sample PDFs are generated on the fly and clearly marked "SAMPLE – DEMO DATA".
 * Some files contain deliberate problems (income mismatch, BPL conflict, missing land record)
 * so the AI document check has something real to find.
 */
import { PrismaClient, type DocType, type Prisma, type Role, type Stage } from '@prisma/client';
import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';
import { putFile } from '../src/modules/documents/storage';

const prisma = new PrismaClient();
const DAY = 86_400_000;
const SLA_DAYS = Number(process.env.SLA_DAYS ?? 21);
const PASSWORD = 'Demo@123';
const OFFICE = 'Kundana Nadakacheri, Devanahalli Taluk';

const USERS: Array<{ username: string; name: string; nameLocal: string; role: Role }> = [
  { username: 'operator', name: 'Lakshmi N', nameLocal: 'ಲಕ್ಷ್ಮಿ ಎನ್', role: 'OPERATOR' },
  { username: 'va', name: 'Manjunath K', nameLocal: 'ಮಂಜುನಾಥ್ ಕೆ', role: 'VA' },
  { username: 'ri', name: 'Shivakumar R', nameLocal: 'ಶಿವಕುಮಾರ್ ಆರ್', role: 'RI' },
  { username: 'dt', name: 'Savitha H', nameLocal: 'ಸವಿತಾ ಎಚ್', role: 'DT' },
];

interface Seed {
  name: string;
  local: string;
  relation: string;
  gender: 'M' | 'F';
  village: string;
  occupation: string;
  purpose: string;
  income: { agriculture: number; salary: number; business: number; other: number };
  land?: number;
  family: number;
  card: 'BPL' | 'APL' | 'AAY';
  daysAgo: number;
  stage: Stage;
  /** what the documents actually show, when different from the form */
  docIncome?: number;
  docName?: string;
  skipDocs?: DocType[];
  employer?: string;
  vaNote?: string;
  riNote?: string;
  riIncome?: number;
  decision?: string;
  returnReason?: string;
  flags?: string[];
}

const SEEDS: Seed[] = [
  // ---- With VA (document check) ----
  { name: 'Suresh Kumar H', local: 'ಸುರೇಶ್ ಕುಮಾರ್ ಎಚ್', relation: 'Hanumanthappa', gender: 'M', village: 'Budigere', occupation: 'Clerk, private company', purpose: 'Post-matric scholarship (child)', income: { agriculture: 0, salary: 96000, business: 0, other: 0 }, family: 4, card: 'APL', daysAgo: 23, stage: 'VA_VERIFICATION', docIncome: 300000, employer: 'Sri Lakshmi Textiles Pvt Ltd, Bengaluru' },
  { name: 'Venkatesh B', local: 'ವೆಂಕಟೇಶ್ ಬಿ', relation: 'Byrappa', gender: 'M', village: 'Kundana', occupation: 'Farmer', purpose: 'Crop loan (bank)', income: { agriculture: 140000, salary: 0, business: 0, other: 20000 }, land: 4, family: 5, card: 'BPL', daysAgo: 18, stage: 'VA_VERIFICATION' },
  { name: 'Anjinappa', local: 'ಅಂಜಿನಪ್ಪ', relation: 'Muniyappa', gender: 'M', village: 'Bidalur', occupation: 'Farmer', purpose: 'Housing scheme', income: { agriculture: 45000, salary: 0, business: 0, other: 15000 }, land: 1.5, family: 3, card: 'BPL', daysAgo: 6, stage: 'VA_VERIFICATION', skipDocs: ['RTC'] },
  { name: 'Kavya M', local: 'ಕಾವ್ಯ ಎಂ', relation: 'Mahadevaiah', gender: 'F', village: 'Avathi', occupation: 'Student (father: tailor)', purpose: 'Fee reimbursement', income: { agriculture: 0, salary: 0, business: 72000, other: 0 }, family: 4, card: 'BPL', daysAgo: 4, stage: 'VA_VERIFICATION' },
  { name: 'Fathima Begum', local: 'ಫಾತಿಮಾ ಬೇಗಂ', relation: 'Abdul Rasheed', gender: 'F', village: 'Vijayapura', occupation: 'Tailoring', purpose: 'Self-employment loan', income: { agriculture: 0, salary: 0, business: 54000, other: 0 }, family: 5, card: 'BPL', daysAgo: 2, stage: 'VA_VERIFICATION', docName: 'Fathima Bi' },
  { name: 'Geetha R', local: 'ಗೀತಾ ಆರ್', relation: 'Ramaiah', gender: 'F', village: 'Koira', occupation: 'Agricultural labourer', purpose: 'Post-matric scholarship', income: { agriculture: 0, salary: 0, business: 0, other: 48000 }, family: 4, card: 'AAY', daysAgo: 1, stage: 'VA_VERIFICATION' },

  // ---- With RI (field verification) ----
  { name: 'Ramesh Gowda', local: 'ರಮೇಶ್ ಗೌಡ', relation: 'Chikkegowda', gender: 'M', village: 'Kundana', occupation: 'Farmer', purpose: 'Post-matric scholarship (child)', income: { agriculture: 60000, salary: 0, business: 0, other: 12000 }, land: 2, family: 4, card: 'BPL', daysAgo: 19, stage: 'RI_VERIFICATION', vaNote: 'ಪಡಿತರ ಚೀಟಿ, ಆಧಾರ್, ಸ್ವಯಂ ಘೋಷಣೆ ಮತ್ತು ಪಹಣಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಹೆಸರು ಮತ್ತು ವಿಳಾಸ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ. 2 ಎಕರೆ ಒಣಭೂಮಿ. ಸ್ಥಳ ಪರಿಶೀಲನೆಗೆ ಶಿಫಾರಸು.' },
  { name: 'Nagaraju', local: 'ನಾಗರಾಜು', relation: 'Kempaiah', gender: 'M', village: 'Channarayapatna', occupation: 'Tea shop owner', purpose: 'Bank loan', income: { agriculture: 0, salary: 0, business: 84000, other: 0 }, family: 3, card: 'BPL', daysAgo: 16, stage: 'RI_VERIFICATION', vaNote: 'Documents verified. Self-declaration shows tea shop income Rs 7,000/month. Ration card BPL. Recommend field check of shop.' },
  { name: 'Shanthamma', local: 'ಶಾಂತಮ್ಮ', relation: 'Late Siddappa', gender: 'F', village: 'Sadahalli', occupation: 'Widow, daily wages', purpose: 'Widow pension', income: { agriculture: 0, salary: 0, business: 0, other: 30000 }, family: 2, card: 'AAY', daysAgo: 12, stage: 'RI_VERIFICATION', vaNote: 'ದಾಖಲೆಗಳು ಸರಿಯಾಗಿವೆ. ಅಂತ್ಯೋದಯ ಪಡಿತರ ಚೀಟಿ ಇದೆ.' },
  { name: 'Mohan Raj', local: 'ಮೋಹನ್ ರಾಜ್', relation: 'Rajanna', gender: 'M', village: 'Budigere', occupation: 'Driver', purpose: 'Reservation – employment', income: { agriculture: 0, salary: 144000, business: 0, other: 0 }, family: 4, card: 'APL', daysAgo: 9, stage: 'RI_VERIFICATION', employer: 'Sri Ganesh Travels, Devanahalli', vaNote: 'Salary certificate shows Rs 12,000/month, matches declaration. APL ration card.' },
  { name: 'Yallappa', local: 'ಯಲ್ಲಪ್ಪ', relation: 'Hanumappa', gender: 'M', village: 'Avathi', occupation: 'Farmer', purpose: 'Housing scheme', income: { agriculture: 50000, salary: 0, business: 0, other: 10000 }, land: 1, family: 6, card: 'BPL', daysAgo: 5, stage: 'RI_VERIFICATION', vaNote: '1 ಎಕರೆ ಭೂಮಿ ಪಹಣಿಯಲ್ಲಿ ಇದೆ. ದಾಖಲೆಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತವೆ.' },

  // ---- With DT (decision) ----
  { name: 'Pavithra S', local: 'ಪವಿತ್ರ ಎಸ್', relation: 'Srinivas', gender: 'F', village: 'Kundana', occupation: 'Student (father: farmer)', purpose: 'Reservation – education', income: { agriculture: 70000, salary: 0, business: 0, other: 0 }, land: 2.5, family: 4, card: 'BPL', daysAgo: 20, stage: 'DT_DECISION', vaNote: 'All documents present and consistent. 2 acres 20 guntas as per RTC.', riNote: 'Visited Kundana on field day. Family cultivates ragi on 2.5 acres, rain-fed. Neighbours confirm no other income. Verified annual income Rs 70,000.', riIncome: 70000 },
  { name: 'Chandrashekar', local: 'ಚಂದ್ರಶೇಖರ್', relation: 'Basavaiah', gender: 'M', village: 'Bidalur', occupation: 'Mechanic', purpose: 'Bank loan', income: { agriculture: 0, salary: 0, business: 90000, other: 0 }, family: 4, card: 'BPL', daysAgo: 15, stage: 'DT_DECISION', vaNote: 'Documents consistent with declaration of Rs 90,000.', riNote: 'ಸ್ಥಳ ಪರಿಶೀಲನೆ ಮಾಡಲಾಗಿದೆ. ಅರ್ಜಿದಾರರು ಎರಡು ಮೆಕ್ಯಾನಿಕ್ ಅಂಗಡಿಗಳನ್ನು ನಡೆಸುತ್ತಿದ್ದಾರೆ, ಒಬ್ಬ ಕೆಲಸಗಾರನಿದ್ದಾನೆ. ವಾರ್ಷಿಕ ಆದಾಯ ಸುಮಾರು 2,40,000 ರೂ. ಎಂದು ಅಂದಾಜು.', riIncome: 240000 },
  { name: 'Rukmini Bai', local: 'ರುಕ್ಮಿಣಿ ಬಾಯಿ', relation: 'Ramu Naik', gender: 'F', village: 'Koira', occupation: 'Agricultural labourer', purpose: 'Post-matric scholarship (child)', income: { agriculture: 0, salary: 0, business: 0, other: 42000 }, family: 5, card: 'AAY', daysAgo: 8, stage: 'DT_DECISION', vaNote: 'AAY card, documents fine.', riNote: 'Family works as daily wage labourers. Verified income Rs 42,000. Recommend approval.', riIncome: 42000 },

  // ---- Returned to applicant ----
  { name: 'Harish N', local: 'ಹರೀಶ್ ಎನ್', relation: 'Narayanappa', gender: 'M', village: 'Vijayapura', occupation: 'Farmer', purpose: 'Crop insurance', income: { agriculture: 80000, salary: 0, business: 0, other: 0 }, land: 3, family: 4, card: 'BPL', daysAgo: 11, stage: 'RETURNED_TO_APPLICANT', skipDocs: ['RTC'], returnReason: 'Land record (RTC/Pahani) not attached. Applicant must submit current RTC for 3 acres.' },

  // ---- Decided (history for insights) ----
  { name: 'Sumitra Devi', local: 'ಸುಮಿತ್ರಾ ದೇವಿ', relation: 'Gopal', gender: 'F', village: 'Sadahalli', occupation: 'Anganwadi helper', purpose: 'Scholarship', income: { agriculture: 0, salary: 60000, business: 0, other: 0 }, family: 3, card: 'BPL', daysAgo: 34, stage: 'APPROVED', employer: 'Women & Child Development, Anganwadi Centre Sadahalli', vaNote: 'Honorarium certificate matches.', riNote: 'Verified. Income Rs 60,000.', riIncome: 60000, decision: 'Income verified by RI at Rs 60,000. Certificate issued.' },
  { name: 'Basavaraj Patil', local: 'ಬಸವರಾಜ ಪಾಟೀಲ್', relation: 'Shivappa Patil', gender: 'M', village: 'Kundana', occupation: 'Farmer', purpose: 'Bank loan', income: { agriculture: 110000, salary: 0, business: 0, other: 0 }, land: 3.5, family: 5, card: 'APL', daysAgo: 40, stage: 'APPROVED', vaNote: 'RTC shows 3 acres 20 guntas.', riNote: 'Partly irrigated. Income Rs 1,10,000 verified.', riIncome: 110000, decision: 'Reports agree. Approved at Rs 1,10,000.' },
  { name: 'Manjula', local: 'ಮಂಜುಳಾ', relation: 'Krishnappa', gender: 'F', village: 'Avathi', occupation: 'Garment worker', purpose: 'Fee reimbursement', income: { agriculture: 0, salary: 84000, business: 0, other: 0 }, family: 4, card: 'BPL', daysAgo: 30, stage: 'APPROVED', employer: 'Shahi Garments Unit 4, Doddaballapur', vaNote: 'Salary slip Rs 7,000/month.', riNote: 'Verified at workplace and home.', riIncome: 84000, decision: 'Approved as verified.' },
  { name: 'Imran Pasha', local: 'ಇಮ್ರಾನ್ ಪಾಷಾ', relation: 'Khaleel Pasha', gender: 'M', village: 'Vijayapura', occupation: 'Auto driver', purpose: 'Housing scheme', income: { agriculture: 0, salary: 0, business: 96000, other: 0 }, family: 5, card: 'BPL', daysAgo: 45, stage: 'APPROVED', vaNote: 'Docs fine.', riNote: 'Owns one auto. Income Rs 96,000.', riIncome: 96000, decision: 'Approved.' },
  { name: 'Kempamma', local: 'ಕೆಂಪಮ್ಮ', relation: 'Late Kempaiah', gender: 'F', village: 'Bidalur', occupation: 'Widow', purpose: 'Widow pension', income: { agriculture: 0, salary: 0, business: 0, other: 24000 }, family: 1, card: 'AAY', daysAgo: 26, stage: 'APPROVED', vaNote: 'AAY card.', riNote: 'Lives alone, verified.', riIncome: 24000, decision: 'Approved.' },
  { name: 'Prakash D', local: 'ಪ್ರಕಾಶ್ ಡಿ', relation: 'Devaraju', gender: 'M', village: 'Budigere', occupation: 'Contractor', purpose: 'Reservation – employment', income: { agriculture: 0, salary: 0, business: 90000, other: 0 }, family: 4, card: 'APL', daysAgo: 38, stage: 'REJECTED', vaNote: 'Self-declaration Rs 90,000.', riNote: 'Applicant runs civil contracts with 6 workers, owns a car and tractor. Estimated income above Rs 8,00,000.', riIncome: 800000, decision: 'Field verification shows income far above declared. False declaration – rejected.' },
  { name: 'Lakshmamma', local: 'ಲಕ್ಷ್ಮಮ್ಮ', relation: 'Thimmaiah', gender: 'F', village: 'Koira', occupation: 'Agricultural labourer', purpose: 'Scholarship (child)', income: { agriculture: 0, salary: 0, business: 0, other: 48000 }, family: 4, card: 'BPL', daysAgo: 28, stage: 'APPROVED', vaNote: 'Fine.', riNote: 'Verified Rs 48,000.', riIncome: 48000, decision: 'Approved.' },
];

// ---------------------------------------------------------------------------
// Sample PDF generation
// ---------------------------------------------------------------------------

function pdf(title: string, lines: string[]): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A5', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(8).fillColor('#b91c1c').text('SAMPLE – DEMO DATA – NOT A REAL DOCUMENT', { align: 'center' });
    doc.moveDown(0.6).fontSize(13).fillColor('#111').text(title, { align: 'center', underline: true });
    doc.moveDown(1).fontSize(10);
    for (const l of lines) doc.text(l).moveDown(0.4);
    doc.end();
  });
}

const rs = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;

async function documentsFor(s: Seed, aadhaarLast4: string, fullAddress: string): Promise<Array<{ type: DocType; name: string; bytes: Buffer }>> {
  const name = s.docName ?? s.name;
  const declared = s.income.agriculture + s.income.salary + s.income.business + s.income.other;
  const docs: Array<{ type: DocType; name: string; bytes: Buffer }> = [];
  const add = async (type: DocType, file: string, title: string, lines: string[]) => {
    if (!s.skipDocs?.includes(type)) docs.push({ type, name: file, bytes: await pdf(title, lines) });
  };

  await add('AADHAAR', 'aadhaar.pdf', 'Identity Document (Aadhaar – sample)', [
    `Name: ${name}`,
    `${s.gender === 'F' ? 'D/o or W/o' : 'S/o'}: ${s.relation}`,
    `Gender: ${s.gender === 'F' ? 'Female' : 'Male'}`,
    `Address: ${fullAddress}`,
    `Number: XXXX XXXX ${aadhaarLast4}`,
  ]);
  await add('RATION_CARD', 'ration-card.pdf', `Ration Card – ${s.card} (sample)`, [
    `Card type: ${s.card === 'AAY' ? 'Antyodaya (AAY)' : s.card === 'BPL' ? 'Below Poverty Line (BPL / PHH)' : 'Above Poverty Line (APL)'}`,
    `Card No: KA-${Math.floor(100000 + Math.random() * 899999)}`,
    `Head of family: ${name}`,
    `Members: ${s.family}`,
    `Address: ${fullAddress}`,
  ]);
  await add('SELF_DECLARATION', 'self-declaration.pdf', 'Self Declaration of Family Income (sample)', [
    `I, ${name}, ${s.gender === 'F' ? 'D/o or W/o' : 'S/o'} ${s.relation}, residing at ${fullAddress}, declare that the total annual income of my family from all sources is ${rs(declared)}.`,
    `Agriculture: ${rs(s.income.agriculture)}   Salary: ${rs(s.income.salary)}`,
    `Business: ${rs(s.income.business)}   Other: ${rs(s.income.other)}`,
    `Purpose: ${s.purpose}`,
    'Signature: (signed)',
  ]);
  if (s.income.salary > 0) {
    const monthly = Math.round((s.docIncome ?? s.income.salary) / 12);
    await add('SALARY_CERTIFICATE', 'salary-certificate.pdf', 'Salary Certificate (sample)', [
      `Employer: ${s.employer ?? 'Private employer'}`,
      `This is to certify that ${name} is employed with us as ${s.occupation}.`,
      `Gross monthly salary: ${rs(monthly)}`,
      'Issued for the purpose of income certificate.',
    ]);
  }
  if (s.income.agriculture > 0 || (s.land ?? 0) > 0) {
    const acres = Math.floor(s.land ?? 1);
    const guntas = Math.round(((s.land ?? 1) - acres) * 40);
    await add('RTC', 'rtc-pahani.pdf', 'Record of Rights, Tenancy and Crops – RTC (sample)', [
      `Village: ${s.village}, Hobli: Kundana, Taluk: Devanahalli`,
      `Survey No: ${Math.floor(10 + Math.random() * 180)}/${Math.ceil(Math.random() * 4)}`,
      `Khatedar: ${name}`,
      `Extent: ${acres} acres ${guntas} guntas`,
      'Land type: Dry (rain-fed)   Crop: Ragi',
    ]);
  }
  return docs;
}

// ---------------------------------------------------------------------------

async function main() {
  console.log('Clearing existing data…');
  await prisma.$transaction([
    prisma.aiRun.deleteMany(),
    prisma.auditEvent.deleteMany(),
    prisma.stageReport.deleteMany(),
    prisma.document.deleteMany(),
    prisma.application.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = Object.fromEntries(
    await Promise.all(
      USERS.map(async (u) => [u.role, await prisma.user.create({ data: { ...u, passwordHash, office: OFFICE } })] as const),
    ),
  ) as unknown as Record<Role, { id: string }>;

  const now = Date.now();
  const year = new Date().getFullYear();

  for (const [i, s] of SEEDS.entries()) {
    const receivedAt = new Date(now - s.daysAgo * DAY - (i % 5) * 3600_000);
    const at = (d: number) => new Date(Math.min(receivedAt.getTime() + d * DAY, now - 3600_000));
    const declared = s.income.agriculture + s.income.salary + s.income.business + s.income.other;
    const aadhaarLast4 = String(1000 + ((i * 7919) % 9000));
    const address = `#${12 + i}, ${['Temple Street', 'Main Road', 'School Road', 'Kere Beedi'][i % 4]}`;
    const fullAddress = `${address}, ${s.village}, Devanahalli Taluk, Bengaluru Rural`;

    // Timeline (days after receipt) for each stage reached
    const tVA = Math.min(3 + (i % 4), Math.max(1, s.daysAgo - 3));
    const tRI = tVA + 5 + (i % 3);
    const tDecided = Math.min(tRI + 3 + (i % 4), s.daysAgo - 0.2);

    const decided = s.stage === 'APPROVED' || s.stage === 'REJECTED';
    const stageEnteredAt =
      s.stage === 'VA_VERIFICATION' ? receivedAt
      : s.stage === 'RI_VERIFICATION' ? at(tVA)
      : s.stage === 'DT_DECISION' ? at(tRI)
      : s.stage === 'RETURNED_TO_APPLICANT' ? at(tVA)
      : at(tDecided);

    const app = await prisma.application.create({
      data: {
        appNo: `IC${year}${String(i + 1).padStart(6, '0')}`,
        applicantName: s.name,
        applicantNameLocal: s.local,
        relationName: s.relation,
        gender: s.gender,
        mobile: `9${String(800000000 + i * 1234567).slice(0, 9)}`,
        aadhaarLast4,
        address,
        village: s.village,
        hobli: 'Kundana',
        taluk: 'Devanahalli',
        district: 'Bengaluru Rural',
        occupation: s.occupation,
        purpose: s.purpose,
        declaredIncome: declared,
        incomeSources: s.income,
        landAcres: s.land,
        familySize: s.family,
        stage: s.stage,
        receivedAt,
        dueAt: new Date(receivedAt.getTime() + SLA_DAYS * DAY),
        stageEnteredAt,
        returnCount: s.returnReason ? 1 : 0,
        lastReturnReason: s.returnReason,
        flags: s.flags ?? [],
        verifiedIncome: s.riIncome,
        decidedAt: decided ? at(tDecided) : null,
        decisionReason: s.decision,
        certificateNo: s.stage === 'APPROVED' ? `RD-KDT-${year}-${String(i + 1).padStart(6, '0')}` : null,
        createdById: users.OPERATOR.id,
      },
    });

    // Documents
    for (const d of await documentsFor(s, aadhaarLast4, fullAddress)) {
      const stored = await putFile(app.id, d.name, 'application/pdf', d.bytes);
      await prisma.document.create({
        data: {
          applicationId: app.id,
          type: d.type,
          originalName: d.name,
          mimeType: 'application/pdf',
          size: d.bytes.length,
          ...stored,
          uploadedById: users.OPERATOR.id,
          createdAt: receivedAt,
        },
      });
    }

    // History
    const events: Prisma.AuditEventCreateManyInput[] = [
      { applicationId: app.id, actorId: users.OPERATOR.id, action: 'CREATED', toStage: 'VA_VERIFICATION', createdAt: receivedAt },
    ];
    const reports: Prisma.StageReportCreateManyInput[] = [];
    const aiRuns: Prisma.AiRunCreateManyInput[] = [];

    if (s.returnReason) {
      events.push({ applicationId: app.id, actorId: users.VA.id, action: 'RETURNED', fromStage: 'VA_VERIFICATION', toStage: 'RETURNED_TO_APPLICANT', comment: s.returnReason, createdAt: at(tVA) });
    }
    if (s.vaNote) {
      reports.push({ applicationId: app.id, stage: 'VA_VERIFICATION', authorId: users.VA.id, notes: s.vaNote, recommendation: 'APPROVE', checklist: { identity: true, rationCard: true, selfDeclaration: true, incomeProof: true }, createdAt: at(tVA) });
      events.push({ applicationId: app.id, actorId: users.VA.id, action: 'FORWARDED', fromStage: 'VA_VERIFICATION', toStage: 'RI_VERIFICATION', comment: s.vaNote, createdAt: at(tVA) });
      if (decided) {
        aiRuns.push({ applicationId: app.id, stage: 'VA_VERIFICATION', kind: 'DOCUMENT_CHECK', model: 'seed', lang: 'kn', latencyMs: 6200 + i * 150, output: { seeded: true }, feedback: i % 3 === 0 ? 'EDITED' : 'ACCEPTED', userId: users.VA.id, createdAt: at(tVA - 0.1) });
      }
    }
    if (s.riNote) {
      reports.push({ applicationId: app.id, stage: 'RI_VERIFICATION', authorId: users.RI.id, notes: s.riNote, verifiedIncome: s.riIncome, recommendation: (s.riIncome ?? 0) > declared * 1.5 ? 'REJECT' : 'APPROVE', createdAt: at(tRI) });
      events.push({ applicationId: app.id, actorId: users.RI.id, action: 'FORWARDED', fromStage: 'RI_VERIFICATION', toStage: 'DT_DECISION', comment: s.riNote, meta: { verifiedIncome: s.riIncome }, createdAt: at(tRI) });
      if (decided) {
        aiRuns.push({ applicationId: app.id, stage: 'RI_VERIFICATION', kind: 'REPORT_DRAFT', model: 'seed', lang: 'kn', latencyMs: 3100 + i * 90, output: { seeded: true }, feedback: i % 4 === 0 ? 'DISMISSED' : 'EDITED', userId: users.RI.id, createdAt: at(tRI - 0.1) });
      }
    }
    if (decided) {
      const action = s.stage === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      const suggested = s.stage === 'APPROVED' ? 'APPROVE' : 'REJECT';
      const agreed = i % 6 !== 0;
      aiRuns.push({ applicationId: app.id, stage: 'DT_DECISION', kind: 'CASE_BRIEF', model: 'seed', lang: 'kn', latencyMs: 4200 + i * 110, output: { seeded: true, suggestedDecision: agreed ? suggested : 'RETURN' }, feedback: agreed ? 'ACCEPTED' : 'DISMISSED', userId: users.DT.id, createdAt: at(tDecided - 0.05) });
      events.push({ applicationId: app.id, actorId: users.DT.id, action, fromStage: 'DT_DECISION', toStage: s.stage, comment: s.decision, meta: { aiSuggestedDecision: agreed ? suggested : 'RETURN', agreedWithAi: agreed }, createdAt: at(tDecided) });
    }

    await prisma.stageReport.createMany({ data: reports });
    await prisma.auditEvent.createMany({ data: events });
    if (aiRuns.length) await prisma.aiRun.createMany({ data: aiRuns });
    process.stdout.write('.');
  }

  console.log(`\nSeeded ${SEEDS.length} applications.`);
  console.log(`Logins (password ${PASSWORD}): ${USERS.map((u) => `${u.username} (${u.role})`).join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
