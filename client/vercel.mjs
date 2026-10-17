const apiOrigin = process.env.API_ORIGIN;
const apiUrl = apiOrigin && new URL(apiOrigin);
if (!apiUrl || apiUrl.protocol !== 'https:' || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash || apiUrl.username || apiUrl.password) {
  throw new Error('API_ORIGIN must be an HTTPS origin, for example https://your-api.vercel.app');
}

export const config = {
  buildCommand: 'npm --prefix .. run build -w @learning-companion/shared && npm run build',
  outputDirectory: 'dist',
  rewrites: [
    { source: '/api/:path*', destination: `${apiUrl.origin}/api/:path*` },
    { source: '/(.*)', destination: '/index.html' },
  ],
};
