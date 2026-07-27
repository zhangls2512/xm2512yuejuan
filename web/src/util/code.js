export function encode(obj) {
  return btoa(encodeURIComponent(JSON.stringify(obj)))
}
export function decode(str) {
  return JSON.parse(decodeURIComponent(atob(str)))
}