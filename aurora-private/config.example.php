<?php
// Скопируйте в config.php и положите папку aurora-private РЯДОМ с папкой сайта, а не внутрь неё.
return [
    'allowed_hosts' => ['aur0ra.ru', 'www.aur0ra.ru'],
    'tg_token'      => '123456:ВСТАВЬТЕ_ТОКЕН_БОТА',   // от @BotFather
    'tg_chat_id'    => '000000000',                    // ваш chat id
    'salt'          => 'замените-на-случайную-строку-40-символов',
    'rate_dir'      => __DIR__ . '/rate',
];
