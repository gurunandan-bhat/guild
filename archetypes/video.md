+++
{{- $title := replace (replaceRE `-\d+$` "" .File.ContentBaseName)  "-" " " | title }}
title = "{{ $title }}"
date = {{ .Date }}
draft = false
mreviews = ["{{ $title }}"]
critics = ['']
subtitle = ""
media = 'video'
source = ''
scores = []
+++

{{< youtube id="" loading="lazy" >}}
