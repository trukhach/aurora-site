import os, shutil, pathlib
R = pathlib.Path(__file__).parent
src = R/'src'; srv = src/'server'
css = (src/'style.css').read_text(); js = (src/'main.js').read_text(); body = (src/'body.html').read_text()
FONT = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400&display=swap">'
# preview artifact (no skeleton, no form endpoint)
(R/'preview').mkdir(exist_ok=True)
(R/'preview/aurora.html').write_text(f'<title>Аврора</title>\n{FONT}\n<style>\n{css}</style>\n{body.replace("%%ENDPOINT%%","")}\n<script>\n{js}</script>\n')
# production site
out = R/'dist'; shutil.rmtree(out, ignore_errors=True)
pub = out/'public'; (pub/'assets').mkdir(parents=True)
(pub/'assets/style.css').write_text(css); (pub/'assets/main.js').write_text(js)
csp = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'"
head = f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Аврора · рекламное агентство в Челябинске: вывески, световые короба, фирменный стиль</title>
<meta name="description" content="Рекламное агентство «Аврора», Челябинск. Дизайн, производство и монтаж вывесок, объёмных букв и световых коробов. 20 лет работы, 3000+ проектов. Бесплатная консультация: +7 912 777-84-84.">
<link rel="canonical" href="https://aur0ra.ru/">
<meta property="og:type" content="website">
<meta property="og:title" content="Аврора · вывески и реклама в Челябинске">
<meta property="og:description" content="Дизайн, производство и монтаж вывесок. 20 лет, 3000+ проектов.">
<meta property="og:url" content="https://aur0ra.ru/">
<meta name="theme-color" content="#f4fffb">
{FONT}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/style.css">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"LocalBusiness","name":"Аврора","description":"Рекламное агентство: вывески, световые короба, фирменный стиль","url":"https://aur0ra.ru/","telephone":"+79127778484","address":{{"@type":"PostalAddress","addressLocality":"Челябинск","addressCountry":"RU"}},"openingHours":"Mo-Su 09:00-18:00","sameAs":["https://vk.com/id93244038","https://t.me/sp74013"]}}</script>
</head>
<body>
'''
(pub/'index.html').write_text(head + body.replace('%%ENDPOINT%%','send.php') + '<script src="assets/main.js" defer></script>\n</body>\n</html>\n')
for f in ['send.php','.htaccess','robots.txt','favicon.svg']: shutil.copy(srv/f, pub/f)
shutil.copytree(srv/'aurora-private', out/'aurora-private')
shutil.copy(srv/'nginx.conf', out/'nginx.conf')
shutil.copy(srv/'README.txt', out/'README.txt')
(pub/'assets/works').mkdir(exist_ok=True)
for f in (src/'works').glob('*.webp'): shutil.copy(f, pub/'assets/works'/f.name)
