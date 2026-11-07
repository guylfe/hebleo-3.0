<?php
/**
 * Plugin Name: Hebleo Conjugation Practice
 * Description: Read-only independent practice, gated by the existing site's access decision.
 * Version: 1.0.0
 */
namespace HebleoConjugation;
if (!defined('ABSPATH')) exit;
/** Default deny: installation owner must wire the existing course access check. */
function allowed(): bool {
    return is_user_logged_in() && apply_filters('hebleo_conjugation_access', false, get_current_user_id()) === true;
}
function shortcode(): string {
    if (!allowed()) return '<p>Conjugation practice is unavailable for this account.</p>';
    $path = __DIR__.'/assets/catalog.json';
    $catalog = is_file($path) ? json_decode(file_get_contents($path), true) : null;
    if (!is_array($catalog) || ($catalog['schemaVersion'] ?? null) !== 1 || !is_array($catalog['words'] ?? null) || !is_array($catalog['forms'] ?? null)) return '<p>Practice content is unavailable.</p>';
    // A corrupted/stale package must not release fixture or held grading records.
    foreach ($catalog['forms'] as $f) if (($f['approval'] ?? '') !== 'approved') return '<p>Practice content is awaiting approval.</p>';
    $id = wp_unique_id('hebleo-conjugation-');
    wp_enqueue_style('hebleo-conjugation', plugins_url('assets/practice.css', __FILE__), [], '1.0.0');
    $json = wp_json_encode($catalog, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT);
    return '<div data-conjugation-host><div id="'.esc_attr($id).'" data-conjugation-root></div><script type="application/json" data-conjugation-catalog>'.$json.'</script></div><script type="module" src="'.esc_url(plugins_url('assets/bootstrap.js', __FILE__)).'"></script>';
}
add_shortcode('hebleo_conjugation', __NAMESPACE__.'\\shortcode');
