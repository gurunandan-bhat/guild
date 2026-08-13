+++
{{- $title := replace (replaceRE `-\d+$` "" .File.ContentBaseName)  "-" " " | title }}
title = "{{ $title }}"
date = {{ .Date }}
draft = false
mreviews = ["{{ partialCached "title-to-tag.html" $title $title }}"]
critics = ['']
publication = ''
subtitle = ""
opening = ""
img = '{{ .File.ContentBaseName }}.'
media = 'print'
source = ""
scores = []
+++
