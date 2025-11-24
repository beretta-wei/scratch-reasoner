export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}
