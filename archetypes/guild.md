+++
{{ $title := replace (replaceRE `-\d+$` "" .File.ContentBaseName)  "-" " " | title }}
date = {{ .Date }}
draft = false
weight =
title = '{{ $title }}'
organizations = ['']
img =

[soc_media]
facebook =
twitter =
instagram =
+++
