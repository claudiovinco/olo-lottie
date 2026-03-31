<?php
/**
 * Plugin Name: Olo Lottie
 * Plugin URI: https://mosaic.clod.eu
 * Description: Visual Lottie animation editor for WordPress
 * Version: 1.3.0
 * Author: Claudio
 * Text Domain: olo-lottie
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('OLO_LOTTIE_VERSION', '1.3.0');
define('OLO_LOTTIE_PATH', plugin_dir_path(__FILE__));
define('OLO_LOTTIE_URL', plugin_dir_url(__FILE__));

require_once OLO_LOTTIE_PATH . 'includes/class-admin.php';
require_once OLO_LOTTIE_PATH . 'includes/class-rest-api.php';
require_once OLO_LOTTIE_PATH . 'includes/class-block.php';

new Olo_Lottie_Admin();
new Olo_Lottie_Rest_Api();
new Olo_Lottie_Block();

// Register custom post type for animations
add_action('init', function () {
    register_post_type('olo_lottie', [
        'labels' => [
            'name' => __('Lottie Animations', 'olo-lottie'),
            'singular_name' => __('Lottie Animation', 'olo-lottie'),
        ],
        'public' => false,
        'show_ui' => false,
        'supports' => ['title'],
        'capability_type' => 'post',
    ]);
});
