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
            ],
        ]);

        register_rest_route($namespace, '/animations/(?P<id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_animation'],
                'permission_callback' => [$this, 'check_permission'],
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

    public function save_animation($request) {
        $params = $request->get_json_params();

        $post_id = wp_insert_post([
            'post_type' => 'olo_lottie',
            'post_title' => sanitize_text_field($params['title'] ?? 'Untitled'),
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        if (isset($params['lottie_json'])) {
            update_post_meta($post_id, '_olo_lottie_json', wp_slash(wp_json_encode($params['lottie_json'])));
        }

        if (isset($params['editor_state'])) {
            update_post_meta($post_id, '_olo_lottie_editor_state', wp_slash(wp_json_encode($params['editor_state'])));
        }

        update_post_meta($post_id, '_olo_lottie_width', intval($params['width'] ?? 800));
        update_post_meta($post_id, '_olo_lottie_height', intval($params['height'] ?? 600));
        update_post_meta($post_id, '_olo_lottie_fps', intval($params['fps'] ?? 30));
        update_post_meta($post_id, '_olo_lottie_duration', floatval($params['duration'] ?? 3));

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

        if (isset($params['lottie_json'])) {
            update_post_meta($post->ID, '_olo_lottie_json', wp_slash(wp_json_encode($params['lottie_json'])));
        }

        if (isset($params['editor_state'])) {
            update_post_meta($post->ID, '_olo_lottie_editor_state', wp_slash(wp_json_encode($params['editor_state'])));
        }

        if (isset($params['width'])) {
            update_post_meta($post->ID, '_olo_lottie_width', intval($params['width']));
        }
        if (isset($params['height'])) {
            update_post_meta($post->ID, '_olo_lottie_height', intval($params['height']));
        }
        if (isset($params['fps'])) {
            update_post_meta($post->ID, '_olo_lottie_fps', intval($params['fps']));
        }
        if (isset($params['duration'])) {
            update_post_meta($post->ID, '_olo_lottie_duration', floatval($params['duration']));
        }

        return rest_ensure_response($this->format_animation(get_post($post->ID)));
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
