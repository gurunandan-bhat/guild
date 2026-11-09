+++
title = '{{ replace .File.ContentBaseName "-" " " | title }}'
date = {{ .Date }}
draft = false
issue = 0
thumb = "newsletter-thumbs/{{ .File.ContentBaseName }}.png"
link = "/newsletter/{{ .File.ContentBaseName }}.html"
+++
