---
layout: page
title: List of all Tags
permalink: /tags/
showInMenu: false
---
<div class="tag-page">
{% for tag in site.tags %}
  <h1 id="{{ tag[0] }}">{{ tag[0] }}</h1>
  {% for post in tag[1] %}
  <div>
    <a class="post-link" href="{{ post.url | prepend: site.baseurl }}">
      <span class="post-date">{{ post.date | date: "%b %-d, %Y" }}</span>
      <span class="post-title">{{ post.title }}</span>
    </a>
  </div>
  {% endfor %}
{% endfor %}
</div>