// Versioned author-side contract. Unknown source metadata remains private author data.
export type SlotId =
  "verb.infinitive" |
  "verb.gerund" |
  "verb.past.I" |
  "verb.past.אתה" |
  "verb.past.את" |
  "verb.past.he" |
  "verb.past.she" |
  "verb.past.אנחנו" |
  "verb.past.אתם" |
  "verb.past.אתן" |
  "verb.past.they" |
  "verb.present.Singular M" |
  "verb.present.Singular F" |
  "verb.present.Plural M" |
  "verb.present.Plural F" |
  "verb.future.I" |
  "verb.future.אתה" |
  "verb.future.את" |
  "verb.future.he" |
  "verb.future.she" |
  "verb.future.אנחנו" |
  "verb.future.אתם" |
  "verb.future.אתן" |
  "verb.future.they" |
  "verb.imperative.אתה" |
  "verb.imperative.את" |
  "verb.imperative.אתם" |
  "verb.imperative.אתן" |
  "adjective.ms" |
  "adjective.fs" |
  "adjective.mp" |
  "adjective.fp" |
  "preposition.I" |
  "preposition.אתה" |
  "preposition.את" |
  "preposition.he" |
  "preposition.she" |
  "preposition.אנחנו" |
  "preposition.אתם" |
  "preposition.אתן" |
  "preposition.הם" |
  "preposition.הן";

