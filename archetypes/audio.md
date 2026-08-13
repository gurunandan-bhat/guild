+++
{{- $title := replace (replaceRE `-\d+$` "" .File.ContentBaseName)  "-" " " | title }}
title = '{{ $title }}'
date = {{ .Date }}
draft = false
mreviews = ["{{ partialCached "title-to-tag.html" $title $title }}"]
critics = ['']
subtitle = ""
opening = ""
img = '{{ .File.ContentBaseName }}.'
media = 'audio'
scores = []
+++

{{< audio path="" caption="" >}}
