const fs = require('fs')
const path = require('path')
const contentPath = '../content/'
const { parse } = require('yaml')

const main = async () => {
  const dirContents = fs.readdirSync(contentPath)
  let i = 1
  const output = []
  for(const file of dirContents) {
    // load the file but ignore the search page
    if (file !== 'search.md') {
      const p = path.join(contentPath, file)
      const contents = fs.readFileSync(p, { encoding: 'utf8' })
      
      // split front matter from contents
      // 0 blank
      // 1 front matter
      // 2 content
      const bits = contents.split('---')
      const y = parse(bits[1])
      const obj = {
        title: y.title,
        description: y.description,
        content: bits[2],
        url: "/gh-pages-example" + y.url,
        tags: y.tags.join(' '),
        id: (i++).toString()
      }
      output.push(obj)
    }
  }
  console.log('var searchContent = ', JSON.stringify(output, null, '  '))
}

main()
