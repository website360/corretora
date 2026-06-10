/**
 * Gera o plugin WordPress de captura de leads (PHP) já configurado com a URL
 * da API e a chave da empresa, e empacota num .zip instalável pelo WordPress.
 * Server-only (usa Buffer).
 */

/** Slug do plugin (pasta + arquivo dentro do zip). */
export const WP_PLUGIN_SLUG = "crm-leads-connector";

const PLUGIN_PHP = String.raw`<?php
/**
 * Plugin Name: __APP_NAME__ — Conector de Leads
 * Description: Captura leads de formulários do WordPress (Contact Form 7, WPForms, Gravity Forms, Elementor Forms e formulários HTML genéricos) e envia para o __APP_NAME__.
 * Version:     1.0.0
 * Author:      __APP_NAME__
 * License:     GPL-2.0+
 * Text Domain: crm-leads-connector
 */

if (!defined('ABSPATH')) {
    exit;
}

register_activation_hook(__FILE__, 'crmlead_activate');
function crmlead_activate() {
    if (!get_option('crmlead_api_url')) {
        update_option('crmlead_api_url', '__API_URL__');
    }
    if (!get_option('crmlead_api_key')) {
        update_option('crmlead_api_key', '__API_KEY__');
    }
    if (get_option('crmlead_default_source') === false) {
        update_option('crmlead_default_source', 'wordpress');
    }
}

// ============================================================
// Configurações — página de admin
// ============================================================

add_action('admin_menu', 'crmlead_admin_menu');
add_action('admin_init', 'crmlead_register_settings');

function crmlead_admin_menu() {
    add_options_page('__APP_NAME__ — Leads', '__APP_NAME__', 'manage_options', 'crmlead-connector', 'crmlead_settings_page');
}

function crmlead_register_settings() {
    register_setting('crmlead_settings', 'crmlead_api_url', ['sanitize_callback' => 'esc_url_raw', 'default' => '__API_URL__']);
    register_setting('crmlead_settings', 'crmlead_api_key', ['sanitize_callback' => 'sanitize_text_field', 'default' => '__API_KEY__']);
    register_setting('crmlead_settings', 'crmlead_default_source', ['sanitize_callback' => 'sanitize_text_field', 'default' => 'wordpress']);
    register_setting('crmlead_settings', 'crmlead_field_map', ['sanitize_callback' => 'crmlead_sanitize_field_map', 'default' => []]);
    register_setting('crmlead_settings', 'crmlead_custom_fields', ['sanitize_callback' => 'crmlead_sanitize_custom_fields', 'default' => []]);
    register_setting('crmlead_settings', 'crmlead_enable_log', ['sanitize_callback' => 'absint', 'default' => 0]);
}

function crmlead_sanitize_field_map($input) {
    if (!is_array($input)) return [];
    $clean = [];
    foreach ($input as $key => $val) {
        $k = sanitize_text_field($key);
        $v = sanitize_text_field($val);
        if (!empty($k)) $clean[$k] = $v;
    }
    return $clean;
}

function crmlead_sanitize_custom_fields($input) {
    if (!is_array($input)) return [];
    $clean = [];
    foreach ($input as $item) {
        $label = sanitize_text_field($item['label'] ?? '');
        $field = sanitize_text_field($item['field'] ?? '');
        if (!empty($label) && !empty($field)) {
            $clean[] = ['label' => $label, 'field' => $field];
        }
    }
    return $clean;
}

function crmlead_settings_page() {
    $api_url        = get_option('crmlead_api_url', '');
    $api_key        = get_option('crmlead_api_key', '');
    $default_source = get_option('crmlead_default_source', 'wordpress');
    $field_map      = get_option('crmlead_field_map', []);
    $custom_fields  = get_option('crmlead_custom_fields', []);
    $enable_log     = get_option('crmlead_enable_log', 0);
    $logs           = get_option('crmlead_logs', []);

    $defaults = ['name' => '', 'email' => '', 'phone' => '', 'notes' => ''];
    $map = wp_parse_args($field_map, $defaults);
    ?>
    <div class="wrap">
        <h1>__APP_NAME__ — Conector de Leads</h1>
        <p class="description">Capture os leads dos formulários do seu site direto no funil do __APP_NAME__.</p>

        <div style="margin:12px 0;padding:12px 14px;border:1px solid #c3e6cb;background:#f1fbf4;border-radius:8px;">
            <strong>Na maioria dos casos, funciona automaticamente.</strong>
            O plugin detecta sozinho os campos de <strong>nome</strong>, <strong>e-mail</strong> e
            <strong>telefone</strong> dos formulários. O mapeamento abaixo é <em>opcional</em> — use
            só se algum campo não for reconhecido. Dica: envie seu formulário uma vez e veja os
            <strong>campos detectados</strong> no fim desta página.
        </div>

        <form method="post" action="options.php">
            <?php settings_fields('crmlead_settings'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="crmlead_api_url">URL da API</label></th>
                    <td><input type="url" id="crmlead_api_url" name="crmlead_api_url" value="<?php echo esc_attr($api_url); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="crmlead_api_key">Chave de API</label></th>
                    <td><input type="text" id="crmlead_api_key" name="crmlead_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="crmlead_default_source">Origem padrão</label></th>
                    <td><input type="text" id="crmlead_default_source" name="crmlead_default_source" value="<?php echo esc_attr($default_source); ?>" class="regular-text" placeholder="wordpress" /></td>
                </tr>
                <tr>
                    <th scope="row">Campos principais</th>
                    <td>
                        <p class="description" style="margin-bottom:10px;">Mapeie os campos do formulário. Deixe em branco para detecção automática. <strong>Nome</strong> e <strong>E-mail</strong> são obrigatórios.</p>
                        <?php $labels = ['name' => 'Nome', 'email' => 'E-mail', 'phone' => 'Telefone', 'notes' => 'Notas'];
                        foreach ($map as $crm_field => $wp_field) : ?>
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                            <label style="width:90px;font-weight:600;"><?php echo esc_html($labels[$crm_field] ?? $crm_field); ?></label>
                            <input type="text" name="crmlead_field_map[<?php echo esc_attr($crm_field); ?>]" value="<?php echo esc_attr($wp_field); ?>" placeholder="campo do formulário" style="width:220px;" />
                        </div>
                        <?php endforeach; ?>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Campos personalizados</th>
                    <td>
                        <p class="description" style="margin-bottom:10px;">Campos extras do formulário (mensagem, empresa, cidade...). Vão para as notas do lead.</p>
                        <div id="crmlead-custom-fields">
                            <?php foreach ($custom_fields as $i => $cf) : ?>
                            <div class="crmlead-custom-row" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                                <input type="text" name="crmlead_custom_fields[<?php echo $i; ?>][label]" value="<?php echo esc_attr($cf['label']); ?>" placeholder="Rótulo (ex: mensagem)" style="width:180px;" />
                                <input type="text" name="crmlead_custom_fields[<?php echo $i; ?>][field]" value="<?php echo esc_attr($cf['field']); ?>" placeholder="Campo do formulário" style="width:220px;" />
                                <button type="button" class="button crmlead-remove-row">Remover</button>
                            </div>
                            <?php endforeach; ?>
                        </div>
                        <button type="button" id="crmlead-add-field" class="button button-secondary" style="margin-top:4px;">+ Adicionar campo</button>
                    </td>
                </tr>
            </table>

            <?php $last_fields = get_option('crmlead_last_fields', []); ?>
            <h2 style="margin-top:8px;">Campos detectados</h2>
            <?php if (!empty($last_fields)) : ?>
                <p class="description">Campos recebidos no último formulário enviado. Copie o nome para o mapeamento acima, se precisar.</p>
                <p>
                    <?php foreach ($last_fields as $lf) : ?>
                        <code style="display:inline-block;margin:2px 6px 2px 0;padding:3px 7px;background:#f0f0f1;border-radius:4px;"><?php echo esc_html($lf); ?></code>
                    <?php endforeach; ?>
                </p>
            <?php else : ?>
                <p class="description">Ainda nenhum envio recebido. Envie seu formulário uma vez (ou clique em "Enviar lead de teste" abaixo) e os campos detectados aparecem aqui.</p>
            <?php endif; ?>

            <?php submit_button('Salvar configurações'); ?>
        </form>

        <script>
        (function() {
            var container = document.getElementById('crmlead-custom-fields');
            var addBtn = document.getElementById('crmlead-add-field');
            var counter = <?php echo max(count($custom_fields), 0); ?>;
            addBtn.addEventListener('click', function() {
                var row = document.createElement('div');
                row.className = 'crmlead-custom-row';
                row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
                row.innerHTML =
                    '<input type="text" name="crmlead_custom_fields[' + counter + '][label]" placeholder="Rótulo (ex: mensagem)" style="width:180px;" />' +
                    '<input type="text" name="crmlead_custom_fields[' + counter + '][field]" placeholder="Campo do formulário" style="width:220px;" />' +
                    '<button type="button" class="button crmlead-remove-row">Remover</button>';
                container.appendChild(row);
                counter++;
            });
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('crmlead-remove-row')) e.target.parentElement.remove();
            });
        })();
        </script>

        <hr />
        <h2>Testar conexão</h2>
        <p>
            <button type="button" id="crmlead-test-btn" class="button button-secondary">Enviar lead de teste</button>
            <span id="crmlead-test-result" style="margin-left:10px;"></span>
        </p>
        <script>
        document.getElementById('crmlead-test-btn').addEventListener('click', function() {
            var btn = this, result = document.getElementById('crmlead-test-result');
            btn.disabled = true; result.textContent = 'Enviando...'; result.style.color = '#666';
            fetch(ajaxurl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'action=crmlead_test_connection&_wpnonce=<?php echo wp_create_nonce('crmlead_test'); ?>'
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success) { result.textContent = 'Conexão OK! Lead de teste enviado.'; result.style.color = '#1a7f37'; }
                else { result.textContent = 'Erro: ' + (data.data || 'Falha na conexão'); result.style.color = '#d63638'; }
                btn.disabled = false;
            })
            .catch(function(e) { result.textContent = 'Erro de rede: ' + e.message; result.style.color = '#d63638'; btn.disabled = false; });
        });
        </script>

        <?php if (!empty($logs)) : ?>
        <hr />
        <h2>Log de envios (últimos 20)</h2>
        <table class="widefat striped" style="max-width:820px;">
            <thead><tr><th>Data</th><th>Nome</th><th>E-mail</th><th>Origem</th><th>Status</th></tr></thead>
            <tbody>
                <?php foreach (array_reverse(array_slice($logs, -20)) as $log) : ?>
                <tr>
                    <td><?php echo esc_html($log['date']); ?></td>
                    <td><?php echo esc_html($log['name'] ?? '-'); ?></td>
                    <td><?php echo esc_html($log['email'] ?? '-'); ?></td>
                    <td><?php echo esc_html($log['source'] ?? '-'); ?></td>
                    <td style="color:<?php echo $log['success'] ? '#1a7f37' : '#d63638'; ?>"><?php echo $log['success'] ? 'OK' : esc_html($log['error'] ?? 'Erro'); ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php endif; ?>
    </div>
    <?php
}

// ============================================================
// AJAX — testar conexão
// ============================================================

add_action('wp_ajax_crmlead_test_connection', 'crmlead_test_connection');
function crmlead_test_connection() {
    check_ajax_referer('crmlead_test', '_wpnonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Sem permissão');
    $result = crmlead_send_lead([
        'name'  => 'Lead de teste',
        'email' => 'teste-' . time() . '@example.com',
        'phone' => '(00) 00000-0000',
    ], 'teste-conexao');
    if ($result['success']) wp_send_json_success();
    else wp_send_json_error($result['error']);
}

// ============================================================
// Core — enviar lead
// ============================================================

function crmlead_send_lead(array $data, string $source_override = '') {
    $api_url = get_option('crmlead_api_url', '');
    $api_key = get_option('crmlead_api_key', '');
    $default_source = get_option('crmlead_default_source', 'wordpress');

    if (empty($api_url)) return ['success' => false, 'error' => 'URL da API não configurada'];

    $payload = [
        'name'   => $data['name'] ?? '',
        'email'  => $data['email'] ?? '',
        'phone'  => $data['phone'] ?? '',
        'source' => $source_override ?: ($data['source'] ?? $default_source),
        'notes'  => $data['notes'] ?? '',
    ];
    $metadata = $data['metadata'] ?? [];
    if (!empty($metadata)) $payload['metadata'] = $metadata;

    if (empty($payload['name']) || empty($payload['email'])) return ['success' => false, 'error' => 'Nome e e-mail são obrigatórios'];

    $headers = ['Content-Type' => 'application/json'];
    if (!empty($api_key)) $headers['X-API-Key'] = $api_key;

    $response = wp_remote_post($api_url, ['headers' => $headers, 'body' => wp_json_encode($payload), 'timeout' => 15]);

    $success = false; $error = '';
    if (is_wp_error($response)) {
        $error = $response->get_error_message();
    } else {
        $code = wp_remote_retrieve_response_code($response);
        if ($code === 201) { $success = true; }
        else { $body = json_decode(wp_remote_retrieve_body($response), true); $error = $body['error'] ?? ('HTTP ' . $code); }
    }

    // Log sempre ativo (diagnóstico) — últimos 50 envios.
    $logs = get_option('crmlead_logs', []);
    $logs[] = ['date' => current_time('d/m/Y H:i:s'), 'name' => $payload['name'], 'email' => $payload['email'], 'source' => $payload['source'], 'success' => $success, 'error' => $error];
    update_option('crmlead_logs', array_slice($logs, -50));

    return ['success' => $success, 'error' => $error];
}

// ============================================================
// Mapeamento de campos
// ============================================================

function crmlead_map_fields(array $form_data): array {
    $field_map     = get_option('crmlead_field_map', []);
    $custom_fields = get_option('crmlead_custom_fields', []);
    $mapped = [];

    foreach (['name', 'email', 'phone', 'notes'] as $crm_field) {
        $wp_field = $field_map[$crm_field] ?? '';
        if (!empty($wp_field) && isset($form_data[$wp_field])) {
            $value = $form_data[$wp_field];
            $mapped[$crm_field] = is_array($value) ? implode(', ', $value) : $value;
        }
    }
    if (empty($mapped['name'])) {
        foreach (['your-name', 'name', 'nome', 'full-name', 'your_name', 'field_name', 'Nome'] as $try) {
            if (!empty($form_data[$try])) { $mapped['name'] = $form_data[$try]; break; }
        }
    }
    if (empty($mapped['email'])) {
        foreach (['your-email', 'email', 'e-mail', 'your_email', 'field_email', 'Email'] as $try) {
            if (!empty($form_data[$try])) { $mapped['email'] = $form_data[$try]; break; }
        }
    }
    if (empty($mapped['phone'])) {
        foreach (['your-phone', 'phone', 'telefone', 'tel', 'whatsapp', 'your_phone', 'field_phone', 'Telefone', 'Whatsapp'] as $try) {
            if (!empty($form_data[$try])) { $mapped['phone'] = $form_data[$try]; break; }
        }
    }

    $metadata = [];
    foreach ($custom_fields as $cf) {
        $label = $cf['label']; $field = $cf['field'];
        if (!empty($field) && isset($form_data[$field])) {
            $value = $form_data[$field];
            $metadata[$label] = is_array($value) ? implode(', ', $value) : $value;
        }
    }
    if (!empty($metadata)) $mapped['metadata'] = $metadata;

    // Guarda os nomes dos campos recebidos, para o admin ver e mapear depois.
    $seen = [];
    foreach ($form_data as $k => $val) {
        $k = (string) $k;
        if ($k === '' || $k[0] === '_') continue;
        $sv = is_array($val) ? implode(', ', $val) : (string) $val;
        if (trim($sv) !== '') $seen[] = $k;
    }
    if (!empty($seen)) {
        update_option('crmlead_last_fields', array_values(array_unique(array_slice($seen, 0, 60))));
    }

    return $mapped;
}

// ============================================================
// Integrações com plugins de formulário
// ============================================================

// Contact Form 7
add_action('wpcf7_before_send_mail', 'crmlead_handle_cf7', 10, 3);
function crmlead_handle_cf7($contact_form, &$abort, $submission) {
    $data = $submission->get_posted_data();
    $mapped = crmlead_map_fields($data);
    if (!empty($mapped['name']) && !empty($mapped['email'])) {
        crmlead_send_lead($mapped, 'cf7-' . sanitize_title($contact_form->title()));
    }
}

// WPForms
add_action('wpforms_process_complete', 'crmlead_handle_wpforms', 10, 4);
function crmlead_handle_wpforms($fields, $entry, $form_data, $entry_id) {
    $flat = [];
    foreach ($fields as $field) {
        $flat[$field['id']]   = $field['value'];
        $flat[$field['name']] = $field['value'];
        if (isset($field['name_slug'])) $flat[$field['name_slug']] = $field['value'];
    }
    $mapped = crmlead_map_fields($flat);
    if (empty($mapped['name']) || empty($mapped['email'])) {
        foreach ($fields as $field) {
            if ($field['type'] === 'name' && empty($mapped['name'])) $mapped['name'] = $field['value'];
            if ($field['type'] === 'email' && empty($mapped['email'])) $mapped['email'] = $field['value'];
            if ($field['type'] === 'phone' && empty($mapped['phone'])) $mapped['phone'] = $field['value'];
        }
    }
    if (!empty($mapped['name']) && !empty($mapped['email'])) {
        crmlead_send_lead($mapped, 'wpforms-' . sanitize_title($form_data['settings']['form_title'] ?? 'form'));
    }
}

// Gravity Forms
add_action('gform_after_submission', 'crmlead_handle_gravity', 10, 2);
function crmlead_handle_gravity($entry, $form) {
    $flat = [];
    foreach ($form['fields'] as $field) {
        $id = $field->id;
        $label = strtolower(sanitize_title($field->label));
        $value = rgar($entry, $id);
        if ($field->type === 'name') {
            $parts = [];
            foreach ($field->inputs as $input) {
                $v = rgar($entry, (string) $input['id']);
                if ($v) $parts[] = $v;
            }
            $value = implode(' ', $parts);
        }
        $flat[(string) $id] = $value;
        $flat[$label] = $value;
    }
    $mapped = crmlead_map_fields($flat);
    if (!empty($mapped['name']) && !empty($mapped['email'])) {
        crmlead_send_lead($mapped, 'gforms-' . sanitize_title($form['title'] ?? 'form'));
    }
}

// Elementor Forms
add_action('elementor_pro/forms/new_record', 'crmlead_handle_elementor', 10, 2);
function crmlead_handle_elementor($record, $handler) {
    $raw = $record->get('fields');
    $flat = [];
    foreach ($raw as $field) {
        $flat[$field['id']]    = $field['value'];
        $flat[$field['title']] = $field['value'];
    }
    $mapped = crmlead_map_fields($flat);
    if (empty($mapped['name']) || empty($mapped['email'])) {
        foreach ($raw as $field) {
            if ($field['type'] === 'text' && empty($mapped['name']) && stripos($field['title'], 'nom') !== false) $mapped['name'] = $field['value'];
            if ($field['type'] === 'email' && empty($mapped['email'])) $mapped['email'] = $field['value'];
            if ($field['type'] === 'tel' && empty($mapped['phone'])) $mapped['phone'] = $field['value'];
        }
    }
    if (!empty($mapped['name']) && !empty($mapped['email'])) {
        $form_name = $record->get_form_settings('form_name') ?? 'form';
        crmlead_send_lead($mapped, 'elementor-' . sanitize_title($form_name));
    }
}

// Formulários HTML genéricos (classe crm-lead-capture ou data-crm-lead="true")
add_action('wp_ajax_crmlead_generic_form', 'crmlead_handle_generic_form');
add_action('wp_ajax_nopriv_crmlead_generic_form', 'crmlead_handle_generic_form');
function crmlead_handle_generic_form() {
    if (!isset($_POST['_crmlead_nonce']) || !wp_verify_nonce($_POST['_crmlead_nonce'], 'crmlead_generic')) {
        wp_send_json_error('Nonce inválido');
    }
    $data = wp_unslash($_POST);
    $mapped = crmlead_map_fields($data);
    if (empty($mapped['name']) || empty($mapped['email'])) wp_send_json_error('Nome e e-mail são obrigatórios');

    $page_url = isset($_POST['_crmlead_page']) ? sanitize_url($_POST['_crmlead_page']) : '';
    $source = 'site';
    if ($page_url) {
        $path = wp_parse_url($page_url, PHP_URL_PATH);
        $source = 'site-' . sanitize_title(trim($path, '/') ?: 'home');
    }
    $result = crmlead_send_lead($mapped, $source);
    if ($result['success']) wp_send_json_success();
    else wp_send_json_error($result['error']);
}

add_action('wp_footer', 'crmlead_frontend_scripts');
function crmlead_frontend_scripts() {
    if (empty(get_option('crmlead_api_url', ''))) return;
    ?>
    <script>
    (function() {
        var ajaxUrl = '<?php echo esc_url(admin_url("admin-ajax.php")); ?>';
        var NONCE = '<?php echo wp_create_nonce("crmlead_generic"); ?>';
        var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        function val(el) { return el && el.value ? String(el.value).trim() : ''; }

        function findEmail(form) {
            var e = form.querySelector('input[type=email]');
            if (EMAIL_RE.test(val(e))) return val(e);
            var inputs = form.querySelectorAll('input, textarea');
            var i;
            for (i = 0; i < inputs.length; i++) {
                var n = (inputs[i].name || '').toLowerCase();
                if (n.indexOf('email') !== -1 && EMAIL_RE.test(val(inputs[i]))) return val(inputs[i]);
            }
            for (i = 0; i < inputs.length; i++) {
                if (EMAIL_RE.test(val(inputs[i]))) return val(inputs[i]);
            }
            return '';
        }

        function byNames(form, names, types) {
            var i, n, el, inputs;
            if (types) {
                for (i = 0; i < types.length; i++) {
                    el = form.querySelector('input[type=' + types[i] + ']');
                    if (val(el)) return val(el);
                }
            }
            inputs = form.querySelectorAll('input, textarea');
            for (i = 0; i < inputs.length; i++) {
                n = (inputs[i].name || '').toLowerCase();
                for (var k = 0; k < names.length; k++) {
                    if (n.indexOf(names[k]) !== -1 && val(inputs[i])) return val(inputs[i]);
                }
            }
            return '';
        }

        function firstText(form) {
            var inputs = form.querySelectorAll('input[type=text]');
            for (var i = 0; i < inputs.length; i++) { if (val(inputs[i])) return val(inputs[i]); }
            return '';
        }

        // Captura AUTOMÁTICA: qualquer formulário com e-mail (exceto login).
        document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!form || form.tagName !== 'FORM') return;
            if (form.querySelector('input[type=password]')) return;
            var email = findEmail(form);
            if (!email) return;
            var name = byNames(form, ['nome', 'name', 'fullname'], null) || firstText(form);
            var phone = byNames(form, ['phone', 'telefone', 'whats', 'celular', 'tel'], ['tel']);
            if (!name) name = email.split('@')[0];

            var fd = new FormData();
            fd.append('action', 'crmlead_generic_form');
            fd.append('_crmlead_nonce', NONCE);
            fd.append('_crmlead_page', window.location.href);
            // Envia TODOS os campos do formulário (preserva os nomes), para o
            // mapeamento de Notas e campos personalizados funcionar.
            var els = form.elements || [];
            for (var x = 0; x < els.length; x++) {
                var el = els[x];
                if (!el.name) continue;
                var type = (el.type || '').toLowerCase();
                if (type === 'password' || type === 'file' || type === 'submit' || type === 'button' || type === 'hidden') continue;
                if ((type === 'checkbox' || type === 'radio') && !el.checked) continue;
                if (el.value) fd.append(el.name, el.value);
            }
            // Sobrescreve com os detectados (caso os nomes não batam).
            fd.set('name', name);
            fd.set('email', email);
            if (phone) fd.set('phone', phone);
            try {
                fetch(ajaxUrl, { method: 'POST', body: fd, keepalive: true }).catch(function() {});
            } catch (_) {}
        }, true);
    })();
    </script>
    <?php
}

// Link de configurações na página de plugins
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'crmlead_plugin_links');
function crmlead_plugin_links($links) {
    array_unshift($links, '<a href="options-general.php?page=crmlead-connector">Configurações</a>');
    return $links;
}
`;

/** Monta o PHP do plugin com o nome do produto, URL da API e chave injetados. */
export function buildWordPressPlugin(opts: {
  appName: string;
  apiUrl: string;
  apiKey: string;
}): string {
  return PLUGIN_PHP.replace(/__APP_NAME__/g, opts.appName)
    .replace(/__API_URL__/g, opts.apiUrl)
    .replace(/__API_KEY__/g, opts.apiKey);
}

/* ── ZIP (método "store", sem compressão) — sem dependências ───────────────── */

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]!) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Empacota um único arquivo (com caminho/pasta) num Buffer .zip. */
export function zipSingleFile(path: string, content: string): Buffer {
  const data = Buffer.from(content, "utf8");
  const nameBuf = Buffer.from(path, "utf8");
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8); // store
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  const localPart = Buffer.concat([local, nameBuf, data]);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42); // offset do local header
  const centralPart = Buffer.concat([central, nameBuf]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralPart.length, 12);
  eocd.writeUInt32LE(localPart.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localPart, centralPart, eocd]);
}
