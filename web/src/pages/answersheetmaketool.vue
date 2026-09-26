<script setup>
document.title = '智能阅卷系统 - 答题卡制作工具'
import { ref } from 'vue'
const sheet = ref({
  meta: {
    title: '标题',
    paperType: 'a4',
    columnCount: 1,
    info: ['姓名', '班级', '考场/座位号'],
    optionBorderType: 'open',
    optionDirection: 'row',
    objectiveCountPerGroup: 5
  },
  items: []
})
let ttfbase64
let doc
async function loadTtf() {
  const loading = TinyLoading.service({
    lock: true,
    size: 'large',
    background: 'rgba(0, 0, 0, 0.5)'
  })
  const response = await fetch('/HarmonyOS_Sans_SC.ttf')
  const blob = await response.blob()
  const reader = new FileReader()
  reader.onloadend = () => {
    ttfbase64 = reader.result.split(',')[1]
    loading.close()
    preview()
  }
  reader.readAsDataURL(blob)
}
loadTtf()
const pdfurl = ref('')
const height = ref(0)
const width = ref(0)
const sheetconfig = sheet.value
const pagepadding = 20
const archorheight = 15
const archorwidth = 15
const inpadding = 5
const columngap = 20
const rowgap = 25
const textrowgap = 6
const itemgap = 10
const titlefontsize = 20
const subtitlefontsize = 12
const namefontsize = 8
const pagenumberfontsize = 10
const optionwidth = 14
function grouparr(arr, count) {
  const result = []
  for (let i = 0; i < arr.length; i += count) {
    result.push(arr.slice(i, i + count))
  }
  return result
}
function textarrwidth(textarr, size) {
  const result = []
  textarr.forEach(item => {
    result.push(getTextWidth(item, size))
  })
  return result
}
function sum(arr) {
  return arr.reduce((acc, cur) => acc + cur, 0)
}
function sumtoindex(arr, n) {
  let sum = 0
  for (let i = 0; i <= n; i++) {
    sum += arr[i]
  }
  return sum
}
function maxoptioncount(group) {
  let result = 0
  group.forEach(item => {
    let count = 2
    if (item.optionType == 'ab') {
      count = item.optionCount
    }
    if (result < count) {
      result = count
    }
  })
  return result
}
const textwidthcache = {}
function getTextWidth(text, size) {
  const sizekey = String(size)
  if (!textwidthcache[sizekey]) {
    textwidthcache[sizekey] = {}
  }
  let width = textwidthcache[sizekey][text]
  if (width == undefined) {
    doc.setFontSize(size)
    width = doc.getTextWidth(text)
    textwidthcache[String(size)][text] = width
  }
  return width
}
function splitTextToSize(text, maxwidth, size) {
  doc.setFontSize(size)
  return doc.splitTextToSize(text, maxwidth)
}
function getObjectiveGroupSize(group) {
  const result = {
    width: 0,
    height: 0
  }
  if (sheetconfig.meta.optionDirection == 'column') {
    result.width = optionwidth * group.length + textrowgap * (group.length - 1)
    const optioncount = maxoptioncount(group)
    result.height = namefontsize * (optioncount + 1) + optioncount * textrowgap
  }
  if (sheetconfig.meta.optionDirection == 'row') {
    const names = group.map(item => item.name)
    const namewidtharr = textarrwidth(names, namefontsize)
    const rowwidtharr = group.map((item, index) => namewidtharr[index] + (optionwidth + textrowgap) * item.optionCount).sort((a, b) => b - a)
    result.width = rowwidtharr[0]
    result.height = namefontsize * group.length + textrowgap * (group.length - 1)
    result.namewidth = namewidtharr.sort((a, b) => b - a)[0]
  }
  return result
}
function getCommands(pageheight, pagewidth) {
  const result = []
  const columnwidth = (pagewidth - 2 * (pagepadding + archorwidth + inpadding) - (sheetconfig.meta.columnCount - 1) * columngap) / sheetconfig.meta.columnCount
  const columnheight = pageheight - (pagepadding + archorheight + inpadding) * 2
  const columnbottomy = pageheight - pagepadding - archorheight - inpadding
  const lineandinpaddinglength = 1 + inpadding
  const lineandinpaddingdoublelength = lineandinpaddinglength * 2
  const linewidth = columnwidth - lineandinpaddingdoublelength
  let cursorx = 0
  let cursory = 0
  let columncount = 1
  function addItem(item) {
    result[result.length - 1].push(item)
  }
  function addPage() {
    result.push([])
    addItem({
      type: 'block',
      x: pagepadding,
      y: pagepadding,
      w: archorwidth,
      h: archorheight
    })
    addItem({
      type: 'block',
      x: pagewidth - pagepadding - archorwidth,
      y: pagepadding,
      w: archorwidth,
      h: archorheight
    })
    addItem({
      type: 'block',
      x: pagepadding,
      y: pageheight - pagepadding - archorheight,
      w: archorwidth,
      h: archorheight
    })
    addItem({
      type: 'block',
      x: pagewidth - pagepadding - archorwidth,
      y: pageheight - pagepadding - archorheight,
      w: archorwidth,
      h: archorheight
    })
    cursorx = pagepadding + archorwidth + inpadding
    cursory = pagepadding + archorheight + inpadding
    if (result.length % 2 == 1) {
      const lines = splitTextToSize(sheetconfig.meta.title, columnwidth, titlefontsize)
      if (lines.length > 2) {
        TinyModal.message({
          message: '标题过长',
          status: 'warning'
        })
        return result
      }
      for (let i = 0; i < lines.length; i++) {
        const item = lines[i]
        const width = getTextWidth(item, titlefontsize)
        if (i > 0) {
          cursory += textrowgap
        }
        addItem({
          type: 'text',
          content: item,
          x: cursorx + (columnwidth - width) / 2,
          y: cursory,
          size: titlefontsize
        })
        cursory += titlefontsize
      }
      cursory += itemgap
      const rectwidth = 100
      const basex = cursorx + columnwidth - rectwidth
      const infolength = sheetconfig.meta.info.length
      const basey = cursory + (rectwidth - subtitlefontsize * infolength - textrowgap * (infolength - 1)) / 2
      const rowheight = subtitlefontsize + textrowgap
      const linemaxwidth = basex - itemgap
      for (let i = 0; i < infolength; i++) {
        const infoitem = sheetconfig.meta.info[i] + '：'
        addItem({
          type: 'text',
          content: infoitem,
          x: cursorx,
          y: basey + rowheight * i,
          size: subtitlefontsize
        })
        const textwidth = getTextWidth(infoitem, subtitlefontsize)
        addItem({
          type: 'line',
          x: cursorx + textwidth,
          y: basey + rowheight * i + subtitlefontsize,
          w: linemaxwidth - textwidth - cursorx
        })
      }
      addItem({
        type: 'rect',
        x: basex,
        y: cursory,
        w: rectwidth,
        h: rectwidth
      })
      addItem({
        type: 'text',
        content: '贴二',
        x: basex + 1 + (rectwidth - 2 - getTextWidth('贴二', subtitlefontsize)) / 2,
        y: cursory + 1 + (rectwidth - 2 - subtitlefontsize * 2 - textrowgap) / 2,
        size: subtitlefontsize,
        color: '#5C5C5C'
      })
      addItem({
        type: 'text',
        content: '维码区',
        x: basex + 1 + (rectwidth - 2 - getTextWidth('维码区', subtitlefontsize)) / 2,
        y: cursory + 1 + (rectwidth - 2 - subtitlefontsize * 2 - textrowgap) / 2 + textrowgap + subtitlefontsize,
        size: subtitlefontsize,
        color: '#5C5C5C'
      })
      cursory += rectwidth + itemgap
    }
  }
  function addColumn() {
    function getCursorxCount() {
      if (sheetconfig.meta.columnCount == 1) {
        return 0
      }
      const columnindex = columncount % sheetconfig.meta.columnCount
      if (sheetconfig.meta.columnCount == 2) {
        if (columnindex == 0) {
          return 1
        }
        if (columnindex == 1) {
          return 0
        }
      }
      if (sheetconfig.meta.columnCount == 3) {
        if (columnindex == 0) {
          return 2
        }
        if (columnindex == 1) {
          return 0
        }
        if (columnindex == 2) {
          return 1
        }
      }
    }
    columncount++
    const pagecount = Math.ceil(columncount / sheetconfig.meta.columnCount)
    if (pagecount == result.length + 1) {
      addPage()
    }
    cursorx = pagepadding + archorwidth + inpadding + (columnwidth + columngap) * getCursorxCount()
    if (sheetconfig.meta.paperType == 'a4' && result.length % 2 == 0) {
      cursory = pagepadding + archorheight + inpadding
    }
    if (sheetconfig.meta.paperType == 'a3' && columncount % sheetconfig.meta.columnCount != 1) {
      cursory = pagepadding + archorheight + inpadding
    }
  }
  addPage()
  for (let i = 0; i < sheetconfig.items.length; i++) {
    const item = sheetconfig.items[i]
    if (item.type == 'title') {
      if (!item.content) {
        TinyModal.message({
          message: '请输入标题',
          status: 'warning'
        })
        return result
      }
      const lines = splitTextToSize(item.content, columnwidth, subtitlefontsize)
      if (lines.length > 2) {
        TinyModal.message({
          message: '标题过长',
          status: 'warning'
        })
        return result
      }
      const ytotal = lines.length * subtitlefontsize + (lines.length - 1) * textrowgap
      if (columnbottomy - cursory < ytotal) {
        addColumn()
      }
      for (let j = 0; j < lines.length; j++) {
        const item = lines[j]
        if (j > 0) {
          cursory += textrowgap
        }
        addItem({
          type: 'text',
          content: item,
          x: cursorx,
          y: cursory,
          size: subtitlefontsize
        })
        cursory += subtitlefontsize
      }
      cursory += itemgap
    }
    if (item.type == 'subjective') {
      if (item.rowType != 'noanswer' && !item.name) {
        TinyModal.message({
          message: '请输入题号',
          status: 'warning'
        })
        return result
      }
      if (getTextWidth(item.name, namefontsize) > columnwidth - lineandinpaddingdoublelength) {
        TinyModal.message({
          message: '题号过长',
          status: 'warning'
        })
        return result
      }
      let rowcount = item.rowCount
      const rect = {
        x: cursorx,
        y: cursory,
        h: lineandinpaddingdoublelength
      }
      while (rowcount > 0) {
        if (rowcount == item.rowCount) {
          if (columnbottomy - cursory < rect.h + namefontsize) {
            addColumn()
            rect.x = cursorx
            rect.y = cursory
          }
          cursory += lineandinpaddinglength
          if (item.rowType != 'noanswer') {
            addItem({
              type: 'text',
              content: item.name,
              x: cursorx + lineandinpaddinglength,
              y: cursory,
              size: namefontsize
            })
          }
          cursory += namefontsize
          rect.h += namefontsize
        }
        if (columnbottomy - cursory < rowgap + lineandinpaddinglength) {
          if (item.rowType != 'noanswer') {
            addItem({
              type: 'rect',
              x: rect.x,
              y: rect.y,
              w: columnwidth,
              h: rect.h
            })
          }
          if (item.rowType == 'noanswer') {
            addItem({
              type: 'block',
              x: rect.x,
              y: rect.y,
              w: columnwidth,
              h: rect.h,
              color: '#CBCBCB'
            })
            addItem({
              type: 'text',
              content: '禁答区',
              x: rect.x + (columnwidth - getTextWidth('禁答区', subtitlefontsize)) / 2,
              y: rect.y + (rect.h - subtitlefontsize) / 2,
              size: subtitlefontsize
            })
          }
          addColumn()
          rect.x = cursorx
          rect.y = cursory
          rect.h = lineandinpaddingdoublelength
          cursory += lineandinpaddinglength
        }
        cursory += rowgap
        rect.h += rowgap
        if (item.rowType == 'line') {
          addItem({
            type: 'line',
            x: cursorx + lineandinpaddinglength,
            y: cursory,
            w: linewidth
          })
        }
        rowcount--
        if (rowcount == 0) {
          if (item.rowType != 'noanswer') {
            addItem({
              type: 'rect',
              x: rect.x,
              y: rect.y,
              w: columnwidth,
              h: rect.h
            })
          }
          if (item.rowType == 'noanswer') {
            addItem({
              type: 'block',
              x: rect.x,
              y: rect.y,
              w: columnwidth,
              h: rect.h,
              color: '#CBCBCB'
            })
            addItem({
              type: 'text',
              content: '禁答区',
              x: rect.x + (columnwidth - getTextWidth('禁答区', subtitlefontsize)) / 2,
              y: rect.y + (rect.h - subtitlefontsize) / 2,
              size: subtitlefontsize
            })
          }
          cursory += lineandinpaddinglength
        }
      }
      cursory += itemgap
    }
    if (item.type == 'fillblank') {
      if (item.names.length == 0) {
        TinyModal.message({
          message: '请新增题目',
          status: 'warning'
        })
        return result
      }
      if (item.names.some(item => !item)) {
        TinyModal.message({
          message: '请输入题号',
          status: 'warning'
        })
        return result
      }
      const groups = grouparr(item.names, item.columnCount)
      let rowcount = groups.length
      const rect = {
        x: cursorx,
        y: cursory,
        h: lineandinpaddingdoublelength
      }
      while (rowcount > 0) {
        if (columnbottomy - cursory < rowgap + lineandinpaddinglength) {
          addItem({
            type: 'rect',
            x: rect.x,
            y: rect.y,
            w: columnwidth,
            h: rect.h
          })
          addColumn()
          rect.x = cursorx
          rect.y = cursory
          rect.h = lineandinpaddingdoublelength
          cursory += lineandinpaddinglength
        } else if (rowcount == groups.length) {
          cursory += lineandinpaddinglength
        }
        const j = groups.length - rowcount
        cursory += rowgap
        rect.h += rowgap
        const names = groups[j]
        const textwidtharr = textarrwidth(names, namefontsize)
        const sumtextwidth = sum(textwidtharr)
        const namelinewidth = (linewidth - sumtextwidth - (2 * names.length - 1) * itemgap) / names.length
        if (namelinewidth < 0) {
          TinyModal.message({
            message: '题号过长',
            status: 'warning'
          })
          return result
        }
        for (let k = 0; k < names.length; k++) {
          const name = names[k]
          addItem({
            type: 'text',
            content: name,
            x: cursorx + lineandinpaddinglength + sumtoindex(textwidtharr, k - 1) + namelinewidth * k + itemgap * 2 * k,
            y: cursory - namefontsize - 1,
            size: namefontsize
          })
          addItem({
            type: 'line',
            x: cursorx + lineandinpaddinglength + sumtoindex(textwidtharr, k) + namelinewidth * k + itemgap * (2 * k + 1),
            y: cursory,
            w: namelinewidth
          })
        }
        rowcount--
        if (rowcount == 0) {
          addItem({
            type: 'rect',
            x: rect.x,
            y: rect.y,
            w: columnwidth,
            h: rect.h
          })
          cursory += lineandinpaddinglength
        }
      }
      cursory += itemgap
    }
    if (item.type == 'composition') {
      if (!item.name) {
        TinyModal.message({
          message: '请输入题号',
          status: 'warning'
        })
        return result
      }
      if (getTextWidth(item.name, namefontsize) > columnwidth - lineandinpaddingdoublelength) {
        TinyModal.message({
          message: '题号过长',
          status: 'warning'
        })
        return result
      }
      const itemwidth = rowgap - 1
      const rowitemcount = Math.floor((linewidth - 1) / itemwidth)
      const rowtotalcount = Math.ceil(item.characterCount / rowitemcount)
      let rowcount = rowtotalcount
      let count = 0
      const marginleft = (linewidth - (rowitemcount * itemwidth + 1)) / 2
      const rect = {
        x: cursorx,
        y: cursory,
        h: lineandinpaddingdoublelength
      }
      while (rowcount > 0) {
        if (rowcount == rowtotalcount) {
          if (columnbottomy - cursory < rect.h + namefontsize + rowgap + 8) {
            addColumn()
            rect.x = cursorx
            rect.y = cursory
          }
          cursory += lineandinpaddinglength
          addItem({
            type: 'text',
            content: item.name,
            x: cursorx + lineandinpaddinglength,
            y: cursory,
            size: namefontsize
          })
          cursory += namefontsize
          rect.h += namefontsize
        }
        if (columnbottomy - cursory < rowgap + 8 + lineandinpaddinglength) {
          addItem({
            type: 'rect',
            x: rect.x,
            y: rect.y,
            w: columnwidth,
            h: rect.h
          })
          addColumn()
          rect.x = cursorx
          rect.y = cursory
          rect.h = lineandinpaddingdoublelength + 8
          cursory += lineandinpaddinglength + 8
        } else if (rowcount == rowtotalcount) {
          cursory += 8
          rect.h += 8
        }
        const basex = cursorx + lineandinpaddinglength + marginleft
        for (let j = 1; j <= rowitemcount && count < item.characterCount; j++) {
          addItem({
            type: 'rect',
            x: basex + itemwidth * (j - 1),
            y: cursory,
            w: itemwidth,
            h: itemwidth
          })
          count++
          if (count % 50 == 0 || count == item.characterCount) {
            const countstr = String(count)
            addItem({
              type: 'text',
              content: countstr,
              x: basex + itemwidth * (j - 1) + 1 + (rowgap - 2 - getTextWidth(countstr, 6)) / 2,
              y: cursory + rowgap + 1,
              size: 6
            })
          }
        }
        cursory += rowgap + 8
        rect.h += rowgap + 8
        rowcount--
        if (rowcount == 0) {
          addItem({
            type: 'rect',
            x: rect.x,
            y: rect.y,
            w: columnwidth,
            h: rect.h
          })
          cursory += lineandinpaddinglength
        }
      }
      cursory += itemgap
    }
    if (item.type == 'objective') {
      const biggroup = [item]
      while (sheetconfig.items[i + 1] && sheetconfig.items[i + 1].type == 'objective') {
        i++
        biggroup.push(sheetconfig.items[i])
      }
      if (biggroup.some(item => !item.name)) {
        TinyModal.message({
          message: '请输入题号',
          status: 'warning'
        })
        return result
      }
      const groups = grouparr(biggroup, sheetconfig.meta.objectiveCountPerGroup)
      const rect = {
        x: cursorx,
        y: cursory,
        h: lineandinpaddingdoublelength
      }
      cursorx += lineandinpaddinglength
      cursory += lineandinpaddinglength
      let maxgroupheight = 0
      for (let j = 0; j < groups.length; j++) {
        const group = groups[j]
        const groupsize = getObjectiveGroupSize(group)
        if (columnwidth - lineandinpaddingdoublelength < groupsize.width || columnheight - lineandinpaddingdoublelength < groupsize.height) {
          TinyModal.message({
            message: '选项过多',
            status: 'warning'
          })
          return result
        }
        if (columnbottomy - cursory - lineandinpaddinglength < groupsize.height) {
          if (rect.h != lineandinpaddingdoublelength) {
            addItem({
              type: 'rect',
              x: rect.x,
              y: rect.y,
              w: columnwidth,
              h: rect.h
            })
          }
          addColumn()
          rect.x = cursorx
          rect.y = cursory
          rect.h = lineandinpaddingdoublelength
          cursorx += lineandinpaddinglength
          cursory += lineandinpaddinglength
        }
        if (columnwidth - lineandinpaddinglength - (cursorx - rect.x - 1) < groupsize.width + itemgap) {
          rect.h += maxgroupheight
          cursorx = rect.x + lineandinpaddinglength
          cursory += maxgroupheight + itemgap
          maxgroupheight = 0
          if (columnbottomy - cursory - lineandinpaddinglength < groupsize.height + itemgap) {
            if (rect.h != lineandinpaddingdoublelength) {
              addItem({
                type: 'rect',
                x: rect.x,
                y: rect.y,
                w: columnwidth,
                h: rect.h
              })
            }
            addColumn()
            rect.x = cursorx
            rect.y = cursory
            rect.h = lineandinpaddingdoublelength
            cursorx += lineandinpaddinglength
            cursory += lineandinpaddinglength
          } else {
            rect.h += itemgap
          }
        }
        if (cursorx != rect.x + lineandinpaddinglength) {
          cursorx += itemgap
        }
        for (let k = 0; k < group.length; k++) {
          const groupitem = group[k]
          let options = []
          if (groupitem.optionType == 'ab') {
            options = Array.from({ length: groupitem.optionCount }, (_, i) => String.fromCharCode(65 + i))
          }
          if (groupitem.optionType == 'tf') {
            options = ['T', 'F']
          }
          const nametextwidth = getTextWidth(groupitem.name, namefontsize)
          const optiontextfontsizemap = {
            open: namefontsize,
            close: namefontsize - 2
          }
          if (sheetconfig.meta.optionDirection == 'column') {
            if (nametextwidth > optionwidth + textrowgap) {
              TinyModal.message({
                message: '题号过长',
                status: 'warning'
              })
              return result
            }
            addItem({
              type: 'text',
              content: groupitem.name,
              x: cursorx + (optionwidth + textrowgap) * k + (optionwidth - nametextwidth) / 2,
              y: cursory,
              size: namefontsize
            })
            options.forEach((item, index) => {
              addItem({
                type: 'text',
                content: item,
                x: cursorx + (optionwidth + textrowgap) * k + (optionwidth - getTextWidth(item, optiontextfontsizemap[sheetconfig.meta.optionBorderType])) / 2,
                y: cursory + (namefontsize + textrowgap) * (index + 1),
                size: optiontextfontsizemap[sheetconfig.meta.optionBorderType]
              })
              if (sheetconfig.meta.optionBorderType == 'open') {
                addItem({
                  type: 'text',
                  content: '[',
                  x: cursorx + (optionwidth + textrowgap) * k,
                  y: cursory + (namefontsize + textrowgap) * (index + 1),
                  size: namefontsize
                })
                addItem({
                  type: 'text',
                  content: ']',
                  x: cursorx + (optionwidth + textrowgap) * k + optionwidth - getTextWidth(']', namefontsize),
                  y: cursory + (namefontsize + textrowgap) * (index + 1),
                  size: namefontsize
                })
              }
              if (sheetconfig.meta.optionBorderType == 'close') {
                addItem({
                  type: 'rect',
                  x: cursorx + (optionwidth + textrowgap) * k,
                  y: cursory + (namefontsize + textrowgap) * (index + 1),
                  w: optionwidth,
                  h: namefontsize
                })
              }
            })
          }
          if (sheetconfig.meta.optionDirection == 'row') {
            addItem({
              type: 'text',
              content: groupitem.name,
              x: cursorx + groupsize.namewidth - nametextwidth,
              y: cursory + (namefontsize + textrowgap) * k,
              size: namefontsize
            })
            options.forEach((item, index) => {
              addItem({
                type: 'text',
                content: item,
                x: cursorx + groupsize.namewidth + optionwidth * index + textrowgap * (index + 1) + (optionwidth - getTextWidth(item, optiontextfontsizemap[sheetconfig.meta.optionBorderType])) / 2,
                y: cursory + (namefontsize + textrowgap) * k,
                size: optiontextfontsizemap[sheetconfig.meta.optionBorderType]
              })
              if (sheetconfig.meta.optionBorderType == 'open') {
                addItem({
                  type: 'text',
                  content: '[',
                  x: cursorx + groupsize.namewidth + optionwidth * index + textrowgap * (index + 1),
                  y: cursory + (namefontsize + textrowgap) * k,
                  size: namefontsize
                })
                addItem({
                  type: 'text',
                  content: ']',
                  x: cursorx + groupsize.namewidth + optionwidth * index + textrowgap * (index + 1) + optionwidth - getTextWidth(']', namefontsize),
                  y: cursory + (namefontsize + textrowgap) * k,
                  size: namefontsize
                })
              }
              if (sheetconfig.meta.optionBorderType == 'close') {
                addItem({
                  type: 'rect',
                  x: cursorx + groupsize.namewidth + optionwidth * index + textrowgap * (index + 1),
                  y: cursory + (namefontsize + textrowgap) * k,
                  w: optionwidth,
                  h: namefontsize
                })
              }
            })
          }
        }
        cursorx += groupsize.width
        if (maxgroupheight < groupsize.height) {
          maxgroupheight = groupsize.height
        }
      }
      rect.h += maxgroupheight
      addItem({
        type: 'rect',
        x: rect.x,
        y: rect.y,
        w: columnwidth,
        h: rect.h
      })
      cursorx = rect.x
      cursory = rect.y + rect.h
      cursory += itemgap
    }
  }
  for (let i = 1; i <= result.length; i++) {
    const pagetext = '第' + i + '页/共' + result.length + '页'
    const pagetextwidth = getTextWidth(pagetext, pagenumberfontsize)
    result[i - 1].push({
      type: 'text',
      content: pagetext,
      x: (pagewidth - pagetextwidth) / 2,
      y: pageheight - pagepadding,
      size: pagenumberfontsize
    })
  }
  return result
}
async function preview() {
  if (!sheetconfig.meta.title) {
    TinyModal.message({
      message: '请输入标题',
      status: 'warning'
    })
    return
  }
  if (sheetconfig.meta.paperType == 'a4' && sheetconfig.meta.columnCount != 1) {
    TinyModal.message({
      message: 'A4仅支持单栏',
      status: 'warning'
    })
    return
  }
  if (sheetconfig.meta.paperType == 'a3' && sheetconfig.meta.columnCount == 1) {
    TinyModal.message({
      message: 'A3不支持单栏',
      status: 'warning'
    })
    return
  }
  pdfurl.value = ''
  const { jsPDF } = await import('jspdf')
  const orientationmap = {
    a4: 'portrait',
    a3: 'landscape'
  }
  doc = new jsPDF({
    unit: 'pt',
    format: sheetconfig.meta.paperType,
    orientation: orientationmap[sheetconfig.meta.paperType]
  })
  const pageheight = doc.internal.pageSize.getHeight()
  const pagewidth = doc.internal.pageSize.getWidth()
  const fontname = 'HarmonyOS_Sans'
  if (!ttfbase64) {
    TinyModal.message({
      message: '字体加载中，请耐心等待',
      status: 'warning'
    })
    return
  }
  const loading = TinyLoading.service({
    lock: true,
    size: 'large',
    background: 'rgba(0, 0, 0, 0.5)'
  })
  doc.addFileToVFS(fontname + '.ttf', ttfbase64)
  doc.addFont(fontname + '.ttf', fontname, 'normal')
  doc.setFont(fontname)
  doc.setLineWidth(1)
  function setText(content, x, y, size, color) {
    doc.setFontSize(size)
    doc.setTextColor(color ? color : '#000000')
    doc.text(content, x, y + size)
  }
  function setRect(x, y, w, h) {
    doc.rect(x + 0.5, y + 0.5, w - 1, h - 1)
  }
  function setBlock(x, y, w, h, color) {
    doc.setFillColor(color ? color : '#000000')
    doc.rect(x, y, w, h, color ? 'FD' : 'F')
  }
  function setLine(x, y, w) {
    doc.line(x - 0.5, y, x + w, y)
  }
  const commands = getCommands(pageheight, pagewidth)
  for (let i = 0; i < commands.length; i++) {
    const pagecommands = commands[i]
    if (i > 0) {
      doc.addPage()
    }
    for (let j = 0; j < pagecommands.length; j++) {
      const command = pagecommands[j]
      if (command.type == 'text') {
        setText(command.content, command.x, command.y, command.size, command.color)
      }
      if (command.type == 'rect') {
        setRect(command.x, command.y, command.w, command.h)
      }
      if (command.type == 'block') {
        setBlock(command.x, command.y, command.w, command.h, command.color)
      }
      if (command.type == 'line') {
        setLine(command.x, command.y, command.w)
      }
    }
  }
  const blob = doc.output('blob')
  if (pdfurl.value) {
    URL.revokeObjectURL(pdfurl.value)
  }
  pdfurl.value = URL.createObjectURL(blob) + '#toolbar=0'
  loading.close()
  height.value = doc.internal.pageSize.getHeight()
  width.value = doc.internal.pageSize.getWidth()
}
function download() {
  if (!doc) {
    TinyModal.message({
      message: '请先预览',
      status: 'warning'
    })
    return
  }
  doc.save(sheetconfig.meta.title + '.pdf')
}
function changePaperType(label) {
  if (label == 'a4') {
    sheet.value.meta.columnCount = 1
  }
  if (label == 'a3') {
    sheet.value.meta.columnCount = 2
  }
}
const newtype = ref('title')
function newItem(index) {
  const typemap = {
    title: {
      type: 'title',
      content: ''
    },
    objective: {
      type: 'objective',
      name: '',
      optionType: 'ab',
      optionCount: 4
    },
    fillblank: {
      type: 'fillblank',
      names: [],
      columnCount: 1
    },
    subjective: {
      type: 'subjective',
      name: '',
      rowType: 'blank',
      rowCount: 1
    },
    composition: {
      type: 'composition',
      name: '',
      characterCount: 800
    }
  }
  if (newtype.value != 'title' && newtype.value != 'fillblank' && currentnumber.value) {
    let currentindex = index
    for (let i = 0; i < count.value; i++) {
      pushindex(sheet.value.items, typemap[newtype.value], currentindex)
      currentindex++
      sheet.value.items[currentindex].name = String(currentnumber.value)
      if (newtype.value == 'objective') {
        sheet.value.items[currentindex].optionType = optiontype.value
        sheet.value.items[currentindex].optionCount = optioncount.value
      }
      currentnumber.value++
    }
    count.value = 0
  } else {
    pushindex(sheet.value.items, typemap[newtype.value], index)
  }
}
const currentnumber = ref(0)
const count = ref(0)
const optiontype = ref('ab')
const optioncount = ref(4)
function pushindex(arr, item, index) {
  const newitem = { ...item }
  sheet.value.items = [...arr.slice(0, index + 1), newitem, ...arr.slice(index + 1)]
}
function deleteItem(index) {
  sheet.value.items.splice(index, 1)
}
function newName(index) {
  if (currentnumber.value) {
    for (let i = 0; i < count.value; i++) {
      sheet.value.items[index].names.push(String(currentnumber.value))
      currentnumber.value++
    }
    count.value = 0
  } else {
    sheet.value.items[index].names.push('')
  }
}
function deleteName(index, indexa) {
  sheet.value.items[index].names.splice(indexa, 1)
}
</script>

