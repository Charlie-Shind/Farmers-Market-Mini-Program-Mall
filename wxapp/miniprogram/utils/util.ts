export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

export const maskPhone = (value?: string) => {
  if (!value) {
    return ''
  }

  const normalized = value.replace(/\s+/g, '')
  if (normalized.length <= 7) {
    return normalized
  }

  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`
}

export const isRemoteUrl = (value?: string) => {
  if (!value) {
    return false
  }

  return /^(https?:)?\/\//.test(value)
}

const formatNumber = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}
