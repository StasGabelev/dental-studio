$lines = Get-Content admin/admin.js
$start = -1
$end = -1
for ($i=0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -like '*"footer-hours"*' -and $start -eq -1) { $start = $i }
    if ($lines[$i] -like '*schema.forEach*' -and $end -eq -1) { $end = $i }
}

if ($start -ne -1 -and $end -ne -1) {
    $new_content = $lines[0..($start)]
    $new_content += '            "footer-hours": "Пн — Пт, 10:00 — 18:00"'
    $new_content += '        },'
    $new_content += '        "about": {'
    $new_content += '            "about-hero-img": "assets/dental-2.png",'
    $new_content += '            "about-section-tag": "ПРО КЛІНІКУ",'
    $new_content += '            "about-p1": "Ми доповнюємо вашу красу",'
    $new_content += '            "about-about-desc": "Dental Studio — це стоматологічна клініка в Чернігові, що об’єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.",'
    $new_content += '            "nav-works": "НАШІ РОБОТИ",'
    $new_content += '            "nav-services": "ПОСЛУГИ",'
    $new_content += '            "about-team-title": "НАША КОМАНДА",'
    $new_content += '            "about-cta-title": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",'
    $new_content += '            "about-cta-desc": "Виберіть онлайн-запис для миттєвого бронювання часу,<br>або напишіть нам у месенджер для консультації."'
    $new_content += '        }'
    $new_content += '    };'
    $new_content += ''
    $new_content += '    let html = '''';'
    $new_content += $lines[($end)..$lines.Length]
    $new_content | Set-Content admin/admin.js -Encoding UTF8
}
