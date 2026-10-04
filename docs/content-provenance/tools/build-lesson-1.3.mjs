// Builds the lesson 1-3 provenance evidence, the stable-ID sidecar and the UNAPPROVED candidate pack.
// Read-only with respect to every source. Inputs stay outside the repository.
//
// Usage:
//   node docs/content-provenance/tools/extract-source-rows.mjs <snapshot.csv> 1.3,1.3.5,1.4 > <rows.json>
//   node docs/content-provenance/tools/build-lesson-1.3.mjs <rows.json>
//
// IDs are minted once into lesson-1.3-id-map.json and never regenerated: an existing map entry always wins.
// Row ordinals are recorded as source locators only; they are never used as identity.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const out = (p) => join(root, p);
const SHEET_ID = '1d9b3mFnRhubmdq7gJ5VMJBA9dyhwS6GSI6V95M0xSVc';

const rowsPath = process.argv[2];
if (!rowsPath) { console.error('usage: build-lesson-1.3.mjs <rows.json>'); process.exit(2); }
const src = JSON.parse(readFileSync(rowsPath, 'utf8'));
if (src.snapshotSha256 !== 'd0cd29c4bf641841a5a26f494c361cbc6832730434b658de4108b75e22bce0c5') {
  console.error('Unexpected masterfile snapshot hash; this transcription was checked against the 2026-10-04 snapshot only.');
  process.exit(1);
}
const byOrdinal = new Map(src.rows.map((r) => [r.ordinal, r]));

// Solved exercise PDF (WordPress media 28389), transcribed 2026-10-04.
// Latin strings are the exact extracted PDF text (backtick U+0060 and ASCII apostrophe/quotes are in the source).
// Hebrew strings and bold segments were transcribed from a page render because extracted Hebrew order is scrambled.
// role: "example" = black printed worked example; "answer" = red answer-key text; null = item absent.
const EX = {
  1: { tr: 'Yam', meaning: 'Sea', ex1: 'example', ex2: 'answer', bold: null },
  13: { tr: '`ani', meaning: 'I', ex1: 'example', ex2: 'answer', bold: 'נִי' },
  28: { tr: 'Natan', meaning: '(he) gave', ex1: 'example', ex2: 'answer', bold: 'תַן' },
  18: { tr: 'Hi', ex1Note: '("hee", not "hai")', ex2Note: '("hee")', meaning: 'She', ex1: 'answer', ex2: 'example', bold: null },
  3: { tr: 'Mayim', meaning: 'Water', ex1: 'answer', ex2: 'answer', bold: 'מַ' },
  20: { tr: 'Hen', meaning: 'They (all-female)', ex1: 'answer', ex2: 'answer', bold: null },
  4: { tr: "Me'a", meaning: 'Hundred (100)', ex1: 'answer', ex2: 'answer', bold: 'מֶ' },
  23: { tr: 'Mi', meaning: 'Who?', ex1: 'answer', ex2: 'example', bold: null },
  17: { tr: '`aten', meaning: 'You (plural all-female)', ex1: 'answer', ex2: 'answer', bold: 'תֶן', hebrew: 'אַתֶן' },
  19: { tr: 'Hem', meaning: 'They (plural)', ex1: 'answer', ex2: 'answer', bold: null },
  16: { tr: '`atem', meaning: 'You (plural)', ex1: 'answer', ex2: 'answer', bold: 'תֶם', hebrew: 'אַתֶם' },
  6: { tr: 'Matana', meaning: 'Gift, present', ex1: 'answer', ex2: 'answer', bold: 'נָה', hebrew: 'מַתָנָה' },
  24: { tr: 'Ma', meaning: 'What?', ex1: 'answer', ex2: 'answer', bold: null },
  25: { tr: 'Matai', meaning: 'When?', ex1: 'answer', ex2: null, bold: 'תַי' },
  14: { tr: '`at', meaning: 'You (single female)', ex1: 'answer', ex2: 'answer', bold: null, hebrew: 'אַת' },
  2: { tr: 'Yayin', meaning: 'Wine', ex1: 'answer', ex2: 'example', bold: 'יַ' },
  15: { tr: '`ata', meaning: 'You (single male)', ex1: 'answer', ex2: 'answer', bold: 'תָה', hebrew: 'אַתָה' },
};
// Printed order of items in the PDF (ordinals). Position is a locator, not identity.
const EX1_ORDER = [1, 13, 28, 18, 3, 20, 4, 23, 17, 19, 16, 6, 24, 25, 14, 2, 15];
const EX2_ORDER = [23, 18, 2, 6, 1, 13, 20, 15, 17, 16, 19, 14, 4, 3, 28, 24];

