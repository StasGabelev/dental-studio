$c = Get-Content admin/admin.js
$part1 = $c[0..1090]
$part2 = $c[1111..1154]
$part3 = $c[1195..($c.Length-1)]
$defaults = Get-Content scratch/new_defaults.js
$save = Get-Content scratch/new_save.js
$new_c = $part1 + $defaults + $part2 + $save + $part3
$new_c | Set-Content admin/admin.js -Encoding UTF8
