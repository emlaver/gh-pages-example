---
type: search
title: Search 
description: Search Cloudant Blog
date: 1970-01-01T00:00:00.000Z
author: Glynn Bird
image:
authorLink:
relcanonical: 
url: /search.html
---


<label for="search">Search</label>
<input type="text" name="search" id="searchcontrol" placeholder="e.g. MapReduce" onkeyup="search()" />
<p id="instructions">
e.g. MapReduce or title:HTTP
</p>
<div id="searchresults"></div>


<!-- Load the Lunr library-->
<script src="https://unpkg.com/lunr/lunr.js"></script>
<!-- Load the content to index -->
<script src="/js/searchcontent.js"></script>
<script>

  // put in placeholder searchContent if it's not there
  searchContent = searchContent || []
  
  // remove anything but alphanumeric characters
  const sanitise = function(str) {
    return str.replace(/[^a-zA-Z0-9 \-:]/g, '')
  }

  // find url in array of search content
  const locate = function (url) {
    for(s of searchContent) {
      if (s.url === url) {
        return s
      }
    }
    return null
  }

  // create a new search index
  var idx = lunr(function () {
    // index the following fields, favouring title, tags & description before blog content
    this.ref('url')
    this.field('title', { boost: 10 })
    this.field('description', { boost: 2})
    this.field('tags', { boost: 5 })
    this.field('content', { boost: 1 })
  
    searchContent.forEach(function (doc) {
      this.add(doc)
    }, this)
  })

  // perform a search
  const search = function() {
    document.getElementById('searchresults').innerHTML = ''
    let term = sanitise(document.getElementById('searchcontrol').value)
    if (!term) {
      document.getElementById('instructions').style.display = 'block'
      window.location.hash = ''
      return
    }
    document.getElementById('instructions').style.display = 'none'
    const results = idx.search(term)
    let inner = ''

    // output list item HTML into searchresults div
    for(r of results) {
      const rec = locate(r.ref)
      inner += `<div class="searchres"><h3><a href="${rec.url}">${rec.title}</a></h3><p class="searchdesc">${rec.description}</p><p class="searchurl"><a href="${rec.url}">${rec.url}</a></p></div>\n`
    }
    document.getElementById('searchresults').innerHTML = inner
    window.location.hash=encodeURIComponent(term)
  }

  if (window.location.hash) {
    let v = decodeURIComponent(window.location.hash).replace(/^#/,'')
    document.getElementById('searchcontrol').value = decodeURIComponent(v)
    search()
  }

</script>