// WordPress audio attachments matched by transliterated filename only (wp/v2/media, 2026-10-04). NOT confirmed.
const AU = { 1: [[41669, 'yam']], 2: [[41653, 'yayin']], 3: [[41586, 'mayim']], 4: [[41587, 'mea']], 5: [[41431, 'aman']], 6: [[41579, 'matana']], 7: [[41539, 'ima']], 8: [[41537, 'i']], 9: [[41575, 'mana']], 10: [[41480, 'emet']], 11: [[41640, 'teiman']], 12: [[41613, 'natanya']], 13: [[41442, 'ani']], 14: [[41445, 'at']], 15: [[41446, 'ata']], 16: [[41447, 'atem']], 17: [[41448, 'aten']], 18: [[41528, 'hi-she']], 19: [[41526, 'hem']], 20: [[41527, 'hen']], 23: [[41607, 'mi']], 24: [[41585, 'ma-what']], 25: [[41578, 'matai']], 26: [[41516, 'haim-is-it-the-case']], 28: [[41612, 'natan-gave'], [43658, 'natan-noten']], 29: [[41524, 'haya-was']] };
const PL = { 1: [41652, 'yamim'], 4: [41600, 'meot'], 6: [41584, 'matanot'] };
const audioUrl = (f) => `https://hebleo.com/wp-content/uploads/2025/10/${f}.mp3`;

const SOURCES = {
  masterfile: { title: 'Ultimate Vocabulary Masterfile', driveFileId: SHEET_ID, owner: 'guylfe@gmail.com', modifiedTime: '2026-08-21T12:51:21.066Z', range: 'Sheet1!A1:AD1059', export: 'text/csv via Google Drive connector download_file_content, 2026-10-04', snapshotSha256: src.snapshotSha256, snapshotLocation: 'outside repository (curriculum designer workspace source-snapshots/); not committed', formattingCaptured: false, formattingNote: 'CSV drops rich-text runs, colors, notes and hyperlinks. The old hebleo-vocab-sheets plugin reads textFormatRuns (bold/italic/underline/color) from Sheets grid data, so source formatting exists and is learner-visible; a grid-data read is still required.' },
  lesson: { wordpressLessonId: 25328, postType: 'sfwd-lessons', title: 'Lesson 1-3: Vowel Letters א,ה,י (6 of 22)', modified: '2025-12-24T22:50:28', link: 'https://hebleo.com/courses/hebleo-hebrew-learning-platform/lessons/lesson-1-3-vowel-letters-%d7%90%d7%94%d7%99-6-of-22/', bodyAsRetrieved: 'Vimeo video 740173416 plus [visitor course_id="25283"][elementor-template id="44954"][/visitor]', video: 'https://vimeo.com/740173416/631b0ae8c8', transcriptAvailable: false, retrieved: '2026-10-04 via hebleo_wordpress wp_get_cpt_item (read-only)' },
  exercise: { wordpressTopicId: 25717, title: 'EXERCISE: 1-3 Pronunciation and Vocabulary', parentLessonId: 25328, blankPdf: { mediaId: 28386, url: 'https://hebleo.com/wp-content/uploads/2023/12/1.3-Exercise.pdf', sha256: 'b125758b00d5119d242340bf6475bfd2b9d8ebef665f93057d07646f42d0389e' }, solvedPdf: { mediaId: 28389, url: 'https://hebleo.com/wp-content/uploads/2023/03/1.3-Exercise-Solved-1.pdf', sha256: '4ff61bece5d3d69d6a236ac83b74ee49035afa93855c5c85e0b9561707f8faae' }, method: 'PyMuPDF span extraction (font + color) plus visual check of a page render. Latin text copied exactly; Hebrew transcribed from the render.', colorConvention: 'black = printed worked example; red (#ff0000) = answer key', boldConvention: 'Arial-BoldMT on one syllable of multi-syllable words (hypothesis: stress; NOT confirmed by Guy)', instructions: { exercise1: 'Write each vocabulary word using English letters (see examples).\nAfterwards, write its meaning.', exercise2: 'Write each vocabulary word using Hebrew letters (see examples).\nAfterwards, write its meaning.', lookupRule: 'Try learning the words before doing this exercise, and to not look at the\nvocab sheet while doing the exercise.\n\nOnly look at the vocab and correct your work once you are done.' } },
};

