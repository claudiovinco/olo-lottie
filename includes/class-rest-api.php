<?php

if (!defined('ABSPATH')) {
    exit;
}

class Olo_Lottie_Rest_Api {

    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public function register_routes() {
        $namespace = 'olo-lottie/v1';

        register_rest_route($namespace, '/animations', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_animations'],
                'permission_callback' => [$this, 'check_permission'],
            ],
            [
                'methods' => 'POST',
                'callback' => [$this, 'save_animation'],
                'permission_callback' => [$this, 'check_permission'],
                'args' => $this->get_save_args(),
            ],
        ]);

        register_rest_route($namespace, '/animations/(?P<id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_animation'],
                'permission_callback' => [$this, 'check_permission'],
                'args' => [
                    'id' => ['validate_callback' => function ($param) { return is_numeric($param); }],
                ],
            ],
            [
                'methods' => 'PUT',
                'callback' => [$this, 'update_animation'],
                'permission_callback' => [$this, 'check_permission'],
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$this, 'delete_animation'],
                'permission_callback' => [$this, 'check_permission'],
            ],
        ]);

        // Public endpoint for frontend player (no auth required)
        register_rest_route($namespace, '/public/animations/(?P<id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_public_animation'],
                'permission_callback' => '__return_true',
                'args' => [
                    'id' => ['validate_callback' => function ($param) { return is_numeric($param); }],
                ],
            ],
        ]);
    }

    private function get_save_args() {
        return [
            'title' => [
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'width' => [
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'validate_callback' => function ($v) { return $v >= 1 && $v <= 10000; },
            ],
            'height' => [
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'validate_callback' => function ($v) { return $v >= 1 && $v <= 10000; },
            ],
            'fps' => [
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'validate_callback' => function ($v) { return $v >= 1 && $v <= 120; },
            ],
            'duration' => [
                'type' => 'number',
                'validate_callback' => function ($v) { return $v >= 0.1 && $v <= 300; },
            ],
        ];
    }

    public function check_permission() {
        return current_user_can('manage_options');
    }

    public function get_animations($request) {
        $posts = get_posts([
            'post_type' => 'olo_lottie',
            'posts_per_page' => -1,
            'orderby' => 'modified',
            'order' => 'DESC',
        ]);

        $animations = [];
        foreach ($posts as $post) {
            $animations[] = $this->format_animation($post);
        }

        return rest_ensure_response($animations);
    }

    public function get_animation($request) {
        $post = get_post($request['id']);
        if (!$post || $post->post_type !== 'olo_lottie') {
            return new WP_Error('not_found', 'Animation not found', ['status' => 404]);
        }

        return rest_ensure_response($this->format_animation($post));
    }

    public function get_public_animation($request) {
        $post = get_post($request['id']);
        if (!$post || $post->post_type !== 'olo_lottie') {
            return new WP_Error('not_found', 'Animation not found', ['status' => 404]);
        }

        $lottie_json = get_post_meta($post->ID, '_olo_lottie_json', true);

        $response = rest_ensure_response([
            'id' => $post->ID,
            'lottie_json' => $lottie_json ? json_decode($lottie_json, true) : null,
            'width' => (int) get_post_meta($post->ID, '_olo_lottie_width', true) ?: 800,
            'height' => (int) get_post_meta($post->ID, '_olo_lottie_height', true) ?: 600,
        ]);

        // Cache for 1 hour
        $response->header('Cache-Control', 'public, max-age=3600');

        return $response;
    }

    public function save_animation($request) {
        $params = $request->get_json_params();

        // Validate JSON payload size
        $json_size = strlen(wp_json_encode($params));
        if ($json_size > 5 * 1024 * 1024) {
            return new WP_Error('payload_too_large', 'Animation data exceeds 5MB limit', ['status' => 413]);
        }

        $post_id = wp_insert_post([
            'post_type' => 'olo_lottie',
            'post_title' => sanitize_text_field($params['title'] ?? 'Untitled'),
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        $this->save_animation_meta($post_id, $params);

        return rest_ensure_response($this->format_animation(get_post($post_id)));
    }

    public function update_animation($request) {
        $post = get_post($request['id']);
        if (!$post || $post->post_type !== 'olo_lottie') {
            return new WP_Error('not_found', 'Animation not found', ['status' => 404]);
        }

        $params = $request->get_json_params();

        if (isset($params['title'])) {
            wp_update_post([
                'ID' => $post->ID,
                'post_title' => sanitize_text_field($params['title']),
            ]);
        }

        $this->save_animation_meta($post->ID, $params);

        return rest_ensure_response($this->format_animation(get_post($post->ID)));
    }

    private function save_animation_meta($post_id, $params) {
        if (isset($params['lottie_json'])) {
            update_post_meta($post_id, '_olo_lottie_json', wp_slash(wp_json_encode($params['lottie_json'])));
        }

        if (isset($params['editor_state'])) {
            update_post_meta($post_id, '_olo_lottie_editor_state', wp_slash(wp_json_encode($params['editor_state'])));
        }

        if (isset($params['width'])) {
            update_post_meta($post_id, '_olo_lottie_width', min(10000, max(1, intval($params['width']))));
        }
        if (isset($params['height'])) {
            update_post_meta($post_id, '_olo_lottie_height', min(10000, max(1, intval($params['height']))));
        }
        if (isset($params['fps'])) {
            update_post_meta($post_id, '_olo_lottie_fps', min(120, max(1, intval($params['fps']))));
        }
        if (isset($params['duration'])) {
            update_post_meta($post_id, '_olo_lottie_duration', min(300, max(0.1, floatval($params['duration']))));
        }
    }

    public function delete_animation($request) {
        $post = get_post($request['id']);
        if (!$post || $post->post_type !== 'olo_lottie') {
            return new WP_Error('not_found', 'Animation not found', ['status' => 404]);
        }

        wp_delete_post($post->ID, true);
        return rest_ensure_response(['deleted' => true]);
    }

    private function format_animation($post) {
        $lottie_json = get_post_meta($post->ID, '_olo_lottie_json', true);
        $editor_state = get_post_meta($post->ID, '_olo_lottie_editor_state', true);

        return [
            'id' => $post->ID,
            'title' => $post->post_title,
            'lottie_json' => $lottie_json ? json_decode($lottie_json, true) : null,
            'editor_state' => $editor_state ? json_decode($editor_state, true) : null,
            'width' => (int) get_post_meta($post->ID, '_olo_lottie_width', true) ?: 800,
            'height' => (int) get_post_meta($post->ID, '_olo_lottie_height', true) ?: 600,
            'fps' => (int) get_post_meta($post->ID, '_olo_lottie_fps', true) ?: 30,
            'duration' => (float) get_post_meta($post->ID, '_olo_lottie_duration', true) ?: 3,
            'modified' => $post->post_modified,
        ];
    }
}
