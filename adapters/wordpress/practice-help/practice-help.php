<?php
/** Plugin Name: Hebleo practice help (add-on)
 * Version: 1.0.0
 */
namespace HebleoPracticeHelp;
if (!defined('ABSPATH')) exit;
// Display only: no account, catalog, schedule, activation, cache or page writes.
add_action('wp_enqueue_scripts', function () {
    if (!is_post_type_archive('decks') && !is_page('conjugation-practice')) return;
    wp_enqueue_style('hebleo-practice-help-addon', plugins_url('assets/help.css', __FILE__), [], '1.0.0');
});
add_action('wp_footer', function () {
    if (!is_post_type_archive('decks') && !is_page('conjugation-practice')) return;
    echo '<script type="module" src="'.esc_url(plugins_url('assets/bootstrap.js', __FILE__)).'"></script>';
});