// ---- stable ID sidecar (minted once) ----
const mapPath = out('docs/content-provenance/lesson-1.3-id-map.json');
const idMap = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : { schemaVersion: 1, note: 'Private stable-ID sidecar. IDs are assigned once and never derived from row position. Source-sheet ID columns are not written (not authorized).', words: {}, exercises: {}, lessons: {} };
const mint = (prefix) => `${prefix}-${randomBytes(5).toString('hex')}`;
const wordId = (r) => {
  const key = `masterfile:${SHEET_ID}:rowAtCapture:${r.ordinal}`;
  idMap.words[key] ||= { id: mint('hw'), capturedRowSha256: r.rowSha256, capturedHebrew: r.cells.Hebrew, capturedEnglish: r.cells.English, capturedLesson: r.cells.Lesson };
  return idMap.words[key].id;
};
const exId = (exercise, ordinal) => {
  const key = `wp-media:28389:exercise${exercise}:masterfileRowAtCapture:${ordinal}`;
  idMap.exercises[key] ||= { id: mint('hx') };
  return idMap.exercises[key].id;
};
const lessonKey = 'wp-lesson:25328';
idMap.lessons[lessonKey] ||= { id: mint('hl') };
const LESSON_ID = idMap.lessons[lessonKey].id;

// ---- evidence file ----
const evidence = {
  status: 'EVIDENCE — not approved, not canonical, not importable. Proposed for Guy\'s review.',
  generated: '2026-10-04 by Hebleo Curriculum Designer (branch curriculum/b04-source-audit)',
  sources: SOURCES,
  header: src.header,
  rows: src.rows.map((r) => {
    const e = EX[r.ordinal];
    return {
      stableId: wordId(r), ...r,
      exercise1_3: e ? { transliteration: e.tr, ...(e.ex1Note ? { exercise1Note: e.ex1Note } : {}), ...(e.ex2Note ? { exercise2Note: e.ex2Note } : {}), meaning: e.meaning, exercise1Role: e.ex1, exercise2Role: e.ex2, boldSegment: e.bold, ...(e.hebrew ? { exerciseHebrewDiffersFromSheet: e.hebrew } : {}) } : null,
      audioCandidates: (AU[r.ordinal] || []).map(([mediaId, f]) => ({ mediaId, url: audioUrl(f), match: 'filename only, unconfirmed' })),
      ...(PL[r.ordinal] ? { pluralAudioCandidate: { mediaId: PL[r.ordinal][0], url: audioUrl(PL[r.ordinal][1]), match: 'filename only, unconfirmed' } } : {}),
    };
  }),
};

// ---- unapproved candidate pack ----
const strip = (s) => s.normalize('NFD').replace(/[֑-ׇ]/g, '').normalize('NFC');
const LESSON_ROWS = src.rows.filter((r) => ['1.3', '1.3.5'].includes(r.cells.Lesson)).map((r) => r.ordinal);
const EX2_GRADED = EX2_ORDER.filter((o) => EX[o].ex2 === 'answer');
const usedOrdinals = [...new Set([...LESSON_ROWS, ...EX2_ORDER])];
const rowLocator = (r) => ({ source: 'masterfile', driveFileId: SHEET_ID, rowAtCapture: r.ordinal, rowSha256: r.rowSha256, snapshotSha256: src.snapshotSha256 });
const pending = { approval: 'pending', approvedBy: null, approvedAt: null };