<template>
  <div class="container">
    <div class="header">
      <div class="sp">
        <img class="tx" src="/logo.png"></img>
        <div class="header-title">答题卡制作工具</div>
      </div>
    </div>
    <div class="main" style="flex:1">
      <div class="sp" style="flex:1">
        <iframe v-if="pdfurl" :src="pdfurl" style="flex:1;height:100%"></iframe>
        <div class="cz" style="align-self:flex-start;flex:1">
          <div class="sp">
            <tiny-button type="info" @click="preview">预览</tiny-button>
            <div><tiny-button type="success" @click="download">下载</tiny-button></div>
          </div>
          <div class="large-bold-text">全局配置</div>
          <div class="sp">
            <div class="bold-text">标题</div>
            <div><tiny-input v-model="sheet.meta.title" clearable placeholder="请输入标题"></tiny-input></div>
          </div>
          <div class="sp">
            <div class="bold-text">纸张类型</div>
            <tiny-radio-group v-model="sheet.meta.paperType" @change="changePaperType">
              <tiny-radio label="a4">A4</tiny-radio>
              <tiny-radio label="a3">A3</tiny-radio>
            </tiny-radio-group>
          </div>
          <div class="sp">
            <div class="bold-text">分栏数量</div>
            <tiny-radio-group v-model="sheet.meta.columnCount">
              <tiny-radio v-if="sheet.meta.paperType == 'a4'" :label="1">1</tiny-radio>
              <tiny-radio v-if="sheet.meta.paperType == 'a3'" :label="2">2</tiny-radio>
              <tiny-radio v-if="sheet.meta.paperType == 'a3'" :label="3">3</tiny-radio>
            </tiny-radio-group>
          </div>
          <div class="sp">
            <div class="bold-text">信息填写</div>
            <tiny-checkbox-group v-model="sheet.meta.info">
              <tiny-checkbox label="姓名"></tiny-checkbox>
              <tiny-checkbox label="班级"></tiny-checkbox>
              <tiny-checkbox label="考场/座位号"></tiny-checkbox>
            </tiny-checkbox-group>
          </div>
          <div class="sp">
            <div class="bold-text">选项边框</div>
            <tiny-radio-group v-model="sheet.meta.optionBorderType">
              <tiny-radio label="open">中括号</tiny-radio>
              <tiny-radio label="close">矩形</tiny-radio>
            </tiny-radio-group>
          </div>
          <div class="sp">
            <div class="bold-text">选项排列</div>
            <tiny-radio-group v-model="sheet.meta.optionDirection">
              <tiny-radio label="row">横向</tiny-radio>
              <tiny-radio label="column">纵向</tiny-radio>
            </tiny-radio-group>
          </div>
          <div class="sp">
            <div class="bold-text">组选择数</div>
            <tiny-numeric v-model="sheet.meta.objectiveCountPerGroup" step-strictly :min="1" :max="10"></tiny-numeric>
          </div>
          <div class="large-bold-text">题目配置</div>
          <div class="sp">
            <tiny-button type="success" @click="newItem(-1)">新增</tiny-button>
            <tiny-radio-group v-model="newtype">
              <tiny-radio label="title">标题</tiny-radio>
              <tiny-radio label="objective">选择</tiny-radio>
              <tiny-radio label="fillblank">填空</tiny-radio>
              <tiny-radio label="subjective">解答</tiny-radio>
              <tiny-radio label="composition">作文</tiny-radio>
            </tiny-radio-group>
          </div>
          <div v-if="newtype != 'title'" class="sp">
            <div class="bold-text">批量新增</div>
            <div>起始题号</div>
            <tiny-numeric v-model="currentnumber" step-strictly :min="0"></tiny-numeric>
            <div>新增数量</div>
            <tiny-numeric v-model="count" step-strictly :min="0"></tiny-numeric>
            <div v-if="newtype == 'objective'">选项类型</div>
            <tiny-radio-group v-if="newtype == 'objective'" v-model="optiontype">
              <tiny-radio label="ab">AB</tiny-radio>
              <tiny-radio label="tf">TF</tiny-radio>
            </tiny-radio-group>
            <div v-if="newtype == 'objective' && optiontype == 'ab'">选项数量</div>
            <tiny-numeric v-if="newtype == 'objective' && optiontype == 'ab'" v-model="optioncount" step-strictly
              :min="1" :max="26"></tiny-numeric>
          </div>
          <div v-for="item, index in sheet.items">
            <div v-if="item.type == 'title'" class="sp">
              <tiny-button type="success" @click="newItem(index)">新增</tiny-button>
              <div><tiny-button type="danger" @click="deleteItem(index)">删除</tiny-button></div>
              <div class="bold-text">标题</div>
              <div><tiny-input v-model="item.content" clearable placeholder="请输入标题"></tiny-input></div>
            </div>
            <div v-if="item.type == 'objective'" class="sp">
              <tiny-button type="success" @click="newItem(index)">新增</tiny-button>
              <div><tiny-button type="danger" @click="deleteItem(index)">删除</tiny-button></div>
              <div class="bold-text">选择</div>
              <div><tiny-input v-model="item.name" clearable placeholder="请输入题号"></tiny-input></div>
              <tiny-radio-group v-model="item.optionType">
                <tiny-radio label="ab">AB</tiny-radio>
                <tiny-radio label="tf">TF</tiny-radio>
              </tiny-radio-group>
              <tiny-numeric v-if="item.optionType == 'ab'" v-model="item.optionCount" step-strictly :min="1"
                :max="26"></tiny-numeric>
            </div>
            <div v-if="item.type == 'fillblank'" class="sp">
              <tiny-button type="success" @click="newItem(index)">新增</tiny-button>
              <div><tiny-button type="danger" @click="deleteItem(index)">删除</tiny-button></div>
              <div class="bold-text">填空</div>
              <tiny-numeric v-model="item.columnCount" step-strictly :min="1" :max="5"
                style="width:auto"></tiny-numeric>
              <div class="cz">
                <div v-for="itema, indexa in item.names" class="sp">
                  <div><tiny-input v-model="item.names[indexa]" clearable placeholder="请输入题号"></tiny-input></div>
                  <tiny-button type="danger" @click="deleteName(index, indexa)">删除</tiny-button>
                </div>
                <div><tiny-button type="success" @click="newName(index)">新增</tiny-button></div>
              </div>
            </div>
            <div v-if="item.type == 'subjective'" class="sp">
              <tiny-button type="success" @click="newItem(index)">新增</tiny-button>
              <div><tiny-button type="danger" @click="deleteItem(index)">删除</tiny-button></div>
              <div class="bold-text">解答</div>
              <div v-if="item.rowType != 'noanswer'"><tiny-input v-model="item.name" clearable
                  placeholder="请输入题号"></tiny-input></div>
              <tiny-radio-group v-model="item.rowType" style="flex-shrink:0">
                <tiny-radio label="blank">空白</tiny-radio>
                <tiny-radio label="line">横线</tiny-radio>
                <tiny-radio label="noanswer">禁答</tiny-radio>
              </tiny-radio-group>
              <tiny-numeric v-model="item.rowCount" step-strictly :min="1"></tiny-numeric>
            </div>
            <div v-if="item.type == 'composition'" class="sp">
              <tiny-button type="success" @click="newItem(index)">新增</tiny-button>
              <div><tiny-button type="danger" @click="deleteItem(index)">删除</tiny-button></div>
              <div class="bold-text">作文</div>
              <div><tiny-input v-model="item.name" clearable placeholder="请输入题号"></tiny-input></div>
              <tiny-numeric v-model="item.characterCount" step-strictly :min="1"></tiny-numeric>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>