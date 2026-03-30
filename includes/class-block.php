<?php

if (!defined('ABSPATH')) {
    exit;
}

class Olo_Lottie_Block {

    public function __construct() {
        add_action('init', [$this, 'register_block']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend']);
    }

    public function register_block() {
        if (!file_exists(OLO_LOTTIE_PATH . 'build/block.js')) {
            return;
        }

        wp_register_script(
            'olo-lottie-block',
            OLO_LOTTIE_URL . 'build/block.js',
            ['wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n'],
            OLO_LOTTIE_VERSION
        );

        register_block_type('olo-lottie/player', [
            'editor_script' => 'olo-lottie-block',
            'render_callback' => [$this, 'render_block'],
            'attributes' => [
                'animationId' => ['type' => 'number', 'default' => 0],
                'width' => ['type' => 'string', 'default' => '100%'],
                'height' => ['type' => 'string', 'default' => 'auto'],
                'loop' => ['type' => 'boolean', 'default' => true],
                'autoplay' => ['type' => 'boolean', 'default' => true],
            ],
        ]);
    }

    public function enqueue_frontend() {
        if (!has_block('olo-lottie/player')) {
            return;
        }

        wp_enqueue_script(
            'olo-lottie-player',
            OLO_LOTTIE_URL . 'build/player.js',
            [],
            OLO_LOTTIE_VERSION,
            true
        );
    }

    public function render_block($attributes) {
        $id = intval($attributes['animationId']);
        if (!$id) {
            return '<p>' . esc_html__('No animation selected', 'olo-lottie') . '</p>';
        }

        $json = get_post_meta($id, '_olo_lottie_json', true);
        if (!$json) {
            return '<p>' . esc_html__('Animation not found', 'olo-lottie') . '</p>';
        }

        $width = esc_attr($attributes['width']);
        $height = esc_attr($attributes['height']);
        $loop = $attributes['loop'] ? 'true' : 'false';
        $autoplay = $attributes['autoplay'] ? 'true' : 'false';

        return sprintf(
            '<div class="olo-lottie-player" data-animation="%s" data-loop="%s" data-autoplay="%s" style="width:%s;height:%s;"></div>',
            esc_attr($json),
            $loop,
            $autoplay,
            $width,
            $height
        );
    }
}
