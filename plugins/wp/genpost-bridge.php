<?php
/**
 * Plugin Name: GenPost Bridge
 * Plugin URI: https://genpost.ai
 * Description: WordPress integration plugin for GenPost automated article generation and publishing
 * Version: 2.0.0
 * Author: GenPost
 * License: GPL v2 or later
 * Text Domain: genpost-bridge
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('GENPOST_BRIDGE_VERSION', '2.0.0');
define('GENPOST_BRIDGE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GENPOST_BRIDGE_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main GenPost Bridge class
 */
class GenPostBridge {
    
    private $api_key;
    private $genpost_domain;
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('rest_api_init', array($this, 'register_api_endpoints'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Load settings
        $this->api_key = get_option('genpost_api_key');
        $this->genpost_domain = get_option('genpost_domain', 'genpost.ai');
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        load_plugin_textdomain('genpost-bridge', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Register REST API endpoints
     */
    public function register_api_endpoints() {
        // Publish article endpoint
        register_rest_route('genpost/v2', '/publish', array(
            'methods' => 'POST',
            'callback' => array($this, 'publish_article'),
            'permission_callback' => array($this, 'check_api_permission'),
            'args' => array(
                'title' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'content' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'category_slug' => array(
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'featured_image_url' => array(
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'esc_url_raw'
                ),
                'status' => array(
                    'required' => false,
                    'type' => 'string',
                    'default' => 'draft',
                    'enum' => array('publish', 'draft')
                ),
                'meta_description' => array(
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'tags' => array(
                    'required' => false,
                    'type' => 'array'
                )
            )
        ));
        
        // Get site info endpoint
        register_rest_route('genpost/v2', '/site-info', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_site_info'),
            'permission_callback' => array($this, 'check_api_permission')
        ));
        
        // Test connection endpoint
        register_rest_route('genpost/v2', '/test', array(
            'methods' => 'GET',
            'callback' => array($this, 'test_connection'),
            'permission_callback' => array($this, 'check_api_permission')
        ));
    }
    
    /**
     * Check API permission using API key
     */
    public function check_api_permission($request) {
        $auth_header = $request->get_header('authorization');
        
        if (!$auth_header) {
            return new WP_Error('no_auth', 'Authorization header required', array('status' => 401));
        }
        
        // Extract bearer token
        if (strpos($auth_header, 'Bearer ') === 0) {
            $token = substr($auth_header, 7);
        } else {
            return new WP_Error('invalid_auth', 'Invalid authorization format', array('status' => 401));
        }
        
        // Validate API key
        if ($token !== $this->api_key || empty($this->api_key)) {
            return new WP_Error('invalid_key', 'Invalid API key', array('status' => 403));
        }
        
        return true;
    }
    
    /**
     * Publish article endpoint handler
     */
    public function publish_article($request) {
        try {
            $params = $request->get_params();
            
            // Create post data
            $post_data = array(
                'post_title' => $params['title'],
                'post_content' => $this->process_markdown_content($params['content']),
                'post_status' => $params['status'],
                'post_type' => 'post',
                'meta_input' => array(
                    'genpost_generated' => true,
                    'genpost_created_at' => current_time('mysql', true)
                )
            );
            
            // Add meta description if provided
            if (!empty($params['meta_description'])) {
                $post_data['meta_input']['_yoast_wpseo_metadesc'] = $params['meta_description'];
                $post_data['meta_input']['_aioseop_description'] = $params['meta_description'];
            }
            
            // Handle category
            if (!empty($params['category_slug'])) {
                $category = get_category_by_slug($params['category_slug']);
                if ($category) {
                    $post_data['post_category'] = array($category->term_id);
                } else {
                    // Create category if it doesn't exist
                    $new_category = wp_insert_term($params['category_slug'], 'category', array(
                        'slug' => $params['category_slug']
                    ));
                    if (!is_wp_error($new_category)) {
                        $post_data['post_category'] = array($new_category['term_id']);
                    }
                }
            }
            
            // Insert the post
            $post_id = wp_insert_post($post_data, true);
            
            if (is_wp_error($post_id)) {
                return new WP_Error('post_creation_failed', $post_id->get_error_message(), array('status' => 500));
            }
            
            // Handle tags
            if (!empty($params['tags']) && is_array($params['tags'])) {
                wp_set_post_tags($post_id, $params['tags']);
            }
            
            // Handle featured image
            if (!empty($params['featured_image_url'])) {
                $this->set_featured_image_from_url($post_id, $params['featured_image_url']);
            }
            
            // Get the post URL
            $post_url = get_permalink($post_id);
            
            return new WP_REST_Response(array(
                'success' => true,
                'post_id' => $post_id,
                'post_url' => $post_url,
                'edit_url' => admin_url('post.php?post=' . $post_id . '&action=edit'),
                'status' => $params['status']
            ), 201);
            
        } catch (Exception $e) {
            return new WP_Error('server_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Get site info endpoint handler
     */
    public function get_site_info($request) {
        // Get all categories
        $categories = get_categories(array(
            'hide_empty' => false,
            'orderby' => 'name'
        ));
        
        $category_list = array();
        foreach ($categories as $category) {
            $category_list[] = array(
                'id' => $category->term_id,
                'name' => $category->name,
                'slug' => $category->slug,
                'count' => $category->count
            );
        }
        
        // Get site capabilities
        $capabilities = array(
            'can_publish' => current_user_can('publish_posts'),
            'can_upload_files' => current_user_can('upload_files'),
            'featured_images_supported' => current_theme_supports('post-thumbnails')
        );
        
        return new WP_REST_Response(array(
            'site_name' => get_bloginfo('name'),
            'site_url' => get_site_url(),
            'admin_email' => get_option('admin_email'),
            'wordpress_version' => get_bloginfo('version'),
            'genpost_bridge_version' => GENPOST_BRIDGE_VERSION,
            'categories' => $category_list,
            'capabilities' => $capabilities,
            'timezone' => get_option('timezone_string') ?: 'UTC',
            'date_format' => get_option('date_format'),
            'time_format' => get_option('time_format')
        ), 200);
    }
    
    /**
     * Test connection endpoint handler
     */
    public function test_connection($request) {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'GenPost Bridge connection successful',
            'timestamp' => current_time('mysql', true),
            'server_time' => date('Y-m-d H:i:s'),
            'site_url' => get_site_url()
        ), 200);
    }
    
    /**
     * Process markdown content to HTML
     */
    private function process_markdown_content($content) {
        // Basic Markdown to HTML conversion
        // In production, you might want to use a proper Markdown parser
        
        // Convert headers
        $content = preg_replace('/^### (.*?)$/m', '<h3>$1</h3>', $content);
        $content = preg_replace('/^## (.*?)$/m', '<h2>$1</h2>', $content);
        $content = preg_replace('/^# (.*?)$/m', '<h1>$1</h1>', $content);
        
        // Convert paragraphs
        $content = preg_replace('/\n\n/', '</p><p>', $content);
        $content = '<p>' . $content . '</p>';
        
        // Convert line breaks
        $content = str_replace("\n", '<br>', $content);
        
        // Convert bold and italic
        $content = preg_replace('/\*\*(.*?)\*\*/', '<strong>$1</strong>', $content);
        $content = preg_replace('/\*(.*?)\*/', '<em>$1</em>', $content);
        
        // Convert links
        $content = preg_replace('/\[([^\]]+)\]\(([^\)]+)\)/', '<a href="$2">$1</a>', $content);
        
        // Convert lists
        $content = preg_replace('/^[\-\*] (.*)$/m', '<li>$1</li>', $content);
        $content = preg_replace('/(<li>.*<\/li>)/s', '<ul>$1</ul>', $content);
        
        return $content;
    }
    
    /**
     * Set featured image from URL
     */
    private function set_featured_image_from_url($post_id, $image_url) {
        try {
            // Download image
            $image_data = file_get_contents($image_url);
            if (!$image_data) {
                return false;
            }
            
            // Get image info
            $filename = basename($image_url);
            $upload_dir = wp_upload_dir();
            
            // Save image
            if (wp_mkdir_p($upload_dir['path'])) {
                $file = $upload_dir['path'] . '/' . $filename;
            } else {
                $file = $upload_dir['basedir'] . '/' . $filename;
            }
            
            file_put_contents($file, $image_data);
            
            // Create attachment
            $wp_filetype = wp_check_filetype($filename, null);
            $attachment = array(
                'post_mime_type' => $wp_filetype['type'],
                'post_title' => preg_replace('/\.[^.]+$/', '', $filename),
                'post_content' => '',
                'post_status' => 'inherit'
            );
            
            $attach_id = wp_insert_attachment($attachment, $file, $post_id);
            
            // Generate attachment metadata
            require_once(ABSPATH . 'wp-admin/includes/image.php');
            $attach_data = wp_generate_attachment_metadata($attach_id, $file);
            wp_update_attachment_metadata($attach_id, $attach_data);
            
            // Set as featured image
            set_post_thumbnail($post_id, $attach_id);
            
            return $attach_id;
            
        } catch (Exception $e) {
            error_log('GenPost Bridge: Failed to set featured image - ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'GenPost Bridge Settings',
            'GenPost Bridge',
            'manage_options',
            'genpost-bridge',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('genpost_bridge_settings', 'genpost_api_key', array(
            'sanitize_callback' => 'sanitize_text_field'
        ));
        
        register_setting('genpost_bridge_settings', 'genpost_domain', array(
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'genpost.ai'
        ));
        
        register_setting('genpost_bridge_settings', 'genpost_auto_publish', array(
            'sanitize_callback' => 'rest_sanitize_boolean',
            'default' => false
        ));
    }
    
    /**
     * Admin settings page
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>GenPost Bridge Settings</h1>
            
            <?php if (isset($_GET['settings-updated'])): ?>
                <div class="notice notice-success is-dismissible">
                    <p>Settings saved successfully!</p>
                </div>
            <?php endif; ?>
            
            <form method="post" action="options.php">
                <?php settings_fields('genpost_bridge_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">API Key</th>
                        <td>
                            <input type="password" name="genpost_api_key" value="<?php echo esc_attr($this->api_key); ?>" class="regular-text" />
                            <p class="description">Enter your GenPost API key for secure communication.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">GenPost Domain</th>
                        <td>
                            <input type="text" name="genpost_domain" value="<?php echo esc_attr($this->genpost_domain); ?>" class="regular-text" />
                            <p class="description">Your GenPost domain (usually genpost.ai).</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Auto Publish</th>
                        <td>
                            <input type="checkbox" name="genpost_auto_publish" value="1" <?php checked(get_option('genpost_auto_publish'), 1); ?> />
                            <label>Automatically publish articles (recommended: keep unchecked for review first)</label>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <hr>
            
            <h2>Connection Test</h2>
            <p>Test the connection between GenPost and your WordPress site:</p>
            
            <div id="genpost-test-result"></div>
            
            <button type="button" id="genpost-test-btn" class="button button-secondary">Test Connection</button>
            
            <hr>
            
            <h2>Site Information</h2>
            <table class="widefat">
                <tr>
                    <td><strong>Site URL:</strong></td>
                    <td><?php echo esc_html(get_site_url()); ?></td>
                </tr>
                <tr>
                    <td><strong>REST API URL:</strong></td>
                    <td><?php echo esc_html(get_rest_url(null, 'genpost/v2')); ?></td>
                </tr>
                <tr>
                    <td><strong>WordPress Version:</strong></td>
                    <td><?php echo esc_html(get_bloginfo('version')); ?></td>
                </tr>
                <tr>
                    <td><strong>Plugin Version:</strong></td>
                    <td><?php echo esc_html(GENPOST_BRIDGE_VERSION); ?></td>
                </tr>
            </table>
        </div>
        
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            const testBtn = document.getElementById('genpost-test-btn');
            const testResult = document.getElementById('genpost-test-result');
            
            testBtn.addEventListener('click', function() {
                testBtn.disabled = true;
                testBtn.textContent = 'Testing...';
                
                const apiKey = document.querySelector('input[name="genpost_api_key"]').value;
                
                if (!apiKey) {
                    testResult.innerHTML = '<div class="notice notice-error"><p>Please enter an API key first.</p></div>';
                    testBtn.disabled = false;
                    testBtn.textContent = 'Test Connection';
                    return;
                }
                
                fetch('<?php echo get_rest_url(null, "genpost/v2/test"); ?>', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + apiKey,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        testResult.innerHTML = '<div class="notice notice-success"><p>✅ Connection successful! GenPost can communicate with your WordPress site.</p></div>';
                    } else {
                        testResult.innerHTML = '<div class="notice notice-error"><p>❌ Connection failed: ' + (data.message || 'Unknown error') + '</p></div>';
                    }
                })
                .catch(error => {
                    testResult.innerHTML = '<div class="notice notice-error"><p>❌ Connection failed: ' + error.message + '</p></div>';
                })
                .finally(() => {
                    testBtn.disabled = false;
                    testBtn.textContent = 'Test Connection';
                });
            });
        });
        </script>
        <?php
    }
}

// Initialize the plugin
new GenPostBridge();

/**
 * Activation hook
 */
register_activation_hook(__FILE__, function() {
    // Generate default API key on activation
    if (!get_option('genpost_api_key')) {
        $api_key = wp_generate_password(32, false);
        add_option('genpost_api_key', $api_key);
        
        // Show admin notice with API key
        add_option('genpost_show_api_key_notice', $api_key);
    }
});

/**
 * Show API key notice on activation
 */
add_action('admin_notices', function() {
    $api_key = get_option('genpost_show_api_key_notice');
    if ($api_key) {
        ?>
        <div class="notice notice-info is-dismissible">
            <p><strong>GenPost Bridge Activated!</strong></p>
            <p>Your API Key: <code style="background: #f0f0f0; padding: 2px 4px;"><?php echo esc_html($api_key); ?></code></p>
            <p>Please copy this key and add it to your GenPost account settings.</p>
            <p><a href="<?php echo admin_url('options-general.php?page=genpost-bridge'); ?>">Go to Settings</a></p>
        </div>
        <?php
        
        // Remove the notice after showing
        delete_option('genpost_show_api_key_notice');
    }
});

/**
 * Add custom post meta box for GenPost generated posts
 */
add_action('add_meta_boxes', function() {
    add_meta_box(
        'genpost_info',
        'GenPost Information',
        function($post) {
            $is_generated = get_post_meta($post->ID, 'genpost_generated', true);
            $created_at = get_post_meta($post->ID, 'genpost_created_at', true);
            
            if ($is_generated) {
                echo '<p>✅ This post was generated by GenPost</p>';
                if ($created_at) {
                    echo '<p><strong>Generated at:</strong> ' . esc_html($created_at) . '</p>';
                }
            } else {
                echo '<p>This post was not generated by GenPost</p>';
            }
        },
        'post',
        'side',
        'low'
    );
});
?>