export type Category = 'verb' | 'adjective' | 'preposition' | 'noun' | 'other';
export type ParadigmCategory = 'verb' | 'adjective' | 'preposition';
export type Representation = 'pointed' | 'unpointed' | 'curated';
export interface Review {
  status: 'approved' | 'pending' | 'rejected' | 'unresolved';
  reviewedRevision?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
export interface VersionedReview { revision: string; review: Review }
export interface RichText {
  text: string;
  runs?: Array<{startIndex: number; format: Record<string, unknown>}>;
  format?: Record<string, unknown>;
}
export interface Variant extends VersionedReview {
  variantId: string;
  mappingReview: Review;
  origin: 'source' | 'human-authored' | 'generated';
  sourceRefs: string[];
  representations: Partial<Record<Representation, RichText>>;
}
export interface Form {
  slotId: SlotId;
  status: 'supplied' | 'missing' | 'inapplicable' | 'unresolved';
  variants: Variant[];
}
export interface LexicalWord {
  wordKey: string;
  revision: string;
  category: Category;
  identityReview: Review;
  /** Integration gate: identity approval alone cannot approve visible source fields. */
  displayReview?: Review;
  approvalDigest?: string;
  runtimeId?: string;
  fieldConflicts: string[];
  classMemberships: Array<{classId: string; review: Review}>;
  forms: Form[];
  [authorField: string]: unknown;
}
export interface ConjugationClass extends VersionedReview { classId: string; category: ParadigmCategory }
export type Scope = {kind: 'all'; category: ParadigmCategory}
  | {kind: 'word'; category: ParadigmCategory; wordKey: string}
  | {kind: 'class'; category: ParadigmCategory; classId: string};
export interface Unlock extends VersionedReview {
  unlockId: string;
  courseId: string;
  lessonId: string;
  scope: Scope;
  slotIds: SlotId[];
}
export interface Introduction extends VersionedReview {
  linkId: string;
  wordKey: string;
  action: 'introduce' | 'reuse' | 'legacy';
  courseId?: string | null;
  lessonId?: string | null;
  legacyReference?: unknown;
  [authorField: string]: unknown;
}
export interface AliasLookup { kind: 'source' | 'word' | 'form'; namespace: string; aliasId: string }
export interface Alias extends AliasLookup, VersionedReview { wordKey: string; slotId?: SlotId | null }
export interface Usage { usageId: string; wordKey: string; [authorField: string]: unknown }
export interface Example { exampleId: string; wordKey: string; usageId?: string; [authorField: string]: unknown }
export interface LexicalContent {
  version: typeof LEXICAL_VERSION;
  sourceSchemaVersion: typeof SOURCE_SCHEMA_VERSION;
  words: LexicalWord[];
  classes: ConjugationClass[];
  introductions: Introduction[];
  unlocks: Unlock[];
  aliases: Alias[];
  usages: Usage[];
  examples: Example[];
  [authorField: string]: unknown;
}
export interface Catalogue {
  status: 'connected' | 'unconnected';
  lessons: Array<{id: string; title: string}>;
  courses: Array<{id: string; lessonIds: string[]}>;
}
export interface ContractError { path: string; code: string }
export interface Validation { ok: boolean; errors: ContractError[] }
export interface Context { courseId: string; lessonId: string; wordKey: string; representation?: Representation }
export type SourceState = 'available' | 'missing' | 'inapplicable' | 'unresolved' | 'unapproved';
export interface ProjectedVariant extends RichText { variantId: string }
export interface SourceProjection { sourceState: SourceState; variants: ProjectedVariant[] }
export interface SlotEligibility extends SourceProjection {
  slotId: SlotId;
  state: SourceState | 'locked' | 'word-unavailable';
  introduced: boolean;
  inherited: boolean;
  addedHere: boolean;
  introductions: Array<{unlockId: string; lessonId: string; scope: Scope}>;
}
export interface VerbCitation {
  separator: '-'; direction: 'rtl';
  slots: Array<SourceProjection & {slotId: SlotId}>;
}
export interface Eligibility extends Validation {
  wordAvailable: boolean;
  wordState: 'invalid' | 'unapproved' | 'unresolved' | 'not-introduced' | 'available';
  slots: SlotEligibility[];
  citation: VerbCitation | null;
}
export interface LessonTitle {
  linkId: string; lessonId: string | null; courseId: string | null; title: string | null;
  status: 'connected' | 'unconnected' | 'unbound' | 'unknown-lesson' | 'outside-course' | 'invalid-catalogue';
}
export interface FieldCandidate { sourceRef: string; value: unknown }
export interface FieldResolution extends VersionedReview { candidates: FieldCandidate[]; value: unknown }
export interface MigrationMapping extends VersionedReview { legacyWordId: string; wordKey: string }
export interface ProgressRecord { learnerId: string; wordId: string; cardId: string; [existingField: string]: unknown }
export interface ProgressGroup { learnerId: string; wordKey: string; cards: Array<{cardId: string; legacyWordId: string}> }
export interface ProgressPreview {
  version: typeof PROGRESS_PREVIEW_VERSION; mode: 'preview-only'; canApply: false;
  errors: ContractError[];
  conflicts: Array<{code: string; [detail: string]: unknown}>;
  proposals: Array<ProgressGroup & {status: 'retain-existing-card-id-and-schedule'}>;
  unchanged: Array<{learnerId: string; cardId: string; wordId: string}>;
  reverseMappings: Array<{legacyWordId: string; wordKey: string}>;
}
export const LEXICAL_VERSION: 'hebleo-lexical-runtime-v1';
export const SOURCE_SCHEMA_VERSION: 'hebleo-lexical-consolidation-v3';
export const PROGRESS_PREVIEW_VERSION: 'hebleo-lexical-progress-preview-v1';
export const SLOT_IDS: readonly SlotId[];
export const VERB_CITATION_SLOTS: readonly SlotId[];
export const REPRESENTATIONS: readonly Representation[];
export const SLOT_DEFINITIONS: ReadonlyArray<Readonly<{id: SlotId; category: ParadigmCategory; group: string;
  number: 'singular' | 'plural' | null; gender: 'masculine' | 'feminine' | 'shared' | null;
  pronoun: string | null; shared: boolean; citation: boolean}>>;
export function slotsForCategory(category: string): SlotId[];
export function isApproved(review: unknown, revision: unknown): boolean;
export function validateLexicalContent(content: unknown, catalogue?: unknown): Validation;
export function validateCatalogue(catalogue: unknown): Validation;
export function projectLessonTitles(links: Introduction[], catalogue: Catalogue): LessonTitle[];
export function projectVerbCitation(word: LexicalWord, representation?: Representation): VerbCitation;
export function computeEligibility(content: LexicalContent, catalogue: Catalogue, context: Context): Eligibility;
export function resolveLexicalAlias(content: LexicalContent, lookup: AliasLookup): {
  status: 'unknown' | 'conflict' | 'unapproved' | 'resolved'; wordKey: string | null; slotId: SlotId | null;
};
export function readLessonUnlocks(settings: unknown): Validation & {
  mode: 'legacy-no-additions' | 'explicit' | 'invalid'; additions: Unlock[];
};
export function resolveFieldOwnership(input: {candidates: FieldCandidate[]; resolution?: FieldResolution}): {
  status: 'missing' | 'agreed' | 'resolved' | 'conflict'; value?: unknown; candidates: FieldCandidate[];
};
export function previewProgressMigration(input: {content: LexicalContent; mappings: MigrationMapping[]; progress: ProgressRecord[]}): ProgressPreview;
