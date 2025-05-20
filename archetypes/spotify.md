+++
{{- $title := replace (replaceRE `-\d+$` "" .File.ContentBaseName)  "-" " " | title }}
title = "{{ $title }}"
date = {{ .Date }}
draft = false
mreviews = ["{{ $title }}"]
critics = ['']
subtitle = "A Spotify Review"
score = 
+++

{{< spotify id="" height="250" >}}