const words = usedOrdinals.map((o) => {
  const r = byOrdinal.get(o); const c = r.cells;
  const { Ordinals, Lesson, Hebrew, English, Notes, ...rest } = c;
  return {
    id: wordId(r), pointed: Hebrew, unpointed: strip(Hebrew), curated: Hebrew, english: English,
    ...(Notes ? { notes: Notes } : {}),
    sourceFields: { Lesson, ...rest },
    provenance: { kind: 'source-candidate', ...rowLocator(r), derived: { unpointed: 'mechanical Nikkud strip of Hebrew', curated: 'copied from Hebrew pending Nikkud curation (decision D3)' }, ...pending },
  };
});

const exercises = EX2_GRADED.map((o) => {
  const r = byOrdinal.get(o); const e = EX[o];
  return {
    id: exId(2, o), lessonId: LESSON_ID, type: 'typing', wordId: wordId(r),
    prompt: `Write using Hebrew letters: ${e.tr}`,
    requireNikkud: false, allowLookup: false,
    provenance: { kind: 'source-candidate', source: 'wp-media:28389', exercise: 2, printedPosition: EX2_ORDER.indexOf(o) + 1, answerKeyHebrew: e.hebrew || Hebrew(r), answerKeyMeaning: e.meaning, promptWording: 'proposed composition: shortened source instruction + exact source transliteration', requireNikkud: 'proposed (decision D4)', allowLookup: 'source-backed: exercise instruction says not to look at the vocab sheet until done', ...pending },
  };
});
function Hebrew(r) { return r.cells.Hebrew; }

const pack = {
  schemaVersion: 1,
  provenance: { kind: 'source-candidate-unapproved', label: 'UNAPPROVED candidate built from Guy\'s source files. Deliberately rejected by the current store validator until per-object provenance/approval exists and Guy approves.' },
  words,
  lessons: [{
    id: LESSON_ID, title: SOURCES.lesson.title, chapter: 'Lesson 1-3', minutes: 5, letters: 'אהימנתםן',
    video: SOURCES.lesson.video,
    wordIds: LESSON_ROWS.map((o) => wordId(byOrdinal.get(o))),
    exerciseIds: exercises.map((x) => x.id),
    blocks: [
      { type: 'explanation', renderer: 'text' },
      { type: 'vocabulary', source: 'words', selector: { lessonId: LESSON_ID }, renderer: 'vocabulary-table', options: { showNotes: true } },
      { type: 'exercise-set', source: 'exercises', selector: { lessonId: LESSON_ID }, renderer: 'practice' },
    ],
    provenance: { kind: 'source-candidate', source: 'wp-lesson:25328', title: 'exact', video: 'exact URL from lesson body', explanation: 'none: teaching is in the video; no transcript available', chapter: 'derived from title prefix', letters: 'derived: distinct letters in the lesson words (consistent with "6 of 22")', minutes: 'PLACEHOLDER: video duration not retrieved', ...pending },
  }],
  exercises,
};

writeFileSync(out('docs/content-provenance/lesson-1.3-source-rows.json'), JSON.stringify(evidence, null, 2) + '\n');
writeFileSync(mapPath, JSON.stringify(idMap, null, 2) + '\n');
mkdirSync(out('docs/curriculum/lesson-1.3'), { recursive: true });
writeFileSync(out('docs/curriculum/lesson-1.3/candidate-pack.json'), JSON.stringify(pack, null, 2) + '\n');
console.log(`rows ${evidence.rows.length}, pack words ${words.length}, lesson words ${LESSON_ROWS.length}, exercises ${exercises.length}, lesson ${LESSON_ID}`);
