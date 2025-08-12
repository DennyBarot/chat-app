export const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

export const getAvatar = (avatar, name) =>
  avatar ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=random`;
