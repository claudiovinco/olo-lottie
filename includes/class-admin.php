<?php

if (!defined('ABSPATH')) {
    exit;
}

class Olo_Lottie_Admin {

    public function __construct() {
        add_action('admin_menu', [$this, 'add_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('admin_head', [$this, 'editor_page_overflow_fix']);
        add_filter('script_loader_tag', [$this, 'add_module_type'], 10, 3);
    }

    public function add_menu() {
        add_menu_page(
            __('Olo Lottie Editor', 'olo-lottie'),
            __('Olo Lottie', 'olo-lottie'),
            'manage_options',
            'olo-lottie-editor',
            [$this, 'render_editor_page'],
            OLO_LOTTIE_URL . 'assets/img/logo-20.png',
            30
        );

        add_submenu_page(
            'olo-lottie-editor',
            __('Animations', 'olo-lottie'),
            __('Animations', 'olo-lottie'),
            'manage_options',
            'olo-lottie-list',
            [$this, 'render_list_page']
        );
    }

    public function enqueue_scripts($hook) {
        $localize_data = [
            'restUrl' => rest_url('olo-lottie/v1/'),
            'nonce' => wp_create_nonce('wp_rest'),
            'pluginUrl' => OLO_LOTTIE_URL,
            'animationId' => isset($_GET['id']) ? intval($_GET['id']) : 0,
        ];

        $version = defined('WP_DEBUG') && WP_DEBUG ? time() : OLO_LOTTIE_VERSION;

        if ($hook === 'toplevel_page_olo-lottie-editor') {
            wp_enqueue_style(
                'olo-lottie-editor',
                OLO_LOTTIE_URL . 'assets/css/editor.css',
                [],
                $version
            );

            wp_enqueue_script(
                'olo-lottie-editor',
                OLO_LOTTIE_URL . 'build/editor.js',
                [],
                $version,
                true
            );

            wp_localize_script('olo-lottie-editor', 'oloLottie', $localize_data);
            return;
        }

        if ($hook === 'olo-lottie_page_olo-lottie-list') {
            wp_enqueue_script(
                'olo-lottie-list',
                OLO_LOTTIE_URL . 'build/list.js',
                [],
                OLO_LOTTIE_VERSION,
                true
            );

            wp_localize_script('olo-lottie-list', 'oloLottie', $localize_data);
            return;
        }
    }

    public function editor_page_overflow_fix() {
        $screen = get_current_screen();
        if (!$screen || $screen->id !== 'toplevel_page_olo-lottie-editor') {
            return;
        }
        echo '<style>
            html, body, #wpwrap { overflow: hidden !important; height: 100vh !important; }
            #wpcontent { overflow: hidden !important; padding: 0 !important; }
            #wpbody { overflow: hidden !important; padding: 0 !important; margin: 0 !important; }
            #wpbody-content { overflow: hidden !important; padding: 0 !important; margin: 0 !important; float: none !important; }
            #wpcontent, #wpbody, #wpbody-content { height: calc(100vh - 32px) !important; }
            #wpfooter { display: none !important; }
            .olo-lottie-wrap { margin: 0 !important; }
        </style>';
    }

    public function render_editor_page() {
        echo '<div id="olo-lottie-editor" class="olo-lottie-wrap"></div>';
    }

    public function render_list_page() {
        echo '<div id="olo-lottie-list" class="olo-lottie-wrap"></div>';
    }

    public function add_module_type($tag, $handle, $src) {
        if (in_array($handle, ['olo-lottie-editor', 'olo-lottie-list', 'olo-lottie-block', 'olo-lottie-player'], true)) {
            $tag = str_replace(' src=', ' type="module" src=', $tag);
        }
        return $tag;
    }
}
