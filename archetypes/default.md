---
type: blog
title: "{{ substr (replace .Name "-" " ") 11 | title }}"
description:
date: {{ .Date }}
author:
authorLink:
image:
relcanonical:
tags:
url: "/{{ replace .Name "-" "/" 3 | title }}.html"
draft: true
---
