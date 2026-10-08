// Without this file Next.js never runs Tailwind, and every page renders as unstyled HTML.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
