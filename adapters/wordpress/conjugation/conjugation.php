<?php
/**
 * Plugin Name: Hebleo Conjugation Practice
 * Description: Read-only independent practice, gated by the existing site's access decision.
 * Version: 1.0.0
 */
namespace HebleoConjugation;
if (!defined('ABSPATH')) exit;
/** Same audience as live flashcard study: any authenticated WordPress account.
 * See access-evidence/ACCESS_DECISION.md. No course/purchase entitlement is inferred.
 * The optional site filter may restrict access; it cannot bypass authentication.
 */
function allowed(): bool {
    $user_id = get_current_user_id();
    return is_user_logged_in() && $user_id > 0 && apply_filters('hebleo_conjugation_access', true, $user_id) === true;
}
/** Protect only pages containing this shortcode, for every visitor. */
function protect_page_cache(): void {
    if (!is_singular()) return;
    $post = get_queried_object();
    if (!$post instanceof \WP_Post || !has_shortcode($post->post_content, 'hebleo_conjugation')) return;
    if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
    nocache_headers();
    header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0', true);
    header('EC-CDN-Cache-Control: private, no-store, no-cache, max-age=0', true);
    do_action('litespeed_control_set_nocache', 'Hebleo authenticated conjugation practice');
}
add_action('template_redirect', __NAMESPACE__.'\\protect_page_cache', 0);
function shortcode(): string {
    if (!allowed()) return '<p>Conjugation practice is unavailable for this account.</p>';
    $path = __DIR__.'/catalog-data.php';
    try { $catalog = is_file($path) ? require $path : null; }
    catch (\Throwable $error) { return '<p>Practice content is unavailable.</p>'; }
    if (!is_array($catalog) || ($catalog['schemaVersion'] ?? null) !== 1 || !is_array($catalog['words'] ?? null) || !is_array($catalog['forms'] ?? null)) return '<p>Practice content is unavailable.</p>';
    // A corrupted/stale package must not release fixture or held grading records.
    foreach ($catalog['forms'] as $f) if (($f['approval'] ?? '') !== 'approved') return '<p>Practice content is awaiting approval.</p>';
    $id = wp_unique_id('hebleo-conjugation-');
    wp_enqueue_style('hebleo-conjugation', plugins_url('assets/practice.css', __FILE__), [], substr(hash_file('sha256', __DIR__.'/assets/practice.css'),0,16));
    wp_enqueue_style('hebleo-practice-help', plugins_url('assets/help.css', __FILE__), [], '1.0.0');
    $json = wp_json_encode($catalog, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT);
    return '<div data-conjugation-host><div id="'.esc_attr($id).'" data-conjugation-root></div><script type="application/json" data-conjugation-catalog>'.$json.'</script></div><script type="module" src="'.esc_url(plugins_url('assets/bootstrap.js', __FILE__).'?ver='.substr(hash_file('sha256', __DIR__.'/assets/bootstrap.js'),0,16)).'"></script>';
}
add_shortcode('hebleo_conjugation', __NAMESPACE__.'\\shortcode');
