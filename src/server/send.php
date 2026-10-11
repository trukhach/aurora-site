<?php
/**
 * Обработчик заявки с сайта «Аврора».
 * Защита: только POST с того же домена, одноразовый CSRF-токен в сессии,
 * honeypot и тайм-ловушка от ботов, лимит заявок с одного IP,
 * строгая проверка полей, отправка в Telegram обычным текстом (без HTML-разметки).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function out(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/* Настройки лежат ВНЕ публичной папки сайта */
$configFile = dirname(__DIR__) . '/aurora-private/config.php';
if (!is_file($configFile)) out(500, ['ok' => false, 'error' => 'Сервис временно недоступен. Позвоните нам.']);
$config = require $configFile;

/* 1. Запрос только с нашего домена */
$allowed = $config['allowed_hosts'];
$host = strtolower($_SERVER['HTTP_HOST'] ?? '');
if (!in_array($host, $allowed, true)) out(400, ['ok' => false]);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !in_array(strtolower((string)parse_url($origin, PHP_URL_HOST)), $allowed, true)) out(403, ['ok' => false]);
if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'fetch') out(403, ['ok' => false]);

session_name('aur_s');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* 2. Выдача одноразового токена */
if ($method === 'GET' && isset($_GET['token'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    $_SESSION['csrf_t'] = time();
    out(200, ['token' => $_SESSION['csrf']]);
}
if ($method !== 'POST') { header('Allow: GET, POST'); out(405, ['ok' => false]); }

/* 3. Размер запроса */
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) out(413, ['ok' => false]);

/* 4. CSRF: токен совпадает и используется один раз */
$token = (string)($_POST['token'] ?? '');
$sessToken = (string)($_SESSION['csrf'] ?? '');
$issued = (int)($_SESSION['csrf_t'] ?? 0);
unset($_SESSION['csrf'], $_SESSION['csrf_t']);
if ($sessToken === '' || !hash_equals($sessToken, $token) || time() - $issued > 3600) {
    out(403, ['ok' => false, 'error' => 'Обновите страницу и отправьте заявку снова.']);
}

/* 5. Ловушки для ботов: скрытое поле и слишком быстрое заполнение */
if (trim((string)($_POST['website'] ?? '')) !== '') out(200, ['ok' => true]);
if ((int)($_POST['elapsed'] ?? 0) < 3000 || time() - $issued < 2) out(400, ['ok' => false, 'error' => 'Попробуйте отправить ещё раз.']);

/* 6. Лимит: не больше 3 заявок за 10 минут и 10 в сутки с одного IP */
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$dir = $config['rate_dir'];
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$file = $dir . '/' . hash('sha256', $ip . $config['salt']) . '.json';
$fp = fopen($file, 'c+');
if ($fp && flock($fp, LOCK_EX)) {
    $hits = json_decode(stream_get_contents($fp) ?: '[]', true) ?: [];
    $now = time();
    $hits = array_values(array_filter($hits, fn($t) => is_int($t) && $now - $t < 86400));
    $recent = count(array_filter($hits, fn($t) => $now - $t < 600));
    if ($recent >= 3 || count($hits) >= 10) { flock($fp, LOCK_UN); fclose($fp); out(429, ['ok' => false, 'error' => 'Слишком много заявок. Позвоните нам: +7 912 777-84-84']); }
    $hits[] = $now;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($hits));
    flock($fp, LOCK_UN); fclose($fp);
}

/* 7. Проверка и очистка полей */
function clean(string $v, bool $multiline = false): string {
    $v = trim($v);
    $v = $multiline ? preg_replace('/[^\P{C}\n]/u', '', $v) : preg_replace('/\p{C}/u', '', $v);
    return (string)$v;
}
$name = clean((string)($_POST['name'] ?? ''));
$phone = clean((string)($_POST['phone'] ?? ''));
$message = clean((string)($_POST['message'] ?? ''), true);
$digits = preg_replace('/\D/', '', $phone);

if (!mb_check_encoding($name . $phone . $message, 'UTF-8')) out(400, ['ok' => false]);
if (mb_strlen($name) < 2 || mb_strlen($name) > 60) out(422, ['ok' => false, 'error' => 'Проверьте имя.']);
if (strlen($digits) < 10 || strlen($digits) > 12) out(422, ['ok' => false, 'error' => 'Проверьте номер телефона.']);
if (mb_strlen($message) > 1000) out(422, ['ok' => false, 'error' => 'Сообщение длиннее 1000 знаков.']);
if (($_POST['consent'] ?? '') !== '1') out(422, ['ok' => false, 'error' => 'Нужно согласие на обработку данных.']);

/* 8. Отправка в Telegram обычным текстом */
$text = "Заявка с сайта aur0ra.ru\n\nИмя: {$name}\nТелефон: {$phone}\n" . ($message !== '' ? "Задача: {$message}\n" : '');
$ch = curl_init('https://api.telegram.org/bot' . $config['tg_token'] . '/sendMessage');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query(['chat_id' => $config['tg_chat_id'], 'text' => $text, 'disable_web_page_preview' => 'true']),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 8,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$res = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false || $code !== 200) out(502, ['ok' => false, 'error' => 'Не получилось отправить. Позвоните нам: +7 912 777-84-84']);
out(200, ['ok' => true]);
