<?php
namespace HebleoNewCardOrder;

/** Use the existing, exact import provenance; never infer a lesson from Hebrew. */
function lesson(array $fields, string $owner): ?string {
    if ($owner === '' || ($fields['SourceId'] ?? null) !== $owner) return null;
    if (!preg_match('/\bLessons: ([0-9., ]+)/', $fields['Source'] ?? '', $match)) return null;
    $codes = array_map('trim', explode(',', trim($match[1])));
    foreach ($codes as $code) if (!preg_match('/\A[1-9][0-9]*(?:\.[0-9]+)+\z/D', $code)) return null;
    usort($codes, 'version_compare');
    return $codes[0] ?? null;
}

/** Input is the complete eligible new pool in created_at/id order, before LIMIT. */
function select(array $cards, $custom, int $limit, callable $read): array {
    if ($limit <= 0 || !$cards) return [];
    $priority = [];
    foreach (is_array($custom) ? $custom : [] as $key) {
        if (is_string($key) && preg_match('/\A[1-9][0-9]*_[1-9][0-9]*\z/D', $key) && !isset($priority[$key])) $priority[$key] = count($priority);
    }
    $lessons = []; $ranked = [];
    foreach ($cards as $position => $card) {
        $note = (int)$card->note_id;
        if (!array_key_exists($note, $lessons)) $lessons[$note] = $read($note);
        $ranked[] = ['card' => $card, 'key' => $note.'_'.(int)$card->template_id, 'lesson' => $lessons[$note], 'position' => $position];
    }
    usort($ranked, static function ($a, $b) use ($priority) {
        $custom = ($priority[$a['key']] ?? PHP_INT_MAX) <=> ($priority[$b['key']] ?? PHP_INT_MAX);
        if ($custom) return $custom;
        if ($a['lesson'] !== null && $b['lesson'] !== null) {
            $course = version_compare($a['lesson'], $b['lesson']);
            if ($course) return $course;
        } elseif ($a['lesson'] !== $b['lesson']) {
            return $a['lesson'] === null ? 1 : -1;
        }
        return $a['position'] <=> $b['position'];
    });
    return array_column(array_slice($ranked, 0, $limit), 'card');
}

function wordpress(array $cards, $custom, int $limit): array {
    if ($limit <= 0 || !$cards) return [];
    \update_meta_cache('post', array_values(array_unique(array_map(static fn($p) => (int)$p->note_id, $cards))));
    return select($cards, $custom, $limit, static function (int $note): ?string {
        $raw = \get_post_meta($note, '_card_field_data', true);
        $owner = \get_post_meta($note, '_hebleo_shared_source_id', true);
        return is_array($raw) && is_string($owner) ? lesson($raw, $owner) : null;
    });
}
