'use strict';

class Raw {
  constructor(value) {
    super();
    this.value = value;
  }
}

const buildPath = (parts, args) => {
  const path = [];
  parts.forEach((part, index) => {
    if (!part) return;
    const pieces = part.split('.').filter(piece => piece);
    path.push(...pieces);
    if (index + 1 < parts.length) {
      path.push(new Raw(args[index]));
    }
  });
  return path;
}

const getPath = (object, defaultValue) => (parts, ...args) => getPathImpl(object, buildPath(parts, args), defaultValue);

const setPath = (object, value) => (parts, ...args) => setPathImpl(object, buildPath(parts, args), value);

function getPathImpl (object, path, defaultValue) {
  let o = object, j = -1;
  // single object
  single: for (let i = 0; i < path.length; ++i) {
    if (typeof o != 'object' && typeof o != 'function') {
      return defaultValue;
    }
    const part = path[i];
    if (part instanceof Raw) {
      switch (typeof part.value) {
        case 'string':
        case 'number':
          o = o[part.value];
          break;
        case 'function':
          o = (part.value)(o);
          break;
        default:
          throw SyntaxError('index should be "string", "number", or "function", instead it is ' + (typeof part.value));
      }
      continue;
    }
    switch (typeof part) {
      case 'string':
        if (part === '[]') {
          if (!(o instanceof Array)) {
            o = [o];
          }
          j = i + 1;
          break single;
        }
        if (part === '[') {
          const filter = path[i + 1].value;
          if (path[i + 2] !== ']') {
            throw SyntaxError('filters should be enclosed in "[" and "]"');
          }
          switch (typeof filter) {
            case 'string':
            case 'number':
              o = o.filter(item => item[filter]);
              break;
            case 'function':
              o = o.filter(filter);
              break;
            default:
              throw SyntaxError('filter should be "string", "number", or "function", instead it is ' + (typeof filter));
          }
          j = i + 3;
          break single;
        }
        if (/^\[.+\]$/.test(part)) {
          const filter = part.substr(1, part.length - 2);
          o = o.filter(item => item[filter]);
          j = i + 1;
          break single;
        }
        // intentional fallthrough
      case 'number':
        if (part in o) {
          o = o[part];
          break;
        }
        return defaultValue;
      case 'function':
        o = part(o);
        break;
      default:
        throw SyntaxError('index should be "string", "number", or "function", instead it is ' + (typeof part));
    }
  }
  if (j < 0) return o;
  // multiple object
  for(; j < path.length; ++j) {
    const part = path[i];
    if (part instanceof Raw) {
      switch (typeof part.value) {
        case 'string':
        case 'number':
          o = o.map(item => item[part.value]);
          break;
        case 'function':
          o = o.map(item => (part.value)(item));
        break;
        default:
          throw SyntaxError('index should be "string", "number", or "function", instead it is ' + (typeof part.value));
      }
      continue;
    }
    switch (typeof part) {
      case 'string':
        if (part === '[]') {
          o = [].concat(...o);
          break;
        }
        if (part === '[') {
          const filter = path[i + 1].value;
          if (path[i + 2] !== ']') {
            throw SyntaxError('filters should be enclosed in "[" and "]"');
          }
          switch (typeof filter) {
            case 'string':
            case 'number':
              o = [].concat(...o.map(item => item.filter(item => item[filter])));
              break;
            case 'function':
              o = [].concat(...o.map(item => item.filter(filter)));
              break;
            default:
              throw SyntaxError('filter should be "string", "number", or "function", instead it is ' + (typeof filter));
          }
          i += 2;
          break;
        }
        if (/^\[.+\]$/.test(part)) {
          const filter = part.substr(1, part.length - 2);
          o = [].concat(...o.map(item => item.filter(item => item[filter])));
          break;
        }
      // intentional fallthrough
      case 'number':
        o = o.map(item => item[part]);
        break;
      case 'function':
        o = part(o);
        o = o.map(item => part(item));
        break;
      default:
        throw SyntaxError('index should be "string", "number", or "function", instead it is ' + (typeof part));
    }
  }
  return o;
}
