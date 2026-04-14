$c = Get-Content admin/admin.js
$d = Get-Content scratch/new_defaults.js
$s = Get-Content scratch/new_save.js
$new_c = $c[0..1098] + $d + $c[1111..1153] + $s + $c[1194..($c.Length-1)]
$new_c | Set-Content admin/admin.js -Encoding UTF8
