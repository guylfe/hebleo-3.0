// Comparison policy shared by grading and author validation. Source text is never rewritten.
export const normalizeHebrew = (value, requireNikkud = false) => String(value).normalize('NFC').replace(requireNikkud ? /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g : /[\u0591-\u05c7\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[.,!?;:״„“”"׳‘’']/g, '').trim().replace(/\s+/g, ' ');

// Marks, punctuation ignored by the established grader, and invisible controls alone
// cannot constitute an accepted key or a substantive learner response.
export const hasGradingContent = value => typeof value === 'string' && Boolean(normalizeHebrew(value).replace(/[\s\p{M}\p{Cc}\p{Default_Ignorable_Code_Point}]/gu, ''));
