export function encode(str) {
  return btoa(encodeURIComponent(JSON.stringify(str)))
}
export function decode(str) {
  return JSON.parse(decodeURIComponent(atob(str)))
}